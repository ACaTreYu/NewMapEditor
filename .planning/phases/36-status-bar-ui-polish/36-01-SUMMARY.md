---
phase: 36-status-bar-ui-polish
plan: 01
subsystem: status-bar
tags: [ui-polish, hover-feedback, responsive-layout]
dependency_graph:
  requires: [tileset-panel, status-bar, map-settings-dialog]
  provides: [source-aware-hover-display, responsive-dialog-scroll]
  affects: [status-bar-display, dialog-usability]
tech_stack:
  added: []
  patterns: [react-callback-props, conditional-rendering, flexbox-scroll-container]
key_files:
  created: []
  modified:
    - src/components/TilePalette/TilePalette.tsx
    - src/components/TilesetPanel/TilesetPanel.tsx
    - src/components/StatusBar/StatusBar.tsx
    - src/components/StatusBar/StatusBar.css
    - src/App.tsx
    - src/components/MapSettingsDialog/MapSettingsDialog.css
decisions: []
metrics:
  duration: 3 minutes
  completed: 2026-02-09T21:38:34Z
---

# Phase 36 Plan 01: Status Bar Hover & Scrollable Settings Summary

**One-liner:** Status bar now shows contextual coordinate labels (X/Y for map, Col/Row for tileset) with responsive scrollable dialog tabs.

## What Was Shipped

### Task 1: Wire tileset hover to status bar and add source-aware display
**Commit:** 02cd3ab

**Changes:**
- Added `onTileHover` callback prop to TilePalette component that fires on every mouse move (before drag check)
- TilePalette now calculates hover tile ID, col, and row on mouse move and clears on mouse leave
- TilesetPanel passes through `onTileHover` prop to TilePalette child
- App.tsx tracks `hoverSource` state ('map' | 'tileset' | null) to distinguish hover context
- StatusBar displays contextual labels:
  - Map hover: "X: N  Y: N"
  - Tileset hover: "Col: N  Row: N"
  - No hover: "X: --  Y: --"
- StatusBar.css: Increased `.status-field-coords` min-width from 100px to 120px to fit "Col:" label

**Files modified:**
- src/components/TilePalette/TilePalette.tsx
- src/components/TilesetPanel/TilesetPanel.tsx
- src/components/StatusBar/StatusBar.tsx
- src/components/StatusBar/StatusBar.css
- src/App.tsx

### Task 2: Make Map Settings dialog tabs responsive-scrollable
**Commit:** caeb6a8

**Changes:**
- Added flexbox layout to `.map-settings-dialog` (display: flex, flex-direction: column)
- Updated `.dialog-content` with flex: 1, min-height: 0, overflow: hidden to enable flex-based height
- Removed fixed `max-height: 420px` from `.tab-content` and set `min-height: 0`
- Tab content now scrolls vertically at all window sizes (scales from max-height: 80vh down)

**Files modified:**
- src/components/MapSettingsDialog/MapSettingsDialog.css

## Implementation Notes

### Hover Callback Pattern
The hover callback in TilePalette fires **before** the drag check (early in handleMouseMove), ensuring hover events work regardless of drag state. This required extracting hover calculation into a separate block that always runs.

### Source-Aware Display Logic
StatusBar determines coordinate labels based on `hoverSource`:
- `hoverSource === 'map'` → "X: N  Y: N"
- `hoverSource === 'tileset'` → "Col: N  Row: N"
- `hoverSource === null` → "X: --  Y: --"

Tile ID display remains consistent across both sources.

### Flexbox Scroll Pattern
The responsive scroll pattern uses a three-tier flex hierarchy:
1. `.map-settings-dialog` — flex container with max-height: 80vh
2. `.dialog-content` — flex: 1, min-height: 0 (enables flex shrink)
3. `.tab-content` — flex: 1, overflow-y: auto (scrolls when content exceeds available space)

This eliminates fixed pixel heights and makes tabs scroll at any window size.

## Verification Results

### Automated Checks
- ✅ `npm run typecheck` — Zero TypeScript errors
- ✅ All files compile successfully

### Must-Have Truths
- ✅ Status bar shows tile ID and map coordinates (X/Y) when hovering over map canvas
- ✅ Status bar shows tile ID and tileset coordinates (Col/Row) when hovering over tileset panel
- ✅ Status bar clears tile info when cursor leaves both map canvas and tileset panel
- ✅ Map Settings dialog tabs scroll vertically when content exceeds visible area at small window sizes

### Success Criteria
- ✅ STAT-01: Status bar shows tile ID and map coordinates when hovering over map canvas
- ✅ STAT-02: Status bar shows tile ID and tileset coordinates when hovering over tileset panel
- ✅ UI-01: Map Settings dialog tabs have working scrollbars at all window sizes
- ✅ Zero TypeScript errors

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

**Created files exist:**
No new files created (modifications only).

**Modified files exist:**
```
FOUND: src/components/TilePalette/TilePalette.tsx
FOUND: src/components/TilesetPanel/TilesetPanel.tsx
FOUND: src/components/StatusBar/StatusBar.tsx
FOUND: src/components/StatusBar/StatusBar.css
FOUND: src/App.tsx
FOUND: src/components/MapSettingsDialog/MapSettingsDialog.css
```

**Commits exist:**
```
FOUND: 02cd3ab (Task 1 - Tileset hover wiring)
FOUND: caeb6a8 (Task 2 - Responsive scrollable tabs)
```

All claims verified. ✅
