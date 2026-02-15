/**
 * TilesetPanel component - Wrapper for TilePalette with Win95/98 title bar
 */

import React from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { LuFolderOpen } from 'react-icons/lu';
import { TilePalette } from '../TilePalette';
import { RulerNotepadPanel } from '../RulerNotepadPanel/RulerNotepadPanel';
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
        <PanelGroup orientation="horizontal">
          <Panel id="tile-palette" defaultSize={65} minSize={40}>
            <div className="tileset-palette-section">
              <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle-vertical" />

          <Panel id="ruler-notepad" defaultSize={35} minSize={15}>
            <div className="tileset-freed-section">
              <RulerNotepadPanel />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
