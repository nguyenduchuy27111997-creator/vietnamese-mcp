---
phase: 18-github-readme-seo
plan: "02"
subsystem: documentation
tags: [readme, npm, mcp, onboarding, seo]
dependency_graph:
  requires: []
  provides: [per-server-readme-npm-install]
  affects: [root-readme, npm-pages]
tech_stack:
  added: []
  patterns: [npm-global-install, binary-mcp-config]
key_files:
  created: []
  modified:
    - servers/mcp-momo-vn/README.md
    - servers/mcp-zalopay-vn/README.md
    - servers/mcp-vnpay/README.md
    - servers/mcp-zalo-oa/README.md
    - servers/mcp-viettel-pay/README.md
decisions:
  - ".mcp.json uses binary command name (mcp-momo-vn) not node monorepo path — enables standalone npm install workflow"
  - "ViettelPay mock-only disclaimer preserved at top of README"
  - "Exact env var names taken from existing READMEs (e.g., VIETTEL_PAY_PARTNER_CODE not VIETTELPAY_PARTNER_CODE)"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 5
---

# Phase 18 Plan 02: Per-Server README npm Install Instructions Summary

All 5 per-server READMEs updated with self-contained npm install instructions, binary-based .mcp.json config, and Claude Code example prompts.

## What Was Built

Each of the 5 server READMEs (`mcp-momo-vn`, `mcp-zalopay-vn`, `mcp-vnpay`, `mcp-zalo-oa`, `mcp-viettel-pay`) was restructured with:

1. **npm badge + version badge** linking to the package's npmjs.com page
2. **Install section** with `npm install -g @vn-mcp/{package-name}` global install command
3. **Configure section** with a complete `.mcp.json` snippet using the npm binary command (not the monorepo `node ./servers/...` path)
4. **Example section** with a practical Claude Code natural language prompt for each server
5. **Links footer** pointing to Mintlify docs, root README, and npm package page
6. All existing tool documentation, parameter tables, environment variable tables, and mock mode notes preserved intact

## Key Decisions

- **Binary command in .mcp.json:** `"command": "mcp-momo-vn"` instead of `"command": "node", "args": ["./servers/mcp-momo-vn/build/index.js"]` — this is the core of GH-04, enabling standalone install without the monorepo
- **ViettelPay mock-only note preserved** at the top of the README as it is an important disclaimer for that server
- **Exact env var names used verbatim** from existing READMEs (e.g., `VIETTEL_PAY_PARTNER_CODE` for ViettelPay, not a guessed name)
- **Zalo OA env var names verified** — `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_ACCESS_TOKEN`, `ZALO_OA_REFRESH_TOKEN` match actual server config

## Deviations from Plan

None — plan executed exactly as written.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update payment server READMEs (MoMo, ZaloPay, VNPAY) | d5d6b72 | servers/mcp-momo-vn/README.md, servers/mcp-zalopay-vn/README.md, servers/mcp-vnpay/README.md |
| 2 | Update messaging and ViettelPay server READMEs (Zalo OA, ViettelPay) | 49609ed | servers/mcp-zalo-oa/README.md, servers/mcp-viettel-pay/README.md |

## Self-Check: PASSED

Files verified:
- FOUND: servers/mcp-momo-vn/README.md (contains npm install, binary command, Example, Links)
- FOUND: servers/mcp-zalopay-vn/README.md (contains npm install, binary command, Example, Links)
- FOUND: servers/mcp-vnpay/README.md (contains npm install, binary command, Example, Links)
- FOUND: servers/mcp-zalo-oa/README.md (contains npm install, binary command, Example, Links)
- FOUND: servers/mcp-viettel-pay/README.md (contains npm install, binary command, Example, Links)

Commits verified:
- FOUND: d5d6b72 (Task 1 — payment servers)
- FOUND: 49609ed (Task 2 — messaging and ViettelPay)
