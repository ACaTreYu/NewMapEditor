/**
 * AnimationPanel - SEdit-style animation panel for selecting and placing animated tiles
 * Narrow layout with hex labels, team selector, and placement mode toggle
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, ANIMATED_FLAG, ANIMATION_DEFINITIONS, AnimationDefinition } from '@core/map';
import './AnimationPanel.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
}

const TILES_PER_ROW = 40;
const ANIM_PREVIEW_SIZE = 16;
const HEX_LABEL_WIDTH = 24;
const ROW_HEIGHT = 20; // Compact rows
const PANEL_WIDTH = 128; // Match minimap canvas width

export const AnimationPanel: React.FC<Props> = ({ tilesetImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAnimId, setSelectedAnimId] = useState<number | null>(null);
  const [hoveredAnimId, setHoveredAnimId] = useState<number | null>(null);
  const [placementMode, setPlacementMode] = useState<'tile' | 'anim'>('tile');
  const [offsetError, setOffsetError] = useState(false);

  const animationFrame = useEditorStore((state) => state.animationFrame);
  const setSelectedTile = useEditorStore((state) => state.setSelectedTile);
  const animationOffsetInput = useEditorStore((state) => state.animationOffsetInput);
  const setAnimationOffsetInput = useEditorStore((state) => state.setAnimationOffsetInput);

  // Get animations list (always all 256)
  const getAnimations = useCallback((): AnimationDefinition[] => {
    return ANIMATION_DEFINITIONS;
  }, []);

  // Calculate canvas height based on total animations
  const canvasHeight = useMemo(() => {
    return getAnimations().length * ROW_HEIGHT;
  }, [getAnimations]);

  // Track whether static content (backgrounds, labels) has been drawn
  const staticDrawnRef = useRef(false);

  // Draw static content once (backgrounds, hex labels, empty placeholders, borders)
  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const anims = getAnimations();

    // Win98 gray background
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < anims.length; i++) {
      const anim = anims[i];
      const y = i * ROW_HEIGHT;
      const isSelected = selectedAnimId === anim.id;
      const isHovered = hoveredAnimId === anim.id;
      const hasFrames = anim.frames.length > 0;

      // Alternating row background
      ctx.fillStyle = i % 2 === 0 ? '#c0c0c0' : '#b8b8b8';
      ctx.fillRect(0, y, canvas.width, ROW_HEIGHT);

      if (isSelected) {
        ctx.fillStyle = '#000080';
        ctx.fillRect(0, y, canvas.width, ROW_HEIGHT);
      } else if (isHovered) {
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(0, y, canvas.width, ROW_HEIGHT);
      }

      // Hex label
      ctx.fillStyle = isSelected ? '#ffffff' : '#000000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(anim.id.toString(16).toUpperCase().padStart(2, '0'), 2, y + ROW_HEIGHT / 2);

      const previewX = HEX_LABEL_WIDTH;
      const previewY = y + (ROW_HEIGHT - ANIM_PREVIEW_SIZE) / 2;

      if (!hasFrames) {
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(previewX, previewY, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE);
        ctx.fillStyle = '#606060';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('-', previewX + ANIM_PREVIEW_SIZE / 2, previewY + ANIM_PREVIEW_SIZE / 2);
      }

      ctx.strokeStyle = isSelected ? '#ffffff' : '#808080';
      ctx.lineWidth = 1;
      ctx.strokeRect(previewX, previewY, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE);
    }

    staticDrawnRef.current = true;
  }, [tilesetImage, selectedAnimId, hoveredAnimId, getAnimations]);

  // Update only the animated preview tiles for visible rows
  const updateAnimatedPreviews = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const container = scrollContainerRef.current;
    if (!canvas || !ctx || !tilesetImage || !container) return;

    const anims = getAnimations();
    const scrollTop = container.scrollTop;
    const viewHeight = container.clientHeight;

    // Visible row range with small buffer
    const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
    const lastRow = Math.min(anims.length - 1, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + 2);

    for (let i = firstRow; i <= lastRow; i++) {
      const anim = anims[i];
      if (anim.frames.length === 0) continue;

      const previewX = HEX_LABEL_WIDTH;
      const previewY = i * ROW_HEIGHT + (ROW_HEIGHT - ANIM_PREVIEW_SIZE) / 2;

      const frameIdx = animationFrame % anim.frameCount;
      const tileId = anim.frames[frameIdx] || 0;
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

      // Clear just the preview area and redraw
      ctx.clearRect(previewX + 1, previewY + 1, ANIM_PREVIEW_SIZE - 2, ANIM_PREVIEW_SIZE - 2);
      ctx.drawImage(
        tilesetImage,
        srcX, srcY, TILE_SIZE, TILE_SIZE,
        previewX, previewY, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE
      );
    }
  }, [tilesetImage, animationFrame, getAnimations]);

  // Full redraw on selection/hover/tileset changes
  useEffect(() => {
    drawStatic();
    updateAnimatedPreviews();
  }, [drawStatic]);

  // Animation tick: only update visible preview tiles
  useEffect(() => {
    if (staticDrawnRef.current) {
      updateAnimatedPreviews();
    }
  }, [updateAnimatedPreviews]);

  // Handle mouse move for hover tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = Math.floor(y / ROW_HEIGHT);
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

  // Handle click to select animation - auto-switches to anim mode and selects for placement
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = Math.floor(y / ROW_HEIGHT);

    const anims = getAnimations();
    if (idx >= 0 && idx < anims.length) {
      const animId = anims[idx].id;
      setSelectedAnimId(animId);

      // Auto-switch to anim mode and select the animation for placement
      const anim = ANIMATION_DEFINITIONS[animId];
      if (anim && anim.frames.length > 0) {
        setPlacementMode('anim');
        const animatedTile = ANIMATED_FLAG | (animationOffsetInput << 8) | animId;
        setSelectedTile(animatedTile);
      }
    }
  };

  // Handle double click to immediately use animation
  const handleDoubleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const idx = Math.floor(y / ROW_HEIGHT);

    const anims = getAnimations();
    if (idx >= 0 && idx < anims.length) {
      const animId = anims[idx].id;
      const anim = ANIMATION_DEFINITIONS[animId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = ANIMATED_FLAG | (animationOffsetInput << 8) | animId;
        setSelectedTile(animatedTile);
        setPlacementMode('anim');
      }
    }
  };

  // Handle frame offset change
  const handleOffsetChange = (value: string) => {
    const num = parseInt(value, 10);
    if (value === '' || isNaN(num) || num < 0 || num > 127) {
      setOffsetError(true);
      return;
    }
    setOffsetError(false);
    setAnimationOffsetInput(num);
    // Update the selected tile if in anim mode
    if (placementMode === 'anim' && selectedAnimId !== null) {
      const anim = ANIMATION_DEFINITIONS[selectedAnimId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = ANIMATED_FLAG | (num << 8) | selectedAnimId;
        setSelectedTile(animatedTile);
      }
    }
  };

  // Handle placement mode change
  const handleModeChange = (mode: 'tile' | 'anim') => {
    setPlacementMode(mode);
    if (mode === 'anim' && selectedAnimId !== null) {
      const anim = ANIMATION_DEFINITIONS[selectedAnimId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = ANIMATED_FLAG | (animationOffsetInput << 8) | selectedAnimId;
        setSelectedTile(animatedTile);
      }
    }
  };

  const canvasWidth = PANEL_WIDTH;

  return (
    <div className="animation-panel">
      {/* Header */}
      <div className="panel-header" />

      {/* Animation list canvas in scrollable container */}
      <div className="animation-list-container" ref={scrollContainerRef}>
        <canvas
          ref={canvasRef}
          className="animation-canvas"
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Bottom controls */}
      <div className="anim-controls">
        {/* Tile/Anim radio toggle */}
        <div className="mode-toggle">
          <label className="mode-option">
            <input
              type="radio"
              name="placementMode"
              checked={placementMode === 'tile'}
              onChange={() => handleModeChange('tile')}
            />
            <span>Tile</span>
          </label>
          <label className="mode-option">
            <input
              type="radio"
              name="placementMode"
              checked={placementMode === 'anim'}
              onChange={() => handleModeChange('anim')}
            />
            <span>Anim</span>
          </label>
        </div>

        {/* Offset input */}
        <div className="offset-row">
          <label>Offset:</label>
          <input
            type="text"
            className={`offset-input ${offsetError ? 'error' : ''}`}
            value={animationOffsetInput}
            onChange={(e) => handleOffsetChange(e.target.value)}
            disabled={placementMode !== 'anim'}
            title="Frame offset (0-127)"
          />
        </div>

        {/* Team selector hidden - using GameObjectToolPanel's instead (shared Zustand state) */}

      </div>
    </div>
  );
};
