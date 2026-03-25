# Phase 14: Design System Foundation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Auto-selected recommended defaults

<domain>
## Phase Boundary

Install and configure Tailwind CSS + shadcn/ui in apps/dashboard. Set up dark mode as default with light mode toggle. Define color palette, typography, and spacing tokens matching Linear/Vercel aesthetic. Replace existing inline styles foundation.

</domain>

<decisions>
## Implementation Decisions

### Tailwind + shadcn/ui Setup
- Install Tailwind CSS v3 + PostCSS + autoprefixer in apps/dashboard
- Initialize shadcn/ui with `npx shadcn@latest init` — use "new-york" style variant (cleaner, more Linear-like)
- Install components as needed: Button, Card, Table, Dialog, Input, Badge, Tabs, Avatar, DropdownMenu, Sheet, Switch, Progress, Alert, Tooltip
- Keep existing React + Vite setup — Tailwind integrates via PostCSS plugin

### Color Palette
- Primary: Blue #2563eb (matches existing brand from docs + dashboard)
- Background dark: #09090b (zinc-950) — Linear-style near-black
- Background light: #ffffff
- Sidebar dark: #0a0a0a — slightly different from content for depth
- Accent: #3b82f6 (blue-500) for hover states
- Destructive: #ef4444 (red-500) for delete/revoke actions
- Success: #22c55e (green-500) for key creation, payment success
- Muted text: #a1a1aa (zinc-400) for secondary content

### Dark Mode
- Dark mode default — user sees dark theme on first visit
- CSS class strategy (`class="dark"` on `<html>`) — shadcn/ui default approach
- Theme toggle: persist to localStorage, respect system preference on first visit
- No flash of unstyled/wrong-theme content (inline script in index.html sets class before React hydrates)

### Typography
- UI font: Inter (Google Fonts) — clean, readable, standard for developer tools
- Code font: JetBrains Mono — for API keys, code snippets, config examples
- Font sizes via Tailwind default scale (text-sm, text-base, text-lg, etc.)

### Claude's Discretion
- Exact Tailwind config (tailwind.config.ts) structure
- shadcn/ui components.json configuration
- CSS custom properties naming convention
- Whether to use CSS layers for organization
- Exact global styles in globals.css

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard (current state)
- `apps/dashboard/package.json` — current dependencies (React, Vite, Supabase)
- `apps/dashboard/vite.config.ts` — Vite config to extend with PostCSS
- `apps/dashboard/index.html` — needs dark mode script, font links
- `apps/dashboard/src/main.tsx` — entry point
- `apps/dashboard/src/App.tsx` — current app structure (auth routing)
- `apps/dashboard/src/pages/DashboardPage.tsx` — current inline styles to eventually replace
- `apps/dashboard/src/pages/AuthPage.tsx` — current inline styles

### Design References
- Linear app (linear.app) — dark sidebar, minimal, monospace code font
- Vercel dashboard (vercel.com/dashboard) — clean dark/light toggle, card-based layout
- shadcn/ui docs (ui.shadcn.com) — component API, theming guide

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — current dashboard uses only inline React styles, no design system

### Established Patterns
- React + Vite SPA
- Supabase Auth integration (supabase.ts)
- Gateway API hooks (useKeys.ts, useUsage.ts, useBilling.ts)
- CF Pages deployment (wrangler pages deploy)

### Integration Points
- `index.html` — add Inter + JetBrains Mono font links, dark mode script
- `vite.config.ts` — add PostCSS plugin for Tailwind
- `package.json` — add tailwindcss, postcss, autoprefixer, @shadcn/ui deps
- New files: `tailwind.config.ts`, `postcss.config.js`, `src/globals.css`, `src/lib/utils.ts`
- Existing pages keep working — just replace inline styles incrementally in later phases

</code_context>

<specifics>
## Specific Ideas

- Dark sidebar (#0a0a0a) with slightly lighter content area (#09090b) creates depth without harsh contrast
- Inter + JetBrains Mono is the exact font pairing used by Linear
- "new-york" shadcn/ui variant has sharper corners and bolder weight — more professional than default

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-design-system-foundation*
*Context gathered: 2026-03-25 via auto-select*
