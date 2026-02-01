# AC Map Editor

Electron/React tile map editor for Armor Critical (SubSpace/Continuum format).

## Tech Stack

- **Electron 28** - Desktop shell
- **React 18 + TypeScript** - UI
- **Vite 5** - Build tool
- **Zustand** - State management
- **Canvas API** - Tile rendering

## Project Structure

```
src/core/       # Portable logic (no Electron deps) - can be reused in AC app
src/components/ # React UI components
electron/       # Main process + IPC handlers
assets/         # Tileset images
```

## Commands

```bash
npm run electron:dev   # Development mode
npm run electron:build # Production build
npm run typecheck      # Type checking
```

## Map Format

- 256x256 tile grid, 16x16px tiles
- 16-bit tile encoding (bit 15 = animated)
- zlib compression, magic `0x4278`
- Full spec: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

## Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| TILES_PER_ROW | 40 | Tileset is 640px wide |
| DEFAULT_TILE | 280 | Empty/space tile |
| MAP_SIZE | 256x256 | Fixed dimensions |

## Features

### Navigation
- **Scroll bars** - Horizontal and vertical scroll bars for map navigation
- **Right-click drag** - Pan the map by right-click dragging
- **Zoom to cursor** - Mouse wheel zooms centered on cursor position (0.25x to 4x)
- **Middle-click/Alt+click** - Alternative pan methods

### Tile Selection
- **Multi-tile selection** - Drag in tile palette to select rectangular regions
- **Picker tool return** - Picker (I) returns to previous tool after picking

### Panels
- **Map Settings** (gear icon) - Edit map properties with range sliders
  - General: name, description
  - Game: max players (1-16), teams (1-4), objective, holding time
  - Combat: laser/special damage, recharge rate (1-5)
  - Weapons: missiles/bombs/bouncies toggles
  - Powerups: count, max simultaneous
- **Animations** (play icon) - View and place animated tiles
  - Live animation previews
  - Frame offset control (0-127)
  - Load animation data from file

## Architecture Notes

- `src/core/` is designed for portability to the AC React app
- File I/O happens via Electron IPC (main process handles zlib)
- Wall auto-connection uses Bresenham's algorithm for neighbor detection
- State is in Zustand store (`EditorState.ts`)
- `TileSelection` supports multi-tile stamps with width/height

## Gotchas

- Tileset must be placed at `assets/tileset.png` (or .bmp)
- GPU cache errors on Windows are harmless Chromium warnings
- Wall tool uses click-drag for line drawing
- Animation data must be loaded separately (not stored in map files)
