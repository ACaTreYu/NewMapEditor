/**
 * TilesetPanel component - Wrapper for TilePalette with Win95/98 title bar
 */

import React from 'react';
import { LuFolderOpen } from 'react-icons/lu';
import { TilePalette } from '../TilePalette';
import './TilesetPanel.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  onTileHover?: (tileId: number | undefined, col: number, row: number) => void;
  onChangeTileset?: () => void;
}

export const TilesetPanel: React.FC<Props> = ({ tilesetImage, onTileHover, onChangeTileset }) => {
  return (
    <div className="tileset-panel">
      <div className="panel-title-bar tileset-title-bar">
        <span>Tileset</span>
        {onChangeTileset && (
          <button className="tileset-change-btn" onClick={onChangeTileset} title="Change tileset (load patch folder)">
            <LuFolderOpen size={12} />
          </button>
        )}
      </div>
      <div className="tileset-panel-body">
        {/* Left: Fixed 640px tile palette */}
        <div className="tileset-palette-section">
          <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
        </div>

        {/* Right: Freed space for Phase 62 */}
        <div className="tileset-freed-section">
          {/* Empty - no content needed */}
        </div>
      </div>
    </div>
  );
};
