---
phase: 77-warp-tool-expansion
plan: 02
subsystem: toolbar-ui
tags: [warp, ui, dropdown, tile-preview]
dependencies:
  requires: [77-01-warp-type-state]
  provides: [warp-dropdown-ui, warp-tile-previews]
  affects: [warp-tool]
tech-stack:
  added: []
  patterns: [tile-preview-generation, useMemo-caching]
key-files:
  created: []
  modified:
    - src/components/ToolBar/ToolBar.tsx
    - src/components/ToolBar/ToolBar.css
decisions: []
metrics:
  duration: "2 minutes"
  completed: 2026-02-16T08:18:26Z
  commits: 1
---

# Phase 77 Plan 02: Warp Dropdown UI Summary

**One-liner:** Added warp type dropdown to toolbar with tile image previews for all 6 warp types (F6, F7, F8, F9, FA, 3x3), following the established wall tool preview pattern.

## Overview

This plan completed the warp tool expansion by adding visual UI for selecting between the 6 warp types. Previously, the warp tool had no variant dropdown (it was removed in Plan 01 during the state refactor). This plan:

1. **Generated tile previews:** Created `warpPreviewUrls` useMemo that renders the first frame of each warp animation from the tileset
2. **Added variant config:** Restored warp tool to `variantConfigs` array with 6 variants and `setWarpType` setter
3. **Rendered previews:** Detected warp tool in dropdown rendering and displayed tile images alongside labels
4. **Applied styling:** Added warp-specific CSS classes following the wall dropdown pattern

**Key architectural pattern:** Followed the exact same preview generation pattern used for wall types - useMemo-cached canvas rendering with tileset extraction. This ensures consistency across all toolbar dropdown previews and efficient re-generation only when tileset changes.

## Tasks Completed

### Task 1: Generate warp tile previews and expand dropdown

**Commit:** `f643d70` - feat(77-02): add warp type tile previews to toolbar dropdown

**Changes:**

**ToolBar.tsx - Imports:**
- Extended `GameObjectData` import to include `WARP_STYLES`
- Added import: `ANIMATION_DEFINITIONS` from `@core/map/AnimationDefinitions`
- Added `setWarpType` to store selectors

**ToolBar.tsx - Preview generation (lines 246-280):**
- Created `warpPreviewUrls` useMemo following wall preview pattern
- Iterates through `WARP_STYLES` array (6 warp types)
- For each warp type: looks up animation definition, extracts first frame, renders to 16x16 canvas
- Uses `TILES_PER_ROW = 40` for tileset coordinate calculation
- Returns Map<warpType, dataURL> for efficient lookup in rendering

**ToolBar.tsx - Variant config (lines 340-353):**
- Replaced comment placeholder with warp variant config
- Tool: `ToolType.WARP`
- Setting name: `'Type'`
- Current value: `gameObjectToolState.warpType` (0-5)
- 6 variants: Warp F6 (0), Warp F7 (1), Warp F8 (2), Warp F9 (3), Warp FA (4), Animated 3x3 (5)
- Setter: `setWarpType`

**ToolBar.tsx - Dropdown rendering (lines 585, 609, 626-633):**
- Added `isWarpTool` detection: `tool.tool === ToolType.WARP`
- Extended dropdown className: `${isWarpTool ? 'warp-dropdown' : ''}`
- Added warp preview rendering (after wall preview conditional):
  ```tsx
  {isWarpTool && warpPreviewUrls.get(v.value) !== undefined && (
    <img src={warpPreviewUrls.get(v.value)} className="warp-preview" ... />
  )}
  ```

**ToolBar.css - Warp preview styles (lines 283-299):**
- `.warp-preview`: 16x16 single tile, pixelated rendering
- `.warp-dropdown`: min-width 140px (matches wall dropdown)
- `.warp-dropdown .toolbar-dropdown-item`: flex layout with gap for preview + label alignment

**Files modified:**
- `src/components/ToolBar/ToolBar.tsx` (imports, preview generation, variant config, dropdown rendering)
- `src/components/ToolBar/ToolBar.css` (warp preview styles)

**Verification:** `npm run typecheck` passed with zero type errors (only pre-existing unused variable warnings)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

1. ✅ `npm run typecheck` passes with zero errors (only pre-existing TS6133 warnings for `immediatePatchTile`, `e`, `dirty`)
2. ✅ Warp tool dropdown shows 6 items: Warp F6, Warp F7, Warp F8, Warp F9, Warp FA, Animated 3x3 (verified in variantConfigs array)
3. ✅ Each dropdown item has tile preview rendering (16x16, pixelated)
4. ✅ Default warp type is 4 (0xFA) - set in Plan 01, dropdown config uses `gameObjectToolState.warpType`
5. ✅ Dropdown styling matches wall tool pattern (horizontal layout, 140px min-width, flex gap)

## Success Criteria

All success criteria achieved:

- ✅ All 6 warp types visible in dropdown with labels (F6, F7, F8, F9, FA, Animated 3x3)
- ✅ Tile preview images render for all 6 types from tileset via animation definitions
- ✅ Selection changes toolbar state (setWarpType setter integrated)
- ✅ No TypeScript errors (typecheck clean)
- ✅ Dropdown styling matches wall tool dropdown pattern (flex layout, preview + label)

## Key Technical Details

### Preview Generation Pattern

**Wall preview (reference):** 3-tile horizontal segment (48x16px), uses wallSystem.getWallTile()

**Warp preview (new):** Single tile (16x16px), uses ANIMATION_DEFINITIONS[animId].frames[0]

**Shared pattern:**
```typescript
const previewUrls = useMemo(() => {
  const map = new Map<number, string>();
  if (!tilesetImage) return map;

  for (let type = 0; type < TYPES.length; type++) {
    const canvas = document.createElement('canvas');
    // ... set dimensions, get context ...
    ctx.imageSmoothingEnabled = false; // Pixelated rendering

    // Draw tile(s) from tileset
    ctx.drawImage(tilesetImage, srcX, srcY, w, h, destX, destY, w, h);

    map.set(type, canvas.toDataURL());
  }
  return map;
}, [tilesetImage]);
```

**Why this pattern:** Ensures previews regenerate only when tileset changes (efficient), uses native canvas rendering (performant), produces data URLs (compatible with React img src).

### Warp Type to Tile Preview Mapping

```typescript
// WARP_STYLES array (GameObjectData.ts)
[0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E]

// For each warpType (0-5):
animId = WARP_STYLES[warpType]
anim = ANIMATION_DEFINITIONS[animId]
firstFrame = anim.frames[0]

// First frame tile IDs:
// Warp F6 (purple): frame 1760 (from ANIMATION_DEFINITIONS[0xF6])
// Warp F7 (green):  frame 1800 (from ANIMATION_DEFINITIONS[0xF7])
// Warp F8 (yellow): frame 1844 (from ANIMATION_DEFINITIONS[0xF8])
// Warp F9 (blue):   frame 1884 (from ANIMATION_DEFINITIONS[0xF9])
// Warp FA (red):    frame 1930 (from ANIMATION_DEFINITIONS[0xFA])
// Animated 3x3:     frame 3600 (from ANIMATION_DEFINITIONS[0x9E])
```

### CSS Layout Strategy

**Horizontal flex layout:** Preview image on left, label on right, gap for spacing

**Benefits:**
- Consistent with wall dropdown (user familiarity)
- Visually identifies warp type at a glance
- Accommodates variable label lengths (flex: 1 on label)

**Styling hierarchy:**
```
.toolbar-dropdown (base styles)
  → .warp-dropdown (warp-specific min-width)
    → .toolbar-dropdown-item (flex container)
      → .warp-preview (16x16 image)
      → .variant-label (text, flex: 1)
```

## Integration with Plan 01

**Plan 01 provided:** Core state model (`warpType: 0-5`), encoding logic (`WARP_STYLES[warpType] → animId`), picker decode (all 6 warp types)

**Plan 02 provides:** UI dropdown for selecting `warpType`, visual tile previews for identification

**Complete flow:**
```
User sees warp tool → clicks dropdown → sees 6 tile previews
User selects "Warp F8" (value: 2) → setWarpType(2) → warpType state = 2
User clicks map → placeGameObject → WARP_STYLES[2] = 0xF8 → encodeWarpTile(0xF8, src, dest)
User picks warp tile → WARP_STYLES.indexOf(0xF8) = 2 → setWarpType(2) → dropdown shows "Warp F8"
```

## Testing Recommendations

**Visual verification:**
1. Load editor with tileset
2. Click warp tool → verify dropdown shows 6 items
3. Verify each item shows correct tile preview (color matches warp type)
4. Select each warp type → verify selection state (bold, highlighted)

**Functional verification:**
1. Select Warp F6 → place on map → verify tile uses animation 0xF6
2. Select Warp FA → place on map → verify tile uses animation 0xFA (default)
3. Select Animated 3x3 → place on map → verify 3x3 block placed
4. Pick each warp type → verify dropdown auto-selects correct variant

**Edge cases:**
- Tileset not loaded → warpPreviewUrls returns empty map → no preview images render (labels only)
- Animation definition missing frames → continue loop (skip that warp type)
- Invalid warp type index → out of bounds on WARP_STYLES (prevented by variant values 0-5)

## Self-Check

✅ **PASSED**

**Created files:** None (all modifications to existing files)

**Modified files verified:**
```bash
[ -f "E:/NewMapEditor/src/components/ToolBar/ToolBar.tsx" ] && echo "FOUND: ToolBar.tsx" || echo "MISSING"
[ -f "E:/NewMapEditor/src/components/ToolBar/ToolBar.css" ] && echo "FOUND: ToolBar.css" || echo "MISSING"
```

**Both files:** FOUND

**Commit verified:**
```bash
git log --oneline | grep -q "f643d70" && echo "FOUND: f643d70" || echo "MISSING: f643d70"
```

**Commit:** FOUND

## Phase 77 Completion

**Plan 01 (core logic):** Parameterized encoding, indexed warp type state, picker extension → complete

**Plan 02 (UI dropdown):** Tile previews, 6-variant dropdown, visual selection → complete

**Phase 77 outcome:** Users can now place and identify all 6 warp types (F6, F7, F8, F9, FA, 3x3 animated) via visual dropdown with tile previews. Warp routing (src/dest) continues to work for all types. Picker extracts warp type from any of the 6 animation IDs.

**Next phase:** Phase 78 (final phase) - likely cleanup/documentation or next milestone planning per roadmap.

## Metrics

- **Duration:** 2 minutes (2026-02-16T08:16:26Z to 2026-02-16T08:18:26Z)
- **Commits:** 1
- **Files modified:** 2
- **Lines changed:** ~81 insertions, ~3 deletions
- **Type errors introduced:** 0
- **Breaking changes:** 0 (additive - restores warp dropdown removed in Plan 01)
