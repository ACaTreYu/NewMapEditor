# Phase 77: Warp Tool Expansion - Research

**Researched:** 2026-02-16
**Domain:** Game Object Tool Enhancement (Warp System)
**Confidence:** HIGH

## Summary

Phase 77 expands the warp tool from 2 variants (single 0xFA warp, 3x3 animated 0x9E warp) to a full 6-variant dropdown showing all warp types from the game's warp system: F6, F7, F8, F9, FA, and 9E. Each variant will display a tile image preview (matching the existing wall tool dropdown pattern), encode src/dest routing in the offset byte, and work with the picker tool for inspect-adjust-replace workflows.

**Primary recommendation:** Follow the existing wall tool dropdown pattern for tile previews, extend `encodeWarpTile()` to accept `animId` parameter, replace hardcoded `warpVariant` binary toggle with `warpType` dropdown (0-5 index), and extend picker decoding to all 6 animation IDs.

## Current State Analysis

### Existing Warp Implementation (v3.3)

**Two warp variants:**
1. **Variant 0 (Single warp):** Places single tile, animation ID 0xFA, encodes routing in offset
2. **Variant 1 (3x3 Animated):** Places 3x3 block, center tile 0x9E, encodes routing in center tile offset

**State structure (GlobalSlice):**
```typescript
gameObjectToolState: {
  warpVariant: number;  // 0 = single, 1 = animated (BINARY TOGGLE)
  warpStyle: number;    // Currently UNUSED (always 0)
  warpSrc: number;      // 0-9
  warpDest: number;     // 0-9
}
```

**Encoding functions:**
- `encodeWarpTile(style, src, dest)` in GameObjectData.ts — **hardcoded to return 0xFA** (line 124)
- `makeAnimatedTile(animId, offset)` in TileEncoding.ts — generic encoder used for 0x9E center tile

**Tile preview pattern (Wall Tool):**
- `wallPreviewUrls` Map created via `useMemo` (ToolBar.tsx lines 212-244)
- Renders 3-tile horizontal segment to canvas, exports via `toDataURL()`
- Dropdown items show `<img src={wallPreviewUrls.get(v.value)} />` (line 580-586)

### Available Warp Types (AnimationDefinitions.ts)

| Animation ID | Name | Tileset Frame | Frame Count | Visual Style |
|--------------|------|---------------|-------------|--------------|
| 0xF6 | Warp F6 | 1386 | 1 | Purple warp |
| 0xF7 | Warp F7 | 1426 | 1 | Green warp |
| 0xF8 | Warp F8 | 1359 | 1 | Yellow warp |
| 0xF9 | Warp F9 | 1399 | 1 | Blue warp |
| 0xFA | Warp FA | 1439 | 1 | Red warp (current default) |
| 0x9E | BigWarp MM | 1388, 1391, 1394, 1397 | 4 | Animated 3x3 center tile |

**Key insight from GameObjectData.ts line 119:**
```typescript
export const WARP_STYLES: number[] = [0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E];
```
This array already exists but is **unused** — it defines the 6 warp types this phase will enable.

### Current Picker Decoding (MapCanvas.tsx lines 2178-2185)

```typescript
// Decode warp routing if it's a warp tile (animId 0xFA or 0x9E)
const animId = getAnimationId(pickedTile);
if (animId === 0xFA || animId === 0x9E) {
  const warpSrc = offset % 10;
  const warpDest = Math.floor(offset / 10);
  const currentWarpStyle = useEditorStore.getState().gameObjectToolState.warpStyle;
  setWarpSettings(warpSrc, warpDest, currentWarpStyle);
}
```

**Current behavior:** Only 0xFA and 0x9E extract routing. Other warp types (F6-F9) would be ignored.

## Requirements Breakdown

### WARP-03: All 6 warp types encode src/dest routing in offset byte

**What it means:** When user places a warp of any type (F6-FA, 9E), the tile must encode `dest*10 + src` in bits 8-14, enabling gameplay routing functionality.

**Current gap:** `encodeWarpTile()` hardcodes 0xFA on line 124. F6-F9 warps cannot be placed with routing.

**Solution approach:**
1. Add `animId` parameter to `encodeWarpTile(animId, src, dest)`
2. Replace hardcoded `0xFA` with parameter: `return animId | 0x8000 | (((dest * 10) + src) << 8);`
3. Update call site in `placeWarp()` to pass selected warp type

**Edge case:** 0x9E is multi-tile — only center tile gets routing (already handled by `placeAnimatedWarp()`)

### WARP-04: Warp tool dropdown lists all 6 warp types as selectable variants

**What it means:** Toolbar warp tool shows dropdown with 6 options: "Warp F6", "Warp F7", ..., "Animated 3x3" (0x9E).

**Current gap:** Binary `warpVariant` toggle (0 or 1) only supports 2 variants. Need indexed selection.

**Solution approach:**
1. Replace `warpVariant: number` with `warpType: number` (0-5 index into WARP_STYLES)
2. Add variant config to ToolBar.tsx `variantConfigs[]` array:
   ```typescript
   {
     tool: ToolType.WARP,
     settingName: 'Type',
     getCurrentValue: () => gameObjectToolState.warpType,
     variants: [
       { label: 'Warp F6', value: 0 },
       { label: 'Warp F7', value: 1 },
       { label: 'Warp F8', value: 2 },
       { label: 'Warp F9', value: 3 },
       { label: 'Warp FA', value: 4 },
       { label: 'Animated 3x3', value: 5 },
     ],
     setter: setWarpType
   }
   ```
3. Add `setWarpType(type: number)` action to GlobalSlice
4. Update `placeGameObject()` dispatch logic to use `warpType` instead of binary check

**Breaking change mitigation:** Default `warpType: 4` (0xFA) maintains current behavior.

### WARP-05: Warp dropdown shows tile image preview for each warp type

**What it means:** Each dropdown item displays the actual warp tile image, matching wall tool dropdown visual pattern.

**Current gap:** No tile preview generation for warps.

**Solution approach (follow wall tool pattern):**
1. Create `warpPreviewUrls` Map via `useMemo` in ToolBar.tsx
2. For each warp type (F6-F9, FA):
   - Create 16x16 canvas
   - Draw tileset frame (e.g., frame 1386 for F6)
   - Export via `toDataURL()`
3. For animated warp (0x9E):
   - Draw first frame (1388) or create 3-tile horizontal preview
4. Render in dropdown:
   ```tsx
   {isWarpTool && warpPreviewUrls.get(v.value) && (
     <img src={warpPreviewUrls.get(v.value)} className="warp-preview" />
   )}
   ```

**Technical details:**
- TILES_PER_ROW = 40 (tileset is 640px wide)
- Frame to pixel coords: `srcX = (frame % 40) * 16; srcY = Math.floor(frame / 40) * 16`
- Single-frame warps (F6-FA) use static frame from `ANIMATION_DEFINITIONS[animId].frames[0]`
- Animated warp (9E) uses frame 1388 (first frame of 4-frame cycle)

**CSS note:** Reuse `.wall-preview` class or create `.warp-preview` with same styles (likely 48x16 for wall, 16x16 for warp).

### WARP-06: Picker tool decodes routing from all 6 warp types

**What it means:** Clicking any warp tile (F6-FA, 9E) with picker tool extracts src/dest from offset and populates dropdowns.

**Current gap:** Picker only checks `animId === 0xFA || animId === 0x9E`.

**Solution approach:**
1. Replace conditional with array check:
   ```typescript
   const WARP_ANIM_IDS = [0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E];
   if (WARP_ANIM_IDS.includes(animId)) {
     const warpSrc = offset % 10;
     const warpDest = Math.floor(offset / 10);
     // NEW: Determine warpType from animId
     const warpType = WARP_STYLES.indexOf(animId);
     setWarpSettings(warpSrc, warpDest, warpType);
   }
   ```
2. Update `setWarpSettings()` signature to accept `warpType` (replacing unused `warpStyle`)

**Edge case:** If animId not in WARP_STYLES (corrupted data), default to warpType=4 (0xFA).

## Architecture Patterns

### Pattern 1: Tool Variant Dropdown with Tile Previews

**Used by:** Wall Tool (lines 212-244, 580-587 in ToolBar.tsx)

**Structure:**
```typescript
// 1. Generate preview images via useMemo
const previewUrls = useMemo(() => {
  const map = new Map<number, string>();
  if (!tilesetImage) return map;

  for (let type = 0; type < TYPES.length; type++) {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;

    // Draw tile from tileset
    const frame = getFrameForType(type);
    const srcX = (frame % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(frame / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);

    map.set(type, canvas.toDataURL());
  }
  return map;
}, [tilesetImage]);

// 2. Render in dropdown
{isTool && previewUrls.get(v.value) && (
  <img src={previewUrls.get(v.value)} className="preview" />
)}
```

**Why this pattern:**
- Generates previews once when tileset loads (useMemo dependency)
- Data URLs persist in memory (no re-render flicker)
- Canvas API supports pixel-perfect tile extraction
- Matches existing codebase conventions

**Adapt for warps:**
- Replace wall-specific logic with warp frame lookup from `ANIMATION_DEFINITIONS`
- Handle animated warp (0x9E) by drawing first frame only
- Canvas size: 16x16 for single-tile warps, consider 48x16 for animated warp preview

### Pattern 2: GameObjectToolState Variant Management

**Used by:** Flag, Spawn, Bunker, Bridge, Conveyor tools

**State structure:**
```typescript
interface GameObjectToolState {
  [toolName]Variant: number;  // Index into variants array
}
```

**Setter pattern (GlobalSlice):**
```typescript
setToolVariant: (variant: number) => {
  set((state) => {
    state.gameObjectToolState.toolVariant = variant;
  });
}
```

**Dispatcher pattern (documentsSlice.ts):**
```typescript
case ToolType.TOOL:
  if (toolVariant === 0) {
    success = gameObjectSystem.placeType1(...);
  } else if (toolVariant === 1) {
    success = gameObjectSystem.placeType2(...);
  }
  break;
```

**Adapt for warps:**
- Replace binary `warpVariant` check with indexed `warpType` (0-5)
- Map `warpType` to `animId` via `WARP_STYLES[warpType]`
- Special case: `warpType === 5` (0x9E) calls `placeAnimatedWarp()`, others call `placeWarp()`

### Pattern 3: Picker Tool Decoding

**Current pattern (MapCanvas.tsx lines 2174-2186):**
```typescript
if (isAnimatedTile(pickedTile)) {
  const offset = getFrameOffset(pickedTile);
  setAnimationOffsetInput(offset);

  const animId = getAnimationId(pickedTile);
  if (animId === 0xFA || animId === 0x9E) {
    const warpSrc = offset % 10;
    const warpDest = Math.floor(offset / 10);
    setWarpSettings(warpSrc, warpDest, currentWarpStyle);
  }
}
```

**Extension for all 6 warp types:**
```typescript
const WARP_ANIM_IDS = [0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0x9E];
if (WARP_ANIM_IDS.includes(animId)) {
  const warpSrc = offset % 10;
  const warpDest = Math.floor(offset / 10);
  const warpType = WARP_STYLES.indexOf(animId); // 0-5 index
  setWarpSettings(warpSrc, warpDest, warpType);
}
```

**Why this works:**
- Array check scales to 6 types (vs hardcoded conditions)
- `indexOf()` maps animId back to dropdown index (0-5)
- Reuses existing routing decode math (`offset % 10`, `floor(offset / 10)`)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile image preview | Custom <canvas> rendering per dropdown render | useMemo + toDataURL pattern | Avoids re-generating images on every render, matches wall tool pattern |
| Animation ID to frame mapping | Hardcoded frame lookups | ANIMATION_DEFINITIONS[animId].frames[0] | Single source of truth, already proven correct |
| Warp type indexing | Separate enum or constant | WARP_STYLES array (already exists) | Prevents index mismatches, maps directly to animId |

**Key insight:** GameObjectData.ts already defines `WARP_STYLES` array (line 119) — this is the canonical 6-warp list. Don't create duplicate constants.

## Common Pitfalls

### Pitfall 1: Forgetting 0x9E is Multi-Tile

**What goes wrong:** Treating 0x9E like single-tile warps (F6-FA) — calling `placeWarp()` instead of `placeAnimatedWarp()`.

**Why it happens:** 0x9E is in the WARP_STYLES array alongside single-tile warps, easy to miss the special case.

**How to avoid:**
- Add explicit check in dispatcher: `if (warpType === 5) { placeAnimatedWarp(...) } else { placeWarp(...) }`
- Comment: "0x9E (warpType 5) is 3x3 animated block, requires different placement logic"

**Warning signs:** 3x3 animated warp places only center tile, or picker doesn't sync warpType when clicking animated warp.

### Pitfall 2: Preview Image Size Mismatch

**What goes wrong:** Single-tile warp previews are 16x16, but dropdown expects 48x16 (wall tool size), causing layout distortion.

**Why it happens:** Copy-pasting wall tool preview code without adjusting canvas dimensions.

**How to avoid:**
- Check CSS `.wall-preview` width/height constraints
- Either: (A) create separate `.warp-preview` with 16x16 sizing, or (B) adjust canvas to 48x16 and draw 3 copies of warp tile
- Test dropdown rendering with all 6 warp types before declaring success

**Warning signs:** Warp tile images appear stretched or squashed in dropdown.

### Pitfall 3: Picker Doesn't Update Dropdown Selection

**What goes wrong:** Picking a F6 warp extracts routing (src/dest) but dropdown still shows FA variant.

**Why it happens:** `setWarpSettings()` updates `warpSrc/warpDest` but forgets to update `warpType`.

**How to avoid:**
- Change `setWarpSettings(src, dest, style)` signature to `setWarpSettings(src, dest, type)`
- Map `animId` to `warpType` via `WARP_STYLES.indexOf(animId)` in picker logic
- Update all call sites (picker, initial state, tests)

**Warning signs:** Picker extracts routing but toolbar dropdown doesn't change, or placing warp after picking uses wrong type.

### Pitfall 4: Hardcoded 0xFA in encodeWarpTile

**What goes wrong:** Updating dropdown and state, but placed tiles are always 0xFA regardless of selection.

**Why it happens:** `encodeWarpTile()` has `0xFA` hardcoded on line 124.

**How to avoid:**
- First change: Add `animId` parameter to function signature
- Second change: Replace `0xFA` literal with `animId` variable
- Update call site in `placeWarp()` to pass `WARP_STYLES[warpType]`
- Test: Place each warp type, inspect tile value with picker, verify animId matches

**Warning signs:** Dropdown changes but placed tiles always have animId 0xFA.

## Code Examples

### Example 1: Warp Preview Generation (ToolBar.tsx)

```typescript
// Source: Adapted from wall preview pattern (lines 212-244)
const warpPreviewUrls = useMemo(() => {
  const map = new Map<number, string>();
  if (!tilesetImage) return map;

  const TILES_PER_ROW = 40;

  // Generate previews for 6 warp types
  for (let warpType = 0; warpType < WARP_STYLES.length; warpType++) {
    const animId = WARP_STYLES[warpType];
    const anim = ANIMATION_DEFINITIONS[animId];
    if (!anim || anim.frames.length === 0) continue;

    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE; // 16
    canvas.height = TILE_SIZE; // 16
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;

    // Draw first frame of animation
    const frame = anim.frames[0];
    const srcX = (frame % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(frame / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(
      tilesetImage,
      srcX, srcY, TILE_SIZE, TILE_SIZE,
      0, 0, TILE_SIZE, TILE_SIZE
    );

    map.set(warpType, canvas.toDataURL());
  }

  return map;
}, [tilesetImage]);
```

### Example 2: Updated encodeWarpTile Function

```typescript
// Source: GameObjectData.ts line 122-125 (modified)
// Encode a warp tile value with routing
export function encodeWarpTile(animId: number, src: number, dest: number): number {
  return animId | 0x8000 | (((dest * 10) + src) << 8);
}

// Call site in GameObjectSystem.ts placeWarp():
placeWarp(map: MapData, x: number, y: number, animId: number, src: number, dest: number): boolean {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  if (src < 0 || src > 9 || dest < 0 || dest > 9) return false;

  map.tiles[y * MAP_WIDTH + x] = encodeWarpTile(animId, src, dest);
  map.modified = true;
  return true;
}
```

### Example 3: Picker Routing Decode for All 6 Types

```typescript
// Source: MapCanvas.tsx lines 2178-2185 (extended)
import { WARP_STYLES } from '@core/map/GameObjectData';

// Decode warp routing if it's a warp tile
const animId = getAnimationId(pickedTile);
if (WARP_STYLES.includes(animId)) {
  const warpSrc = offset % 10;
  const warpDest = Math.floor(offset / 10);
  const warpType = WARP_STYLES.indexOf(animId); // 0-5 index
  setWarpSettings(warpSrc, warpDest, warpType);
}
```

### Example 4: Warp Variant Config (ToolBar.tsx)

```typescript
// Source: New entry in variantConfigs array (after line 311)
{
  tool: ToolType.WARP,
  settingName: 'Type',
  getCurrentValue: () => gameObjectToolState.warpType,
  variants: [
    { label: 'Warp F6', value: 0 },
    { label: 'Warp F7', value: 1 },
    { label: 'Warp F8', value: 2 },
    { label: 'Warp F9', value: 3 },
    { label: 'Warp FA', value: 4 },
    { label: 'Animated 3x3', value: 5 },
  ],
  setter: setWarpType
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary warp variant toggle (0 or 1) | 6-variant indexed dropdown | Phase 77 | Enables all game warp types, aligns with SEdit functionality |
| Hardcoded 0xFA in encodeWarpTile | animId parameter | Phase 77 | Function becomes reusable for all 6 warp types |
| Picker checks only FA/9E | Picker checks WARP_STYLES array | Phase 77 | All warp types work with inspect-adjust-replace workflow |
| Text-only dropdown labels | Tile image previews | Phase 77 | Visual feedback matches wall tool, user sees actual warp appearance |

**Deprecated/outdated:**
- `warpVariant` binary field (0/1) — replaced by `warpType` index (0-5)
- `warpStyle` unused field — repurposed to store `warpType`, or removed entirely
- Hardcoded conditional `if (warpVariant === 1)` — replaced by `if (warpType === 5)`

## Files Requiring Changes

### Core Logic Changes

1. **GameObjectData.ts** (lines 122-125)
   - Change `encodeWarpTile(style, src, dest)` → `encodeWarpTile(animId, src, dest)`
   - Replace hardcoded `0xFA` with `animId` parameter
   - Remove unused `style` parameter

2. **GameObjectSystem.ts** (lines 102-110)
   - Update `placeWarp()` signature: `(map, x, y, style, src, dest)` → `(map, x, y, animId, src, dest)`
   - Pass `animId` to `encodeWarpTile()`
   - Remove style validation (replaced by animId validation)

3. **globalSlice.ts** (GameObjectToolState interface)
   - Replace `warpVariant: number` with `warpType: number`
   - Remove or repurpose `warpStyle` field (currently unused)
   - Add `setWarpType(type: number)` action

4. **documentsSlice.ts** (placeGameObject dispatcher, line 843)
   - Replace `if (warpVariant === 1)` with `if (warpType === 5)`
   - Map `warpType` to `animId` via `WARP_STYLES[warpType]`
   - Pass `animId` to `placeWarp()` instead of hardcoded style

### UI Changes

5. **ToolBar.tsx** (lines 303-312, add preview generation)
   - Add `warpPreviewUrls` useMemo generation (follow wall pattern)
   - Add warp variant config to `variantConfigs[]` array
   - Render warp previews in dropdown items
   - Update `isWarpTool` flag check for conditional preview rendering

6. **MapCanvas.tsx** (lines 2178-2185)
   - Replace `if (animId === 0xFA || animId === 0x9E)` with `if (WARP_STYLES.includes(animId))`
   - Map `animId` to `warpType` via `indexOf()`
   - Update `setWarpSettings()` call to pass `warpType`

7. **GameObjectToolPanel.tsx** (optional cleanup)
   - No changes required for functionality
   - Consider adding warp type label display (e.g., "Current: Warp FA")

### CSS Changes

8. **ToolBar.css** (add warp preview styles)
   - Add `.warp-preview` class (or reuse `.wall-preview` if dimensions match)
   - Ensure dropdown width accommodates 16x16 tile image + label text

## Verification Strategy

### Requirement Tracing

| Requirement | Verification Method | Expected Outcome |
|-------------|---------------------|------------------|
| WARP-03 | Place each warp type (F6-FA, 9E), inspect tile value with picker | animId matches selected type, offset encodes routing |
| WARP-04 | Open warp tool dropdown | 6 variants listed: Warp F6, F7, F8, F9, FA, Animated 3x3 |
| WARP-05 | Visual inspection of dropdown | Each variant shows tile image preview |
| WARP-06 | Pick each warp type | Source/Dest dropdowns populate, warp type dropdown selects correct variant |

### Test Cases

1. **Encode routing for each warp type:**
   - Select Warp F6, set Src=2 Dest=7, place at (50,50)
   - Inspect: `map.tiles[50*256+50]` should be `0x8000 | (72 << 8) | 0xF6`
   - Repeat for F7, F8, F9, FA, 9E

2. **Picker round-trip:**
   - Place Warp F8 with Src=3 Dest=5
   - Use picker on placed tile
   - Expected: Dropdown shows "Warp F8", Src=3, Dest=5

3. **Preview images render:**
   - Load editor, select Warp tool, open dropdown
   - Expected: 6 preview images visible, each showing correct warp tile
   - F6=purple (frame 1386), F7=green (1426), F8=yellow (1359), F9=blue (1399), FA=red (1439), 9E=animated center (1388)

4. **Backward compatibility:**
   - Open map saved with v3.3 (binary warpVariant)
   - Expected: Default to Warp FA (type 4), no errors

## Open Questions

### Question 1: Should warpStyle field be removed or repurposed?

**What we know:** `warpStyle` in GameObjectToolState is currently unused (always 0). Phase 77 introduces `warpType` (0-5 index).

**What's unclear:** Should we (A) remove `warpStyle` entirely, or (B) repurpose it to store `warpType`?

**Recommendation:** **Repurpose** `warpStyle` to mean `warpType` — less breaking change, maintains existing state structure. Update comments to clarify: `warpStyle: number; // 0-5 index into WARP_STYLES (F6, F7, F8, F9, FA, 9E)`.

**Trade-off:** Keeps `setWarpSettings(src, dest, style)` signature unchanged, but "style" is semantic mismatch (should be "type"). Alternative: rename field and add migration logic.

### Question 2: Should animated warp (0x9E) show 3-tile preview or single-tile?

**What we know:** Wall tool shows 3-tile horizontal segment. Animated warp is 3x3 block, but center tile (0x9E) is the canonical warp.

**Options:**
A. Single 16x16 preview (frame 1388 — center tile first frame)
B. 3-tile horizontal preview (left/center/right of middle row: 0x9D, 0x9E, 0x9F)
C. 3x3 full block preview (48x48, all 9 tiles)

**Recommendation:** **Option A** — Single 16x16 preview. Rationale:
- Consistent canvas size with other warp types (F6-FA are all single-tile)
- Dropdown item height matches other variants
- 0x9E tile is visually distinct enough (animated warp center frame)

**Trade-off:** Doesn't show full 3x3 appearance, but dropdown is for selection (full preview visible on map).

### Question 3: Should warpType persist across sessions?

**What we know:** `gameObjectToolState` is in GlobalSlice (not per-document).

**What's unclear:** Should `warpType` be saved/restored when editor restarts?

**Recommendation:** **No persistence** — default to `warpType: 4` (0xFA) on each session. Rationale:
- Warp type selection is transient preference (like current tool)
- No existing persistence for `warpVariant` (always resets to 0)
- Simplifies implementation (no migration logic)

**Trade-off:** User must re-select warp type after restart, but matches current behavior.

## Sources

### Primary (HIGH confidence)

- E:\NewMapEditor\src\core\map\GameObjectData.ts — WARP_STYLES array (line 119), encodeWarpTile function (line 122-125)
- E:\NewMapEditor\src\core\map\AnimationDefinitions.ts — 6 warp animation definitions (lines 266-270, 178)
- E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx — Wall preview pattern (lines 212-244, 580-587)
- E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx — Picker warp routing decode (lines 2178-2185)
- E:\NewMapEditor\src\core\editor\slices\globalSlice.ts — GameObjectToolState interface
- E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts — placeGameObject warp dispatch (line 843-846)
- E:\NewMapEditor\.planning\phases\72-9e-warp-routing\72-RESEARCH.md — Warp routing architecture from v3.3

### Secondary (MEDIUM confidence)

- E:\NewMapEditor\.planning\REQUIREMENTS.md — v3.5 requirements WARP-03 through WARP-06
- E:\NewMapEditor\.planning\ROADMAP.md — Phase 77 success criteria and dependencies

## Metadata

**Confidence breakdown:**
- Warp types and encoding: HIGH — verified against AnimationDefinitions.ts and existing encodeWarpTile()
- Tile preview pattern: HIGH — wall tool pattern proven, direct adaptation
- State management: HIGH — follows existing GlobalSlice patterns (spawn/bunker variants)
- Picker extension: HIGH — existing 2-type check, array extension straightforward

**Research date:** 2026-02-16
**Valid until:** 2026-03-18 (stable domain, 30 days)

**Key dependencies:**
- Phase 72 complete (0x9E warp routing works)
- Phase 74 complete (tool preview rendering patterns established)
- WARP_STYLES array in GameObjectData.ts (already exists)
- Wall tool dropdown implementation (reference pattern)
