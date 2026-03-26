# Requirements: VN MCP Hub — v2.1 Growth & Marketing

**Defined:** 2026-03-26
**Core Value:** Developer installs MCP server or signs up for hosted API key, adds to `.mcp.json`, and immediately uses Claude Code for Vietnamese payments and messaging — zero integration boilerplate.

## v2.1 Requirements

### Product Hunt Launch

- [ ] **PH-01**: Product Hunt listing created with tagline, description, screenshots, and maker profile
- [ ] **PH-02**: Dashboard screenshots captured (dark mode: auth, overview, keys, usage, billing pages)
- [ ] **PH-03**: Launch day checklist prepared (social posts, first comment, community responses)

### Example Apps

- [x] **EX-01**: Payment checkout example app — React app that creates MoMo/VNPAY payments via hosted gateway
- [x] **EX-02**: Zalo chatbot example app — Node.js bot that sends messages via Zalo OA MCP server
- [x] **EX-03**: Each example has README with setup instructions, .mcp.json config, and GIF demo

### GitHub README & SEO

- [x] **GH-01**: Root README.md rewritten with project overview, feature highlights, quick start, and architecture diagram
- [x] **GH-02**: Badges added (npm version, license, build status, MCP servers count)
- [x] **GH-03**: GIF/video demo showing end-to-end flow (signup → key → tool call)
- [x] **GH-04**: Per-server README.md files updated with npm install instructions and usage examples

### Blog & Changelog

- [x] **BLOG-01**: Launch announcement blog post on Mintlify ("Introducing VN MCP Hub")
- [x] **BLOG-02**: Per-server guide posts (MoMo payments, ZaloPay integration, etc.)
- [x] **BLOG-03**: Changelog page added to Mintlify docs site

## v3 Requirements

Deferred to future release.

- **REAL-01**: Real MoMo API integration (after merchant KYC)
- **REAL-02**: Real ZaloPay/VNPAY sandbox integration
- **TEAM-01**: Team management (invite members, shared keys)
- **PLAY-01**: API playground in dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Paid advertising | Organic-first; validate product-market fit before spending |
| Video production | Screenshots and GIFs sufficient for launch |
| Community Discord/Slack | Premature — build after first 50 users |
| Localization (Vietnamese) | English-first for developer audience |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GH-01 | Phase 18 | Complete |
| GH-02 | Phase 18 | Complete |
| GH-03 | Phase 18 | Complete |
| GH-04 | Phase 18 | Complete |
| EX-01 | Phase 19 | Complete |
| EX-02 | Phase 19 | Complete |
| EX-03 | Phase 19 | Complete |
| BLOG-01 | Phase 20 | Complete |
| BLOG-02 | Phase 20 | Complete |
| BLOG-03 | Phase 20 | Complete |
| PH-01 | Phase 21 | Pending |
| PH-02 | Phase 21 | Pending |
| PH-03 | Phase 21 | Pending |

**Coverage:**
- v2.1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
