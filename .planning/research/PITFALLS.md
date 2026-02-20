# Domain Pitfalls

**Domain:** Electron/React tile map editor — v1.1.3 feature additions
**Researched:** 2026-02-20
**Confidence:** HIGH (all findings derived from direct codebase inspection)

---

## Critical Pitfalls

Mistakes that cause rewrites or major regressions.

---

### Pitfall 1: Move Selection — New Drag Conflicts With Existing Select-Tool Drag

**What goes wrong:** The move-selection drag (left-click-drag on existing selection) conflicts with the select-tool's existing left-click-drag that creates a new selection. If the `handleMouseDown` branch for `ToolType.SELECT` (MapCanvas.tsx ~line 1851) doesn't distinguish "click inside existing selection to move" from "click outside to start new selection," one or both behaviors silently break.

**Why it happens:** The existing handler unconditionally calls `clearSelection()` and starts a new `selectionDragRef`. Adding move requires splitting that branch: inside-selection-bounds moves, outside creates new selection. Getting the hit-test wrong (off-by-one, fractional tile coords, or missing the active-selection guard) routes to the wrong path.

**Consequences:** Users lose the ability to draw new selections while move is active, OR the marquee never enters move mode. Copy/cut/paste/delete continue to use stale selection coordinates—silent wrong-region operations.

**Prevention:**
- Hit-test uses **normalized** selection coordinates (store already normalizes on commit at line ~2054): `x >= selection.startX && x <= selection.endX && y >= selection.startY && y <= selection.endY`.
- Add a dedicated `moveSelectionRef` ref alongside `selectionDragRef` (same ref-based drag pattern used throughout the file). Never reuse `selectionDragRef` for move semantics.
- Move drag must NOT call `clearSelection()` on mousedown—only commit the final position on mouseup.

**Detection:** After implementing, verify clicking outside an active selection still creates a new selection, and that Escape during move reverts to original position (existing Escape handler at ~line 2365 must also reset the move ref).

---

### Pitfall 2: Move Selection — Buffer Desync on Cancelled Drag

**What goes wrong:** If the naive approach erases source tiles from the buffer immediately on mousedown and paints them at the new position on each mousemove, then a missed mouseup (user releases outside the canvas) permanently erases tiles from the buffer while the Zustand store still contains the original data. Buffer and store become desynchronized.

**Why it happens:** `CanvasEngine.patchTileBuffer()` updates both the buffer AND `prevTiles` in lock-step (lines 263-270). Imperative buffer patches outside the drag commit protocol leave the buffer ahead of the store. The next `drawMapLayer()` call performs an incremental diff against `prevTiles` and finds nothing changed (because `prevTiles` was already updated), so it skips redrawing the erased tiles.

**Consequences:** Tiles appear deleted. Undo does not help because the Zustand store was never dirtied.

**Prevention:**
- Do NOT touch the buffer during move drag. Use the UI layer canvas (`uiLayerRef`) for the lifted-tile preview—draw the selected tiles following the cursor on the UI canvas, dim the source region on the UI canvas, leave the buffer untouched.
- Commit the actual tile move to Zustand only on mouseup, as a single `setTiles()` batch call (same pattern as existing `commitDrag()`).
- Handle `onMouseLeave` identically to `onMouseUp`—both must revert or commit cleanly.

**Detection:** Start a move drag and let the mouse leave the canvas mid-drag. Tiles must revert to original position. Complete a move: tiles shift and are undoable in a single Ctrl+Z step.

---

### Pitfall 3: Move Selection — Post-Move Selection Coordinates Stale

**What goes wrong:** After a successful move, the Zustand `selection` still holds the old coordinates. Copy, cut, and delete all read from `selection` in the store. Unless selection coordinates are updated to the new position on commit, all these operations act on the original region (which now contains DEFAULT_TILE after the move).

**Why it happens:** `setSelection()` is called on mouseup of a selection drag. Move drag must call `setSelection()` with the new coordinates on commit, not the original ones.

**Prevention:** On mouseup of a successful move, call `setSelection({ startX: newX, startY: newY, endX: newX + width - 1, endY: newY + height - 1, active: true })` as part of the undo commit. Verify: select 3x3 region, move it 5 tiles right, press Ctrl+C, press Ctrl+V—paste preview should show the content that was moved, at the new position.

**Detection:** Select region. Move it. Immediately press Delete. Only the new region should be erased; the old position should have the DEFAULT_TILE that was already placed there by the move.

---

### Pitfall 4: Map Boundary Visualization — Drawing Outside the 4096x4096 Buffer

**What goes wrong:** The 4096x4096 buffer exactly covers 256x256 tiles (256 × 16px = 4096). There are no extra pixels for out-of-bounds areas. Any attempt to draw boundary color into the buffer at negative offsets or offsets >= 4096 silently clips or corrupts.

**Why it happens:** `blitToScreen()` uses `srcX = viewport.x * TILE_SIZE`. If boundary visualization draws into `bufferCtx` at coordinates derived from negative tile positions, those draws are silently ignored by the browser—but if someone writes `bufCtx.fillRect(-32, 0, 32, 4096)` to represent "left of map," the call does nothing. The blit then shows the CSS background through the transparent regions, which might look correct but only by accident.

**Consequences:** Boundary visualization silently breaks at any zoom level or viewport offset where the clamped source rect clips the out-of-bounds region. Attempting to draw on the buffer at out-of-range coords wastes time and may produce surprising artifacts.

**Prevention:** Boundary visualization must live exclusively on the UI layer canvas (`uiLayerRef`). Compute the screen-space rectangles for out-of-bounds regions:
- Left strip: screen x range `[0, (-viewport.x) * tilePixels)` when `viewport.x < 0` (currently impossible, but defensively handle).
- Right strip: screen x range `[(MAP_WIDTH - viewport.x) * tilePixels, canvasWidth)`.
- Similarly for top/bottom.
Use a single `fillRect()` per strip. Never touch `bufferCtx` for boundary rendering.

**Detection:** Pan to the bottom-right corner of the map at zoom 0.25x so the out-of-bounds region fills most of the screen. Inspect `bufferCtx` in DevTools—confirm no boundary color was written to it.

---

### Pitfall 5: Minimap/Tool Panel Z-Order — Current Z-Index Is Already Below Windows

**What goes wrong:** Child windows use `style={{ zIndex: windowState.zIndex }}` where z-indexes start at `BASE_Z_INDEX = 1000` (windowSlice.ts line 14). The Minimap uses `z-index: 100` (Minimap.css line 5) and GameObjectToolPanel uses `z-index: 100` (GameObjectToolPanel.css line 5). This means ANY raised child window (zIndex 1000+) covers the minimap and tool panel. The fix is straightforward—but there is a trap.

**The stacking context trap:** react-rnd does not create a new stacking context by default (no `transform`, `opacity`, `filter`, or `isolation` on the Rnd root). However, `.workspace` (Workspace.css) has `position: relative` with no `z-index`, which also does not create a stacking context. `.main-area` (App.css) has `position: relative` with no `z-index`—also no stacking context. This means all child windows, the minimap, and the tool panel share the same stacking context rooted at the nearest ancestor that creates one (the `<body>` or `<html>`). Raising minimap to `z-index: 9999` will correctly place it above windows.

**The future trap:** If any developer adds `transform: translateZ(0)` or `will-change: transform` to `.workspace` or `.main-area` for GPU compositing, those elements instantly become stacking context roots. All child window z-indexes become local to that context, and the minimap (a sibling of `.workspace` inside `.main-area`) would need to be inside the same stacking context to compare z-indexes meaningfully. This is a latent fragility.

**Prevention:**
- Set minimap and GameObjectToolPanel to `z-index: 9999`. This is safely above the maximum possible window z-index (8 documents × 1 increment = max ~1008 before normalization).
- Add a CSS comment: `/* z-index budget: windows 1000-2000, trace images 5000-6000, overlays 9999 */`.
- Never add `transform` or `will-change` to `.workspace` or `.main-area` without reviewing the stacking context impact.

**Detection:** Open 4 documents. Raise each to exhaust low z-indexes. Maximize one window. Verify minimap and tool panel are visible above the maximized window.

---

## Moderate Pitfalls

---

### Pitfall 6: Map Boundary Visualization — Theme Changes Don't Repaint the Canvas

**What goes wrong:** The boundary fill color is chosen at render time in `drawUiLayer`. If the color is read from a CSS custom property via `getComputedStyle`, it is correct when `drawUiLayer` runs—but `drawUiLayer` only fires on viewport changes, cursor moves, and tool changes. A theme change (`document.documentElement.setAttribute('data-theme', ...)` in App.tsx ~line 389) updates CSS variables but does NOT trigger a UI layer redraw. The boundary stays the old color.

**Prevention:** The theme system in App.tsx (lines 382-421) has an `onSetTheme` IPC listener. Add a `requestUiRedraw()` call inside that handler. `requestUiRedrawRef.current` is the stable ref exposed to the surrounding scope via the `useCallback` pattern already used in MapCanvas.

**Detection:** Show boundary visualization. Switch between dark, light, and terminal themes. Boundary color must update immediately each time.

---

### Pitfall 7: Minimap Size Increase — Overlap With GameObjectToolPanel

**What goes wrong:** Both Minimap (`top: 8px; right: 8px`) and GameObjectToolPanel (`bottom: 8px; right: 8px`) are positioned absolutely in `.main-area`. Current minimap is 128x128. At 160x160, the minimap bottom edge is at `8 + 160 = 168px` from the top. The GameObjectToolPanel top edge is `(main-area height - 8 - panel height)` from top. On small windows (e.g., 800px total height), workspace height could be ~350px; tool panel is ~120px tall, so its top is at `350 - 8 - 120 = 222px`. No overlap. But if the tool panel is taller than estimated, or if the workspace is shorter, the panels can collide.

**Prevention:** After implementing the +32 resize, test at the minimum realistic window size. If overlap occurs, stack them in a CSS flex column (minimap on top, tool panel below) anchored `top: 8px; right: 8px`.

**Detection:** Resize the Electron window to 800x600. Switch to a game object tool (BUNKER, WARP, etc.) so the tool panel appears. Verify no overlap.

---

### Pitfall 8: Grenade/Bouncy Dropdown Sync — Fixing the Wrong Layer

**What goes wrong:** The reported dropdown desync likely has the root cause in either (a) the preset value array for the dropdown options, or (b) the extended settings key name mismatch. The dialog uses `findClosestIndex()` to translate between numeric values and dropdown indices. If the preset values in the options array don't match SEdit's actual values (from `AC_Setting_Info_25.txt`), `findClosestIndex()` silently snaps to the nearest wrong preset every time the dialog opens.

**Why it happens:** The existing `damageRechargeOptions` (indices 0-4 mapping to "Very Low"..."Very High") works correctly for LaserDamage, MissileDamage, and MissileRecharge because the preset arrays (`LASER_DAMAGE_VALUES`, `SPECIAL_DAMAGE_VALUES`, `RECHARGE_RATE_VALUES`) are defined in `settingsSerializer.ts`. If grenade/bouncy settings have their own preset mappings but those arrays use wrong values, every open/close cycle corrupts the setting toward the nearest preset.

**Prevention:** Before writing any fix code: (1) Open `AC_Setting_Info_25.txt` and find the actual min/max/default for the relevant settings. (2) Log the round-trip: set a non-default value, close dialog, reopen—log what `findClosestIndex()` returns. (3) Fix the preset array values or the key name, not a workaround in the dialog.

**Detection:** Set the problematic dropdown to each of its 5 options. Close with OK. Reopen dialog. Each option must round-trip correctly. Then save the map, reload it, reopen dialog—must still show the saved values.

---

### Pitfall 9: Settings Serialization — Addressing the Symptom Not the Root Cause

**What goes wrong:** Settings bugs that manifest as "value resets after save/reload" have multiple possible root causes along the serialization pipeline:
1. `loadMap()` → `mergeDescriptionWithHeader()` overwrites description values with lower-priority header-derived values.
2. Dialog open merges in wrong priority order (line 109: `...settings, ...map.header.extendedSettings`—`extendedSettings` wins over `description` settings, which is intentional but can mask bugs if `extendedSettings` is stale).
3. Dialog apply writes `extendedSettings: localSettings` but `description` is rebuilt from `localSettings` at that moment—these should match.
4. `saveMap()` calls `reserializeDescription(map.header.description, map.header.extendedSettings)`. If `extendedSettings` is missing keys, `reserializeDescription` fills them from `getDefaultSettings()`, overwriting user values with defaults.

**Prevention:** Trace the specific failing setting through all four steps before writing code. Add temporary `console.log` at each boundary. Don't add string-manipulation workarounds in the description—fix the merge priority or the missing-key path at the correct step.

**Detection:** Choose the failing setting. Set it to a non-default value. Save map (Step 4). Close app. Reopen map (Step 1). Open dialog (Step 2). The value must match. This is the definitive test.

---

## Minor Pitfalls

---

### Pitfall 10: Move Selection — Double Undo Step

**What goes wrong:** A move operation erases tiles from source (writes DEFAULT_TILE) and writes original tiles to destination. If implemented as two separate `pushUndo/commitUndo` cycles, the user gets two Ctrl+Z steps for one logical operation.

**Prevention:** Collect all tile deltas (source erase + destination write) in a single `TileDelta[]` array and commit once via `commitUndo('Move selection')`. The undo system already supports batch deltas.

---

### Pitfall 11: Map Boundary Visualization — Per-Tile Loop at Low Zoom

**What goes wrong:** At zoom 0.25x, the out-of-bounds region can be 480+ tiles wide. If the boundary is drawn as a per-tile `fillRect()` loop (copying the tile rendering pattern), that is 480+ individual draw calls per frame on the UI layer.

**Prevention:** Use a single `fillRect()` for each of the four out-of-bounds strips (left, right, top, bottom). Clip to screen canvas bounds. This is O(1) regardless of zoom.

---

### Pitfall 12: Minimap `getCanvasContainerSize` — Fragile DOM Query

**What goes wrong:** `Minimap.tsx` line 248 uses `document.querySelector('.main-area')` to measure the workspace for viewport rectangle calculation. If `.main-area` is renamed or restructured, it silently falls back to `{ width: window.innerWidth, height: window.innerHeight - 100 }`, which is incorrect when toolbars modify available height.

**Prevention:** Do not rename or restructure `.main-area` during this milestone. If a refactor is needed, use a `ResizeObserver` with a React ref instead of a class name query.

---

### Pitfall 13: Move Selection — Missing Cursor Affordance

**What goes wrong:** When the cursor is inside an active selection with the SELECT tool, there is no visual cue that dragging will move rather than create a new selection. Users will not discover the feature.

**Prevention:** In `drawUiLayer`, when `currentTool === ToolType.SELECT` and cursor tile is inside `selection.startX..endX, startY..endY`, set `uiLayerRef.current.style.cursor = 'move'`. Reset to default otherwise. This is already the right place to imperatively set cursor style on the canvas element.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Move Selection — mousedown routing | Pitfall 1: inside/outside split | Hit-test normalized selection; separate moveRef |
| Move Selection — buffer management | Pitfall 2: buffer desync on cancel | UI layer for preview only; commit to store on mouseup |
| Move Selection — post-move coords | Pitfall 3: copy/cut on wrong region | Call setSelection() with new coords on commit |
| Move Selection — undo | Pitfall 10: two-step undo | Single commitUndo with combined deltas |
| Move Selection — UX | Pitfall 13: no cursor affordance | Set canvas cursor style in drawUiLayer |
| Map boundary visualization — rendering | Pitfall 4: writing outside buffer | UI layer canvas only; fillRect strips not loops |
| Map boundary visualization — theme | Pitfall 6: stale color after theme change | requestUiRedraw() in onSetTheme handler |
| Map boundary visualization — perf | Pitfall 11: per-tile loop at low zoom | Single fillRect per out-of-bounds strip |
| Minimap/tool panel z-order | Pitfall 5: z-index 100 below windows | Set overlays to z-index: 9999; document budget |
| Minimap size +32 | Pitfall 7: overlap with tool panel | Test at 800x600; flex-stack if overlap occurs |
| Minimap size +32 | Pitfall 12: fragile .main-area query | Keep .main-area class stable |
| Grenade/Bouncy dropdown sync | Pitfall 8: fixing wrong layer | Trace to actual SEdit preset values first |
| Settings serialization | Pitfall 9: symptom-only fix | Trace full 4-step round-trip; log at each boundary |

## Sources

All findings are HIGH confidence — derived from direct inspection of production source files:

- `src/core/canvas/CanvasEngine.ts` — buffer architecture, drag protocol, prevTiles sync (lines 258-270)
- `src/components/MapCanvas/MapCanvas.tsx` — selection drag ref pattern (lines 60, 1851-1855, 2045-2058), UI layer rendering, mousedown/up/leave handlers
- `src/components/Minimap/Minimap.tsx` — MINIMAP_SIZE=128, getCanvasContainerSize DOM query (line 248)
- `src/components/Workspace/ChildWindow.tsx` — react-rnd usage, zIndex from windowState (line 189)
- `src/core/editor/slices/windowSlice.ts` — BASE_Z_INDEX=1000, Z_INDEX_NORMALIZE_THRESHOLD=100000 (lines 14-15)
- `src/components/Minimap/Minimap.css` — z-index: 100 (currently below raised windows)
- `src/components/GameObjectToolPanel/GameObjectToolPanel.css` — z-index: 100 (same problem)
- `src/components/Workspace/Workspace.css` — minimized-bars z-index: 500; no stacking context on .workspace
- `src/App.css` — .main-area: position:relative without z-index (no stacking context)
- `src/App.tsx` — theme change mechanism (lines 382-421), IPC handler
- `src/core/map/settingsSerializer.ts` — full serialization flow, merge priorities
- `src/components/MapSettingsDialog/MapSettingsDialog.tsx` — dialog open/apply paths (lines 94-135, 147-155)
- `src/core/editor/slices/types.ts` — Selection, TileDelta, DocumentState shapes
