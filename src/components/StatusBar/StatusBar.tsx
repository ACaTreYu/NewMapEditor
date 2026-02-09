/**
 * StatusBar component - XP Classic status bar with sunken fields
 * Displays cursor position, tile ID, zoom, active tool, and selection dimensions
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import './StatusBar.css';

interface Props {
  cursorX: number;
  cursorY: number;
  cursorTileId?: number;
  hoverSource?: 'map' | 'tileset' | null;
}

export const StatusBar: React.FC<Props> = ({ cursorX, cursorY, cursorTileId, hoverSource }) => {
  const { viewport, currentTool, tileSelection } = useEditorStore(
    useShallow((state) => ({
      viewport: state.viewport,
      currentTool: state.currentTool,
      tileSelection: state.tileSelection
    }))
  );

  const showSelection = tileSelection.width > 1 || tileSelection.height > 1;

  // Determine coordinate label based on hover source
  let coordsText: string;
  if (hoverSource === 'map' && cursorX >= 0) {
    coordsText = `X: ${cursorX}  Y: ${cursorY}`;
  } else if (hoverSource === 'tileset' && cursorX >= 0) {
    coordsText = `Col: ${cursorX}  Row: ${cursorY}`;
  } else {
    coordsText = 'X: --  Y: --';
  }

  return (
    <div className="status-bar">
      <div className="status-field status-field-coords">
        {coordsText}
      </div>

      <div className="status-field status-field-tile">
        {cursorTileId !== undefined ? `Tile: ${cursorTileId}` : 'Tile: --'}
      </div>

      <div className="status-field status-field-zoom">
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>

      <div className="status-field">
        Tool: {currentTool}
      </div>

      {showSelection && (
        <div className="status-field">
          Sel: {tileSelection.width} x {tileSelection.height}
        </div>
      )}

      <div className="status-spacer" />

      <div className="status-resize-grip" />
    </div>
  );
};
