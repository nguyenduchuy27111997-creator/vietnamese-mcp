# @vn-mcp/mcp-vnpay

[![npm version](https://img.shields.io/npm/v/@vn-mcp/mcp-vnpay)](https://www.npmjs.com/package/@vn-mcp/mcp-vnpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

VNPAY payment gateway MCP server for Vietnam. Generate signed payment URLs, verify return URLs, and query transaction status.

## Install

```bash
npm install -g @vn-mcp/mcp-vnpay
```

## Configure

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "vnpay": {
      "command": "mcp-vnpay",
      "env": {
        "VNPAY_SANDBOX": "true",
        "VNPAY_TMN_CODE": "VNPAY_TMN_DEMO",
        "VNPAY_HASH_SECRET": "VNPAY_HASH_SECRET_DEMO",
        "VNPAY_ENDPOINT": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
      }
    }
  }
}
```

## Example

After configuring `.mcp.json`, try in Claude Code:

> "Generate a VNPAY payment URL for 500,000 VND for electronics purchase"

## Tools

### vnpay_create_payment_url

Build a signed VNPAY payment URL. Returns the payment URL for the customer to complete payment.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number (int) | Yes | Payment amount in VND (e.g. 150000) |
| `orderInfo` | string | Yes | Order description shown on VNPAY payment page |
| `bankCode` | string | No | Bank code (e.g. NCB, VNPAYQR). Default: NCB |
| `locale` | `vn` \| `en` | No | Payment page language (default: vn) |
| `returnUrl` | string (url) | No | URL to redirect after payment |

**Returns:** `{ paymentUrl, txnRef, _mock? }`

---

### vnpay_verify_return

Verify a VNPAY return URL or query string by validating the HMAC-SHA512 secure hash.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `returnUrl` | string | Yes | Full VNPAY return URL or query string to verify |

**Returns:** `{ valid: true, txnRef, amount, responseCode, bankCode, transactionNo, orderInfo }` on success, or `{ valid: false, reason }` on failure.

---

### vnpay_query_transaction

Query the status of a VNPAY transaction by its reference number.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `txnRef` | string | Yes | VNPAY transaction reference (vnp_TxnRef) |
| `transDate` | string | No | Transaction date in YYYYMMDDHHMMSS format |

**Returns:** `{ responseCode, message, txnRef, amount, bankCode, transactionNo, _mock? }`

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VNPAY_SANDBOX` | Yes | Enable mock mode | `true` |
| `VNPAY_TMN_CODE` | Yes | VNPAY Terminal/Merchant code | `VNPAY_TMN_DEMO` |
| `VNPAY_HASH_SECRET` | Yes | Secret key for HMAC-SHA512 signing | `VNPAY_HASH_SECRET_DEMO` |
| `VNPAY_ENDPOINT` | Yes | VNPAY payment gateway URL | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |

## Mock Mode

Set `VNPAY_SANDBOX=true`. All tools return deterministic mock responses with `_mock: true`.

Note: No public VNPAY sandbox test credentials are available. The demo values above are placeholders — replace with real credentials for live testing.

## Links

- [Documentation](https://fpt-a833a5a1.mintlify.app/)
- [All Servers](../../README.md)
- [npm](https://www.npmjs.com/package/@vn-mcp/mcp-vnpay)
