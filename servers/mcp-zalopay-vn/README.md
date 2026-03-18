# mcp-zalopay-vn

ZaloPay payment gateway MCP server for Vietnam. Create orders, check status, process refunds, and validate ZaloPay callbacks.

## Quick Start

1. Install dependencies from monorepo root: `npm install`
2. Configure environment variables in `.mcp.json` (see below)
3. Add server entry to `.mcp.json`
4. Verify: `npm test --workspace=servers/mcp-zalopay-vn`

## .mcp.json Entry

```json
"zalopay-vn": {
  "command": "node",
  "args": ["./servers/mcp-zalopay-vn/build/index.js"],
  "env": {
    "ZALOPAY_SANDBOX": "true",
    "ZALOPAY_APP_ID": "2553",
    "ZALOPAY_KEY1": "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
    "ZALOPAY_KEY2": "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
    "ZALOPAY_ENDPOINT": "https://sb-openapi.zalopay.vn"
  }
}
```

## Tools

### zalopay_create_order

Create a ZaloPay payment order. Returns a payment URL for the customer to complete payment.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number (int) | Yes | Payment amount in VND (e.g. 150000) |
| `description` | string | Yes | Order description shown to the customer |
| `appUser` | string | No | App user identifier (default: demo_user) |
| `embedData` | string | No | Embedded data JSON string |
| `item` | string | No | Item details JSON string |

**Returns:** `{ return_code, return_message, sub_return_code, sub_return_message, order_url, zp_trans_token, order_token, app_trans_id, _mock? }`

---

### zalopay_query_order

Check the status of a ZaloPay order by its app_trans_id.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `appTransId` | string | Yes | ZaloPay app_trans_id (format: YYMMDD_hash) |

**Returns:** `{ return_code, return_message, sub_return_code, sub_return_message, is_processing, amount, zp_trans_id, _mock? }`

---

### zalopay_refund

Refund a ZaloPay transaction by its zp_trans_id.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zpTransId` | number (int) | Yes | ZaloPay transaction ID from query result |
| `amount` | number (int) | Yes | Refund amount in VND |
| `description` | string | No | Reason for refund |

**Returns:** `{ return_code, return_message, refund_id, _mock? }`

---

### zalopay_validate_callback

Validate a ZaloPay callback payload by verifying its HMAC-SHA256 MAC using key2.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `callbackData` | string | Yes | Raw ZaloPay callback JSON body as a string |

**Returns:** `{ valid: true, ...transactionData }` on success, or `{ valid: false, reason }` on failure.

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ZALOPAY_SANDBOX` | Yes | Enable mock mode | `true` |
| `ZALOPAY_APP_ID` | Yes | ZaloPay app ID | `2553` |
| `ZALOPAY_KEY1` | Yes | Key1 for request signing | `PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL` |
| `ZALOPAY_KEY2` | Yes | Key2 for callback MAC verification | `kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz` |
| `ZALOPAY_ENDPOINT` | Yes | ZaloPay API endpoint | `https://sb-openapi.zalopay.vn` |

## Mock Mode

Set `ZALOPAY_SANDBOX=true`. All tools return deterministic mock responses with `_mock: true`.

The sandbox credentials above are ZaloPay's published test credentials — no API account needed.
