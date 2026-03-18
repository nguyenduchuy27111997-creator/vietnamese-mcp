# ViettelPay Mock Deviations

This server is **mock-only**. ViettelPay has no confirmed public REST API documentation.
The real enterprise API uses SOAP + RSA (per `giautm/viettelpay` Go client), not the
REST + HMAC pattern used here. All API behavior is assumed for internal consistency
with the other MCP servers in this monorepo.

## Assumption Table

| Field | Assumed Value | Source | Confidence | Note |
|-------|---------------|--------|------------|------|
| Auth scheme | HMAC-SHA256 | Inferred from VN payment API industry pattern (MoMo, ZaloPay) | LOW | Real ViettelPay enterprise API uses SOAP+RSA per giautm/viettelpay Go client |
| Endpoint base URL | `https://sandbox.viettelpay.vn/vtpay-api` | Third-party reference | LOW | Not confirmed from official docs; never called in mock mode |
| Request format | JSON REST | Inferred from MoMo/ZaloPay pattern | LOW | Real API uses Gzip-compressed JSON over SOAP |
| Response format | `{ code, message, data: { ... } }` | Inferred from VN payment API convention | LOW | Not confirmed |
| Success code | `'00'` | VN_ERROR_CODES stub in error-codes.ts | LOW | Matches VN convention (VNPAY also uses '00') |
| Insufficient balance code | `'06'` | VN_ERROR_CODES stub in error-codes.ts | LOW | Assumed |
| transactionId format | `VTP_` + 12-char hex | Inferred from MoMo MOMO_ prefix pattern | LOW | Not confirmed |
| paymentUrl format | `https://sandbox.viettelpay.vn/pay/{transactionId}` | Assumed placeholder | LOW | Real flow likely differs (SOAP-based) |
| Partner code env var | `VIETTEL_PAY_PARTNER_CODE` | Inferred from MoMo MOMO_PARTNER_CODE pattern | LOW | Real API uses username/password/serviceCode |
| Secret key env var | `VIETTEL_PAY_SECRET_KEY` | Inferred from MoMo MOMO_SECRET_KEY pattern | LOW | Real API uses RSA key pairs |
| Endpoint env var | `VIETTEL_PAY_ENDPOINT` | Inferred from ZaloPay ZALOPAY_ENDPOINT pattern | LOW | Placeholder only |
| Refund response | Same shape as createPayment | Inferred from MoMo refund pattern | LOW | Not confirmed |
| Query response | Status string + original transaction fields | Inferred from MoMo queryStatus pattern | LOW | Not confirmed |

## Real API Contrast

The real ViettelPay enterprise API (from `giautm/viettelpay` Go package) uses:
- **SOAP protocol** (not REST JSON)
- **RSA asymmetric crypto** (partner private key + Viettel public key)
- **Username/password/serviceCode** authentication envelope
- **Gzip-compressed JSON** payloads

This mock uses REST + HMAC-SHA256 purely for internal consistency. If real API access
is ever obtained, the server will need a complete rewrite of signatures.ts and client.ts.
