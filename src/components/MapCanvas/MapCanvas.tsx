/**
 * MapCanvas component - Renders the tile map on a canvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, ToolType, ANIMATION_DEFINITIONS } from '@core/map';
import { convLrData, convUdData } from '@core/map/GameObjectData';
import './MapCanvas.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  onCursorMove?: (x: number, y: number) => void;
}

const TILES_PER_ROW = 40; // Tileset is 640 pixels wide (40 tiles)
const INITIAL_SCROLL_DELAY = 250; // ms before continuous scroll starts
const SCROLL_REPEAT_RATE = 125;   // ms between scroll ticks (~8 tiles/sec)

// Line drawing state
interface LineState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const MapCanvas: React.FC<Props> = ({ tilesetImage, onCursorMove }) => {
  // Layer refs for 4-canvas architecture
  const staticLayerRef = useRef<HTMLCanvasElement>(null);
  const animLayerRef = useRef<HTMLCanvasElement>(null);
  const overlayLayerRef = useRef<HTMLCanvasElement>(null);
  const gridLayerRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
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
  const [isDrawingWallPencil, setIsDrawingWallPencil] = useState(false);
  const [lastWallPencilPos, setLastWallPencilPos] = useState({ x: -1, y: -1 });
  const [selectionDrag, setSelectionDrag] = useState<{
    active: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });

  // State subscriptions split by layer for granular re-renders
  // Viewport + map (triggers static, anim, grid, overlay redraws)
  const { map, viewport } = useEditorStore(
    useShallow((state) => ({ map: state.map, viewport: state.viewport }))
  );

  // Animation frame (triggers anim + overlay layer only)
  const animationFrame = useEditorStore(state => state.animationFrame);

  // Grid state (triggers grid layer only)
  const showGrid = useEditorStore(state => state.showGrid);

  // Tool/interaction state (triggers overlay layer only)
  const { currentTool, selectedTile, tileSelection, rectDragState, gameObjectToolState, selection, isPasting, clipboard, pastePreviewPosition } = useEditorStore(
    useShallow((state) => ({
      currentTool: state.currentTool,
      selectedTile: state.selectedTile,
      tileSelection: state.tileSelection,
      rectDragState: state.rectDragState,
      gameObjectToolState: state.gameObjectToolState,
      selection: state.selection,
      isPasting: state.isPasting,
      clipboard: state.clipboard,
      pastePreviewPosition: state.pastePreviewPosition
    }))
  );

  // Action subscriptions (stable references, never cause re-renders)
  const {
    setTile, setTiles, placeWall, eraseTile, fillArea, setSelectedTile,
    restorePreviousTool, setViewport, pushUndo, placeGameObject,
    placeGameObjectRect, setRectDragState, setSelection, clearSelection,
    cancelPasting, setPastePreviewPosition, pasteAt
  } = useEditorStore(
    useShallow((state) => ({
      setTile: state.setTile,
      setTiles: state.setTiles,
      placeWall: state.placeWall,
      eraseTile: state.eraseTile,
      fillArea: state.fillArea,
      setSelectedTile: state.setSelectedTile,
      restorePreviousTool: state.restorePreviousTool,
      setViewport: state.setViewport,
      pushUndo: state.pushUndo,
      placeGameObject: state.placeGameObject,
      placeGameObjectRect: state.placeGameObjectRect,
      setRectDragState: state.setRectDragState,
      setSelection: state.setSelection,
      clearSelection: state.clearSelection,
      cancelPasting: state.cancelPasting,
      setPastePreviewPosition: state.setPastePreviewPosition,
      pasteAt: state.pasteAt
    }))
  );

  // Calculate visible area
  const getVisibleTiles = useCallback(() => {
    const canvas = gridLayerRef.current;
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

  // Layer 1: Static (non-animated) tiles
  const drawStaticLayer = useCallback(() => {
    const canvas = staticLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !map) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tilePixels = TILE_SIZE * viewport.zoom;
    const { startX, startY, endX, endY } = getVisibleTiles();

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map.tiles[y * MAP_WIDTH + x];
        const screenX = Math.floor((x - viewport.x) * tilePixels);
        const screenY = Math.floor((y - viewport.y) * tilePixels);
        const destSize = Math.ceil(tilePixels);

        const isAnimated = (tile & 0x8000) !== 0;

        if (isAnimated) {
          // Draw frame 0 as static background to prevent flicker
          const animId = tile & 0xFF;
          const anim = ANIMATION_DEFINITIONS[animId];
          if (anim && anim.frames.length > 0 && tilesetImage) {
            const displayTile = anim.frames[0];
            const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
            const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
            ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, destSize, destSize);
          } else {
            // Placeholder for undefined animation
            ctx.fillStyle = '#4a4a6a';
            ctx.fillRect(screenX, screenY, destSize, destSize);
          }
        } else if (tilesetImage) {
          const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
          const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
          ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
            screenX, screenY, destSize, destSize);
        } else {
          // No tileset - draw colored placeholder
          ctx.fillStyle = tile === 280 ? '#b0b0b0' : `hsl(${(tile * 7) % 360}, 50%, 40%)`;
          ctx.fillRect(screenX, screenY, destSize, destSize);
        }
      }
    }
  }, [map, viewport, tilesetImage, getVisibleTiles]);

  // Layer 2: Animated tiles only
  const drawAnimLayer = useCallback(() => {
    const canvas = animLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !map) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tilePixels = TILE_SIZE * viewport.zoom;
    const { startX, startY, endX, endY } = getVisibleTiles();

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map.tiles[y * MAP_WIDTH + x];
        const isAnimated = (tile & 0x8000) !== 0;

        if (isAnimated && tilesetImage) {
          const animId = tile & 0xFF;
          const tileFrameOffset = (tile >> 8) & 0x7F;
          const anim = ANIMATION_DEFINITIONS[animId];

          if (anim && anim.frames.length > 0) {
            const frameIdx = (animationFrame + tileFrameOffset) % anim.frameCount;
            const displayTile = anim.frames[frameIdx] || 0;

            const screenX = Math.floor((x - viewport.x) * tilePixels);
            const screenY = Math.floor((y - viewport.y) * tilePixels);
            const destSize = Math.ceil(tilePixels);

            const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
            const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;

            ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, destSize, destSize);
          }
        }
      }
    }
  }, [map, viewport, tilesetImage, animationFrame, getVisibleTiles]);

  // Layer 3: Overlays (cursor, line preview, selection, tool previews, conveyor preview)
  const drawOverlayLayer = useCallback(() => {
    const canvas = overlayLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tilePixels = TILE_SIZE * viewport.zoom;

    // Draw line preview for wall/line tools
    if (lineState.active && (currentTool === ToolType.WALL || currentTool === ToolType.LINE)) {
      const lineTiles = getLineTiles(
        lineState.startX, lineState.startY,
        lineState.endX, lineState.endY
      );

      ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
      ctx.strokeStyle = 'rgba(0, 255, 128, 0.8)';
      ctx.lineWidth = 2;

      for (const tile of lineTiles) {
        const screen = tileToScreen(tile.x, tile.y);
        ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
        ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      }

      const startScreen = tileToScreen(lineState.startX, lineState.startY);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.fillRect(startScreen.x, startScreen.y, tilePixels, tilePixels);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 3;
      ctx.strokeRect(startScreen.x + 2, startScreen.y + 2, tilePixels - 4, tilePixels - 4);

      const endScreen = tileToScreen(lineState.endX, lineState.endY);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(startScreen.x + tilePixels / 2, startScreen.y + tilePixels / 2);
      ctx.lineTo(endScreen.x + tilePixels / 2, endScreen.y + tilePixels / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const count = lineTiles.length;
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${count} tiles`, endScreen.x + tilePixels + 5, endScreen.y);
    }

    // Draw floating paste preview
    if (isPasting && clipboard && pastePreviewPosition && tilesetImage) {
      const previewX = pastePreviewPosition.x;
      const previewY = pastePreviewPosition.y;

      ctx.globalAlpha = 0.7;  // Semi-transparent like conveyor preview

      for (let dy = 0; dy < clipboard.height; dy++) {
        for (let dx = 0; dx < clipboard.width; dx++) {
          const mapX = previewX + dx;
          const mapY = previewY + dy;

          // Skip out-of-bounds tiles
          if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) continue;

          const tile = clipboard.tiles[dy * clipboard.width + dx];
          const screenX = Math.floor((mapX - viewport.x) * tilePixels);
          const screenY = Math.floor((mapY - viewport.y) * tilePixels);
          const destSize = Math.ceil(tilePixels);

          const isAnimated = (tile & 0x8000) !== 0;
          if (isAnimated) {
            const animId = tile & 0xFF;
            const frameOffset = (tile >> 8) & 0x7F;
            const anim = ANIMATION_DEFINITIONS[animId];
            if (anim && anim.frames.length > 0) {
              const frameIdx = (animationFrame + frameOffset) % anim.frameCount;
              const displayTile = anim.frames[frameIdx] || 0;
              const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
              const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
              ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
                screenX, screenY, destSize, destSize);
            }
          } else {
            const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
            const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
            ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, destSize, destSize);
          }
        }
      }

      ctx.globalAlpha = 1.0;

      // Draw outline around paste preview region
      const topLeft = tileToScreen(previewX, previewY);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(topLeft.x + 1, topLeft.y + 1,
        clipboard.width * tilePixels - 2, clipboard.height * tilePixels - 2);
      ctx.setLineDash([]);
    }

    // Draw cursor highlight
    if (cursorTile.x >= 0 && cursorTile.y >= 0 && !lineState.active) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
    }

    // Draw selection preview at cursor position for tile-placing tools
    if (cursorTile.x >= 0 && cursorTile.y >= 0 &&
        (currentTool === ToolType.PENCIL || currentTool === ToolType.FILL) &&
        !lineState.active) {
      const { width, height } = tileSelection;

      const screenX = Math.floor((cursorTile.x - viewport.x) * tilePixels);
      const screenY = Math.floor((cursorTile.y - viewport.y) * tilePixels);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(screenX, screenY, width * tilePixels, height * tilePixels);
      ctx.setLineDash([]);
    }

    // Draw preview for game object stamp tools (3x3 outline at cursor)
    const stampTools = new Set([ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH]);
    if (cursorTile.x >= 0 && cursorTile.y >= 0 && stampTools.has(currentTool)) {
      const cx = cursorTile.x;
      const cy = cursorTile.y;
      const valid = cx - 1 >= 0 && cx + 1 < MAP_WIDTH && cy - 1 >= 0 && cy + 1 < MAP_HEIGHT;
      const screen = tileToScreen(cx - 1, cy - 1);

      ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, 3 * tilePixels - 2, 3 * tilePixels - 2);

      const centerScreen = tileToScreen(cx, cy);
      ctx.fillStyle = valid ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 64, 64, 0.2)';
      ctx.fillRect(centerScreen.x, centerScreen.y, tilePixels, tilePixels);
    }

    // Draw single-tile outline for warp tool
    if (cursorTile.x >= 0 && cursorTile.y >= 0 && currentTool === ToolType.WARP) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y);
      ctx.strokeStyle = 'rgba(128, 128, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      ctx.fillStyle = 'rgba(128, 128, 255, 0.2)';
      ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
    }

    // Draw single-tile cursor for wall pencil
    if (cursorTile.x >= 0 && cursorTile.y >= 0 &&
        (currentTool === ToolType.WALL_PENCIL || currentTool === ToolType.WALL_RECT) && !rectDragState.active) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y);
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
    }

    // Draw rectangle outline during drag for rect tools
    if (rectDragState.active) {
      const minX = Math.min(rectDragState.startX, rectDragState.endX);
      const minY = Math.min(rectDragState.startY, rectDragState.endY);
      const maxX = Math.max(rectDragState.startX, rectDragState.endX);
      const maxY = Math.max(rectDragState.startY, rectDragState.endY);
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;

      // Live tile preview for CONVEYOR tool
      if (currentTool === ToolType.CONVEYOR && tilesetImage && w >= 2 && h >= 2) {
        const convDir = gameObjectToolState.conveyorDir;
        const convData = convDir === 0 ? convLrData : convUdData;
        if (convData.length > 0 && convData[0][0] !== 0) {
          const data = convData[0];

          ctx.globalAlpha = 0.7;

          for (let k = 0; k < h; k++) {
            for (let hh = 0; hh < w; hh++) {
              let tile: number | undefined;

              if (convDir === 1) {
                if (w % 2 !== 0 && hh === w - 1) continue;
                if (k === 0)
                  tile = data[hh % 2];
                else if (k === h - 1)
                  tile = data[hh % 2 + 6];
                else
                  tile = data[(k % 2 + 1) * 2 + hh % 2];
              } else {
                if (h % 2 !== 0 && k === h - 1) continue;
                if (hh === 0)
                  tile = data[(k % 2) * 4];
                else if (hh === w - 1)
                  tile = data[(k % 2) * 4 + 3];
                else
                  tile = data[1 + (k % 2) * 4 + hh % 2];
              }

              if (tile !== undefined) {
                const screenX = Math.floor((minX + hh - viewport.x) * tilePixels);
                const screenY = Math.floor((minY + k - viewport.y) * tilePixels);

                const isAnim = (tile & 0x8000) !== 0;
                if (isAnim && tilesetImage) {
                  const animId = tile & 0xFF;
                  const frameOffset = (tile >> 8) & 0x7F;
                  const anim = ANIMATION_DEFINITIONS[animId];
                  if (anim && anim.frames.length > 0) {
                    const frameIdx = (animationFrame + frameOffset) % anim.frameCount;
                    const displayTile = anim.frames[frameIdx] || 0;
                    const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
                    const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
                    ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
                      screenX, screenY, tilePixels, tilePixels);
                  }
                } else if (tilesetImage) {
                  const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
                  const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
                  ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
                    screenX, screenY, tilePixels, tilePixels);
                }
              }
            }
          }

          ctx.globalAlpha = 1.0;
        }
      }

      let valid = true;
      if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
          currentTool === ToolType.BRIDGE) {
        valid = w >= 3 && h >= 3;
      }
      if (currentTool === ToolType.CONVEYOR) {
        valid = w >= 2 && h >= 2;
      }

      const topLeft = tileToScreen(minX, minY);
      ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(topLeft.x + 1, topLeft.y + 1, w * tilePixels - 2, h * tilePixels - 2);
      ctx.setLineDash([]);

      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${w}x${h}`, topLeft.x + w * tilePixels + 4, topLeft.y);
    }

    // Draw selection / marching ants
    const activeSelection = selectionDrag.active
      ? selectionDrag
      : selection.active
        ? selection
        : null;

    if (activeSelection) {
      const minX = Math.min(activeSelection.startX, activeSelection.endX);
      const minY = Math.min(activeSelection.startY, activeSelection.endY);
      const maxX = Math.max(activeSelection.startX, activeSelection.endX);
      const maxY = Math.max(activeSelection.startY, activeSelection.endY);
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;

      const selScreen = tileToScreen(minX, minY);

      const dashOffset = -(animationFrame * 0.5) % 12;

      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = dashOffset;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);

      ctx.lineDashOffset = dashOffset + 6;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);

      ctx.setLineDash([]);
    }
  }, [cursorTile, lineState, currentTool, tileSelection, rectDragState, gameObjectToolState, selection, selectionDrag, viewport, animationFrame, tilesetImage, isPasting, clipboard, pastePreviewPosition, getLineTiles, tileToScreen]);

  // Layer 4: Grid
  const drawGridLayer = useCallback(() => {
    const canvas = gridLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showGrid) return;

    const tilePixels = TILE_SIZE * viewport.zoom;
    const { startX, startY, endX, endY } = getVisibleTiles();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical lines
    for (let x = startX; x <= endX; x++) {
      const screenX = Math.floor((x - viewport.x) * tilePixels);
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvas.height);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y++) {
      const screenY = Math.floor((y - viewport.y) * tilePixels);
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvas.width, screenY);
    }

    ctx.stroke();
  }, [viewport, showGrid, getVisibleTiles]);

  // Layer-specific render triggers
  useEffect(() => {
    drawStaticLayer();
  }, [drawStaticLayer]);

  useEffect(() => {
    drawAnimLayer();
  }, [drawAnimLayer]);

  useEffect(() => {
    drawOverlayLayer();
  }, [drawOverlayLayer]);

  useEffect(() => {
    drawGridLayer();
  }, [drawGridLayer]);

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
    const canvas = gridLayerRef.current;
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

  const scrollByTiles = useCallback((direction: 'up' | 'down' | 'left' | 'right', tiles: number) => {
    const clampX = (x: number) => Math.max(0, Math.min(MAP_WIDTH - 10, x));
    const clampY = (y: number) => Math.max(0, Math.min(MAP_HEIGHT - 10, y));

    switch (direction) {
      case 'up':
        setViewport({ y: clampY(viewport.y - tiles) });
        break;
      case 'down':
        setViewport({ y: clampY(viewport.y + tiles) });
        break;
      case 'left':
        setViewport({ x: clampX(viewport.x - tiles) });
        break;
      case 'right':
        setViewport({ x: clampX(viewport.x + tiles) });
        break;
    }
  }, [viewport, setViewport]);

  const handleArrowMouseDown = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Immediate single-tile scroll
    scrollByTiles(direction, 1);

    // Set up continuous scrolling after initial delay
    const timeout = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        scrollByTiles(direction, 1);
      }, SCROLL_REPEAT_RATE);
      scrollIntervalRef.current = interval;
    }, INITIAL_SCROLL_DELAY);

    scrollTimeoutRef.current = timeout;
  }, [scrollByTiles]);

  const stopArrowScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const handleTrackClick = useCallback((axis: 'h' | 'v', event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    // Don't handle clicks on thumb or arrow buttons
    if (target.classList.contains('scroll-thumb-h') ||
        target.classList.contains('scroll-thumb-v') ||
        target.classList.contains('scroll-arrow-up') ||
        target.classList.contains('scroll-arrow-down') ||
        target.classList.contains('scroll-arrow-left') ||
        target.classList.contains('scroll-arrow-right')) {
      return;
    }

    const canvas = gridLayerRef.current;
    if (!canvas) return;

    const tilePixels = TILE_SIZE * viewport.zoom;

    if (axis === 'h') {
      const visibleTiles = Math.floor(canvas.width / tilePixels);
      const trackRect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - trackRect.left;
      const thumbLeft = (viewport.x / MAP_WIDTH) * (trackRect.width - 20); // Account for arrow buttons

      if (clickX < thumbLeft + 10) { // Click left of thumb (account for left arrow)
        setViewport({ x: Math.max(0, viewport.x - visibleTiles) });
      } else {
        setViewport({ x: Math.min(MAP_WIDTH - visibleTiles, viewport.x + visibleTiles) });
      }
    } else {
      const visibleTiles = Math.floor(canvas.height / tilePixels);
      const trackRect = event.currentTarget.getBoundingClientRect();
      const clickY = event.clientY - trackRect.top;
      const thumbTop = (viewport.y / MAP_HEIGHT) * (trackRect.height - 20); // Account for arrow buttons

      if (clickY < thumbTop + 10) { // Click above thumb (account for top arrow)
        setViewport({ y: Math.max(0, viewport.y - visibleTiles) });
      } else {
        setViewport({ y: Math.min(MAP_HEIGHT - visibleTiles, viewport.y + visibleTiles) });
      }
    }
  }, [viewport, setViewport]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = gridLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      // Middle click, right-click, or Alt+click - pan
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0) {
      // Left click - commit paste if in paste mode
      if (isPasting && !e.altKey) {
        pasteAt(x, y);
        return;
      }

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
      } else if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
                 currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH) {
        // Click-to-stamp game object tools (3x3) - center on cursor
        pushUndo('Place game object');
        placeGameObject(x - 1, y - 1);
      } else if (currentTool === ToolType.WARP) {
        // Warp is single-tile, no offset needed
        pushUndo('Place game object');
        placeGameObject(x, y);
      } else if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
                 currentTool === ToolType.BRIDGE || currentTool === ToolType.CONVEYOR ||
                 currentTool === ToolType.WALL_RECT) {
        // Drag-to-rectangle tools - start rect drag
        setRectDragState({ active: true, startX: x, startY: y, endX: x, endY: y });
      } else if (currentTool === ToolType.WALL_PENCIL) {
        // Wall pencil - freehand wall drawing
        pushUndo('Draw walls');
        placeWall(x, y);
        setIsDrawingWallPencil(true);
        setLastWallPencilPos({ x, y });
      } else if (currentTool === ToolType.SELECT) {
        // Clear any existing selection and start new drag
        clearSelection();
        setSelectionDrag({ active: true, startX: x, startY: y, endX: x, endY: y });
      } else {
        pushUndo('Edit tiles');
        handleToolAction(x, y);
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = gridLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    setCursorTile({ x, y });
    onCursorMove?.(x, y);

    // Update paste preview position when in paste mode
    if (isPasting) {
      setPastePreviewPosition(x, y);
    }

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
    } else if (rectDragState.active) {
      // Update rect drag end position
      setRectDragState({ endX: x, endY: y });
    } else if (selectionDrag.active) {
      setSelectionDrag(prev => ({ ...prev, endX: x, endY: y }));
    } else if (isDrawingWallPencil && e.buttons === 1) {
      // Wall pencil freehand drawing
      if (x !== lastWallPencilPos.x || y !== lastWallPencilPos.y) {
        placeWall(x, y);
        setLastWallPencilPos({ x, y });
      }
    } else if (e.buttons === 1 && !e.altKey) {
      // Drawing with left button held (non-line tools)
      if (currentTool !== ToolType.WALL && currentTool !== ToolType.LINE &&
          currentTool !== ToolType.WALL_PENCIL && currentTool !== ToolType.WALL_RECT &&
          currentTool !== ToolType.FLAG && currentTool !== ToolType.FLAG_POLE &&
          currentTool !== ToolType.SPAWN && currentTool !== ToolType.SWITCH &&
          currentTool !== ToolType.WARP && currentTool !== ToolType.BUNKER &&
          currentTool !== ToolType.HOLDING_PEN && currentTool !== ToolType.BRIDGE &&
          currentTool !== ToolType.CONVEYOR && currentTool !== ToolType.SELECT) {
        handleToolAction(x, y);
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = (_e: React.MouseEvent) => {
    if (selectionDrag.active) {
      // Only create selection if user actually dragged (not just clicked)
      const minX = Math.min(selectionDrag.startX, selectionDrag.endX);
      const minY = Math.min(selectionDrag.startY, selectionDrag.endY);
      const maxX = Math.max(selectionDrag.startX, selectionDrag.endX);
      const maxY = Math.max(selectionDrag.startY, selectionDrag.endY);

      if (minX !== maxX || minY !== maxY) {
        // Commit normalized coordinates to Zustand store
        setSelection({ startX: minX, startY: minY, endX: maxX, endY: maxY, active: true });
      }
      setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }

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

    // Complete rect drag
    if (rectDragState.active) {
      pushUndo('Place game object');
      placeGameObjectRect(rectDragState.startX, rectDragState.startY, rectDragState.endX, rectDragState.endY);
      setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }

    // End wall pencil drawing
    if (isDrawingWallPencil) {
      setIsDrawingWallPencil(false);
      setLastWallPencilPos({ x: -1, y: -1 });
    }

    setIsDragging(false);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDragging(false);
    setCursorTile({ x: -1, y: -1 });
    onCursorMove?.(-1, -1);
    if (lineState.active) {
      setLineState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }
    if (rectDragState.active) {
      setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }
    if (isPasting) {
      cancelPasting();
    }
    if (isDrawingWallPencil) {
      setIsDrawingWallPencil(false);
      setLastWallPencilPos({ x: -1, y: -1 });
    }
    if (selectionDrag.active) {
      setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }
  };

  // Handle wheel (zoom to cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = gridLayerRef.current?.getBoundingClientRect();
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

    // Track size minus arrow buttons (10px on each end = 20px total)
    const trackSize = scrollDrag.axis === 'h'
      ? container.clientWidth - 10 - 20  // minus vertical scrollbar and arrow buttons
      : container.clientHeight - 10 - 20; // minus horizontal scrollbar and arrow buttons
    const delta = (scrollDrag.axis === 'h' ? e.clientX : e.clientY) - scrollDrag.startPos;
    const viewportDelta = (delta / trackSize) * (scrollDrag.axis === 'h' ? MAP_WIDTH : MAP_HEIGHT);

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

  // Cleanup scroll timers on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, []);

  // Global mouseup listener for arrow buttons (in case mouse leaves button while pressed)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      stopArrowScroll();
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [stopArrowScroll]);

  // Escape key cancellation for rect drag
  useEffect(() => {
    if (!rectDragState.active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rectDragState.active, setRectDragState]);

  // Escape key cancellation for line drawing
  useEffect(() => {
    if (!lineState.active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setLineState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineState.active]);

  // Escape key cancellation for selection
  useEffect(() => {
    if (!selection.active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.active, clearSelection]);

  // Escape key cancellation for selection drag (during active drag)
  useEffect(() => {
    if (!selectionDrag.active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionDrag.active]);

  // Escape key cancellation for paste preview
  useEffect(() => {
    if (!isPasting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelPasting();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPasting, cancelPasting]);

  // RAF-debounced canvas resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const resizeObserver = new ResizeObserver(() => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Update all 4 canvas dimensions
        const canvases = [
          staticLayerRef.current,
          animLayerRef.current,
          overlayLayerRef.current,
          gridLayerRef.current
        ];
        canvases.forEach(canvas => {
          if (canvas) {
            canvas.width = width;
            canvas.height = height;
          }
        });

        // Redraw all layers
        drawStaticLayer();
        drawAnimLayer();
        drawOverlayLayer();
        drawGridLayer();

        rafId = null;
      });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [drawStaticLayer, drawAnimLayer, drawOverlayLayer, drawGridLayer]);

  const scrollMetrics = getScrollMetrics();

  return (
    <div className="map-window-frame">
      <div ref={containerRef} className="map-canvas-container">
        {/* Layer 1: Static tiles */}
        <canvas
          ref={staticLayerRef}
          className="map-canvas-layer no-events"
        />
        {/* Layer 2: Animated tiles */}
        <canvas
          ref={animLayerRef}
          className="map-canvas-layer no-events"
        />
        {/* Layer 3: Overlays */}
        <canvas
          ref={overlayLayerRef}
          className="map-canvas-layer no-events"
        />
        {/* Layer 4: Grid (receives mouse events) */}
        <canvas
          ref={gridLayerRef}
          className="map-canvas-layer map-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Horizontal scroll bar */}
        <div className="scroll-track-h" onClick={(e) => handleTrackClick('h', e)}>
          <button
            className="scroll-arrow-left"
            onMouseDown={() => handleArrowMouseDown('left')}
            onMouseUp={stopArrowScroll}
            onMouseLeave={stopArrowScroll}
            aria-label="Scroll left"
          />
          <div
            className="scroll-thumb-h"
            style={{
              left: `calc(10px + ${scrollMetrics.thumbLeft}% * (100% - 20px) / 100)`,
              width: `calc(${scrollMetrics.thumbWidth}% * (100% - 20px) / 100)`
            }}
            onMouseDown={(e) => handleScrollMouseDown('h', e)}
          />
          <button
            className="scroll-arrow-right"
            onMouseDown={() => handleArrowMouseDown('right')}
            onMouseUp={stopArrowScroll}
            onMouseLeave={stopArrowScroll}
            aria-label="Scroll right"
          />
        </div>
        {/* Vertical scroll bar */}
        <div className="scroll-track-v" onClick={(e) => handleTrackClick('v', e)}>
          <button
            className="scroll-arrow-up"
            onMouseDown={() => handleArrowMouseDown('up')}
            onMouseUp={stopArrowScroll}
            onMouseLeave={stopArrowScroll}
            aria-label="Scroll up"
          />
          <div
            className="scroll-thumb-v"
            style={{
              top: `calc(10px + ${scrollMetrics.thumbTop}% * (100% - 20px) / 100)`,
              height: `calc(${scrollMetrics.thumbHeight}% * (100% - 20px) / 100)`
            }}
            onMouseDown={(e) => handleScrollMouseDown('v', e)}
          />
          <button
            className="scroll-arrow-down"
            onMouseDown={() => handleArrowMouseDown('down')}
            onMouseUp={stopArrowScroll}
            onMouseLeave={stopArrowScroll}
            aria-label="Scroll down"
          />
        </div>
        {/* Corner piece where scrollbars meet */}
        <div className="scroll-corner" />
      </div>
    </div>
  );
};
