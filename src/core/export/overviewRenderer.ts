/**
 * Overview Renderer — produces a single overview PNG canvas from map tile data.
 *
 * Self-contained renderer with configurable background and crop bounds.
 * Uses the same tile rendering logic as CanvasEngine (animation resolution,
 * tile 280 skip, frame 0 for animations).
 */

import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, ANIMATED_FLAG } from '@core/map';
import { ANIMATION_DEFINITIONS } from '@core/map/AnimationDefinitions';
import type { Bounds } from '@core/smart-crop';

const TILES_PER_ROW = 40; // Tileset is 640px wide
const FULL_MAP_PX = MAP_WIDTH * TILE_SIZE; // 4096

// ---- Background Mode Types ----

export type BackgroundMode =
  | { type: 'farplane'; image: HTMLImageElement }
  | { type: 'transparent' }
  | { type: 'classic' }        // SEdit magenta #FF00FF
  | { type: 'color'; color: string }
  | { type: 'image'; image: HTMLImageElement };

// ---- Render Function ----

/**
 * Render an overview of the map to an off-screen canvas.
 *
 * @param tiles       - The 65536-entry tile array (Uint16Array)
 * @param tilesetImage - The active tileset spritesheet
 * @param bounds      - Crop bounds in tile coordinates, or null for full 256x256
 * @param background  - Background fill mode
 * @returns           - Off-screen canvas with the rendered overview
 */
export function renderOverview(
  tiles: Uint16Array,
  tilesetImage: HTMLImageElement,
  bounds: Bounds | null,
  background: BackgroundMode,
): HTMLCanvasElement {
  // Determine pixel region
  const minTX = bounds ? bounds.minX : 0;
  const minTY = bounds ? bounds.minY : 0;
  const maxTX = bounds ? bounds.maxX : MAP_WIDTH - 1;
  const maxTY = bounds ? bounds.maxY : MAP_HEIGHT - 1;

  const tileW = maxTX - minTX + 1;
  const tileH = maxTY - minTY + 1;
  const pxW = tileW * TILE_SIZE;
  const pxH = tileH * TILE_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d')!;

  // ---- Draw background ----
  drawBackground(ctx, pxW, pxH, minTX, minTY, background);

  // ---- Draw tiles ----
  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      const tile = tiles[ty * MAP_WIDTH + tx];
      const destX = (tx - minTX) * TILE_SIZE;
      const destY = (ty - minTY) * TILE_SIZE;
      renderTile(ctx, tilesetImage, tile, destX, destY);
    }
  }

  return canvas;
}

// ---- Background Drawing ----

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetTX: number,
  offsetTY: number,
  bg: BackgroundMode,
): void {
  switch (bg.type) {
    case 'transparent':
      // Canvas default is transparent — nothing to do
      break;

    case 'classic':
      ctx.fillStyle = '#FF00FF';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'color':
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, width, height);
      break;

    case 'farplane': {
      // Scale farplane to full 4096x4096, then copy the bounded region
      drawScaledImageRegion(ctx, bg.image, width, height, offsetTX, offsetTY);
      break;
    }

    case 'image': {
      // Scale custom image to fill the export canvas directly
      ctx.drawImage(bg.image, 0, 0, width, height);
      break;
    }
  }
}

/**
 * Scale an image to 4096x4096 and copy the region corresponding to the crop bounds.
 * Uses an intermediate canvas to scale first, then copies the needed region.
 */
function drawScaledImageRegion(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  destW: number,
  destH: number,
  offsetTX: number,
  offsetTY: number,
): void {
  // Source pixel offsets into the scaled-to-4096 image
  const srcX = offsetTX * TILE_SIZE;
  const srcY = offsetTY * TILE_SIZE;

  // Scale factors from image to 4096x4096
  const scaleX = image.naturalWidth / FULL_MAP_PX;
  const scaleY = image.naturalHeight / FULL_MAP_PX;

  // Map crop region back to original image coordinates
  const imgSrcX = srcX * scaleX;
  const imgSrcY = srcY * scaleY;
  const imgSrcW = destW * scaleX;
  const imgSrcH = destH * scaleY;

  ctx.drawImage(image, imgSrcX, imgSrcY, imgSrcW, imgSrcH, 0, 0, destW, destH);
}

// ---- Tile Rendering ----

/**
 * Render a single tile — mirrors CanvasEngine.renderTile logic.
 * Always uses frame 0 for animations (static export).
 * Skips tile 280 (transparent/void).
 */
function renderTile(
  ctx: CanvasRenderingContext2D,
  tilesetImage: HTMLImageElement,
  tile: number,
  destX: number,
  destY: number,
): void {
  const isAnimated = (tile & ANIMATED_FLAG) !== 0;

  if (isAnimated) {
    const animId = tile & 0xFF;
    const anim = ANIMATION_DEFINITIONS[animId];
    if (anim && anim.frames.length > 0) {
      // Use frame 0 for static export
      const displayTile = anim.frames[0];
      const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
    }
  } else {
    // Skip tile 280 (transparent/void)
    if (tile === 280) return;

    const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, TILE_SIZE, TILE_SIZE);
  }
}
