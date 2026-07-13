/**
 * TilesetPanel component - Wrapper for TilePalette with title bar
 * Tileset takes its natural width (640px), notepad fills remaining space to the right
 */

import React, { useState, useEffect } from 'react';
import { TilePalette } from '../TilePalette';
import { TilesetEditor } from '../TilesetEditor';
import { SpriteEditor } from '../SpriteEditor';
import { RulerNotepadPanel } from '../RulerNotepadPanel/RulerNotepadPanel';
import { ShipStickerPanel } from '../ShipStickerPanel';
import './TilesetPanel.css';

type PanelView = 'palette' | 'editor' | 'sprites';

interface Props {
  tilesetImage: HTMLImageElement | null;
  farplaneImage?: HTMLImageElement | null;
  onTileHover?: (tileId: number | undefined, col: number, row: number) => void;
  onChangeTileset?: () => void;
  onSelectBundledPatch?: (patchName: string) => void;
  activePatchName?: string | null;
}

export const TilesetPanel: React.FC<Props> = ({ tilesetImage, farplaneImage, onTileHover, onChangeTileset, onSelectBundledPatch, activePatchName }) => {
  const [activeView, setActiveView] = useState<PanelView>('palette');

  // Toggle body class so floating toolbar can be dimmed when tile/sprite editor is active
  useEffect(() => {
    document.body.classList.toggle('tile-editor-active', activeView === 'editor');
    document.body.classList.toggle('sprite-editor-active', activeView === 'sprites');
    return () => {
      document.body.classList.remove('tile-editor-active');
      document.body.classList.remove('sprite-editor-active');
    };
  }, [activeView]);

  return (
    <div className="tileset-panel">
      <div className="panel-title-bar tileset-title-bar">
        <button
          className={`tileset-view-tab${activeView === 'palette' ? ' tileset-view-tab--active' : ''}`}
          onClick={() => setActiveView('palette')}
        >Tileset</button>
        <button
          className={`tileset-view-tab${activeView === 'editor' ? ' tileset-view-tab--active' : ''}`}
          onClick={() => setActiveView('editor')}
        >Tile Editor</button>
        <button
          className={`tileset-view-tab${activeView === 'sprites' ? ' tileset-view-tab--active' : ''}`}
          onClick={() => setActiveView('sprites')}
        >Sprite Editor</button>
        <span className="tileset-title-spacer" />
      </div>
      <div className="tileset-panel-body" style={{ display: activeView === 'palette' ? 'flex' : 'none' }}>
        <div className="tileset-palette-section">
          <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
        </div>
        <div className="notepad-column">
          <RulerNotepadPanel />
        </div>
        <div className="stickers-column">
          <ShipStickerPanel
            tilesetPatchName={activePatchName}
            onSelectTilesetPatch={onSelectBundledPatch}
            onBrowseTileset={onChangeTileset}
          />
        </div>
      </div>
      <div className="tileset-panel-body" style={{ display: activeView === 'editor' ? 'flex' : 'none' }}>
        <TilesetEditor farplaneImage={farplaneImage} active={activeView === 'editor'} />
      </div>
      <div className="tileset-panel-body" style={{ display: activeView === 'sprites' ? 'flex' : 'none' }}>
        <SpriteEditor active={activeView === 'sprites'} />
      </div>
    </div>
  );
};
