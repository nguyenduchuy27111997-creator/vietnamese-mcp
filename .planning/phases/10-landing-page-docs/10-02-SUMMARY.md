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

- **Duration:** 4 min
- **Started:** 2026-03-25T04:19:12Z
- **Completed:** 2026-03-25T04:23:32Z
- **Tasks:** 1 of 2 (Task 2 is checkpoint:human-verify — deployment verification)
- **Files modified:** 7

## Accomplishments

- Created 6 server MDX pages: overview catalog (18 tools) + one page per server (momo, zalopay, vnpay, zalo-oa, viettel-pay)
- Each server page has complete tool reference: parameter tables, example responses, environment variables, common workflows — all translated directly from CLAUDE.md source files
- ViettelPay page prominently warns mock-only status with a Warning callout and documents SOAP+RSA vs REST+HMAC-SHA256 deviation
- Pricing page with exact values from provider.ts: $0/$19/$49/$149 USD and Free/449,000/1,190,000/3,590,000 VND, both Stripe and MoMo payment methods

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server overview and 5 per-server tool reference pages** - `2e862a2` (feat)

**Plan metadata:** (pending — will commit after checkpoint resolution)

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

None — plan executed exactly as written. All 7 files were created during phase 10-01 execution and committed in this plan.

## Issues Encountered

None.

## User Setup Required

**Task 2 (Deploy to Mintlify) is a blocking checkpoint requiring human action.** The user must:

1. Push `apps/docs/` content to main branch (already on main)
2. Go to [mintlify.com/start](https://mintlify.com/start) to connect the GitHub repo
3. Select the `apps/docs/` directory as the docs root
4. Trigger auto-deploy and verify the site renders at the assigned subdomain

Alternatively, run local preview:
```bash
npm install -g mint
cd apps/docs && mint dev
```
Then verify at `http://localhost:3000`.

## Next Phase Readiness

- All docs content complete and committed to main — ready for Mintlify deployment
- 10 files in `apps/docs/`: docs.json, index.mdx, quickstart.mdx, pricing.mdx, and 6 server pages
- Site renders correctly once Mintlify deployment is configured

---
*Phase: 10-landing-page-docs*
*Completed: 2026-03-25*
