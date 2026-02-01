/**
 * TilePalette component - Tile and wall type selection
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, ToolType } from '@core/map';
import { WALL_TYPE_NAMES } from '@core/map/WallSystem';
import './TilePalette.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40;
const VISIBLE_ROWS = 12;
const PALETTE_WIDTH = TILES_PER_ROW * TILE_SIZE; // 640px

export const TilePalette: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const {
    selectedTile,
    setSelectedTile,
    currentTool,
    wallType,
    setWallType
  } = useEditorStore();

  // Calculate total rows based on tileset height
  const totalRows = tilesetImage
    ? Math.ceil(tilesetImage.height / TILE_SIZE)
    : 100;

  // Draw the palette
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (tilesetImage) {
      // Draw visible portion of tileset
      const srcY = scrollOffset * TILE_SIZE;
      const srcHeight = Math.min(VISIBLE_ROWS * TILE_SIZE, tilesetImage.height - srcY);

      ctx.drawImage(
        tilesetImage,
        0, srcY, PALETTE_WIDTH, srcHeight,
        0, 0, PALETTE_WIDTH, srcHeight
      );
    } else {
      // Draw placeholder grid
      for (let row = 0; row < VISIBLE_ROWS; row++) {
        for (let col = 0; col < TILES_PER_ROW; col++) {
          const tileId = (scrollOffset + row) * TILES_PER_ROW + col;
          ctx.fillStyle = `hsl(${(tileId * 7) % 360}, 50%, 30%)`;
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }

    // Draw selection highlight
    const selectedRow = Math.floor(selectedTile / TILES_PER_ROW);
    const selectedCol = selectedTile % TILES_PER_ROW;
    const visibleRow = selectedRow - scrollOffset;

    if (visibleRow >= 0 && visibleRow < VISIBLE_ROWS) {
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selectedCol * TILE_SIZE + 1,
        visibleRow * TILE_SIZE + 1,
        TILE_SIZE - 2,
        TILE_SIZE - 2
      );
    }
  }, [tilesetImage, scrollOffset, selectedTile]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = PALETTE_WIDTH;
      canvas.height = VISIBLE_ROWS * TILE_SIZE;
    }
  }, []);

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle tile click
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE) + scrollOffset;
    const tileId = row * TILES_PER_ROW + col;

    setSelectedTile(tileId);
  };

  // Handle scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setScrollOffset((prev) =>
      Math.max(0, Math.min(totalRows - VISIBLE_ROWS, prev + delta))
    );
  };

  return (
    <div className="tile-palette">
      <div className="palette-header">Tiles</div>

      <canvas
        ref={canvasRef}
        className="palette-canvas"
        onClick={handleClick}
        onWheel={handleWheel}
      />

      <div className="palette-info">
        Selected: {selectedTile}
      </div>

      {currentTool === ToolType.WALL && (
        <div className="wall-selector">
          <div className="palette-header">Wall Type</div>
          <select
            value={wallType}
            onChange={(e) => setWallType(parseInt(e.target.value))}
            className="wall-select"
          >
            {WALL_TYPE_NAMES.map((name, index) => (
              <option key={index} value={index}>
                {index}: {name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
