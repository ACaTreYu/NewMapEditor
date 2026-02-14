/**
 * StatusBar component - XP Classic status bar with sunken fields
 * Displays cursor position, tile ID, zoom, active tool, and selection dimensions
 */

import React, { useEffect } from 'react';
import { useEditorStore } from '@core/editor';
import { RulerMode } from '@core/editor/slices/globalSlice';
import { ToolType } from '@core/map';
import { useShallow } from 'zustand/react/shallow';
import { LuMinus, LuRectangleHorizontal, LuRoute, LuCircle } from 'react-icons/lu';
import './StatusBar.css';

const ZOOM_PRESETS = [0.25, 0.5, 1, 2, 4];
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

interface Props {
  cursorX: number;
  cursorY: number;
  cursorTileId?: number;
  hoverSource?: 'map' | 'tileset' | null;
}

export const StatusBar: React.FC<Props> = ({ cursorX, cursorY, cursorTileId, hoverSource }) => {
  const { viewport, currentTool, tileSelection, setViewport, rulerMode, setRulerMode, pinnedMeasurements, clearAllPinnedMeasurements } = useEditorStore(
    useShallow((state) => ({
      viewport: state.viewport,
      currentTool: state.currentTool,
      tileSelection: state.tileSelection,
      setViewport: state.setViewport,
      rulerMode: state.rulerMode,
      setRulerMode: state.setRulerMode,
      pinnedMeasurements: state.pinnedMeasurements,
      clearAllPinnedMeasurements: state.clearAllPinnedMeasurements
    }))
  );

  const rulerMeasurement = useEditorStore((state) => state.rulerMeasurement);

  const showSelection = tileSelection.width > 1 || tileSelection.height > 1;
  const tileCount = tileSelection.width * tileSelection.height;

  // Determine coordinate label based on hover source
  let coordsText: string;
  if (hoverSource === 'map' && cursorX >= 0) {
    coordsText = `X: ${cursorX}  Y: ${cursorY}`;
  } else if (hoverSource === 'tileset' && cursorX >= 0) {
    coordsText = `Col: ${cursorX}  Row: ${cursorY}`;
  } else {
    coordsText = 'X: --  Y: --';
  }

  // Zoom change handler - clamps and updates viewport
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    setViewport({ zoom: clampedZoom });
  };

  // Zoom input handler - parses percentage input
  const handleZoomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;
    handleZoomChange(value / 100);
  };

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only handle Ctrl/Cmd shortcuts
      if (!(e.ctrlKey || e.metaKey)) {
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        setViewport({ zoom: 1 }); // Reset to 100%
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        const nextPreset = ZOOM_PRESETS.find(p => p > viewport.zoom);
        const newZoom = nextPreset !== undefined ? nextPreset : Math.min(ZOOM_MAX, viewport.zoom + 0.25);
        handleZoomChange(newZoom);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < viewport.zoom);
        const newZoom = prevPreset !== undefined ? prevPreset : Math.max(ZOOM_MIN, viewport.zoom - 0.25);
        handleZoomChange(newZoom);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewport.zoom, setViewport]);

  return (
    <div className="status-bar">
      <div className="status-field status-field-coords">
        {coordsText}
      </div>

      <div className="status-field status-field-tile">
        {cursorTileId !== undefined ? `Tile: ${cursorTileId}` : 'Tile: --'}
      </div>

      <div className="status-field-zoom-controls">
        <button
          className="zoom-btn"
          onClick={() => {
            const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < viewport.zoom);
            const newZoom = prevPreset !== undefined ? prevPreset : Math.max(ZOOM_MIN, viewport.zoom - 0.25);
            handleZoomChange(newZoom);
          }}
          disabled={viewport.zoom <= ZOOM_MIN}
          aria-label="Zoom out"
        >
          -
        </button>

        <input
          type="range"
          className="zoom-slider"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={viewport.zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          aria-label="Zoom level"
        />

        <button
          className="zoom-btn"
          onClick={() => {
            const nextPreset = ZOOM_PRESETS.find(p => p > viewport.zoom);
            const newZoom = nextPreset !== undefined ? nextPreset : Math.min(ZOOM_MAX, viewport.zoom + 0.25);
            handleZoomChange(newZoom);
          }}
          disabled={viewport.zoom >= ZOOM_MAX}
          aria-label="Zoom in"
        >
          +
        </button>

        <input
          type="number"
          className="zoom-input"
          min={25}
          max={400}
          step={1}
          value={Math.round(viewport.zoom * 100)}
          onChange={handleZoomInput}
          aria-label="Zoom percentage"
        />
        <span className="zoom-percent-label">%</span>

        {ZOOM_PRESETS.map((preset) => (
          <button
            key={preset}
            className={`zoom-preset-btn ${Math.abs(viewport.zoom - preset) < 0.01 ? 'active' : ''}`}
            onClick={() => handleZoomChange(preset)}
          >
            {preset * 100}%
          </button>
        ))}
      </div>

      <div className="status-field">
        Tool: {currentTool}
      </div>

      {currentTool === ToolType.RULER && (
        <div className="ruler-mode-selector">
          <button
            className={`ruler-mode-btn ${rulerMode === RulerMode.LINE ? 'active' : ''}`}
            onClick={() => setRulerMode(RulerMode.LINE)}
            title="Line (distance)"
          >
            <LuMinus size={12} />
          </button>
          <button
            className={`ruler-mode-btn ${rulerMode === RulerMode.RECTANGLE ? 'active' : ''}`}
            onClick={() => setRulerMode(RulerMode.RECTANGLE)}
            title="Rectangle (area)"
          >
            <LuRectangleHorizontal size={12} />
          </button>
          <button
            className={`ruler-mode-btn ${rulerMode === RulerMode.PATH ? 'active' : ''}`}
            onClick={() => setRulerMode(RulerMode.PATH)}
            title="Path (waypoints)"
          >
            <LuRoute size={12} />
          </button>
          <button
            className={`ruler-mode-btn ${rulerMode === RulerMode.RADIUS ? 'active' : ''}`}
            onClick={() => setRulerMode(RulerMode.RADIUS)}
            title="Radius (circle)"
          >
            <LuCircle size={12} />
          </button>
          {pinnedMeasurements.length > 0 && (
            <button
              className="ruler-mode-btn ruler-clear-btn"
              onClick={() => clearAllPinnedMeasurements()}
              title={`Clear ${pinnedMeasurements.length} pinned`}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {showSelection && (
        <div className="status-field">
          Sel: {tileSelection.width}x{tileSelection.height} ({tileCount} tiles)
        </div>
      )}

      {rulerMeasurement && (
        <>
          <div className="status-separator">|</div>
          <div className="status-field">
            {rulerMeasurement.mode === RulerMode.LINE && (
              <>Ruler: {rulerMeasurement.dx}×{rulerMeasurement.dy} (Tiles: {rulerMeasurement.manhattan}, Dist: {rulerMeasurement.euclidean?.toFixed(2)}{rulerMeasurement.angle !== undefined ? `, ${rulerMeasurement.angle.toFixed(1)}°` : ''})</>
            )}
            {rulerMeasurement.mode === RulerMode.RECTANGLE && (
              <>Box: {rulerMeasurement.width}×{rulerMeasurement.height} ({rulerMeasurement.tileCount} tiles)</>
            )}
            {rulerMeasurement.mode === RulerMode.PATH && (
              <>Path: {rulerMeasurement.waypoints?.length ?? 0}pts, {rulerMeasurement.totalDistance?.toFixed(2)}t{rulerMeasurement.segmentAngles?.length ? `, ${rulerMeasurement.segmentAngles.length} segs` : ''}</>
            )}
            {rulerMeasurement.mode === RulerMode.RADIUS && (
              <>Radius: {rulerMeasurement.radius?.toFixed(2)} (Area: {rulerMeasurement.area?.toFixed(1)})</>
            )}
          </div>
        </>
      )}

      <div className="status-spacer" />

      <div className="status-resize-grip" />
    </div>
  );
};
