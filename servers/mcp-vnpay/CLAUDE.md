# mcp-vnpay -- Claude Code Context

## What This Server Does

VNPAY payment gateway integration. Generate HMAC-SHA512 signed payment URLs, verify VNPAY return URLs, and query transaction status.

## Tools

| Tool | Description |
|------|-------------|
| `vnpay_create_payment_url` | Build a signed VNPAY payment URL. Returns the payment URL for the customer to complete payment. |
| `vnpay_verify_return` | Verify a VNPAY return URL or query string by validating the HMAC-SHA512 secure hash. Returns validation result with parsed transaction details. |
| `vnpay_query_transaction` | Query the status of a VNPAY transaction by its reference number. |

## Required Environment Variables

| Variable | Description | Mock Fallback |
|----------|-------------|---------------|
| `VNPAY_SANDBOX` | Enable mock mode (set to `true`) | `true` |
| `VNPAY_TMN_CODE` | VNPAY Terminal/Merchant code | `VNPAY_TMN_DEMO` |
| `VNPAY_HASH_SECRET` | Secret key for HMAC-SHA512 signing | `VNPAY_HASH_SECRET_DEMO` |
| `VNPAY_ENDPOINT` | VNPAY payment gateway URL | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |

## Enabling Mock Mode

Set `VNPAY_SANDBOX=true` in your `.mcp.json` env block. All tools return deterministic mock responses with `_mock: true`.

## Common Workflows

1. **Create a payment and verify the return:**
   - Call `vnpay_create_payment_url` with amount and orderInfo → receive a signed payment URL
   - Customer completes payment and is redirected back to your returnUrl
   - Call `vnpay_verify_return` with the full return URL (or query string) → check `valid: true`

2. **Query an existing transaction:**
   - Call `vnpay_query_transaction` with txnRef and optionally transDate (YYYYMMDDHHMMSS)
   - Inspect the response for transaction status and amount
