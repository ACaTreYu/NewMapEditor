/**
 * Main App component for AC Map Editor
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Workspace, ToolBar, StatusBar, TilesetPanel, Minimap } from '@components';
import { MapSettingsDialog, MapSettingsDialogHandle } from '@components/MapSettingsDialog/MapSettingsDialog';
import { BatchRenderDialog } from '@components/BatchRenderDialog/BatchRenderDialog';
import { useEditorStore } from '@core/editor';
import { createEmptyMap, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '@core/map';
import { isAnyDragActive } from '@core/canvas';
import { useFileService } from '@/contexts/FileServiceContext';
import { MapService } from '@core/services/MapService';
import { useAnimationTimer } from '@/hooks/useAnimationTimer';
import './App.css';

export const App: React.FC = () => {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [farplaneImage, setFarplaneImage] = useState<HTMLImageElement | null>(null);
  const [, setTunaImage] = useState<HTMLImageElement | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -1, y: -1 });
  const [cursorTileId, setCursorTileId] = useState<number | undefined>(undefined);
  const [hoverSource, setHoverSource] = useState<'map' | 'tileset' | null>(null);
  const settingsDialogRef = useRef<MapSettingsDialogHandle>(null);

  // Global animation timer (runs for entire app lifetime, independent of panel visibility)
  useAnimationTimer();

  const createDocument = useEditorStore((state) => state.createDocument);
  const closeDocument = useEditorStore((state) => state.closeDocument);
  const markSaved = useEditorStore((state) => state.markSaved);
  const updateFilePath = useEditorStore((state) => state.updateFilePath);
  const loadCustomDat = useEditorStore((state) => state.loadCustomDat);
  const createTraceImageWindow = useEditorStore((state) => state.createTraceImageWindow);
  const batchDialogOpen = useEditorStore((s) => s.batchDialogOpen);

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

  // Load a bundled patch by name (from ./assets/patches/)
  const handleSelectBundledPatch = useCallback(async (patchName: string) => {
    const patchBase = `./assets/patches/${encodeURIComponent(patchName)}`;

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });

    // Load imgTiles (required)
    try {
      const img = await loadImg(`${patchBase}/imgTiles.png`);
      setTilesetImage(img);
    } catch {
      console.warn(`Failed to load imgTiles for patch: ${patchName}`);
      return;
    }

    // Load imgFarplane (optional)
    try {
      const img = await loadImg(`${patchBase}/imgFarplane.png`);
      setFarplaneImage(img);
    } catch {
      setFarplaneImage(null);
    }

    // Load imgTuna (optional)
    try {
      const img = await loadImg(`${patchBase}/imgTuna.png`);
      setTunaImage(img);
    } catch {
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

  // Save map as new file
  const handleSaveAsMap = useCallback(async () => {
    const state = useEditorStore.getState();
    const { activeDocumentId, documents } = state;
    if (!activeDocumentId) return;

    const doc = documents.get(activeDocumentId);
    if (!doc?.map) return;

    // Pre-fill dialog with current filename (or undefined for new maps)
    const defaultPath = doc.filePath || undefined;

    const result = await mapService.saveMapAs(doc.map, defaultPath);
    if (!result.success) {
      if (result.error !== 'canceled') {
        alert(`Failed to save map: ${result.error}`);
      }
      return;
    }

    // Update document filePath and window title, then mark saved
    updateFilePath(result.filePath!);
    markSaved();

    alert('Map saved successfully!');
  }, [markSaved, updateFilePath, mapService]);

  // Import trace image overlay
  const handleImportTraceImage = useCallback(async () => {
    const filePath = await window.electronAPI?.openImageDialog?.();
    if (!filePath) return;

    // Load image via existing readFile IPC (returns base64)
    const res = await window.electronAPI.readFile(filePath);
    if (!res.success || !res.data) {
      alert('Failed to load image file');
      return;
    }

    // Determine MIME type from extension
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      bmp: 'image/bmp', gif: 'image/gif', webp: 'image/webp',
      svg: 'image/svg+xml'
    };
    const mime = mimeMap[ext] || 'image/png';
    const dataSrc = `data:${mime};base64,${res.data}`;

    // Extract filename from path
    const fileName = filePath.split(/[\\/]/).pop() || 'Trace Image';

    createTraceImageWindow(dataSrc, fileName);
  }, [createTraceImageWindow]);

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
  const importTraceRef = useRef(handleImportTraceImage);
  importTraceRef.current = handleImportTraceImage;

  useEffect(() => {
    if (menuActionRef.current) return;
    menuActionRef.current = true;
    const handler = (_event: any, action: string) => {
      const state = useEditorStore.getState();
      switch (action) {
        case 'new': state.createDocument(createEmptyMap()); break;
        case 'open': handleOpenMap(); break;
        case 'save': handleSaveMap(); break;
        case 'save-as': handleSaveAsMap(); break;
        case 'import-trace-image': importTraceRef.current(); break;
        case 'batch-render': state.startBatchRender(); break;
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

  // Theme system: sync on mount + listen for set-theme IPC from Electron menu
  const themeRef = useRef(false);
  useEffect(() => {
    if (themeRef.current) return;
    themeRef.current = true;

    const applyTheme = (theme: string) => {
      if (theme === 'dark' || theme === 'terminal') {
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };

    const resolveAuto = () =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    // On mount: apply persisted theme and sync to Electron menu
    const stored = localStorage.getItem('ac-editor-theme') || 'auto';
    applyTheme(stored === 'auto' ? resolveAuto() : stored);
    window.electronAPI?.syncTheme?.(stored);

    // Listen for OS theme changes when in auto mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const osHandler = () => {
      const current = localStorage.getItem('ac-editor-theme') || 'auto';
      if (current === 'auto') {
        applyTheme(resolveAuto());
      }
    };
    mq.addEventListener('change', osHandler);

    // Listen for theme changes from Electron View > Theme menu
    const handler = (_event: any, theme: string) => {
      applyTheme(theme === 'auto' ? resolveAuto() : theme);
      localStorage.setItem('ac-editor-theme', theme);
      window.electronAPI?.syncTheme?.(theme);
    };
    if (window.electronAPI?.onSetTheme) {
      window.electronAPI.onSetTheme(handler);
    }
  }, []);

  // ── Auto-update state ──
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);

  useEffect(() => {
    const handler = (_event: any, status: string, version?: string, percent?: number) => {
      setUpdateStatus(status);
      if (version) setUpdateVersion(version);
      if (percent !== undefined) setDownloadPercent(percent);
      if (status === 'up-to-date' || status === 'error') {
        setTimeout(() => setUpdateStatus('idle'), 4000);
      }
    };
    window.electronAPI?.onUpdateStatus?.(handler);
  }, []);

  return (
    <div className="app">
      <ToolBar
        tilesetImage={tilesetImage}
        onNewMap={handleNewMap}
        onOpenMap={handleOpenMap}
        onSaveMap={handleSaveMap}
        onSaveAsMap={handleSaveAsMap}
      />

      {updateStatus === 'downloading' && (
        <div className="update-banner update-banner-downloading">
          Downloading update v{updateVersion}... {downloadPercent}%
        </div>
      )}

      {updateStatus === 'progress' && (
        <div className="update-banner update-banner-downloading">
          Downloading update v{updateVersion}... {downloadPercent}%
        </div>
      )}

      {updateStatus === 'ready' && (
        <button
          className="update-banner update-banner-ready"
          onClick={() => window.electronAPI?.installUpdate?.()}
        >
          Update v{updateVersion} ready — click here to restart and apply
        </button>
      )}

      {updateStatus === 'checking' && (
        <div className="update-banner update-banner-checking">
          Checking for updates...
        </div>
      )}

      <div className="app-content">
        <PanelGroup orientation="horizontal" style={{ flex: 1, minWidth: 0 }}>
          {/* Main area: Canvas + Tiles */}
          <Panel id="main" defaultSize={100}>
            <PanelGroup orientation="vertical">
              <Panel id="canvas" defaultSize={75} minSize={40}>
                <div className="main-area">
                  <Workspace
                    tilesetImage={tilesetImage}
                    onCloseDocument={handleCloseDocument}
                    onCursorMove={handleCursorMove}
                  />
                  <Minimap tilesetImage={tilesetImage} farplaneImage={farplaneImage} />
                  <div id="floating-toolbar-portal" />
                </div>
              </Panel>

              <PanelResizeHandle className="resize-handle-horizontal" />

              <Panel id="tiles" defaultSize={25} minSize={10}>
                <TilesetPanel tilesetImage={tilesetImage} onTileHover={handleTilesetHover} onChangeTileset={handleChangeTileset} onSelectBundledPatch={handleSelectBundledPatch} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>

      </div>

      <StatusBar cursorX={cursorPos.x} cursorY={cursorPos.y} cursorTileId={cursorTileId} hoverSource={hoverSource} />
      <MapSettingsDialog ref={settingsDialogRef} />
      {batchDialogOpen && <BatchRenderDialog />}
    </div>
  );
};
