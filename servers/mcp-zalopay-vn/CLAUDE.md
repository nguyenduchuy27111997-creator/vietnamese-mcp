# mcp-zalopay-vn -- Claude Code Context

## What This Server Does

ZaloPay payment gateway integration. Create payment orders, check order status, process refunds, and validate ZaloPay callback MAC signatures.

## Tools

| Tool | Description |
|------|-------------|
| `zalopay_create_order` | Create a ZaloPay payment order. Returns a payment URL for the customer to complete payment. |
| `zalopay_query_order` | Check the status of a ZaloPay order by its app_trans_id. |
| `zalopay_refund` | Refund a ZaloPay transaction by its zp_trans_id. |
| `zalopay_validate_callback` | Validate a ZaloPay callback payload by verifying its HMAC-SHA256 MAC using key2. Returns validation result with parsed transaction details. |

## Required Environment Variables

| Variable | Description | Mock Fallback |
|----------|-------------|---------------|
| `ZALOPAY_SANDBOX` | Enable mock mode (set to `true`) | `true` |
| `ZALOPAY_APP_ID` | ZaloPay app ID | `2553` |
| `ZALOPAY_KEY1` | Key1 for request signing | `PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL` |
| `ZALOPAY_KEY2` | Key2 for callback MAC verification | `kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz` |
| `ZALOPAY_ENDPOINT` | ZaloPay API endpoint | `https://sb-openapi.zalopay.vn` |

## Enabling Mock Mode

Set `ZALOPAY_SANDBOX=true` in your `.mcp.json` env block. All tools return deterministic mock responses with `_mock: true`.

## Common Workflows

1. **Create and monitor an order:**
   - Call `zalopay_create_order` with amount and description → receive order_url
   - Customer completes payment
   - Call `zalopay_query_order` with the app_trans_id → confirm return_code 1 (success)

2. **Validate a ZaloPay callback:**
   - Receive raw JSON body from ZaloPay callback webhook
   - Call `zalopay_validate_callback` with the raw body as a string
   - Check `valid: true` before processing the payment event; MAC is verified against key2

3. **Refund a transaction:**
   - Call `zalopay_query_order` to get the zp_trans_id from a successful order
   - Call `zalopay_refund` with zpTransId and the refund amount
