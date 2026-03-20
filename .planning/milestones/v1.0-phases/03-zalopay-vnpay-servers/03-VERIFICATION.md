---
phase: 03-zalopay-vnpay-servers
verified: 2026-03-18T13:30:30Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 3: ZaloPay + VNPAY Servers Verification Report

**Phase Goal:** Two additional payment servers are working in mock mode, each with a distinct auth scheme proven against the shared http-client factory
**Verified:** 2026-03-18T13:30:30Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

#### ZaloPay (Plan 01)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Claude Code can call `zalopay_create_order` and receive a mock order with `paymentUrl` and `_mock:true` | VERIFIED | Test 1 passes: `data._mock === true`, `typeof data.paymentUrl === 'string'` |
| 2  | Claude Code can call `zalopay_query_order` with an app_trans_id and receive a mock status response | VERIFIED | Test 3 passes: `queried.app_trans_id === created.app_trans_id`, `queried._mock === true` |
| 3  | Claude Code can call `zalopay_refund` with a zp_trans_id and receive a successful mock refund | VERIFIED | Test 4 passes: `data._mock === true`, `data.return_code === 1` |
| 4  | Claude Code can call `zalopay_validate_callback` with a correctly-signed payload and get `valid:true` | VERIFIED | Test 5 passes: `data.valid === true` using `buildCallbackSignature(..., credentials.key2)` |
| 5  | `zalopay_validate_callback` rejects tampered payloads with `valid:false` | VERIFIED | Test 6 passes: `data.valid === false` after modifying `data` field post-MAC-computation |
| 6  | `zalopay_create_order` with amount=99999999 returns `isError:true` | VERIFIED | Test 7 passes: `result.isError === true` |
| 7  | All ZaloPay tools pass vitest integration tests with ZALOPAY_SANDBOX=true | VERIFIED | `npm test` output: 7/7 tests passed |

#### VNPAY (Plan 02)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 8  | Claude Code can call `vnpay_create_payment_url` and receive a mock signed payment URL with `_mock:true` | VERIFIED | Test 1 passes: `data._mock === true`, `data.paymentUrl` contains `vnp_TxnRef=`, `data.orderId` matches `VNP_` prefix |
| 9  | Claude Code can call `vnpay_verify_return` with a correctly-signed return URL and get `valid:true` | VERIFIED | Test 3 passes: full URL round-trip valid, Test 5 passes: bare query string also valid |
| 10 | `vnpay_verify_return` rejects tampered return URLs with `valid:false` | VERIFIED | Test 4 passes: `data.valid === false` after changing `vnp_Amount` post-hash |
| 11 | Claude Code can call `vnpay_query_transaction` and receive mock transaction data with `_mock:true` | VERIFIED | Test 6 passes: `data._mock === true`, `data.vnp_TxnRef === 'VNP_test123'`, `data.vnp_ResponseCode === '00'` |
| 12 | `vnpay_create_payment_url` with amount=99999999 returns `isError:true` | VERIFIED | Test 7 passes: `result.isError === true` |
| 13 | All VNPAY tools pass vitest integration tests with VNPAY_SANDBOX=true | VERIFIED | `npm test` output: 7/7 tests passed |

**Score:** 13/13 truths verified

---

### Required Artifacts

#### ZaloPay server

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `servers/mcp-zalopay-vn/src/credentials.ts` | ZaloPay credential loading with sandbox fallbacks | VERIFIED | Exports `getZaloPayCredentials`, `ZaloPayCredentials`; fallback `appId='2553'` |
| `servers/mcp-zalopay-vn/src/signatures.ts` | Per-endpoint HMAC-SHA256 signature builders | VERIFIED | Imports `signHmacSha256` from `@vn-mcp/shared`; exports all 4 builders; `buildCallbackSignature` uses `key2` parameter |
| `servers/mcp-zalopay-vn/src/client.ts` | Mock/real client switcher with deterministic app_trans_id | VERIFIED | Exports `zaloPayClient`; `isMockMode('zalopay')` present; `amount === 99999999` error trigger; `YYMMDD_` prefix generation |
| `servers/mcp-zalopay-vn/src/tools/index.ts` | Tool registration barrel | VERIFIED | Exports `registerAll` calling all 4 register functions |
| `servers/mcp-zalopay-vn/src/index.ts` | MCP server bootstrap | VERIFIED | `registerAll(server)` called before `server.connect(transport)`; `name: 'mcp-zalopay-vn'` |
| `servers/mcp-zalopay-vn/src/__tests__/integration.test.ts` | 7 integration tests covering all 4 tools + error paths | VERIFIED | 7 `it(` blocks, all pass |
| `servers/mcp-zalopay-vn/src/mock/createOrder.json` | Mock fixture | VERIFIED | File exists |
| `servers/mcp-zalopay-vn/src/mock/queryOrder.json` | Mock fixture | VERIFIED | File exists |
| `servers/mcp-zalopay-vn/src/mock/refund.json` | Mock fixture | VERIFIED | File exists |
| `servers/mcp-zalopay-vn/src/mock/errorInsufficientBalance.json` | Mock fixture | VERIFIED | File exists |

#### VNPAY server

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `servers/mcp-vnpay/src/credentials.ts` | VNPAY credential loading with sandbox fallbacks | VERIFIED | Exports `getVnpayCredentials`, `VnpayCredentials`; fallback `tmnCode='VNPAY_TMN_DEMO'` |
| `servers/mcp-vnpay/src/signatures.ts` | URL-parameter HMAC-SHA512 signer (alphabetical sort) | VERIFIED | Imports `signHmacSha512` (not sha256); `buildVnpaySecureHash` with `.filter(... 'vnp_SecureHash')` and `.sort(...localeCompare)` |
| `servers/mcp-vnpay/src/client.ts` | Mock/real client switcher with URL construction | VERIFIED | Exports `vnpayClient`; `isMockMode('vnpay')` present; `amount * 100` conversion; `Amount / 100` on verify |
| `servers/mcp-vnpay/src/tools/index.ts` | Tool registration barrel | VERIFIED | Exports `registerAll` calling all 3 register functions |
| `servers/mcp-vnpay/src/index.ts` | MCP server bootstrap | VERIFIED | `registerAll(server)` called before `server.connect(transport)`; `name: 'mcp-vnpay'` |
| `servers/mcp-vnpay/src/__tests__/integration.test.ts` | 7 integration tests covering all 3 tools + verification + error paths | VERIFIED | 7 `it(` blocks, all pass |
| `servers/mcp-vnpay/src/mock/createPaymentUrl.json` | Mock fixture | VERIFIED | File exists |
| `servers/mcp-vnpay/src/mock/queryTransaction.json` | Mock fixture | VERIFIED | File exists |
| `servers/mcp-vnpay/src/mock/errorInsufficientBalance.json` | Mock fixture | VERIFIED | File exists |

#### Shared + config artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/errors/error-codes.ts` | VN_ERROR_CODES extended for ZaloPay and VNPAY | VERIFIED | `zalopay: { '-54': 'Insufficient balance', '-68': 'Duplicate app_trans_id' }`; full VNPAY table including `'24'`, `'51'`, `'99'` |
| `.mcp.json` | 3 server entries: momo-vn, zalopay-vn, vnpay | VERIFIED | All 3 entries present with correct env vars |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `servers/mcp-zalopay-vn/src/client.ts` | `@vn-mcp/shared` | `isMockMode('zalopay')` | WIRED | Line 1: `import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared'`; Line 58: `isMockMode('zalopay')` |
| `servers/mcp-zalopay-vn/src/signatures.ts` | `@vn-mcp/shared` | `signHmacSha256` | WIRED | Line 1: `import { signHmacSha256 } from '@vn-mcp/shared'`; used in all 4 builder functions |
| `servers/mcp-zalopay-vn/src/tools/*.ts` | `servers/mcp-zalopay-vn/src/client.ts` | `zaloPayClient` import | WIRED | All 3 business tools import and call `zaloPayClient` methods; `validateCallback.ts` imports from credentials + signatures directly |
| `servers/mcp-zalopay-vn/src/index.ts` | `servers/mcp-zalopay-vn/src/tools/index.ts` | `registerAll(server)` | WIRED | Line 12: `registerAll(server)` before `server.connect(transport)` |
| `servers/mcp-vnpay/src/signatures.ts` | `@vn-mcp/shared` | `signHmacSha512` (not sha256) | WIRED | Line 1: `import { signHmacSha512 } from '@vn-mcp/shared'`; used in `buildVnpaySecureHash` |
| `servers/mcp-vnpay/src/client.ts` | `@vn-mcp/shared` | `isMockMode('vnpay')` | WIRED | Line 1: `import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared'`; Line 83: `isMockMode('vnpay')` |
| `servers/mcp-vnpay/src/tools/*.ts` | `servers/mcp-vnpay/src/client.ts` | `vnpayClient` import | WIRED | All 3 tools import and call `vnpayClient` methods |
| `servers/mcp-vnpay/src/index.ts` | `servers/mcp-vnpay/src/tools/index.ts` | `registerAll(server)` | WIRED | Line 11: `registerAll(server)` before `server.connect(transport)` |

**Architectural proof point confirmed:** `signatures.ts` in ZaloPay uses `signHmacSha256` with pipe-separated POST body fields; `signatures.ts` in VNPAY uses `signHmacSha512` with alphabetically-sorted URL parameters. Both consume the same shared HMAC primitives from `@vn-mcp/shared`.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ZPAY-01 | 03-01-PLAN.md | `zalopay_create_order` — create order with redirect URL | SATISFIED | Tool registered, mock returns `paymentUrl`, tests 1-2 pass |
| ZPAY-02 | 03-01-PLAN.md | `zalopay_query_order` — check status by app_trans_id | SATISFIED | Tool registered, mock returns status with echoed `app_trans_id`, test 3 passes |
| ZPAY-03 | 03-01-PLAN.md | `zalopay_refund` — refund by zp_trans_id | SATISFIED | Tool registered, mock returns `return_code: 1`, test 4 passes |
| ZPAY-04 | 03-01-PLAN.md | `zalopay_validate_callback` — validate callback MAC | SATISFIED | Tool registered, uses `key2` for MAC; valid/tampered round-trips confirmed, tests 5-6 pass |
| ZPAY-05 | 03-01-PLAN.md | Sandbox mock mode for all ZaloPay tools | SATISFIED | `ZALOPAY_SANDBOX=true` activates mock path; all tools return `_mock:true`; error trigger at `99999999` returns `isError:true` |
| VNPY-01 | 03-02-PLAN.md | `vnpay_create_payment_url` — build signed payment URL | SATISFIED | Tool registered, URL contains `vnp_TxnRef`, deterministic `VNP_` prefix, tests 1-2 pass |
| VNPY-02 | 03-02-PLAN.md | `vnpay_verify_return` — verify return URL signature | SATISFIED | Tool registered, accepts full URL and bare query string, rejects tampered params, tests 3-5 pass |
| VNPY-03 | 03-02-PLAN.md | `vnpay_query_transaction` — query transaction status | SATISFIED | Tool registered, mock returns transaction data with echoed `txnRef`, test 6 passes |
| VNPY-04 | 03-02-PLAN.md | Sandbox mock mode for all VNPAY tools | SATISFIED | `VNPAY_SANDBOX=true` activates mock path; error trigger at `99999999` returns `isError:true`, test 7 passes |

All 9 requirements from phase 3 plans are satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `servers/mcp-zalopay-vn/src/__tests__/integration.test.ts` | 19-21 | `parseResult` typed as `{ isError?: boolean; content: Array<{ type: string; text: string }> }` — incompatible with actual `callTool` return type (union includes image/audio content types) | Warning | TypeScript strict-mode `tsc --noEmit` fails with 8 errors in this file only; vitest uses esbuild transpilation so all 7 tests still pass. Same pre-existing pattern exists in mcp-momo-vn. Source files (non-test) compile cleanly. |

**No blockers.** The TypeScript type mismatch is confined to test file `parseResult` parameter, does not affect runtime behavior, and was explicitly acknowledged as a deferred pre-existing issue in SUMMARY 01. VNPAY's integration test correctly uses `any` type and compiles without errors.

**No console.log violations** found in any source file (excluding test files).

---

### Human Verification Required

None. All phase goals were verified programmatically via integration test execution.

---

## Summary

Phase 3 goal is fully achieved. Both servers are substantive, wired, and passing:

- **ZaloPay server:** 4 tools registered via MCP. Dual-key HMAC-SHA256 scheme implemented: `key1` signs outbound requests (pipe-separated fields), `key2` signs callback MAC. All 7 integration tests pass with `ZALOPAY_SANDBOX=true`. Deterministic `app_trans_id` with `YYMMDD_` prefix confirmed.

- **VNPAY server:** 3 tools registered via MCP. URL-parameter HMAC-SHA512 scheme implemented: alphabetically sorted `vnp_` params, URL-encoded, signed via `signHmacSha512` from shared package. `verifyReturn` handles both full HTTPS URLs and bare query strings. VND x100 conversion round-trips correctly. All 7 integration tests pass with `VNPAY_SANDBOX=true`.

- **Distinct auth schemes proven against shared factory:** ZaloPay uses `signHmacSha256` (POST body fields, pipe-separated); VNPAY uses `signHmacSha512` (sorted URL params). Both import from `@vn-mcp/shared` and the round-trip tests confirm the shared HMAC primitives work correctly for both strategies.

- **Supporting infrastructure:** `VN_ERROR_CODES` extended with ZaloPay (`-54`, `-68`) and full VNPAY table (10 codes). `.mcp.json` has all 3 server entries (`momo-vn`, `zalopay-vn`, `vnpay`).

One non-blocking warning: ZaloPay integration test file has TypeScript strict-mode type errors in `parseResult` (8 errors, all in `__tests__/`). Tests pass at runtime. This is a deferred known issue — same pattern as mcp-momo-vn template.

---

_Verified: 2026-03-18T13:30:30Z_
_Verifier: Claude (gsd-verifier)_
