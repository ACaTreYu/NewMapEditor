# Project Research Summary

**Project:** AC Map Editor v1.1.3 — Fixes & Polish
**Domain:** Electron/React tile map editor — targeted bug fixes, UX polish, and one new interaction feature
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

v1.1.3 is a polish-and-fixes milestone built entirely on the existing stack — no new libraries, no schema changes, no architectural pivots. Every feature is implementable using established primitives confirmed present in the codebase during research. The six features fall into three tiers: trivial one-line fixes (minimap z-order via CSS `isolation: isolate`, minimap size constant), targeted logic repairs (settings serialization completeness, grenade/bouncy dropdown sync), and new UI interactions of moderate complexity (move selection tool, map boundary visualization).

The recommended implementation order is dependency-driven. The z-order fix is isolated CSS and ships first as a fast win. Settings bugs (serialization and grenade/bouncy dropdown sync) are independent of all canvas work and address the highest user-pain items. Map boundary visualization adds a new canvas layer to MapCanvas.tsx, which must be stable before move-selection adds further mouse handler logic on top. Move selection is last because it touches the most critical event-handling code and requires careful ref-based drag state design to avoid conflicts with the existing selection-draw behavior.

The top risk is move-selection: the existing `handleMouseDown` branch for `ToolType.SELECT` unconditionally clears and restarts a selection drag. Splitting that branch to distinguish "click inside active selection to move" from "click outside to start new selection" requires precise hit-testing and a dedicated `moveSelectionRef` that never reuses `selectionDragRef`. The second risk is the settings serialization bug — the fix must trace the full round-trip (loadMap → dialog open → apply → saveMap) rather than patching at the symptom site, since the 53-key serialization code itself is confirmed correct.

## Key Findings

### Recommended Stack

No new dependencies are required. The existing stack (Electron 34, React 18, TypeScript 5.7, Vite 6, Zustand 5, Canvas 2D API) is sufficient for all six features. Move-selection extends the ref-based drag pattern established in MapCanvas.tsx. Map boundary visualization uses a fourth canvas layer with four `fillRect` strips. Z-order and minimap size are single-constant and single-property changes. Settings fixes are targeted logic repairs in existing dialog and serialization code.

**Core technologies relevant to v1.1.3:**
- **Canvas API (2D context):** Powers three existing canvas layers (map, grid, UI); boundary visualization adds a fourth boundary layer using the same append-a-canvas pattern — no library needed
- **Zustand (DocumentsSlice):** `setSelection()` and `setTiles()` actions already provide everything move-selection needs for committing drag results and updating tile data
- **CSS `isolation: isolate`:** The architecturally clean fix for minimap/tool-panel occlusion — contains the entire MDI z-index contest inside `.workspace`'s stacking context; minimap and tool panel win by stacking context precedence, not by raw z-index competition

**What NOT to add:**
- Any drag library — `selectionDragRef` ref-based pattern already established in MapCanvas
- React portal for Minimap — CSS `isolation: isolate` is sufficient and architecturally cleaner
- Additional CanvasEngine changes — boundary is a viewport-space concern, not a tile-buffer concern
- Settings library (Formik, react-hook-form) — this is a targeted bug fix, not a form architecture change
- Any npm package — not justified by any v1.1.3 feature

### Expected Features

**Must have (table stakes):**
- **Move selection (marquee reposition)** — SELECT tool is the primary editing workflow; users must reposition the marquee after drawing it without discarding it; drag inside selection moves the bounds, drag outside creates a new selection
- **Map boundary visualization** — without a visible map edge, working near tile 255 is ambiguous; users cannot tell where the 256x256 editable area ends
- **Minimap z-order fix** — any raised MDI window (z-index >= 1000) currently covers the minimap (z-index 100) entirely; maximized windows make navigation impossible
- **GameObjectToolPanel z-order fix** — same z-index 100 bug as the minimap; same one-line CSS fix covers both
- **Grenade/Bouncy dropdown sync** — MissileDamage has a labeled 5-level dropdown; grenade and bouncy lack equivalent presets, creating inconsistent UX for weapon configuration
- **Settings serialization completeness** — user-reported: custom settings lost after save; highest-pain bug because wrong settings reach the live AC game server

**Should have (polish, low effort, ship with table stakes):**
- **Move selection keyboard nudge** — arrow-key nudge of the marquee (1 tile/press, 10 with Shift), consistent with Tiled and RPG Maker; low effort given move-selection ref is already in place
- **Map boundary border line** — 1px `strokeRect` on the UI overlay canvas at tile (0,0)–(256,256) drawn in `drawUiLayer`; complements the CSS background zone distinction
- **Minimap size increase (+32x32)** — change `MINIMAP_SIZE` constant from 128 to 160 in Minimap.tsx; single-line change with full constant propagation confirmed

**Defer (v2+):**
- Floating selection (Photoshop-style: lifted tile data follows cursor on a separate canvas layer)
- Cut-move-paste (tile movement with selection): significantly larger feature, requires floating selection architecture
- Custom per-weapon preset scales beyond the shared `SPECIAL_DAMAGE_VALUES` scale
- `grenadesEnabled` binary header field (SubSpace format is fixed; workaround via `NadeEnergy=57` extended setting)

### Architecture Approach

The codebase follows a strict separation between the off-screen buffer (owned by CanvasEngine, tile-coordinate space) and viewport-space overlays (rendered in MapCanvas's UI canvas layer). All transient drag state lives in refs to avoid React re-renders; Zustand is written only on commit (mouseup). This pattern must be preserved for move-selection. The MDI z-index system uses a contained normalization scheme (BASE_Z_INDEX=1000, threshold=100000) that can be cleanly isolated using CSS `isolation: isolate` on `.workspace`, fixing all overlay occlusion issues in one architectural move rather than a z-index arms race.

**Major components touched in v1.1.3:**
1. **MapCanvas.tsx** — receives move-selection ref logic, boundary layer canvas, cursor affordance changes (most changed file; all tool interaction lives here)
2. **Workspace.css** — receives `isolation: isolate` on `.workspace` rule (one line, highest impact-per-line ratio of the milestone)
3. **MapSettingsDialog.tsx** — receives grenade/bouncy dropdown controls and the fix for the `extendedSettings` population path
4. **Minimap.tsx / Minimap.css** — MINIMAP_SIZE constant 128 → 160; z-index reviewed (may be resolved by `isolation: isolate` on workspace)
5. **settingsSerializer.ts / MapService.ts** — audited for serialization gaps; serialization code confirmed correct; bug is upstream in `extendedSettings` population

**Key existing primitives (all confirmed present):**
- `selectionDragRef` — ref-based selection draw drag; move-selection adds a parallel `moveSelectionRef`
- `drawUiLayer` / `scheduleUiRedraw` — existing RAF-debounced UI canvas redraw; boundary and move-selection preview hook here
- `tileToScreen()` — maps tile coordinates to screen pixels at any zoom; boundary `strokeRect` uses this
- `setSelection()` / `setTiles()` — Zustand actions for committing move-selection results
- `SelectionTransforms.ts` — existing region read/write logic for copy/paste/rotate; tile move logic belongs here

### Critical Pitfalls

1. **Move-selection drag conflict with select-draw** — `handleMouseDown` currently unconditionally calls `clearSelection()` and starts a new selection drag. Must split on inside/outside hit-test using normalized selection coordinates (`x >= startX && x <= endX && y >= startY && y <= endY`). Use a dedicated `moveSelectionRef`; never reuse `selectionDragRef`. Escape during move must revert to original coordinates via the existing keydown listener at line ~2365.

2. **Buffer desync on cancelled move drag** — Never call `CanvasEngine.patchTileBuffer()` during the drag. Preview the lifted tiles and dim the source region on the UI canvas layer only. Commit tile changes to Zustand as a single `setTiles()` batch on mouseup. `onMouseLeave` must revert cleanly (identical behavior to mouseup cancel).

3. **Post-move selection coordinates stale** — After a successful move, `setSelection()` must be called with the new coordinates or all subsequent copy/cut/delete operations act on the vacated region (which now contains DEFAULT_TILE). Test: select region, move it, press Delete — only the new position should clear.

4. **Z-order stacking context trap** — Raising minimap z-index today is fragile: if any developer later adds `transform` or `will-change` to `.workspace`, a new stacking context is created silently and the fix breaks. Preferred fix: `isolation: isolate` on `.workspace` permanently contains MDI z-indexes, making overlay z-values irrelevant to the contest. Document the z-index budget in a CSS comment.

5. **Settings serialization: trace the full round-trip, not the symptom** — The `serializeSettings` / `reserializeDescription` code is confirmed correct for all 53 keys. The bug is upstream: `extendedSettings` may be empty or stale when `saveMap()` reads it (save without clicking Apply, or save a new map without opening the settings dialog). Fix at the population step in `createEmptyMap()` or `MapService.saveMap()`, not in the serialization layer.

## Implications for Roadmap

Based on research, the dependency graph drives a clear 4-phase structure. Each phase is self-contained and leaves the codebase in a releasable state.

### Phase 1: Overlay and Z-Order Fixes
**Rationale:** Pure CSS and single-constant changes, zero regression risk, immediate visible win. No dependencies on any other phase. Ships in under an hour. Establishes the z-index budget documentation before other phases touch related CSS.
**Delivers:** Minimap always visible above maximized MDI windows; GameObjectToolPanel same; minimap enlarged to 160x160 px; z-index budget documented in CSS comments.
**Addresses:** Minimap z-order (table stakes), tool panel z-order (table stakes), minimap size increase (should have)
**Avoids:** Pitfall 5 (stacking context trap) — use `isolation: isolate` on `.workspace`, not raw z-index escalation
**Files:** `Workspace.css` (add `isolation: isolate`), `Minimap.tsx` (MINIMAP_SIZE 128 → 160), `Minimap.css` (verify/document z-index), `GameObjectToolPanel.css` (verify/document z-index)

### Phase 2: Settings Bug Fixes
**Rationale:** Highest user-facing pain (settings lost after save affects live AC game server behavior). Independent of all canvas work. The bug is in dialog initialization and the save-without-apply path, not in serialization code. Triage before coding — trace the full 4-step round-trip with debug logs.
**Delivers:** All 53 settings reliably round-trip through save/load cycles. Grenade and Bouncy weapon types have labeled preset dropdowns consistent with the Missile dropdown. `extendedSettings` is fully populated on new maps before first save.
**Addresses:** Settings serialization completeness (table stakes), Grenade/Bouncy dropdown sync (table stakes)
**Avoids:** Pitfall 8 (fixing wrong layer — identify actual mismatch before writing code); Pitfall 9 (symptom-only fix — trace the merge priority chain at all four steps)
**Files:** `MapSettingsDialog.tsx` (dropdown additions, load-path fix), `settingsSerializer.ts` (only if gaps found during audit), `MapService.ts` (verify `extendedSettings` population)

### Phase 3: Map Boundary Visualization
**Rationale:** Adds a new boundary canvas layer to MapCanvas.tsx before move-selection adds ref logic. The canvas layer stacking order must be stable before mouse handler additions. Independent of settings work. The boundary layer is clean: redraws only on viewport change, uses four `fillRect` calls, never touches CanvasEngine.
**Delivers:** Clear visual distinction between the 256x256 editable map area and the scrollable outside region. UI overlay border line at tile (0,0)–(256,256). Theme-aware out-of-bounds overlay color. Border updates correctly on theme change.
**Addresses:** Map boundary visualization (table stakes + should-have border line)
**Avoids:** Pitfall 4 (drawing outside the buffer — boundary is UI-layer-only); Pitfall 6 (stale color after theme change — add `requestUiRedraw()` to `onSetTheme` handler in App.tsx); Pitfall 11 (per-tile loop at low zoom — single `fillRect` per out-of-bounds strip)
**Files:** `MapCanvas.tsx` (new boundary canvas layer + `drawBoundaryLayer` callback, theme redraw), `MapCanvas.css` (canvas stacking order), `App.tsx` (add `requestUiRedraw()` to `onSetTheme` IPC handler)

### Phase 4: Move Selection Tool
**Rationale:** Most surface area of any v1.1.3 feature; modifies the mouse handler branching logic that underpins all tile editing. Sequenced last so all prior changes are merged and stable. Requires new ToolType enum value, dedicated move ref, ToolBar button, and careful single-step undo batching.
**Delivers:** Users can reposition the selection marquee by dragging inside it while SELECT tool is active. Cursor changes to `move` when hovering inside an active selection. Escape reverts mid-drag. Single Ctrl+Z undoes the entire move as one operation. Arrow-key nudge (1 tile, 10 with Shift) piggybacks on existing keydown handler.
**Addresses:** Move selection (table stakes); keyboard nudge (should have)
**Avoids:** Pitfall 1 (drag conflict — split mousedown branch with inside/outside hit-test on normalized selection); Pitfall 2 (buffer desync — UI layer preview only, batch tile commit on mouseup); Pitfall 3 (stale selection coords after move — call `setSelection()` with new coords on commit); Pitfall 10 (double undo — single `commitUndo` with combined source-erase + dest-write deltas); Pitfall 13 (no cursor affordance — set `canvas.style.cursor = 'move'` in `drawUiLayer` hover path)
**Files:** `src/core/map/types.ts` (add MOVE_SELECTION to ToolType), `MapCanvas.tsx` (moveSelectionRef, mouse handler branching, cursor logic), `ToolBar.tsx` (new tool button), `SelectionTransforms.ts` (tile region read/write/erase logic)

### Phase Ordering Rationale

- **CSS-only changes lead** (Phase 1): zero regression risk; confirms z-index budget before any JS work begins; fast confidence builder
- **Settings bugs are independent** (Phase 2): fully decoupled from canvas changes; addresses highest user-pain; can be developed in parallel with Phase 1 on a different branch if desired
- **Boundary visualization before move-selection** (Phase 3): adds the fourth canvas layer and stabilizes MapCanvas structure before Phase 4 modifies mouse handler branching — reduces merge conflict risk
- **Move selection last** (Phase 4): modifies the most critical event-handling code; later sequencing means all other changes are merged and the codebase is stable when the most complex feature lands

### Research Flags

Phases needing deeper triage during planning:
- **Phase 2 (Settings root cause):** Do not write code until the live round-trip is traced with debug logging. The serialization layer is confirmed correct; the bug is in the `extendedSettings` population path. The plan phase should include an explicit triage step as the first task.
- **Phase 2 (Grenade/Bouncy preset scale values):** `NadeDamage` and `NadeRecharge` preset arrays are LOW confidence (SEdit source inaccessible). Safe fallback: reuse `SPECIAL_DAMAGE_VALUES` for both grenade and bouncy. Validate against `AC_Setting_Info_25.txt` actual defaults during implementation.

Phases with well-understood patterns (standard implementation, skip `/gsd:research-phase`):
- **Phase 1 (Z-order + minimap size):** Fully characterized — one CSS property (`isolation: isolate`), one constant. Mechanical execution.
- **Phase 3 (Map boundary):** Implementation pattern fully specified in ARCHITECTURE.md (four `fillRect` strips, UI layer only). Mechanical execution.
- **Phase 4 (Move selection):** Ref-based drag pattern and data flow are the established MapCanvas pattern. Integration points and ref shape fully specified in FEATURES.md and ARCHITECTURE.md. No novel patterns required.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct package.json and source inspection; zero new dependencies confirmed |
| Features | HIGH | Behavioral expectations derived from existing code patterns; grenade preset values are the one LOW-confidence detail (SEdit source inaccessible) |
| Architecture | HIGH | All integration points confirmed from full source reads of MapCanvas.tsx, CanvasEngine.ts, windowSlice.ts, settingsSerializer.ts, and CSS files; line numbers cited |
| Pitfalls | HIGH | All pitfalls derived from confirmed code paths with line number citations; none are speculative |

**Overall confidence:** HIGH

### Gaps to Address

- **Grenade/Bouncy preset scale for NadeDamage / NadeRecharge:** Values are proportionally derived, not confirmed from SEdit source. During Phase 2 execution, validate against `AC_Setting_Info_25.txt` defaults and test against live AC game behavior. Safe fallback: use `SPECIAL_DAMAGE_VALUES` for both weapon types — functional even if not precisely matching SEdit conventions.

- **Settings serialization exact failure scenario:** Three candidate root causes identified (save without Apply, new map without opening dialog, or AC binary description field truncation). Exact trigger needs a live debug trace during Phase 2 triage. The fix is simple once confirmed; the gap is identifying which candidate is the actual trigger.

- **Minimap / GameObjectToolPanel overlap at small window sizes:** With the minimap enlarged to 160x160, at 800x600 total window height the minimap bottom (8 + 160 = 168px from top) and tool panel top (workspace height - 8 - panel height) may collide. Verify during Phase 1 at 800x600. If collision: stack them in a CSS flex column anchored `top: 8px; right: 8px`.

- **Move-selection scope clarification (marquee-only vs tile-move):** Research confirms the v1.1.3 request is marquee reposition only (shift the selection bounds without moving tiles). Tile-move-with-selection is explicitly deferred. This distinction must be documented in the Phase 4 plan to prevent scope creep during implementation.

## Sources

### Primary (HIGH confidence — direct source inspection)

- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — three-canvas architecture, ref-based drag pattern, drawUiLayer, tileToScreen, selection state, mousedown/move/up/leave handlers
- `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — buffer architecture, prevTiles sync, patchTileBuffer protocol, drag commit lifecycle
- `E:\NewMapEditor\src\core\editor\slices\windowSlice.ts` — BASE_Z_INDEX=1000, Z_INDEX_NORMALIZE_THRESHOLD=100000 (lines 14-15)
- `E:\NewMapEditor\src\components\Minimap\Minimap.tsx` — MINIMAP_SIZE=128, SCALE propagation, getCanvasContainerSize DOM query (line 248)
- `E:\NewMapEditor\src\components\Minimap\Minimap.css` — z-index: 100 (confirmed below MDI windows)
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.css` — z-index: 100 (same problem as minimap)
- `E:\NewMapEditor\src\components\Workspace\Workspace.css` — stacking context analysis; minimized-bars z-index: 500; no stacking context on .workspace
- `E:\NewMapEditor\src\components\ToolBar\ToolBar.css` — dropdown z-index: 200000
- `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` — dropdown sync pattern (LASER_DAMAGE_VALUES, SPECIAL_DAMAGE_VALUES, RECHARGE_RATE_VALUES), applySettings path, findClosestIndex usage (lines 94-135, 147-155)
- `E:\NewMapEditor\src\core\map\settingsSerializer.ts` — full serialization pipeline confirmed correct for all 53 keys; reserializeDescription merge logic
- `E:\NewMapEditor\src\core\map\GameSettings.ts` — all 53 settings with defaults, ranges, categories (Bouncy and Grenade keys confirmed)
- `E:\NewMapEditor\src\core\editor\EditorState.ts` — backward-compat wrapper, Zustand slice composition, setSelection / setTiles actions
- `E:\NewMapEditor\src\App.tsx` — theme change IPC handler (lines 382-421); onSetTheme hook point for requestUiRedraw
- `E:\NewMapEditor\src\core\editor\slices\types.ts` — Selection interface shape, TileDelta, DocumentState
- `E:\NewMapEditor\src\core\map\types.ts` — ToolType enum (SELECT, PENCIL, etc.)
- `E:\NewMapEditor\package.json` — dependency versions confirmed

### Secondary (MEDIUM confidence)

- `E:\NewMapEditor\AC_Setting_Info_25.txt` — AC game setting names, defaults, and ranges; used for grenade/bouncy preset scale derivation (MEDIUM because grenade scale is inferred proportionally, not confirmed from SEdit binary source)

### Tertiary (LOW confidence)

- SEdit source analysis — **INACCESSIBLE** during research (`E:\AC-SEDIT-SRC-ANALYSIS` permission denied); grenade and bouncy preset values are proportionally derived, not confirmed from SEdit behavior

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
