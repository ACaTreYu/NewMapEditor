/**
 * SpriteEditor — Pixel-level editor for imgTuna.png sprite regions.
 *
 * Twin of TilesetEditor with identical tool sidebar, floating panel, and
 * Apply/Revert/Undo Apply flow. Key difference: sprites have variable
 * dimensions and are selected by named region rather than uniform grid.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LuPencil, LuEraser, LuPipette, LuPaintBucket, LuSquareDashed,
  LuUndo2, LuRedo2, LuRotateCcw, LuFlipHorizontal2,
  LuFlipVertical2, LuCopy, LuClipboardPaste, LuFolderOpen, LuGripHorizontal,
  LuDownload, LuFilter, LuZoomIn, LuZoomOut,
} from 'react-icons/lu';
import { SPRITE_REGIONS, CATEGORY_COLORS, SpriteRegion } from './spriteRegions';
import { fixPatchCoordinates, getFixSummary } from './patchFixer';
import { useEditorStore } from '@core/editor';
import './SpriteEditor.css';


const DEFAULT_ZOOM = 12;
const MAX_UNDO = 50;

interface Color {
  r: number; g: number; b: number; a: number;
}

type ToolId = 'pencil' | 'eraser' | 'eyedropper' | 'fill' | 'select';

interface Selection {
  x: number; y: number; w: number; h: number;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

interface Props {
  /** False while the editor is mounted but hidden (display:none tab) —
   *  gates global key handlers and StatusBar sync so they don't leak. */
  active?: boolean;
}

export const SpriteEditor: React.FC<Props> = ({ active = true }) => {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sprite sheet image (imgTuna.png) — loaded independently
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null);
  const [spriteImageName, setSpriteImageName] = useState<string | null>(null);

  // Edit rect — can come from a named region or freeform sheet click/drag
  const [editRect, setEditRect] = useState<{ x: number; y: number; w: number; h: number; label: string } | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  // Freeform rect drag on sheet (Ctrl+drag)
  const [isRectDragging, setIsRectDragging] = useState(false);
  const rectDragStartRef = useRef({ x: 0, y: 0 });

  // Select a named region — sets editRect from its coordinates
  const selectNamedRegion = useCallback((id: string) => {
    const region = SPRITE_REGIONS.find(r => r.id === id);
    if (!region) return;
    setSelectedRegionId(id);
    setEditRect({ x: region.x, y: region.y, w: region.width, h: region.height, label: region.label });
  }, []);

  // For backward compat — derived from editRect
  const selectedRegion = editRect;

  // Category filter
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));

  // Drawing state
  const [currentColor, setCurrentColor] = useState<Color>({ r: 255, g: 255, b: 255, a: 255 });
  const [activeTool, setActiveTool] = useState<ToolId>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridScale, _setGridScale] = useState(2);
  const [editorZoom, _setEditorZoom] = useState(DEFAULT_ZOOM);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorZoomRef = useRef(editorZoom);
  editorZoomRef.current = editorZoom;

  // Selection state (for select tool)
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectStartRef = useRef({ x: 0, y: 0 });

  // Pixel editor pan state
  const [editorPanning, setEditorPanning] = useState(false);
  const editorPanStartRef = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  // Zoom helpers
  const setEditorZoom = useCallback((z: number | ((prev: number) => number)) => {
    _setEditorZoom(prev => {
      const newZ = typeof z === 'function' ? z(prev) : z;
      const clamped = Math.max(2, Math.min(64, newZ));
      editorZoomRef.current = clamped;
      return clamped;
    });
  }, []);

  const gridScaleRef = useRef(gridScale);
  gridScaleRef.current = gridScale;
  const setGridScale = useCallback((z: number) => {
    const clamped = Math.max(1, Math.min(8, z));
    gridScaleRef.current = clamped;
    _setGridScale(clamped);
  }, []);

  // Sprite image history for Undo Apply
  const imageHistoryRef = useRef<string[]>([]);
  const IMAGE_HISTORY_MAX = 20;

  // Floating panel state
  const [floatPos, setFloatPos] = useState({ x: -1, y: -1 });
  const [floatSize, setFloatSize] = useState({ w: 400, h: 420 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<'e' | 's' | 'se' | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, w: 400, h: 420 });

  // Pan state
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Working copy of selected sprite region pixels
  const [spritePixels, setSpritePixels] = useState<ImageData | null>(null);
  const clipboardRef = useRef<ImageData | null>(null);

  // Undo/redo
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  const pushUndo = useCallback((pixels: ImageData) => {
    undoStackRef.current.push(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height));
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || !spritePixels) return;
    redoStackRef.current.push(new ImageData(new Uint8ClampedArray(spritePixels.data), spritePixels.width, spritePixels.height));
    setSpritePixels(undoStackRef.current.pop()!);
  }, [spritePixels]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0 || !spritePixels) return;
    undoStackRef.current.push(new ImageData(new Uint8ClampedArray(spritePixels.data), spritePixels.width, spritePixels.height));
    setSpritePixels(redoStackRef.current.pop()!);
  }, [spritePixels]);

  // --- File I/O ---

  const handleLoadImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setSpriteImage(img);
        setSpriteImageName(file.name);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleExportPNG = useCallback(() => {
    if (!spriteImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = spriteImage.naturalWidth;
    canvas.height = spriteImage.naturalHeight;
    canvas.getContext('2d')!.drawImage(spriteImage, 0, 0);
    const link = document.createElement('a');
    link.download = (spriteImageName ?? 'imgTuna').replace(/\.[^.]+$/, '') + '_export.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [spriteImage, spriteImageName]);

  // --- Auto Patch Fixer ---
  const handleFixPatch = useCallback(() => {
    if (!spriteImage) return;
    if (!confirm(`Auto Patch Fixer\n\n${getFixSummary()}\n\nThis will move sprites from old coordinates to new ones.\nPixels at old positions will be cleared.\n\nProceed?`)) return;

    // Save to history first
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = spriteImage.naturalWidth;
    snapCanvas.height = spriteImage.naturalHeight;
    snapCanvas.getContext('2d')!.drawImage(spriteImage, 0, 0);
    imageHistoryRef.current.push(snapCanvas.toDataURL('image/png'));
    if (imageHistoryRef.current.length > IMAGE_HISTORY_MAX) imageHistoryRef.current.shift();

    const { canvas, result } = fixPatchCoordinates(spriteImage);
    const img = new Image();
    img.onload = () => {
      setSpriteImage(img);
      console.log('[PatchFixer]', result.log);
      alert(`Patch fix complete!\n\nMoved: ${result.movedCount} regions\nSkipped: ${result.skippedCount} regions\n\nUse "Undo Apply" to revert if needed.`);
    };
    img.src = canvas.toDataURL('image/png');
  }, [spriteImage]);

  // --- Extract sprite region pixels ---

  const extractRegionPixels = useCallback((rect: { x: number; y: number; w: number; h: number }): ImageData | null => {
    if (!spriteImage) return null;
    const tmp = document.createElement('canvas');
    tmp.width = rect.w;
    tmp.height = rect.h;
    const ctx = tmp.getContext('2d')!;
    ctx.drawImage(spriteImage, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    return ctx.getImageData(0, 0, rect.w, rect.h);
  }, [spriteImage]);

  // --- Transforms (handle variable dimensions) ---

  const handleFlipH = useCallback(() => {
    if (!spritePixels) return;
    pushUndo(spritePixels);
    const w = spritePixels.width, h = spritePixels.height;
    const src = spritePixels.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = (y * w + (w - 1 - x)) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    setSpritePixels(new ImageData(dst, w, h));
    setHasUnsavedChanges(true);
  }, [spritePixels, pushUndo]);

  const handleFlipV = useCallback(() => {
    if (!spritePixels) return;
    pushUndo(spritePixels);
    const w = spritePixels.width, h = spritePixels.height;
    const src = spritePixels.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = ((h - 1 - y) * w + x) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    setSpritePixels(new ImageData(dst, w, h));
    setHasUnsavedChanges(true);
  }, [spritePixels, pushUndo]);

  const handleRotateCCW = useCallback(() => {
    if (!spritePixels) return;
    const w = spritePixels.width, h = spritePixels.height;
    if (w !== h) return; // Rotation only works on square sprites
    pushUndo(spritePixels);
    const src = spritePixels.data;
    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = ((w - 1 - x) * w + y) * 4;
        dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
      }
    }
    setSpritePixels(new ImageData(dst, w, h));
    setHasUnsavedChanges(true);
  }, [spritePixels, pushUndo]);

  const handleCopy = useCallback(() => {
    if (!spritePixels) return;
    clipboardRef.current = new ImageData(new Uint8ClampedArray(spritePixels.data), spritePixels.width, spritePixels.height);
  }, [spritePixels]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current || !spritePixels) return;
    if (clipboardRef.current.width !== spritePixels.width || clipboardRef.current.height !== spritePixels.height) return;
    pushUndo(spritePixels);
    setSpritePixels(new ImageData(new Uint8ClampedArray(clipboardRef.current.data), clipboardRef.current.width, clipboardRef.current.height));
    setHasUnsavedChanges(true);
  }, [spritePixels, pushUndo]);

  // --- Revert / Apply / Undo Apply ---

  const handleRevert = useCallback(() => {
    if (!selectedRegion) return;
    const pixels = extractRegionPixels(selectedRegion);
    if (pixels) {
      if (spritePixels) pushUndo(spritePixels);
      setSpritePixels(pixels);
      setHasUnsavedChanges(false);
    }
  }, [selectedRegion, extractRegionPixels, spritePixels, pushUndo]);

  const handleApply = useCallback(() => {
    if (!spriteImage || !spritePixels || !selectedRegion) return;
    // Save current image to history
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = spriteImage.naturalWidth;
    snapCanvas.height = spriteImage.naturalHeight;
    snapCanvas.getContext('2d')!.drawImage(spriteImage, 0, 0);
    imageHistoryRef.current.push(snapCanvas.toDataURL('image/png'));
    if (imageHistoryRef.current.length > IMAGE_HISTORY_MAX) imageHistoryRef.current.shift();

    const canvas = document.createElement('canvas');
    canvas.width = spriteImage.naturalWidth;
    canvas.height = spriteImage.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(spriteImage, 0, 0);
    ctx.putImageData(spritePixels, selectedRegion.x, selectedRegion.y);
    const img = new Image();
    img.onload = () => {
      setSpriteImage(img);
      setHasUnsavedChanges(false);
    };
    img.src = canvas.toDataURL('image/png');
  }, [spriteImage, spritePixels, selectedRegion]);

  const handleUndoApply = useCallback(() => {
    const prev = imageHistoryRef.current.pop();
    if (!prev || !selectedRegion) return;
    const img = new Image();
    img.onload = () => {
      setSpriteImage(img);
      const tmp = document.createElement('canvas');
      tmp.width = selectedRegion.w;
      tmp.height = selectedRegion.h;
      const ctx = tmp.getContext('2d')!;
      ctx.drawImage(img, selectedRegion.x, selectedRegion.y, selectedRegion.w, selectedRegion.h, 0, 0, selectedRegion.w, selectedRegion.h);
      setSpritePixels(ctx.getImageData(0, 0, selectedRegion.w, selectedRegion.h));
      setHasUnsavedChanges(false);
    };
    img.src = prev;
  }, [selectedRegion]);

  // --- Drawing ---

  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas || !spriteImage) return;
    const ctx = canvas.getContext('2d')!;
    const s = gridScale;
    canvas.width = spriteImage.naturalWidth * s;
    canvas.height = spriteImage.naturalHeight * s;
    ctx.imageSmoothingEnabled = false;

    // Checkerboard background
    const cSize = 4 * s;
    for (let y = 0; y < canvas.height; y += cSize) {
      for (let x = 0; x < canvas.width; x += cSize) {
        ctx.fillStyle = ((x / cSize + y / cSize) % 2 === 0) ? '#2a2a2a' : '#1e1e1e';
        ctx.fillRect(x, y, cSize, cSize);
      }
    }

    // Draw full sprite sheet
    ctx.drawImage(spriteImage, 0, 0, canvas.width, canvas.height);

    // Region overlays
    const filteredRegions = SPRITE_REGIONS.filter(r => visibleCategories.has(r.category));
    for (const region of filteredRegions) {
      const rx = region.x * s, ry = region.y * s;
      const rw = region.width * s, rh = region.height * s;
      const color = CATEGORY_COLORS[region.category] ?? '#888';

      if (region.id === selectedRegionId) {
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      } else if (region.id === hoveredRegionId) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
      } else {
        ctx.strokeStyle = color + '66'; // 40% opacity
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
      }
    }

    // Highlight editRect if it's a freeform (non-named) selection
    if (editRect && !selectedRegionId) {
      ctx.strokeStyle = '#ff8844';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(editRect.x * s + 1, editRect.y * s + 1, editRect.w * s - 2, editRect.h * s - 2);
      ctx.setLineDash([]);
    }
  }, [spriteImage, gridScale, selectedRegionId, hoveredRegionId, visibleCategories, editRect]);

  const drawEditor = useCallback(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !spritePixels) return;
    const ctx = canvas.getContext('2d')!;
    const z = editorZoom;
    const w = spritePixels.width, h = spritePixels.height;
    canvas.width = w * z;
    canvas.height = h * z;

    // Checkerboard
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = ((x + y) % 2 === 0) ? '#2a2a2a' : '#1e1e1e';
        ctx.fillRect(x * z, y * z, z, z);
      }
    }

    // Pixels
    const data = spritePixels.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] > 0) {
          ctx.fillStyle = `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3] / 255})`;
          ctx.fillRect(x * z, y * z, z, z);
        }
      }
    }

    // Grid lines
    if (z >= 6) {
      ctx.strokeStyle = `rgba(255,255,255,${z >= 10 ? 0.05 : 0.03})`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath(); ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, h * z); ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * z + 0.5); ctx.lineTo(w * z, y * z + 0.5); ctx.stroke();
      }
    }

    // Selection rectangle (marching ants)
    if (selection) {
      const sx = selection.x * z, sy = selection.y * z;
      const sw = selection.w * z, sh = selection.h * z;
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = (Date.now() / 80) % 8;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.strokeStyle = '#000';
      ctx.lineDashOffset = ((Date.now() / 80) % 8) + 4;
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.restore();
    }
  }, [spritePixels, editorZoom, selection]);

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !spritePixels) return;
    const ctx = canvas.getContext('2d')!;
    const maxDim = Math.max(spritePixels.width, spritePixels.height);
    const scale = Math.max(1, Math.floor(48 / maxDim));
    canvas.width = spritePixels.width * scale;
    canvas.height = spritePixels.height * scale;
    ctx.imageSmoothingEnabled = false;
    const tmp = document.createElement('canvas');
    tmp.width = spritePixels.width;
    tmp.height = spritePixels.height;
    tmp.getContext('2d')!.putImageData(spritePixels, 0, 0);
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [spritePixels]);

  // Load region pixels when editRect changes
  useEffect(() => {
    if (!editRect) return;
    const pixels = extractRegionPixels(editRect);
    if (pixels) {
      setSpritePixels(pixels);
      setHasUnsavedChanges(false);
      undoStackRef.current = [];
      redoStackRef.current = [];
    }
  }, [editRect, extractRegionPixels]);

  useEffect(() => { drawGrid(); }, [drawGrid]);
  useEffect(() => { drawEditor(); }, [drawEditor]);
  useEffect(() => { drawPreview(); }, [drawPreview]);

  // Animate marching ants when selection exists
  useEffect(() => {
    if (!selection) return;
    let frame: number;
    const tick = () => { drawEditor(); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selection, drawEditor]);

  // --- Grid interaction ---

  const hitTestRegion = useCallback((clientX: number, clientY: number): SpriteRegion | null => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) / gridScale;
    const py = (clientY - rect.top) / gridScale;
    // Return topmost (last) matching region for z-order
    const filtered = SPRITE_REGIONS.filter(r => visibleCategories.has(r.category));
    for (let i = filtered.length - 1; i >= 0; i--) {
      const r = filtered[i];
      if (px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height) {
        return r;
      }
    }
    return null;
  }, [gridScale, visibleCategories]);

  // Convert client coords to sprite sheet pixel coords
  const gridPixelCoord = useCallback((clientX: number, clientY: number): { px: number; py: number } | null => {
    const canvas = gridCanvasRef.current;
    if (!canvas || !spriteImage) return null;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((clientX - rect.left) / gridScale);
    const py = Math.floor((clientY - rect.top) / gridScale);
    if (px < 0 || px >= spriteImage.naturalWidth || py < 0 || py >= spriteImage.naturalHeight) return null;
    return { px, py };
  }, [gridScale, spriteImage]);

  const handleGridMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // only left click

    // Ctrl+drag: start freeform rect
    if (e.ctrlKey || e.metaKey) {
      const coord = gridPixelCoord(e.clientX, e.clientY);
      if (!coord) return;
      rectDragStartRef.current = { x: coord.px, y: coord.py };
      setIsRectDragging(true);
      e.preventDefault();
      return;
    }

    // Regular click — try named region first, then freeform 32x32
    const region = hitTestRegion(e.clientX, e.clientY);
    if (region) {
      selectNamedRegion(region.id);
    } else {
      const coord = gridPixelCoord(e.clientX, e.clientY);
      if (!coord || !spriteImage) return;
      const size = 32;
      const half = size / 2;
      const x = Math.max(0, Math.min(spriteImage.naturalWidth - size, coord.px - half));
      const y = Math.max(0, Math.min(spriteImage.naturalHeight - size, coord.py - half));
      setSelectedRegionId('');
      setEditRect({ x, y, w: size, h: size, label: `Custom (${x}, ${y})` });
    }
  }, [hitTestRegion, gridPixelCoord, selectNamedRegion, spriteImage]);

  const handleGridMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Ctrl+drag: update freeform rect preview
    if (isRectDragging) {
      const coord = gridPixelCoord(e.clientX, e.clientY);
      if (!coord) return;
      const sx = Math.min(rectDragStartRef.current.x, coord.px);
      const sy = Math.min(rectDragStartRef.current.y, coord.py);
      const ex = Math.max(rectDragStartRef.current.x, coord.px);
      const ey = Math.max(rectDragStartRef.current.y, coord.py);
      setSelectedRegionId('');
      setEditRect({ x: sx, y: sy, w: Math.max(1, ex - sx + 1), h: Math.max(1, ey - sy + 1), label: `Custom (${sx}, ${sy}) ${ex - sx + 1}×${ey - sy + 1}` });
      return;
    }

    const region = hitTestRegion(e.clientX, e.clientY);
    setHoveredRegionId(region?.id ?? null);
  }, [hitTestRegion, isRectDragging, gridPixelCoord]);

  const handleGridMouseUp = useCallback(() => {
    if (isRectDragging) setIsRectDragging(false);
  }, [isRectDragging]);

  // --- Pan / Zoom ---

  const handleGridContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); }, []);

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
        const newScale = Math.max(1, Math.min(8, oldScale + step));
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

  useEffect(() => {
    if (!active) {
      setSpaceHeld(false);
      return;
    }
    const isTyping = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
    const down = (e: KeyboardEvent) => { if (e.key === ' ' && !isTyping(e.target)) { e.preventDefault(); setSpaceHeld(true); } };
    const up = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [active]);

  const handleGridPanStart = useCallback((e: React.MouseEvent) => {
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

  // --- Floating panel drag/resize ---

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = (e.target as HTMLElement).closest('.se-float-panel');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      let x = e.clientX - dragOffsetRef.current.x;
      let y = e.clientY - dragOffsetRef.current.y;
      x = Math.max(-200, Math.min(window.innerWidth - 40, x));
      y = Math.max(0, Math.min(window.innerHeight - 30, y));
      setFloatPos({ x, y });
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
        w: (resizeDir === 'e' || resizeDir === 'se') ? Math.max(280, Math.min(800, resizeStartRef.current.w + dx)) : prev.w,
        h: (resizeDir === 's' || resizeDir === 'se') ? Math.max(300, Math.min(900, resizeStartRef.current.h + dy)) : prev.h,
      }));
    };
    const handleUp = () => setResizeDir(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [resizeDir]);

  // Native non-passive wheel listener for pixel editor zoom (cursor-anchored)
  const editorScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorScrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const oldZ = editorZoomRef.current;
      const step = e.deltaY < 0 ? 2 : -2;
      const newZ = Math.max(2, Math.min(64, oldZ + step));
      if (newZ === oldZ) return;
      // Cursor-anchored: keep the pixel under the cursor in place
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + el.scrollLeft;
      const mouseY = e.clientY - rect.top + el.scrollTop;
      setEditorZoom(newZ);
      requestAnimationFrame(() => {
        const ratio = newZ / oldZ;
        el.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
        el.scrollTop = mouseY * ratio - (e.clientY - rect.top);
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [setEditorZoom]);

  // Space+drag / middle-click / right-click pan on pixel editor
  useEffect(() => {
    if (!editorPanning) return;
    const handleMove = (e: MouseEvent) => {
      const el = editorScrollRef.current;
      if (!el) return;
      el.scrollLeft = editorPanStartRef.current.scrollX - (e.clientX - editorPanStartRef.current.x);
      el.scrollTop = editorPanStartRef.current.scrollY - (e.clientY - editorPanStartRef.current.y);
    };
    const handleUp = () => setEditorPanning(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [editorPanning]);

  // Initialize float position
  const floatInitRef = useRef(false);
  useEffect(() => {
    if (floatInitRef.current || floatPos.x >= 0) return;
    floatInitRef.current = true;
    setFloatPos({ x: window.innerWidth - 420, y: 80 });
  }, [floatPos.x]);

  // --- Pixel editing ---

  // Sync sprite editor status to store for StatusBar display — only while
  // this tab is visible (component stays mounted behind display:none)
  const setSpriteEditorStatus = useEditorStore(state => state.setSpriteEditorStatus);
  useEffect(() => {
    if (!active) return;
    setSpriteEditorStatus({
      active: true,
      region: editRect ? `${editRect.label} (${editRect.x}, ${editRect.y})` : '',
      pixelX: -1,
      pixelY: -1,
    });
    return () => { setSpriteEditorStatus({ active: false }); };
  }, [active, editRect, setSpriteEditorStatus]);

  const getPixelCoord = useCallback((e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
    if (!spritePixels) return null;
    const canvas = editorCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    const px = Math.floor(normX * spritePixels.width);
    const py = Math.floor(normY * spritePixels.height);
    if (px < 0 || px >= spritePixels.width || py < 0 || py >= spritePixels.height) return null;
    return [px, py];
  }, [spritePixels]);

  const applyTool = useCallback((px: number, py: number, pixels: ImageData, isStart: boolean): ImageData => {
    const w = pixels.width;
    const newData = isStart
      ? new ImageData(new Uint8ClampedArray(pixels.data), w, pixels.height)
      : pixels;
    const i = (py * w + px) * 4;

    if (activeTool === 'eyedropper') {
      setCurrentColor({ r: newData.data[i], g: newData.data[i + 1], b: newData.data[i + 2], a: newData.data[i + 3] });
      setActiveTool('pencil');
      return pixels;
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

  const strokeBufferRef = useRef<ImageData | null>(null);
  const lastPaintedRef = useRef({ x: -1, y: -1 });

  const paintPixelDirect = useCallback((px: number, py: number, buf: ImageData) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const z = editorZoom;
    const w = buf.width;
    const i = (py * w + px) * 4;
    const a = buf.data[i + 3];
    ctx.fillStyle = ((px + py) % 2 === 0) ? '#2a2a2a' : '#1e1e1e';
    ctx.fillRect(px * z, py * z, z, z);
    if (a > 0) {
      ctx.fillStyle = `rgba(${buf.data[i]},${buf.data[i + 1]},${buf.data[i + 2]},${a / 255})`;
      ctx.fillRect(px * z, py * z, z, z);
    }
    if (z >= 6) {
      ctx.strokeStyle = `rgba(255,255,255,${z >= 10 ? 0.05 : 0.03})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px * z + 0.5, py * z + 0.5, z - 1, z - 1);
    }
  }, [editorZoom]);

  const handleEditorMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!spritePixels) return;

    // Middle-click or right-click or space+left = pan
    if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      const el = editorScrollRef.current;
      if (!el) return;
      editorPanStartRef.current = { x: e.clientX, y: e.clientY, scrollX: el.scrollLeft, scrollY: el.scrollTop };
      setEditorPanning(true);
      return;
    }

    const coord = getPixelCoord(e);
    if (!coord) return;

    // Select tool — start marquee
    if (activeTool === 'select') {
      selectStartRef.current = { x: coord[0], y: coord[1] };
      setSelection({ x: coord[0], y: coord[1], w: 1, h: 1 });
      setIsSelecting(true);
      return;
    }

    // Drawing tools
    pushUndo(spritePixels);
    lastPaintedRef.current = { x: coord[0], y: coord[1] };
    const result = applyTool(coord[0], coord[1], spritePixels, true);
    strokeBufferRef.current = result;
    if (activeTool === 'fill') {
      setSpritePixels(result);
    } else {
      paintPixelDirect(coord[0], coord[1], result);
    }
    setIsDrawing(true);
    setHasUnsavedChanges(true);
  }, [spritePixels, getPixelCoord, applyTool, pushUndo, activeTool, paintPixelDirect, spaceHeld]);

  const handleEditorMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Report hovered pixel in absolute imgTuna coordinates to the StatusBar
    const hoverCoord = getPixelCoord(e);
    if (hoverCoord && editRect) {
      setSpriteEditorStatus({ pixelX: editRect.x + hoverCoord[0], pixelY: editRect.y + hoverCoord[1] });
    }

    // Select tool — update marquee
    if (isSelecting && spritePixels) {
      const coord = getPixelCoord(e);
      if (!coord) return;
      const sx = Math.min(selectStartRef.current.x, coord[0]);
      const sy = Math.min(selectStartRef.current.y, coord[1]);
      const ex = Math.max(selectStartRef.current.x, coord[0]);
      const ey = Math.max(selectStartRef.current.y, coord[1]);
      setSelection({ x: sx, y: sy, w: ex - sx + 1, h: ey - sy + 1 });
      return;
    }

    if (!isDrawing || activeTool === 'fill' || activeTool === 'eyedropper') return;
    const coord = getPixelCoord(e);
    if (!coord || !strokeBufferRef.current) return;
    if (coord[0] === lastPaintedRef.current.x && coord[1] === lastPaintedRef.current.y) return;
    lastPaintedRef.current = { x: coord[0], y: coord[1] };
    const result = applyTool(coord[0], coord[1], strokeBufferRef.current, false);
    strokeBufferRef.current = result;
    paintPixelDirect(coord[0], coord[1], result);
  }, [isDrawing, isSelecting, activeTool, getPixelCoord, applyTool, paintPixelDirect, spritePixels, editRect, setSpriteEditorStatus]);

  const handleEditorMouseUp = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      return;
    }
    if (strokeBufferRef.current) {
      setSpritePixels(strokeBufferRef.current);
    }
    setIsDrawing(false);
    strokeBufferRef.current = null;
    lastPaintedRef.current = { x: -1, y: -1 };
  }, [isSelecting]);

  const handleEditorMouseLeave = useCallback(() => {
    setSpriteEditorStatus({ pixelX: -1, pixelY: -1 });
    handleEditorMouseUp();
  }, [setSpriteEditorStatus, handleEditorMouseUp]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCurrentColor({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: 255 });
  }, []);

  // Delete selection — clear pixels in selected area
  const handleDeleteSelection = useCallback(() => {
    if (!selection || !spritePixels) return;
    pushUndo(spritePixels);
    const newData = new ImageData(new Uint8ClampedArray(spritePixels.data), spritePixels.width, spritePixels.height);
    const w = spritePixels.width;
    for (let y = selection.y; y < selection.y + selection.h; y++) {
      for (let x = selection.x; x < selection.x + selection.w; x++) {
        const i = (y * w + x) * 4;
        newData.data[i] = 0; newData.data[i + 1] = 0; newData.data[i + 2] = 0; newData.data[i + 3] = 0;
      }
    }
    setSpritePixels(newData);
    setHasUnsavedChanges(true);
  }, [selection, spritePixels, pushUndo]);

  // Nudge — shift the entire editRect region on the sprite sheet by (dx, dy) pixels
  const handleNudge = useCallback((dx: number, dy: number) => {
    if (!spriteImage || !editRect) return;

    // Save to image history (like Apply)
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = spriteImage.naturalWidth;
    snapCanvas.height = spriteImage.naturalHeight;
    snapCanvas.getContext('2d')!.drawImage(spriteImage, 0, 0);
    imageHistoryRef.current.push(snapCanvas.toDataURL('image/png'));
    if (imageHistoryRef.current.length > IMAGE_HISTORY_MAX) imageHistoryRef.current.shift();

    // Extract pixels from old position
    const canvas = document.createElement('canvas');
    canvas.width = spriteImage.naturalWidth;
    canvas.height = spriteImage.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(spriteImage, 0, 0);

    const pixels = ctx.getImageData(editRect.x, editRect.y, editRect.w, editRect.h);

    // Clear old position
    ctx.clearRect(editRect.x, editRect.y, editRect.w, editRect.h);

    // Paste at new position
    const newX = Math.max(0, Math.min(spriteImage.naturalWidth - editRect.w, editRect.x + dx));
    const newY = Math.max(0, Math.min(spriteImage.naturalHeight - editRect.h, editRect.y + dy));
    ctx.putImageData(pixels, newX, newY);

    // Update sprite image
    const img = new Image();
    img.onload = () => {
      setSpriteImage(img);
      // Move editRect to follow the pixels
      setEditRect(prev => prev ? { ...prev, x: newX, y: newY, label: `Custom (${newX}, ${newY}) ${prev.w}×${prev.h}` } : null);
    };
    img.src = canvas.toDataURL('image/png');
  }, [spriteImage, editRect]);

  // Select all
  const handleSelectAll = useCallback(() => {
    if (!spritePixels) return;
    setSelection({ x: 0, y: 0, w: spritePixels.width, h: spritePixels.height });
    setActiveTool('select');
  }, [spritePixels]);

  // Keyboard shortcuts — only while this editor tab is visible
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if (ctrl && e.key === 'y') { e.preventDefault(); handleRedo(); }
      else if (ctrl && e.key === 'c') { e.preventDefault(); handleCopy(); }
      else if (ctrl && e.key === 'v') { e.preventDefault(); handlePaste(); }
      else if (ctrl && e.key === 'a') { e.preventDefault(); handleSelectAll(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { handleDeleteSelection(); }
      else if (e.key === 'Escape') { setSelection(null); }
      // Arrow keys: nudge editRect on the sheet (Shift = 5px)
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); handleNudge(e.shiftKey ? -5 : -1, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNudge(e.shiftKey ? 5 : 1, 0); }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); handleNudge(0, e.shiftKey ? -5 : -1); }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); handleNudge(0, e.shiftKey ? 5 : 1); }
      else if (e.key === 'p' || e.key === 'b') setActiveTool('pencil');
      else if (e.key === 'e') setActiveTool('eraser');
      else if (e.key === 'i') setActiveTool('eyedropper');
      else if (e.key === 'g') setActiveTool('fill');
      else if (e.key === 'm') setActiveTool('select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, handleUndo, handleRedo, handleCopy, handlePaste, handleDeleteSelection, handleSelectAll, handleNudge]);

  const toggleCategory = useCallback((cat: string) => {
    setVisibleCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const colorHex = `#${currentColor.r.toString(16).padStart(2, '0')}${currentColor.g.toString(16).padStart(2, '0')}${currentColor.b.toString(16).padStart(2, '0')}`;

  // --- Render ---

  if (!spriteImage) {
    return (
      <div className="sprite-editor empty">
        <p>No sprite sheet loaded</p>
        <p className="se-hint">Load an imgTuna.png from a patch folder</p>
        <button className="te-load-btn" onClick={handleLoadImage}><LuFolderOpen size={12} /> Load Image</button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="sprite-editor">
      {/* Left: sprite sheet grid overview */}
      <div className="se-grid-panel">
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <div className="te-grid-header">
          <div className="te-grid-header-row">
            <span className="te-label">{spriteImageName ?? 'imgTuna.png'}</span>
            <button className="te-load-btn" onClick={handleLoadImage} title="Load sprite sheet"><LuFolderOpen size={11} /></button>
            <button className="te-load-btn te-export-btn" onClick={handleExportPNG} title="Export as PNG"><LuDownload size={11} /></button>
            <button className="se-fix-btn" onClick={handleFixPatch} title="Auto-fix old patch coordinates (flags, smoke, trails)">Fix Patch</button>
          </div>
          <div className="se-category-bar">
            <LuFilter size={10} className="se-filter-icon" />
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`se-cat-btn${visibleCategories.has(cat) ? ' active' : ''}`}
                style={{ '--cat-color': CATEGORY_COLORS[cat] } as React.CSSProperties}
                onClick={() => toggleCategory(cat)}
                title={cat}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div
          className={`te-grid-scroll${isPanning ? ' te-panning' : spaceHeld ? ' te-pan-ready' : ''}`}
          ref={gridScrollRef}
          onMouseDown={handleGridPanStart}
          onContextMenu={handleGridContextMenu}
        >
          <canvas ref={gridCanvasRef} onMouseDown={handleGridMouseDown} onMouseMove={handleGridMove} onMouseUp={handleGridMouseUp} onMouseLeave={() => { setHoveredRegionId(null); if (isRectDragging) setIsRectDragging(false); }} />
        </div>
      </div>

      {/* Region list sidebar */}
      <div className="se-region-list">
        <div className="se-region-list-header">Regions</div>
        <div className="se-region-list-body">
          {SPRITE_REGIONS.filter(r => visibleCategories.has(r.category)).map(r => (
            <button
              key={r.id}
              className={`se-region-item${r.id === selectedRegionId ? ' active' : ''}`}
              onClick={() => selectNamedRegion(r.id)}
              title={`${r.label} (${r.width}×${r.height})`}
            >
              <span className="se-region-dot" style={{ background: CATEGORY_COLORS[r.category] }} />
              <span className="se-region-name">{r.label}</span>
              <span className="se-region-size">{r.width}×{r.height}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating pixel editor panel */}
      {createPortal(<div
        className="se-float-panel"
        style={{ left: floatPos.x, top: floatPos.y, width: floatSize.w, height: floatSize.h }}
      >
        <div className="te-float-titlebar" onMouseDown={handleDragStart}>
          <LuGripHorizontal size={12} className="te-drag-icon" />
          <span className="te-label">{editRect?.label ?? 'No selection'}</span>
          <span className="te-sublabel">{editRect ? `${editRect.w}×${editRect.h}` : ''}</span>
          {hasUnsavedChanges && <span className="te-modified-badge">modified</span>}
        </div>

        <div className="te-float-body">
          <div className="te-sidebar">
            <button className={`te-tool-btn${activeTool === 'pencil' ? ' active' : ''}`} onClick={() => setActiveTool('pencil')} title="Pencil (P)"><LuPencil size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'eraser' ? ' active' : ''}`} onClick={() => setActiveTool('eraser')} title="Eraser (E)"><LuEraser size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'eyedropper' ? ' active' : ''}`} onClick={() => setActiveTool('eyedropper')} title="Eyedropper (I)"><LuPipette size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'fill' ? ' active' : ''}`} onClick={() => setActiveTool('fill')} title="Fill (G)"><LuPaintBucket size={14} /></button>
            <button className={`te-tool-btn${activeTool === 'select' ? ' active' : ''}`} onClick={() => setActiveTool('select')} title="Select (M)"><LuSquareDashed size={14} /></button>
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={handleUndo} title="Undo (Ctrl+Z)"><LuUndo2 size={14} /></button>
            <button className="te-tool-btn" onClick={handleRedo} title="Redo (Ctrl+Y)"><LuRedo2 size={14} /></button>
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={handleFlipH} title="Flip Horizontal"><LuFlipHorizontal2 size={14} /></button>
            <button className="te-tool-btn" onClick={handleFlipV} title="Flip Vertical"><LuFlipVertical2 size={14} /></button>
            {editRect && editRect.w === editRect.h && (
              <button className="te-tool-btn" onClick={handleRotateCCW} title="Rotate 90 CCW"><LuRotateCcw size={14} /></button>
            )}
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={handleCopy} title="Copy (Ctrl+C)"><LuCopy size={14} /></button>
            <button className="te-tool-btn" onClick={handlePaste} title="Paste (Ctrl+V)"><LuClipboardPaste size={14} /></button>
            <div className="te-sidebar-sep" />
            <button className="te-tool-btn" onClick={() => setEditorZoom(prev => prev + 2)} title="Zoom In"><LuZoomIn size={14} /></button>
            <button className="te-tool-btn" onClick={() => setEditorZoom(prev => prev - 2)} title="Zoom Out"><LuZoomOut size={14} /></button>
            <div className="te-sidebar-sep" />
            <input type="color" value={colorHex} onChange={handleColorChange} className="te-sidebar-color" title="Pick color" />
            <div className="te-color-swatch" style={{ background: colorHex }} />
          </div>

          <div className="te-editor-area">
            <div className="te-editor-main">
              <div className="te-editor-scroll" ref={editorScrollRef} onContextMenu={e => e.preventDefault()}>
                <canvas
                  ref={editorCanvasRef}
                  className={`te-pixel-canvas${editorPanning ? ' te-panning' : spaceHeld ? ' te-pan-ready' : ''}`}
                  style={spritePixels ? { width: spritePixels.width * editorZoom, height: spritePixels.height * editorZoom } : {}}
                  onMouseDown={handleEditorMouseDown}
                  onMouseMove={handleEditorMouseMove}
                  onMouseUp={handleEditorMouseUp}
                  onMouseLeave={handleEditorMouseLeave}
                />
              </div>
              <div className="te-zoom-indicator">{editorZoom}x</div>
            </div>

            <div className="te-panel-footer">
              <div className="te-preview-wrap">
                <canvas ref={previewCanvasRef} className="te-preview-canvas" />
              </div>
              {editRect && (
                <div className="se-nudge-pad" title="Move region on sheet (Arrow keys, Shift=5px)">
                  <button className="se-nudge-btn" onClick={() => handleNudge(0, -1)}>&#9650;</button>
                  <div className="se-nudge-row">
                    <button className="se-nudge-btn" onClick={() => handleNudge(-1, 0)}>&#9664;</button>
                    <span className="se-nudge-label">{editRect.x},{editRect.y}</span>
                    <button className="se-nudge-btn" onClick={() => handleNudge(1, 0)}>&#9654;</button>
                  </div>
                  <button className="se-nudge-btn" onClick={() => handleNudge(0, 1)}>&#9660;</button>
                </div>
              )}
              <div className="te-footer-actions">
                {hasUnsavedChanges && (<>
                  <button className="te-apply-btn" onClick={handleApply} title="Apply edits to sprite sheet">Apply</button>
                  <button className="te-revert-btn" onClick={handleRevert} title="Revert to original">Revert</button>
                </>)}
                {imageHistoryRef.current.length > 0 && (
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

/** Flood fill — works with any dimensions */
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
