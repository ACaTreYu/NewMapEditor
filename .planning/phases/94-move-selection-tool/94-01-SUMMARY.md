---
phase: 94
plan: 01
subsystem: MapCanvas / Selection Tool
tags: [selection, mouse-handler, ux, keyboard, cursor]
requires: [93-01]
provides: [selection-move-drag, arrow-key-nudge, cursor-affordance]
affects: [src/components/MapCanvas/MapCanvas.tsx]
tech-stack:
  added: []
  patterns: [ref-based transient state, RAF-debounced UI redraw, Escape cancellation, window keydown useEffect]
key-files:
  modified:
    - src/components/MapCanvas/MapCanvas.tsx
decisions:
  - id: D94-01-1
    decision: mouseLeave commits current move position (not revert)
    rationale: User dragged off edge intentionally; committing preserves intent. Escape still available for revert.
  - id: D94-01-2
    decision: selectionMoveRef stores normalized coords (minX/minY-based) from mousedown
    rationale: Avoids repeated Math.min/max in every mousemove tick; origStartX/Y are stable revert targets
duration: ~15 minutes
completed: 2026-02-20
---

# Phase 94 Plan 01: Move Selection Tool Summary

**One-liner:** selectionMoveRef drag-to-move with Escape revert to origStartX/Y, arrow-key nudge (1/10-tile), and move/grabbing cursor affordance

## Objective

Add move-selection capability to the SELECT tool so users can reposition an existing selection marquee by clicking and dragging inside it. Also added arrow-key nudging for 1-tile (10-tile with Shift) repositioning. This is marquee-reposition only — no tiles are read or written during the drag.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | selectionMoveRef, isInsideSelection, mouse handler branching, drawUiLayer priority, Escape revert, cursor affordance | 46e192b |
| 2 | Arrow-key nudge useEffect (SLCT-01) with 1-tile/10-tile increment and boundary clamping | 46e192b |

## Implementation Details

### isInsideSelection helper (before component)
Pure function testing whether a tile coordinate falls within a selection bounding box (normalized to minX/minY/maxX/maxY).

### selectionMoveRef shape
```typescript
{
  active: boolean;
  origStartX, origStartY, origEndX, origEndY: number; // for Escape revert
  startX, startY, endX, endY: number;                  // live position (updated on mousemove)
  grabOffsetX, grabOffsetY: number;                     // cursor offset within selection on mousedown
}
```

### Mouse handler branching (handleMouseDown SELECT branch)
- If `selection.active && isInsideSelection(x, y, selection)`: starts move-drag, records normalized origStart/End + grabOffset
- Else: clears selection, starts new selectionDragRef drag (existing behavior)

### handleMouseMove
- selectionMoveRef branch runs BEFORE selectionDragRef branch
- Updates startX/Y/endX/Y with map-clamped position (`Math.max(0, Math.min(MAP_WIDTH-1-w, x-grabOffsetX))`)
- Cursor affordance: `grabbing` during active drag, `move` on hover inside committed selection

### handleMouseUp / handleMouseLeave
- Both commit `selectionMoveRef` final coords via `setSelection` and reset ref
- mouseLeave commits current position (per D94-01-1, not revert)

### drawUiLayer activeSelection ternary
```typescript
const activeSelection = selectionMoveRef.current.active
  ? selectionMoveRef.current
  : selectionDragRef.current.active
    ? selectionDragRef.current
    : selection.active ? selection : null;
```

### Escape cancellation (permanent keydown handler)
Inserted before existing `selectionDragRef.current.active` block — calls `setSelection` with origStart/End coords.

### Arrow-key nudge useEffect (SLCT-01)
- Active only when `selection.active && currentTool === ToolType.SELECT`
- Guards: input elements, active move drag
- Step: `e.shiftKey ? 10 : 1`
- Boundary clamping: `Math.max(0, Math.min(MAP_WIDTH-1-w, minX+dx))`
- Dependencies: `[selection, currentTool, setSelection]`

## Verification

- `npm run typecheck` passes with zero errors
- selectionMoveRef declared and wired in all 5 handlers (mouseDown, mouseMove, mouseUp, mouseLeave, Escape)
- isInsideSelection appears in 3 places (definition, mouseDown gate, cursor affordance)
- Arrow key handler has 3 instances (definition, add listener, remove listener)
- No tiles read or written during move-drag (marquee-only operation confirmed)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/components/MapCanvas/MapCanvas.tsx` modified (152 insertions)
- [x] Commit 46e192b exists
- [x] `npm run typecheck` passed (zero errors)

## Self-Check: PASSED
