/**
 * Main App component for AC Map Editor
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { MapCanvas, ToolBar, StatusBar, TilesetPanel, AnimationPanel, Minimap, GameObjectToolPanel } from '@components';
import { MapSettingsDialog, MapSettingsDialogHandle } from '@components/MapSettingsDialog/MapSettingsDialog';
import { useEditorStore } from '@core/editor';
import { createEmptyMap, MAP_WIDTH } from '@core/map';
import { useFileService } from '@/contexts/FileServiceContext';
import { MapService } from '@core/services/MapService';
import './App.css';

export const App: React.FC = () => {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -1, y: -1 });
  const [cursorTileId, setCursorTileId] = useState<number | undefined>(undefined);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const settingsDialogRef = useRef<MapSettingsDialogHandle>(null);

  const map = useEditorStore((state) => state.map);
  const setMap = useEditorStore((state) => state.setMap);
  const markSaved = useEditorStore((state) => state.markSaved);
  const loadCustomDat = useEditorStore((state) => state.loadCustomDat);

  // Get FileService and create MapService
  const fileService = useFileService();
  const mapServiceRef = useRef<MapService | null>(null);
  if (!mapServiceRef.current) {
    mapServiceRef.current = new MapService(fileService);
  }
  const mapService = mapServiceRef.current;

  // Auto-load custom.dat on startup
  useEffect(() => {
    fetch('./assets/custom.dat')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        loadCustomDat(buffer);
      })
      .catch((err) => {
        console.warn('Failed to load custom.dat:', err);
      });
  }, [loadCustomDat]);

  // Load tileset image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setTilesetImage(img);
    img.onerror = () => {
      // Try BMP as fallback
      const bmpImg = new Image();
      bmpImg.onload = () => setTilesetImage(bmpImg);
      bmpImg.onerror = () => console.warn('No tileset found in assets/');
      bmpImg.src = './assets/tileset.bmp';
    };
    // Try PNG first
    img.src = './assets/tileset.png';
  }, []);

  // Create new map
  const handleNewMap = useCallback(() => {
    if (map?.modified) {
      if (!window.confirm('Discard unsaved changes?')) return;
    }
    setMap(createEmptyMap());
  }, [map, setMap]);

  // Open map file
  const handleOpenMap = useCallback(async () => {
    if (map?.modified) {
      if (!window.confirm('Discard unsaved changes?')) return;
    }

    const result = await mapService.loadMap();
    if (!result.success) {
      if (result.error !== 'canceled') {
        alert(`Failed to open map: ${result.error}`);
      }
      return;
    }

    setMap(result.map!, result.filePath);
  }, [map, setMap, mapService]);

  // Save map file
  const handleSaveMap = useCallback(async () => {
    if (!map) return;

    const result = await mapService.saveMap(map, map.filePath);
    if (!result.success) {
      if (result.error !== 'canceled') {
        alert(`Failed to save map: ${result.error}`);
      }
      return;
    }

    markSaved();
    alert('Map saved successfully!');
  }, [map, markSaved, mapService]);

  // Track cursor position on map
  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorPos({ x, y });
    if (map && x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_WIDTH) {
      setCursorTileId(map.tiles[y * MAP_WIDTH + x]);
    } else {
      setCursorTileId(undefined);
    }
  }, [map]);

  return (
    <div className="app">
      <ToolBar
        onNewMap={handleNewMap}
        onOpenMap={handleOpenMap}
        onSaveMap={handleSaveMap}
      />

      <PanelGroup orientation="horizontal" className="app-content">
        {/* Main area: Canvas + Tiles */}
        <Panel id="main" defaultSize={85}>
          <PanelGroup orientation="vertical">
            <Panel id="canvas" defaultSize={75} minSize={40}>
              <div className="main-area" onMouseDown={() => setFocusedPanel('canvas')}>
                <MapCanvas tilesetImage={tilesetImage} onCursorMove={handleCursorMove} />
              </div>
            </Panel>

            <PanelResizeHandle className="resize-handle-horizontal" />

            <Panel id="tiles" defaultSize={25} minSize={10}>
              <TilesetPanel tilesetImage={tilesetImage} />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="resize-handle-vertical" />

        {/* Right: Minimap + Animation Panel + Game Object Tool Panel */}
        <Panel id="animations" defaultSize={15} minSize={5}>
          <div className="right-sidebar-container" onMouseDown={() => setFocusedPanel('animations')} tabIndex={-1}>
            <Minimap tilesetImage={tilesetImage} />
            <div className="animation-panel-container">
              <div className={`panel-title-bar ${focusedPanel === 'animations' ? 'active' : 'inactive'}`}>Animations</div>
              <AnimationPanel tilesetImage={tilesetImage} settingsDialogRef={settingsDialogRef} />
            </div>
            <GameObjectToolPanel />
          </div>
        </Panel>
      </PanelGroup>

      <StatusBar cursorX={cursorPos.x} cursorY={cursorPos.y} cursorTileId={cursorTileId} />
      <MapSettingsDialog ref={settingsDialogRef} />
    </div>
  );
};
