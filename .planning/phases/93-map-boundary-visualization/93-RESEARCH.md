# Phase 93: Map Boundary Visualization - Research

**Researched:** 2026-02-20
**Domain:** Canvas 2D API, CSS theme integration in canvas rendering, map coordinate math
**Confidence:** HIGH

## Summary

Phase 93 adds a visual boundary that distinguishes the 256x256 editable map area from the surrounding void. The project uses a three-canvas architecture: mapLayer (tiles via CanvasEngine), gridLayer (grid lines), and uiLayer (cursors, selection, ruler). The boundary visualization fits cleanly into this stack without architectural changes.

There are two distinct jobs: (1) fill the out-of-map area on the **map layer canvas** with a distinct color so that area beyond tile 255 looks different from the default empty tile (tile 280, rendered transparent), and (2) draw a border line on the **UI overlay canvas** at the exact map edge (tile coordinates 0,0 to 256,256) that stays aligned at all zoom levels.

Theme-awareness is the main technical challenge. Canvas 2D cannot read CSS custom properties directly — the only correct approach is `getComputedStyle(document.documentElement).getPropertyValue('--css-var')` to sample CSS tokens at draw time. The existing codebase reads theme via `document.documentElement`'s `data-theme` attribute, set by the `applyTheme` function in `App.tsx`. There is no Zustand store state for the current theme. The cleanest solution is to read CSS variables at draw time (on each `drawMapLayer` call for out-of-map fill, on each `drawUiLayer` call for the border line), which automatically follows theme changes.

The out-of-map area background currently comes from `.map-canvas-container`'s CSS `background-color: var(--color-neutral-300)`. This means the "outside-map" void is currently just the container CSS background showing through transparent tile pixels. The simplest approach that satisfies CNVS-01 is to add a distinct out-of-map fill directly on the **map canvas** (via CanvasEngine or in `drawMapLayer`) rather than relying on CSS background. This gives pixel-perfect alignment with the tile grid at all zoom levels.

**Primary recommendation:** Render the out-of-map fill as four `fillRect` strips on the map layer canvas (or as a full-canvas fill with the map region clipped on top). Draw the border line on the UI overlay canvas at the exact map edge using the existing `drawUiLayer` callback. Read CSS tokens at draw time using `getComputedStyle`. Subscribe to theme changes via a `MutationObserver` on `document.documentElement` to trigger a canvas refresh when `data-theme` changes.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API (native) | — | fillRect for out-of-map area, strokeRect for border line | Already used throughout; no library needed |
| getComputedStyle (native) | — | Read CSS custom properties for theme-aware colors | Only correct way to read CSS vars in canvas context |
| MutationObserver (native) | — | Detect `data-theme` attribute changes on `<html>` | Native, no library; used widely in the web ecosystem |

### Supporting
None required. This phase has no new dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| getComputedStyle for theme colors | Hardcoded hex per theme | getComputedStyle is correct and future-proof; hardcoded colors duplicate CSS and break if tokens change |
| MutationObserver for theme changes | Zustand store `theme` field | MutationObserver is zero-overhead and avoids adding a new Zustand field; theme changes are infrequent |
| Four fillRect strips for out-of-map | Full canvas fill + clip | Strip approach is simpler: fill the four regions outside the map rect without any clipping context save/restore |
| Map canvas (mapLayer) for out-of-map fill | Grid canvas (gridLayer) for fill | Map canvas is the correct semantic home — it renders everything "behind" tiles; grid canvas is for the grid overlay only |

**Installation:** No new packages.

## Architecture Patterns

### Existing Canvas Layer Architecture

```
.map-canvas-container (position: relative, background: var(--color-neutral-300))
  mapLayer canvas  (z-index: auto, no-events) ← CanvasEngine renders tiles here
  gridLayer canvas (z-index: auto, no-events) ← Grid pattern rendered here
  uiLayer canvas   (z-index: auto, receives mouse events) ← Cursors, selection, ruler
  scroll-track-h / scroll-track-v
```

Phase 91 established z-index 200000 for overlays (minimap, game object panel). The three map canvas layers share the same z-index budget within `.map-canvas-container`. No z-index changes are needed for this phase.

### Key Coordinate Math

The viewport transform used throughout the codebase:
```typescript
// Screen coordinates of map tile (tileX, tileY):
const screenX = (tileX - viewport.x) * TILE_SIZE * viewport.zoom;
const screenY = (tileY - viewport.y) * TILE_SIZE * viewport.zoom;

// Map edge in screen coords (tile 0,0 to 256,256):
const mapLeft   = (0 - viewport.x) * TILE_SIZE * viewport.zoom;
const mapTop    = (0 - viewport.y) * TILE_SIZE * viewport.zoom;
const mapRight  = (256 - viewport.x) * TILE_SIZE * viewport.zoom;
const mapBottom = (256 - viewport.y) * TILE_SIZE * viewport.zoom;

// Border rect on UI overlay:
ctx.strokeRect(mapLeft, mapTop, mapRight - mapLeft, mapBottom - mapTop);
```

The four out-of-map strips on the map canvas (using screen coords):
```typescript
const tilePixels = TILE_SIZE * viewport.zoom;
const mapLeft   = (0 - viewport.x) * tilePixels;
const mapTop    = (0 - viewport.y) * tilePixels;
const mapRight  = (MAP_WIDTH - viewport.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - viewport.y) * tilePixels;

// Left strip (from screen left to map left edge)
if (mapLeft > 0) ctx.fillRect(0, 0, mapLeft, canvasHeight);
// Right strip (from map right edge to screen right)
if (mapRight < canvasWidth) ctx.fillRect(mapRight, 0, canvasWidth - mapRight, canvasHeight);
// Top strip (between map left and right, above map top)
if (mapTop > 0) ctx.fillRect(Math.max(0, mapLeft), 0, Math.min(canvasWidth, mapRight) - Math.max(0, mapLeft), mapTop);
// Bottom strip (between map left and right, below map bottom)
if (mapBottom < canvasHeight) ctx.fillRect(Math.max(0, mapLeft), mapBottom, Math.min(canvasWidth, mapRight) - Math.max(0, mapLeft), canvasHeight - mapBottom);
```

Note: the buffer is 4096x4096 (tile coords) — the out-of-map fill must be done on the **screen canvas** (via `blitToScreen` or in the UI overlay), NOT in the off-screen buffer, because the buffer only covers the map itself.

### Pattern 1: Out-of-Map Fill on Map Canvas After Blit

**What:** After `blitToScreen` renders the map tiles onto the map layer canvas, fill the areas outside the 256x256 map region with a theme-aware color.

**When to use:** Any time the map layer is redrawn (viewport change, zoom, tile edit).

**Implementation approach — extend `blitToScreen` in CanvasEngine:**
```typescript
// After the drawImage blit in blitToScreen():
// Fill out-of-map regions with a color read from CSS at call time
const outOfMapColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--canvas-out-of-map-bg').trim()
  || 'oklch(25% 0.01 250)'; // fallback

screenCtx.fillStyle = outOfMapColor;

const tilePixels = TILE_SIZE * viewport.zoom;
const mapLeft   = (0 - viewport.x) * tilePixels;
const mapTop    = (0 - viewport.y) * tilePixels;
const mapRight  = (MAP_WIDTH - viewport.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - viewport.y) * tilePixels;

// Left strip
if (mapLeft > 0)
  screenCtx.fillRect(0, 0, mapLeft, canvasHeight);
// Right strip
if (mapRight < canvasWidth)
  screenCtx.fillRect(mapRight, 0, canvasWidth - mapRight, canvasHeight);
// Top strip (clamped to map left/right)
const stripLeft  = Math.max(0, mapLeft);
const stripRight = Math.min(canvasWidth, mapRight);
if (mapTop > 0 && stripRight > stripLeft)
  screenCtx.fillRect(stripLeft, 0, stripRight - stripLeft, mapTop);
// Bottom strip
if (mapBottom < canvasHeight && stripRight > stripLeft)
  screenCtx.fillRect(stripLeft, mapBottom, stripRight - stripLeft, canvasHeight - mapBottom);
```

**Why in `blitToScreen` rather than `drawMapLayer`:** `blitToScreen` is always called after any tile rendering (viewport change, full rebuild, animated patch). Centralizing the out-of-map fill here avoids duplicating the fill logic across multiple call sites.

**Note on the 4096x4096 buffer:** The buffer only represents the 256x256 map (4096px = 256 tiles * 16px). There is nothing in the buffer outside the map. After `blitToScreen`, the screen canvas may show areas to the left/top/right/bottom of the map that received no `drawImage` content — those areas need the fill color.

### Pattern 2: Border Line on UI Overlay

**What:** Draw a 1-2px border line on the UI overlay canvas marking the exact edge of the 256x256 map region. Drawn in `drawUiLayer`.

**When to use:** `drawUiLayer` is called on every cursor move (via RAF debounce) and on viewport/tool changes. The border renders unconditionally as the first draw in `drawUiLayer`.

```typescript
// In drawUiLayer, before all other overlay content:
const tilePixels = TILE_SIZE * vp.zoom;
const mapLeft   = (0 - vp.x) * tilePixels;
const mapTop    = (0 - vp.y) * tilePixels;
const mapRight  = (MAP_WIDTH - vp.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - vp.y) * tilePixels;

const borderColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--canvas-map-border').trim()
  || 'rgba(255,255,255,0.4)';

ctx.strokeStyle = borderColor;
ctx.lineWidth = 1;
ctx.setLineDash([]);
ctx.strokeRect(mapLeft + 0.5, mapTop + 0.5, mapRight - mapLeft, mapBottom - mapTop);
```

The 0.5px offset ensures the 1px line sits exactly on the integer pixel boundary (canvas sub-pixel rendering convention).

### Pattern 3: Theme-Aware Colors via CSS Custom Properties

**What:** Define new CSS custom properties `--canvas-out-of-map-bg` and `--canvas-map-border` in `variables.css` for all three themes, then read them at draw time via `getComputedStyle`.

**Theme values to define:**

Light theme (`:root`):
```css
--canvas-out-of-map-bg: oklch(82% 0.008 250);   /* Slightly warm cool grey, distinct from neutral-300 */
--canvas-map-border: rgba(100, 120, 160, 0.6);   /* Muted blue-grey border */
```

Dark theme (`[data-theme="dark"]`):
```css
--canvas-out-of-map-bg: oklch(10% 0.015 260);   /* Very dark blue-grey, distinct from dark tile */
--canvas-map-border: rgba(120, 160, 220, 0.5);   /* Lighter blue border for contrast */
```

Terminal theme (`[data-theme="terminal"]`):
```css
--canvas-out-of-map-bg: oklch(3% 0.01 160);     /* Near-black with green tint, distinct from tiles */
--canvas-map-border: oklch(45% 0.08 160);        /* Dark green border */
```

**Key constraint:** The out-of-map color must be visually distinct from tile 280 (DEFAULT_TILE). Tile 280 is rendered transparent — the container's CSS background shows through. Container background is `var(--color-neutral-300)` for light, `oklch(12% 0.01 260)` for dark, `oklch(3% 0 0)` for terminal. The new out-of-map color should contrast with these values AND with tile 280's transparent "bleed" color.

**How to read CSS vars in canvas context:**
```typescript
// Correct approach — reads computed value at draw time (after CSS cascade)
const color = getComputedStyle(document.documentElement)
  .getPropertyValue('--canvas-out-of-map-bg')
  .trim();

// Incorrect — cannot access CSS variables from JS without getComputedStyle
const color = document.documentElement.style.getPropertyValue('--canvas-out-of-map-bg'); // WRONG
```

`getComputedStyle` is synchronous and fast. Calling it once per `blitToScreen` and once per `drawUiLayer` is negligible overhead.

### Pattern 4: Theme-Change Refresh via MutationObserver

**What:** When the user switches themes (Electron View > Theme), `App.tsx` sets `document.documentElement.setAttribute('data-theme', theme)`. To ensure the canvas redraws with new colors, observe attribute changes on `<html>`.

**Where to set up:** Inside `MapCanvas.tsx`'s setup `useEffect` (or a dedicated effect). The observer triggers a full redraw of map and UI layers.

```typescript
useEffect(() => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        // Force full map redraw (blitToScreen will pick up new CSS color)
        drawMapLayerRef.current();
        // Force UI overlay redraw (border line picks up new color)
        drawUiLayerRef.current();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}, []); // empty deps — observer stays connected for component lifetime
```

**Why MutationObserver and not Zustand:** Theme is not in Zustand state (confirmed: searched `globalSlice.ts` — no `theme` field). Theme is stored in `localStorage` and applied to `document.documentElement` via `applyTheme` in `App.tsx`. Adding theme to Zustand would require more changes. MutationObserver is the minimal approach.

### Anti-Patterns to Avoid

- **Drawing out-of-map fill in the 4096x4096 buffer:** The buffer only has space for the 256x256 tile region. Out-of-map areas exist only on the screen canvas (they are outside the buffer's extent). Drawing into the buffer for this purpose is architecturally wrong.
- **Hardcoding hex colors per theme:** Duplicates the theme system; breaks when token values change.
- **Checking theme via `document.documentElement.getAttribute('data-theme')`:** Works for switching between dark/terminal, but "light" theme has no attribute (it's the default). Use `getComputedStyle` directly instead.
- **Using `imageSmoothingEnabled`:** The map canvas already disables smoothing. The out-of-map fill is a solid color fill — smoothing settings don't affect `fillRect`.
- **Clearing the entire map canvas before blit:** `blitToScreen` calls `clearRect` then `drawImage`. If the out-of-map fill is drawn before the blit, it gets cleared. Draw it AFTER `drawImage`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading CSS tokens in canvas | String-parse theme name, switch on color | `getComputedStyle(document.documentElement).getPropertyValue()` | Single source of truth from CSS cascade; no maintenance burden |
| Theme change detection | Polling loop or custom event | `MutationObserver` on `data-theme` attribute | Native, zero-cost when idle, correct for this DOM pattern |

## Common Pitfalls

### Pitfall 1: Out-of-Map Fill Drawn Before the Blit Gets Erased
**What goes wrong:** If `fillRect` (out-of-map color) is called before `drawImage` (tile blit) in `blitToScreen`, the `clearRect` at the top of `blitToScreen` erases it. OR if the fill is after but `clearRect` also runs after the fill at some point, it's erased.
**Why it happens:** `blitToScreen` calls `screenCtx.clearRect(0, 0, canvasWidth, canvasHeight)` before `drawImage`. The fill must come after `drawImage`.
**How to avoid:** Place out-of-map fill calls at the end of `blitToScreen`, after the `drawImage(buffer, ...)` call.
**Warning signs:** Out-of-map area shows the CSS container background color instead of the fill color.

### Pitfall 2: Border Line Rendered Behind Other UI Elements
**What goes wrong:** Border line is drawn after cursor/selection overlays, visually competing with them.
**Why it happens:** `drawUiLayer` renders many overlays; order matters.
**How to avoid:** Draw the border as the FIRST thing in `drawUiLayer` (right after `clearRect`). All other overlays render on top.
**Warning signs:** Border appears behind selection rectangles or ruler lines.

### Pitfall 3: Border Line Misaligned at Non-Integer Zoom
**What goes wrong:** Border line appears blurry or off by a fraction of a pixel, especially at zoom levels like 0.25x, 0.33x, 1.5x.
**Why it happens:** Canvas lines are centered on their coordinate. A 1px line at coordinate `x` renders from `x-0.5` to `x+0.5`. Without the 0.5px offset, lines at integer coords render spanning two pixels each at 50% opacity.
**How to avoid:** Use `strokeRect(mapLeft + 0.5, mapTop + 0.5, w, h)` — the +0.5 aligns the line center to the pixel boundary.
**Warning signs:** Blurry or dim border line at 1x zoom; sharp at 2x.

### Pitfall 4: Fill Strips Overlap Map Region at Extreme Zoom or Scroll
**What goes wrong:** When viewport is scrolled so the map starts at positive screen X/Y, the top or left strips should only fill from screen-0 to map-edge. If strip bounds are not clamped, they may extend into the map region.
**Why it happens:** The four-strip approach needs careful clamping of strip extents to avoid painting over tile content.
**How to avoid:** Use `Math.max(0, mapLeft)` and `Math.min(canvasWidth, mapRight)` for strip boundaries. Test at viewport.x = 0, viewport.y = 0 (map starts at origin — no left/top strips needed) and at viewport.x < 0 (map extends left of screen — only fill what's visible to the right of the map).
**Warning signs:** Thin colored strip visible over the first column or first row of tiles.

### Pitfall 5: Scroll to Corner Shows Incorrect Fill Shape
**What goes wrong:** When scrolled to show map corner (viewport.x > 0 AND viewport.y > 0), the "top strip" fill should only cover from `mapLeft` to `mapRight` horizontally, not the full canvas width (left and right strips handle the sides).
**Why it happens:** If the top strip is drawn as full-width `fillRect(0, 0, canvasWidth, mapTop)`, it overlaps the regions that the left and right strips cover too. This is not technically wrong (double-painting the same color) but becomes an issue if transparency or blend modes are used.
**How to avoid:** Use the clamped horizontal bounds `[Math.max(0, mapLeft), Math.min(canvasWidth, mapRight)]` for top and bottom strips. This produces exactly the four non-overlapping quadrants of out-of-map area.

### Pitfall 6: getComputedStyle Returns Empty String Before First Paint
**What goes wrong:** `getComputedStyle` called during initial render before CSS is applied returns empty string for custom properties.
**Why it happens:** The CSS cascade may not have applied during the first synchronous render tick.
**How to avoid:** Always provide a fallback color: `|| 'oklch(10% 0.01 260)'`. In practice, `blitToScreen` and `drawUiLayer` are called from `useEffect` (after paint), so CSS is always applied by then. The fallback is a safety net only.

## Code Examples

### Define CSS Tokens in variables.css

```css
/* Source: E:\NewMapEditor\src\styles\variables.css (additions to :root, dark, terminal blocks) */

/* :root (light theme) */
--canvas-out-of-map-bg: oklch(82% 0.008 250);
--canvas-map-border: rgba(100, 120, 160, 0.6);

/* [data-theme="dark"] */
--canvas-out-of-map-bg: oklch(10% 0.015 260);
--canvas-map-border: rgba(120, 160, 220, 0.5);

/* [data-theme="terminal"] */
--canvas-out-of-map-bg: oklch(3% 0.01 160);
--canvas-map-border: oklch(45% 0.08 160);
```

### Out-of-Map Fill in CanvasEngine.blitToScreen

```typescript
// Source: E:\NewMapEditor\src\core\canvas\CanvasEngine.ts
// Add at END of blitToScreen(), after the drawImage call and lastBlitVp assignment:

// Fill out-of-map regions with theme-aware color (CNVS-01)
const outOfMapColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--canvas-out-of-map-bg').trim()
  || 'oklch(10% 0.01 260)';

screenCtx.fillStyle = outOfMapColor;

const tilePixels = TILE_SIZE * viewport.zoom;
const mapLeft   = (0 - viewport.x) * tilePixels;
const mapTop    = (0 - viewport.y) * tilePixels;
const mapRight  = (MAP_WIDTH - viewport.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - viewport.y) * tilePixels;
const stripL = Math.max(0, mapLeft);
const stripR = Math.min(canvasWidth, mapRight);

if (mapLeft > 0)
  screenCtx.fillRect(0, 0, mapLeft, canvasHeight);
if (mapRight < canvasWidth)
  screenCtx.fillRect(mapRight, 0, canvasWidth - mapRight, canvasHeight);
if (mapTop > 0 && stripR > stripL)
  screenCtx.fillRect(stripL, 0, stripR - stripL, mapTop);
if (mapBottom < canvasHeight && stripR > stripL)
  screenCtx.fillRect(stripL, mapBottom, stripR - stripL, canvasHeight - mapBottom);
```

### Border Line in MapCanvas.drawUiLayer

```typescript
// Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx
// Add at START of drawUiLayer, right after ctx.clearRect(0, 0, ...):

// Map boundary border line (CNVS-01)
const tilePixels = TILE_SIZE * vp.zoom;
const mapLeft   = (0 - vp.x) * tilePixels;
const mapTop    = (0 - vp.y) * tilePixels;
const mapRight  = (MAP_WIDTH - vp.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - vp.y) * tilePixels;

const borderColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--canvas-map-border').trim()
  || 'rgba(120, 160, 220, 0.5)';

ctx.save();
ctx.strokeStyle = borderColor;
ctx.lineWidth = 1;
ctx.setLineDash([]);
ctx.strokeRect(mapLeft + 0.5, mapTop + 0.5, mapRight - mapLeft, mapBottom - mapTop);
ctx.restore();
```

### MutationObserver in MapCanvas.tsx

```typescript
// Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx
// New useEffect added after the ResizeObserver effect:

useEffect(() => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        drawMapLayerRef.current();   // triggers blitToScreen with new out-of-map color
        drawUiLayerRef.current();    // triggers border line with new color
        break;
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  return () => observer.disconnect();
}, []); // stable — observer stays for component lifetime
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS background-color shows through transparent tiles | Explicit canvas fill for out-of-map area | This phase | Pixel-perfect alignment at all zoom levels, no CSS leak-through artifact |
| No map boundary indicator | Border line on UI overlay | This phase | User can see exact map edge at all times |

**Deprecated/outdated:**
- Relying on `.map-canvas-container`'s `background-color` for out-of-map appearance: It shows the container CSS background through transparent tile pixels, which is zoom-aligned but not visually distinct enough. The new approach draws directly on the canvas for a controlled, theme-aware color.

## Open Questions

1. **Where to draw out-of-map fill: CanvasEngine.blitToScreen vs drawMapLayer in MapCanvas**
   - What we know: `blitToScreen` is the single exit point for all map rendering (called from `drawMapLayer`, `patchTile`, `patchAnimatedTiles`, `paintTile`). Adding the fill there covers ALL rendering paths automatically.
   - What's unclear: Whether adding rendering logic to `CanvasEngine` (which is designed as a portable, Electron-agnostic module) is appropriate for DOM-aware operations like `getComputedStyle`.
   - Recommendation: Add the fill to `blitToScreen` in CanvasEngine. The engine already imports from `@core/map` and calls `useEditorStore.getState()` — it is already DOM-adjacent. `getComputedStyle(document.documentElement)` is standard DOM, not Electron-specific. Alternatively, the fill can be done in `MapCanvas.tsx`'s `drawMapLayer` callback after calling `engine.drawMapLayer(...)`, but this means every caller of blitToScreen in the engine (including `patchTile`, `paintTile`) would miss the fill. The engine is the right place.

2. **Should the out-of-map color use an explicit canvas-specific token or reuse an existing surface token?**
   - What we know: The existing `--workspace-bg` token (used by `.workspace` CSS background) has values: light=`var(--color-neutral-200)`, dark=`oklch(12% 0.01 260)`, terminal=`oklch(3% 0 0)`. The container background is `var(--color-neutral-300)` (light only). DEFAULT_TILE (tile 280) is transparent — so the out-of-map fill must differ from the container background AND from the tile colors.
   - What's unclear: Whether reusing `--workspace-bg` would provide enough contrast from map tiles in all themes.
   - Recommendation: Define a dedicated `--canvas-out-of-map-bg` token. This avoids coupling the canvas fill to the workspace background, which may change independently. New tokens are the correct pattern per the two-tier CSS system already in use.

3. **Should the border line be visible only when the map edge is in the viewport?**
   - What we know: The `strokeRect` call will draw even if the map edge is off-screen (canvas clips automatically). When fully zoomed out so the whole map is visible, the border will be visible. When zoomed in to tile 0, the top-left border corner will be visible.
   - What's unclear: Whether a border that appears only "inside" the viewport (e.g., only the right edge shows when scrolled to show tile column 255) is sufficient UX.
   - Recommendation: No special logic needed. Canvas clipping handles out-of-bounds strokes automatically. The `strokeRect` will simply show whatever portion of the border rectangle intersects the canvas viewport. This is the expected behavior.

## Files to Change

| File | Change | Why |
|------|--------|-----|
| `src/styles/variables.css` | Add `--canvas-out-of-map-bg` and `--canvas-map-border` to `:root`, `[data-theme="dark"]`, `[data-theme="terminal"]` | Theme-aware color tokens |
| `src/core/canvas/CanvasEngine.ts` | Add out-of-map `fillRect` strips at end of `blitToScreen()` | Fills void outside map on map canvas, all zoom levels |
| `src/components/MapCanvas/MapCanvas.tsx` | (1) Add border `strokeRect` at start of `drawUiLayer`; (2) Add `MutationObserver` effect for theme changes | Border on UI overlay; theme-change refresh |

**No other files need changing.** The plan for 93-01 aligns with these three files.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — `blitToScreen` implementation, buffer architecture, call chain verified
- Direct codebase inspection: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — `drawUiLayer`, `drawMapLayer`, three-canvas architecture, ResizeObserver pattern, stable refs, RAF debounce verified
- Direct codebase inspection: `E:\NewMapEditor\src\styles\variables.css` — all three theme blocks, existing token names, two-tier system verified
- Direct codebase inspection: `E:\NewMapEditor\src\App.tsx` — `applyTheme` function, `document.documentElement.setAttribute('data-theme', ...)` pattern verified
- Direct codebase inspection: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css` — `.map-canvas-container` background verified
- Direct codebase inspection: `.planning/phases/91-overlay-z-order-minimap-size/91-RESEARCH.md` — z-index budget, D91-01-1 decision (z-index 200000) confirmed

### Secondary (MEDIUM confidence)
- Canvas 2D API pixel alignment: 0.5px offset for crisp 1px lines — well-established Canvas API pattern, confirmed from training knowledge (Aug 2025 cutoff), applies to all browser Canvas implementations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from direct codebase inspection; no external libraries
- Architecture: HIGH — call chain in CanvasEngine verified by reading every method; three-canvas structure confirmed
- Pitfalls: HIGH — pitfall 1 (clearRect ordering) verified by reading blitToScreen; pitfalls 3-5 verified by coordinate math from existing code; pitfall 6 is standard Canvas API behavior

**Research date:** 2026-02-20
**Valid until:** Stable until CanvasEngine or MapCanvas architecture changes (no external dependencies)
