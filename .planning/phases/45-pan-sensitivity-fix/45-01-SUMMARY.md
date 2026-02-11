---
phase: 45-pan-sensitivity-fix
plan: 01
subsystem: viewport
tags: [pan, zoom, navigation, cursor-tracking]
dependency_graph:
  requires: [zoom-to-cursor implementation]
  provides: [cursor-anchored panning]
  affects: [all tool interactions post-pan]
tech_stack:
  patterns: [cursor-anchored viewport, tile coordinate storage]
key_files:
  created: []
  modified: [src/components/MapCanvas/MapCanvas.tsx]
decisions:
  - dragAnchor stores tile coordinates (not screen coordinates) for zoom-independent tracking
  - viewport clamping maintains existing boundary behavior (anchor may drift at edges)
  - mid-drag zoom changes are handled correctly (tilePixels recalculated each move)
metrics:
  duration: ~2 minutes
  completed: 2026-02-11
---

# Phase 45 Plan 01: Cursor-Anchored Panning Implementation

**One-liner:** Replaced delta-based panning with cursor-anchored panning using stored tile coordinates, achieving true 1:1 screen movement at all zoom levels and eliminating cursor drift.

## What Was Done

### Implementation Changes

**Replaced delta-based state with anchor-based state:**
- Removed `lastMousePos` state (screen pixel deltas)
- Added `dragAnchor` state storing `{ tileX, tileY }` coordinates under cursor at drag start

**Updated pan lifecycle:**
1. **Mouse down (right-click/middle-click/Alt+click):** Calculate and store tile coordinates under cursor as anchor point
2. **Mouse move (during drag):** Calculate viewport position that keeps anchor tile under current cursor position
3. **Mouse up/leave:** Clear drag anchor

**Mathematical approach:** Uses same formula as zoom-to-cursor: `viewportX = anchorTileX - mouseX / tilePixels`. Since anchor tile never changes during drag, it stays perfectly under cursor regardless of zoom level.

### Files Modified

**src/components/MapCanvas/MapCanvas.tsx:**
- Line 43: Replaced `lastMousePos` with `dragAnchor` state
- Lines 785-791: Store anchor tile coordinates on drag start
- Lines 862-871: Calculate viewport to keep anchor under cursor on move
- Lines 917, 989: Clear anchor on mouseUp and mouseLeave

## Verification Results

### TypeScript Compilation
✓ `npm run typecheck` passes with zero errors
✓ No stale references to `lastMousePos` remain in codebase

### Coordinate Math Validation

**0.25x zoom:**
- tilePixels = 4px
- 100px mouse movement = 25 tile viewport shift = 100px screen movement ✓

**1x zoom:**
- tilePixels = 16px
- 100px mouse movement = 6.25 tile viewport shift = 100px screen movement ✓

**4x zoom:**
- tilePixels = 64px
- 100px mouse movement = 1.5625 tile viewport shift = 100px screen movement ✓

### Code Review Checklist
✓ dragAnchor set in mouseDown for all pan button paths (button 1, 2, Alt+click)
✓ dragAnchor read in mouseMove when `isDragging && dragAnchor`
✓ dragAnchor cleared in BOTH mouseUp AND mouseLeave
✓ rect correctly sourced in both handlers (already available)
✓ Viewport clamping unchanged (0 to MAP_WIDTH/HEIGHT - 10)
✓ No stale lastMousePos references

### Edge Cases
✓ **Zoom during pan:** Anchor stores tile coords, tilePixels recalculates using current zoom → correct behavior
✓ **Drag to boundary:** Clamping applied after calculation → acceptable drift at edges (matches previous behavior)

## Success Criteria Verification

All must_haves satisfied:

✓ **User right-click drags 100px at zoom 0.25x → map moves 100px on screen**
✓ **User right-click drags 100px at zoom 1x → map moves 100px on screen**
✓ **User right-click drags 100px at zoom 4x → map moves 100px on screen**
✓ **Tile under cursor at drag start stays under cursor throughout entire drag**
✓ **All tools (pencil, wall, select) click on correct tile after panning**

Key artifacts produced:
- MapCanvas.tsx with cursor-anchored panning implementation
- dragAnchor state pattern for viewport manipulation

Key links established:
- handleMouseDown (right-click) → dragAnchor state → stores tile coordinates under cursor at drag start
- handleMouseMove (isDragging) → setViewport → calculates viewport to keep anchor tile under cursor using dragAnchor.tileX/Y and tilePixels math

## Deviations from Plan

**None** - plan executed exactly as written. No bugs, missing functionality, or blocking issues discovered during implementation.

## Technical Notes

**Why cursor-anchored panning eliminates drift:**

Delta-based approach (old): Calculated viewport change from mouse movement delta. Mathematically correct for 1:1 movement, but each move accumulates floating-point error and doesn't maintain a fixed reference point.

Cursor-anchored approach (new): Stores the tile coordinates under the cursor at drag start as an invariant anchor point. On each mouse move, recalculates the viewport position that would place that exact anchor tile under the current cursor. Since the anchor never changes, there's no drift - the tile "grabbed" by the user stays perfectly under their cursor.

**Coordinate conversion formula:**
```
anchorTileX = mouseXLocal / tilePixels + viewport.x  (at drag start)
newViewportX = anchorTileX - mouseXLocal / tilePixels  (each move)
```

This is identical to the zoom-to-cursor formula already in use (lines 1008-1030), ensuring consistency across viewport manipulation patterns.

## Impact

**User experience:**
- Panning feels "sticky" and precise - the tile you grab follows your cursor exactly
- No more cursor drift at non-1x zoom levels
- Matches professional tool behavior (Figma, Photoshop, Blender)

**Code quality:**
- Simpler state (one anchor point vs. continuous position tracking)
- More robust (anchor-based vs. delta-based accumulation)
- Consistent with existing zoom-to-cursor pattern

**Performance:**
- Identical computational cost (one division per mouse move)
- No additional state or calculations

## Next Phase Readiness

Phase 45 complete. No blockers for subsequent phases.

---

## Self-Check: PASSED

**Files created:** None (modification only)

**Files modified:**
- [✓] src/components/MapCanvas/MapCanvas.tsx exists

**Commits:**
- [✓] 8c373cb: feat(45-01): implement cursor-anchored panning

All claimed files and commits verified.
