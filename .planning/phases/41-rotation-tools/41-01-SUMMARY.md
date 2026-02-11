---
phase: 41-rotation-tools
plan: 01
subsystem: selection-transforms
tags: [rotation, selection, transforms, ui, zustand, canvas]

requires:
  - phase: 16-select-tool
    provides: marquee selection system
  - phase: 25-undo-refactor
    provides: delta-based undo system
  - phase: 14-02
    provides: variant dropdown UI pattern

provides:
  - In-place rotation of selected map tiles
  - 4 rotation operations (90° CW, 90° CCW, 180°, -180°)
  - Selection bounds auto-resize for rotated dimensions
  - ROTATE toolbar button with variant dropdown
  - Pure rotation algorithms in portable core layer

affects: [42-mirror-tools]

tech-stack:
  added: []
  patterns:
    - Transpose+reverse algorithm for 90° rotations
    - In-place transform pattern (extract → transform → clear → write → update bounds)
    - Action button with variant dropdown (executes immediately, no mode change)

key-files:
  created:
    - src/core/map/SelectionTransforms.ts
    - public/assets/toolbar/rotate.svg
  modified:
    - src/core/map/types.ts
    - src/core/map/index.ts
    - src/core/editor/slices/documentsSlice.ts
    - src/components/ToolBar/ToolBar.tsx

key-decisions:
  - "Used transpose+reverse pattern for 90° rotations (mathematically correct and efficient)"
  - "Implemented -180° as alias for 180° (mathematically identical)"
  - "Action button pattern: ROTATE doesn't change current tool, only executes action"
  - "Variant dropdown opens on click, variants disabled when no selection or paste mode"

patterns-established:
  - "In-place selection transform: extract selection → apply algorithm → clear original → write back → update bounds"
  - "Action button with variants: doesn't set mode, executes immediately via setter function"
  - "Out-of-bounds clipping: rotated tiles near map edges silently discarded"

duration: 5min
completed: 2026-02-11
---

# Phase 41 Plan 01: Rotation Tools Summary

**Implemented in-place rotation of selected map tiles with 4 rotation options (90°, -90°, 180°, -180°) via toolbar button with variant dropdown.**

## Performance
- **Duration:** 5 minutes
- **Started:** 2026-02-11T05:46:57Z
- **Completed:** 2026-02-11T05:51:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created SelectionTransforms.ts with pure rotation algorithms using transpose+reverse pattern
- Implemented rotateSelectionForDocument action with full undo/redo support
- Added ROTATE toolbar button with 4-variant dropdown (90° CW, 90° CCW, 180°, -180°)
- Selection bounds automatically resize to fit rotated dimensions (e.g., 3x5 → 5x3 for 90°)
- Out-of-bounds tiles near map edges are silently clipped (no crashes)
- Rotation preserves 16-bit tile encoding including animation flags (bit 15)

## Task Commits
1. **Task 1: Create SelectionTransforms with rotation algorithms and ROTATE tool enum** - `dcf25f8` (feat)
   - Added SelectionTransforms.ts with 4 rotation functions
   - rotate90Clockwise: transpose then reverse rows
   - rotate90CounterClockwise: transpose then reverse columns
   - rotate180: simple array reversal
   - rotate dispatcher for all 4 angles
   - Added ROTATE to ToolType enum
   - Exported from barrel file

2. **Task 2: Add rotateSelectionForDocument action and ROTATE toolbar button** - `9316a3b` (feat)
   - Implemented in-place rotation: extract → rotate → clear → write → update bounds
   - Added undo/redo via pushUndo/commitUndo pattern
   - Created ROTATE toolbar button with variant dropdown
   - Action button pattern: executes immediately without changing current tool
   - Variants disabled when no selection active or paste mode
   - Created rotate.svg icon

## Files Created/Modified

**Created:**
- `src/core/map/SelectionTransforms.ts` - Pure rotation algorithms (rotate90Clockwise, rotate90CounterClockwise, rotate180, rotate dispatcher)
- `public/assets/toolbar/rotate.svg` - Circular arrow icon for rotation button

**Modified:**
- `src/core/map/types.ts` - Added ROTATE = 'rotate' to ToolType enum
- `src/core/map/index.ts` - Exported SelectionTransforms from barrel file
- `src/core/editor/slices/documentsSlice.ts` - Added rotateSelectionForDocument action with in-place rotation logic
- `src/components/ToolBar/ToolBar.tsx` - Added ROTATE button with 4-variant dropdown, action button handling

## Decisions Made

### Rotation Algorithms
- **90° Clockwise:** Transpose then reverse rows (mathematically correct)
- **90° Counter-Clockwise:** Transpose then reverse columns
- **180°:** Simple array reversal (most efficient)
- **-180°:** Alias for 180° (mathematically identical)

### UI Pattern
- **Action button:** ROTATE doesn't change current tool, only executes action via variant dropdown
- **Variant dropdown:** Opens on click, lists 4 rotation angles
- **Disabled states:** Variants no-op when no selection active or paste mode (isPasting=true)
- **No "active" state:** Action tools never show as active (no mode change)

### Selection Bounds Handling
- **Dimension swap:** 90° rotations swap width↔height (3x5 becomes 5x3)
- **180° unchanged:** Dimensions remain the same
- **Out-of-bounds clipping:** Rotated tiles near map edges silently discarded (no crashes)
- **Anchor point:** Rotation anchored at top-left (minX, minY) of original selection

### Undo/Redo Integration
- **Delta-based undo:** Uses existing pushUndo/commitUndo pattern
- **Description:** "Rotate {angle}°" appears in undo history
- **Snapshot timing:** Snapshot taken before clearing original area

## Deviations from Plan

None - plan executed exactly as written. All algorithms, UI patterns, and integration points followed the plan specification.

## Issues Encountered

None. TypeScript compilation passed, app started without errors, all verification criteria met.

## User Setup Required

None - no external service configuration required. Rotation feature works immediately after loading a map and creating a selection.

## Next Phase Readiness

**Ready for Phase 42 (Mirror Tools):**
- SelectionTransforms module established - can add mirror algorithms alongside rotation
- In-place transform pattern proven - mirror will use similar extract → transform → write pattern
- Action button pattern working - mirror button will follow same variant dropdown approach
- Undo/redo integration confirmed - mirror will use same delta-based undo system

**Key difference for mirror:** Mirror is ADJACENT COPY (not in-place flip). Original selection stays, mirrored duplicate placed next to it. Affected area EXPANDS.
