# AC Map Editor

A modern tile map editor for Armor Critical, built with Electron and React.

![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## Platforms

| Platform | How to Use |
|----------|-----------|
| **Windows** | [Download installer](https://github.com/ACaTreYu/NewMapEditor/releases/latest) |
| **Linux** | [Download .deb](https://github.com/ACaTreYu/NewMapEditor/releases/latest) |
| **Web (Mac / any OS)** | [Open in browser](https://arcboundinteractive.com/AC-Map-Editor-Online/) |

## Features

- **Full Map Format Support** - Read/write v1 (raw), v2 (legacy), and v3 (current) map files
- **Wall Auto-Connection** - 15 wall types with automatic neighbor connection
- **Line Drawing** - Click and drag to draw straight lines of walls/tiles
- **Tile Palette** - Visual tile selection from tileset
- **30+ GFX Patch Tilesets** - Bundled tileset patches, selectable from dropdown
- **Undo/Redo** - Full history support
- **Pan & Zoom** - Mouse wheel zoom, middle-click/Alt+drag to pan

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/ACaTreYu/NewMapEditor.git
cd NewMapEditor
npm install
npm run electron:dev
```

### Building

```bash
# Desktop — Windows
npm run electron:build:win

# Desktop — Linux (.deb)
npm run electron:build:linux

# Web — static SPA (outputs to dist-web/)
npm run build:web
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
├── electron/                # Electron main process
│   ├── main.ts              # Window management, IPC handlers
│   └── preload.ts           # Context bridge for renderer
├── src/
│   ├── core/                # Portable core logic (platform-agnostic)
│   │   ├── map/             # Map parsing, tile encoding, wall system
│   │   ├── editor/          # Editor state (Zustand)
│   │   ├── canvas/          # Canvas rendering engine
│   │   └── services/        # FileService interface
│   ├── adapters/
│   │   ├── electron/        # Electron FileService (IPC + zlib)
│   │   └── web/             # Web FileService (File API + pako)
│   ├── components/          # React UI components
│   ├── main.tsx             # Electron entry point
│   └── web-main.tsx         # Web entry point
├── index.html               # Electron HTML shell
├── index.web.html           # Web HTML shell
├── vite.config.ts           # Vite config — Electron build
├── vite.config.web.ts       # Vite config — Web build
└── public/assets/           # Tilesets, patches, toolbar icons
```

### Architecture

The codebase uses a clean adapter pattern to support all three platforms from a single source:

- **`src/core/`** — All editor logic, rendering, and state management. Zero platform dependencies.
- **`src/adapters/electron/`** — Electron adapter: file dialogs via IPC, zlib via Node.js
- **`src/adapters/web/`** — Web adapter: File System Access API, pako for zlib, browser shims
- **`src/components/`** — Shared React UI (works identically on all platforms)

The entry points (`main.tsx` / `web-main.tsx`) wire the correct adapter via dependency injection through React context.

## License

MIT

## Credits

- Original SEDIT by Wayne A. Witzel III, Jon-Pierre Gentile, David Parton
- Map format originally designed for Armor Critical
