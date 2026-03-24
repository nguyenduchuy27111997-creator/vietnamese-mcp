# Phase 10: Landing Page & Docs - Research

**Researched:** 2026-03-25
**Domain:** Mintlify docs platform, MDX content authoring, landing page structure
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Landing page hero:** Developer-first — "Vietnamese Payment APIs for Claude Code" — code snippet showing .mcp.json config, "Get started in 2 minutes" CTA
- **Pricing table:** USD primary with VND toggle/tab — international audience sees USD first, Vietnamese users can switch
- **4 tiers:** Free (1k calls), Starter $19/449k VND (10k calls), Pro $49/1.19M VND (100k calls), Business $149/3.59M VND (unlimited)
- **Signup CTA:** Links to dashboard (apps/dashboard on CF Pages) — Supabase Auth signup flow
- **Feature highlights:** 5 servers, 18 tools, mock-first development, MCP protocol
- **Quickstart structure:** Single quickstart page with tabs: "Hosted (API Key)" and "Self-Hosted (npm)" — no page switching
- **Per-server tool reference:** One page per server, content generated from existing CLAUDE.md/README.md files — tool name, parameters, example response
- **Minimal manual writing:** Leverage existing server docs
- **Platform:** Mintlify — purpose-built for developer docs, free tier, MDX, built-in search
- **Subdomain:** Mintlify subdomain initially (e.g., mcpvn.mintlify.app)
- **Location:** Site lives in `apps/docs/` directory in the monorepo

### Claude's Discretion

- Exact Mintlify configuration (docs.json structure, navigation, colors)
- Landing page visual design (hero illustration, color scheme)
- Whether to include a server catalog/comparison table
- Mintlify tab component usage for hosted/self-hosted quickstart
- How to structure the docs.json navigation sidebar

### Deferred Ideas (OUT OF SCOPE)

- Custom domain setup — verify Mintlify free tier support, configure later
- Blog / changelog section — not needed for MVP launch
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SITE-01 | Landing page with pricing table (4 tiers), feature highlights, signup CTA | Mintlify custom mode layout + MDX components; pricing data from provider.ts/usageCounter.ts |
| SITE-02 | Developer docs with quickstart for both self-hosted (npm) and hosted (API key) paths | Mintlify Tabs component — `<Tabs>/<Tab>` pattern; README.md files as source |
| SITE-03 | Per-server tool reference docs generated from existing READMEs | 5 CLAUDE.md files contain complete tool tables; translate to MDX pages |
| SITE-04 | Deployed on Mintlify or equivalent | Mintlify free tier at mcpvn.mintlify.app; GitHub-connected auto-deploy |
</phase_requirements>

---

## Summary

Mintlify is a purpose-built developer docs platform. The site lives in `apps/docs/` as a new workspace in the monorepo. Configuration is a `docs.json` file at the root of `apps/docs/`. Pages are MDX files. Deployment is GitHub-connected and automatic — push to main, Mintlify deploys.

The config file was renamed from `mint.json` to `docs.json` in February 2025. Any examples from before that date use the old name. All current Mintlify documentation uses `docs.json`. The local preview CLI is `mint dev` (installed via `npm i -g mint`).

The landing page is an MDX file using `mode: "custom"` frontmatter, which removes sidebar and TOC to provide a blank canvas. The pricing data is locked in `provider.ts` (USD) and `usageCounter.ts` (call limits) — copy these values exactly into the landing page rather than hardcoding separately.

**Primary recommendation:** Init Mintlify via `mintlify.com/start` (GitHub-connected), place content in `apps/docs/`, use `docs.json` for config, MDX for all pages. The landing page uses `mode: "custom"`. The quickstart uses `<Tabs>` for hosted/self-hosted split. Tool reference pages are a direct MDX translation of the 5 CLAUDE.md files.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Mintlify | Free/Hobby tier | Documentation platform and deployment | Purpose-built for developer docs; MDX, search, API playground, GitHub auto-deploy |
| MDX | Built into Mintlify | Page format — Markdown + React components | Native Mintlify format; enables Tabs, Cards, Code blocks |
| docs.json | Mintlify config | Navigation, branding, site structure | Required config file (post-Feb 2025 rename from mint.json) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mint` CLI | Latest (npm i -g) | Local preview at localhost:3000 | During development to preview changes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mintlify | Docusaurus | Docusaurus is self-hosted, more setup; Mintlify deploys in minutes |
| Mintlify | Nextra | Same — requires self-hosting; Mintlify is zero-ops |
| Mintlify free | Mintlify Pro ($250/mo) | Free tier includes custom domain support; no team collab needed for MVP |

**Installation:**

```bash
# Inside apps/docs/ — no npm dependencies needed
# Mintlify is a cloud platform; local preview only needs:
npm install -g mint
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/docs/
├── docs.json              # Mintlify config — navigation, colors, branding
├── index.mdx              # Landing page (mode: "custom")
├── quickstart.mdx         # Single page with Hosted/Self-Hosted tabs
├── servers/
│   ├── overview.mdx       # Server catalog/comparison table
│   ├── momo.mdx           # MoMo tool reference
│   ├── zalopay.mdx        # ZaloPay tool reference
│   ├── vnpay.mdx          # VNPAY tool reference
│   ├── zalo-oa.mdx        # Zalo OA tool reference
│   └── viettel-pay.mdx    # ViettelPay tool reference
├── pricing.mdx            # Pricing page (linked from landing)
└── logo/
    └── logo.svg           # Brand logo asset
```

### Pattern 1: docs.json Navigation Structure

**What:** Single config file defines all navigation via nested tabs + groups
**When to use:** Always — Mintlify requires this file

```json
// Source: https://www.mintlify.com/docs/organize/navigation
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "VN MCP",
  "theme": "mint",
  "colors": {
    "primary": "#2563eb",
    "light": "#3b82f6",
    "dark": "#1d4ed8"
  },
  "navigation": {
    "tabs": [
      {
        "tab": "Documentation",
        "groups": [
          {
            "group": "Getting Started",
            "pages": ["quickstart"]
          },
          {
            "group": "Server Reference",
            "pages": [
              "servers/overview",
              "servers/momo",
              "servers/zalopay",
              "servers/vnpay",
              "servers/zalo-oa",
              "servers/viettel-pay"
            ]
          }
        ]
      }
    ],
    "global": {
      "anchors": [
        {
          "name": "Dashboard",
          "url": "https://dashboard.mcpvn.dev",
          "icon": "gauge"
        },
        {
          "name": "GitHub",
          "url": "https://github.com/your-org/vietnamese-mcp",
          "icon": "github"
        }
      ]
    }
  }
}
```

### Pattern 2: Landing Page with Custom Layout

**What:** MDX page using `mode: "custom"` removes sidebar/TOC — blank canvas for marketing content
**When to use:** For index.mdx (landing page) only

```mdx
---
title: "Vietnamese Payment APIs for Claude Code"
description: "5 MCP servers. 18 tools. Mock-first. Ready in 2 minutes."
mode: "custom"
---

# Vietnamese Payment APIs for Claude Code

<CodeBlock language="json" title=".mcp.json">
{`"mcp": {
  "servers": {
    "momo-vn": {
      "url": "https://gateway.mcpvn.dev/mcp",
      "headers": { "x-api-key": "your-api-key" }
    }
  }
}`}
</CodeBlock>

<a href="https://dashboard.mcpvn.dev">Get started — it's free</a>
```

### Pattern 3: Quickstart with Tabs

**What:** `<Tabs>` and `<Tab>` components show alternative paths without page switching
**When to use:** Single quickstart page covering hosted (API key) and self-hosted (npm) paths

```mdx
---
title: "Quickstart"
description: "Go from zero to first tool call in under 5 minutes."
---

<Tabs>
  <Tab title="Hosted (API Key)">
    ## Step 1: Get your API key

    Sign up at [dashboard.mcpvn.dev](https://dashboard.mcpvn.dev).
    Free tier includes 1,000 calls/month — no credit card needed.

    ## Step 2: Configure .mcp.json

    ```json
    {
      "mcpServers": {
        "vn-payments": {
          "url": "https://gateway.mcpvn.dev/mcp",
          "headers": {
            "x-api-key": "YOUR_API_KEY"
          }
        }
      }
    }
    ```

    ## Step 3: Make your first tool call

    Ask Claude Code: "Create a MoMo payment for 50,000 VND"
  </Tab>
  <Tab title="Self-Hosted (npm)">
    ## Step 1: Install the server

    ```bash
    npm install -g @vn-mcp/mcp-momo-vn
    ```

    ## Step 2: Configure .mcp.json

    ```json
    {
      "mcpServers": {
        "momo-vn": {
          "command": "npx",
          "args": ["-y", "@vn-mcp/mcp-momo-vn"],
          "env": {
            "MOMO_SANDBOX": "true",
            "MOMO_PARTNER_CODE": "MOMOBKUN20180529",
            "MOMO_ACCESS_KEY": "klm05TvNBzhg7h7j",
            "MOMO_SECRET_KEY": "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa"
          }
        }
      }
    }
    ```

    ## Step 3: Make your first tool call

    Ask Claude Code: "Create a MoMo payment for 50,000 VND"
  </Tab>
</Tabs>
```

### Pattern 4: Per-Server Tool Reference Page

**What:** MDX page per server, content directly translated from CLAUDE.md tool tables
**When to use:** For each of the 5 server pages under `servers/`

```mdx
---
title: "MoMo (mcp-momo-vn)"
description: "MoMo e-wallet payment gateway — create payments, check status, refund, validate IPN."
---

## Tools

| Tool | Description |
|------|-------------|
| `momo_create_payment` | Create a MoMo payment link (QR code, wallet, or ATM). Returns payUrl. |
| `momo_query_status` | Check status of a MoMo payment by orderId. |
| `momo_refund` | Refund a MoMo transaction (full or partial) by transId. |
| `momo_validate_ipn` | Validate a MoMo IPN payload via HMAC-SHA256 signature. |

## momo_create_payment

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount in VND (e.g. 150000) |
| `orderInfo` | string | Yes | Order description shown to customer |
| ...   | ...  | ...      | ...         |

**Example response:**
```json
{
  "orderId": "MOMO1234567890",
  "payUrl": "https://test-payment.momo.vn/pay/...",
  "resultCode": 0,
  "_mock": true
}
```
```

### Anti-Patterns to Avoid

- **Using `mint.json` instead of `docs.json`:** The config file was renamed in February 2025. Using the old name will break deployment.
- **Hardcoding pricing values:** Always copy from `provider.ts` (STRIPE_TIERS, MOMO_TIERS) and `usageCounter.ts` (TIER_LIMITS) — these are the authoritative sources.
- **Creating a separate `package.json` with npm deps for docs:** Mintlify is a cloud platform. `apps/docs/` only needs `docs.json` and MDX files, not a `package.json` with dependencies.
- **Using separate pages for hosted vs self-hosted quickstart:** The locked decision is a single quickstart page with tabs — do not split into two pages.
- **Running `mintlify dev` (old command):** Current CLI command is `mint dev` after `npm i -g mint`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search across docs | Custom search index | Mintlify built-in search | Mintlify includes full-text search out of the box |
| Code syntax highlighting | Custom highlighter | Mintlify code blocks | Built-in with language detection |
| Dark mode | Custom toggle | Mintlify built-in | Theme toggle included |
| Tabbed content | Custom tab React component | `<Tabs>/<Tab>` MDX components | Native Mintlify components, no setup needed |
| Navigation sidebar | Custom sidebar | `docs.json` navigation field | Mintlify auto-generates sidebar from config |
| Deployment pipeline | CF Pages / Vercel setup | Mintlify cloud deploy | GitHub-connected, auto-deploys on push |
| LLM-friendly docs | Custom llms.txt | Mintlify LLM optimization | Mintlify Hobby plan includes LLM optimizations (llms.txt auto-generated) |

**Key insight:** Mintlify is a complete platform. The only content to author is MDX files and `docs.json`. Everything else (search, deployment, theming, navigation) is handled by the platform.

---

## Common Pitfalls

### Pitfall 1: docs.json vs mint.json Confusion

**What goes wrong:** Tutorials and blog posts written before February 2025 use `mint.json`. Copy-pasting these examples into `apps/docs/` creates a broken config.
**Why it happens:** The config file was renamed from `mint.json` to `docs.json` in February 2025.
**How to avoid:** Always create `docs.json` (not `mint.json`). Run `mint update` to ensure latest CLI.
**Warning signs:** `mint dev` fails with "could not find mint.json or docs.json" if neither exists.

### Pitfall 2: Navigation Structure Breaking Change in docs.json

**What goes wrong:** Old `mint.json` had separate `tabs`, `anchors`, `navigation` top-level arrays. New `docs.json` uses a unified `navigation` object with nested structure.
**Why it happens:** docs.json (Feb 2025) unified the navigation model.
**How to avoid:** Use the new unified `navigation` object — see docs.json example in Pattern 1 above.
**Warning signs:** Mintlify logs show schema validation errors on deploy.

### Pitfall 3: Pricing Data Drift

**What goes wrong:** Landing page shows different prices than the billing code, causing user confusion and support burden.
**Why it happens:** Prices hardcoded in MDX diverge from `provider.ts`/`usageCounter.ts` over time.
**How to avoid:** In PLAN.md, the task that creates the pricing table must explicitly reference `apps/gateway/src/billing/provider.ts` as the source of truth.
**Warning signs:** STRIPE_TIERS in provider.ts and pricing table in landing page show different values.

### Pitfall 4: Mintlify GitHub App Not Installed

**What goes wrong:** Auto-deploy doesn't trigger — commits don't appear on the live site.
**Why it happens:** Mintlify cloud requires its GitHub App to be installed on the repo during onboarding.
**How to avoid:** During Wave 0 / setup task, complete the full Mintlify onboarding flow at `mintlify.com/start`, which installs the GitHub App.
**Warning signs:** Dashboard shows "no deployments" after pushing commits.

### Pitfall 5: Local Preview CLI Version Mismatch

**What goes wrong:** `mint dev` renders differently from deployed site; components look broken locally.
**Why it happens:** Local Mintlify CLI version differs from cloud version.
**How to avoid:** Run `mint update` before starting local development.
**Warning signs:** Console shows warnings about version mismatch.

---

## Code Examples

Verified patterns from official sources:

### Tabs Component for Hosted/Self-Hosted Split

```mdx
<!-- Source: https://mintlify.com/docs/content/components/tabs -->
<Tabs>
  <Tab title="Hosted (API Key)">
    Content for the API key path...
  </Tab>
  <Tab title="Self-Hosted (npm)">
    Content for the npm install path...
  </Tab>
</Tabs>
```

### Page Frontmatter for Landing Page

```mdx
<!-- Source: https://www.mintlify.com/docs/organize/pages -->
---
title: "Vietnamese Payment APIs for Claude Code"
description: "5 MCP servers. 18 tools. Mock-first."
mode: "custom"
---
```

### Page Frontmatter for Reference Docs

```mdx
---
title: "MoMo Payments"
description: "MoMo e-wallet MCP server — create payments, check status, refund, validate IPN."
sidebarTitle: "MoMo"
icon: "wallet"
---
```

### docs.json Minimal Valid Example

```json
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "VN MCP",
  "theme": "mint",
  "colors": {
    "primary": "#2563eb"
  },
  "navigation": {
    "tabs": [
      {
        "tab": "Docs",
        "groups": [
          {
            "group": "Getting Started",
            "pages": ["quickstart"]
          }
        ]
      }
    ]
  }
}
```

---

## Authoritative Data: Pricing & Tools

These values MUST be used verbatim in the landing page and docs. Do not invent or estimate.

### Pricing Tiers (from provider.ts + usageCounter.ts)

| Tier | USD | VND | Calls/month |
|------|-----|-----|-------------|
| Free | $0 | Free | 1,000 |
| Starter | $19/mo | 449,000 VND/mo | 10,000 |
| Pro | $49/mo | 1,190,000 VND/mo | 100,000 |
| Business | $149/mo | 3,590,000 VND/mo | Unlimited |

### Server & Tool Inventory (from CLAUDE.md files)

| Server | npm Package | Tools | Count |
|--------|-------------|-------|-------|
| mcp-momo-vn | @vn-mcp/mcp-momo-vn@1.0.2 | momo_create_payment, momo_query_status, momo_refund, momo_validate_ipn | 4 |
| mcp-zalopay-vn | @vn-mcp/mcp-zalopay-vn@1.0.2 | zalopay_create_order, zalopay_query_order, zalopay_refund, zalopay_validate_callback | 4 |
| mcp-vnpay | @vn-mcp/mcp-vnpay@1.0.2 | vnpay_create_payment_url, vnpay_verify_return, vnpay_query_transaction | 3 |
| mcp-zalo-oa | @vn-mcp/mcp-zalo-oa@1.0.2 | zalo_oa_send_message, zalo_oa_get_follower_profile, zalo_oa_list_followers, zalo_oa_refresh_token | 4 |
| mcp-viettel-pay | @vn-mcp/mcp-viettel-pay@1.0.2 | viettel_pay_create_payment, viettel_pay_query_status, viettel_pay_refund | 3 |
| **Total** | | | **18** |

Note: ViettelPay is mock-only. This should be noted on its reference page.

### Gateway URL

The upgrade URL referenced in the gateway is `https://mcpvn.dev/pricing`. The dashboard URL pattern is `dashboard.mcpvn.dev` (inferred from code context — verify exact URL during implementation).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mint.json` config | `docs.json` config | February 2025 | All pre-2025 tutorials use wrong filename |
| Separate `tabs`, `navigation` arrays in config | Unified `navigation` object with nested tabs | February 2025 | Old navigation examples break with new schema |
| `mintlify dev` CLI command | `mint dev` (via `npm i -g mint`) | ~2024 | Old `mintlify` package deprecated |

**Deprecated/outdated:**
- `mint.json`: Replaced by `docs.json`. Running `mintlify upgrade` migrates automatically.
- `mintlify` npm package: Replaced by `mint`. Install `mint` not `mintlify`.

---

## Validation Architecture

nyquist_validation is enabled. However, this phase produces only static MDX/JSON documentation files. There is no runtime logic to unit test. Validation is structural and content-based.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Mintlify CLI local preview + manual spot-check |
| Config file | `apps/docs/docs.json` |
| Quick run command | `cd apps/docs && mint dev` (visual inspection at localhost:3000) |
| Full suite command | `cd apps/docs && mint dev` + open browser, verify all 7 pages render |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SITE-01 | Landing page renders pricing table with 4 tiers | manual | `mint dev` then open localhost:3000 | Wave 0 |
| SITE-01 | Pricing values match provider.ts | manual | Diff MDX pricing against provider.ts values | Wave 0 |
| SITE-01 | Signup CTA links to dashboard URL | manual | Inspect link href in rendered page | Wave 0 |
| SITE-02 | Quickstart page has Hosted/Self-hosted tabs | manual | `mint dev` then open localhost:3000/quickstart | Wave 0 |
| SITE-02 | Self-hosted tab shows npm install for all 5 packages | manual | Visual inspection | Wave 0 |
| SITE-03 | All 5 server pages exist and render | manual | `mint dev` then visit each servers/* page | Wave 0 |
| SITE-03 | Tool names match CLAUDE.md source files | manual | Side-by-side comparison | Wave 0 |
| SITE-04 | Site accessible at *.mintlify.app URL | manual | Open browser to deployed URL | Wave 0 |

### Sampling Rate

- **Per task commit:** `mint dev` — confirm page renders without build errors
- **Per wave merge:** Full visual inspection of all 7 pages in local preview
- **Phase gate:** Deployed URL accessible + all 4 requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/docs/docs.json` — Mintlify config (Wave 0 creates this)
- [ ] `apps/docs/index.mdx` — Landing page (Wave 0 stub, Wave 1 fills content)
- [ ] `apps/docs/quickstart.mdx` — Quickstart stub
- [ ] `apps/docs/servers/` directory — 5 server reference stubs
- [ ] Mintlify account created at `mintlify.com/start` and GitHub repo connected (manual one-time step)

---

## Open Questions

1. **Dashboard URL — exact hostname unknown**
   - What we know: Dashboard is deployed to CF Pages; signup CTA should route there. `apps/gateway/src/metering/usageCounter.ts` hardcodes `https://mcpvn.dev/pricing` as the upgrade URL.
   - What's unclear: The exact CF Pages URL for the dashboard (`apps/dashboard`). This determines what the signup CTA href should be.
   - Recommendation: During Wave 0, check CF Pages dashboard for the deployed URL or use a placeholder (`[DASHBOARD_URL]`) that gets filled after deployment.

2. **Gateway URL for hosted quickstart**
   - What we know: `wrangler.toml` worker name is `vn-mcp-gateway`. The upgrade URL in code uses `mcpvn.dev` domain.
   - What's unclear: The exact deployed Worker URL (either `vn-mcp-gateway.workers.dev` or custom domain).
   - Recommendation: Use `https://gateway.mcpvn.dev/mcp` as a placeholder in quickstart; verify against actual deployed worker URL.

3. **NPM-01 completion status**
   - What we know: NPM-01 (all 5 packages published to npm) is marked Pending in REQUIREMENTS.md. Phase 10 depends on Phase 9.
   - What's unclear: Whether `npx -y @vn-mcp/mcp-momo-vn` will work at the time Phase 10 is implemented.
   - Recommendation: Write self-hosted quickstart assuming packages are published. If Phase 9 incomplete, note in PLAN with a dependency checkpoint.

---

## Sources

### Primary (HIGH confidence)

- Mintlify official docs at `mintlify.com/docs/quickstart` — setup flow, CLI commands, subdomain format
- Mintlify official docs at `mintlify.com/docs/organize/pages` — frontmatter options, layout modes including `mode: "custom"`
- Mintlify official docs at `mintlify.com/docs/content/components/tabs` — `<Tabs>/<Tab>` MDX component syntax
- Mintlify official docs at `mintlify.com/docs/organize/navigation` — `docs.json` navigation structure
- Mintlify blog at `mintlify.com/blog/refactoring-mint-json-into-docs-json` — confirmed Feb 2025 migration from mint.json to docs.json
- `apps/gateway/src/billing/provider.ts` — authoritative pricing (STRIPE_TIERS, MOMO_TIERS)
- `apps/gateway/src/metering/usageCounter.ts` — authoritative call limits (TIER_LIMITS)
- All 5 `servers/*/CLAUDE.md` files — authoritative tool inventory

### Secondary (MEDIUM confidence)

- Mintlify pricing page (fetched 2026-03-25) — confirmed free/hobby tier includes custom domain, no team collab
- Multiple sources confirm `mint dev` command and `npm i -g mint` installation

### Tertiary (LOW confidence)

- Exact CF Pages / Worker URLs for gateway and dashboard — not confirmed, inferred from code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Mintlify platform directly verified via official docs
- Architecture: HIGH — docs.json + MDX patterns verified from official source
- Pitfalls: HIGH — mint.json→docs.json migration confirmed from official blog post
- Pricing/tool data: HIGH — read directly from authoritative source files in codebase

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (Mintlify is fast-moving; verify docs.json schema if planning beyond this date)
