/**
 * StatusBar component - Display map info and cursor position
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
  const { map, viewport } = useEditorStore();

  return (
    <div className="status-bar">
      <div className="status-section status-position">
        <span className="status-label">x:</span>
        <span className="status-value">{cursorX >= 0 ? cursorX : '--'}</span>
        <span className="status-label">y:</span>
        <span className="status-value">{cursorY >= 0 ? cursorY : '--'}</span>
      </div>

      <div className="status-section">
        <span className="status-label">Tile:</span>
        <span className="status-value">{cursorTileId !== undefined ? cursorTileId : '--'}</span>
      </div>

      <div className="status-section">
        <span className="status-label">Zoom:</span>
        <span className="status-value">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      {map && (
        <>
          <div className="status-section">
            <span className="status-label">Size:</span>
            <span className="status-value">
              {map.header.width} x {map.header.height}
            </span>
          </div>

          <div className="status-section">
            <span className="status-label">Teams:</span>
            <span className="status-value">{map.header.numTeams}</span>
          </div>

          <div className="status-section">
            <span className="status-label">Objective:</span>
            <span className="status-value">
              {['Frag', 'Flag', 'Switch'][map.header.objective] || 'Unknown'}
            </span>
          </div>
        </>
      )}

      <div className="status-spacer" />

      <div className="status-section">
        <span className="status-label">AC Map Editor</span>
      </div>
    </div>
  );
};
