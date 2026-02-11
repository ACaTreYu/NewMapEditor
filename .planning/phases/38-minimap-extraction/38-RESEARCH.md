# Phase 38: Minimap Component Extraction - Research

**Researched:** 2026-02-10
**Domain:** React component extraction, Canvas rendering patterns, empty state UI
**Confidence:** HIGH

## Summary

This phase extracts the minimap from being conditionally rendered inside the AnimationPanel into an independent, always-visible component. The minimap currently returns `null` when `!map`, making it invisible on startup and when all documents are closed. The new architecture renders the minimap unconditionally with an empty state (checkerboard + label) when no map is loaded.

The existing minimap uses efficient Canvas patterns (color caching, debounced redraws, requestIdleCallback). The extraction adds a checkerboard background layer using Canvas `createPattern()` for optimal performance, painted as a background with occupied tiles rendered on top. The minimap will have a fixed width (matching AnimationPanel width for layout consistency), and the AnimationPanel width will be constrained to match.

**Primary recommendation:** Use Canvas `createPattern()` with a small offscreen canvas (16x16px) to create the checkerboard background, render it as the base layer, then paint occupied tiles on top. Return JSX always (never `null`) with conditional rendering of map content vs empty state label.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Checkerboard style
- Classic gray/white color scheme (light gray #C0C0C0 and white #FFFFFF, Photoshop-style)
- 8x8 pixel blocks per checkerboard square
- Checkerboard is the full background layer; occupied tiles paint over it
- 1px solid border around the minimap

#### No-map empty state
- Checkerboard background with centered "Minimap" label
- Label is prominent — normal contrast, clearly readable
- Label disappears when a map is loaded (map content replaces it)

#### Independent sizing and placement
- Minimap stays in the right panel area with its own reserved space (NOT an overlay)
- Always visible — does not hide when animation panel collapses
- Animation panel width fixed to match minimap width (consistent right column)
- 1px border provides separation (no drop shadow)

### Claude's Discretion
- Exact minimap pixel dimensions (based on what works with current layout)
- Behavior when last document closes (return to empty state or not)
- Label font size and exact styling within "prominent" constraint

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component framework | Project standard, already in use |
| Canvas API | Native | Rendering minimap + checkerboard | High performance, native browser API |
| Zustand | Current | State management | Project's state management solution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useShallow | zustand/react/shallow | Zustand selector optimization | Already used in Minimap.tsx line 8, prevents re-renders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas createPattern | CSS background gradients | CSS is faster but can't layer with canvas content easily |
| Always-mounted component | Conditional rendering (current) | Current pattern causes mount/unmount cycles, loses benefits of persistent canvas |

**Installation:**
No new packages required — all technologies already in project.

## Architecture Patterns

### Recommended Project Structure
```
src/components/Minimap/
├── Minimap.tsx          # Main component (already exists)
├── Minimap.css          # Styling (already exists)
└── index.ts             # Barrel export (already exists)
```

No structural changes needed — extraction happens at the App.tsx level.

### Pattern 1: Independent Component Mount (Always-Visible)
**What:** Component renders unconditionally in JSX tree, handles empty state internally
**When to use:** When component should persist across application state changes
**Example:**
```typescript
// Current pattern in Minimap.tsx (line 379)
if (!map) return null; // ❌ Causes unmount

// Target pattern
export const Minimap: React.FC<Props> = ({ tilesetImage }) => {
  const map = useEditorStore((state) => state.map);

  return (
    <div className="minimap">
      <canvas ref={canvasRef} width={128} height={128} />
      {/* Canvas draws checkerboard when !map, tiles when map */}
      {/* Label overlays canvas when !map */}
    </div>
  );
}; // ✅ Always returns JSX
```

### Pattern 2: Canvas createPattern for Repeating Backgrounds
**What:** Create a small offscreen canvas, draw pattern tile, use `createPattern('repeat')` to fill
**When to use:** When rendering repeating textures (checkerboard, grids, tiled backgrounds)
**Example:**
```typescript
// Source: MDN Web Docs - CanvasRenderingContext2D.createPattern()
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern

const createCheckerboardPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 16; // 2x2 blocks of 8px each
  patternCanvas.height = 16;
  const patternCtx = patternCanvas.getContext('2d');
  if (!patternCtx) return null;

  // Top-left: light gray
  patternCtx.fillStyle = '#C0C0C0';
  patternCtx.fillRect(0, 0, 8, 8);

  // Top-right: white
  patternCtx.fillStyle = '#FFFFFF';
  patternCtx.fillRect(8, 0, 8, 8);

  // Bottom-left: white
  patternCtx.fillRect(0, 8, 8, 8);

  // Bottom-right: light gray
  patternCtx.fillStyle = '#C0C0C0';
  patternCtx.fillRect(8, 8, 8, 8);

  return ctx.createPattern(patternCanvas, 'repeat');
};

// In draw function
const pattern = createCheckerboardPattern(ctx);
if (pattern) {
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
}
```

### Pattern 3: Layered Canvas Rendering (Background + Content + Overlay)
**What:** Draw in layers: background pattern → map content → UI overlays
**When to use:** When combining static patterns with dynamic content
**Example:**
```typescript
const draw = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  // Layer 1: Checkerboard background (always visible)
  const pattern = createCheckerboardPattern(ctx);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  }

  // Layer 2: Map tiles (only if map exists)
  if (map && tileColorCacheRef.current) {
    // Existing tile rendering logic (lines 253-306)
    // Paint occupied tiles over checkerboard
  }

  // Layer 3: Viewport rectangle (only if map exists)
  if (map) {
    const vp = getViewportRect();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(vp.x, vp.y, vp.width, vp.height);
  }
}, [map, viewport, getViewportRect]);
```

### Pattern 4: Conditional Overlay Text (Empty State Label)
**What:** Render text label as a positioned overlay when no content exists
**When to use:** Empty state messaging on canvas-based components
**Example:**
```typescript
return (
  <div className="minimap">
    <canvas ref={canvasRef} width={128} height={128} />
    {!map && (
      <div className="minimap-empty-label">
        Minimap
      </div>
    )}
  </div>
);
```

CSS for centered overlay:
```css
.minimap {
  position: relative;
}

.minimap-empty-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  pointer-events: none;
  user-select: none;
}
```

### Anti-Patterns to Avoid
- **Conditional rendering with `return null`:** Causes unnecessary unmount/remount cycles, loses Canvas state, prevents always-visible requirement
- **CSS gradient checkerboard instead of Canvas:** Can't layer cleanly with Canvas-rendered map content, requires two separate elements with z-index complexity
- **Drawing checkerboard per-pixel instead of createPattern:** 128×128 = 16,384 pixels to iterate vs one pattern fill — significantly slower
- **Re-creating pattern on every draw call:** Pattern creation is expensive; cache pattern in a ref or create once on mount

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Repeating texture rendering | Nested loops to fill each square | Canvas `createPattern()` with offscreen canvas | GPU-accelerated tiling, one draw call vs thousands |
| Component visibility toggling | Custom mount/unmount logic | React conditional JSX (always return element) | React handles reconciliation efficiently |
| Empty state management | Custom loading state machine | Simple `!map` conditional in JSX | Built-in React patterns handle this cleanly |
| Minimap size matching | Manual resize observers and DOM queries | CSS fixed width or `min-width: fit-content` | Browser handles layout calculations natively |

**Key insight:** Canvas API and React already provide the exact primitives needed for this phase. Custom abstractions add complexity without benefit.

## Common Pitfalls

### Pitfall 1: Creating Pattern Inside Draw Loop
**What goes wrong:** `createPattern()` called on every frame/redraw causes significant performance overhead
**Why it happens:** Natural place to put pattern creation is in the draw function
**How to avoid:** Create pattern once on mount or when tileset changes, cache in a ref
**Warning signs:** Profiler shows high CPU usage during minimap redraws, sluggish animation

### Pitfall 2: Incorrect Checkerboard Phase Offset
**What goes wrong:** Checkerboard squares don't align to 8x8 pixel grid, creating visual drift
**Why it happens:** Pattern canvas size doesn't match repeat frequency (16x16 for 8px squares)
**How to avoid:** Pattern canvas must be 16x16 (2 blocks × 8px each) for correct 2×2 checkerboard tile
**Warning signs:** Checkerboard looks irregular, doesn't align to edges cleanly

### Pitfall 3: Z-Index Battles Between Canvas and Label
**What goes wrong:** Label doesn't appear over canvas, or blocks canvas clicks
**Why it happens:** Default stacking context places canvas after label in DOM
**How to avoid:** Use `position: relative` on container, `position: absolute` on label, `pointer-events: none` on label
**Warning signs:** Label invisible, or clicks on minimap don't register

### Pitfall 4: Forgetting to Clear Pattern Fill Before Tile Rendering
**What goes wrong:** Pattern interferes with tile color rendering
**Why it happens:** fillStyle remains as pattern when switching to putImageData
**How to avoid:** `putImageData` doesn't use fillStyle — pattern is background layer only, tiles use imageData
**Warning signs:** Tiles render incorrectly or pattern shows through tiles

### Pitfall 5: Border Box Model Conflicts
**What goes wrong:** 1px border shrinks canvas rendering area, misaligns checkerboard
**Why it happens:** CSS `box-sizing: border-box` includes border in width/height
**How to avoid:** Apply border to container div, not canvas element; or account for border in canvas size calculations
**Warning signs:** Canvas appears 126×126 instead of 128×128, checkerboard cut off at edges

### Pitfall 6: Component Unmounts When Active Document Changes
**What goes wrong:** Minimap unmounts/remounts when switching between documents
**Why it happens:** If minimap stays coupled to active document lifecycle
**How to avoid:** Minimap must be sibling to AnimationPanel in App.tsx, not child; renders based on `state.map` (backward-compat layer) which syncs from active doc
**Warning signs:** Minimap flickers when switching tabs, loses scroll position, re-runs idle callback cache builds

## Code Examples

Verified patterns from existing codebase and official sources:

### Current Minimap Empty State (Line 379)
```typescript
// Current implementation - WILL CHANGE
if (!map) return null; // ❌ Causes unmount, violates always-visible requirement
```

### Existing Color Cache Pattern (Lines 57-94)
```typescript
// Existing pattern - PRESERVE THIS
const buildTileColorCache = useCallback((tilesetImg: HTMLImageElement): Uint8Array | null => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = TILE_SIZE;
  tempCanvas.height = TILE_SIZE;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return null;

  const totalTiles = Math.floor(tilesetImg.height / TILE_SIZE) * TILES_PER_ROW;
  const colorCache = new Uint8Array(totalTiles * 3);

  for (let tileId = 0; tileId < totalTiles; tileId++) {
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

    tempCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
    tempCtx.drawImage(tilesetImg, srcX, srcY, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
    const imageData = tempCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const pixels = imageData.data;

    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      rSum += pixels[i];
      gSum += pixels[i + 1];
      bSum += pixels[i + 2];
    }

    const pixelCount = TILE_SIZE * TILE_SIZE;
    const offset = tileId * 3;
    colorCache[offset] = Math.round(rSum / pixelCount);
    colorCache[offset + 1] = Math.round(gSum / pixelCount);
    colorCache[offset + 2] = Math.round(bSum / pixelCount);
  }

  return colorCache;
}, []);
```
**Pattern:** Offscreen canvas for sampling, Uint8Array for compact storage, requestIdleCallback for deferred work (line 101)

### Existing Debounced Redraw Pattern (Lines 320-326)
```typescript
// Existing pattern - PRESERVE THIS
// Debounced map redraw - batches rapid tile edits
useEffect(() => {
  const timerId = setTimeout(() => {
    draw();
  }, DEBOUNCE_DELAY);
  return () => clearTimeout(timerId);
}, [map, draw]);
```
**Pattern:** Debounce expensive redraws when map changes, but immediate redraw on viewport changes (lines 329-331)

### App.tsx Current Minimap Placement (Lines 243, 248)
```typescript
// Current structure - WILL REORGANIZE
<Panel id="animations" defaultSize={15} minSize={5}>
  <div className="right-sidebar-container">
    <Minimap tilesetImage={tilesetImage} /> {/* Line 243 - currently first child */}
    <div className="animation-panel-container">
      <div className="panel-title-bar">Animations</div>
      <AnimationPanel tilesetImage={tilesetImage} /> {/* Line 246 */}
    </div>
    <GameObjectToolPanel /> {/* Line 248 */}
  </div>
</Panel>
```
**Current state:** Minimap is first child of `.right-sidebar-container`, but conditionally renders `null` when no map. This makes it collapse, causing AnimationPanel to shift up.

**Target state:** Minimap always renders, maintains its space, AnimationPanel width matches minimap width.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `if (!map) return null` | Always render, handle empty state in JSX/Canvas | React 19.2 (Oct 2025) | React 19.2's Activity component preserves state better, but always-rendering is still best for persistent UI elements |
| CSS gradient checkerboard | Canvas createPattern for layered rendering | N/A - design decision | Canvas createPattern integrates cleanly with map tile rendering, single element |
| Manual pixel iteration for patterns | createPattern with offscreen canvas | Standard practice | GPU-accelerated, one draw call |

**Deprecated/outdated:**
- **Returning `null` for persistent components:** React 19.2 introduced Activity component for better conditional rendering, but for always-visible UI (like this minimap), rendering JSX unconditionally is the modern standard. Source: [React 19.2 updates](https://react.dev/blog/2025/10/01/react-19-2)

## Open Questions

1. **Exact minimap pixel dimensions**
   - What we know: Current is 128×128 (line 28), AnimationPanel width is 70px (AnimationPanel.tsx line 24)
   - What's unclear: Should minimap expand to match container width, or stay fixed at 128×128?
   - Recommendation: Keep 128×128 fixed size (maintains 1:2 scale with 256×256 map), AnimationPanel width constraints applied via CSS `min-width` on container

2. **Behavior when last document closes**
   - What we know: `state.map` becomes `null` when `activeDocumentId` is `null` (EditorState.ts lines 69-80)
   - What's unclear: User preference — show empty state or keep last map visible?
   - Recommendation: Show empty state (return to checkerboard + label) for clarity that no document is active

3. **Label font size exact value**
   - What we know: User wants "prominent — normal contrast, clearly readable"
   - What's unclear: Exact pixel size
   - Recommendation: Use `--font-size-base` (14px) from variables.css line 75, as it's the standard readable size for primary text

## Sources

### Primary (HIGH confidence)
- Existing codebase (E:\NewMapEditor\src\components\Minimap\Minimap.tsx) - Current implementation patterns
- Existing codebase (E:\NewMapEditor\src\App.tsx) - Current layout structure
- Existing codebase (E:\NewMapEditor\src\core\editor\EditorState.ts) - State management architecture
- MDN Web Docs - CanvasRenderingContext2D.createPattern() - https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
- React Official Docs - Conditional Rendering - https://react.dev/learn/conditional-rendering

### Secondary (MEDIUM confidence)
- [Essential React Design Patterns: Guide for 2026](https://trio.dev/essential-react-design-patterns/) - Component extraction patterns
- [Improving HTML5 Canvas performance](https://web.dev/articles/canvas-performance) - Canvas optimization techniques
- [React 19.2: New Features & Performance Boosts](https://javascript-conference.com/blog/react-19-2-updates-performance-activity-component/) - Modern React conditional rendering
- [JavaScript Canvas createPattern Tutorial](https://zetcode.com/canvas-api/createpattern/) - createPattern implementation examples
- [React.js Optimization Every React Developer Must Know (2026 Edition)](https://medium.com/@muhammadshakir4152/react-js-optimization-every-react-developer-must-know-2026-edition-e1c098f55ee9) - useEffect dependency optimization

### Tertiary (LOW confidence)
- [The Checkerboard Twist: Benchmarking](https://nandakumar.org/blog/2023/06/checkerboard-twist.html) - Performance comparison of checkerboard algorithms (unverified benchmark methodology)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All technologies already in project, no new dependencies
- Architecture: HIGH - Existing patterns (Canvas, color cache, debouncing) well-established and verified
- Pitfalls: MEDIUM-HIGH - Common canvas/React patterns documented, but specific to this codebase's architecture

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days - stable technologies, established patterns)
