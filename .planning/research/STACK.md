# Stack Research

**Domain:** Electron/React tile map editor — background modes, desktop patch loading, wall fix, update interval
**Researched:** 2026-02-26
**Confidence:** HIGH (all findings verified against live codebase)

---

## Recommended Stack

### Core Technologies

No new runtime packages are required. All four features are implementable with existing stack.

| Technology | Version (installed) | Purpose | Why Sufficient |
|------------|---------------------|---------|----------------|
| Electron | ^34.0.0 | Main process IPC, `process.resourcesPath` | `process.resourcesPath` already used in `dialog:openPatchFolder` handler — same pattern extends to image serving |
| React 18 | ^18.3.1 | UI for background mode selector and patch dropdown | Existing state lifting pattern in `App.tsx` covers background mode state |
| Zustand | ^5.0.3 | Persisting `canvasBackground` mode across the session | Extend `GlobalSlice` with one new field + setter |
| Canvas API (native) | browser built-in | Render background modes on CanvasEngine buffer | `drawBackground()` already implemented in `overviewRenderer.ts` — port directly to `CanvasEngine` |
| electron-updater | ^6.7.3 | Auto-update with startup-only check | Already has `setTimeout` + `setInterval`; removing `setInterval` is the fix |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `path` (Node built-in) | built-in | Resolve `process.resourcesPath` + filename in main process | In IPC handler `get-patch-base-url` |
| `fs` (Node built-in) | built-in | Existence check on patch folder | Already used throughout `electron/main.ts` |

No npm installs needed.

---

## Feature-by-Feature Integration Points

### Feature 1: Canvas Background Mode Selector

**What exists:**
- `BackgroundMode` type in `src/core/export/overviewRenderer.ts` (transparent / classic / farplane / color / image)
- `drawBackground()` function in `overviewRenderer.ts` — full implementation for all 5 modes
- `farplaneImage` state already loaded in `App.tsx` from the active patch

**What's needed:**
- Add `canvasBackground: BackgroundMode` to `GlobalSlice` in `src/core/editor/slices/globalSlice.ts`
- Add `setCanvasBackground(bg: BackgroundMode)` action to `GlobalSlice`
- In `CanvasEngine.drawMapLayer()`: before rendering tiles, call the ported `drawBackground()` logic on `bufferCtx` — clear first, then fill background, then render tiles
- Wire a UI selector (dropdown or button group) in the toolbar or map panel

**Architecture decision:** The background render must happen on the off-screen buffer, not via CSS `background` on the canvas element. CSS backgrounds do not survive the `clearRect` calls that happen per-tile-patch. The buffer must be pre-filled each full rebuild, and blit naturally carries the background.

**Farplane mode specifics:**
- `farplaneImage` is already in `App.tsx` state; pass it down to `CanvasEngine` the same way `tilesetImage` is passed via `setTilesetImage()`
- Add `setFarplaneImage(img: HTMLImageElement | null)` method to `CanvasEngine`
- For incremental patches: farplane is stable (no tile motion), so background does not need to be redrawn per-patch — only on full rebuild

**Color mode:**
- Store color string in `BackgroundMode` discriminated union (already typed this way in `overviewRenderer.ts`)

**Transparent mode:**
- No fill; `bufferCtx.clearRect` already does this. Default behavior.

---

### Feature 2: Desktop Patch Dropdown (Electron path resolution)

**Current state:**
- `handleSelectBundledPatch` in `App.tsx` loads from relative URL `./assets/patches/${patchName}/imgTiles.png` — this works in both dev (Vite serves `public/`) and production (Vite copies `public/` into `dist/`)
- `extraResources` in `package.json` already copies `public/assets/patches` to `resources/patches` in the packaged app
- `dialog:openPatchFolder` in `electron/main.ts` already uses `process.resourcesPath` to find the patches directory

**The gap:**
- Bundled patches are served as static web assets (`./assets/patches/...`). This path is relative to the renderer's origin and works via Vite dev server or `loadFile` in production.
- There is no gap for bundled patches — `./assets/patches/` works in both dev and prod because Vite includes `public/` in the build output.
- The dropdown in `TilesetPanel` already exists and calls `onSelectBundledPatch(patchName)`.

**If the desktop dropdown needs to list patches from `extraResources` at runtime** (i.e., patches installed outside the `dist/` bundle):
- Add IPC handler `get-patches-dir` to main process:
  ```typescript
  ipcMain.handle('get-patches-dir', () => {
    return isDev
      ? path.join(process.cwd(), 'public', 'assets', 'patches')
      : path.join(process.resourcesPath, 'patches');
  });
  ```
- Expose via preload: `getPatchesDir: () => ipcRenderer.invoke('get-patches-dir')`
- Renderer reads directory with existing `listDir` IPC, constructs `file://` URLs via the `readFile` IPC returning base64 — then create a Blob URL for the `<img>` tag

**CRITICAL: Electron + file:// protocol for images**
- In packaged apps, `webPreferences.contextIsolation: true` and no `nodeIntegration` means the renderer cannot use `file://` URLs directly without protocol registration.
- The established pattern in this codebase: use `readFile` IPC (returns base64), create `data:image/png;base64,...` URL, set as `img.src`. This already works for the tileset browser feature.
- Do NOT use `file://` URIs directly in `<img src>` — they are blocked by Electron's default CSP in context-isolated renderers.
- Pattern: `const { data } = await window.electronAPI.readFile(absolutePath); img.src = 'data:image/png;base64,' + data;`

**Verdict:** The current `./assets/patches/` approach for bundled patches is correct and complete. No new IPC needed for the standard bundled patch dropdown. If adding "scan from resourcesPath" behavior, add one `get-patches-dir` handler + preload exposure.

---

### Feature 3: Wall Auto-Connection Bleeding Fix

**Root cause (confirmed from source):**
`updateNeighbor()` in `WallSystem.ts` (line 174) always calls `this.getWallTile(this.currentType, connections)` — it uses `currentType` (the currently selected wall type) for neighbor tiles. If you paint Type 2 (Green) walls next to existing Type 0 (Basic) walls, the Basic neighbors get converted to Green.

This is wrong. The correct behavior: neighbor walls keep their original type; only their connection state (shape variant within their own type) updates.

**Fix approach — no new libraries needed:**

Replace `updateNeighbor` to detect the existing neighbor's wall type via `findWallType()` (already exists, private):

```typescript
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
  const index = y * MAP_WIDTH + x;
  const currentTile = map.tiles[index];
  if (!this.isWallTile(currentTile)) return;

  // Preserve neighbor's original wall type — do NOT bleed currentType
  const neighborType = this.findWallType(currentTile);
  if (neighborType === -1) return;

  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(neighborType, connections);  // neighborType, not currentType
  map.tiles[index] = newTile;
}
```

Same fix applies to `collectNeighborUpdate()` (line 243) used by `placeWallBatch`.

`findWallType()` is already implemented correctly (lines 179-186). Just make it accessible from `updateNeighbor` — it is already in the same class (private is fine, both methods are on `WallSystem`).

**No new stack items needed.** Pure logic fix inside `WallSystem.ts`.

**Edge case:** `placeWallBatch` Phase 1 places all walls as `this.currentType` before recalculating. This is correct for the batch positions themselves. Only neighbor updates need the fix.

---

### Feature 4: Startup-Only Update Check

**Current state in `electron/main.ts`:**
```typescript
// Check on launch (delay to not compete with startup)
setTimeout(() => autoUpdater.checkForUpdates(), 5000);

// Re-check every 30 minutes
setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
```

**Fix:** Remove the `setInterval`. The startup `setTimeout` remains. This is a one-line deletion.

**No new packages needed.** `electron-updater ^6.7.3` already handles this correctly — `checkForUpdates()` can be called once at startup.

**Why:** Repeated background checks are disruptive (bandwidth, GitHub rate limits, spurious "update available" popups). Manual check is available via Help > Check for Updates. Startup check satisfies "always get notified on launch."

---

## Installation

No new packages required.

```bash
# Nothing to install — all features use existing dependencies
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Port `drawBackground()` from `overviewRenderer.ts` to `CanvasEngine` | Create new Background renderer class | Unnecessary abstraction; the function is 30 lines and self-contained |
| Store `canvasBackground` in Zustand `GlobalSlice` | Store in React component state | Background mode must survive document switches and is global UI state |
| Fix `updateNeighbor` to use `findWallType()` | Add a separate "neighbor type map" | `findWallType()` is O(n) over 15 wall types x 16 tiles = 240 iterations per neighbor, negligible |
| Remove `setInterval` | Make interval configurable via settings | Over-engineering; startup-only check is the correct product decision |
| Base64 data URI for patch images in Electron | `file://` protocol registration | The base64 path is already established in this codebase for `readFile`; `file://` requires `webSecurity: false` which is a security regression |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `file://` URIs in `<img src>` in Electron renderer | Blocked by Electron's context isolation + CSP without explicit protocol handler registration | Base64 `data:` URI via existing `readFile` IPC |
| CSS `background-color` / `background-image` on the canvas element | Overridden by `clearRect` on each tile patch; not composited into screenshot or export | Draw background onto `bufferCtx` before tile layer |
| New npm package for "background rendering" | No such package applies; it's 5 Canvas API calls | Native Canvas API — `fillRect`, `drawImage`, `clearRect` |
| Keeping `setInterval` for update checks | GitHub API rate limits, user disruption, no benefit over startup check | Startup `setTimeout` only |
| Making wall `currentType` bleed to neighbors | This is the bug being fixed | Preserve neighbor's original type via `findWallType()` |

---

## Stack Patterns by Variant

**If background mode includes a "space" / custom dark fill:**
- Use `color` mode with the `--canvas-out-of-map-bg` CSS variable value (already computed in `blitToScreen`)
- Because it will match the out-of-map border region automatically

**If patch images come from outside the app bundle (user-installed patches):**
- Use `readFile` IPC returning base64 to `data:image/png;base64,` URL
- Because `file://` URIs are blocked in the isolated renderer context

**If wall type needs to be preserved across undo:**
- The existing undo system snapshots the full `map.tiles` array before mutation — no additional undo handling needed for the bleeding fix

---

## Version Compatibility

| Package | Constraint | Notes |
|---------|------------|-------|
| electron ^34.0.0 | `process.resourcesPath` available since Electron 1.x | No version concern |
| electron-updater ^6.7.3 | `checkForUpdates()` is stable API | Removing `setInterval` is safe at any 6.x version |
| Zustand ^5.0.3 | `StateCreator` pattern used throughout | Adding field to `GlobalSlice` follows existing pattern exactly |

---

## Sources

- Live codebase analysis (HIGH confidence) — `src/core/canvas/CanvasEngine.ts`, `src/core/map/WallSystem.ts`, `src/core/export/overviewRenderer.ts`, `electron/main.ts`, `electron/preload.ts`, `src/App.tsx`, `package.json`
- Electron documentation pattern for `process.resourcesPath` (MEDIUM confidence — consistent with usage already in `electron/main.ts` line 557)
- Wall bleeding root cause confirmed by direct inspection of `updateNeighbor` line 174 vs `updateNeighborDisconnect` line 283 (which correctly uses `findWallType`)

---

*Stack research for: Canvas background modes, desktop patch loading, wall auto-connection fix, startup-only update check*
*Researched: 2026-02-26*
