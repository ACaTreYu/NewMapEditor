/**
 * RightSidebar - Stacked sidebar with animation preview, tile palette, and settings
 * Matches SEDIT v2 classic layout
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { ToolType } from '@core/map';
import { formatMeasurement } from '@/utils/measurementFormatter';
import { AnimationPreview } from '../AnimationPreview';
import { TilePalette } from '../TilePalette';
import { MapSettingsPanel } from '../MapSettingsPanel';
import './RightSidebar.css';

interface RightSidebarProps {
  tilesetImage: HTMLImageElement | null;
}

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
