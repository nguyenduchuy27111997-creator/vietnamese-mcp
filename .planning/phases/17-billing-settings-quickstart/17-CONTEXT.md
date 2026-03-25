# Phase 17: Billing + Settings + Quickstart - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Auto-selected recommended defaults

<domain>
## Phase Boundary

Replace the 3 remaining placeholder pages (Billing, Settings, Quickstart) with fully designed, data-connected pages. Billing shows plan cards with upgrade flow. Settings has profile + danger zone. Quickstart is an interactive onboarding wizard for new users.

</domain>

<decisions>
## Implementation Decisions

### Billing Page (PAGE-04)
- 3 plan cards side by side: Starter ($19), Pro ($49), Business ($149)
- Current plan highlighted with "Current Plan" badge
- Each card shows: tier name, price (USD), call limit, features list
- Below cards: two payment buttons per tier — "Pay with Card" (Stripe) and "Pay with MoMo (VND price)"
- For current/higher tier cards: "Manage Subscription" → Stripe Customer Portal
- Free tier users see all 3 cards as upgrade options
- Paid users see their current plan highlighted + option to change via portal
- Reuse existing `useBilling()` hook for checkout and portal actions

### Settings Page (PAGE-05)
- Two sections separated by divider:
  1. **Profile** — email display (read-only from Supabase session), password change form (current password + new password + confirm)
  2. **Danger Zone** — red-bordered card with "Delete Account" button → AlertDialog requiring user to type "DELETE" to confirm
- Password change via `supabase.auth.updateUser({ password: newPassword })`
- Delete account: call gateway endpoint or Supabase admin API (Claude's discretion on implementation)
- Success/error toasts for actions (use shadcn/ui Alert inline or add toast library — Claude's discretion)

### Quickstart Page (PAGE-06)
- 3-step vertical stepper with progress indicator:
  1. **Create API Key** — inline key creation (reuses `useKeys().createKey`), shows key in code block with copy button
  2. **Configure .mcp.json** — shows pre-filled JSON config with user's actual key inserted, copy button
  3. **Test Your Setup** — instructions to run a tool call, "Mark Complete" button
- Each step shows green checkmark when completed
- Steps are sequential — can't skip ahead (step 2 needs key from step 1)
- "Skip to Dashboard" link at bottom for users who want to skip
- Only shown when user has 0 keys (NAV-02 redirect already handles this from Phase 15)

### Claude's Discretion
- Exact plan card design (border, shadow, gradient)
- Whether to use toast notifications or inline Alert components
- Password validation (min length, requirements)
- Quickstart stepper animation
- Delete account implementation details (soft delete vs hard delete)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Placeholder Pages (to replace)
- `apps/dashboard/src/pages/BillingPage.tsx` — placeholder
- `apps/dashboard/src/pages/SettingsPage.tsx` — placeholder
- `apps/dashboard/src/pages/QuickstartPage.tsx` — placeholder

### Existing Hooks & Auth
- `apps/dashboard/src/hooks/useBilling.ts` — startStripeCheckout, startMomoCheckout, openStripePortal
- `apps/dashboard/src/hooks/useKeys.ts` — createKey, revokeKey, fetchKeys
- `apps/dashboard/src/supabase.ts` — Supabase client (auth.updateUser, auth.signOut)
- `apps/dashboard/src/App.tsx` — session state, routes

### shadcn/ui Components
- Card, Button, Input, Badge, Alert, AlertDialog, Tabs, Progress — all installed
- Dialog — for password change confirmation

### Prior Billing Decisions (Phase 8)
- Stripe Checkout redirect (not embedded)
- MoMo mock-first
- Customer Portal enabled
- Pricing: Starter $19/449k, Pro $49/1.19M, Business $149/3.59M
- `STRIPE_TIERS` and `MOMO_TIERS` constants in `billing/provider.ts`

### Gateway Endpoints
- `POST /billing/create-checkout` — creates Stripe/MoMo checkout session
- `GET /billing/portal` — returns Stripe Customer Portal URL

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useBilling()` — already has `startStripeCheckout(tier)`, `startMomoCheckout(tier)`, `openStripePortal()`
- `useKeys()` — `createKey(name)` returns raw key string
- `supabase.auth.updateUser()` — password change
- `supabase.auth.getSession()` — get user email for profile display
- AlertDialog component — reuse for delete account confirmation
- All shadcn/ui components themed and ready

### Established Patterns
- Page components lazy-loaded via React.lazy
- Dark mode CSS vars applied via Tailwind classes
- Hooks fetch from GATEWAY_URL with JWT auth
- Card-based layouts from OverviewPage (Phase 16)

### Integration Points
- Replace 3 placeholder pages in existing route structure
- No new routes needed — routes defined in App.tsx Phase 15
- Gateway billing endpoints already exist from Phase 8
- Supabase auth methods available in supabase.ts

</code_context>

<specifics>
## Specific Ideas

- Billing plan cards should feel premium — subtle gradient, clear hierarchy between tiers
- Quickstart wizard should feel like a guided onboarding (Vercel's first-deploy experience)
- Settings danger zone uses red border (#ef4444) to clearly signal destructive area

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-billing-settings-quickstart*
*Context gathered: 2026-03-25 via auto-select*
