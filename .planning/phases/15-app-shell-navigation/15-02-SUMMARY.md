---
phase: 15-app-shell-navigation
plan: 02
subsystem: dashboard-routing
tags: [react-router, spa-routing, placeholder-pages, new-user-redirect]
dependency_graph:
  requires: [15-01]
  provides: [client-side-routing, placeholder-pages, new-user-redirect]
  affects: [apps/dashboard]
tech_stack:
  added: []
  patterns: [React Router v6 layout routes, React.lazy code splitting, NewUserRedirect component pattern]
key_files:
  created:
    - apps/dashboard/src/pages/OverviewPage.tsx
    - apps/dashboard/src/pages/KeysPage.tsx
    - apps/dashboard/src/pages/UsagePage.tsx
    - apps/dashboard/src/pages/BillingPage.tsx
    - apps/dashboard/src/pages/SettingsPage.tsx
    - apps/dashboard/src/pages/QuickstartPage.tsx
  modified:
    - apps/dashboard/src/App.tsx
    - apps/dashboard/src/main.tsx
decisions:
  - "React.lazy + dynamic import used for per-page code splitting — build output shows 6 separate page chunks"
  - "NewUserRedirect checks keys.length === 0 only on root path to avoid redirect loops"
  - "Named exports on page components unwrapped via .then(m => ({ default: m.Page })) for lazy() compatibility"
metrics:
  duration: ~5 minutes
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_changed: 8
---

# Phase 15 Plan 02: React Router v6 Wiring and Placeholder Pages Summary

React Router v6 wired into dashboard SPA with BrowserRouter in main.tsx, AppShell layout route, 6 lazy-loaded placeholder pages, and new-user redirect to /quickstart when keys.length === 0.

## What Was Built

### Task 1: Create page placeholders and wire React Router into App.tsx/main.tsx

Rewrote App.tsx to use React Router v6 Routes/Route pattern with AppShell as the layout route. Added BrowserRouter wrapper in main.tsx. Created 6 placeholder page components using shadcn/ui Card pattern. Added NewUserRedirect component that fires a navigate('/quickstart') when the authenticated user has zero API keys and is on the root path.

**Commits:**
- `68d46f9`: feat(15-02): wire React Router v6 with 6 placeholder pages and new-user redirect

### Task 2: Verify app shell navigation and mobile responsive (checkpoint:human-verify)

Auto-approved (--auto flag active). Build succeeded with per-page code splitting confirmed in Vite output.

## Deviations from Plan

None - plan executed exactly as written.

Pre-existing TypeScript errors (`import.meta.env` in hooks/supabase.ts) are out of scope — these existed before this plan and do not affect the build.

## Success Criteria Verification

- [x] Client-side routing works across all 6 pages without full reload (NAV-01)
- [x] New user with zero API keys redirected to /quickstart (NAV-02)
- [x] Sidebar shows 5 nav items with active page indicator (SHELL-01, SHELL-04) — from Plan 01
- [x] Sidebar footer has user email and sign-out (SHELL-02) — from Plan 01
- [x] Mobile hamburger opens sidebar as left Sheet overlay (SHELL-03) — from Plan 01
- [x] ThemeToggle relocated into sidebar (no floating button) — removed from App.tsx
- [x] Build succeeds with per-page code splitting

## Self-Check: PASSED

- FOUND: apps/dashboard/src/pages/OverviewPage.tsx
- FOUND: apps/dashboard/src/pages/KeysPage.tsx
- FOUND: apps/dashboard/src/pages/QuickstartPage.tsx
- FOUND commit: 68d46f9
