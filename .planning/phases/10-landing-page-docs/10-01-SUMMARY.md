---
phase: 10-landing-page-docs
plan: "01"
subsystem: docs
tags: [mintlify, mdx, landing-page, pricing, quickstart, documentation]
dependency_graph:
  requires: []
  provides: [apps/docs/docs.json, apps/docs/index.mdx, apps/docs/quickstart.mdx, apps/docs/logo/logo.svg]
  affects: []
tech_stack:
  added: [Mintlify, MDX]
  patterns: [mode:custom landing page, Tabs component for multi-path quickstart]
key_files:
  created:
    - apps/docs/docs.json
    - apps/docs/index.mdx
    - apps/docs/quickstart.mdx
    - apps/docs/logo/logo.svg
  modified: []
decisions:
  - "docs.json (not mint.json) — config file renamed February 2025; new unified navigation object"
  - "mode: custom on index.mdx — removes sidebar/TOC for marketing landing page canvas"
  - "Single quickstart page with Tabs — no page splitting; locked CONTEXT.md decision"
  - "USD as primary pricing, VND shown inline — international audience sees USD first"
metrics:
  duration: "~2 min"
  completed: "2026-03-25"
  tasks_completed: 2
  files_created: 4
requirements: [SITE-01, SITE-02, SITE-04]
---

# Phase 10 Plan 01: Mintlify Docs Scaffold Summary

**One-liner:** Mintlify docs site scaffolded with docs.json config, custom-layout landing page with 4-tier pricing (USD+VND), and tabbed quickstart for hosted and self-hosted paths.

## What Was Built

This plan established the `apps/docs/` directory as a Mintlify documentation site with:

1. **`docs.json`** — Full Mintlify configuration using the post-Feb-2025 schema (`docs.json`, not `mint.json`). Defines navigation with a Documentation tab containing Getting Started (quickstart) and Server Reference (6 server pages). Includes dashboard and GitHub anchors, blue color scheme (`#2563eb`).

2. **`index.mdx`** — Landing page using `mode: "custom"` to remove sidebar/TOC. Contains:
   - Hero headline "Vietnamese Payment APIs for Claude Code"
   - `.mcp.json` code snippet showing the gateway URL and x-api-key configuration
   - Feature highlights in a 2x2 CardGroup (5 Servers, 18 Tools, Mock-First, MCP Protocol)
   - 4-tier pricing table with exact values from `provider.ts` (USD) and `usageCounter.ts` (call limits) — Free/$0/1k, Starter/$19/449k VND/10k, Pro/$49/1.19M VND/100k, Business/$149/3.59M VND/unlimited
   - Server catalog table with all 5 servers and tool counts
   - Two CTAs linking to `https://dashboard.mcpvn.dev`

3. **`quickstart.mdx`** — Single page with Mintlify `<Tabs>` component containing:
   - Tab 1 "Hosted (API Key)": 4-step flow — sign up, generate API key, configure `.mcp.json` with gateway URL, make first tool call with expected mock response
   - Tab 2 "Self-Hosted (npm)": 4-step flow — install `@vn-mcp/mcp-momo-vn`, configure with npx + MoMo sandbox credentials (MOMOBKUN20180529), make tool call, table of all 5 npm packages
   - "What's next?" CardGroup linking to all server reference pages

4. **`logo/logo.svg`** — Minimal SVG logo: "VN MCP" white text on blue (#2563eb) rounded rectangle.

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | aefbba4 | feat(10-01): Mintlify config, landing page with pricing table and CTA |
| Task 2 | 56a3618 | feat(10-01): quickstart page with hosted/self-hosted tabs |

## Self-Check: PASSED
