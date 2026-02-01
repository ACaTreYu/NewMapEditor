/**
 * TabbedBottomPanel - Tabbed container for tile palette, animations, and settings
 * Implements ARIA-compliant tabs with keyboard navigation
 */

import React, { useState, useRef, useCallback } from 'react';
import { TilePalette } from '../TilePalette';
import { AnimationPanel } from '../AnimationPanel';
import { MapSettingsPanel } from '../MapSettingsPanel';
import './TabbedBottomPanel.css';

interface TabbedBottomPanelProps {
  tilesetImage: HTMLImageElement | null;
}

type TabId = 'tiles' | 'animations' | 'settings';

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'tiles', label: 'Tiles', icon: '\u25A6' },        // Grid/squares icon
  { id: 'animations', label: 'Animations', icon: '\u25B6' }, // Play icon
  { id: 'settings', label: 'Settings', icon: '\u2699' }   // Gear icon
];

export const TabbedBottomPanel: React.FC<TabbedBottomPanelProps> = ({ tilesetImage }) => {
  const [activeTab, setActiveTab] = useState<TabId>('tiles');
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const setTabRef = useCallback((id: TabId, element: HTMLButtonElement | null) => {
    if (element) {
      tabRefs.current.set(id, element);
    } else {
      tabRefs.current.delete(id);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    let newIndex: number | null = null;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
    }

    if (newIndex !== null) {
      const newTab = tabs[newIndex];
      setActiveTab(newTab.id);
      // Focus the new tab
      const tabElement = tabRefs.current.get(newTab.id);
      tabElement?.focus();
    }
  }, [activeTab]);

  const handleTabClick = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="tabbed-bottom-panel">
      <div
        className="tab-bar"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            ref={(el) => setTabRef(tab.id, el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div
          role="tabpanel"
          id="panel-tiles"
          aria-labelledby="tab-tiles"
          className="tab-panel"
          hidden={activeTab !== 'tiles'}
        >
          <TilePalette tilesetImage={tilesetImage} />
        </div>

        <div
          role="tabpanel"
          id="panel-animations"
          aria-labelledby="tab-animations"
          className="tab-panel"
          hidden={activeTab !== 'animations'}
        >
          <AnimationPanel tilesetImage={tilesetImage} />
        </div>

        <div
          role="tabpanel"
          id="panel-settings"
          aria-labelledby="tab-settings"
          className="tab-panel"
          hidden={activeTab !== 'settings'}
        >
          <MapSettingsPanel />
        </div>
      </div>
    </div>
  );
};
