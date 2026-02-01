# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.3 - All source code in `src/`, `electron/` directories
- JSX/TSX - React UI components in `src/components/`

**Secondary:**
- JavaScript - Build configuration and Node.js tooling

## Runtime

**Environment:**
- Node.js (version requirement not specified in package.json, but @types/node ^20.10.0 suggests Node 20+)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.2.0 - UI rendering, all components in `src/components/`
- Electron 28.0.0 - Desktop application shell, main process in `electron/main.ts`
- Vite 5.0.0 - Build tool and dev server (configured in `vite.config.ts`)

**State Management:**
- Zustand 4.4.7 - Application state in `src/core/editor/EditorState.ts`

**Build/Dev:**
- vite-plugin-electron 0.15.0 - Electron + Vite integration
- vite-plugin-electron-renderer 0.14.5 - Renderer process Vite plugin
- electron-builder 24.9.1 - Desktop application packaging
- @vitejs/plugin-react 4.2.0 - React fast refresh
- concurrently 8.2.2 - Parallel process execution in dev mode
- wait-on 7.2.0 - Wait for server startup
- TypeScript 5.3.0 - Type checking

## Key Dependencies

**Critical:**
- React 18.2.0 - UI framework powering all components
- Electron 28.0.0 - Desktop shell; enables file I/O, dialogs, window management
- Zustand 4.4.7 - State management for editor state, map data, viewport, tools

**Runtime APIs:**
- Node.js `zlib` module - Compression/decompression for v3 map format (via IPC in `electron/main.ts`)
- Node.js `fs` module - File read/write operations (via IPC in `electron/main.ts`)
- Node.js `path` module - Path manipulation in Electron main process
- Canvas API - Tile rendering in `src/components/MapCanvas/MapCanvas.tsx`

**No External Integrations:**
- No database libraries (state is in-memory)
- No HTTP/REST client libraries
- No authentication providers
- No analytics or error tracking

## Configuration

**Build Configuration:**
- `vite.config.ts` - Vite configuration with Electron plugins
- `tsconfig.json` - TypeScript configuration with path aliases:
  - `@/*` → `src/*`
  - `@core/*` → `src/core/*`
  - `@components/*` → `src/components/*`
- `tsconfig.node.json` - TypeScript config for build tools

**Compiler Options:**
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode enabled
- No unused locals/parameters allowed
- No fallthrough cases in switches

**Electron Configuration:**
- Window dimensions: 1400x900px (minimum 1024x768)
- Window title: "AC Map Editor"
- Context isolation: enabled
- Node integration: disabled
- Preload script: `electron/preload.ts`
- Dev URL: `http://localhost:5173`

**Build Output:**
- Main process: `dist-electron/main.js`
- Renderer: `dist/`
- Package targets: NSIS (Windows), DMG (macOS), AppImage (Linux)
- App ID: `com.armorcritical.mapeditor`

## Platform Requirements

**Development:**
- Node.js 20+ (inferred from @types/node version)
- npm 8+ (not explicitly specified)

**Production:**
- Windows (NSIS installer target)
- macOS (DMG target)
- Linux (AppImage target)
- Chromium 120+ (bundled with Electron 28)

---

*Stack analysis: 2026-02-01*
