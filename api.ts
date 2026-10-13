import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const assistantInputSchema = z.object({
  question: z.string().trim().min(1, "Question is required."),
});

type FarmerRecord = {
  id: number;
  name: string;
  village: string;
  sugarcane_tons: number;
  payment_pending: number;
  amount_paid: number;
};

type FarmerPayload = {
  farmers?: FarmerRecord[];
  source?: string;
  total_pending?: number;
  total_paid?: number;
  total_sugarcane_tons?: number;
};

let mcpClient: Client | null = null;
let transport: StdioClientTransport | null = null;

async function ensureMcpClient() {
  if (mcpClient && transport) {
    return mcpClient;
  }

  const client = new Client({
    name: "sanjivani-farmer-api",
    version: "1.0.0",
  });

  const stdioTransport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "server.ts"],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
  });

  await client.connect(stdioTransport);
  mcpClient = client;
  transport = stdioTransport;
  return client;
}

async function shutdownMcpClient() {
  if (transport) {
    await transport.close();
  }
  if (mcpClient) {
    await mcpClient.close();
  }
  transport = null;
  mcpClient = null;
}

function normalizeFarmer(raw: Partial<FarmerRecord>): FarmerRecord {
  return {
    id: Number(raw.id ?? 0),
    name: String(raw.name ?? "Unknown farmer"),
    village: String(raw.village ?? "Unknown village"),
    sugarcane_tons: Number(raw.sugarcane_tons ?? 0),
    payment_pending: Number(raw.payment_pending ?? 0),
    amount_paid: Number(raw.amount_paid ?? 0),
  };
}

function parseFarmers(value: unknown): FarmerRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeFarmer(entry as Partial<FarmerRecord>));
}

function buildSummary(farmers: FarmerRecord[]) {
  return {
    totalFarmers: farmers.length,
    totalSugarcaneTons: farmers.reduce(
      (total, farmer) => total + Number(farmer.sugarcane_tons ?? 0),
      0
    ),
    totalPendingPayments: farmers.reduce(
      (total, farmer) => total + Number(farmer.payment_pending ?? 0),
      0
    ),
    totalAmountPaid: farmers.reduce(
      (total, farmer) => total + Number(farmer.amount_paid ?? 0),
      0
    ),
  };
}

function extractTextContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (typeof item === "object" && item !== null && "text" in item) {
        const text = item.text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("\n")
    .trim();
}

async function queryMcpFarmers(question: string): Promise<FarmerPayload> {
  const client = await ensureMcpClient();
  const { tools } = await client.listTools();
  const tool = tools.find((entry) => entry.name === "get_farmer_data");

  if (!tool) {
    throw new Error("The get_farmer_data MCP tool is not registered.");
  }

  const result = await client.callTool({
    name: tool.name,
    arguments: { question },
  });

  const rawText = extractTextContent(result.content);
  if (!rawText) {
    return { farmers: [], source: "empty" };
  }

  try {
    const parsed = JSON.parse(rawText) as FarmerPayload;
    return {
      ...parsed,
      farmers: parseFarmers(parsed.farmers),
    };
  } catch {
    return { farmers: [], source: "invalid" };
  }
}

async function answerQuestionWithOpenAI(question: string) {
  const client = await ensureMcpClient();
  const { tools } = await client.listTools();
  const openAiTools = tools.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description ?? "",
    parameters: tool.inputSchema,
    strict: false,
  }));

  const initialResponse = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [{ role: "user", content: question }],
    tools: openAiTools,
    tool_choice: "required",
  });

  const functionCalls = initialResponse.output.filter(
    (item) => item.type === "function_call"
  );

  if (functionCalls.length === 0) {
    return initialResponse.output_text || "I could not generate an answer.";
  }

  const functionOutputs = await Promise.all(
    functionCalls.map(async (call) => {
      const argumentsObject = (() => {
        try {
          return JSON.parse(call.arguments);
        } catch {
          return {};
        }
      })();

      const result = await client.callTool({
        name: call.name,
        arguments: argumentsObject,
      });

      const outputText = extractTextContent(result.content);
      return {
        type: "function_call_output" as const,
        call_id: call.call_id,
        output: outputText || "No data returned from MCP.",
      };
    })
  );

  const finalResponse = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "user", content: question },
      ...((initialResponse.output as any[]) ?? []),
      ...((functionOutputs as any[]) ?? []),
    ] as any,
  });

  return finalResponse.output_text || "I could not generate an answer.";
}

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const client = await ensureMcpClient();
    const { tools } = await client.listTools();
    res.json({
      status: "ok",
      database: process.env.PGDATABASE ? "configured" : "demo-fallback",
      mcp: "connected",
      toolCount: tools.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      database: process.env.PGDATABASE ? "configured" : "demo-fallback",
      mcp: "unavailable",
      error: error instanceof Error ? error.message : "MCP unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/farmers", async (_req: Request, res: Response) => {
  try {
    const payload = await queryMcpFarmers(
      "Fetch farmer records and summary statistics for the dashboard."
    );
    const farmers = payload.farmers ?? [];
    const summary = buildSummary(farmers);

    res.json({
      source: payload.source ?? "unknown",
      farmers,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch farmers.";
    res.status(500).json({
      error: message,
      source: "error",
      farmers: [],
      summary: buildSummary([]),
    });
  }
});

app.post("/api/assistant", async (req: Request, res: Response) => {
  try {
    const parsed = assistantInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid request body.",
      });
    }

    const answer = await answerQuestionWithOpenAI(parsed.data.question);
    return res.json({ answer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The assistant could not answer that question.";
    return res.status(500).json({
      error: message,
    });
  }
});

const server = app.listen(port, () => {
  console.log(`Sanjivani API listening on http://localhost:${port}`);
});

const shutdown = async () => {
  await shutdownMcpClient();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
