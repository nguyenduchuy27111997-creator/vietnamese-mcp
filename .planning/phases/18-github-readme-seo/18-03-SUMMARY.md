---
phase: 18-github-readme-seo
plan: "03"
subsystem: readme
tags: [readme, gif, demo, assets, seo]
dependency_graph:
  requires: [18-01]
  provides: [GIF embed in README, assets directory]
  affects: [README.md]
tech_stack:
  added: []
  patterns: [HTML img tag in Markdown for GIF embed]
key_files:
  created:
    - assets/.gitkeep
  modified:
    - README.md
decisions:
  - "Activated img tag directly in README rather than keeping GIF placeholder comment — embed is live and renders correctly once demo.gif is added"
  - "Alt text includes full product description for SEO: 'VN MCP Hub Demo — signup, create API key, make MoMo payment via Claude Code'"
metrics:
  duration: "~2 min (Task 1 only; Task 2 awaits human)"
  completed_date: "2026-03-27"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 2
---

# Phase 18 Plan 03: GIF Demo Summary

**One-liner:** README GIF embed activated (img tag live), assets directory created — awaiting human screen recording of signup-to-payment demo.

## What Was Built

Task 1 (auto) is complete:
- `assets/` directory created with `.gitkeep`
- README.md GIF placeholder comment replaced with active `<img>` tag pointing to `./assets/demo.gif`
- Alt text set to: "VN MCP Hub Demo — signup, create API key, make MoMo payment via Claude Code"
- Demo note added below embed: "Sign up, create an API key, and make a MoMo payment — all from Claude Code in under 60 seconds."

Task 2 (checkpoint:human-verify) is **skipped** — user chose to defer GIF recording to pre-Product Hunt launch. Placeholder img tag is active and will render automatically once `assets/demo.gif` is committed.

## Decisions Made

- Activated the img tag immediately so it's ready to render as soon as `demo.gif` lands in `assets/`
- Used descriptive alt text with product keywords for GitHub SEO

## Deviations from Plan

None — plan executed exactly as written.

## Auth Gates

None.

## Pending (Task 2 — Human Action Required)

**Record a GIF demo** using Kap, LICEcap, CleanShot X, or similar:

1. Open dashboard at https://vn-mcp-dashboard.pages.dev
2. Show signup/login flow
3. Navigate to API Keys and create a new key
4. Switch to Claude Code terminal
5. Show a MoMo payment tool call (e.g., "Create a MoMo payment for 50,000 VND")
6. Show the mock response returning successfully

Recording tips:
- Resolution: 1280x720 or similar
- Keep it under 30 seconds
- Target file size: under 5MB (GitHub renders up to 10MB)
- Crop out unnecessary browser chrome

Save to: `assets/demo.gif`

Verify: `test -f assets/demo.gif && test $(stat -f%z assets/demo.gif) -gt 1000 && echo "PASS"`

After placing the GIF, commit it: `git add assets/demo.gif && git commit -m "feat(18-03): add GIF demo to assets"`

**Alternative (if E2E not available):** Record the self-hosted npm path with a mock tool call — sufficient for launch.

## Self-Check: PASSED

- assets/.gitkeep: FOUND
- README.md contains `demo.gif` img tag: FOUND
- GIF placeholder comment removed: CONFIRMED
- Commit 7010cbc: FOUND
