/**
 * StatusBar component - XP Classic status bar with sunken fields
 * Displays cursor position, tile ID, zoom, active tool, and selection dimensions
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import './StatusBar.css';

interface Props {
  cursorX: number;
  cursorY: number;
  cursorTileId?: number;
}

export const StatusBar: React.FC<Props> = ({ cursorX, cursorY, cursorTileId }) => {
  const { viewport, currentTool, tileSelection } = useEditorStore();

  const showSelection = tileSelection.width > 1 || tileSelection.height > 1;

  return (
    <div className="status-bar">
      <div className="status-field status-field-coords">
        {cursorX >= 0 ? `X: ${cursorX}  Y: ${cursorY}` : 'X: --  Y: --'}
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
