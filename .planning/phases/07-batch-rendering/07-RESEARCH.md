# Phase 7: Batch Rendering - Research

**Researched:** 2026-02-23
**Domain:** Canvas rendering, PNG export, batch processing in Electron/React
**Confidence:** HIGH

## Summary

Phase 7 implements batch rendering of the current map across all 44+ bundled patches, outputting one PNG per patch to a user-chosen directory with progress feedback. This builds atop prior export decisions from Phases 5 and 6 (which established the `export:writePng` IPC channel concept, directory picker, and self-contained export renderer pattern). However, the current codebase has **none of these Phase 5/6 features implemented yet**, so Phase 7 must either depend on them being built first or incorporate the necessary infrastructure itself.

The core technical challenge is rendering the same 256x256 tile map 44+ times with different tilesets (one per patch), converting each 4096x4096 canvas to PNG, and writing it to disk -- all without exhausting memory or freezing the UI. The existing `CanvasEngine` demonstrates the rendering pattern (off-screen 4096x4096 buffer, tile-by-tile rendering from tileset image), and the `BUNDLED_PATCHES` array in `TilesetPanel.tsx` provides the canonical list of patch names. The architecture must be sequential (one render at a time) with explicit canvas/image cleanup between iterations.

**Primary recommendation:** Build a self-contained `batchRender` async function that sequentially loads each patch tileset, renders the full map to a temporary off-screen canvas, exports to PNG blob, writes via IPC, and cleans up -- yielding back to the event loop between patches for UI progress updates.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI components (progress dialog) | Already in project |
| Zustand | 4.x | State management (batch progress state) | Already in project |
| Electron IPC | - | File write, directory picker dialogs | Already in project |
| Canvas 2D API | - | Off-screen rendering to 4096x4096 buffer | Already in project (CanvasEngine) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `HTMLCanvasElement.toBlob()` | Browser native | Convert canvas to PNG blob | Every render iteration |
| `FileReader` / `Blob.arrayBuffer()` | Browser native | Convert blob to base64 for IPC | Every write iteration |

### No New Dependencies Needed
This phase requires no additional npm packages. All functionality is achievable with existing browser APIs and the Electron IPC already in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
  core/
    export/
      batchRenderer.ts       # Self-contained batch render logic (pure function)
  components/
    BatchRenderDialog/
      BatchRenderDialog.tsx   # Modal dialog with progress UI
      BatchRenderDialog.css   # Styling
```

### Pattern 1: Sequential Async Batch with Yield-to-UI
**What:** Process patches one at a time in an async loop, using `requestAnimationFrame` or `setTimeout(0)` between iterations to yield back to the event loop so React can update progress.
**When to use:** Always for batch operations that must not freeze the UI.
**Example:**
```typescript
// Source: Standard browser pattern for long-running canvas operations
async function batchRender(
  map: MapData,
  patches: string[],
  outputDir: string,
  onProgress: (current: number, total: number, patchName: string) => void
): Promise<{ success: number; failed: string[] }> {
  const failed: string[] = [];

  for (let i = 0; i < patches.length; i++) {
    const patchName = patches[i];
    onProgress(i, patches.length, patchName);

    // Yield to event loop so React can paint progress update
    await new Promise(r => setTimeout(r, 0));

    try {
      // 1. Load tileset image for this patch
      const tilesetImg = await loadPatchTileset(patchName);

      // 2. Render full map to temporary off-screen canvas
      const canvas = renderMapToCanvas(map, tilesetImg);

      // 3. Export canvas to PNG blob
      const blob = await canvasToBlob(canvas);

      // 4. Write PNG to output directory
      await writePngToFile(blob, outputDir, patchName);

      // 5. Explicit cleanup - null references to allow GC
      // (canvas goes out of scope; tilesetImg.src = '' to release decoded pixels)
      tilesetImg.src = '';
    } catch (err) {
      failed.push(patchName);
    }
  }

  onProgress(patches.length, patches.length, 'Complete');
  return { success: patches.length - failed.length, failed };
}
```

### Pattern 2: Self-Contained Export Renderer (from Phase 6 decisions)
**What:** The batch renderer creates its own off-screen canvas and loads assets fresh rather than reusing the app's CanvasEngine or rendered canvas. This prevents any interference with the live editor view.
**When to use:** Always for export operations.
**Why:** The live CanvasEngine is attached to the screen canvas, has animation state, subscriptions, and incremental diffing. Export rendering should be a clean, independent operation.

```typescript
// Source: Derived from existing CanvasEngine.renderTile() pattern
function renderMapToCanvas(map: MapData, tilesetImg: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH * TILE_SIZE;   // 4096
  canvas.height = MAP_HEIGHT * TILE_SIZE; // 4096
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = map.tiles[y * MAP_WIDTH + x];
      // Render static frame (animFrame=0) for export
      renderExportTile(ctx, tilesetImg, tile, x * TILE_SIZE, y * TILE_SIZE);
    }
  }

  return canvas;
}
```

### Pattern 3: Canvas-to-PNG via toBlob() + IPC Write
**What:** Convert the rendered canvas to a PNG blob, then to base64 for transmission over Electron IPC to the main process for file writing.
**When to use:** For every PNG file output.
**Example:**
```typescript
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

async function writePngToFile(blob: Blob, outputDir: string, patchName: string): Promise<void> {
  // Sanitize patch name for filename (remove special chars)
  const safeName = patchName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
  const filePath = `${outputDir}/${safeName}.png`;

  // Convert blob to base64 for IPC
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Write via existing file:write IPC channel
  const result = await window.electronAPI.writeFile(filePath, base64);
  if (!result.success) {
    throw new Error(result.error || 'Write failed');
  }
}
```

### Pattern 4: Zustand Batch State Slice
**What:** Store batch rendering state (isRunning, currentIndex, totalCount, currentPatchName, errors) in Zustand so any component can subscribe to progress.
**When to use:** To drive the progress UI reactively.
**Example:**
```typescript
interface BatchRenderState {
  batchRendering: boolean;
  batchProgress: {
    current: number;
    total: number;
    currentPatch: string;
    errors: string[];
  } | null;
  startBatchRender: () => void;
  updateBatchProgress: (current: number, total: number, patchName: string) => void;
  addBatchError: (patchName: string) => void;
  finishBatchRender: () => void;
}
```

### Pattern 5: Directory Picker for Output
**What:** Use Electron's `dialog.showOpenDialog` with `properties: ['openDirectory', 'createDirectory']` to let the user pick the output folder. Persist the choice in localStorage.
**When to use:** Before batch render begins.
**Example (preload/main):**
```typescript
// In electron/main.ts
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Output Directory for Batch Render'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// In electron/preload.ts
selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
```

### Anti-Patterns to Avoid
- **Parallel rendering:** Never render multiple patches simultaneously. Each 4096x4096 canvas uses ~64MB of uncompressed pixel data. Two concurrent canvases = 128MB. With 44 patches, parallel would be catastrophic.
- **Reusing the live CanvasEngine:** The engine has subscriptions, animation state, and is attached to the screen. Export must use a separate canvas.
- **Keeping all canvases/blobs in memory:** Each iteration must fully complete and clean up before the next begins.
- **Blocking the UI thread:** Never do `for (let i...)` without yielding. Use async/await with setTimeout(0) or requestAnimationFrame between iterations.
- **Using toDataURL for large canvases:** `toDataURL()` creates a massive base64 string in memory. `toBlob()` is more memory-efficient as it produces a Blob that can be streamed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG encoding | Custom PNG encoder | `canvas.toBlob('image/png')` | Browser's native encoder is optimized C++ |
| Directory picker dialog | Custom file browser | Electron `dialog.showOpenDialog` with `openDirectory` | Native OS dialog, already used for patch folder |
| Base64 conversion for IPC | Custom streaming encoder | `Blob.arrayBuffer()` + standard `btoa()` loop | Existing pattern in ElectronFileService |
| Progress UI | Custom animation loop | React state + Zustand subscription | Already the app's pattern |
| Patch list | Hardcoded list | Import `BUNDLED_PATCHES` from TilesetPanel | Single source of truth already exists |

**Key insight:** The existing codebase already has every building block needed. The batch renderer is essentially "the existing single-render CanvasEngine.renderTile() loop, wrapped in a for-each-patch iterator with IPC file writes."

## Common Pitfalls

### Pitfall 1: Memory Exhaustion from Accumulated Canvases
**What goes wrong:** Creating 44 off-screen canvases without cleanup causes memory to grow to 44 * 64MB = ~2.8GB, crashing the renderer process.
**Why it happens:** JavaScript GC doesn't immediately collect detached canvases, especially when references linger.
**How to avoid:** Use a SINGLE reusable off-screen canvas. Clear it with `ctx.clearRect()` before each patch. Only create one `HTMLImageElement` at a time and explicitly set `.src = ''` after use.
**Warning signs:** Electron renderer process memory in Task Manager growing steadily during batch.

### Pitfall 2: UI Freeze During Rendering
**What goes wrong:** The progress bar doesn't update, the app appears hung.
**Why it happens:** The rendering loop (65,536 `drawImage` calls per patch) is synchronous and blocks the event loop.
**How to avoid:** After each patch completes and progress state is updated, yield with `await new Promise(r => setTimeout(r, 0))` before starting the next patch. React needs a paint frame to show the update.
**Warning signs:** Progress jumps from 0% to 100% with no intermediate updates visible.

### Pitfall 3: Base64 Memory Spike During IPC
**What goes wrong:** A 4096x4096 PNG can be 5-15MB. The base64 encoding adds ~33% overhead. The IPC serialization creates another copy. Peak memory per write can be 3-4x the PNG size.
**Why it happens:** Electron IPC serializes data through structured clone, and base64 encoding creates string copies.
**How to avoid:** (1) Ensure each blob/base64 string is fully written and can be GC'd before the next iteration. (2) Don't accumulate results. (3) Consider chunked writes if individual PNGs exceed ~20MB. In practice, 4096x4096 PNGs of tilemap data are typically 2-8MB, so this is manageable.
**Warning signs:** Memory spikes of 50-100MB per iteration that don't decrease.

### Pitfall 4: Patch Name Sanitization for Filenames
**What goes wrong:** Patch names like "NextGEN -TBWA Edition v2" or "lil-knights-by-aTreYu" create filenames with spaces and special characters that may fail on some systems.
**Why it happens:** Patch directory names in the bundled assets contain spaces, hyphens, and parentheses.
**How to avoid:** Sanitize filenames by replacing non-alphanumeric characters (except hyphens, underscores, spaces) with underscores. Keep spaces for readability since Windows/macOS/Linux all handle them fine.
**Warning signs:** Write errors on specific patches with unusual names.

### Pitfall 5: Animated Tile Rendering in Export
**What goes wrong:** Animated tiles (flag pads, spawns, warps) render as solid purple rectangles in export.
**Why it happens:** The renderer doesn't handle the `0x8000` animated flag correctly, or uses wrong animation frame.
**How to avoid:** The export renderer MUST handle animated tiles by resolving them to frame 0 (or a chosen frame) using `ANIMATION_DEFINITIONS`. The existing `CanvasEngine.renderTile()` method handles this correctly and should be extracted/reused.
**Warning signs:** Purple/missing tiles in specific areas of exported PNGs.

### Pitfall 6: Loading Bundled Patches vs Custom Patches
**What goes wrong:** Batch render only works for patches loaded from `./assets/patches/` but the user might have loaded a custom patch from disk.
**Why it happens:** The batch render hardcodes bundled patch paths but ignores the current tileset.
**How to avoid:** Batch render should ALWAYS use `BUNDLED_PATCHES` list with the bundled path pattern `./assets/patches/${encodeURIComponent(name)}/imgTiles.png`. The current user-selected patch is one of the 44 bundled patches or a custom one -- batch renders ALL bundled patches regardless.

## Code Examples

### Loading a Patch Tileset Image
```typescript
// Source: Derived from App.tsx handleSelectBundledPatch pattern (lines 162-197)
function loadPatchTileset(patchName: string): Promise<HTMLImageElement> {
  const patchBase = `./assets/patches/${encodeURIComponent(patchName)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tileset for patch: ${patchName}`));
    img.src = `${patchBase}/imgTiles.png`;
  });
}
```

### Rendering a Single Tile (Export Version)
```typescript
// Source: Derived from CanvasEngine.renderTile() (lines 119-156)
const TILES_PER_ROW = 40;
const TILE_SIZE = 16;

function renderExportTile(
  ctx: CanvasRenderingContext2D,
  tilesetImg: HTMLImageElement,
  tile: number,
  destX: number,
  destY: number
): void {
  const isAnimated = (tile & 0x8000) !== 0;
  if (isAnimated) {
    const animId = tile & 0xFF;
    const anim = ANIMATION_DEFINITIONS[animId];
    if (anim && anim.frames.length > 0) {
      // Use frame 0 for static export
      const displayTile = anim.frames[0];
      const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(tilesetImg, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
    }
    // If no animation data, leave transparent (skip)
  } else {
    if (tile === 280) return; // DEFAULT_TILE = transparent, skip
    const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImg, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
  }
}
```

### Output Directory Picker with localStorage Persistence
```typescript
// Source: Phase 5 prior decision pattern (outputDir persists in localStorage)
const OUTPUT_DIR_KEY = 'ac-editor-export-output-dir';

async function pickOutputDirectory(): Promise<string | null> {
  // Try to use persisted directory first
  const stored = localStorage.getItem(OUTPUT_DIR_KEY);

  // Always prompt user (they may want a different folder for batch)
  const selected = await window.electronAPI.selectDirectory();
  if (!selected) return null;

  localStorage.setItem(OUTPUT_DIR_KEY, selected);
  return selected;
}
```

### Full Batch Render Orchestration
```typescript
// Source: Synthesized from codebase patterns
async function executeBatchRender(
  map: MapData,
  outputDir: string,
  onProgress: (current: number, total: number, patchName: string) => void,
  onError: (patchName: string, error: string) => void,
  signal?: AbortSignal // Optional cancellation
): Promise<{ rendered: number; failed: number; total: number }> {
  const patches = BUNDLED_PATCHES; // from TilesetPanel.tsx
  const total = patches.length;
  let rendered = 0;
  let failed = 0;

  // Create ONE reusable off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH * TILE_SIZE;
  canvas.height = MAP_HEIGHT * TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < total; i++) {
    // Check for cancellation
    if (signal?.aborted) break;

    const patchName = patches[i];
    onProgress(i, total, patchName);

    // Yield to let React paint
    await new Promise(r => setTimeout(r, 0));

    try {
      // Load tileset
      const tilesetImg = await loadPatchTileset(patchName);

      // Clear and render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let ty = 0; ty < MAP_HEIGHT; ty++) {
        for (let tx = 0; tx < MAP_WIDTH; tx++) {
          const tile = map.tiles[ty * MAP_WIDTH + tx];
          renderExportTile(ctx, tilesetImg, tile, tx * TILE_SIZE, ty * TILE_SIZE);
        }
      }

      // Export to PNG blob
      const blob = await canvasToBlob(canvas);

      // Write to file
      await writePngToFile(blob, outputDir, patchName);

      // Cleanup tileset image
      tilesetImg.src = '';

      rendered++;
    } catch (err) {
      failed++;
      onError(patchName, (err as Error).message);
    }
  }

  // Cleanup reusable canvas (help GC)
  canvas.width = 0;
  canvas.height = 0;

  return { rendered, failed, total };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `canvas.toDataURL()` | `canvas.toBlob()` | All modern browsers | toBlob is async and more memory-efficient for large canvases |
| Synchronous file writes | Async IPC with base64 | Electron standard | Non-blocking, works across process boundary |
| Worker threads for rendering | Main thread with yield | Canvas 2D not in workers | OffscreenCanvas exists but has limited browser support for toBlob; Electron Chromium supports it but adds complexity for minimal gain when sequential |

**Note on OffscreenCanvas:** While Electron's Chromium supports `OffscreenCanvas`, using it would require a Web Worker, transferring the tileset image data to the worker, and coordinating via postMessage. For sequential rendering with yield-to-UI between patches, the simpler approach of main-thread rendering with `setTimeout(0)` yields is sufficient and avoids the complexity of worker coordination.

## IPC Channels Needed

### New Channels (Must Be Added)
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `dialog:selectDirectory` | renderer -> main | Open native folder picker for output directory |

### Existing Channels (Already Available)
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `file:write` | renderer -> main | Write base64-encoded PNG data to disk |

**Note:** The Phase 5 prior decision mentions an `export:writePng` channel, but this does not exist in the codebase. The existing `file:write` channel (which takes a filePath and base64 data string) is functionally identical and already implemented. Use `file:write` directly rather than creating a new specialized channel.

## Patch Inventory

The canonical list of 44 bundled patches lives in `src/components/TilesetPanel/TilesetPanel.tsx` as the `BUNDLED_PATCHES` array. Each patch directory contains:
- `imgTiles.png` (REQUIRED) - 640x2080 tileset (40 columns x 130 rows = 5200 tiles, each 16x16)
- `imgFarplane.png` or `.jpg` (optional) - background image
- `imgTuna.png` (optional) - player ship graphics

For batch rendering, only `imgTiles.png` is needed per patch.

**Action item:** Extract `BUNDLED_PATCHES` to a shared constant (e.g., `src/core/patches.ts`) so both TilesetPanel and the batch renderer can import it without circular dependencies.

## Open Questions

1. **Should the batch render include the currently-loaded custom patch?**
   - What we know: Users can load patches from disk via folder picker. BUNDLED_PATCHES covers the 44 built-in patches.
   - What's unclear: Whether the batch should also include the currently-active patch if it's custom.
   - Recommendation: For v1, batch renders ONLY the 44 bundled patches. Custom patch support can be added later. This simplifies the implementation and the 44-patch batch is the stated requirement.

2. **Should output filenames include the map name?**
   - What we know: Output files go to a user-chosen directory. Multiple maps may be batch-rendered over time.
   - What's unclear: Whether filenames should be `PatchName.png` or `MapName_PatchName.png`.
   - Recommendation: Use `PatchName.png` only. If the user wants per-map folders, they pick different output directories. This keeps filenames clean and avoids issues with untitled maps.

3. **Should there be a cancel button during batch render?**
   - What we know: 44 patches at ~1-3 seconds each = 45-130 seconds total.
   - What's unclear: Whether the user might want to abort mid-batch.
   - Recommendation: Yes, include an AbortController-based cancel mechanism. The progress dialog should have a Cancel button that stops after the current patch completes (not mid-render).

4. **Background color for transparent tiles (DEFAULT_TILE = 280)?**
   - What we know: The live editor renders tile 280 as transparent (CSS background shows through). Export to PNG would show these as transparent pixels.
   - What's unclear: Whether exported PNGs should have a solid background or transparency.
   - Recommendation: Export with transparency (transparent PNG). This is the most flexible -- users can composite onto any background. The map's "void" areas are genuinely empty space.

## Sources

### Primary (HIGH confidence)
- `src/core/canvas/CanvasEngine.ts` - Full rendering logic, tile rendering method, off-screen buffer pattern
- `src/components/TilesetPanel/TilesetPanel.tsx` - BUNDLED_PATCHES array (44 patches), patch loading pattern
- `src/App.tsx` - handleSelectBundledPatch method (lines 162-197), image loading pattern
- `electron/main.ts` - All IPC handlers, dialog implementations, file:write handler
- `electron/preload.ts` - ElectronAPI interface, all exposed IPC channels
- `src/vite-env.d.ts` - ElectronAPI TypeScript interface
- `src/core/map/types.ts` - MAP_WIDTH=256, MAP_HEIGHT=256, TILE_SIZE=16, ANIMATED_FLAG=0x8000
- `src/core/map/AnimationDefinitions.ts` - All 256 animation definitions with frame data
- `src/adapters/electron/ElectronFileService.ts` - Base64 encoding pattern for IPC

### Secondary (MEDIUM confidence)
- Phase 5/6 prior decisions (from additional_context) - Established patterns for export:writePng, outputDir persistence, self-contained export renderer

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, no new dependencies needed
- Architecture: HIGH - Patterns derived directly from existing CanvasEngine and App.tsx code
- Pitfalls: HIGH - Based on well-understood Canvas 2D memory characteristics and Electron IPC patterns
- IPC infrastructure: HIGH - file:write and dialog patterns already exist, only dialog:selectDirectory is new

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable domain, all patterns from existing codebase)
