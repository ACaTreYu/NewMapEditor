/**
 * RightSidebar - Stacked sidebar with animation preview, tile palette, and settings
 * Matches SEDIT v2 classic layout
 */

import React from 'react';
import { AnimationPreview } from '../AnimationPreview';
import { TilePalette } from '../TilePalette';
import { MapSettingsPanel } from '../MapSettingsPanel';
import './RightSidebar.css';

interface RightSidebarProps {
  tilesetImage: HTMLImageElement | null;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ tilesetImage }) => {
  return (
    <div className="right-sidebar">
      <div className="sidebar-section animation-section">
        <AnimationPreview tilesetImage={tilesetImage} />
      </div>
      <div className="sidebar-section tiles-section">
        <TilePalette tilesetImage={tilesetImage} compact showRowLabels />
      </div>
      <div className="sidebar-section settings-section">
        <MapSettingsPanel compact />
      </div>
    </div>
  );
};
