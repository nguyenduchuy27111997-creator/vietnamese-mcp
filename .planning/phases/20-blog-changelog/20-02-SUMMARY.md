---
phase: 20-blog-changelog
plan: "02"
subsystem: docs/blog
tags: [blog, seo, momo, zalopay, vnpay, zalo-oa, viettelpay, guides]
dependency_graph:
  requires: [20-01]
  provides: [per-server-guide-blog-posts]
  affects: [docs-navigation, seo-long-tail]
tech_stack:
  added: []
  patterns: [mintlify-mdx, frontmatter-metadata, tool-reference-tables]
key_files:
  created:
    - apps/docs/blog/guide-momo-payments.mdx
    - apps/docs/blog/guide-zalopay-integration.mdx
    - apps/docs/blog/guide-vnpay-gateway.mdx
    - apps/docs/blog/guide-zalo-oa-messaging.mdx
    - apps/docs/blog/guide-viettelpay.mdx
  modified: []
key_decisions:
  - "All 5 guides follow identical 7-section template for consistency (Quick Setup, Available Tools, Example Prompts, Common Workflows, Env Vars, Next Steps)"
  - "ViettelPay guide prominently notes mock-only status with opening Note callout"
  - "VNPAY guide highlights HMAC-SHA512 distinction from other SHA-256 servers"
  - "Zalo OA guide emphasizes it is messaging not payments to avoid confusion"
metrics:
  duration: "~5 min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 5
---

# Phase 20 Plan 02: Per-Server Guide Blog Posts Summary

Created 5 per-server guide blog posts covering every MCP server in the VN MCP Hub. Each guide provides a full developer walkthrough including quick setup (npm and hosted gateway options), tool reference tables, example Claude prompts, common workflows, environment variable reference, and next-step links.

## What Was Built

| File | Lines | Server | Type |
|------|-------|--------|------|
| `guide-momo-payments.mdx` | 99 | MoMo | Payments |
| `guide-zalopay-integration.mdx` | 100 | ZaloPay | Payments |
| `guide-vnpay-gateway.mdx` | 93 | VNPAY | Payments |
| `guide-zalo-oa-messaging.mdx` | 97 | Zalo OA | Messaging |
| `guide-viettelpay.mdx` | 93 | ViettelPay | Payments (mock-only) |

All files use identical 7-section structure:
1. Opening paragraph (what, who, what you'll learn)
2. Quick Setup (npm + hosted gateway options with `.mcp.json`)
3. Available Tools (table from CLAUDE.md)
4. Example Prompts for Claude (3-4 realistic natural language prompts)
5. Common Workflows (numbered steps from CLAUDE.md)
6. Environment Variables (table with mock fallbacks + Note callout)
7. Next Steps (links to server reference, launch post, GitHub)

## Commits

- `fdd38f1` — feat(20-02): MoMo and ZaloPay guide blog posts
- `912ff5f` — feat(20-02): VNPAY, Zalo OA, and ViettelPay guide blog posts

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files exist:
- [x] apps/docs/blog/guide-momo-payments.mdx (99 lines)
- [x] apps/docs/blog/guide-zalopay-integration.mdx (100 lines)
- [x] apps/docs/blog/guide-vnpay-gateway.mdx (93 lines)
- [x] apps/docs/blog/guide-zalo-oa-messaging.mdx (97 lines)
- [x] apps/docs/blog/guide-viettelpay.mdx (93 lines)

Commits exist:
- [x] fdd38f1
- [x] 912ff5f

## Self-Check: PASSED
