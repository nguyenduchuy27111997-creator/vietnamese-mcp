---
phase: 14-design-system-foundation
plan: 01
subsystem: ui
tags: [tailwindcss, shadcn-ui, postcss, design-tokens, dark-mode, react, vite]

# Dependency graph
requires: []
provides:
  - Tailwind CSS v3 configured with PostCSS + autoprefixer in apps/dashboard
  - shadcn/ui components.json with new-york style and path aliases
  - CSS custom property design token system (light + dark modes) in globals.css
  - cn() utility at @/lib/utils for class merging
  - Dark mode default with FOUC-prevention inline script in index.html
  - Inter and JetBrains Mono loaded from Google Fonts
  - @ path alias in tsconfig.json and vite.config.ts
affects: [15-core-components, 16-dashboard-pages, 17-polish]

# Tech tracking
tech-stack:
  added:
    - tailwindcss@3
    - postcss
    - autoprefixer
    - clsx
    - tailwind-merge
    - class-variance-authority
    - lucide-react
    - "@types/node"
  patterns:
    - CSS custom properties for all design tokens (HSL values, no hard-coded colors)
    - darkMode: 'class' strategy — dark class on <html> controls theme
    - cn() utility for conditional/merged Tailwind class composition
    - Inline theme script before React hydration prevents flash of wrong theme

key-files:
  created:
    - apps/dashboard/postcss.config.js
    - apps/dashboard/tailwind.config.ts
    - apps/dashboard/components.json
    - apps/dashboard/src/lib/utils.ts
    - apps/dashboard/src/globals.css
    - apps/dashboard/tsconfig.json
  modified:
    - apps/dashboard/vite.config.ts
    - apps/dashboard/index.html
    - apps/dashboard/src/main.tsx
    - apps/dashboard/package.json

key-decisions:
  - "Tailwind v3 used (not v4) — shadcn/ui CLI tooling is optimized for v3, avoids compatibility issues"
  - "darkMode: class strategy — allows explicit toggle via localStorage without OS preference dependency"
  - "Primary color uses blue #2563eb (light) / #3b82f6 (dark) per prior user decision"
  - "Dark background 240 10% 3.9% maps to #09090b (zinc-950) — matching Linear/Vercel aesthetic"

patterns-established:
  - "Design tokens pattern: All colors are CSS custom properties in globals.css, referenced via hsl(var(--token)) in tailwind.config.ts"
  - "Theme script pattern: Inline IIFE in index.html reads localStorage before React hydrates to prevent FOUC"
  - "Path alias pattern: @/* maps to ./src/* in both tsconfig.json and vite.config.ts"

requirements-completed: [DS-01, DS-03]

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 14 Plan 01: Design System Foundation Summary

**Tailwind CSS v3 + shadcn/ui configured in apps/dashboard with zinc-950 dark mode default, CSS custom property design tokens, Inter/JetBrains Mono fonts, and FOUC-prevention theme script**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-25T13:14:00Z
- **Completed:** 2026-03-25T13:21:57Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed full CSS toolchain (Tailwind v3, PostCSS, autoprefixer, clsx, tailwind-merge, lucide-react, class-variance-authority)
- Created complete design token system in globals.css with 16 CSS custom properties for light + dark modes
- Dark default (#09090b zinc-950 background) set via `class="dark"` on `<html>` with FOUC-prevention inline script
- Inter + JetBrains Mono fonts loaded via Google Fonts preconnect links
- shadcn/ui configured with new-york style, @ path aliases working in both TypeScript and Vite

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Tailwind CSS + PostCSS + shadcn/ui toolchain** - `9426f47` (chore)
2. **Task 2: globals.css design tokens, dark mode script, fonts** - `e628086` (feat)

## Files Created/Modified
- `apps/dashboard/postcss.config.js` - PostCSS config with tailwindcss + autoprefixer plugins
- `apps/dashboard/tailwind.config.ts` - Tailwind config with darkMode class, shadcn/ui color tokens, Inter/JetBrains Mono font families
- `apps/dashboard/components.json` - shadcn/ui config with new-york style, path aliases
- `apps/dashboard/src/lib/utils.ts` - cn() utility using clsx + tailwind-merge
- `apps/dashboard/src/globals.css` - @tailwind directives + full CSS custom property design tokens (light + dark)
- `apps/dashboard/tsconfig.json` - TypeScript config with @/* path alias
- `apps/dashboard/vite.config.ts` - Added @ path alias via path.resolve
- `apps/dashboard/index.html` - dark class default, Google Fonts, inline theme script preventing FOUC
- `apps/dashboard/src/main.tsx` - Added globals.css import

## Decisions Made
- Tailwind v3 chosen over v4 for shadcn/ui compatibility
- darkMode: 'class' strategy for explicit localStorage-driven theme control
- Primary blue uses #2563eb (light) / #3b82f6 (dark) per prior user decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Minor: `grep -q "JetBrains Mono"` acceptance criteria uses a space but the font appears in the Google Fonts URL as `JetBrains+Mono` (URL-encoded). The font loads correctly; the acceptance criteria wording assumed a human-readable `<link>` text but Google Fonts URLs use + encoding. All other criteria pass; build succeeds with processed CSS output.

## User Setup Required

None - no external service configuration required. Google Fonts loads at runtime from CDN.

## Next Phase Readiness

- CSS toolchain ready: Tailwind processes all `src/**/*.{ts,tsx}` files
- Design tokens defined: all shadcn/ui components can be added with `npx shadcn@latest add <component>`
- Path alias `@/` works — components can import `@/lib/utils`, `@/components/ui/*`, etc.
- Ready for Phase 15: Core Components (Button, Input, Badge, etc. via shadcn/ui)

---
*Phase: 14-design-system-foundation*
*Completed: 2026-03-25*
