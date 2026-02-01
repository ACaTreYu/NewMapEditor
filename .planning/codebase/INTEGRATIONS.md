# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**None Detected:**
- No third-party REST APIs or webhooks are used
- No external service clients or SDKs integrated
- Codebase is fully self-contained for map editing functionality

## Data Storage

**File System:**
- Local filesystem only
- Reading/writing `.map` and `.lvl` files via Electron `fs` module (async via IPC)
- Files are opened through `dialog.showOpenDialog()` in `electron/main.ts` (lines 52-66)
- Files are saved through `dialog.showSaveDialog()` in `electron/main.ts` (lines 68-81)

**In-Memory State:**
- Map data stored in Zustand store (`src/core/editor/EditorState.ts`)
- Tile grid (256x256 = 65536 tiles) as `Uint16Array`
- Editor state (tools, viewport, selection) in `EditorState`
- No persistence layer beyond file export

**File Format:**
- SubSpace/Continuum `.map` format (v1/v2/v3)
- Format specification: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

## Data Compression

**Compression/Decompression:**
- Node.js `zlib` module (built-in, no external dependency)
- Format: zlib deflate/inflate
- Used for v3 format maps only
- IPC handlers in `electron/main.ts`:
  - `zlib:compress` (lines 112-120)
  - `zlib:decompress` (lines 102-110)
- Invoked from React via `window.electronAPI.compress()` and `window.electronAPI.decompress()`

## Caching

**None:**
- No caching layer implemented
- Tileset image loaded into memory on app startup

## Authentication & Identity

**None:**
- No user authentication
- No identity providers
- Standalone desktop application with no user accounts

## Monitoring & Observability

**Error Handling:**
- No error tracking service (Sentry, Rollbar, etc.)
- Error messages displayed via browser `alert()` dialogs in `src/App.tsx`
- Parse errors logged to `MapParser.lastError` string property

**Logging:**
- No logging service
- Single `console.warn()` if tileset image not found in `src/App.tsx` (line 30)
- No structured logging framework

## CI/CD & Deployment

**Not Configured:**
- No CI/CD pipeline files detected (.github/workflows, .gitlab-ci.yml, etc.)
- No deployment automation

**Manual Build:**
```bash
npm run electron:build  # Builds for current platform
npm run electron:dev   # Development with hot reload
npm run build          # TypeScript + Vite + Electron builder
```

**Build Output Locations:**
- Compiled JS: `dist/` (renderer) and `dist-electron/` (main process)
- Installer: `release/` directory
- Executable: Platform-specific (NSIS for Windows, DMG for macOS, AppImage for Linux)

## IPC Bridge

**Electron-Renderer Communication:**
Exposed via `window.electronAPI` in `electron/preload.ts`:

**File Operations:**
- `window.electronAPI.openFileDialog()` → `dialog:openFile` handler
- `window.electronAPI.saveFileDialog()` → `dialog:saveFile` handler
- `window.electronAPI.readFile(filePath)` → `file:read` handler
- `window.electronAPI.writeFile(filePath, data)` → `file:write` handler

**Compression:**
- `window.electronAPI.compress(data)` → `zlib:compress` handler
- `window.electronAPI.decompress(data)` → `zlib:decompress` handler

**Security:**
- Context isolation enabled
- Node integration disabled
- Preload script used for safe IPC exposure
- All IPC data base64-encoded for transfer

## Asynchronous Communication

**IPC Pattern:**
All IPC calls use `ipcRenderer.invoke()` (Promise-based):
```typescript
const result = await window.electronAPI.readFile(filePath);
if (result.success) {
  // Handle success
} else {
  // Handle error: result.error
}
```

Response format for all handlers:
- Success: `{ success: true, data?: string }`
- Failure: `{ success: false, error: string }`

## Environment Configuration

**Required Environment Variables:**
- None - application is fully self-contained

**Development Environment:**
- `NODE_ENV` checked in `electron/main.ts` (line 8) to determine dev vs production mode
- Dev mode loads URL from Vite dev server: `http://localhost:5173`
- Production mode loads bundled HTML from `dist/index.html`

**Configuration Files:**
- No `.env` or environment configuration files in repository
- Settings stored in map file header metadata (game rules, objectives, etc.)

## Webhooks & Callbacks

**Incoming Webhooks:**
- None

**Outgoing Webhooks:**
- None

## Assets

**Required Assets:**
- Tileset image: `assets/tileset.png` or `assets/tileset.bmp` (640px width, 40 tiles/row)
- Fallback behavior: PNG attempted first, then BMP, with warning if neither found

---

*Integration audit: 2026-02-01*
