/**
 * AnimationPanel - SEdit-style animation panel for selecting and placing animated tiles
 * Narrow layout with hex labels, team selector, and placement mode toggle
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@core/editor';
import { TILE_SIZE, ANIMATED_FLAG, ANIMATION_DEFINITIONS, getDefinedAnimations, AnimationDefinition } from '@core/map';
import { TeamSelector } from '../TeamSelector/TeamSelector';
import { MapSettingsDialogHandle } from '../MapSettingsDialog/MapSettingsDialog';
import './AnimationPanel.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  settingsDialogRef?: React.RefObject<MapSettingsDialogHandle>;
}

const TILES_PER_ROW = 40;
const ANIM_PREVIEW_SIZE = 16;
const HEX_LABEL_WIDTH = 24;
const ROW_HEIGHT = 20; // Compact rows
const VISIBLE_ANIMATIONS = 16; // Fit more in narrow panel
const FRAME_DURATION = 150; // ms per frame
const PANEL_WIDTH = 70; // Narrow SEdit-style width

export const AnimationPanel: React.FC<Props> = ({ tilesetImage, settingsDialogRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedAnimId, setSelectedAnimId] = useState<number | null>(null);
  const [frameOffset, setFrameOffset] = useState(0);
  const [showAllAnimations, setShowAllAnimations] = useState(true); // Default to show all 256
  const [hoveredAnimId, setHoveredAnimId] = useState<number | null>(null);
  const [placementMode, setPlacementMode] = useState<'tile' | 'anim'>('tile');

  const animationFrame = useEditorStore((state) => state.animationFrame);
  const setSelectedTile = useEditorStore((state) => state.setSelectedTile);
  const advanceAnimationFrame = useEditorStore((state) => state.advanceAnimationFrame);
  const selectedTeam = useEditorStore((state) => state.gameObjectToolState.selectedTeam);
  const setGameObjectTeam = useEditorStore((state) => state.setGameObjectTeam);
  const map = useEditorStore((state) => state.map);

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

  // Draw animation previews - SEdit style with always-visible hex labels
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Win98 gray background
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const anims = getAnimations();
    const startIdx = scrollOffset;
    const endIdx = Math.min(startIdx + VISIBLE_ANIMATIONS, anims.length);

    for (let i = startIdx; i < endIdx; i++) {
      const anim = anims[i];
      const y = (i - startIdx) * ROW_HEIGHT;
      const isSelected = selectedAnimId === anim.id;
      const isHovered = hoveredAnimId === anim.id;
      const hasFrames = anim.frames.length > 0;

      // Alternating row background (subtle)
      ctx.fillStyle = i % 2 === 0 ? '#c0c0c0' : '#b8b8b8';
      ctx.fillRect(0, y, canvas.width, ROW_HEIGHT);

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = '#000080';
        ctx.fillRect(0, y, canvas.width, ROW_HEIGHT);
      } else if (isHovered) {
        ctx.fillStyle = '#a0a0a0';
        ctx.fillRect(0, y, canvas.width, ROW_HEIGHT);
      }

      // Hex label (always visible) - left side
      ctx.fillStyle = isSelected ? '#ffffff' : '#000000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        anim.id.toString(16).toUpperCase().padStart(2, '0'),
        2,
        y + ROW_HEIGHT / 2
      );

      // Draw current frame at 16x16 - right side
      const previewX = HEX_LABEL_WIDTH;
      const previewY = y + (ROW_HEIGHT - ANIM_PREVIEW_SIZE) / 2;

      if (tilesetImage && hasFrames) {
        const frameIdx = animationFrame % anim.frameCount;
        const tileId = anim.frames[frameIdx] || 0;
        const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
        const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

        ctx.drawImage(
          tilesetImage,
          srcX, srcY, TILE_SIZE, TILE_SIZE,
          previewX, previewY, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE
        );
      } else {
        // Placeholder for undefined/empty animations
        ctx.fillStyle = hasFrames ? '#808080' : '#a0a0a0';
        ctx.fillRect(previewX, previewY, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE);
        if (!hasFrames) {
          ctx.fillStyle = '#606060';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('-', previewX + ANIM_PREVIEW_SIZE / 2, previewY + ANIM_PREVIEW_SIZE / 2);
        }
      }

      // Frame border
      ctx.strokeStyle = isSelected ? '#ffffff' : '#808080';
      ctx.lineWidth = 1;
      ctx.strokeRect(previewX, previewY, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE);
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
    const idx = scrollOffset + Math.floor(y / ROW_HEIGHT);
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
    const idx = scrollOffset + Math.floor(y / ROW_HEIGHT);

    const anims = getAnimations();
    if (idx >= 0 && idx < anims.length) {
      const animId = anims[idx].id;
      setSelectedAnimId(animId);

      // Auto-switch to anim mode and select the animation for placement
      const anim = ANIMATION_DEFINITIONS[animId];
      if (anim && anim.frames.length > 0) {
        setPlacementMode('anim');
        const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | animId;
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
    const idx = scrollOffset + Math.floor(y / ROW_HEIGHT);

    const anims = getAnimations();
    if (idx >= 0 && idx < anims.length) {
      const animId = anims[idx].id;
      const anim = ANIMATION_DEFINITIONS[animId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | animId;
        setSelectedTile(animatedTile);
        setPlacementMode('anim');
      }
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

  // Handle frame offset change
  const handleOffsetChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 127) {
      setFrameOffset(num);
      // Update the selected tile if in anim mode
      if (placementMode === 'anim' && selectedAnimId !== null) {
        const anim = ANIMATION_DEFINITIONS[selectedAnimId];
        if (anim && anim.frames.length > 0) {
          const animatedTile = ANIMATED_FLAG | (num << 8) | selectedAnimId;
          setSelectedTile(animatedTile);
        }
      }
    }
  };

  // Handle placement mode change
  const handleModeChange = (mode: 'tile' | 'anim') => {
    setPlacementMode(mode);
    if (mode === 'anim' && selectedAnimId !== null) {
      const anim = ANIMATION_DEFINITIONS[selectedAnimId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | selectedAnimId;
        setSelectedTile(animatedTile);
      }
    }
  };

  // Open settings dialog
  const openSettings = () => {
    settingsDialogRef?.current?.open();
  };

  const canvasWidth = PANEL_WIDTH;
  const canvasHeight = VISIBLE_ANIMATIONS * ROW_HEIGHT;

  return (
    <div className="animation-panel">
      {/* Header with toggle button */}
      <div className="panel-header">
        <span>Anim</span>
        <button
          className="toggle-btn"
          onClick={() => {
            setShowAllAnimations(!showAllAnimations);
            setScrollOffset(0);
          }}
          title={showAllAnimations ? 'Show defined only' : 'Show all 256'}
        >
          {showAllAnimations ? '256' : 'Def'}
        </button>
      </div>

      {/* Animation list canvas */}
      <canvas
        ref={canvasRef}
        className="animation-canvas"
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

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
            className="offset-input"
            value={frameOffset}
            onChange={(e) => handleOffsetChange(e.target.value)}
            disabled={placementMode !== 'anim'}
            title="Frame offset (0-127)"
          />
        </div>

        {/* Team selector */}
        <TeamSelector
          selectedTeam={selectedTeam}
          onTeamChange={setGameObjectTeam}
          allowNeutral={true}
        />

        {/* Settings button */}
        <button
          className="settings-btn"
          onClick={openSettings}
          disabled={!map}
          title="Map Settings"
        >
          Settings
        </button>
      </div>
    </div>
  );
};
