[![npm version](https://img.shields.io/npm/v/@vn-mcp/mcp-momo-vn?label=npm&color=cb3837)](https://www.npmjs.com/package/@vn-mcp/mcp-momo-vn) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE) [![MCP Servers](https://img.shields.io/badge/MCP_Servers-5-blue)](https://github.com/nguyenduchuy27111997-creator/vietnamese-mcp) [![Tools](https://img.shields.io/badge/Tools-18-green)](https://github.com/nguyenduchuy27111997-creator/vietnamese-mcp)

# VN MCP Hub

The first collection of Model Context Protocol (MCP) servers for Vietnamese fintech and messaging APIs. Plug into Claude Code and interact with Vietnam's major payment gateways and messaging platforms — zero integration boilerplate.

<!-- GIF demo will be added in plan 18-03
<p align="center">
  <img src="./assets/demo.gif" alt="VN MCP Hub Demo" width="720" />
</p>
-->

## What is this?

MCP (Model Context Protocol) is an open protocol by Anthropic that lets AI models like Claude interact with external tools and services. VN MCP Hub provides 5 MCP servers that wrap Vietnam's major payment gateways and messaging platforms: MoMo, ZaloPay, VNPAY, ViettelPay, and Zalo OA.

Add any server to your Claude Code config, and Claude can immediately create payments, check transaction statuses, send Zalo messages, and more — no SDK integration, no boilerplate code needed.

## Feature Highlights

| Feature | Details |
|---------|---------|
| 5 payment & messaging servers | MoMo, ZaloPay, VNPAY, ViettelPay, Zalo OA — all major Vietnamese platforms |
| 18 tools total | Pre-built tool definitions for every common API operation |
| Sandbox/mock mode | Every server works offline with `{SERVICE}_SANDBOX=true` — no real credentials needed |
| Hosted gateway | Use the managed Cloudflare Workers gateway — no server to run or maintain |
| npm packages | Each server ships as an independent npm package under the `@vn-mcp` scope |
| Claude Code native | Configure once in `.mcp.json`, then describe what you want in plain English |
| Monorepo structure | Shared utilities, consistent error formats, and uniform HMAC signing across all servers |

## Server Catalog

| Server | Package | Tools | Description |
|--------|---------|-------|-------------|
| MoMo | [`@vn-mcp/mcp-momo-vn`](https://www.npmjs.com/package/@vn-mcp/mcp-momo-vn) | 4 | E-wallet payments: create, query, refund, validate IPN |
| ZaloPay | [`@vn-mcp/mcp-zalopay-vn`](https://www.npmjs.com/package/@vn-mcp/mcp-zalopay-vn) | 4 | Payment gateway: create order, query, refund, validate callback |
| VNPAY | [`@vn-mcp/mcp-vnpay`](https://www.npmjs.com/package/@vn-mcp/mcp-vnpay) | 3 | Payment gateway: create URL, verify return, query transaction |
| Zalo OA | [`@vn-mcp/mcp-zalo-oa`](https://www.npmjs.com/package/@vn-mcp/mcp-zalo-oa) | 4 | Official Account messaging: send, get profile, list followers, refresh token |
| ViettelPay | [`@vn-mcp/mcp-viettel-pay`](https://www.npmjs.com/package/@vn-mcp/mcp-viettel-pay) | 3 | Payments (mock): create, query, refund |

**Total: 5 servers, 18 tools**

## Quick Start

### Option A: Self-hosted (npm)

Install the MCP server globally:

```bash
npm install -g @vn-mcp/mcp-momo-vn
```

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "momo-vn": {
      "command": "mcp-momo-vn",
      "env": {
        "MOMO_SANDBOX": "true",
        "MOMO_PARTNER_CODE": "MOMOBKUN20180529",
        "MOMO_ACCESS_KEY": "klm05TvNBzhg7h7j",
        "MOMO_SECRET_KEY": "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa"
      }
    }
  }
}
```

Then in Claude Code: "Create a MoMo payment for 50,000 VND"

### Option B: Hosted API (managed gateway)

1. Sign up at https://vn-mcp-dashboard.pages.dev
2. Create an API key
3. Configure Claude Code to use the gateway endpoint:

```json
{
  "mcpServers": {
    "vn-mcp": {
      "type": "streamable-http",
      "url": "https://vn-mcp-gateway.nguyenduchuy27111997.workers.dev/mcp/momo",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

No server management required — the hosted gateway handles authentication, routing, and metering.

## Architecture

```
+------------------+     +-------------------+     +------------------+
|   Claude Code    | --> |   VN MCP Gateway  | --> |   MoMo API       |
|   (MCP Client)   |     |  (CF Workers)     |     |   ZaloPay API    |
+------------------+     +-------------------+     |   VNPAY API      |
                          |  Auth + Metering  |     |   Zalo OA API    |
                          |  Billing (Stripe) |     |   ViettelPay API |
                          +-------------------+     +------------------+
                                  |
                          +-------------------+
                          |    Dashboard      |
                          |   (React + Vite)  |
                          +-------------------+
```

## Project Structure

```
vietnamese-mcp/
  servers/           # 5 MCP server packages
    mcp-momo-vn/
    mcp-zalopay-vn/
    mcp-vnpay/
    mcp-zalo-oa/
    mcp-viettel-pay/
  packages/
    shared/          # Shared utilities (@vn-mcp/shared)
  apps/
    gateway/         # Cloudflare Workers gateway
    dashboard/       # React dashboard (CF Pages)
  docs/              # Mintlify documentation
```

## Links

- **Documentation:** https://fpt-a833a5a1.mintlify.app/
- **Dashboard:** https://vn-mcp-dashboard.pages.dev
- **Gateway:** https://vn-mcp-gateway.nguyenduchuy27111997.workers.dev

## Development

```bash
git clone https://github.com/nguyenduchuy27111997-creator/vietnamese-mcp.git
cd vietnamese-mcp
npm install
npm run build
npm test
```

All servers run in **sandbox/mock mode** by default — no real API credentials needed to develop or test.

## License

[MIT](./LICENSE)
