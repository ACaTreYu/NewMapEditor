---
phase: 47
plan: 01
subsystem: ui
tags: [minimap, scrollbar, viewport, math-fix, ui-cleanup]
requires: [viewport-system, scrollbar-rendering]
provides: [accurate-scrollbar-metrics, clean-minimap-empty-state]
affects: [MapCanvas, Minimap]
tech-stack:
  added: []
  patterns: [standard-scrollbar-formulas, dynamic-maxOffset-clamping]
key-files:
  created: []
  modified:
    - path: src/components/Minimap/Minimap.tsx
      changes: [remove-empty-label, dynamic-viewport-clamping]
    - path: src/components/Minimap/Minimap.css
      changes: [delete-empty-label-css]
    - path: src/components/MapCanvas/MapCanvas.tsx
      changes: [scrollbar-math-rewrite, viewport-clamping-fix]
key-decisions:
  - id: D47-01
    title: Use standard Windows scrollbar formulas
    rationale: Windows/WPF scrollbar documentation provides proven formulas for thumb size (viewport/content ratio), thumb position (offset/maxOffset * scrollableRange), and drag sensitivity (pixelDelta/scrollableRange * maxOffset)
    alternatives: [approximate-percentage-math, custom-heuristics]
    impact: Scrollbar behavior now matches native Windows scrollbars at all zoom levels
  - id: D47-02
    title: Dynamic maxOffset replaces hardcoded MAP_WIDTH-10/MAP_HEIGHT-10
    rationale: Viewport clamps must use actual visible tile count to prevent scrollbar thumb overflow and ensure consistent behavior across zoom levels
    alternatives: [fixed-clamp-values, zoom-dependent-constants]
    impact: All viewport setters (pan, zoom, scroll, minimap) now clamp consistently
metrics:
  duration: 3 minutes
  completed: 2026-02-12
---

# Phase 47 Plan 01: UI Cleanup + Scrollbar Math Fix Summary

Clean minimap empty state (remove text label) and fix all scrollbar thumb math to use standard formulas for size, position, drag sensitivity, and viewport clamping.

## Accomplishments

### Task 1: Remove minimap empty state text label
- Removed redundant "Minimap" text overlay from empty state
- Deleted `.minimap-empty-label` CSS rule block
- Fixed minimap click viewport clamping to use dynamic maxOffset
- Checkerboard pattern now sole empty state indicator
- Commit: `ea68253`

### Task 2: Fix scrollbar thumb math (7 interconnected fixes)
- Rewrote `getScrollMetrics()` to use pixel-based standard formulas
  - Thumb size: `(visibleTiles/mapSize) * trackSize` with 20px minimum
  - Thumb position: `(offset/maxOffset) * scrollableRange + arrowOffset`
  - Returns pixel values directly, not percentages
- Updated scrollbar JSX style bindings to use simple pixel values
  - Horizontal: `left: ${thumbLeft}px`, `width: ${thumbWidth}px`
  - Vertical: `top: ${thumbTop}px`, `height: ${thumbHeight}px`
  - Removed all `calc()` expressions
- Fixed `handleScrollMouseMove()` drag sensitivity
  - Divides by `scrollableRange` (track - thumb) instead of full track
  - Calculates dynamic maxOffset per drag move
- Fixed `handleTrackClick()` thumb position detection
  - Uses same standard formula as `getScrollMetrics()`
  - Detects clicks before/after thumb accurately at all zoom levels
- Fixed `scrollByTiles()` arrow button clamping
  - Clamps to dynamic maxOffset based on current visible tiles
- Fixed `commitPan()` viewport clamping
  - Uses dynamic maxOffset after calculating new viewport position
- Fixed `handleWheel()` viewport clamping
  - Uses dynamic maxOffset with NEW zoom level's visible tiles
- Removed all hardcoded `MAP_WIDTH - 10` / `MAP_HEIGHT - 10` clamps
- Commit: `56b2020`

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove minimap empty state text label | `ea68253` | Minimap.tsx, Minimap.css |
| 2 | Fix scrollbar thumb math | `56b2020` | MapCanvas.tsx |

## Files Modified

| File | Lines Changed | Changes |
|------|---------------|---------|
| `src/components/Minimap/Minimap.tsx` | -5, +3 | Removed empty label JSX, fixed minimap click clamping |
| `src/components/Minimap/Minimap.css` | -11 | Deleted empty label CSS rule |
| `src/components/MapCanvas/MapCanvas.tsx` | -35, +98 | Rewrote scrollbar math, fixed all viewport clamping |

**Total:** 3 files, ~61 net lines added

## Verification Results

All verification criteria passed:
- Zero TypeScript errors
- Zero occurrences of "minimap-empty-label" in Minimap component
- Zero occurrences of `MAP_WIDTH - 10` or `MAP_HEIGHT - 10` in MapCanvas.tsx or Minimap.tsx
- Zero percentage-based `calc()` expressions in scrollbar thumb styling
- `scrollableRange` present in both `getScrollMetrics()` and `handleScrollMouseMove()`
- `maxOffset` present in all viewport-setting functions (23 occurrences total)

## Deviations from Plan

None. Plan executed exactly as written. All 7 scrollbar math fixes and minimap cleanup completed atomically.

## Key Technical Decisions

### Standard Scrollbar Formulas (D47-01)
Adopted Windows/WPF scrollbar documentation formulas:
- Thumb size = `(viewport / content) * trackSize`
- Thumb position = `(offset / maxOffset) * scrollableRange + arrowOffset`
- Drag sensitivity = `(pixelDelta / scrollableRange) * maxOffset`

**Impact:** Scrollbar behavior now matches native Windows scrollbars. Thumb size shrinks as zoom increases, thumb reaches track ends correctly, and drag sensitivity is consistent at all zoom levels.

### Dynamic maxOffset Clamping (D47-02)
Replaced all hardcoded `MAP_WIDTH - 10` / `MAP_HEIGHT - 10` clamps with dynamic maxOffset calculation:
```typescript
const maxOffset = Math.max(0, MAP_SIZE - visibleTiles);
```

**Impact:** Prevents scrollbar thumb overflow. All viewport setters (pan, zoom, minimap click, scroll arrows, thumb drag) now clamp consistently to the actual scrollable range.

## Next Phase Readiness

Phase 47 Plan 01 complete. Ready for Phase 48 (Hybrid Render: CSS Pan + RAF Scroll) once planned.

**Blockers:** None.

## Self-Check: PASSED

Verified created files:
- FOUND: .planning/phases/47-ui-cleanup-scrollbar-math-fix/47-01-SUMMARY.md

Verified commits:
- FOUND: ea68253 (Task 1: minimap empty label removal)
- FOUND: 56b2020 (Task 2: scrollbar math fixes)

All claimed accomplishments verified.
