/**
 * Self-contained batch renderer for exporting map PNGs across all bundled patches.
 *
 * This module is intentionally isolated from CanvasEngine, React, and Zustand.
 * It takes raw map tile data in and produces PNG files via IPC.
 *
 * Architecture:
 * - One reusable 4096x4096 off-screen canvas (cleared between patches)
 * - Sequential rendering (one patch at a time) to control memory
 * - Yields to event loop between patches for UI responsiveness
 * - AbortSignal support for user cancellation
 */

import { BUNDLED_PATCHES } from '@core/patches';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '@core/map';
import { ANIMATION_DEFINITIONS } from '@core/map/AnimationDefinitions';

const TILES_PER_ROW = 40;
const DEFAULT_TILE = 280;

// ── Public types ────────────────────────────────────────────────────

export interface BatchRenderProgress {
  current: number;      // 0-based index of patch being rendered
  total: number;        // total number of patches
  patchName: string;    // name of current patch
}

export interface BatchRenderResult {
  rendered: number;
  failed: number;
  total: number;
  errors: string[];     // patch names that failed
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Load a bundled patch tileset image by name.
 */
function loadPatchTileset(patchName: string): Promise<HTMLImageElement> {
  const patchBase = `./assets/patches/${encodeURIComponent(patchName)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tileset for patch: ${patchName}`));
    img.src = `${patchBase}/imgTiles.png`;
  });
}

/**
 * Render a single tile at native 16x16 size for export.
 * Handles animated tiles by resolving to frame 0.
 * Skips DEFAULT_TILE (280) to preserve transparency.
 */
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
    } else {
      // Unknown animated tile -- fill with fallback color
      ctx.fillStyle = '#4a4a6a';
      ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
    }
  } else {
    if (tile === DEFAULT_TILE) return; // Transparent -- skip
    const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImg, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
  }
}

/**
 * Convert canvas to PNG blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

/**
 * Write a PNG blob to disk via Electron IPC.
 * Converts blob to base64 using the same pattern as ElectronFileService.
 */
async function writePngToFile(blob: Blob, outputDir: string, patchName: string): Promise<void> {
  // Sanitize filename
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

  const result = await window.electronAPI.writeFile(filePath, base64);
  if (!result.success) {
    throw new Error(result.error || 'Write failed');
  }
}

// ── Main batch function ─────────────────────────────────────────────

/**
 * Sequentially render the given map with every bundled patch to PNG files.
 *
 * @param mapTiles - Flat Uint16Array of 65536 tile values (256x256 map)
 * @param outputDir - Absolute path to output directory (from directory picker)
 * @param onProgress - Called before each patch render with progress info
 * @param signal - Optional AbortSignal for cancellation
 * @returns Summary of rendered/failed counts and error list
 */
export async function executeBatchRender(
  mapTiles: Uint16Array,
  outputDir: string,
  onProgress: (progress: BatchRenderProgress) => void,
  signal?: AbortSignal
): Promise<BatchRenderResult> {
  const total = BUNDLED_PATCHES.length;
  let rendered = 0;
  let failed = 0;
  const errors: string[] = [];

  // Create ONE reusable off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH * TILE_SIZE;   // 4096
  canvas.height = MAP_HEIGHT * TILE_SIZE; // 4096
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < total; i++) {
    // Check for cancellation
    if (signal?.aborted) break;

    const patchName = BUNDLED_PATCHES[i];
    onProgress({ current: i, total, patchName });

    // Yield to event loop so React can paint progress update
    await new Promise<void>(r => setTimeout(r, 0));

    try {
      // Load tileset for this patch
      const tilesetImg = await loadPatchTileset(patchName);

      // Clear canvas for this render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render all 65536 tiles
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = mapTiles[y * MAP_WIDTH + x];
          renderExportTile(ctx, tilesetImg, tile, x * TILE_SIZE, y * TILE_SIZE);
        }
      }

      // Export to PNG blob (memory-efficient vs toDataURL)
      const blob = await canvasToBlob(canvas);

      // Write PNG to output directory
      await writePngToFile(blob, outputDir, patchName);

      // Cleanup tileset image to release decoded pixels
      tilesetImg.src = '';

      rendered++;
    } catch (err) {
      errors.push(patchName);
      failed++;
    }
  }

  // Cleanup reusable canvas (help GC)
  canvas.width = 0;
  canvas.height = 0;

  return { rendered, failed, total, errors };
}
