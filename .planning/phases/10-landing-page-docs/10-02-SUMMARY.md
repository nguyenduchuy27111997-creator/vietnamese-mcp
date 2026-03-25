---
phase: 10-landing-page-docs
plan: 02
subsystem: docs
tags: [mintlify, mdx, documentation, mcp-servers, momo, zalopay, vnpay, zalo-oa, viettel-pay]

# Dependency graph
requires:
  - phase: 10-01
    provides: Mintlify scaffold (docs.json, index.mdx, quickstart.mdx, landing page with pricing)
provides:
  - Per-server tool reference pages for all 5 MCP servers
  - Server overview/catalog page listing all 18 tools
  - Pricing detail page with exact USD and VND values
  - Complete documentation ready for Mintlify deployment
affects: [docs deployment, server reference, pricing]

# Tech tracking
tech-stack:
  added: []
  patterns: [MDX tool reference page per server — overview table + per-tool sections with parameters and response examples]

key-files:
  created:
    - apps/docs/servers/overview.mdx
    - apps/docs/servers/momo.mdx
    - apps/docs/servers/zalopay.mdx
    - apps/docs/servers/vnpay.mdx
    - apps/docs/servers/zalo-oa.mdx
    - apps/docs/servers/viettel-pay.mdx
    - apps/docs/pricing.mdx
  modified: []

key-decisions:
  - "ViettelPay page uses prominent Warning callout (not just Note) to surface mock-only status clearly"
  - "pricing.mdx is not added to docs.json navigation — linked from landing page directly per plan spec"
  - "VIETTELPAY_SANDBOX (not VIETTEL_PAY_SANDBOX) env var name difference documented with Warning callout"

patterns-established:
  - "Server reference page pattern: Overview -> Tools table -> per-tool section (params table + example response) -> Environment Variables -> Common Workflows"

requirements-completed: [SITE-03, SITE-04]

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 10 Plan 02: Server Reference Pages Summary

**5 MCP server tool reference pages (18 tools total) and pricing page in MDX, ready for Mintlify deployment**

## Performance

- **Duration:** ~10 min (including checkpoint wait and docs.json fix)
- **Started:** 2026-03-25T04:19:12Z
- **Completed:** 2026-03-25T04:30:00Z
- **Tasks:** 2 of 2
- **Files modified:** 8

## Accomplishments

- Created 6 server MDX pages: overview catalog (18 tools) + one page per server (momo, zalopay, vnpay, zalo-oa, viettel-pay)
- Each server page has complete tool reference: parameter tables, example responses, environment variables, common workflows — all translated directly from CLAUDE.md source files
- ViettelPay page prominently warns mock-only status with a Warning callout and documents SOAP+RSA vs REST+HMAC-SHA256 deviation
- Pricing page with exact values from provider.ts: $0/$19/$49/$149 USD and Free/449,000/1,190,000/3,590,000 VND, both Stripe and MoMo payment methods

## Task Commits

Each task were committed atomically:

1. **Task 1: Create server overview and 5 per-server tool reference pages** - `2e862a2` (feat)
2. **Task 2: Deploy to Mintlify and verify public access** - checkpoint approved; fix committed `1ec24fb` (fix)

**Plan metadata:** (committed with SUMMARY/STATE/ROADMAP update)

## Files Created/Modified

- `apps/docs/servers/overview.mdx` - Server catalog table: all 5 servers, 18 tools, links to individual pages
- `apps/docs/servers/momo.mdx` - MoMo: 4 tools (create_payment, query_status, refund, validate_ipn)
- `apps/docs/servers/zalopay.mdx` - ZaloPay: 4 tools (create_order, query_order, refund, validate_callback)
- `apps/docs/servers/vnpay.mdx` - VNPAY: 3 tools (create_payment_url, verify_return, query_transaction)
- `apps/docs/servers/zalo-oa.mdx` - Zalo OA: 4 tools (send_message, get_follower_profile, list_followers, refresh_token)
- `apps/docs/servers/viettel-pay.mdx` - ViettelPay: 3 tools, mock-only warning, VIETTELPAY_SANDBOX env var note
- `apps/docs/pricing.mdx` - 4-tier pricing with exact USD + VND values, Stripe and MoMo payment sections

## Decisions Made

- ViettelPay page uses `<Warning>` callout (not `<Note>`) — mock-only status needs high visibility since accidentally using this server in production could mislead developers
- pricing.mdx is NOT added to docs.json navigation per plan spec — it is linked directly from the landing page, keeping sidebar focused on technical reference
- VIETTELPAY_SANDBOX naming anomaly documented with a second `<Warning>` callout for developer ergonomics

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed docs.json navigation schema for Mintlify v4**
- **Found during:** Task 2 (Mintlify deployment verification)
- **Issue:** docs.json used the old `navigation` array format; Mintlify v4 requires a `navigation` object with `dropdowns` array wrapping tabs and groups
- **Fix:** Rewrote navigation schema to use `dropdowns` with `groups` nesting per Mintlify v4 spec
- **Files modified:** apps/docs/docs.json
- **Verification:** Local preview at http://localhost:3333 — all pages returned 200, navigation sidebar rendered correctly
- **Committed in:** `1ec24fb` fix(10): correct docs.json navigation schema for Mintlify v4

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for site to render — zero scope creep.

## Issues Encountered

None.

## User Setup Required

None — local preview verified at http://localhost:3333, all pages rendered correctly. Code pushed to main. Full Mintlify cloud deployment can be triggered at mintlify.com/start by connecting the GitHub repo and pointing to `apps/docs/`.

## Next Phase Readiness

- All docs content complete, nav schema corrected, committed to main — ready for Mintlify cloud deployment
- 10 files in `apps/docs/`: docs.json, index.mdx, quickstart.mdx, pricing.mdx, and 6 server pages
- Local preview verified at http://localhost:3333: all pages render, navigation sidebar shows Getting Started and Server Reference groups correctly
- Phase 9 (npm Publishing) remains incomplete (1/2 plans) — Phase 10 docs referencing npm packages can be updated after Phase 9 completes

## Self-Check: PASSED

- apps/docs/servers/overview.mdx — FOUND
- apps/docs/servers/momo.mdx — FOUND
- apps/docs/servers/zalopay.mdx — FOUND
- apps/docs/servers/vnpay.mdx — FOUND
- apps/docs/servers/zalo-oa.mdx — FOUND
- apps/docs/servers/viettel-pay.mdx — FOUND
- apps/docs/pricing.mdx — FOUND
- apps/docs/docs.json — FOUND
- .planning/phases/10-landing-page-docs/10-02-SUMMARY.md — FOUND
- Task commit 2e862a2 — FOUND
- Task commit 1ec24fb — FOUND

---
*Phase: 10-landing-page-docs*
*Completed: 2026-03-25*
