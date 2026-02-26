# Architecture Research

**Domain:** Canvas background modes, patch path resolution, wall type fix, update check timing
**Researched:** 2026-02-26
**Confidence:** HIGH — all findings based on direct code inspection of the live codebase

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                      │
│  electron/main.ts                                                 │
│  ┌─────────────┐  ┌────────────────┐  ┌────────────────────────┐ │
│  │ IPC Handlers│  │  setupAuto     │  │  dialog:openPatchFolder│ │
│  │ file:read   │  │  Updater()     │  │  (patchesDir path logic│ │
│  │ file:write  │  │  setTimeout(5s)│  │  dev vs production)    │ │
│  │ zlib:*      │  │  setInterval() │  └────────────────────────┘ │
│  └──────┬──────┘  └───────┬────────┘                             │
│         │ IPC              │ IPC (update-status)                  │
└─────────┼──────────────────┼───────────────────────────────────── ┘
          │                  │
┌─────────┼──────────────────┼───────────────────────────────────── ┐
│         │   Renderer Process│                                      │
│  src/App.tsx                                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  tilesetImage (HTMLImageElement)  — React state              │ │
│  │  farplaneImage (HTMLImageElement) — React state              │ │
│  │  handleChangeTileset()     — reads arbitrary folder via IPC  │ │
│  │  handleSelectBundledPatch()— fetch('./assets/patches/{name}')│ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  src/core/editor/slices/globalSlice.ts (GlobalSlice)              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  showGrid, gridOpacity, animationFrame, showAnimations, ...  │ │
│  │  [backgroundMode NOT YET HERE — needs to be added]           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  src/core/canvas/CanvasEngine.ts                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  4096x4096 off-screen buffer (HTMLCanvasElement)             │ │
│  │  renderTile(): tile 280 → return (transparent, no draw)      │ │
│  │  blitToScreen(): clearRect + drawImage + out-of-map fills    │ │
│  │  drawMapLayer(): full rebuild or incremental diff-patch      │ │
│  │  Zustand subscriptions: viewport, map, animationFrame        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  src/core/map/WallSystem.ts                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  placeWall() → getConnections() → getWallTile(currentType)   │ │
│  │  updateNeighbor() [BUG: uses currentType, not neighbor type] │ │
│  │  updateNeighborDisconnect() [correct: uses findWallType()]   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  src/core/export/overviewRenderer.ts                               │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  BackgroundMode type (5 variants: farplane/transparent/      │ │
│  │    classic/color/image) — already defined here for export    │ │
│  │  drawBackground() — handles all 5 modes (export-only today)  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────── ┘
```

---

## Feature 1: Canvas Background Mode Selector

### Current State

The `BackgroundMode` type and all rendering logic for all 5 modes already exists in
`src/core/export/overviewRenderer.ts`. This is export-only today. The live canvas
(CanvasEngine) has no background mode awareness.

**How tile 280 (void/transparent) works today:**

In `CanvasEngine.renderTile()` (line 143-144):
```typescript
if (tile === 280) {
  // Skip empty tile — transparent pixel lets CSS background show through
  return;
}
```

In `blitToScreen()` (line 224):
```typescript
screenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
```

The buffer is cleared per blit, and tile 280 positions are never drawn, leaving those pixels
transparent on the screen canvas. The CSS background of the canvas container element shows
through. Out-of-map area is separately filled with the `--canvas-out-of-map-bg` CSS token.

**Key insight:** For the live canvas, "background mode" controls what appears behind transparent
tiles (tile 280) within the in-map region. The out-of-map border region is already handled
separately in `blitToScreen()` and is unaffected.

### Where Background Mode State Lives

**Decision: GlobalSlice, not DocumentsSlice.**

Rationale:
- Canvas background (farplane, classic, color) is an editor display preference, not part of the
  map document. Switching documents does not change the background.
- The existing pattern in GlobalSlice for display preferences: `showGrid`, `gridOpacity`,
  `gridColor`, `showAnimations`. Background mode fits this pattern exactly.
- DocumentsSlice is for per-document viewport, undo stack, selection, tiles. Background is not
  per-document.
- `farplaneImage: HTMLImageElement | null` stays in App.tsx React state — images cannot be
  serialized into Zustand. This mirrors how `tilesetImage` is managed.

**State to add to GlobalSlice:**
```typescript
backgroundMode: 'transparent' | 'classic' | 'color' | 'farplane';
backgroundModeColor: string;  // for 'color' mode
setBackgroundMode: (mode: string, color?: string) => void;
```

Note: `'image'` mode (custom image background) is export-only. Not useful for live canvas
editing — the farplane mode already handles the background image use case.

### Integration Points for CanvasEngine

The buffer architecture has one critical constraint: the 4096x4096 buffer stores tile pixels
only, not background. Background must be drawn at blit time, not into the buffer.

**`blitToScreen()` is the integration point.** The sequence for background mode:

```
1. clearRect(full screen)          ← already done
2. drawBackground(screenCtx)       ← NEW: before drawImage(buffer)
3. drawImage(buffer → screen)      ← already done (tiles composite over background)
4. fill out-of-map strips          ← already done
```

This works because the buffer tiles use globalCompositeOperation default (`source-over`).
Transparent regions of the buffer (tile 280 pixels, which were never painted) show through to
whatever was drawn in step 2. Background fills in step 2, tiles overlay in step 3.

**Background must fill only the in-map region** (not the out-of-map strips). The out-of-map
strips are painted after with `--canvas-out-of-map-bg`. The `mapLeft, mapTop, mapRight,
mapBottom` pixel coordinates are already computed in `blitToScreen()` — reuse them.

**Proposed CanvasEngine additions:**

```typescript
private backgroundMode: string = 'transparent';
private backgroundModeColor: string = '#000000';
private farplaneImage: HTMLImageElement | null = null;

setFarplaneImage(img: HTMLImageElement | null): void {
  this.farplaneImage = img;
  this.triggerBlit();  // immediate redraw when farplane changes
}

setBackgroundMode(mode: string, color?: string): void {
  this.backgroundMode = mode;
  if (color !== undefined) this.backgroundModeColor = color;
  this.triggerBlit();
}
```

**Background rendering in `blitToScreen()` (before the `drawImage` buffer blit):**

```typescript
// Draw background within in-map pixel region
const tilePixels = TILE_SIZE * viewport.zoom;
const mapLeft   = (0 - viewport.x) * tilePixels;
const mapTop    = (0 - viewport.y) * tilePixels;
const mapRight  = (MAP_WIDTH  - viewport.x) * tilePixels;
const mapBottom = (MAP_HEIGHT - viewport.y) * tilePixels;
const clipL = Math.max(0, mapLeft);
const clipT = Math.max(0, mapTop);
const clipR = Math.min(canvasWidth, mapRight);
const clipB = Math.min(canvasHeight, mapBottom);

switch (this.backgroundMode) {
  case 'classic':
    screenCtx.fillStyle = '#FF00FF';
    screenCtx.fillRect(clipL, clipT, clipR - clipL, clipB - clipT);
    break;
  case 'color':
    screenCtx.fillStyle = this.backgroundModeColor;
    screenCtx.fillRect(clipL, clipT, clipR - clipL, clipB - clipT);
    break;
  case 'farplane':
    if (this.farplaneImage) {
      // Map viewport region to farplane image coordinates
      const scaleX = this.farplaneImage.naturalWidth  / MAP_WIDTH;
      const scaleY = this.farplaneImage.naturalHeight / MAP_HEIGHT;
      const srcX = Math.max(0, viewport.x) * scaleX;
      const srcY = Math.max(0, viewport.y) * scaleY;
      const srcW = (clipR - clipL) / viewport.zoom * scaleX;
      const srcH = (clipB - clipT) / viewport.zoom * scaleY;
      screenCtx.drawImage(
        this.farplaneImage,
        srcX, srcY, srcW, srcH,
        clipL, clipT, clipR - clipL, clipB - clipT
      );
    }
    break;
  case 'transparent':
  default:
    // Nothing — clearRect already done, CSS background shows through
    break;
}
```

**Subscription:** Add a 4th Zustand subscription in `setupSubscriptions()` that watches
`backgroundMode` and `backgroundModeColor` changes in GlobalSlice, then triggers a blit.

**MapCanvas.tsx change:** Add `farplaneImage` to MapCanvas props and call
`engine.setFarplaneImage(img)` in a `useEffect` watching `farplaneImage`. This mirrors the
existing `setTilesetImage()` call pattern.

### New Component: CanvasBackgroundSelector

A small UI control (dropdown or button group) for selecting background mode. Recommended
placement: inside the existing toolbar or as a small control near the canvas area.

On selection: calls `setBackgroundMode(mode)` in GlobalSlice. CanvasEngine subscription fires,
triggers blit. No buffer rebuild required.

Disable `farplane` option when `farplaneImage === null` (show tooltip: "Load a patch with
imgFarplane to enable").

---

## Feature 2: Desktop Patch Dropdown (Production Path Fix)

### Current State and the Bug

`handleSelectBundledPatch()` in App.tsx:
```typescript
const patchBase = `./assets/patches/${encodeURIComponent(patchName)}`;
const img = await loadImg(`${patchBase}/imgTiles.png`);  // uses fetch/Image src
```

This uses `new Image()` src assignment (effectively a fetch from the dev server URL).

- **Dev:** `./assets/patches/` resolves relative to `http://localhost:5173/` → Vite serves from
  `/public/` → resolves to `E:\NewMapEditor\public\assets\patches\{name}\imgTiles.png` — works.
- **Production:** Electron loads from `file:///...dist/index.html`. Patches are in
  `resources/patches/` via `extraResources` in electron-builder config, NOT in the asar at
  `dist/assets/patches/`. The relative path `./assets/patches/` does not resolve to the
  extraResources location — **broken in production**.

The IPC handler `dialog:openPatchFolder` already has the correct path logic:
```typescript
// electron/main.ts line 557
const patchesDir = isDev
  ? path.join(process.cwd(), 'public', 'assets', 'patches')
  : path.join(process.resourcesPath, 'patches');
```

### The Fix

Add a new IPC handler that returns the patches directory path, then rewrite
`handleSelectBundledPatch()` to use `file:read` IPC (same as `handleChangeTileset()`).

**New IPC handler in `electron/main.ts`:**
```typescript
ipcMain.handle('app:getPatchesDir', async () => {
  return isDev
    ? path.join(process.cwd(), 'public', 'assets', 'patches')
    : path.join(process.resourcesPath, 'patches');
});
```

**New preload exposure in `electron/preload.ts`:**
```typescript
getPatchesDir: () => ipcRenderer.invoke('app:getPatchesDir'),
```

**Updated `handleSelectBundledPatch()` in `App.tsx`:**
```typescript
const handleSelectBundledPatch = useCallback(async (patchName: string) => {
  const patchesDir = await window.electronAPI.getPatchesDir();
  if (!patchesDir) return;

  // Reuse the same loadImage() that handleChangeTileset() uses
  const findAndLoad = async (prefix: string): Promise<HTMLImageElement | null> => {
    const listing = await window.electronAPI.listDir(`${patchesDir}/${patchName}`);
    if (!listing.success || !listing.files) return null;
    const match = listing.files.find((f: string) =>
      f.toLowerCase().startsWith(prefix.toLowerCase()) &&
      ['.png', '.jpg', '.jpeg', '.bmp'].some(ext => f.toLowerCase().endsWith(ext))
    );
    if (!match) return null;
    return loadImage(`${patchesDir}/${patchName}/${match}`);
  };

  // Load imgTiles (required)
  const tilesImg = await findAndLoad('imgTiles');
  if (tilesImg) setTilesetImage(tilesImg);

  // Load imgFarplane (optional)
  const farplaneImg = await findAndLoad('imgFarplane').catch(() => null);
  setFarplaneImage(farplaneImg);

  // Load imgTuna (optional)
  const tunaImg = await findAndLoad('imgTuna').catch(() => null);
  setTunaImage(tunaImg);
}, []);
```

Where `loadImage()` is the existing helper in `handleChangeTileset()` — extract it to a shared
local function or inline it identically. Both handlers will share the same read→decode→Image
pattern.

**File naming:** `BUNDLED_PATCHES` list includes spaces (`'AC Default'`, `'H-Front'`). For IPC
file paths on Windows, spaces in paths work fine as string arguments — no encoding needed.

### TypeScript Type Extension

Add to the electronAPI type declaration:
```typescript
getPatchesDir: () => Promise<string>;
```

---

## Feature 3: Wall Type Preservation Fix

### The Bug

`WallSystem.updateNeighbor()` (WallSystem.ts lines 163-176):

```typescript
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  ...
  const currentTile = map.tiles[index];
  if (!this.isWallTile(currentTile)) return;

  // BUG: uses this.currentType (the PLACING type), not neighbor's own type
  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(this.currentType, connections);  // ← WRONG
  map.tiles[index] = newTile;
}
```

When placing a wall of type X next to an existing wall of type Y, `updateNeighbor()` converts
the Y-type neighbor to X-type. This causes wall type "bleeding": placing a Basic wall next to a
Red wall converts the Red wall tiles to Basic.

Compare with `updateNeighborDisconnect()` (lines 270-285), which correctly preserves type:
```typescript
private updateNeighborDisconnect(map: MapData, x: number, y: number): void {
  ...
  const wallType = this.findWallType(currentTile);  // ← correct pattern
  if (wallType === -1) return;
  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(wallType, connections);  // uses neighbor's own type
  map.tiles[index] = newTile;
}
```

### The Fix

Change `updateNeighbor()` to use `findWallType(currentTile)` instead of `this.currentType`:

```typescript
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

  const index = y * MAP_WIDTH + x;
  const currentTile = map.tiles[index];

  if (!this.isWallTile(currentTile)) return;

  // FIX: determine the neighbor's own wall type, not the placing type
  const wallType = this.findWallType(currentTile);
  if (wallType === -1) return;

  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(wallType, connections);
  map.tiles[index] = newTile;
}
```

`findWallType()` is already a private method on the class (lines 179-186). No new code needed.

### Same Bug in `collectNeighborUpdate()`

`collectNeighborUpdate()` (lines 227-244) has the identical bug for the batch wall placement
path (`placeWallBatch()`, used by WALL_RECT tool):

```typescript
// BUG: same pattern
const newTile = this.getWallTile(this.currentType, connections);
```

Apply the same fix:
```typescript
const wallType = this.findWallType(currentTile);
if (wallType === -1) return;
const newTile = this.getWallTile(wallType, connections);
```

Both methods need the same one-line type lookup change. Total diff: 4 lines changed.

### Note: `_addConnection` Parameter

The `_addConnection` parameter is prefixed with underscore (intentionally unused). The original
intent was to OR in a new connection direction explicitly. This is unnecessary because
`getConnections()` re-reads the live map state, which already has the new wall placed before
`updateNeighbor()` is called. No change needed here.

---

## Feature 4: Startup-Only Update Check

### Current State

In `electron/main.ts`, `setupAutoUpdater()`:

```typescript
// Check on launch (delay to not compete with startup)
setTimeout(() => autoUpdater.checkForUpdates(), 5000);

// Re-check every 30 minutes
setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
```

The 30-minute `setInterval` is undesirable for a desktop tool. It generates network traffic and
sends `update-status` IPC events that display banners in the UI unexpectedly.

### The Fix

Remove the `setInterval`. Keep the `setTimeout(5s)` startup check. Manual checks remain
available via `Help > Check for Updates...` menu item.

```typescript
// Check once on launch (delay to not compete with startup)
setTimeout(() => autoUpdater.checkForUpdates(), 5000);

// Removed: setInterval repeating check (startup-only by design)
```

This is a 1-line deletion. The `manualCheckInProgress` flag, all event handlers, and the manual
check menu item remain unchanged.

---

## Component Boundaries

| Component | Responsibility | Change Type | Notes |
|-----------|---------------|-------------|-------|
| `GlobalSlice` | Background mode preference state | Modified | Add `backgroundMode`, `backgroundModeColor`, `setBackgroundMode` |
| `CanvasEngine` | Render background behind tiles in blitToScreen | Modified | Add `setFarplaneImage()`, background rendering in `blitToScreen()`, 4th Zustand subscription |
| `MapCanvas.tsx` | Pass farplaneImage to engine on prop change | Modified | Call `engine.setFarplaneImage(img)` in useEffect |
| `CanvasBackgroundSelector` | UI control for selecting background mode | New | Dropdown or icon buttons, disables farplane when no farplane loaded |
| `WallSystem.ts` | Fix neighbor type preservation | Modified | 4-line change in `updateNeighbor()` + `collectNeighborUpdate()` |
| `electron/main.ts` | Remove interval update check, add getPatchesDir IPC | Modified | Remove `setInterval`, add `app:getPatchesDir` handler |
| `electron/preload.ts` | Expose getPatchesDir to renderer | Modified | Add `getPatchesDir` to contextBridge |
| `App.tsx` | Use IPC-based patch loading for bundled patches | Modified | Replace fetch/Image-src-based with readFile-based |

---

## Data Flow

### Background Mode Change Flow

```
User selects background mode in CanvasBackgroundSelector
    ↓
setBackgroundMode(mode) → GlobalSlice Zustand update
    ↓
CanvasEngine subscription 4 fires (watches backgroundMode)
    ↓
engine.triggerBlit() → blitToScreen() with new background rendering
    ↓
Screen updates immediately (no buffer rebuild, no tile diffing)
```

### Farplane Image Flow

```
App.tsx: handleSelectBundledPatch() or handleChangeTileset()
    ↓
setFarplaneImage(img) → App React state
    ↓
MapCanvas.tsx receives farplaneImage prop change
    ↓
useEffect: engine.setFarplaneImage(img)
    ↓
engine.triggerBlit() → blitToScreen() with farplane background
    ↓
Canvas redraws with new farplane
```

### Bundled Patch Load Flow (Fixed)

```
User clicks patch in TilesetPanel dropdown
    ↓
App.tsx handleSelectBundledPatch(patchName)
    ↓
getPatchesDir() via IPC → returns absolute path (dev or production)
    ↓
listDir(patchesDir/patchName) → find imgTiles.*/imgFarplane.* filenames
    ↓
readFile(absolute path) via IPC → base64
    ↓
base64 → data URL → new Image()
    ↓
setTilesetImage(img) + setFarplaneImage(img)
    ↓
CanvasEngine.setTilesetImage() triggers full buffer rebuild (tileset changed)
engine.setFarplaneImage() triggers blitToScreen() (background layer)
```

---

## Architectural Patterns

### Pattern: Background Drawn at Blit Time, Not in Buffer

**What:** The 4096x4096 buffer stores only tile pixels. Background is composited in
`blitToScreen()` by drawing before the buffer blit.

**When to use:** Any viewport-space rendering that depends on pan/zoom but is not a tile (grid
lines, boundary overlays, background fills).

**Trade-off:** Every `blitToScreen()` call must do the background draw. This is cheap (one
`fillRect` or one `drawImage` into a clipped region) and does not affect the buffer's
incremental-diff advantage.

### Pattern: Engine Settings via Setters, Not Constructor Parameters

**What:** CanvasEngine already uses `setTilesetImage()` to receive image refs post-construction.
Follow this pattern for `setFarplaneImage()` and `setBackgroundMode()`.

**When to use:** Any runtime-changeable setting that the engine needs but that comes from outside
(React state, user preferences).

**Trade-off:** Engine holds mutable state internally. Acceptable because CanvasEngine is already
an imperative object, not a pure function.

### Pattern: Zustand for Mode State, Props/Setters for Image References

**What:** `backgroundMode` (string) goes in GlobalSlice. `farplaneImage` (HTMLImageElement)
stays in App.tsx React state and flows as a prop into MapCanvas, then injected into CanvasEngine
via setter.

**Why:** HTMLImageElement objects cannot be serialized or compared efficiently in Zustand. The
established codebase pattern: `tilesetImage` is React state in App.tsx, passed as props to
MapCanvas, then injected into CanvasEngine via `setTilesetImage()`. Follow the same pattern for
`farplaneImage`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Drawing Background into the 4096x4096 Buffer

**What people might do:** Call `bufCtx.fillStyle = '#FF00FF'; bufCtx.fillRect(0,0,4096,4096)`
in `drawMapLayer()` before rendering tiles.

**Why it's wrong:** The buffer is designed for incremental tile diffing. Writing a background
into it forces a full rebuild on every background mode change, and causes pan/zoom to trigger
blits that also dirty the buffer. The buffer should remain a pure tile store.

**Do this instead:** Draw background in `blitToScreen()` into the screen canvas, before
`drawImage(buffer, ...)`.

### Anti-Pattern 2: Fetching Bundled Patches via URL in Production

**What people might do:** Keep using `loadImg('./assets/patches/${name}/imgTiles.png')` via
Image src (fetch).

**Why it's wrong:** In production Electron, patches are in `resources/patches/` (extraResources),
not in the asar at a path reachable by `file:///.../dist/assets/patches/`. The relative URL
resolution breaks.

**Do this instead:** Use `window.electronAPI.getPatchesDir()` + `window.electronAPI.readFile()`
for all bundled patch loading, consistent with `handleChangeTileset()`.

### Anti-Pattern 3: Converting Neighbor Walls to Current Type

**What currently happens:** `updateNeighbor()` calls `getWallTile(this.currentType, ...)`.

**Why it's wrong:** The neighbor already has its own wall type. Recalculating its connection
state should preserve its existing type; only the connection bitmask changes when a new wall
is placed adjacent to it.

**Do this instead:** `findWallType(currentTile)` to identify the neighbor's own type, then
`getWallTile(wallType, connections)`.

### Anti-Pattern 4: Polling for Updates on a Timer

**What currently happens:** `setInterval(() => autoUpdater.checkForUpdates(), 30 min)`.

**Why it's wrong:** Background update checks generate network traffic and send `update-status`
IPC events that briefly show status banners in the UI at unexpected times.

**Do this instead:** Single startup check (`setTimeout(5s)`) only. Manual check available via
Help menu. Periodic checks require user opt-in.

---

## Build Order

The four features are largely independent. Recommended order based on risk and dependency:

1. **Wall type fix** — WallSystem.ts, 4-line change, no UI, zero risk, immediately verifiable
   by placing walls of different types adjacent to each other.

2. **Startup-only update check** — electron/main.ts, 1-line deletion, no UI impact.

3. **Desktop patch dropdown IPC fix** — main.ts + preload.ts + App.tsx. Establishes the
   `getPatchesDir` IPC pattern. Must be done before background mode if the farplane background
   feature needs to be reliable in production (farplane loads via patch selection).

4. **Canvas background mode selector** — GlobalSlice + CanvasEngine + new UI component.
   Largest feature. Depends on step 3 so that farplane loads reliably in production before
   the farplane mode is exposed in UI.

---

## Sources

All claims are HIGH confidence — verified by direct code inspection.

- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — full file read
- `E:\NewMapEditor\src\core\map\WallSystem.ts` — full file read
- `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — full file read
- `E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts` — full file read
- `E:\NewMapEditor\src\core\editor\slices\types.ts` — full file read
- `E:\NewMapEditor\src\core\export\overviewRenderer.ts` — full file read
- `E:\NewMapEditor\src\core\patches.ts` — full file read
- `E:\NewMapEditor\electron\main.ts` — full file read
- `E:\NewMapEditor\src\App.tsx` — full file read
- `E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.tsx` — full file read
- `E:\NewMapEditor\src\components\OverviewExportDialog\OverviewExportDialog.tsx` — first 200 lines read
- `E:\NewMapEditor\.planning\codebase\ARCHITECTURE.md` — existing planning docs

---

*Architecture research for: canvas background modes, patch loading, wall type fix, update check*
*Researched: 2026-02-26*
