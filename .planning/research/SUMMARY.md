# Project Research Summary

**Project:** AC Map Editor v1.6 — SELECT Tool & Animation Panel Redesign
**Domain:** Electron/React Tile Map Editor (SubSpace/Continuum format)
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

The v1.6 milestone adds a SELECT tool with full SEdit parity (marquee selection, copy/paste/cut/delete, mirror H/V, rotate 90°, floating paste preview) and redesigns the Animation Panel to match SEdit's vertical hex-numbered list with Tile/Anim mode toggle. Research across all four dimensions reveals **zero new dependencies required** — all features can be implemented using the existing Canvas API, TypeScript, React, and Zustand stack.

The recommended approach leverages internal clipboard state (not system clipboard), Canvas `lineDashOffset` for marching ants animation, pure TypeScript algorithms for transforms, and minimal Animation Panel changes (add radio toggle, modify click handler). The architecture requires 3 new state objects in EditorState, 13 new actions, and 2 new rendering passes in MapCanvas. No new components are needed — everything integrates into existing architecture patterns.

Key risks center on coordinate system accuracy at non-1x zoom (a known challenge from v1.5), tile encoding preservation during transforms (16-bit packed fields must survive rotation/mirror), and marching ants performance at low zoom levels (4800+ visible tiles). Mitigation strategies include: always storing selection bounds as integer tile coordinates, validating width/height metadata in clipboard data, using separate canvas layers for animation, and comprehensive testing at all zoom levels (0.25x to 4x).

## Key Findings

### Recommended Stack

**No new dependencies required.** All v1.6 features can be implemented with existing technologies already in package.json. The current stack provides all necessary capabilities: Canvas API for marching ants animation (`setLineDash`, `lineDashOffset`), JavaScript/TypeScript for tile transforms (array manipulation on Uint16Array), Zustand for selection/clipboard/floating paste state, and React hooks for 60fps animation loops via `requestAnimationFrame`.

**Core technologies (validated for v1.6):**
- **Canvas API (browser native)**: Marching ants animation, selection rectangle rendering, floating paste preview — uses `setLineDash()` and `lineDashOffset` for animated dashed borders
- **TypeScript 5.3.0**: Tile transform algorithms (rotate 90°, mirror H/V) — pure array manipulation on Uint16Array, no matrix libraries needed
- **Zustand 4.4.7**: Selection state, clipboard buffer, floating paste preview — follows existing state management pattern
- **React 18.2.0**: `requestAnimationFrame` hooks for smooth 60fps marching ants — reuses existing animation timer patterns

**Key decision:** Internal clipboard (Zustand state) instead of Electron system clipboard. This preserves 16-bit tile encoding perfectly, requires no serialization, enables instant copy/paste, and matches SEdit behavior. System clipboard adds unnecessary IPC overhead with zero user benefit.

### Expected Features

**SELECT Tool features align with industry table stakes:** Rectangular marquee selection, visual marching ants indicator, Escape to deselect, click-drag to define selection, copy/cut/paste with keyboard shortcuts (Ctrl+C/X/V), delete selection (fill with DEFAULT_TILE 280), and undo/redo integration. These features are universal expectations in tile map editors.

**Must have (table stakes):**
- Rectangular marquee selection with marching ants border
- Copy/Cut/Paste operations with custom clipboard format
- Delete selection (clear tiles)
- Keyboard shortcuts (Ctrl+C/X/V, Delete, Escape)
- Undo support for all destructive operations
- Floating paste preview (semi-transparent preview follows cursor)

**Should have (competitive differentiators):**
- Transform operations: Rotate 90° clockwise, Mirror horizontal, Mirror vertical
- Preserve animation frame offsets during transforms (bits 8-14)
- Transform respects tile semantics (note: rotation may create directional tile issues)

**Defer (v2+):**
- Multi-selection (non-contiguous regions) — adds complexity without clear benefit
- Rotation by arbitrary angles — tiles are discrete 16x16 sprites, only 90° makes sense
- Magic wand selection — use FILL tool for contiguous areas instead
- Copy as image to system clipboard — loses semantic tile meaning

**Animation Panel enhancements (low complexity):**
- Tile/Anim mode toggle (radio buttons) — switch between placing static tiles vs animations
- Hex ID display "00" to "FF" format (2-digit zero-padded) — currently shows without leading zero
- Current implementation already matches SEdit's vertical list pattern with live previews

### Architecture Approach

The existing Zustand/Canvas/React architecture already supports all required patterns for SELECT tool and Animation Panel redesign. **Zero new components needed** — all features integrate into existing MapCanvas, EditorState, ToolBar, and AnimationPanel components. Integration points are well-defined: add state objects to EditorState, add rendering passes to MapCanvas.draw(), add keyboard shortcuts to ToolBar, and add radio toggle to AnimationPanel.

**Major components and required modifications:**

1. **EditorState (Zustand store)** — Add 3 state objects (SelectionState, ClipboardState, FloatingPasteState) and 13 actions (setSelection, clearSelection, copySelection, cutSelection, pasteClipboard, deleteSelection, mirrorH/V, rotate90, startFloatingPaste, updateFloatingPastePosition, commitFloatingPaste, cancelFloatingPaste). Total: ~200 lines added.

2. **MapCanvas (rendering + mouse interaction)** — Add 2 rendering passes in draw() function: selection rectangle with marching ants (after grid, before cursor) and floating paste preview (semi-transparent tiles at cursor position). Modify mouse handlers for SELECT tool behavior (click-drag marquee, click inside/outside selection). Total: ~100 lines added.

3. **ToolBar (keyboard shortcuts)** — Add shortcuts for Ctrl+C/X/V/D, Delete, and Escape. Follow existing pattern: check modifiers first, then process. Total: ~25 lines added.

4. **AnimationPanel (UI redesign)** — Add Tile/Anim radio toggle state, modify handlePlaceAnimation to switch between placing static tile (first frame) vs animated tile (with frame offset). Total: ~30 lines added.

**Key architectural patterns to follow:**
- State mutation: Actions mutate MapData directly, trigger re-render with `set({ map: { ...map } })`
- Undo: Push undo before mutation, mark modified, update state
- Coordinate conversion: Always use integer tile coords, validate at all zoom levels (0.25x to 4x)
- Canvas rendering: Single draw() function with layered passes, use `globalAlpha` for transparency

### Critical Pitfalls

Research identified 15 pitfalls across critical, moderate, and minor severity. The top 5 critical pitfalls that could block v1.6 success:

1. **Selection coordinate drift at non-1x zoom** — Selection rectangle drawn at 2x zoom appears offset from actual tiles due to rounding errors in screenToTile conversion. This is a known issue from v1.5 research that SELECT tool multiplies. **Mitigation:** Store selection bounds as integer tile coords ONLY (never pixels, never fractional), use Math.floor consistently, validate coord conversion at all zoom levels, test pattern: draw 3x3 selection at each zoom level and verify copy grabs exactly 9 tiles.

2. **Clipboard data without spatial context** — Naive clipboard stores Uint16Array but loses width/height, making paste impossible to reconstruct 2D shape from 1D array. A 4x2 selection (8 tiles) could be interpreted as 8x1, 1x8, 4x2, or 2x4. **Mitigation:** Always store width AND height with clipboard tiles, validate `tiles.length === width * height` before paste, clear clipboard if dimension validation fails.

3. **Tile encoding corruption during transforms** — Tiles are 16-bit packed fields (bit 15 = animation flag, bits 8-14 = frame offset, bits 0-7 = tile ID). Rotation/mirror algorithms must preserve these bits AND handle directional tile semantics (conveyors, bridges point wrong direction after rotation). **Mitigation:** Document that rotation preserves tile values but NOT graphics direction, warn users about rotating directional tiles, consider deferring rotate feature entirely (SEdit doesn't support it), mirror H/V is safer than rotate.

4. **Undo stack memory explosion** — Every clipboard operation creates 131KB undo snapshot (full map), clipboard can hold up to 131KB (full map copy), paste operations create new undo levels. Worst case: 50 undo levels + clipboard + repeated pastes = 6.7MB+ memory. **Mitigation:** Limit clipboard size to 64x64 max (8KB), clear clipboard on tool switch, warn on large selections over 50x50, consider delta-based undo instead of full snapshots (163x smaller for clipboard ops).

5. **Marching ants performance tank** — Animated selection border redraws entire canvas at 60fps. At 0.25x zoom with 4800 visible tiles, draw loop takes ~91ms/frame (11fps unplayable). **Mitigation:** Use separate canvas layer for marching ants (only redraw animated border, not tiles), throttle to 30fps (adequate visual feedback), disable ants at low zoom when tiles < 4px, use `requestAnimationFrame` instead of setInterval.

**Additional critical pitfall (Phase 3):**
6. **Floating paste preview state desync** — Paste preview requires three state pieces synchronized (clipboard data, mouse cursor tile coords, viewport zoom/scroll). React render cycle timing can cause preview to lag 1-2 frames behind cursor. **Mitigation:** Use useRef for paste preview position (no re-render), read viewport directly in draw() (no stale closure), test at all zoom levels.

## Implications for Roadmap

Based on research across all four dimensions, SELECT tool and Animation Panel features should be developed in 5 sequential phases. Dependencies flow naturally from foundational state (Phase 1: marquee selection) through clipboard operations (Phase 2) to floating paste (Phase 3) and transforms (Phase 4), with Animation Panel redesign as independent parallel work (Phase 5).

### Phase 1: Marquee Selection Foundation

**Rationale:** Must establish selection state and visual feedback before any clipboard/transform operations. This is the foundation that all other phases depend on. Coordinate accuracy MUST be validated here before proceeding — if selection bounds drift at zoom, all downstream operations fail.

**Delivers:** Working rectangular selection with animated marching ants border. Users can select regions, see visual feedback, clear selection with Escape. No clipboard functionality yet.

**Addresses features:**
- Marquee selection (table stakes)
- Visual selection indicator (table stakes)
- Escape to deselect (table stakes)

**Avoids pitfalls:**
- **Pitfall 1 (coordinate drift)** — Test at all zoom levels (0.25x, 0.5x, 1x, 2x, 4x), verify integer tile coords only
- **Pitfall 5 (marching ants performance)** — Use separate canvas layer or CSS animation, throttle to 30fps
- **Pitfall 15 (selection persists)** — Clear selection on map close/open (already handled in existing setMap action)

**Research flag:** **Standard patterns** — Marquee selection is well-documented (Canvas lineDashOffset tutorials, existing coord conversion in MapCanvas). No phase-specific research needed.

### Phase 2: Clipboard Copy/Cut/Paste/Delete

**Rationale:** Core editing operations that provide immediate value. Builds on Phase 1 selection state. Must implement before transforms because transforms operate on clipboard data.

**Delivers:** Users can copy selected tiles to internal clipboard, cut (copy + clear), paste at new location, delete selection. Keyboard shortcuts work (Ctrl+C/X/V, Delete). Undo/redo integration complete.

**Uses stack:**
- Zustand ClipboardState (tiles: Uint16Array, width: number, height: number)
- Keyboard event handling in ToolBar (existing pattern)

**Implements architecture:**
- ClipboardState in EditorState (~30 lines)
- copySelection, cutSelection, deleteSelection actions (~80 lines)
- Keyboard shortcuts in ToolBar handleKeyDown (~25 lines)

**Addresses features:**
- Copy/Cut/Paste operations (table stakes)
- Delete selection (table stakes)
- Keyboard shortcuts (table stakes)
- Undo support (table stakes)

**Avoids pitfalls:**
- **Pitfall 2 (spatial context)** — Store width/height with clipboard tiles, validate dimensions
- **Pitfall 4 (memory explosion)** — Test with 50 undo levels + clipboard, limit clipboard to 64x64 max
- **Pitfall 10 (undo boundary)** — pushUndo before delete/cut operations
- **Pitfall 11 (cut selection clear)** — clearSelection after cut completes
- **Pitfall 14 (keyboard conflicts)** — Check modifiers (Ctrl/Meta) before tool shortcuts

**Research flag:** **Standard patterns** — Clipboard is well-understood (Tiled Forum discussions, existing undo patterns in EditorState). No phase-specific research needed.

### Phase 3: Floating Paste Preview

**Rationale:** Enhances paste UX dramatically — users see exactly where tiles will be placed before committing. Depends on Phase 2 clipboard data structure.

**Delivers:** Semi-transparent paste preview follows cursor, click to commit, Escape/right-click to cancel. Preview shows tiles with alpha 0.6, handles map edge clipping gracefully.

**Uses stack:**
- Canvas globalAlpha for transparency (existing pattern from tool previews)
- FloatingPasteState in Zustand (active, x, y, clipboardWidth, clipboardHeight)

**Implements architecture:**
- FloatingPasteState in EditorState (~20 lines)
- startFloatingPaste, updateFloatingPastePosition, commitFloatingPaste, cancelFloatingPaste actions (~60 lines)
- Floating paste rendering pass in MapCanvas.draw() (~40 lines)

**Addresses features:**
- Floating paste preview (table stakes)

**Avoids pitfalls:**
- **Pitfall 6 (state desync)** — Use useRef for position (no setState), read viewport directly in draw()
- **Pitfall 12 (paste bounds overflow)** — Clip paste to map bounds, warn user about clipping

**Research flag:** **Standard patterns** — Floating preview follows existing tool preview pattern in MapCanvas (lines 264-429). No phase-specific research needed.

### Phase 4: Mirror/Rotate Transforms

**Rationale:** Differentiating features that set editor apart. Most complex phase due to transform algorithms and tile encoding preservation. Should be implemented last because it's non-essential for core workflow.

**Delivers:** Mirror horizontal/vertical (in-place), Rotate 90° clockwise (copies to clipboard). Transform operations preserve animation flags and frame offsets.

**Uses stack:**
- Pure TypeScript algorithms (no libraries)
- Existing clipboard infrastructure from Phase 2

**Implements architecture:**
- mirrorSelectionH, mirrorSelectionV, rotateSelection90 actions (~100 lines)
- Transform utility functions in new file: src/core/map/TileTransforms.ts (~60 lines)
- Keyboard shortcuts or toolbar buttons for transforms

**Addresses features:**
- Rotate 90° clockwise (differentiator)
- Mirror horizontal/vertical (differentiator)
- Preserve animation frame offsets (differentiator)

**Avoids pitfalls:**
- **Pitfall 3 (tile corruption)** — Warn users about directional tiles (conveyors, bridges), document that rotation preserves values not graphics
- **Pitfall 7 (dimension swap)** — Swap width/height after rotation (w×h becomes h×w)
- **Pitfall 13 (no preview update)** — Force canvas redraw with `set({ map: { ...map } })`

**Research flag:** **NEEDS DEEPER RESEARCH** — Tile encoding semantics (rotation/mirror lookup tables from SEdit) are complex. Consider phase-specific research:
- Extract or regenerate SEdit's rotTbl[512] and mirTbl[512] from utils.cpp
- Verify which tiles have directional semantics (conveyor, bridge, warp)
- Decide: implement content-aware rotation (like SEdit) or simple geometric rotation with warnings?
- Alternative: **Defer rotate entirely** if directional tile corruption is unacceptable (mirror H/V is safer)

### Phase 5: Animation Panel Redesign

**Rationale:** Independent from SELECT tool work — can be developed in parallel or deferred. Low complexity, high visual polish. Matches SEdit UX exactly.

**Delivers:** Animation panel shows hex IDs in "00" to "FF" format, Tile/Anim radio toggle switches between placing static tiles vs animated tiles, offset field always visible.

**Uses stack:**
- React state for selectionMode ('tile' | 'anim')
- Existing AnimationPanel canvas rendering

**Implements architecture:**
- Add selectionMode state to AnimationPanel (~5 lines)
- Add radio toggle UI (~20 lines)
- Modify handlePlaceAnimation behavior (~10 lines)

**Addresses features:**
- Tile/Anim mode toggle (Animation Panel enhancement)
- Hex ID format "00" to "FF" (Animation Panel enhancement)

**Avoids pitfalls:**
- **Pitfall 8 (hex numbering mismatch)** — Use `anim.id.toString(16).toUpperCase().padStart(2, '0')`
- **Pitfall 9 (tile/anim state confusion)** — Derive mode from selectedTile bit 15 (0x8000), don't store separate state

**Research flag:** **Standard patterns** — Radio toggle state management, hex formatting, existing AnimationPanel code. No phase-specific research needed.

### Phase Ordering Rationale

**Sequential dependencies:**
- Phase 1 → Phase 2: Clipboard operations require selection bounds
- Phase 2 → Phase 3: Floating paste requires clipboard data structure (width/height)
- Phase 2 → Phase 4: Transforms operate on clipboard data

**Parallelization opportunities:**
- Phase 5 (Animation Panel) is fully independent — can run in parallel with Phases 1-4

**Risk mitigation through ordering:**
- Phase 1 validates coordinate accuracy FIRST — if zoom coord bugs surface, they're caught before clipboard/transforms multiply the problem
- Phase 2 establishes undo/clipboard patterns — Phase 3/4 reuse these patterns
- Phase 4 (transforms) deferred to end — most complex, least essential, can be cut if time-constrained

**Pitfall avoidance:**
- Testing selection coords at all zoom levels (Phase 1) prevents downstream clipboard/paste bugs
- Clipboard metadata structure (Phase 2) enables transforms (Phase 4) to work correctly
- Marching ants performance optimization (Phase 1) prevents user frustration during core editing (Phases 2-3)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Mirror/Rotate Transforms):** Tile encoding semantics are complex. SEdit uses rotation/mirror lookup tables (rotTbl[512], mirTbl[512]) for content-aware transformations. Need to decide: port SEdit tables exactly, regenerate from first principles, or implement simple geometric rotation with warnings about directional tiles. **Alternative:** Skip rotate entirely (mirror H/V is safer and sufficient).

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Marquee Selection):** Well-documented Canvas patterns (lineDashOffset marching ants), existing coordinate conversion in MapCanvas
- **Phase 2 (Clipboard Operations):** Standard editor patterns, existing undo system, Zustand state management
- **Phase 3 (Floating Paste):** Reuses existing tool preview patterns from MapCanvas lines 264-429
- **Phase 5 (Animation Panel):** Existing AnimationPanel code provides 90% of implementation, just add radio toggle

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies required. All features validated against existing Canvas API, TypeScript, Zustand, React. Sources: MDN Canvas docs, existing MapCanvas implementation. |
| Features | **HIGH** | Direct source code analysis of SEdit (map.cpp, anim.cpp), existing AnimationPanel implementation review, Tiled/Sprite Fusion patterns for comparison. |
| Architecture | **HIGH** | Clear integration points in existing codebase (EditorState, MapCanvas, ToolBar, AnimationPanel). Component boundaries well-defined. Tested patterns from v1.0-v1.5. |
| Pitfalls | **MEDIUM-HIGH** | Coordinate drift and tile encoding issues validated from v1.5 PITFALLS.md (HIGH confidence). Clipboard/transform pitfalls derived from common tile editor patterns (MEDIUM confidence). Performance pitfalls need validation testing. |

**Overall confidence: HIGH**

Research is comprehensive across all four dimensions. Stack decisions are validated (no new dependencies), feature scope is clear (SEdit parity defined), architecture integration points are specific (line numbers referenced), and pitfalls are documented with mitigation strategies.

### Gaps to Address

**Known gaps requiring attention during implementation:**

1. **Rotation/mirror lookup tables not extracted** — SEdit has rotTbl[512] and mirTbl[512] with content-aware tile transformations (conveyor pointing right rotates to conveyor pointing down). Tables are hardcoded in utils.cpp lines 170-334. **Resolution:** Either extract tables from SEdit source, regenerate from tileset analysis, or defer rotate feature entirely. Mirror H/V doesn't require lookup tables (safer implementation path).

2. **Marching ants performance not validated** — Research predicts 11fps at 0.25x zoom with 4800 visible tiles, but this is theoretical calculation. **Resolution:** Performance testing in Phase 1 with FPS counter. If prediction holds, implement separate canvas layer or CSS animation. If performance is acceptable, use simpler single-canvas approach.

3. **SEdit SELECT tool behavior not verified** — Research analyzed SEdit source code (map.cpp lines 1483-1682) but clipboard format and transform behavior assumptions should be tested against actual SEdit. **Resolution:** Load same map in SEdit and AC Map Editor, perform identical copy/paste/transform operations, compare results byte-for-byte.

4. **Clipboard size limit not determined** — Research recommends 64x64 max (8KB) to prevent memory explosion, but user workflow needs may require larger selections. **Resolution:** Start with no limit in Phase 2, add telemetry for selection sizes, set limit based on actual usage patterns. 100x100 (40KB) may be acceptable threshold.

5. **Rotation feature decision pending** — Pitfall 3 identifies tile corruption risk (directional tiles point wrong direction after rotation). SEdit may not support rotation. **Resolution:** Verify SEdit capabilities during Phase 4 planning. If SEdit doesn't support rotate, defer feature to v2+ (mirror H/V provides 80% of transform value without corruption risk).

## Sources

### Primary (HIGH confidence)

**Existing codebase analysis:**
- `E:\NewMapEditor\src\core\editor\EditorState.ts` — Undo system, tile operations, state management patterns
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — Coordinate conversion (screenToTile), drawing loop, tool preview patterns
- `E:\NewMapEditor\src\core\map\types.ts` — Tile encoding (bit 15 = animation flag, bits 8-14 = frame offset)
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Existing animation panel implementation (257 lines)
- `E:\NewMapEditor\.planning\research\PITFALLS.md` (v1.5) — Coordinate system challenges, undo granularity, tile encoding issues

**SEdit source code analysis:**
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md` — Complete technical documentation
- SEdit map.cpp lines 1483-1682 — SELECT tool implementation (marquee, clipboard)
- SEdit map.cpp lines 3414-3682 — RotateBits, MirrorBits, copyBits, pasteBits functions
- SEdit anim.cpp lines 1-297 — Animation panel implementation
- SEdit main.h lines 35-48 — seldata and undo_buf structures

**Official documentation:**
- [MDN: Canvas lineDashOffset](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineDashOffset) — Marching ants implementation
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — Animation timing
- [Electron Clipboard API](https://www.electronjs.org/docs/latest/api/clipboard) — System clipboard (evaluated, not recommended)

### Secondary (MEDIUM confidence)

**Tile editor patterns:**
- [Tiled Editor: Editing Tile Layers](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/) — Selection and transform patterns reference
- [Tiled Forum: How to Cut and Paste Tiles](https://discourse.mapeditor.org/t/how-to-cut-and-paste-tiles/408) — Community clipboard patterns
- [Tilesetter Map Editing Documentation](https://www.tilesetter.org/docs/map_editing) — Marquee selection patterns

**Canvas editor architecture:**
- [tldraw: Infinite Canvas SDK for React](https://tldraw.dev/) — Selection logic with transforms and hit-testing
- [Konva Canvas Designer Editor](https://konvajs.org/docs/sandbox/Canvas_Editor.html) — React canvas editor patterns
- [Canvas Marching Ants Tutorial](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php) — setLineDash animation technique

**Transform algorithms:**
- [DEV: Rotating a 2D Matrix](https://dev.to/a_b_102931/rotating-a-matrix-90-degrees-4a49) — Rotate 90° algorithm (transpose + reverse)
- [Baeldung: Rotate 2D Matrix](https://www.baeldung.com/cs/rotate-2d-matrix) — Common rotation mistakes
- [GitHub: Flip 2D Array Functions](https://gist.github.com/lndgalante/ef318c5742614325d703a90f8b79c06b) — Mirror algorithms

### Tertiary (LOW confidence)

**Performance and optimization:**
- [Canvas 1px Gaps Case Study](https://medium.com/@Christopher_Tseng/why-does-perfect-code-create-1px-gaps-a-canvas-rendering-case-study-efcaac96ed93) — Canvas rendering pitfalls
- [Infinite Canvas with Zoom and Pan](https://www.sandromaglione.com/articles/infinite-canvas-html-with-zoom-and-pan) — Canvas performance optimization
- [Konva: React Undo/Redo](https://konvajs.org/docs/react/Undo-Redo.html) — Undo/redo state patterns

---

**Research completed:** 2026-02-04
**Ready for roadmap:** Yes — All four research dimensions complete, phase structure proposed with rationale, research flags identified, gaps documented, pitfalls catalogued with mitigations
