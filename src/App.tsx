/**
 * Main App component for AC Map Editor
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Workspace, ToolBar, StatusBar, TilesetPanel, AnimationPanel, Minimap, GameObjectToolPanel } from '@components';
import { MapSettingsDialog, MapSettingsDialogHandle } from '@components/MapSettingsDialog/MapSettingsDialog';
import { useEditorStore } from '@core/editor';
import { createEmptyMap, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '@core/map';
import { isAnyDragActive } from '@core/canvas';
import { useFileService } from '@/contexts/FileServiceContext';
import { MapService } from '@core/services/MapService';
import './App.css';

export const App: React.FC = () => {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [farplaneImage, setFarplaneImage] = useState<HTMLImageElement | null>(null);
  const [, setTunaImage] = useState<HTMLImageElement | null>(null);
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

  // Load default patch images (imgTiles + imgFarplane) on startup
  useEffect(() => {
    const patchBase = './assets/patches/AC%20Default';

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });

    // Load tileset (required)
    loadImg(`${patchBase}/imgTiles.png`)
      .catch(() => loadImg('./assets/tileset.png'))
      .catch(() => loadImg('./assets/tileset.bmp'))
      .then((img) => setTilesetImage(img))
      .catch(() => console.warn('No tileset found'));

    // Load farplane (optional)
    loadImg(`${patchBase}/imgFarplane.jpg`)
      .then((img) => setFarplaneImage(img))
      .catch(() => console.log('No default farplane found'));
  }, []);

  // Load a patch folder (imgTiles, imgFarplane, imgTuna)
  const handleChangeTileset = useCallback(async () => {
    const folderPath = await window.electronAPI?.openPatchFolderDialog?.();
    if (!folderPath) return;

    const result = await window.electronAPI.listDir(folderPath);
    if (!result.success || !result.files) return;

    const files = result.files;
    const imageExts = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];

    const findImage = (prefix: string): string | null => {
      const match = files.find((f: string) => {
        const lower = f.toLowerCase();
        return lower.startsWith(prefix.toLowerCase()) && imageExts.some((ext) => lower.endsWith(ext));
      });
      return match ? `${folderPath}/${match}` : null;
    };

    const loadImage = (filePath: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        window.electronAPI.readFile(filePath).then((res) => {
          if (!res.success || !res.data) {
            reject(new Error(res.error || 'Failed to read file'));
            return;
          }
          const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
          const mimeMap: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            bmp: 'image/bmp', gif: 'image/gif'
          };
          const mime = mimeMap[ext] || 'image/png';
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to decode ${filePath}`));
          img.src = `data:${mime};base64,${res.data}`;
        });
      });

    // Load imgTiles (required)
    const tilesPath = findImage('imgTiles');
    if (tilesPath) {
      try {
        const img = await loadImage(tilesPath);
        setTilesetImage(img);
      } catch (err) {
        console.warn('Failed to load imgTiles:', err);
      }
    }

    // Load imgFarplane (optional)
    const farplanePath = findImage('imgFarplane');
    if (farplanePath) {
      try {
        const img = await loadImage(farplanePath);
        setFarplaneImage(img);
      } catch (err) {
        console.warn('Failed to load imgFarplane:', err);
      }
    } else {
      setFarplaneImage(null);
    }

    // Load imgTuna (optional)
    const tunaPath = findImage('imgTuna');
    if (tunaPath) {
      try {
        const img = await loadImage(tunaPath);
        setTunaImage(img);
      } catch (err) {
        console.warn('Failed to load imgTuna:', err);
      }
    } else {
      setTunaImage(null);
    }
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
        case 'undo': if (!isAnyDragActive()) state.undo(); break;
        case 'redo': if (!isAnyDragActive()) state.redo(); break;
        case 'center-selection': {
          if (!state.activeDocumentId) break;
          const doc = state.documents.get(state.activeDocumentId);
          if (!doc) break;
          const { selection, viewport } = doc;
          if (!selection.active) break;
          const selCenterX = (selection.startX + selection.endX) / 2;
          const selCenterY = (selection.startY + selection.endY) / 2;
          const visibleTilesX = window.innerWidth / (TILE_SIZE * viewport.zoom);
          const visibleTilesY = (window.innerHeight - 100) / (TILE_SIZE * viewport.zoom);
          const newX = selCenterX - visibleTilesX / 2;
          const newY = selCenterY - visibleTilesY / 2;
          state.setViewport({
            x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX)),
            y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY))
          });
          break;
        }
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
        tilesetImage={tilesetImage}
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
                <TilesetPanel tilesetImage={tilesetImage} onTileHover={handleTilesetHover} onChangeTileset={handleChangeTileset} />
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

        {/* Right sidebar: Minimap always visible, animations panel collapsible */}
        <div className="right-sidebar-container" onMouseDown={() => setFocusedPanel('animations')} tabIndex={-1}>
          <Minimap tilesetImage={tilesetImage} farplaneImage={farplaneImage} />
          {!rightSidebarCollapsed && (
            <>
              <div className="animation-panel-container">
                <div className={`panel-title-bar ${focusedPanel === 'animations' ? 'active' : 'inactive'}`}>Animations</div>
                <AnimationPanel tilesetImage={tilesetImage} />
              </div>
              <GameObjectToolPanel />
            </>
          )}
        </div>
      </div>

      <StatusBar cursorX={cursorPos.x} cursorY={cursorPos.y} cursorTileId={cursorTileId} hoverSource={hoverSource} />
      <MapSettingsDialog ref={settingsDialogRef} />
    </div>
  );
};
