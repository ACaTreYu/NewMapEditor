# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
E:\NewMapEditor/
├── src/                      # React + portable core source code
│   ├── main.tsx             # Renderer entry point
│   ├── App.tsx              # Main application component
│   ├── App.css              # Global styles
│   ├── vite-env.d.ts        # Vite type definitions
│   ├── core/                # Portable logic (no Electron deps)
│   │   ├── index.ts         # Core module exports
│   │   ├── editor/          # State management
│   │   │   ├── EditorState.ts    # Zustand store
│   │   │   └── index.ts          # Exports
│   │   └── map/             # Map format and utilities
│   │       ├── types.ts           # Map/tile type definitions and constants
│   │       ├── MapParser.ts       # Binary format parser and serializer
│   │       ├── TileEncoding.ts    # Tile bitwise encoding utilities
│   │       ├── WallSystem.ts      # Wall auto-connection system
│   │       └── index.ts           # Map module exports
│   └── components/          # React UI components
│       ├── index.ts         # Component exports
│       ├── MapCanvas/       # Main tile editing canvas
│       │   ├── MapCanvas.tsx      # Canvas component with event handlers
│       │   ├── MapCanvas.css      # Canvas styles
│       │   └── index.ts           # Exports
│       ├── TilePalette/     # Tileset palette with multi-select
│       │   ├── TilePalette.tsx    # Palette rendering and selection
│       │   ├── TilePalette.css    # Palette styles
│       │   └── index.ts           # Exports
│       ├── ToolBar/         # Tool selection and file operations
│       │   ├── ToolBar.tsx        # Toolbar UI
│       │   ├── ToolBar.css        # Toolbar styles
│       │   └── index.ts           # Exports
│       ├── MapSettingsPanel/    # Map properties editor
│       │   ├── MapSettingsPanel.tsx  # Settings UI with sliders
│       │   └── index.ts             # Exports
│       ├── AnimationPanel/     # Animated tile viewer
│       │   ├── AnimationPanel.tsx   # Animation preview
│       │   └── index.ts            # Exports
│       └── StatusBar/         # Cursor position display
│           ├── StatusBar.tsx       # Status info
│           ├── StatusBar.css       # Status bar styles
│           └── index.ts            # Exports
├── electron/                 # Electron main process
│   ├── main.ts              # Application window and IPC handlers
│   └── preload.ts           # Secure IPC bridge with type defs
├── assets/                   # Static assets
│   ├── tileset.png          # Tileset image (640x?, 16px tiles)
│   └── GFX Patches/         # Animation data and patches
├── dist-electron/           # Built Electron app (generated)
├── index.html               # HTML entry point template
├── vite.config.ts           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
├── tsconfig.node.json       # TypeScript config for Node (Electron)
├── package.json             # Dependencies and scripts
└── CLAUDE.md                # Project instructions
```

## Directory Purposes

**src/:**
- Purpose: All source code (React + portable core)
- Contains: React components, TypeScript files, styles
- Key files: `App.tsx` (main layout), `main.tsx` (React entry)

**src/core/:**
- Purpose: Portable business logic independent of Electron
- Contains: State management (Zustand), map parsing, tile encoding
- Key files: `EditorState.ts` (state store), `MapParser.ts` (format parser)
- Note: Designed for reuse in AC React app without modifications

**src/core/map/:**
- Purpose: SubSpace/Continuum map format implementation
- Contains: Type definitions, binary parser, tile utilities, wall system
- Key files: `types.ts` (constants and interfaces), `MapParser.ts` (read/write), `WallSystem.ts` (neighbor auto-connect)

**src/core/editor/:**
- Purpose: Editor state management
- Contains: Single Zustand store with all editor state
- Key files: `EditorState.ts` (store with 30+ actions)

**src/components/:**
- Purpose: React UI components
- Contains: Canvas, palette, panels, toolbar
- Key files: `MapCanvas/MapCanvas.tsx` (main editor), `TilePalette/TilePalette.tsx` (tile selection)

**electron/:**
- Purpose: Electron main process runtime
- Contains: Window management, file I/O, compression/decompression
- Key files: `main.ts` (window + IPC handlers), `preload.ts` (secure bridge)

**assets/:**
- Purpose: Static resources
- Contains: Tileset image, animation data
- Key files: `tileset.png` or `tileset.bmp` (required at build time)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Renders React App to DOM (#root)
- `electron/main.ts`: Creates Electron window and loads HTML/dev server
- `index.html`: HTML template with root div

**Configuration:**
- `tsconfig.json`: TypeScript compilation settings
- `vite.config.ts`: Build tool configuration
- `package.json`: Dependencies and npm scripts
- `CLAUDE.md`: Project documentation

**Core Logic:**
- `src/core/map/types.ts`: Map constants (MAP_WIDTH=256, TILE_SIZE=16, MAP_MAGIC=0x4278)
- `src/core/map/MapParser.ts`: V1/V2/V3 format support with binary read/write
- `src/core/editor/EditorState.ts`: Zustand store with tile operations and undo/redo
- `src/core/map/WallSystem.ts`: 15 wall types with auto-connection bitmask logic

**UI Components:**
- `src/components/MapCanvas/MapCanvas.tsx`: Main canvas with zoom, pan, tools (Bresenham line, flood fill)
- `src/components/TilePalette/TilePalette.tsx`: Tileset display with multi-tile drag selection
- `src/components/ToolBar/ToolBar.tsx`: Tool buttons and file operations
- `src/components/MapSettingsPanel/MapSettingsPanel.tsx`: Range sliders for map properties
- `src/components/AnimationPanel/AnimationPanel.tsx`: Animation frame preview and control

**Testing:**
- No test files found (testing not yet implemented)

## Naming Conventions

**Files:**
- Component files: `ComponentName.tsx` (React), `.css` for styles
- Export barrels: `index.ts` in each directory (e.g., `src/components/index.ts`)
- Type/logic files: `FileName.ts` (e.g., `MapParser.ts`, `TileEncoding.ts`)
- Main process: `main.ts` in electron/ directory

**Directories:**
- Feature directories: PascalCase (e.g., `MapCanvas/`, `TilePalette/`)
- Layer directories: lowercase (e.g., `core/`, `components/`, `electron/`)

**Variables/Functions:**
- React components: PascalCase (e.g., `MapCanvas`, `TilePalette`)
- Functions/variables: camelCase (e.g., `getVisibleTiles`, `setTile`, `isWallTile`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAP_WIDTH`, `TILE_SIZE`, `DEFAULT_TILE`)
- Interfaces: PascalCase, I-prefix optional (e.g., `MapData`, `EditorState`)

**Imports:**
- Path alias `@components` → `src/components`
- Path alias `@core` → `src/core`
- Used throughout components for cleaner imports (e.g., `import { MapCanvas } from '@components'`)

## Where to Add New Code

**New Portable Feature (e.g., new map validation):**
- Logic file: `src/core/map/NewFeature.ts` (export function/class)
- Type definitions: Add to `src/core/map/types.ts` if needed
- Export from: `src/core/map/index.ts`
- Usage: Can be imported in components or main app

**New React Component:**
- Component directory: `src/components/ComponentName/` (PascalCase)
- Files: `ComponentName.tsx`, `ComponentName.css`, `index.ts`
- Export: Add to `src/components/index.ts` barrel
- Usage: Import from `@components` in App or other components

**New Editor State Action:**
- Add to `useEditorStore` in `src/core/editor/EditorState.ts`
- Follow Zustand pattern: function returns setter call or uses `get()` for access
- Add type signature to `EditorState` interface

**New Tool Type:**
- Add enum variant to `ToolType` in `src/core/map/types.ts`
- Implement handler in `MapCanvas.tsx` mouse event handler
- Add button to toolbar in `ToolBar.tsx` with icon and shortcut
- Update state store actions if needed for tool-specific state

**New Map Setting:**
- Add field to `MapHeader` interface in `src/core/map/types.ts`
- Update parser in `src/core/map/MapParser.ts` (read/write offset)
- Update serializer to include new field
- Add UI control to `MapSettingsPanel.tsx` with label and input
- Wire to store action `updateMapHeader()`

**Electron IPC Handler:**
- Add `ipcMain.handle('namespace:action', async (_, params) => {...})` in `electron/main.ts`
- Expose in preload bridge: add function to `contextBridge.exposeInMainWorld()` in `electron/preload.ts`
- Add type definition to `ElectronAPI` interface in `preload.ts`
- Usage in React: `await window.electronAPI.action(params)`

## Special Directories

**dist-electron/:**
- Purpose: Compiled Electron app output
- Generated: Yes (from `npm run electron:build`)
- Committed: No (in .gitignore)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes

**assets/GFX Patches/:**
- Purpose: Animation data and tileset variations
- Generated: No (external assets)
- Committed: Yes

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (from package-lock.json)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-01*
