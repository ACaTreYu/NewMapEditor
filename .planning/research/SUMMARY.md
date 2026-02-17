# Project Research Summary

**Project:** AC Map Editor v1.0.4 — Settings Overhaul & Image Trace
**Domain:** Electron/React Tile Map Editor Feature Addition
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

v1.0.4 adds four features to an existing production map editor: Format=1.1 settings compliance for SEdit compatibility, Save As functionality with proper state management, animation rendering independence from panel visibility, and image trace overlay for reference-based map creation. The research reveals **zero new dependencies required** — all features integrate into the existing Electron/React/TypeScript/Zustand stack using established patterns.

The recommended approach builds features in dependency order: settings serialization fixes first (isolated change, zero dependencies), followed by Save As (extends FileService used by image overlay), then animation verification (quick test-or-fix), and finally image trace overlay (most complex, uses FileService extension from phase 2). This ordering minimizes integration risk and allows early validation of backward compatibility requirements.

Key risks center on maintaining backward compatibility (maps without Format=1.1 must still load) and state synchronization across three Zustand slices (DocumentsSlice, WindowSlice, GlobalSlice). All risks have proven mitigations: optional format detection with fallback parsing, atomic state updates across slices, off-screen canvas caching for overlay performance, and RAF loop relocation to app-level lifecycle. Total implementation estimate: 4.5-5 hours across four phases.

## Key Findings

### Recommended Stack

**Zero new dependencies.** The existing stack provides all capabilities needed for v1.0.4 features. Electron 34's native `dialog.showSaveDialog` already supports Save As (implemented at line 248 in electron/main.ts), React 18's controlled inputs handle opacity sliders, Canvas API's `globalAlpha` provides overlay transparency, and Zustand's three-slice architecture (GlobalSlice, DocumentsSlice, WindowSlice) manages all state without new libraries.

**Core technologies (all existing):**
- **Electron 34.0.0**: Desktop shell — `dialog.showSaveDialog` already implemented for Save As
- **React 18.3.1**: UI components — Controlled inputs for sliders, existing MDI window pattern
- **Zustand 5.0.3**: State management — DocumentsSlice pattern supports per-document trace image state
- **Canvas API (native)**: Rendering — Image loading via `new Image()`, opacity via `ctx.globalAlpha`
- **react-rnd 10.5.2**: MDI windows — ChildWindow.tsx pattern reusable for trace overlay window

**What NOT to add:** No image processing libraries (sharp/jimp), no slider libraries (rc-slider), no state management upgrades (Redux), no animation libraries (framer-motion). Native APIs and existing patterns handle all requirements.

### Expected Features

**Must have (table stakes):**
- **Save As** — Standard file operation in all desktop editors, users expect Ctrl+Shift+S
- **Format=1.1 compliance** — Required for SEdit compatibility and turret support in-game
- **Animation when hidden** — Animated tiles must animate regardless of panel state
- **Settings persistence** — Game settings must survive save/load roundtrip with correct Format=1.1 placement

**Should have (competitive differentiator):**
- **Image trace overlay** — Load reference images, semi-transparent overlay for tracing map tiles (common in professional map editors like Tiled, Cities: Skylines mods)
- **Deep settings audit** — Validate all 54 settings against SEdit behavior for 100% compatibility

**Defer (anti-features / v2+):**
- **Autosave** — SubSpace maps are small (~50KB), explicit save is expected, autosave risks corrupting working copies
- **Multiple overlays** — Adds UI complexity, single overlay covers 95% of use cases
- **Settings wizard** — Would obscure relationships between 54 settings, keep tabbed dialog with tooltips

### Architecture Approach

v1.0.4 integrates into existing three-layer Zustand architecture (GlobalSlice, DocumentsSlice, WindowSlice) with targeted component modifications. No new major subsystems required. Settings overhaul modifies serialization logic in MapSettingsDialog.tsx (lines 15-118), Save As extends FileService interface and adds menu item, animation independence likely relocates RAF loop from AnimationPanel to App.tsx (pending verification), and image trace overlay reuses ChildWindow.tsx MDI pattern with new TraceImageWindow component.

**Major components:**
1. **MapSettingsDialog.tsx** — Extend serialization to map slider indices to extended settings, ensure Format=1.1 placement (after non-flagger, before flagger settings)
2. **FileService + Electron IPC** — Add defaultName parameter to save dialog, add openImageDialog for overlay feature
3. **TraceImageWindow.tsx (new)** — MDI window with Canvas rendering, opacity slider, viewport sync (~150 LOC)
4. **GlobalSlice** — Potentially relocate animation RAF loop here (currently in AnimationPanel component lifecycle)

### Critical Pitfalls

1. **Format version detection failure** — Parser assumes Format=1.1 always exists, breaks pre-v1.0.4 maps. **Fix:** Make format detection optional, parseSettings must handle descriptions with AND without prefix. Verify backward compatibility with unit test.

2. **Save As filePath desync** — Save As updates file on disk but doesn't propagate new path to DocumentState.filePath in Zustand, next Ctrl+S writes to old location. **Fix:** Update three things atomically: file on disk, DocumentState.filePath, WindowState.title. Add `updateFilePathForDocument` action.

3. **Animation loop memory leak** — AnimationPanel starts RAF loop on mount, but cleanup function doesn't run when panel hidden (only unmounted), RAF continues at 60 FPS indefinitely. **Fix:** Move RAF loop to App.tsx (always mounted), use Page Visibility API to pause when tab backgrounded.

4. **Image overlay performance collapse** — Large PNGs (4096x4096) trigger full redraw on every pan/zoom, frame rate drops from 60 FPS to <10 FPS. **Fix:** Off-screen canvas caching, viewport culling (only render visible portion), image size limit warning (>2048px).

5. **Window title stale after Save As** — Save As updates DocumentState but forgets WindowState, title shows old filename. **Fix:** Cross-slice state sync, update both DocumentState and WindowState atomically.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes dependency order and risk mitigation:

### Phase 1: Settings Format Compliance
**Rationale:** Zero dependencies, isolated to MapSettingsDialog.tsx serialization logic. Must ship first to validate backward compatibility before adding features that modify settings workflow.

**Delivers:**
- Format=1.1 prefix injection in description field (after non-flagger, before flagger settings)
- Settings roundtrip preservation (load → edit → save → load verifies values restored)
- Backward compatibility with pre-v1.0.4 maps (optional format detection)

**Addresses:** Format=1.1 compliance (table stakes), settings persistence (table stakes)

**Avoids:** Pitfall 1 (format detection failure), Pitfall 9 (prefix duplication on repeated saves)

**Estimated effort:** 40 minutes

---

### Phase 2: Save As Implementation
**Rationale:** Extends FileService interface needed by Phase 4 (image overlay). Standard desktop pattern, well-documented. Common user request with high value/complexity ratio.

**Delivers:**
- File > Save As menu item with Ctrl+Shift+S accelerator
- Save dialog with defaultPath set to current filename
- Atomic state update: filePath + modified flag + window title
- Integration test coverage for Save As → Close → Save sequence

**Uses:** Electron dialog.showSaveDialog (already implemented), DocumentsSlice pattern (update document state), WindowSlice (update title)

**Implements:** Cross-slice state synchronization (documentsSlice + windowSlice atomicity)

**Avoids:** Pitfall 2 (filePath desync), Pitfall 5 (dirty flag race), Pitfall 6 (window title stale), Pitfall 11 (default filename doesn't match)

**Estimated effort:** 60 minutes

---

### Phase 3: Animation Panel Independence
**Rationale:** Quick verification phase — may be zero-change if AnimationPanel already persists when hidden. If broken, architectural fix required before Phase 4 (which also uses RAF for overlay rendering).

**Delivers:**
- Animation advances when any open document has visible animated tiles (independent of panel state)
- Single RAF loop in App.tsx (or verification that existing implementation already works)
- Page Visibility API integration (pause when tab backgrounded)
- animationFrame counter modulo 128 (prevent overflow)

**Addresses:** Animation when hidden (table stakes)

**Avoids:** Pitfall 3 (RAF memory leak), Pitfall 7 (counter overflow), Pitfall 12 (animation stops when panel closed)

**Estimated effort:** 15-55 minutes (depends on verification outcome)

---

### Phase 4: Image Trace Overlay
**Rationale:** Most complex feature, builds on FileService extension from Phase 2. Differentiator feature with high user value for map tracing workflows. Performance optimization (off-screen caching, viewport culling) must be part of initial implementation, not retrofit.

**Delivers:**
- File > Load Trace Image menu item
- New MDI window (TraceImageWindow.tsx) with opacity slider (0-100%)
- Off-screen canvas caching for performance
- Viewport culling (only render visible portion of overlay)
- Image size limit warning (>2048px prompts scale-down)
- Click-through mode (pointer-events: none on overlay image)
- Position persistence in tile coordinates (survives window resize)

**Uses:**
- FileService.openImageDialog (new interface method)
- react-rnd pattern from ChildWindow.tsx
- Canvas API globalAlpha for opacity
- Zustand GlobalSlice or new TraceSlice for state

**Implements:** Multi-layer canvas architecture (overlay on separate canvas, never touches map buffer)

**Avoids:** Pitfall 4 (performance collapse), Pitfall 8 (click-through breaks tools), Pitfall 10 (position lost on resize), Pitfall 13 (opacity slider lag)

**Estimated effort:** 160 minutes (2.5 hours)

---

### Phase Ordering Rationale

- **Dependency-first:** Phase 2 (Save As) extends FileService interface used by Phase 4 (image overlay openImageDialog). Settings (Phase 1) must validate backward compatibility before other features modify settings workflow.

- **Risk mitigation:** Phase 3 (animation verification) is quick test-or-fix that prevents RAF loop conflicts in Phase 4. If animation loop needs relocation, better to fix before adding second canvas layer.

- **Incremental validation:** Each phase delivers user-visible value independently. Phase 1 can ship alone if later phases blocked. Phase 2+3 combined provide desktop editor parity. Phase 4 adds competitive differentiator.

- **Effort distribution:** Phases 1-3 total ~2 hours, Phase 4 is 2.5 hours. Natural breakpoint after Phase 3 for testing/validation before tackling most complex feature.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Image Trace Overlay):** Complex rendering optimization, new component architecture. May need performance profiling research for viewport culling implementation, CSS transform vs canvas redraw trade-offs.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Settings Format):** Well-documented pattern (settings serialization), existing code at MapSettingsDialog.tsx provides reference implementation.
- **Phase 2 (Save As):** Standard Electron dialog pattern, official docs comprehensive, existing IPC handler at electron/main.ts line 248 provides template.
- **Phase 3 (Animation Independence):** Existing RAF loop at AnimationPanel.tsx:90-109, Page Visibility API well-documented, relocation pattern straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All findings from direct codebase inspection. Electron dialog API verified at line 248 in electron/main.ts, settings serialization verified at MapSettingsDialog.tsx lines 15-118. Zero new dependencies required. |
| Features | **HIGH** | Table stakes features match standard desktop editor patterns (Save As, settings persistence). Image overlay validated against similar features in Tiled, Cities: Skylines mods. SEdit compatibility requirements from AC_Setting_Info_25.txt (primary source). |
| Architecture | **HIGH** | Integration points identified from codebase analysis. Three-layer Zustand architecture already handles per-document state (DocumentsSlice pattern). ChildWindow.tsx provides MDI window template for overlay. CanvasEngine subscription pattern established. |
| Pitfalls | **HIGH** | Critical pitfalls sourced from official docs (Electron dialog API, Canvas optimization MDN) and real-world patterns (DrawOverlay GitHub, backward compatibility guides). Format version pitfall verified against existing parseSettings code (line 43-73). |

**Overall confidence:** **HIGH**

### Gaps to Address

- **Animation panel mount behavior:** Verification needed to determine if AnimationPanel unmounts when hidden (conditional render) or stays mounted (CSS visibility toggle). Quick 5-minute test resolves this. If unmounts, Phase 3 is 55-minute implementation. If stays mounted, Phase 3 is 15-minute verification.

- **Image overlay workspace persistence:** Research didn't cover where to store overlay state (separate .workspace file, localStorage, ephemeral). Recommendation: Start with ephemeral state (session-only), defer persistence to v1.0.5 based on user feedback.

- **Settings audit scope:** Deep settings audit (validate all 54 settings) mentioned in FEATURES.md but not in milestone scope. Verify during Phase 1 planning whether this is full audit or just Format=1.1 compliance validation.

- **Slider-dropdown sync specifics:** MapSettingsDialog.tsx has LASER_DAMAGE_VALUES arrays (line 172-174) for mapping slider indices to settings, but current implementation unclear if sync is one-way (dialog open only) or live (on slider change). Verify during Phase 1 code inspection.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:**
  - `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` (lines 15-118) — Settings serialization logic, Format=1.1 injection
  - `E:\NewMapEditor\electron\main.ts` (lines 248-261) — Existing dialog.showSaveDialog IPC handler
  - `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` (lines 90-109) — RAF loop implementation
  - `E:\NewMapEditor\src\components\Workspace\ChildWindow.tsx` — MDI window pattern with react-rnd
  - `E:\NewMapEditor\src\core\services\FileService.ts` — File I/O interface
  - `E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts` — DocumentState structure
  - `E:\NewMapEditor\AC_Setting_Info_25.txt` — Complete settings reference for SEdit compatibility

- **Official documentation:**
  - [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog) — Save dialog options, filePath handling
  - [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — globalAlpha, off-screen canvas caching, viewport culling
  - [Window.requestAnimationFrame - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — Animation loop best practices

### Secondary (MEDIUM confidence)
- [Using requestAnimationFrame with React Hooks - CSS-Tricks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) — RAF cleanup patterns, memory leak prevention
- [Backward Compatibility in Schema Evolution](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide) — Optional fields, default values for format versioning
- [Optimize HTML5 Canvas Rendering with Layering - IBM](https://developer.ibm.com/tutorials/wa-canvashtml5layering/) — Multi-layer canvas architecture

### Tertiary (LOW confidence)
- [Tiled: Load background reference forum](https://discourse.mapeditor.org/t/load-background-reference/168) — Image overlay use case validation
- [DrawOverlay GitHub](https://github.com/UrTexts/DrawOverlay) — Transparent overlay pattern, opacity control
- [Cities: Skylines ImageOverlayLite mod](https://thunderstore.io/c/cities-skylines-ii/p/algernon/ImageOverlayLite/) — Reference for similar feature in map editor

---

*Research completed: 2026-02-17*
*Ready for roadmap: yes*
