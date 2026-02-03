/**
 * Main App component for AC Map Editor
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { MapCanvas, ToolBar, StatusBar, TilesetPanel, AnimationPanel, Minimap } from '@components';
import { useEditorStore } from '@core/editor';
import { mapParser, createEmptyMap, MAP_WIDTH } from '@core/map';
import './App.css';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

export const App: React.FC = () => {
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -1, y: -1 });
  const [cursorTileId, setCursorTileId] = useState<number | undefined>(undefined);

  const { setMap, map, markSaved } = useEditorStore();

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
    if (!isElectron) {
      alert('File operations require Electron');
      return;
    }

    if (map?.modified) {
      if (!window.confirm('Discard unsaved changes?')) return;
    }

    const filePath = await window.electronAPI.openFileDialog();
    if (!filePath) return;

    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) {
      alert(`Failed to read file: ${result.error}`);
      return;
    }

    // Decode base64 to ArrayBuffer
    const binary = atob(result.data!);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Check if we need to decompress (v3 format)
    const buffer = bytes.buffer;
    const parseResult = mapParser.parse(buffer, filePath);

    if (!parseResult.success) {
      alert(`Failed to parse map: ${parseResult.error}`);
      return;
    }

    const mapData = parseResult.data!;

    // For v3 maps, decompress tile data
    if (mapData.header.version === 3) {
      const dataView = new DataView(buffer);
      const compressedStart = mapData.header.dataOffset + 2;
      const compressedData = new Uint8Array(buffer, compressedStart);

      // Convert to base64 for IPC
      let compressedB64 = '';
      for (let i = 0; i < compressedData.length; i++) {
        compressedB64 += String.fromCharCode(compressedData[i]);
      }
      compressedB64 = btoa(compressedB64);

      const decompResult = await window.electronAPI.decompress(compressedB64);
      if (!decompResult.success) {
        alert(`Failed to decompress: ${decompResult.error}`);
        return;
      }

      // Decode decompressed data
      const decompBinary = atob(decompResult.data!);
      const tileBytes = new Uint8Array(decompBinary.length);
      for (let i = 0; i < decompBinary.length; i++) {
        tileBytes[i] = decompBinary.charCodeAt(i);
      }

      // Copy to tile array
      mapData.tiles = new Uint16Array(tileBytes.buffer);
    }

    setMap(mapData, filePath);
  }, [map, setMap]);

  // Save map file
  const handleSaveMap = useCallback(async () => {
    if (!isElectron || !map) return;

    let filePath = map.filePath;

    if (!filePath) {
      filePath = await window.electronAPI.saveFileDialog();
      if (!filePath) return;
    }

    // Serialize header
    const headerBuffer = mapParser.serialize(map);

    // Compress tile data
    const tileBuffer = map.tiles.buffer;
    let tileB64 = '';
    const tileBytes = new Uint8Array(tileBuffer);
    for (let i = 0; i < tileBytes.length; i++) {
      tileB64 += String.fromCharCode(tileBytes[i]);
    }
    tileB64 = btoa(tileB64);

    const compResult = await window.electronAPI.compress(tileB64);
    if (!compResult.success) {
      alert(`Failed to compress: ${compResult.error}`);
      return;
    }

    // Decode compressed data
    const compBinary = atob(compResult.data!);
    const compBytes = new Uint8Array(compBinary.length);
    for (let i = 0; i < compBinary.length; i++) {
      compBytes[i] = compBinary.charCodeAt(i);
    }

    // Combine header and compressed data
    const headerBytes = new Uint8Array(headerBuffer);
    const fullBuffer = new Uint8Array(headerBytes.length + compBytes.length);
    fullBuffer.set(headerBytes);
    fullBuffer.set(compBytes, headerBytes.length);

    // Convert to base64 for IPC
    let fullB64 = '';
    for (let i = 0; i < fullBuffer.length; i++) {
      fullB64 += String.fromCharCode(fullBuffer[i]);
    }
    fullB64 = btoa(fullB64);

    const writeResult = await window.electronAPI.writeFile(filePath, fullB64);
    if (!writeResult.success) {
      alert(`Failed to save: ${writeResult.error}`);
      return;
    }

    markSaved();
    alert('Map saved successfully!');
  }, [map, markSaved]);

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
        {/* Left: Animation Panel */}
        <Panel id="animations" defaultSize={22} minSize={5}>
          <div className="animation-panel-container">
            <div className="panel-title-bar">Animations</div>
            <AnimationPanel tilesetImage={tilesetImage} />
          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle-vertical" />

        {/* Main area: Canvas + Tiles */}
        <Panel id="main" defaultSize={78}>
          <PanelGroup orientation="vertical">
            <Panel id="canvas" defaultSize={65} minSize={10}>
              <div className="main-area">
                <MapCanvas tilesetImage={tilesetImage} onCursorMove={handleCursorMove} />
                <Minimap tilesetImage={tilesetImage} />
              </div>
            </Panel>

            <PanelResizeHandle className="resize-handle-horizontal" />

            <Panel id="tiles" defaultSize={35} minSize={5}>
              <TilesetPanel tilesetImage={tilesetImage} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      <StatusBar cursorX={cursorPos.x} cursorY={cursorPos.y} cursorTileId={cursorTileId} />
    </div>
  );
};
