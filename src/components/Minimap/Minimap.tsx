/**
 * Minimap - Overview map with click-to-navigate
 * Shows 256x256 map at 0.5px per tile (128x128 canvas)
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  DEFAULT_TILE,
  wallSystem,
  getAnimationById,
  WARP_ANIM_IDS,
  FLAG_POLE_IDS,
  SWITCH_ANIM_ID,
  NEUTRAL_FLAG_ANIM_ID,
  POWERUP_TILES
} from '@core/map';
import './Minimap.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const MINIMAP_SIZE = 128;
const SCALE = MINIMAP_SIZE / MAP_WIDTH; // 0.5 pixels per tile
const TILES_PER_ROW = 40;
const DEBOUNCE_DELAY = 150; // ms - debounce map tile redraws


export const Minimap: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tileColorCacheRef = useRef<Uint8Array | null>(null);
  const specialColorMapRef = useRef<Map<number, [number, number, number]> | null>(null);
  const animColorCacheRef = useRef<Uint8Array | null>(null);
  const lastTilesetRef = useRef<HTMLImageElement | null>(null);

  const { map, viewport } = useEditorStore(
    useShallow((state) => ({
      map: state.map,
      viewport: state.viewport
    }))
  );
  const setViewport = useEditorStore((state) => state.setViewport);

  // Build tile color cache when tileset loads
  useEffect(() => {
    if (!tilesetImage || lastTilesetRef.current === tilesetImage) return;

    // Create one-time temporary canvas for color sampling (16x16 to sample all pixels)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = TILE_SIZE;
    tempCanvas.height = TILE_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const totalTiles = Math.floor(tilesetImage.height / TILE_SIZE) * TILES_PER_ROW;
    const colorCache = new Uint8Array(totalTiles * 3);

    // Sample all 256 pixels of each tile and compute average color
    for (let tileId = 0; tileId < totalTiles; tileId++) {
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

      // Clear canvas before drawing to avoid bleed
      tempCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
      tempCtx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
      const imageData = tempCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
      const pixels = imageData.data;

      // Average all 256 pixels
      let rSum = 0, gSum = 0, bSum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        rSum += pixels[i];
        gSum += pixels[i + 1];
        bSum += pixels[i + 2];
      }

      const pixelCount = TILE_SIZE * TILE_SIZE;
      const offset = tileId * 3;
      colorCache[offset] = Math.round(rSum / pixelCount);     // R
      colorCache[offset + 1] = Math.round(gSum / pixelCount); // G
      colorCache[offset + 2] = Math.round(bSum / pixelCount); // B
    }

    tileColorCacheRef.current = colorCache;

    // Build special static tile color overrides
    const specialColors = new Map<number, [number, number, number]>();

    // Empty space tile
    specialColors.set(DEFAULT_TILE, [26, 26, 46]);

    // Wall tiles - iterate all wall tile IDs
    for (let tileId = 0; tileId < totalTiles; tileId++) {
      if (wallSystem.isWallTile(tileId)) {
        specialColors.set(tileId, [90, 100, 140]);
      }
    }

    // Powerup tiles
    for (const tileId of POWERUP_TILES) {
      specialColors.set(tileId, [255, 220, 50]);
    }

    specialColorMapRef.current = specialColors;

    // Build animated tile color cache (256 animation IDs)
    const animCache = new Uint8Array(256 * 3);

    for (let animId = 0; animId < 256; animId++) {
      const anim = getAnimationById(animId);
      const offset = animId * 3;

      // Default fallback color
      let r = 90, g = 90, b = 142;

      // If animation exists and has frames, use frame 0's averaged color
      if (anim && anim.frames.length > 0) {
        const frame0TileId = anim.frames[0];
        if (frame0TileId < totalTiles) {
          const frame0Offset = frame0TileId * 3;
          r = colorCache[frame0Offset];
          g = colorCache[frame0Offset + 1];
          b = colorCache[frame0Offset + 2];
        }
      }

      animCache[offset] = r;
      animCache[offset + 1] = g;
      animCache[offset + 2] = b;
    }

    // Apply hardcoded animated special tile color overrides
    // Warps - bright green
    for (const warpId of WARP_ANIM_IDS) {
      const offset = warpId * 3;
      animCache[offset] = 80;
      animCache[offset + 1] = 220;
      animCache[offset + 2] = 80;
    }

    // Flag poles by team
    // Team 0 - Green
    for (const flagId of FLAG_POLE_IDS[0]) {
      const offset = flagId * 3;
      animCache[offset] = 0;
      animCache[offset + 1] = 200;
      animCache[offset + 2] = 0;
    }

    // Team 1 - Red
    for (const flagId of FLAG_POLE_IDS[1]) {
      const offset = flagId * 3;
      animCache[offset] = 220;
      animCache[offset + 1] = 50;
      animCache[offset + 2] = 50;
    }

    // Team 2 - Blue
    for (const flagId of FLAG_POLE_IDS[2]) {
      const offset = flagId * 3;
      animCache[offset] = 50;
      animCache[offset + 1] = 100;
      animCache[offset + 2] = 220;
    }

    // Team 3 - Yellow
    for (const flagId of FLAG_POLE_IDS[3]) {
      const offset = flagId * 3;
      animCache[offset] = 220;
      animCache[offset + 1] = 220;
      animCache[offset + 2] = 50;
    }

    // Switch - gold
    const switchOffset = SWITCH_ANIM_ID * 3;
    animCache[switchOffset] = 220;
    animCache[switchOffset + 1] = 180;
    animCache[switchOffset + 2] = 100;

    // Neutral flag - light gray
    const neutralOffset = NEUTRAL_FLAG_ANIM_ID * 3;
    animCache[neutralOffset] = 200;
    animCache[neutralOffset + 1] = 200;
    animCache[neutralOffset + 2] = 200;

    animColorCacheRef.current = animCache;
    lastTilesetRef.current = tilesetImage;
  }, [tilesetImage]);

  // Calculate viewport rectangle
  const getViewportRect = useCallback(() => {
    const visibleTilesX = window.innerWidth / (TILE_SIZE * viewport.zoom);
    const visibleTilesY = (window.innerHeight - 100) / (TILE_SIZE * viewport.zoom);

    return {
      x: viewport.x * SCALE,
      y: viewport.y * SCALE,
      width: Math.min(visibleTilesX, MAP_WIDTH - viewport.x) * SCALE,
      height: Math.min(visibleTilesY, MAP_HEIGHT - viewport.y) * SCALE
    };
  }, [viewport]);

  // Draw minimap
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !map) return;

    // Clear
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw tiles as colored pixels
    const imageData = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);
    const data = imageData.data;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileValue = map.tiles[y * MAP_WIDTH + x];

        // Get pixel position (2x2 area for each tile at 0.5 scale)
        // For 256 tiles in 128 pixels, each tile gets 0.5 pixels
        // We'll sample every 2nd tile for simplicity
        if (x % 2 === 0 && y % 2 === 0) {
          const px = Math.floor(x / 2);
          const py = Math.floor(y / 2);

          // Default: empty space color
          let r = 26, g = 26, b = 46;

          if ((tileValue & 0x8000) !== 0) {
            // Animated tile - look up from animated color cache
            const animId = tileValue & 0xFF;
            if (animColorCacheRef.current) {
              const offset = animId * 3;
              r = animColorCacheRef.current[offset];
              g = animColorCacheRef.current[offset + 1];
              b = animColorCacheRef.current[offset + 2];
            }
          } else {
            // Static tile - check special overrides first, then average cache
            const specialColor = specialColorMapRef.current?.get(tileValue);
            if (specialColor) {
              r = specialColor[0];
              g = specialColor[1];
              b = specialColor[2];
            } else if (tileColorCacheRef.current) {
              const totalTilesInCache = tileColorCacheRef.current.length / 3;
              if (tileValue < totalTilesInCache) {
                const offset = tileValue * 3;
                r = tileColorCacheRef.current[offset];
                g = tileColorCacheRef.current[offset + 1];
                b = tileColorCacheRef.current[offset + 2];
              }
            }
          }

          const idx = (py * MINIMAP_SIZE + px) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw viewport rectangle
    const vp = getViewportRect();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.floor(vp.x) + 0.5,
      Math.floor(vp.y) + 0.5,
      Math.max(4, vp.width),
      Math.max(4, vp.height)
    );
  }, [map, viewport, getViewportRect]);

  // Debounced map redraw - batches rapid tile edits
  useEffect(() => {
    const timerId = setTimeout(() => {
      draw();
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timerId);
  }, [map, draw]);

  // Immediate viewport redraw - no debounce for responsive panning/zooming
  useEffect(() => {
    draw();
  }, [viewport, draw]);

  // Initial draw when cache finishes building
  useEffect(() => {
    if (tileColorCacheRef.current && map) {
      draw();
    }
  }, [tilesetImage, draw, map]);

  // Handle click to navigate
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap coords to map coords, centering viewport on click
    const vp = getViewportRect();
    const newX = (x / SCALE) - (vp.width / SCALE / 2);
    const newY = (y / SCALE) - (vp.height / SCALE / 2);

    setViewport({
      x: Math.max(0, Math.min(MAP_WIDTH - 10, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT - 10, newY))
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleClick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (!map) return null;

  return (
    <div className="minimap">
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="minimap-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};
