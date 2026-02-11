/**
 * Main App component for AC Map Editor
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Workspace, ToolBar, StatusBar, TilesetPanel, AnimationPanel, Minimap, GameObjectToolPanel } from '@components';
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
  const [hoverSource, setHoverSource] = useState<'map' | 'tileset' | null>(null);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const settingsDialogRef = useRef<MapSettingsDialogHandle>(null);

  const createDocument = useEditorStore((state) => state.createDocument);
  const closeDocument = useEditorStore((state) => state.closeDocument);
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

  // Create new map (multi-document: always creates new document alongside existing ones)
  const handleNewMap = useCallback(() => {
    createDocument(createEmptyMap());
  }, [createDocument]);

  // Open map file (multi-document: opens as new document alongside existing ones)
  const handleOpenMap = useCallback(async () => {
    const result = await mapService.loadMap();
    if (!result.success) {
      if (result.error !== 'canceled') {
        alert(`Failed to open map: ${result.error}`);
      }
      return;
    }

    createDocument(result.map!, result.filePath);
  }, [createDocument, mapService]);

  // Save map file
  const handleSaveMap = useCallback(async () => {
    const map = useEditorStore.getState().map;
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
  }, [markSaved, mapService]);

  // Track cursor position on map
  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorPos({ x, y });
    const map = useEditorStore.getState().map;
    if (map && x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_WIDTH) {
      setCursorTileId(map.tiles[y * MAP_WIDTH + x]);
      setHoverSource('map');
    } else {
      setCursorTileId(undefined);
      setHoverSource(null);
    }
  }, []);

  // Track cursor position on tileset
  const handleTilesetHover = useCallback((tileId: number | undefined, col: number, row: number) => {
    if (tileId !== undefined) {
      setCursorPos({ x: col, y: row });
      setCursorTileId(tileId);
      setHoverSource('tileset');
    } else {
      setCursorPos({ x: -1, y: -1 });
      setCursorTileId(undefined);
      setHoverSource(null);
    }
  }, []);

  // Close document with unsaved changes prompt (Yes=save+close, No=close, Cancel=abort)
  const handleCloseDocument = useCallback(async (docId: string) => {
    const doc = useEditorStore.getState().documents.get(docId);
    if (doc?.map?.modified) {
      const filename = doc.filePath
        ? doc.filePath.split(/[\\/]/).pop() || 'Untitled'
        : 'Untitled';

      let result: number;
      if (window.electronAPI?.confirmSave) {
        result = await window.electronAPI.confirmSave(filename);
      } else {
        // Fallback for non-Electron: confirm() maps to Yes(0) / No(1)
        result = window.confirm(`Save changes to ${filename}?`) ? 0 : 1;
      }

      if (result === 2) return; // Cancel — abort close
      if (result === 0) {
        await handleSaveMap(); // Yes — save then close
      }
      // No (1) — fall through to close without saving
    }
    closeDocument(docId);
  }, [closeDocument, handleSaveMap]);

  // Update window title based on active document
  const windowTitle = useEditorStore((state) => {
    if (!state.activeDocumentId) return 'AC Map Editor';
    const doc = state.documents.get(state.activeDocumentId);
    if (!doc?.map) return 'AC Map Editor';
    const filename = doc.filePath
      ? doc.filePath.split(/[\\/]/).pop() || 'Untitled'
      : 'Untitled';
    const modified = doc.map.modified ? ' *' : '';
    return `${filename}${modified} - AC Map Editor`;
  });

  useEffect(() => {
    document.title = windowTitle;
    if (window.electronAPI?.setTitle) {
      window.electronAPI.setTitle(windowTitle);
    }
  }, [windowTitle]);

  // Listen for arrange-windows IPC from Electron Window menu
  // Use ref-based handler to avoid StrictMode double-registration with ipcRenderer.on
  const arrangeRef = useRef(false);
  useEffect(() => {
    if (arrangeRef.current) return; // Prevent StrictMode double-register
    arrangeRef.current = true;
    const handler = (_event: any, mode: string) => {
      useEditorStore.getState().arrangeWindows(mode as 'cascade' | 'tileHorizontal' | 'tileVertical');
    };
    if (window.electronAPI?.onArrangeWindows) {
      window.electronAPI.onArrangeWindows(handler);
    }
    // No cleanup needed — single registration for app lifetime
  }, []);

  // Listen for menu-action IPC from Electron menu bar clicks (not keyboard — ToolBar handles those)
  // Use ref guard to prevent StrictMode double-registration with ipcRenderer.on
  const menuActionRef = useRef(false);
  useEffect(() => {
    if (menuActionRef.current) return;
    menuActionRef.current = true;
    const handler = (_event: any, action: string) => {
      const state = useEditorStore.getState();
      switch (action) {
        case 'new': state.createDocument(createEmptyMap()); break;
        case 'open': handleOpenMap(); break;
        case 'save': handleSaveMap(); break;
        case 'undo': state.undo(); break;
        case 'redo': state.redo(); break;
      }
    };
    if (window.electronAPI?.onMenuAction) {
      window.electronAPI.onMenuAction(handler);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <ToolBar
        onNewMap={handleNewMap}
        onOpenMap={handleOpenMap}
        onSaveMap={handleSaveMap}
      />

      <div className="app-content">
        <PanelGroup orientation="horizontal" style={{ flex: 1, minWidth: 0 }}>
          {/* Main area: Canvas + Tiles */}
          <Panel id="main" defaultSize={100}>
            <PanelGroup orientation="vertical">
              <Panel id="canvas" defaultSize={75} minSize={40}>
                <div className="main-area" onMouseDown={() => setFocusedPanel('canvas')}>
                  <Workspace
                    tilesetImage={tilesetImage}
                    onCloseDocument={handleCloseDocument}
                    onCursorMove={handleCursorMove}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="resize-handle-horizontal" />

              <Panel id="tiles" defaultSize={25} minSize={10}>
                <TilesetPanel tilesetImage={tilesetImage} onTileHover={handleTilesetHover} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>

        {/* Collapse toggle for right sidebar */}
        <button
          className={`sidebar-collapse-toggle ${rightSidebarCollapsed ? 'collapsed' : 'expanded'}`}
          onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
          title={rightSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        />

        {/* Right: Minimap + Animation Panel + Game Object Tool Panel (fixed, not resizable) */}
        {!rightSidebarCollapsed && (
          <div className="right-sidebar-container" onMouseDown={() => setFocusedPanel('animations')} tabIndex={-1}>
            <Minimap tilesetImage={tilesetImage} />
            <div className="animation-panel-container">
              <div className={`panel-title-bar ${focusedPanel === 'animations' ? 'active' : 'inactive'}`}>Animations</div>
              <AnimationPanel tilesetImage={tilesetImage} settingsDialogRef={settingsDialogRef} />
            </div>
            <GameObjectToolPanel />
          </div>
        )}
      </div>

      <StatusBar cursorX={cursorPos.x} cursorY={cursorPos.y} cursorTileId={cursorTileId} hoverSource={hoverSource} />
      <MapSettingsDialog ref={settingsDialogRef} />
    </div>
  );
};
