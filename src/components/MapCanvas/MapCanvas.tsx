/**
 * MapCanvas component - Renders the tile map on a canvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { RulerMode } from '@core/editor/slices/globalSlice';
import { useShallow } from 'zustand/react/shallow';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, DEFAULT_TILE, ToolType, ANIMATION_DEFINITIONS, getFrameOffset, getAnimationId, isAnimatedTile } from '@core/map';
import { convLrData, convUdData, CONV_RIGHT_DATA, CONV_DOWN_DATA } from '@core/map/GameObjectData';
import { wallSystem } from '@core/map/WallSystem';
import { CanvasEngine } from '@core/canvas';
import './MapCanvas.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  farplaneImage?: HTMLImageElement | null;
  onCursorMove?: (x: number, y: number) => void;
  documentId?: string;
}

const TILES_PER_ROW = 40; // Tileset is 640 pixels wide (40 tiles)
const INITIAL_SCROLL_DELAY = 250; // ms before continuous scroll starts
const SCROLL_REPEAT_RATE = 125;   // ms between scroll ticks (~8 tiles/sec)

// Viewport override for progressive rendering
interface ViewportOverride { x: number; y: number; zoom: number }

// Line drawing state
interface LineState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const MapCanvas: React.FC<Props> = ({ tilesetImage, farplaneImage, onCursorMove, documentId }) => {
  // Layer refs for 2-canvas architecture (map + UI overlay)
  const mapLayerRef = useRef<HTMLCanvasElement>(null);
  const uiLayerRef = useRef<HTMLCanvasElement>(null);
  // Canvas rendering engine (owns off-screen buffer and rendering state)
  const engineRef = useRef<CanvasEngine | null>(null);
  // Grid pattern cache (recreated on zoom change)
  const gridPatternRef = useRef<CanvasPattern | null>(null);
  const gridCacheKeyRef = useRef<string>('');
  // Stable refs for draw functions (avoids ResizeObserver reconnection churn)
  const drawMapLayerRef = useRef<() => void>(() => {});
  const drawUiLayerRef = useRef<() => void>(() => {});

  // Ref-based cursor for drag (no re-renders)
  const cursorTileRef = useRef({ x: -1, y: -1 });
  // RAF-debounced UI redraw refs
  const uiDirtyRef = useRef(false);
  const uiRafIdRef = useRef<number | null>(null);
  // Transient UI state refs (no React re-renders)
  const lineStateRef = useRef<LineState>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  const selectionDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  const rectDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({
    active: false, startX: 0, startY: 0, endX: 0, endY: 0
  });
  const pastePreviewRef = useRef<{ x: number; y: number } | null>(null);

  // Ruler state ref (RULER-01)
  interface RulerState {
    active: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    waypoints: Array<{ x: number; y: number }>;
  }
  const rulerStateRef = useRef<RulerState>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; viewportX: number; viewportY: number; viewportZoom: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const panDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const [scrollDrag, setScrollDrag] = useState<{ axis: 'h' | 'v'; startPos: number; startViewport: number } | null>(null);
  // Wall pencil uses useState + Zustand per-move because auto-connection (wallSystem.placeWall)
  // reads 8 neighbors from map.tiles — cannot be extracted to ref-based pattern without
  // duplicating entire map in ref. Documented exception per TOOL-02.
  const [isDrawingWallPencil, setIsDrawingWallPencil] = useState(false);
  const [lastWallPencilPos, setLastWallPencilPos] = useState({ x: -1, y: -1 });

  // State subscriptions split by layer for granular re-renders
  // Viewport + map (triggers static, anim, grid, overlay redraws)
  const { map, viewport } = useEditorStore(
    useShallow((state) => {
      if (documentId) {
        const doc = state.documents.get(documentId);
        return {
          map: doc?.map ?? null,
          viewport: doc?.viewport ?? { x: 0, y: 0, zoom: 1 }
        };
      }
      return { map: state.map, viewport: state.viewport };
    })
  );

  // Animation frame (triggers anim + overlay layer only)
  const animationFrame = useEditorStore(state => state.animationFrame);

  // Ref for animationFrame to avoid dependency in drawMapLayer/drawUiLayer
  const animFrameRef = useRef(animationFrame);
  animFrameRef.current = animationFrame;

  // Grid state (triggers grid layer only)
  const showGrid = useEditorStore(state => state.showGrid);
  const gridOpacity = useEditorStore(state => state.gridOpacity);
  const gridLineWeight = useEditorStore(state => state.gridLineWeight);
  const gridColor = useEditorStore(state => state.gridColor);

  // Tool/interaction state (triggers overlay layer only) - split into focused selectors
  // Individual selectors for tool state (1-3 fields, change independently)
  const currentTool = useEditorStore(state => state.currentTool);
  const selectedTile = useEditorStore(state => state.selectedTile);
  const tileSelection = useEditorStore(state => state.tileSelection);
  const gameObjectToolState = useEditorStore(state => state.gameObjectToolState);
  const rulerMode = useEditorStore(state => state.rulerMode);
  const pinMeasurement = useEditorStore(state => state.pinMeasurement);
  const clearAllPinnedMeasurements = useEditorStore(state => state.clearAllPinnedMeasurements);
  // Grouped selector for paste state (changes together)
  const { isPasting, clipboard } = useEditorStore(
    useShallow((state) => {
      const doc = documentId ? state.documents.get(documentId) : null;
      return {
        isPasting: doc ? doc.isPasting : state.isPasting,
        clipboard: state.clipboard
      };
    })
  );

  // Grouped selector for selection (single document state)
  const { selection } = useEditorStore(
    useShallow((state) => {
      const doc = documentId ? state.documents.get(documentId) : null;
      return {
        selection: doc ? doc.selection : state.selection
      };
    })
  );

  // Action subscriptions (stable references, never cause re-renders) - individual selectors
  const setTile = useEditorStore(state => state.setTile);
  const setTiles = useEditorStore(state => state.setTiles);
  const placeWall = useEditorStore(state => state.placeWall);
  const fillArea = useEditorStore(state => state.fillArea);
  const setSelectedTile = useEditorStore(state => state.setSelectedTile);
  const restorePreviousTool = useEditorStore(state => state.restorePreviousTool);
  const setViewport = useEditorStore(state => state.setViewport);
  const pushUndo = useEditorStore(state => state.pushUndo);
  const commitUndo = useEditorStore(state => state.commitUndo);
  const placeGameObject = useEditorStore(state => state.placeGameObject);
  const placeGameObjectRect = useEditorStore(state => state.placeGameObjectRect);
  const setSelection = useEditorStore(state => state.setSelection);
  const clearSelection = useEditorStore(state => state.clearSelection);
  const cancelPasting = useEditorStore(state => state.cancelPasting);
  const pasteAt = useEditorStore(state => state.pasteAt);
  const markModified = useEditorStore(state => state.markModified);
  const setRulerMeasurement = useEditorStore(state => state.setRulerMeasurement);
  const setAnimationOffsetInput = useEditorStore(state => state.setAnimationOffsetInput);
  const setWarpSettings = useEditorStore(state => state.setWarpSettings);

  // Convert tile coords to screen coords
  const tileToScreen = useCallback((tileX: number, tileY: number, overrideViewport?: ViewportOverride) => {
    const vp = overrideViewport ?? viewport;
    const tilePixels = TILE_SIZE * vp.zoom;
    return {
      x: (tileX - vp.x) * tilePixels,
      y: (tileY - vp.y) * tilePixels
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

  // Immediate tile patch: update buffer + blit without waiting for React
  const immediatePatchTile = useCallback((tileX: number, tileY: number, tile: number, vp: { x: number; y: number; zoom: number }) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.patchTile(tileX, tileY, tile, vp, animFrameRef.current);
  }, []);

  // Paint pencil tile(s) via engine during drag — supports multi-tile stamps
  const paintPencilTile = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (tileSelection.width === 1 && tileSelection.height === 1) {
      engine.paintTile(x, y, selectedTile);
    } else {
      // Multi-tile stamp: loop over selection, paint each tile
      for (let dy = 0; dy < tileSelection.height; dy++) {
        for (let dx = 0; dx < tileSelection.width; dx++) {
          const tileId = (tileSelection.startRow + dy) * 40 + (tileSelection.startCol + dx);
          if (tileId !== DEFAULT_TILE) {
            engine.paintTile(x + dx, y + dy, tileId);
          }
        }
      }
    }
  }, [selectedTile, tileSelection]);

  // Map layer: buffer-based rendering
  // Full map pre-rendered to 4096x4096 off-screen canvas at native resolution.
  // Tile edits patch only changed tiles. Viewport changes just blit (1 drawImage).
  const drawMapLayer = useCallback((overrideViewport?: ViewportOverride) => {
    const engine = engineRef.current;
    if (!engine || !map) return;
    const vp = overrideViewport ?? viewport;
    engine.drawMapLayer(map, vp, animFrameRef.current);
  }, [map, viewport]);

  // UI layer: Grid + Overlays (cursor, line preview, selection, tool previews, conveyor preview)
  const drawUiLayer = useCallback((overrideViewport?: ViewportOverride) => {
    const vp = overrideViewport ?? viewport;
    const canvas = uiLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Grid rendering via pattern fill ---
    if (showGrid) {
      const tilePixelSize = Math.round(TILE_SIZE * vp.zoom);
      if (tilePixelSize > 0) {
        // Recreate pattern when any grid setting changes
        const cacheKey = `${tilePixelSize}-${gridOpacity}-${gridLineWeight}-${gridColor}`;
        if (gridCacheKeyRef.current !== cacheKey) {
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = tilePixelSize;
          patternCanvas.height = tilePixelSize;
          const pctx = patternCanvas.getContext('2d');
          if (pctx) {
            const r = parseInt(gridColor.slice(1, 3), 16);
            const g = parseInt(gridColor.slice(3, 5), 16);
            const b = parseInt(gridColor.slice(5, 7), 16);
            pctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${gridOpacity / 100})`;
            pctx.lineWidth = gridLineWeight;
            pctx.beginPath();
            pctx.moveTo(0, 0);
            pctx.lineTo(tilePixelSize, 0);
            pctx.moveTo(0, 0);
            pctx.lineTo(0, tilePixelSize);
            pctx.stroke();
            gridPatternRef.current = ctx.createPattern(patternCanvas, 'repeat');
            gridCacheKeyRef.current = cacheKey;
          }
        }
        if (gridPatternRef.current) {
          const offsetX = Math.round(-(vp.x % 1) * tilePixelSize);
          const offsetY = Math.round(-(vp.y % 1) * tilePixelSize);
          ctx.save();
          ctx.translate(offsetX, offsetY);
          ctx.fillStyle = gridPatternRef.current;
          ctx.fillRect(-tilePixelSize, -tilePixelSize, canvas.width + tilePixelSize * 2, canvas.height + tilePixelSize * 2);
          ctx.restore();
        }
      }
    }

    const tilePixels = TILE_SIZE * vp.zoom;

    // Draw line preview for wall/line tools
    if (lineStateRef.current.active && (currentTool === ToolType.WALL || currentTool === ToolType.LINE)) {
      const lineTiles = getLineTiles(
        lineStateRef.current.startX, lineStateRef.current.startY,
        lineStateRef.current.endX, lineStateRef.current.endY
      );

      ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
      ctx.strokeStyle = 'rgba(0, 255, 128, 0.8)';
      ctx.lineWidth = 2;

      for (const tile of lineTiles) {
        const screen = tileToScreen(tile.x, tile.y, overrideViewport);
        ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
        ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      }

      const startScreen = tileToScreen(lineStateRef.current.startX, lineStateRef.current.startY, overrideViewport);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.fillRect(startScreen.x, startScreen.y, tilePixels, tilePixels);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 3;
      ctx.strokeRect(startScreen.x + 2, startScreen.y + 2, tilePixels - 4, tilePixels - 4);

      const endScreen = tileToScreen(lineStateRef.current.endX, lineStateRef.current.endY, overrideViewport);
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
    if (isPasting && clipboard && pastePreviewRef.current && tilesetImage) {
      const previewX = pastePreviewRef.current.x;
      const previewY = pastePreviewRef.current.y;

      ctx.globalAlpha = 0.7;  // Semi-transparent like conveyor preview

      for (let dy = 0; dy < clipboard.height; dy++) {
        for (let dx = 0; dx < clipboard.width; dx++) {
          const mapX = previewX + dx;
          const mapY = previewY + dy;

          // Skip out-of-bounds tiles
          if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) continue;

          const tile = clipboard.tiles[dy * clipboard.width + dx];
          const screenX = Math.floor((mapX - vp.x) * tilePixels);
          const screenY = Math.floor((mapY - vp.y) * tilePixels);
          const destSize = Math.ceil(tilePixels);

          const isAnimated = (tile & 0x8000) !== 0;
          if (isAnimated) {
            const animId = tile & 0xFF;
            const frameOffset = (tile >> 8) & 0x7F;
            const anim = ANIMATION_DEFINITIONS[animId];
            if (anim && anim.frames.length > 0) {
              const frameIdx = (animFrameRef.current + frameOffset) % anim.frameCount;
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
      const topLeft = tileToScreen(previewX, previewY, overrideViewport);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(topLeft.x + 1, topLeft.y + 1,
        clipboard.width * tilePixels - 2, clipboard.height * tilePixels - 2);
      ctx.setLineDash([]);
    }

    // Draw cursor highlight
    if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 && !lineStateRef.current.active) {
      const screen = tileToScreen(cursorTileRef.current.x, cursorTileRef.current.y, overrideViewport);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
    }

    // Draw selection preview at cursor position for tile-placing tools
    if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 &&
        (currentTool === ToolType.PENCIL || currentTool === ToolType.FILL) &&
        !lineStateRef.current.active) {
      const { width, height } = tileSelection;

      const screenX = Math.floor((cursorTileRef.current.x - vp.x) * tilePixels);
      const screenY = Math.floor((cursorTileRef.current.y - vp.y) * tilePixels);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(screenX, screenY, width * tilePixels, height * tilePixels);
      ctx.setLineDash([]);
    }

    // Draw preview for game object stamp tools (3x3 outline at cursor)
    const stampTools = new Set([ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH]);
    if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 && stampTools.has(currentTool)) {
      const cx = cursorTileRef.current.x;
      const cy = cursorTileRef.current.y;
      const valid = cx - 1 >= 0 && cx + 1 < MAP_WIDTH && cy - 1 >= 0 && cy + 1 < MAP_HEIGHT;
      const screen = tileToScreen(cx - 1, cy - 1, overrideViewport);

      ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, 3 * tilePixels - 2, 3 * tilePixels - 2);

      const centerScreen = tileToScreen(cx, cy, overrideViewport);
      ctx.fillStyle = valid ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 64, 64, 0.2)';
      ctx.fillRect(centerScreen.x, centerScreen.y, tilePixels, tilePixels);
    }

    // Draw single-tile outline for warp tool
    if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 && currentTool === ToolType.WARP) {
      const screen = tileToScreen(cursorTileRef.current.x, cursorTileRef.current.y, overrideViewport);
      ctx.strokeStyle = 'rgba(128, 128, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      ctx.fillStyle = 'rgba(128, 128, 255, 0.2)';
      ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
    }

    // Draw single-tile cursor for wall pencil
    if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 &&
        (currentTool === ToolType.WALL_PENCIL || currentTool === ToolType.WALL_RECT) && !rectDragRef.current.active) {
      const screen = tileToScreen(cursorTileRef.current.x, cursorTileRef.current.y, overrideViewport);
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
    }

    // Draw rectangle outline during drag for rect tools
    if (rectDragRef.current.active) {
      const minX = Math.min(rectDragRef.current.startX, rectDragRef.current.endX);
      const minY = Math.min(rectDragRef.current.startY, rectDragRef.current.endY);
      const maxX = Math.max(rectDragRef.current.startX, rectDragRef.current.endX);
      const maxY = Math.max(rectDragRef.current.startY, rectDragRef.current.endY);
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;

      // Live tile preview for CONVEYOR tool
      if (currentTool === ToolType.CONVEYOR && tilesetImage && w >= 1 && h >= 1) {
        const convDir = gameObjectToolState.conveyorDir;
        let placementDir: number;
        let data: number[] | null = null;
        switch (convDir) {
          case 0: // Left
            placementDir = 0;
            if (convLrData.length > 0 && convLrData[0][0] !== 0) data = convLrData[0];
            break;
          case 1: // Right
            placementDir = 0;
            data = CONV_RIGHT_DATA;
            break;
          case 2: // Up
            placementDir = 1;
            if (convUdData.length > 0 && convUdData[0][0] !== 0) data = convUdData[0];
            break;
          case 3: // Down
            placementDir = 1;
            data = CONV_DOWN_DATA;
            break;
          default:
            placementDir = 0;
            if (convLrData.length > 0 && convLrData[0][0] !== 0) data = convLrData[0];
        }
        if (data) {
          ctx.globalAlpha = 0.7;

          for (let k = 0; k < h; k++) {
            for (let hh = 0; hh < w; hh++) {
              let tile: number | undefined;

              if (placementDir === 1) {
                if (w > 1 && w % 2 !== 0 && hh === w - 1) continue;
                if (k === 0)
                  tile = data[hh % 2];
                else if (k === h - 1)
                  tile = data[hh % 2 + 6];
                else
                  tile = data[(k % 2 + 1) * 2 + hh % 2];
              } else {
                if (h > 1 && h % 2 !== 0 && k === h - 1) continue;
                if (hh === 0)
                  tile = data[(k % 2) * 4];
                else if (hh === w - 1)
                  tile = data[(k % 2) * 4 + 3];
                else
                  tile = data[1 + (k % 2) * 4 + hh % 2];
              }

              if (tile !== undefined) {
                const screenX = Math.floor((minX + hh - vp.x) * tilePixels);
                const screenY = Math.floor((minY + k - vp.y) * tilePixels);

                const isAnim = (tile & 0x8000) !== 0;
                if (isAnim && tilesetImage) {
                  const animId = tile & 0xFF;
                  const frameOffset = (tile >> 8) & 0x7F;
                  const anim = ANIMATION_DEFINITIONS[animId];
                  if (anim && anim.frames.length > 0) {
                    const frameIdx = (animFrameRef.current + frameOffset) % anim.frameCount;
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
        valid = w >= 1 && h >= 1;
      }

      const topLeft = tileToScreen(minX, minY, overrideViewport);
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

    // Draw selection rectangle
    const activeSelection = selectionDragRef.current.active
      ? selectionDragRef.current
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

      const selScreen = tileToScreen(minX, minY, overrideViewport);

      // Static white selection rectangle with black outline for contrast
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);

      // Floating dimension label (skip 1x1 selections)
      if (w > 1 || h > 1) {
        const labelText = `${w}x${h} (${w * h})`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18; // 13px font + padding
        const pad = 4;

        // Default: above-left of selection
        let labelX = selScreen.x;
        let labelY = selScreen.y - pad;

        // Fallback 1: left edge clipped -> move to right side
        if (labelX < 0) {
          labelX = selScreen.x + w * tilePixels;
        }

        // Fallback 2: top edge clipped -> move below selection
        if (labelY - textHeight < 0) {
          labelY = selScreen.y + h * tilePixels + textHeight + pad;
        }

        // Background rectangle for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

        // Text rendering
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      }
    }

    // Ruler overlay (RULER-02: multi-mode)
    if (rulerStateRef.current.active && currentTool === ToolType.RULER) {
      const { startX, startY, endX, endY } = rulerStateRef.current;

      const startScreen = tileToScreen(startX, startY, overrideViewport);
      const endScreen = tileToScreen(endX, endY, overrideViewport);

      // Tile centers
      const startCenterX = startScreen.x + tilePixels / 2;
      const startCenterY = startScreen.y + tilePixels / 2;
      const endCenterX = endScreen.x + tilePixels / 2;
      const endCenterY = endScreen.y + tilePixels / 2;

      // Common styling
      ctx.strokeStyle = '#FFD700'; // Gold
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      if (rulerMode === RulerMode.LINE) {
        // Yellow solid line
        ctx.beginPath();
        ctx.moveTo(startCenterX, startCenterY);
        ctx.lineTo(endCenterX, endCenterY);
        ctx.stroke();

        // Crosshairs at endpoints
        const crosshairSize = 8;
        // Start crosshair
        ctx.beginPath();
        ctx.moveTo(startCenterX - crosshairSize, startCenterY);
        ctx.lineTo(startCenterX + crosshairSize, startCenterY);
        ctx.moveTo(startCenterX, startCenterY - crosshairSize);
        ctx.lineTo(startCenterX, startCenterY + crosshairSize);
        ctx.stroke();
        // End crosshair
        ctx.beginPath();
        ctx.moveTo(endCenterX - crosshairSize, endCenterY);
        ctx.lineTo(endCenterX + crosshairSize, endCenterY);
        ctx.moveTo(endCenterX, endCenterY - crosshairSize);
        ctx.lineTo(endCenterX, endCenterY + crosshairSize);
        ctx.stroke();

        // Floating label at midpoint
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const manhattan = dx + dy;
        const euclidean = Math.hypot(dx, dy);

        const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)})`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18;
        const pad = 4;

        // Midpoint position
        let labelX = (startCenterX + endCenterX) / 2 - textWidth / 2;
        let labelY = (startCenterY + endCenterY) / 2;

        // Edge clipping fallbacks
        if (labelX < 0) labelX = 0;
        if (labelY - textHeight < 0) labelY = textHeight;
        if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
        if (labelY > canvas.height) labelY = canvas.height;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      } else if (rulerMode === RulerMode.RECTANGLE) {
        // Rectangle overlay covering full tile areas
        const minX = Math.min(startX, endX);
        const minY = Math.min(startY, endY);
        const maxX = Math.max(startX, endX);
        const maxY = Math.max(startY, endY);

        const minScreen = tileToScreen(minX, minY, overrideViewport);
        const maxScreen = tileToScreen(maxX, maxY, overrideViewport);

        const rectX = minScreen.x;
        const rectY = minScreen.y;
        const rectW = maxScreen.x + tilePixels - minScreen.x;
        const rectH = maxScreen.y + tilePixels - minScreen.y;

        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // Floating label at center
        const width = Math.abs(endX - startX) + 1;
        const height = Math.abs(endY - startY) + 1;
        const labelText = `Box: ${width}×${height} (${width * height} tiles)`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18;
        const pad = 4;

        let labelX = rectX + rectW / 2 - textWidth / 2;
        let labelY = rectY + rectH / 2;

        // Edge clipping fallbacks
        if (labelX < 0) labelX = 0;
        if (labelY - textHeight < 0) labelY = textHeight;
        if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
        if (labelY > canvas.height) labelY = canvas.height;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      } else if (rulerMode === RulerMode.RADIUS) {
        // Circle overlay
        const radiusPixels = Math.hypot(endCenterX - startCenterX, endCenterY - startCenterY);
        ctx.beginPath();
        ctx.arc(startCenterX, startCenterY, radiusPixels, 0, 2 * Math.PI);
        ctx.stroke();

        // Radius line from center to edge
        ctx.beginPath();
        ctx.moveTo(startCenterX, startCenterY);
        ctx.lineTo(endCenterX, endCenterY);
        ctx.stroke();

        // Crosshair at center
        const crosshairSize = 8;
        ctx.beginPath();
        ctx.moveTo(startCenterX - crosshairSize, startCenterY);
        ctx.lineTo(startCenterX + crosshairSize, startCenterY);
        ctx.moveTo(startCenterX, startCenterY - crosshairSize);
        ctx.lineTo(startCenterX, startCenterY + crosshairSize);
        ctx.stroke();

        // Floating label
        const rdx = endX - startX;
        const rdy = endY - startY;
        const radius = Math.hypot(rdx, rdy);
        const area = Math.PI * radius * radius;
        // Calculate angle from center to edge (standard math convention: 0° = right, 90° = up)
        const ady = startY - endY;
        let angle = Math.atan2(ady, rdx) * 180 / Math.PI;
        if (angle < 0) angle += 360;

        const labelText = `Radius: ${radius.toFixed(2)} (Area: ${area.toFixed(1)}, ${angle.toFixed(1)}°)`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18;
        const pad = 4;

        // Position label near the circle edge
        let labelX = startCenterX + radiusPixels / 2 - textWidth / 2;
        let labelY = startCenterY - radiusPixels / 2;

        // Edge clipping fallbacks
        if (labelX < 0) labelX = 0;
        if (labelY - textHeight < 0) labelY = textHeight;
        if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
        if (labelY > canvas.height) labelY = canvas.height;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      } else if (rulerMode === RulerMode.PATH) {
        // PATH mode: polyline through waypoints + preview segment (RULER-03)
        const waypoints = rulerStateRef.current.waypoints;
        if (waypoints.length > 0) {
          // Draw polyline through waypoints
          ctx.beginPath();
          const firstScreen = tileToScreen(waypoints[0].x, waypoints[0].y, overrideViewport);
          ctx.moveTo(firstScreen.x + tilePixels / 2, firstScreen.y + tilePixels / 2);

          for (let i = 1; i < waypoints.length; i++) {
            const wpScreen = tileToScreen(waypoints[i].x, waypoints[i].y, overrideViewport);
            ctx.lineTo(wpScreen.x + tilePixels / 2, wpScreen.y + tilePixels / 2);
          }

          // Preview segment to cursor
          const previewScreen = tileToScreen(endX, endY, overrideViewport);
          ctx.lineTo(previewScreen.x + tilePixels / 2, previewScreen.y + tilePixels / 2);
          ctx.stroke();

          // Crosshairs at waypoints
          const crosshairSize = 8;
          for (const wp of waypoints) {
            const wpScreen = tileToScreen(wp.x, wp.y, overrideViewport);
            const wpCenterX = wpScreen.x + tilePixels / 2;
            const wpCenterY = wpScreen.y + tilePixels / 2;
            ctx.beginPath();
            ctx.moveTo(wpCenterX - crosshairSize, wpCenterY);
            ctx.lineTo(wpCenterX + crosshairSize, wpCenterY);
            ctx.moveTo(wpCenterX, wpCenterY - crosshairSize);
            ctx.lineTo(wpCenterX, wpCenterY + crosshairSize);
            ctx.stroke();
          }

          // Floating label
          const currentMeasurement = useEditorStore.getState().rulerMeasurement;
          const currentAngle = currentMeasurement?.segmentAngles?.length
            ? currentMeasurement.segmentAngles[currentMeasurement.segmentAngles.length - 1]
            : null;
          const angleStr = currentAngle !== null ? `, ${currentAngle.toFixed(1)}°` : '';
          const labelText = `Path: ${waypoints.length}pts, Dist: ${(currentMeasurement?.totalDistance ?? 0).toFixed(2)}${angleStr}`;
          ctx.font = '13px sans-serif';
          const metrics = ctx.measureText(labelText);
          const textWidth = metrics.width;
          const textHeight = 18;
          const pad = 4;

          // Position near cursor
          let labelX = previewScreen.x + tilePixels + 10;
          let labelY = previewScreen.y;

          // Edge clipping fallbacks
          if (labelX + textWidth > canvas.width) labelX = previewScreen.x - textWidth - 10;
          if (labelY - textHeight < 0) labelY = textHeight;
          if (labelY > canvas.height) labelY = canvas.height;

          // Background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

          // Text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(labelText, labelX, labelY);
        }
      }
    }

    // Render completed measurements when not actively dragging
    const rulerMeasurement = useEditorStore.getState().rulerMeasurement;
    if (!rulerStateRef.current.active && rulerMeasurement && currentTool === ToolType.RULER) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      if (rulerMeasurement.mode === RulerMode.LINE) {
        const startScreen = tileToScreen(rulerMeasurement.startX, rulerMeasurement.startY, overrideViewport);
        const endScreen = tileToScreen(rulerMeasurement.endX, rulerMeasurement.endY, overrideViewport);
        const startCX = startScreen.x + tilePixels / 2;
        const startCY = startScreen.y + tilePixels / 2;
        const endCX = endScreen.x + tilePixels / 2;
        const endCY = endScreen.y + tilePixels / 2;

        ctx.beginPath();
        ctx.moveTo(startCX, startCY);
        ctx.lineTo(endCX, endCY);
        ctx.stroke();

        const crosshairSize = 8;
        ctx.beginPath();
        ctx.moveTo(startCX - crosshairSize, startCY);
        ctx.lineTo(startCX + crosshairSize, startCY);
        ctx.moveTo(startCX, startCY - crosshairSize);
        ctx.lineTo(startCX, startCY + crosshairSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(endCX - crosshairSize, endCY);
        ctx.lineTo(endCX + crosshairSize, endCY);
        ctx.moveTo(endCX, endCY - crosshairSize);
        ctx.lineTo(endCX, endCY + crosshairSize);
        ctx.stroke();

        const dx = Math.abs(rulerMeasurement.endX - rulerMeasurement.startX);
        const dy = Math.abs(rulerMeasurement.endY - rulerMeasurement.startY);
        const manhattan = dx + dy;
        const euclidean = Math.hypot(dx, dy);

        const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)})`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18;
        const pad = 4;
        let labelX = (startCX + endCX) / 2 - textWidth / 2;
        let labelY = (startCY + endCY) / 2;
        if (labelX < 0) labelX = 0;
        if (labelY - textHeight < 0) labelY = textHeight;
        if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
        if (labelY > canvas.height) labelY = canvas.height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      } else if (rulerMeasurement.mode === RulerMode.RECTANGLE) {
        const minX = Math.min(rulerMeasurement.startX, rulerMeasurement.endX);
        const minY = Math.min(rulerMeasurement.startY, rulerMeasurement.endY);
        const maxX = Math.max(rulerMeasurement.startX, rulerMeasurement.endX);
        const maxY = Math.max(rulerMeasurement.startY, rulerMeasurement.endY);
        const minScreen = tileToScreen(minX, minY, overrideViewport);
        const maxScreen = tileToScreen(maxX, maxY, overrideViewport);
        const rectX = minScreen.x;
        const rectY = minScreen.y;
        const rectW = maxScreen.x + tilePixels - minScreen.x;
        const rectH = maxScreen.y + tilePixels - minScreen.y;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        const width = Math.abs(rulerMeasurement.endX - rulerMeasurement.startX) + 1;
        const height = Math.abs(rulerMeasurement.endY - rulerMeasurement.startY) + 1;
        const labelText = `Box: ${width}×${height} (${width * height} tiles)`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18;
        const pad = 4;
        let labelX = rectX + rectW / 2 - textWidth / 2;
        let labelY = rectY + rectH / 2;
        if (labelX < 0) labelX = 0;
        if (labelY - textHeight < 0) labelY = textHeight;
        if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
        if (labelY > canvas.height) labelY = canvas.height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      } else if (rulerMeasurement.mode === RulerMode.RADIUS) {
        const startScreen = tileToScreen(rulerMeasurement.startX, rulerMeasurement.startY, overrideViewport);
        const endScreen = tileToScreen(rulerMeasurement.endX, rulerMeasurement.endY, overrideViewport);
        const startCX = startScreen.x + tilePixels / 2;
        const startCY = startScreen.y + tilePixels / 2;
        const endCX = endScreen.x + tilePixels / 2;
        const endCY = endScreen.y + tilePixels / 2;
        const radiusPixels = Math.hypot(endCX - startCX, endCY - startCY);
        ctx.beginPath();
        ctx.arc(startCX, startCY, radiusPixels, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startCX, startCY);
        ctx.lineTo(endCX, endCY);
        ctx.stroke();
        const crosshairSize = 8;
        ctx.beginPath();
        ctx.moveTo(startCX - crosshairSize, startCY);
        ctx.lineTo(startCX + crosshairSize, startCY);
        ctx.moveTo(startCX, startCY - crosshairSize);
        ctx.lineTo(startCX, startCY + crosshairSize);
        ctx.stroke();

        const rdx = rulerMeasurement.endX - rulerMeasurement.startX;
        const rdy = rulerMeasurement.endY - rulerMeasurement.startY;
        const radius = Math.hypot(rdx, rdy);
        const area = Math.PI * radius * radius;
        const ady = rulerMeasurement.startY - rulerMeasurement.endY;
        let angle = Math.atan2(ady, rdx) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        const labelText = `Radius: ${radius.toFixed(2)} (Area: ${area.toFixed(1)}, ${angle.toFixed(1)}°)`;
        ctx.font = '13px sans-serif';
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width;
        const textHeight = 18;
        const pad = 4;
        let labelX = startCX + radiusPixels / 2 - textWidth / 2;
        let labelY = startCY - radiusPixels / 2;
        if (labelX < 0) labelX = 0;
        if (labelY - textHeight < 0) labelY = textHeight;
        if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
        if (labelY > canvas.height) labelY = canvas.height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, labelX, labelY);
      }
    }

    // Render completed path when not actively dragging (RULER-03)
    if (!rulerStateRef.current.active && rulerMeasurement?.mode === RulerMode.PATH && rulerMeasurement.waypoints && rulerMeasurement.waypoints.length > 0) {
      const waypoints = rulerMeasurement.waypoints;

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Draw polyline through waypoints (no preview segment)
      ctx.beginPath();
      const firstScreen = tileToScreen(waypoints[0].x, waypoints[0].y, overrideViewport);
      ctx.moveTo(firstScreen.x + tilePixels / 2, firstScreen.y + tilePixels / 2);

      for (let i = 1; i < waypoints.length; i++) {
        const wpScreen = tileToScreen(waypoints[i].x, waypoints[i].y, overrideViewport);
        ctx.lineTo(wpScreen.x + tilePixels / 2, wpScreen.y + tilePixels / 2);
      }
      ctx.stroke();

      // Crosshairs at waypoints
      const crosshairSize = 8;
      for (const wp of waypoints) {
        const wpScreen = tileToScreen(wp.x, wp.y, overrideViewport);
        const wpCenterX = wpScreen.x + tilePixels / 2;
        const wpCenterY = wpScreen.y + tilePixels / 2;
        ctx.beginPath();
        ctx.moveTo(wpCenterX - crosshairSize, wpCenterY);
        ctx.lineTo(wpCenterX + crosshairSize, wpCenterY);
        ctx.moveTo(wpCenterX, wpCenterY - crosshairSize);
        ctx.lineTo(wpCenterX, wpCenterY + crosshairSize);
        ctx.stroke();
      }

      // Floating label
      const lastWp = waypoints[waypoints.length - 1];
      const lastScreen = tileToScreen(lastWp.x, lastWp.y, overrideViewport);
      const segCount = rulerMeasurement.segmentAngles?.length ?? 0;
      const segStr = segCount > 0 ? `, ${segCount} segs` : '';
      const labelText = `Path: ${waypoints.length}pts, Dist: ${(rulerMeasurement.totalDistance ?? 0).toFixed(2)}${segStr}`;
      ctx.font = '13px sans-serif';
      const metrics = ctx.measureText(labelText);
      const textWidth = metrics.width;
      const textHeight = 18;
      const pad = 4;

      let labelX = lastScreen.x + tilePixels + 10;
      let labelY = lastScreen.y;

      if (labelX + textWidth > canvas.width) labelX = lastScreen.x - textWidth - 10;
      if (labelY - textHeight < 0) labelY = textHeight;
      if (labelY > canvas.height) labelY = canvas.height;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(labelText, labelX, labelY);
    }

    // Render pinned measurements (RULER-05)
    const pinnedMeasurements = useEditorStore.getState().pinnedMeasurements;
    for (const pinned of pinnedMeasurements) {
      if (!pinned.visible) continue;
      const m = pinned.measurement;

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);

      if (m.mode === RulerMode.LINE) {
        // Line mode: draw line with crosshairs
        const startScreen = tileToScreen(m.startX, m.startY, overrideViewport);
        const endScreen = tileToScreen(m.endX, m.endY, overrideViewport);
        const startCenterX = startScreen.x + tilePixels / 2;
        const startCenterY = startScreen.y + tilePixels / 2;
        const endCenterX = endScreen.x + tilePixels / 2;
        const endCenterY = endScreen.y + tilePixels / 2;

        ctx.beginPath();
        ctx.moveTo(startCenterX, startCenterY);
        ctx.lineTo(endCenterX, endCenterY);
        ctx.stroke();

        // Crosshairs
        const crosshairSize = 8;
        ctx.beginPath();
        ctx.moveTo(startCenterX - crosshairSize, startCenterY);
        ctx.lineTo(startCenterX + crosshairSize, startCenterY);
        ctx.moveTo(startCenterX, startCenterY - crosshairSize);
        ctx.lineTo(startCenterX, startCenterY + crosshairSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(endCenterX - crosshairSize, endCenterY);
        ctx.lineTo(endCenterX + crosshairSize, endCenterY);
        ctx.moveTo(endCenterX, endCenterY - crosshairSize);
        ctx.lineTo(endCenterX, endCenterY + crosshairSize);
        ctx.stroke();
      } else if (m.mode === RulerMode.RECTANGLE) {
        // Rectangle mode
        const minX = Math.min(m.startX, m.endX);
        const minY = Math.min(m.startY, m.endY);
        const maxX = Math.max(m.startX, m.endX);
        const maxY = Math.max(m.startY, m.endY);

        const minScreen = tileToScreen(minX, minY, overrideViewport);
        const maxScreen = tileToScreen(maxX, maxY, overrideViewport);

        const rectW = maxScreen.x + tilePixels - minScreen.x;
        const rectH = maxScreen.y + tilePixels - minScreen.y;

        ctx.strokeRect(minScreen.x, minScreen.y, rectW, rectH);
      } else if (m.mode === RulerMode.RADIUS) {
        // Radius mode: circle + radius line + crosshair
        const centerScreen = tileToScreen(m.startX, m.startY, overrideViewport);
        const edgeScreen = tileToScreen(m.endX, m.endY, overrideViewport);
        const centerX = centerScreen.x + tilePixels / 2;
        const centerY = centerScreen.y + tilePixels / 2;
        const edgeX = edgeScreen.x + tilePixels / 2;
        const edgeY = edgeScreen.y + tilePixels / 2;
        const radiusPixels = Math.hypot(edgeX - centerX, edgeY - centerY);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusPixels, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(edgeX, edgeY);
        ctx.stroke();

        const crosshairSize = 8;
        ctx.beginPath();
        ctx.moveTo(centerX - crosshairSize, centerY);
        ctx.lineTo(centerX + crosshairSize, centerY);
        ctx.moveTo(centerX, centerY - crosshairSize);
        ctx.lineTo(centerX, centerY + crosshairSize);
        ctx.stroke();
      } else if (m.mode === RulerMode.PATH && m.waypoints && m.waypoints.length > 0) {
        // Path mode: polyline through waypoints
        const waypoints = m.waypoints;
        ctx.beginPath();
        const firstScreen = tileToScreen(waypoints[0].x, waypoints[0].y, overrideViewport);
        ctx.moveTo(firstScreen.x + tilePixels / 2, firstScreen.y + tilePixels / 2);

        for (let i = 1; i < waypoints.length; i++) {
          const wpScreen = tileToScreen(waypoints[i].x, waypoints[i].y, overrideViewport);
          ctx.lineTo(wpScreen.x + tilePixels / 2, wpScreen.y + tilePixels / 2);
        }
        ctx.stroke();

        // Crosshairs at waypoints
        const crosshairSize = 8;
        for (const wp of waypoints) {
          const wpScreen = tileToScreen(wp.x, wp.y, overrideViewport);
          const wpCenterX = wpScreen.x + tilePixels / 2;
          const wpCenterY = wpScreen.y + tilePixels / 2;
          ctx.beginPath();
          ctx.moveTo(wpCenterX - crosshairSize, wpCenterY);
          ctx.lineTo(wpCenterX + crosshairSize, wpCenterY);
          ctx.moveTo(wpCenterX, wpCenterY - crosshairSize);
          ctx.lineTo(wpCenterX, wpCenterY + crosshairSize);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
    }
  }, [currentTool, tileSelection, gameObjectToolState, selection, viewport, tilesetImage, isPasting, clipboard, showGrid, gridOpacity, gridLineWeight, gridColor, rulerMode, getLineTiles, tileToScreen]);

  // RAF-debounced UI redraw (for ref-based transient state)
  const requestUiRedraw = useCallback(() => {
    uiDirtyRef.current = true;
    if (uiRafIdRef.current !== null) return;
    uiRafIdRef.current = requestAnimationFrame(() => {
      uiRafIdRef.current = null;
      if (uiDirtyRef.current) {
        uiDirtyRef.current = false;
        drawUiLayer();
      }
    });
  }, [drawUiLayer]);


  // Commit pan: viewport already updated during drag, just cleanup refs
  const commitPan = useCallback(() => {
    // Viewport already committed during drag (no deferred commit needed)
    // Just clean up drag state
    panStartRef.current = null;
    panDeltaRef.current = null;
  }, []);

  // Keep stable refs in sync with latest draw functions
  drawMapLayerRef.current = drawMapLayer;
  drawUiLayerRef.current = drawUiLayer;

  // Layer-specific render triggers
  useEffect(() => {
    drawUiLayer();
  }, [drawUiLayer]);

  // Redraw UI overlay when animation ticks affect visible overlays (paste/conveyor/selection)
  useEffect(() => {
    if (selection?.active || (isPasting && clipboard) ||
        (rectDragRef.current?.active && currentTool === ToolType.CONVEYOR)) {
      drawUiLayer();
    }
  }, [animationFrame, selection, isPasting, clipboard, currentTool, drawUiLayer]);

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
    const canvas = uiLayerRef.current;
    if (!canvas) return { thumbWidth: 20, thumbHeight: 20, thumbLeft: 10, thumbTop: 10 };

    // During pan drag, compute temporary viewport from panStartRef + panDeltaRef
    let effectiveViewport = viewport;
    if (isDragging && panStartRef.current && panDeltaRef.current) {
      const { dx, dy } = panDeltaRef.current;
      const tilePixels = TILE_SIZE * panStartRef.current.viewportZoom;
      const vTilesX = canvas.width / tilePixels;
      const vTilesY = canvas.height / tilePixels;
      const maxOX = Math.max(0, MAP_WIDTH - vTilesX);
      const maxOY = Math.max(0, MAP_HEIGHT - vTilesY);
      effectiveViewport = {
        x: Math.max(0, Math.min(maxOX, panStartRef.current.viewportX - dx / tilePixels)),
        y: Math.max(0, Math.min(maxOY, panStartRef.current.viewportY - dy / tilePixels)),
        zoom: panStartRef.current.viewportZoom
      };
    }

    const tilePixels = TILE_SIZE * effectiveViewport.zoom;
    const visibleTilesX = canvas.width / tilePixels;
    const visibleTilesY = canvas.height / tilePixels;

    // Maximum scrollable offset (0 when viewport covers entire map)
    const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
    const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

    // Track size in pixels (track element size minus two 10px arrow buttons)
    // Horizontal track: canvas.width - 10px (vertical scrollbar width) - 20px (arrows)
    // Vertical track: canvas.height - 10px (horizontal scrollbar height) - 20px (arrows)
    const trackWidthPx = canvas.width - 10 - 20;
    const trackHeightPx = canvas.height - 10 - 20;

    // Thumb size: proportional to viewport-to-map ratio, minimum 20px
    const thumbWidthPx = Math.max(20, (visibleTilesX / MAP_WIDTH) * trackWidthPx);
    const thumbHeightPx = Math.max(20, (visibleTilesY / MAP_HEIGHT) * trackHeightPx);

    // Scrollable range: track minus thumb (space available for thumb movement)
    const scrollableRangeX = trackWidthPx - thumbWidthPx;
    const scrollableRangeY = trackHeightPx - thumbHeightPx;

    // Thumb position: (offset / maxOffset) * scrollableRange + arrow offset
    const thumbLeftPx = maxOffsetX > 0
      ? (effectiveViewport.x / maxOffsetX) * scrollableRangeX + 10
      : 10;
    const thumbTopPx = maxOffsetY > 0
      ? (effectiveViewport.y / maxOffsetY) * scrollableRangeY + 10
      : 10;

    return {
      thumbWidth: thumbWidthPx,
      thumbHeight: thumbHeightPx,
      thumbLeft: thumbLeftPx,
      thumbTop: thumbTopPx
    };
  }, [viewport, isDragging]);

  const scrollByTiles = useCallback((direction: 'up' | 'down' | 'left' | 'right', tiles: number) => {
    const canvas = uiLayerRef.current;
    if (!canvas) return;

    const tilePixels = TILE_SIZE * viewport.zoom;
    const visibleTilesX = canvas.width / tilePixels;
    const visibleTilesY = canvas.height / tilePixels;
    const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
    const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

    switch (direction) {
      case 'up':
        setViewport({ y: Math.max(0, Math.min(maxOffsetY, viewport.y - tiles)) });
        break;
      case 'down':
        setViewport({ y: Math.max(0, Math.min(maxOffsetY, viewport.y + tiles)) });
        break;
      case 'left':
        setViewport({ x: Math.max(0, Math.min(maxOffsetX, viewport.x - tiles)) });
        break;
      case 'right':
        setViewport({ x: Math.max(0, Math.min(maxOffsetX, viewport.x + tiles)) });
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

    const canvas = uiLayerRef.current;
    if (!canvas) return;

    const tilePixels = TILE_SIZE * viewport.zoom;

    if (axis === 'h') {
      const visibleTiles = Math.floor(canvas.width / tilePixels);
      const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTiles);
      const trackRect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - trackRect.left;
      const trackWidthPx = trackRect.width - 20;
      const thumbWidthPx = Math.max(20, (visibleTiles / MAP_WIDTH) * trackWidthPx);
      const scrollableRangeX = trackWidthPx - thumbWidthPx;
      const thumbLeft = maxOffsetX > 0 ? (viewport.x / maxOffsetX) * scrollableRangeX : 0;

      if (clickX < thumbLeft + 10) { // Click left of thumb (account for left arrow)
        setViewport({ x: Math.max(0, viewport.x - visibleTiles) });
      } else {
        setViewport({ x: Math.min(maxOffsetX, viewport.x + visibleTiles) });
      }
    } else {
      const visibleTiles = Math.floor(canvas.height / tilePixels);
      const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTiles);
      const trackRect = event.currentTarget.getBoundingClientRect();
      const clickY = event.clientY - trackRect.top;
      const trackHeightPx = trackRect.height - 20;
      const thumbHeightPx = Math.max(20, (visibleTiles / MAP_HEIGHT) * trackHeightPx);
      const scrollableRangeY = trackHeightPx - thumbHeightPx;
      const thumbTop = maxOffsetY > 0 ? (viewport.y / maxOffsetY) * scrollableRangeY : 0;

      if (clickY < thumbTop + 10) { // Click above thumb (account for top arrow)
        setViewport({ y: Math.max(0, viewport.y - visibleTiles) });
      } else {
        setViewport({ y: Math.min(maxOffsetY, viewport.y + visibleTiles) });
      }
    }
  }, [viewport, setViewport]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Ensure this document is active before any action
    if (documentId) {
      const store = useEditorStore.getState();
      if (store.activeDocumentId !== documentId) {
        store.setActiveDocument(documentId);
      }
    }

    const rect = uiLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);

    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      // Middle click, right-click, or Alt+click - pan
      setIsDragging(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        viewportX: viewport.x,
        viewportY: viewport.y,
        viewportZoom: viewport.zoom
      };
    } else if (e.button === 0) {
      // Left click - commit paste if in paste mode
      if (isPasting && !e.altKey) {
        pasteAt(x, y);
        return;
      }

      // Left click - use tool
      if (currentTool === ToolType.RULER) {
        // PATH mode: click-to-add waypoints (RULER-03)
        if (rulerMode === RulerMode.PATH && e.button === 0) {
          // Double-click detection: finalize path
          if (e.detail === 2 && rulerStateRef.current.active) {
            // Guard: need at least 2 waypoints for meaningful measurement
            if (rulerStateRef.current.waypoints.length >= 2) {
              rulerStateRef.current.active = false;
              // Auto-pin to notepad
              pinMeasurement();
              setRulerMeasurement(null);
              rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
              requestUiRedraw();
            }
            return; // Consume double-click
          }

          // Single click: add waypoint
          if (!rulerStateRef.current.active) {
            // Start new path
            rulerStateRef.current = {
              active: true,
              startX: x,
              startY: y,
              endX: x,
              endY: y,
              waypoints: [{ x, y }]
            };
          } else {
            // Add waypoint to existing path
            rulerStateRef.current.waypoints.push({ x, y });
            rulerStateRef.current.endX = x;
            rulerStateRef.current.endY = y;
          }
          requestUiRedraw();
          return; // Don't fall through to drag-based modes
        }

        // Drag-based modes (LINE, RECTANGLE, RADIUS)
        if (rulerStateRef.current.active) {
          // Second click: finalize click-click measurement
          rulerStateRef.current.endX = x;
          rulerStateRef.current.endY = y;
          // Commit final measurement to Zustand
          const prev = rulerStateRef.current;
          if (rulerMode === RulerMode.LINE) {
            const dx = Math.abs(x - prev.startX);
            const dy = Math.abs(y - prev.startY);
            setRulerMeasurement({
              mode: RulerMode.LINE, dx, dy, manhattan: dx + dy, euclidean: Math.hypot(dx, dy),
              startX: prev.startX, startY: prev.startY, endX: x, endY: y
            });
          } else if (rulerMode === RulerMode.RECTANGLE) {
            const width = Math.abs(x - prev.startX) + 1;
            const height = Math.abs(y - prev.startY) + 1;
            setRulerMeasurement({
              mode: RulerMode.RECTANGLE, width, height, tileCount: width * height,
              startX: prev.startX, startY: prev.startY, endX: x, endY: y
            });
          } else if (rulerMode === RulerMode.RADIUS) {
            const rdx = x - prev.startX;
            const rdy = y - prev.startY;
            const radius = Math.hypot(rdx, rdy);
            // Calculate angle from center to edge (standard math convention: 0° = right, 90° = up)
            const ady = prev.startY - y;
            let angle = Math.atan2(ady, rdx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            setRulerMeasurement({
              mode: RulerMode.RADIUS, centerX: prev.startX, centerY: prev.startY, radius, area: Math.PI * radius * radius, angle,
              startX: prev.startX, startY: prev.startY, endX: x, endY: y
            });
          }
          rulerStateRef.current.active = false;
          // Auto-pin to notepad
          pinMeasurement();
          setRulerMeasurement(null);
          rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
          requestUiRedraw();
        } else {
          // First click or new measurement: set start point
          setRulerMeasurement(null);
          rulerStateRef.current = {
            active: true,
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            waypoints: []
          };
          requestUiRedraw();
        }
      } else if (currentTool === ToolType.WALL || currentTool === ToolType.LINE) {
        // Start line drawing
        lineStateRef.current = {
          active: true,
          startX: x,
          startY: y,
          endX: x,
          endY: y
        };
        requestUiRedraw();
      } else if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
                 currentTool === ToolType.SWITCH) {
        // Click-to-stamp game object tools (always 3x3) - center on cursor
        pushUndo();
        placeGameObject(x - 1, y - 1);
        commitUndo('Place game object');
      } else if (currentTool === ToolType.SPAWN) {
        // Spawn: static is 3x3 (offset), animated is single tile (no offset)
        const { spawnVariant } = useEditorStore.getState().gameObjectToolState;
        pushUndo();
        if (spawnVariant === 1) {
          placeGameObject(x, y);  // Animated spawn = single tile
        } else {
          placeGameObject(x - 1, y - 1);  // Static spawn = 3x3, center on cursor
        }
        commitUndo('Place game object');
      } else if (currentTool === ToolType.WARP) {
        // Warp: single is 1 tile (no offset), animated is 3x3 (offset)
        const { warpVariant } = useEditorStore.getState().gameObjectToolState;
        pushUndo();
        if (warpVariant === 1) {
          placeGameObject(x - 1, y - 1);  // Animated warp = 3x3, center on cursor
        } else {
          placeGameObject(x, y);  // Single warp = 1 tile, no offset
        }
        commitUndo('Place game object');
      } else if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
                 currentTool === ToolType.BRIDGE || currentTool === ToolType.CONVEYOR ||
                 currentTool === ToolType.WALL_RECT) {
        // Drag-to-rectangle tools - start rect drag
        rectDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
        requestUiRedraw();
      } else if (currentTool === ToolType.WALL_PENCIL) {
        // Wall pencil - freehand wall drawing
        pushUndo();
        placeWall(x, y);
        setIsDrawingWallPencil(true);
        setLastWallPencilPos({ x, y });
      } else if (currentTool === ToolType.SELECT) {
        // Clear any existing selection and start new drag
        clearSelection();
        selectionDragRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
        requestUiRedraw();
      } else if (currentTool === ToolType.FILL) {
        // Fill is instant (not a drag operation)
        pushUndo();
        handleToolAction(x, y);
        commitUndo('Fill area');
      } else if (currentTool === ToolType.PENCIL) {
        // Pencil - start engine drag operation
        pushUndo();
        engineRef.current?.beginDrag();
        // Paint first tile (single or multi-tile stamp)
        paintPencilTile(x, y);
      } else if (currentTool === ToolType.PICKER) {
        // Picker tool action (no drag)
        handleToolAction(x, y);
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = uiLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    // Only update cursor state if tile actually changed (avoids spurious re-renders)
    const prevCursor = cursorTileRef.current;
    if (prevCursor.x !== x || prevCursor.y !== y) {
      cursorTileRef.current = { x, y };
      requestUiRedraw();
    }
    onCursorMove?.(x, y);

    // Update paste preview position when in paste mode
    if (isPasting) {
      pastePreviewRef.current = { x, y };
      requestUiRedraw();
    }

    if (isDragging && panStartRef.current) {
      // Calculate new viewport from mouse delta
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      const tilePixels = TILE_SIZE * panStartRef.current.viewportZoom;

      const canvas = uiLayerRef.current;
      const visibleTilesX = canvas ? canvas.width / tilePixels : 10;
      const visibleTilesY = canvas ? canvas.height / tilePixels : 10;
      const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
      const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

      const newX = Math.max(0, Math.min(maxOffsetX, panStartRef.current.viewportX - dx / tilePixels));
      const newY = Math.max(0, Math.min(maxOffsetY, panStartRef.current.viewportY - dy / tilePixels));

      // Immediate viewport commit (triggers CanvasEngine subscription → blitToScreen)
      setViewport({ x: newX, y: newY });

      // RAF-debounce UI overlay redraw (grid, ruler, cursor only)
      requestUiRedraw();
      return;
    } else if (rulerStateRef.current.active) {
      // PATH mode: update preview segment (RULER-03)
      if (rulerMode === RulerMode.PATH) {
        const prev = rulerStateRef.current;
        if (prev.endX !== x || prev.endY !== y) {
          rulerStateRef.current = { ...prev, endX: x, endY: y };

          // Calculate cumulative distance through all waypoints + preview segment
          let totalDistance = 0;
          const waypoints = prev.waypoints;
          const segmentAngles: number[] = [];
          for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            totalDistance += Math.hypot(dx, dy);
            // Calculate angle for this segment
            const ady = waypoints[i - 1].y - waypoints[i].y;
            let angle = Math.atan2(ady, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            segmentAngles.push(angle);
          }
          // Add preview segment from last waypoint to cursor
          if (waypoints.length > 0) {
            const last = waypoints[waypoints.length - 1];
            const dx = x - last.x;
            const dy = y - last.y;
            totalDistance += Math.hypot(dx, dy);
            // Calculate angle for preview segment
            const ady = last.y - y;
            let angle = Math.atan2(ady, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            segmentAngles.push(angle);
          }

          setRulerMeasurement({
            mode: RulerMode.PATH,
            waypoints: [...waypoints],
            totalDistance,
            segmentAngles,
            startX: prev.startX,
            startY: prev.startY,
            endX: x,
            endY: y
          });

          requestUiRedraw();
        }
      } else {
        // Drag-based modes: Update ruler end position and measurement (RULER-02: multi-mode)
        const prev = rulerStateRef.current;
        if (prev.endX !== x || prev.endY !== y) {
          rulerStateRef.current = { ...prev, endX: x, endY: y };

          if (rulerMode === RulerMode.LINE) {
            const dx = Math.abs(x - prev.startX);
            const dy = Math.abs(y - prev.startY);
            const manhattan = dx + dy;
            const euclidean = Math.hypot(dx, dy);
            setRulerMeasurement({
              mode: RulerMode.LINE,
              dx, dy, manhattan, euclidean,
              startX: prev.startX, startY: prev.startY, endX: x, endY: y
            });
          } else if (rulerMode === RulerMode.RECTANGLE) {
            // +1 for inclusive tile counting: dragging from tile 2 to tile 5 spans 4 tiles
            const width = Math.abs(x - prev.startX) + 1;
            const height = Math.abs(y - prev.startY) + 1;
            setRulerMeasurement({
              mode: RulerMode.RECTANGLE,
              width, height, tileCount: width * height,
              startX: prev.startX, startY: prev.startY, endX: x, endY: y
            });
          } else if (rulerMode === RulerMode.RADIUS) {
            const rdx = x - prev.startX;
            const rdy = y - prev.startY;
            const radius = Math.hypot(rdx, rdy);
            const area = Math.PI * radius * radius;
            // Calculate angle from center to edge (standard math convention: 0° = right, 90° = up)
            const ady = prev.startY - y;
            let angle = Math.atan2(ady, rdx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            setRulerMeasurement({
              mode: RulerMode.RADIUS,
              centerX: prev.startX, centerY: prev.startY,
              radius, area, angle,
              startX: prev.startX, startY: prev.startY, endX: x, endY: y
            });
          }

          requestUiRedraw();
        }
      }
    } else if (lineStateRef.current.active) {
      // Update line end position
      const prevLine = lineStateRef.current;
      if (prevLine.endX !== x || prevLine.endY !== y) {
        lineStateRef.current = { ...prevLine, endX: x, endY: y };
        requestUiRedraw();
      }
    } else if (rectDragRef.current.active) {
      const prevRect = rectDragRef.current;
      if (prevRect.endX !== x || prevRect.endY !== y) {
        rectDragRef.current = { ...prevRect, endX: x, endY: y };
        requestUiRedraw();
      }
    } else if (selectionDragRef.current.active) {
      const prevSel = selectionDragRef.current;
      if (prevSel.endX !== x || prevSel.endY !== y) {
        selectionDragRef.current = { ...prevSel, endX: x, endY: y };
        requestUiRedraw();
      }
    } else if (isDrawingWallPencil && e.buttons === 1) {
      // Wall pencil: Zustand per-move is intentional — placeWall reads neighbors (TOOL-02)
      if (x !== lastWallPencilPos.x || y !== lastWallPencilPos.y) {
        placeWall(x, y);
        setLastWallPencilPos({ x, y });
      }
    } else if (e.buttons === 1 && !e.altKey && currentTool === ToolType.PENCIL) {
      // Pencil drag: paint tile via engine (zero React re-renders)
      paintPencilTile(x, y);
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent) => {
    // Commit pan before anything else
    if (isDragging && panStartRef.current) {
      commitPan();
    }

    if (selectionDragRef.current.active) {
      // Only create selection if user actually dragged (not just clicked)
      const minX = Math.min(selectionDragRef.current.startX, selectionDragRef.current.endX);
      const minY = Math.min(selectionDragRef.current.startY, selectionDragRef.current.endY);
      const maxX = Math.max(selectionDragRef.current.startX, selectionDragRef.current.endX);
      const maxY = Math.max(selectionDragRef.current.startY, selectionDragRef.current.endY);

      if (minX !== maxX || minY !== maxY) {
        // Commit normalized coordinates to Zustand store
        setSelection({ startX: minX, startY: minY, endX: maxX, endY: maxY, active: true });
      }
      selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedraw();
    }

    setIsDragging(false);

    if (lineStateRef.current.active) {
      // Complete line drawing
      const lineTiles = getLineTiles(
        lineStateRef.current.startX, lineStateRef.current.startY,
        lineStateRef.current.endX, lineStateRef.current.endY
      );

      pushUndo();

      if (currentTool === ToolType.WALL) {
        if (!map) return;
        const validTiles = lineTiles.filter(t =>
          t.x >= 0 && t.x < MAP_WIDTH && t.y >= 0 && t.y < MAP_HEIGHT
        );
        wallSystem.placeWallBatch(map, validTiles);
        markModified();
      } else if (currentTool === ToolType.LINE) {
        for (const tile of lineTiles) {
          if (tile.x >= 0 && tile.x < MAP_WIDTH && tile.y >= 0 && tile.y < MAP_HEIGHT) {
            setTile(tile.x, tile.y, selectedTile);
          }
        }
      }

      commitUndo('Draw line');
      lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedraw();
    }

    // Complete rect drag
    if (rectDragRef.current.active) {
      pushUndo();
      placeGameObjectRect(rectDragRef.current.startX, rectDragRef.current.startY,
                          rectDragRef.current.endX, rectDragRef.current.endY);
      commitUndo('Place game object');
      rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedraw();
    }

    // Finalize drag-based ruler measurement on mouseup (keep overlay visible)
    if (rulerStateRef.current.active && currentTool === ToolType.RULER &&
        rulerMode !== RulerMode.PATH) {
      const { startX: sx, startY: sy, endX: ex, endY: ey } = rulerStateRef.current;
      // Only finalize if user actually dragged (not a click-to-set-start)
      if (sx !== ex || sy !== ey) {
        rulerStateRef.current.active = false;
        // Auto-pin to notepad
        pinMeasurement();
        setRulerMeasurement(null);
        rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
        requestUiRedraw();
      }
    }

    // End wall pencil drawing
    if (isDrawingWallPencil) {
      commitUndo('Draw walls');
      setIsDrawingWallPencil(false);
      setLastWallPencilPos({ x: -1, y: -1 });
    }

    // Commit pencil drag via engine
    if (currentTool === ToolType.PENCIL && engineRef.current?.getIsDragActive()) {
      const tiles = engineRef.current.commitDrag();
      if (tiles && tiles.length > 0) {
        setTiles(tiles);
        commitUndo('Edit tiles');
      } else {
        commitUndo('Edit tiles'); // Empty undo snapshot, will be discarded
      }
    }

    setIsDragging(false);
  };

  // Handle mouse leave
  const handleMouseLeave = (e: React.MouseEvent) => {
    // Commit pan if active
    if (isDragging && panStartRef.current) {
      commitPan();
    }

    // Commit any pending undo operations before leaving
    if (isDrawingWallPencil) {
      commitUndo('Draw walls');
      setIsDrawingWallPencil(false);
      setLastWallPencilPos({ x: -1, y: -1 });
    }

    // Commit pencil drag if active
    if (currentTool === ToolType.PENCIL && engineRef.current?.getIsDragActive()) {
      const tiles = engineRef.current.commitDrag();
      if (tiles && tiles.length > 0) {
        setTiles(tiles);
        commitUndo('Edit tiles');
      } else {
        commitUndo('Edit tiles');
      }
    }

    setIsDragging(false);
    cursorTileRef.current = { x: -1, y: -1 };
    requestUiRedraw();
    onCursorMove?.(-1, -1);
    if (lineStateRef.current.active) {
      lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedraw();
    }
    if (rectDragRef.current.active) {
      rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedraw();
    }
    if (isPasting) {
      pastePreviewRef.current = null;
      requestUiRedraw();
      cancelPasting();
    }
    if (selectionDragRef.current.active) {
      selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedraw();
    }
  };

  // Handle wheel (zoom to cursor)
  const handleWheel = (e: React.WheelEvent) => {
    // Ensure this document is active before zoom
    if (documentId) {
      const store = useEditorStore.getState();
      if (store.activeDocumentId !== documentId) {
        store.setActiveDocument(documentId);
      }
    }

    e.preventDefault();
    const rect = uiLayerRef.current?.getBoundingClientRect();
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

    const canvas = uiLayerRef.current;
    const visibleTilesXNew = canvas ? canvas.width / newTilePixels : 10;
    const visibleTilesYNew = canvas ? canvas.height / newTilePixels : 10;

    setViewport({
      x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesXNew, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesYNew, newY)),
      zoom: newZoom
    });
  };

  // Handle tool action at position
  const handleToolAction = (x: number, y: number) => {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;

    switch (currentTool) {
      case ToolType.PENCIL:
        // Pencil drag handled by engine.paintTile() — see paintPencilTile()
        break;
      case ToolType.FILL:
        fillArea(x, y);
        break;
      case ToolType.PICKER:
        if (map) {
          const pickedTile = map.tiles[y * MAP_WIDTH + x];
          setSelectedTile(pickedTile);

          // Extract offset from animated tiles
          if (isAnimatedTile(pickedTile)) {
            const offset = getFrameOffset(pickedTile);
            setAnimationOffsetInput(offset);

            // Decode warp routing if it's a warp tile (animId 0xFA)
            const animId = getAnimationId(pickedTile);
            if (animId === 0xFA) {
              const warpSrc = offset % 10;
              const warpDest = Math.floor(offset / 10);
              const currentWarpStyle = useEditorStore.getState().gameObjectToolState.warpStyle;
              setWarpSettings(warpSrc, warpDest, currentWarpStyle);
            }
          }

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
    const canvas = uiLayerRef.current;
    if (!canvas) return;

    const axis = scrollDrag.axis;
    const tilePixels = TILE_SIZE * viewport.zoom;

    const visibleTiles = axis === 'h'
      ? canvas.width / tilePixels
      : canvas.height / tilePixels;
    const mapSize = axis === 'h' ? MAP_WIDTH : MAP_HEIGHT;
    const maxOffset = Math.max(0, mapSize - visibleTiles);

    if (maxOffset === 0) return;

    // Track size minus arrow buttons and opposite scrollbar
    const trackSizePx = (axis === 'h' ? canvas.width : canvas.height) - 10 - 20;
    const thumbSizePx = Math.max(20, (visibleTiles / mapSize) * trackSizePx);
    const scrollableRangePx = trackSizePx - thumbSizePx;

    if (scrollableRangePx <= 0) return;

    const pixelDelta = (axis === 'h' ? e.clientX : e.clientY) - scrollDrag.startPos;
    const viewportDelta = (pixelDelta / scrollableRangePx) * maxOffset;
    const newOffset = Math.max(0, Math.min(maxOffset, scrollDrag.startViewport + viewportDelta));

    if (axis === 'h') {
      setViewport({ x: newOffset });
    } else {
      setViewport({ y: newOffset });
    }
  }, [scrollDrag, viewport.zoom, setViewport]);

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

  // Mount/unmount engine lifecycle
  useEffect(() => {
    const canvas = mapLayerRef.current;
    if (!canvas) return;
    const engine = new CanvasEngine();
    engine.attach(canvas, documentId);
    if (tilesetImage) engine.setTilesetImage(tilesetImage);
    engineRef.current = engine;
    return () => {
      engine.detach();
      engineRef.current = null;
    };
  }, []);

  // Tileset update effect
  useEffect(() => {
    engineRef.current?.setTilesetImage(tilesetImage ?? null);
  }, [tilesetImage]);

  // Farplane update effect
  useEffect(() => {
    engineRef.current?.setFarplaneImage(farplaneImage ?? null);
  }, [farplaneImage]);

  // Cleanup pending drag state on unmount (TOOL-04)
  useEffect(() => {
    return () => {
      // Rect drag: discard (partial rectangle is meaningless)
      rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      // Line preview: discard
      lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      // Selection drag: discard (not yet committed)
      selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      // Cancel RAF to prevent orphaned callbacks
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (uiRafIdRef.current !== null) {
        cancelAnimationFrame(uiRafIdRef.current);
        uiRafIdRef.current = null;
      }
    };
  }, []);

  // Cancel active drags when tool switches (TOOL-03)
  // IMPORTANT: Only depend on currentTool — not requestUiRedraw/setRulerMeasurement,
  // which change on re-renders and would kill in-progress drags (e.g. selection drag
  // reset by clearSelection() → selection state change → drawUiLayer recreated)
  const requestUiRedrawRef = useRef(requestUiRedraw);
  requestUiRedrawRef.current = requestUiRedraw;
  const setRulerMeasurementRef = useRef(setRulerMeasurement);
  setRulerMeasurementRef.current = setRulerMeasurement;
  useEffect(() => {
    // Cancel rect drag
    if (rectDragRef.current.active) {
      rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedrawRef.current();
    }
    // Cancel line preview
    if (lineStateRef.current.active) {
      lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedrawRef.current();
    }
    // Cancel selection drag (in-progress, not committed)
    if (selectionDragRef.current.active) {
      selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
      requestUiRedrawRef.current();
    }
    // Cancel ruler measurement (RULER-01)
    if (rulerStateRef.current.active) {
      rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
      setRulerMeasurementRef.current(null);
      requestUiRedrawRef.current();
    }
    // Commit pencil drag if active
    if (engineRef.current?.getIsDragActive()) {
      const tiles = engineRef.current.commitDrag();
      if (tiles && tiles.length > 0) {
        const state = useEditorStore.getState();
        state.setTiles(tiles);
        state.commitUndo('Edit tiles');
      }
    }
  }, [currentTool]);

  // Clear ruler state when rulerMode changes (RULER-02)
  useEffect(() => {
    if (rulerStateRef.current.active) {
      rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
      setRulerMeasurement(null);
      requestUiRedraw();
    }
  }, [rulerMode, setRulerMeasurement, requestUiRedraw]);

  // Global mouseup listener for arrow buttons (in case mouse leaves button while pressed)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      stopArrowScroll();
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [stopArrowScroll]);

  // Escape key cancellation for selection (committed state in Zustand)
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

  // Escape key cancellation for ref-based transient state (permanent listener)
  // P key to pin ruler measurements (RULER-05)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        // Cancel pencil drag
        if (engineRef.current?.getIsDragActive()) {
          e.preventDefault();
          engineRef.current.cancelDrag();
          // Restore buffer from Zustand state (full rebuild)
          const state = useEditorStore.getState();
          const currentMap = documentId
            ? state.documents.get(documentId)?.map ?? null
            : state.map;
          const currentVp = documentId
            ? state.documents.get(documentId)?.viewport ?? { x: 0, y: 0, zoom: 1 }
            : state.viewport;
          if (currentMap && engineRef.current) {
            engineRef.current.drawMapLayer(currentMap, currentVp, state.animationFrame);
          }
        }
        // Cancel line preview
        if (lineStateRef.current.active) {
          e.preventDefault();
          lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
          requestUiRedraw();
        }
        // Cancel selection drag
        if (selectionDragRef.current.active) {
          e.preventDefault();
          selectionDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
          requestUiRedraw();
        }
        // Cancel rect drag
        if (rectDragRef.current.active) {
          e.preventDefault();
          rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
          requestUiRedraw();
        }
        // Cancel ruler measurement (RULER-01)
        if (rulerStateRef.current.active) {
          e.preventDefault();
          rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
          setRulerMeasurement(null);
          requestUiRedraw();
        } else if (currentTool === ToolType.RULER && !rulerStateRef.current.active) {
          // If no active measurement, clear all pinned measurements (RULER-05)
          const state = useEditorStore.getState();
          if (state.pinnedMeasurements.length > 0) {
            e.preventDefault();
            clearAllPinnedMeasurements();
            requestUiRedraw();
          }
        }
      }

      // Enter key completes and pins active path measurement
      if (e.key === 'Enter' && currentTool === ToolType.RULER && rulerStateRef.current.active) {
        if (rulerStateRef.current.waypoints.length >= 2) {
          e.preventDefault();
          rulerStateRef.current.active = false;
          pinMeasurement();
          setRulerMeasurement(null);
          rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
          requestUiRedraw();
        }
      }
    };

    // Listen for path complete signal from StatusBar "Set Path" button
    const handlePathComplete = () => {
      rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0, waypoints: [] };
      requestUiRedraw();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ruler-path-complete', handlePathComplete);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ruler-path-complete', handlePathComplete);
    };
  }, [documentId, requestUiRedraw, setRulerMeasurement, currentTool, pinMeasurement, clearAllPinnedMeasurements]);

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

        // Update both canvas dimensions
        const canvases = [mapLayerRef.current, uiLayerRef.current];
        canvases.forEach(c => {
          if (c) {
            c.width = width;
            c.height = height;
          }
        });

        // Invalidate grid pattern cache on resize
        gridCacheKeyRef.current = '';

        // Redraw both layers via stable refs (avoids observer reconnection churn)
        drawMapLayerRef.current();
        drawUiLayerRef.current();

        rafId = null;
      });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []); // Empty deps — observer stays connected for component lifetime

  const scrollMetrics = getScrollMetrics();

  return (
    <div className="map-window-frame">
      <div ref={containerRef} className="map-canvas-container">
        {/* Layer 1: Map (static + animated tiles, alpha:false) */}
        <canvas
          ref={mapLayerRef}
          className="map-canvas-layer no-events"
        />
        {/* Layer 2: UI overlay (grid + cursors + selection, receives mouse events) */}
        <canvas
          ref={uiLayerRef}
          className={`map-canvas-layer map-canvas${isDragging ? ' panning' : ''}`}
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
              left: `${scrollMetrics.thumbLeft}px`,
              width: `${scrollMetrics.thumbWidth}px`
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
              top: `${scrollMetrics.thumbTop}px`,
              height: `${scrollMetrics.thumbHeight}px`
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
