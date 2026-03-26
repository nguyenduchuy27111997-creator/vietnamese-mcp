/**
 * Zalo Chatbot Example
 *
 * Demonstrates how to use the @vn-mcp/mcp-zalo-oa MCP server via stdio transport.
 * The MCP server is spawned as a child process and communicates via JSON-RPC over stdio —
 * the same pattern Claude Code uses internally when you add a server to .mcp.json.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main(): Promise<void> {
  console.log("Starting Zalo chatbot example...\n");

  // Step 1: Create a stdio transport that spawns the mcp-zalo-oa binary.
  // The server reads env vars for Zalo OA credentials.
  // ZALO_OA_SANDBOX=true returns mock responses — no real Zalo account needed.
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["@vn-mcp/mcp-zalo-oa"],
    env: {
      ...process.env,
      ZALO_OA_SANDBOX: "true",
      ZALO_OA_ACCESS_TOKEN:
        process.env.ZALO_OA_ACCESS_TOKEN || "mock_access_token",
      ZALO_OA_REFRESH_TOKEN:
        process.env.ZALO_OA_REFRESH_TOKEN || "mock_refresh_token",
      ZALO_OA_APP_ID: process.env.ZALO_OA_APP_ID || "mock_app_id",
      ZALO_OA_APP_SECRET: process.env.ZALO_OA_APP_SECRET || "mock_app_secret",
    } as Record<string, string>,
  });

  // Step 2: Create the MCP client with an identity and empty capabilities.
  const client = new Client(
    { name: "zalo-chatbot-example", version: "0.1.0" },
    { capabilities: {} }
  );

  // Step 3: Connect — this spawns the server process and performs the MCP handshake.
  console.log("Connecting to Zalo OA MCP server...");
  await client.connect(transport);

  // Step 4: List available tools to confirm the server is ready.
  const tools = await client.listTools();
  console.log(`Connected! ${tools.tools.length} tools available:`);
  tools.tools.forEach((t) => console.log(`  - ${t.name}: ${t.description}`));

  // Step 5: Send a test message using the zalo_oa_send_message tool.
  // In sandbox mode the server returns a deterministic mock response.
  console.log("\nSending test message...");
  const result = await client.callTool({
    name: "zalo_oa_send_message",
    arguments: {
      userId: "test_user_123",
      type: "text",
      text: "Hello from VN MCP Hub! This is a test message from the Zalo chatbot example.",
    },
  });
  console.log("\nResponse:");
  console.log(JSON.stringify(result, null, 2));

  // Step 6: List followers using the zalo_oa_list_followers tool.
  console.log("\nListing followers...");
  const followers = await client.callTool({
    name: "zalo_oa_list_followers",
    arguments: { offset: 0, count: 5 },
  });
  console.log("\nFollowers:");
  console.log(JSON.stringify(followers, null, 2));

  // Step 7: Close the connection gracefully.
  await client.close();
  console.log("\nDone! Connection closed.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
