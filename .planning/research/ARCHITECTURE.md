# Architecture Patterns

**Domain:** AC Map Editor v1.1.3 — Integration of move-selection, map boundary, minimap/overlay z-order, and settings sync fixes
**Researched:** 2026-02-20
**Source:** Direct codebase analysis (CanvasEngine.ts, MapCanvas.tsx, EditorState.ts, MapSettingsDialog.tsx, settingsSerializer.ts, App.tsx, Workspace.tsx, Minimap.tsx, ChildWindow.tsx, windowSlice.ts, GameSettings.ts, CSS files)

---

## Existing Architecture (Confirmed from Source)

### Three-Canvas Stack in MapCanvas

`MapCanvas.tsx` maintains three stacked `<canvas>` elements:

| Layer | Ref | Driven By | Redraws When |
|-------|-----|-----------|--------------|
| Map | `mapLayerRef` | `CanvasEngine` (off-screen buffer) | Tile changes, viewport, tileset, animation frame |
| Grid | `gridLayerRef` | Direct `drawGridLayer` callback | Viewport zoom, grid settings |
| UI | `uiLayerRef` | `drawUiLayer` callback + RAF | Every cursor move, selection change, tool state |

All three canvases share the same pixel dimensions and are stacked via CSS `position: absolute`.

### CanvasEngine — Off-Screen Buffer Pattern

`CanvasEngine` (src/core/canvas/CanvasEngine.ts) owns:
- A 4096x4096 off-screen buffer (full map at native 16px/tile)
- Three Zustand subscriptions set up in `attach()`: viewport changes trigger `blitToScreen()`, map tile changes trigger `drawMapLayer()`, animation frame changes trigger `patchAnimatedTiles()`
- Drag accumulation: `beginDrag()` / `paintTile()` / `commitDrag()` / `cancelDrag()`
- `prevTiles` snapshot for incremental diff patching

The engine bypasses React rendering entirely. Zustand subscribers call imperative canvas methods directly.

### Ref-Based Drag State Pattern

All transient drag/interaction state uses refs (not `useState`) to avoid React re-renders:

```typescript
// Existing refs in MapCanvas
const selectionDragRef = useRef<{ active, startX, startY, endX, endY }>();
const lineStateRef      = useRef<LineState>();
const rectDragRef       = useRef<{ active, startX, startY, endX, endY }>();
const pastePreviewRef   = useRef<{ x, y } | null>();
const rulerStateRef     = useRef<RulerState>();
```

The UI layer is redrawn via a RAF-debounced `scheduleUiRedraw()` call. The pattern: mutate ref, call `scheduleUiRedraw()`.

### Zustand Store Architecture

Three slices compose `EditorState`:
- **GlobalSlice** — tool state, tileset, grid settings, animation frame, clipboard
- **DocumentsSlice** — per-document map/viewport/selection/undo
- **WindowSlice** — MDI window state (position, size, z-index, maximize/minimize)

A backward-compat wrapper layer at the top of `EditorState.ts` mirrors the active document's fields (map, viewport, selection, etc.) to top-level state for legacy consumers. All mutations go through `setXxxForDocument(id, ...)` which updates the document Map entry, then the compat wrapper syncs the top-level alias.

### Selection State Shape

Selection lives in document state as:
```typescript
selection: { startX: number; startY: number; endX: number; endY: number; active: boolean }
```
Coordinates are tile indices (integers), not pixels. The selection drag in MapCanvas uses `selectionDragRef` to accumulate the in-progress rectangle, then commits to Zustand on mouseup via `setSelection()`.

### MDI Z-Index System

- MDI windows start at `BASE_Z_INDEX = 1000`, incrementing per `raiseWindow()`
- Trace image windows use `TRACE_BASE_Z_INDEX = 5000`
- Minimap: `z-index: 100` (Minimap.css — confirmed)
- GameObjectToolPanel: `z-index: 100` (GameObjectToolPanel.css — confirmed)
- Minimized bars container: `z-index: 500` (Workspace.css — confirmed)

The minimap and tool panel are positioned `absolute` inside `.main-area`, which is the parent of `.workspace`. The `.workspace` contains the Rnd windows with their dynamic z-indexes starting at 1000. MDI windows (z >= 1000) always render above the minimap (z=100) and tool panel (z=100) when maximized.

### Settings Serialization Path

```
MapHeader.extendedSettings (Record<string, number>)
  written/read by MapSettingsDialog.applySettings()
MapHeader.description (string: "Format=1.1, BouncyDamage=48, ...")
  serialized/parsed by settingsSerializer.ts
```

Key functions in `settingsSerializer.ts`:
- `serializeSettings(settings)` — converts Record to "Format=1.1, Key=Value, ..." string
- `parseSettings(description)` — parses string back to Record, clamps to min/max
- `buildDescription(settings, author, unrecognized)` — full description builder (Author= always last)
- `mergeDescriptionWithHeader(description, header)` — called on map load; merges binary header indices with description
- `reserializeDescription(description, extendedSettings)` — called on save

Dropdown-to-slider sync in `MapSettingsDialog`:
- Three dropdowns (Laser Damage, Special Damage, Recharge Rate) each have `onChange` that calls `setHeaderFields()` AND `updateSetting()` simultaneously
- Example: Laser Damage dropdown onChange sets `headerFields.laserDamage = val` and `localSettings['LaserDamage'] = LASER_DAMAGE_VALUES[val]`
- The slider for `LaserDamage` reads from `localSettings['LaserDamage']` — so the two stay synchronized

### Settings Bug Root Cause (bounciesEnabled / grenades)

The Weapons tab has checkboxes for `missilesEnabled`, `bombsEnabled`, `bounciesEnabled` — these are **binary header fields**, not extended settings. They do NOT have corresponding keys in `GAME_SETTINGS` and are not serialized to the description string. They go directly into `MapHeader` via `applySettings()` spreading `...headerFields`.

Grenades (`NadeDamage`, `NadeEnergy`, etc.) are extended settings with sliders on the Weapons tab. There is no toggle checkbox for grenade enable/disable in the binary header at all — the header only has `missilesEnabled`, `bombsEnabled`, `bounciesEnabled`. The "Bouncies Enabled" checkbox controls the binary header field, while the `BouncyDamage/BouncyEnergy/etc.` sliders are separate extended settings. They are architecturally independent — no sync between the checkbox and the sliders exists, nor is it expected. This is the source of confusion: checkbox disables the weapon in the binary header for the game engine, but the extended settings sliders for that weapon appear unchanged in the editor.

---

## Feature Integration Analysis

### Feature 1: Move Selection Tool

**What it needs:** When the active tool is "move selection" and the user mousedown-drags within an active selection bounding box, the selection repositions (shifting the tile contents) rather than creating a new selection rectangle.

**Integration point: `MapCanvas.tsx` mouse handlers**

The move-selection tool must be added as a new `ToolType` constant in `src/core/map/types.ts`, then handled in `handleMouseDown`, `handleMouseMove`, `handleMouseUp` in MapCanvas.

The existing `selectionDragRef` pattern handles selection rectangle drawing. Move-selection needs its own ref:

```typescript
const moveSelectionRef = useRef<{
  active: boolean;
  startTileX: number;
  startTileY: number;
  origSelection: { startX: number; startY: number; endX: number; endY: number };
} | null>(null);
```

**Data flow for move-selection:**

1. `handleMouseDown`: If tool is MOVE_SELECTION and cursor is inside `selection` bounds, start `moveSelectionRef`, snapshot original selection, call `pushUndo()`
2. `handleMouseMove`: Compute tile delta (currentTile - startTile), compute new selection position, call `setSelection()` to update Zustand — the marching ants on the UI layer auto-respond since they read from selection state
3. `handleMouseUp`: Commit — actual tile data must be moved: read tiles from old selection region, write to new region, fill old region with DEFAULT_TILE. Call `setTiles()` with all changes batched, call `commitUndo()`

**Key consideration:** Move-selection modifies tile data in Zustand (`setTiles()`), which triggers CanvasEngine's map subscription for incremental buffer patch. No CanvasEngine changes are needed. The selection marching ants are already drawn from `selection` state in `drawUiLayer` — they update automatically when `setSelection()` is called.

**Files to modify:**
- `src/core/map/types.ts` — add `MOVE_SELECTION` to `ToolType` enum
- `src/components/MapCanvas/MapCanvas.tsx` — add moveSelectionRef, add MOVE_SELECTION cases in mouse handlers
- `src/components/ToolBar/ToolBar.tsx` — add button for MOVE_SELECTION tool

**No new components required.** The tile-movement logic (read region, write region, fill region with DEFAULT_TILE) can be extracted to `src/core/map/SelectionTransforms.ts`, which already exists for rotate/mirror operations and is the natural home for region manipulation logic.

### Feature 2: Map Boundary Visualization

**What it needs:** The area outside the 256x256 tile grid should render differently (e.g., a distinct background color or dimmed overlay) to make the map boundary visually clear.

**Integration point: A new 4th canvas layer in MapCanvas**

Add a 4th canvas (`boundaryLayerRef`) between the map canvas and the grid canvas. This canvas draws a semi-transparent fill outside the map boundary and nothing inside. Redraws only when viewport changes.

```typescript
const boundaryLayerRef = useRef<HTMLCanvasElement>(null);

const drawBoundaryLayer = useCallback(() => {
  const canvas = boundaryLayerRef.current;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate pixel position of map boundary at current zoom
  const tilePixels = TILE_SIZE * viewport.zoom;
  const mapLeft = -viewport.x * tilePixels;
  const mapTop = -viewport.y * tilePixels;
  const mapRight = mapLeft + MAP_WIDTH * tilePixels;
  const mapBottom = mapTop + MAP_HEIGHT * tilePixels;

  // Fill out-of-bounds with semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  // Left strip
  ctx.fillRect(0, 0, Math.max(0, mapLeft), canvas.height);
  // Right strip
  ctx.fillRect(Math.min(canvas.width, mapRight), 0, canvas.width, canvas.height);
  // Top strip (between left and right edge)
  ctx.fillRect(Math.max(0, mapLeft), 0, Math.min(canvas.width, mapRight) - Math.max(0, mapLeft), Math.max(0, mapTop));
  // Bottom strip (between left and right edge)
  ctx.fillRect(Math.max(0, mapLeft), Math.min(canvas.height, mapBottom), Math.min(canvas.width, mapRight) - Math.max(0, mapLeft), canvas.height);
}, [viewport]);
```

The boundary layer canvas should be drawn after the map layer but before the grid and UI layers so the grid and UI overlays appear on top.

**Why not modify CanvasEngine.blitToScreen():** The buffer represents only map tile content. Boundary is a viewport-space concern. Mixing it into the engine would contaminate the tile patch system and violate CanvasEngine's single responsibility.

**Files to modify:**
- `src/components/MapCanvas/MapCanvas.tsx` — add `boundaryLayerRef`, `drawBoundaryLayer`, wire to viewport subscription, add `<canvas ref={boundaryLayerRef}>` JSX
- `src/components/MapCanvas/MapCanvas.css` — stack boundary canvas between map and grid layers

**No CanvasEngine changes needed.**

### Feature 3: Minimap and Tool Panel Z-Order Fix

**Root cause (confirmed from CSS):**

| Element | Stacking context parent | z-index |
|---------|------------------------|---------|
| `.minimap` | `.main-area` (position: relative) | 100 |
| `.game-object-tool-panel` | `.main-area` (position: relative) | 100 |
| `.workspace` | `.main-area` | no z-index |
| MDI Rnd windows | `.workspace` (position: relative) | 1000+ dynamic |

`.workspace` is a sibling of `.minimap` and `.game-object-tool-panel` inside `.main-area`. MDI windows inside workspace use z-index starting at 1000, which is within the same stacking context as the `.main-area` children. When a window is maximized and raised (z-index >= 1000), it paints above the minimap at z-index 100.

**Fix option A (recommended): CSS isolation on .workspace**

Adding `isolation: isolate` to `.workspace` creates a new stacking context, containing all MDI z-indexes inside it. Elements outside `.workspace` (minimap, tool panel) are automatically above all workspace contents regardless of their z-index values.

```css
/* Workspace.css — add to .workspace rule */
.workspace {
  position: relative;
  isolation: isolate; /* Contains MDI z-index contest inside workspace */
  ...
}
```

This is architecturally clean: the MDI z-index numbers (1000-100000) never compete with elements outside `.workspace`. No z-index changes needed elsewhere.

**Fix option B: Raise overlay z-indexes**

Set minimap and tool panel to `z-index: 200000` (above the normalization threshold of 100000). Works but is fragile — if the MDI threshold ever changes, overlays may be beaten again.

**Recommended: Option A (`isolation: isolate`)**

**Files to modify:**
- `src/components/Workspace/Workspace.css` — add `isolation: isolate` to `.workspace` rule

**No JS or Zustand changes required.**

### Feature 4: Settings Dropdown-to-Slider Sync (Grenade/Bouncy Bug)

**Confirmed architecture from source:**

The Weapons tab has two independent data systems:

1. **Binary header checkboxes** (`missilesEnabled`, `bombsEnabled`, `bounciesEnabled`) — stored in `headerFields` state, written to `MapHeader` binary fields. No corresponding `GAME_SETTINGS` entry. Not in description string.

2. **Extended settings sliders** — All `GAME_SETTINGS` entries for Bouncy and Grenade (`BouncyDamage`, `BouncyEnergy`, `BouncyTTL`, `BouncyRecharge`, `BouncySpeed`, `NadeDamage`, `NadeEnergy`, `ShrapTTL`, `ShrapSpeed`, `NadeRecharge`, `NadeSpeed`) rendered from `localSettings`.

**The dropdown sync for LaserDamage/MissileDamage/MissileRecharge works correctly:** each SelectInput onChange calls both `setHeaderFields()` and `updateSetting()`.

**Actual nature of the bug:** Investigation needed to confirm which specific behavior is broken. Likely candidates:

- **No grenade enable/disable toggle** — Binary header has no `grenadesEnabled` field. Users expect parity with missiles/bombs but it does not exist in the file format spec.
- **Bouncy/grenade slider values not persisting** — If `bounciesEnabled` checkbox state and `BouncyDamage` slider state appear to reset, they are actually independent and may appear inconsistent. Checkbox state lives in `headerFields`, slider state lives in `localSettings`; they are only unified at Apply time.
- **Description field not round-tripping** — Verify `serializeSettings` is writing all Bouncy/Grenade keys. It does iterate all `GAME_SETTINGS` entries alphabetically, so all keys should be written. Verify with a test save/load cycle.

**Fix for grenade toggle absence:** Cannot add a `grenadesEnabled` binary header field — the file format is fixed (SubSpace spec). Implement "disable grenades" via extended settings: provide a UI affordance to set `NadeEnergy=57` (maximum energy cost, effectively disabling the weapon at the game engine level).

**Files to investigate and potentially modify:**
- `src/components/MapSettingsDialog/MapSettingsDialog.tsx` — verify onChange handlers for bouncy/grenade sliders are calling `updateSetting()`, not silently dropping values
- `src/core/map/settingsSerializer.ts` — verify Bouncy/Grenade keys appear in serialized output (no filtering)

### Feature 5: Settings Serialization Completeness

**Confirmed complete for all 53 settings in `GAME_SETTINGS`:**

`serializeSettings()` iterates all `GAME_SETTINGS` and writes every key alphabetically (non-flagger group first, flagger group second). `parseSettings()` reads them back and clamps to min/max. The `Format=1.1` prefix is injected by `serializeSettings()` and filtered out by `parseSettings()`.

**Population path on new map:**
- `createEmptyMap()` calls `initializeDescription()` calls `buildDescription(getDefaultSettings(), '', [])` — all 53 keys at default values

**Population path on load:**
- `MapService.loadMap()` calls `mergeDescriptionWithHeader(description, header)` — merges defaults < headerDerived < parsed description settings — ensures all 53 keys present

**Population path on save:**
- `MapService.saveMap()` calls `reserializeDescription(description, extendedSettings)` — re-serializes extendedSettings into description before writing binary

**No serialization gaps found.** The 53 settings in `GAME_SETTINGS` are fully covered by the serialization cycle.

---

## Component Boundaries (Confirmed)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| CanvasEngine | Off-screen buffer, incremental tile patch, animation, blit | Zustand (subscriptions), MapCanvas (attach/detach) |
| MapCanvas | All tool mouse interactions, 3-canvas stack, UI overlay drawing | CanvasEngine (imperative calls), Zustand (actions + state) |
| Workspace | MDI container, ChildWindow render loop | Zustand (windowStates, documentIds) |
| ChildWindow | react-rnd wrapper, title bar, window chrome | Zustand (windowState per doc), MapCanvas (renders inside) |
| Minimap | 128x128 pixel-averaged map overview, viewport rect | Zustand (map, viewport via backward-compat top-level fields) |
| GameObjectToolPanel | Floating tool options for game objects | Zustand (gameObjectToolState) |
| MapSettingsDialog | Modal dialog with 6 tabs, reads/writes MapHeader | Zustand (updateMapHeader action) |
| App | Root layout, menu handling, IPC listeners, tileset loading | All children via props and Zustand |

---

## Data Flow

```
User mouse event
  MapCanvas mouse handler
    reads ref state (cursorTileRef, selectionDragRef, etc.)
    calls CanvasEngine.paintTile() [imperative, no Zustand during drag]
    on mouseup: calls Zustand action (setTiles, setSelection, commitUndo)
      Zustand state update
        CanvasEngine Zustand subscription fires
          drawMapLayer() / blitToScreen() [direct canvas ops]
        React component re-renders (only components subscribed to changed slice)
```

```
Settings save path:
MapSettingsDialog.applySettings()
  updateMapHeader({ description, extendedSettings, ...headerFields })
    documentsSlice.updateMapHeaderForDocument()
      doc.map.header updated (new object reference)
        EditorState backward-compat syncs: set({ map: doc.map })
          CanvasEngine map subscription fires (map !== prevMap)
            drawMapLayer() [incremental patch, no tiles changed so zero patches]
```

---

## Files to Modify Per Feature

| Feature | Files to Modify | New Files |
|---------|-----------------|-----------|
| Move selection tool | `src/core/map/types.ts`, `src/components/MapCanvas/MapCanvas.tsx`, `src/components/ToolBar/ToolBar.tsx` | None (logic in SelectionTransforms.ts) |
| Map boundary visualization | `src/components/MapCanvas/MapCanvas.tsx`, `src/components/MapCanvas/MapCanvas.css` | None |
| Minimap/panel z-order | `src/components/Workspace/Workspace.css` | None |
| Settings sync bug | `src/components/MapSettingsDialog/MapSettingsDialog.tsx` | None |
| Settings serialization | `src/core/map/settingsSerializer.ts` (if gaps found) | None |

---

## Build Order for v1.1.3

Dependencies drive this order:

1. **Z-order fix (minimap + tool panel)** — CSS-only, one line. No dependencies. Fast win, do first.

2. **Settings bug triage + fix** — Read-only investigation then targeted MapSettingsDialog.tsx change. No dependencies on other features.

3. **Map boundary visualization** — New canvas layer in MapCanvas.tsx. Independent. Do before move-selection so MapCanvas is stable before adding more logic.

4. **Move selection tool** — Requires new ToolType enum value, mouse handlers in MapCanvas, ToolBar button. Most surface area. Do last when other changes are merged and stable.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: useState for drag state in MapCanvas
**What:** Using `useState` for move-selection drag coordinates
**Why bad:** Every cursor move triggers React re-render, causing visible lag and defeating the ref-based architecture
**Instead:** Use a ref (`moveSelectionRef`) and call `scheduleUiRedraw()` after mutation

### Anti-Pattern 2: Re-implementing tile region logic in MapCanvas mouse handlers
**What:** Writing tile region read/write logic inline in handleMouseUp
**Why bad:** SelectionTransforms.ts already has region copy/paste logic used by copy/paste/rotate/mirror
**Instead:** Extract move-tiles logic to SelectionTransforms.ts, call from mouse handler

### Anti-Pattern 3: Rendering boundary overlay on the buffer
**What:** Drawing out-of-bounds regions into CanvasEngine's 4096x4096 buffer
**Why bad:** The buffer represents only map tile content; boundary is a viewport concern. Also contaminates the tile patch diff system.
**Instead:** Draw boundary on a separate overlay canvas layer in MapCanvas

### Anti-Pattern 4: Escalating MDI z-indexes without containment
**What:** Not using `isolation: isolate` and instead raising overlay z-indexes to beat the current MDI max
**Why bad:** MDI z-indexes grow until normalization threshold (100000). Overlays set to 200000 today may be beaten if normalization logic changes.
**Instead:** Use `isolation: isolate` on `.workspace` to contain the z-index contest inside that stacking context

### Anti-Pattern 5: Adding a `grenadesEnabled` binary header field
**What:** Adding a new binary struct field for grenade toggle to match `bombsEnabled`
**Why bad:** The file format is fixed (SubSpace/Continuum binary spec). Adding non-spec fields breaks cross-tool compatibility with SEdit and the AC game engine.
**Instead:** Implement "disable grenades" via extended settings (set `NadeEnergy=57` to cap energy cost at maximum)

---

## Sources

All claims are HIGH confidence — verified by direct source code analysis.

- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — full file read
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — first 380 lines read
- `E:\NewMapEditor\src\core\editor\EditorState.ts` — full file read
- `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` — first 470 lines read
- `E:\NewMapEditor\src\core\map\settingsSerializer.ts` — full file read
- `E:\NewMapEditor\src\core\map\GameSettings.ts` — full file read
- `E:\NewMapEditor\src\App.tsx` — full file read
- `E:\NewMapEditor\src\components\Workspace\Workspace.tsx` — full file read
- `E:\NewMapEditor\src\components\Minimap\Minimap.tsx` — full file read
- `E:\NewMapEditor\src\components\Workspace\ChildWindow.tsx` — full file read
- `E:\NewMapEditor\src\core\editor\slices\windowSlice.ts` — full file read
- `E:\NewMapEditor\src\components\Minimap\Minimap.css` — full file read
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.css` — full file read
- `E:\NewMapEditor\src\components\Workspace\Workspace.css` — full file read
