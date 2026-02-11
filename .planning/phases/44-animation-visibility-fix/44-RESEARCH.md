# Phase 44: Animation Visibility Fix - Research

**Researched:** 2026-02-11
**Domain:** Canvas rendering, viewport coordinate systems, animation rendering
**Confidence:** HIGH

## Summary

Animation visibility is broken because `hasVisibleAnimatedTiles()` in AnimationPanel.tsx treats viewport coordinates as pixels instead of tiles. The viewport stores tile coordinates (viewport.x = 50 means "50 tiles from left"), but the bug divides by `(TILE_SIZE * zoom)` as if converting pixels to tiles. This math accidentally works at extreme zoom-out (0.25x) where the tile ranges are huge, but fails at normal zoom levels (1x-4x).

The fix is a one-line coordinate system correction. No new dependencies, no architectural changes. The 4-layer canvas architecture from Phase 22 is correct and performant. The animation loop (Phase 37) is correct. Only the viewport bounds calculation in `hasVisibleAnimatedTiles()` is wrong.

**Primary recommendation:** Replace the pixel-to-tile conversion in AnimationPanel.tsx lines 55-58 with the correct tile-based calculation pattern from MapCanvas.tsx getVisibleTiles() (lines 148-151).

## Bug Analysis

### Root Cause: Coordinate System Confusion

**What's broken:**
```typescript
// AnimationPanel.tsx line 55-58 (WRONG - treats viewport.x as pixels)
const startX = Math.max(0, Math.floor(viewport.x / (TILE_SIZE * viewport.zoom)));
const startY = Math.max(0, Math.floor(viewport.y / (TILE_SIZE * viewport.zoom)));
const endX = Math.min(MAP_SIZE, Math.ceil((viewport.x + window.innerWidth) / (TILE_SIZE * viewport.zoom)));
const endY = Math.min(MAP_SIZE, Math.ceil((viewport.y + window.innerHeight) / (TILE_SIZE * viewport.zoom)));
```

**Why it's wrong:**
- Viewport stores TILE coordinates: `viewport.x = 50` means "50 tiles from left edge"
- Type definition at `src/core/editor/slices/types.ts:11-15` confirms this
- Division by `(TILE_SIZE * viewport.zoom)` assumes viewport.x is in pixels
- This converts "tile 50" into "tile 3.125" at 1x zoom (50 / (16 * 1) = 3.125)
- Result: Animation loop thinks no animated tiles are visible, stops animating

**Why it works at 0.25x zoom:**
- At 0.25x zoom, the math is: `viewport.x / (16 * 0.25) = viewport.x / 4`
- If viewport.x = 50, result is 12.5 (close to correct value of 50)
- Large tile ranges at low zoom mask the error (checking tiles 12-70 instead of 50-108)
- Animated tiles in the ACTUAL viewport get checked by accident

**Correct implementation:**
```typescript
// MapCanvas.tsx line 148-151 (CORRECT - viewport.x is already in tiles)
startX: Math.floor(viewport.x),
startY: Math.floor(viewport.y),
endX: Math.min(MAP_WIDTH, Math.floor(viewport.x) + tilesX),
endY: Math.min(MAP_HEIGHT, Math.floor(viewport.y) + tilesY)
```

### Why Testing Missed This

1. **Casual testing at 0.25x zoom** - Bug is masked at extreme zoom-out
2. **Animations play in AnimationPanel preview** - Local preview always works, hides map canvas issue
3. **No unit tests for viewport coordinate conversion** - Coordinate confusion went undetected

## Standard Stack

### Core (NO NEW DEPENDENCIES)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Existing Canvas API** | Browser built-in | 4-layer rendering | Phase 22 architecture is correct, no changes needed |
| **Existing Zustand** | 5.0.3 (current) | Animation frame counter | Working correctly, no changes needed |
| **Existing requestAnimationFrame** | Browser built-in | Animation timing | Phase 37 implementation is correct |

### No Installation Required

```bash
# This phase requires ZERO new dependencies
# Fix is a coordinate system correction in AnimationPanel.tsx
```

## Architecture Patterns

### Current Animation Architecture (Correct, No Changes)

**Phase 22: 4-Layer Canvas System** (Lines from Phase 22-02-SUMMARY.md):
- Layer 1 (Static): Non-animated tiles + frame 0 of animated tiles (background)
- Layer 2 (Animated): Animated tiles only, redraws on animationFrame change
- Layer 3 (Overlay): Cursor, selection, tool previews
- Layer 4 (Grid): Grid lines when enabled

**Phase 37: Conditional Animation Loop** (AnimationPanel.tsx lines 90-110):
- RAF loop with delta time accumulation (150ms per frame)
- Pauses when tab hidden (Page Visibility API)
- Calls `advanceAnimationFrame()` which increments global counter
- Only animates when `hasVisibleAnimatedTiles()` returns true

**This architecture is CORRECT.** Only `hasVisibleAnimatedTiles()` has the coordinate bug.

### Pattern: Viewport Coordinate Conversion

**When viewport is in TILE coordinates** (current system):

```typescript
// ✅ CORRECT: Calculate visible tile range
const getVisibleTiles = () => {
  const tilePixels = TILE_SIZE * viewport.zoom;
  const tilesX = Math.ceil(canvasWidth / tilePixels) + 1;
  const tilesY = Math.ceil(canvasHeight / tilePixels) + 1;

  return {
    startX: Math.floor(viewport.x),  // Already in tiles
    startY: Math.floor(viewport.y),
    endX: Math.min(MAP_WIDTH, Math.floor(viewport.x) + tilesX),
    endY: Math.min(MAP_HEIGHT, Math.floor(viewport.y) + tilesY)
  };
};

// ✅ CORRECT: Convert tile coords to screen pixels
const tileToScreen = (tileX: number, tileY: number) => {
  const tilePixels = TILE_SIZE * viewport.zoom;
  return {
    x: (tileX - viewport.x) * tilePixels,
    y: (tileY - viewport.y) * tilePixels
  };
};

// ❌ WRONG: Treating viewport as pixels
const startX = Math.floor(viewport.x / (TILE_SIZE * viewport.zoom)); // Divides tiles by pixels
```

**Reference implementation:** `MapCanvas.tsx` lines 139-153 (getVisibleTiles) and 156-162 (tileToScreen)

### Anti-Pattern: Inline Coordinate Math

**Problem:** Developers write inline pixel-to-tile conversion without checking if viewport is already in tiles.

**Solution:** Always copy coordinate math from proven working code (MapCanvas.getVisibleTiles). If adding viewport-dependent features, use the conversion functions explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport bounds calculation | Custom math with divisions | Copy pattern from MapCanvas.getVisibleTiles() | Coordinate system is tile-based, not pixel-based. Proven pattern exists. |
| Canvas width/height calculation | window.innerWidth/Height | canvas.width / canvas.height | Canvas size may differ from window (panels, sidebars reduce available space) |

## Common Pitfalls

### Pitfall 1: Coordinate System Confusion (Pixels vs Tiles)

**What goes wrong:** Viewport bounds calculations treat tile coordinates as pixel coordinates, causing features to only work at specific zoom levels.

**Why it happens:** viewport.x storing tile coordinates is counter-intuitive. Developers instinctively think in pixels and add conversion math. At extreme zoom levels (0.25x), the incorrect math accidentally produces reasonable ranges that overlap the correct viewport.

**How to avoid:**
1. Read the Viewport type definition at `src/core/editor/slices/types.ts:11-15` - confirms tile coordinates
2. Copy coordinate math from MapCanvas.getVisibleTiles() (lines 139-153) - proven correct
3. Test at multiple zoom levels (0.25x, 1x, 2x, 4x) - coordinate bugs reveal themselves
4. Write unit tests comparing against MapCanvas.getVisibleTiles() output

**Warning signs:**
- Feature works at 0.25x zoom but not 1x zoom
- Math divides viewport.x by `(TILE_SIZE * zoom)` instead of using viewport.x directly
- Visible tile ranges differ from MapCanvas.getVisibleTiles() output at same viewport

**References:**
- Viewport type definition: `src/core/editor/slices/types.ts:11-15`
- Correct pattern: `MapCanvas.tsx:139-153` (getVisibleTiles)
- Broken pattern: `AnimationPanel.tsx:55-58` (hasVisibleAnimatedTiles)
- Domain pitfalls doc: `.planning/research/VIEWPORT-PITFALLS.md` lines 9-49

### Pitfall 2: Using window.innerWidth Instead of Canvas Width

**What goes wrong:** Visible tile calculation uses `window.innerWidth` instead of actual canvas dimensions, overestimating viewport width because it doesn't account for sidebars.

**Why it happens:** AnimationPanel.tsx line 57 uses `viewport.x + window.innerWidth` to calculate endX. MapCanvas is smaller than window due to left sidebar (AnimationPanel), right sidebar (TilesetPanel), and bottom panel.

**How to avoid:**
1. Use canvas.width from the actual canvas element (MapCanvas has 4 canvas refs)
2. Or calculate visible tiles based on viewport zoom and canvas dimensions
3. MapCanvas.getVisibleTiles() correctly uses `canvas.width / tilePixels`

**Warning signs:**
- Animation loop runs when no animated tiles are visible in canvas
- `hasVisibleAnimatedTiles()` returns true but MapCanvas shows no animated tiles
- Performance: Unnecessary animation loop iterations

**Impact for Phase 44:** MEDIUM - Causes animations to continue when viewport is panned off all animated tiles but window still overlaps them. Not a visibility bug, but a performance issue (violates success criteria #4: "No unnecessary canvas redraws when viewport contains zero animated tiles").

### Pitfall 3: Not Testing at Multiple Zoom Levels

**What goes wrong:** Tests only run at 1x zoom or 0.25x zoom. Coordinate bugs that scale with zoom are missed.

**How to avoid:**
1. Test matrix: Place animated tile at (128, 128), verify visibility at 0.25x, 1x, 2x, 4x zoom
2. Unit test: Compare `hasVisibleAnimatedTiles()` output with MapCanvas.getVisibleTiles() at all zoom levels
3. Edge cases: Animated tile at viewport edge, partially visible, fully off-screen

**Warning signs:**
- Bug reports: "Animations work sometimes but not always"
- QA testing only at default 1x zoom
- No regression tests for coordinate conversion

## Code Examples

### Example 1: Correct Visible Tiles Calculation (MapCanvas.tsx)

```typescript
// Source: MapCanvas.tsx lines 139-153
const getVisibleTiles = useCallback(() => {
  const canvas = gridLayerRef.current;
  if (!canvas) return { startX: 0, startY: 0, endX: 20, endY: 20 };

  const tilePixels = TILE_SIZE * viewport.zoom;
  const tilesX = Math.ceil(canvas.width / tilePixels) + 1;
  const tilesY = Math.ceil(canvas.height / tilePixels) + 1;

  return {
    startX: Math.floor(viewport.x),  // viewport.x is already in tiles
    startY: Math.floor(viewport.y),
    endX: Math.min(MAP_WIDTH, Math.floor(viewport.x) + tilesX),
    endY: Math.min(MAP_HEIGHT, Math.floor(viewport.y) + tilesY)
  };
}, [viewport]);
```

**Why it's correct:**
- viewport.x is already in tile coordinates (no division needed)
- Uses canvas.width (actual canvas size, not window size)
- Adds buffer (+1) to handle partially visible tiles

### Example 2: Broken Visible Tiles Calculation (AnimationPanel.tsx)

```typescript
// Source: AnimationPanel.tsx lines 55-58 (BROKEN)
const startX = Math.max(0, Math.floor(viewport.x / (TILE_SIZE * viewport.zoom)));
const startY = Math.max(0, Math.floor(viewport.y / (TILE_SIZE * viewport.zoom)));
const endX = Math.min(MAP_SIZE, Math.ceil((viewport.x + window.innerWidth) / (TILE_SIZE * viewport.zoom)));
const endY = Math.min(MAP_SIZE, Math.ceil((viewport.y + window.innerHeight) / (TILE_SIZE * viewport.zoom)));
```

**Why it's broken:**
- Divides viewport.x by `(TILE_SIZE * zoom)` as if converting pixels to tiles
- viewport.x is already in tiles, so this divides "tile 50" by "16 pixels/tile * 1x" = 3.125 tiles
- Uses window.innerWidth instead of canvas.width (overestimates visible area)
- Works accidentally at 0.25x zoom where division result is close to correct value

### Example 3: Fixed Visible Tiles Calculation (Phase 44 Target)

```typescript
// Target fix for AnimationPanel.tsx hasVisibleAnimatedTiles()
const hasVisibleAnimatedTiles = useCallback((): boolean => {
  const MAP_SIZE = 256;
  const TILE_SIZE = 16;

  for (const [, doc] of documents) {
    if (!doc.map) continue;

    const { viewport } = doc;

    // Calculate visible tiles (canvas dimensions unknown from AnimationPanel)
    // Conservative estimate: assume canvas is 800x600 (safe overestimate)
    const canvasWidth = 800;   // Or get from store if available
    const canvasHeight = 600;

    const tilePixels = TILE_SIZE * viewport.zoom;
    const tilesX = Math.ceil(canvasWidth / tilePixels) + 1;
    const tilesY = Math.ceil(canvasHeight / tilePixels) + 1;

    // ✅ CORRECT: viewport.x is already in tiles
    const startX = Math.max(0, Math.floor(viewport.x));
    const startY = Math.max(0, Math.floor(viewport.y));
    const endX = Math.min(MAP_SIZE, Math.floor(viewport.x) + tilesX);
    const endY = Math.min(MAP_SIZE, Math.floor(viewport.y) + tilesY);

    // Check visible tiles for animated flag
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = doc.map.tiles[y * MAP_SIZE + x];
        if (tile & ANIMATED_FLAG) {
          return true;
        }
      }
    }
  }

  return false;
}, [documents]);
```

**Alternative: Store canvas dimensions in Zustand** (more accurate than hardcoded estimate):
```typescript
// In documentsSlice.ts
export interface Document {
  // ... existing fields
  canvasWidth: number;   // Updated on canvas resize
  canvasHeight: number;
}

// In MapCanvas.tsx resize handler
const handleResize = () => {
  const canvas = gridLayerRef.current;
  if (canvas) {
    setCanvasDimensions(canvas.width, canvas.height); // New Zustand action
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single canvas with full redraw | 4-layer canvas with independent triggers | Phase 22 (2026-02-05) | Massive performance improvement, enables granular updates |
| Always-running animation loop | Conditional loop with visibility check | Phase 37 (2026-02-09) | Pauses animations when tab hidden or no animated tiles visible |
| Per-component RAF timers | Single animation timer in AnimationPanel | Phase 22-02 (2026-02-05) | Fixed double-tick animation speed bug |

**Deprecated/outdated:**
- **Monolithic canvas rendering** - Replaced by 4-layer system in Phase 22
- **Pixel-based viewport coordinates** - Never existed, but developers assume pixels (source of confusion)

## Open Questions

1. **Should canvas dimensions be stored in Zustand?**
   - What we know: AnimationPanel needs canvas dimensions to calculate visible tiles accurately. Currently uses window.innerWidth (wrong). MapCanvas has correct dimensions in refs.
   - What's unclear: Should we add canvasWidth/canvasHeight to Document state, or use a conservative hardcoded estimate in AnimationPanel?
   - Recommendation: Start with conservative estimate (800x600). If success criteria #4 fails (unnecessary redraws), add canvas dimensions to state in gap closure.

2. **Should getVisibleTiles be extracted to a shared utility?**
   - What we know: Same calculation needed in MapCanvas and AnimationPanel. Currently duplicated code with different bugs.
   - What's unclear: Where to put shared utility? `src/core/map/utils.ts`? Or keep localized?
   - Recommendation: Fix AnimationPanel first (copy pattern), extract to utility if needed by third component. Avoid premature abstraction.

## Verification Checklist

Phase 44 success criteria mapped to verification steps:

1. **"User places animated tile at viewport center at 1x zoom and sees animation playing"**
   - Place animated tile at (128, 128)
   - Set viewport to { x: 120, y: 120, zoom: 1 } (tile is at center)
   - Verify animation plays (animationFrame counter increments, tile renders different frames)

2. **"User zooms to 0.25x (full map visible) and all animated tiles continue animating"**
   - Place 4 animated tiles at corners: (10, 10), (240, 10), (10, 240), (240, 240)
   - Set zoom to 0.25x, viewport to { x: 0, y: 0, zoom: 0.25 }
   - Verify all 4 tiles animate (counter increments, all render different frames)

3. **"User zooms to 4x (close-up) and animated tiles render without artifacts"**
   - Place animated tile at (128, 128)
   - Set zoom to 4x, viewport to { x: 126, y: 126, zoom: 4 } (tile fills screen)
   - Verify animation plays smoothly, no tearing/flickering, pixels scale correctly

4. **"No unnecessary canvas redraws when viewport contains zero animated tiles"**
   - Place animated tile at (10, 10)
   - Set viewport to { x: 200, y: 200, zoom: 1 } (tile is off-screen)
   - Verify `hasVisibleAnimatedTiles()` returns false
   - Verify animationFrame counter does NOT increment
   - Verify drawAnimLayer NOT called (Layer 2 not redrawn)

## Sources

### Primary (HIGH confidence)

- **Viewport type definition** - `src/core/editor/slices/types.ts:11-15` - Confirms tile coordinates
- **MapCanvas.getVisibleTiles()** - `src/components/MapCanvas/MapCanvas.tsx:139-153` - Proven correct pattern
- **MapCanvas.tileToScreen()** - `src/components/MapCanvas/MapCanvas.tsx:156-162` - Tile-to-pixel conversion
- **AnimationPanel.hasVisibleAnimatedTiles()** - `src/components/AnimationPanel/AnimationPanel.tsx:44-72` - Contains coordinate bug
- **Phase 22 architecture** - `.planning/phases/22-canvas-rendering-optimization/22-CONTEXT.md` - 4-layer canvas system
- **Phase 22 summary** - `.planning/phases/22-canvas-rendering-optimization/22-02-SUMMARY.md` - Animation timer ownership
- **Domain pitfalls** - `.planning/research/VIEWPORT-PITFALLS.md` - Coordinate system confusion documented

### Secondary (MEDIUM confidence)

- **Viewport stack research** - `.planning/research/VIEWPORT-STACK.md` - Zero new dependencies confirmed

### Tertiary (LOW confidence)

None - all findings based on direct codebase inspection and existing project documentation.

## Metadata

**Confidence breakdown:**
- Bug root cause: HIGH - Direct code inspection confirms coordinate system confusion
- Fix approach: HIGH - Proven pattern exists in MapCanvas.getVisibleTiles()
- Architecture correctness: HIGH - Phase 22 and 37 implementations are correct
- Canvas dimensions issue: MEDIUM - Minor gap (using window.innerWidth vs canvas.width)

**Research date:** 2026-02-11
**Valid until:** 60 days (stable domain - viewport coordinate system won't change)

---

*Phase: 44-animation-visibility-fix*
*Researched: 2026-02-11*
