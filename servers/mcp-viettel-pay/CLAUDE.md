# mcp-viettel-pay -- Claude Code Context

## What This Server Does

ViettelPay payment gateway integration (mock-only). Create payment requests, query transaction status, and process refunds. This is a mock-only server — all API behavior is assumed. See MOCK_DEVIATIONS.md for all assumptions.

## Tools

| Tool | Description |
|------|-------------|
| `viettel_pay_create_payment` | Create a ViettelPay payment request. Returns a payment URL for the customer. Note: mock-only server. |
| `viettel_pay_query_status` | Check ViettelPay transaction status by transactionId. Note: mock-only server. |
| `viettel_pay_refund` | Refund a ViettelPay transaction. Note: mock-only server. |

## Required Environment Variables

| Variable | Description | Mock Fallback |
|----------|-------------|---------------|
| `VIETTELPAY_SANDBOX` | Enable mock mode (set to `true`) | `true` |
| `VIETTEL_PAY_PARTNER_CODE` | ViettelPay partner code | `VTPAY_DEMO` |
| `VIETTEL_PAY_SECRET_KEY` | Secret key for HMAC-SHA256 signing | `demo_secret_key_vtpay` |
| `VIETTEL_PAY_ENDPOINT` | ViettelPay API endpoint | `https://sandbox.viettelpay.vn/vtpay-api` |

## Enabling Mock Mode

Set `VIETTELPAY_SANDBOX=true` in your `.mcp.json` env block. All tools return deterministic mock responses with `_mock: true`.

**Important:** The env var name is `VIETTELPAY_SANDBOX` (not `VIETTEL_PAY_SANDBOX`).

## Common Workflows

1. **Create and check a payment:**
   - Call `viettel_pay_create_payment` with amount and orderInfo → receive payment URL and transactionId
   - Customer completes payment
   - Call `viettel_pay_query_status` with the transactionId → confirm status success

2. **Create and refund a payment:**
   - Call `viettel_pay_create_payment` → receive transactionId
   - Call `viettel_pay_refund` with transactionId and refund amount

## Mock Deviations

This server models a REST+HMAC-SHA256 API. The real ViettelPay API uses SOAP+RSA. All deviations from real API behavior are documented in MOCK_DEVIATIONS.md.
