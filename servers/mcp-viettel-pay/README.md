# @vn-mcp/mcp-viettel-pay

[![npm version](https://img.shields.io/npm/v/@vn-mcp/mcp-viettel-pay)](https://www.npmjs.com/package/@vn-mcp/mcp-viettel-pay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

ViettelPay payment gateway MCP server for Vietnam (mock-only). Create payment requests, query transaction status, and process refunds.

> **Note:** This is a mock-only server. The real ViettelPay API uses SOAP+RSA. This server models a REST+HMAC-SHA256 API for development purposes. See [MOCK_DEVIATIONS.md](./MOCK_DEVIATIONS.md) for all assumptions.

## Install

```bash
npm install -g @vn-mcp/mcp-viettel-pay
```

## Configure

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "viettel-pay": {
      "command": "mcp-viettel-pay",
      "env": {
        "VIETTELPAY_SANDBOX": "true",
        "VIETTEL_PAY_PARTNER_CODE": "VTPAY_DEMO",
        "VIETTEL_PAY_SECRET_KEY": "demo_secret_key_vtpay",
        "VIETTEL_PAY_ENDPOINT": "https://sandbox.viettelpay.vn/vtpay-api"
      }
    }
  }
}
```

**Important:** The sandbox env var is `VIETTELPAY_SANDBOX` (not `VIETTEL_PAY_SANDBOX`).

## Example

After configuring `.mcp.json`, try in Claude Code:

> "Create a ViettelPay payment for 100,000 VND for mobile top-up"

## Tools

### viettel_pay_create_payment

Create a ViettelPay payment request. Returns a payment URL for the customer.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number (int) | Yes | Payment amount in VND |
| `orderInfo` | string | Yes | Order description |
| `returnUrl` | string (url) | No | URL to redirect after payment |

**Returns:** `{ transactionId, paymentUrl, amount, orderInfo, status, _mock? }`

---

### viettel_pay_query_status

Check ViettelPay transaction status by transactionId.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | string | Yes | ViettelPay transaction ID (e.g., VTP_xxxx) |

**Returns:** `{ transactionId, status, amount, orderInfo, _mock? }`

---

### viettel_pay_refund

Refund a ViettelPay transaction.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | string | Yes | Original transaction ID to refund |
| `amount` | number (int) | Yes | Refund amount in VND |
| `description` | string | No | Reason for refund |

**Returns:** `{ refundId, transactionId, amount, status, _mock? }`

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VIETTELPAY_SANDBOX` | Yes | Enable mock mode | `true` |
| `VIETTEL_PAY_PARTNER_CODE` | Yes | ViettelPay partner code | `VTPAY_DEMO` |
| `VIETTEL_PAY_SECRET_KEY` | Yes | Secret key for HMAC-SHA256 signing | `demo_secret_key_vtpay` |
| `VIETTEL_PAY_ENDPOINT` | Yes | ViettelPay API endpoint | `https://sandbox.viettelpay.vn/vtpay-api` |

## Mock Mode

Set `VIETTELPAY_SANDBOX=true`. All tools return deterministic mock responses with `_mock: true`.

All ViettelPay behavior in this server is assumed. See [MOCK_DEVIATIONS.md](./MOCK_DEVIATIONS.md) for the full list of deviations from the real API.

## Links

- [Documentation](https://fpt-a833a5a1.mintlify.app/)
- [All Servers](../../README.md)
- [npm](https://www.npmjs.com/package/@vn-mcp/mcp-viettel-pay)
