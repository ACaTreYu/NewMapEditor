/**
 * AnimationPanel - View and select animated tiles for placement
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, Animation, ANIMATED_FLAG } from '@core/map';
import './AnimationPanel.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40;
const VISIBLE_ANIMATIONS = 8;
const ANIM_PREVIEW_SIZE = 48;
const FRAME_DURATION = 150; // ms per frame

export const AnimationPanel: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedAnimId, setSelectedAnimId] = useState<number | null>(null);
  const [frameOffset, setFrameOffset] = useState(0);

  const {
    animations,
    animationFrame,
    setAnimations,
    setSelectedTile,
    advanceAnimationFrame
  } = useEditorStore();

  // Animation timer
  useEffect(() => {
    const timer = setInterval(() => {
      advanceAnimationFrame();
    }, FRAME_DURATION);
    return () => clearInterval(timer);
  }, [advanceAnimationFrame]);

  // Generate default animations if none loaded
  const getAnimations = useCallback((): Animation[] => {
    if (animations) return animations;

    // Generate placeholder animations
    const defaultAnims: Animation[] = [];
    for (let i = 0; i < 256; i++) {
      defaultAnims.push({
        id: i,
        frameCount: 4,
        speed: 1,
        frames: [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]
      });
    }
    return defaultAnims;
  }, [animations]);

  // Draw animation previews
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const anims = getAnimations();
    const startIdx = scrollOffset;
    const endIdx = Math.min(startIdx + VISIBLE_ANIMATIONS, anims.length);

    for (let i = startIdx; i < endIdx; i++) {
      const anim = anims[i];
      const y = (i - startIdx) * (ANIM_PREVIEW_SIZE + 8);
      const isSelected = selectedAnimId === anim.id;

      // Background
      ctx.fillStyle = isSelected ? '#2a2a5e' : '#0d0d1a';
      ctx.fillRect(0, y, canvas.width, ANIM_PREVIEW_SIZE + 4);

      // Draw current frame
      if (tilesetImage && anim.frames.length > 0) {
        const frameIdx = animationFrame % anim.frameCount;
        const tileId = anim.frames[frameIdx] || 0;
        const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
        const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

        ctx.drawImage(
          tilesetImage,
          srcX, srcY, TILE_SIZE, TILE_SIZE,
          4, y + 2, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE
        );
      } else {
        // Placeholder
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(4, y + 2, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE);
        ctx.fillStyle = '#8a8aaa';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', 4 + ANIM_PREVIEW_SIZE / 2, y + 2 + ANIM_PREVIEW_SIZE / 2);
      }

      // Animation info
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`ID: 0x${anim.id.toString(16).toUpperCase().padStart(2, '0')}`, 60, y + 6);

      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText(`${anim.frameCount} frames`, 60, y + 22);
      ctx.fillText(`Speed: ${anim.speed}`, 60, y + 34);

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, y + 1, canvas.width - 2, ANIM_PREVIEW_SIZE + 2);
      }
    }
  }, [tilesetImage, scrollOffset, selectedAnimId, animationFrame, getAnimations]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle click to select animation
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = scrollOffset + Math.floor(y / (ANIM_PREVIEW_SIZE + 8));

    const anims = getAnimations();
    if (idx >= 0 && idx < anims.length) {
      setSelectedAnimId(anims[idx].id);
    }
  };

  // Handle scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const anims = getAnimations();
    setScrollOffset((prev) =>
      Math.max(0, Math.min(anims.length - VISIBLE_ANIMATIONS, prev + delta))
    );
  };

  // Place selected animation on map
  const handlePlaceAnimation = () => {
    if (selectedAnimId === null) return;

    // Create animated tile value: bit 15 set + frame offset + animation ID
    const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | selectedAnimId;
    setSelectedTile(animatedTile);
  };

  // Load animations from Gfx.dll binary file
  const handleLoadAnimations = async () => {
    // Open file picker for Gfx.dll
    const filePath = await window.electronAPI.openDllDialog();
    if (!filePath) return;

    const result = await window.electronAPI.readFile(filePath);
    if (!result.success || !result.data) {
      console.error('Failed to read animation file');
      return;
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(result.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = bytes.buffer;
    const dataView = new DataView(buffer);

    // Parse 256 animation structures at offset 0x642E0
    const ANIM_OFFSET = 0x642E0;
    const loadedAnimations: Animation[] = [];

    for (let i = 0; i < 256; i++) {
      const offset = ANIM_OFFSET + (i * 66);

      // Bounds check
      if (offset + 66 > buffer.byteLength) {
        console.warn(`Animation ${i}: offset ${offset} exceeds file size`);
        break;
      }

      const frameCount = dataView.getUint8(offset);
      const speed = dataView.getUint8(offset + 1);
      const frames: number[] = [];

      // Read up to 32 WORD (16-bit little-endian) frame indices
      const actualFrameCount = Math.min(frameCount, 32);
      for (let j = 0; j < actualFrameCount; j++) {
        const frameId = dataView.getUint16(offset + 2 + (j * 2), true); // little-endian
        frames.push(frameId);
      }

      loadedAnimations.push({
        id: i,
        frameCount: actualFrameCount || 1, // Minimum 1 frame
        speed: speed === 0 ? 255 : speed,
        frames: frames.length > 0 ? frames : [0]
      });
    }

    setAnimations(loadedAnimations);
  };

  return (
    <div className="animation-panel">
      <div className="panel-header">
        Animations
        <button
          className="load-button"
          onClick={handleLoadAnimations}
          title="Load animation data"
        >
          Load
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="animation-canvas"
        width={160}
        height={VISIBLE_ANIMATIONS * (ANIM_PREVIEW_SIZE + 8)}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {selectedAnimId !== null && (
        <div className="animation-controls">
          <div className="control-row">
            <label>Frame Offset</label>
            <input
              type="range"
              min={0}
              max={127}
              value={frameOffset}
              onChange={(e) => setFrameOffset(parseInt(e.target.value))}
              className="offset-slider"
            />
            <span className="offset-value">{frameOffset}</span>
          </div>
          <button className="place-button" onClick={handlePlaceAnimation}>
            Use Animation 0x{selectedAnimId.toString(16).toUpperCase().padStart(2, '0')}
          </button>
        </div>
      )}

      <div className="animation-info">
        {animations
          ? `${animations.length} animations loaded`
          : 'No animations loaded (using placeholders)'}
      </div>
    </div>
  );
};
