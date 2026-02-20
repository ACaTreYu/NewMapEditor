# Technology Stack

**Project:** AC Map Editor v1.1.3
**Researched:** 2026-02-20
**Milestone scope:** Move selection tool, map boundary visualization, minimap/tool panel z-order fix, minimap size increase (+32x32), Grenade/Bouncy dropdown sync fix, settings serialization completeness fix

---

## Verdict: No New Libraries Required

Every v1.1.3 feature is implementable with the existing stack. Analysis is per-feature below, with precise integration points confirmed from direct codebase inspection.

---

## Existing Stack (Confirmed Sufficient)

### Core Runtime

| Technology | Version (package.json) | Purpose | Status for v1.1.3 |
|------------|------------------------|---------|-------------------|
| Electron | ^34.0.0 | Desktop shell, IPC, file I/O | Unchanged |
| React | ^18.3.1 | UI components | Unchanged |
| TypeScript | ^5.7.2 | Type safety | Unchanged |
| Vite | ^6.0.7 | Build tool | Unchanged |
| Zustand | ^5.0.3 | State management (GlobalSlice + DocumentsSlice + WindowSlice) | Unchanged |
| Canvas API | Browser built-in | Tile rendering via CanvasEngine, UI overlays | Unchanged |

### Supporting Libraries (All Unchanged)

| Library | Version | Purpose |
|---------|---------|---------|
| react-rnd | ^10.5.2 | MDI draggable/resizable windows |
| react-resizable-panels | ^4.5.7 | Sidebar panel layout |
| react-icons | ^5.5.0 | Toolbar icons |
| electron-updater | ^6.7.3 | Auto-update |

---

## Per-Feature Stack Analysis

### Feature 1: Move Selection Tool

**What it does:** Reposition the active selection marquee (its tile-coordinate bounds in Zustand) by dragging it on the canvas — without modifying any tile data.

**Stack needed:** Existing only.

The `ToolType.SELECT` enum value and `selectionDragRef` ref pattern in `MapCanvas.tsx` already handle marquee drag-drawing. The move operation is an extension of this: when `mousedown` lands inside an active selection region, the handler interprets the gesture as a marquee reposition rather than a new selection draw. `mousemove` delta-translates the selection coordinates; `mouseup` commits via `setSelectionForDocument`.

Key existing primitives:
- `Selection` interface (`types.ts`): `{ startX, startY, endX, endY, active }` — no schema change needed; repositioning is a coordinate update.
- `setSelectionForDocument` (DocumentsSlice): already accepts `Partial<Selection>` — move just calls it with new coordinates.
- `selectionDragRef` (MapCanvas): ref-based transient drag state, same pattern used for new-selection drag.
- `drawUiLayer` (MapCanvas): renders marching ants from `selection` state — automatically redraws at new position without changes.
- Cursor change to `cursor: move` when hovering inside an active selection: CSS class toggle on the UI canvas layer, no library.

**Integration point:** `MapCanvas.tsx` `handleMouseDown` / `handleMouseMove` / `handleMouseUp` — extend the `ToolType.SELECT` branch with inside-selection detection.

**Confidence:** HIGH — all required primitives are confirmed present in codebase.

---

### Feature 2: Map Boundary Visualization

**What it does:** Draw a visible border at the 256x256 map edge so users can see where the map ends vs. the scrollable outside-map area.

**Stack needed:** Existing only — Canvas 2D API.

The CanvasEngine buffer is exactly 4096x4096 px (256 tiles × 16 px). The "outside" region is scroll space beyond the buffer, rendered as the CSS background of `.map-canvas-container` (`var(--color-neutral-300)`). The map boundary is therefore the edge of the buffer in tile coordinates: top-left at tile (0,0), bottom-right at tile (256,256).

The recommended implementation is a `strokeRect` call on the existing UI canvas layer (`uiLayerRef`) inside `drawUiLayer`. The UI layer already renders marching ants, paste previews, and ruler overlays using the `tileToScreen()` helper, which correctly maps tile coordinates to screen pixels at any zoom. A 1-pixel stroke at the map boundary requires one `strokeRect` call with coordinates derived from `tileToScreen(0, 0)` and `tileToScreen(MAP_WIDTH, MAP_HEIGHT)`.

This approach:
- Requires zero changes to CanvasEngine.
- Automatically updates on every viewport/zoom change (because `drawUiLayer` already re-fires on those changes).
- Clips naturally when the boundary scrolls off screen (canvas clip region handles it).

**Integration point:** `MapCanvas.tsx` `drawUiLayer` callback — add a single `strokeRect` before other overlays.

**Confidence:** HIGH — `tileToScreen()` and the UI layer pattern are fully confirmed in codebase.

---

### Feature 3: Minimap / Tool Panel Z-Order Fix

**What it does:** Ensure the Minimap floating overlay and toolbar/sidebar panels always render above maximized MDI windows.

**Stack needed:** Existing only — CSS `z-index`.

Root cause confirmed from codebase: MDI windows use dynamic `zIndex` values from `WindowSlice`, starting at `BASE_Z_INDEX = 1000` and incrementing with each window raise. `Z_INDEX_NORMALIZE_THRESHOLD = 100000` bounds the maximum before normalization. The Minimap CSS currently sets `.minimap { z-index: 100; }` — below `BASE_Z_INDEX = 1000`, so any focused MDI window renders on top.

Fix: Raise the Minimap z-index to a value above the maximum possible MDI z-index after normalization. After normalization, window z-indices are reassigned starting from `BASE_Z_INDEX = 1000` with increments of 1 per window (max 8 documents = z-index 1008 after normalization). A safe value is `z-index: 10000` for the Minimap. This is well above any MDI window and does not require touching the MDI logic.

The toolbar and right sidebar are not positioned with `position: absolute` or `position: fixed` in their own stacking context, so they likely do not need z-index changes (they are outside the workspace `overflow: hidden` container). Verify `ToolBar.css` during implementation.

No library change. Pure CSS value update in `Minimap.css`.

**Integration point:** `Minimap.css` — increase `.minimap { z-index }` value.

**Confidence:** HIGH — z-index values confirmed from codebase (`BASE_Z_INDEX = 1000`, current minimap `z-index: 100`).

---

### Feature 4: Minimap Size Increase (+32x32)

**What it does:** Grow the minimap canvas from 128x128 px to 160x160 px.

**Stack needed:** Existing only — one constant change.

`Minimap.tsx` defines:
```typescript
const MINIMAP_SIZE = 128;
const SCALE = MINIMAP_SIZE / MAP_WIDTH; // 0.5 px/tile
```

Changing `MINIMAP_SIZE` to `160` yields `SCALE = 0.625 px/tile`. Every size-dependent expression in the component references `MINIMAP_SIZE` or `SCALE` consistently:
- `createImageData(MINIMAP_SIZE, MINIMAP_SIZE)` — pixel buffer creation
- `farplanePixelsRef` cache built at `MINIMAP_SIZE × MINIMAP_SIZE`
- `getViewportRect()` uses `SCALE` for viewport rectangle coordinates
- Click-to-navigate uses `SCALE` for coordinate conversion

The CSS for `.minimap` uses `position: absolute; top: 8px; right: 8px` with no hardcoded pixel size — the canvas element governs its own dimensions. No CSS change needed.

**Integration point:** `Minimap.tsx` — change `MINIMAP_SIZE` from `128` to `160`. Single-line change.

**Confidence:** HIGH — constant propagation confirmed by reading the full component.

---

### Feature 5: Grenade / Bouncy Settings Dropdown Sync Fix

**What it does:** Fix settings dialog dropdowns for Grenade and Bouncy weapons not correctly reflecting or updating their serialized values.

**Stack needed:** Existing only — React controlled inputs, `settingsSerializer.ts`, `GameSettings.ts`.

The settings dialog uses `extendedSettings: Record<string, number>` as the source of truth. `GAME_SETTINGS` defines Bouncy and Grenade settings in the `'Weapons'` category (`subcategory: 'Bouncy'` and `subcategory: 'Grenade'`). The `SelectInput` component is generic — `value` prop is a number, `onChange` calls `Number(e.target.value)`.

The bug is most likely one of:
1. The `value` prop passed to `SelectInput` for Grenade/Bouncy is the raw setting value (e.g., damage amount like `48`) but the options array uses index values (0, 1, 2...) — or vice versa. This is a controlled input mismatch.
2. The key string in `extendedSettings` does not exactly match the `key` in `GAME_SETTINGS` for those specific settings (e.g., `'BouncyDamage'` vs `'BounceGrenDamage'`).

The serialization infrastructure in `settingsSerializer.ts` is correct — `serializeSettings` and `parseSettings` both operate on `GAME_SETTINGS` key strings consistently. The bug is in the dialog's rendering or initialization, not in the serialization layer.

**Integration point:** `MapSettingsDialog.tsx` — inspect the Bouncy/Grenade `SelectInput` `value` binding and `options` array for the mismatch. This is a targeted logic fix, not an architectural change.

**Confidence:** MEDIUM — exact bug location requires reading `MapSettingsDialog.tsx` during implementation. The infrastructure is confirmed correct; the mismatch is in dialog-local logic.

---

### Feature 6: Settings Serialization Completeness Fix

**What it does:** Ensure all defined settings are always written to the map description field on save, with no missing keys.

**Stack needed:** Existing only — `settingsSerializer.ts`.

`reserializeDescription` already merges `extendedSettings` over `getDefaultSettings()` before writing:
```typescript
const settings = { ...defaults, ...extendedSettings };
```
This guarantees all 53 keys are present in the serialized output. So if the bug manifests as missing keys on save, the issue is upstream: `extendedSettings` is not being set correctly before the save path calls `reserializeDescription`.

`mergeDescriptionWithHeader` (called on map load) already merges defaults with header-derived values and parsed description values. If there are load paths that bypass `mergeDescriptionWithHeader`, those maps will not have all 53 keys in their `extendedSettings` after loading.

**Integration point:** `src/core/services/MapService.ts` — audit all `loadMap` paths to confirm `mergeDescriptionWithHeader` is called. Also audit `MapSettingsDialog.tsx` initialization: does it initialize `extendedSettings` from the map description using `parseDescription`, and does `parseDescription` → `getDefaultSettings()` ensure all 53 keys are present even for partial descriptions?

**Confidence:** MEDIUM — the serialization code is confirmed correct; the gap is in load-path initialization. Root cause pinpointing requires reading `MapService.ts` and `MapSettingsDialog.tsx` during implementation.

---

## What NOT to Add

| Anti-Addition | Why Not |
|--------------|---------|
| Any drag library (interact.js, etc.) | `selectionDragRef` ref-based pattern already established in MapCanvas |
| React portal for Minimap | No stacking context violation; CSS z-index increase is sufficient |
| Additional canvas layer | Three layers already exist (map, grid, UI); boundary is a single `strokeRect` on UI layer |
| Settings library (formik, react-hook-form) | Settings dialog already works; this is a targeted bug fix |
| Any npm package | Not justified by any v1.1.3 feature |

---

## Installation

No new packages required.

```bash
# Nothing to install — all features use existing stack
```

---

## Sources

All findings are from direct codebase inspection. No web search required — the stack is fully known and all primitives are confirmed present.

- `E:\NewMapEditor\package.json` — dependency versions
- `E:\NewMapEditor\src\components\Minimap\Minimap.tsx` — MINIMAP_SIZE = 128, SCALE usage, cache architecture
- `E:\NewMapEditor\src\components\Minimap\Minimap.css` — confirmed z-index: 100
- `E:\NewMapEditor\src\core\editor\slices\windowSlice.ts` — confirmed BASE_Z_INDEX = 1000, Z_INDEX_NORMALIZE_THRESHOLD = 100000
- `E:\NewMapEditor\src\core\editor\slices\types.ts` — Selection interface shape, DocumentState
- `E:\NewMapEditor\src\core\map\types.ts` — ToolType enum (SELECT, PENCIL, etc.)
- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — buffer architecture, blitToScreen, drawMapLayer
- `E:\NewMapEditor\src\core\map\settingsSerializer.ts` — reserializeDescription merge logic confirmed correct
- `E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts` — setSelectionForDocument API
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — selectionDragRef, drawUiLayer, tileToScreen, three-canvas architecture
- `E:\NewMapEditor\src\components\Workspace\Workspace.css` — MDI stacking context structure
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css` — canvas layer z-index structure
