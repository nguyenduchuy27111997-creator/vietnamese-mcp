# Milestones

## v1.0 MCP Servers (Shipped: 2026-03-21)

**Phases completed:** 4 phases, 11 plans, ~22 tasks
**Commits:** 65 | **Files:** 171 | **LOC:** 2,980 TypeScript
**Timeline:** 5 days (2026-03-16 → 2026-03-21)
**Requirements:** 33/33 complete | **UAT:** 22/22 passed

**Key accomplishments:**
- Monorepo foundation with shared HMAC signing (SHA-256, SHA-512), error formatting, mock engine, and test helpers
- MoMo MCP server — first complete server proving all architectural patterns (4 tools, 8 tests)
- ZaloPay MCP server with dual-key HMAC-SHA256 signing (4 tools, 7 tests)
- VNPAY MCP server with URL-parameter HMAC-SHA512 signing (3 tools, 7 tests)
- Zalo OA MCP server with messaging/OAuth tools (4 tools, 6 tests)
- ViettelPay mock-only server with MOCK_DEVIATIONS.md documenting all assumptions (3 tools, 5 tests)
- Complete documentation: 5 CLAUDE.md + 5 README.md + root README, 117 tests across 15 test files

**Delivered:** First Vietnamese MCP server collection — 5 servers, 18 tools, all running in mock mode with full documentation.

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

---

