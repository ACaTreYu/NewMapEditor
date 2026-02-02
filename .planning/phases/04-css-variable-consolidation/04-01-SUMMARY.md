---
phase: 04
plan: 01
subsystem: theming
tags: [css, theming, dark-mode, light-mode, css-variables, hooks]

dependency_graph:
  requires: []
  provides:
    - CSS variable theming system
    - useTheme hook with localStorage persistence
    - Dark and light theme support
    - FOUC prevention
  affects:
    - Any future component CSS migrations
    - Future theme customization features

tech_stack:
  added: []
  patterns:
    - Two-tier CSS variable system (primitives + semantic tokens)
    - Class-based theme switching (.theme-light)
    - React custom hook for theme state management
    - Inline script FOUC prevention

key_files:
  created:
    - src/hooks/useTheme.ts
  modified:
    - src/App.css
    - index.html
    - src/components/AnimationPanel/AnimationPanel.css
    - src/components/MapSettingsPanel/MapSettingsPanel.css
    - src/components/MapCanvas/MapCanvas.css
    - src/components/StatusBar/StatusBar.css
    - src/components/Toolbar/Toolbar.tsx (ToolBar.tsx)
    - src/components/MapSettingsPanel/MapSettingsPanel.tsx

decisions:
  - decision: "Two-tier CSS variable system"
    reason: "Separates raw colors (primitives) from usage (semantic tokens) for flexibility"
    trade_off: "More variables to maintain, but easier theme expansion"
  - decision: "Class-based theme switching over media queries"
    reason: "Allows programmatic control and user preference override"
    trade_off: "Requires JavaScript for theme application"
  - decision: "Inline FOUC prevention script"
    reason: "Prevents flash of wrong theme on page load"
    trade_off: "Requires unsafe-inline CSP for scripts"

metrics:
  duration: "~15 minutes"
  completed: "2026-02-02"
---

# Phase 04 Plan 01: CSS Variable Consolidation Summary

Two-tier CSS variable system with dark/light theme toggle and FOUC prevention for AC Map Editor.

## What Was Done

### Task 1: Theme Infrastructure
- Created comprehensive CSS variable system in `src/App.css`:
  - Tier 1: Primitive color tokens (dark, neutral, accent, cream, blue palettes)
  - Tier 2: Semantic tokens (backgrounds, borders, text, accents, scrollbars, inputs, sliders)
  - Dark theme as default via `:root`
  - Light theme via `.theme-light` class override
- Created `src/hooks/useTheme.ts` custom hook:
  - Three-way toggle: system, light, dark
  - localStorage persistence under key "theme"
  - System preference detection via `matchMedia`
  - Automatic class application to `document.documentElement`
- Added FOUC prevention script to `index.html`:
  - Synchronous inline script before root div
  - Reads theme from localStorage and applies class
  - Fallback to dark theme on error
  - Updated CSP to allow inline scripts

### Task 2: CSS Migration
Migrated all hardcoded hex colors to CSS variables in target files:
- `AnimationPanel.css`: 10 color migrations
- `MapSettingsPanel.css`: 15 color migrations
- `MapCanvas.css`: 6 color migrations
- `StatusBar.css`: 4 color migrations

Zero hardcoded hex colors remain in target files.

### Task 3: Theme Toggle UI
- Added theme cycle button to Toolbar:
  - Uses S/L/D text icons for System/Light/Dark
  - Cycles through themes on click
  - Shows current theme label
- Added Appearance section to MapSettingsPanel:
  - Theme dropdown with System Default/Light/Dark options
  - Both controls share useTheme hook for synchronized state

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| c3ff222 | feat | Add CSS variable theme infrastructure |
| 21871af | refactor | Migrate hardcoded colors to CSS variables |
| 0b3ab5a | feat | Add theme toggle UI to toolbar and settings |

## Files Changed

### Created
- `src/hooks/useTheme.ts` - Theme state management hook

### Modified
- `src/App.css` - Complete CSS variable system
- `index.html` - FOUC prevention script and CSP update
- `src/components/AnimationPanel/AnimationPanel.css` - CSS variable migration
- `src/components/MapSettingsPanel/MapSettingsPanel.css` - CSS variable migration
- `src/components/MapCanvas/MapCanvas.css` - CSS variable migration
- `src/components/StatusBar/StatusBar.css` - CSS variable migration
- `src/components/Toolbar/Toolbar.tsx` - Theme toggle button
- `src/components/MapSettingsPanel/MapSettingsPanel.tsx` - Theme dropdown

## Verification Results

- [x] No hardcoded colors in target CSS files (grep returns empty)
- [x] TypeScript compiles (pre-existing errors unrelated to changes)
- [x] useTheme hook exports correctly
- [x] FOUC prevention script in index.html
- [x] Theme toggle in Toolbar
- [x] Theme dropdown in MapSettingsPanel

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] POL-01: AnimationPanel.css uses CSS variables (zero hardcoded colors)
- [x] POL-02: MapSettingsPanel.css uses CSS variables (zero hardcoded colors)
- [x] POL-03: MapCanvas.css uses CSS variables (zero hardcoded colors)
- [x] POL-04: StatusBar.css uses CSS variables (zero hardcoded colors)
- [x] Theme toggle available in toolbar and settings panel
- [x] Dark and light themes both defined
- [x] System preference detection in useTheme hook
- [x] Theme persists via localStorage
- [x] FOUC prevention script in place

## Notes for Future Phases

- Light theme uses cream/blue palette for a paper-like feel
- Additional CSS files may need migration for complete coverage
- Theme system can be extended for custom themes or color customization
- Consider adding transition animations between themes
