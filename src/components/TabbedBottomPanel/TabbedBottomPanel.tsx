/**
 * TabbedBottomPanel - Tabbed panel with Tiles, Animations, and Settings
 */

import React, { useState, useCallback } from 'react';
import { PanelImperativeHandle } from 'react-resizable-panels';
import { TilePalette } from '../TilePalette';
import { AnimationPanel } from '../AnimationPanel';
import { MapSettingsPanel } from '../MapSettingsPanel';
import './TabbedBottomPanel.css';

interface TabbedBottomPanelProps {
  tilesetImage: HTMLImageElement | null;
  panelRef: React.RefObject<PanelImperativeHandle>;
}

type TabId = 'tiles' | 'animations' | 'settings';

export const TabbedBottomPanel: React.FC<TabbedBottomPanelProps> = ({ tilesetImage, panelRef }) => {
  const [activeTab, setActiveTab] = useState<TabId>('tiles');

  const handleTabClick = useCallback((tabId: TabId) => {
    // If panel is collapsed, expand it first
    if (panelRef.current?.isCollapsed()) {
      panelRef.current.expand();
    }
    setActiveTab(tabId);
  }, [panelRef]);

  return (
    <div className="tabbed-bottom-panel">
      <div className="tab-bar" role="tablist">
        <button
          className={`tab ${activeTab === 'tiles' ? 'active' : ''}`}
          onClick={() => handleTabClick('tiles')}
          role="tab"
          aria-selected={activeTab === 'tiles'}
          aria-controls="tiles-panel"
        >
          <span className="tab-icon">▦</span>
          <span>Tiles</span>
        </button>
        <button
          className={`tab ${activeTab === 'animations' ? 'active' : ''}`}
          onClick={() => handleTabClick('animations')}
          role="tab"
          aria-selected={activeTab === 'animations'}
          aria-controls="animations-panel"
        >
          <span className="tab-icon">▶</span>
          <span>Animations</span>
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabClick('settings')}
          role="tab"
          aria-selected={activeTab === 'settings'}
          aria-controls="settings-panel"
        >
          <span className="tab-icon">⚙</span>
          <span>Settings</span>
        </button>
      </div>

      <div
        id="tiles-panel"
        className="tab-content"
        role="tabpanel"
        hidden={activeTab !== 'tiles'}
      >
        <TilePalette tilesetImage={tilesetImage} showRowLabels />
      </div>

      <div
        id="animations-panel"
        className="tab-content"
        role="tabpanel"
        hidden={activeTab !== 'animations'}
      >
        <AnimationPanel tilesetImage={tilesetImage} />
      </div>

      <div
        id="settings-panel"
        className="tab-content"
        role="tabpanel"
        hidden={activeTab !== 'settings'}
      >
        <MapSettingsPanel />
      </div>
    </div>
  );
};
