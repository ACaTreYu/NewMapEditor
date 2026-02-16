/**
 * ToolBar component - Tool selection and actions with bitmap icons
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ToolType, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '@core/map';
import { isAnyDragActive } from '@core/canvas';
import { MapSettingsDialog, MapSettingsDialogHandle } from '../MapSettingsDialog/MapSettingsDialog';
import { WARP_STYLES, FLAG_DATA, POLE_DATA, SPAWN_DATA } from '@core/map/GameObjectData';
import { ANIMATION_DEFINITIONS } from '@core/map/AnimationDefinitions';
import { wallSystem, WALL_TYPE_NAMES } from '@core/map/WallSystem';
import {
  LuFilePlus, LuFolderOpen, LuSave,
  LuUndo2, LuRedo2, LuScissors, LuCopy, LuClipboardPaste,
  LuSquareDashed, LuPencil, LuPaintBucket, LuPipette, LuMinus, LuRectangleHorizontal,
  LuBrickWall, LuRuler,
  LuFlag, LuFlagTriangleRight, LuCircleDot, LuCrosshair, LuToggleLeft,
  LuBox, LuArrowRightLeft,
  LuRotateCw, LuRotateCcw, LuFlipHorizontal2,
  LuGrid2X2, LuSettings, LuEye, LuEyeOff,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import bunkerIcon from '@/assets/toolbar/bunkericon.png';
import conveyorIcon from '@/assets/toolbar/conveyoricon.png';
import flagIcon from '@/assets/toolbar/flagicon.png';
import switchIcon from '@/assets/toolbar/switchicon.png';
import './ToolBar.css';

// Map tool icon names to Lucide react-icons components
const toolIcons: Record<string, IconType> = {
  select: LuSquareDashed,
  pencil: LuPencil,
  fill: LuPaintBucket,
  picker: LuPipette,
  ruler: LuRuler,
  line: LuMinus,
  wall: LuBrickWall,
  wallpencil: LuPencil,
  wallrect: LuRectangleHorizontal,
  flag: LuFlag,
  pole: LuFlagTriangleRight,
  warp: LuCircleDot,
  spawn: LuCrosshair,
  switch: LuToggleLeft,
  holding: LuBox,
  bridge: LuArrowRightLeft,
  mirror: LuFlipHorizontal2,
};

interface ToolButton {
  tool: ToolType;
  label: string;
  icon: string;
  shortcut: string;
}

// Core editing tools (non-game)
const coreTools: ToolButton[] = [
  { tool: ToolType.SELECT, label: 'Select', icon: 'select', shortcut: '' },
  { tool: ToolType.PENCIL, label: 'Pencil', icon: 'pencil', shortcut: '' },
  { tool: ToolType.FILL, label: 'Fill', icon: 'fill', shortcut: '' },
  { tool: ToolType.PICKER, label: 'Picker', icon: 'picker', shortcut: '' },
  { tool: ToolType.RULER, label: 'Ruler', icon: 'ruler', shortcut: '' },
];

// Game drawing tools
const gameDrawTools: ToolButton[] = [
  { tool: ToolType.LINE, label: 'Line', icon: 'line', shortcut: '' },
];

// Wall tools (all three)
const wallTools: ToolButton[] = [
  { tool: ToolType.WALL, label: 'Wall', icon: 'wall', shortcut: '' },
  { tool: ToolType.WALL_PENCIL, label: 'W.Draw', icon: 'wallpencil', shortcut: '' },
  { tool: ToolType.WALL_RECT, label: 'W.Rect', icon: 'wallrect', shortcut: '' },
];

const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: 'flag', shortcut: '' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: 'pole', shortcut: '' },
  { tool: ToolType.WARP, label: 'Warp', icon: 'warp', shortcut: '' },
  { tool: ToolType.SPAWN, label: 'Spawn', icon: 'spawn', shortcut: '' },
  { tool: ToolType.SWITCH, label: 'Switch', icon: 'switch', shortcut: '' },
];

const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: 'bunker', shortcut: '' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: 'holding', shortcut: '' },
  { tool: ToolType.BRIDGE, label: 'Bridge', icon: 'bridge', shortcut: '' },
  { tool: ToolType.CONVEYOR, label: 'Conv', icon: 'conveyor', shortcut: '' },
];

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

// Resolve animated tile value to static tile ID (first frame of animation)
const resolveToStaticTile = (tileVal: number): number | null => {
  if (tileVal < 0) return null;
  if (tileVal & 0x8000) {
    const animId = tileVal & 0xFF;
    const anim = ANIMATION_DEFINITIONS[animId];
    return (anim && anim.frames.length > 0) ? anim.frames[0] : null;
  }
  return tileVal;
};

interface Props {
  tilesetImage: HTMLImageElement | null;
  onNewMap: () => void;
  onOpenMap: () => void;
  onSaveMap: () => void;
}

export const ToolBar: React.FC<Props> = ({
  tilesetImage,
  onNewMap,
  onOpenMap,
  onSaveMap
}) => {
  const { currentTool, showGrid, showFarplane, map, gameObjectToolState } = useEditorStore(
    useShallow((state) => ({
      currentTool: state.currentTool,
      showGrid: state.showGrid,
      showFarplane: state.showFarplane,
      map: state.map,
      gameObjectToolState: state.gameObjectToolState
    }))
  );

  // Document-aware undo/redo state
  const canUndo = useEditorStore((state) => {
    if (!state.activeDocumentId) return false;
    const doc = state.documents.get(state.activeDocumentId);
    return doc ? doc.undoStack.length > 0 : false;
  });
  const canRedo = useEditorStore((state) => {
    if (!state.activeDocumentId) return false;
    const doc = state.documents.get(state.activeDocumentId);
    return doc ? doc.redoStack.length > 0 : false;
  });

  // Selection and clipboard state for transform/clipboard buttons
  const hasSelection = useEditorStore((state) => {
    if (!state.activeDocumentId) return false;
    const doc = state.documents.get(state.activeDocumentId);
    return doc ? doc.selection.active && !doc.isPasting : false;
  });

  const hasClipboard = useEditorStore((state) => state.clipboard !== null);

  const wallType = useEditorStore((state) => state.wallType);
  const setWallType = useEditorStore((state) => state.setWallType);

  const setTool = useEditorStore((state) => state.setTool);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const toggleFarplane = useEditorStore((state) => state.toggleFarplane);
  const gridOpacity = useEditorStore(state => state.gridOpacity);
  const gridLineWeight = useEditorStore(state => state.gridLineWeight);
  const gridColor = useEditorStore(state => state.gridColor);
  const setGridOpacity = useEditorStore(state => state.setGridOpacity);
  const setGridLineWeight = useEditorStore(state => state.setGridLineWeight);
  const setGridColor = useEditorStore(state => state.setGridColor);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const setFlagPadType = useEditorStore((state) => state.setFlagPadType);

  const setBunkerSettings = useEditorStore((state) => state.setBunkerSettings);
  const setHoldingPenType = useEditorStore((state) => state.setHoldingPenType);
  const setBridgeDirection = useEditorStore((state) => state.setBridgeDirection);
  const setConveyorDirection = useEditorStore((state) => state.setConveyorDirection);
  const setSpawnVariant = useEditorStore((state) => state.setSpawnVariant);
  const setWarpType = useEditorStore((state) => state.setWarpType);
  const copySelection = useEditorStore((state) => state.copySelection);
  const cutSelection = useEditorStore((state) => state.cutSelection);
  const startPasting = useEditorStore((state) => state.startPasting);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);

  const settingsDialogRef = useRef<MapSettingsDialogHandle>(null);
  const [openDropdown, setOpenDropdown] = useState<ToolType | null>(null);
  const [showGridDropdown, setShowGridDropdown] = useState(false);

  const openSettings = () => {
    settingsDialogRef.current?.open();
  };

  // Rotate CW/CCW action handlers
  const handleRotateCW = () => {
    const state = useEditorStore.getState();
    const activeDocId = state.activeDocumentId;
    if (!activeDocId) return;
    const doc = state.documents.get(activeDocId);
    if (!doc || !doc.selection.active || doc.isPasting) return;
    state.rotateSelectionForDocument(activeDocId, 90);
  };

  const handleRotateCCW = () => {
    const state = useEditorStore.getState();
    const activeDocId = state.activeDocumentId;
    if (!activeDocId) return;
    const doc = state.documents.get(activeDocId);
    if (!doc || !doc.selection.active || doc.isPasting) return;
    state.rotateSelectionForDocument(activeDocId, -90);
  };

  // Build wall type variants array (shared by all 3 wall tools)
  const wallVariants: ToolVariant[] = WALL_TYPE_NAMES.map((name, index) => ({
    label: name,
    value: index,
  }));

  // Create memoized wall preview map (3-tile horizontal wall segment for each type)
  const wallPreviewUrls = useMemo(() => {
    const map = new Map<number, string>();
    if (!tilesetImage) return map;

    const TILES_PER_ROW = 40;
    for (let type = 0; type < WALL_TYPE_NAMES.length; type++) {
      const canvas = document.createElement('canvas');
      canvas.width = 3 * TILE_SIZE;
      canvas.height = TILE_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;

      // 3-tile horizontal segment: left end, middle, right end
      // Connection bitmask: LEFT=0b0010, RIGHT=0b0100
      const leftTile = wallSystem.getWallTile(type, 0b0100);   // right connection only
      const middleTile = wallSystem.getWallTile(type, 0b0110); // left + right
      const rightTile = wallSystem.getWallTile(type, 0b0010);  // left connection only

      [leftTile, middleTile, rightTile].forEach((tile, idx) => {
        const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
        const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
        ctx.drawImage(
          tilesetImage,
          srcX, srcY, TILE_SIZE, TILE_SIZE,
          idx * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE
        );
      });

      map.set(type, canvas.toDataURL());
    }
    return map;
  }, [tilesetImage]);

  const warpPreviewUrls = useMemo(() => {
    const map = new Map<number, string>();
    if (!tilesetImage) return map;

    const TILES_PER_ROW = 40;

    for (let warpType = 0; warpType < WARP_STYLES.length; warpType++) {
      const animId = WARP_STYLES[warpType];
      const anim = ANIMATION_DEFINITIONS[animId];
      if (!anim || anim.frames.length === 0) continue;

      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;

      // Draw first frame of animation
      const frame = anim.frames[0];
      const srcX = (frame % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(frame / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(
        tilesetImage,
        srcX, srcY, TILE_SIZE, TILE_SIZE,
        0, 0, TILE_SIZE, TILE_SIZE
      );

      map.set(warpType, canvas.toDataURL());
    }

    return map;
  }, [tilesetImage]);

  // Toolbar icons: static assets for bunker/conveyor/flag/switch, tileset-rendered for spawn/pole/warp
  const tilesetToolIcons = useMemo(() => {
    const icons: Record<string, string> = {
      bunker: bunkerIcon,
      conveyor: conveyorIcon,
      flag: flagIcon,
      switch: switchIcon,
    };
    if (!tilesetImage) return icons;

    const TILES_PER_ROW = 40;
    const drawTile = (ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number, dw: number, dh: number) => {
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, dx, dy, dw, dh);
    };

    // Spawn: tile 1100, Pole: tile 1361, Warp: first frame of anim 0x9E
    {
      const singles: [string, number][] = [['spawn', 1100], ['pole', 1361]];
      const warpAnim = ANIMATION_DEFINITIONS[0x9E];
      if (warpAnim?.frames.length > 0) {
        singles.push(['warp', warpAnim.frames[0]]);
      }
      for (const [name, tileId] of singles) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          drawTile(ctx, tileId, 0, 0, 16, 16);
          icons[name] = canvas.toDataURL();
        }
      }
    }

    return icons;
  }, [tilesetImage]);

  // Spawn preview URLs (Type 1 = 3x3, Type 2 = single tile)
  const spawnPreviewUrls = useMemo(() => {
    const urls = new Map<number, string>();
    if (!tilesetImage) return urls;

    const TILES_PER_ROW = 40;
    const drawTileAt = (ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) => {
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);
    };

    // Type 1: 3x3 cross (green team)
    {
      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE * 3;
      canvas.height = TILE_SIZE * 3;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        SPAWN_DATA[0].forEach((tileVal, idx) => {
          const staticTile = resolveToStaticTile(tileVal);
          if (staticTile !== null) {
            drawTileAt(ctx, staticTile, (idx % 3) * TILE_SIZE, Math.floor(idx / 3) * TILE_SIZE);
          }
        });
        urls.set(0, canvas.toDataURL());
      }
    }

    // Type 2: single tile (green animated spawn first frame)
    {
      const anim = ANIMATION_DEFINITIONS[0xA3];
      if (anim && anim.frames.length > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = TILE_SIZE;
        canvas.height = TILE_SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          drawTileAt(ctx, anim.frames[0], 0, 0);
          urls.set(1, canvas.toDataURL());
        }
      }
    }

    return urls;
  }, [tilesetImage]);

  // Flag preview URLs (3x3 per team)
  const flagPreviewUrls = useMemo(() => {
    const urls = new Map<number, string>();
    if (!tilesetImage) return urls;

    const TILES_PER_ROW = 40;
    const drawTileAt = (ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) => {
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);
    };

    for (let team = 0; team < FLAG_DATA.length; team++) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE * 3;
      canvas.height = TILE_SIZE * 3;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;

      FLAG_DATA[team].forEach((tileVal, idx) => {
        const staticTile = resolveToStaticTile(tileVal);
        if (staticTile !== null) {
          drawTileAt(ctx, staticTile, (idx % 3) * TILE_SIZE, Math.floor(idx / 3) * TILE_SIZE);
        }
      });

      urls.set(team, canvas.toDataURL());
    }

    return urls;
  }, [tilesetImage]);

  // Pole preview URLs (3x3 per team, center = pole tile 1361)
  const polePreviewUrls = useMemo(() => {
    const urls = new Map<number, string>();
    if (!tilesetImage) return urls;

    const TILES_PER_ROW = 40;
    const drawTileAt = (ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) => {
      const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);
    };

    for (let team = 0; team < 4; team++) {
      const poleData = POLE_DATA[team];
      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE * 3;
      canvas.height = TILE_SIZE * 3;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = false;

      // Per-team pole center tiles (3 rows apart): green=881, red=1001, blue=1121, yellow=1241
      const poleCenterTiles = [881, 1001, 1121, 1241];
      for (let idx = 0; idx < 9; idx++) {
        if (idx === 4) {
          drawTileAt(ctx, poleCenterTiles[team], TILE_SIZE, TILE_SIZE);
        } else {
          const staticTile = resolveToStaticTile(poleData[idx]);
          if (staticTile !== null) {
            drawTileAt(ctx, staticTile, (idx % 3) * TILE_SIZE, Math.floor(idx / 3) * TILE_SIZE);
          }
        }
      }

      urls.set(team, canvas.toDataURL());
    }

    return urls;
  }, [tilesetImage]);

  const variantConfigs: ToolVariantConfig[] = [
    {
      tool: ToolType.WALL,
      settingName: 'Type',
      getCurrentValue: () => wallType,
      variants: wallVariants,
      setter: (type) => setWallType(type)
    },
    {
      tool: ToolType.WALL_PENCIL,
      settingName: 'Type',
      getCurrentValue: () => wallType,
      variants: wallVariants,
      setter: (type) => setWallType(type)
    },
    {
      tool: ToolType.WALL_RECT,
      settingName: 'Type',
      getCurrentValue: () => wallType,
      variants: wallVariants,
      setter: (type) => setWallType(type)
    },
    {
      tool: ToolType.FLAG,
      settingName: 'Team',
      getCurrentValue: () => gameObjectToolState.flagPadType,
      variants: [
        { label: 'Green', value: 0 },
        { label: 'Red', value: 1 },
        { label: 'Blue', value: 2 },
        { label: 'Yellow', value: 3 },
        { label: 'White', value: 4 },
      ],
      setter: setFlagPadType
    },
    {
      tool: ToolType.FLAG_POLE,
      settingName: 'Team',
      getCurrentValue: () => gameObjectToolState.flagPadType,
      variants: [
        { label: 'Green', value: 0 },
        { label: 'Red', value: 1 },
        { label: 'Blue', value: 2 },
        { label: 'Yellow', value: 3 },
      ],
      setter: setFlagPadType
    },
    {
      tool: ToolType.SPAWN,
      settingName: 'Type',
      getCurrentValue: () => gameObjectToolState.spawnVariant,
      variants: [
        { label: 'Type 1', value: 0 },
        { label: 'Type 2', value: 1 },
      ],
      setter: setSpawnVariant
    },
    {
      tool: ToolType.WARP,
      settingName: 'Type',
      getCurrentValue: () => gameObjectToolState.warpType,
      variants: [
        { label: 'Warp F6', value: 0 },
        { label: 'Warp F7', value: 1 },
        { label: 'Warp F8', value: 2 },
        { label: 'Warp F9', value: 3 },
        { label: 'Warp FA', value: 4 },
        { label: 'Animated 3x3', value: 5 },
      ],
      setter: setWarpType
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
        { label: 'Left', value: 0 },
        { label: 'Right', value: 1 },
        { label: 'Up', value: 2 },
        { label: 'Down', value: 3 },
      ],
      setter: setConveyorDirection
    },
    {
      tool: ToolType.MIRROR,
      settingName: 'Direction',
      getCurrentValue: () => 0, // No persistent value, action on click
      variants: [
        { label: 'Right', value: 0 },
        { label: 'Left', value: 1 },
        { label: 'Up', value: 2 },
        { label: 'Down', value: 3 },
      ],
      setter: (dirIndex) => {
        const directions = ['right', 'left', 'up', 'down'] as const;
        const activeDocId = useEditorStore.getState().activeDocumentId;
        if (!activeDocId) return;
        const doc = useEditorStore.getState().documents.get(activeDocId);
        if (!doc || !doc.selection.active || doc.isPasting) return;
        useEditorStore.getState().mirrorSelectionForDocument(
          activeDocId,
          directions[dirIndex] as 'right' | 'left' | 'up' | 'down'
        );
      }
    },
  ];

  const variantToolsSet = new Set(variantConfigs.map(c => c.tool));
  // MIRROR is the only action tool (with dropdown, but doesn't change currentTool)
  const actionToolsSet = new Set([ToolType.MIRROR]);

  const handleToolClick = (tool: ToolType) => {
    // Action tools (like ROTATE) don't change current tool, just open dropdown
    if (actionToolsSet.has(tool)) {
      setOpenDropdown(openDropdown === tool ? null : tool);
      return;
    }

    // Regular tools with variants
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
    if (!showGridDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.grid-settings-wrapper')) {
        setShowGridDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGridDropdown]);

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
            if (isAnyDragActive()) break; // Block undo/redo during drag
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            if (isAnyDragActive()) break; // Block redo during drag
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
          case 'e':
            e.preventDefault();
            {
              const st = useEditorStore.getState();
              if (!st.activeDocumentId) break;
              const doc = st.documents.get(st.activeDocumentId);
              if (!doc) break;
              const { selection, viewport } = doc;
              if (!selection.active) break;
              const selCenterX = (selection.startX + selection.endX) / 2;
              const selCenterY = (selection.startY + selection.endY) / 2;
              const visibleTilesX = window.innerWidth / (TILE_SIZE * viewport.zoom);
              const visibleTilesY = (window.innerHeight - 100) / (TILE_SIZE * viewport.zoom);
              const newX = selCenterX - visibleTilesX / 2;
              const newY = selCenterY - visibleTilesY / 2;
              st.setViewport({
                x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX)),
                y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY))
              });
            }
            break;
        }
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, onNewMap, onOpenMap, onSaveMap, copySelection, cutSelection, startPasting, deleteSelection]);

  const renderToolButton = (tool: ToolButton) => {
    const hasVariants = variantToolsSet.has(tool.tool);
    const config = variantConfigs.find(c => c.tool === tool.tool);
    const isActionTool = actionToolsSet.has(tool.tool);
    const isActive = !isActionTool && currentTool === tool.tool; // Action tools never show as "active"
    const showDropdown = openDropdown === tool.tool;
    // Disable MIRROR button when no selection
    const isDisabled = tool.tool === ToolType.MIRROR && !hasSelection;
    const isWallTool = tool.tool === ToolType.WALL || tool.tool === ToolType.WALL_PENCIL || tool.tool === ToolType.WALL_RECT;
    const isWarpTool = tool.tool === ToolType.WARP;
    const isSpawnTool = tool.tool === ToolType.SPAWN;
    const isFlagTool = tool.tool === ToolType.FLAG;
    const isPoleTool = tool.tool === ToolType.FLAG_POLE;

    const IconComponent = toolIcons[tool.icon];
    const tilesetIcon = tilesetToolIcons[tool.icon];

    const button = (
      <button
        key={tool.tool}
        className={`toolbar-button ${isActive ? 'active' : ''} ${hasVariants ? 'has-variants' : ''}`}
        onClick={() => handleToolClick(tool.tool)}
        disabled={isDisabled}
        title={tool.label}
      >
        {tilesetIcon
          ? <img src={tilesetIcon} width={16} height={16} alt={tool.label} className="tileset-tool-icon" draggable={false} />
          : IconComponent
            ? <IconComponent size={16} />
            : tool.label}
      </button>
    );

    if (!hasVariants || !config) {
      return button;
    }

    return (
      <div key={tool.tool} className="toolbar-button-wrapper">
        {button}
        {showDropdown && (
          <div className={`toolbar-dropdown ${isWallTool ? 'wall-dropdown' : ''} ${isWarpTool ? 'warp-dropdown' : ''} ${isSpawnTool || isFlagTool || isPoleTool ? 'stamp-dropdown' : ''}`}>
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
                  {isWallTool && wallPreviewUrls.get(v.value) && (
                    <img
                      src={wallPreviewUrls.get(v.value)}
                      className="wall-preview"
                      alt={v.label}
                      draggable={false}
                    />
                  )}
                  {isWarpTool && warpPreviewUrls.get(v.value) !== undefined && (
                    <img
                      src={warpPreviewUrls.get(v.value)}
                      className="warp-preview"
                      alt={v.label}
                      draggable={false}
                    />
                  )}
                  {isSpawnTool && spawnPreviewUrls.get(v.value) && (
                    <img
                      src={spawnPreviewUrls.get(v.value)}
                      className={v.value === 0 ? 'stamp-preview-3x3' : 'stamp-preview-1x1'}
                      alt={v.label}
                      draggable={false}
                    />
                  )}
                  {isFlagTool && flagPreviewUrls.get(v.value) && (
                    <img
                      src={flagPreviewUrls.get(v.value)}
                      className="stamp-preview-3x3"
                      alt={v.label}
                      draggable={false}
                    />
                  )}
                  {isPoleTool && polePreviewUrls.get(v.value) && (
                    <img
                      src={polePreviewUrls.get(v.value)}
                      className="stamp-preview-3x3"
                      alt={v.label}
                      draggable={false}
                    />
                  )}
                  <span className="variant-label">{v.label}</span>
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
          <LuFilePlus size={16} />
        </button>
        <button className="toolbar-button" onClick={onOpenMap} title="Open Map (Ctrl+O)">
          <LuFolderOpen size={16} />
        </button>
        <button
          className="toolbar-button"
          onClick={onSaveMap}
          disabled={!map}
          title="Save Map (Ctrl+S)"
        >
          <LuSave size={16} />
        </button>

        <div className="toolbar-separator" />

        <button
          className="toolbar-button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <LuUndo2 size={16} />
        </button>
        <button
          className="toolbar-button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <LuRedo2 size={16} />
        </button>

        <div className="toolbar-separator" />

        {/* Core editing tools */}
        {coreTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Rotate CW/CCW action buttons */}
        <button
          className="toolbar-button"
          onClick={handleRotateCW}
          disabled={!hasSelection}
          title="Rotate 90° Clockwise"
        >
          <LuRotateCw size={16} />
        </button>
        <button
          className="toolbar-button"
          onClick={handleRotateCCW}
          disabled={!hasSelection}
          title="Rotate 90° Counter-Clockwise"
        >
          <LuRotateCcw size={16} />
        </button>

        {/* Mirror button with dropdown */}
        {renderToolButton({ tool: ToolType.MIRROR, label: 'Mirror', icon: 'mirror', shortcut: '' })}

        <div className="toolbar-separator" />

        {/* Clipboard buttons */}
        <button
          className="toolbar-button"
          onClick={() => cutSelection()}
          disabled={!hasSelection}
          title="Cut (Ctrl+X)"
        >
          <LuScissors size={16} />
        </button>
        <button
          className="toolbar-button"
          onClick={() => copySelection()}
          disabled={!hasSelection}
          title="Copy (Ctrl+C)"
        >
          <LuCopy size={16} />
        </button>
        <button
          className="toolbar-button"
          onClick={() => startPasting()}
          disabled={!hasClipboard}
          title="Paste (Ctrl+V)"
        >
          <LuClipboardPaste size={16} />
        </button>

        <div className="toolbar-separator" />

        {/* Game draw tools */}
        {gameDrawTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Wall tools */}
        {wallTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Game object stamp tools */}
        {gameObjectStampTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        {/* Game object rect tools */}
        {gameObjectRectTools.map(renderToolButton)}

        <div className="toolbar-separator" />

        <div className="grid-settings-wrapper">
          <button
            className={`toolbar-button ${showGrid ? 'active' : ''}`}
            onClick={toggleGrid}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowGridDropdown(!showGridDropdown);
            }}
            title="Toggle Grid (right-click for settings)"
          >
            <LuGrid2X2 size={16} />
          </button>
          <button
            className="grid-settings-arrow"
            onClick={() => setShowGridDropdown(!showGridDropdown)}
            title="Grid Settings"
          >
            &#9660;
          </button>
          {showGridDropdown && (
            <div className="grid-settings-dropdown">
              <div className="grid-settings-row">
                <label className="grid-settings-label">Opacity</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={gridOpacity}
                  onChange={(e) => setGridOpacity(parseInt(e.target.value, 10))}
                  className="grid-settings-slider"
                />
                <span className="grid-settings-value">{gridOpacity}%</span>
              </div>
              <div className="grid-settings-row">
                <label className="grid-settings-label">Weight</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={gridLineWeight}
                  onChange={(e) => setGridLineWeight(parseInt(e.target.value, 10))}
                  className="grid-settings-slider"
                />
                <span className="grid-settings-value">{gridLineWeight}px</span>
              </div>
              <div className="grid-settings-row">
                <label className="grid-settings-label">Color</label>
                <input
                  type="color"
                  value={gridColor}
                  onChange={(e) => setGridColor(e.target.value)}
                  className="grid-settings-color"
                />
                <span className="grid-settings-value">{gridColor}</span>
              </div>
              <div className="grid-settings-row grid-settings-reset">
                <button
                  className="grid-settings-reset-btn"
                  onClick={() => {
                    setGridOpacity(10);
                    setGridLineWeight(1);
                    setGridColor('#FFFFFF');
                  }}
                  title="Reset all grid settings to defaults"
                >
                  &#8634; Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          className={`toolbar-button ${showFarplane ? 'active' : ''}`}
          onClick={toggleFarplane}
          title="Toggle farplane background"
        >
          {showFarplane ? <LuEye size={16} /> : <LuEyeOff size={16} />}
        </button>

        <button
          className="toolbar-button"
          onClick={openSettings}
          disabled={!map}
          title="Map Settings"
        >
          <LuSettings size={16} />
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
