# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Layered architecture with separation between portable core logic and Electron-dependent UI layer

**Key Characteristics:**
- Core logic decoupled from Electron/IPC (enables future porting to AC React app)
- Zustand for centralized state management
- Canvas-based rendering with tile-based coordinate system
- Electron main process handles file I/O and compression
- Preload script provides secure IPC bridge

## Layers

**Electron Main Process:**
- Purpose: Handle file system operations and zlib compression/decompression
- Location: `electron/main.ts`, `electron/preload.ts`
- Contains: Window creation, IPC handlers for file dialogs, file I/O, compression
- Depends on: Node.js fs, zlib modules
- Used by: Renderer process via IPC

**Portable Core Layer:**
- Purpose: Domain logic that can exist independently of Electron
- Location: `src/core/`
- Contains: State management, map parsing, tile encoding, wall systems
- Depends on: No external Electron dependencies
- Used by: React components, can be reused in AC app

**React UI Layer:**
- Purpose: User interface components and editor interactions
- Location: `src/components/`, `src/App.tsx`
- Contains: Canvas rendering, panels, tool selection, event handlers
- Depends on: Zustand store, core layer, React 18
- Used by: Entry point (`src/main.tsx`)

**Map Data Layer:**
- Purpose: File format parsing and serialization for SubSpace/Continuum maps
- Location: `src/core/map/`
- Contains: Type definitions, map parser, tile encoding utilities, wall system
- Depends on: No external dependencies
- Used by: EditorState, App component

## Data Flow

**Map Load Flow:**

1. User clicks "Open" → App component calls `window.electronAPI.openFileDialog()`
2. Electron main process shows native file dialog, returns file path
3. App calls `window.electronAPI.readFile(filePath)` → IPC to main process
4. Main process reads file as binary, returns base64-encoded data
5. App decodes base64 to Uint8Array, passes to `mapParser.parse()`
6. MapParser reads header (uncompressed), returns partial MapData
7. If v3 format: App extracts compressed section, calls `window.electronAPI.decompress()`
8. Electron main process calls `zlib.inflateSync()`, returns decompressed base64
9. App decodes decompressed data into tile array
10. App calls `setMap(mapData, filePath)` → updates Zustand store
11. Components subscribe to store changes and re-render

**Map Save Flow:**

1. User clicks "Save" → App component calls `mapParser.serialize(map)`
2. MapParser returns header-only buffer
3. App extracts tile data as Uint8Array, converts to base64
4. App calls `window.electronAPI.compress(tileB64)` → IPC to main
5. Main process calls `zlib.deflateSync()` with compression level 9
6. App receives compressed base64, decodes to Uint8Array
7. App concatenates header + compressed tiles into single buffer
8. App calls `window.electronAPI.writeFile(filePath, fullB64)` → IPC
9. Main process writes full binary file to disk
10. App calls `markSaved()` → clears modified flag in store

**Tile Placement Flow:**

1. User clicks/drags on MapCanvas → mouse event handler fires
2. Event handler maps screen coordinates to tile coordinates using viewport
3. Handler retrieves current tool type and selected tile from store
4. Based on tool:
   - Pencil: calls `setTile(x, y, tileId)` or `setTiles([{x, y, tileId}])` for drag
   - Wall: calls `placeWall(x, y)` → WallSystem auto-connects to neighbors
   - Fill: calls `fillArea(x, y, targetTile)` → flood fill algorithm
   - Eraser: calls `eraseTile(x, y)` → replaces with DEFAULT_TILE or wall removal
   - Line/Rect: accumulates tiles list, then calls `setTiles()`
5. Store action updates map.tiles array and sets `modified = true`
6. Store notifies subscribers (React components re-render)
7. MapCanvas re-renders visible tiles with updated data

**State Management Flow:**

1. EditorState (Zustand store) is single source of truth for editor state
2. Components subscribe to store slices they need (no re-render on unrelated changes)
3. When tool changes: `setTool(tool)` updates currentTool and optionally saves previousTool
4. When tile selected: `setSelectedTile(tile)` converts tile ID to tileSelection rect
5. When animation frame advances: `advanceAnimationFrame()` increments counter
6. Animated tiles fetch current frame from `animations` array using frame counter
7. Undo/redo: `pushUndo()` snapshots tiles array before change, stacks up to 50 actions

## Key Abstractions

**MapData:**
- Purpose: Represents a complete map with header and tile array
- Examples: `src/core/map/types.ts` - `interface MapData`
- Pattern: Immutable updates in Zustand (creates new object on change)

**TileEncoding:**
- Purpose: Bitwise encoding/decoding of tile properties (animated flag, frame offset, animation ID)
- Examples: `src/core/map/TileEncoding.ts` - functions like `isAnimatedTile()`, `makeAnimatedTile()`
- Pattern: Utility functions with bit manipulation

**WallSystem:**
- Purpose: Manages wall tile auto-connection based on neighbor detection
- Examples: `src/core/map/WallSystem.ts` - singleton class
- Pattern: Maintains 15 wall type definitions, uses connection bitmask to select correct tile variant

**EditorState Store:**
- Purpose: Centralized mutable state for editor with action creators
- Examples: `src/core/editor/EditorState.ts` - Zustand store
- Pattern: Single store with sliced selectors in components

## Entry Points

**Main Electron Process:**
- Location: `electron/main.ts`
- Triggers: Application launch via `app.whenReady()`
- Responsibilities: Create window, load dev/production URL, setup IPC handlers

**Renderer Process Entry:**
- Location: `src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Mount React App component to DOM root

**React App Component:**
- Location: `src/App.tsx`
- Triggers: Renderer initialization
- Responsibilities: Load tileset image, render main layout, handle file operations, coordinate panels

## Error Handling

**Strategy:** Result objects with success/error fields for async operations

**Patterns:**
- File operations return `{ success: boolean; data?: T; error?: string }`
- Parse operations return `{ success: boolean; data?: MapData; error?: string }`
- IPC calls use Promise with error handling via try/catch in main process
- UI shows alert dialogs on error, logs to console
- Invalid map versions/magic numbers caught in MapParser with descriptive errors

## Cross-Cutting Concerns

**Logging:** `console.log()` and `console.warn()` for diagnostics (e.g., tileset load failure, parse errors)

**Validation:**
- Boundary checks: coordinates validated against MAP_WIDTH/MAP_HEIGHT before tile access
- Type checks: version enum and objective enum for map format
- File format validation: magic number (0x4278) verification before parsing

**Authentication:** Not applicable (desktop app, local file access only)

**Viewport Management:**
- Coordinates are tile-based (floating point for zoom), not screen pixels
- `getVisibleTiles()` calculates which tiles to render based on viewport + zoom
- Scroll bars drag updates viewport x/y
- Mouse wheel zoom centered on cursor position (0.25x to 4x range)

---

*Architecture analysis: 2026-02-01*
