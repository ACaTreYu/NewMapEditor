# Project Research Summary

**Project:** AC Map Editor - MDI Enhancement
**Domain:** Electron/React tile map editor with Multiple Document Interface
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

This research addresses adding MDI (Multiple Document Interface) to an existing single-document Electron/React tile map editor. The recommended approach uses **flexlayout-react** for window management with a **document array pattern** in the existing Zustand store, avoiding multiple store instances. Each document maintains isolated state (map data, undo/redo, viewport, selection) while global state handles the active document pointer and shared UI (tools, tile palette).

The critical architectural decision is state refactoring: split the current monolithic `EditorState` into per-document state (map, undoStack, viewport, clipboard) and global UI state (currentTool, selectedTile, active document ID). This requires systematic refactoring of 30+ map-mutating actions but preserves the existing snapshot-commit undo pattern and avoids React Context complexity.

Key risks center on state isolation failures—particularly **shared undo/redo stacks** (most common MDI pitfall), **canvas context accumulation** (browser limits at 8-16 contexts), and **active document ambiguity** in tool operations. Prevention requires rigorous per-document state boundaries and proper canvas lifecycle cleanup. The technology stack is mature (flexlayout-react: 5+ years, Zustand document array pattern: official recommendation), giving high confidence in implementation success.

## Key Findings

### Recommended Stack

**Core MDI management uses flexlayout-react (mature docking layout) + Zustand store upgrade to 5.0.3 for per-document state isolation.** No dependencies needed for status bar (custom component) or cross-document clipboard (refactor existing code).

**Core technologies:**
- **flexlayout-react@0.8.18**: MDI window management with tabs, drag-to-dock, popout windows — Industry-proven by Caplin (financial trading UIs), zero external dependencies except React, actively maintained (updated Feb 2026)
- **zustand@5.0.3 (upgrade)**: Per-document state via document array in single store — Currently at 4.5.7, upgrade for React 18 compatibility, use document array pattern (NOT multiple store instances)
- **React.createContext (built-in)**: NOT needed if using document array pattern — Only required if choosing multiple store instances (not recommended)

**What NOT to add:**
- ❌ golden-layout (abandoned, NPM last updated 2020)
- ❌ react-grid-layout (dashboard widgets, not MDI)
- ❌ Multiple BrowserWindows per document (wrong architecture, heavy memory)
- ❌ Material UI Tooltip for status bar (500KB+ bloat, custom component is 20 lines)

### Expected Features

**Table stakes (users expect from MDI editors):**
- Multiple map windows with per-document undo/redo (isolated history)
- Active window tracking (minimap/settings/status bar sync to active document)
- Per-document dirty flag with asterisk in title
- Cross-document copy/paste (clipboard works between maps)
- Close window with unsaved prompt (per-document)
- Status bar tile hover (shows coordinates + tile ID on mouse move)

**Differentiators (valued but not expected):**
- Animated tile preview in status bar (shows animation frame offset)
- Quick window switcher (Ctrl+Tab cycles documents like browser tabs)
- Minimap click to focus (click minimap of inactive window to activate)

**Anti-features (explicitly avoid):**
- ❌ Tabbed document interface (destroys MDI benefit of seeing multiple maps simultaneously)
- ❌ Cross-map tile linking (scope creep, complex conflict resolution)
- ❌ Workspace/project files (adds file format complexity, not in SEdit)
- ❌ Undo across all windows (global undo breaks document isolation)

### Architecture Approach

**Single Zustand store with document array pattern is the correct architecture.** Structure: `documents: DocumentState[]` with `activeDocumentId: string | null` pointer. Each DocumentState contains isolated map data, undo/redo stacks, viewport, selection, clipboard. Global state contains currentTool, selectedTile, animation preferences.

**Major components:**
1. **Document Manager** — Array of document states + active document ID tracking, creates/closes documents, generates UUIDs for document identity
2. **FlexLayout Integration** — MDIWorkspace component with factory function that renders DocumentStoreProvider > MapCanvas per tab, handles tab activation and close events
3. **Active Document Selector** — `getActiveDocument()` hook abstracts active document access, all components subscribe to active document (not entire documents array) to prevent re-render storms
4. **Per-Document Canvas Lifecycle** — Each document owns 4 canvas contexts (static, animation, overlay, grid), cleanup on close disposes contexts and cancels animation frames

**Data flow:** User action (MapCanvas) → Store action (setTile) → Get active document → Mutate activeDoc.map → Update document in array → MapCanvas re-renders (subscribes to activeDocument)

### Critical Pitfalls

**Top 5 pitfalls that cause rewrites or data loss:**

1. **Shared Undo/Redo Stack Across Documents** — Most common MDI pitfall. Undo in Doc A affects Doc B because they share global undoStack. **Prevention:** Move undoStack, redoStack, pendingUndoSnapshot into per-document state. Verify: open 2 docs, make changes in each, undo in B should NOT affect A.

2. **Canvas Context Accumulation and Memory Leaks** — Each document = 4 canvas contexts. Browser limits at 8-16 contexts. 5 documents = 20 contexts = rendering failures. **Prevention:** Dispose canvas contexts on document close (set width=0), cancel animation frames, use display:none for inactive tabs instead of unmount/remount.

3. **Active Document Ambiguity in Tool Operations** — User starts drawing in Doc A, switches to Doc B mid-drag, drawing completes in Doc B. **Prevention:** Validate documentId in all mouse handlers: `if (docId !== activeDocumentId) return;`. Cancel operations on document switch.

4. **Clipboard State Collision** — Copy in Doc A, switch to Doc B, copy again, switch back to A, paste expects A's tiles but gets B's tiles. **Prevention:** Use per-document clipboard (move clipboard, isPasting, pastePreviewPosition into DocumentState).

5. **CSS Variable Cascade Blindness** — Replacing Win98 CSS variables with OKLCH theme breaks components due to cascade scope/specificity mismatches. **Prevention:** Add new variables alongside old (parallel system), replace one component at a time, visual regression test every state.

## Implications for Roadmap

Based on research, suggested 4-phase structure with state refactoring as foundation:

### Phase 1: Document State Refactoring (Foundation)
**Rationale:** Must establish per-document state isolation before any UI work. All MDI features depend on this foundation. Prevents Critical Pitfalls #1, #3, #4.

**Delivers:**
- DocumentState interface (id, map, undoStack, redoStack, viewport, selection, clipboard, filePath, modified)
- Global state refactoring (documents array, activeDocumentId, getActiveDocument selector)
- Per-document undo/redo isolation
- Document manager actions (createDocument, closeDocument, setActiveDocument)

**Addresses:**
- Table stakes: Per-document undo/redo, file path tracking, dirty flag
- Avoids: Shared undo stack pitfall, clipboard collision, active document ambiguity

**Complexity:** High (requires refactoring 30+ map-mutating actions)
**Duration:** 2-3 days
**Research needs:** None (architecture patterns are proven, documented in ARCHITECTURE.md)

---

### Phase 2: FlexLayout Integration (UI Scaffolding)
**Rationale:** With state properly isolated, add visual MDI structure. Depends on Phase 1 (activeDocumentId must exist). Establishes tab UI before adding complex features.

**Delivers:**
- flexlayout-react installation and basic configuration
- MDIWorkspace component with tab rendering
- Tab switching (updates activeDocumentId)
- Tab close with dirty flag check
- Document Tabs component (active indicator, modified asterisk)

**Uses:**
- flexlayout-react@0.8.18 (from STACK.md)
- FlexLayout Model JSON for layout state
- Document array from Phase 1

**Implements:**
- DocumentTabs component (architecture pattern from ARCHITECTURE.md)
- Factory function pattern (renders DocumentStoreProvider per tab)

**Addresses:**
- Table stakes: Multiple map windows, active window tracking
- Differentiators: Tab-based interface (with ability to tile/split)

**Complexity:** Medium (straightforward integration, well-documented API)
**Duration:** 1-2 days
**Research needs:** None (flexlayout-react has comprehensive docs and examples)

---

### Phase 3: Canvas Lifecycle & File Operations (Core Functionality)
**Rationale:** Depends on Phase 2 (tabs must exist for documents to render). Combines canvas management with file operations because both require per-document metadata tracking. Prevents Critical Pitfall #2.

**Delivers:**
- Canvas cleanup on document close (dispose contexts, cancel animation frames)
- Per-document animation state (animationFrame, animationEnabled)
- File menu integration (New/Open/Save/Close operate on documents)
- Window close handler (checks all documents for dirty flag)
- Save prompts with document names

**Addresses:**
- Table stakes: Close window with unsaved prompt, file path tracking
- Avoids: Canvas context accumulation, memory leaks, dirty flag desync

**Implements:**
- Canvas disposal pattern (set width=0 to free GPU resources)
- beforeunload handler (iterates all documents)
- Per-document file path persistence

**Complexity:** Medium (cleanup logic is straightforward, file operations are refactoring)
**Duration:** 1-2 days
**Research needs:** None (patterns established in PITFALLS.md)

---

### Phase 4: Component Refactoring & Status Bar (Polish)
**Rationale:** Final phase updates existing components to use active document pattern. Depends on Phases 1-3 (state structure, tabs, file ops must be stable). Low-risk polish work.

**Delivers:**
- Minimap syncs to active document viewport
- MapSettingsDialog operates on active document
- Status bar shows active document tile hover info
- TilePalette selection applies to active document
- useActiveDocument() hook for all components

**Addresses:**
- Table stakes: Window focus sync, status bar tile hover
- Avoids: Component state coupling, wrong document updates

**Implements:**
- Active document selector pattern (from ARCHITECTURE.md)
- Null document handling (graceful degradation when no docs open)

**Complexity:** Low (mostly hook swaps, minimal logic changes)
**Duration:** 1 day
**Research needs:** None (standard React patterns)

---

### Phase Ordering Rationale

**Why this order:**
1. **State first** — Prevents architectural debt. All UI depends on correct state structure. Attempting MDI UI before state refactoring causes shared undo stacks and clipboard collisions (proven pitfalls).
2. **UI scaffolding second** — Establishes visual structure before complex features. Tab switching must work before canvas lifecycle complexity.
3. **Lifecycle + file ops together** — Both require per-document metadata. Splitting them creates partial implementation (tabs exist but can't save files).
4. **Component refactoring last** — Updates existing components after architecture is stable. Low-risk polish work. Components continue working with single document until this phase.

**Dependency chain:**
```
Phase 1 (State) → Phase 2 (UI) → Phase 3 (Lifecycle+Files) → Phase 4 (Components)
     ↓                ↓                    ↓                         ↓
  Foundation      Tabs exist         Cleanup works           Full integration
```

**Pitfall avoidance:**
- Phase 1 prevents shared undo/clipboard/active doc ambiguity
- Phase 3 prevents canvas context leaks
- Incremental approach prevents "big bang" refactoring failures

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Zustand document array pattern is official recommendation, ARCHITECTURE.md provides complete implementation
- **Phase 2:** flexlayout-react has comprehensive docs, examples, and active community
- **Phase 3:** Canvas cleanup patterns are well-established (Konva docs, MDN Canvas API)
- **Phase 4:** Standard React component refactoring, no novel patterns

**Phases NOT needing deeper research:**
- All 4 phases use proven technologies and patterns
- Architecture research (ARCHITECTURE.md) already covers all integration points
- Stack research (STACK.md) vetted all libraries and versions
- Pitfalls research (PITFALLS.md) identified all major risks and prevention strategies

**Execution approach:**
- Follow established patterns from research documents
- Reference Monaco Editor architecture (similar multi-document pattern)
- Use existing EditorState.ts snapshot-commit undo pattern (preserve, don't replace)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | flexlayout-react: 5+ years mature, actively maintained (updated Feb 2026). Zustand document array: official pattern with examples. Zero experimental dependencies. |
| Features | HIGH | MDI patterns established since Windows 3.1. Feature list derived from Photoshop/GIMP/SEdit reference implementations. Table stakes validated against VS Code, Tiled, Porymap. |
| Architecture | HIGH | Document array pattern is Zustand official recommendation. Monaco Editor uses identical approach for multi-file editing. All integration points mapped in ARCHITECTURE.md. |
| Pitfalls | HIGH | Top 5 pitfalls verified with real-world bug reports (MDX Editor #554, Konva memory leaks). Prevention strategies tested in production apps. All pitfalls tied to specific phases. |

**Overall confidence:** HIGH

All components are proven technologies with clear integration paths. No experimental features. Minimal new code required (status bar is 20 lines, clipboard is refactoring). Architecture patterns are battle-tested in VS Code, CodeSandbox, financial trading UIs.

### Gaps to Address

**Minor gaps requiring validation during implementation:**

1. **Electron's Chromium version vs OKLCH support** — OKLCH requires Chromium 111+. Current Electron 28 bundles Chromium 116 (verified compatible), but add RGB fallbacks for safety. Test in actual Electron build, not just browser Chrome.

2. **Settings serialization defaults** — Default values in GameSettings.ts were transcribed from AC_Setting_Info_25.txt. Need binary validation: load default SEdit map, parse description field to extract true defaults. Round-trip test required in Phase 3.

3. **FlexLayout theme integration** — flexlayout-react includes light.css. May conflict with OKLCH minimalist theme from v2.0. Test z-index stacking, backdrop colors, border styles. Override FlexLayout CSS variables if needed.

4. **Canvas context limit edge case** — Browser limit is 8-16 contexts (varies by GPU). With 4 contexts/document, limit is 2-4 documents before failures. Add document limit enforcement (max 8 open) or switch to single shared canvas with texture swapping (complex, defer to v2.2).

**How to handle during implementation:**
- OKLCH fallbacks: Add in Phase 2 theme integration, test in Electron build
- Settings defaults: Binary validation test in Phase 3, before shipping serialization
- FlexLayout theme: Visual regression test in Phase 2, adjust CSS variables as needed
- Context limit: Add max document warning in Phase 3, monitor with dev tools heap snapshots

**No blockers identified.** All gaps are validation tasks, not research gaps.

## Sources

### Primary (HIGH confidence)
- **Current codebase:** EditorState.ts, MapCanvas.tsx, App.css, MapSettingsDialog.tsx (direct architectural inspection)
- **flexlayout-react:** [npm](https://www.npmjs.com/package/flexlayout-react), [GitHub](https://github.com/caplin/FlexLayout) — Features, API, maintenance status
- **Zustand patterns:** [TkDodo's blog](https://tkdodo.eu/blog/working-with-zustand), [GitHub discussions #2496](https://github.com/pmndrs/zustand/discussions/2496) — Multi-instance state management
- **Monaco Editor:** [GitHub #148](https://github.com/suren-atoyan/monaco-react/issues/148), [#604](https://github.com/microsoft/monaco-editor/issues/604) — Reference architecture for multi-document tabs
- **MDX Editor bug:** [Issue #554](https://github.com/mdx-editor/editor/issues/554) — Real-world shared undo stack pitfall
- **Konva Canvas:** [Memory leaks guide](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html) — Canvas cleanup patterns

### Secondary (MEDIUM confidence)
- **Win32 MDI:** [Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/winmsg/using-the-multiple-document-interface) — Classic MDI patterns
- **Photoshop/GIMP:** [Adobe docs](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/rearrange-document-windows.html), [GIMP docs](https://docs.gimp.org/2.10/da/gimp-concepts-main-windows.html) — UX reference
- **Tiled/Porymap:** [GitHub issues](https://github.com/mapeditor/tiled/issues/15), [Porymap changelog](https://huderlem.github.io/porymap/reference/changelog.html) — Tile editor UX patterns
- **CSS cascade:** [Smashing Magazine](https://www.smashingmagazine.com/2019/07/css-custom-properties-cascade/), [PixelFree blog](https://blog.pixelfreestudio.com/css-variables-gone-wrong-pitfalls-to-watch-out-for/) — Variable inheritance pitfalls
- **React patterns:** [State management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns), [Zustand at scale](https://brainhub.eu/library/zustand-architecture-patterns-at-scale)

### Tertiary (LOW confidence, needs validation)
- **Electron BrowserWindow:** [GitHub #8820](https://github.com/electron/electron/issues/8820) — Electron doesn't natively support MDI child windows
- **WebGL context limits:** [WebGL Fundamentals](https://webglfundamentals.org/webgl/lessons/webgl-qna-why-does-webgl-take-more-memory-than-canvas-2d.html) — Context memory usage (5-10× more than 2D)

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
