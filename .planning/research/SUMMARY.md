# Project Research Summary

**Project:** AC Map Editor - Professional Editor UI Milestone
**Domain:** Tile map editor - UI restructuring and bug fixes
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

The AC Map Editor needs a professional UI overhaul transforming from its current right-sidebar layout to a horizontal toolbar / main canvas / tabbed bottom panel structure (VS Code/Photoshop style). Research confirms this pattern is well-established with mature tooling: `react-resizable-panels` for layout management and Radix UI primitives for accessible tabs/toolbars. The existing Zustand state management is appropriate and requires no changes. The primary implementation challenge is decomposing the 547-line monolithic MapCanvas component into focused hooks and sub-components.

Two critical bugs were identified that should be fixed before UI restructuring: (1) the fill tool ignores multi-tile selections, placing only the first tile instead of tiling the pattern, and (2) the animation panel generates placeholder data that masks real animation rendering issues. Both are straightforward fixes with clear implementation paths. The fill bug requires modifying `fillArea` to accept `TileSelection` and use modulo arithmetic for pattern tiling. The animation bug requires removing placeholder generation and loading real animation data.

The key risk is ResizeObserver-related performance issues during panel resizing, which can cause layout thrashing or infinite loops. Mitigation is straightforward: debounce resize handlers, use `requestAnimationFrame` for batching, and rely on react-resizable-panels' built-in handling rather than custom implementations.

## Key Findings

### Recommended Stack

The project already has the correct foundation (React 18, TypeScript, Zustand, Canvas API). The UI milestone requires adding five lightweight, well-maintained packages that integrate cleanly with the existing stack.

**Core technologies:**
- **react-resizable-panels (^4.5.7):** Panel layout with drag dividers — 2.7M weekly downloads, built-in localStorage persistence via `autoSaveId`, used by shadcn/ui
- **@radix-ui/react-tabs (^1.1.13):** Accessible tabbed interface — headless/unstyled for full control, WAI-ARIA compliant, works with existing CSS approach
- **@radix-ui/react-toolbar (^1.1.11):** Accessible toolbar — roving tabindex, keyboard navigation, supports toggle groups for tool selection
- **@radix-ui/react-tooltip (^1.2.8):** Icon button tooltips — proper accessibility (not `title` attribute), 300-500ms delay, hover persistence
- **lucide-react (^0.563.0):** Consistent icon set — tree-shakable, 1667+ icons, consistent stroke style (avoids mixing icon sets)

**What NOT to add:**
- react-split-pane (unmaintained, React 18 bugs)
- golden-layout (jQuery-based)
- Full component libraries (Material UI, Ant Design) — overkill, conflicts with unstyled approach

### Expected Features

**Must have (table stakes):**
- Central canvas maximizing workspace — all professional editors prioritize this
- Resizable panels with drag dividers — standard in VS Code, Photoshop, GIMP, Figma
- Panel size persistence — users expect remembered layouts
- Icon-only toolbar with tooltips showing keyboard shortcuts — space-efficient, discoverable
- Tabbed bottom panel (Tiles/Settings/Animations) — consolidates scattered panels
- Keyboard shortcuts for all tools — power user expectation
- ARIA-compliant tabs with keyboard navigation — accessibility requirement

**Should have (differentiators):**
- Double-click divider to reset panel size
- Collapsible panels for maximum canvas space
- Min/max panel constraints (10-50% as specified)
- Tab key navigation between panels

**Defer (v2+):**
- Spring-loaded shortcuts (hold key for temporary tool)
- Custom keyboard shortcut remapping
- Workspace presets/saved layouts
- Dark mode toggle
- Panel collapse animations

**Anti-features to avoid:**
- Floating/detachable panels (GIMP users complained for years)
- Instant tooltips without delay (causes flickering)
- Custom menu bar in Electron (breaks OS conventions)
- More than 5 tabs in a single panel (cognitive overload)

### Architecture Approach

The refactor follows a clear decomposition pattern: extract rendering, input handling, and coordinate logic from MapCanvas into custom hooks, then wrap the simplified components in react-resizable-panels. The existing Zustand store is well-scoped for global state (map data, tool state, viewport, undo/redo). Local state stays local (cursor position, active tab, drag state). The compound components pattern is recommended for the tabbed interface to ensure accessibility.

**Major components (target structure):**
1. **TopToolbar** — File operations, edit operations, tool selection (refactored from existing ToolBar)
2. **PanelGroup (vertical)** — Contains main canvas panel and bottom tabs panel with resize handle
3. **MapCanvas** — Simplified to ~200 lines using extracted hooks (useCanvasRenderer, useMapInput, useCoordinates)
4. **ScrollBars** — Extracted from MapCanvas, handles viewport scrolling
5. **BottomTabs** — Compound component containing TilePalette, MapSettings, AnimationPanel as tabs
6. **StatusBar** — Unchanged, fixed at bottom

**Hooks to extract from MapCanvas:**
- `useCanvasRenderer(tilesetImage, viewport, map, showGrid, animations)` — ~150 lines, drawing logic
- `useMapInput(viewport, setViewport, toolCallbacks)` — ~100 lines, mouse/keyboard handling
- `useCoordinates(viewport)` — ~40 lines, screen-to-tile and tile-to-screen conversion

### Critical Pitfalls

1. **Single-tile fill instead of pattern fill** — Current `fillArea` accepts single tile ID, ignoring multi-tile selections. Fix by modifying to accept `TileSelection` and use `(x % width, y % height)` for pattern tiling.

2. **Placeholder animation data masking bugs** — AnimationPanel generates fake frame data (`i * 4, i * 4 + 1...`) that doesn't match real tileset animations. Remove placeholder generation entirely, load real animation data from file.

3. **ResizeObserver infinite loop** — Can occur when resize callback changes element size. Mitigate by debouncing callbacks (50-100ms), using `requestAnimationFrame`, and relying on react-resizable-panels' built-in handling.

4. **Conditionally rendered panels without IDs** — react-resizable-panels requires `id` and `order` props when panels can appear/disappear. Always provide stable IDs on every Panel.

5. **Animation timer not using delta time** — Current `setInterval(150ms)` causes inconsistent speed on different refresh rates. Switch to `requestAnimationFrame` with elapsed time tracking.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Bug Fixes

**Rationale:** Fix data/logic bugs before restructuring UI. Pattern fill and animation bugs affect core functionality and are independent of layout changes.

**Delivers:** Working multi-tile pattern fill, proper animation data loading

**Addresses:**
- Pattern fill with multi-tile selections (FEATURES.md: table stakes — tool consistency)
- Animation panel showing correct frames (PITFALLS.md: critical pitfall #2)

**Avoids:** Pitfall #1 (single-tile fill), Pitfall #2 (placeholder data masking bugs)

**Research flag:** LOW — Implementation path is clear from codebase analysis. No external research needed.

### Phase 2: Layout Foundation

**Rationale:** Establish panel structure before migrating content. This creates the shell that subsequent phases fill in.

**Delivers:** Vertical PanelGroup with main area (75%) and bottom panel (25%), resize handle, size persistence

**Uses:** react-resizable-panels with `autoSaveId` for persistence

**Implements:** ARCHITECTURE.md target structure — PanelGroup wrapping existing components

**Avoids:** Pitfall #3 (ResizeObserver loops) by using library's built-in handling

**Research flag:** LOW — react-resizable-panels is well-documented, straightforward integration.

### Phase 3: MapCanvas Decomposition

**Rationale:** Extract hooks before moving components around. Simplifies MapCanvas from 547 lines to ~200 lines, making it easier to position in new layout.

**Delivers:** useCanvasRenderer, useMapInput, useCoordinates hooks; ScrollBars as separate component

**Implements:** ARCHITECTURE.md pattern #1 (custom hook extraction)

**Avoids:** Pitfall #7 (canvas flicker) by using `useLayoutEffect` for size-dependent operations

**Research flag:** LOW — Standard React patterns, existing code provides clear extraction boundaries.

### Phase 4: Tabbed Bottom Panel

**Rationale:** Build the tab infrastructure, then migrate existing panels into tabs. BottomTabs is the container, existing components become tab content.

**Delivers:** BottomTabs compound component with Tiles, Settings, Animations tabs; keyboard navigation; ARIA compliance

**Uses:** @radix-ui/react-tabs for accessible tab infrastructure

**Addresses:**
- Tabbed panels (FEATURES.md: table stakes)
- Tab keyboard navigation (FEATURES.md: should have)
- ARIA roles/keyboard accessibility (FEATURES.md: table stakes)

**Avoids:** Pitfall #4 (conditional panels without IDs) by providing stable IDs and order

**Research flag:** LOW — Radix UI tabs well-documented, W3C ARIA patterns are authoritative.

### Phase 5: Toolbar Refactor

**Rationale:** Final step — simplify toolbar now that panels are tabs. Remove toggle buttons that become redundant.

**Delivers:** TopToolbar with file/edit/tool buttons; tooltips with keyboard shortcuts; lucide-react icons

**Uses:** @radix-ui/react-toolbar, @radix-ui/react-tooltip, lucide-react

**Addresses:**
- Icon-only toolbar with tooltips (FEATURES.md: table stakes)
- Keyboard shortcuts in tooltips (FEATURES.md: should have)

**Research flag:** LOW — Radix primitives well-documented.

### Phase 6: Polish

**Rationale:** Address refinements after core functionality is complete.

**Delivers:** Min/max panel constraints (10-50%), double-click divider reset, animation timer delta time fix

**Addresses:**
- Panel constraints (FEATURES.md: should have)
- Quick reset (FEATURES.md: differentiator)

**Avoids:** Pitfall #5 (animation timing) by switching to requestAnimationFrame with delta time

**Research flag:** LOW — Minor enhancements with clear implementation.

### Phase Ordering Rationale

- **Bugs before restructure:** Pattern fill and animation bugs are independent of layout. Fixing them first means fewer moving parts during UI changes.
- **Layout shell before content migration:** Creating the panel structure first provides stable containers. Migrating content into tabs is safer when the structure exists.
- **Hook extraction before component movement:** Simplifying MapCanvas makes it easier to position in the new layout and debug any issues.
- **Tabs before toolbar:** The toolbar simplification depends on tabs existing (removing redundant toggle buttons).
- **Polish last:** Constraints, reset behavior, and timing fixes are refinements that don't block core functionality.

### Research Flags

Phases likely needing deeper research during planning:
- **None identified** — All phases use well-documented libraries with established patterns. The existing codebase provides clear extraction boundaries.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Bug Fixes):** Flood fill algorithms and animation timing are well-documented
- **Phase 2 (Layout):** react-resizable-panels has comprehensive docs
- **Phase 3 (Decomposition):** Standard React hook extraction patterns
- **Phase 4 (Tabs):** Radix UI + WAI-ARIA tabs pattern is authoritative
- **Phase 5 (Toolbar):** Radix primitives are straightforward
- **Phase 6 (Polish):** Minor enhancements with clear paths

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified on npm registry with current versions |
| Features | MEDIUM | Based on established editor patterns (VS Code, Photoshop, Figma), but user-specific preferences may vary |
| Architecture | HIGH | Based on official documentation and existing codebase analysis |
| Pitfalls | MEDIUM | Codebase-specific issues identified through analysis; ResizeObserver pitfalls from documented community issues |

**Overall confidence:** HIGH

The recommended stack is mature and well-documented. The architecture follows established React patterns. The pitfalls are either codebase-specific (identified through analysis) or well-documented community issues with known solutions.

### Gaps to Address

- **Animation data format:** Research identified placeholder data as a bug, but the actual animation data format (from SEDIT spec or Gfx.dll) needs verification during Phase 1 implementation. The file `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md` should be consulted.

- **Pattern fill alignment:** Decision needed during implementation: should pattern align to click point or to map grid (0,0)? Both are valid approaches with different use cases.

- **Panel size defaults:** The 75%/25% split is a starting point. Actual optimal sizes may need adjustment based on content dimensions (tile palette height, settings form height).

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) — Panel layout, persistence, conditional rendering
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) — Version 4.5.7, 2.7M weekly downloads
- [Radix UI Tabs](https://www.radix-ui.com/primitives/docs/components/tabs) — Tab component API
- [Radix UI Toolbar](https://www.radix-ui.com/primitives/docs/components/toolbar) — Toolbar component API
- [Radix UI Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) — Tooltip component API
- [W3C ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — Accessibility requirements
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — Animation timing
- [web.dev ResizeObserver](https://web.dev/articles/resize-observer) — Resize handling best practices

### Secondary (MEDIUM confidence)
- [VS Code Custom Layout Documentation](https://code.visualstudio.com/docs/configure/custom-layout) — Layout patterns
- [Tiled Map Editor documentation](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/) — Pattern fill behavior
- [Martin Fowler - Modularizing React Applications](https://martinfowler.com/articles/modularizing-react-apps.html) — Component decomposition
- [TkDodo - Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) — State management patterns
- [NN/g Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/) — Tooltip UX research

### Codebase Analysis (HIGH confidence for this project)
- `E:\NewMapEditor\src\core\editor\EditorState.ts` — Current state management, fillArea implementation
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` — Component to decompose
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Placeholder data bug
- `E:\NewMapEditor\src\components\App.tsx` — Current layout structure

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
