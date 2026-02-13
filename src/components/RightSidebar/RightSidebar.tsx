/**
 * RightSidebar - Stacked sidebar with animation preview, tile palette, and settings
 * Matches SEDIT v2 classic layout
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { RulerMode } from '@core/editor/slices/globalSlice';
import { ToolType } from '@core/map';
import { AnimationPreview } from '../AnimationPreview';
import { TilePalette } from '../TilePalette';
import { MapSettingsPanel } from '../MapSettingsPanel';
import './RightSidebar.css';

interface RightSidebarProps {
  tilesetImage: HTMLImageElement | null;
}

const formatMeasurement = (m: NonNullable<ReturnType<typeof useEditorStore.getState>['rulerMeasurement']>): string => {
  if (m.mode === RulerMode.LINE) {
    const dx = Math.abs(m.endX - m.startX);
    const dy = Math.abs(m.endY - m.startY);
    return `Line: ${dx}×${dy} (${dx + dy} tiles, ${Math.hypot(dx, dy).toFixed(1)} dist)`;
  } else if (m.mode === RulerMode.RECTANGLE) {
    const w = Math.abs(m.endX - m.startX) + 1;
    const h = Math.abs(m.endY - m.startY) + 1;
    return `Rect: ${w}×${h} (${w * h} tiles)`;
  } else if (m.mode === RulerMode.PATH) {
    return `Path: ${m.waypoints?.length ?? 0} pts (${(m.totalDistance ?? 0).toFixed(1)} dist)`;
  } else if (m.mode === RulerMode.RADIUS) {
    return `Radius: ${(m.radius ?? 0).toFixed(1)} (${(m.area ?? 0).toFixed(0)} area)`;
  }
  return '';
};

export const RightSidebar: React.FC<RightSidebarProps> = ({ tilesetImage }) => {
  const currentTool = useEditorStore(state => state.currentTool);
  const rulerMeasurement = useEditorStore(state => state.rulerMeasurement);

  const showNotepad = currentTool === ToolType.RULER;

  return (
    <div className="right-sidebar">
      <div className="sidebar-section animation-section">
        <AnimationPreview tilesetImage={tilesetImage} />
      </div>
      <div className="sidebar-section tiles-section">
        <TilePalette tilesetImage={tilesetImage} compact showRowLabels />
      </div>
      {showNotepad && (
        <div className="sidebar-section ruler-notepad-section">
          <div className="ruler-notepad">
            <div className="ruler-notepad-header">Ruler</div>
            {rulerMeasurement ? (
              <div className="ruler-notepad-value">
                {formatMeasurement(rulerMeasurement)}
              </div>
            ) : (
              <div className="ruler-notepad-hint">
                Click or drag to measure
              </div>
            )}
            <div className="ruler-notepad-coords">
              {rulerMeasurement && (
                <>({rulerMeasurement.startX}, {rulerMeasurement.startY}) → ({rulerMeasurement.endX}, {rulerMeasurement.endY})</>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="sidebar-section settings-section">
        <MapSettingsPanel compact />
      </div>
    </div>
  );
};
