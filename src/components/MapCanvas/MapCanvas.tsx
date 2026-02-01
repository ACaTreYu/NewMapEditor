/**
 * MapCanvas component - Renders the tile map on a canvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, ToolType } from '@core/map';
import './MapCanvas.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40; // Tileset is 640 pixels wide (40 tiles)

// Line drawing state
interface LineState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const MapCanvas: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [lineState, setLineState] = useState<LineState>({
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  });
  const [cursorTile, setCursorTile] = useState({ x: -1, y: -1 });
  const [scrollDrag, setScrollDrag] = useState<{ axis: 'h' | 'v'; startPos: number; startViewport: number } | null>(null);

  const {
    map,
    viewport,
    showGrid,
    currentTool,
    selectedTile,
    tileSelection,
    animations,
    animationFrame,
    setTile,
    setTiles,
    placeWall,
    eraseTile,
    fillArea,
    setSelectedTile,
    restorePreviousTool,
    setViewport,
    pushUndo
  } = useEditorStore();

  // Calculate visible area
  const getVisibleTiles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { startX: 0, startY: 0, endX: 20, endY: 20 };

    const tilePixels = TILE_SIZE * viewport.zoom;
    const tilesX = Math.ceil(canvas.width / tilePixels) + 1;
    const tilesY = Math.ceil(canvas.height / tilePixels) + 1;

    return {
      startX: Math.floor(viewport.x),
      startY: Math.floor(viewport.y),
      endX: Math.min(MAP_WIDTH, Math.floor(viewport.x) + tilesX),
      endY: Math.min(MAP_HEIGHT, Math.floor(viewport.y) + tilesY)
    };
  }, [viewport]);

  // Convert tile coords to screen coords
  const tileToScreen = useCallback((tileX: number, tileY: number) => {
    const tilePixels = TILE_SIZE * viewport.zoom;
    return {
      x: (tileX - viewport.x) * tilePixels,
      y: (tileY - viewport.y) * tilePixels
    };
  }, [viewport]);

  // Get tiles along a line (Bresenham's algorithm)
  const getLineTiles = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const tiles: Array<{ x: number; y: number }> = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      tiles.push({ x, y });
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return tiles;
  }, []);

  // Draw the map
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !map) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tilePixels = TILE_SIZE * viewport.zoom;
    const { startX, startY, endX, endY } = getVisibleTiles();

    // Draw tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map.tiles[y * MAP_WIDTH + x];
        const screenX = (x - viewport.x) * tilePixels;
        const screenY = (y - viewport.y) * tilePixels;

        // Skip animated tiles for now (will render placeholder)
        const isAnimated = (tile & 0x8000) !== 0;

        if (tilesetImage && !isAnimated) {
          // Calculate source position in tileset
          const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
          const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;

          ctx.drawImage(
            tilesetImage,
            srcX, srcY, TILE_SIZE, TILE_SIZE,
            screenX, screenY, tilePixels, tilePixels
          );
        } else if (isAnimated) {
          // Render animated tile
          const animId = tile & 0xFF;
          const frameOffset = (tile >> 8) & 0x7F;

          if (animations && animations[animId] && tilesetImage) {
            const anim = animations[animId];
            const frameIdx = (animationFrame + frameOffset) % anim.frameCount;
            const displayTile = anim.frames[frameIdx] || 0;

            const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
            const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;

            ctx.drawImage(
              tilesetImage,
              srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, tilePixels, tilePixels
            );
          } else {
            // Placeholder if no animation data
            ctx.fillStyle = '#4a4a6a';
            ctx.fillRect(screenX, screenY, tilePixels, tilePixels);
            ctx.fillStyle = '#8a8aaa';
            ctx.font = `${tilePixels * 0.5}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('A', screenX + tilePixels / 2, screenY + tilePixels / 2);
          }
        } else {
          // No tileset - draw colored placeholder
          ctx.fillStyle = tile === 280 ? '#2a2a3e' : `hsl(${(tile * 7) % 360}, 50%, 40%)`;
          ctx.fillRect(screenX, screenY, tilePixels, tilePixels);
        }
      }
    }

    // Draw grid
    if (showGrid && viewport.zoom >= 0.5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let x = startX; x <= endX; x++) {
        const screenX = Math.floor((x - viewport.x) * tilePixels);
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
      }

      for (let y = startY; y <= endY; y++) {
        const screenY = Math.floor((y - viewport.y) * tilePixels);
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
      }
    }

    // Draw line preview for wall/line tools
    if (lineState.active && (currentTool === ToolType.WALL || currentTool === ToolType.LINE)) {
      const lineTiles = getLineTiles(
        lineState.startX, lineState.startY,
        lineState.endX, lineState.endY
      );

      // Highlight tiles along the line
      ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
      ctx.strokeStyle = 'rgba(0, 255, 128, 0.8)';
      ctx.lineWidth = 2;

      for (const tile of lineTiles) {
        const screen = tileToScreen(tile.x, tile.y);
        ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
        ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      }

      // Draw start marker
      const startScreen = tileToScreen(lineState.startX, lineState.startY);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.fillRect(startScreen.x, startScreen.y, tilePixels, tilePixels);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 3;
      ctx.strokeRect(startScreen.x + 2, startScreen.y + 2, tilePixels - 4, tilePixels - 4);

      // Draw line from center of start to center of end
      const endScreen = tileToScreen(lineState.endX, lineState.endY);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(startScreen.x + tilePixels / 2, startScreen.y + tilePixels / 2);
      ctx.lineTo(endScreen.x + tilePixels / 2, endScreen.y + tilePixels / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Show tile count
      const count = lineTiles.length;
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${count} tiles`, endScreen.x + tilePixels + 5, endScreen.y);
    }

    // Draw cursor highlight
    if (cursorTile.x >= 0 && cursorTile.y >= 0 && !lineState.active) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
    }
  }, [map, viewport, showGrid, tilesetImage, getVisibleTiles, lineState, currentTool, getLineTiles, tileToScreen, cursorTile, animations, animationFrame]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  // Redraw when state changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Convert screen coordinates to tile coordinates
  const screenToTile = useCallback((screenX: number, screenY: number) => {
    const tilePixels = TILE_SIZE * viewport.zoom;
    return {
      x: Math.floor(screenX / tilePixels + viewport.x),
      y: Math.floor(screenY / tilePixels + viewport.y)
    };
  }, [viewport]);

  // Calculate scroll bar metrics
  const getScrollMetrics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { thumbWidth: 10, thumbHeight: 10, thumbLeft: 0, thumbTop: 0 };

    const tilePixels = TILE_SIZE * viewport.zoom;
    const visibleTilesX = canvas.width / tilePixels;
    const visibleTilesY = canvas.height / tilePixels;

    return {
      thumbWidth: Math.max(20, (visibleTilesX / MAP_WIDTH) * 100),
      thumbHeight: Math.max(20, (visibleTilesY / MAP_HEIGHT) * 100),
      thumbLeft: (viewport.x / MAP_WIDTH) * 100,
      thumbTop: (viewport.y / MAP_HEIGHT) * 100
    };
  }, [viewport]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      // Middle click, right-click, or Alt+click - pan
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      // Left click - use tool
      if (currentTool === ToolType.WALL || currentTool === ToolType.LINE) {
        // Start line drawing
        setLineState({
          active: true,
          startX: x,
          startY: y,
          endX: x,
          endY: y
        });
      } else {
        pushUndo('Edit tiles');
        handleToolAction(x, y);
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    setCursorTile({ x, y });

    if (isDragging) {
      const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom);
      const dy = (e.clientY - lastMousePos.y) / (TILE_SIZE * viewport.zoom);
      setViewport({
        x: Math.max(0, Math.min(MAP_WIDTH - 10, viewport.x - dx)),
        y: Math.max(0, Math.min(MAP_HEIGHT - 10, viewport.y - dy))
      });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (lineState.active) {
      // Update line end position
      setLineState(prev => ({ ...prev, endX: x, endY: y }));
    } else if (e.buttons === 1 && !e.altKey) {
      // Drawing with left button held (non-line tools)
      if (currentTool !== ToolType.WALL && currentTool !== ToolType.LINE) {
        handleToolAction(x, y);
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = (_e: React.MouseEvent) => {
    if (lineState.active) {
      // Complete line drawing
      const lineTiles = getLineTiles(
        lineState.startX, lineState.startY,
        lineState.endX, lineState.endY
      );

      pushUndo('Draw line');

      for (const tile of lineTiles) {
        if (tile.x >= 0 && tile.x < MAP_WIDTH && tile.y >= 0 && tile.y < MAP_HEIGHT) {
          if (currentTool === ToolType.WALL) {
            placeWall(tile.x, tile.y);
          } else if (currentTool === ToolType.LINE) {
            setTile(tile.x, tile.y, selectedTile);
          }
        }
      }

      setLineState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }
    setIsDragging(false);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDragging(false);
    setCursorTile({ x: -1, y: -1 });
    if (lineState.active) {
      setLineState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }
  };

  // Handle wheel (zoom to cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Get cursor position in screen coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate tile position under cursor before zoom
    const tilePixels = TILE_SIZE * viewport.zoom;
    const cursorTileX = mouseX / tilePixels + viewport.x;
    const cursorTileY = mouseY / tilePixels + viewport.y;

    // Calculate new zoom level
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(4, viewport.zoom * delta));
    const newTilePixels = TILE_SIZE * newZoom;

    // Adjust viewport so cursor stays over same tile
    const newX = cursorTileX - mouseX / newTilePixels;
    const newY = cursorTileY - mouseY / newTilePixels;

    setViewport({
      x: Math.max(0, Math.min(MAP_WIDTH - 10, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT - 10, newY)),
      zoom: newZoom
    });
  };

  // Handle tool action at position
  const handleToolAction = (x: number, y: number) => {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    switch (currentTool) {
      case ToolType.PENCIL:
        // Support multi-tile selection stamping
        if (tileSelection.width === 1 && tileSelection.height === 1) {
          setTile(x, y, selectedTile);
        } else {
          const tiles: Array<{ x: number; y: number; tile: number }> = [];
          for (let dy = 0; dy < tileSelection.height; dy++) {
            for (let dx = 0; dx < tileSelection.width; dx++) {
              const tileId = (tileSelection.startRow + dy) * 40 + (tileSelection.startCol + dx);
              tiles.push({ x: x + dx, y: y + dy, tile: tileId });
            }
          }
          setTiles(tiles);
        }
        break;
      case ToolType.ERASER:
        eraseTile(x, y);
        break;
      case ToolType.FILL:
        fillArea(x, y);
        break;
      case ToolType.PICKER:
        if (map) {
          setSelectedTile(map.tiles[y * MAP_WIDTH + x]);
          restorePreviousTool();
        }
        break;
    }
  };

  // Scroll bar handlers
  const handleScrollMouseDown = (axis: 'h' | 'v', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setScrollDrag({
      axis,
      startPos: axis === 'h' ? e.clientX : e.clientY,
      startViewport: axis === 'h' ? viewport.x : viewport.y
    });
  };

  const handleScrollMouseMove = useCallback((e: MouseEvent) => {
    if (!scrollDrag) return;
    const container = containerRef.current;
    if (!container) return;

    const trackSize = scrollDrag.axis === 'h'
      ? container.clientWidth - 14
      : container.clientHeight - 14;
    const delta = (scrollDrag.axis === 'h' ? e.clientX : e.clientY) - scrollDrag.startPos;
    const viewportDelta = (delta / trackSize) * MAP_WIDTH;

    if (scrollDrag.axis === 'h') {
      setViewport({ x: Math.max(0, Math.min(MAP_WIDTH - 10, scrollDrag.startViewport + viewportDelta)) });
    } else {
      setViewport({ y: Math.max(0, Math.min(MAP_HEIGHT - 10, scrollDrag.startViewport + viewportDelta)) });
    }
  }, [scrollDrag, setViewport]);

  const handleScrollMouseUp = useCallback(() => {
    setScrollDrag(null);
  }, []);

  // Global mouse events for scroll bar dragging
  useEffect(() => {
    if (scrollDrag) {
      window.addEventListener('mousemove', handleScrollMouseMove);
      window.addEventListener('mouseup', handleScrollMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleScrollMouseMove);
        window.removeEventListener('mouseup', handleScrollMouseUp);
      };
    }
  }, [scrollDrag, handleScrollMouseMove, handleScrollMouseUp]);

  const scrollMetrics = getScrollMetrics();

  return (
    <div ref={containerRef} className="map-canvas-container">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Horizontal scroll bar */}
      <div className="scroll-track-h">
        <div
          className="scroll-thumb-h"
          style={{
            left: `${scrollMetrics.thumbLeft}%`,
            width: `${scrollMetrics.thumbWidth}%`
          }}
          onMouseDown={(e) => handleScrollMouseDown('h', e)}
        />
      </div>
      {/* Vertical scroll bar */}
      <div className="scroll-track-v">
        <div
          className="scroll-thumb-v"
          style={{
            top: `${scrollMetrics.thumbTop}%`,
            height: `${scrollMetrics.thumbHeight}%`
          }}
          onMouseDown={(e) => handleScrollMouseDown('v', e)}
        />
      </div>
    </div>
  );
};
