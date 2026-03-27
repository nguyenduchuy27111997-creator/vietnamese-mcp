---
phase: 21-product-hunt-launch
plan: 02
subsystem: marketing
tags: [product-hunt, screenshots, launch, dashboard]

# Dependency graph
requires:
  - phase: 21-01
    provides: PH listing copy (tagline, description, captions), launch checklist
provides:
  - Screenshot capture guide with exact URLs, viewport, and save-as filenames for 5 dashboard pages
  - Step-by-step PH listing assembly instructions (account, fields, gallery, maker profile, draft save)
affects: [21-product-hunt-launch, launch-day execution]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/21-product-hunt-launch/screenshot-guide.md
  modified: []

key-decisions:
  - "PH listing assembly deferred to pre-launch day — user will capture screenshots and assemble draft when ready rather than during planning phase"
  - "screenshot-guide.md references ph-listing-copy.md captions inline so human has a single workflow document"

patterns-established: []

requirements-completed: [PH-01, PH-02]

# Metrics
duration: ~5min
completed: 2026-03-27
---

# Phase 21 Plan 02: Screenshot Capture Guide and PH Listing Assembly Summary

**Step-by-step screenshot capture guide for 5 dark-mode dashboard pages at 1280x800, with PH listing assembly deferred to pre-launch day**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-27T03:20:00Z
- **Completed:** 2026-03-27T03:25:02Z
- **Tasks:** 1 completed, 1 deferred (skipped at checkpoint)
- **Files modified:** 1

## Accomplishments

- Created `screenshot-guide.md` with exact capture instructions for 5 dashboard pages (auth, overview, keys, usage, billing) at 1280x800 dark mode
- Documented PH listing assembly steps: account creation, all listing fields, gallery upload order, maker profile setup, and draft save instructions
- Referenced ph-listing-copy.md captions inline so the guide is a single self-contained workflow document
- Task 2 (PH listing assembly verification) deferred — user will capture screenshots and assemble the PH draft on pre-launch day

## Task Commits

Each task was committed atomically:

1. **Task 1: Create screenshot capture guide and PH assembly instructions** - `3e3d2dc` (feat)
2. **Task 2: Verify screenshots captured and PH listing assembled** - SKIPPED (deferred to pre-launch day)

**Plan metadata:** (this commit)

## Files Created/Modified

- `.planning/phases/21-product-hunt-launch/screenshot-guide.md` - Complete screenshot capture instructions (5 pages, viewport spec, capture methods) and PH listing assembly steps

## Decisions Made

- PH listing assembly deferred to pre-launch day. User chose to skip the checkpoint rather than capture screenshots now. The guide is ready whenever they are.
- All copy sources are in place: tagline, description, and gallery captions are in `ph-listing-copy.md`, which `screenshot-guide.md` references directly.

## Deviations from Plan

None — Task 1 executed exactly as written. Task 2 was a `checkpoint:human-verify` gate; the user explicitly chose to defer this work to before launch day, which is a valid pre-planned option for this kind of human-action checkpoint.

## Issues Encountered

None.

## User Setup Required

**Before Product Hunt launch day, follow `.planning/phases/21-product-hunt-launch/screenshot-guide.md` to:**

1. Capture 5 dashboard screenshots at 1280x800 dark mode
2. Create PH listing at https://www.producthunt.com/posts/new
3. Copy tagline and description from `ph-listing-copy.md`
4. Upload screenshots with captions
5. Set up maker profile (name, avatar, bio)
6. Save listing as draft (do NOT publish until launch day)

## Next Phase Readiness

- All Phase 21 content is written and ready: PH listing copy, launch checklist, social post templates, response templates, screenshot guide, and PH assembly instructions
- The only remaining action before launch day is the human capturing screenshots and assembling the PH draft
- Phase 21 is complete from a planning/content perspective

---
*Phase: 21-product-hunt-launch*
*Completed: 2026-03-27*
