---
phase: 19-example-apps
plan: "02"
subsystem: examples
tags: [zalo, mcp, stdio, chatbot, example]
dependency_graph:
  requires: []
  provides: [examples/zalo-chatbot]
  affects: [README.md, docs]
tech_stack:
  added:
    - "@modelcontextprotocol/sdk (StdioClientTransport)"
    - "tsx (TypeScript execution)"
    - "@vn-mcp/mcp-zalo-oa (npm package, self-hosted via stdio)"
  patterns:
    - "StdioClientTransport spawning MCP server as child process"
    - "Sandbox mode with ZALO_OA_SANDBOX=true for zero-credential dev"
key_files:
  created:
    - examples/zalo-chatbot/package.json
    - examples/zalo-chatbot/tsconfig.json
    - examples/zalo-chatbot/src/bot.ts
    - examples/zalo-chatbot/.env.example
    - examples/zalo-chatbot/.mcp.json
    - examples/zalo-chatbot/README.md
  modified: []
decisions:
  - "Used correct tool names zalo_oa_send_message / zalo_oa_list_followers (plan had incorrect zalooa_ prefix)"
  - "Standalone package — not added to root workspaces"
  - "Bot calls zalo_oa_send_message with userId+type+text params matching server schema"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 0
---

# Phase 19 Plan 02: Zalo Chatbot Example Summary

**One-liner:** Standalone Node.js + TypeScript bot demonstrating self-hosted MCP stdio transport via @vn-mcp/mcp-zalo-oa with sandbox mode.

## What Was Built

A complete `examples/zalo-chatbot/` directory providing developers a minimal, runnable reference for the self-hosted stdio MCP pattern. The bot spawns the `@vn-mcp/mcp-zalo-oa` server as a child process via `StdioClientTransport`, lists available tools, calls `zalo_oa_send_message` and `zalo_oa_list_followers`, then closes gracefully.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Zalo chatbot Node.js example | 8f4189e | package.json, tsconfig.json, src/bot.ts, .env.example, .mcp.json |
| 2 | Write Zalo chatbot README | 468ad8e | README.md |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected tool names from zalooa_ to zalo_oa_ prefix**
- **Found during:** Task 1 — reading server source before writing bot.ts
- **Issue:** Plan specified `zalooa_send_message` and `zalooa_list_followers` but actual server tool names are `zalo_oa_send_message` and `zalo_oa_list_followers` (confirmed in servers/mcp-zalo-oa/src/tools/sendMessage.ts and listFollowers.ts)
- **Fix:** Used correct tool names in bot.ts; also corrected parameter structure (`userId`+`type`+`text` instead of `user_id`+`message`) to match the server's Zod schema
- **Files modified:** examples/zalo-chatbot/src/bot.ts
- **Commit:** 8f4189e

## Key Decisions

- Standalone package (not in root workspaces) — developer installs from npm, not monorepo links
- Sandbox mode enabled by default — no Zalo credentials required to run
- .mcp.json uses `npx @vn-mcp/mcp-zalo-oa` command for direct Claude Code integration

## Self-Check: PASSED

Files created:
- FOUND: examples/zalo-chatbot/package.json
- FOUND: examples/zalo-chatbot/tsconfig.json
- FOUND: examples/zalo-chatbot/src/bot.ts
- FOUND: examples/zalo-chatbot/.env.example
- FOUND: examples/zalo-chatbot/.mcp.json
- FOUND: examples/zalo-chatbot/README.md

Commits verified:
- FOUND: 8f4189e (Task 1 — bot scaffold)
- FOUND: 468ad8e (Task 2 — README)
