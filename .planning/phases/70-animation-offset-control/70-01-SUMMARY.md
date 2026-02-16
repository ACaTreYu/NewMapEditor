---
phase: 70-animation-offset-control
plan: 01
subsystem: animation-offset-control
status: complete
tags: [animation, offset, state-management, ui-control]
dependency_graph:
  requires: []
  provides:
    - animation-offset-control
    - offset-state-persistence
  affects:
    - AnimationPanel
    - GlobalSlice
    - GameObjectSystem
    - documentsSlice
tech_stack:
  added: []
  patterns:
    - Global state for shared offset value
    - Input validation with error feedback
    - Clamped state setter (0-127 range)
key_files:
  created: []
  modified:
    - src/core/editor/slices/globalSlice.ts
    - src/components/AnimationPanel/AnimationPanel.tsx
    - src/components/AnimationPanel/AnimationPanel.css
    - src/core/map/GameObjectSystem.ts
    - src/core/editor/slices/documentsSlice.ts
decisions: []
metrics:
  duration_minutes: 3.5
  completed_date: 2026-02-15
---

# Phase 70 Plan 01: Animation Offset State & Control Summary

**One-liner:** Animation offset input (0-127) in GlobalSlice with AnimationPanel UI control and GameObjectSystem encoding for placed animated spawn/warp tiles.

## Execution Summary

All tasks completed successfully. Added `animationOffsetInput` state to GlobalSlice, wired AnimationPanel to use global state instead of local state, parameterized GameObjectSystem placement methods with offset, and connected documentsSlice to pass offset from GlobalSlice to animated tile placement.

**Plan adherence:** Executed exactly as written. No deviations required.

**Requirements coverage:**
- OFST-01: User can set animation offset (0-127) in AnimationPanel input
- OFST-02: Placed animated spawn/warp tiles encode the offset value
- OFST-03: Offset persists between placements via GlobalSlice state
- FDBK-01: StatusBar already shows "Anim: XX Offset: Y" (pre-existing)
- FDBK-02: Offset input shows error border for out-of-range values

## Tasks Completed

### Task 1: Add animationOffsetInput to GlobalSlice and wire AnimationPanel
**Commit:** 03e2894
**Files:** globalSlice.ts, AnimationPanel.tsx, AnimationPanel.css

- Added `animationOffsetInput: number` field to GlobalSlice interface (after customDatLoaded)
- Added `setAnimationOffsetInput: (offset: number) => void` action to interface
- Implemented action with automatic clamping: `Math.max(0, Math.min(127, offset))`
- Removed AnimationPanel local `frameOffset` state
- Added Zustand subscriptions for `animationOffsetInput` and `setAnimationOffsetInput`
- Replaced all `frameOffset` references (4 occurrences) with `animationOffsetInput`
- Added `offsetError` local state for validation feedback
- Updated `handleOffsetChange` to validate input and set error state
- Added error CSS class to offset input: `className={\`offset-input ${offsetError ? 'error' : ''}\`}`
- Added `.offset-input.error` CSS rule with red border and tinted background

**Verification:**
- TypeScript compiles with zero errors related to changes
- `animationOffsetInput` appears in globalSlice.ts interface and implementation
- `frameOffset` does NOT appear anywhere in AnimationPanel.tsx (fully replaced)
- Error state displays for invalid input (< 0, > 127, or non-numeric)

### Task 2: Parameterize GameObjectSystem and wire documentsSlice callers
**Commit:** 055e2a6
**Files:** GameObjectSystem.ts, documentsSlice.ts

- Added `import { makeAnimatedTile } from './TileEncoding'` to GameObjectSystem.ts
- Modified `placeAnimatedSpawn` signature to accept `offset: number = 0` parameter
- Replaced manual bit encoding `0x8000 | animId` with `makeAnimatedTile(animId, offset)`
- Modified `placeAnimatedWarp` signature to accept `offset: number = 0` parameter
- Applied offset to all animated tiles in warp pattern:
  ```typescript
  const patternWithOffset = ANIMATED_WARP_PATTERN.map(tile =>
    (tile & 0x8000) ? makeAnimatedTile(tile & 0xFF, offset) : tile
  );
  ```
- Read `animationOffsetInput` from GlobalSlice in `placeGameObjectForDocument`
- Passed offset to `placeAnimatedWarp(doc.map, x, y, animationOffsetInput)` (variant 1 only)
- Passed offset to `placeAnimatedSpawn(doc.map, x, y, selectedTeam, animationOffsetInput)` (variant 1 only)
- Static spawn/warp variants unchanged (no offset parameter)

**Verification:**
- TypeScript compiles with zero errors related to changes
- `makeAnimatedTile` is imported and used correctly in GameObjectSystem.ts
- `animationOffsetInput` is read from `get()` in documentsSlice.ts
- Offset passed only to animated variants (spawnVariant === 1, warpVariant === 1)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

**State architecture:**
- GlobalSlice stores `animationOffsetInput` (shared across all documents)
- Clamping enforced at setter level (0-127 range)
- AnimationPanel reads/writes via Zustand subscriptions
- documentsSlice reads from GlobalSlice when placing tiles

**Encoding flow:**
1. User sets offset in AnimationPanel input
2. Value clamped and stored in GlobalSlice via `setAnimationOffsetInput`
3. When placing animated spawn/warp, documentsSlice reads `animationOffsetInput`
4. Offset passed to `placeAnimatedSpawn` or `placeAnimatedWarp`
5. GameObjectSystem uses `makeAnimatedTile(animId, offset)` to encode tile value
6. Tile value: `0x8000 | (offset << 8) | animId` (bit 15 = animated, bits 14-8 = offset, bits 7-0 = anim ID)

**Error handling:**
- Empty input → error state, no store update
- Non-numeric input → error state, no store update
- Out of range (< 0 or > 127) → error state, no store update
- Valid input → clear error state, update store, clamp at setter level
- Error state visualized with red border and tinted background

## Verification Results

All verification criteria passed:

1. `npm run typecheck` passes with zero errors related to plan changes (only pre-existing unused variable warnings in MapCanvas.tsx and CanvasEngine.ts)
2. AnimationPanel offset input reads from GlobalSlice `animationOffsetInput` (not local state)
3. Changing offset value in AnimationPanel updates GlobalSlice state
4. Placing animated spawn encodes offset into tile value via `makeAnimatedTile(animId, offset)`
5. Placing animated warp encodes offset into all 9 pattern tiles via map function
6. Static spawn/warp placement is not affected by offset value (no offset parameter passed)
7. StatusBar already shows "Anim: XX Offset: Y" for animated tiles (FDBK-01 pre-existing from v3.2)
8. Offset input shows error border for out-of-range values (FDBK-02 implemented)

## Success Criteria

All criteria met:

- [x] Zero TypeScript errors related to plan changes
- [x] `animationOffsetInput` field exists in GlobalSlice with clamp action
- [x] AnimationPanel uses GlobalSlice state (no local `frameOffset`)
- [x] GameObjectSystem `placeAnimatedSpawn` and `placeAnimatedWarp` accept offset parameter
- [x] documentsSlice passes `animationOffsetInput` to animated placement methods
- [x] Offset input has error CSS class for invalid values
- [x] Requirements covered: OFST-01, OFST-02, OFST-03, FDBK-01, FDBK-02

## Self-Check

Verifying all claimed files and commits exist:

### Files Created
None claimed.

### Files Modified

Checking modified files exist:
- [x] src/core/editor/slices/globalSlice.ts (exists, modified)
- [x] src/components/AnimationPanel/AnimationPanel.tsx (exists, modified)
- [x] src/components/AnimationPanel/AnimationPanel.css (exists, modified)
- [x] src/core/map/GameObjectSystem.ts (exists, modified)
- [x] src/core/editor/slices/documentsSlice.ts (exists, modified)

### Commits

Checking commits exist:
- [x] 03e2894 - Task 1: animationOffsetInput to GlobalSlice and AnimationPanel wiring
- [x] 055e2a6 - Task 2: GameObjectSystem parameterization and documentsSlice wiring

## Self-Check: PASSED

All files modified as claimed. All commits exist in git history. All verification criteria met.

## Next Steps

Plan 02 (70-02-PLAN.md) will implement the Picker tool enhancement to extract offset from animated tiles and populate the AnimationPanel input, completing the round-trip editing workflow.
