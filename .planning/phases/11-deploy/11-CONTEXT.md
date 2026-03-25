# Phase 11: Deploy - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy dashboard SPA to Cloudflare Pages and docs to Mintlify cloud. Create .env.production for dashboard. Update all CTA links and URL references in docs to use real production URLs. Verify all public URLs are accessible.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Deployment
- Deploy to Cloudflare Pages via `wrangler pages` CLI (same CF account as gateway worker)
- Project name: `vn-mcp-dashboard` → URL: `vn-mcp-dashboard.pages.dev`
- Build command: `npm run build` in `apps/dashboard/`
- Build output: `apps/dashboard/dist`
- Environment variable: `VITE_GATEWAY_URL=https://vn-mcp-gateway.nguyenduchuy27111997.workers.dev`
- Create `apps/dashboard/.env.production` with production gateway URL
- `_redirects` already exists for SPA routing (`/* /index.html 200`)

### Docs Deployment
- Mintlify cloud via GitHub integration at mintlify.com/start
- Connect repo `nguyenduchuy27111997-creator/vietnamese-mcp`
- Docs directory: `apps/docs`
- Subdomain: assigned by Mintlify (e.g., `vietnamese-mcp.mintlify.app`)
- If Mintlify connection fails again: deploy as static site to CF Pages as fallback

### URL Strategy
- Gateway: `https://vn-mcp-gateway.nguyenduchuy27111997.workers.dev` (already deployed)
- Dashboard: `https://vn-mcp-dashboard.pages.dev` (new)
- Docs: Mintlify subdomain TBD (new)
- All CTA links in docs (`index.mdx`, `quickstart.mdx`, `pricing.mdx`) updated to real dashboard URL
- `docs.json` navbar primary button → dashboard URL
- Quickstart hosted path → real gateway URL (already correct)

### Claude's Discretion
- Exact `wrangler pages` CLI commands and flags
- Whether to use `wrangler pages deploy` or `wrangler pages project create` first
- Mintlify fallback approach if GitHub integration doesn't work
- How to handle VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in CF Pages env

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dashboard
- `apps/dashboard/package.json` — build script, dependencies
- `apps/dashboard/vite.config.ts` — Vite config (outDir: dist)
- `apps/dashboard/.env.example` — env var template
- `apps/dashboard/public/_redirects` — SPA routing for CF Pages
- `apps/dashboard/src/supabase.ts` — reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

### Docs
- `apps/docs/docs.json` — Mintlify config with navigation, navbar, anchors
- `apps/docs/index.mdx` — Landing page with CTA links
- `apps/docs/quickstart.mdx` — Quickstart with gateway URL references
- `apps/docs/pricing.mdx` — Pricing page with signup CTAs

### Gateway (already deployed)
- `apps/gateway/wrangler.toml` — deployed worker config

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_redirects` file already exists for SPA routing
- `.env.example` already has the template for env vars
- Gateway already deployed and accessible

### Established Patterns
- CF Workers deployment via `wrangler deploy` — same account for Pages
- Worker secrets via `wrangler secret put` — Pages uses dashboard env vars or CLI

### Integration Points
- Dashboard `.env.production` → `VITE_GATEWAY_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Docs CTA links → dashboard URL (currently `dashboard.mcpvn.dev`, needs update)
- Docs quickstart → gateway URL (already correct: `gateway.mcpvn.dev` needs update to real URL)
- `docs.json` navbar → dashboard URL

</code_context>

<specifics>
## Specific Ideas

- Use `wrangler pages deploy` for simplicity — no need for GitHub integration on Pages
- Mintlify requires GitHub integration (can't deploy via CLI) — checkpoint for human setup

</specifics>

<deferred>
## Deferred Ideas

- Custom domain configuration — buy domain first, then configure DNS
- CI/CD pipeline for automatic deployments — manual is fine for v1.2

</deferred>

---

*Phase: 11-deploy*
*Context gathered: 2026-03-25*
