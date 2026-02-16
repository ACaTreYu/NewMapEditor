---
phase: 69-conveyor-fix-farplane-toggle
plan: 01
subsystem: game-objects, rendering, ui
tags: [animation, farplane, toolbar, localStorage]
completed: 2026-02-16T00:57:41Z
duration: 156s

dependencies:
  requires:
    - AnimationDefinitions.ts (0x94-0x99 downward conveyor animation sequences)
    - CanvasEngine.ts (renderTile method and subscription system)
    - GlobalSlice.ts (showGrid pattern for localStorage-persisted toggles)
  provides:
    - Animated downward conveyors (CONV_DOWN_DATA with 0x8000 encoding)
    - Farplane toggle state (showFarplane boolean in GlobalSlice)
    - Farplane toggle button (toolbar UI with LuEye/LuEyeOff icons)
  affects:
    - GameObjectData.ts (CONV_DOWN_DATA array encoding)
    - CanvasEngine.ts (renderTile conditional for tile 280, subscription 4)
    - ToolBar.tsx (farplane toggle button placement)

tech_stack:
  added: []
  patterns:
    - "Animated tile encoding: 0x8000 | animId for game object animation data"
    - "Full buffer rebuild pattern: clear prevTiles, trigger drawMapLayer on toggle change"
    - "LocalStorage toggle persistence: load on init, save on toggle action"

key_files:
  created: []
  modified:
    - path: src/core/map/GameObjectData.ts
      lines: 97-106
      summary: "Replace static tile IDs with animated encoding (0x8000 | 0x94-0x99) for downward conveyor animation"
    - path: src/core/editor/slices/globalSlice.ts
      lines: 39, 92, 155, 209-213
      summary: "Add showFarplane boolean state with toggleFarplane action and localStorage persistence"
    - path: src/core/canvas/CanvasEngine.ts
      lines: 147-154, 156-160, 458-469
      summary: "Conditionally render tile 280 as black when showFarplane enabled, add subscription for full rebuild on toggle"
    - path: src/components/ToolBar/ToolBar.tsx
      lines: 20, 119-127, 151, 712-718
      summary: "Add farplane toggle button with LuEye/LuEyeOff icons between grid settings and map settings"

decisions: []
---

# Phase 69 Plan 01: Conveyor Fix & Farplane Toggle Summary

**One-liner:** Fixed downward conveyor animation encoding and added farplane background toggle with toolbar button and localStorage persistence

## What Was Built

Completed two independent features for v3.2 milestone:

1. **Downward Conveyor Animation Fix** - Replaced static tile IDs in `CONV_DOWN_DATA` with animated tile encoding (`0x8000 | 0x94` through `0x8000 | 0x99`) to match the animation definitions. This ensures downward conveyors animate through 8 frames at speed 2, matching the behavior of horizontal conveyors.

2. **Farplane Toggle Feature** - Added a global toggle to show/hide the farplane background (black color for tile 280/DEFAULT_TILE). Includes:
   - `showFarplane` boolean state in GlobalSlice with localStorage persistence (defaults to false)
   - `toggleFarplane` action following the showGrid pattern
   - Conditional rendering in CanvasEngine.renderTile() for both tileset-loaded and no-tileset paths
   - Full buffer rebuild subscription when toggle changes
   - Toolbar button with LuEye/LuEyeOff icons placed between grid settings and map settings

## Task Breakdown

| Task | Description                                         | Commit  | Files Modified                                                                          |
| ---- | --------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| 1    | Fix downward conveyor animation data                | 04fdfa2 | src/core/map/GameObjectData.ts                                                          |
| 2    | Add farplane toggle with toolbar button and session | 16f6897 | src/core/editor/slices/globalSlice.ts, src/core/canvas/CanvasEngine.ts, ToolBar.tsx    |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Conveyor Animation Fix

The issue was that `CONV_DOWN_DATA` used static tile IDs like `1581, 1582, ...` instead of animated tile encoding. The fix:

```typescript
export const CONV_DOWN_DATA: number[] = [
  0x8000 | 0x94,  // Top-left (anim 0x94)
  0x8000 | 0x95,  // Top-right (anim 0x95)
  0x8000 | 0x96,  // Middle-left (anim 0x96)
  0x8000 | 0x97,  // Middle-right (anim 0x97)
  0x8000 | 0x96,  // Middle-left repeat (anim 0x96)
  0x8000 | 0x97,  // Middle-right repeat (anim 0x97)
  0x8000 | 0x98,  // Bottom-left (anim 0x98)
  0x8000 | 0x99,  // Bottom-right (anim 0x99)
];
```

The 8-entry layout matches the placeConveyor() logic which uses `data[(k % 2 + 1) * 2 + hh % 2]` for interior rows, alternating between entries 2-3 and 4-5 (hence the middle-left/middle-right repeat).

### Farplane Rendering

The farplane toggle changes how tile 280 (DEFAULT_TILE/space) is rendered:
- **Off (default):** Tile 280 renders as gray `#b0b0b0` or from tileset texture
- **On:** Tile 280 renders as black `#000000` (farplane background color)

The implementation handles both rendering paths in CanvasEngine.renderTile():
1. When tileset is loaded: check if tile === 280 && showFarplane before drawing from tileset
2. When tileset is NOT loaded: check showFarplane in fallback color selection

### Full Buffer Rebuild Pattern

When `showFarplane` toggles, every tile 280 on the map needs to change color. This requires a full buffer rebuild:

```typescript
const unsubFarplane = useEditorStore.subscribe((state, prevState) => {
  if (state.showFarplane !== prevState.showFarplane) {
    this.prevTiles = null; // Force full rebuild
    // ... trigger drawMapLayer
  }
});
```

Clearing `prevTiles` causes the next `drawMapLayer` call to perform a full rebuild instead of incremental patching.

## Verification Results

- [x] TypeScript compilation successful (zero new errors)
- [x] CONV_DOWN_DATA uses animated encoding (0x8000 | 0x94 through 0x8000 | 0x99)
- [x] globalSlice.ts exports showFarplane and toggleFarplane with localStorage persistence
- [x] CanvasEngine.ts conditionally renders tile 280 as black when showFarplane enabled (both tileset paths)
- [x] CanvasEngine.ts has subscription to rebuild buffer when showFarplane changes
- [x] ToolBar.tsx imports LuEye/LuEyeOff, extracts showFarplane/toggleFarplane, renders toggle button

## Self-Check: PASSED

**Files created/modified verification:**

- [x] src/core/map/GameObjectData.ts (modified, lines 97-106)
- [x] src/core/editor/slices/globalSlice.ts (modified, showFarplane state added)
- [x] src/core/canvas/CanvasEngine.ts (modified, farplane rendering added)
- [x] src/components/ToolBar/ToolBar.tsx (modified, toggle button added)

**Commit verification:**

- [x] 04fdfa2 (Task 1: Fix downward conveyor animation encoding)
- [x] 16f6897 (Task 2: Add farplane toggle with toolbar button and session persistence)

All claimed files exist, all commits are present in git history.
