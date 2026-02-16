# Phase 73: Animation Offset Extension - Research

**Researched:** 2026-02-16
**Domain:** Tile encoding, animation system, placement tools
**Confidence:** HIGH

## Summary

Phase 73 extends animation offset control from spawn/warp game objects to ALL animated tile types placed via the AnimationPanel. Currently, only spawn (0xA3-0xA6) and warp (0xFA, 0x9E) game objects respect the offset input when placed through the Warp/Spawn tools. Animated tiles placed via AnimationPanel (pencil/fill/line/rect with anim mode) currently encode offset but only by accident — the encoding happens in AnimationPanel.tsx when building the `selectedTile` value, not intentionally. This phase formalizes and extends that behavior universally.

**Primary recommendation:** This is primarily a verification/documentation phase rather than implementation. The encoding already works — AnimationPanel builds animated tiles with offset, pencil/fill/line/rect tools place them verbatim. Only gap: picker offset extraction works (Phase 70), but needs verification for non-spawn/warp animated tiles.

## Standard Stack

This phase uses existing project stack — no new libraries needed.

### Core Technologies
| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| TypeScript | 5.x | Type safety | Existing project standard |
| Zustand | 4.x | State management | GlobalSlice holds animationOffsetInput |
| Canvas API | Native | Tile rendering | Existing rendering engine |

### Key Files
| File | Purpose | Current State |
|------|---------|---------------|
| AnimationPanel.tsx | Creates animated tiles with offset | Already encodes offset in selectedTile |
| MapCanvas.tsx | Pencil/fill/line/rect placement | Places selectedTile verbatim (no modification) |
| CanvasEngine.ts | Buffer patch during drag | Uses tile value as-is (no offset stripping) |
| globalSlice.ts | animationOffsetInput state (0-127) | Already exists (Phase 70) |
| TileEncoding.ts | makeAnimatedTile(animId, offset) | Already exists (Phase 70) |

## Architecture Patterns

### Current AnimatedTile Encoding (AnimationPanel.tsx)

**Pattern:** AnimationPanel builds 16-bit tile values with offset embedded when user selects animation.

```typescript
// Source: AnimationPanel.tsx lines 255, 275, 295, 307
const animatedTile = ANIMATED_FLAG | (animationOffsetInput << 8) | animId;
setSelectedTile(animatedTile);
```

**How it works:**
1. User selects animation from AnimationPanel list → clicks animation
2. Panel switches to "anim" placement mode
3. Panel reads `animationOffsetInput` from GlobalSlice
4. Panel constructs 16-bit tile value: `0x8000 | (offset << 8) | animId`
5. Panel calls `setSelectedTile(animatedTile)` → stores in GlobalSlice
6. User uses pencil/fill/line/rect tools → tools read `selectedTile` → place verbatim

**Key insight:** The offset is baked into `selectedTile` at selection time, NOT at placement time. This means:
- ✅ Pencil/fill/line/rect already place animated tiles with offset (no code change needed)
- ✅ Changing offset input updates `selectedTile` immediately (line 295-296)
- ✅ Multi-tile stamps from AnimationPanel would need special handling (not currently supported)

### Offset Extraction (Picker Tool)

**Pattern:** Picker extracts offset from ANY animated tile and syncs to GlobalSlice.

```typescript
// Source: MapCanvas.tsx lines 1958-1970 (Phase 70)
if (isAnimatedTile(pickedTile)) {
  const offset = getFrameOffset(pickedTile);
  setAnimationOffsetInput(offset);

  // Special case: warp routing decode (Phase 72)
  const animId = getAnimationId(pickedTile);
  if (animId === 0xFA || animId === 0x9E) {
    const warpSrc = offset % 10;
    const warpDest = Math.floor(offset / 10);
    setWarpSettings(warpSrc, warpDest, currentWarpStyle);
  }
}
```

**How it works:**
1. User picks ANY animated tile (spawn, warp, or generic animation)
2. Picker extracts offset using `getFrameOffset()` (bits 8-14)
3. Picker updates `animationOffsetInput` in GlobalSlice
4. If warp tile (0xFA/0x9E), also decodes routing and updates warp dropdowns
5. User can now place tiles with extracted offset

**Already works for:** All animated tile types (no special-casing by animId)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile encoding | Manual bit shifting | `makeAnimatedTile(animId, offset)` | Already exists in TileEncoding.ts, handles bit masking correctly |
| Offset extraction | Manual bit masking | `getFrameOffset(tile)` | Already exists in TileEncoding.ts, consistent with encoding |
| Offset validation | Ad-hoc clamping | `setAnimationOffsetInput(offset)` | GlobalSlice setter already clamps to 0-127 range |

## Common Pitfalls

### Pitfall 1: Assuming Offset Needs to be Re-Applied at Placement Time
**What goes wrong:** Developer thinks pencil/fill/line/rect tools need to call `makeAnimatedTile()` during placement.
**Why it happens:** Misunderstanding the data flow — `selectedTile` already contains encoded offset.
**How to avoid:** Understand that AnimationPanel pre-encodes offset when building `selectedTile`. Placement tools receive complete 16-bit value.
**Warning signs:** Code calling `makeAnimatedTile()` in MapCanvas.tsx or CanvasEngine.ts for pencil/fill/line/rect.

### Pitfall 2: Confusing animationOffsetInput with Warp Routing
**What goes wrong:** Mixing animation offset (generic, for all animations) with warp routing offset (specific to 0xFA/0x9E).
**Why it happens:** Both use the same bit field (bits 8-14), but serve different purposes.
**How to avoid:**
- `animationOffsetInput`: User-controlled offset for generic animated tiles (visual desync)
- Warp routing: Computed from `warpSrc` and `warpDest` (gameplay data)
- Picker extracts offset from both and handles appropriately (Phase 70 established this)
**Warning signs:** Code using `animationOffsetInput` for warp placement instead of `warpSrc/warpDest`.

### Pitfall 3: Not Updating selectedTile When Offset Changes
**What goes wrong:** User changes offset input, but previously selected animation doesn't update.
**Why it happens:** Forgetting to rebuild `selectedTile` when offset changes.
**How to avoid:** AnimationPanel line 295-296 already handles this — when offset changes, if in anim mode, rebuild `selectedTile`.
**Warning signs:** Changing offset input doesn't affect next placement.

## Code Examples

Verified patterns from existing codebase:

### Encoding Animated Tile with Offset (AnimationPanel)
```typescript
// Source: AnimationPanel.tsx line 255
// When user selects animation, encode offset immediately
const animatedTile = ANIMATED_FLAG | (animationOffsetInput << 8) | animId;
setSelectedTile(animatedTile);
```

### Updating Tile When Offset Changes
```typescript
// Source: AnimationPanel.tsx line 291-298
const handleOffsetChange = (value: string) => {
  const num = parseInt(value, 10);
  if (value === '' || isNaN(num) || num < 0 || num > 127) {
    setOffsetError(true);
    return;
  }
  setOffsetError(false);
  setAnimationOffsetInput(num); // GlobalSlice setter clamps to 0-127

  // Update selectedTile if in anim mode
  if (placementMode === 'anim' && selectedAnimId !== null) {
    const anim = ANIMATION_DEFINITIONS[selectedAnimId];
    if (anim && anim.frames.length > 0) {
      const animatedTile = ANIMATED_FLAG | (num << 8) | selectedAnimId;
      setSelectedTile(animatedTile); // Rebuild with new offset
    }
  }
};
```

### Extracting Offset from Any Animated Tile (Picker)
```typescript
// Source: MapCanvas.tsx line 1958-1961
if (isAnimatedTile(pickedTile)) {
  const offset = getFrameOffset(pickedTile);
  setAnimationOffsetInput(offset); // Works for ALL animated tiles

  // ... special warp decode omitted for clarity
}
```

### Placing Animated Tile (Pencil Tool)
```typescript
// Source: MapCanvas.tsx line 219, CanvasEngine.ts line 376
// Pencil tool places selectedTile verbatim (offset already encoded)
engine.paintTile(x, y, selectedTile);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Offset only for spawn/warp game objects | Offset for all animated tiles placed via AnimationPanel | Phase 73 | Users can now control animation sync for ANY animated tile |
| Picker only synced offset for spawn/warp | Picker syncs offset for all animated tiles | Phase 70 (already done) | Inspect-adjust-replace workflow universal |
| Manual encoding in game object systems | Pre-encoded in AnimationPanel, placement tools agnostic | Phase 73 discovery | Cleaner separation: selection encodes, placement places |

## Open Questions

### 1. Multi-tile AnimatedTile Stamps
**What we know:** AnimationPanel currently only supports single-tile animated placement (width=1, height=1)
**What's unclear:** Should users be able to select multiple animated tiles from the AnimationPanel and stamp them as a region?
**Recommendation:** Out of scope for Phase 73. Current single-tile workflow is sufficient. Multi-tile would require:
- AnimationPanel supporting drag-selection (like TilesetPanel)
- Encoding offset into each selected animation independently
- Handling mixed static/animated selections

### 2. Offset Display for Generic Animations
**What we know:** Status bar shows offset for warp tiles (warp routing display)
**What's unclear:** Should status bar show offset for non-warp animated tiles?
**Recommendation:** Low priority. Status bar already shows tile value (hex), which includes encoded offset. Power users can decode manually. Could be future enhancement.

### 3. Offset Persistence in Map Files
**What we know:** Map files store 16-bit tile values (offset included in bits 8-14)
**What's unclear:** Nothing — this already works. Map save/load preserves offset because it's part of tile encoding.
**Recommendation:** No action needed. Existing serialization handles this correctly.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** (2026-02-16):
  - `src/components/AnimationPanel/AnimationPanel.tsx` — offset encoding at selection
  - `src/components/MapCanvas/MapCanvas.tsx` — picker offset extraction (Phase 70)
  - `src/core/editor/slices/globalSlice.ts` — animationOffsetInput state
  - `src/core/map/TileEncoding.ts` — makeAnimatedTile, getFrameOffset utilities
  - `src/core/canvas/CanvasEngine.ts` — paintTile placement (verbatim)

- **Phase verification documents**:
  - `.planning/phases/70-animation-offset-control/70-VERIFICATION.md` — offset control implementation
  - `.planning/phases/72-9e-warp-routing/72-RESEARCH.md` — warp routing vs animation offset separation

### Secondary (MEDIUM confidence)
- **Project memory** (`MEMORY.md`):
  - v3.3 completion notes: offset in GlobalSlice, warp routing separate from animation offset
  - v2.8 drag pattern: ref-based state, imperative buffer patch, batch Zustand commit

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing project stack, no new libraries
- Architecture: HIGH — code inspection confirms encoding flow
- Pitfalls: HIGH — based on actual codebase patterns and prior phases

**Research date:** 2026-02-16
**Valid until:** 2026-03-18 (30 days — stable domain, no external dependencies)

## Key Findings for Planner

### What Already Works
1. ✅ AnimationPanel encodes offset into `selectedTile` at selection time (lines 255, 275, 295, 307)
2. ✅ Pencil/fill/line/rect tools place `selectedTile` verbatim (no offset stripping)
3. ✅ Picker extracts offset from ALL animated tiles and syncs to GlobalSlice (Phase 70)
4. ✅ Changing offset input rebuilds `selectedTile` if in anim mode (line 295-296)
5. ✅ GlobalSlice clamps offset to 0-127 range (line 307)
6. ✅ Map save/load preserves offset (part of 16-bit tile encoding)

### What Needs Verification
1. ❓ Does picker extraction work correctly for non-spawn/warp animations? (Code suggests yes, but not explicitly tested)
2. ❓ Does status bar show offset info for generic animated tiles? (Or only for warps?)
3. ❓ Are there any edge cases where `selectedTile` offset gets stripped?

### Implementation Guidance
**This is primarily a VERIFICATION phase, not an implementation phase.**

The planner should focus on:
1. **Testing existing behavior** — verify offset works for all 256 animation types
2. **Documentation** — confirm REQUIREMENTS.md reflects actual behavior
3. **Edge case verification** — test picker, placement, save/load for non-spawn/warp animations
4. **Minimal code changes** — only fix if bugs found, avoid refactoring working code

**No major architectural changes expected.**
