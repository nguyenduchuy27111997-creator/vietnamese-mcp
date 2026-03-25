# Requirements: VN MCP Hub — v2.0 Modern Dashboard

**Defined:** 2026-03-25
**Core Value:** Developer installs MCP server or signs up for hosted API key, adds to `.mcp.json`, and immediately uses Claude Code for Vietnamese payments and messaging — zero integration boilerplate.

## v2.0 Requirements

Requirements for dashboard UI/UX overhaul. Each maps to roadmap phases.

### Design System

- [x] **DS-01**: Tailwind CSS + shadcn/ui installed and configured in apps/dashboard
- [x] **DS-02**: Dark mode default with light mode toggle (system detect + manual)
- [x] **DS-03**: Color palette, typography, and spacing tokens defined matching Linear/Vercel aesthetic

### App Shell

- [x] **SHELL-01**: Sidebar navigation with collapsible menu (Overview, API Keys, Usage, Billing, Settings)
- [x] **SHELL-02**: User avatar/email in sidebar footer with sign-out action
- [x] **SHELL-03**: Responsive mobile layout (sidebar collapses to hamburger menu)
- [x] **SHELL-04**: Active page indicator in sidebar navigation

### Pages

- [ ] **PAGE-01**: Overview/Home — welcome card, quick stats (key count, usage, tier), recent activity feed
- [ ] **PAGE-02**: API Keys — redesigned table with status badges, search/filter, creation modal, copy animation, revoke confirmation dialog
- [ ] **PAGE-03**: Usage & Analytics — usage chart (daily calls over 30 days), per-server breakdown table, limit warning banner at 80%+
- [ ] **PAGE-04**: Billing — current plan card, upgrade/downgrade tier selector, Stripe/MoMo payment buttons, Stripe Portal link, payment method display
- [ ] **PAGE-05**: Settings — profile section (email display, password change), danger zone (delete account with confirmation)
- [ ] **PAGE-06**: Quickstart — interactive 3-step onboarding wizard (create key → configure .mcp.json → test call) for new users with no keys

### Navigation

- [ ] **NAV-01**: Client-side routing (React Router or equivalent) between all pages
- [ ] **NAV-02**: Redirect to Quickstart page for new users with zero API keys

## v3 Requirements

Deferred to future release.

- **FEAT-01**: Usage dashboard with real-time charts (WebSocket updates)
- **FEAT-02**: Team management (invite members, shared keys)
- **FEAT-03**: Notification center (usage alerts, billing reminders)
- **FEAT-04**: API playground (test tool calls from dashboard)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Landing page redesign | Docs site on Mintlify handles this |
| Gateway API changes | v2.0 is frontend-only |
| New MCP servers | Separate milestone |
| Mobile native app | Web responsive is sufficient |
| i18n/Vietnamese translation | English-first for developer audience |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | Phase 14 | Complete |
| DS-02 | Phase 14 | Complete |
| DS-03 | Phase 14 | Complete |
| SHELL-01 | Phase 15 | Complete |
| SHELL-02 | Phase 15 | Complete |
| SHELL-03 | Phase 15 | Complete |
| SHELL-04 | Phase 15 | Complete |
| NAV-01 | Phase 15 | Pending |
| NAV-02 | Phase 15 | Pending |
| PAGE-01 | Phase 16 | Pending |
| PAGE-02 | Phase 16 | Pending |
| PAGE-03 | Phase 16 | Pending |
| PAGE-04 | Phase 17 | Pending |
| PAGE-05 | Phase 17 | Pending |
| PAGE-06 | Phase 17 | Pending |

**Coverage:**
- v2.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
