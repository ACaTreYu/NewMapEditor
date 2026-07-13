/**
 * AnimationsDialog - SEdit-style master list of all 256 animations.
 * Non-modal (placement works while open): pick an animation + offset, paint
 * with pencil/line/fill. Veteran tool — places any animation, including ones
 * with no dedicated toolbar tool.
 *
 * Offset semantics (verified against SEdit map.cpp:281-287 and game
 * Map.java:1371-1375): displayed frame = (shared anim counter + offset) %
 * frameCount — a phase shift, NOT a start frame. Two animations read the
 * offset as data instead: warps (0x9E, 0xF6-0xFA) = dest*10+src and turret
 * (0xBD) = weapon/team/rate.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, ANIMATED_FLAG, ANIMATION_DEFINITIONS, AnimationDefinition, ToolType } from '@core/map';
import { WARP_STYLES, TURRET_ANIM_ID, decodeTurretOffset, TURRET_WEAPON_NAMES, TURRET_TEAM_NAMES } from '@core/map/GameObjectData';
import './AnimationsDialog.css';

export interface AnimationsDialogHandle {
  open: () => void;
}

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40;
const ROW_H = 22;
const CELL = 16;            // preview / frame cell size
const HEX_X = 4;
const PREVIEW_X = 32;
const NAME_X = 56;
const NAME_W = 108;
const STRIP_X = NAME_X + NAME_W + 6;
// Keep the column unit narrow so the dialog reflows into multiple columns
// easily when widened. Longer animations show a "…" overflow marker.
const MAX_STRIP_FRAMES = 8;
// One column unit: hex + preview + name + frame strip
const COL_W = STRIP_X + MAX_STRIP_FRAMES * CELL + 14;

// Resolve a themed color from CSS custom properties (canvas can't use vars)
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const AnimationsDialog = forwardRef<AnimationsDialogHandle, Props>(({ tilesetImage }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedAnimId, setSelectedAnimId] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [offsetError, setOffsetError] = useState(false);
  const [offsetText, setOffsetText] = useState('0');
  const [cols, setCols] = useState(1);

  const animationFrame = useEditorStore((state) => state.animationFrame);
  const animationOffsetInput = useEditorStore((state) => state.animationOffsetInput);
  const setAnimationOffsetInput = useEditorStore((state) => state.setAnimationOffsetInput);
  const setSelectedTile = useEditorStore((state) => state.setSelectedTile);
  const setTool = useEditorStore((state) => state.setTool);

  // Selection presence for the Apply-to-selection button
  const hasSelection = useEditorStore((state) => {
    if (!state.activeDocumentId) return false;
    const doc = state.documents.get(state.activeDocumentId);
    return doc ? doc.selection.active : false;
  });

  // Keep the offset text box in sync with the store (picker updates it too)
  useEffect(() => {
    setOffsetText(String(animationOffsetInput));
    setOffsetError(false);
  }, [animationOffsetInput]);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
  }));

  // Non-modal show() — canvas stays interactive for painting
  useEffect(() => {
    if (isOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.show();
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  // Filtered animation list (by hex id or name, case-insensitive)
  const filteredAnims = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ANIMATION_DEFINITIONS;
    return ANIMATION_DEFINITIONS.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.id.toString(16).toLowerCase().padStart(2, '0').includes(q) ||
      String(a.id).includes(q)
    );
  }, [filter]);

  // Multi-column reflow: widen the dialog → row-major grid of column units
  useEffect(() => {
    if (!isOpen) return;
    const container = scrollRef.current;
    if (!container) return;
    const compute = () => setCols(Math.max(1, Math.floor(container.clientWidth / COL_W)));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [isOpen]);

  const rowCount = Math.max(Math.ceil(filteredAnims.length / cols), 1);
  const canvasHeight = rowCount * ROW_H;
  const canvasWidth = COL_W * cols;

  const drawTile = useCallback((ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) => {
    if (!tilesetImage) return;
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, dx, dy, CELL, CELL);
  }, [tilesetImage]);

  // Full static redraw: rows, labels, names, frame strips
  const drawList = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    const bgA = cssVar('--bg-primary', '#1e1e1e');
    const bgB = cssVar('--bg-secondary', '#252526');
    const fg = cssVar('--text-primary', '#cccccc');
    const fgDim = cssVar('--text-secondary', '#888888');
    const selBg = cssVar('--accent-primary', '#0e639c');
    const hovBg = cssVar('--surface-hover-overlay', 'rgba(128,128,128,0.15)');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < filteredAnims.length; i++) {
      const anim = filteredAnims[i];
      const x0 = (i % cols) * COL_W;
      const y = Math.floor(i / cols) * ROW_H;
      const unused = anim.frames.length === 0;
      const isSelected = selectedAnimId === anim.id;

      ctx.fillStyle = Math.floor(i / cols) % 2 === 0 ? bgA : bgB;
      ctx.fillRect(x0, y, COL_W, ROW_H);
      if (isSelected) {
        ctx.fillStyle = selBg;
        ctx.fillRect(x0, y, COL_W, ROW_H);
      } else if (hoveredRow === i) {
        ctx.fillStyle = hovBg;
        ctx.fillRect(x0, y, COL_W, ROW_H);
      }

      // Hex id
      ctx.fillStyle = isSelected ? '#ffffff' : (unused ? fgDim : fg);
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(anim.id.toString(16).toUpperCase().padStart(2, '0'), x0 + HEX_X, y + ROW_H / 2);

      // Name (truncated to column)
      ctx.font = '11px sans-serif';
      let name = anim.name;
      while (name.length > 3 && ctx.measureText(name).width > NAME_W - 4) {
        name = name.slice(0, -2);
      }
      if (name !== anim.name) name += '…';
      ctx.fillText(name, x0 + NAME_X, y + ROW_H / 2);

      const cellY = y + (ROW_H - CELL) / 2;

      if (unused) {
        ctx.fillStyle = fgDim;
        ctx.font = '10px monospace';
        ctx.fillText('—', x0 + PREVIEW_X + 5, y + ROW_H / 2);
        continue;
      }

      // Live preview slot (frame drawn by updatePreviews)
      ctx.strokeStyle = isSelected ? '#ffffff' : fgDim;
      ctx.strokeRect(x0 + PREVIEW_X - 0.5, cellY - 0.5, CELL + 1, CELL + 1);

      // Frame strip, tile by tile (SEdit-style)
      const n = Math.min(anim.frames.length, MAX_STRIP_FRAMES);
      for (let f = 0; f < n; f++) {
        drawTile(ctx, anim.frames[f], x0 + STRIP_X + f * CELL, cellY);
      }
      if (anim.frames.length > MAX_STRIP_FRAMES) {
        ctx.fillStyle = isSelected ? '#ffffff' : fgDim;
        ctx.font = '10px monospace';
        ctx.fillText('…', x0 + STRIP_X + n * CELL + 2, y + ROW_H / 2);
      }
    }
  }, [filteredAnims, selectedAnimId, hoveredRow, drawTile, cols]);

  // Animated preview cells: only visible rows, each tick.
  // Selected row previews WITH the current offset so the phase shift is visible.
  const updatePreviews = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const container = scrollRef.current;
    if (!canvas || !ctx || !tilesetImage || !container) return;
    ctx.imageSmoothingEnabled = false;

    const firstRow = Math.max(0, Math.floor(container.scrollTop / ROW_H) - 2);
    const lastRow = Math.ceil((container.scrollTop + container.clientHeight) / ROW_H) + 2;

    for (let r = firstRow; r <= lastRow; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= filteredAnims.length) break;
        const anim = filteredAnims[i];
        if (anim.frames.length === 0) continue;
        const phase = selectedAnimId === anim.id ? animationOffsetInput : 0;
        const frameIdx = (animationFrame + phase) % anim.frameCount;
        const px = c * COL_W + PREVIEW_X;
        const cellY = r * ROW_H + (ROW_H - CELL) / 2;
        ctx.clearRect(px, cellY, CELL, CELL);
        drawTile(ctx, anim.frames[frameIdx] || 0, px, cellY);
      }
    }
  }, [filteredAnims, animationFrame, animationOffsetInput, selectedAnimId, tilesetImage, drawTile, cols]);

  useEffect(() => {
    if (!isOpen) return;
    drawList();
    updatePreviews();
  }, [isOpen, drawList]);

  useEffect(() => {
    if (!isOpen) return;
    updatePreviews();
  }, [isOpen, updatePreviews]);

  // Arm placement: encode animated tile with current offset, switch to pencil
  const armPlacement = useCallback((animId: number, offset: number) => {
    const anim = ANIMATION_DEFINITIONS[animId];
    if (!anim || anim.frames.length === 0) return;
    setSelectedTile(ANIMATED_FLAG | ((offset & 0x7F) << 8) | animId);
    setTool(ToolType.PENCIL);
  }, [setSelectedTile, setTool]);

  const rowFromEvent = (e: React.MouseEvent): number => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const rect = canvas.getBoundingClientRect();
    const c = Math.min(cols - 1, Math.max(0, Math.floor((e.clientX - rect.left) / COL_W)));
    const r = Math.floor((e.clientY - rect.top) / ROW_H);
    return r * cols + c;
  };

  const handleClick = (e: React.MouseEvent) => {
    const idx = rowFromEvent(e);
    if (idx < 0 || idx >= filteredAnims.length) return;
    const anim = filteredAnims[idx];
    if (anim.frames.length === 0) return;
    setSelectedAnimId(anim.id);
    armPlacement(anim.id, animationOffsetInput);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const idx = rowFromEvent(e);
    setHoveredRow(idx >= 0 && idx < filteredAnims.length ? idx : null);
  };

  const handleOffsetChange = (value: string) => {
    setOffsetText(value);
    const num = parseInt(value, 10);
    if (value === '' || isNaN(num) || num < 0 || num > 127) {
      setOffsetError(true);
      return;
    }
    setOffsetError(false);
    setAnimationOffsetInput(num);
    if (selectedAnimId !== null) {
      armPlacement(selectedAnimId, num);
    }
  };

  // Rewrite offset bits of every animated tile inside the active selection
  const applyOffsetToSelection = () => {
    const st = useEditorStore.getState();
    if (!st.activeDocumentId) return;
    const doc = st.documents.get(st.activeDocumentId);
    if (!doc || !doc.map || !doc.selection.active) return;

    const minX = Math.min(doc.selection.startX, doc.selection.endX);
    const maxX = Math.max(doc.selection.startX, doc.selection.endX);
    const minY = Math.min(doc.selection.startY, doc.selection.endY);
    const maxY = Math.max(doc.selection.startY, doc.selection.endY);

    const offset = animationOffsetInput & 0x7F;
    const updates: Array<{ x: number; y: number; tile: number }> = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = doc.map.tiles[y * 256 + x];
        if ((t & ANIMATED_FLAG) && ((t >> 8) & 0x7F) !== offset) {
          updates.push({ x, y, tile: (t & 0x80FF) | (offset << 8) });
        }
      }
    }
    if (updates.length === 0) return;
    st.pushUndo();
    useEditorStore.getState().setTiles(updates);
    useEditorStore.getState().commitUndo('Apply animation offset');
  };

  // Special-offset decode hint for the selected animation
  const specialHint = useMemo(() => {
    if (selectedAnimId === null) return null;
    const off = animationOffsetInput;
    if (WARP_STYLES.includes(selectedAnimId)) {
      return `WARP: offset is routing, not phase — src ${off % 10}, dest ${Math.floor(off / 10)} (offset = dest×10+src)`;
    }
    if (selectedAnimId === TURRET_ANIM_ID) {
      const { weapon, team, fireRate } = decodeTurretOffset(off);
      return `TURRET: offset is config, not phase — ${TURRET_WEAPON_NAMES[weapon] ?? '?'}, ${TURRET_TEAM_NAMES[team] ?? '?'}, rate ${fireRate}`;
    }
    return null;
  }, [selectedAnimId, animationOffsetInput]);

  const selectedAnim: AnimationDefinition | null =
    selectedAnimId !== null ? ANIMATION_DEFINITIONS[selectedAnimId] : null;

  const hoveredAnim: AnimationDefinition | null =
    hoveredRow !== null && hoveredRow < filteredAnims.length ? filteredAnims[hoveredRow] : null;

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className="animations-dialog" onClose={close}>
      <div className="dialog-title-bar" onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.dialog-close-button')) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        const rect = dialog.getBoundingClientRect();
        const drag = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
        const move = (ev: MouseEvent) => {
          dialog.style.margin = '0';
          dialog.style.left = `${drag.origX + ev.clientX - drag.startX}px`;
          dialog.style.top = `${drag.origY + ev.clientY - drag.startY}px`;
        };
        const up = () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }}>
        <span className="dialog-title-text">Animations</span>
        <button type="button" className="dialog-close-button" onClick={close}>&times;</button>
      </div>

      <div className="anims-dialog-body">
        <div className="anims-search-row">
          <input
            type="text"
            className="anims-search"
            placeholder="Search by name or hex id…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="anims-count">{filteredAnims.length}/256</span>
        </div>

        <div className="anims-list-header">
          <span style={{ left: HEX_X }}>ID</span>
          <span style={{ left: PREVIEW_X - 4 }}>Live</span>
          <span style={{ left: NAME_X }}>Name</span>
          <span style={{ left: STRIP_X }}>Frames (tile by tile)</span>
        </div>

        <div className="anims-list-container" ref={scrollRef} onScroll={() => updatePreviews()}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredRow(null)}
          />
        </div>

        <div className="anims-footer">
          <div className="anims-offset-row">
            <label>Offset:</label>
            <input
              type="text"
              className={`anims-offset-input ${offsetError ? 'error' : ''}`}
              value={offsetText}
              onChange={(e) => handleOffsetChange(e.target.value)}
              title="Frame offset 0-127: shifts this tile's animation phase — frame = (anim counter + offset) % frameCount"
            />
            <span className="anims-offset-hint">0–127 · phase shift</span>
            <button
              className="anims-apply-btn"
              onClick={applyOffsetToSelection}
              disabled={!hasSelection}
              title={hasSelection
                ? 'Set this offset on every animated tile inside the current selection (undoable)'
                : 'Make a selection on the map first (Select tool)'}
            >
              Apply to Selection
            </button>
          </div>

          <div className="anims-status">
            {selectedAnim ? (
              <span>
                Armed: <b>{selectedAnim.id.toString(16).toUpperCase().padStart(2, '0')}</b> {selectedAnim.name}
                {' '}({selectedAnim.frameCount} frames, speed {selectedAnim.speed}) — paint with Pencil/Line/Fill
              </span>
            ) : hoveredAnim ? (
              <span className="anims-status-dim">
                {hoveredAnim.id.toString(16).toUpperCase().padStart(2, '0')} {hoveredAnim.name}
                {hoveredAnim.frames.length > 0 ? ` (${hoveredAnim.frameCount} frames, speed ${hoveredAnim.speed})` : ' (unused)'}
              </span>
            ) : (
              <span className="anims-status-dim">Click an animation to arm it for painting</span>
            )}
          </div>

          {specialHint && <div className="anims-special-hint">{specialHint}</div>}
        </div>
      </div>
    </dialog>
  );
});

AnimationsDialog.displayName = 'AnimationsDialog';
