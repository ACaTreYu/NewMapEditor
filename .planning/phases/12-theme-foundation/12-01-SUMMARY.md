---
phase: 12
plan: 01
subsystem: theme-foundation
tags: [css, win98, typography, color-scheme, bevels]
requires: []
provides:
  - Win98 CSS variable system (24 system colors + semantic aliases)
  - Bevel utility classes (8 patterns with border-only implementation)
  - MS Sans Serif bitmap font bundled with antialiasing disabled
  - Three Win98 color schemes (Standard, High Contrast, Desert)
affects:
  - 13-application-chrome (will consume these CSS foundations)
  - 14-panel-interiors (will use bevel classes)
  - 15-scrollbars (will use color variables)
  - 16-dialog-controls (will use typography and bevels)
tech-stack:
  added:
    - MS Sans Serif bitmap font (from 98.css project)
  patterns:
    - Two-tier CSS variable system (canonical + semantic)
    - Border-only bevels with ::before pseudo-elements for depth
    - Color scheme classes override canonical variables
key-files:
  created:
    - src/styles/win98-variables.css
    - src/styles/win98-bevels.css
    - src/styles/win98-typography.css
    - src/styles/win98-schemes.css
    - assets/fonts/ms_sans_serif.woff
    - assets/fonts/ms_sans_serif.woff2
    - assets/fonts/ms_sans_serif_bold.woff
    - assets/fonts/ms_sans_serif_bold.woff2
  modified: []
key-decisions:
  - decision: "Use two-tier CSS variable system"
    rationale: "Tier 1 canonical names for color schemes to override, Tier 2 semantic aliases for components to use"
    phase: 12
    plan: 01
  - decision: "Use border-only bevels with NO box-shadow"
    rationale: "Per user requirement - pure CSS border approach with ::before pseudo-elements for 2px depth"
    phase: 12
    plan: 01
  - decision: "Bundle MS Sans Serif from 98.css project"
    rationale: "Authentic Win98 bitmap font with proper pixel rendering"
    phase: 12
    plan: 01
duration: "4 minutes"
completed: 2026-02-04
---

# Phase 12 Plan 01: Theme Foundation Summary

**One-liner:** Win98 CSS foundation with 24 system colors, border-only bevels, bitmap typography, and three classic color schemes (Standard/High Contrast/Desert).

## Performance

**Duration:** 4 minutes (2026-02-04T09:20:21Z to 2026-02-04T09:24:02Z)

**Metrics:**
- Tasks completed: 2/2 (100%)
- Files created: 8 (4 fonts + 4 CSS)
- Commits: 2 atomic commits
- Lines of CSS: ~460 lines across 4 files

## Accomplishments

### Task 1: MS Sans Serif Bitmap Fonts and Typography
- Downloaded 4 font files (woff/woff2 regular and bold) from 98.css project via unpkg CDN
- Created `win98-typography.css` with:
  - Two @font-face declarations for regular (400) and bold (700) weights
  - Body font rule: 11px "Pixelated MS Sans Serif" with antialiasing disabled
  - Utility classes: `.win98-text-small` (10px), `.win98-text-caption` (bold)
  - Font smoothing disabled via `-webkit-font-smoothing: none`, `-moz-osx-font-smoothing: grayscale`, `font-smooth: never`

### Task 2: Win98 CSS Variables, Bevels, and Color Schemes
- Created `win98-variables.css` with two-tier variable system:
  - **Tier 1:** 24 canonical Win98 system colors (`--win98-ButtonFace`, `--win98-ButtonHighlight`, etc.)
  - **Tier 2:** Semantic aliases (`--surface`, `--text-primary`, `--border-light`, etc.) that reference Tier 1 via `var()`
- Created `win98-bevels.css` with 8 bevel utility classes:
  - 1px simple: `.win98-raised`, `.win98-sunken`
  - 2px deep: `.win98-raised-deep`, `.win98-sunken-deep` (using `::before` pseudo-elements for inner border layer)
  - Specialized: `.win98-field` (text inputs), `.win98-well` (canvas/document areas)
  - Etched: `.win98-etched-h`, `.win98-etched-v` (separator grooves)
  - **CRITICAL:** Uses ONLY CSS border properties - ZERO box-shadow (per user design decision)
- Created `win98-schemes.css` with 3 color schemes:
  - **Default:** Windows Standard (defined in `:root` in variables.css)
  - `.theme-high-contrast`: High Contrast Black with white on black, magenta accents
  - `.theme-desert`: Desert with warm sandy/tan tones, brown accents

## Task Commits

| Task | Commit  | Description                                      | Files                                                |
| ---- | ------- | ------------------------------------------------ | ---------------------------------------------------- |
| 1    | 2808a48 | Add MS Sans Serif bitmap fonts and typography CSS | 4 font files + win98-typography.css                  |
| 2    | 7f03bfd | Create Win98 CSS variables, bevels, color schemes | win98-variables.css, win98-bevels.css, win98-schemes.css |

## Files Created

### Fonts (4 files, 29KB total)
- `assets/fonts/ms_sans_serif.woff` (8.4KB)
- `assets/fonts/ms_sans_serif.woff2` (6.4KB)
- `assets/fonts/ms_sans_serif_bold.woff` (8.2KB)
- `assets/fonts/ms_sans_serif_bold.woff2` (6.2KB)

### CSS (4 files, 12KB total)
- `src/styles/win98-typography.css` (1.3KB) - @font-face + font rules
- `src/styles/win98-variables.css` (3.3KB) - 24 canonical colors + semantic aliases
- `src/styles/win98-bevels.css` (4.9KB) - 8 bevel utility classes
- `src/styles/win98-schemes.css` (3.0KB) - 3 color scheme classes

## Files Modified

None - this phase created new foundation files only.

## Decisions Made

### 1. Two-Tier CSS Variable System
**Decision:** Implemented Tier 1 (canonical Win98 names) + Tier 2 (semantic aliases).

**Rationale:**
- Tier 1 (`--win98-*`) provides exact Win98 color names that color schemes override
- Tier 2 (semantic) provides component-friendly names (`--surface`, `--text-primary`, etc.) that reference Tier 1
- Components use Tier 2 only, so they automatically adapt to color scheme changes
- Clean separation of concerns: schemes touch Tier 1, components touch Tier 2

**Impact:** All subsequent phases (13-16) will use Tier 2 semantic aliases exclusively.

### 2. Border-Only Bevels (No Box-Shadow)
**Decision:** Used ONLY CSS border properties for bevels, with `::before` pseudo-elements for 2px depth.

**Rationale:**
- User explicitly requested "no box-shadow tricks"
- Authentic to original Win98 rendering which used pixel-perfect borders
- `::before` pseudo-element provides second border layer for 2px raised/sunken effects
- `pointer-events: none` on pseudo-element prevents interaction issues

**Impact:**
- Components using deep bevels must not already use `::before` for other purposes
- If needed, wrap in inner container element
- More verbose CSS but authentic Win98 appearance

**Constraint:** Elements with existing `::before` pseudo-elements need wrapper elements when applying `.win98-*-deep`, `.win98-field`, or `.win98-well` classes.

### 3. MS Sans Serif from 98.css Project
**Decision:** Downloaded bitmap font from 98.css project on GitHub (via unpkg CDN).

**Rationale:**
- Authentic pixel-perfect MS Sans Serif used in Windows 98
- Already packaged as web fonts (woff/woff2) by 98.css maintainer
- Antialiasing disabled ensures crisp pixel rendering at 11px

**Impact:** Typography will render pixel-perfect at intended sizes (11px primary, 10px secondary).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

### Issue 1: Font Download from GitHub Raw URLs Failed
**Problem:** Initial download attempts from `https://raw.githubusercontent.com/jdan/98.css/main/fonts/*` returned 14-byte files (404 pages).

**Root cause:** Fonts are not in the main branch root `/fonts/` directory - they're in the npm package under `/dist/`.

**Resolution:** Switched to unpkg CDN (`https://unpkg.com/98.css@0.1.21/dist/*`) which successfully downloaded all 4 font files (6-8KB each).

**Rule applied:** Rule 3 (auto-fix blocking issue) - could not complete Task 1 without working font files.

## Next Phase Readiness

**Status:** ✅ Ready for Phase 13 (Application Chrome)

**Deliverables verified:**
- ✅ All 8 files created and committed
- ✅ 24 Win98 canonical system colors defined
- ✅ Semantic alias layer complete
- ✅ 8 bevel utility classes implemented with border-only approach
- ✅ 3 color schemes defined (Standard, High Contrast, Desert)
- ✅ MS Sans Serif fonts bundled and @font-face declarations created
- ✅ Typography system configured with antialiasing disabled

**Blockers:** None

**Recommendations for Phase 13:**
1. Import all 4 CSS files in index.html or App.tsx
2. Apply Win98 color scheme class to `<body>` or root container
3. Use Tier 2 semantic variables (`--surface`, `--text-primary`, etc.) in all component styles
4. Apply bevel classes to UI chrome elements (title bar, window borders, panels)
5. Test font rendering at 11px - should be crisp and pixel-perfect
6. Test color scheme switching - all elements should adapt via semantic variables

**Known constraints:**
- Components must not use `::before` pseudo-element if they need deep bevel classes (use wrapper element instead)
- Font rendering depends on browser support for `font-smooth: never` (works in modern Chrome/Firefox)
- Color schemes require class application to container element - not automatic
