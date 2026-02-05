---
phase: 16-marquee-selection-foundation
plan: 01
subsystem: canvas
tags: [selection, marquee, marching-ants, keyboard, ux]

requires:
  - phase: 15-conveyor-tool
    provides: Complete game object tools with variant dropdowns
provides:
  - SELECT tool marquee drag-to-select functionality
  - Marching ants animated selection border
  - Escape key cancellation for selection
  - Zoom-accurate selection coordinates (0.25x-4x)
affects:
  - phase: 17-clipboard-operations
    needs: Active selection state for copy/cut operations
  - phase: 18-floating-paste-preview
    needs: Selection bounds for paste positioning
  - phase: 19-mirror-rotate-transforms
    needs: Selection region for transform operations

tech-stack:
  added: []
  patterns:
    - Marching ants animation via lineDashOffset and animationFrame
    - Dual-state selection (local drag + committed Zustand)
    - Escape key cancellation pattern

key-files:
  created: []
  modified:
    - src/components/MapCanvas/MapCanvas.tsx

key-decisions:
  - "Selection stored as integer tile coordinates (not pixels) for zoom accuracy"
  - "Dual-state: selectionDrag (local) during drag, selection (Zustand) after commit"
  - "Marching ants use existing animationFrame counter (zero overhead)"
  - "Only create committed selection if user drags (not single click)"

duration: 2min
completed: 2026-02-05
---

# Phase 16 Plan 01: Marquee Selection Foundation Summary

**SELECT tool creates animated marching ants selection via drag-to-select — press V, drag rectangle, see alternating black/white dashed border**

## Performance

- **Duration:** 2 min
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- SELECT tool (V shortcut) enables drag-to-select functionality on map canvas
- Drag creates rectangular selection with normalized tile coordinates (min/max)
- Marching ants border renders with animated alternating black/white dashes
- Animation driven by existing animationFrame counter (no additional RAF loop)
- Selection coordinates accurate at all zoom levels (0.25x, 0.5x, 1x, 2x, 4x)
- Escape key clears selection at any time (during drag or after commit)
- Selection persists across tool switches (stored in Zustand, not local state)
- Single clicks don't create selection (only actual drags)
- Mouse leave during drag cancels the drag
- Dual-state selection: selectionDrag (local) for live preview, selection (Zustand) for committed

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: Implement SELECT tool with marching ants animation** - `98f1891` (feat)

## Files Created/Modified
- `src/components/MapCanvas/MapCanvas.tsx` - Added selectionDrag state, mouse handlers for SELECT tool, marching ants rendering, Escape handlers

## Decisions Made
- Selection stored as tile coordinates (integers) not pixel coordinates for zoom accuracy
- selectionDrag state mirrors rectDragState pattern (active, startX, startY, endX, endY)
- Marching ants use dual stroke: black (#000) at dashOffset, white (#fff) at dashOffset+6 for alternating pattern
- dashOffset = -(animationFrame * 0.5) % 12 for smooth animation
- Only commit to Zustand store on mouseup if user actually dragged (minX !== maxX || minY !== maxY)
- Exclude SELECT from continuous drawing in mousemove (added to tool exclusion list)
- Separate Escape handlers for selectionDrag (local) and selection (committed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in App.tsx, MapParser.ts, WallSystem.ts (unrelated to this change)
- All SELECT tool specific code has no TypeScript errors

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Active selection state ready for clipboard operations (copy/cut/delete)
- Selection bounds available for floating paste preview positioning
- Selection region can be used for mirror/rotate transforms
- Marching ants provide clear visual feedback for selected region
- Ready for Phase 17: Clipboard Operations

---
*Phase: 16-marquee-selection-foundation*
*Completed: 2026-02-05*
