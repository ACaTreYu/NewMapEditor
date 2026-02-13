/**
 * MapCanvas component - Renders the tile map on a canvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, DEFAULT_TILE, ToolType, ANIMATION_DEFINITIONS } from '@core/map';
import { convLrData, convUdData, CONV_RIGHT_DATA, CONV_DOWN_DATA } from '@core/map/GameObjectData';
import { wallSystem } from '@core/map/WallSystem';
import { CanvasEngine } from '@core/canvas';
import './MapCanvas.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
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

export const MapCanvas: React.FC<Props> = ({ tilesetImage, onCursorMove, documentId }) => {
  // Layer refs for 2-canvas architecture (map + UI overlay)
  const mapLayerRef = useRef<HTMLCanvasElement>(null);
  const uiLayerRef = useRef<HTMLCanvasElement>(null);
  // Canvas rendering engine (owns off-screen buffer and rendering state)
  const engineRef = useRef<CanvasEngine | null>(null);
  // Grid pattern cache (recreated on zoom change)
  const gridPatternRef = useRef<CanvasPattern | null>(null);
  const gridPatternZoomRef = useRef<number>(-1);
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
  const pastePreviewRef = useRef<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; viewportX: number; viewportY: number; viewportZoom: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const panDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const [panRenderCount, setPanRenderCount] = useState(0);
  void panRenderCount; // Used only as re-render trigger
  const [scrollDrag, setScrollDrag] = useState<{ axis: 'h' | 'v'; startPos: number; startViewport: number } | null>(null);
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

  // Tool/interaction state (triggers overlay layer only) - split into focused selectors
  // Individual selectors for tool state (1-3 fields, change independently)
  const currentTool = useEditorStore(state => state.currentTool);
  const selectedTile = useEditorStore(state => state.selectedTile);
  const tileSelection = useEditorStore(state => state.tileSelection);
  const gameObjectToolState = useEditorStore(state => state.gameObjectToolState);

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

  // Grouped selector for selection + rect drag (changes together)
  const { selection, rectDragState } = useEditorStore(
    useShallow((state) => {
      const doc = documentId ? state.documents.get(documentId) : null;
      return {
        selection: doc ? doc.selection : state.selection,
        rectDragState: state.rectDragState
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
  const setRectDragState = useEditorStore(state => state.setRectDragState);
  const setSelection = useEditorStore(state => state.setSelection);
  const clearSelection = useEditorStore(state => state.clearSelection);
  const cancelPasting = useEditorStore(state => state.cancelPasting);
  const pasteAt = useEditorStore(state => state.pasteAt);
  const markModified = useEditorStore(state => state.markModified);

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
        // Recreate pattern when zoom changes
        if (gridPatternZoomRef.current !== tilePixelSize) {
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = tilePixelSize;
          patternCanvas.height = tilePixelSize;
          const pctx = patternCanvas.getContext('2d');
          if (pctx) {
            pctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            pctx.lineWidth = 1;
            pctx.beginPath();
            pctx.moveTo(0, 0);
            pctx.lineTo(tilePixelSize, 0);
            pctx.moveTo(0, 0);
            pctx.lineTo(0, tilePixelSize);
            pctx.stroke();
            gridPatternRef.current = ctx.createPattern(patternCanvas, 'repeat');
            gridPatternZoomRef.current = tilePixelSize;
          }
        }
        if (gridPatternRef.current) {
          const offsetX = -(vp.x % 1) * tilePixelSize;
          const offsetY = -(vp.y % 1) * tilePixelSize;
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
        (currentTool === ToolType.WALL_PENCIL || currentTool === ToolType.WALL_RECT) && !rectDragState.active) {
      const screen = tileToScreen(cursorTileRef.current.x, cursorTileRef.current.y, overrideViewport);
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
    }
  }, [currentTool, tileSelection, rectDragState, gameObjectToolState, selection, viewport, tilesetImage, isPasting, clipboard, showGrid, getLineTiles, tileToScreen]);

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

  // Progressive render during pan drag (RAF-debounced)
  const requestProgressiveRender = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!panStartRef.current || !panDeltaRef.current) return;

      const { dx, dy } = panDeltaRef.current;
      const tilePixels = TILE_SIZE * panStartRef.current.viewportZoom;
      const canvas = uiLayerRef.current;
      const visibleTilesX = canvas ? canvas.width / tilePixels : 10;
      const visibleTilesY = canvas ? canvas.height / tilePixels : 10;
      const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
      const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

      const newX = Math.max(0, Math.min(maxOffsetX, panStartRef.current.viewportX - dx / tilePixels));
      const newY = Math.max(0, Math.min(maxOffsetY, panStartRef.current.viewportY - dy / tilePixels));
      const tempViewport = { x: newX, y: newY, zoom: panStartRef.current.viewportZoom };

      // Progressive render: redraw map layer with temp viewport
      // Skip UI layer (overlays okay to lag 1 frame)
      drawMapLayer(tempViewport);

      // Trigger React re-render for scrollbar sync
      setPanRenderCount(c => c + 1);
    });
  }, [drawMapLayer]);

  // Commit CSS-transform pan: calculate final viewport, clear transforms, update state
  const commitPan = useCallback((clientX: number, clientY: number) => {
    if (!panStartRef.current) return;

    // Cancel pending RAF render
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const tilePixels = TILE_SIZE * panStartRef.current.viewportZoom;
    const dx = clientX - panStartRef.current.mouseX;
    const dy = clientY - panStartRef.current.mouseY;

    const canvas = uiLayerRef.current;
    const visibleTilesX = canvas ? canvas.width / tilePixels : 10;
    const visibleTilesY = canvas ? canvas.height / tilePixels : 10;
    const maxOffsetX = Math.max(0, MAP_WIDTH - visibleTilesX);
    const maxOffsetY = Math.max(0, MAP_HEIGHT - visibleTilesY);

    const newX = Math.max(0, Math.min(maxOffsetX, panStartRef.current.viewportX - dx / tilePixels));
    const newY = Math.max(0, Math.min(maxOffsetY, panStartRef.current.viewportY - dy / tilePixels));
    const finalViewport = { x: newX, y: newY, zoom: panStartRef.current.viewportZoom };

    // Render both layers with final viewport BEFORE clearing transforms (prevents snap-back)
    drawMapLayer(finalViewport);
    drawUiLayer(finalViewport);

    // Now safe to clear CSS transforms — canvas shows correct content
    if (mapLayerRef.current) mapLayerRef.current.style.transform = '';
    if (uiLayerRef.current) uiLayerRef.current.style.transform = '';

    // Commit to Zustand (triggers React re-render with committed viewport)
    setViewport({ x: newX, y: newY });
    panStartRef.current = null;
    panDeltaRef.current = null;
  }, [setViewport, drawMapLayer, drawUiLayer]);

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
        (rectDragState?.active && currentTool === ToolType.CONVEYOR)) {
      drawUiLayer();
    }
  }, [animationFrame, selection, isPasting, clipboard, rectDragState, currentTool, drawUiLayer]);

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
      if (currentTool === ToolType.WALL || currentTool === ToolType.LINE) {
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
                 currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH) {
        // Click-to-stamp game object tools (3x3) - center on cursor
        pushUndo();
        placeGameObject(x - 1, y - 1);
        commitUndo('Place game object');
      } else if (currentTool === ToolType.WARP) {
        // Warp is single-tile, no offset needed
        pushUndo();
        placeGameObject(x, y);
        commitUndo('Place game object');
      } else if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
                 currentTool === ToolType.BRIDGE || currentTool === ToolType.CONVEYOR ||
                 currentTool === ToolType.WALL_RECT) {
        // Drag-to-rectangle tools - start rect drag
        setRectDragState({ active: true, startX: x, startY: y, endX: x, endY: y });
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
      // CSS transform for GPU-accelerated panning (no canvas redraws)
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      const transform = `translate(${dx}px, ${dy}px)`;
      if (mapLayerRef.current) mapLayerRef.current.style.transform = transform;
      if (uiLayerRef.current) uiLayerRef.current.style.transform = transform;

      // Request progressive render for next frame
      panDeltaRef.current = { dx, dy };
      requestProgressiveRender();
      return;
    } else if (lineStateRef.current.active) {
      // Update line end position
      const prevLine = lineStateRef.current;
      if (prevLine.endX !== x || prevLine.endY !== y) {
        lineStateRef.current = { ...prevLine, endX: x, endY: y };
        requestUiRedraw();
      }
    } else if (rectDragState.active) {
      // Update rect drag end position
      setRectDragState({ endX: x, endY: y });
    } else if (selectionDragRef.current.active) {
      const prevSel = selectionDragRef.current;
      if (prevSel.endX !== x || prevSel.endY !== y) {
        selectionDragRef.current = { ...prevSel, endX: x, endY: y };
        requestUiRedraw();
      }
    } else if (isDrawingWallPencil && e.buttons === 1) {
      // Wall pencil freehand drawing
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
      commitPan(e.clientX, e.clientY);
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
    if (rectDragState.active) {
      pushUndo();
      placeGameObjectRect(rectDragState.startX, rectDragState.startY, rectDragState.endX, rectDragState.endY);
      commitUndo('Place game object');
      setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
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
      commitPan(e.clientX, e.clientY);
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
    if (rectDragState.active) {
      setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
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

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (uiRafIdRef.current !== null) {
        cancelAnimationFrame(uiRafIdRef.current);
      }
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [documentId, requestUiRedraw]);

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
        gridPatternZoomRef.current = -1;

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
