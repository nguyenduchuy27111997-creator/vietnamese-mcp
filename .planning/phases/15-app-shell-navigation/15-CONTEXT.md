# Phase 15: App Shell + Navigation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Auto-selected recommended defaults

<domain>
## Phase Boundary

Create the app shell layout (sidebar + content area), client-side routing between all pages, responsive mobile layout, user menu with sign-out, and new-user redirect to Quickstart. Existing auth pages (AuthPage) stay as-is — shell only wraps authenticated views.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Layout
- Fixed width sidebar: 240px desktop, collapsible to 64px icon-only mode
- Dark sidebar (#0a0a0a) with lighter content area (#09090b in dark mode, #ffffff in light)
- Logo/brand mark at top of sidebar
- ThemeToggle moves from floating position into sidebar (currently fixed top-right from Phase 14)
- Sidebar footer: user email/avatar + sign-out button

### Navigation Items
- Sidebar menu items (top to bottom):
  1. Overview (Home icon) — default landing page
  2. API Keys (Key icon)
  3. Usage (BarChart icon)
  4. Billing (CreditCard icon)
  5. Settings (Settings icon)
- Active page: highlighted background + left border accent (blue #2563eb)
- Icons from lucide-react (already installed via shadcn/ui)

### Mobile Responsive
- Breakpoint: md (768px) — below this, sidebar hidden
- Mobile: hamburger icon in top bar opens Sheet overlay with full sidebar menu
- Sheet closes on navigation (clicking a menu item)
- Top bar on mobile shows logo + hamburger + ThemeToggle

### Client-Side Routing
- React Router v6 (`react-router-dom`)
- Routes: `/` (Overview), `/keys` (API Keys), `/usage` (Usage), `/billing` (Billing), `/settings` (Settings), `/quickstart` (Quickstart)
- Auth guard: unauthenticated users see AuthPage, authenticated see app shell
- New-user redirect: if user has 0 API keys, redirect to `/quickstart` on first login (NAV-02)
- Lazy loading: each page component loaded on demand via `React.lazy`

### Page Placeholders
- Each route renders a placeholder component (page title + "Coming in Phase 16/17") until real pages are built
- Exception: AuthPage stays as current implementation (just wrapped differently)

### Claude's Discretion
- Exact sidebar animation (transition duration, easing)
- Whether to use Radix NavigationMenu or plain links
- Mobile top bar height and styling
- Sidebar collapse state persistence (localStorage or not)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard (Phase 14 output)
- `apps/dashboard/src/App.tsx` — current auth routing, ThemeProvider wrapping
- `apps/dashboard/src/components/theme-provider.tsx` — ThemeProvider context
- `apps/dashboard/src/components/theme-toggle.tsx` — ThemeToggle to relocate into sidebar
- `apps/dashboard/src/globals.css` — design tokens, dark/light CSS vars
- `apps/dashboard/tailwind.config.ts` — Tailwind config with color palette
- `apps/dashboard/src/components/ui/sheet.tsx` — for mobile sidebar overlay
- `apps/dashboard/src/components/ui/avatar.tsx` — for user avatar in sidebar
- `apps/dashboard/src/components/ui/button.tsx` — for navigation items
- `apps/dashboard/src/components/ui/dropdown-menu.tsx` — for user menu

### Existing Pages
- `apps/dashboard/src/pages/AuthPage.tsx` — login/signup (keep as-is)
- `apps/dashboard/src/pages/DashboardPage.tsx` — current monolithic page to decompose in Phase 16
- `apps/dashboard/src/hooks/useKeys.ts` — check key count for NAV-02 redirect

### Design Reference
- Linear sidebar: dark, fixed width, icon + label, footer with user
- Vercel sidebar: minimal, collapsible, active indicator

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn/ui Sheet component — use for mobile sidebar overlay
- shadcn/ui Avatar — user avatar in sidebar footer
- shadcn/ui DropdownMenu — user menu with sign-out
- ThemeToggle — relocate from floating to sidebar
- `useKeys()` hook — check key count for new-user redirect
- `supabase.auth.signOut()` — sign-out action
- lucide-react icons — already installed via shadcn/ui

### Established Patterns
- ThemeProvider wraps App in main.tsx
- Auth state via `supabase.auth.onAuthStateChange` in App.tsx
- Session-based routing: `session ? <Dashboard /> : <AuthPage />`

### Integration Points
- `App.tsx` — replace direct `<DashboardPage>` render with router + shell
- `main.tsx` — add `<BrowserRouter>` wrapper
- `package.json` — add `react-router-dom`
- New files: `src/components/app-shell.tsx`, `src/components/sidebar.tsx`, `src/components/mobile-nav.tsx`
- Placeholder pages: `src/pages/OverviewPage.tsx`, `src/pages/KeysPage.tsx`, etc.

</code_context>

<specifics>
## Specific Ideas

- Sidebar should feel like it "belongs" — not a separate element bolted on. Smooth transitions.
- Navigation items should have hover states that feel responsive (50ms background transition)
- Mobile sheet should animate from left (not default right) to feel like a real sidebar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-app-shell-navigation*
*Context gathered: 2026-03-25 via auto-select*
