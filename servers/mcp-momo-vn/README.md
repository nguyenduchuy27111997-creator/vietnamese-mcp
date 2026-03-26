# @vn-mcp/mcp-momo-vn

[![npm version](https://img.shields.io/npm/v/@vn-mcp/mcp-momo-vn)](https://www.npmjs.com/package/@vn-mcp/mcp-momo-vn)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

MoMo e-wallet payment gateway MCP server for Vietnam. Create payments, check status, process refunds, and validate IPN callbacks.

## Install

```bash
npm install -g @vn-mcp/mcp-momo-vn
```

## Configure

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

## Example

After configuring `.mcp.json`, try in Claude Code:

> "Create a MoMo payment for 150,000 VND for order #1234"

## Tools

### momo_create_payment

Create a MoMo payment link (QR code, wallet, or ATM). Returns payUrl for the customer to complete payment.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number (int) | Yes | Payment amount in VND (e.g. 150000) |
| `orderInfo` | string | Yes | Order description shown to the customer |
| `redirectUrl` | string (url) | No | URL to redirect after payment |
| `ipnUrl` | string (url) | No | Server callback URL for payment notification |
| `requestType` | `captureWallet` \| `payWithATM` \| `payWithCC` | No | Payment method (default: captureWallet for QR code) |
| `extraData` | string | No | Additional data to pass through |

**Returns:** `{ orderId, requestId, amount, payUrl, deeplink, qrCodeUrl, resultCode, message, _mock? }`

---

### momo_query_status

Check the status of a MoMo payment transaction by orderId.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | string | Yes | The orderId from momo_create_payment response |

**Returns:** `{ orderId, resultCode, message, amount, transId, payType, _mock? }`

---

### momo_refund

Refund a MoMo transaction (full or partial) by transId.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `transId` | number (int) | Yes | Transaction ID from the original payment (numeric, e.g. 2350000001) |
| `amount` | number (int) | Yes | Refund amount in VND (must be <= original amount) |
| `description` | string | No | Reason for the refund |

**Returns:** `{ resultCode, message, transId, orderId, amount, _mock? }`

---

### momo_validate_ipn

Validate a MoMo IPN (Instant Payment Notification) payload by verifying its HMAC-SHA256 signature.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `ipnBody` | string | Yes | Raw IPN JSON body as a string |

**Returns:** `{ valid: true, orderId, amount, transId, resultCode, message }` on success, or `{ valid: false, reason }` on failure.

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `MOMO_SANDBOX` | Yes | Enable mock mode | `true` |
| `MOMO_PARTNER_CODE` | Yes | MoMo partner code | `MOMOBKUN20180529` |
| `MOMO_ACCESS_KEY` | Yes | MoMo access key | `klm05TvNBzhg7h7j` |
| `MOMO_SECRET_KEY` | Yes | Secret key for HMAC signing | `at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa` |

## Mock Mode

Set `MOMO_SANDBOX=true`. All tools return deterministic mock responses with `_mock: true`.

The sandbox credentials above are MoMo's published test credentials — no API account needed.

## Links

- [Documentation](https://fpt-a833a5a1.mintlify.app/)
- [All Servers](../../README.md)
- [npm](https://www.npmjs.com/package/@vn-mcp/mcp-momo-vn)
