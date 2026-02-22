# AC Map Editor

A modern tile map editor for Armor Critical, built with Electron and React.

![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Features

- **Full Map Format Support** - Read/write v1 (raw), v2 (legacy), and v3 (current) map files
- **Wall Auto-Connection** - 15 wall types with automatic neighbor connection
- **Line Drawing** - Click and drag to draw straight lines of walls/tiles
- **Tile Palette** - Visual tile selection from tileset
- **Undo/Redo** - Full history support
- **Pan & Zoom** - Mouse wheel zoom, middle-click/Alt+drag to pan

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ac-map-editor.git
cd ac-map-editor

# Install dependencies
npm install

# Add your tileset
# Place tileset.png (640x1600, 40 tiles per row) in assets/

# Run in development mode
npm run electron:dev
```

### Building

```bash
# Build for production
npm run electron:build
```

## Usage

### Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | V | Select tiles |
| Pencil | B | Draw single tiles |
| Fill | G | Flood fill area |
| Line | L | Draw line of tiles (click & drag) |
| Rectangle | R | Draw rectangle |
| Wall | W | Auto-connecting walls (click & drag) |
| Eraser | E | Remove tiles |
| Picker | I | Pick tile from map |

### Controls

- **Left Click** - Use current tool
- **Middle Click / Alt+Drag** - Pan viewport
- **Mouse Wheel** - Zoom in/out
- **Ctrl+Z** - Undo
- **Ctrl+Y / Ctrl+Shift+Z** - Redo
- **Ctrl+N** - New map
- **Ctrl+O** - Open map
- **Ctrl+S** - Save map

## Map Format

The editor uses the Armor Critical map format:

- **Dimensions**: 256 x 256 tiles (fixed)
- **Tile Size**: 16 x 16 pixels
- **Encoding**: 16-bit per tile (bit 15 = animated tile flag)
- **Compression**: zlib level 9
- **File Magic**: `0x4278`

## Project Structure

```
├── electron/           # Electron main process
│   ├── main.ts         # Window management, IPC handlers
│   └── preload.ts      # Context bridge for renderer
├── src/
│   ├── core/           # Portable core logic
│   │   ├── map/        # Map parsing, tile encoding, wall system
│   │   └── editor/     # Editor state (Zustand)
│   └── components/     # React UI components
│       ├── MapCanvas/  # Tile rendering canvas
│       ├── ToolBar/    # Tool buttons
│       ├── TilePalette/# Tile selection
│       └── StatusBar/  # Info display
└── assets/             # Tileset images
```

## Portability

The `src/core/` module is designed to work independently of Electron, making it easy to integrate into other React applications (such as the main Armor Critical client).

## License

MIT

## Credits

- Original SEDIT by Wayne A. Witzel III, Jon-Pierre Gentile, David Parton
- Map format originally designed for Armor Critical
