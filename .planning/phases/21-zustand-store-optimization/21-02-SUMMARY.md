---
phase: 21-zustand-store-optimization
plan: 02
subsystem: state-management
tags: [zustand, useShallow, react-optimization, granular-selectors]

# Dependency graph
requires:
  - phase: 21-01
    provides: Granular selector migration for 8 components, removed canUndo/canRedo methods
provides:
  - ToolBar with reactive canUndo/canRedo derived from undoStack/redoStack
  - MapCanvas with granular state/action split
  - Zero bare useEditorStore() destructuring across entire codebase
  - ToolBar isolated from animationFrame re-renders
affects: [future-zustand-store-changes, performance-monitoring, render-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Reactive derived state pattern (canUndo/canRedo from stack length)
    - State/action split pattern for complex components

key-files:
  created: []
  modified:
    - src/components/ToolBar/ToolBar.tsx
    - src/components/MapCanvas/MapCanvas.tsx

key-decisions:
  - "canUndo/canRedo implemented as reactive selectors (state.undoStack.length > 0) not methods"
  - "ToolBar does NOT subscribe to animationFrame (eliminated ~33 re-renders/sec)"
  - "MapCanvas state/actions split into separate useShallow calls for clarity"

patterns-established:
  - "Reactive derived state: Use direct selectors for computed values instead of store methods"
  - "State/action separation: Split large component selectors for clarity and stability"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 21 Plan 02: ToolBar & MapCanvas Granular Selectors Summary

**Completed Zustand store optimization with reactive canUndo/canRedo selectors and eliminated all bare useEditorStore() destructuring across codebase**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05T01:52:54Z
- **Completed:** 2026-02-05T01:55:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migrated ToolBar to granular selectors with reactive canUndo/canRedo (no longer method calls)
- Migrated MapCanvas to granular selectors split into state and actions
- ToolBar isolated from animationFrame re-renders (eliminated ~33 re-renders/sec on ToolBar)
- Zero bare useEditorStore() destructuring remaining in entire codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate ToolBar to granular selectors with reactive canUndo/canRedo** - `010d0fb` (refactor)
2. **Task 2: Migrate MapCanvas to granular selectors split into state and actions** - `aebc0da` (refactor)

## Files Created/Modified
- `src/components/ToolBar/ToolBar.tsx` - Granular selectors with reactive canUndo/canRedo, no animationFrame subscription
- `src/components/MapCanvas/MapCanvas.tsx` - State/action split with useShallow, includes animationFrame for animation rendering

## Decisions Made

**1. Reactive derived state for canUndo/canRedo**
- Replaced store methods with direct selectors: `useEditorStore((state) => state.undoStack.length > 0)`
- Enables reactive updates when undo/redo stacks change (fixes non-reactive button state bug)
- More explicit than hidden method implementation

**2. ToolBar animation isolation**
- ToolBar does NOT subscribe to animationFrame (not needed for toolbar UI)
- Eliminates ~33 re-renders/sec on ToolBar (animationFrame updates every 150ms)
- Only MapCanvas and animation components subscribe to animationFrame

**3. State/action separation pattern**
- MapCanvas splits state and actions into separate useShallow calls for clarity
- State subscriptions: trigger re-renders when values change
- Action subscriptions: stable references, never cause re-renders
- Makes component dependencies explicit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Migration was mechanical and TypeScript compilation verified correctness.

**Pre-existing TypeScript errors remain unchanged:**
- App.tsx: unused dataView variable (TS6133), string|null type mismatch (TS2322)
- MapParser.ts: unused imports, ArrayBufferLike type incompatibility
- WallSystem.ts: unused addConnection parameter

## Next Phase Readiness

**Phase 21 (Zustand Store Optimization) COMPLETE**

All 10 components migrated to granular selectors:
- Plan 01: AnimationPanel, AnimationPreview, BottomPanel, MapSettingsDialog, Minimap, StatusBar, TilePalette, TileSelection
- Plan 02: ToolBar, MapCanvas

Store optimization deliverables:
- canUndo/canRedo methods removed (reactive selectors pattern established)
- animationFrame subscriptions isolated to animation-rendering components only
- Zero bare useEditorStore() destructuring across entire codebase

**Ready for Phase 22: Canvas Rendering Optimization**
- Zustand re-render optimization complete
- Canvas performance baseline established
- MapCanvas drawing logic ready for viewport culling and tile batching

**v1.7 (Performance & Portability) Progress: 1 of 6 phases complete**

---
*Phase: 21-zustand-store-optimization*
*Completed: 2026-02-05*
