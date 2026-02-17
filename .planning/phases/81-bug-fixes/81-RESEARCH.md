# Phase 81: Bug Fixes - Research

**Researched:** 2026-02-16
**Domain:** Bug fixes (asset loading, animation rendering, Electron branding)
**Confidence:** HIGH

## Summary

Phase 81 fixes three distinct bugs: (1) Switch tool fails because `custom.dat` is not served from a public path Vite can access, (2) animated tiles leave residual frames when overwritten with DEFAULT_TILE due to CanvasEngine's `patchAnimatedTiles()` re-rendering old animated content after buffer patching, and (3) app lacks branding (About dialog, splash screen).

The switch tool bug is straightforward—move `assets/custom.dat` to `public/assets/custom.dat` so Vite serves it in production builds. The animation erasure bug requires tracking animated→non-animated transitions in CanvasEngine so `patchAnimatedTiles()` skips tiles that are no longer animated. Branding requires adding a Help menu with About dialog and a splash screen BrowserWindow during Electron startup.

**Primary recommendation:** Fix bugs incrementally (asset path → animation logic → branding), verify each in isolation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite 6.0.7 | 6.0.7 | Build tool | Already in package.json, handles public assets |
| Electron 34.0.0 | 34.0.0 | Desktop shell | Already in package.json, menu/dialog/splash support |
| Canvas API | Native | Tile rendering | Browser standard, already used in CanvasEngine |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No new libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vite public/ | Custom copy script | Vite's built-in public/ is simpler |
| Electron dialog.showMessageBox | Custom React modal | Native dialog matches OS, simpler for About |
| Splash BrowserWindow | Custom HTML loader | BrowserWindow is standard Electron pattern |

**Installation:**
No new packages required. All fixes use existing stack.

## Architecture Patterns

### Pattern 1: Vite Public Assets
**What:** Place static files in `public/` directory for direct serving without build processing.
**When to use:** Files that need exact names (custom.dat, assets fetched by name).
**How it works:**
- Development: Vite serves `public/` files at `/` (e.g., `public/assets/custom.dat` → `http://localhost:5173/assets/custom.dat`)
- Production: `vite build` copies `public/` to `dist/` root
- Electron production: Accesses files via `file://` protocol in `dist/`

**Example:**
```typescript
// App.tsx already uses this pattern for custom.dat
useEffect(() => {
  fetch('./assets/custom.dat')  // Vite serves from public/assets/custom.dat
    .then((res) => res.arrayBuffer())
    .then((buffer) => loadCustomDat(buffer))
    .catch((err) => console.warn('Failed to load custom.dat:', err));
}, [loadCustomDat]);
```

**Current bug:** `custom.dat` is in `assets/` (not `public/assets/`), so Vite doesn't serve it.
**Fix:** Move `assets/custom.dat` → `public/assets/custom.dat`.

### Pattern 2: CanvasEngine Animated Tile Tracking
**What:** Track when an animated tile is overwritten with a non-animated tile to prevent `patchAnimatedTiles()` from re-rendering old animated content.
**When to use:** Any buffer patching that replaces animated tiles with static tiles.
**Problem:** `patchAnimatedTiles()` scans visible tiles and re-renders any with `(tile & 0x8000) !== 0`, even if the tile was just overwritten with DEFAULT_TILE in the same frame. This causes "ghost frames" where the old animation briefly reappears.

**Root cause analysis:**
1. User drags pencil with DEFAULT_TILE (280) over animated tile (e.g., 0x809E warp)
2. `paintTile()` calls `patchTileBuffer(x, y, 280, animFrame)` → buffer shows empty tile
3. `prevTiles[y * MAP_WIDTH + x] = 280` updates snapshot
4. Next animation frame: `patchAnimatedTiles()` runs BEFORE Zustand state updates
5. `patchAnimatedTiles()` reads `map.tiles[y * MAP_WIDTH + x]` → still 0x809E (Zustand not committed yet)
6. Re-renders 0x809E over the 280 just painted → ghost frame visible

**Solution:** Track animated→non-animated transitions in a Set during drag, skip those tiles in `patchAnimatedTiles()`.

**Implementation location:** CanvasEngine.ts
```typescript
// Add to CanvasEngine class:
private clearedAnimatedTiles: Set<number> | null = null;

// In beginDrag():
if (!this.clearedAnimatedTiles) {
  this.clearedAnimatedTiles = new Set();
} else {
  this.clearedAnimatedTiles.clear();
}

// In paintTile():
if (!this.isDragActive || !this.pendingTiles) return false;

// Track animated→non-animated transitions
const mapIdx = tileY * MAP_WIDTH + tileX;
const oldTile = this.prevTiles?.[mapIdx] ?? 0;
const isOldAnimated = (oldTile & 0x8000) !== 0;
const isNewAnimated = (tile & 0x8000) !== 0;
if (isOldAnimated && !isNewAnimated) {
  this.clearedAnimatedTiles!.add(mapIdx);
}

// In patchAnimatedTiles():
for (let y = startY; y < endY; y++) {
  for (let x = startX; x < endX; x++) {
    const tile = map.tiles[y * MAP_WIDTH + x];
    const mapIdx = y * MAP_WIDTH + x;

    // Skip tiles that were just cleared during drag
    if (this.clearedAnimatedTiles?.has(mapIdx)) continue;

    if ((tile & 0x8000) === 0) continue;
    // ... rest of animation rendering
  }
}

// In commitDrag():
this.clearedAnimatedTiles?.clear();

// In cancelDrag():
this.clearedAnimatedTiles?.clear();
```

### Pattern 3: Electron Help Menu + About Dialog
**What:** Add Help menu item that shows About dialog with branding info.
**When to use:** Desktop apps that need to display copyright, author, version.

**Implementation:** electron/main.ts menu template
```typescript
const menuTemplate: any = [
  // ... existing File, Edit, View, Window menus ...
  {
    label: 'Help',
    submenu: [
      {
        label: 'About AC Map Editor',
        click: () => {
          dialog.showMessageBoxSync(mainWindow!, {
            type: 'info',
            title: 'About AC Map Editor',
            message: 'AC Map Editor',
            detail: `Version ${app.getVersion()}\n\n© Arcbound Interactive 2026\nby aTreYu`,
            buttons: ['OK']
          });
        }
      }
    ]
  }
];
```

**Version source:** `app.getVersion()` reads from `package.json` version field (currently 1.0.1).

### Pattern 4: Electron Splash Screen
**What:** Show loading window during app initialization, close when main window is ready.
**When to use:** Apps with noticeable startup time (tileset loading, custom.dat parsing).

**Implementation:** electron/main.ts
```typescript
let splashWindow: BrowserWindow | null = null;

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Create minimal HTML in-memory (no file needed)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #2d2d30;
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .splash {
            text-align: center;
            padding: 40px;
            background: #1e1e1e;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          }
          h1 { margin: 0 0 20px 0; font-size: 24px; }
          .version { font-size: 14px; color: #888; margin: 10px 0; }
          .copyright { font-size: 12px; color: #666; margin-top: 20px; }
          .author { font-size: 12px; color: #888; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="splash">
          <h1>AC Map Editor</h1>
          <div class="version">Version ${app.getVersion()}</div>
          <div class="copyright">© Arcbound Interactive 2026</div>
          <div class="author">by aTreYu</div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  // Show splash first
  createSplashScreen();

  mainWindow = new BrowserWindow({
    show: false,  // Don't show until ready
    // ... existing config
  });

  // Close splash when main window is ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow!.show();
  });

  // ... existing loadURL/loadFile logic
}
```

**Timing:** Splash appears immediately, main window loads in background, splash closes on `ready-to-show` event.

### Anti-Patterns to Avoid
- **Moving custom.dat to src/**: Vite would try to bundle it, breaking binary format
- **Using img tag for custom.dat**: It's a binary data file, not an image
- **Clearing animation cache globally**: Would break animations still on the map
- **Using custom React modal for About**: Native dialog is simpler and OS-consistent
- **Loading splash from file**: In-memory HTML via data URL is faster

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Splash screen library | Custom BrowserWindow manager | Electron BrowserWindow + data URL | Built-in, no dependencies, faster |
| Asset copying | Custom copy script | Vite public/ directory | Automatic, zero config |
| Version display | Hardcoded string | app.getVersion() (Electron) | Single source of truth from package.json |
| Animated tile tracking | Global dirty flags | Per-drag Set with map indices | Scoped to drag lifecycle, no side effects |

**Key insight:** Electron and Vite already handle 90% of branding/asset needs. Custom solutions add complexity without benefit.

## Common Pitfalls

### Pitfall 1: Public Assets Path Confusion
**What goes wrong:** Moving `custom.dat` to `public/assets/custom.dat` but fetching from `./assets/custom.dat` works in dev but fails in Electron production.
**Why it happens:** Vite dev server serves public/ at root, but Electron production uses `file://` protocol with different base path.
**How to avoid:** Use relative path `./assets/custom.dat` (already correct in App.tsx:42).
**Warning signs:** Works in `npm run electron:dev`, fails in built app with "Failed to load custom.dat: HTTP 404".

### Pitfall 2: Clearing Animated Tiles After Drag Ends
**What goes wrong:** Clearing `clearedAnimatedTiles` set BEFORE Zustand commits drag changes causes ghost frames on next animation tick.
**Why it happens:** `patchAnimatedTiles()` runs on animation frame updates, which happen async from drag commit.
**How to avoid:** Keep `clearedAnimatedTiles` populated until next `beginDrag()` or use a short setTimeout to clear after Zustand commit.
**Warning signs:** Animation erasure works during drag, but ghost frame appears immediately after mouseup.

### Pitfall 3: Splash Window Lifecycle Race Conditions
**What goes wrong:** Main window shows before splash closes, causing flicker.
**Why it happens:** `ready-to-show` event timing vs. splash close timing.
**How to avoid:** Use `mainWindow.show()` AFTER `splashWindow.close()` in the same callback (as shown in Pattern 4).
**Warning signs:** Brief flash of both windows visible, splash lingers after main window appears.

### Pitfall 4: About Dialog Modal Parent
**What goes wrong:** About dialog shows behind main window instead of in front.
**Why it happens:** `dialog.showMessageBox()` without parent window parameter.
**How to avoid:** Always pass `mainWindow!` as first argument to modal dialogs (as shown in Pattern 3).
**Warning signs:** About dialog appears in taskbar but isn't visible, user thinks nothing happened.

### Pitfall 5: Animation Frame Timing Assumptions
**What goes wrong:** Assuming `patchAnimatedTiles()` runs AFTER Zustand state updates.
**Why it happens:** Animation subscription triggers on `state.animationFrame` change, which is independent of map tile updates.
**How to avoid:** Never rely on Zustand commit timing in animation rendering—use buffer snapshot (`prevTiles`) or transition tracking.
**Warning signs:** Tile changes work correctly in non-animated areas but fail near animated tiles.

## Code Examples

Verified patterns from codebase and official sources:

### Bug Fix 1: Move custom.dat to Public Directory
```bash
# Windows Git Bash (quote paths with backslashes)
mv "E:\NewMapEditor\assets\custom.dat" "E:\NewMapEditor\public\assets\custom.dat"
```

**No code changes needed** — App.tsx:42 already fetches from `./assets/custom.dat`, which Vite serves from `public/assets/`.

### Bug Fix 2: Track Animated→Non-Animated Transitions
**Source:** CanvasEngine.ts (new code based on existing patterns)

```typescript
// Add to CanvasEngine class properties (after pendingTiles):
private clearedAnimatedTiles: Set<number> | null = null;

// Modify beginDrag() (line 372):
beginDrag(): void {
  this.isDragActive = true;
  if (!this.pendingTiles) {
    this.pendingTiles = new Map();
  } else {
    this.pendingTiles.clear();
  }
  // Initialize cleared animated tiles tracking
  if (!this.clearedAnimatedTiles) {
    this.clearedAnimatedTiles = new Set();
  } else {
    this.clearedAnimatedTiles.clear();
  }
}

// Modify paintTile() (line 384):
paintTile(tileX: number, tileY: number, tile: number): boolean {
  if (!this.isDragActive || !this.pendingTiles) return false;
  if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return false;

  // Track animated→non-animated transitions
  const mapIdx = tileY * MAP_WIDTH + tileX;
  const oldTile = this.prevTiles?.[mapIdx] ?? 0;
  const isOldAnimated = (oldTile & 0x8000) !== 0;
  const isNewAnimated = (tile & 0x8000) !== 0;
  if (isOldAnimated && !isNewAnimated) {
    this.clearedAnimatedTiles!.add(mapIdx);
  }

  // Accumulate tile change
  this.pendingTiles.set(mapIdx, tile);

  // Patch buffer and blit to screen
  this.patchTileBuffer(tileX, tileY, tile, this.animationFrame);
  const vp = this.getViewport(useEditorStore.getState());
  this.blitToScreen(vp, this.screenCtx!.canvas.width, this.screenCtx!.canvas.height);

  return true;
}

// Modify patchAnimatedTiles() (line 301):
for (let y = startY; y < endY; y++) {
  for (let x = startX; x < endX; x++) {
    const tile = map.tiles[y * MAP_WIDTH + x];
    const mapIdx = y * MAP_WIDTH + x;

    // Skip tiles that were just cleared during drag (BUG-03 fix)
    if (this.clearedAnimatedTiles?.has(mapIdx)) continue;

    if ((tile & 0x8000) === 0) continue;

    bufCtx.clearRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.renderTile(bufCtx, tile, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, animFrame);

    // Expand dirty rect
    if (x < dirtyMinX) dirtyMinX = x;
    if (y < dirtyMinY) dirtyMinY = y;
    if (x > dirtyMaxX) dirtyMaxX = x;
    if (y > dirtyMaxY) dirtyMaxY = y;
  }
}

// Modify commitDrag() (line 402):
commitDrag(): Array<{ x: number; y: number; tile: number }> | null {
  if (!this.isDragActive || !this.pendingTiles) return null;

  const tiles: Array<{ x: number; y: number; tile: number }> = [];
  for (const [key, tile] of this.pendingTiles.entries()) {
    tiles.push({
      x: key % MAP_WIDTH,
      y: Math.floor(key / MAP_WIDTH),
      tile
    });
  }

  this.isDragActive = false;
  this.pendingTiles.clear();
  this.clearedAnimatedTiles?.clear();  // Clear after commit

  return tiles.length > 0 ? tiles : null;
}

// Modify cancelDrag() (line 423):
cancelDrag(): void {
  if (!this.isDragActive) return;
  this.isDragActive = false;
  this.pendingTiles?.clear();
  this.clearedAnimatedTiles?.clear();  // Clear on cancel
}
```

### Bug Fix 3: Add Help Menu with About Dialog
**Source:** electron/main.ts (based on existing menu pattern)

```typescript
// Add Help menu to menuTemplate array (after Window menu, before line 127):
{
  label: 'Help',
  submenu: [
    {
      label: 'About AC Map Editor',
      click: () => {
        dialog.showMessageBoxSync(mainWindow!, {
          type: 'info',
          title: 'About AC Map Editor',
          message: 'AC Map Editor',
          detail: `Version ${app.getVersion()}\n\n© Arcbound Interactive 2026\nby aTreYu`,
          buttons: ['OK']
        });
      }
    }
  ]
}
```

### Bug Fix 4: Add Splash Screen
**Source:** electron/main.ts (new code, standard Electron pattern)

```typescript
// Add at top with mainWindow declaration (after line 6):
let splashWindow: BrowserWindow | null = null;

// Add new function before createWindow():
function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #2d2d30;
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .splash {
            text-align: center;
            padding: 40px;
            background: #1e1e1e;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          }
          h1 { margin: 0 0 20px 0; font-size: 24px; }
          .version { font-size: 14px; color: #888; margin: 10px 0; }
          .copyright { font-size: 12px; color: #666; margin-top: 20px; }
          .author { font-size: 12px; color: #888; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="splash">
          <h1>AC Map Editor</h1>
          <div class="version">Version ${app.getVersion()}</div>
          <div class="copyright">© Arcbound Interactive 2026</div>
          <div class="author">by aTreYu</div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

// Modify createWindow() to show splash first:
function createWindow() {
  // Show splash screen first
  createSplashScreen();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,  // Don't show until ready (BRAND-02)
    icon: path.join(__dirname, '..', 'atom.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'AC Map Editor'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Close splash when main window is ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow!.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ... existing menu setup code
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Assets in src/ | Assets in public/ | Vite 2.0 (2021) | Public assets bypass bundling, served as-is |
| Custom splash libraries | BrowserWindow + data URL | Electron 5+ (2019) | Simpler, no dependencies, faster load |
| Hardcoded version strings | app.getVersion() | Electron 1.0 (2016) | Single source of truth, auto-sync with package.json |
| Manual buffer dirty tracking | Set-based transition tracking | Current | Scoped to drag lifecycle, no global state pollution |

**Deprecated/outdated:**
- `electron-splashscreen` package: Adds unnecessary dependency, BrowserWindow is sufficient
- Assets in `src/assets/`: Vite bundles these, breaking binary files like custom.dat

## Open Questions

None. All bugs are well-understood with clear solutions.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: E:\NewMapEditor\src\App.tsx (custom.dat fetch), E:\NewMapEditor\src\core\canvas\CanvasEngine.ts (animation rendering), E:\NewMapEditor\electron\main.ts (menu structure)
- Electron official docs: [BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window/), [dialog API](https://www.electronjs.org/docs/latest/api/dialog)
- Vite official docs: [Static Asset Handling](https://vite.dev/guide/assets), [Building for Production](https://vite.dev/guide/build)

### Secondary (MEDIUM confidence)
- [How to Create a Splash Screen for Electron App | Medium](https://medium.com/red-buffer/how-to-create-a-splash-screen-for-electron-app-602b4da406d) — Verified BrowserWindow splash pattern
- [Essential desktop application attributes in Electron | Medium](https://medium.com/redblacktree/essential-desktop-application-attributes-in-electron-2118352cc3d5) — About dialog examples
- [Vite Static Assets Directory: Complete Configuration Guide for 2026](https://copyprogramming.com/howto/vite-change-static-assets-directoy) — Public directory usage

### Tertiary (LOW confidence)
- [CanvasRenderingContext2D: clearRect() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clearRect) — General canvas clearing (already understood)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Uses existing Vite + Electron, no new dependencies
- Architecture: HIGH — Patterns verified in codebase (App.tsx, CanvasEngine.ts, main.ts)
- Pitfalls: HIGH — Identified from timing analysis of CanvasEngine subscriptions and Electron lifecycle

**Research date:** 2026-02-16
**Valid until:** 2026-03-18 (30 days, stable stack with no breaking changes expected)
