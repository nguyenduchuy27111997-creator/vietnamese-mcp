# Payment Checkout Example

A minimal React app that creates MoMo and VNPAY payments through the [VN MCP Hub](https://github.com/nguyenduchuy27111997-creator/vietnamese-mcp) hosted gateway.

<p align="center">
  <img src="./screenshot.png" alt="Payment Checkout Example — React app with MoMo and VNPAY buttons showing mock payment response" width="600" />
</p>

> Screenshot shows the checkout UI with MoMo and VNPAY payment buttons and a mock API response.

## Prerequisites

- Node.js >= 20
- A VN MCP Hub API key ([sign up here](https://vn-mcp-dashboard.pages.dev))

## Setup (3 steps)

### 1. Install dependencies

```bash
cd examples/payment-checkout
npm install
```

### 2. Configure your API key

```bash
cp .env.example .env
```

Edit `.env` and replace `your_api_key_here` with your actual API key:

```
VITE_GATEWAY_URL=https://vn-mcp-gateway.nguyenduchuy27111997.workers.dev
VITE_API_KEY=sk_test_your_actual_key
```

### 3. Run the app

```bash
npm run dev
```

Open http://localhost:5173 — click "Pay with MoMo" or "Pay with VNPAY" to see the mock payment response.

## How it works

This app sends JSON-RPC requests to the VN MCP Gateway, which routes them to the appropriate MCP server:

- **Pay with MoMo** calls `momo_create_payment` → returns a mock payment URL
- **Pay with VNPAY** calls `vnpay_create_payment_url` → returns a mock payment URL

All responses are mock/sandbox data — no real money is charged.

## Claude Code Integration

This example also includes a `.mcp.json` file for Claude Code users. Add it to your project and Claude can create payments directly:

```json
{
  "mcpServers": {
    "momo-hosted": {
      "type": "streamable-http",
      "url": "https://vn-mcp-gateway.nguyenduchuy27111997.workers.dev/mcp/momo",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Then ask Claude: "Create a MoMo payment for 100,000 VND for order #12345"

## Tech Stack

- React 19 + TypeScript
- Vite 6
- VN MCP Hub hosted gateway (no SDK — plain fetch)

## Related

- [VN MCP Hub README](../../README.md)
- [MoMo Server Docs](../../servers/mcp-momo-vn/README.md)
- [VNPAY Server Docs](../../servers/mcp-vnpay/README.md)
