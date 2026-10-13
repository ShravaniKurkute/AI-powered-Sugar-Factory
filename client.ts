import "dotenv/config";
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const question =
  "Which farmers have pending payments? List their names, villages, and pending amounts. Calculate the total pending payment.";

async function main() {
  const mcp = new Client({
    name: "sanjivani-farmer-client",
    version: "1.0.0",
  });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "server.ts"],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string"
      )
    ),
  });

  await mcp.connect(transport);

  try {
    const { tools } = await mcp.listTools();

    const openAITools = tools.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema,
      strict: false,
    }));

    const firstResponse = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: question,
      tools: openAITools,
      tool_choice: "required",
    });

    const toolCalls = firstResponse.output.filter(
      (item) => item.type === "function_call"
    );

    if (toolCalls.length === 0) {
      console.log(firstResponse.output_text);
      return;
    }

    const toolOutputs = await Promise.all(
      toolCalls.map(async (call) => {
        const result = await mcp.callTool({
          name: call.name,
          arguments: JSON.parse(call.arguments),
        });

        const content = (result.content ?? []) as Array<{
          type?: string;
          text?: string;
        }>;

        return {
          type: "function_call_output" as const,
          call_id: call.call_id,
          output: content
            .map((item) =>
              item.type === "text" && typeof item.text === "string"
                ? item.text
                : ""
            )
            .join("\n"),
        };
      })
    );

    const finalResponse = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        { role: "user", content: question },
        ...((firstResponse.output as any[]) ?? []),
        ...((toolOutputs as any[]) ?? []),
      ] as any,
    });

    console.log("\nAI ANSWER:\n");
    console.log(finalResponse.output_text);
  } finally {
    await mcp.close();
    await transport.close();
  }
}

main().catch((error) => {
  console.error("Client failed:", error);
  process.exitCode = 1;
});
