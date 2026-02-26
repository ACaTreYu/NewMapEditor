# Phase 101: Canvas Background Mode Selector - Research

**Researched:** 2026-02-26
**Domain:** Canvas 2D rendering, React/Zustand state, Electron IPC, localStorage persistence
**Confidence:** HIGH

## Summary

This phase adds a live-canvas background mode selector to the editor toolbar. The backend types and rendering logic for five background modes (transparent, classic, farplane, color, image) already exist in `overviewRenderer.ts` and are used by the export dialog — they need to be adapted and plumbed into the live `CanvasEngine` class. The critical constraint is that background must be drawn on the **screen canvas**, never into the off-screen tile buffer, and must work in two distinct rendering paths: `blitToScreen` (full viewport blit) and `blitDirtyRect` (animated-tile partial blit).

The state architecture is straightforward: add `canvasBackgroundMode` (the type string) and `canvasBackgroundColor` (hex string) to `GlobalSlice`; farplane and custom-image `HTMLImageElement` refs live in `App.tsx` state (like `farplaneImage` already does) and are passed to `CanvasEngine` as setters analogous to `setTilesetImage`. Persistence is localStorage (consistent with the theme system pattern). The toolbar UI follows the exact `grid-settings-wrapper` + `toolbar-dropdown` pattern already present.

The farplane parallax scroll requirement needs special attention: in the live canvas the viewport scrolls, so farplane must be rendered as a viewport-offset slice of the 4096×4096 virtual space (same math as `overviewRenderer.ts`'s `drawScaledImageRegion`), not a static fill. The `blitDirtyRect` path is currently a raw `screenCtx.clearRect + drawImage` — both calls must be wrapped to draw background into the cleared region before the tile blit.

**Primary recommendation:** Reuse the `BackgroundMode` union type from `overviewRenderer.ts` verbatim; extend `CanvasEngine` with `setBackground(mode)` + `setFarplaneImage(img)` + `setCustomBgImage(img)` methods; draw background in `blitToScreen` and in `blitDirtyRect` after clearRect and before the tile drawImage.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | browser built-in | Drawing background fills and images | Already the rendering primitive throughout the project |
| Zustand | project-current | State for bg mode + color | All editor state lives here |
| React useState | 18 | App-level image refs (farplaneImage, customBgImage) | Pattern established for tilesetImage and farplaneImage |
| localStorage | browser built-in | Persist bg mode + color across sessions | Established pattern: theme system, grid settings |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons (lucide) | project-current | Dropdown button icon in toolbar | All toolbar icons use this |
| TypeScript union types | project-current | `BackgroundMode` reuse | Reuse existing type from overviewRenderer.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand for bg mode | React context | Zustand is already the state bus; context adds complexity for no benefit |
| Passing image via prop | IPC data URL stored in state | Props work fine here; storing large ImageElement in Zustand is wasteful |
| CSS background on canvas container | Canvas-drawn bg | CSS background would be hidden by the opaque canvas element |

**Installation:**
No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/canvas/CanvasEngine.ts       # Add setBackground / setFarplaneImage / setCustomBgImage + drawBackground helper
├── core/editor/slices/globalSlice.ts  # Add canvasBackgroundMode + canvasBackgroundColor + setters
├── components/ToolBar/ToolBar.tsx     # Add BG mode dropdown widget (grid-settings-wrapper pattern)
├── components/ToolBar/ToolBar.css     # Add .bg-dropdown styles (mirror .grid-settings-dropdown)
└── App.tsx                            # Wire farplaneImage + customBgImage into CanvasEngine on change
```

No new files are strictly required — all changes are surgical additions to existing files.

### Pattern 1: BackgroundMode Type Reuse
**What:** The `BackgroundMode` discriminated union already exists in `src/core/export/overviewRenderer.ts`:
```typescript
export type BackgroundMode =
  | { type: 'farplane'; image: HTMLImageElement }
  | { type: 'transparent' }
  | { type: 'classic' }        // SEdit magenta #FF00FF
  | { type: 'color'; color: string }
  | { type: 'image'; image: HTMLImageElement };
```
**When to use:** Reuse this type directly in `CanvasEngine`. Do NOT redefine it. Import from `overviewRenderer.ts`.

**Note:** Zustand should NOT store `BackgroundMode` as the full union (it has `HTMLImageElement` variants which are not serializable). Store only the mode string and color in Zustand; assemble the full `BackgroundMode` object in `CanvasEngine.setBackground()` by combining the Zustand mode with the image refs already held by the engine.

### Pattern 2: CanvasEngine Setter Methods
**What:** CanvasEngine uses setter methods to receive external state (`setTilesetImage` already exists). Follow the same pattern for background images.

```typescript
// Source: CanvasEngine.ts existing pattern
setTilesetImage(img: HTMLImageElement | null): void {
  this.tilesetImage = img;
}

// New methods to add:
setFarplaneImage(img: HTMLImageElement | null): void {
  this.farplaneImage = img;
}
setCustomBgImage(img: HTMLImageElement | null): void {
  this.customBgImage = img;
}
setBackgroundMode(mode: string, color?: string): void {
  this.backgroundMode = mode;
  if (color !== undefined) this.backgroundColor = color;
}
```

### Pattern 3: Background Drawing in blitToScreen
**What:** `blitToScreen` currently calls `screenCtx.clearRect(0, 0, canvasWidth, canvasHeight)` then blits the tile buffer. The background must be drawn **after clearRect and before the tile blit** within the visible map region only (out-of-map regions are already handled by the existing fill-strip logic).

```typescript
// In blitToScreen, after clearRect, before drawImage(buffer, ...):
// 1. Draw background fill for the map area only
const mapLeft   = (0 - viewport.x) * tilePixels;
const mapTop    = (0 - viewport.y) * tilePixels;
const mapRight  = (MAP_WIDTH - viewport.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - viewport.y) * tilePixels;
const fillX = Math.max(0, mapLeft);
const fillY = Math.max(0, mapTop);
const fillW = Math.min(canvasWidth, mapRight) - fillX;
const fillH = Math.min(canvasHeight, mapBottom) - fillY;
if (fillW > 0 && fillH > 0) {
  this.drawScreenBackground(screenCtx, viewport, fillX, fillY, fillW, fillH, canvasWidth, canvasHeight);
}
// 2. Then drawImage(buffer, ...) on top
```

### Pattern 4: Background Drawing in blitDirtyRect
**What:** `blitDirtyRect` is the animated-tile partial blit path. It currently calls `screenCtx.clearRect(clipX, clipY, ...)` followed by `screenCtx.drawImage(buffer, ...)`. The background must be inserted between these two calls.

```typescript
// In blitDirtyRect, after clearRect, before drawImage:
this.drawScreenBackground(screenCtx, viewport, clipX, clipY, clipR - clipX, clipB - clipY, canvasWidth, canvasHeight);
screenCtx.drawImage(buffer, srcX, srcY, srcW, srcH, clipX, clipY, clipR - clipX, clipB - clipY);
```

### Pattern 5: Farplane Parallax Math
**What:** The farplane image conceptually fills a 4096×4096 virtual space (one pixel per map pixel = 256 tiles × 16px). When blitting to a screen region that starts at `(clipX, clipY)` screen pixels, we must map back through the viewport transform to get the farplane source coordinates.

```typescript
// Map screen pixel (screenX, screenY) → map pixel coord → farplane source pixel
// viewport.x/y is in tiles; tilePixels = TILE_SIZE * viewport.zoom
// mapPixelX = screenX / viewport.zoom + viewport.x * TILE_SIZE
// farplaneScale = farplane.naturalWidth / 4096 (or height/4096)
// farplaneSrcX = mapPixelX * farplaneScale

// For a screen region (screenX, screenY, screenW, screenH):
const mapPixelX = screenX / viewport.zoom + viewport.x * TILE_SIZE;
const mapPixelY = screenY / viewport.zoom + viewport.y * TILE_SIZE;
const mapPixelW = screenW / viewport.zoom;
const mapPixelH = screenH / viewport.zoom;
const scaleX = farplaneImage.naturalWidth / (MAP_WIDTH * TILE_SIZE);   // 4096
const scaleY = farplaneImage.naturalHeight / (MAP_HEIGHT * TILE_SIZE); // 4096
ctx.drawImage(farplaneImage,
  mapPixelX * scaleX, mapPixelY * scaleY,
  mapPixelW * scaleX, mapPixelH * scaleY,
  screenX, screenY, screenW, screenH
);
```

This is equivalent to the `drawScaledImageRegion` function in `overviewRenderer.ts` but adapted to viewport-relative coordinates.

### Pattern 6: GlobalSlice State Addition
**What:** Add `canvasBackgroundMode` (string, not the full union) and `canvasBackgroundColor` (hex string) to `GlobalSlice`. Follow the exact pattern used for `gridColor` and `gridOpacity`.

```typescript
// In GlobalSlice interface:
canvasBackgroundMode: string;    // 'transparent' | 'classic' | 'farplane' | 'color' | 'image'
canvasBackgroundColor: string;   // hex color for 'color' mode, e.g. '#000000'

// In createGlobalSlice initial state:
canvasBackgroundMode: 'transparent',
canvasBackgroundColor: '#000000',

// Actions:
setCanvasBackgroundMode: (mode: string) => void;
setCanvasBackgroundColor: (color: string) => void;
```

### Pattern 7: LocalStorage Persistence
**What:** Load from localStorage on init, save on each change. Follow the theme system pattern in `App.tsx`.

```typescript
// On GlobalSlice creation or in App.tsx useEffect:
const storedMode = localStorage.getItem('ac-editor-canvas-bg-mode') || 'transparent';
const storedColor = localStorage.getItem('ac-editor-canvas-bg-color') || '#000000';

// On setCanvasBackgroundMode:
localStorage.setItem('ac-editor-canvas-bg-mode', mode);

// On setCanvasBackgroundColor:
localStorage.setItem('ac-editor-canvas-bg-color', color);
```

Alternatively, initialize the GlobalSlice from localStorage immediately (set the default in the `createGlobalSlice` initial state using a `localStorage.getItem` call). This is slightly cleaner — the state is correct from the first render without a separate useEffect.

**Recommendation:** Initialize directly in the slice for simplicity. The theme system uses a useEffect, but for simple string values, inline initialization is cleaner.

### Pattern 8: Toolbar Dropdown UI
**What:** Reuse the `.grid-settings-wrapper` + `.toolbar-dropdown` CSS pattern. The background mode selector follows the same compound-button style (icon button + arrow → dropdown panel).

```tsx
// Mirror the grid settings dropdown compound button in ToolBar.tsx:
<div className="bg-settings-wrapper">
  <button className="toolbar-button" title="Canvas Background">
    <LuImage size={14} />  {/* or LuLayers / LuBackground */}
  </button>
  <button className="toolbar-button grid-settings-arrow" onClick={() => setBgOpen(!bgOpen)}>▾</button>
  {bgOpen && (
    <div className="grid-settings-dropdown bg-settings-dropdown">
      {/* mode selector + color input */}
    </div>
  )}
</div>
```

For the color input when mode is 'color', reuse the `<input type="color">` pattern from `OverviewExportDialog.tsx`.

### Anti-Patterns to Avoid
- **Drawing background into the off-screen tile buffer:** The buffer stores only tile bitmaps; drawing background into it causes "holes" during incremental patch because `clearRect` would erase the background from already-painted areas. Always draw background on the screen canvas.
- **Storing HTMLImageElement in Zustand:** Images are mutable DOM objects, not serializable state. Store only mode string + color string in Zustand; keep image refs on CanvasEngine directly (like tilesetImage).
- **Rebuilding the full tile buffer on bg mode change:** A background mode change needs only `blitToScreen` (or the next animation tick), not a full buffer rebuild. Do not invalidate `prevTiles` when the mode changes.
- **Doing farplane scrolling with CSS background-position:** The canvas has no CSS background concept relevant here; the parallax must be computed in the canvas draw code.
- **Using a separate background canvas layer:** The existing architecture uses only screen canvas for background fills (the out-of-map color fill is already done in `blitToScreen`). Adding a layer would require coordinating z-order. Stay within the existing one-canvas-for-screen pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BackgroundMode type definition | New type in CanvasEngine | `BackgroundMode` from overviewRenderer.ts | Already correct, already tested via export dialog |
| Farplane region crop math | Custom formula | `drawScaledImageRegion` logic from overviewRenderer.ts | Tested, correct scaling |
| Color picker UI | Custom hex input widget | `<input type="color">` + hex text input from OverviewExportDialog pattern | Already styled and wired in the export dialog |
| Dropdown UI | Custom dropdown component | `.toolbar-dropdown` + `.grid-settings-wrapper` CSS pattern | Exact match of existing toolbar pattern |
| Persistence | Custom serialization | localStorage.getItem/setItem | Theme system uses this exact approach |

**Key insight:** Every non-trivial sub-problem in this phase has an existing solution in the codebase. The work is mostly wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: Background flicker during animation ticks
**What goes wrong:** The animated-tile `patchAnimatedTiles` path calls `blitDirtyRect`, which does a partial clear and reblit. If background is not redrawn in that partial region, the cleared area shows the raw canvas (transparent/black) momentarily.
**Why it happens:** `clearRect` nukes everything including background from the screen in that region; the subsequent `drawImage(buffer)` has transparent pixels for tile 280 (empty), so the cleared region shows through.
**How to avoid:** In `blitDirtyRect`, after `screenCtx.clearRect` and before `screenCtx.drawImage(buffer, ...)`, call `this.drawScreenBackground(screenCtx, viewport, clipX, clipY, clipR-clipX, clipB-clipY, ...)`.
**Warning signs:** Background only visible at full redraws, disappears when animated tiles are present.

### Pitfall 2: Farplane image not yet loaded when mode is selected
**What goes wrong:** User selects farplane mode before the patch's farplane image finishes loading; canvas shows transparent.
**Why it happens:** `farplaneImage` in App.tsx is `null` until async load completes.
**How to avoid:** When `farplaneImage` loads (in `handleSelectBundledPatch` / `handleChangeTileset`), call `engine.setFarplaneImage(img)` and then trigger a full `blitToScreen` re-render. The engine should gracefully fall back to transparent when `farplaneImage` is null in farplane mode.
**Warning signs:** Farplane mode shows nothing right after patch switch; works after scrolling.

### Pitfall 3: Wrong farplane origin when viewport has fractional tile offsets
**What goes wrong:** Viewport `x`/`y` can be non-integer (float tile offsets from smooth panning). Using `Math.floor(viewport.x)` for farplane math introduces a 1-tile offset jump on scroll.
**Why it happens:** Careless integer conversion of a float coordinate.
**How to avoid:** Use viewport.x/y directly (as floats) in the farplane source coordinate math. The existing blitToScreen already uses them as floats in `const srcX = viewport.x * TILE_SIZE`.
**Warning signs:** Farplane image appears to "jump" by 16px increments during smooth panning.

### Pitfall 4: Out-of-map strips showing farplane when they should show the out-of-map color
**What goes wrong:** `blitToScreen` draws background for the entire screen region, then the existing out-of-map strip fills run AFTER the background. If the strip fill alpha is not fully opaque, the farplane bleeds through.
**Why it happens:** Wrong draw order.
**How to avoid:** Draw background only for the in-map region (clipped to map bounds). Out-of-map strips are handled by the existing `--canvas-out-of-map-bg` fill AFTER the background + tile blit. Keep the existing strip code at the END of `blitToScreen` unchanged.
**Warning signs:** Farplane visible in the grey out-of-map strips.

### Pitfall 5: Custom image mode — image is not stored across patch switches
**What goes wrong:** User loads custom bg image, then switches patch, then custom image is gone.
**Why it happens:** `handleChangeTileset` / `handleSelectBundledPatch` only update `farplaneImage`, not `customBgImage`.
**How to avoid:** `customBgImage` is managed separately in App.tsx state; patch switches must NOT clear it. It persists until the user explicitly loads a new custom image.
**Warning signs:** Custom image disappears after patch change.

### Pitfall 6: localStorage initialization timing with Zustand
**What goes wrong:** If `localStorage.getItem` is called during SSR or before the browser environment is available, it throws.
**Why it happens:** Zustand slices are module-level code.
**How to avoid:** This is an Electron + browser-only app — `localStorage` is always available. Safe to call in the slice initializer directly. This is confirmed by the existing theme system using localStorage in `App.tsx` without guards.

---

## Code Examples

Verified patterns from existing source code:

### Background draw helper (new private method in CanvasEngine)
```typescript
// Based on overviewRenderer.ts drawBackground and blitToScreen out-of-map pattern
private drawScreenBackground(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  destX: number, destY: number, destW: number, destH: number,
): void {
  switch (this.backgroundMode) {
    case 'transparent':
      return; // nothing — canvas is already cleared

    case 'classic':
      ctx.fillStyle = '#FF00FF';
      ctx.fillRect(destX, destY, destW, destH);
      break;

    case 'color':
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(destX, destY, destW, destH);
      break;

    case 'farplane':
      if (!this.farplaneImage) return;
      // Map screen coords → map pixel coords → farplane source coords
      const mapPxX = destX / viewport.zoom + viewport.x * TILE_SIZE;
      const mapPxY = destY / viewport.zoom + viewport.y * TILE_SIZE;
      const mapPxW = destW / viewport.zoom;
      const mapPxH = destH / viewport.zoom;
      const FULL_MAP_PX = MAP_WIDTH * TILE_SIZE; // 4096
      const scaleX = this.farplaneImage.naturalWidth / FULL_MAP_PX;
      const scaleY = this.farplaneImage.naturalHeight / FULL_MAP_PX;
      ctx.drawImage(
        this.farplaneImage,
        mapPxX * scaleX, mapPxY * scaleY,
        mapPxW * scaleX, mapPxH * scaleY,
        destX, destY, destW, destH
      );
      break;

    case 'image':
      if (!this.customBgImage) return;
      // Custom image: stretch to fill the entire map region
      // Need to know map's screen bounds to compute source coords
      const tilePixels = TILE_SIZE * viewport.zoom;
      const mapScreenW = MAP_WIDTH * tilePixels;
      const mapScreenH = MAP_HEIGHT * tilePixels;
      const mapScreenX = -viewport.x * tilePixels;
      const mapScreenY = -viewport.y * tilePixels;
      const imgSrcX = (destX - mapScreenX) / mapScreenW * this.customBgImage.naturalWidth;
      const imgSrcY = (destY - mapScreenY) / mapScreenH * this.customBgImage.naturalHeight;
      const imgSrcW = destW / mapScreenW * this.customBgImage.naturalWidth;
      const imgSrcH = destH / mapScreenH * this.customBgImage.naturalHeight;
      ctx.drawImage(
        this.customBgImage,
        imgSrcX, imgSrcY, imgSrcW, imgSrcH,
        destX, destY, destW, destH
      );
      break;
  }
}
```

### Wiring new setter calls in App.tsx (after engine attach)
```typescript
// In the useEffect that reacts to farplaneImage changes:
useEffect(() => {
  // engineRef.current is the MapCanvas's engine, accessed via ref or callback
  // Pattern: CanvasEngine already exposes setTilesetImage — mirror for farplane + custom bg
}, [farplaneImage]);
```

**Note:** CanvasEngine is owned by MapCanvas (via `engineRef.current`). App.tsx cannot call engine methods directly. Options:
1. Pass `farplaneImage` and `customBgImage` as props to MapCanvas, which calls `engine.setFarplaneImage` in a useEffect.
2. Expose image setters through Zustand actions (storing the images — not ideal).
3. Add a `onEngineReady` callback prop to MapCanvas and let App.tsx call the engine.

**Recommended:** Option 1 — add `farplaneImage` and `customBgImage` as props to `MapCanvas` component (like `tilesetImage` is already a prop). MapCanvas handles the engine wiring internally via useEffect. This exactly mirrors the existing `tilesetImage` prop pattern.

### CanvasEngine subscription for bg mode changes
```typescript
// In CanvasEngine.setupSubscriptions():
const unsubBgMode = useEditorStore.subscribe((state, prevState) => {
  if (state.canvasBackgroundMode !== prevState.canvasBackgroundMode ||
      state.canvasBackgroundColor !== prevState.canvasBackgroundColor) {
    this.backgroundMode = state.canvasBackgroundMode;
    this.backgroundColor = state.canvasBackgroundColor;
    // Trigger a full re-blit (no buffer rebuild needed)
    if (this.screenCtx) {
      const vp = this.getViewport(useEditorStore.getState());
      this.blitToScreen(vp, this.screenCtx.canvas.width, this.screenCtx.canvas.height);
    }
  }
});
this.unsubscribers.push(unsubBgMode);
```

### Toolbar dropdown (mirror of grid-settings-wrapper in ToolBar.tsx)
```tsx
// Following the grid-settings-wrapper pattern:
const [bgDropdownOpen, setBgDropdownOpen] = useState(false);
const bgRef = useRef<HTMLDivElement>(null);

// Close on outside click (same pattern as tileset panel dropdown):
useEffect(() => {
  if (!bgDropdownOpen) return;
  const handler = (e: MouseEvent) => {
    if (bgRef.current && !bgRef.current.contains(e.target as Node)) {
      setBgDropdownOpen(false);
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [bgDropdownOpen]);

// JSX:
<div className="grid-settings-wrapper" ref={bgRef}>
  <button className="toolbar-button" title="Canvas Background" onClick={() => setBgDropdownOpen(v => !v)}>
    <LuImage size={14} />
  </button>
  {bgDropdownOpen && (
    <div className="grid-settings-dropdown">
      <select value={canvasBackgroundMode} onChange={e => setCanvasBackgroundMode(e.target.value)}>
        <option value="transparent">Transparent</option>
        <option value="classic">SEdit Classic</option>
        <option value="farplane">Farplane</option>
        <option value="color">Custom Color</option>
        <option value="image">Custom Image</option>
      </select>
      {canvasBackgroundMode === 'color' && (
        <input type="color" value={canvasBackgroundColor} onChange={e => setCanvasBackgroundColor(e.target.value)} />
      )}
      {canvasBackgroundMode === 'image' && (
        <button onClick={handleLoadCustomBgImage}>Browse...</button>
      )}
    </div>
  )}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS background on canvas div | Canvas 2D clearRect + fill | N/A — always canvas | CSS background is invisible under canvas element |
| Full buffer rebuild on bg change | blitToScreen only (no buffer rebuild) | This phase | Background change is instant, no freeze |
| Background only in export dialog | Live canvas background | This phase | Same BackgroundMode type serves both uses |

**Note about farplane in overviewRenderer.ts vs live canvas:** In the export renderer, the crop `offsetTX/TY` is the static content bounds (no scroll). In the live canvas, the offset is the dynamic viewport (scrollable). The math is analogous but the inputs differ.

---

## Open Questions

1. **Should custom image mode be available without saving the image path?**
   - What we know: Custom image is loaded from disk via IPC + base64 data URL; it's stored as an `HTMLImageElement` in React state.
   - What's unclear: Should the custom image path persist across sessions via localStorage? Storing a file path is possible, but the file might move or be deleted.
   - Recommendation: For v1 of this phase, persist the custom image as a data URL in localStorage (same as trace images) or simply do NOT persist the custom image path — on re-launch, the user picks it again. The mode persists ('image') but the image does not; the canvas gracefully shows transparent until the user reloads the image. This is simpler and avoids stale path bugs.

2. **Where exactly in ToolBar.tsx should the BG dropdown be placed?**
   - What we know: The toolbar has file ops, undo/redo, clipboard, spacer, reset button, map info, and a grid toggle with grid-settings-wrapper.
   - What's unclear: Before or after the grid settings compound button? Or in a new "View" group?
   - Recommendation: Place it adjacent to the grid settings button (both are canvas display settings). A second compound button with the same CSS pattern looks natural.

3. **Should `canvasBackgroundMode` be in GlobalSlice or a new ViewSlice?**
   - What we know: GlobalSlice already holds `showGrid`, `gridOpacity`, `gridColor` — all canvas display state that doesn't belong to any specific document.
   - What's unclear: N/A — this is clearly global display state, not per-document.
   - Recommendation: Add to `GlobalSlice`. It's exactly the same category as the grid settings.

---

## Sources

### Primary (HIGH confidence)
- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — Full rendering pipeline, blitToScreen, blitDirtyRect, setupSubscriptions pattern
- `E:\NewMapEditor\src\core\export\overviewRenderer.ts` — BackgroundMode type, drawBackground, drawScaledImageRegion (farplane math)
- `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — GlobalSlice interface, grid settings pattern, localStorage not used here (done in App.tsx)
- `E:\NewMapEditor\src\App.tsx` — farplaneImage state, handleSelectBundledPatch, localStorage theme pattern, CanvasEngine wiring via MapCanvas props
- `E:\NewMapEditor\src\components\OverviewExportDialog\OverviewExportDialog.tsx` — BgType selector UI, color input pattern
- `E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx` + `ToolBar.css` — grid-settings-wrapper compound button pattern, toolbar-dropdown CSS
- `E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.tsx` — dropdown with outside-click close pattern
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — MapCanvas props (tilesetImage), CanvasEngine lifecycle

### Secondary (MEDIUM confidence)
- `E:\NewMapEditor\src\vite-env.d.ts` — ElectronAPI type definitions (confirmed readFile, openImageDialog, listDir available)
- `E:\NewMapEditor\src\core\editor\slices\types.ts` — Viewport type definition (x/y as floats confirmed)
- `E:\NewMapEditor\src\components\Minimap\Minimap.tsx` — farplane pixel cache pattern; confirms farplaneImage is prop-passed

### Tertiary (LOW confidence)
None — all findings verified directly from source code.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from existing source (no new dependencies)
- Architecture: HIGH — all patterns confirmed from existing codebase code
- Pitfalls: HIGH — identified by reading the actual rendering paths in CanvasEngine.ts

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable — this is internal codebase, no external dependency churn)
