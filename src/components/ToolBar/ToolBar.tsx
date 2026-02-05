/**
 * ToolBar component - Tool selection and actions
 */

import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '@core/editor';
import { ToolType } from '@core/map';
import { useTheme, Win98Scheme } from '../../hooks/useTheme';
import { MapSettingsDialog, MapSettingsDialogHandle } from '../MapSettingsDialog/MapSettingsDialog';
import { switchData } from '@core/map/GameObjectData';
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

const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: '\u{1F6A9}', shortcut: 'F' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: '\u26F3', shortcut: 'P' },
  { tool: ToolType.WARP, label: 'Warp', icon: '\u25CE', shortcut: 'T' },
  { tool: ToolType.SPAWN, label: 'Spawn', icon: '⭐', shortcut: 'S' },
  { tool: ToolType.SWITCH, label: 'Switch', icon: '🔘', shortcut: 'H' },
];

const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: '\u229E', shortcut: 'K' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: '\u229F', shortcut: 'N' },
  { tool: ToolType.BRIDGE, label: 'Bridge', icon: '🌉', shortcut: 'J' },
  { tool: ToolType.CONVEYOR, label: 'Conv', icon: '\u21C4', shortcut: 'C' },
];

const wallDrawTools: ToolButton[] = [
  { tool: ToolType.WALL_PENCIL, label: 'W.Draw', icon: '\u270E', shortcut: 'Q' },
  { tool: ToolType.WALL_RECT, label: 'W.Rect', icon: '\u25A1', shortcut: 'A' },
];

const allToolsWithShortcuts = [...tools, ...gameObjectStampTools, ...gameObjectRectTools, ...wallDrawTools];

// Tool variant configuration
interface ToolVariant {
  label: string;
  value: number;
  value2?: number; // For bunker style
}

interface ToolVariantConfig {
  tool: ToolType;
  settingName: string;
  variants: ToolVariant[];
  getCurrentValue: () => number;
  setter: (v: number, v2?: number) => void;
}

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
    map,
    gameObjectToolState,
    setSpawnType,
    setSwitchType,
    setBunkerSettings,
    setHoldingPenType,
    setBridgeDirection,
    setConveyorDirection,
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection
  } = useEditorStore();

  const { scheme, setScheme } = useTheme();
  const settingsDialogRef = useRef<MapSettingsDialogHandle>(null);
  const [openDropdown, setOpenDropdown] = useState<ToolType | null>(null);

  const cycleTheme = () => {
    const order: Win98Scheme[] = ['standard', 'high-contrast', 'desert'];
    const current = order.indexOf(scheme);
    const next = (current + 1) % order.length;
    setScheme(order[next]);
  };

  const openSettings = () => {
    settingsDialogRef.current?.open();
  };

  const themeIcons: Record<Win98Scheme, string> = { standard: 'W', 'high-contrast': 'H', desert: 'D' };
  const themeLabels: Record<Win98Scheme, string> = { standard: 'Win98', 'high-contrast': 'Hi-Con', desert: 'Desert' };

  // Build variant configurations
  const variantConfigs: ToolVariantConfig[] = [
    {
      tool: ToolType.SPAWN,
      settingName: 'Type',
      getCurrentValue: () => gameObjectToolState.spawnType,
      variants: [
        { label: 'Type 1', value: 0 },
        { label: 'Type 2', value: 1 },
        { label: 'Type 3', value: 2 },
      ],
      setter: setSpawnType
    },
    {
      tool: ToolType.SWITCH,
      settingName: 'Type',
      getCurrentValue: () => gameObjectToolState.switchType,
      variants: switchData.length > 0
        ? switchData.map((_, i) => ({ label: `Switch ${i + 1}`, value: i }))
        : [{ label: 'No data', value: 0 }],
      setter: setSwitchType
    },
    {
      tool: ToolType.BUNKER,
      settingName: 'Direction',
      getCurrentValue: () => gameObjectToolState.bunkerDir,
      variants: [
        { label: 'North', value: 0 },
        { label: 'East', value: 1 },
        { label: 'South', value: 2 },
        { label: 'West', value: 3 },
      ],
      setter: (dir) => setBunkerSettings(dir, gameObjectToolState.bunkerStyle)
    },
    {
      tool: ToolType.HOLDING_PEN,
      settingName: 'Type',
      getCurrentValue: () => gameObjectToolState.holdingPenType,
      variants: [
        { label: 'Static', value: 0 },
        { label: 'Animated', value: 1 },
      ],
      setter: setHoldingPenType
    },
    {
      tool: ToolType.BRIDGE,
      settingName: 'Direction',
      getCurrentValue: () => gameObjectToolState.bridgeDir,
      variants: [
        { label: 'Horizontal', value: 0 },
        { label: 'Vertical', value: 1 },
      ],
      setter: setBridgeDirection
    },
    {
      tool: ToolType.CONVEYOR,
      settingName: 'Direction',
      getCurrentValue: () => gameObjectToolState.conveyorDir,
      variants: [
        { label: 'Horizontal', value: 0 },
        { label: 'Vertical', value: 1 },
      ],
      setter: setConveyorDirection
    },
  ];

  const variantToolsSet = new Set(variantConfigs.map(c => c.tool));

  // Handle tool button click with variant dropdown support
  const handleToolClick = (tool: ToolType) => {
    if (variantToolsSet.has(tool)) {
      if (currentTool === tool) {
        // Toggle dropdown for already-active tool
        setOpenDropdown(openDropdown === tool ? null : tool);
      } else {
        // Switch to this tool and open its dropdown
        setTool(tool);
        setOpenDropdown(tool);
      }
    } else {
      setTool(tool);
      setOpenDropdown(null);
    }
  };

  // Handle variant selection
  const handleVariantSelect = (tool: ToolType, value: number, value2?: number) => {
    const config = variantConfigs.find(c => c.tool === tool);
    if (config) {
      config.setter(value, value2);
      setTool(tool); // Ensure tool is active
      setOpenDropdown(null); // Close dropdown
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.toolbar-button-wrapper')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

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
          case 'c':
            e.preventDefault();
            copySelection();
            break;
          case 'x':
            e.preventDefault();
            cutSelection();
            break;
          case 'v':
            e.preventDefault();
            pasteClipboard();
            break;
          case 'd':
            e.preventDefault();
            deleteSelection();
            break;
          case 'insert':
            e.preventDefault();
            copySelection();
            break;
        }
        return;
      }

      // Delete key (no modifier) - delete selection contents
      if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelection();
        return;
      }

      // Tool shortcuts
      const tool = allToolsWithShortcuts.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (tool) {
        setTool(tool.tool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, onNewMap, onOpenMap, onSaveMap, copySelection, cutSelection, pasteClipboard, deleteSelection]);

  // Render a tool button with optional variant dropdown
  const renderToolButton = (tool: ToolButton) => {
    const hasVariants = variantToolsSet.has(tool.tool);
    const config = variantConfigs.find(c => c.tool === tool.tool);
    const isActive = currentTool === tool.tool;
    const showDropdown = openDropdown === tool.tool;

    const button = (
      <button
        key={tool.tool}
        className={`toolbar-button ${isActive ? 'active' : ''} ${hasVariants ? 'has-variants' : ''}`}
        onClick={() => handleToolClick(tool.tool)}
        title={`${tool.label} (${tool.shortcut})`}
      >
        <span className="toolbar-icon">{tool.icon}</span>
        <span className="toolbar-label">{tool.label}</span>
      </button>
    );

    if (!hasVariants || !config) {
      return button;
    }

    // Wrap with dropdown if it has variants
    return (
      <div key={tool.tool} className="toolbar-button-wrapper">
        {button}
        {showDropdown && (
          <div className="toolbar-dropdown">
            {config.variants.map(v => {
              const isSelected = config.getCurrentValue() === v.value;
              return (
                <button
                  key={v.value}
                  className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVariantSelect(tool.tool, v.value, v.value2);
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="toolbar">
        {/* Group 1: File operations */}
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

        <div className="toolbar-separator" />

        {/* Group 2: Undo/Redo */}
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

        <div className="toolbar-separator" />

        {/* Group 3: All tool buttons */}
        {tools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Group 4: Game object stamp tools */}
        {gameObjectStampTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Group 5: Game object rect tools */}
        {gameObjectRectTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Group 6: Wall draw tools */}
        {wallDrawTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Group 7: Grid, Settings, Theme */}
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
          title={`Theme: ${themeLabels[scheme]} (click to cycle)`}
        >
          <span className="toolbar-icon">{themeIcons[scheme]}</span>
          <span className="toolbar-label">{themeLabels[scheme]}</span>
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
