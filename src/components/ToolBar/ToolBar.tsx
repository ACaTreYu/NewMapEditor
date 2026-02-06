/**
 * ToolBar component - Tool selection and actions with bitmap icons
 */

import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ToolType } from '@core/map';
import { useTheme, Win98Scheme } from '../../hooks/useTheme';
import { MapSettingsDialog, MapSettingsDialogHandle } from '../MapSettingsDialog/MapSettingsDialog';
import { switchData } from '@core/map/GameObjectData';
import './ToolBar.css';

// Icon paths - Vite will resolve these at build time
const iconBase = '/assets/toolbar/';

interface ToolButton {
  tool: ToolType;
  label: string;
  icon: string;
  shortcut: string;
}

const tools: ToolButton[] = [
  { tool: ToolType.SELECT, label: 'Select', icon: 'select', shortcut: 'V' },
  { tool: ToolType.PENCIL, label: 'Pencil', icon: 'pencil', shortcut: 'B' },
  { tool: ToolType.FILL, label: 'Fill', icon: 'fill', shortcut: 'G' },
  { tool: ToolType.LINE, label: 'Line', icon: 'line', shortcut: 'L' },
  { tool: ToolType.RECT, label: 'Rectangle', icon: 'rect', shortcut: 'R' },
  { tool: ToolType.WALL, label: 'Wall', icon: 'wall', shortcut: 'W' },
  { tool: ToolType.ERASER, label: 'Eraser', icon: 'eraser', shortcut: 'E' },
  { tool: ToolType.PICKER, label: 'Picker', icon: 'picker', shortcut: 'I' }
];

const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: 'flag', shortcut: 'F' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: 'pole', shortcut: 'P' },
  { tool: ToolType.WARP, label: 'Warp', icon: 'warp', shortcut: 'T' },
  { tool: ToolType.SPAWN, label: 'Spawn', icon: 'spawn', shortcut: 'S' },
  { tool: ToolType.SWITCH, label: 'Switch', icon: 'switch', shortcut: 'H' },
];

const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: 'bunker', shortcut: 'K' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: 'holding', shortcut: 'N' },
  { tool: ToolType.BRIDGE, label: 'Bridge', icon: 'bridge', shortcut: 'J' },
  { tool: ToolType.CONVEYOR, label: 'Conv', icon: 'conveyor', shortcut: 'C' },
];

const wallDrawTools: ToolButton[] = [
  { tool: ToolType.WALL_PENCIL, label: 'W.Draw', icon: 'wallpencil', shortcut: 'Q' },
  { tool: ToolType.WALL_RECT, label: 'W.Rect', icon: 'wallrect', shortcut: 'A' },
];

const allToolsWithShortcuts = [...tools, ...gameObjectStampTools, ...gameObjectRectTools, ...wallDrawTools];

// Tool variant configuration
interface ToolVariant {
  label: string;
  value: number;
  value2?: number;
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
  const { currentTool, showGrid, map, gameObjectToolState } = useEditorStore(
    useShallow((state) => ({
      currentTool: state.currentTool,
      showGrid: state.showGrid,
      map: state.map,
      gameObjectToolState: state.gameObjectToolState
    }))
  );

  const canUndo = useEditorStore((state) => state.undoStack.length > 0);
  const canRedo = useEditorStore((state) => state.redoStack.length > 0);

  const setTool = useEditorStore((state) => state.setTool);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const setSpawnType = useEditorStore((state) => state.setSpawnType);
  const setSwitchType = useEditorStore((state) => state.setSwitchType);
  const setBunkerSettings = useEditorStore((state) => state.setBunkerSettings);
  const setHoldingPenType = useEditorStore((state) => state.setHoldingPenType);
  const setBridgeDirection = useEditorStore((state) => state.setBridgeDirection);
  const setConveyorDirection = useEditorStore((state) => state.setConveyorDirection);
  const copySelection = useEditorStore((state) => state.copySelection);
  const cutSelection = useEditorStore((state) => state.cutSelection);
  const startPasting = useEditorStore((state) => state.startPasting);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);

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

  const handleToolClick = (tool: ToolType) => {
    if (variantToolsSet.has(tool)) {
      if (currentTool === tool) {
        setOpenDropdown(openDropdown === tool ? null : tool);
      } else {
        setTool(tool);
        setOpenDropdown(tool);
      }
    } else {
      setTool(tool);
      setOpenDropdown(null);
    }
  };

  const handleVariantSelect = (tool: ToolType, value: number, value2?: number) => {
    const config = variantConfigs.find(c => c.tool === tool);
    if (config) {
      config.setter(value, value2);
      setTool(tool);
      setOpenDropdown(null);
    }
  };

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

  useEffect(() => {
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
            startPasting();
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

      if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelection();
        return;
      }

      const tool = allToolsWithShortcuts.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (tool) {
        setTool(tool.tool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, onNewMap, onOpenMap, onSaveMap, copySelection, cutSelection, startPasting, deleteSelection]);

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
        <img src={`${iconBase}${tool.icon}.svg`} alt={tool.label} className="toolbar-icon" />
      </button>
    );

    if (!hasVariants || !config) {
      return button;
    }

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
        <button className="toolbar-button" onClick={onNewMap} title="New Map (Ctrl+N)">
          <img src={`${iconBase}new.svg`} alt="New" className="toolbar-icon" />
        </button>
        <button className="toolbar-button" onClick={onOpenMap} title="Open Map (Ctrl+O)">
          <img src={`${iconBase}open.svg`} alt="Open" className="toolbar-icon" />
        </button>
        <button
          className="toolbar-button"
          onClick={onSaveMap}
          disabled={!map}
          title="Save Map (Ctrl+S)"
        >
          <img src={`${iconBase}save.svg`} alt="Save" className="toolbar-icon" />
        </button>

        <div className="toolbar-separator" />

        <button
          className="toolbar-button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <img src={`${iconBase}undo.svg`} alt="Undo" className="toolbar-icon" />
        </button>
        <button
          className="toolbar-button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <img src={`${iconBase}redo.svg`} alt="Redo" className="toolbar-icon" />
        </button>

        <div className="toolbar-separator" />

        {tools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {gameObjectStampTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {gameObjectRectTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {wallDrawTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        <button
          className={`toolbar-button ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          <img src={`${iconBase}grid.svg`} alt="Grid" className="toolbar-icon" />
        </button>

        <button
          className="toolbar-button"
          onClick={openSettings}
          disabled={!map}
          title="Map Settings"
        >
          <img src={`${iconBase}settings.svg`} alt="Settings" className="toolbar-icon" />
        </button>

        <button
          className="toolbar-button"
          onClick={cycleTheme}
          title={`Theme: ${scheme} (click to cycle)`}
        >
          <img src={`${iconBase}theme.svg`} alt="Theme" className="toolbar-icon" />
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
