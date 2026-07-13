/**
 * ShipStickerPanel — Stamp strip of ship frames from imgTuna.png.
 * 4 teams × 9 directions. Click a frame to arm; then click on the map canvas
 * to drop a sticker. Ships are a separate overlay layer above tiles.
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { ToolType, SHIP_FRAME_SIZE, SHIP_TEAM_Y } from '@core/map';
import { BUNDLED_PATCHES } from '@core/patches';
import { LuEye, LuEyeOff, LuX, LuTrash2, LuPalette, LuFolderOpen } from 'react-icons/lu';
import './ShipStickerPanel.css';

interface ShipStickerPanelProps {
  tilesetPatchName?: string | null;
  onSelectTilesetPatch?: (name: string) => void;
  onBrowseTileset?: () => void;
}

const DISPLAY_SCALE = 1;    // Rendered at actual in-game size (32px)
const CELL = SHIP_FRAME_SIZE * DISPLAY_SCALE;

const TEAM_Y = SHIP_TEAM_Y;
const TEAM_NAMES = ['Green', 'Red', 'Blue', 'Yellow'];
const TEAM_COLORS = ['#44bb66', '#ee4455', '#4488ff', '#eecc33'];
const DIRECTIONS = ['Right', 'UpR', 'Up', 'UpL', 'Left', 'DnL', 'Down', 'DnR', 'Idle'];

export const ShipStickerPanel: React.FC<ShipStickerPanelProps> = ({
  tilesetPatchName,
  onSelectTilesetPatch,
  onBrowseTileset,
}) => {
  const tunaImage = useEditorStore(state => state.stickerTunaImage);
  const stickerTunaPatch = useEditorStore(state => state.stickerTunaPatch);
  const setStickerTunaPatch = useEditorStore(state => state.setStickerTunaPatch);
  const setStickerTunaImage = useEditorStore(state => state.setStickerTunaImage);
  const selectedShipFrame = useEditorStore(state => state.selectedShipFrame);
  const setSelectedShipFrame = useEditorStore(state => state.setSelectedShipFrame);
  const shipStickers = useEditorStore(state => state.shipStickers);
  const shipStickersVisible = useEditorStore(state => state.shipStickersVisible);
  const setShipStickersVisible = useEditorStore(state => state.setShipStickersVisible);
  const setTool = useEditorStore(state => state.setTool);
  const currentTool = useEditorStore(state => state.currentTool);
  const clearShipStickers = useEditorStore(state => state.clearShipStickers);
  const deleteShipSticker = useEditorStore(state => state.deleteShipSticker);
  const toggleShipStickerVisibility = useEditorStore(state => state.toggleShipStickerVisibility);
  const renameShipSticker = useEditorStore(state => state.renameShipSticker);

  // Inline name editing in the placed list
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const startNameEdit = (id: string, current: string) => {
    setEditingStickerId(id);
    setEditNameValue(current);
  };

  const saveNameEdit = () => {
    if (editingStickerId === null) return;
    renameShipSticker(editingStickerId, editNameValue.trim());
    setEditingStickerId(null);
  };
  const selectedShipStickerId = useEditorStore(state => state.selectedShipStickerId);
  const setSelectedShipStickerId = useEditorStore(state => state.setSelectedShipStickerId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tunaDropdownRef = useRef<HTMLDivElement>(null);
  const tilesDropdownRef = useRef<HTMLDivElement>(null);
  const [tunaDropdownOpen, setTunaDropdownOpen] = useState(false);
  const [tilesDropdownOpen, setTilesDropdownOpen] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!tunaDropdownOpen && !tilesDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (tunaDropdownOpen && tunaDropdownRef.current && !tunaDropdownRef.current.contains(e.target as Node)) {
        setTunaDropdownOpen(false);
      }
      if (tilesDropdownOpen && tilesDropdownRef.current && !tilesDropdownRef.current.contains(e.target as Node)) {
        setTilesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tunaDropdownOpen, tilesDropdownOpen]);

  // Browse for a custom imgTuna file — user picks a folder; we find imgTuna* inside.
  const handleBrowseTuna = async () => {
    const api = window.electronAPI as any;
    if (!api?.openPatchFolderDialog || !api?.listDir || !api?.readFile) {
      alert('Folder browsing requires the desktop app.');
      return;
    }
    const folderPath: string | null = await api.openPatchFolderDialog();
    if (!folderPath) return;
    const dirResult = await api.listDir(folderPath);
    if (!dirResult?.success || !dirResult.files) {
      alert('Failed to read folder.');
      return;
    }
    const imageExts = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];
    const match = dirResult.files.find((f: string) => {
      const lower = f.toLowerCase();
      return lower.startsWith('imgtuna') && imageExts.some((ext) => lower.endsWith(ext));
    });
    if (!match) {
      alert('No imgTuna.* found in the selected folder.');
      return;
    }
    const fullPath = `${folderPath}/${match}`;
    const res = await api.readFile(fullPath);
    if (!res?.success || !res.data) {
      alert('Failed to read imgTuna.');
      return;
    }
    const ext = match.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp', gif: 'image/gif'
    };
    const mime = mimeMap[ext] || 'image/png';
    const img = new Image();
    img.onload = () => {
      setStickerTunaImage(img);
      // Label the patch by folder name so the user sees where it came from
      const folderName = folderPath.split(/[\\/]/).pop() || 'Custom';
      setStickerTunaPatch(folderName);
    };
    img.onerror = () => alert('Failed to decode imgTuna image.');
    img.src = `data:${mime};base64,${res.data}`;
  };

  const rows = useMemo(() => {
    // [team][dir] grid; 4 rows × 9 columns
    return [0, 1, 2, 3].map(team => ({
      team,
      frames: DIRECTIONS.map((_, dir) => ({ team, dir })),
    }));
  }, []);

  // Render the ship grid when tunaImage loads or selection changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rowCount = rows.length;
    const colCount = DIRECTIONS.length;
    const padding = 6;
    const labelH = 16;
    const rowH = labelH + CELL + padding;

    const dpr = window.devicePixelRatio || 1;
    const cssW = padding + colCount * (CELL + padding);
    const cssH = padding + rowCount * rowH;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, cssW, cssH);

    rows.forEach((row, rIdx) => {
      const rowTop = padding + rIdx * rowH;

      // Team label
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = TEAM_COLORS[row.team];
      ctx.textBaseline = 'top';
      ctx.fillText(TEAM_NAMES[row.team], padding, rowTop);

      row.frames.forEach((f, cIdx) => {
        const cellX = padding + cIdx * (CELL + padding);
        const cellY = rowTop + labelH;

        // Cell background
        ctx.fillStyle = 'rgba(20, 24, 32, 0.6)';
        ctx.fillRect(cellX, cellY, CELL, CELL);

        // Ship frame
        if (tunaImage) {
          const srcX = f.dir * SHIP_FRAME_SIZE;
          const srcY = TEAM_Y[f.team];
          try {
            ctx.drawImage(
              tunaImage,
              srcX, srcY, SHIP_FRAME_SIZE, SHIP_FRAME_SIZE,
              cellX, cellY, CELL, CELL
            );
          } catch {
            // noop — image not fully loaded
          }
        } else {
          // Placeholder
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(cellX + 4, cellY + 4, CELL - 8, CELL - 8);
        }

        // Selection outline
        const isSelected = selectedShipFrame?.team === f.team && selectedShipFrame?.dir === f.dir;
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = TEAM_COLORS[row.team];
          ctx.lineWidth = 2;
          ctx.shadowColor = TEAM_COLORS[row.team];
          ctx.shadowBlur = 8;
          ctx.strokeRect(cellX + 1, cellY + 1, CELL - 2, CELL - 2);
          ctx.restore();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cellX + 0.5, cellY + 0.5, CELL - 1, CELL - 1);
        }
      });
    });
  }, [rows, tunaImage, selectedShipFrame]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 6;
    const labelH = 16;
    const rowH = labelH + CELL + padding;
    const rowIdx = Math.floor((y - padding) / rowH);
    if (rowIdx < 0 || rowIdx > 3) return;
    const localY = y - padding - rowIdx * rowH - labelH;
    if (localY < 0 || localY > CELL) return;
    const colIdx = Math.floor((x - padding) / (CELL + padding));
    if (colIdx < 0 || colIdx > 8) return;
    const localX = x - padding - colIdx * (CELL + padding);
    if (localX < 0 || localX > CELL) return;

    const team = rowIdx;
    const dir = colIdx;

    // Toggle: clicking the same frame disarms
    if (selectedShipFrame?.team === team && selectedShipFrame?.dir === dir) {
      setSelectedShipFrame(null);
      if (currentTool === ToolType.SHIP_STICKER) setTool(ToolType.PENCIL);
    } else {
      setSelectedShipFrame({ team, dir });
      setTool(ToolType.SHIP_STICKER);
    }
  };

  const armedLabel = selectedShipFrame
    ? `${TEAM_NAMES[selectedShipFrame.team]} · ${DIRECTIONS[selectedShipFrame.dir]}`
    : null;

  const disarm = () => {
    setSelectedShipFrame(null);
    if (currentTool === ToolType.SHIP_STICKER) setTool(ToolType.PENCIL);
  };

  return (
    <div className="ship-sticker-panel">
      <div className="ssp-header">
        <span className="ssp-title">Ship Stickers</span>
        <span className="ssp-spacer" />
        <span className="ssp-count" title="Placed stickers in this map">
          {shipStickers.length} placed
        </span>
        <button
          className="ssp-icon-btn"
          onClick={() => setShipStickersVisible(!shipStickersVisible)}
          title={shipStickersVisible ? 'Hide sticker layer' : 'Show sticker layer'}
        >
          {shipStickersVisible ? <LuEye size={12} /> : <LuEyeOff size={12} />}
        </button>
        <button
          className="ssp-icon-btn"
          onClick={() => {
            if (shipStickers.length === 0) return;
            if (confirm(`Remove all ${shipStickers.length} stickers?`)) clearShipStickers();
          }}
          title="Clear all stickers"
          disabled={shipStickers.length === 0}
        >
          <LuTrash2 size={12} />
        </button>
      </div>

      <div className="ssp-sources">
        {onSelectTilesetPatch && (
          <div className="ssp-source-row">
            <span className="ssp-source-label">Tileset</span>
            <div className="ssp-dropdown-wrap ssp-source-dropdown" ref={tilesDropdownRef}>
              <button
                className="ssp-source-btn"
                onClick={() => setTilesDropdownOpen(!tilesDropdownOpen)}
                title="Select tileset patch"
              >
                <LuPalette size={11} />
                <span className="ssp-source-name">{tilesetPatchName ?? 'Custom'}</span>
                <span className="ssp-source-caret">▾</span>
              </button>
              {tilesDropdownOpen && (
                <div className="ssp-patch-dropdown">
                  {BUNDLED_PATCHES.map((name) => (
                    <button
                      key={name}
                      className={`ssp-patch-option${name === tilesetPatchName ? ' ssp-patch-option--active' : ''}`}
                      onClick={() => {
                        onSelectTilesetPatch(name);
                        setTilesDropdownOpen(false);
                      }}
                    >
                      {name === tilesetPatchName && <span className="ssp-patch-check">&#10003; </span>}
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {onBrowseTileset && (
              <button
                className="ssp-icon-btn"
                onClick={onBrowseTileset}
                title="Browse for tileset patch folder"
              >
                <LuFolderOpen size={12} />
              </button>
            )}
          </div>
        )}

        <div className="ssp-source-row">
          <span className="ssp-source-label">Ships</span>
          <div className="ssp-dropdown-wrap ssp-source-dropdown" ref={tunaDropdownRef}>
            <button
              className="ssp-source-btn"
              onClick={() => setTunaDropdownOpen(!tunaDropdownOpen)}
              title="Select patch for ship sprites"
            >
              <LuPalette size={11} />
              <span className="ssp-source-name">{stickerTunaPatch}</span>
              <span className="ssp-source-caret">▾</span>
            </button>
            {tunaDropdownOpen && (
              <div className="ssp-patch-dropdown">
                {BUNDLED_PATCHES.map((name) => (
                  <button
                    key={name}
                    className={`ssp-patch-option${name === stickerTunaPatch ? ' ssp-patch-option--active' : ''}`}
                    onClick={() => {
                      setStickerTunaPatch(name);
                      setTunaDropdownOpen(false);
                    }}
                  >
                    {name === stickerTunaPatch && <span className="ssp-patch-check">&#10003; </span>}
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="ssp-icon-btn"
            onClick={handleBrowseTuna}
            title="Browse for imgTuna folder"
          >
            <LuFolderOpen size={12} />
          </button>
        </div>
      </div>

      {armedLabel && (
        <div
          className="ssp-armed"
          style={{ '--team-color': TEAM_COLORS[selectedShipFrame!.team] } as React.CSSProperties}
        >
          <span className="ssp-armed-dot" />
          <span className="ssp-armed-label">Armed: <strong>{armedLabel}</strong></span>
          <span className="ssp-armed-hint">click on map to place</span>
          <button className="ssp-disarm" onClick={disarm} title="Disarm (Esc)">
            <LuX size={12} />
          </button>
        </div>
      )}

      <div className="ssp-grid-wrap">
        {!tunaImage && (
          <div className="ssp-empty">imgTuna.png not found in active patch</div>
        )}
        <canvas
          ref={canvasRef}
          className="ssp-canvas"
          onClick={handleCanvasClick}
        />
      </div>

      {/* Placed stickers list — per-sticker visibility + delete */}
      {shipStickers.length > 0 && (
        <div className="ssp-placed-list">
          <div className="ssp-placed-header">Placed</div>
          {shipStickers.map((s) => {
            const hidden = s.visible === false;
            const isSel = selectedShipStickerId === s.id;
            return (
              <div
                key={s.id}
                className={`ssp-placed-row${isSel ? ' ssp-placed-row--selected' : ''}${hidden ? ' ssp-placed-row--hidden' : ''}`}
                onClick={() => setSelectedShipStickerId(isSel ? null : s.id)}
                title="Click to select on map"
              >
                <span className="ssp-placed-dot" style={{ background: TEAM_COLORS[s.team] }} />
                {editingStickerId === s.id ? (
                  <input
                    className="ssp-placed-name-input"
                    value={editNameValue}
                    maxLength={24}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={saveNameEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNameEdit();
                      else if (e.key === 'Escape') setEditingStickerId(null);
                    }}
                    autoFocus
                    placeholder="Ship name..."
                  />
                ) : (
                  <span
                    className={`ssp-placed-label${s.name ? '' : ' ssp-placed-label--unnamed'}`}
                    onClick={(e) => { e.stopPropagation(); startNameEdit(s.id, s.name || ''); }}
                    title="Click to name this ship — the name shows as an in-game nameplate"
                  >
                    {s.name || `${TEAM_NAMES[s.team]} · ${DIRECTIONS[s.dir]}`}
                  </span>
                )}
                <span className="ssp-placed-coords">
                  {Math.round(s.xPx / 16)}, {Math.round(s.yPx / 16)}
                </span>
                <button
                  className="ssp-icon-btn"
                  onClick={(e) => { e.stopPropagation(); toggleShipStickerVisibility(s.id); }}
                  title={hidden ? 'Show on map (and in exports)' : 'Hide from map (and from exports)'}
                >
                  {hidden ? <LuEyeOff size={12} /> : <LuEye size={12} />}
                </button>
                <button
                  className="ssp-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteShipSticker(s.id);
                    if (isSel) setSelectedShipStickerId(null);
                  }}
                  title="Delete sticker"
                >
                  <LuTrash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
