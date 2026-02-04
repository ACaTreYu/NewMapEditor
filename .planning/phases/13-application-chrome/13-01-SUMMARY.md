---
phase: 13-application-chrome
plan: 01
subsystem: ui-chrome
tags: [toolbar, status-bar, xp-classic, win98, css]
dependency-graph:
  requires: [12-theme-foundation]
  provides: [xp-classic-toolbar, xp-classic-status-bar, sunken-fields, resize-grip]
  affects: [14-panel-interiors, 16-dialog-controls]
tech-stack:
  added: []
  patterns: [flat-raised-sunken-button-states, etched-separators, sunken-status-fields, css-gradient-resize-grip]
key-files:
  created: []
  modified:
    - src/components/ToolBar/ToolBar.css
    - src/components/ToolBar/Toolbar.tsx
    - src/components/StatusBar/StatusBar.css
    - src/components/StatusBar/StatusBar.tsx
decisions:
  - Toolbar buttons use transparent border at rest (flat), Highlight/DkShadow on hover (raised), inverted on press/active (sunken)
  - Toolbar labels visible at 9px uppercase below 16px icons
  - Status bar fields use shallow 1px inset borders (not 2px deep)
  - Removed map info fields (Size, Teams, Objective) from status bar per CONTEXT.md
  - Resize grip uses CSS linear-gradient triple diagonal pattern
metrics:
  duration: ~4 minutes
  completed: 2026-02-04
---

# Phase 13 Plan 01: XP Classic Toolbar and Status Bar Summary

XP Classic flat/raised/sunken toolbar button states with icon+label layout, etched group separators, and sunken status bar fields displaying full editing context with diagonal resize grip.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | XP Classic toolbar button states with icon+label layout and group separators | b5bbd88 | ToolBar.css, Toolbar.tsx |
| 2 | XP Classic status bar with sunken fields and resize grip | e81ebcc | StatusBar.css, StatusBar.tsx |

## Changes Made

### Task 1: Toolbar XP Classic Styling

**ToolBar.css** -- Complete rewrite with XP Classic button behavior:
- Rest state: transparent border (flat appearance)
- Hover state: ButtonHighlight top-left, ButtonDkShadow bottom-right (raised)
- Active/pressed state: inverted borders (sunken)
- Toggled active: sunken borders + ButtonShadow background
- Disabled: GrayText color with ButtonHighlight emboss text-shadow
- Icon at 16px, label visible at 9px uppercase below icon
- Etched vertical separators (ButtonShadow left, ButtonHighlight right)
- No CSS transitions anywhere

**Toolbar.tsx** -- Added separator elements between logical button groups:
- Group 1: New, Open, Save
- Group 2: Undo, Redo
- Group 3: All tool buttons (Select through Picker)
- Group 4: Grid, Settings, Theme
- Three `toolbar-separator` divs between groups
- No changes to button functionality, shortcuts, or state management

### Task 2: Status Bar XP Classic Styling

**StatusBar.tsx** -- Rewritten JSX with sunken field layout:
- Imports `currentTool` and `tileSelection` from useEditorStore
- Coordinates field: `X: {value}  Y: {value}` with `--` when off-map
- Tile field: `Tile: {id}` or `Tile: --`
- Zoom field: `Zoom: {percent}%`
- Tool field: `Tool: {currentTool}`
- Selection field: conditional, shown when multi-tile selected
- Removed map info fields (Size, Teams, Objective) and branding text
- Resize grip div at far right

**StatusBar.css** -- Complete rewrite with XP Classic sunken fields:
- Container: ButtonFace background, ButtonHighlight top border
- Sunken fields: 1px inset borders (ButtonShadow top-left, ButtonHighlight bottom-right)
- Fixed-width fields for coords (100px), tile (65px), zoom (70px)
- Diagonal resize grip using triple linear-gradient pattern
- No CSS transitions

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- [x] TypeScript typecheck passes (no new errors; pre-existing errors in App.tsx, MapParser.ts, WallSystem.ts unchanged)
- [x] Toolbar buttons: flat at rest, raised on hover, sunken on press/active
- [x] Toolbar text labels visible below each icon
- [x] Etched vertical separators between File/Undo-Redo/Tools/View groups
- [x] Status bar: sunken fields for X, Y, Tile, Zoom, Tool, Selection
- [x] Status bar: diagonal resize grip at bottom-right
- [x] No CSS transitions (all state changes instant)

## Success Criteria Met

- [x] CHROME-01: Toolbar buttons display flat/raised/sunken states with icon+label layout
- [x] CHROME-02: Status bar shows editing context in sunken fields with resize grip
