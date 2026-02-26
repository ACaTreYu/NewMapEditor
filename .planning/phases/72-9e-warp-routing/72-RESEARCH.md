# Phase 72 Research: 9E Warp Routing

## Research Question
**What do I need to know to PLAN this phase well?**

## Executive Summary

Phase 72 extends warp routing functionality from single-tile 0xFA warps to the center tile of 3x3 animated warp blocks (0x9E). This enables animated warps to function as actual gameplay warps (not just visual decoration) by encoding src/dest routing data in the offset field, identical to the 0xFA encoding scheme established in v3.3.

**Key Insight:** This is an incremental enhancement to existing systems. The encoding mechanism (`dest*10 + src`) is proven and working for 0xFA warps. The picker decoding pattern exists. We only need to:
1. Apply routing to the center tile of animated warp blocks
2. Extend picker decoding to recognize 0x9E alongside 0xFA
3. Route `warpSrc/warpDest` state (NOT `animationOffsetInput`) to animated warp placement

**Complexity:** LOW — surgical changes to 3 files, no new UI, no new state, no architectural changes.

---

## Current State Analysis

### What Already Works (v3.3 Complete)

**Single-tile warp routing (0xFA):**
- `encodeWarpTile()` in GameObjectData.ts creates tiles with routing: `0x8000 | ((dest*10 + src) << 8) | 0xFA`
- `placeWarp()` in GameObjectSystem.ts places single tiles with routing encoded
- Warp UI dropdowns (Source/Dest) in ToolBar control `warpSrc/warpDest` state
- Picker tool decodes 0xFA routing: `src = offset % 10; dest = floor(offset / 10)` (MapCanvas.tsx:1965-1969)
- Status bar shows routing for 0xFA warps

**Animated warp blocks (v3.2):**
- `placeAnimatedWarp()` places 3x3 block using `ANIMATED_WARP_PATTERN` (9 tiles, animIds 0x9A-0xA2)
- Center tile is 0x9E (ANIMATED_WARP_PATTERN[4])
- All 9 tiles currently receive same offset via `makeAnimatedTile(animId, offset)`
- Animated warp variant uses `animationOffsetInput` (NOT warp routing state)

**Animation offset control (v3.3):**
- `animationOffsetInput` in GlobalSlice (0-127, clamped setter)
- `makeAnimatedTile(animId, offset)` encodes offset into bits 8-14
- Picker extracts offset via `getFrameOffset()` and syncs to `animationOffsetInput`
- Spawn/warp game objects accept offset parameter

### Current Gaps (Phase 72 Scope)

1. **Animated warp doesn't encode routing:** `placeAnimatedWarp()` applies same offset to all 9 tiles, ignoring `warpSrc/warpDest`
2. **Picker doesn't decode 0x9E routing:** Only checks `animId === 0xFA`, skips 0x9E
3. **Warp state not routed to animated variant:** documentsSlice.ts line 844 uses `animationOffsetInput` for animated warps instead of `warpSrc/warpDest`

---

## Requirements Breakdown

### WARP-01: 9E warp tile encodes src/dest routing identical to FA encoding

**Interpretation:** The center tile (0x9E) of the 3x3 animated warp block must encode routing data using the same bit layout as 0xFA warps:
- Bit 15: animated flag (0x8000)
- Bits 8-14: offset field = `dest * 10 + src` (0-99 range)
- Bits 0-7: animation ID (0x9E)

**Current behavior:** All 9 tiles receive generic offset from `animationOffsetInput` (e.g., could be 0, or user-set value)

**Desired behavior:** Center tile (index 4 in pattern) encodes routing; border tiles (indices 0-3, 5-8) can keep offset 0 or generic offset

**Implementation location:** `GameObjectSystem.ts:placeAnimatedWarp()` lines 133-138

**Key decision from v3.3:** "Same offset for all 9 tiles in animated warp pattern" — this was for VISUAL consistency. Now we need to OVERRIDE center tile for FUNCTIONAL routing.

### WARP-02: 3x3 animated warp block center (9E) carries routing data when placed

**Interpretation:** When user places an animated warp via the Warp tool (variant 1), the `warpSrc` and `warpDest` values from the dropdown controls must be encoded into the center tile, enabling gameplay routing.

**Current behavior:** documentsSlice.ts line 844 passes `animationOffsetInput` to `placeAnimatedWarp()`, which applies it to all 9 tiles

**Desired behavior:** documentsSlice.ts must pass `warpSrc/warpDest` instead, and `placeAnimatedWarp()` must compute routing offset for center tile

**Implementation location:** documentsSlice.ts lines 843-847 (dispatch logic)

**User workflow impact:** User sets Source/Dest dropdowns → places animated warp → center tile encodes routing → picker can extract routing → inspect-adjust-replace workflow complete

---

## Technical Architecture

### Tile Encoding Format (16-bit)

```
Standard tile:
  Bit 15: 0 (static)
  Bits 0-14: tile ID (0-32767)

Animated tile:
  Bit 15: 1 (animated flag, 0x8000)
  Bits 8-14: frame offset (0-127)
  Bits 0-7: animation ID (0-255)

Warp tile (0xFA or 0x9E with routing):
  Bit 15: 1 (0x8000)
  Bits 8-14: dest*10 + src (0-99)
  Bits 0-7: 0xFA or 0x9E
```

### Encoding Functions

**Existing (unchanged):**
- `makeAnimatedTile(animId, offset)` — generic animated tile encoder (TileEncoding.ts:41)
- `encodeWarpTile(style, src, dest)` — hardcoded to 0xFA only (GameObjectData.ts:123)

**Pattern to follow:**
```typescript
// For center tile routing (0x9E):
const routingOffset = dest * 10 + src;
const centerTile = makeAnimatedTile(0x9E, routingOffset);

// For border tiles (0x9A-0xA2):
const borderTile = makeAnimatedTile(animId, 0); // or keep existing offset
```

### State Flow

**Current (v3.3):**
```
User sets Source/Dest dropdowns
  → globalSlice.warpSrc, warpDest updated
  → User places single warp (variant 0)
    → documentsSlice calls placeWarp(x, y, warpStyle, warpSrc, warpDest)
      → GameObjectSystem.placeWarp() calls encodeWarpTile(style, src, dest)
        → Tile encoded with routing
```

**Target (Phase 72):**
```
User sets Source/Dest dropdowns
  → globalSlice.warpSrc, warpDest updated
  → User places animated warp (variant 1)
    → documentsSlice calls placeAnimatedWarp(x, y, warpSrc, warpDest)  [NEW SIGNATURE]
      → GameObjectSystem.placeAnimatedWarp() encodes center tile with routing
        → centerTile = makeAnimatedTile(0x9E, dest*10 + src)
        → borderTiles = makeAnimatedTile(animId, 0)
```

**Picker reverse flow (already works for 0xFA, extend to 0x9E):**
```
User picks 0x9E tile
  → MapCanvas.tsx handleMouseDown detects PICKER tool
    → isAnimatedTile(pickedTile) → true
    → offset = getFrameOffset(pickedTile)
    → animId = getAnimationId(pickedTile)
    → if (animId === 0xFA || animId === 0x9E):  [ADD 0x9E CHECK]
        → warpSrc = offset % 10
        → warpDest = floor(offset / 10)
        → setWarpSettings(warpSrc, warpDest, currentWarpStyle)
```

---

## Prior Art & Patterns

### Spawn Offset Pattern (v3.3)

documentsSlice.ts lines 850-854 already shows correct pattern for animated spawns:
```typescript
if (spawnVariant === 1) {
  success = gameObjectSystem.placeAnimatedSpawn(doc.map, x, y, selectedTeam, animationOffsetInput);
} else {
  success = gameObjectSystem.placeSpawn(doc.map, x, y, selectedTeam);
}
```

**Key insight:** Animated spawn uses `animationOffsetInput` because spawns have no routing concept. Warps DO have routing, so animated warp should use `warpSrc/warpDest`.

### Warp Routing Calculation (v3.3)

From MapCanvas.tsx:1966-1967 (picker decoding):
```typescript
const warpSrc = offset % 10;
const warpDest = Math.floor(offset / 10);
```

From GameObjectData.ts:124 (encoding):
```typescript
return 0xFA | 0x8000 | (((dest * 10) + src) << 8);
```

**Pattern is proven and consistent** — we apply same math to 0x9E tiles.

### Multi-tile Pattern with Center Override

GameObjectSystem.ts:134-137 (current animated warp):
```typescript
const patternWithOffset = ANIMATED_WARP_PATTERN.map(tile =>
  (tile & 0x8000) ? makeAnimatedTile(tile & 0xFF, offset) : tile
);
return this.stamp3x3(map, x, y, patternWithOffset);
```

**Insight:** We can extend this to apply different offset to center tile (index 4):
```typescript
const patternWithOffset = ANIMATED_WARP_PATTERN.map((tile, index) => {
  if (!(tile & 0x8000)) return tile; // static tile, no change
  const animId = tile & 0xFF;
  if (index === 4) {
    // Center tile: encode routing
    const routingOffset = dest * 10 + src;
    return makeAnimatedTile(animId, routingOffset);
  } else {
    // Border tiles: keep generic offset or 0
    return makeAnimatedTile(animId, 0);
  }
});
```

---

## Implementation Strategy

### Change 1: GameObjectSystem.placeAnimatedWarp Signature

**File:** `src/core/map/GameObjectSystem.ts`
**Lines:** 133-138

**Current signature:**
```typescript
placeAnimatedWarp(map: MapData, x: number, y: number, offset: number = 0): boolean
```

**New signature:**
```typescript
placeAnimatedWarp(map: MapData, x: number, y: number, src: number = 0, dest: number = 0): boolean
```

**Rationale:** Warp routing is NOT generic animation offset. It's specific game logic (src/dest). Signature should reflect domain intent.

**Implementation:**
```typescript
placeAnimatedWarp(map: MapData, x: number, y: number, src: number = 0, dest: number = 0): boolean {
  const routingOffset = dest * 10 + src;

  const patternWithOffset = ANIMATED_WARP_PATTERN.map((tile, index) => {
    if (!(tile & 0x8000)) return tile;
    const animId = tile & 0xFF;

    if (index === 4 && animId === 0x9E) {
      // Center tile: encode routing
      return makeAnimatedTile(animId, routingOffset);
    } else {
      // Border tiles: no offset (pure animation)
      return makeAnimatedTile(animId, 0);
    }
  });

  return this.stamp3x3(map, x, y, patternWithOffset);
}
```

**Edge cases:**
- src/dest out of range (0-9): Already validated by UI dropdowns, but add defensive clamp
- Non-0x9E center tile: Pattern is hardcoded, won't happen. But check `animId === 0x9E` for safety

### Change 2: documentsSlice Dispatch Logic

**File:** `src/core/editor/slices/documentsSlice.ts`
**Lines:** 843-847

**Current:**
```typescript
case ToolType.WARP:
  if (warpVariant === 1) {
    success = gameObjectSystem.placeAnimatedWarp(doc.map, x, y, animationOffsetInput);
  } else {
    success = gameObjectSystem.placeWarp(doc.map, x, y, warpStyle, warpSrc, warpDest);
  }
  break;
```

**New:**
```typescript
case ToolType.WARP:
  if (warpVariant === 1) {
    success = gameObjectSystem.placeAnimatedWarp(doc.map, x, y, warpSrc, warpDest);
  } else {
    success = gameObjectSystem.placeWarp(doc.map, x, y, warpStyle, warpSrc, warpDest);
  }
  break;
```

**Rationale:** Both warp variants now use `warpSrc/warpDest` state. Animated warp is NOT a generic animation — it's a warp with visual flair.

### Change 3: Picker Decoding Extension

**File:** `src/components/MapCanvas/MapCanvas.tsx`
**Lines:** 1963-1970

**Current:**
```typescript
// Decode warp routing if it's a warp tile (animId 0xFA)
const animId = getAnimationId(pickedTile);
if (animId === 0xFA) {
  const warpSrc = offset % 10;
  const warpDest = Math.floor(offset / 10);
  const currentWarpStyle = useEditorStore.getState().gameObjectToolState.warpStyle;
  setWarpSettings(warpSrc, warpDest, currentWarpStyle);
}
```

**New:**
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

**Rationale:** 0x9E tiles now encode routing identically to 0xFA. Single condition extension enables picker to extract routing from both warp types.

---

## Edge Cases & Validation

### User Workflow Edge Cases

1. **User places animated warp with Source=5, Dest=3:**
   - Routing offset = 3*10 + 5 = 35
   - Center tile = `0x8000 | (35 << 8) | 0x9E` = `0xA39E`
   - Picker extracts: src = 35 % 10 = 5, dest = floor(35/10) = 3 ✓

2. **User picks 0x9E tile with routing, then switches to single warp:**
   - Picker decodes routing from 0x9E → `warpSrc=5, warpDest=3`
   - User switches to variant 0 (single warp)
   - Places single warp → encodes with same routing ✓

3. **User picks 0x9E border tile (not center):**
   - Border tile has offset=0 (no routing)
   - Picker extracts: src = 0 % 10 = 0, dest = floor(0/10) = 0
   - Dropdowns reset to 0/0 (acceptable — border tiles are decorative)

4. **User picks 0x9E center from old v3.2 map (no routing):**
   - Old maps have offset=0 on all 9 tiles
   - Picker extracts: src=0, dest=0
   - Dropdowns show 0/0 (correct — old warps had no routing)

### Data Validation

**Range constraints:**
- src/dest: 0-9 (enforced by UI dropdowns)
- Routing offset: 0-99 (fits in 7 bits, no overflow risk)
- Animation ID: 0x9E is constant, no validation needed

**Bit packing safety:**
```
Max routing offset = 9*10 + 9 = 99
Binary: 0110 0011 (7 bits)
Shifted left 8: 0110 0011 0000 0000 (bits 8-14)
OR with 0x9E: 0110 0011 1001 1110
OR with 0x8000: 1110 0011 1001 1110 = 0xE39E
```
No overflow, no bit conflicts.

### Backward Compatibility

**Maps saved with v3.2 (no routing on 0x9E):**
- Center tile has offset=0
- Picker decodes as src=0, dest=0
- No functional change, no errors

**Maps saved with Phase 72 (routing on 0x9E):**
- Center tile has routing offset
- Opened in v3.2 or earlier: offset field ignored (game uses tile position only)
- Opened in Phase 72+: routing decoded correctly

**No migration needed** — format is backward/forward compatible.

---

## Testing Strategy

### Unit Test Scenarios (Manual)

1. **Encode routing in center tile:**
   - Set Source=2, Dest=7
   - Place animated warp at (50, 50)
   - Inspect center tile (50, 50): `map.tiles[50*256 + 50]`
   - Expected: `0x8000 | (72 << 8) | 0x9E` = `0xC89E`
   - Verify: `getAnimationId() === 0x9E`, `getFrameOffset() === 72`

2. **Picker extracts routing from 0x9E:**
   - Manually create tile with routing: `makeAnimatedTile(0x9E, 45)` → src=5, dest=4
   - Place tile on map
   - Use picker on tile
   - Expected: Source dropdown shows 5, Dest dropdown shows 4

3. **Border tiles have offset=0:**
   - Place animated warp
   - Inspect border tiles (x-1, y-1), (x, y-1), (x+1, y-1), etc.
   - Expected: All have offset=0, anim IDs 0x9A-0xA2 (not 0x9E)

4. **Inspect-adjust-replace workflow:**
   - Place animated warp with src=3, dest=8
   - Pick center tile → dropdowns show 3/8
   - Change to src=1, dest=2
   - Place new animated warp
   - Pick new center → dropdowns show 1/2 ✓

### Integration Test Scenarios

1. **Warp variant toggle preserves routing:**
   - Set src=4, dest=6 in dropdowns
   - Place animated warp (variant 1)
   - Switch to single warp (variant 0)
   - Place single warp → should encode same routing (4/6)

2. **Animation offset input NOT used for warps:**
   - Set animation offset to 50
   - Set warp src=2, dest=3
   - Place animated warp
   - Expected: center tile has offset=32 (not 50)

3. **Status bar shows routing for 0x9E:**
   - Place animated warp with routing
   - Hover over center tile
   - Expected status bar: "Anim: 9E Offset: 35" (for src=5, dest=3)

---

## Risks & Mitigations

### Risk 1: Border Tile Offset Confusion

**Risk:** User expects border tiles to also encode routing (not just center)

**Mitigation:** Border tiles are purely visual decoration. Center tile (0x9E) is the functional warp. This matches SEdit behavior where only one tile per warp block has routing.

**Verification:** Check ANIMATED_WARP_PATTERN — only index 4 is 0x9E. Other indices are 0x9A-0xA2 (different anim IDs).

### Risk 2: Offset Overload (Animation vs Routing)

**Risk:** Confusion between `animationOffsetInput` (frame timing) and routing offset (src/dest)

**Mitigation:** Clear separation in code:
- `animationOffsetInput` → used for spawns, generic animated tiles
- `warpSrc/warpDest` → used for ALL warp variants (single + animated)
- Documentation and comments clarify intent

**Verification:** TypeScript types enforce separation. No shared state between offset and routing.

### Risk 3: Picker Extracts Wrong Offset

**Risk:** Picker on 0x9E tile extracts offset but doesn't decode routing

**Mitigation:** Extend conditional from `animId === 0xFA` to `animId === 0xFA || animId === 0x9E`. Single-line change.

**Verification:** Test picker on both 0xFA and 0x9E tiles with known routing values.

---

## Open Questions & Decisions Needed

### Question 1: Should border tiles receive routing offset too?

**Context:** Currently planning center tile only (index 4)

**Options:**
A. Center only (0x9E gets routing, others get offset=0)
B. All 9 tiles get same routing offset
C. Each tile gets unique offset (complex, no use case)

**Recommendation:** **Option A** — Center tile only
- Matches single-warp behavior (one tile = one warp point)
- Border tiles are visual decoration, not functional
- Reduces complexity (no offset synchronization across 9 tiles)

**Decision from v3.3:** "Same offset for all 9 tiles" was for VISUAL sync (animation timing). Routing is FUNCTIONAL, only center needs it.

### Question 2: Should animated warp still support generic offset input?

**Context:** With routing, animated warp no longer uses `animationOffsetInput`

**Options:**
A. Remove offset input support entirely (warp routing only)
B. Keep dual mode: if routing is 0/0, use offset input
C. Add UI toggle between "routing mode" and "animation mode"

**Recommendation:** **Option A** — Routing only
- Warps are gameplay objects, routing is their purpose
- Animation offset for warps is edge case (no known use)
- Simplifies UI (no mode switching)

**User can still control animation timing via Source/Dest** — offset field is effectively a 0-127 value, routing just interprets it as src/dest.

### Question 3: What if user picks border tile instead of center?

**Context:** Border tiles (0x9A-0xA2) have offset=0, not routing

**Options:**
A. Picker ignores border tiles (no routing extraction)
B. Picker extracts offset=0 → src=0, dest=0 (resets dropdowns)
C. Picker detects "this is a border tile" and shows warning

**Recommendation:** **Option B** — Extract offset=0
- Consistent behavior (all animated tiles extract offset)
- User learns quickly that only center tile has routing
- No special-case logic needed

---

## Dependencies

### Existing Code (No Changes Needed)

- `makeAnimatedTile()` — already supports offset parameter
- `getFrameOffset()` — already extracts offset from tiles
- `getAnimationId()` — already extracts animation ID
- `ANIMATED_WARP_PATTERN` — pattern is correct (center = 0x9E)
- `warpSrc/warpDest` state in globalSlice — already exists
- Warp UI dropdowns — already control routing state

### Files to Modify

1. **GameObjectSystem.ts** — signature + implementation (~10 lines)
2. **documentsSlice.ts** — dispatch logic (~1 line)
3. **MapCanvas.tsx** — picker condition (~1 line)

**Total LOC:** ~15 lines changed, 0 new files, 0 new dependencies

---

## Success Criteria Validation

### WARP-01: 9E warp tile encodes src/dest routing identical to FA encoding

**How to verify:**
1. Place animated warp with src=3, dest=7
2. Inspect center tile value: `map.tiles[y*256 + x]`
3. Decode: `animId = tile & 0xFF` → expect 0x9E
4. Decode: `offset = (tile >> 8) & 0x7F` → expect 73 (7*10 + 3)
5. Compare to 0xFA warp with same routing → offset field identical ✓

### WARP-02: 3x3 animated warp block center (9E) carries routing data when placed

**How to verify:**
1. Set Source dropdown to 5, Dest dropdown to 2
2. Select Warp tool, variant "3x3 Animated"
3. Click map at (100, 100)
4. Check center tile (100, 100): `getFrameOffset() === 25` (2*10 + 5) ✓
5. Pick center tile → Source shows 5, Dest shows 2 ✓

### Additional Success Criteria (Implicit)

**Picker decodes 0x9E routing:**
1. Place animated warp with routing
2. Pick center tile
3. Source/Dest dropdowns populate correctly ✓

**Border tiles don't carry routing:**
1. Place animated warp
2. Inspect tiles at (x-1, y-1), (x, y-1), (x+1, y-1), etc.
3. All have offset=0, not routing offset ✓

**No regression on 0xFA warps:**
1. Place single warp with routing
2. Pick warp
3. Dropdowns populate (existing behavior unchanged) ✓

---

## Related Documentation

- **Phase 68 Research:** Initial animated warp implementation (visual-only, no routing)
- **Phase 70 Research:** Animation offset control architecture (offset vs routing separation)
- **SEDIT Technical Analysis:** Warp encoding format (dest*10 + src in bits 8-14)
- **TileEncoding.ts:** Bit manipulation helpers (makeAnimatedTile, getFrameOffset)

---

## Planner Checklist

When planning Phase 72, ensure:

- [ ] All 3 files identified for changes (GameObjectSystem, documentsSlice, MapCanvas)
- [ ] Signature change to `placeAnimatedWarp(map, x, y, src, dest)` documented
- [ ] Center tile routing logic detailed (index 4, animId 0x9E check)
- [ ] Picker extension to `animId === 0xFA || animId === 0x9E` specified
- [ ] Border tile offset strategy decided (offset=0 recommended)
- [ ] Test plan includes encode/decode round-trip verification
- [ ] Requirements WARP-01 and WARP-02 explicitly traced to code changes
- [ ] No new UI components required (uses existing dropdowns)
- [ ] No new state required (uses existing warpSrc/warpDest)
- [ ] Backward compatibility validated (old maps with offset=0 work)

---

## Conclusion

Phase 72 is a **focused enhancement** that completes the warp routing system by extending it from single tiles to animated blocks. The architecture is proven (0xFA encoding works), the state exists (warpSrc/warpDest), and the UI is ready (dropdowns). Implementation requires surgical changes to 3 files (~15 LOC total).

**Key architectural insight:** Animated warp is NOT a generic animation with arbitrary offset — it's a WARP with visual flair. Routing data belongs in `warpSrc/warpDest`, not `animationOffsetInput`. This phase corrects the v3.2 implementation (which treated animated warps as decoration) to match their intended purpose (functional warps).

**Risk level: LOW** — No new patterns, no UI work, no state management changes. Only logical extension of proven encoding scheme to additional animation ID.
