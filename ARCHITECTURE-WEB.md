# AC Map Editor — Cross-Platform Browser Architecture

> Deep analysis & implementation plan for making AC Map Editor a world-class browser-native editor
> with full desktop accuracy AND touch/tablet/phone support.

---

## PHASE 1: DEEP ANALYSIS

### 1.1 Current Architecture (Electron)

**Stack**: React 18 + TypeScript + Zustand + Canvas2D + Electron 34 + Vite 6

**Rendering Architecture** (4-canvas layer system):
- **Map Layer** (`CanvasEngine`): 4096×4096 offscreen buffer at native resolution. Full map pre-rendered. Tile edits patch only changed tiles (incremental). Viewport changes = single `drawImage` blit. Animated tiles patched per-frame in visible area only (dirty-rect blit).
- **Grid Layer**: Dedicated canvas with pattern-based grid rendering. Cached `CanvasPattern` recreated only on zoom/setting changes.
- **UI Layer**: Cursor highlights, selection rectangles, tool previews (line, rect, paste, ruler, game object stamps), conveyor/bunker/bridge live previews. Redrawn on every cursor move via RAF-debounced dirty flag.
- **Text Layer**: DPI-scaled canvas for crisp floating labels (dimensions, ruler measurements).

**State Management** (Zustand slices):
- `documentsSlice`: Multi-document model (max 8). Each document owns: map (`Uint16Array[65536]`), viewport, selection, undo/redo stacks, paste state.
- `globalSlice`: Current tool, selected tile, tile selection (multi-tile stamp), grid settings, animation frame, game object tool state (team, warp routing, turret config, bunker/bridge/conveyor direction).
- `windowSlice`: MDI window positions, z-order, minimized state.
- Backward-compatible layer syncs active document fields to top-level state.

**Tool System** (22 tools):
| Category | Tools |
|----------|-------|
| Drawing | Pencil (single + multi-tile stamp), Fill (flood), Line (Bresenham), Picker |
| Selection | Select (drag-to-rect, move-drag), Copy/Cut/Paste (floating preview) |
| Walls | Wall Line, Wall Pencil (freehand + auto-connect), Wall Rect |
| Game Objects (click) | Flag, Flag Pole, Spawn (static 3×3 / animated 1×1), Switch, Warp (5 encoded types + animated 3×3), Turret |
| Game Objects (drag-rect) | Bunker (4 styles × 4 dirs), Holding Pen, Bridge (LR/UD), Conveyor (4 dirs) |
| Measurement | Ruler (4 modes: Line, Rectangle, Radius, Path with waypoints) |
| Transform | Mirror, Rotate (content-aware with wall reconnection) |

**Undo/Redo**: Snapshot-based (`Uint16Array` clone before operation). `pushUndo()` captures pending snapshot, `commitUndo(description)` finalizes. Pencil tool uses engine-level drag batching: `beginDrag()` → accumulate tile changes in `Map<index, tile>` → `commitDrag()` returns batch → single `setTiles()` + `commitUndo()`.

**File I/O**: SubSpace/Continuum binary `.map` format (v1/v2/v3). zlib compression via `pako`. Map header with game settings, 65536 tile `Uint16Array`, flag pole data.

**Input Handling**: All mouse events (`onMouseDown/Move/Up/Wheel/Leave/ContextMenu`) on the UI canvas layer. Pan via middle-click, right-click, or Alt+click. Zoom via wheel (cursor-anchored). Tool dispatch in `handleMouseDown` based on `currentTool` enum.

---

### 1.2 Current Web Build Status

**What works**: The web build (`vite.config.web.ts` → `dist-web/`) successfully runs the full React app in-browser. `WebFileService` handles open/save via File System Access API (Chrome/Edge) with `<input type="file">` fallback. `WebElectronShim` stubs `window.electronAPI` for patch folder loading, image dialogs, clipboard, and save confirmation.

**What's broken or degraded on desktop web**:

| Issue | Severity | Details |
|-------|----------|---------|
| No Electron menu bar | Medium | Keyboard shortcuts work (ToolBar handles them), but menu bar actions (New, Open, Save, Undo, Export, Theme, Window > Arrange) are gone |
| `getPatchesDir()` returns null | Low | Web fallback loads from `./assets/patches/` URL — works but limited to bundled patches |
| Auto-updater no-ops | None | Expected — web deploys via FileZilla |
| `confirmSave()` uses `window.confirm` | Low | Loses 3-way Yes/No/Cancel — only Yes/No |
| No MDI window chrome | Medium | Electron-style title bars, window controls, drag-to-rearrange depend on Electron windowing |
| `writeFile` falls back to download | Medium | Can't "Save" to same file on Firefox/Safari — always triggers download |

**What's completely missing for touch/mobile**:

| Gap | Impact |
|-----|--------|
| **Zero touch event handling** | All input is `React.MouseEvent` — no `PointerEvent`, no touch, no stylus |
| **No pinch-to-zoom** | Only `wheel` event handles zoom |
| **No two-finger pan** | Pan requires middle-click or right-click (impossible on touch) |
| **No gesture-based undo** | Undo/redo only via keyboard shortcuts (Ctrl+Z/Y) |
| **Fixed desktop layout** | `PanelGroup` with resize handles — unusable on phones |
| **No touch-sized hit targets** | Toolbar icons are 16px, panels assume mouse precision |
| **Hover-dependent previews** | Tile cursor highlight, stamp preview, paste preview all depend on `mousemove` hover |
| **Right-click context menu** | No long-press equivalent |
| **No responsive breakpoints** | Fixed layout at any viewport size |
| **No PWA/offline support** | No service worker, no IndexedDB persistence, no manifest |

---

### 1.3 Feature Parity Matrix

| Feature | Electron | Web (Desktop) | Web (Touch) | Priority |
|---------|----------|--------------|-------------|----------|
| Pencil (single tile) | ✅ | ✅ | ❌ No pointer events | P0 |
| Pencil (multi-tile stamp) | ✅ | ✅ | ❌ | P0 |
| Fill (flood) | ✅ | ✅ | ❌ | P0 |
| Line tool | ✅ | ✅ | ❌ | P1 |
| Picker | ✅ | ✅ | ❌ | P0 |
| Select + move | ✅ | ✅ | ❌ | P0 |
| Copy/Cut/Paste | ✅ | ✅ | ❌ | P1 |
| Wall tools (3) | ✅ | ✅ | ❌ | P1 |
| Game objects (10) | ✅ | ✅ | ❌ | P2 |
| Ruler (4 modes) | ✅ | ✅ | ❌ | P2 |
| Mirror/Rotate | ✅ | ✅ | ❌ | P2 |
| Pan (middle/right/alt click) | ✅ | ✅ | ❌ | P0 |
| Zoom (wheel, cursor-anchored) | ✅ | ✅ | ❌ | P0 |
| Grid overlay | ✅ | ✅ | ✅ (visual only) | P0 |
| Undo/Redo | ✅ | ✅ (keyboard) | ❌ | P0 |
| Multi-document tabs | ✅ | ✅ | ❌ (layout) | P2 |
| Map settings dialog | ✅ | ✅ | ❌ (layout) | P2 |
| Tileset panel | ✅ | ✅ | ❌ (layout) | P0 |
| Minimap | ✅ | ✅ | ❌ (layout) | P1 |
| Status bar | ✅ | ✅ | ❌ (layout) | P1 |
| Open/Save files | ✅ | ⚠️ (FSAA + fallback) | ⚠️ | P0 |
| Patch folder loading | ✅ | ⚠️ (bundled only) | ⚠️ | P1 |
| Overview export | ✅ | ✅ | ❌ (layout) | P2 |
| Theme system | ✅ | ✅ | ✅ | P3 |
| Keyboard shortcuts | ✅ | ✅ | N/A | P0 |
| Auto-save / crash recovery | ❌ | ❌ | ❌ | P1 |
| Offline / PWA | N/A | ❌ | ❌ | P2 |

---

## PHASE 2: ARCHITECTURE DESIGN

### 2.1 Input Abstraction Layer

**Goal**: A unified pointer system that normalizes mouse, touch, pen/stylus, and keyboard into a single event model. The system must disambiguate tool actions from navigation gestures in real-time.

#### 2.1.1 Pointer Event Migration

Replace all `React.MouseEvent` handlers with `PointerEvent` handlers:

```
Before: onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
After:  onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
```

Key changes:
- Use `setPointerCapture(e.pointerId)` on pointerdown for reliable drag tracking (events continue even when pointer leaves canvas bounds).
- Track active pointers in a `Map<pointerId, PointerState>` for multi-touch handling.
- Check `e.pointerType` ('mouse' | 'touch' | 'pen') for input-type-specific behavior.

#### 2.1.2 Gesture State Machine

```
┌─────────┐
│  IDLE   │ ← All pointers up
└────┬────┘
     │ pointerdown (1st pointer)
     ▼
┌──────────────┐
│ SINGLE_DOWN  │ ← 1 pointer active, tool not yet committed
│ (50ms grace) │   If 2nd pointer arrives within grace → NAVIGATING
└──────┬───────┘
       │ grace period expires OR pointermove > 4px threshold
       ▼
┌─────────────┐     pointerdown (2nd pointer)     ┌────────────┐
│ TOOL_ACTIVE │ ─────────────────────────────────► │ NAVIGATING │
│ (1 pointer) │   cancel in-progress tool action   │ (2+ ptrs)  │
└──────┬──────┘                                    └─────┬──────┘
       │ pointerup                                       │ all pointers up
       ▼                                                 ▼
┌──────────┐                                      ┌──────────┐
│ TOOL_END │ commit action                        │ NAV_END  │ commit viewport
└──────────┘                                      └──────────┘
```

**Gesture recognition rules**:
- **1 pointer + move > threshold** → dispatch to current tool (pencil paint, select drag, line drag, etc.)
- **2 pointers** → PAN (midpoint drag) + ZOOM (distance change between pointers)
- **2-pointer tap** (< 300ms, < 15px movement) → UNDO
- **3-pointer tap** → REDO
- **1 pointer + `pointerType === 'pen'`** → always tool action (pen mode auto-detection)
- **Long-press** (500ms hold, < 10px movement) → context menu / picker tool
- **`e.button === 1` (middle) or `e.button === 2` (right)** → PAN (desktop mouse)
- **Alt+click** → PAN (desktop keyboard modifier)
- **Wheel** → ZOOM (cursor-anchored, desktop)

**Transition from 1→2 pointers during tool action**:
When a second pointer lands while a tool action is in progress:
1. Cancel the in-progress tool action (discard pending tiles, revert line state, etc.)
2. Switch to NAVIGATING state
3. Remaining single pointer after second lifts = continue as PAN (not new tool action)
4. All pointers must lift to return to IDLE

#### 2.1.3 Pen/Stylus Mode

When `pointerType === 'pen'` is first detected:
- Auto-enter pen mode (visual indicator in toolbar)
- In pen mode: `pointerType === 'touch'` events are **ignored for tool actions** (palm rejection)
- Two-finger pan/zoom still works (check touch count, not pointer type)
- Manual toggle button to exit pen mode

#### 2.1.4 Implementation Plan

New file: `src/core/input/PointerManager.ts`
```typescript
interface PointerState {
  id: number;
  type: 'mouse' | 'touch' | 'pen';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  button: number;
}

enum GestureState {
  IDLE,
  SINGLE_DOWN,   // grace period for 2nd pointer
  TOOL_ACTIVE,   // committed to tool action
  NAVIGATING,    // 2+ pointers, pan/zoom
}

class PointerManager {
  private pointers = new Map<number, PointerState>();
  private state: GestureState = GestureState.IDLE;
  private graceTimeout: number | null = null;
  private penDetected = false;
  private penModeActive = false;

  // Callbacks
  onToolDown: (x: number, y: number, pointerType: string) => void;
  onToolMove: (x: number, y: number) => void;
  onToolUp: () => void;
  onToolCancel: () => void;
  onPanStart: () => void;
  onPanMove: (dx: number, dy: number) => void;
  onPanEnd: () => void;
  onZoom: (centerX: number, centerY: number, scaleDelta: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onLongPress: (x: number, y: number) => void;
  onHover: (x: number, y: number) => void;
}
```

This class encapsulates ALL pointer disambiguation. MapCanvas calls `pointerManager.handlePointerDown/Move/Up()` and receives clean, disambiguated callbacks.

---

### 2.2 Adaptive UI Layout

**Not just responsive CSS** — genuinely different interaction paradigms per device class.

#### 2.2.1 Device Detection Strategy

```typescript
type DeviceClass = 'desktop' | 'tablet' | 'phone';

function detectDeviceClass(): DeviceClass {
  const width = window.innerWidth;
  const hasCoarsePointer = matchMedia('(pointer: coarse)').matches;
  const hasFinePointer = matchMedia('(pointer: fine)').matches;

  if (width >= 1024 && hasFinePointer) return 'desktop';
  if (width >= 600) return 'tablet';
  return 'phone';
}
```

#### 2.2.2 Layout Per Device Class

**Desktop** (current layout, enhanced):
```
┌──────────────────────────────────────────┐
│ ToolBar (full, all tools + shortcuts)    │
├──────────────────────────────┬───────────┤
│                              │ Right     │
│    Canvas (Workspace)        │ Sidebar   │
│    + Minimap overlay         │ (optional)│
│                              │           │
├──────────────────────────────┤           │
│ Tileset Panel (resizable)    │           │
├──────────────────────────────┴───────────┤
│ Status Bar                               │
└──────────────────────────────────────────┘
```
- Keep `react-resizable-panels` for desktop
- Full keyboard shortcuts
- Hover previews (cursor highlight, stamp preview)
- All 22 tools visible in toolbar

**Tablet** (landscape, 600-1024px):
```
┌──────────────────────────────────────────┐
│                                          │
│         Canvas (maximized)               │
│         + Minimap overlay (top-right)    │
│         + Zoom controls (bottom-right)   │
│                                          │
├──────────────────────────────────────────┤
│ ┌─── Floating Toolbar (draggable) ────┐ │
│ │ Pencil Fill Select Wall... ▼More    │ │
│ └─────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│ ┌─── Tile Palette (bottom sheet) ─────┐ │
│ │ ▬ drag handle                       │ │
│ │ [selected tile preview] [tile grid] │ │
│ └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```
- Floating toolbar (position persisted)
- Tile palette as bottom sheet (collapsed = thin header, expanded = tile grid)
- Touch targets minimum 44×44px
- Gesture-based navigation (2-finger pan/zoom)
- Long-press = picker tool

**Phone** (portrait, <600px):
```
┌──────────────────────────┐
│ ┌──── Compact header ──┐ │
│ │ ☰  [tile]  ↩ ↪ ⚙    │ │
│ └──────────────────────┘ │
│                          │
│     Canvas (fullscreen)  │
│                          │
│                          │
├──────────────────────────┤
│ ┌── Bottom tool strip ─┐ │
│ │ ✏ 🪣 ◻ 🧱 ⫶ ...    │ │
│ └──────────────────────┘ │
│ ┌── Tile sheet ────────┐ │
│ │ ▬ (swipe up to show) │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```
- Minimal persistent UI — canvas first
- Bottom tool strip (horizontal scroll)
- Tile palette = bottom sheet (swipe up)
- Hamburger menu for file operations
- Undo/redo buttons in header
- Auto-hide UI after 3s inactivity (tap to restore)

#### 2.2.3 Bottom Sheet Component

New: `src/components/BottomSheet/BottomSheet.tsx`
- Three states: collapsed (48px header), half-expanded (40vh), full-expanded (80vh)
- Drag handle with touch gesture to resize
- Backdrop tap to collapse
- Spring animation on release (snap to nearest state)
- CSS `env(safe-area-inset-bottom)` for notch-safe layout

#### 2.2.4 Floating Toolbar Component

New: `src/components/FloatingToolbar/FloatingToolbar.tsx`
- Draggable (constrained to viewport)
- Compact: shows 6-8 primary tools + "More" overflow
- Tool groups in the overflow expand into a popup grid
- Remembers position in localStorage

---

### 2.3 Canvas Rendering Strategy

**Recommendation: Keep Canvas2D.** The current 4096×4096 buffer + single-blit architecture is already excellent. Canvas2D `drawImage` for tile atlas rendering is hardware-accelerated in all modern browsers. WebGL would add complexity without meaningful performance gain for a 256×256 tile grid.

#### 2.3.1 Enhancements

**devicePixelRatio handling** for HiDPI/Retina:
```typescript
function resizeCanvas(canvas: HTMLCanvasElement, container: HTMLElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext('2d');
  ctx?.scale(dpr, dpr);
}
```
Currently MapCanvas uses `ResizeObserver` but doesn't account for DPR. This causes blurry rendering on Retina displays.

**OffscreenCanvas for initial full-buffer build** (progressive enhancement):
```typescript
if (typeof OffscreenCanvas !== 'undefined') {
  // Build 4096×4096 buffer in web worker (non-blocking)
  const worker = new Worker('./tile-renderer-worker.js');
  worker.postMessage({ tiles: map.tiles, tileset: tilesetBitmap });
} else {
  // Fallback: build on main thread (current behavior)
  engine.drawMapLayer(map, viewport, animFrame);
}
```
The initial full-buffer build (65536 tiles) can take 20-50ms on slower devices. Moving it to a worker prevents UI jank during map open. Incremental patches and blits stay on main thread (they're already fast enough).

**Tile culling for animated tile updates**: The current `patchAnimatedTiles()` already culls to visible area — this is correct and efficient.

#### 2.3.2 Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Full buffer build | < 50ms | ~30ms | Acceptable |
| Incremental patch (1 tile) | < 1ms | < 1ms | ✅ |
| Blit to screen | < 2ms | ~1ms | ✅ |
| UI overlay redraw | < 4ms | ~2ms | ✅ |
| Input-to-paint latency | < 16ms | ~8ms | ✅ |
| Pan/zoom (touch) | 60fps | N/A | Must achieve |
| Pinch-zoom | 60fps | N/A | Must achieve |

---

### 2.4 State Management Enhancements

The current Zustand architecture is well-suited for the web editor. Key additions:

#### 2.4.1 Undo/Redo Improvements

**Operation coalescing**: The pencil tool already coalesces via engine drag batching. Extend this pattern to wall pencil (currently does per-tile Zustand updates during drag):

```typescript
// Wall pencil should also use batch pattern:
// beginDrag() → accumulate wall placements → commitDrag() → single setTiles() + commitUndo()
```

**Memory optimization**: Current snapshot approach stores full `Uint16Array(65536)` = 128KB per undo step. For large undo stacks (50+ steps), this is 6.4MB. Consider diff-based storage:

```typescript
interface UndoDiff {
  description: string;
  changes: Array<{ index: number; oldTile: number; newTile: number }>;
}
```
A typical paint stroke changes 10-100 tiles = ~1.2KB vs 128KB. 100× memory reduction.

#### 2.4.2 Auto-Save via IndexedDB

New: `src/core/persistence/AutoSave.ts`
```typescript
class AutoSave {
  private db: IDBDatabase;
  private saveTimeout: number | null = null;

  schedule(mapData: MapData) {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(mapData), 500);
  }

  async save(mapData: MapData) {
    const tx = this.db.transaction('autosave', 'readwrite');
    tx.objectStore('autosave').put({
      key: 'current',
      tiles: mapData.tiles.buffer,
      header: JSON.stringify(mapData.header),
      timestamp: Date.now()
    });
  }

  async recover(): Promise<MapData | null> { ... }
}
```

Subscribe to Zustand store changes → debounced auto-save. On startup, check for recovery data and prompt user.

---

### 2.5 File I/O Strategy

#### 2.5.1 Desktop Browsers (Chrome/Edge)

Already implemented via `WebFileService`:
- `showOpenFilePicker()` / `showSaveFilePicker()` for native file dialogs
- File handle persistence for "Save" (re-save to same file)
- Works well. No changes needed.

#### 2.5.2 Mobile Browsers & Firefox/Safari

- **Open**: `<input type="file">` fallback (current, works)
- **Save**: Download trigger (current, works but UX is "download" not "save")
- **Enhancement**: Use Share API on mobile for export:
```typescript
if (navigator.share && navigator.canShare) {
  const file = new File([mapData], 'map.map', { type: 'application/octet-stream' });
  await navigator.share({ files: [file], title: 'AC Map' });
}
```

#### 2.5.3 IndexedDB Map Storage

For the web version, maps can be stored locally in IndexedDB (not just auto-save, but as a "Recent Maps" feature):
- Save to IndexedDB on every manual save
- "Recent Maps" list in file menu
- One-click to re-open without file picker

#### 2.5.4 Clipboard API for Cross-Instance Copy/Paste

```typescript
// Copy tiles to system clipboard as JSON
async copyToClipboard(clipboard: TileClipboard) {
  const json = JSON.stringify({
    type: 'ac-map-tiles',
    width: clipboard.width,
    height: clipboard.height,
    tiles: Array.from(clipboard.tiles)
  });
  await navigator.clipboard.writeText(json);
}

// Paste from system clipboard
async pasteFromClipboard(): Promise<TileClipboard | null> {
  const text = await navigator.clipboard.readText();
  try {
    const data = JSON.parse(text);
    if (data.type === 'ac-map-tiles') {
      return { width: data.width, height: data.height, tiles: new Uint16Array(data.tiles) };
    }
  } catch { /* not our data */ }
  return null;
}
```

---

### 2.6 Offline / PWA

#### 2.6.1 Service Worker

New: `public/sw.js`
- Cache-first strategy for app shell (HTML, JS, CSS, tileset images)
- Network-first for API calls (future: cloud save)
- Precache all bundled patch assets

#### 2.6.2 Web App Manifest

New: `public/manifest.json`
```json
{
  "name": "AC Map Editor",
  "short_name": "AC MapEd",
  "start_url": "/AC-Map-Editor-Online/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [...]
}
```

Enables "Add to Home Screen" on mobile → launches as standalone app (no browser chrome).

---

## PHASE 3: IMPLEMENTATION PLAN

### Wave 1: Foundation (PC Web Accuracy) — P0

**Goal**: Make the web version functionally identical to Electron on desktop browsers.

1. **Input migration**: Replace all `React.MouseEvent` with `PointerEvent` in `MapCanvas.tsx` and `TilesetPanel.tsx`. Add `setPointerCapture()`. This is a prerequisite for everything else and immediately fixes desktop accuracy issues with pointer tracking.

2. **DPI scaling**: Add `devicePixelRatio` handling to all 4 canvas layers. Fix blurry rendering on Retina/HiDPI displays.

3. **Web menu bar**: Add a proper file/edit/view menu for the web build (replacing Electron's native menu). Can be a React component that renders only when `!window.electronAPI?.getPatchesDir`.

4. **Auto-save + crash recovery**: IndexedDB-based auto-save. Prompt on startup if recovery data exists.

### Wave 2: Touch Input (Cross-Platform) — P0

**Goal**: All tools work with touch. Pan/zoom work with gestures.

5. **PointerManager**: Implement the gesture state machine (`src/core/input/PointerManager.ts`). Wire it to MapCanvas. All pointer disambiguation happens here.

6. **Pinch-to-zoom**: Two-finger distance change → `onZoom(centerX, centerY, scaleDelta)`. Zoom anchored to midpoint between fingers.

7. **Two-finger pan**: Two-finger midpoint movement → `onPanMove(dx, dy)`. Simultaneous with zoom (standard behavior).

8. **Two-finger tap = undo**: Detect two-finger tap (< 300ms, < 15px movement) → `onUndo()`.

9. **Long-press = picker**: 500ms hold with < 10px movement → `onLongPress()` → pick tile under finger.

10. **Touch tool painting**: Single-finger drag dispatches tool action. Snap-to-grid means fat fingers don't matter — any touch within a tile's screen area selects that tile.

### Wave 3: Adaptive UI — P1

**Goal**: Genuinely usable on tablets and phones.

11. **BottomSheet component**: Tile palette as a bottom sheet on tablet/phone.

12. **FloatingToolbar component**: Compact draggable toolbar for tablet.

13. **Phone layout**: Compact header, bottom tool strip, maximized canvas.

14. **Touch-sized targets**: Minimum 44×44px for all interactive elements on touch devices.

15. **Auto-hide UI**: Toolbar fades after 3s inactivity on phone, tap to restore.

16. **Undo/redo buttons**: Visible buttons in header for touch (no keyboard).

### Wave 4: Progressive Enhancement — P2

17. **Pen mode**: Auto-detect stylus, enable palm rejection, pressure sensitivity (future: variable brush size).

18. **PWA + offline**: Service worker, manifest, IndexedDB map storage, "Recent Maps" list.

19. **Share API export**: Mobile-friendly file sharing for map export.

20. **System clipboard integration**: Cross-instance tile copy/paste via Clipboard API.

21. **Minimap touch**: Tap minimap to jump to location. Drag on minimap to scroll.

### Wave 5: Polish — P3

22. **Haptic feedback**: `navigator.vibrate()` on tile placement (progressive enhancement).

23. **Gesture tutorial**: First-launch overlay showing gesture controls.

24. **Fullscreen mode**: Fullscreen API toggle for maximum canvas space on mobile.

25. **Landscape/portrait handling**: Toolbar repositions based on orientation.

---

## KEY TECHNICAL DECISIONS

### Why Canvas2D, Not WebGL
The current rendering is a 256×256 tile grid drawn from a single atlas texture. Canvas2D `drawImage` is hardware-accelerated for this workload. WebGL would add shader compilation, context management, texture upload, and a WebGL fallback path — all for negligible performance gain. The bottleneck is never rendering; it's state management and React reconciliation.

### Why PointerEvents, Not Separate Mouse/Touch
PointerEvents is the W3C standard that unifies mouse, touch, and pen into a single event model. Every modern browser supports it (including Safari 13+). Using separate `mousedown`/`touchstart` handlers leads to duplicate event handling, ghost clicks, and inconsistent behavior. The migration is mostly mechanical: rename handlers, add `pointerId` tracking.

### Why Not a Full Rewrite
The existing codebase is well-architected. The `CanvasEngine`, Zustand store, tool system, map parser, game object placement logic — all of this works correctly and efficiently. The web version needs an input abstraction layer and adaptive UI, not a rewrite. The `WebFileService` and `WebElectronShim` adapters prove that the architecture already supports platform abstraction.

### Why Zustand Snapshots → Diff-Based Undo (Eventually)
The current snapshot approach works and is simpler to reason about. The diff-based approach is an optimization for when users report memory issues with large undo stacks. Not a blocker for initial release.

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `src/core/input/PointerManager.ts` | Gesture state machine, pointer disambiguation |
| `src/core/input/GestureRecognizer.ts` | Pinch, tap, long-press detection |
| `src/core/persistence/AutoSave.ts` | IndexedDB auto-save + crash recovery |
| `src/components/BottomSheet/BottomSheet.tsx` | Draggable bottom sheet (tile palette mobile) |
| `src/components/FloatingToolbar/FloatingToolbar.tsx` | Compact draggable toolbar (tablet) |
| `src/components/MobileToolStrip/MobileToolStrip.tsx` | Bottom tool strip (phone) |
| `src/components/WebMenuBar/WebMenuBar.tsx` | File/Edit/View menu for web build |
| `src/hooks/useDeviceClass.ts` | Device class detection hook |
| `src/hooks/usePointerManager.ts` | React hook wrapping PointerManager |
| `public/sw.js` | Service worker for offline support |
| `public/manifest.json` | PWA manifest |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/components/MapCanvas/MapCanvas.tsx` | Replace MouseEvent → PointerEvent, integrate PointerManager, add DPI scaling |
| `src/components/TilesetPanel/TilesetPanel.tsx` | Add touch events, bottom sheet mode |
| `src/components/ToolBar/ToolBar.tsx` | Add device-adaptive rendering (full/floating/strip) |
| `src/App.tsx` | Add device class detection, conditional layouts, auto-save wiring |
| `src/core/canvas/CanvasEngine.ts` | Add DPI scaling support |
| `src/core/editor/EditorState.ts` | Wire auto-save subscription |
| `vite.config.web.ts` | Add PWA plugin, service worker registration |
| `index.web.html` | Add manifest link, viewport meta, theme-color |
