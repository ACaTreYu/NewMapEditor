/**
 * MapCanvas component - Renders the tile map on a canvas
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, DEFAULT_TILE, ToolType, ANIMATION_DEFINITIONS } from '@core/map';
import { convLrData, convUdData, CONV_RIGHT_DATA, CONV_DOWN_DATA } from '@core/map/GameObjectData';
import { wallSystem } from '@core/map/WallSystem';
import './MapCanvas.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  onCursorMove?: (x: number, y: number) => void;
  documentId?: string;
}

const TILES_PER_ROW = 40; // Tileset is 640 pixels wide (40 tiles)
const INITIAL_SCROLL_DELAY = 250; // ms before continuous scroll starts
const SCROLL_REPEAT_RATE = 125;   // ms between scroll ticks (~8 tiles/sec)

// Grid pattern cache (module-level, persists across component renders)
let cachedGridPattern: CanvasPattern | null = null;
let cachedGridZoom: number | null = null;

function createGridPattern(tilePixels: number): CanvasPattern | null {
  const size = Math.round(tilePixels);
  if (size < 1) return null;

  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = size;
  patternCanvas.height = size;

  const pctx = patternCanvas.getContext('2d');
  if (!pctx) return null;

  // Draw right and bottom edges of a single grid cell
  pctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  pctx.lineWidth = 1;
  pctx.beginPath();
  // Right edge
  pctx.moveTo(size - 0.5, 0);
  pctx.lineTo(size - 0.5, size);
  // Bottom edge
  pctx.moveTo(0, size - 0.5);
  pctx.lineTo(size, size - 0.5);
  pctx.stroke();

  // Create pattern from a temporary context (not the pattern canvas itself)
  const tmpCanvas = document.createElement('canvas');
  const tmpCtx = tmpCanvas.getContext('2d');
  return tmpCtx?.createPattern(patternCanvas, 'repeat') ?? null;
}

// ImageBitmap tile atlas for GPU-ready rendering
interface TileAtlas {
  bitmaps: ImageBitmap[];
  totalTiles: number;
}

async function createTileAtlas(
  tilesetImage: HTMLImageElement,
  tileSize: number = 16,
  tilesPerRow: number = 40
): Promise<TileAtlas> {
  const cols = Math.floor(tilesetImage.width / tileSize);
  const rows = Math.floor(tilesetImage.height / tileSize);
  const totalTiles = cols * rows;
  const bitmaps: ImageBitmap[] = new Array(totalTiles);
  const promises: Promise<void>[] = [];

  for (let tileId = 0; tileId < totalTiles; tileId++) {
    const col = tileId % tilesPerRow;
    const row = Math.floor(tileId / tilesPerRow);
    const sx = col * tileSize;
    const sy = row * tileSize;
    promises.push(
      createImageBitmap(tilesetImage, sx, sy, tileSize, tileSize)
        .then(bitmap => { bitmaps[tileId] = bitmap; })
    );
  }

  await Promise.all(promises);
  return { bitmaps, totalTiles };
}

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
  // Layer refs for 2-canvas architecture (map layer + UI overlay)
  const mapLayerRef = useRef<HTMLCanvasElement>(null);
  const uiLayerRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Tile atlas state for GPU-ready bitmap rendering
  const [tileAtlas, setTileAtlas] = useState<TileAtlas | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; viewportX: number; viewportY: number; viewportZoom: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const panDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const [panRenderCount, setPanRenderCount] = useState(0);
  void panRenderCount; // Used only as re-render trigger
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

  // Ref for animationFrame to avoid unconditional dependency in drawOverlayLayer
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
  const { isPasting, clipboard, pastePreviewPosition } = useEditorStore(
    useShallow((state) => {
      const doc = documentId ? state.documents.get(documentId) : null;
      return {
        isPasting: doc ? doc.isPasting : state.isPasting,
        clipboard: state.clipboard,
        pastePreviewPosition: doc ? doc.pastePreviewPosition : state.pastePreviewPosition
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
  const setPastePreviewPosition = useEditorStore(state => state.setPastePreviewPosition);
  const pasteAt = useEditorStore(state => state.pasteAt);
  const markModified = useEditorStore(state => state.markModified);

  // Calculate visible area
  const getVisibleTiles = useCallback((overrideViewport?: ViewportOverride) => {
    const vp = overrideViewport ?? viewport;
    const canvas = uiLayerRef.current;
    if (!canvas) return { startX: 0, startY: 0, endX: 20, endY: 20 };

    const tilePixels = TILE_SIZE * vp.zoom;
    const tilesX = Math.ceil(canvas.width / tilePixels) + 1;
    const tilesY = Math.ceil(canvas.height / tilePixels) + 1;

    return {
      startX: Math.floor(vp.x),
      startY: Math.floor(vp.y),
      endX: Math.min(MAP_WIDTH, Math.floor(vp.x) + tilesX),
      endY: Math.min(MAP_HEIGHT, Math.floor(vp.y) + tilesY)
    };
  }, [viewport]);

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

  // Map layer: All tiles (static + animated) rendered with ImageBitmap atlas
  const drawMapLayer = useCallback((overrideViewport?: ViewportOverride) => {
    const vp = overrideViewport ?? viewport;
    const canvas = mapLayerRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx || !map || !tileAtlas) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tilePixels = TILE_SIZE * vp.zoom;
    const { startX, startY, endX, endY } = getVisibleTiles(overrideViewport);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map.tiles[y * MAP_WIDTH + x];
        const screenX = Math.floor((x - vp.x) * tilePixels);
        const screenY = Math.floor((y - vp.y) * tilePixels);
        const destSize = Math.ceil(tilePixels);

        const isAnimated = (tile & 0x8000) !== 0;

        if (isAnimated) {
          // Animated tile: compute current frame from animationFrame + frameOffset
          const animId = tile & 0xFF;
          const tileFrameOffset = (tile >> 8) & 0x7F;
          const anim = ANIMATION_DEFINITIONS[animId];

          if (anim && anim.frames.length > 0) {
            const frameIdx = (animationFrame + tileFrameOffset) % anim.frameCount;
            const displayTile = anim.frames[frameIdx] || 0;
            const bitmap = tileAtlas.bitmaps[displayTile];
            if (bitmap) {
              ctx.drawImage(bitmap, screenX, screenY, destSize, destSize);
            } else {
              // Fallback for undefined frame
              ctx.fillStyle = '#4a4a6a';
              ctx.fillRect(screenX, screenY, destSize, destSize);
            }
          } else {
            // Placeholder for undefined animation
            ctx.fillStyle = '#4a4a6a';
            ctx.fillRect(screenX, screenY, destSize, destSize);
          }
        } else {
          // Static tile: direct bitmap lookup by tile ID
          const bitmap = tileAtlas.bitmaps[tile];
          if (bitmap) {
            ctx.drawImage(bitmap, screenX, screenY, destSize, destSize);
          } else {
            // Fallback for missing bitmap (should not happen with valid tiles)
            ctx.fillStyle = tile === 280 ? '#b0b0b0' : `hsl(${(tile * 7) % 360}, 50%, 40%)`;
            ctx.fillRect(screenX, screenY, destSize, destSize);
          }
        }
      }
    }
  }, [map, viewport, tilesetImage, tileAtlas, animationFrame, getVisibleTiles]);

  // UI layer: Grid + overlays (cursor, line preview, selection, tool previews, conveyor preview)
  const drawUILayer = useCallback((overrideViewport?: ViewportOverride) => {
    const vp = overrideViewport ?? viewport;
    const canvas = uiLayerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tilePixels = TILE_SIZE * vp.zoom;

    // Draw grid using cached pattern (O(1) fill instead of O(N) line strokes)
    if (showGrid) {
      // Initialize or invalidate pattern cache when zoom changes.
      // On first showGrid=true render, both cachedGridPattern and cachedGridZoom
      // are null, so this condition is true and the pattern gets created.
      if (cachedGridZoom !== vp.zoom) {
        cachedGridPattern = createGridPattern(tilePixels);
        cachedGridZoom = vp.zoom;
      }

      if (cachedGridPattern) {
        // Calculate viewport offset for pattern alignment
        const offsetX = -((vp.x * tilePixels) % tilePixels);
        const offsetY = -((vp.y * tilePixels) % tilePixels);

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.fillStyle = cachedGridPattern;
        ctx.fillRect(-offsetX, -offsetY, canvas.width, canvas.height);
        ctx.restore();
      }
    }

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
        const screen = tileToScreen(tile.x, tile.y, overrideViewport);
        ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
        ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      }

      const startScreen = tileToScreen(lineState.startX, lineState.startY, overrideViewport);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.fillRect(startScreen.x, startScreen.y, tilePixels, tilePixels);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 3;
      ctx.strokeRect(startScreen.x + 2, startScreen.y + 2, tilePixels - 4, tilePixels - 4);

      const endScreen = tileToScreen(lineState.endX, lineState.endY, overrideViewport);
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
    if (isPasting && clipboard && pastePreviewPosition && tileAtlas) {
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
              const bitmap = tileAtlas.bitmaps[displayTile];
              if (bitmap) {
                ctx.drawImage(bitmap, screenX, screenY, destSize, destSize);
              }
            }
          } else {
            const bitmap = tileAtlas.bitmaps[tile];
            if (bitmap) {
              ctx.drawImage(bitmap, screenX, screenY, destSize, destSize);
            }
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
    if (cursorTile.x >= 0 && cursorTile.y >= 0 && !lineState.active) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y, overrideViewport);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
    }

    // Draw selection preview at cursor position for tile-placing tools
    if (cursorTile.x >= 0 && cursorTile.y >= 0 &&
        (currentTool === ToolType.PENCIL || currentTool === ToolType.FILL) &&
        !lineState.active) {
      const { width, height } = tileSelection;

      const screenX = Math.floor((cursorTile.x - vp.x) * tilePixels);
      const screenY = Math.floor((cursorTile.y - vp.y) * tilePixels);

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
      const screen = tileToScreen(cx - 1, cy - 1, overrideViewport);

      ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, 3 * tilePixels - 2, 3 * tilePixels - 2);

      const centerScreen = tileToScreen(cx, cy, overrideViewport);
      ctx.fillStyle = valid ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 64, 64, 0.2)';
      ctx.fillRect(centerScreen.x, centerScreen.y, tilePixels, tilePixels);
    }

    // Draw single-tile outline for warp tool
    if (cursorTile.x >= 0 && cursorTile.y >= 0 && currentTool === ToolType.WARP) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y, overrideViewport);
      ctx.strokeStyle = 'rgba(128, 128, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixels - 2, tilePixels - 2);
      ctx.fillStyle = 'rgba(128, 128, 255, 0.2)';
      ctx.fillRect(screen.x, screen.y, tilePixels, tilePixels);
    }

    // Draw single-tile cursor for wall pencil
    if (cursorTile.x >= 0 && cursorTile.y >= 0 &&
        (currentTool === ToolType.WALL_PENCIL || currentTool === ToolType.WALL_RECT) && !rectDragState.active) {
      const screen = tileToScreen(cursorTile.x, cursorTile.y, overrideViewport);
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
      if (currentTool === ToolType.CONVEYOR && tileAtlas && w >= 1 && h >= 1) {
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
                if (isAnim) {
                  const animId = tile & 0xFF;
                  const frameOffset = (tile >> 8) & 0x7F;
                  const anim = ANIMATION_DEFINITIONS[animId];
                  if (anim && anim.frames.length > 0) {
                    const frameIdx = (animFrameRef.current + frameOffset) % anim.frameCount;
                    const displayTile = anim.frames[frameIdx] || 0;
                    const bitmap = tileAtlas.bitmaps[displayTile];
                    if (bitmap) {
                      ctx.drawImage(bitmap, screenX, screenY, tilePixels, tilePixels);
                    }
                  }
                } else {
                  const bitmap = tileAtlas.bitmaps[tile];
                  if (bitmap) {
                    ctx.drawImage(bitmap, screenX, screenY, tilePixels, tilePixels);
                  }
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

      const selScreen = tileToScreen(minX, minY, overrideViewport);

      // Static white selection rectangle with black outline for contrast
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);
    }
  }, [cursorTile, lineState, currentTool, tileSelection, rectDragState, gameObjectToolState, selection, selectionDrag, viewport, tileAtlas, isPasting, clipboard, pastePreviewPosition, showGrid, getLineTiles, tileToScreen]);

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

      // Progressive render: redraw map layer only (UI elements okay to lag 1 frame)
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

    // Render canvas with final viewport BEFORE clearing transforms (prevents snap-back)
    drawMapLayer(finalViewport);
    drawUILayer(finalViewport);

    // Now safe to clear CSS transforms — canvas shows correct content
    if (mapLayerRef.current) mapLayerRef.current.style.transform = '';
    if (uiLayerRef.current) uiLayerRef.current.style.transform = '';

    // Commit to Zustand (triggers React re-render with committed viewport)
    setViewport({ x: newX, y: newY });
    panStartRef.current = null;
    panDeltaRef.current = null;
  }, [setViewport, drawMapLayer, drawUILayer]);

  // Create tile atlas when tilesetImage loads
  useEffect(() => {
    if (!tilesetImage) { setTileAtlas(null); return; }
    createTileAtlas(tilesetImage, TILE_SIZE, TILES_PER_ROW)
      .then(atlas => setTileAtlas(atlas))
      .catch(err => console.error('Failed to create tile atlas:', err));
  }, [tilesetImage]);

  // Layer-specific render triggers
  useEffect(() => {
    drawMapLayer();
  }, [drawMapLayer]);

  useEffect(() => {
    drawUILayer();
  }, [drawUILayer]);

  // Conditional animation triggers for UI layer
  // Redraw map layer on animation tick (for animated tiles)
  // Redraw UI layer on animation tick when animated elements are present
  useEffect(() => {
    drawMapLayer();
    const needsAnimation = selection.active || selectionDrag.active ||
                           (isPasting && clipboard) ||
                           (rectDragState.active && currentTool === ToolType.CONVEYOR);
    if (needsAnimation) {
      drawUILayer();
    }
  }, [animationFrame, selection.active, selectionDrag.active, isPasting, clipboard, rectDragState.active, currentTool, drawMapLayer, drawUILayer]);

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
        setSelectionDrag({ active: true, startX: x, startY: y, endX: x, endY: y });
      } else if (currentTool === ToolType.FILL) {
        // Fill is instant (not a drag operation)
        pushUndo();
        handleToolAction(x, y);
        commitUndo('Fill area');
      } else {
        // Pencil - start drag operation
        pushUndo();
        handleToolAction(x, y);
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = uiLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    setCursorTile({ x, y });
    onCursorMove?.(x, y);

    // Update paste preview position when in paste mode
    if (isPasting) {
      setPastePreviewPosition(x, y);
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
  const handleMouseUp = (e: React.MouseEvent) => {
    // Commit pan before anything else
    if (isDragging && panStartRef.current) {
      commitPan(e.clientX, e.clientY);
    }

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

    setIsDragging(false);

    if (lineState.active) {
      // Complete line drawing
      const lineTiles = getLineTiles(
        lineState.startX, lineState.startY,
        lineState.endX, lineState.endY
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
      setLineState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
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

    // Commit undo for pencil drag operations
    // (pushUndo was called on mousedown, drag painted tiles, now commit the deltas)
    // Note: FILL already committed in mousedown, so we exclude it here
    if (!lineState.active && !rectDragState.active && !selectionDrag.active && !isDrawingWallPencil) {
      if (currentTool === ToolType.PENCIL) {
        commitUndo('Edit tiles');
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
    if (currentTool === ToolType.PENCIL) {
      commitUndo('Edit tiles');
    }

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
    if (selectionDrag.active) {
      setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
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
        // Support multi-tile selection stamping
        if (tileSelection.width === 1 && tileSelection.height === 1) {
          setTile(x, y, selectedTile);
        } else {
          const tiles: Array<{ x: number; y: number; tile: number }> = [];
          for (let dy = 0; dy < tileSelection.height; dy++) {
            for (let dx = 0; dx < tileSelection.width; dx++) {
              const tileId = (tileSelection.startRow + dy) * 40 + (tileSelection.startCol + dx);
              if (tileId !== DEFAULT_TILE) {
                tiles.push({ x: x + dx, y: y + dy, tile: tileId });
              }
            }
          }
          if (tiles.length > 0) setTiles(tiles);
        }
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

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
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

        // Update both canvas dimensions
        const canvases = [
          mapLayerRef.current,
          uiLayerRef.current
        ];
        canvases.forEach(canvas => {
          if (canvas) {
            canvas.width = width;
            canvas.height = height;
          }
        });

        // Redraw both layers
        drawMapLayer();
        drawUILayer();

        rafId = null;
      });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [drawMapLayer, drawUILayer]);

  const scrollMetrics = getScrollMetrics();

  return (
    <div className="map-window-frame">
      <div ref={containerRef} className="map-canvas-container">
        {/* Map layer: All tiles (static + animated) */}
        <canvas
          ref={mapLayerRef}
          className="map-canvas-layer no-events"
        />
        {/* UI layer: Grid + overlays (receives mouse events) */}
        <canvas
          ref={uiLayerRef}
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
