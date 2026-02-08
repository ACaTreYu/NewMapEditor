# Phase 23: Minimap Performance - Research

**Researched:** 2026-02-08
**Domain:** Canvas color sampling, pre-computed lookup tables, React debouncing, minimap optimization
**Confidence:** HIGH

## Summary

Phase 23 optimizes the minimap by replacing per-draw DOM canvas creation with a pre-computed tile color lookup table. The current implementation (Phase 8/22) creates a temporary 1x1 canvas and samples the center pixel of each tile during every minimap redraw. While functional, this creates unnecessary DOM elements and CPU overhead.

The standard approach is a **one-time color cache initialization** when the tileset image loads: create a single temporary canvas, iterate all tiles once, sample pixel colors into a Uint8Array lookup table (3 bytes RGB per tile), then dispose of the temporary canvas. Subsequent minimap draws simply index into this cache array—zero DOM creation, zero canvas operations, pure memory lookups.

React debouncing for redraw timing uses the standard `setTimeout` + `clearTimeout` pattern wrapped in `useEffect` cleanup functions to prevent memory leaks. The debounce delay should be tuned between 100-200ms to batch rapid tile edits (paint/fill operations) without perceptible lag.

For special tiles (walls, spawns, flags, etc.), hardcoded RGB color overrides provide visual distinction on the minimap, matching SEdit's approach where gameplay-significant tiles stand out from regular terrain.

**Primary recommendation:** Build Uint8Array color cache (3 bytes RGB per tile) on tileset load with average pixel color sampling, add hardcoded color overrides for special tile ranges, implement 150ms debounced redraw using useEffect cleanup pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Color Sampling Method
- Use **average pixel color** across all pixels in each 16x16 tile
- Compute lookup table once when tileset image loads
- Table maps tile index → RGB color value

#### Special Tile Colors
- **Hardcoded distinct colors** for game-significant tiles (walls, spawns, flags, conveyors, doors)
- These override the averaged tileset color for readability
- Should match SEdit-style visual distinction on the minimap

#### Animated Tiles
- Show **static frame 0 color only** — no animation on minimap
- Animated tiles use the averaged color of their first animation frame

#### Redraw Timing
- **Debounced** — minimap waits after last tile edit before redrawing (~100-200ms)
- Prevents CPU thrashing during rapid painting/dragging operations

### Claude's Discretion
- Exact debounce interval tuning (100-200ms range)
- Specific hardcoded color values for special tiles
- Lookup table data structure (flat array, Map, etc.)
- How to handle the viewport rectangle overlay rendering

### Deferred Ideas (OUT OF SCOPE)
- **Remove Ctrl+R from rotate 90°** — Ctrl+R should remain as Electron hot reload, not rotate. Rotate gets no replacement shortcut for now. (Bug fix, not Phase 23 scope)
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Uint8Array | Native | Typed array for color cache | Optimal for RGB byte storage, 2x faster than regular arrays |
| Canvas API | Native | Pixel color sampling | getImageData is standard for color extraction |
| React useEffect | 18.x | Lifecycle hooks for cache init | Standard React pattern for side effects |
| React useRef | 18.x | Cache reference storage | Persists across renders without triggering re-renders |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| setTimeout/clearTimeout | Native | Debounce timing | Standard debounce implementation, paired with useEffect cleanup |
| ImageData | Native | Pixel data access | Batch pixel reading for average color calculation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Uint8Array (flat) | Map<number, RGB> | Map has overhead, flat array is faster for dense tile IDs |
| Average pixel color | Center pixel sampling | Average more accurate, center faster (current uses center) |
| setTimeout debounce | requestAnimationFrame throttle | setTimeout better for delayed batch, RAF for continuous updates |
| useEffect cleanup | Custom hook (useDebouncedRedraw) | Custom hook cleaner, but simple setTimeout is sufficient |

**Installation:**
```bash
# No new dependencies needed - all native APIs
```

## Architecture Patterns

### Recommended Lookup Table Structure
```typescript
// Flat Uint8Array: 3 bytes per tile (R, G, B)
// Tile ID N → colors at indices [N*3, N*3+1, N*3+2]
const tileColorCache = new Uint8Array(totalTiles * 3);

// Access pattern:
const offset = tileId * 3;
const r = tileColorCache[offset];
const g = tileColorCache[offset + 1];
const b = tileColorCache[offset + 2];
```

**Why flat array:** Minimizes memory overhead, maximizes CPU cache locality, simple indexing arithmetic.

### Pattern 1: One-Time Color Cache Initialization
**What:** Build lookup table once when tileset loads, dispose of temporary canvas immediately
**When to use:** Any scenario where color sampling is needed repeatedly from static image source
**Example:**
```typescript
// Source: WebSearch verified + current Minimap.tsx pattern adapted
const tileColorCacheRef = useRef<Uint8Array | null>(null);
const lastTilesetRef = useRef<HTMLImageElement | null>(null);

useEffect(() => {
  if (!tilesetImage || lastTilesetRef.current === tilesetImage) return;

  // Create one-time temporary canvas for color sampling
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = TILE_SIZE;
  tempCanvas.height = TILE_SIZE;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  const totalTiles = Math.floor(tilesetImage.height / TILE_SIZE) * TILES_PER_ROW;
  const colorCache = new Uint8Array(totalTiles * 3);

  // Sample average color of each tile
  for (let tileId = 0; tileId < totalTiles; tileId++) {
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

    // Draw tile to temp canvas
    tempCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
    tempCtx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);

    // Get all pixels
    const imageData = tempCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const pixels = imageData.data; // Uint8ClampedArray [R,G,B,A, R,G,B,A, ...]

    // Calculate average color
    let rSum = 0, gSum = 0, bSum = 0;
    const pixelCount = TILE_SIZE * TILE_SIZE;

    for (let i = 0; i < pixels.length; i += 4) {
      rSum += pixels[i];     // R
      gSum += pixels[i + 1]; // G
      bSum += pixels[i + 2]; // B
      // Ignore alpha (i + 3)
    }

    const offset = tileId * 3;
    colorCache[offset] = Math.round(rSum / pixelCount);     // R
    colorCache[offset + 1] = Math.round(gSum / pixelCount); // G
    colorCache[offset + 2] = Math.round(bSum / pixelCount); // B
  }

  tileColorCacheRef.current = colorCache;
  lastTilesetRef.current = tilesetImage;
  // Temporary canvas disposed automatically (garbage collected)
}, [tilesetImage]);
```

**Performance:** One-time ~50-100ms initialization, then <1ms lookups for all subsequent draws.

### Pattern 2: Special Tile Color Overrides
**What:** Hardcoded RGB values for gameplay-significant tile ranges, override averaged colors
**When to use:** When semantic meaning is more important than visual accuracy
**Example:**
```typescript
// Special tile color determination (in minimap draw loop)
let r = 26, g = 26, b = 46; // Default: space/empty (dark blue)

const isAnimated = (tileId & 0x8000) !== 0;
const baseTileId = isAnimated ? (tileId & 0xFF) : tileId;

// Hardcoded special tile colors (SEdit-style)
if (tileId === 280) {
  // Empty space tile
  r = 26; g = 26; b = 46; // Dark blue
} else if (baseTileId < 250 && wallSystem.isWallTile(baseTileId)) {
  // Walls (tiles 0-249, but only actual wall tiles)
  r = 74; g = 74; b = 110; // Medium gray-blue
} else if (isAnimated) {
  // Generic animated tiles
  const animId = tileId & 0xFF;
  if (animId >= 0x1C && animId <= 0x83) {
    // Flag poles (team-specific ranges)
    r = 138; g = 138; b = 190; // Light blue
  } else if (animId === 0x7B) {
    // Switches
    r = 220; g = 180; b = 100; // Gold
  } else if (animId === 0x8C) {
    // Neutral flags
    r = 200; g = 200; b = 200; // Light gray
  } else if (animId >= 0xF6 && animId <= 0xFA || animId === 0x9E) {
    // Warps
    r = 100; g = 255; b = 100; // Bright green
  } else {
    // Other animated tiles - use frame 0 from cache
    r = 90; g = 90; b = 142; // Purple-gray fallback
  }
} else if (baseTileId >= 4000) {
  // Special high-ID tiles (doors, conveyors, etc.)
  r = 138; g = 138; b = 190; // Light blue
} else if (tileColorCacheRef.current) {
  // Normal tiles - look up from cache
  const totalTilesInCache = tileColorCacheRef.current.length / 3;
  if (baseTileId < totalTilesInCache) {
    const offset = baseTileId * 3;
    r = tileColorCacheRef.current[offset];
    g = tileColorCacheRef.current[offset + 1];
    b = tileColorCacheRef.current[offset + 2];
  }
}
```

**Rationale:** Walls/spawns/flags are gameplay-critical, should be visually distinct even if tileset colors are similar.

### Pattern 3: Debounced Minimap Redraw
**What:** Delay redraw until user pauses tile editing, cancel pending redraw if new edits occur
**When to use:** UI updates that should batch rapid sequential changes (search input, canvas redraws)
**Example:**
```typescript
// Source: WebSearch React debounce best practices
const DEBOUNCE_DELAY = 150; // ms

useEffect(() => {
  // Schedule debounced redraw
  const timerId = setTimeout(() => {
    draw(); // Redraw minimap
  }, DEBOUNCE_DELAY);

  // Cleanup: cancel pending redraw if map changes again before delay expires
  return () => clearTimeout(timerId);
}, [map, draw]); // Triggers on every map change, but debounces execution
```

**How it works:**
1. User paints tile A → useEffect schedules redraw in 150ms
2. User paints tile B (50ms later) → cleanup cancels first timer, schedules new redraw in 150ms
3. User paints tile C (50ms later) → cleanup cancels second timer, schedules new redraw in 150ms
4. User stops painting → 150ms passes, minimap redraws once with all changes

**Result:** 10 rapid tile edits = 1 minimap redraw instead of 10.

### Pattern 4: Viewport Rectangle Overlay (Unchanged)
**What:** Viewport indicator rectangle draws AFTER minimap tiles, no debouncing
**When to use:** Real-time feedback that should update immediately (cursor, selection overlays)
**Example:**
```typescript
// Viewport rectangle should NOT be debounced - updates on every viewport change
const draw = useCallback(() => {
  // ... draw minimap tiles (debounced) ...

  // Draw viewport rectangle (immediate)
  const vp = getViewportRect();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(vp.x, vp.y, vp.width, vp.height);
}, [map, viewport, getViewportRect]);

// Separate triggers: map (debounced), viewport (immediate)
useEffect(() => {
  const timerId = setTimeout(() => draw(), DEBOUNCE_DELAY);
  return () => clearTimeout(timerId);
}, [map, draw]); // Debounced map redraw

useEffect(() => {
  draw(); // Immediate viewport update (no debounce)
}, [viewport, draw]); // Real-time viewport tracking
```

**Rationale:** Viewport rectangle must track panning/zooming in real-time, debouncing would feel laggy.

### Anti-Patterns to Avoid
- **Creating canvas on every draw** - Current approach creates 1x1 canvas per redraw, cache eliminates this
- **Using Map/Object for cache** - Flat Uint8Array is 2x faster for lookup-heavy operations
- **Debouncing viewport rectangle** - User expects viewport indicator to track panning immediately
- **Over-aggressive debounce (>300ms)** - Feels laggy, 150ms is sweet spot for responsiveness
- **Under-aggressive debounce (<50ms)** - Doesn't batch rapid edits effectively, defeats purpose
- **Forgetting setTimeout cleanup** - Causes memory leaks when component unmounts during pending redraw

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color averaging | Custom RGB accumulation loops | ImageData pixel iteration | Standard Canvas API, well-optimized by browser |
| Debouncing | Custom RequestAnimationFrame queue | setTimeout + useEffect cleanup | Simpler, sufficient for delayed batch updates |
| Memory leak prevention | Manual timer tracking | useEffect return cleanup function | React standard, automatic lifecycle management |
| Lookup table structure | Nested arrays/objects | Flat Uint8Array with arithmetic indexing | CPU cache-friendly, minimal memory overhead |
| Special tile detection | String matching/regex | Numeric range checks + Set lookups | O(1) lookup vs O(n) search, type-safe |

**Key insight:** Minimap performance is about **eliminating repeated work** (cache once, look up many times) and **batching updates** (debounce redraws). Browser APIs (ImageData, Uint8Array, setTimeout) are sufficient—no custom abstractions needed.

## Common Pitfalls

### Pitfall 1: Incorrect Flat Array Indexing
**What goes wrong:** Colors appear scrambled, tiles show wrong colors, or array access crashes
**Why it happens:** Forgetting RGB takes 3 bytes per tile, using `tileId * 4` (RGBA) instead of `tileId * 3` (RGB)
**How to avoid:**
1. Always use `offset = tileId * 3` for RGB cache
2. Document why 3 bytes (no alpha needed for minimap)
3. Add defensive bounds check: `if (tileId < totalTilesInCache)`
**Warning signs:** First few tiles correct, then colors shift or repeat. Tile 85 shows color from tile 113.

### Pitfall 2: Animated Tile Frame 0 Not Cached
**What goes wrong:** Animated tiles show fallback color instead of actual frame 0 appearance
**Why it happens:** Animated tile encoding stores animation ID in bits 0-7, not static tile ID. Cache indexes by static tile ID, so frame 0 tile must be looked up separately.
**How to avoid:**
1. When sampling animated tiles, decode frame 0 tile ID from animation definitions
2. Cache frame 0 tile color, not animation ID color
3. If animation data unavailable, use tileset sampling of frame 0 tile position
**Warning signs:** Animated tiles all show same generic color, don't match their static frame appearance.

### Pitfall 3: Debounce Triggers Too Frequently
**What goes wrong:** Minimap still redraws constantly, performance not improved
**Why it happens:** Debounce dependency array includes viewport, which changes on every pan/zoom
**How to avoid:**
1. Separate debounce triggers: map changes (debounced), viewport changes (immediate)
2. Only debounce tile data changes, not viewport rectangle updates
3. Use two separate useEffect hooks with different dependencies
**Warning signs:** Profiler shows minimap redrawing 60fps during panning, debounce delay has no effect.

### Pitfall 4: Memory Leak from Unmounted Component
**What goes wrong:** Console warning: "Can't perform a React state update on an unmounted component"
**Why it happens:** setTimeout fires after component unmounts, tries to call draw() which accesses refs/state
**How to avoid:**
1. Always return cleanup function from useEffect: `return () => clearTimeout(timerId)`
2. Cleanup cancels pending timeout before unmount
3. Never schedule timers outside useEffect (no manual tracking needed)
**Warning signs:** Warning appears when navigating away from editor or closing map file.

### Pitfall 5: Color Cache Invalidated by Tileset Reload
**What goes wrong:** Minimap shows stale colors after loading different tileset image
**Why it happens:** Cache ref not cleared when tileset changes, lastTilesetRef comparison uses object identity
**How to avoid:**
1. Track tileset with ref: `if (lastTilesetRef.current === tilesetImage) return`
2. Object identity comparison works for HTMLImageElement
3. Rebuild cache whenever tilesetImage object changes
**Warning signs:** Loading new map with different tileset shows colors from previous tileset.

### Pitfall 6: Special Tile Range Gaps
**What goes wrong:** Some walls or special tiles show averaged color instead of hardcoded color
**Why it happens:** Incomplete special tile range detection, gaps in numeric ranges
**How to avoid:**
1. Use WallSystem.isWallTile() for accurate wall detection (not just tile ID < 250)
2. Consult TileEncoding.ts for animation ID constants (FLAG_POLE_IDS, SWITCH_ANIM_ID, etc.)
3. Test with maps containing all special tile types
**Warning signs:** Some walls gray, others colored. Flags on minimap invisible.

## Code Examples

Verified patterns from official sources:

### Example 1: Average Color Calculation (Full Tile)
```typescript
// Calculate average RGB color across all 256 pixels (16x16 tile)
const imageData = tempCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
const pixels = imageData.data; // Uint8ClampedArray: [R,G,B,A, R,G,B,A, ...]

let rSum = 0, gSum = 0, bSum = 0;
const pixelCount = TILE_SIZE * TILE_SIZE; // 256 pixels

for (let i = 0; i < pixels.length; i += 4) {
  rSum += pixels[i];     // R
  gSum += pixels[i + 1]; // G
  bSum += pixels[i + 2]; // B
  // Skip alpha: pixels[i + 3]
}

const avgR = Math.round(rSum / pixelCount);
const avgG = Math.round(gSum / pixelCount);
const avgB = Math.round(bSum / pixelCount);
```

**Why average:** More accurate representation of multi-color tiles (terrain, textures) than single-pixel sampling.

### Example 2: Lookup Table Access Pattern
```typescript
// Given tile ID, retrieve cached RGB color
const getTileColor = (tileId: number): { r: number; g: number; b: number } => {
  if (!tileColorCacheRef.current) {
    return { r: 26, g: 26, b: 46 }; // Default fallback
  }

  const totalTiles = tileColorCacheRef.current.length / 3;
  if (tileId < 0 || tileId >= totalTiles) {
    return { r: 26, g: 26, b: 46 }; // Out of bounds
  }

  const offset = tileId * 3;
  return {
    r: tileColorCacheRef.current[offset],
    g: tileColorCacheRef.current[offset + 1],
    b: tileColorCacheRef.current[offset + 2]
  };
};
```

### Example 3: Debounced Redraw with Cleanup
```typescript
// Debounce minimap redraw when map data changes
const DEBOUNCE_DELAY = 150; // ms

useEffect(() => {
  // Schedule redraw after delay
  const timerId = setTimeout(() => {
    draw();
  }, DEBOUNCE_DELAY);

  // Cleanup: cancel pending redraw if map changes again or component unmounts
  return () => {
    clearTimeout(timerId);
  };
}, [map, draw]); // Dependencies: map data and draw function
```

**Key:** Cleanup function executes before next effect AND on unmount—prevents memory leaks.

### Example 4: Separate Triggers for Map vs Viewport
```typescript
// Two separate useEffect hooks: debounced map, immediate viewport
const Minimap: React.FC<Props> = ({ tilesetImage }) => {
  const draw = useCallback(() => { /* ... minimap rendering ... */ }, [map, viewport]);

  // Debounced: redraw when map tiles change (paint, fill, paste)
  useEffect(() => {
    const timerId = setTimeout(() => draw(), 150);
    return () => clearTimeout(timerId);
  }, [map, draw]); // Map changes trigger debounced redraw

  // Immediate: redraw when viewport changes (pan, zoom)
  useEffect(() => {
    draw(); // No debounce - real-time viewport tracking
  }, [viewport, draw]); // Viewport changes trigger immediate redraw
};
```

**Rationale:** Viewport rectangle must update immediately for responsive panning, but tile redraws can batch.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-draw canvas creation | One-time color cache initialization | Standard practice since ~2012 | Eliminates DOM overhead, 10-50x faster |
| Center pixel sampling | Average pixel color | User decision (Phase 23 CONTEXT.md) | More accurate for multi-color tiles |
| No debouncing | Debounced redraws with useEffect cleanup | React 16.8+ (Hooks, 2019) | Batches rapid edits, prevents memory leaks |
| Regular arrays | Typed arrays (Uint8Array) | ES6 (2015), standard for binary data | 2x lookup speed, memory-efficient |
| Hardcoded RGB literals | Special tile override logic | N/A | Semantic colors for gameplay elements |

**Deprecated/outdated:**
- **Creating temporary canvas per draw** - Was acceptable for infrequent redraws, modern practice caches at initialization
- **Array.push() for color data** - Typed arrays are standard for numeric data, preallocated size
- **Manual timer tracking** - useEffect cleanup is React standard since Hooks (2019)
- **Inline setTimeout without cleanup** - Causes memory leaks, deprecated pattern

## Open Questions

1. **Should color cache rebuild on map load, or persist across maps?**
   - What we know: Cache built when tilesetImage loads, single tileset per project
   - What's unclear: If user loads multiple maps with same tileset, should cache persist?
   - Recommendation: Cache persists as long as tilesetImage object stays same (already implemented via lastTilesetRef)

2. **What happens if animated tile has no frame 0 definition?**
   - What we know: Animated tiles encode animation ID (0-255), frame 0 tile must be looked up from animation definitions
   - What's unclear: Fallback behavior if animation ID not in ANIMATION_DEFINITIONS
   - Recommendation: Use generic animated color (90, 90, 142) as fallback, log warning for missing animation

3. **Should debounce delay adapt to number of tiles changed?**
   - What we know: 150ms fixed delay works for both single-tile edits and flood fills
   - What's unclear: Whether large operations (fill 10,000 tiles) should redraw immediately vs after delay
   - Recommendation: Keep fixed 150ms - large operations complete in <50ms, debounce prevents mid-operation flicker

4. **Should special tile colors be configurable or hardcoded?**
   - What we know: User decision specifies "hardcoded distinct colors"
   - What's unclear: Future requirement for user-customizable minimap color schemes
   - Recommendation: Hardcode initially per user decision, defer customization to future phase

## Sources

### Primary (HIGH confidence)
- [MDN: Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) - Typed array specification
- [MDN: ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData) - Pixel data access API
- [MDN: CanvasRenderingContext2D.getImageData()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) - Pixel color sampling
- Existing codebase:
  - `src/components/Minimap/Minimap.tsx` (lines 36-65) - Current color caching approach
  - `src/core/map/TileEncoding.ts` - Animation ID constants, special tile detection
  - `src/core/map/WallSystem.ts` - Wall tile detection, wall type ranges
  - `.planning/phases/22-canvas-rendering-optimization/22-RESEARCH.md` - Canvas performance patterns

### Secondary (MEDIUM confidence)
- [React useEffect Cleanup Function | Refine](https://refine.dev/blog/useeffect-cleanup/) - Cleanup pattern for memory leak prevention
- [setTimeout and clearTimeout in React with hooks](https://www.alexhughes.dev/blog/settimeout-with-hooks/) - Debounce with cleanup
- [Pixel manipulation with canvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas) - Color averaging techniques
- [Optimizing React Performance: Custom Debounce Hook with useCallback](https://medium.com/@markovsve/optimizing-react-performance-custom-debounce-hook-with-usecallback-8d841fee6615) - Debounce patterns
- [JavaScript Typed Arrays: Uint8Array, Uint16Array, and Uint32Array](https://www.haikel-fazzani.eu.org/snippet/javascript-typed-arrays-uint8-uint16-uint32) - Typed array performance

### Tertiary (LOW confidence)
- [Continuum Level Editor Manual](https://continuumlt.sourceforge.net/manual/) - Map editor context (no minimap color details found)
- Various WebSearch results on debouncing and typed arrays (cross-verified with MDN)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uint8Array, ImageData, setTimeout/cleanup are well-documented native APIs
- Architecture patterns: HIGH - Color caching and debouncing are established best practices, verified by multiple sources
- Pitfalls: HIGH - Flat array indexing, memory leaks, debounce triggers are common React/Canvas issues with known solutions
- Special tile colors: MEDIUM - Specific RGB values need testing/tuning for visual distinction

**Research date:** 2026-02-08
**Valid until:** ~90 days (May 2026) - Native APIs stable, React patterns established

**Key assumptions:**
- Tileset image is static (640px wide, multiple of 16px tall)
- Tile IDs are dense (0-N with few gaps), making flat array efficient
- Map edits happen in bursts (paint/fill), justifying debounce
- Minimap size remains 128x128 (MINIMAP_SIZE constant)
- Animated tiles have frame 0 definitions in ANIMATION_DEFINITIONS
