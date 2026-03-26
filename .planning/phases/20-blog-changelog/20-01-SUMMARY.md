---
phase: 20-blog-changelog
plan: 01
subsystem: docs
tags: [blog, mintlify, content, navigation]
dependency_graph:
  requires: []
  provides: [blog-launch-post, blog-navigation]
  affects: [docs-navigation, seo]
tech_stack:
  added: []
  patterns: [mintlify-mdx, cardgroup-component]
key_files:
  created:
    - apps/docs/blog/introducing-vn-mcp-hub.mdx
  modified:
    - apps/docs/docs.json
key_decisions:
  - Blog dropdown added as a second dropdown alongside Documentation in docs.json navigation
  - Blog post uses Mintlify CardGroup component to present the 5 MCP servers visually
  - Both self-hosted (npm) and hosted gateway setup paths included in Getting Started section
metrics:
  duration: 78s
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 20 Plan 01: Blog Navigation and Launch Post Summary

Launch blog post written and blog navigation wired into Mintlify docs — "Introducing VN MCP Hub" covers problem, MCP explainer, all 5 servers, and two-path getting started guide.

## Tasks Completed

| Task | Name | Commit | Files |
| --- | --- | --- | --- |
| 1 | Add blog and changelog navigation to docs.json | 15891fe | apps/docs/docs.json |
| 2 | Write the launch announcement blog post | ef62f5d | apps/docs/blog/introducing-vn-mcp-hub.mdx |

## Verification Results

- docs.json: Blog dropdown with 6 page entries — PASS
- docs.json: changelog added to Getting Started group — PASS
- apps/docs/blog/introducing-vn-mcp-hub.mdx: exists with 131 lines — PASS (min 80)
- All 6 content sections present in blog post — PASS

## Decisions Made

1. **Blog as second dropdown** — Added Blog as a peer dropdown to Documentation in `navigation.dropdowns`, keeping the nav clean and separating reference docs from editorial content.
2. **CardGroup for server list** — Used Mintlify's `<CardGroup cols={2}>` component to present the 5 MCP servers with visual hierarchy instead of a plain bullet list.
3. **Dual setup paths** — Blog post covers both self-hosted npm install and hosted gateway, matching the product's two deployment modes.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Checking created/modified files and commits...

- apps/docs/blog/introducing-vn-mcp-hub.mdx: FOUND
- apps/docs/docs.json: FOUND (modified)
- Commit 15891fe: FOUND
- Commit ef62f5d: FOUND

## Self-Check: PASSED
