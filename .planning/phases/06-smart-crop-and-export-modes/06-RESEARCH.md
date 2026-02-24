# Phase 6: Smart Crop and Export Modes - Research

**Researched:** 2026-02-23
**Domain:** Canvas export pipeline, BFS flood-fill algorithm, PNG generation
**Confidence:** HIGH

## Summary

Phase 6 adds smart crop export, export mode toggling (full/cropped/both), and transparent background export to the AC Map Editor. The core technical challenge is implementing a BFS flood-fill algorithm that identifies and excludes holding pen areas from the crop bounding box, matching the behavior of the existing Python reference implementation at `D:\ac-tools\AC_Map_Render-main\scripts\map_render_core.py`.

The editor already has a 4096x4096 off-screen buffer in `CanvasEngine` but currently has **no PNG export pipeline** -- the `export:writePng` IPC channel from the Phase 5 decision [05-01] does not yet exist in `electron/main.ts` or `electron/preload.ts`. This means Phase 6 must build the entire export pipeline from scratch: the IPC channel, the directory picker with localStorage persistence, the export rendering (separate from the display buffer), the BFS smart crop algorithm, and the UI controls for export mode and transparent background.

**Primary recommendation:** Build the export pipeline as a standalone `ExportService` module in `src/core/services/` that renders to a fresh off-screen canvas (not reusing the CanvasEngine display buffer), implements the BFS smart crop algorithm as a pure function in `src/core/map/`, adds the `export:writePng` IPC channel plus `dialog:selectDirectory` to the Electron main process, and exposes export mode/transparent background controls in the toolbar or menu.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas API | Built-in | Off-screen rendering for export | Already used for map display; `canvas.toBlob()` produces PNG natively |
| Electron IPC | v34 | `export:writePng` channel to write PNG from renderer to disk | Established pattern in project; all file I/O goes through IPC |
| Zustand | v5.0.3 | Export state (outputDir, exportMode, transparentBg) | Already the state management solution |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage | Built-in | Persist outputDir across sessions | Per [05-01] decision |
| Electron dialog | v34 | `dialog.showOpenDialog` with `openDirectory` property for directory picker | First export or user-initiated change |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `canvas.toBlob()` | `canvas.toDataURL()` | `toBlob()` is better -- avoids base64 encoding overhead for large 4096x4096 images; produces ArrayBuffer directly |
| Dedicated `export:writePng` IPC | Reusing `file:write` IPC | Per decision [05-01], a dedicated channel is preferred for semantic clarity and potential future optimizations |
| Separate export canvas | Reusing CanvasEngine buffer | Export canvas is essential -- the display buffer has CSS background fills and may have animation state; export needs a clean render |

**Installation:**
No new dependencies needed. All functionality uses built-in Canvas API, Electron IPC, and existing project libraries.

## Architecture Patterns

### Recommended Project Structure
```
src/
  core/
    map/
      SmartCrop.ts         # BFS flood-fill, cluster detection, bounds calculation (pure functions)
    services/
      ExportService.ts     # Export rendering, export mode logic, transparent bg support
  components/
    ExportControls/        # UI for export mode toggle, transparent bg checkbox, export button
electron/
  main.ts                  # Add export:writePng + dialog:selectDirectory IPC handlers
  preload.ts               # Expose new IPC channels
```

### Pattern 1: BFS Flood-Fill for Holding Pen Detection
**What:** Find connected clusters of content tiles using BFS from all content tiles, identify the largest cluster as the "main area," include nearby clusters (within distance threshold), exclude distant clusters as holding pens.
**When to use:** Before computing the crop bounding box.
**Reference:** `D:\ac-tools\AC_Map_Render-main\scripts\map_render_core.py` lines 133-250

```typescript
// SmartCrop.ts - Pure function, no dependencies on rendering
import { MAP_WIDTH, MAP_HEIGHT, DEFAULT_TILE } from './types';

const CROP_PADDING = 2; // tiles of padding around crop (matches Python)
const DISTANCE_THRESHOLD = 30; // tiles - max distance to include a cluster
const MIN_CLUSTER_SIZE = 10; // ignore tiny clusters

// Transparent/void tiles that are NOT content
const TRANSPARENT_TILES = new Set([280, 0xFFFF]);

interface Bounds {
  minX: number; minY: number; maxX: number; maxY: number;
}

interface SmartCropResult {
  allBounds: Bounds | null;          // Bounding box of ALL content
  mainBounds: Bounds | null;         // Bounding box excluding holding pens
  excludedClusters: number;          // Number of clusters excluded
  paddedBounds: Bounds | null;       // mainBounds + CROP_PADDING, clamped to map
}

function isContentTile(tid: number): boolean {
  if (TRANSPARENT_TILES.has(tid)) return false;
  if (tid === 0) return false;
  return true;
}

function findClusters(tiles: Uint16Array): Set<number>[] {
  // BFS flood-fill, 4-directional connectivity
  // Returns clusters sorted by size (largest first)
}

function findMainAreaBounds(tiles: Uint16Array, distanceThreshold = 30): SmartCropResult {
  // 1. Find all clusters via BFS
  // 2. Largest cluster = main area
  // 3. Include clusters within distanceThreshold of main bounds center
  // 4. Exclude distant clusters (holding pens)
  // 5. Return padded bounds
}
```

### Pattern 2: Export Rendering Pipeline
**What:** Create a temporary off-screen canvas, render the map to it (with or without farplane background), then export as PNG blob.
**When to use:** When user triggers export.

```typescript
// ExportService.ts
async function renderExportCanvas(
  tiles: Uint16Array,
  tilesetImage: HTMLImageElement,
  farplaneImage: HTMLImageElement | null,
  bounds: Bounds | null,   // null = full 4096x4096
  transparent: boolean      // true = no farplane, clear background
): Promise<HTMLCanvasElement> {
  const minX = bounds?.minX ?? 0;
  const minY = bounds?.minY ?? 0;
  const maxX = bounds?.maxX ?? (MAP_WIDTH - 1);
  const maxY = bounds?.maxY ?? (MAP_HEIGHT - 1);

  const width = (maxX - minX + 1) * TILE_SIZE;
  const height = (maxY - minY + 1) * TILE_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (!transparent && farplaneImage) {
    // Draw farplane scaled to full map, then crop to bounds
    // ... (resize farplane to 4096x4096, drawImage with source rect)
  }
  // else: canvas is transparent by default (RGBA 0,0,0,0)

  // Render tiles
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = tiles[y * MAP_WIDTH + x];
      if (tile === DEFAULT_TILE || tile === 0) continue; // skip void
      // ... render tile to (x-minX)*TILE_SIZE, (y-minY)*TILE_SIZE
    }
  }

  return canvas;
}
```

### Pattern 3: IPC Export Channel
**What:** Dedicated `export:writePng` IPC handler that receives PNG blob data and writes to disk.
**When to use:** Called from renderer after `canvas.toBlob()`.

```typescript
// electron/main.ts - new handler
ipcMain.handle('export:writePng', async (_, filePath: string, pngData: string) => {
  try {
    const buffer = Buffer.from(pngData, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Directory picker
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select Export Directory'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
```

### Pattern 4: Export Mode State
**What:** Store export preferences (mode, transparent bg, output dir) in Zustand with localStorage persistence.
**When to use:** Global state that persists across sessions.

```typescript
// In globalSlice.ts or new exportSlice.ts
type ExportMode = 'full' | 'cropped' | 'both';

interface ExportState {
  exportMode: ExportMode;
  transparentBackground: boolean;
  outputDir: string | null;
  setExportMode: (mode: ExportMode) => void;
  setTransparentBackground: (value: boolean) => void;
  setOutputDir: (dir: string | null) => void;
}
```

### Anti-Patterns to Avoid
- **Reusing the display CanvasEngine buffer for export:** The display buffer has CSS-driven background colors, animation state, and may have dirty regions. Always render a fresh canvas for export.
- **Storing PNG blob data in Zustand:** PNG blobs can be 1-16MB. Keep them transient in the export function, never in state.
- **BFS on every frame:** The smart crop calculation only needs to run once when export is triggered, not continuously. Cache results if needed for preview.
- **Blocking the UI during export:** Use `canvas.toBlob()` (async callback) rather than `canvas.toDataURL()` (synchronous, blocks main thread for large canvases).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG encoding | Manual PNG byte assembly | `canvas.toBlob('image/png')` | Canvas API handles PNG encoding natively, including alpha channel for transparency |
| File writing to disk | Custom binary writer | Electron IPC `fs.writeFileSync` | Already established pattern in project |
| Directory persistence | Custom config file | `localStorage.setItem/getItem` | Per decision [05-01], simple and already used for theme/grid settings |

**Key insight:** The Canvas API's `toBlob()` method handles all PNG encoding complexity including proper alpha channels for transparent backgrounds. There is zero benefit to hand-rolling PNG generation.

## Common Pitfalls

### Pitfall 1: BFS Stack Overflow on Large Maps
**What goes wrong:** Recursive DFS on a 256x256 map (65536 tiles) can exceed the call stack limit if the main area is large (e.g., 20000+ connected tiles).
**Why it happens:** JavaScript default stack size is ~10000 frames.
**How to avoid:** Use iterative BFS with a `deque`/queue (array with shift/push), not recursive DFS. The Python reference uses `collections.deque` for exactly this reason.
**Warning signs:** "Maximum call stack size exceeded" error when exporting maps with large connected areas.

### Pitfall 2: Animated Tile Handling in Export
**What goes wrong:** Animated tiles (bit 15 set) are stored as animation IDs, not static tile IDs. Exporting the raw tile value would render garbage.
**Why it happens:** The display engine resolves animation IDs to frame tiles at render time, but an export renderer needs to do the same resolution.
**How to avoid:** Use `ANIMATION_DEFINITIONS` to resolve animated tiles to their frame-0 static tile ID before rendering to the export canvas. The Python reference does this via `resolve_anim_tile()`.
**Warning signs:** Export PNG shows purple/gray blocks where animated tiles should be.

### Pitfall 3: Large Canvas Memory Pressure
**What goes wrong:** Creating a 4096x4096 RGBA canvas = 67MB of pixel data. Creating multiple simultaneously (for full + cropped in "both" mode) can cause memory pressure.
**Why it happens:** Canvas pixel buffers are uncompressed RGBA in GPU/CPU memory.
**How to avoid:** Render and export one canvas at a time. Create the full canvas, export it, dispose it, then create the cropped canvas. Never hold both simultaneously.
**Warning signs:** Browser tab crashes or "out of memory" errors during "both" export.

### Pitfall 4: toBlob() Is Asynchronous
**What goes wrong:** Calling `canvas.toBlob()` and immediately disposing the canvas or reading the blob before the callback fires.
**Why it happens:** `toBlob()` uses a callback pattern, not returning a Promise natively.
**How to avoid:** Wrap `toBlob()` in a Promise and await it. Do not dispose the canvas until the blob is fully created.
**Warning signs:** Empty or truncated PNG files.

### Pitfall 5: Crop Bounds Off-By-One vs Python Reference
**What goes wrong:** The crop bounding box doesn't match the Python reference implementation, producing slightly different output dimensions.
**Why it happens:** Confusion between inclusive vs exclusive bounds, or forgetting the CROP_PADDING constant (2 tiles in Python).
**How to avoid:** Match the Python reference exactly: bounds are inclusive `(minX, minY, maxX, maxY)`, padding is added as `max(0, minX - 2)` and `min(255, maxX + 2)`, output size is `(maxX - minX + 1) * 16` by `(maxY - minY + 1) * 16`.
**Warning signs:** Crop bounding box verification test fails.

### Pitfall 6: Farplane Scaling for Cropped Export
**What goes wrong:** When exporting a cropped region with farplane background, the farplane must be scaled to the full 4096x4096 map size first, then the correct sub-region extracted. Simply scaling the farplane to the cropped dimensions produces wrong tile alignment.
**Why it happens:** The farplane image is typically much smaller than 4096x4096 and needs bilinear scaling.
**How to avoid:** Scale farplane to full map dimensions (4096x4096), then `drawImage` with source rect matching the crop bounds. This is how the Python reference does it (`fp_resized.crop(crop_box)`).
**Warning signs:** Farplane background appears shifted or scaled incorrectly in cropped export.

## Code Examples

### BFS Flood-Fill (TypeScript port of Python reference)
```typescript
// Source: D:\ac-tools\AC_Map_Render-main\scripts\map_render_core.py lines 133-178
function findClusters(tiles: Uint16Array, minClusterSize = 10): Set<number>[] {
  const visited = new Set<number>();
  const clusters: Set<number>[] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const idx = y * MAP_WIDTH + x;
      if (visited.has(idx)) continue;
      if (!isContentTile(tiles[idx])) continue;

      // BFS flood fill
      const cluster = new Set<number>();
      const queue: number[] = [idx]; // Use array as queue
      let head = 0;

      while (head < queue.length) {
        const ci = queue[head++];
        if (visited.has(ci)) continue;

        const cx = ci % MAP_WIDTH;
        const cy = Math.floor(ci / MAP_WIDTH);
        if (cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT) continue;
        if (!isContentTile(tiles[ci])) continue;

        visited.add(ci);
        cluster.add(ci);

        // 4-directional neighbors
        if (cx + 1 < MAP_WIDTH) queue.push(cy * MAP_WIDTH + (cx + 1));
        if (cx - 1 >= 0) queue.push(cy * MAP_WIDTH + (cx - 1));
        if (cy + 1 < MAP_HEIGHT) queue.push((cy + 1) * MAP_WIDTH + cx);
        if (cy - 1 >= 0) queue.push((cy - 1) * MAP_WIDTH + cx);
      }

      if (cluster.size >= minClusterSize) {
        clusters.push(cluster);
      }
    }
  }

  // Sort by size, largest first
  clusters.sort((a, b) => b.size - a.size);
  return clusters;
}
```

### Distance Threshold Check (TypeScript port)
```typescript
// Source: D:\ac-tools\AC_Map_Render-main\scripts\map_render_core.py lines 194-250
function findMainAreaBounds(
  tiles: Uint16Array,
  distanceThreshold = 30
): SmartCropResult {
  const clusters = findClusters(tiles);

  if (clusters.length === 0) {
    return { allBounds: null, mainBounds: null, excludedClusters: 0, paddedBounds: null };
  }

  // All-content bounds
  const allBounds = getClusterBounds(clusters.reduce((all, c) => {
    c.forEach(i => all.add(i));
    return all;
  }, new Set<number>()));

  if (clusters.length === 1) {
    const padded = addPadding(allBounds!);
    return { allBounds, mainBounds: allBounds, excludedClusters: 0, paddedBounds: padded };
  }

  const mainCluster = clusters[0];
  const mainBounds = getClusterBounds(mainCluster)!;
  const includedTiles = new Set(mainCluster);
  let excludedCount = 0;

  for (let i = 1; i < clusters.length; i++) {
    const clusterBounds = getClusterBounds(clusters[i])!;
    const cx = (clusterBounds.minX + clusterBounds.maxX) / 2;
    const cy = (clusterBounds.minY + clusterBounds.maxY) / 2;

    // Distance to nearest edge of main bounds
    const dx = Math.max(mainBounds.minX - cx, 0, cx - mainBounds.maxX);
    const dy = Math.max(mainBounds.minY - cy, 0, cy - mainBounds.maxY);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= distanceThreshold) {
      clusters[i].forEach(idx => includedTiles.add(idx));
    } else {
      excludedCount++;
    }
  }

  const finalBounds = getClusterBounds(includedTiles);
  const padded = finalBounds ? addPadding(finalBounds) : null;
  return { allBounds, mainBounds: finalBounds, excludedClusters: excludedCount, paddedBounds: padded };
}
```

### canvas.toBlob() Promise Wrapper
```typescript
// Verified pattern from MDN Web Docs
function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob() returned null'));
      },
      type
    );
  });
}
```

### Export Flow (Full Pipeline)
```typescript
async function exportMap(
  tiles: Uint16Array,
  tilesetImage: HTMLImageElement,
  farplaneImage: HTMLImageElement | null,
  mapName: string,
  outputDir: string,
  mode: ExportMode,
  transparentBg: boolean
): Promise<{ success: boolean; files: string[] }> {
  const files: string[] = [];

  if (mode === 'full' || mode === 'both') {
    const canvas = renderExportCanvas(tiles, tilesetImage, farplaneImage, null, transparentBg);
    const blob = await canvasToBlob(canvas);
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const filePath = `${outputDir}/${mapName}.png`;
    await window.electronAPI.exportWritePng(filePath, base64);
    files.push(filePath);
  }

  if (mode === 'cropped' || mode === 'both') {
    const cropResult = findMainAreaBounds(tiles);
    if (cropResult.paddedBounds) {
      const canvas = renderExportCanvas(tiles, tilesetImage, farplaneImage, cropResult.paddedBounds, transparentBg);
      const blob = await canvasToBlob(canvas);
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const suffix = mode === 'both' ? '_cropped' : '';
      const filePath = `${outputDir}/${mapName}${suffix}.png`;
      await window.electronAPI.exportWritePng(filePath, base64);
      files.push(filePath);
    }
  }

  return { success: true, files };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No export pipeline | Phase 6 builds it from scratch | Current phase | Must create IPC channel, rendering, BFS algorithm, UI |
| `canvas.toDataURL()` | `canvas.toBlob()` | Long-standing best practice | toBlob is async and avoids unnecessary base64 encoding step |

**Deprecated/outdated:**
- None relevant. Canvas API and Electron IPC patterns are stable.

## Codebase-Specific Findings

### Existing Infrastructure That Phase 6 Can Leverage

1. **CanvasEngine.renderTile()** (line 119-156): Already handles animated tile resolution, static tile rendering, and empty tile skipping. The export renderer can reuse this logic but needs its own instance or a static method since the export canvas is separate from the display canvas.

2. **ANIMATION_DEFINITIONS** in `AnimationDefinitions.ts`: Complete animation-to-tile mapping needed for resolving animated tiles to static frame-0 tiles during export.

3. **DEFAULT_TILE = 280**: Already defined as the empty/void tile in `types.ts`. This is one of the TRANSPARENT_TILES that the Python reference skips (`{280, 0xFFFF}`).

4. **File I/O pattern**: `file:write` IPC exists for generic binary writes. The dedicated `export:writePng` channel follows the same pattern but adds semantic clarity per [05-01].

5. **localStorage persistence pattern**: Already used for theme (`ac-editor-theme`) and grid settings (`ac-map-editor-grid-settings`). Export outputDir should follow the same pattern with key like `ac-editor-export-dir`.

6. **farplaneImage**: Already loaded and managed in `App.tsx` state. Passed to Minimap for background rendering. Export service needs access to this image for non-transparent exports.

### What Does NOT Exist Yet

1. **No `export:writePng` IPC channel** - Must be created in `electron/main.ts` and exposed in `electron/preload.ts`
2. **No `dialog:selectDirectory` IPC channel** - Must be created for output directory picker
3. **No export UI** - No export button, no mode selector, no transparent background toggle
4. **No smart crop algorithm** - BFS must be implemented from scratch (porting from Python reference)
5. **No export rendering** - No function to render map to a standalone PNG-ready canvas

### Python Reference Implementation Key Constants
From `D:\ac-tools\AC_Map_Render-main\scripts\map_render_core.py`:
- `CROP_PADDING = 2` (tiles)
- `distance_threshold = 30` (tiles, parameter default)
- `min_cluster_size = 10` (tiles)
- `TRANSPARENT_TILES = {280, 0xFFFF}`
- `is_content_tile()`: returns False for tiles in TRANSPARENT_TILES or tile == 0

### Naming Convention for Export Files
From `render_maps.py`:
- Full export: `{mapName}.png` (or `{mapName}_full.png` in "both" mode -- to be decided)
- Cropped export: `{mapName}_cropped.png`
- Directory structure: configurable outputDir, flat file placement (no subdirectories)

## Open Questions

1. **Where should the Export UI live?**
   - What we know: The toolbar already has action tools (rotate, mirror). An "Export" button could go in the toolbar, the File menu, or both.
   - What's unclear: Whether the user wants a modal dialog for export settings or inline controls.
   - Recommendation: Add "Export PNG..." to the File menu (consistent with standard editors). Show a small export options panel/dialog when triggered, with mode selector (full/cropped/both), transparent background checkbox, and output directory picker. The File menu approach is cleanest.

2. **Should the export use the currently loaded patch tileset or always AC Default?**
   - What we know: The user loads patches via TilesetPanel, stored in App.tsx state as `tilesetImage`. The Python reference renders with whichever tileset directory is specified.
   - What's unclear: Whether the user expects export to use the currently loaded patch.
   - Recommendation: Use the currently loaded tileset (whatever is in `tilesetImage` state). This matches what the user sees on screen.

3. **Should "both" mode produce `{name}.png` + `{name}_cropped.png` or `{name}_full.png` + `{name}_cropped.png`?**
   - What we know: Python reference uses `full/` and `cropped/` subdirectories. But the user decision [05-01] suggests flat directory.
   - What's unclear: Exact naming convention.
   - Recommendation: `{name}.png` (full) and `{name}_cropped.png` in "both" mode. In "full" or "cropped" single mode, just `{name}.png`.

4. **Should the web build support export?**
   - What we know: Web build uses `WebElectronShim` which can trigger browser downloads. `canvas.toBlob()` works in browsers.
   - What's unclear: Whether web export is in scope for this phase.
   - Recommendation: Implement export in Electron first. The web shim can be extended later with `triggerDownload(blob, filename)` if needed, but it's not a success criterion.

## Sources

### Primary (HIGH confidence)
- `D:\ac-tools\AC_Map_Render-main\scripts\map_render_core.py` - Python reference implementation for BFS flood-fill, cluster detection, distance threshold, crop bounds, farplane rendering
- `D:\ac-tools\AC_Map_Render-main\scripts\animation.py` - TRANSPARENT_TILES definition, ANIMATION_TILE_MAP
- `E:\newmapeditor\src\core\canvas\CanvasEngine.ts` - Current rendering architecture, renderTile method, buffer management
- `E:\newmapeditor\electron\main.ts` - Existing IPC handlers, dialog patterns
- `E:\newmapeditor\electron\preload.ts` - Existing API surface exposed to renderer
- `E:\newmapeditor\src\core\map\types.ts` - Map data types, DEFAULT_TILE, MAP_WIDTH/HEIGHT constants

### Secondary (MEDIUM confidence)
- Canvas API `toBlob()` documentation - Well-documented standard API
- Electron `dialog.showOpenDialog` with `openDirectory` property - Verified in existing codebase usage

### Tertiary (LOW confidence)
- None. All findings are based on direct codebase inspection and the Python reference implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, all built-in APIs
- Architecture: HIGH - Clear patterns from Python reference and existing codebase
- Pitfalls: HIGH - BFS/memory/async issues are well-understood from reference implementation
- BFS algorithm: HIGH - Direct port from working Python reference with identical data structures

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable domain, no external dependencies)
