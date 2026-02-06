/**
 * TilePalette component - Tile and wall type selection
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { TILE_SIZE, ToolType } from '@core/map';
import { WALL_TYPE_NAMES } from '@core/map/WallSystem';
import './TilePalette.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  compact?: boolean;
  showRowLabels?: boolean;
  fullHeight?: boolean;
}

const TILES_PER_ROW = 40;
const VISIBLE_ROWS = 12;
const VISIBLE_ROWS_COMPACT = 8;
const PALETTE_WIDTH = TILES_PER_ROW * TILE_SIZE; // 640px
const ROW_LABEL_WIDTH = 24;

interface DragState {
  active: boolean;
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

export const TilePalette: React.FC<Props> = ({ tilesetImage, compact = false, showRowLabels = false, fullHeight = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleRows = compact ? VISIBLE_ROWS_COMPACT : VISIBLE_ROWS;
  const [dragState, setDragState] = useState<DragState>({
    active: false,
    startCol: 0,
    startRow: 0,
    endCol: 0,
    endRow: 0
  });

  const { selectedTile, tileSelection, currentTool, wallType } = useEditorStore(
    useShallow((state) => ({
      selectedTile: state.selectedTile,
      tileSelection: state.tileSelection,
      currentTool: state.currentTool,
      wallType: state.wallType
    }))
  );
  const setTileSelection = useEditorStore((state) => state.setTileSelection);
  const setWallType = useEditorStore((state) => state.setWallType);

  // Calculate total rows based on tileset height
  const totalRows = tilesetImage
    ? Math.ceil(tilesetImage.height / TILE_SIZE)
    : 100;

  // Use full height when fullHeight prop is true
  const effectiveVisibleRows = fullHeight ? totalRows : visibleRows;

  // Draw the palette
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;

    // Draw row labels if enabled
    if (showRowLabels) {
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(0, 0, ROW_LABEL_WIDTH, canvas.height);

      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#666';

      for (let row = 0; row < effectiveVisibleRows; row++) {
        const rowIndex = scrollOffset + row;
        const hexLabel = rowIndex.toString(16).toUpperCase().padStart(2, '0');
        ctx.fillText(hexLabel, ROW_LABEL_WIDTH / 2, row * TILE_SIZE + TILE_SIZE / 2);
      }
    }

    if (tilesetImage) {
      // Draw visible portion of tileset
      const srcY = scrollOffset * TILE_SIZE;
      const srcHeight = Math.min(effectiveVisibleRows * TILE_SIZE, tilesetImage.height - srcY);
      const drawWidth = Math.min(PALETTE_WIDTH, canvas.width - offsetX);

      ctx.drawImage(
        tilesetImage,
        0, srcY, drawWidth, srcHeight,
        offsetX, 0, drawWidth, srcHeight
      );
    } else {
      // Draw placeholder grid
      for (let row = 0; row < effectiveVisibleRows; row++) {
        for (let col = 0; col < TILES_PER_ROW; col++) {
          const tileId = (scrollOffset + row) * TILES_PER_ROW + col;
          ctx.fillStyle = `hsl(${(tileId * 7) % 360}, 50%, 30%)`;
          ctx.fillRect(offsetX + col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
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
    if (visibleEndRow >= 0 && visibleStartRow < effectiveVisibleRows) {
      const drawStartRow = Math.max(0, visibleStartRow);
      const drawEndRow = Math.min(effectiveVisibleRows - 1, visibleEndRow);

      ctx.strokeStyle = dragState.active ? '#0ff' : '#ff0';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        offsetX + selection.startCol * TILE_SIZE + 1,
        drawStartRow * TILE_SIZE + 1,
        selection.width * TILE_SIZE - 2,
        (drawEndRow - drawStartRow + 1) * TILE_SIZE - 2
      );

      // Show selection size if multi-tile
      if (selection.width > 1 || selection.height > 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          offsetX + selection.startCol * TILE_SIZE,
          drawStartRow * TILE_SIZE,
          40,
          16
        );
        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${selection.width}x${selection.height}`, offsetX + selection.startCol * TILE_SIZE + 2, drawStartRow * TILE_SIZE + 2);
      }
    }
  }, [tilesetImage, scrollOffset, tileSelection, dragState, showRowLabels, effectiveVisibleRows]);

  // Resize canvas based on container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;
      canvas.width = compact ? container.clientWidth : PALETTE_WIDTH + offsetX;
      canvas.height = fullHeight && tilesetImage ? tilesetImage.height : visibleRows * TILE_SIZE;
      draw();
    });

    resizeObserver.observe(container);

    // Initial size
    const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;
    canvas.width = compact ? container.clientWidth : PALETTE_WIDTH + offsetX;
    canvas.height = fullHeight && tilesetImage ? tilesetImage.height : visibleRows * TILE_SIZE;

    return () => resizeObserver.disconnect();
  }, [compact, showRowLabels, visibleRows, fullHeight, tilesetImage, draw]);

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse down - start selection
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || e.button !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;
    const x = e.clientX - rect.left - offsetX;
    const y = e.clientY - rect.top;

    // Ignore clicks on row label area
    if (x < 0) return;

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
    const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;
    const x = e.clientX - rect.left - offsetX;
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
    // No scrolling when fullHeight is enabled
    if (fullHeight) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setScrollOffset((prev) =>
      Math.max(0, Math.min(totalRows - visibleRows, prev + delta))
    );
  };

  return (
    <div className={`tile-palette ${compact ? 'compact' : ''}`}>
      <div className="palette-header">Tiles</div>

      <div ref={containerRef} className="palette-canvas-container">
        <canvas
          ref={canvasRef}
          className="palette-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
      </div>

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
