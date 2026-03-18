# mcp-momo-vn -- Claude Code Context

## What This Server Does

MoMo e-wallet payment gateway integration. Create payment links, check transaction status, process refunds, and validate IPN (Instant Payment Notification) callbacks.

## Tools

| Tool | Description |
|------|-------------|
| `momo_create_payment` | Create a MoMo payment link (QR code, wallet, or ATM). Returns payUrl for the customer to complete payment. |
| `momo_query_status` | Check the status of a MoMo payment transaction by orderId. |
| `momo_refund` | Refund a MoMo transaction (full or partial) by transId. |
| `momo_validate_ipn` | Validate a MoMo IPN payload by verifying its HMAC-SHA256 signature. Returns validation result with parsed transaction details. |

## Required Environment Variables

| Variable | Description | Mock Fallback |
|----------|-------------|---------------|
| `MOMO_SANDBOX` | Enable mock mode (set to `true`) | `true` |
| `MOMO_PARTNER_CODE` | MoMo partner code | `MOMOBKUN20180529` |
| `MOMO_ACCESS_KEY` | MoMo access key | `klm05TvNBzhg7h7j` |
| `MOMO_SECRET_KEY` | MoMo secret key for HMAC signing | `at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa` |

## Enabling Mock Mode

Set `MOMO_SANDBOX=true` in your `.mcp.json` env block. All tools return deterministic mock responses with `_mock: true`.

## Common Workflows

1. **Create and verify a payment:**
   - Call `momo_create_payment` with amount and orderInfo → receive payUrl
   - Customer completes payment
   - Call `momo_query_status` with the orderId → confirm resultCode 0 (success)

2. **Process a refund:**
   - Call `momo_create_payment` to create a payment → receive orderId
   - Call `momo_query_status` to get transId from the paid transaction
   - Call `momo_refund` with the transId and refund amount

3. **Validate an incoming IPN callback:**
   - Receive raw JSON body from MoMo IPN webhook
   - Call `momo_validate_ipn` with the raw body as a string
   - Check `valid: true` in response before processing the payment event
