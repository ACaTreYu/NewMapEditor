/**
 * AnimationPanel - View and select animated tiles for placement
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, ANIMATED_FLAG, ANIMATION_DEFINITIONS, getDefinedAnimations, AnimationDefinition } from '@core/map';
import './AnimationPanel.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40;
const VISIBLE_ANIMATIONS = 20; // More fit with 16x16 size
const ANIM_PREVIEW_SIZE = 16; // Actual tile size
const PREVIEW_PADDING = 4;
const ITEM_HEIGHT = ANIM_PREVIEW_SIZE + PREVIEW_PADDING * 2; // 24px per row
const FRAME_DURATION = 150; // ms per frame

export const AnimationPanel: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedAnimId, setSelectedAnimId] = useState<number | null>(null);
  const [frameOffset, setFrameOffset] = useState(0);
  const [showAllAnimations, setShowAllAnimations] = useState(false);
  const [hoveredAnimId, setHoveredAnimId] = useState<number | null>(null);

  const animationFrame = useEditorStore((state) => state.animationFrame);
  const setSelectedTile = useEditorStore((state) => state.setSelectedTile);
  const advanceAnimationFrame = useEditorStore((state) => state.advanceAnimationFrame);

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

  // Get animations list (all or only defined)
  const getAnimations = useCallback((): AnimationDefinition[] => {
    if (showAllAnimations) {
      return ANIMATION_DEFINITIONS;
    }
    return getDefinedAnimations();
  }, [showAllAnimations]);

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
      const y = (i - startIdx) * ITEM_HEIGHT;
      const isSelected = selectedAnimId === anim.id;
      const isHovered = hoveredAnimId === anim.id;
      const hasFrames = anim.frames.length > 0;

      // Alternating row background
      ctx.fillStyle = i % 2 === 0 ? '#0d0d1a' : '#12121f';
      ctx.fillRect(0, y, canvas.width, ITEM_HEIGHT);

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = '#2a2a5e';
        ctx.fillRect(0, y, canvas.width, ITEM_HEIGHT);
      }

      // Draw current frame at 16x16 actual size
      if (tilesetImage && hasFrames) {
        const frameIdx = animationFrame % anim.frameCount;
        const tileId = anim.frames[frameIdx] || 0;
        const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
        const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

        ctx.drawImage(
          tilesetImage,
          srcX, srcY, TILE_SIZE, TILE_SIZE,
          PREVIEW_PADDING, y + PREVIEW_PADDING, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE
        );
      } else {
        // Placeholder for undefined/empty animations
        ctx.fillStyle = hasFrames ? '#4a4a6a' : '#2a2a3a';
        ctx.fillRect(PREVIEW_PADDING, y + PREVIEW_PADDING, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE);
        ctx.fillStyle = hasFrames ? '#8a8aaa' : '#5a5a6a';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hasFrames ? 'A' : '-', PREVIEW_PADDING + ANIM_PREVIEW_SIZE / 2, y + PREVIEW_PADDING + ANIM_PREVIEW_SIZE / 2);
      }

      // Hex label (show on hover or selection only)
      if (isHovered || isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        // Format without leading zero: "D5" not "0D5"
        ctx.fillText(
          anim.id.toString(16).toUpperCase(),
          PREVIEW_PADDING + ANIM_PREVIEW_SIZE + 4,
          y + ITEM_HEIGHT / 2
        );
      }
    }
  }, [tilesetImage, scrollOffset, selectedAnimId, hoveredAnimId, animationFrame, getAnimations]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse move for hover tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = scrollOffset + Math.floor(y / ITEM_HEIGHT);
    const anims = getAnimations();
    if (idx >= 0 && idx < anims.length) {
      setHoveredAnimId(anims[idx].id);
    } else {
      setHoveredAnimId(null);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredAnimId(null);
  };

  // Handle click to select animation
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = scrollOffset + Math.floor(y / ITEM_HEIGHT);

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

    const anim = ANIMATION_DEFINITIONS[selectedAnimId];
    if (!anim || anim.frames.length === 0) return;

    // Create animated tile value: bit 15 set + frame offset + animation ID
    const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | selectedAnimId;
    setSelectedTile(animatedTile);
  };

  // Get count of defined animations
  const definedCount = getDefinedAnimations().length;

  const selectedAnim = selectedAnimId !== null ? ANIMATION_DEFINITIONS[selectedAnimId] : null;
  const canUseSelected = selectedAnim && selectedAnim.frames.length > 0;

  return (
    <div className="animation-panel">
      <div className="panel-header">
        Animations
        <button
          className="toggle-button"
          onClick={() => {
            setShowAllAnimations(!showAllAnimations);
            setScrollOffset(0);
          }}
          title={showAllAnimations ? 'Show defined only' : 'Show all 256'}
        >
          {showAllAnimations ? 'Defined' : 'All'}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="animation-canvas"
        width={120}
        height={VISIBLE_ANIMATIONS * ITEM_HEIGHT}
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {selectedAnimId !== null && (
        <div className="animation-controls">
          <div className="control-row">
            <label>Offset</label>
            <input
              type="range"
              min={0}
              max={127}
              value={frameOffset}
              onChange={(e) => setFrameOffset(parseInt(e.target.value))}
              className="offset-slider"
              disabled={!canUseSelected}
            />
            <span className="offset-value">{frameOffset}</span>
          </div>
          <button
            className="place-button"
            onClick={handlePlaceAnimation}
            disabled={!canUseSelected}
          >
            Use 0x{selectedAnimId.toString(16).toUpperCase().padStart(2, '0')}
          </button>
        </div>
      )}

      <div className="animation-info">
        {definedCount} defined / 256 total
      </div>
    </div>
  );
};
