# Phase 50: Buffer Zone Over-Rendering - Research

**Researched:** 2026-02-12
**Domain:** Canvas tile map rendering with buffer zone pre-rendering
**Confidence:** HIGH

## Summary

Buffer zone over-rendering is a proven technique for smooth tile map panning. Instead of rendering only the exact visible tiles in the viewport, the renderer expands the visible range by 3-4 tiles in each direction (a "buffer zone"). During pan drag, these pre-rendered buffer tiles slide into view without requiring immediate re-render, reducing the frequency of expensive full-screen redraws.

The current architecture (Phase 49) uses a 4096x4096 off-screen buffer that renders the entire map with incremental tile patching. This is already a form of extreme over-rendering (256x256 tiles = entire map always buffered). Phase 50 refines this by rendering ONLY the visible area + buffer margin to the off-screen canvas, reducing the initial render cost while still providing smooth pan.

**Primary recommendation:** Expand visible tile range calculation by 3-4 tiles in each direction, render expanded range to off-screen buffer, then blit visible portion to screen canvas. This reduces render from 65,536 tiles (full map) to ~400 tiles (viewport + buffer) while maintaining smooth pan.

## Standard Stack

### Core (NO NEW DEPENDENCIES)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Existing Canvas API** | Browser built-in | Off-screen buffer rendering | Standard approach for tile-based games. createImageBitmap + off-screen canvas already in use from Phase 49. |
| **Existing React/Zustand** | Current versions | Viewport state management | No changes needed. viewport.x/y/zoom already correct. |
| **Existing requestAnimationFrame** | Browser built-in | Progressive render during pan | Already implemented in Phase 48 with RAF-debounced progressive rendering. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | N/A | No supporting libraries needed | All functionality already available in current stack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Off-screen canvas buffer** | Direct drawImage from tileset per frame | Real-time tile blitting is too slow (65K tiles at 60fps = impossible). Buffer approach proven correct. |
| **3-4 tile buffer margin** | Render entire map to buffer (current v2.7) | Current approach wastes memory/CPU on initial render. 256x256 tiles = 4096x4096px buffer is overkill when viewport is typically 30x20 tiles. |
| **3-4 tile buffer margin** | No buffer (render exact viewport only) | Every pan movement triggers full redraw. Choppy UX. Buffer zone smooths pan by pre-rendering tiles about to enter view. |

**Installation:**
```bash
# NO INSTALLATION REQUIRED
# All required APIs already in use from Phases 48-49
```

## Architecture Patterns

### Recommended Approach: Visible Range + Buffer Margin

**Current implementation (Phase 49):**
```typescript
// Lines 724-729: Animation tick visible range (correct pattern)
const tilesX = Math.ceil(canvas.width / tilePixels) + 1;
const tilesY = Math.ceil(canvas.height / tilePixels) + 1;
const startX = Math.floor(vp.x);
const startY = Math.floor(vp.y);
const endX = Math.min(MAP_WIDTH, startX + tilesX);
const endY = Math.min(MAP_HEIGHT, startY + tilesY);
```

This calculates the EXACT visible range for animated tile patching. It's correct for partial updates but doesn't include buffer margin.

**Phase 50 target pattern:**
```typescript
// Expanded range for buffer zone rendering
const BUFFER_MARGIN = 3; // tiles in each direction

const tilesX = Math.ceil(canvas.width / tilePixels) + 1;
const tilesY = Math.ceil(canvas.height / tilePixels) + 1;

// Add buffer margin (clamp to map bounds)
const startX = Math.max(0, Math.floor(vp.x) - BUFFER_MARGIN);
const startY = Math.max(0, Math.floor(vp.y) - BUFFER_MARGIN);
const endX = Math.min(MAP_WIDTH, Math.floor(vp.x) + tilesX + BUFFER_MARGIN);
const endY = Math.min(MAP_HEIGHT, Math.floor(vp.y) + tilesY + BUFFER_MARGIN);

const bufferWidth = (endX - startX) * TILE_SIZE;
const bufferHeight = (endY - startY) * TILE_SIZE;
```

**Key differences from current full-map buffer:**
1. **Buffer size:** Dynamic based on viewport + margin instead of fixed 4096x4096
2. **Buffer origin:** Tracks viewport position instead of anchored at (0, 0)
3. **Tile coordinates:** Relative to buffer origin instead of absolute map coordinates

### Pattern 1: Dynamic Buffer Sizing

**What:** Off-screen buffer canvas size changes with viewport size and zoom level, not fixed at map size.

**When to use:** Always. Viewport size varies with window size and zoom level. Buffer should scale accordingly.

**Example:**
```typescript
// From MDN Tilemap Optimization guide
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas

// Better approach: 2x2 tiles bigger than visible area
const bufferTilesX = Math.ceil(canvas.width / tilePixels) + 4; // +2 tiles on each side
const bufferTilesY = Math.ceil(canvas.height / tilePixels) + 4;

if (!mapBufferRef.current ||
    mapBufferRef.current.width !== bufferTilesX * TILE_SIZE ||
    mapBufferRef.current.height !== bufferTilesY * TILE_SIZE) {

  // Recreate buffer with new size
  const buf = document.createElement('canvas');
  buf.width = bufferTilesX * TILE_SIZE;
  buf.height = bufferTilesY * TILE_SIZE;
  mapBufferRef.current = buf;
  // Force full redraw
  prevTilesRef.current = null;
}
```

### Pattern 2: Buffer Origin Tracking

**What:** Track which map region is currently buffered, so blit operation knows source offset.

**When to use:** When buffer doesn't cover entire map. Need to know "where in the map" the buffer represents.

**Example:**
```typescript
interface BufferState {
  canvas: HTMLCanvasElement;
  startX: number;  // Map tile coordinates of buffer's top-left corner
  startY: number;
  endX: number;    // Map tile coordinates of buffer's bottom-right corner
  endY: number;
}

const bufferStateRef = useRef<BufferState | null>(null);

// During blit to screen:
const buffer = bufferStateRef.current;
if (buffer) {
  // Source coordinates in buffer space (relative to buffer origin)
  const srcX = (vp.x - buffer.startX) * TILE_SIZE;
  const srcY = (vp.y - buffer.startY) * TILE_SIZE;
  const srcW = canvas.width / vp.zoom;
  const srcH = canvas.height / vp.zoom;

  ctx.drawImage(buffer.canvas, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
}
```

### Pattern 3: Invalidation on Viewport Change

**What:** Detect when viewport has panned far enough that buffer needs full redraw (not just tile patching).

**When to use:** After pan drag completes. If viewport moved > BUFFER_MARGIN tiles, buffer is stale.

**Example:**
```typescript
// Check if current viewport is still within buffered region
function isViewportInBuffer(vp: Viewport, buffer: BufferState, margin: number): boolean {
  const vpStartX = Math.floor(vp.x);
  const vpStartY = Math.floor(vp.y);

  // Check if viewport edges are within buffer bounds minus safety margin
  return vpStartX >= buffer.startX + margin &&
         vpStartY >= buffer.startY + margin &&
         vpStartX + tilesX <= buffer.endX - margin &&
         vpStartY + tilesY <= buffer.endY - margin;
}

// In drawMapLayer:
if (!bufferStateRef.current || !isViewportInBuffer(vp, bufferStateRef.current, 1)) {
  // Viewport outside buffer - full redraw needed
  rebuildBuffer(vp);
} else {
  // Viewport within buffer - just patch changed tiles
  patchChangedTiles();
}
```

### Anti-Patterns to Avoid

- **Anti-pattern 1: Fixed buffer offset from (0, 0):** Wastes memory rendering map regions never visible. Current Phase 49 implementation does this (4096x4096 buffer always starts at map origin).
- **Anti-pattern 2: Per-frame buffer resize:** Creating new canvas every render is expensive (allocates GPU resources). Only resize when viewport size changes significantly.
- **Anti-pattern 3: Tile-by-tile buffer updates during pan:** Updating buffer while panning causes stutter. Use CSS transform for instant feedback, update buffer after pan completes.
- **Anti-pattern 4: Synchronous buffer rebuild:** Large buffer redraws (400+ tiles) can drop frames. Use progressive rendering or RAF chunking for buffer rebuilds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Viewport-to-tile conversion** | Manual viewport math every time | Existing `screenToTile()` helper (line 762) | Already handles zoom, fractional coords, bounds. Don't duplicate. |
| **Visible tile range calculation** | Custom loop range logic | Copy pattern from animation tick (lines 724-729) | Proven correct across all zoom levels (0.25x to 4x). |
| **Buffer invalidation detection** | Flag-based dirty tracking | Existing `prevTilesRef` diff pattern (lines 261-270) | Already detects changed tiles. Extend to viewport bounds check. |
| **Progressive rendering** | Custom RAF loop | Existing `requestProgressiveRender()` (lines 628-655) | Already implements RAF debouncing + stale closure prevention via refs. |

**Key insight:** Phase 50 is NOT a new system - it's a refinement of Phase 49's buffer approach. Don't replace; extend. Keep incremental tile patching, keep RAF progressive render. Only change: buffer size/origin calculation.

## Common Pitfalls

### Pitfall 1: Off-by-One in Buffer Bounds

**What goes wrong:** Buffer margin calculation includes fractional tiles incorrectly. Example: viewport.x = 10.7, buffer margin = 3 → startX should be 7 (floor(10.7) - 3), but naive code does 10.7 - 3 = 7.7 → floor(7.7) = 7. Works by accident. When viewport.x = 10.3, naive math gives 7.3 → floor(7.3) = 7. Still works. But when blitting, fractional math causes 1px shifts.

**Why it happens:** Viewport stores fractional tile coords for smooth sub-pixel panning. Buffer bounds must use integer tile coords. Mixing fractional and integer math causes alignment issues.

**Consequences:**
- Tiles "shimmer" or shift 1px during pan
- Grid lines don't align with tile boundaries
- Blit operation reads wrong buffer region (off by <1 tile)

**Prevention:**
```typescript
// WRONG (fractional):
const startX = vp.x - BUFFER_MARGIN; // 10.7 - 3 = 7.7

// CORRECT (integer tile coords):
const startX = Math.floor(vp.x) - BUFFER_MARGIN; // floor(10.7) - 3 = 7
```

**Detection:**
- Grid lines misalign by 1-2px during pan
- Tiles "vibrate" slightly when panning slowly
- Blit srcX/srcY values are fractional instead of multiples of TILE_SIZE

---

### Pitfall 2: Buffer Invalidation Too Aggressive

**What goes wrong:** Buffer redraws on every small pan movement. User pans 1 tile right → buffer invalidated → 400 tiles redraw → frame drop → choppy pan. Defeats purpose of buffer zone.

**Why it happens:** Invalidation check compares exact viewport position instead of checking if viewport exited buffer margin. Every pan movement changes viewport.x/y, so strict equality check always fails.

**Consequences:**
- Pan drag choppy instead of smooth
- CPU/GPU pegged at 100% during pan
- Battery drain on laptops

**Prevention:**
```typescript
// WRONG (invalidates on any movement):
const needsRedraw = bufferState.vpX !== vp.x || bufferState.vpY !== vp.y;

// CORRECT (invalidates only when exiting buffer zone):
const vpLeft = Math.floor(vp.x);
const vpTop = Math.floor(vp.y);
const needsRedraw =
  vpLeft < bufferState.startX + 1 ||  // Viewport crossed left margin
  vpTop < bufferState.startY + 1 ||   // Viewport crossed top margin
  vpLeft + tilesX > bufferState.endX - 1 || // Crossed right margin
  vpTop + tilesY > bufferState.endY - 1;    // Crossed bottom margin
```

**Detection:**
- High CPU/GPU usage during pan (check DevTools Performance tab)
- Visual stutter every 1-2 tiles of pan movement
- Console logging shows frequent buffer rebuilds

---

### Pitfall 3: Blit Source Coordinates Relative to Wrong Origin

**What goes wrong:** Blit operation uses absolute map coordinates instead of buffer-relative coordinates. Example: Buffer starts at tile (50, 50), viewport at tile (52, 52). Blit tries srcX = 52 * 16 = 832px, but buffer origin is tile 50 → should be (52 - 50) * 16 = 32px. Blit reads wrong region → blank tiles or wrong tiles displayed.

**Why it happens:** Developer forgets buffer doesn't cover entire map. Treats buffer as "map starting at (0, 0)" when it actually represents "map region [startX..endX, startY..endY]".

**Consequences:**
- Viewport shows wrong map region
- Pan drift - viewport position doesn't match rendered tiles
- Black screen when panning to map edges (buffer out of bounds)

**Prevention:**
```typescript
// WRONG (absolute map coordinates):
const srcX = vp.x * TILE_SIZE;
const srcY = vp.y * TILE_SIZE;

// CORRECT (buffer-relative coordinates):
const srcX = (vp.x - bufferState.startX) * TILE_SIZE;
const srcY = (vp.y - bufferState.startY) * TILE_SIZE;

ctx.drawImage(bufferCanvas, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
```

**Detection:**
- Viewport shows tiles from wrong map region
- Pan right but tiles scroll left (coordinate inversion symptom)
- Console error: "CanvasRenderingContext2D.drawImage: source rectangle is out of bounds"

---

### Pitfall 4: Buffer Resize Destroys Existing Content

**What goes wrong:** Window resize or zoom change triggers buffer resize. createCanvas with new size → buffer content wiped → must redraw all tiles → expensive. If done during pan, causes visible stutter.

**Why it happens:** Canvas resize operation clears canvas content (by spec). Developer doesn't preserve existing buffer tiles before resize.

**Consequences:**
- Stutter on window resize
- Full redraw when zooming (instead of just scaling)
- Wasted work re-rendering unchanged tiles

**Prevention:**
```typescript
// Before resize:
const oldBuffer = mapBufferRef.current;
const oldImageData = oldBuffer ? oldBuffer.getContext('2d')?.getImageData(0, 0, oldBuffer.width, oldBuffer.height) : null;

// Resize:
const newBuffer = document.createElement('canvas');
newBuffer.width = newBufferWidth;
newBuffer.height = newBufferHeight;

// Restore old content (if applicable):
if (oldImageData && canReuseOldBuffer) {
  newBuffer.getContext('2d')?.putImageData(oldImageData, 0, 0);
}

mapBufferRef.current = newBuffer;
```

**Better approach:** Don't resize buffer on every zoom change. Use viewport zoom scale when blitting:
```typescript
// Buffer stays at native tile resolution (16px tiles)
// Zoom applied during blit to screen, not during buffer render
const srcW = canvas.width / vp.zoom;  // Viewport width in native pixels
const srcH = canvas.height / vp.zoom;
ctx.drawImage(buffer, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
```

**Detection:**
- Full screen flicker on window resize
- zoom in/out triggers 400-tile redraw every time
- DevTools Performance shows spike on resize events

## Code Examples

Verified patterns from official sources and existing codebase:

### Buffer Zone Calculation (from MDN)

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
// "A better approach is to create a canvas that is 2x2 tiles bigger than the visible area,
// so there is one tile of 'bleeding' around the edges."

const BUFFER_MARGIN = 3; // tiles (can be 2-4 depending on pan speed)

function calculateBufferBounds(viewport: Viewport, canvasWidth: number, canvasHeight: number) {
  const tilePixels = TILE_SIZE * viewport.zoom;
  const tilesX = Math.ceil(canvasWidth / tilePixels) + 1;
  const tilesY = Math.ceil(canvasHeight / tilePixels) + 1;

  const startX = Math.max(0, Math.floor(viewport.x) - BUFFER_MARGIN);
  const startY = Math.max(0, Math.floor(viewport.y) - BUFFER_MARGIN);
  const endX = Math.min(MAP_WIDTH, Math.floor(viewport.x) + tilesX + BUFFER_MARGIN);
  const endY = Math.min(MAP_HEIGHT, Math.floor(viewport.y) + tilesY + BUFFER_MARGIN);

  return { startX, startY, endX, endY };
}
```

### Incremental Tile Patching (Current Codebase Pattern)

```typescript
// Source: MapCanvas.tsx lines 259-271 (proven pattern from Phase 49)
// Keep this pattern - it's correct. Only change: apply to buffer region instead of full map.

function patchChangedTiles(
  bufCtx: CanvasRenderingContext2D,
  map: MapData,
  prevTiles: Uint16Array,
  bufferStartX: number,
  bufferStartY: number,
  bufferEndX: number,
  bufferEndY: number
) {
  for (let y = bufferStartY; y < bufferEndY; y++) {
    for (let x = bufferStartX; x < bufferEndX; x++) {
      const idx = y * MAP_WIDTH + x;
      if (map.tiles[idx] !== prevTiles[idx]) {
        // Buffer-relative rendering coordinates
        const bufX = (x - bufferStartX) * TILE_SIZE;
        const bufY = (y - bufferStartY) * TILE_SIZE;
        bufCtx.clearRect(bufX, bufY, TILE_SIZE, TILE_SIZE);
        renderTile(bufCtx, tilesetImage, map.tiles[idx], bufX, bufY, TILE_SIZE, animationFrame);
        prevTiles[idx] = map.tiles[idx];
      }
    }
  }
}
```

### Blit to Screen (Buffer-Relative Coordinates)

```typescript
// Source: Current codebase pattern (lines 273-280), adapted for moving buffer origin

function blitBufferToScreen(
  ctx: CanvasRenderingContext2D,
  buffer: HTMLCanvasElement,
  bufferState: { startX: number; startY: number; endX: number; endY: number },
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Source rectangle in buffer space (buffer-relative coordinates)
  const srcX = (viewport.x - bufferState.startX) * TILE_SIZE;
  const srcY = (viewport.y - bufferState.startY) * TILE_SIZE;
  const srcW = canvasWidth / viewport.zoom;
  const srcH = canvasHeight / viewport.zoom;

  // Destination: entire screen canvas
  ctx.drawImage(buffer, srcX, srcY, srcW, srcH, 0, 0, canvasWidth, canvasHeight);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| **Render entire map to buffer** (v2.7) | **Render viewport + buffer margin** (v2.8) | Phase 50 | Reduces initial render from 65,536 tiles to ~400 tiles (~160x faster initial load) |
| **Fixed 4096x4096 buffer size** | **Dynamic buffer size** | Phase 50 | Saves ~16MB GPU memory at typical zoom levels (from 4096² to ~640x480 buffer) |
| **Per-frame tile blit** (pre-v2.7) | **Off-screen buffer + incremental patch** | Phase 49 | Eliminated 65K drawImage calls per frame. Buffer approach is correct; Phase 50 refines it. |
| **4-canvas layers** | **2-canvas layers** | Phase 49 | Reduced compositor overhead. No further reduction in Phase 50. |

**Deprecated/outdated:**
- **Full-map buffer:** Phase 49 approach works but is overkill. 256x256 tiles rendered even when viewport shows 30x20 tiles. Phase 50 refines to viewport + margin only.
- **ImageBitmap atlas approach (attempted):** Phase 49 summary notes "ImageBitmap atlas approach FAILED - 4000 createImageBitmap calls froze the app for minutes." Don't retry this. Stick with direct drawImage from tileset.

**Current best practice (as of Phase 49):**
- ✅ Off-screen buffer at native tile resolution (16px/tile)
- ✅ Incremental tile patching via Uint16Array diff
- ✅ CSS transform during pan drag + RAF progressive render
- ✅ 2-canvas architecture (map + UI overlay)
- 🔄 **Phase 50 refines:** Buffer size from full-map to viewport + margin

## Open Questions

1. **What is optimal buffer margin size (2 vs 3 vs 4 tiles)?**
   - What we know: MDN recommends "one tile of bleeding around edges" (2-tile margin). Defold issue #8744 discusses tilemap culling but doesn't specify margin size.
   - What's unclear: Optimal margin depends on pan speed. Fast drag (1000px/sec) needs larger margin than slow drag (100px/sec). No empirical data for this project.
   - Recommendation: Start with 3 tiles (middle ground). Make it a constant `BUFFER_MARGIN = 3` for easy tuning. Measure pan performance, adjust if needed.

2. **Should buffer resize on zoom change or stay at native resolution?**
   - What we know: Current Phase 49 implementation uses native resolution buffer (TILE_SIZE = 16px), applies zoom during blit. This is correct.
   - What's unclear: Does buffer need different size at different zoom levels? At 0.25x zoom, viewport shows 4x more tiles than at 1x zoom.
   - Recommendation: Keep buffer at native resolution (16px/tile). Size buffer based on viewport tile count (which naturally varies with zoom). Example: At 1x zoom, viewport shows 30x20 tiles → buffer is 36x26 tiles (with margin). At 0.25x zoom, viewport shows 120x80 tiles → buffer is 126x86 tiles. Buffer pixel size changes with zoom, but tile-to-pixel ratio stays 1:16.

3. **How to handle buffer invalidation during pan drag?**
   - What we know: Phase 48 uses CSS transform during drag + RAF progressive render. Viewport commits to Zustand only on mouseup.
   - What's unclear: Should buffer rebuild during drag (progressive) or after drag completes (synchronous)?
   - Recommendation: Rebuild AFTER pan completes. During drag, CSS transform slides existing buffer content. On mouseup, check if viewport exited buffer zone → rebuild if needed. This avoids frame drops during interactive drag.

## Sources

### Primary (HIGH confidence)

- [MDN: Optimizing Canvas - Tilemap Pre-rendering](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - Off-screen buffer technique with "2x2 tiles bigger than visible area" recommendation
- [MDN: Tiles and Tilemaps Overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) - Drawing scrolling tile maps optimization strategies
- [MDN: Square Tilemaps - Scrolling Maps](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps/Square_tilemaps_implementation:_Scrolling_maps) - Overscan buffer technique details
- Current codebase: `MapCanvas.tsx` lines 76-280 (Phase 49 buffer implementation), lines 628-693 (Phase 48 RAF progressive render)

### Secondary (MEDIUM confidence)

- [Buffer around Vector Tiles - CycleMap Blog](https://blog.cyclemap.link/2020-01-25-tilebuffer/) - Vector tile buffer zones (128 coordinate units sufficient for motorways)
- [Fyrox: Tile-based Occlusion Culling](https://fyrox.rs/blog/post/tile-based-occlusion-culling/) - Screen-space tile frustum techniques
- [GitHub: Defold Tilemap Viewport Culling (#8744)](https://github.com/defold/defold/issues/8744) - Tilemap culling discussion (ensure only on-screen tiles rendered)

### Tertiary (LOW confidence)

- [OpenLayers: Vector Tiles in OffscreenCanvas](https://openlayers.org/en/latest/examples/offscreen-canvas.html) - Example of off-main-thread tile rendering
- [OffscreenCanvas MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) - Web API reference (not specific to buffer zones)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, uses existing Phase 48-49 infrastructure
- Architecture: HIGH - Buffer zone pattern is proven in MDN docs and game dev, existing codebase already 80% there
- Pitfalls: HIGH - Coordinate math pitfalls well-documented in Phase 44-46 research, buffer-specific pitfalls derived from vector tile sources

**Research date:** 2026-02-12
**Valid until:** 90+ days (stable browser APIs, proven canvas techniques, no framework churn)

**Key takeaway for planner:** Phase 50 is NOT a rewrite. It's a surgical refinement of Phase 49's buffer size calculation. Keep 95% of existing code. Change only:
1. Buffer size: from fixed 4096x4096 to dynamic (viewport + margin)
2. Buffer origin tracking: add `bufferStateRef` with startX/startY/endX/endY
3. Blit coordinates: change from `vp.x * TILE_SIZE` to `(vp.x - bufferStartX) * TILE_SIZE`
4. Invalidation check: add viewport-exited-buffer-zone logic

Don't touch: incremental tile patching, RAF progressive render, 2-canvas architecture, CSS transform pan, grid pattern rendering. All proven correct in Phase 49.
