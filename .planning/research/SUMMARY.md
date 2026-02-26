# Project Research Summary

**Project:** AC Map Editor — v1.2.3 Canvas Backgrounds & Fixes
**Domain:** Electron/React tile map editor (SubSpace/Continuum format)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

This milestone (v1.2.3) targets four discrete improvements to the AC Map Editor: a live canvas background mode selector, a production-correct bundled patch dropdown, a wall type preservation fix, and removal of the 30-minute update check interval. All four features are implementable without any new npm packages — every piece of infrastructure required already exists in the codebase. The central opportunity is porting the export-only `drawBackground()` logic from `overviewRenderer.ts` into the live `CanvasEngine`, wiring it at blit time rather than into the tile buffer, while fixing a production-breaking patch loading bug and two smaller correctness issues.

The recommended implementation order is wall fix first (pure logic, zero risk), then update check removal (one-line deletion), then patch dropdown IPC fix (establishes reliable production path loading needed before farplane can work), and finally the canvas background mode selector (largest feature, depends on the patch fix for reliable farplane delivery). This sequencing avoids the critical risk of building background mode UI before the farplane image delivery path is production-correct.

The three sharpest risks are: (1) drawing background into the off-screen tile buffer instead of at blit time — which causes incremental-patch holes immediately on the first paint stroke; (2) bundled patch loading silently 404ing in production builds because `./assets/patches/` does not resolve against `extraResources`; and (3) the `blitDirtyRect` animation path bypassing the full `blitToScreen`, causing background to disappear on animation ticks. All three risks are identified, have confirmed root causes in the live codebase, and have clear mitigations.

---

## Key Findings

### Recommended Stack

No new dependencies are required. All four features use the existing Electron 34 / React 18 / Zustand 5 / Canvas API stack. The only infrastructure additions are: a new Zustand field on `GlobalSlice` (`backgroundMode`, `backgroundModeColor`), two new methods on `CanvasEngine` (`setFarplaneImage`, `setBackgroundMode`), one new IPC handler (`app:getPatchesDir`), and one new preload exposure. No npm installs are needed.

**Core technologies:**
- **Zustand 5 (GlobalSlice):** Background mode preference — fits the existing `showGrid`/`gridOpacity`/`showAnimations` pattern; GlobalSlice is the correct home (not DocumentsSlice, which is per-document)
- **Canvas API (CanvasEngine):** Background rendering in `blitToScreen` between `clearRect` and `drawImage(buffer)` — this is the only correct insertion point; never draw background into `bufferCtx`
- **Electron IPC (main.ts + preload.ts):** `app:getPatchesDir` handler replicates the dev/prod path-split pattern already at `dialog:openPatchFolder` lines 554–558; necessary for production patch loading
- **electron-updater 6.x:** Startup-only check — removing the 30-minute `setInterval` is a one-line deletion; the `manualCheckInProgress` guard on the startup `setTimeout` prevents a 5-second race window

### Expected Features

**Must have (table stakes — all four are P1):**
- **Wall type preservation during connection update** — painting any wall type adjacent to another must not bleed the current type onto neighbors; `findWallType()` already exists and is correctly used in the disconnect path but not the placement path
- **Startup-only update check** — polling every 30 minutes is unexpected background network traffic for a desktop utility; startup-only is the established convention
- **Live canvas background mode** — any editor that exports with background modes should preview those modes live; the export dialog already exposes 5 modes but CanvasEngine has no background mode awareness
- **Bundled patch dropdown production correctness** — the dropdown works in dev (Vite serves `public/`) but silently 404s in packaged builds (`extraResources` places patches in `resources/patches/`, not reachable via `./assets/patches/` URL)

**Should have (ship with this milestone):**
- **Patch dropdown active indicator** — show which bundled patch is currently loaded; `activePatch: string | null` in App.tsx state, checkmark or bold in dropdown; pairs naturally with background mode and the patch loading rewrite

**Defer to v2+:**
- **Background mode persistence across sessions** — `localStorage` persistence; worthwhile only once the feature is in use and users request it
- **Minimap background mode sync** — visual consistency win; minimap already has its own farplane pixel cache
- **Per-patch farplane fallback chain** — `.jpg` → `.png` probing; AC Default has `.jpg`, others use `.png`; the IPC-based patch loader handles this with `listDir` + extension matching

**Anti-features (never implement):**
- Per-document canvas background mode (over-engineering; global session state is correct)
- Real-time farplane tiling/repeat (SubSpace renders a single scaled image, not tiled)
- Background mode stored in map file (editor preference, not map data; description field has byte limits)
- Configurable update interval in settings (the interval should not exist at all)

### Architecture Approach

The architecture is already well-structured for all four changes. `CanvasEngine` is an imperative object with setter-based integration (`setTilesetImage` pattern extends to `setFarplaneImage` and `setBackgroundMode`). Background mode state goes in `GlobalSlice` and triggers a targeted Zustand subscription that calls `blitToScreen` only — never a buffer rebuild. The 4096x4096 off-screen buffer remains a pure tile store. The patch loading path unifies under the IPC-based `readFile` → base64 → `data:` URL pattern already established by `handleChangeTileset`.

**Major components and their changes:**

1. **`WallSystem.ts`** — Fix `updateNeighbor()` and `collectNeighborUpdate()`: replace `this.currentType` with `findWallType(currentTile)` (4 lines changed across 2 methods)
2. **`electron/main.ts`** — Remove `setInterval` (1 line deleted); add `!manualCheckInProgress` guard to startup `setTimeout`; add `app:getPatchesDir` IPC handler
3. **`electron/preload.ts`** — Expose `getPatchesDir` via contextBridge
4. **`App.tsx`** — Rewrite `handleSelectBundledPatch` to use `getPatchesDir` IPC + `listDir` + `readFile` (same pattern as `handleChangeTileset`); add `activePatch: string | null` state
5. **`GlobalSlice`** — Add `backgroundMode`, `backgroundModeColor`, `setBackgroundMode`
6. **`CanvasEngine`** — Add `setFarplaneImage()`, `setBackgroundMode()`; add background rendering in `blitToScreen` (before buffer blit) AND in `blitDirtyRect` (before dirty-rect buffer blit); add 4th Zustand subscription watching `backgroundMode`
7. **`MapCanvas.tsx`** — Pass `farplaneImage` prop; call `engine.setFarplaneImage(img)` in `useEffect`
8. **`CanvasBackgroundSelector`** (new component) — Dropdown or button group; disables farplane option when `farplaneImage === null`; calls `setBackgroundMode(mode)` in GlobalSlice
9. **`TilesetPanel`** — Render checkmark or bold on active patch dropdown item

### Critical Pitfalls

1. **Background drawn into the off-screen buffer** — `bufferCtx.fillRect` before tile rendering causes incremental-patch holes at every empty tile (tile 280) after any paint stroke. Avoid: draw background in `blitToScreen`/`blitDirtyRect` on `screenCtx` only, never `bufferCtx`.

2. **`blitDirtyRect` bypasses `blitToScreen` — background disappears on animation ticks** — The animation dirty-rect path (`patchAnimatedTiles`) clears a screen region without re-filling background. Avoid: extract a `drawBackground(ctx, clipX, clipY, clipW, clipH)` helper and call it from both `blitToScreen` and `blitDirtyRect` before the buffer blit.

3. **Bundled patches silently 404 in production** — `./assets/patches/` relative URL resolves correctly in Vite dev server but fails in packaged builds where patches live in `resources/patches/` via `extraResources`. Avoid: use `getPatchesDir` IPC + `readFile` IPC for all bundled patch loading.

4. **`updateNeighbor` and `collectNeighborUpdate` bleed `currentType` to neighbors** — Both the single-place and batch-place paths have the same bug. Avoid: fix both in the same commit using `findWallType(currentTile)`; do not fix only one.

5. **Background mode switch triggers full buffer rebuild** — If implementation incorrectly nulls `prevTiles` to force a redraw on mode change, all 65,536 tiles re-render with a visible flicker and CPU spike. Avoid: mode change must call `blitToScreen` only via a targeted Zustand subscription; never invalidate `prevTiles` for a background mode change.

---

## Implications for Roadmap

Based on research, the four features map cleanly to four phases with a clear dependency ordering. All four are independent enough to be separate plans but share one dependency chain: patch fix before background mode.

### Phase 1: Wall Type Preservation Fix
**Rationale:** Pure logic fix in `WallSystem.ts` with zero UI changes and zero dependencies on other phases. Highest correctness value per line of code. Establishes the batch-fix pattern (both `updateNeighbor` and `collectNeighborUpdate` in one commit) before any more complex work begins.
**Delivers:** Wall type integrity — painting any wall type adjacent to any other no longer corrupts neighbor tile IDs. Both the single-place tool and the line tool (WALL_RECT / `placeWallBatch`) are fixed in one commit.
**Addresses:** P1 table stakes — wall type preservation (FEATURES.md)
**Avoids:** Pitfall 4 (type bleed on placement) and Pitfall 10 (same bug in batch path — must fix both methods)
**Files:** `src/core/map/WallSystem.ts` only
**Research flag:** Not needed — root cause confirmed at line 174 and line 243, fix is 4 lines

### Phase 2: Startup-Only Update Check
**Rationale:** One-line deletion plus a one-line guard. Zero UI changes. No dependencies. Land this before any more complex changes to `electron/main.ts` (the patch IPC and background mode phases will also touch main.ts), minimizing merge surface.
**Delivers:** Removal of unexpected background network traffic; startup check preserved; Help > Check for Updates menu item remains functional; no spurious dialog within 5 seconds of launch.
**Addresses:** P1 table stakes — startup-only update behavior (FEATURES.md)
**Avoids:** Pitfall 5 (`manualCheckInProgress` race on launch) by adding the `!manualCheckInProgress` guard to the startup `setTimeout` — required even when only removing the interval
**Files:** `electron/main.ts` only
**Research flag:** Not needed — change is fully specified

### Phase 3: Desktop Patch Dropdown (Production IPC Fix + Active Indicator)
**Rationale:** Must be completed before the background mode phase because the canvas background farplane mode depends on `farplaneImage` being loaded reliably in production builds. The URL-based loader silently fails in packaged builds; the IPC-based loader is the correct foundation. The active patch indicator is bundled here because it is low-complexity and pairs naturally with the patch loading rewrite.
**Delivers:** Bundled patch selection works in packaged builds; AC Default `.jpg` farplane loads correctly (extension probing via `listDir` + `imageExts` matching); active patch is visually indicated in the dropdown.
**Addresses:** P1 bundled patch correctness; P2 active patch indicator (FEATURES.md)
**Uses:** `app:getPatchesDir` IPC handler; `listDir` + `readFile` IPC (existing); `activePatch` React state in App.tsx
**Avoids:** Pitfall 3 (production 404), Pitfall 8 (AC Default `.jpg` extension mismatch)
**Files:** `electron/main.ts` (add `app:getPatchesDir` handler), `electron/preload.ts` (expose to renderer), `src/App.tsx` (rewrite `handleSelectBundledPatch`, add `activePatch` state), `src/components/TilesetPanel/TilesetPanel.tsx` (active indicator rendering)
**Research flag:** Not needed — IPC pattern fully established by existing `handleChangeTileset`; replicate exactly

### Phase 4: Canvas Background Mode Selector
**Rationale:** Largest feature; depends on Phase 3 (farplane must load reliably in production before exposing farplane mode in UI). GlobalSlice addition, CanvasEngine changes, and a new UI component are all well-scoped. The critical implementation constraint — background in `blitToScreen`/`blitDirtyRect`, never in the buffer — is confirmed and specified with exact coordinate math in ARCHITECTURE.md.
**Delivers:** Live background mode selector (transparent/checkerboard, classic magenta, farplane, custom color). Background correctly scrolls with the map on pan. Animation ticks do not cause background to disappear. Mode switches are instant (blit-only, no buffer rebuild). Farplane option is disabled when no farplane is loaded.
**Addresses:** P1 live canvas background mode (FEATURES.md)
**Uses:** GlobalSlice; CanvasEngine setter pattern; new `CanvasBackgroundSelector` component; 4th Zustand subscription; `drawBackground` helper called from both `blitToScreen` and `blitDirtyRect`
**Avoids:** Pitfall 1 (buffer contamination), Pitfall 2 (blitDirtyRect missing background), Pitfall 6 (unnecessary full rebuild on mode switch), Pitfall 7 (background drifting on pan)
**Files:** `src/core/editor/slices/globalSlice.ts`, `src/core/canvas/CanvasEngine.ts`, `src/components/MapCanvas/MapCanvas.tsx`, `src/components/CanvasBackgroundSelector/CanvasBackgroundSelector.tsx` (new)
**Research flag:** Not needed — implementation fully specified in ARCHITECTURE.md with coordinate math for both `blitToScreen` and `blitDirtyRect` variants

### Phase Ordering Rationale

- Phase 1 and Phase 2 are fully independent and could run in either order; Phase 1 is first because it fixes map corruption (higher direct user impact per line changed).
- Phase 3 must precede Phase 4: the farplane background mode is only as reliable as the patch loading path. Shipping background mode UI without fixing the production loader would mean farplane mode silently fails in packaged builds for all bundled patches.
- Phase 4 is last as the largest change; it should not block landing the three quick wins.
- No phase requires another to be complete before its own testing, except Phase 4 which requires Phase 3 to validate farplane background in a production build.

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Wall fix):** Fully specified — 4 lines in 2 methods, root cause confirmed at exact line numbers
- **Phase 2 (Update check):** Fully specified — 1 deletion + 1 guard line in `electron/main.ts`
- **Phase 3 (Patch IPC):** Pattern already established in `handleChangeTileset`; replicate exactly using `listDir` + extension probing
- **Phase 4 (Background mode):** Implementation fully specified with coordinate math; no niche domain; `drawBackground` helper shape and integration points are documented

None of the four phases require additional research during planning. All confidence levels are HIGH.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings verified against live codebase — no new packages, all existing patterns reused |
| Features | HIGH | Direct codebase inspection + SEDIT reference editor behavior; all four features are table stakes or clearly scoped |
| Architecture | HIGH | Full file reads of CanvasEngine.ts, WallSystem.ts, globalSlice.ts, App.tsx, main.ts, preload.ts; line numbers cited for all bug locations |
| Pitfalls | HIGH | Root causes confirmed in source at specific line numbers; all mitigations specified with code examples |

**Overall confidence:** HIGH

### Gaps to Address

- **`blitDirtyRect` background helper coordinate math:** The helper `drawBackground(ctx, clipX, clipY, clipW, clipH)` is specified but the exact farplane `drawImage` sub-rect math within `blitDirtyRect` (mapping dirty-rect screen coords back to farplane image coords) needs to be worked out during Phase 4 execution. The `blitToScreen` farplane math is fully specified in ARCHITECTURE.md; the dirty-rect variant is an adaptation of that same transform.

- **`CanvasBackgroundSelector` UI placement:** Research recommends "toolbar or near the canvas" but final placement (which toolbar section, icon style, label vs. icon-only) is a UX decision left to the Phase 4 plan. The transparent mode option should render a CSS checkerboard (standard transparency indicator) rather than a blank canvas, which requires one CSS rule on the canvas element in transparent mode.

- **Background mode persistence (localStorage):** Research flags this as "add after validation." If the roadmap includes it in Phase 4, it is a low-complexity addition (`localStorage.setItem` on mode change, one read on startup using the `ac-editor-theme` pattern from App.tsx line 441). If deferred, note it explicitly in STATE.md after Phase 4 ships so it is not forgotten.

---

## Sources

### Primary (HIGH confidence — live codebase direct inspection)

- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — buffer architecture, `blitToScreen` (lines 215–258), `blitDirtyRect` (lines 360–398), `renderTile` tile-280 skip (line 143), incremental patching (lines 185–205)
- `E:\NewMapEditor\src\core\map\WallSystem.ts` — `updateNeighbor` bug (line 174), `collectNeighborUpdate` bug (line 243), `findWallType` (lines 179–186), correct usage in `updateNeighborDisconnect` (lines 270–285)
- `E:\NewMapEditor\src\core\export\overviewRenderer.ts` — `BackgroundMode` type (5 variants), `drawBackground()` implementation for all modes
- `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — GlobalSlice fields and setter pattern; `backgroundMode` does not yet exist here
- `E:\NewMapEditor\electron\main.ts` — `setupAutoUpdater` (lines 328–390), `setInterval` at line 389, `manualCheckInProgress` flag, `openPatchFolderDialog` dev/prod path split (lines 554–558)
- `E:\NewMapEditor\electron\preload.ts` — contextBridge exposure pattern
- `E:\NewMapEditor\src\App.tsx` — `handleSelectBundledPatch` URL-based loader (line 165, broken in prod), `handleChangeTileset` IPC-based loader (lines 87–161, correct pattern), `farplaneImage` React state
- `E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.tsx` — patch dropdown, no active state indicator
- `E:\NewMapEditor\package.json` — `extraResources` config (lines 77–82), patches → `resources/patches/`

### Secondary (MEDIUM confidence)

- Electron documentation pattern for `process.resourcesPath` — consistent with existing usage at `electron/main.ts` line 557; no version concern for Electron 34
- Project memory: SubSpace/Continuum tile format, farplane semantics, SEDIT as reference editor

---

*Research completed: 2026-02-26*
*Ready for roadmap: yes*
