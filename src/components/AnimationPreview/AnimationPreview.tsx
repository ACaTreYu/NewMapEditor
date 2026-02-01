/**
 * AnimationPreview - Compact animation preview for sidebar
 * Shows current animation with frame offset control
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, ANIMATED_FLAG, ANIMATION_DEFINITIONS, AnimationDefinition } from '@core/map';
import './AnimationPreview.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40;
const PREVIEW_SIZE = 64;
const FRAME_DURATION = 150; // ms per frame

export const AnimationPreview: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedAnimId, setSelectedAnimId] = useState(0);
  const [frameOffset, setFrameOffset] = useState(0);

  const {
    animationFrame,
    setSelectedTile,
    advanceAnimationFrame
  } = useEditorStore();

  // Animation timer using RAF with timestamp deltas
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = 0;

    const animate = (timestamp: DOMHighResTimeStamp) => {
      if (timestamp - lastFrameTime >= FRAME_DURATION) {
        advanceAnimationFrame();
        lastFrameTime = timestamp;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [advanceAnimationFrame]);

  // Get current animation from built-in definitions
  const getAnimation = useCallback((): AnimationDefinition | null => {
    return ANIMATION_DEFINITIONS[selectedAnimId] || null;
  }, [selectedAnimId]);

  // Draw preview
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const anim = getAnimation();

    // Show placeholder if no tileset or animation has no frames
    if (!tilesetImage || !anim || anim.frames.length === 0) {
      ctx.fillStyle = '#4a4a6a';
      ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      ctx.fillStyle = '#8a8aaa';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(anim?.frames.length === 0 ? '-' : 'A', PREVIEW_SIZE / 2, PREVIEW_SIZE / 2);
      return;
    }

    // Draw current frame
    const frameIdx = animationFrame % anim.frameCount;
    const tileId = anim.frames[frameIdx] || 0;
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

    ctx.drawImage(
      tilesetImage,
      srcX, srcY, TILE_SIZE, TILE_SIZE,
      0, 0, PREVIEW_SIZE, PREVIEW_SIZE
    );

    // Border
    ctx.strokeStyle = '#3a3a5e';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, PREVIEW_SIZE - 1, PREVIEW_SIZE - 1);
  }, [tilesetImage, animationFrame, getAnimation]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Place selected animation on map
  const handleUseAnimation = () => {
    // Create animated tile value: bit 15 set + frame offset + animation ID
    const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | selectedAnimId;
    setSelectedTile(animatedTile);
  };

  const anim = getAnimation();

  return (
    <div className="animation-preview">
      <div className="preview-header">
        <span className="preview-title">Animation</span>
      </div>

      <div className="preview-content">
        <canvas
          ref={canvasRef}
          className="preview-canvas"
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
        />

        <div className="preview-controls">
          <div className="control-row">
            <label>ID:</label>
            <input
              type="number"
              min={0}
              max={255}
              value={selectedAnimId}
              onChange={(e) => setSelectedAnimId(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
              className="anim-id-input"
            />
            <span className="hex-id">0x{selectedAnimId.toString(16).toUpperCase().padStart(2, '0')}</span>
          </div>

          <div className="control-row">
            <label>Offset:</label>
            <input
              type="range"
              min={0}
              max={127}
              value={frameOffset}
              onChange={(e) => setFrameOffset(parseInt(e.target.value))}
              className="offset-slider"
            />
            <span className="offset-val">{frameOffset}</span>
          </div>

          <div className="anim-info">
            {anim && anim.frames.length > 0
              ? `${anim.name} (${anim.frameCount}f)`
              : 'Undefined'}
          </div>

          <button
            className="use-btn"
            onClick={handleUseAnimation}
            disabled={!anim || anim.frames.length === 0}
          >
            Use
          </button>
        </div>
      </div>
    </div>
  );
};
