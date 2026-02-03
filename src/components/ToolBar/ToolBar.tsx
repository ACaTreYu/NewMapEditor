/**
 * ToolBar component - Tool selection and actions
 */

import React, { useRef } from 'react';
import { useEditorStore } from '@core/editor';
import { ToolType } from '@core/map';
import { useTheme, Theme } from '../../hooks/useTheme';
import { MapSettingsDialog, MapSettingsDialogHandle } from '../MapSettingsDialog/MapSettingsDialog';
import './ToolBar.css';

interface ToolButton {
  tool: ToolType;
  label: string;
  icon: string;
  shortcut: string;
}

const tools: ToolButton[] = [
  { tool: ToolType.SELECT, label: 'Select', icon: '⬚', shortcut: 'V' },
  { tool: ToolType.PENCIL, label: 'Pencil', icon: '✏', shortcut: 'B' },
  { tool: ToolType.FILL, label: 'Fill', icon: '🪣', shortcut: 'G' },
  { tool: ToolType.LINE, label: 'Line', icon: '╱', shortcut: 'L' },
  { tool: ToolType.RECT, label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { tool: ToolType.WALL, label: 'Wall', icon: '▦', shortcut: 'W' },
  { tool: ToolType.ERASER, label: 'Eraser', icon: '⌫', shortcut: 'E' },
  { tool: ToolType.PICKER, label: 'Picker', icon: '💉', shortcut: 'I' }
];

interface Props {
  onNewMap: () => void;
  onOpenMap: () => void;
  onSaveMap: () => void;
}

export const ToolBar: React.FC<Props> = ({
  onNewMap,
  onOpenMap,
  onSaveMap
}) => {
  const {
    currentTool,
    setTool,
    showGrid,
    toggleGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    map
  } = useEditorStore();

  const { theme, setTheme } = useTheme();
  const settingsDialogRef = useRef<MapSettingsDialogHandle>(null);

  const cycleTheme = () => {
    const order: Theme[] = ['system', 'light', 'dark'];
    const current = order.indexOf(theme);
    const next = (current + 1) % order.length;
    setTheme(order[next]);
  };

  const openSettings = () => {
    settingsDialogRef.current?.open();
  };

  const themeIcons: Record<Theme, string> = { system: 'S', light: 'L', dark: 'D' };
  const themeLabels: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            onNewMap();
            break;
          case 'o':
            e.preventDefault();
            onOpenMap();
            break;
          case 's':
            e.preventDefault();
            onSaveMap();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
        return;
      }

      // Tool shortcuts
      const tool = tools.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (tool) {
        setTool(tool.tool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, onNewMap, onOpenMap, onSaveMap]);

  return (
    <>
      <div className="toolbar">
        <button className="toolbar-button" onClick={onNewMap} title="New Map (Ctrl+N)">
          <span className="toolbar-icon">📄</span>
          <span className="toolbar-label">New</span>
        </button>
      <button className="toolbar-button" onClick={onOpenMap} title="Open Map (Ctrl+O)">
        <span className="toolbar-icon">📂</span>
        <span className="toolbar-label">Open</span>
      </button>
      <button
        className="toolbar-button"
        onClick={onSaveMap}
        disabled={!map}
        title="Save Map (Ctrl+S)"
      >
        <span className="toolbar-icon">💾</span>
        <span className="toolbar-label">Save</span>
      </button>

      <button
        className="toolbar-button"
        onClick={undo}
        disabled={!canUndo()}
        title="Undo (Ctrl+Z)"
      >
        <span className="toolbar-icon">↩</span>
        <span className="toolbar-label">Undo</span>
      </button>
      <button
        className="toolbar-button"
        onClick={redo}
        disabled={!canRedo()}
        title="Redo (Ctrl+Y)"
      >
        <span className="toolbar-icon">↪</span>
        <span className="toolbar-label">Redo</span>
      </button>

      {tools.map((tool) => (
        <button
          key={tool.tool}
          className={`toolbar-button ${currentTool === tool.tool ? 'active' : ''}`}
          onClick={() => setTool(tool.tool)}
          title={`${tool.label} (${tool.shortcut})`}
        >
          <span className="toolbar-icon">{tool.icon}</span>
          <span className="toolbar-label">{tool.label}</span>
        </button>
      ))}

      <button
        className={`toolbar-button ${showGrid ? 'active' : ''}`}
        onClick={toggleGrid}
        title="Toggle Grid"
      >
        <span className="toolbar-icon">#</span>
        <span className="toolbar-label">Grid</span>
      </button>

      <button
        className="toolbar-button"
        onClick={openSettings}
        disabled={!map}
        title="Map Settings"
      >
        <span className="toolbar-icon">⚙</span>
        <span className="toolbar-label">Settings</span>
      </button>

      <button
        className="toolbar-button"
        onClick={cycleTheme}
        title={`Theme: ${themeLabels[theme]} (click to cycle)`}
      >
        <span className="toolbar-icon">{themeIcons[theme]}</span>
        <span className="toolbar-label">{themeLabels[theme]}</span>
      </button>

      <div className="toolbar-spacer" />

      <div className="toolbar-info">
        {map && (
          <span className="map-name">
            {map.header.name || 'Untitled'}
            {map.modified && ' *'}
          </span>
        )}
      </div>
      </div>
      <MapSettingsDialog ref={settingsDialogRef} />
    </>
  );
};
