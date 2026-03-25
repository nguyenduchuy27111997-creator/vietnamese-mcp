# Phase 16: Core Pages - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Auto-selected recommended defaults

<domain>
## Phase Boundary

Replace the 3 placeholder pages (Overview, API Keys, Usage) with fully designed, data-connected pages using shadcn/ui components. Each page fetches real data from the gateway API and presents it with the Linear/Vercel dark aesthetic.

</domain>

<decisions>
## Implementation Decisions

### Overview Page (PAGE-01)
- Welcome card with user email and current tier badge
- 3 stat cards in a row: Active Keys (count), Usage This Month (used/limit), Current Tier (with upgrade CTA if free)
- Recent activity feed: last 5 tool calls (from Tinybird or usage endpoint) — if not available from API, show "Activity tracking coming soon" placeholder
- Cards use shadcn/ui Card component with subtle border, consistent padding

### API Keys Page (PAGE-02)
- Full-width shadcn/ui Table with columns: Key Prefix, Name, Tier, Created, Status, Actions
- Status column: Badge component — green "Active" or red "Revoked"
- Create key: Button opens Dialog modal with name input field + create button; on success shows key in a highlighted code block with copy animation
- Revoke key: AlertDialog confirmation ("Are you sure? This cannot be undone") → on confirm calls DELETE
- Copy animation: click copies to clipboard, button text changes to "Copied!" for 2 seconds
- Search/filter: simple text input above table filtering by key prefix or name
- Empty state: illustration-free, just text "No API keys yet. Create one to get started." + Create button

### Usage Page (PAGE-03)
- Recharts area chart: daily call count over last 30 days, blue fill (#2563eb with 20% opacity), dark grid lines
- Chart data: fetched from gateway GET /usage or simulated from KV counter (single monthly total → distribute evenly if daily breakdown not available)
- Per-server breakdown table: shadcn/ui Table with Server, Calls, Percentage columns
- Limit warning banner: shadcn/ui Alert (variant="destructive") shown when usage >= 80% of tier limit
- If daily data not available from API: show monthly total as single bar + "Daily breakdown coming in a future update"

### Data Hooks
- Reuse existing hooks: `useKeys()`, `useUsage()`, `useBilling()`
- Add `useOverview()` hook that combines key count + usage + tier into one object
- All hooks already call gateway with JWT auth — no new API endpoints needed

### Claude's Discretion
- Exact Recharts configuration (axis labels, tooltips, responsive container)
- Whether to add loading skeletons or simple "Loading..." text
- Table pagination vs scroll for API keys (if > 10 keys)
- Exact copy animation implementation (CSS transition vs state-based)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### App Shell (Phase 15 output)
- `apps/dashboard/src/components/app-shell.tsx` — layout with Outlet
- `apps/dashboard/src/components/sidebar.tsx` — navigation items
- `apps/dashboard/src/App.tsx` — route definitions (replace placeholder pages)

### Placeholder Pages (to replace)
- `apps/dashboard/src/pages/OverviewPage.tsx` — placeholder
- `apps/dashboard/src/pages/KeysPage.tsx` — placeholder
- `apps/dashboard/src/pages/UsagePage.tsx` — placeholder

### Existing Hooks
- `apps/dashboard/src/hooks/useKeys.ts` — keys CRUD (fetch, create, revoke)
- `apps/dashboard/src/hooks/useUsage.ts` — usage data (used, limit, period, tier)
- `apps/dashboard/src/hooks/useBilling.ts` — billing actions

### shadcn/ui Components (Phase 14)
- `apps/dashboard/src/components/ui/card.tsx`
- `apps/dashboard/src/components/ui/table.tsx`
- `apps/dashboard/src/components/ui/dialog.tsx`
- `apps/dashboard/src/components/ui/badge.tsx`
- `apps/dashboard/src/components/ui/alert.tsx`
- `apps/dashboard/src/components/ui/input.tsx`
- `apps/dashboard/src/components/ui/button.tsx`
- `apps/dashboard/src/components/ui/progress.tsx`

### Gateway API
- `GET /keys` — list user's API keys
- `POST /keys` — create new key (returns raw key once)
- `DELETE /keys/:id` — revoke key
- `GET /usage` — {used, limit, period, tier, resetsAt}

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useKeys()` — already returns `keys`, `loading`, `error`, `createKey`, `revokeKey`
- `useUsage()` — already returns `used`, `limit`, `period`, `tier`, `resetsAt`
- All 14 shadcn/ui components installed and themed
- `cn()` utility for conditional class merging
- Tailwind dark mode tokens in globals.css

### Established Patterns
- Hooks fetch from `GATEWAY_URL` with JWT auth header
- Pages are lazy-loaded via React.lazy in App.tsx
- Dark mode via CSS class strategy (ThemeProvider)

### Integration Points
- Replace placeholder page components with real implementations
- No route changes needed — routes already defined in App.tsx
- Add `recharts` package to dashboard dependencies
- New hook: `useOverview()` combining existing hooks

</code_context>

<specifics>
## Specific Ideas

- Overview stat cards should use subtle gradient backgrounds in dark mode (very subtle, like Vercel)
- API Keys table should feel dense but readable — like a Stripe dashboard table
- Usage chart should be the visual centerpiece — large, clear, blue accent fill

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-core-pages*
*Context gathered: 2026-03-25 via auto-select*
