/**
 * Minimap - Overview map with click-to-navigate
 * Shows 256x256 map at 0.5px per tile (128x128 canvas)
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '@core/map';
import './Minimap.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const MINIMAP_SIZE = 128;
const SCALE = MINIMAP_SIZE / MAP_WIDTH; // 0.5 pixels per tile
const TILES_PER_ROW = 40;


export const Minimap: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tileColorCacheRef = useRef<Uint8Array | null>(null);
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

    // Create one-time temporary canvas for color sampling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const totalTiles = Math.floor(tilesetImage.height / TILE_SIZE) * TILES_PER_ROW;
    const colorCache = new Uint8Array(totalTiles * 3);

    // Sample center pixel of each tile
    for (let tileId = 0; tileId < totalTiles; tileId++) {
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE + 8;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE + 8;

      tempCtx.drawImage(tilesetImage, srcX, srcY, 1, 1, 0, 0, 1, 1);
      const pixel = tempCtx.getImageData(0, 0, 1, 1).data;

      const offset = tileId * 3;
      colorCache[offset] = pixel[0];     // R
      colorCache[offset + 1] = pixel[1]; // G
      colorCache[offset + 2] = pixel[2]; // B
    }

    tileColorCacheRef.current = colorCache;
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
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw tiles as colored pixels
    const imageData = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);
    const data = imageData.data;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = map.tiles[y * MAP_WIDTH + x];

        // Get pixel position (2x2 area for each tile at 0.5 scale)
        // For 256 tiles in 128 pixels, each tile gets 0.5 pixels
        // We'll sample every 2nd tile for simplicity
        if (x % 2 === 0 && y % 2 === 0) {
          const px = Math.floor(x / 2);
          const py = Math.floor(y / 2);

          // Parse color
          let r = 26, g = 26, b = 46; // Default dark

          const isAnimated = (tileId & 0x8000) !== 0;
          if (isAnimated) {
            r = 90; g = 90; b = 142;
          } else if (tileId === 280) {
            r = 26; g = 26; b = 46;
          } else if (tileId < 250) {
            // Walls - lighter
            r = 74; g = 74; b = 110;
          } else if (tileId >= 4000) {
            // Special tiles
            r = 138; g = 138; b = 190;
          } else if (tileColorCacheRef.current) {
            // Look up color from cache
            const totalTilesInCache = tileColorCacheRef.current.length / 3;
            if (tileId < totalTilesInCache) {
              const offset = tileId * 3;
              r = tileColorCacheRef.current[offset];
              g = tileColorCacheRef.current[offset + 1];
              b = tileColorCacheRef.current[offset + 2];
            }
          } else {
            // Fallback color based on tile ID
            const hue = (tileId * 7) % 360;
            const h = hue / 360;
            const s = 0.4;
            const l = 0.35;

            // HSL to RGB conversion
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x2 = c * (1 - Math.abs((h * 6) % 2 - 1));
            const m = l - c / 2;

            let r1 = 0, g1 = 0, b1 = 0;
            const hSector = Math.floor(h * 6);
            switch (hSector % 6) {
              case 0: r1 = c; g1 = x2; b1 = 0; break;
              case 1: r1 = x2; g1 = c; b1 = 0; break;
              case 2: r1 = 0; g1 = c; b1 = x2; break;
              case 3: r1 = 0; g1 = x2; b1 = c; break;
              case 4: r1 = x2; g1 = 0; b1 = c; break;
              case 5: r1 = c; g1 = 0; b1 = x2; break;
            }

            r = Math.round((r1 + m) * 255);
            g = Math.round((g1 + m) * 255);
            b = Math.round((b1 + m) * 255);
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
  }, [map, viewport, getViewportRect, tilesetImage]);

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

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
