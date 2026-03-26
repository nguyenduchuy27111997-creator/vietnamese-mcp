# Zalo Chatbot Example

A minimal Node.js bot that sends Zalo OA messages using the [@vn-mcp/mcp-zalo-oa](https://www.npmjs.com/package/@vn-mcp/mcp-zalo-oa) MCP server via stdio transport.

<p align="center">
  <img src="./screenshot.png" alt="Zalo Chatbot Example — terminal output showing MCP connection, message sent, and followers listed" width="600" />
</p>

> Screenshot shows the bot connecting to the Zalo OA MCP server, sending a test message, and listing followers — all in sandbox mode.

## Prerequisites

- Node.js >= 20
- npm (comes with Node.js)

No API key or account needed — this example runs entirely in sandbox mode with mock data.

## Setup (3 steps)

### 1. Install dependencies

```bash
cd examples/zalo-chatbot
npm install
```

### 2. Configure environment (optional)

```bash
cp .env.example .env
```

The defaults use sandbox mode — no real Zalo credentials needed. Edit `.env` only if you have real Zalo OA credentials.

### 3. Run the bot

```bash
npm start
```

You should see output like:

```
Connected! 4 tools available:
  - zalo_oa_send_message: Send a message to a Zalo OA follower
  - zalo_oa_get_follower_profile: Get profile information for a Zalo OA follower
  - zalo_oa_list_followers: List followers of the Zalo Official Account
  - zalo_oa_refresh_token: Refresh the Zalo OA access token

Sending test message...

Response:
{
  "content": [{ "type": "text", "text": "..." }]
}

Listing followers...
...

Done! Connection closed.
```

## How it works

This example uses the MCP SDK's `StdioClientTransport` to spawn the `@vn-mcp/mcp-zalo-oa` server as a child process and communicate via JSON-RPC over stdio:

1. **Spawn** the MCP server binary (`npx @vn-mcp/mcp-zalo-oa`)
2. **Connect** using the MCP Client
3. **List tools** to see what's available
4. **Call tools** — `zalo_oa_send_message` and `zalo_oa_list_followers`
5. **Close** the connection

This is the same pattern Claude Code uses internally when you add an MCP server to `.mcp.json`.

## Claude Code Integration

Add this to your project's `.mcp.json` and Claude can send Zalo messages directly:

```json
{
  "mcpServers": {
    "zalo-oa": {
      "command": "npx",
      "args": ["@vn-mcp/mcp-zalo-oa"],
      "env": {
        "ZALO_OA_SANDBOX": "true",
        "ZALO_OA_ACCESS_TOKEN": "mock_access_token",
        "ZALO_OA_REFRESH_TOKEN": "mock_refresh_token",
        "ZALO_OA_APP_ID": "mock_app_id",
        "ZALO_OA_APP_SECRET": "mock_app_secret"
      }
    }
  }
}
```

Then ask Claude: "Send a Zalo message to user test_user_123 saying hello"

## Self-hosted vs Hosted

This example uses the **self-hosted** approach — the MCP server runs locally via stdio. For the **hosted gateway** approach (no local server needed), see the [Payment Checkout Example](../payment-checkout/).

| Approach | When to use |
|----------|-------------|
| Self-hosted (this example) | Full control, offline development, no API key needed |
| Hosted gateway | No server to manage, built-in auth + metering |

## Tech Stack

- Node.js + TypeScript
- @modelcontextprotocol/sdk (MCP client)
- @vn-mcp/mcp-zalo-oa (Zalo OA MCP server)
- tsx (TypeScript execution)

## Related

- [VN MCP Hub README](../../README.md)
- [Zalo OA Server Docs](../../servers/mcp-zalo-oa/README.md)
- [Payment Checkout Example](../payment-checkout/)
