/**
 * TilesetPanel component - Wrapper for TilePalette with title bar
 * Tileset takes its natural width (640px), notepad fills remaining space to the right
 */

import React, { useState, useRef, useEffect } from 'react';
import { LuFolderOpen, LuPalette } from 'react-icons/lu';
import { TilePalette } from '../TilePalette';
import { TilesetEditor } from '../TilesetEditor';
import { SpriteEditor } from '../SpriteEditor';
import { RulerNotepadPanel } from '../RulerNotepadPanel/RulerNotepadPanel';
import { BUNDLED_PATCHES } from '@core/patches';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState<PanelView>('palette');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle body class so floating toolbar can be dimmed when tile/sprite editor is active
  useEffect(() => {
    document.body.classList.toggle('tile-editor-active', activeView === 'editor');
    document.body.classList.toggle('sprite-editor-active', activeView === 'sprites');
    return () => {
      document.body.classList.remove('tile-editor-active');
      document.body.classList.remove('sprite-editor-active');
    };
  }, [activeView]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

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
        {onSelectBundledPatch && (
          <div className="tileset-dropdown-wrap" ref={dropdownRef}>
            <button
              className="tileset-change-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Select bundled patch"
            >
              <LuPalette size={12} />
            </button>
            {dropdownOpen && (
              <div className="tileset-patch-dropdown">
                {BUNDLED_PATCHES.map((name) => (
                  <button
                    key={name}
                    className={`tileset-patch-option${name === activePatchName ? ' tileset-patch-option--active' : ''}`}
                    onClick={() => {
                      onSelectBundledPatch(name);
                      setDropdownOpen(false);
                    }}
                  >
                    {name === activePatchName && <span className="tileset-patch-check">&#10003; </span>}
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {onChangeTileset && (
          <button className="tileset-change-btn" onClick={onChangeTileset} title="Browse for patch folder">
            <LuFolderOpen size={12} />
          </button>
        )}
      </div>
      <div className="tileset-panel-body" style={{ display: activeView === 'palette' ? 'flex' : 'none' }}>
        <div className="tileset-palette-section">
          <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
        </div>
        <div className="notepad-column">
          <RulerNotepadPanel />
        </div>
      </div>
      <div className="tileset-panel-body" style={{ display: activeView === 'editor' ? 'flex' : 'none' }}>
        <TilesetEditor farplaneImage={farplaneImage} />
      </div>
      <div className="tileset-panel-body" style={{ display: activeView === 'sprites' ? 'flex' : 'none' }}>
        <SpriteEditor />
      </div>
    </div>
  );
};
