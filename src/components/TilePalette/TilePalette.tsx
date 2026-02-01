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

interface DragState {
  active: boolean;
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

export const TilePalette: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [dragState, setDragState] = useState<DragState>({
    active: false,
    startCol: 0,
    startRow: 0,
    endCol: 0,
    endRow: 0
  });

  const {
    selectedTile,
    tileSelection,
    setTileSelection,
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

    // Draw selection highlight (supports multi-tile selection)
    const selection = dragState.active ? {
      startCol: Math.min(dragState.startCol, dragState.endCol),
      startRow: Math.min(dragState.startRow, dragState.endRow),
      width: Math.abs(dragState.endCol - dragState.startCol) + 1,
      height: Math.abs(dragState.endRow - dragState.startRow) + 1
    } : tileSelection;

    const visibleStartRow = selection.startRow - scrollOffset;
    const visibleEndRow = selection.startRow + selection.height - 1 - scrollOffset;

    // Check if selection is visible
    if (visibleEndRow >= 0 && visibleStartRow < VISIBLE_ROWS) {
      const drawStartRow = Math.max(0, visibleStartRow);
      const drawEndRow = Math.min(VISIBLE_ROWS - 1, visibleEndRow);

      ctx.strokeStyle = dragState.active ? '#0ff' : '#ff0';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selection.startCol * TILE_SIZE + 1,
        drawStartRow * TILE_SIZE + 1,
        selection.width * TILE_SIZE - 2,
        (drawEndRow - drawStartRow + 1) * TILE_SIZE - 2
      );

      // Show selection size if multi-tile
      if (selection.width > 1 || selection.height > 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          selection.startCol * TILE_SIZE,
          drawStartRow * TILE_SIZE,
          40,
          16
        );
        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${selection.width}x${selection.height}`, selection.startCol * TILE_SIZE + 2, drawStartRow * TILE_SIZE + 2);
      }
    }
  }, [tilesetImage, scrollOffset, tileSelection, dragState]);

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

  // Handle mouse down - start selection
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE) + scrollOffset;

    setDragState({
      active: true,
      startCol: col,
      startRow: row,
      endCol: col,
      endRow: row
    });
  };

  // Handle mouse move - update selection
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.max(0, Math.min(TILES_PER_ROW - 1, Math.floor(x / TILE_SIZE)));
    const row = Math.floor(y / TILE_SIZE) + scrollOffset;

    setDragState(prev => ({
      ...prev,
      endCol: col,
      endRow: Math.max(0, row)
    }));
  };

  // Handle mouse up - finalize selection
  const handleMouseUp = () => {
    if (!dragState.active) return;

    const startCol = Math.min(dragState.startCol, dragState.endCol);
    const startRow = Math.min(dragState.startRow, dragState.endRow);
    const width = Math.abs(dragState.endCol - dragState.startCol) + 1;
    const height = Math.abs(dragState.endRow - dragState.startRow) + 1;

    setTileSelection({ startCol, startRow, width, height });
    setDragState(prev => ({ ...prev, active: false }));
  };

  // Handle mouse leave - cancel or finalize
  const handleMouseLeave = () => {
    if (dragState.active) {
      handleMouseUp();
    }
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      <div className="palette-info">
        {tileSelection.width === 1 && tileSelection.height === 1
          ? `Tile: ${selectedTile}`
          : `Selection: ${tileSelection.width}x${tileSelection.height} (${selectedTile})`}
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
