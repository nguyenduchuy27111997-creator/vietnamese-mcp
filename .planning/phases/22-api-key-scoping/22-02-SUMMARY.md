---
phase: 22-api-key-scoping
plan: 02
subsystem: ui
tags: [react, shadcn, dashboard, api-keys, scoping, checkboxes, badges]

# Dependency graph
requires:
  - phase: 22-api-key-scoping/22-01
    provides: "gateway POST /keys accepts allowed_servers array; GET /keys returns allowed_servers field"
provides:
  - "Checkbox component at apps/dashboard/src/components/ui/checkbox.tsx"
  - "ApiKey type extended with allowed_servers: string[] | null"
  - "createKey(name?, allowedServers?) sends allowed_servers to gateway"
  - "Create Key dialog with 5 server checkboxes (all checked by default)"
  - "API Keys table Scope column with per-key server badges"
  - "All servers badge for null/undefined allowed_servers (legacy keys)"
affects:
  - "Future dashboard plans — Checkbox component available for reuse"
  - "Phase 22 complete — SCOPE-02 and SCOPE-04 requirements satisfied"

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-checkbox (via shadcn/ui Checkbox)"
  patterns:
    - "shadcn/ui Checkbox installed via npx shadcn@latest add checkbox"
    - "Server constants as const array (ALL_SERVERS) with id/label pairs for both checkbox and badge rendering"
    - "null allowed_servers treated as all-server access in badge display"

key-files:
  created:
    - apps/dashboard/src/components/ui/checkbox.tsx
  modified:
    - apps/dashboard/src/hooks/useKeys.ts
    - apps/dashboard/src/pages/KeysPage.tsx

key-decisions:
  - "When all 5 servers are selected, send undefined (null in DB) rather than explicit array — cleaner semantics: null = unrestricted, array = explicit whitelist"
  - "Create button disabled when 0 servers selected — prevents creating a permanently blocked key by accident"
  - "ALL_SERVERS constant shared between checkbox section and badge rendering to keep label/id mapping DRY"

patterns-established:
  - "Server id/label pair pattern: { id: 'momo', label: 'MoMo' } — id matches gateway VALID_SERVERS, label is display text"
  - "Scope badge variants: secondary = All servers, outline = named server, destructive = No servers"

requirements-completed: [SCOPE-02, SCOPE-04]

# Metrics
duration: ~5min (including human verification checkpoint)
completed: 2026-03-27
---

# Phase 22 Plan 02: API Key Scoping Dashboard UI Summary

**shadcn/ui Checkbox component + 5-server scope selector in Create Key dialog + per-key Scope badge column in API Keys table**

## Performance

- **Duration:** ~5 min (including human verification checkpoint)
- **Started:** 2026-03-27T04:00:00Z
- **Completed:** 2026-03-27T05:03:43Z
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Installed shadcn/ui Checkbox via CLI; component available at `apps/dashboard/src/components/ui/checkbox.tsx`
- Extended `ApiKey` type with `allowed_servers: string[] | null`; `createKey` now accepts optional `allowedServers` array sent in POST body
- Create Key dialog shows 5 server checkboxes (MoMo, ZaloPay, VNPAY, Zalo OA, ViettelPay) — all checked by default; Create button disabled if none selected
- API Keys table has new "Scope" column: per-key server badges (outline), "All servers" badge (secondary) for null, "No servers" badge (destructive) for empty array
- Human verification confirmed: checkboxes render in create dialog, scope badges display correctly in table

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Checkbox, update useKeys, add scope UI to KeysPage** - `c5899f8` (feat)
2. **Task 2: Visual verification of scope UI** - checkpoint approved by user (no code commit — verification task)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `apps/dashboard/src/components/ui/checkbox.tsx` - shadcn/ui Checkbox component (Radix-based)
- `apps/dashboard/src/hooks/useKeys.ts` - ApiKey type + allowed_servers field; createKey accepts allowedServers param
- `apps/dashboard/src/pages/KeysPage.tsx` - ALL_SERVERS constant, selectedServers state, checkbox section in dialog, Scope column with badges

## Decisions Made
- When all 5 servers selected, send `undefined` (stored as NULL in DB) — matches 22-01 semantics where null = unrestricted access
- Disable Create button when zero servers selected — a key with no servers is functionally useless and likely a user mistake
- ALL_SERVERS as `as const` typed tuple — enables type-safe label lookup for badge rendering without a separate map

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Scope UI connects to gateway POST /keys which was updated in Plan 22-01.

## Next Phase Readiness
- SCOPE-02 and SCOPE-04 requirements complete — create dialog and table both expose scoping
- Full API key scoping feature (Phase 22) is now done: gateway enforces scopes (22-01) and dashboard exposes scope configuration (22-02)
- No blockers for downstream phases

---
*Phase: 22-api-key-scoping*
*Completed: 2026-03-27*

## Self-Check: PASSED

All artifacts verified:
- checkbox.tsx: FOUND
- useKeys.ts: FOUND
- KeysPage.tsx: FOUND

Commits verified:
- c5899f8 (Task 1): FOUND
