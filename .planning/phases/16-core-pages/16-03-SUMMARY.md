---
phase: 16-core-pages
plan: 03
subsystem: ui
tags: [recharts, react, area-chart, usage-analytics, dashboard]

# Dependency graph
requires:
  - phase: 16-core-pages
    provides: useUsage hook, shadcn/ui components (Card, Table, Alert, Badge, Progress)
provides:
  - UsagePage with recharts AreaChart, 30-day simulated daily data, per-server breakdown table, warning banner
affects: [16-core-pages]

# Tech tracking
tech-stack:
  added: [recharts ^3.8.1]
  patterns: [monthly-total-to-daily-distribution, simulated-server-breakdown, dark-mode-compatible-chart-styling]

key-files:
  created: []
  modified:
    - apps/dashboard/src/pages/UsagePage.tsx

key-decisions:
  - "recharts already present in package.json from prior commit (d6676ab); npm install was a no-op confirmation"
  - "generateDailyData distributes monthly total with recency weight + slight randomness for visual interest"
  - "generateServerBreakdown uses fixed realistic weights (MoMo 35%, ZaloPay 25%, VNPAY 20%, Zalo OA 12%, ViettelPay 8%)"
  - "CartesianGrid uses hsl(var(--border)) and Tooltip uses card colors for dark-mode compatibility"
  - "Warning Alert uses destructive variant shown only when usagePercent >= 80 and not loading"

patterns-established:
  - "Chart data simulation: distribute monthly total with recency-weighted random jitter for visual realism"
  - "Dark-mode chart styling: use hsl(var(--border)) for grid, hsl(var(--card)) for tooltip background"
  - "ResponsiveContainer wraps all recharts components for auto-resize"

requirements-completed: [PAGE-03]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 16 Plan 03: Usage Analytics Page Summary

**recharts AreaChart with 30-day simulated daily data, per-server breakdown table, and 80%-threshold warning banner — replacing the placeholder UsagePage**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T13:53:00Z
- **Completed:** 2026-03-25T13:58:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced placeholder UsagePage with full analytics page connected to useUsage() hook
- Area chart with recharts: 30-day simulated distribution from monthly total, blue gradient fill (#2563eb), dark-compatible grid/tooltip
- Usage summary card with Progress bar showing used/limit and reset date
- Per-server breakdown table with 5 MCP servers (realistic proportional weights)
- Destructive Alert warning banner appears when usage >= 80% of monthly limit

## Task Commits

1. **Task 1: Install recharts + build Usage page** - `db08f83` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `apps/dashboard/src/pages/UsagePage.tsx` - Full usage analytics page (195 lines) with AreaChart, summary card, breakdown table, warning banner

## Decisions Made
- recharts was already in package.json from a prior commit — npm install confirmed without changes
- Daily data generation uses recency weighting (30-i)/30 with 30% random jitter for visual interest while distributing from single monthly total
- Server breakdown uses fixed weights matching real Vietnamese payment integrations (MoMo highest at 35%)
- XAxis interval=4 shows every 5th label to prevent overcrowding on 30-day data

## Deviations from Plan

None - plan executed exactly as written. recharts was already installed, UsagePage replaced as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UsagePage fully implemented and building successfully (351KB chunk with recharts)
- Ready for Phase 16 remaining plans (BillingPage, SettingsPage)
- Warning banner threshold (80%) and server simulation are business-logic choices that can be adjusted

---
*Phase: 16-core-pages*
*Completed: 2026-03-25*
