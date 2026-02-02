/**
 * TilesetPanel component - Wrapper for TilePalette with Win95/98 title bar
 */

import React from 'react';
import { TilePalette } from '../TilePalette';
import './TilesetPanel.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

export const TilesetPanel: React.FC<Props> = ({ tilesetImage }) => {
  return (
    <div className="tileset-panel">
      <div className="panel-title-bar">Tileset</div>
      <div className="tileset-panel-body">
        <TilePalette tilesetImage={tilesetImage} />
      </div>
    </div>
  );
};
