---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Growth & Marketing
status: executing
stopped_at: Completed 20-02-PLAN.md
last_updated: "2026-03-26T18:36:13.744Z"
last_activity: 2026-03-27 — 18-03 complete. Assets dir created, README GIF embed active, GIF recording deferred to pre-launch.
progress:
  total_phases: 17
  completed_phases: 16
  total_plans: 40
  completed_plans: 40
  percent: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Developer installs MCP server, adds to `.mcp.json`, and Claude Code can immediately create payments, check transactions, send messages — zero integration boilerplate.
**Current focus:** v2.1 Growth & Marketing — Phase 18: GitHub README & SEO (ready to plan)

## Current Position

Phase: 18 of 21 (Phase 18: GitHub README & SEO)
Plan: 3 of 3 in current phase (phase complete)
Status: In progress
Last activity: 2026-03-27 — 18-03 complete. Assets dir created, README GIF embed active, GIF recording deferred to pre-launch.

Progress: [██░░░░░░░░] 10% (3 of ~20 plans complete)

## Performance Metrics

**Velocity (from v1.0 + v1.1 + v1.2 + v2.0):**
- Total plans completed: 35+ across prior milestones
- Average duration: ~3.4 min/plan

## Accumulated Context

### Decisions

All v1.0–v2.0 decisions logged in PROJECT.md Key Decisions table.

Key decisions relevant to v2.1:
- [Phase 10-docs]: Mintlify is the docs platform — blog and changelog go there
- [Phase 9-npm]: All 5 servers published under @vn-mcp scope — badges point to these packages
- [Phase 17-billing]: Dashboard has dark mode, Stripe + MoMo flows — screenshot targets for PH

v2.1 decisions:
- [18-01]: README badges on a single line before H1 title for compact GitHub rendering
- [18-01]: Feature Highlights table added to satisfy must_haves truth and reach 150-line minimum
- [18-01]: Self-hosted npm quickstart placed before hosted gateway (developer-first workflow)
- [Phase 18]: .mcp.json uses npm binary command (mcp-momo-vn etc.) not monorepo node path — enables standalone install without cloning repo
- [Phase 18-03]: Activated README img tag immediately so it renders as soon as demo.gif lands in assets/
- [Phase 18-03]: Alt text uses full product description with keywords for GitHub SEO
- [Phase 19-example-apps]: Example apps live in examples/ directory, standalone with own package.json, not in root workspaces
- [Phase 19-example-apps]: Payment checkout example uses plain fetch with JSON-RPC — no SDK, minimal deps, easy for developers to understand
- [Phase 19-example-apps]: Used correct tool names zalo_oa_send_message/zalo_oa_list_followers (plan had wrong zalooa_ prefix)
- [Phase 20-blog-changelog]: Changelog content sourced from ROADMAP.md milestone dates — single source of truth for version history
- [Phase 20-01]: Blog added as second navigation dropdown in docs.json, separate from Documentation
- [Phase 20-01]: Launch blog post uses Mintlify CardGroup component to present 5 MCP servers visually
- [Phase 20-blog-changelog]: All 5 guides follow identical 7-section template for consistency
- [Phase 20-blog-changelog]: ViettelPay guide prominently notes mock-only status with Note callout

### Pending Todos

None.

### Blockers/Concerns

- [Phase 9] 09-02 (npm publish) still incomplete — GH-02 npm version badges depend on published packages
- [Phase 13] E2E validation plans (13-01, 13-02) not yet executed — GIF demo in GH-03 depends on working production flow
- [Phase 18-03] GIF demo deferred — assets/demo.gif placeholder active in README, record before Product Hunt launch

## Session Continuity

Last session: 2026-03-26T18:36:09.457Z
Stopped at: Completed 20-02-PLAN.md
Resume file: None
