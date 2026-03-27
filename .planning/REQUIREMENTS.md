# Requirements: VN MCP Hub — v3.0 Developer Experience

**Defined:** 2026-03-27
**Core Value:** Developer installs MCP server or signs up for hosted API key, adds to `.mcp.json`, and immediately uses Claude Code for Vietnamese payments and messaging — zero integration boilerplate.

## v3.0 Requirements

### API Playground

- [ ] **PLAY-01**: Dashboard page where user can select a server (MoMo, ZaloPay, etc.) from a dropdown
- [ ] **PLAY-02**: Tool selector showing all tools for the selected server with parameter forms auto-generated from tool schemas
- [ ] **PLAY-03**: Execute button sends JSON-RPC request to gateway with user's API key and displays formatted response
- [ ] **PLAY-04**: Request/response panel shows raw JSON-RPC payload and response with syntax highlighting

### Webhook Event Logs

- [ ] **HOOK-01**: Gateway logs webhook events (Stripe/MoMo) to a queryable store (Supabase table or Tinybird)
- [ ] **HOOK-02**: Dashboard page showing webhook event list with timestamp, provider, event type, status (success/failed)
- [ ] **HOOK-03**: Click on event expands to show full payload JSON with syntax highlighting
- [ ] **HOOK-04**: Filter by provider (Stripe/MoMo) and status (success/failed)

### API Key Scoping

- [x] **SCOPE-01**: API keys can be restricted to specific servers (e.g., key only works for MoMo + ZaloPay)
- [x] **SCOPE-02**: Key creation UI shows server checkboxes (default: all servers)
- [x] **SCOPE-03**: Gateway auth middleware checks key scope and returns 403 if server not allowed
- [x] **SCOPE-04**: Dashboard API Keys table shows scope badges per key

### Usage Export

- [ ] **EXPORT-01**: Dashboard button to download usage data as CSV
- [ ] **EXPORT-02**: CSV includes: date, server, tool, call count columns
- [ ] **EXPORT-03**: Date range picker (last 7/30/90 days or custom range)
- [ ] **EXPORT-04**: Gateway endpoint GET /usage/export returns CSV with proper Content-Type header

## v4 Requirements

Deferred to future release.

- **REAL-01**: Real MoMo API integration (after merchant KYC)
- **REAL-02**: Real ZaloPay/VNPAY sandbox integration
- **TEAM-01**: Team management (invite members, shared keys)
- **SSO-01**: Google/GitHub OAuth login

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time WebSocket updates | Polling sufficient for v3.0; WebSocket adds complexity |
| Audit log | Enterprise feature — defer until team management exists |
| Custom webhook endpoints | Users configure their own webhooks — out of scope for dashboard |
| Rate limiting dashboard | Infrastructure concern — handle at CF Workers level |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCOPE-01 | Phase 22 | Complete |
| SCOPE-02 | Phase 22 | Complete |
| SCOPE-03 | Phase 22 | Complete |
| SCOPE-04 | Phase 22 | Complete |
| PLAY-01 | Phase 23 | Pending |
| PLAY-02 | Phase 23 | Pending |
| PLAY-03 | Phase 23 | Pending |
| PLAY-04 | Phase 23 | Pending |
| HOOK-01 | Phase 24 | Pending |
| HOOK-02 | Phase 24 | Pending |
| HOOK-03 | Phase 24 | Pending |
| HOOK-04 | Phase 24 | Pending |
| EXPORT-01 | Phase 25 | Pending |
| EXPORT-02 | Phase 25 | Pending |
| EXPORT-03 | Phase 25 | Pending |
| EXPORT-04 | Phase 25 | Pending |

**Coverage:**
- v3.0 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
