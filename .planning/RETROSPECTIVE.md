# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MCP Servers

**Shipped:** 2026-03-21
**Phases:** 4 | **Plans:** 11 | **Sessions:** ~5

### What Was Built
- 5 MCP servers for Vietnamese fintech/messaging APIs (MoMo, ZaloPay, VNPAY, Zalo OA, ViettelPay)
- Shared package with HMAC signing (SHA-256, SHA-512), error formatting, mock engine, test helpers
- 18 total tools across all servers, all working in mock mode
- 117 integration tests across 15 test files
- Complete documentation: 5 CLAUDE.md + 5 README.md + root README

### What Worked
- **MoMo-first pattern validation:** Building one complete server first, then replicating to 4 more, was extremely efficient — each subsequent server took less time
- **Mock-first architecture:** Not having real API accounts was a non-issue; mock mode enabled full development and comprehensive testing
- **Shared package design:** HMAC primitives proved flexible enough to handle 4 distinct signing schemes (MoMo &key=value, ZaloPay pipe-separated, VNPAY URL-parameter, ViettelPay REST body)
- **MOCK_DEVIATIONS.md for ViettelPay:** Writing assumptions before code prevented scope creep on the lowest-confidence server
- **Fast execution:** ~37 min total for 11 plans averaging 3.4 min each

### What Was Inefficient
- **ROADMAP.md plan checkboxes out of sync:** Some plans showed `[ ]` even after execution — STATE.md was the source of truth but ROADMAP wasn't always updated
- **Pre-existing TypeScript type mismatch:** `callTool` return type vs `parseResult` parameter was flagged in every server — should have been fixed once in shared test helpers

### Patterns Established
- Server package structure: credentials.ts, signatures.ts, client.ts, tools/, mock/, __tests__/
- Integration test pattern: in-memory MCP transport via createTestClient, parseResult helper
- Mock fixture loading: JSON files in src/mock/, loaded via shared loadFixture()
- Error trigger convention: amount=99999999 triggers error paths in payment servers
- Deterministic IDs: SHA-256 hash of inputs for idempotent test assertions

### Key Lessons
1. **Prove the pattern with one, replicate to many** — The MoMo-first approach saved significant time and prevented architectural dead-ends
2. **Document assumptions before mocking** — ViettelPay's MOCK_DEVIATIONS.md (written first) kept the mock honest about what's real vs assumed
3. **Shared signing primitives should be algorithm-only** — Field ordering belongs in per-server code, not shared package; this separation worked perfectly

### Cost Observations
- Model mix: ~80% sonnet (execution), ~20% opus (planning/review)
- Sessions: ~5 across the milestone
- Notable: Average plan execution was 3.4 min — shared package and proven patterns kept each plan fast

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~5 | 4 | First milestone — established all patterns |

### Cumulative Quality

| Milestone | Tests | Coverage | Servers |
|-----------|-------|----------|---------|
| v1.0 | 117 | Mock mode | 5 |

### Top Lessons (Verified Across Milestones)

1. Build one complete example first, then replicate — validated in v1.0 with MoMo pattern
2. Mock-first is a feature, not a compromise — enables full development without external dependencies
