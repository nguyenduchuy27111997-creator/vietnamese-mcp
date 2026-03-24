---
phase: 09-npm-publishing
plan: 02
status: complete
started: 2026-03-25
completed: 2026-03-25
---

# Plan 09-02 Summary: Publish to npm

## What Was Built

- npm account `huynd9711` authenticated with granular access token
- @vn-mcp org created on npm
- All 6 packages published to npm under @vn-mcp scope:
  - @vn-mcp/shared@1.0.0
  - @vn-mcp/mcp-momo-vn@1.0.2
  - @vn-mcp/mcp-zalopay-vn@1.0.2
  - @vn-mcp/mcp-vnpay@1.0.2
  - @vn-mcp/mcp-zalo-oa@1.0.2
  - @vn-mcp/mcp-viettel-pay@1.0.2
- Standalone install verified: `npm install @vn-mcp/mcp-momo-vn` succeeds outside monorepo
- npx smoke test: `MOMO_SANDBOX=true npx mcp-momo-vn` starts without import errors

## Deviations

1. **Shebang missing (1.0.0)** — bin entries ran as shell scripts. Fixed by adding `#!/usr/bin/env node` to all server src/index.ts. Republished as 1.0.1.
2. **JSON import attributes (1.0.1)** — Node.js 23+ requires `with { type: 'json' }` for JSON imports. Fixed in all client.ts files. Republished as 1.0.2.

## Key Decisions

- Used granular npm access token with 2FA bypass for automated publishing
- Published shared@1.0.0 first, then all 5 servers (dependency order)
- Bumped servers to 1.0.2 after two post-publish fixes; shared remains 1.0.0

## Commits

- `2c0bdac`: fix(09): add Node.js shebang + JSON import attributes for standalone npm usage
