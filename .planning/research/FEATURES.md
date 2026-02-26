# Feature Research

**Domain:** SubSpace/Continuum tile map editor — canvas background modes, patch selector UX, wall type preservation, startup update check
**Researched:** 2026-02-26
**Confidence:** HIGH (all findings derived from direct codebase inspection and known domain behavior of the SEDIT reference editor)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Canvas live background mode | Any editor that exports with background modes should preview that mode live on the main canvas, not just in the export dialog | MEDIUM | The 5 `BackgroundMode` types exist in `overviewRenderer.ts` and the export dialog, but CanvasEngine and MapCanvas are not wired to any user-selectable mode — tile 280 skips rendering and the canvas element's dark CSS background shows through. Users expect to see what they are editing. |
| Patch dropdown shows current selection | Users switching patches need feedback about which patch is active | LOW | `TilesetPanel` dropdown has no highlighted/checked state. `handleSelectBundledPatch` sets state but never writes `activePatchName` back to any store or prop. |
| Wall neighbors preserve their own type on connection | Painting a red wall next to a basic wall should not convert the basic wall to red | MEDIUM | This is the wall bleeding bug. `updateNeighbor()` calls `getWallTile(this.currentType, connections)` — `currentType` is the type being placed, not the neighbor's original type. `findWallType()` already exists and returns the correct type, but is only called in `updateNeighborDisconnect()`, not in `updateNeighbor()` or `collectNeighborUpdate()`. |
| Update check only on startup | Polling a remote server every 30 minutes is unexpected background network traffic for a desktop utility; startup-only is the standard convention | LOW | `setupAutoUpdater()` in `electron/main.ts` line 389 sets `setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000)`. Removing this interval is the correct fix. |

### Differentiators (Competitive Advantage)

Features that go beyond reference SEdit behavior and make this editor preferable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Canvas background mode selector (live preview) | Users editing maps for a specific patch see exactly how the farplane background looks behind transparent tiles, matching in-game rendering | MEDIUM | Requires: (1) mode selector UI, (2) `canvasBackgroundMode` in GlobalSlice, (3) CanvasEngine buffer fill before tile rendering, (4) CSS background on the map canvas element for the transparent/checkerboard case. The `farplaneImage` already exists in App.tsx state but is not passed to MapCanvas. |
| Patch dropdown with active patch indicator | Shows which bundled patch is currently loaded so switching is intentional rather than blind | LOW | Add `activePatch: string | null` to App.tsx state, set it in `handleSelectBundledPatch` and clear/rename it in `handleChangeTileset`. Pass to `TilesetPanel` and render a checkmark or bold text on the matching dropdown item. |
| Correct wall type preservation during painting | Neighbors keep their material type when a new wall is placed adjacent — only the connection shape updates | MEDIUM | Fix `updateNeighbor` and `collectNeighborUpdate` to call `findWallType(currentTile)` and use the result for `getWallTile()`, falling back to `this.currentType` only when `findWallType` returns -1. The disconnect path (`updateNeighborDisconnect`) already uses `findWallType` correctly. |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Per-document canvas background mode | Multiple open maps might use different patches | Adds state to DocumentsSlice, requires threading through CanvasEngine, and most users work with one patch at a time | Global canvas background mode in GlobalSlice — one setting for the editor session, correct for the single-patch workflow |
| Real-time farplane tiling/repeat | Some editors tile background images | The SubSpace farplane is a single image scaled to 4096x4096 — tiling is not how the game renders | Document the actual rendering behavior in a tooltip; do not implement tiling |
| Background mode stored in map file | Might be useful to share context with collaborators | The description field has byte limits; background mode is an editor preference, not a game-level setting | Store in GlobalSlice session state only — resets to default on next load, which is correct |
| Auto-update interval configurable by user | Power users may want control over polling frequency | Adds UI complexity for a feature that should simply not exist at the interval level | Remove the interval entirely; startup check only is the correct UX |

---

## Feature Dependencies

```
Canvas background mode selector (live)
    └── requires ──> farplaneImage prop added to MapCanvas (currently not passed)
    └── requires ──> canvasBackgroundMode in GlobalSlice
    └── requires ──> CanvasEngine buffer fill with background before tile rendering
    └── requires ──> CSS background on .map-layer canvas for transparent/checkerboard

Wall type preservation fix
    └── requires ──> findWallType() called in updateNeighbor (already exists, not called there)
    └── requires ──> same fix in collectNeighborUpdate for batch/rectangle operations

Patch dropdown active state
    └── requires ──> activePatch string in App.tsx state
    └── enhances ──> Canvas background mode selector (user knows which farplane is loaded)

Startup-only update check
    └── conflicts ──> 30-minute setInterval in setupAutoUpdater (must be removed)
```

### Dependency Notes

- **Canvas background mode requires farplaneImage in MapCanvas:** App.tsx holds `farplaneImage` as React state. `MapCanvas` receives only `tilesetImage`. The farplane must be passed as a new prop to `MapCanvas`, then forwarded to `CanvasEngine` so the buffer can be filled before tile rendering.
- **Wall fix is independent:** Pure logic change in `WallSystem.ts` with no UI or state changes. Can be a standalone plan.
- **Patch active state enhances background mode:** When a patch with no farplane is selected, the background mode selector should gracefully show "No farplane loaded" rather than silently rendering as transparent.
- **Update interval removal is independent:** Delete one `setInterval` call in `electron/main.ts`. No UI changes.

---

## MVP Definition

### Launch With (this milestone)

All four features are clearly scoped. Recommended order:

- [ ] **Wall type preservation fix** — Pure logic fix in `WallSystem.ts`. Zero UI changes. Eliminates map corruption from mixed-type wall painting. Highest correctness value per line of code.
- [ ] **Startup-only update check** — Remove the 30-minute `setInterval` from `electron/main.ts`. One-line deletion. No regressions.
- [ ] **Canvas background mode selector** — New UI control, GlobalSlice addition, CanvasEngine buffer fill, prop threading. Most impactful for editing UX. Depends on farplane threading to MapCanvas.
- [ ] **Patch dropdown active indicator** — Show which patch is loaded. Low complexity, high UX clarity. Pairs naturally with the background mode feature.

### Add After Validation (v1.x)

- [ ] **Background mode persistence** — Remember last-used background mode across editor sessions via `localStorage`. Only worthwhile once the feature is in use and users request it.
- [ ] **Minimap background mode sync** — Minimap already handles farplane pixels separately (checkerboard fallback when no farplane). Syncing minimap background to match canvas background mode is a visual consistency win. Currently correct for most workflows.

### Future Consideration (v2+)

- [ ] **Per-patch farplane fallback chain** — Try `.jpg` then `.png` when loading `imgFarplane`. `handleSelectBundledPatch` only tries `.png`; could silently fail for patches with `.jpg` farplanes.
- [ ] **Background mode thumbnail preview in export dialog** — Show what each background mode looks like before exporting. High cost for moderate value.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wall type preservation fix | HIGH — prevents map corruption | LOW — one function change, `findWallType` already works | P1 |
| Startup-only update check | MEDIUM — reduces unexpected network traffic | LOW — remove one `setInterval` call | P1 |
| Canvas background mode selector | HIGH — live farplane preview matches in-game look | MEDIUM — prop threading, CanvasEngine change, UI | P1 |
| Patch dropdown active indicator | MEDIUM — UX clarity, prevents blind switching | LOW — one state variable, dropdown styling | P2 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Domain Analysis: Background Modes

Correct semantic behavior for each mode, for use in implementation.

### Transparent
- Canvas shows whatever is behind it (CSS background)
- On the main editor canvas: render a checkerboard pattern as the CSS background of the canvas element — this is the standard transparency indicator used in Photoshop, GIMP, and all tile editors
- On export: PNG with alpha channel; tile-280 areas are truly transparent pixels
- Current state: CanvasEngine clears the buffer before rendering (`clearRect`), so transparent tiles show the canvas element's dark CSS background, not a checkerboard. No background mode control exists on the live canvas.

### Classic (SEdit Magenta)
- Fill background with `#FF00FF` before rendering tiles
- This is what the original SEdit editor used; legacy maps use this as their space color
- On export: implemented correctly in `overviewRenderer.ts`. Not available on live canvas.

### Farplane
- Fill the CanvasEngine 4096x4096 buffer with `imgFarplane` scaled to full map size before rendering tiles
- Tile 280 skips rendering, so farplane shows through those cells — this is how SubSpace/Continuum renders maps in-game
- Current state: `overviewRenderer.ts` implements this correctly for export. The live canvas has no implementation. `farplaneImage` is not passed to `MapCanvas`.

### Custom Color
- Fill with an arbitrary hex color before rendering tiles
- Useful for screenshots with a specific background
- On live canvas: lower priority; most users will use farplane or transparent

### Custom Image
- Scale an arbitrary image to fill the canvas
- Export-only feature; not meaningful for the live editing canvas (confusing without farplane's correct map-scaled semantics)
- Recommendation: do not expose on the live canvas selector; keep it export-only

---

## Domain Analysis: Wall Auto-Connection Algorithm

### The Bug (Wall Bleeding)

Current `updateNeighbor()` implementation in `WallSystem.ts`:

```typescript
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  if (!this.isWallTile(currentTile)) return;
  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(this.currentType, connections);  // BUG: uses currentType
  map.tiles[index] = newTile;
}
```

`this.currentType` is the type the user is currently painting. Painting red walls next to basic walls converts every basic wall neighbor to red — the connection shape updates correctly but the wall material bleeds.

The same bug exists in `collectNeighborUpdate()` which drives `placeWallBatch()` (wall rectangle tool and Bresenham line segments).

### The Correct Algorithm

`findWallType(tile)` already exists and scans `wallTypes[][]` to return the type index for any known wall tile. The fix for `updateNeighbor`:

```typescript
private updateNeighbor(map: MapData, x: number, y: number, _addConnection: number): void {
  if (!this.isWallTile(currentTile)) return;
  const existingType = this.findWallType(currentTile);
  const typeToUse = existingType !== -1 ? existingType : this.currentType;
  const connections = this.getConnections(map, x, y);
  const newTile = this.getWallTile(typeToUse, connections);
  map.tiles[index] = newTile;
}
```

Apply the same fix to `collectNeighborUpdate()`.

### The Disconnect Case

`updateNeighborDisconnect()` already calls `findWallType()` correctly — it was implemented with the right intent. Only the placement path has the bug.

### Comment Accuracy

The comment on `updateNeighbor` says "Uses currentType for the new tile (matching SEDIT's set_wall_tile behavior)". This comment is inaccurate — SEDIT preserves neighbor wall types during connection updates. The comment describes what the code does, not what SEDIT does.

---

## Domain Analysis: Patch Selector (Desktop vs. Web)

### Current State

The patch selector works correctly for its core function:
- Bundled patches: fetched via URL from `./assets/patches/PatchName/imgTiles.png` (served by Electron's file protocol, works as web fetch)
- Custom patch folders: loaded via `window.electronAPI.listDir()` and `readFile()` (IPC to main process)

### Gap: No Active Patch State

App.tsx calls `handleSelectBundledPatch(patchName)` and `handleChangeTileset()` but never records which patch is now active. Fix:

1. Add `activePatch: string | null` to App.tsx local state (initialized to `'AC Default'` since that loads on startup)
2. Set it to `patchName` in `handleSelectBundledPatch`
3. Set it to the folder name or `null` ("Custom") in `handleChangeTileset`
4. Pass as prop to `TilesetPanel`
5. In the dropdown, add a checkmark or bold class to the item matching `activePatch`

Self-contained in App.tsx and TilesetPanel. No store changes needed.

---

## Competitor Feature Analysis

| Feature | SEdit (Reference) | This Editor (Current) | This Editor (Target) |
|---------|-------------------|-----------------------|---------------------|
| Live farplane background | Yes — shows imgFarplane behind transparent tiles | No — dark CSS background | Yes — background mode selector with farplane option |
| Wall type preservation | Yes — neighbors keep their material | No — neighbor type bleeds to currentType | Yes — fix updateNeighbor to use findWallType |
| Patch switching | Yes — manual file picker | Yes — bundled dropdown and folder picker | Yes + active patch indicator |
| Update check | N/A (no auto-updater) | Startup + every 30 min | Startup only |

---

## Sources

- `E:\NewMapEditor\src\core\map\WallSystem.ts` — wall algorithm analysis (HIGH confidence)
- `E:\NewMapEditor\src\core\export\overviewRenderer.ts` — background mode types and rendering logic (HIGH confidence)
- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — buffer clear behavior, no background fill before tiles (HIGH confidence)
- `E:\NewMapEditor\src\App.tsx` — patch loading, farplane state, patch selector wiring (HIGH confidence)
- `E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.tsx` — patch dropdown UI, no active state indicator (HIGH confidence)
- `E:\NewMapEditor\src\components\OverviewExportDialog\OverviewExportDialog.tsx` — background mode types in export (HIGH confidence)
- `E:\NewMapEditor\electron\main.ts` — auto-updater setup, 5s startup + 30min interval (HIGH confidence)
- `E:\NewMapEditor\src\components\Minimap\Minimap.tsx` — farplane pixel cache, checkerboard fallback pattern (HIGH confidence)
- Project memory: SubSpace/Continuum tile format, farplane semantics, SEDIT as reference editor

---

*Feature research for: AC Map Editor — canvas background modes, patch selector, wall fix, update check*
*Researched: 2026-02-26*
