/**
 * CanvasEngine - Standalone canvas rendering engine
 * Extracted from MapCanvas.tsx to decouple rendering from React lifecycle
 */

import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '@core/map';
import { ANIMATION_DEFINITIONS } from '@core/map/AnimationDefinitions';
import type { MapData } from '@core/map';
import type { Viewport } from '@core/editor/slices/types';
import { useEditorStore } from '@core/editor';

const TILES_PER_ROW = 40; // Tileset is 640px wide

// Module-level drag active check for external consumers (undo blocking)
let activeEngine: CanvasEngine | null = null;
export function isAnyDragActive(): boolean {
  return activeEngine?.getIsDragActive() ?? false;
}

/**
 * CanvasEngine - Manages off-screen buffer and rendering operations
 *
 * Architecture:
 * - 4096x4096 off-screen buffer at native resolution
 * - Incremental tile patching for edits
 * - Single drawImage blit for viewport changes
 * - Detachment safety for React unmount
 */
export class CanvasEngine {
  // Private state (replaces scattered refs in MapCanvas)
  private buffer: HTMLCanvasElement | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;
  private screenCtx: CanvasRenderingContext2D | null = null;
  private prevTiles: Uint16Array | null = null;
  private prevTileset: HTMLImageElement | null = null;
  private lastBlitVp: { x: number; y: number; zoom: number } | null = null;
  private tilesetImage: HTMLImageElement | null = null;
  private detached: boolean = false;
  private unsubscribers: Array<() => void> = [];
  private documentId: string | null = null;
  private animationFrame: number = 0;
  private rafId: number | null = null;
  private isDragActive: boolean = false;
  private pendingTiles: Map<number, number> | null = null; // Accumulates tile changes during drag
  private clearedAnimatedTiles: Set<number> | null = null; // Tracks animated->non-animated transitions during drag

  /**
   * Attach engine to a screen canvas
   * Creates off-screen buffer and gets rendering contexts
   */
  attach(screenCanvas: HTMLCanvasElement, documentId?: string): void {
    // Create off-screen 4096x4096 buffer
    const buf = document.createElement('canvas');
    buf.width = MAP_WIDTH * TILE_SIZE;   // 4096
    buf.height = MAP_HEIGHT * TILE_SIZE; // 4096
    this.buffer = buf;

    const bctx = buf.getContext('2d');
    if (!bctx) throw new Error('Failed to get buffer 2d context');
    bctx.imageSmoothingEnabled = false;
    this.bufferCtx = bctx;

    const sctx = screenCanvas.getContext('2d');
    if (!sctx) throw new Error('Failed to get screen 2d context');
    this.screenCtx = sctx;

    this.detached = false;
    this.documentId = documentId ?? null;
    activeEngine = this;
    this.setupSubscriptions();
  }

  /**
   * Detach engine from canvas (cleanup on unmount)
   */
  detach(): void {
    this.cancelDrag();
    activeEngine = null;

    // Unsubscribe from Zustand
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Cancel pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.detached = true;
    this.buffer = null;
    this.bufferCtx = null;
    this.screenCtx = null;
    this.prevTiles = null;
    this.prevTileset = null;
    this.lastBlitVp = null;
  }

  /**
   * Set tileset image reference
   */
  setTilesetImage(img: HTMLImageElement | null): void {
    this.tilesetImage = img;
  }

  /**
   * Assert engine is attached - throws if not
   */
  private assertAttached(): void {
    if (!this.buffer || !this.bufferCtx || !this.screenCtx) {
      throw new Error('CanvasEngine not attached');
    }
  }

  /**
   * Render a single tile to a canvas context at given position and size
   * Extracted from MapCanvas standalone function
   */
  renderTile(
    ctx: CanvasRenderingContext2D,
    tile: number,
    destX: number,
    destY: number,
    destSize: number,
    animFrame: number
  ): void {
    const isAnimated = (tile & 0x8000) !== 0;
    if (isAnimated) {
      const animId = tile & 0xFF;
      const frameOffset = (tile >> 8) & 0x7F;
      const anim = ANIMATION_DEFINITIONS[animId];
      if (anim && anim.frames.length > 0 && this.tilesetImage) {
        const frameIdx = (animFrame + frameOffset) % anim.frameCount;
        const displayTile = anim.frames[frameIdx] || 0;
        const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
        const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
        ctx.drawImage(this.tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, destSize, destSize);
      } else {
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(destX, destY, destSize, destSize);
      }
    } else if (this.tilesetImage) {
      if (tile === 280) {
        // Skip empty tile — transparent pixel lets CSS background show through
        return;
      }
      const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(this.tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, destSize, destSize);
    } else {
      ctx.fillStyle = tile === 280
        ? '#b0b0b0'
        : `hsl(${(tile * 7) % 360}, 50%, 40%)`;
      ctx.fillRect(destX, destY, destSize, destSize);
    }
  }

  /**
   * Draw map layer to buffer (full rebuild or incremental patch) then blit to screen
   * Extracted from MapCanvas drawMapLayer callback
   */
  drawMapLayer(map: MapData, viewport: Viewport, animFrame: number): void {
    if (this.detached) return;
    this.assertAttached();
    const bufCtx = this.bufferCtx!;
    const buffer = this.buffer!;
    const screenCtx = this.screenCtx!;
    const canvasWidth = screenCtx.canvas.width;
    const canvasHeight = screenCtx.canvas.height;

    // --- Update buffer: full build or incremental patch ---
    const needsFullBuild = !this.prevTiles || this.tilesetImage !== this.prevTileset;

    if (needsFullBuild) {
      // Full buffer rebuild (first render, tileset loaded, new map)
      bufCtx.clearRect(0, 0, buffer.width, buffer.height);
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const tile = map.tiles[y * MAP_WIDTH + x];
          this.renderTile(bufCtx, tile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, animFrame);
        }
      }
      this.prevTiles = new Uint16Array(map.tiles);
      this.prevTileset = this.tilesetImage;
    } else {
      // Incremental: diff and patch only changed tiles
      const prev = this.prevTiles!;
      let patchCount = 0;
      for (let i = 0; i < map.tiles.length; i++) {
        if (map.tiles[i] !== prev[i]) {
          const tx = i % MAP_WIDTH;
          const ty = Math.floor(i / MAP_WIDTH);
          bufCtx.clearRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.renderTile(bufCtx, map.tiles[i], tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, animFrame);
          prev[i] = map.tiles[i];
          patchCount++;
        }
      }
      // Skip blit if nothing changed and viewport is same (spurious re-render)
      const lastVp = this.lastBlitVp;
      if (patchCount === 0 && lastVp &&
          lastVp.x === viewport.x && lastVp.y === viewport.y && lastVp.zoom === viewport.zoom) {
        return;
      }
    }

    // --- Blit buffer to screen (single drawImage with zoom scaling) ---
    this.blitToScreen(viewport, canvasWidth, canvasHeight);
  }

  /**
   * Blit buffer to screen at given viewport
   * Extracted from immediateBlitToScreen callback
   */
  blitToScreen(viewport: Viewport, canvasWidth: number, canvasHeight: number): void {
    if (this.detached) return;
    this.assertAttached();

    const screenCtx = this.screenCtx!;
    const buffer = this.buffer!;

    screenCtx.imageSmoothingEnabled = false;
    screenCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    const srcX = viewport.x * TILE_SIZE;
    const srcY = viewport.y * TILE_SIZE;
    const srcW = canvasWidth / viewport.zoom;
    const srcH = canvasHeight / viewport.zoom;
    screenCtx.drawImage(buffer, srcX, srcY, srcW, srcH, 0, 0, canvasWidth, canvasHeight);
    this.lastBlitVp = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
  }

  /**
   * Patch a single tile on buffer, update snapshot, and blit to screen
   * Extracted from immediatePatchTile callback
   */
  patchTile(tileX: number, tileY: number, tile: number, viewport: Viewport, animFrame: number): void {
    if (this.detached) return;
    this.assertAttached();

    const bufCtx = this.bufferCtx!;
    const screenCtx = this.screenCtx!;

    bufCtx.clearRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.renderTile(bufCtx, tile, tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, animFrame);

    // Update prev snapshot so React-triggered drawMapLayer finds nothing changed
    if (this.prevTiles) {
      this.prevTiles[tileY * MAP_WIDTH + tileX] = tile;
    }

    this.blitToScreen(viewport, screenCtx.canvas.width, screenCtx.canvas.height);
  }

  /**
   * Patch a single tile on buffer only (no blit, no snapshot update)
   * Used for batch updates in multi-tile stamps
   */
  patchTileBuffer(tileX: number, tileY: number, tile: number, animFrame: number): void {
    if (this.detached) return;
    this.assertAttached();

    const bufCtx = this.bufferCtx!;

    bufCtx.clearRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.renderTile(bufCtx, tile, tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, animFrame);

    // Update prev snapshot for this tile
    if (this.prevTiles) {
      this.prevTiles[tileY * MAP_WIDTH + tileX] = tile;
    }
  }

  /**
   * Patch animated tiles in visible area, then blit only the dirty region to screen.
   * Returns true if any animated tiles were found and updated.
   */
  patchAnimatedTiles(
    map: MapData,
    viewport: Viewport,
    animFrame: number,
    canvasWidth: number,
    canvasHeight: number
  ): boolean {
    if (this.detached) return false;
    this.assertAttached();

    const bufCtx = this.bufferCtx!;

    // Patch animated tiles on the buffer (visible area only)
    const tilePixels = TILE_SIZE * viewport.zoom;
    const tilesX = Math.ceil(canvasWidth / tilePixels) + 1;
    const tilesY = Math.ceil(canvasHeight / tilePixels) + 1;
    const startX = Math.floor(viewport.x);
    const startY = Math.floor(viewport.y);
    const endX = Math.min(MAP_WIDTH, startX + tilesX);
    const endY = Math.min(MAP_HEIGHT, startY + tilesY);

    // Track dirty bounding box (tile coords) for partial blit
    let dirtyMinX = MAP_WIDTH, dirtyMinY = MAP_HEIGHT;
    let dirtyMaxX = -1, dirtyMaxY = -1;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const mapIdx = y * MAP_WIDTH + x;
        if (this.clearedAnimatedTiles?.has(mapIdx)) continue;
        const tile = map.tiles[mapIdx];
        if ((tile & 0x8000) === 0) continue;

        bufCtx.clearRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.renderTile(bufCtx, tile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, animFrame);

        // Expand dirty rect
        if (x < dirtyMinX) dirtyMinX = x;
        if (y < dirtyMinY) dirtyMinY = y;
        if (x > dirtyMaxX) dirtyMaxX = x;
        if (y > dirtyMaxY) dirtyMaxY = y;
      }
    }

    // Blit only the dirty region (or skip if nothing changed)
    if (dirtyMaxX >= 0) {
      this.blitDirtyRect(viewport, dirtyMinX, dirtyMinY, dirtyMaxX, dirtyMaxY, canvasWidth, canvasHeight);
    }

    return dirtyMaxX >= 0;
  }

  /**
   * Blit only the dirty tile region from buffer to screen.
   * Converts tile bounds to pixel coordinates and copies just that sub-rectangle.
   */
  private blitDirtyRect(
    viewport: Viewport,
    minTX: number, minTY: number,
    maxTX: number, maxTY: number,
    canvasWidth: number, canvasHeight: number
  ): void {
    if (this.detached) return;
    const screenCtx = this.screenCtx!;
    const buffer = this.buffer!;

    // Buffer pixel coords of dirty region (add 1 tile to maxT for inclusive bounds)
    const bufX = minTX * TILE_SIZE;
    const bufY = minTY * TILE_SIZE;
    const bufW = (maxTX - minTX + 1) * TILE_SIZE;
    const bufH = (maxTY - minTY + 1) * TILE_SIZE;

    // Screen pixel coords — map buffer region through viewport transform
    const screenX = (bufX - viewport.x * TILE_SIZE) * viewport.zoom;
    const screenY = (bufY - viewport.y * TILE_SIZE) * viewport.zoom;
    const screenW = bufW * viewport.zoom;
    const screenH = bufH * viewport.zoom;

    // Clip to canvas bounds
    const clipX = Math.max(0, screenX);
    const clipY = Math.max(0, screenY);
    const clipR = Math.min(canvasWidth, screenX + screenW);
    const clipB = Math.min(canvasHeight, screenY + screenH);
    if (clipR <= clipX || clipB <= clipY) return;

    // Reverse-map clipped screen coords back to buffer source
    const srcX = bufX + (clipX - screenX) / viewport.zoom;
    const srcY = bufY + (clipY - screenY) / viewport.zoom;
    const srcW = (clipR - clipX) / viewport.zoom;
    const srcH = (clipB - clipY) / viewport.zoom;

    screenCtx.imageSmoothingEnabled = false;
    screenCtx.clearRect(clipX, clipY, clipR - clipX, clipB - clipY);
    screenCtx.drawImage(buffer, srcX, srcY, srcW, srcH, clipX, clipY, clipR - clipX, clipB - clipY);
  }

  /**
   * Begin pencil drag operation - accumulate tiles in pendingTiles Map
   */
  beginDrag(): void {
    this.isDragActive = true;
    if (!this.pendingTiles) {
      this.pendingTiles = new Map();
    } else {
      this.pendingTiles.clear();
    }
    if (!this.clearedAnimatedTiles) {
      this.clearedAnimatedTiles = new Set();
    } else {
      this.clearedAnimatedTiles.clear();
    }
  }

  /**
   * Paint tile during drag - accumulate in Map, patch buffer, blit to screen
   */
  paintTile(tileX: number, tileY: number, tile: number): boolean {
    if (!this.isDragActive || !this.pendingTiles) return false;
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return false;

    // Detect animated-to-non-animated transition
    const mapIdx = tileY * MAP_WIDTH + tileX;
    const oldTile = this.prevTiles?.[mapIdx] ?? 0;
    const isOldAnimated = (oldTile & 0x8000) !== 0;
    const isNewAnimated = (tile & 0x8000) !== 0;
    if (isOldAnimated && !isNewAnimated) {
      this.clearedAnimatedTiles?.add(mapIdx);
    }

    // Accumulate tile change
    this.pendingTiles.set(mapIdx, tile);

    // Patch buffer and blit to screen
    this.patchTileBuffer(tileX, tileY, tile, this.animationFrame);
    const vp = this.getViewport(useEditorStore.getState());
    this.blitToScreen(vp, this.screenCtx!.canvas.width, this.screenCtx!.canvas.height);

    return true;
  }

  /**
   * Commit drag - return accumulated tiles array for batch Zustand update
   */
  commitDrag(): Array<{ x: number; y: number; tile: number }> | null {
    if (!this.isDragActive || !this.pendingTiles) return null;

    const tiles: Array<{ x: number; y: number; tile: number }> = [];
    for (const [key, tile] of this.pendingTiles.entries()) {
      tiles.push({
        x: key % MAP_WIDTH,
        y: Math.floor(key / MAP_WIDTH),
        tile
      });
    }

    this.isDragActive = false;
    this.pendingTiles.clear();
    this.clearedAnimatedTiles?.clear();

    return tiles.length > 0 ? tiles : null;
  }

  /**
   * Cancel drag - discard pending tiles (caller must restore buffer)
   */
  cancelDrag(): void {
    if (!this.isDragActive) return;
    this.isDragActive = false;
    this.pendingTiles?.clear();
    this.clearedAnimatedTiles?.clear();
  }

  /**
   * Check if drag is currently active
   */
  getIsDragActive(): boolean {
    return this.isDragActive;
  }

  /**
   * Get viewport from state (handles both global and per-document state)
   */
  private getViewport(state: ReturnType<typeof useEditorStore.getState>): Viewport {
    if (this.documentId) {
      const doc = state.documents.get(this.documentId);
      return doc?.viewport ?? { x: 0, y: 0, zoom: 1 };
    }
    return state.viewport;
  }

  /**
   * Get map from state (handles both global and per-document state)
   */
  private getMap(state: ReturnType<typeof useEditorStore.getState>): MapData | null {
    if (this.documentId) {
      return state.documents.get(this.documentId)?.map ?? null;
    }
    return state.map;
  }

  /**
   * Setup Zustand subscriptions for viewport, map, and animation changes
   * Called during attach() to wire engine to state changes
   */
  private setupSubscriptions(): void {
    // Subscription 1: Viewport changes (immediate blit)
    const unsubViewport = useEditorStore.subscribe((state, prevState) => {
      if (!this.screenCtx) return;
      const vp = this.getViewport(state);
      const prevVp = this.getViewport(prevState);
      if (vp !== prevVp) {
        this.blitToScreen(vp, this.screenCtx.canvas.width, this.screenCtx.canvas.height);
      }
    });
    this.unsubscribers.push(unsubViewport);

    // Subscription 2: Map tile changes (incremental patch, drag-guarded)
    const unsubMap = useEditorStore.subscribe((state, prevState) => {
      if (this.isDragActive) return; // Phase 53 will wire beginDrag/commitDrag
      if (!this.screenCtx) return;
      const map = this.getMap(state);
      const prevMap = this.getMap(prevState);
      if (map !== prevMap && map) {
        const vp = this.getViewport(state);
        this.drawMapLayer(map, vp, this.animationFrame);
      }
    });
    this.unsubscribers.push(unsubMap);

    // Subscription 3: Animation frame (patch animated tiles)
    const unsubAnimation = useEditorStore.subscribe((state, prevState) => {
      if (state.animationFrame !== prevState.animationFrame) {
        this.animationFrame = state.animationFrame;
        if (!this.tilesetImage || !this.screenCtx) return;
        const map = this.getMap(state);
        const vp = this.getViewport(state);
        if (!map) return;
        const canvasWidth = this.screenCtx.canvas.width;
        const canvasHeight = this.screenCtx.canvas.height;
        this.patchAnimatedTiles(map, vp, state.animationFrame, canvasWidth, canvasHeight);
      }
    });
    this.unsubscribers.push(unsubAnimation);

  }
}
