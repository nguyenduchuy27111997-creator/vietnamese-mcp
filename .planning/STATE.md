---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 4 context gathered
last_updated: "2026-03-18T07:47:47.791Z"
last_activity: 2026-03-18 — Plan 02-01 completed
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
  percent: 31
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Developer installs MCP server, adds to `.mcp.json`, and Claude Code can immediately create payments, check transactions, send messages — zero integration boilerplate.
**Current focus:** Phase 2 in progress — mcp-momo-vn scaffold complete, tools + tests remain

## Current Position

Phase: 2 of 4 (MoMo Server) — IN PROGRESS
Plan: 1 of 3 in phase 02 — COMPLETE (plan 02-01 done)
Status: Phase 2 in progress
Last activity: 2026-03-18 — Plan 02-01 completed

Progress: [███░░░░░░░] 31%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 2.3 min
- Total execution time: 0.12 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-monorepo-foundation | 3 | 7 min | 2.3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (4 min), 01-03 (1 min)
- Trend: -

*Updated after each plan completion*
| Phase 01-monorepo-foundation P02 | 4 min | 2 tasks | 18 files |
| Phase 01-monorepo-foundation P03 | 1 min | 2 tasks | 4 files |
| Phase 02-momo-server P01 | 3 min | 2 tasks | 11 files |
| Phase 02-momo-server P02 | 2 min | 2 tasks | 6 files |
| Phase 02-momo-server P03 | 3 min | 2 tasks | 2 files |
| Phase 03-zalopay-vnpay-servers P01 | 5 min | 2 tasks | 19 files |
| Phase 03-zalopay-vnpay-servers P02 | 5 | 2 tasks | 16 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Monorepo with npm workspaces (not separate repos) — shared utilities justify shared repo
- [Init]: Mock-first — no API accounts yet; mock mode is first-class, not an afterthought
- [Init]: Build MoMo first to validate patterns before replicating to remaining 4 servers
- [Init]: ViettelPay built last due to LOW confidence in public API documentation
- [01-01]: ESLint ignores .claude/** and .planning/** — GSD tooling uses CJS require() which violates ESM linting rules
- [01-01]: tsdown outputs to dist/ (tsdown convention) for packages/shared; tsc outDir (./build) used for direct compilation
- [01-01]: packages/shared exports map uses source .ts paths for workspace development
- [Phase 01-02]: HMAC signing functions are node:crypto primitives only — field ordering per-server per PITFALLS.md
- [Phase 01-02]: translateErrorCode uses raw error_code as lookup key (e.g. '1005', not 'MOMO_1005')
- [Phase 01-02]: ESLint ignores extended to **/dist/** and **/build/** to cover nested package build output
- [Phase 01-03]: validateToolName uses /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*){2,}$/ — underscore-in-service-name (zalo_oa) is valid
- [Phase 01-03]: Zod schemas are per-server inline (INFRA-05) — integration test establishes the reference pattern
- [Phase 02-01]: TypeScript composite project references require packages/shared built with tsc --build before momo-vn tsc --noEmit
- [Phase 02-01]: momoClient curated responses exclude requestId from queryStatus/refund (not in output spec)
- [Phase 02-momo-server]: validateIpn uses getMomoCredentials() + buildIpnSignature() directly — no isMockMode check, real HMAC always runs
- [Phase 02-momo-server]: registerAll(server) called before server.connect(transport) per MCP bootstrap ordering requirement
- [Phase 02-momo-server]: Integration tests use in-memory MCP transport (no HTTP server) via createTestClient — consistent with shared package pattern
- [Phase 02-momo-server]: .mcp.json uses MoMo published sandbox credentials — safe to commit, server works out of the box
- [Phase 03-zalopay-vnpay-servers]: ZaloPay callback validation uses key2 (not key1) for HMAC-SHA256 over raw data field string
- [Phase 03-zalopay-vnpay-servers]: Pipe-separated field ordering for all ZaloPay signatures (not &key=value like MoMo)
- [Phase 03-zalopay-vnpay-servers]: buildVnpaySecureHash uses signHmacSha512 from shared (NOT sha256) — architectural proof that shared HMAC primitives handle different signing strategies
- [Phase 03-zalopay-vnpay-servers]: VNPAY credentials use placeholder VNPAY_TMN_DEMO / VNPAY_HASH_SECRET_DEMO — no public sandbox test values available unlike MoMo
- [Phase 03-zalopay-vnpay-servers]: verifyReturn accepts both full HTTPS URL and bare query string — handles VNPAY gateway return redirect variations

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: MoMo sandbox may require physical device for IPN callback simulation — verify before Phase 2 planning
- [Phase 3]: ZaloPay MAC scheme (HMAC vs RSA) discrepancy between research sources — must be resolved in Phase 3 research
- [Phase 4]: ViettelPay has no confirmed public API docs in English — MOCK_DEVIATIONS.md will document all assumptions
- [Phase 4]: Zalo OA access_token TTL cited as "~1 hour" from third-party source only — verify from official Zalo docs in Phase 4 research

## Session Continuity

Last session: 2026-03-18T07:47:47.789Z
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-zalo-oa-viettelpay-servers/04-CONTEXT.md
