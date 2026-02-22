/**
 * TilesetPanel component - Wrapper for TilePalette with title bar
 * Tileset takes its natural width (640px), notepad fills remaining space to the right
 */

import React, { useState, useRef, useEffect } from 'react';
import { LuFolderOpen, LuPalette } from 'react-icons/lu';
import { TilePalette } from '../TilePalette';
import { RulerNotepadPanel } from '../RulerNotepadPanel/RulerNotepadPanel';
import './TilesetPanel.css';

const BUNDLED_PATCHES = [
  'AC Default',
  'BilePatch',
  'Black Magic',
  'Black Tiles',
  'Blue Widow',
  'bouncy-patch',
  'forest-patch',
  'Gold',
  'H-Front',
  'High Contrast',
  'LN Patch',
  'Mario Kart',
  'nBn Patch',
  'nBn Patch 2',
  'NextGEN - Battle for Earth',
  'NextGEN -APL',
  'NextGEN -Cell Shade',
  'NextGEN -Final',
  'NextGEN -Initial Confrontation',
  'NextGEN -TBWA Edition v2',
  'oTa Patch',
  'Perfection',
  'Precious Metals',
  'rage patch og',
  'Retro Patch',
  'Sierra ARC',
  'Siren Patch',
  'SoloStyle',
  'Spark 3D',
  'Star Gaze',
  'TEN Patch',
  'waves-patch',
  'Zelda',
];

interface Props {
  tilesetImage: HTMLImageElement | null;
  onTileHover?: (tileId: number | undefined, col: number, row: number) => void;
  onChangeTileset?: () => void;
  onSelectBundledPatch?: (patchName: string) => void;
}

export const TilesetPanel: React.FC<Props> = ({ tilesetImage, onTileHover, onChangeTileset, onSelectBundledPatch }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        <span>Tileset</span>
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
                    className="tileset-patch-option"
                    onClick={() => {
                      onSelectBundledPatch(name);
                      setDropdownOpen(false);
                    }}
                  >
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
      <div className="tileset-panel-body">
        <div className="tileset-palette-section">
          <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
        </div>
        <div className="notepad-column">
          <RulerNotepadPanel />
        </div>
      </div>
    </div>
  );
};
