/**
 * TilesetEditor - Pixel-level tile editor with grid view and detail panel.
 *
 * IMPORTANT: All edits happen on a separate working copy (editBuffer).
 * The original tilesetImage passed as a prop is NEVER modified.
 * Changes only apply when the user explicitly commits via "Apply to Tileset".
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LuPencil, LuEraser, LuPipette, LuPaintBucket,
  LuUndo2, LuRedo2, LuRotateCcw, LuFlipHorizontal2,
  LuFlipVertical2, LuCopy, LuClipboardPaste, LuFolderOpen, LuGripHorizontal,
  LuDownload,
} from 'react-icons/lu';
import { useEditorStore } from '@core/editor';
import './TilesetEditor.css';

const TILE_SIZE = 16;
const TILES_PER_ROW = 40;
const DEFAULT_ZOOM = 16;

interface Props {
  farplaneImage?: HTMLImageElement | null;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

type ToolId = 'pencil' | 'eraser' | 'eyedropper' | 'fill';

const MAX_UNDO = 50;

export const TilesetEditor: React.FC<Props> = ({ farplaneImage }) => {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor uses its own tileset image — defaults to map's tileset but can load independently
  const [editorTileset, setEditorTileset] = useState<HTMLImageElement | null>(null);
  const [editorTilesetName, setEditorTilesetName] = useState<string | null>(null);

  // Tile editor uses ONLY its own loaded image — never auto-loads from map editor
  const activeTileset = editorTileset;

  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [hoveredTileId, setHoveredTileId] = useState<number | null>(null);
  const [currentColor, setCurrentColor] = useState<Color>({ r: 255, g: 255, b: 255, a: 255 });
  const [activeTool, setActiveTool] = useState<ToolId>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridScale, _setGridScale] = useState(2);
  const [editorZoom, _setEditorZoom] = useState(DEFAULT_ZOOM);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Export tileset as PNG
  const handleExportPNG = useCallback(() => {
    if (!activeTileset) return;
    const canvas = document.createElement('canvas');
    canvas.width = activeTileset.naturalWidth;
    canvas.height = activeTileset.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(activeTileset, 0, 0);
    const link = document.createElement('a');
    link.download = (editorTilesetName ?? 'tileset').replace(/\.[^.]+$/, '') + '_export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [activeTileset, editorTilesetName]);

  // Load a tileset image from file picker (separate from map editor's tileset)
  const handleLoadTileset = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setEditorTileset(img);
        setEditorTilesetName(file.name);
        setSelectedTileId(0);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, []);

  // Store integration
  const setTileEditorStatus = useEditorStore(state => state.setTileEditorStatus);

  // Sync zoom with store (StatusBar controls can change it)
  const storeZoom = useEditorStore(state => state.tileEditorZoom);
  useEffect(() => { _setEditorZoom(storeZoom); }, [storeZoom]);
  const setEditorZoom = useCallback((z: number | ((prev: number) => number)) => {
    const newZ = typeof z === 'function' ? z(editorZoom) : z;
    const clamped = Math.max(4, Math.min(64, newZ));
    _setEditorZoom(clamped);
    setTileEditorStatus({ zoom: clamped });
  }, [editorZoom, setTileEditorStatus]);

  // Sync grid zoom with store (StatusBar controls can change it)
  const storeGridZoom = useEditorStore(state => state.tileEditorGridZoom);
  useEffect(() => { _setGridScale(storeGridZoom); }, [storeGridZoom]);
  const setGridScale = useCallback((z: number) => {
    const clamped = Math.max(1, Math.min(6, z));
    _setGridScale(clamped);
    setTileEditorStatus({ gridZoom: clamped });
  }, [setTileEditorStatus]);

  // Background mode from store
  const canvasBackgroundMode = useEditorStore(state => state.canvasBackgroundMode);
  const canvasBackgroundColor = useEditorStore(state => state.canvasBackgroundColor);
  const setCanvasBackgroundMode = useEditorStore(state => state.setCanvasBackgroundMode);
  const setCanvasBackgroundColor = useEditorStore(state => state.setCanvasBackgroundColor);

  // Tileset apply history — allows undoing Apply operations
  const tilesetHistoryRef = useRef<string[]>([]);  // data URLs of previous tileset states
  const TILESET_HISTORY_MAX = 20;

  // Floating panel positions
  const [floatPos, setFloatPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const [floatSize, setFloatSize] = useState<{ w: number; h: number }>({ w: 350, h: 380 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<'e' | 's' | 'se' | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; w: number; h: number }>({ mouseX: 0, mouseY: 0, w: 350, h: 380 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = (e.target as HTMLElement).closest('.te-float-panel');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }, []);


  useEffect(() => {
    if (!isDragging) return;
    const setter = setFloatPos;
    const handleMove = (e: MouseEvent) => {
      let x = e.clientX - dragOffsetRef.current.x;
      let y = e.clientY - dragOffsetRef.current.y;
      x = Math.max(-200, Math.min(window.innerWidth - 40, x));
      y = Math.max(0, Math.min(window.innerHeight - 30, y));
      setter({ x, y });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging]);

  const handleResizeStart = useCallback((dir: 'e' | 's' | 'se') => (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, w: floatSize.w, h: floatSize.h };
    setResizeDir(dir);
  }, [floatSize]);

  useEffect(() => {
    if (!resizeDir) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      setFloatSize(prev => ({
        w: (resizeDir === 'e' || resizeDir === 'se') ? Math.max(260, Math.min(700, resizeStartRef.current.w + dx)) : prev.w,
        h: (resizeDir === 's' || resizeDir === 'se') ? Math.max(300, Math.min(900, resizeStartRef.current.h + dy)) : prev.h,
      }));
    };
    const handleUp = () => setResizeDir(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [resizeDir]);

  // Scroll wheel zoom on pixel editor
  const handleEditorWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setEditorZoom(prev => Math.max(4, Math.min(64, prev + (e.deltaY < 0 ? 4 : -4))));
  }, []);

  // Right-click drag to pan the tilesheet grid
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; scrollX: number; scrollY: number }>({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  const handleGridContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // suppress right-click menu
  }, []);

  // Native non-passive wheel listener for zoom (React onWheel is passive, can't preventDefault)
  const gridScaleRef = useRef(gridScale);
  gridScaleRef.current = gridScale;
  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        el.scrollLeft += e.deltaY;
      } else {
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + el.scrollLeft;
        const mouseY = e.clientY - rect.top + el.scrollTop;
        const oldScale = gridScaleRef.current;
        const step = e.deltaY < 0 ? 1 : -1;
        const newScale = Math.max(1, Math.min(6, oldScale + step));
        if (newScale === oldScale) return;
        setGridScale(newScale);
        requestAnimationFrame(() => {
          const ratio = newScale / oldScale;
          el.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
          el.scrollTop = mouseY * ratio - (e.clientY - rect.top);
        });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setGridScale]);

  const [spaceHeld, setSpaceHeld] = useState(false);

  // Space bar for pan mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setSpaceHeld(true); } };
    const up = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const handleGridPanStart = useCallback((e: React.MouseEvent) => {
    // Pan on: middle-click, right-click, or left-click when space held
    if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      const container = gridScrollRef.current;
      if (!container) return;
      panStartRef.current = { x: e.clientX, y: e.clientY, scrollX: container.scrollLeft, scrollY: container.scrollTop };
      setIsPanning(true);
    }
  }, [spaceHeld]);

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      const container = gridScrollRef.current;
      if (!container) return;
      container.scrollLeft = panStartRef.current.scrollX - (e.clientX - panStartRef.current.x);
      container.scrollTop = panStartRef.current.scrollY - (e.clientY - panStartRef.current.y);
    };
    const handleUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isPanning]);

  // Initialize float position on first render
  const floatInitRef = useRef(false);
  useEffect(() => {
    if (floatInitRef.current || floatPos.x >= 0) return;
    floatInitRef.current = true;
    // Default: right side of screen, vertically centered
    setFloatPos({ x: window.innerWidth - 370, y: 80 });
  }, [floatPos.x]);

  // Working copy of current tile pixels — never touches the original tileset
  const [tilePixels, setTilePixels] = useState<ImageData | null>(null);
  // Clipboard for copy/paste
  const clipboardRef = useRef<ImageData | null>(null);

  // Undo/redo stacks
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  const pushUndo = useCallback((pixels: ImageData) => {
    undoStackRef.current.push(new ImageData(new Uint8ClampedArray(pixels.data), TILE_SIZE, TILE_SIZE));
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || !tilePixels) return;
    redoStackRef.current.push(new ImageData(new Uint8ClampedArray(tilePixels.data), TILE_SIZE, TILE_SIZE));
    setTilePixels(undoStackRef.current.pop()!);
  }, [tilePixels]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0 || !tilePixels) return;
    undoStackRef.current.push(new ImageData(new Uint8ClampedArray(tilePixels.data), TILE_SIZE, TILE_SIZE));
    setTilePixels(redoStackRef.current.pop()!);
  }, [tilePixels]);

  // Extract tile pixels from tileset into a COPY (never modifies original)
  const extractTilePixels = useCallback((tileId: number): ImageData | null => {
    if (!activeTileset) return null;
    const col = tileId % TILES_PER_ROW;
    const row = Math.floor(tileId / TILES_PER_ROW);
    const tmp = document.createElement('canvas');
    tmp.width = TILE_SIZE;
    tmp.height = TILE_SIZE;
    const ctx = tmp.getContext('2d')!;
    ctx.drawImage(activeTileset, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
    return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  }, [activeTileset]);

  // Tile transforms
  const handleFlipH = useCallback(() => {
    if (!tilePixels) return;
    pushUndo(tilePixels);
    const src = tilePixels.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const si = (y * TILE_SIZE + x) * 4;
        const di = (y * TILE_SIZE + (TILE_SIZE - 1 - x)) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    setTilePixels(new ImageData(dst, TILE_SIZE, TILE_SIZE));
    setHasUnsavedChanges(true);
  }, [tilePixels, pushUndo]);

  const handleFlipV = useCallback(() => {
    if (!tilePixels) return;
    pushUndo(tilePixels);
    const src = tilePixels.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const si = (y * TILE_SIZE + x) * 4;
        const di = ((TILE_SIZE - 1 - y) * TILE_SIZE + x) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    setTilePixels(new ImageData(dst, TILE_SIZE, TILE_SIZE));
    setHasUnsavedChanges(true);
  }, [tilePixels, pushUndo]);

  const handleRotateCCW = useCallback(() => {
    if (!tilePixels) return;
    pushUndo(tilePixels);
    const src = tilePixels.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const si = (y * TILE_SIZE + x) * 4;
        const di = ((TILE_SIZE - 1 - x) * TILE_SIZE + y) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    setTilePixels(new ImageData(dst, TILE_SIZE, TILE_SIZE));
    setHasUnsavedChanges(true);
  }, [tilePixels, pushUndo]);

  const handleCopy = useCallback(() => {
    if (!tilePixels) return;
    clipboardRef.current = new ImageData(new Uint8ClampedArray(tilePixels.data), TILE_SIZE, TILE_SIZE);
  }, [tilePixels]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current || !tilePixels) return;
    pushUndo(tilePixels);
    setTilePixels(new ImageData(new Uint8ClampedArray(clipboardRef.current.data), TILE_SIZE, TILE_SIZE));
    setHasUnsavedChanges(true);
  }, [tilePixels, pushUndo]);

  // Reset tile to original from tileset
  const handleRevert = useCallback(() => {
    const pixels = extractTilePixels(selectedTileId);
    if (pixels) {
      if (tilePixels) pushUndo(tilePixels);
      setTilePixels(pixels);
      setHasUnsavedChanges(false);
    }
  }, [selectedTileId, extractTilePixels, tilePixels, pushUndo]);

  // Apply edited tile pixels back onto the tileset image
  const handleApplyTile = useCallback(() => {
    if (!activeTileset || !tilePixels) return;
    // Save current tileset to history before modifying
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = activeTileset.naturalWidth;
    snapCanvas.height = activeTileset.naturalHeight;
    snapCanvas.getContext('2d')!.drawImage(activeTileset, 0, 0);
    tilesetHistoryRef.current.push(snapCanvas.toDataURL('image/png'));
    if (tilesetHistoryRef.current.length > TILESET_HISTORY_MAX) tilesetHistoryRef.current.shift();

    const col = selectedTileId % TILES_PER_ROW;
    const row = Math.floor(selectedTileId / TILES_PER_ROW);
    const canvas = document.createElement('canvas');
    canvas.width = activeTileset.naturalWidth;
    canvas.height = activeTileset.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(activeTileset, 0, 0);
    ctx.putImageData(tilePixels, col * TILE_SIZE, row * TILE_SIZE);
    const img = new Image();
    img.onload = () => {
      setEditorTileset(img);
      setHasUnsavedChanges(false);
    };
    img.src = canvas.toDataURL('image/png');
  }, [activeTileset, tilePixels, selectedTileId]);

  // Undo last Apply — restore previous tileset snapshot
  const handleUndoApply = useCallback(() => {
    const prev = tilesetHistoryRef.current.pop();
    if (!prev) return;
    const img = new Image();
    img.onload = () => {
      setEditorTileset(img);
      // Re-extract the current tile from the restored tileset
      const col = selectedTileId % TILES_PER_ROW;
      const row = Math.floor(selectedTileId / TILES_PER_ROW);
      const tmp = document.createElement('canvas');
      tmp.width = TILE_SIZE; tmp.height = TILE_SIZE;
      const ctx = tmp.getContext('2d')!;
      ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
      setTilePixels(ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE));
      setHasUnsavedChanges(false);
    };
    img.src = prev;
  }, [selectedTileId]);

  // --- Drawing ---

  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas || !activeTileset) return;
    const ctx = canvas.getContext('2d')!;
    const totalRows = Math.ceil(activeTileset.naturalHeight / TILE_SIZE);
    const scaledTile = TILE_SIZE * gridScale;
    canvas.width = TILES_PER_ROW * scaledTile;
    canvas.height = totalRows * scaledTile;
    ctx.imageSmoothingEnabled = false;

    // Background — matches CanvasEngine rendering
    if (canvasBackgroundMode === 'classic') {
      ctx.fillStyle = '#FF00FF'; // SEdit fuchsia
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (canvasBackgroundMode === 'color') {
      ctx.fillStyle = canvasBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (canvasBackgroundMode === 'farplane' && farplaneImage) {
      ctx.drawImage(farplaneImage, 0, 0, canvas.width, canvas.height);
    } else if (canvasBackgroundMode === 'transparent') {
      // Checkerboard transparency pattern
      const cSize = 4 * gridScale;
      for (let y = 0; y < canvas.height; y += cSize) {
        for (let x = 0; x < canvas.width; x += cSize) {
          ctx.fillStyle = ((x / cSize + y / cSize) % 2 === 0) ? '#2a2a2a' : '#1e1e1e';
          ctx.fillRect(x, y, cSize, cSize);
        }
      }
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(activeTileset, 0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= TILES_PER_ROW; x++) {
      ctx.beginPath(); ctx.moveTo(x * scaledTile + 0.5, 0); ctx.lineTo(x * scaledTile + 0.5, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= totalRows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * scaledTile + 0.5); ctx.lineTo(canvas.width, y * scaledTile + 0.5); ctx.stroke();
    }

    // Selected tile highlight
    const selCol = selectedTileId % TILES_PER_ROW;
    const selRow = Math.floor(selectedTileId / TILES_PER_ROW);
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(selCol * scaledTile + 1, selRow * scaledTile + 1, scaledTile - 2, scaledTile - 2);

    // Hovered tile
    if (hoveredTileId !== null && hoveredTileId !== selectedTileId) {
      const hCol = hoveredTileId % TILES_PER_ROW;
      const hRow = Math.floor(hoveredTileId / TILES_PER_ROW);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hCol * scaledTile + 0.5, hRow * scaledTile + 0.5, scaledTile - 1, scaledTile - 1);
    }
  }, [activeTileset, selectedTileId, hoveredTileId, gridScale, canvasBackgroundMode, canvasBackgroundColor, farplaneImage]);

  const drawEditor = useCallback(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !tilePixels) return;
    const ctx = canvas.getContext('2d')!;
    const z = editorZoom;
    const size = TILE_SIZE * z;
    canvas.width = size;
    canvas.height = size;

    // Checkerboard
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        ctx.fillStyle = ((x + y) % 2 === 0) ? '#2a2a2a' : '#1e1e1e';
        ctx.fillRect(x * z, y * z, z, z);
      }
    }

    // Pixels
    const data = tilePixels.data;
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const i = (y * TILE_SIZE + x) * 4;
        if (data[i + 3] > 0) {
          ctx.fillStyle = `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3] / 255})`;
          ctx.fillRect(x * z, y * z, z, z);
        }
      }
    }

    // Grid (only show when zoomed enough)
    if (z >= 8) {
      ctx.strokeStyle = `rgba(255,255,255,${z >= 12 ? 0.05 : 0.03})`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= TILE_SIZE; x++) {
        ctx.beginPath(); ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, size); ctx.stroke();
      }
      for (let y = 0; y <= TILE_SIZE; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * z + 0.5); ctx.lineTo(size, y * z + 0.5); ctx.stroke();
      }
    }
  }, [tilePixels, editorZoom]);

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !tilePixels) return;
    const ctx = canvas.getContext('2d')!;
    const s = 4;
    canvas.width = TILE_SIZE * s;
    canvas.height = TILE_SIZE * s;
    ctx.imageSmoothingEnabled = false;
    const tmp = document.createElement('canvas');
    tmp.width = TILE_SIZE; tmp.height = TILE_SIZE;
    tmp.getContext('2d')!.putImageData(tilePixels, 0, 0);
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [tilePixels]);

  // Load tile on selection change — always extract fresh copy from ORIGINAL tileset
  useEffect(() => {
    const pixels = extractTilePixels(selectedTileId);
    if (pixels) {
      setTilePixels(pixels);
      setHasUnsavedChanges(false);
      undoStackRef.current = [];
      redoStackRef.current = [];
    }
  }, [selectedTileId, extractTilePixels]);

  useEffect(() => { drawGrid(); }, [drawGrid]);
  useEffect(() => { drawEditor(); }, [drawEditor]);
  useEffect(() => { drawPreview(); }, [drawPreview]);

  // Sync tile editor status to store for StatusBar display
  useEffect(() => {
    setTileEditorStatus({ active: true, tileId: selectedTileId, zoom: editorZoom, tool: activeTool });
    return () => { setTileEditorStatus({ active: false }); };
  }, [selectedTileId, editorZoom, activeTool, setTileEditorStatus]);

  // --- Input handlers ---

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTileset) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaledTile = TILE_SIZE * gridScale;
    const col = Math.floor((e.clientX - rect.left) / scaledTile);
    const row = Math.floor((e.clientY - rect.top) / scaledTile);
    const totalRows = Math.ceil(activeTileset.naturalHeight / TILE_SIZE);
    if (col >= 0 && col < TILES_PER_ROW && row >= 0 && row < totalRows) {
      setSelectedTileId(row * TILES_PER_ROW + col);
    }
  }, [activeTileset, gridScale]);

  const handleGridMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeTileset) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaledTile = TILE_SIZE * gridScale;
    const col = Math.floor((e.clientX - rect.left) / scaledTile);
    const row = Math.floor((e.clientY - rect.top) / scaledTile);
    const totalRows = Math.ceil(activeTileset.naturalHeight / TILE_SIZE);
    if (col >= 0 && col < TILES_PER_ROW && row >= 0 && row < totalRows) {
      setHoveredTileId(row * TILES_PER_ROW + col);
    } else {
      setHoveredTileId(null);
    }
  }, [activeTileset, gridScale]);

  // Pixel coordinate from mouse event on the zoomed editor canvas
  // Convert mouse position to tile pixel coordinate (0-15, 0-15)
  // Uses bounding rect so it works regardless of CSS scaling
  const getPixelCoord = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    // Map mouse position to 0-1 within the canvas element, then to tile pixel
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    const px = Math.floor(normX * TILE_SIZE);
    const py = Math.floor(normY * TILE_SIZE);
    if (px < 0 || px >= TILE_SIZE || py < 0 || py >= TILE_SIZE) return null;
    return [px, py];
  }, []);

  const applyTool = useCallback((px: number, py: number, pixels: ImageData, isStart: boolean): ImageData => {
    const newData = isStart
      ? new ImageData(new Uint8ClampedArray(pixels.data), TILE_SIZE, TILE_SIZE)
      : pixels; // continue stroke on same buffer
    const i = (py * TILE_SIZE + px) * 4;

    if (activeTool === 'eyedropper') {
      setCurrentColor({ r: newData.data[i], g: newData.data[i + 1], b: newData.data[i + 2], a: newData.data[i + 3] });
      setActiveTool('pencil');
      return pixels; // don't modify
    }
    if (activeTool === 'eraser') {
      newData.data[i] = 0; newData.data[i + 1] = 0; newData.data[i + 2] = 0; newData.data[i + 3] = 0;
    } else if (activeTool === 'fill') {
      floodFill(newData, px, py, currentColor);
    } else {
      newData.data[i] = currentColor.r; newData.data[i + 1] = currentColor.g;
      newData.data[i + 2] = currentColor.b; newData.data[i + 3] = currentColor.a;
    }
    return newData;
  }, [activeTool, currentColor]);

  // Ref to track the in-progress stroke buffer (avoids creating new ImageData per pixel)
  const strokeBufferRef = useRef<ImageData | null>(null);
  const lastPaintedRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

  // Paint a single pixel directly onto the canvas — no React state update, instant feedback
  const paintPixelDirect = useCallback((px: number, py: number, buf: ImageData) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const z = editorZoom;
    const i = (py * TILE_SIZE + px) * 4;
    const a = buf.data[i + 3];
    // Redraw just this one cell: checkerboard + pixel + grid
    const checker = ((px + py) % 2 === 0) ? '#2a2a2a' : '#1e1e1e';
    ctx.fillStyle = checker;
    ctx.fillRect(px * z, py * z, z, z);
    if (a > 0) {
      ctx.fillStyle = `rgba(${buf.data[i]},${buf.data[i + 1]},${buf.data[i + 2]},${a / 255})`;
      ctx.fillRect(px * z, py * z, z, z);
    }
    if (z >= 8) {
      ctx.strokeStyle = `rgba(255,255,255,${z >= 12 ? 0.05 : 0.03})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px * z + 0.5, py * z + 0.5, z - 1, z - 1);
    }
  }, [editorZoom]);

  const handleEditorMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tilePixels) return;
    const coord = getPixelCoord(e);
    if (!coord) return;

    pushUndo(tilePixels);
    lastPaintedRef.current = { x: coord[0], y: coord[1] };
    const result = applyTool(coord[0], coord[1], tilePixels, true);
    strokeBufferRef.current = result;
    // Draw directly — don't trigger React re-render during stroke
    if (activeTool === 'fill') {
      setTilePixels(result); // fill changes many pixels, full redraw
    } else {
      paintPixelDirect(coord[0], coord[1], result);
    }
    setIsDrawing(true);
    setHasUnsavedChanges(true);
  }, [tilePixels, getPixelCoord, applyTool, pushUndo, activeTool, paintPixelDirect]);

  const handleEditorMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getPixelCoord(e);
    if (coord) {
      setTileEditorStatus({ pixelX: coord[0], pixelY: coord[1] });
    }
    if (!isDrawing || activeTool === 'fill' || activeTool === 'eyedropper') return;
    if (!coord || !strokeBufferRef.current) return;
    if (coord[0] === lastPaintedRef.current.x && coord[1] === lastPaintedRef.current.y) return;
    lastPaintedRef.current = { x: coord[0], y: coord[1] };

    const result = applyTool(coord[0], coord[1], strokeBufferRef.current, false);
    strokeBufferRef.current = result;
    // Direct canvas paint — no React state update
    paintPixelDirect(coord[0], coord[1], result);
  }, [isDrawing, activeTool, getPixelCoord, applyTool, setTileEditorStatus, paintPixelDirect]);

  const handleEditorMouseUp = useCallback(() => {
    if (strokeBufferRef.current) {
      // Commit stroke to React state (triggers preview update etc)
      setTilePixels(strokeBufferRef.current);
    }
    setIsDrawing(false);
    strokeBufferRef.current = null;
    lastPaintedRef.current = { x: -1, y: -1 };
  }, []);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCurrentColor({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: 255 });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if (ctrl && e.key === 'y') { e.preventDefault(); handleRedo(); }
      else if (ctrl && e.key === 'c') { e.preventDefault(); handleCopy(); }
      else if (ctrl && e.key === 'v') { e.preventDefault(); handlePaste(); }
      else if (e.key === 'p' || e.key === 'b') setActiveTool('pencil');
      else if (e.key === 'e') setActiveTool('eraser');
      else if (e.key === 'i') setActiveTool('eyedropper');
      else if (e.key === 'g') setActiveTool('fill');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleCopy, handlePaste]);

  const colorHex = `#${currentColor.r.toString(16).padStart(2, '0')}${currentColor.g.toString(16).padStart(2, '0')}${currentColor.b.toString(16).padStart(2, '0')}`;

  if (!activeTileset) {
    return (
      <div className="tileset-editor empty">
        <p>No tileset loaded</p>
        <button className="te-load-btn" onClick={handleLoadTileset}><LuFolderOpen size={12} /> Load Image</button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    );
  }

  const tileCol = selectedTileId % TILES_PER_ROW;
  const tileRow = Math.floor(selectedTileId / TILES_PER_ROW);

  return (
    <div className="tileset-editor">
      {/* Left: tilesheet grid overview */}
      <div className="te-grid-panel">
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <div className="te-grid-header">
          <div className="te-grid-header-row">
            <span className="te-label">{editorTilesetName ?? 'Tilesheet'}</span>
            <button className="te-load-btn" onClick={handleLoadTileset} title="Load tileset image"><LuFolderOpen size={11} /></button>
            {activeTileset && <button className="te-load-btn te-export-btn" onClick={handleExportPNG} title="Export as PNG"><LuDownload size={11} /></button>}
            <select className="te-bg-select" value={canvasBackgroundMode} onChange={(e) => setCanvasBackgroundMode(e.target.value)} title="Background">
              <option value="transparent">Transparent</option>
              <option value="classic">SEdit Classic</option>
              <option value="farplane">Farplane</option>
              <option value="color">Custom Color</option>
              <option value="image">Custom Image</option>
            </select>
            {canvasBackgroundMode === 'color' && (
              <input type="color" className="te-bg-color" value={canvasBackgroundColor} onChange={(e) => setCanvasBackgroundColor(e.target.value)} />
            )}
          </div>
        </div>
        <div
          className={`te-grid-scroll${isPanning ? ' te-panning' : spaceHeld ? ' te-pan-ready' : ''}`}
          ref={gridScrollRef}
          onMouseDown={handleGridPanStart}
          onContextMenu={handleGridContextMenu}
        >
          <canvas ref={gridCanvasRef} onClick={handleGridClick} onMouseMove={handleGridMove} onMouseLeave={() => setHoveredTileId(null)} />
        </div>
      </div>

      {/* Floating pixel editor panel with integrated toolbar */}
      {createPortal(<div
        className="te-float-panel"
        style={{ left: floatPos.x, top: floatPos.y, width: floatSize.w, height: floatSize.h }}
      >
        <div className="te-float-titlebar" onMouseDown={handleDragStart}>
          <LuGripHorizontal size={12} className="te-drag-icon" />
          <span className="te-label">Tile #{selectedTileId}</span>
          <span className="te-sublabel">({tileCol}, {tileRow})</span>
          {hasUnsavedChanges && <span className="te-modified-badge">modified</span>}
        </div>

        <div className="te-float-body">
          {/* Left: tool sidebar */}
          <div className="te-sidebar">
            <button className={`te-tool-btn${activeTool === 'pencil' ? ' active' : ''}`} onClick={() => setActiveTool('pencil')} title="Pencil (P)"><LuPencil size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'eraser' ? ' active' : ''}`} onClick={() => setActiveTool('eraser')} title="Eraser (E)"><LuEraser size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'eyedropper' ? ' active' : ''}`} onClick={() => setActiveTool('eyedropper')} title="Eyedropper (I)"><LuPipette size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'fill' ? ' active' : ''}`} onClick={() => setActiveTool('fill')} title="Fill (G)"><LuPaintBucket size={14} /></button>
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={handleUndo} title="Undo (Ctrl+Z)"><LuUndo2 size={14} /></button>
            <button className="te-tool-btn" onClick={handleRedo} title="Redo (Ctrl+Y)"><LuRedo2 size={14} /></button>
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={handleFlipH} title="Flip Horizontal"><LuFlipHorizontal2 size={14} /></button>
            <button className="te-tool-btn" onClick={handleFlipV} title="Flip Vertical"><LuFlipVertical2 size={14} /></button>
            <button className="te-tool-btn" onClick={handleRotateCCW} title="Rotate 90 CCW"><LuRotateCcw size={14} /></button>
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={handleCopy} title="Copy (Ctrl+C)"><LuCopy size={14} /></button>
            <button className="te-tool-btn" onClick={handlePaste} title="Paste (Ctrl+V)"><LuClipboardPaste size={14} /></button>
            <div className="te-sidebar-sep" />
            <input type="color" value={colorHex} onChange={handleColorChange} className="te-sidebar-color" title="Pick color" />
            <div className="te-color-swatch" style={{ background: colorHex }} />
          </div>

          {/* Right: pixel canvas */}
          <div className="te-editor-area">
            <div className="te-editor-main">
              <div className="te-editor-scroll" onWheel={handleEditorWheel}>
                <canvas
                  ref={editorCanvasRef}
                  className="te-pixel-canvas"
                  style={{ width: TILE_SIZE * editorZoom, height: TILE_SIZE * editorZoom }}
                  onMouseDown={handleEditorMouseDown}
                  onMouseMove={handleEditorMouseMove}
                  onMouseUp={handleEditorMouseUp}
                  onMouseLeave={handleEditorMouseUp}
                />
              </div>
              <div className="te-zoom-indicator">{editorZoom}x</div>
            </div>

            <div className="te-panel-footer">
              <div className="te-preview-wrap">
                <canvas ref={previewCanvasRef} className="te-preview-canvas" />
              </div>
              <div className="te-footer-actions">
                {hasUnsavedChanges && (<>
                  <button className="te-apply-btn" onClick={handleApplyTile} title="Apply edits to tileset">Apply</button>
                  <button className="te-revert-btn" onClick={handleRevert} title="Revert to original">Revert</button>
                </>)}
                {tilesetHistoryRef.current.length > 0 && (
                  <button className="te-undo-apply-btn" onClick={handleUndoApply} title="Undo last Apply">Undo Apply</button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="te-resize-e" onMouseDown={handleResizeStart('e')} />
        <div className="te-resize-s" onMouseDown={handleResizeStart('s')} />
        <div className="te-resize-se" onMouseDown={handleResizeStart('se')} />
      </div>, document.body)}
    </div>
  );
};

/** Flood fill */
function floodFill(imageData: ImageData, startX: number, startY: number, fillColor: Color): void {
  const data = imageData.data;
  const w = imageData.width, h = imageData.height;
  const si = (startY * w + startX) * 4;
  const tR = data[si], tG = data[si + 1], tB = data[si + 2], tA = data[si + 3];
  if (tR === fillColor.r && tG === fillColor.g && tB === fillColor.b && tA === fillColor.a) return;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<number>();
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = y * w + x;
    if (x < 0 || x >= w || y < 0 || y >= h || visited.has(key)) continue;
    const i = key * 4;
    if (data[i] !== tR || data[i + 1] !== tG || data[i + 2] !== tB || data[i + 3] !== tA) continue;
    visited.add(key);
    data[i] = fillColor.r; data[i + 1] = fillColor.g; data[i + 2] = fillColor.b; data[i + 3] = fillColor.a;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
