/**
 * TilesetEditor - Pixel-level tile editor with grid view and detail panel.
 * Click any tile in the grid to open it in the pixel editor.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import './TilesetEditor.css';

const TILE_SIZE = 16;
const TILES_PER_ROW = 40;
const ZOOM = 16; // 16x zoom for pixel editing (16px tile → 256px editor)
const EDITOR_SIZE = TILE_SIZE * ZOOM; // 256px

interface Props {
  tilesetImage: HTMLImageElement | null;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const TilesetEditor: React.FC<Props> = ({ tilesetImage }) => {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [hoveredTileId, setHoveredTileId] = useState<number | null>(null);
  const [currentColor, setCurrentColor] = useState<Color>({ r: 255, g: 255, b: 255, a: 255 });
  const [activeTool, setActiveTool] = useState<'pencil' | 'eraser' | 'eyedropper' | 'fill'>('pencil');
  const [tilePixels, setTilePixels] = useState<ImageData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridScale, setGridScale] = useState(2);

  // Extract tile pixels from tileset
  const extractTilePixels = useCallback((tileId: number): ImageData | null => {
    if (!tilesetImage) return null;
    const col = tileId % TILES_PER_ROW;
    const row = Math.floor(tileId / TILES_PER_ROW);
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(tilesetImage, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
    return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  }, [tilesetImage]);

  // Draw the grid overview of all tiles
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas || !tilesetImage) return;
    const ctx = canvas.getContext('2d')!;

    const totalRows = Math.ceil(tilesetImage.naturalHeight / TILE_SIZE);
    const scaledTile = TILE_SIZE * gridScale;
    canvas.width = TILES_PER_ROW * scaledTile;
    canvas.height = totalRows * scaledTile;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tilesetImage, 0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= TILES_PER_ROW; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scaledTile + 0.5, 0);
      ctx.lineTo(x * scaledTile + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= totalRows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scaledTile + 0.5);
      ctx.lineTo(canvas.width, y * scaledTile + 0.5);
      ctx.stroke();
    }

    // Highlight selected tile
    const selCol = selectedTileId % TILES_PER_ROW;
    const selRow = Math.floor(selectedTileId / TILES_PER_ROW);
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(selCol * scaledTile + 1, selRow * scaledTile + 1, scaledTile - 2, scaledTile - 2);

    // Highlight hovered tile
    if (hoveredTileId !== null && hoveredTileId !== selectedTileId) {
      const hCol = hoveredTileId % TILES_PER_ROW;
      const hRow = Math.floor(hoveredTileId / TILES_PER_ROW);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hCol * scaledTile + 0.5, hRow * scaledTile + 0.5, scaledTile - 1, scaledTile - 1);
    }
  }, [tilesetImage, selectedTileId, hoveredTileId, gridScale]);

  // Draw the pixel editor
  const drawEditor = useCallback(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !tilePixels) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = EDITOR_SIZE;
    canvas.height = EDITOR_SIZE;

    // Checkerboard background (transparency indicator)
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const checker = ((x + y) % 2 === 0) ? '#2a2a2a' : '#1a1a1a';
        ctx.fillStyle = checker;
        ctx.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
      }
    }

    // Draw pixels
    const data = tilePixels.data;
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const i = (y * TILE_SIZE + x) * 4;
        const a = data[i + 3];
        if (a > 0) {
          ctx.fillStyle = `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${a / 255})`;
          ctx.fillRect(x * ZOOM, y * ZOOM, ZOOM, ZOOM);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= TILE_SIZE; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ZOOM + 0.5, 0);
      ctx.lineTo(x * ZOOM + 0.5, EDITOR_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= TILE_SIZE; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ZOOM + 0.5);
      ctx.lineTo(EDITOR_SIZE, y * ZOOM + 0.5);
      ctx.stroke();
    }
  }, [tilePixels]);

  // Draw 1:1 preview
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !tilePixels) return;
    const ctx = canvas.getContext('2d')!;
    const previewScale = 4;
    canvas.width = TILE_SIZE * previewScale;
    canvas.height = TILE_SIZE * previewScale;
    ctx.imageSmoothingEnabled = false;

    // Put the pixel data at 1:1, then scale
    const tmp = document.createElement('canvas');
    tmp.width = TILE_SIZE;
    tmp.height = TILE_SIZE;
    tmp.getContext('2d')!.putImageData(tilePixels, 0, 0);
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [tilePixels]);

  // Load tile when selection changes
  useEffect(() => {
    const pixels = extractTilePixels(selectedTileId);
    if (pixels) setTilePixels(pixels);
  }, [selectedTileId, extractTilePixels]);

  // Redraw when state changes
  useEffect(() => { drawGrid(); }, [drawGrid]);
  useEffect(() => { drawEditor(); }, [drawEditor]);
  useEffect(() => { drawPreview(); }, [drawPreview]);

  // Grid click → select tile
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tilesetImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaledTile = TILE_SIZE * gridScale;
    const col = Math.floor((e.clientX - rect.left) / scaledTile);
    const row = Math.floor((e.clientY - rect.top) / scaledTile);
    const totalRows = Math.ceil(tilesetImage.naturalHeight / TILE_SIZE);
    if (col >= 0 && col < TILES_PER_ROW && row >= 0 && row < totalRows) {
      setSelectedTileId(row * TILES_PER_ROW + col);
    }
  }, [tilesetImage, gridScale]);

  // Grid hover
  const handleGridMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tilesetImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaledTile = TILE_SIZE * gridScale;
    const col = Math.floor((e.clientX - rect.left) / scaledTile);
    const row = Math.floor((e.clientY - rect.top) / scaledTile);
    const totalRows = Math.ceil(tilesetImage.naturalHeight / TILE_SIZE);
    if (col >= 0 && col < TILES_PER_ROW && row >= 0 && row < totalRows) {
      setHoveredTileId(row * TILES_PER_ROW + col);
    } else {
      setHoveredTileId(null);
    }
  }, [tilesetImage, gridScale]);

  // Pixel editing
  const paintPixel = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tilePixels) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) / ZOOM);
    const py = Math.floor((e.clientY - rect.top) / ZOOM);
    if (px < 0 || px >= TILE_SIZE || py < 0 || py >= TILE_SIZE) return;

    const newData = new ImageData(new Uint8ClampedArray(tilePixels.data), TILE_SIZE, TILE_SIZE);
    const i = (py * TILE_SIZE + px) * 4;

    if (activeTool === 'eyedropper') {
      setCurrentColor({
        r: newData.data[i],
        g: newData.data[i + 1],
        b: newData.data[i + 2],
        a: newData.data[i + 3],
      });
      setActiveTool('pencil');
      return;
    }

    if (activeTool === 'eraser') {
      newData.data[i] = 0;
      newData.data[i + 1] = 0;
      newData.data[i + 2] = 0;
      newData.data[i + 3] = 0;
    } else if (activeTool === 'fill') {
      floodFill(newData, px, py, currentColor);
    } else {
      newData.data[i] = currentColor.r;
      newData.data[i + 1] = currentColor.g;
      newData.data[i + 2] = currentColor.b;
      newData.data[i + 3] = currentColor.a;
    }

    setTilePixels(newData);
  }, [tilePixels, activeTool, currentColor]);

  const handleEditorMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    paintPixel(e);
  }, [paintPixel]);

  const handleEditorMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && activeTool !== 'fill' && activeTool !== 'eyedropper') {
      paintPixel(e);
    }
  }, [isDrawing, activeTool, paintPixel]);

  const handleEditorMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Color from hex input
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    setCurrentColor({ r, g, b, a: 255 });
  }, []);

  const colorHex = `#${currentColor.r.toString(16).padStart(2, '0')}${currentColor.g.toString(16).padStart(2, '0')}${currentColor.b.toString(16).padStart(2, '0')}`;

  if (!tilesetImage) {
    return (
      <div className="tileset-editor empty">
        <p>Load a tileset to use the tile editor</p>
      </div>
    );
  }

  const tileCol = selectedTileId % TILES_PER_ROW;
  const tileRow = Math.floor(selectedTileId / TILES_PER_ROW);

  return (
    <div className="tileset-editor">
      {/* Left: grid overview */}
      <div className="te-grid-panel" ref={gridContainerRef}>
        <div className="te-grid-header">
          <span className="te-label">Tilesheet</span>
          <div className="te-grid-zoom">
            <button className={gridScale === 1 ? 'active' : ''} onClick={() => setGridScale(1)}>1x</button>
            <button className={gridScale === 2 ? 'active' : ''} onClick={() => setGridScale(2)}>2x</button>
            <button className={gridScale === 3 ? 'active' : ''} onClick={() => setGridScale(3)}>3x</button>
          </div>
        </div>
        <div className="te-grid-scroll">
          <canvas
            ref={gridCanvasRef}
            onClick={handleGridClick}
            onMouseMove={handleGridMove}
            onMouseLeave={() => setHoveredTileId(null)}
          />
        </div>
      </div>

      {/* Right: pixel editor + tools */}
      <div className="te-editor-panel">
        <div className="te-editor-header">
          <span className="te-label">Tile #{selectedTileId}</span>
          <span className="te-sublabel">({tileCol}, {tileRow})</span>
        </div>

        <div className="te-editor-main">
          <canvas
            ref={editorCanvasRef}
            className="te-pixel-canvas"
            onMouseDown={handleEditorMouseDown}
            onMouseMove={handleEditorMouseMove}
            onMouseUp={handleEditorMouseUp}
            onMouseLeave={handleEditorMouseUp}
          />
        </div>

        <div className="te-tools">
          <div className="te-tool-row">
            <button className={activeTool === 'pencil' ? 'active' : ''} onClick={() => setActiveTool('pencil')} title="Pencil (P)">P</button>
            <button className={activeTool === 'eraser' ? 'active' : ''} onClick={() => setActiveTool('eraser')} title="Eraser (E)">E</button>
            <button className={activeTool === 'eyedropper' ? 'active' : ''} onClick={() => setActiveTool('eyedropper')} title="Eyedropper (I)">I</button>
            <button className={activeTool === 'fill' ? 'active' : ''} onClick={() => setActiveTool('fill')} title="Fill (G)">G</button>
          </div>

          <div className="te-color-row">
            <input type="color" value={colorHex} onChange={handleColorChange} title="Pick color" />
            <div className="te-color-swatch" style={{ background: colorHex }} />
            <span className="te-color-hex">{colorHex}</span>
          </div>

          <div className="te-preview-row">
            <span className="te-sublabel">Preview</span>
            <canvas ref={previewCanvasRef} className="te-preview-canvas" />
          </div>
        </div>
      </div>
    </div>
  );
};

/** Flood fill algorithm */
function floodFill(imageData: ImageData, startX: number, startY: number, fillColor: Color): void {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const si = (startY * w + startX) * 4;
  const targetR = data[si], targetG = data[si + 1], targetB = data[si + 2], targetA = data[si + 3];

  if (targetR === fillColor.r && targetG === fillColor.g && targetB === fillColor.b && targetA === fillColor.a) return;

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<number>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = y * w + x;
    if (x < 0 || x >= w || y < 0 || y >= h || visited.has(key)) continue;

    const i = key * 4;
    if (data[i] !== targetR || data[i + 1] !== targetG || data[i + 2] !== targetB || data[i + 3] !== targetA) continue;

    visited.add(key);
    data[i] = fillColor.r;
    data[i + 1] = fillColor.g;
    data[i + 2] = fillColor.b;
    data[i + 3] = fillColor.a;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
