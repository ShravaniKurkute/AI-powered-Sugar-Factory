
import "dotenv/config";
import { Pool } from "pg";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const fallbackFarmers = [
  {
    id: 1,
    name: "Rani Patil",
    village: "Shivaji Nagar",
    sugarcane_tons: 18.5,
    payment_pending: 4200,
    amount_paid: 2700,
  },
  {
    id: 2,
    name: "Vikram Yadav",
    village: "Bhavani",
    sugarcane_tons: 24.2,
    payment_pending: 5700,
    amount_paid: 3900,
  },
  {
    id: 3,
    name: "Sita Deshmukh",
    village: "Kharadi",
    sugarcane_tons: 16.8,
    payment_pending: 3100,
    amount_paid: 5200,
  },
  {
    id: 4,
    name: "Arjun Singh",
    village: "Nandgaon",
    sugarcane_tons: 29.4,
    payment_pending: 6700,
    amount_paid: 2400,
  },
];

const isDatabaseConfigured = Boolean(
  process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER
);

const db = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function fetchFarmers() {
  if (!isDatabaseConfigured) {
    return { farmers: fallbackFarmers, source: "fallback-demo" };
  }

  try {
    const result = await db.query(`
      SELECT id, name, village, sugarcane_tons,
             payment_pending, amount_paid
      FROM farmers
      ORDER BY id
    `);

    const farmers = result.rows.length > 0 ? result.rows : fallbackFarmers;
    return {
      farmers,
      source: result.rows.length > 0 ? "postgresql" : "empty-table",
    };
  } catch (error) {
    console.warn(
      "PostgreSQL connection failed. Using fallback farmer dataset instead.",
      error
    );
    return { farmers: fallbackFarmers, source: "fallback-demo" };
  }
}

const server = new McpServer({
  name: "sanjivani-farmer-server",
  version: "1.0.0",
});

server.registerTool(
  "get_farmer_data",
  {
    description:
      "Fetch farmer sugarcane supply and payment records from PostgreSQL or fallback demo data.",
    inputSchema: {
      question: z.string().describe("The farmer information requested"),
    },
  },
  async ({ question }) => {
    const { farmers, source } = await fetchFarmers();
    const totalPending = farmers.reduce(
      (sum, farmer) => sum + Number(farmer.payment_pending ?? 0),
      0
    );
    const totalPaid = farmers.reduce(
      (sum, farmer) => sum + Number(farmer.amount_paid ?? 0),
      0
    );
    const totalSugarcane = farmers.reduce(
      (sum, farmer) => sum + Number(farmer.sugarcane_tons ?? 0),
      0
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            question,
            source,
            total_pending: totalPending,
            total_paid: totalPaid,
            total_sugarcane_tons: totalSugarcane,
            farmers,
          }),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sanjivani MCP server connected.");
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exitCode = 1;
});
