---
phase: 77-warp-tool-expansion
plan: 01
subsystem: game-object-tools
tags: [warp, state-management, core-logic]
dependencies:
  requires: [72-9e-warp-routing]
  provides: [warp-type-state, parameterized-encoding, picker-all-warps]
  affects: [warp-tool, picker-tool]
tech-stack:
  added: []
  patterns: [indexed-variant-state]
key-files:
  created: []
  modified:
    - src/core/map/GameObjectData.ts
    - src/core/map/GameObjectSystem.ts
    - src/core/map/types.ts
    - src/core/editor/slices/globalSlice.ts
    - src/core/editor/slices/documentsSlice.ts
    - src/components/MapCanvas/MapCanvas.tsx
    - src/components/ToolBar/ToolBar.tsx
decisions: []
metrics:
  duration: "3 minutes"
  completed: 2026-02-16T08:14:41Z
  commits: 2
---

# Phase 77 Plan 01: Core Warp Type Logic Summary

**One-liner:** Replaced binary warp variant toggle (0/1) with indexed warp type selector (0-5) backed by WARP_STYLES array, parameterized encodeWarpTile to accept animId, and extended picker decoding to all 6 warp types.

## Overview

This plan established the core logic foundation for supporting all 6 warp types (F6, F7, F8, F9, FA, 9E) in the editor. Previously, the editor only supported 2 warp variants via a binary toggle: single 0xFA warp (variant 0) and 3x3 animated 0x9E warp (variant 1). This plan:

1. **Parameterized encoding:** Changed `encodeWarpTile()` from hardcoded 0xFA to accept `animId` parameter
2. **State model update:** Replaced binary `warpVariant` field with indexed `warpType` field (0-5)
3. **Dispatcher logic:** Updated placement dispatcher to map `warpType` index to `animId` via `WARP_STYLES[warpType]`
4. **Picker extension:** Extended picker decoding from 2 warp types (FA, 9E) to all 6 via `WARP_STYLES.includes(animId)`

**Key architectural decision:** Used `WARP_STYLES` array (already defined in GameObjectData.ts) as the single source of truth for the 6 warp types, mapping warpType index (0-5) directly to array position. This eliminates the need for separate constants or enums and ensures consistency across encoding, placement, and decoding.

## Tasks Completed

### Task 1: Parameterize encodeWarpTile and update state model

**Commit:** `f06ea0d` - feat(77-01): parameterize encodeWarpTile with animId and add warpType state

**Changes:**
- **GameObjectData.ts:** Changed `encodeWarpTile(_style, src, dest)` → `encodeWarpTile(animId, src, dest)`, replaced hardcoded `0xFA` with `animId` parameter
- **GameObjectSystem.ts:** Updated `placeWarp()` signature to accept `animId` instead of `style`, added validation `if (!WARP_STYLES.includes(animId))`, imported `WARP_STYLES`
- **types.ts (GameObjectToolState):** Added `warpType: number` field (0-5 index, default 4 for backward compat), kept `warpStyle` for signature compatibility
- **globalSlice.ts:** Added `setWarpType` action, updated initial state to `warpType: 4` (0xFA), modified `setWarpSettings` to sync `warpType` with `warpStyle`, removed `setWarpVariant` action

**Files modified:**
- `src/core/map/GameObjectData.ts` (line 122-125)
- `src/core/map/GameObjectSystem.ts` (lines 7-16, 100-110)
- `src/core/map/types.ts` (lines 130-145)
- `src/core/editor/slices/globalSlice.ts` (lines 110-124, 139-154, 267-306)

**Verification:** TypeScript errors appeared for `warpVariant` references (expected - fixed in Task 2)

### Task 2: Update dispatcher and picker for all 6 warp types

**Commit:** `f9c07b0` - feat(77-01): update dispatcher and picker for all 6 warp types

**Changes:**
- **documentsSlice.ts:** Imported `WARP_STYLES`, updated `placeGameObject` warp case to use `warpType` instead of `warpVariant`, mapped `warpType` to `animId` via `WARP_STYLES[warpType]`, added special case `if (warpType === 5)` for 0x9E animated warp
- **MapCanvas.tsx (picker):** Replaced `if (animId === 0xFA || animId === 0x9E)` with `if (WARP_STYLES.includes(animId))`, mapped `animId` back to `warpType` via `WARP_STYLES.indexOf(animId)`, added fallback `safeWarpType = warpType >= 0 ? warpType : 4`
- **MapCanvas.tsx (cursor preview):** Changed `warpVariant === 0` to `warpType !== 5`, changed `warpVariant === 1` to `warpType === 5`
- **MapCanvas.tsx (mouse handler):** Updated warp placement logic to use `warpType` instead of `warpVariant`
- **ToolBar.tsx:** Removed `setWarpVariant` hook, removed warp variant config from `variantConfigs` array (will be replaced with 6-type dropdown in Plan 02)

**Files modified:**
- `src/core/editor/slices/documentsSlice.ts` (lines 8-9, 826-848)
- `src/components/MapCanvas/MapCanvas.tsx` (lines 9-10, 431-449, 1758-1767, 2173-2186)
- `src/components/ToolBar/ToolBar.tsx` (lines 171-172, 303-311)

**Verification:** All `warpVariant` references removed, typecheck passes (only pre-existing unused variable warnings)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

1. ✅ `npm run typecheck` passes with zero type errors (only pre-existing unused variable warnings for `immediatePatchTile`, `e`, `dirty`)
2. ✅ `grep -r "warpVariant" src/` returns no results (fully replaced)
3. ✅ `grep -r "WARP_STYLES" src/` shows usage in 5 files: GameObjectData.ts (definition), GameObjectSystem.ts (validation), documentsSlice.ts (dispatch), MapCanvas.tsx (picker), types.ts (comments)
4. ✅ `grep "encodeWarpTile" src/` shows animId parameter in signature (GameObjectData.ts line 123) and call site (GameObjectSystem.ts line 108)

## Success Criteria

All success criteria achieved:

- ✅ encodeWarpTile accepts animId parameter (not hardcoded 0xFA)
- ✅ GameObjectToolState has warpType: number (0-5 index, default 4)
- ✅ setWarpType action exists in GlobalSlice
- ✅ setWarpVariant removed (replaced by setWarpType)
- ✅ placeGameObject uses WARP_STYLES[warpType] for animId
- ✅ Picker decodes all 6 warp animation IDs and syncs warpType
- ✅ All warpVariant references removed from codebase
- ✅ TypeScript compiles cleanly

## Key Technical Details

### WARP_STYLES Array Mapping

```typescript
// GameObjectData.ts line 119
export const WARP_STYLES: number[] = [0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E];

// warpType index → animId mapping:
// 0 → 0xF6 (purple warp)
// 1 → 0xF7 (green warp)
// 2 → 0xF8 (yellow warp)
// 3 → 0xF9 (blue warp)
// 4 → 0xFA (red warp, default)
// 5 → 0x9E (animated 3x3 warp)
```

### Encoding Logic Flow

```
User selects warpType (0-5) → stored in GlobalSlice.gameObjectToolState.warpType
↓
User clicks map → placeGameObject called
↓
Dispatcher reads warpType, maps to animId via WARP_STYLES[warpType]
↓
If warpType === 5 → placeAnimatedWarp() (3x3 block)
Else → placeWarp(animId, src, dest) → encodeWarpTile(animId, src, dest)
↓
Tile encoded: animId | 0x8000 | (((dest * 10) + src) << 8)
```

### Picker Decode Flow

```
User clicks warp tile with picker → pickedTile read
↓
Extract animId: getAnimationId(pickedTile)
↓
Check if WARP_STYLES.includes(animId) → YES (all 6 warp types)
↓
Extract routing: warpSrc = offset % 10, warpDest = floor(offset / 10)
↓
Map animId → warpType: WARP_STYLES.indexOf(animId) → 0-5 index
↓
Update state: setWarpSettings(warpSrc, warpDest, warpType)
```

## Backward Compatibility

**Default warpType:** Set to 4 (0xFA) to maintain backward compatibility with existing workflow where 0xFA was the default single warp type.

**State structure:** Kept `warpStyle` field in GameObjectToolState alongside `warpType` to maintain signature compatibility with `setWarpSettings(src, dest, style)`. Both fields are synced by the setter.

**Migration:** No migration needed - `warpVariant` was never persisted (always reset to 0 on session start), so replacing it with `warpType: 4` is a safe upgrade.

## Next Steps

**Plan 02 (UI dropdown):** Will add 6-variant dropdown to ToolBar with tile image previews, replacing the commented-out warp variant config. This plan provided the core logic foundation; Plan 02 provides the UI.

**Testing recommendations for Plan 02:**
1. Place each warp type (0-5), verify correct animId in tile value
2. Pick each warp type, verify dropdown selects correct variant
3. Test routing round-trip: place F6 warp with src=2 dest=7, pick it, verify values restored
4. Test animated warp (type 5) still places 3x3 block with routing in center tile

## Self-Check

✅ **PASSED**

**Created files:** None (all modifications to existing files)

**Modified files verified:**
```bash
[ -f "E:/NewMapEditor/src/core/map/GameObjectData.ts" ] && echo "FOUND: GameObjectData.ts" || echo "MISSING"
[ -f "E:/NewMapEditor/src/core/map/GameObjectSystem.ts" ] && echo "FOUND: GameObjectSystem.ts" || echo "MISSING"
[ -f "E:/NewMapEditor/src/core/map/types.ts" ] && echo "FOUND: types.ts" || echo "MISSING"
[ -f "E:/NewMapEditor/src/core/editor/slices/globalSlice.ts" ] && echo "FOUND: globalSlice.ts" || echo "MISSING"
[ -f "E:/NewMapEditor/src/core/editor/slices/documentsSlice.ts" ] && echo "FOUND: documentsSlice.ts" || echo "MISSING"
[ -f "E:/NewMapEditor/src/components/MapCanvas/MapCanvas.tsx" ] && echo "FOUND: MapCanvas.tsx" || echo "MISSING"
[ -f "E:/NewMapEditor/src/components/ToolBar/ToolBar.tsx" ] && echo "FOUND: ToolBar.tsx" || echo "MISSING"
```

**All files:** FOUND

**Commits verified:**
```bash
git log --oneline | grep -q "f9c07b0" && echo "FOUND: f9c07b0" || echo "MISSING: f9c07b0"
git log --oneline | grep -q "f06ea0d" && echo "FOUND: f06ea0d" || echo "MISSING: f06ea0d"
```

**Both commits:** FOUND

## Metrics

- **Duration:** 3 minutes (2026-02-16T08:11:48Z to 2026-02-16T08:14:41Z)
- **Commits:** 2
- **Files modified:** 7
- **Lines changed:** ~40 (17 in Task 1, 17 insertions + 24 deletions in Task 2)
- **Type errors introduced:** 0
- **Breaking changes:** 0 (backward compatible via default warpType: 4)
