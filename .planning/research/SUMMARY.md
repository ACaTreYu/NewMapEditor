# Project Research Summary

**Project:** AC Map Editor v2.9 Measurement & Grid Milestone
**Domain:** Canvas-based tile map editor measurement tools and grid customization
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

This milestone adds measurement and visual customization capabilities to a mature Electron/React tile map editor. All three feature groups (ruler tool with 4 modes, grid customization with opacity/weight/color controls, and selection info labels) can be implemented using the existing validated stack with zero new dependencies. The Canvas 2D API, HTML5 native inputs, and standard JavaScript Math APIs provide everything needed.

The recommended approach follows established patterns from the codebase: ref-based transient state for drag interactions (like existing line/rect tools), RAF-debounced UI overlay rendering (like marching ants), and grid pattern caching with composite keys (extends existing zoom-based caching). All new overlays render on the existing UI layer canvas—no architectural changes required. The codebase already demonstrates these patterns in ~14,312 LOC across 18 shipped milestones.

Key risks center on coordinate system management (screen vs canvas space at various zoom levels), grid pattern regeneration performance (adding 3 customizable settings multiplies cache invalidation triggers), and multi-mode tool state management (4 ruler modes sharing state requires disciplined cleanup). These are all well-understood problems with proven solutions documented in the pitfalls research. The critical insight: follow existing patterns religiously, avoid "clever" optimizations that deviate from the ref-based drag pattern established in Phase 55.

## Key Findings

### Recommended Stack

**No new dependencies required.** This milestone is a pure feature addition using existing capabilities. The Canvas 2D API handles all rendering (ruler overlays, custom grid patterns, dimension labels). Native HTML5 inputs provide grid customization controls (range sliders for opacity/weight, color picker for grid color). JavaScript Math.hypot calculates Euclidean distances for ruler measurements.

**Core technologies:**
- **Canvas 2D API**: Ruler overlays, measurement labels, custom grid rendering — already validated in CanvasEngine, proven at 60 FPS
- **HTML5 native inputs**: Grid opacity/weight sliders, color picker — already using range/number inputs, add type="color" (100% Chromium support)
- **JavaScript Math API**: Distance calculations via Math.hypot — ES6 standard, zero dependencies

**Why no libraries:** Electron uses Chromium (consistent rendering), native APIs avoid bundle bloat, and the codebase already uses these patterns. Third-party color pickers (react-colorful 2.8KB, react-color 40KB) add weight without benefit for a single utility color setting.

### Expected Features

Research confirms these features meet user expectations from tile/image editor domains (GIMP, Photoshop, Tiled, Unity).

**Must have (table stakes):**
- **Ruler: Line distance** — standard in all image editors, click-drag measures straight-line pixel/tile distance
- **Status bar: Selection count** — Photoshop Info panel and Blender status bar show selection stats, "Sel: 5x3 (15 tiles)" format
- **Grid: Toggle visibility** — already exists, verified as table stakes
- **Grid: Opacity control** — Tiled, Unity, TileMap Studio all provide 0-100% opacity slider

**Should have (competitive differentiators):**
- **Ruler: Rectangle area** — MAP Measurement Tool and Digimizer have area mode (WxH and tile count)
- **Ruler: Multi-point path** — polyline measurement for non-straight paths (corridors, routes)
- **Ruler: Radius/circle** — game mechanics focused (weapon range, blast radius)
- **Grid: Line weight control** — Unity allows thickness customization (1-3px at 1x zoom)
- **Grid: Color picker** — Godot PR #101101 adds grid color, Unity has full color control
- **Center on selection** — SketchUp and CAD tools have "Zoom to Selection" (F key common), centers viewport without zoom change

**Defer (anti-features explicitly avoided):**
- **Ruler: Measurement scale/units** — Photoshop's "1 pixel = 1 foot" adds complexity for zero game design benefit
- **Grid: Arbitrary grid size** — AC maps are fixed 16x16px tiles, changing breaks tileset alignment
- **Ruler: Persistent measurement objects** — CAD tools save annotations, map editor needs transient UI

### Architecture Approach

All features integrate into the existing 2-layer canvas architecture (map buffer + UI overlay) with ref-based drag state and RAF-debounced rendering. No new canvas layers, no new architectural patterns—strict adherence to proven v2.8 patterns.

**Major components:**
1. **GlobalSlice (extended)** — Add `gridSettings` (opacity, weight, color, replace `showGrid`), `rulerState` (mode, coordinates), `rulerMode` enum
2. **MapCanvas.tsx drawUiLayer (extended)** — Render ruler overlays, custom grid patterns, selection info labels on existing UI overlay canvas
3. **MapCanvas mouse handlers (extended)** — Handle ruler tool clicks using ref-based state (same pattern as line tool from Phase 55)
4. **StatusBar.tsx (extended)** — Display ruler measurements ("Distance: 15 tiles (240px)") and selection count (already has "WxH" display)
5. **CanvasEngine (unchanged)** — Buffer rendering untouched, measurements are transient UI only

**Key pattern: Ref-based transient state for drags** — Use useRef for intermediate ruler drag positions without triggering React re-renders. Commit to Zustand only on mouseup. RAF-debounced `requestUiRedraw()` decouples rendering from state updates (60 FPS smooth). This is the exact pattern from line tool, rect drag, and selection drag (all ref-based).

### Critical Pitfalls

**From PITFALLS.md, the top risks with proven mitigations:**

1. **Coordinate System Confusion** — Ruler measurements position incorrectly after zoom/pan. Mouse events are in screen space, drawing happens in canvas space with transforms. **Avoid:** Create dedicated `screenToTile()` and `tileToScreen()` utilities, never apply canvas transforms to UI overlay layer, test at zoom 0.25x, 1x, 2x, 4x with fractional viewport positions.

2. **Grid Pattern Regeneration Thrashing** — Adding 3 customizable settings (opacity, weight, color) causes `createPattern()` to regenerate 60+ times per second during slider drag if not cached properly. Current system only caches by zoom. **Avoid:** Use composite cache key `${tilePixelSize}-${opacity}-${weight}-${color}`, debounce pattern regeneration to mouseup (not mousemove), apply opacity via `ctx.globalAlpha` to avoid regeneration for opacity-only changes.

3. **Ref State Desync in Multi-Mode Tool** — Ruler has 4 modes (line, rectangle, path, radius). Switching modes mid-measurement leaves dangling ref state. Path mode accumulates points array, switching to line mode doesn't clear it. **Avoid:** Use single `measurementStateRef` with discriminated union type, reset to `{mode: 'none'}` on tool change, add explicit cleanup in mode change handler.

4. **Selection Info Label Overflow and Clipping** — Label positioned "outside top-left corner" renders off-screen when selection is near viewport edge. At high zoom, text becomes unreadable. **Avoid:** Calculate label position in screen coordinates (not canvas), implement smart positioning (try top-left, fallback to bottom-left/inside), clamp to visible viewport bounds with padding.

5. **State Management Explosion** — Adding 15+ new state fields (3 grid settings, 4 ruler modes, overlay positions, preferences) to GlobalSlice triggers unrelated re-renders. Changing grid opacity re-renders toolbar. **Avoid:** Use granular selectors with `useShallow`, store per-document state in DocumentsSlice, store global UI state in GlobalSlice, document state ownership clearly.

## Implications for Roadmap

Based on research, recommend **5-phase structure** prioritizing low-risk table-stakes features first, then advanced ruler modes as differentiators.

### Phase 1: Foundation & Grid Customization
**Rationale:** Grid is isolated feature with no tool conflicts, establishes coordinate transform utilities and state architecture before complex ruler implementation. Grid customization is table stakes (Tiled, Unity all have this) and extends existing grid rendering logic.

**Delivers:**
- Coordinate transform utilities (`screenToTile`, `tileToScreen`)
- Grid settings state (opacity 0-100%, weight 1-3px, color picker)
- Grid customization UI (toolbar dropdown panel)
- Enhanced grid pattern caching (composite key: zoom+opacity+weight+color)

**Addresses:** Grid opacity/weight/color (table stakes from FEATURES.md), establishes foundation for ruler coordinate handling

**Avoids:** Coordinate system confusion (Pitfall 1) by creating utilities upfront, grid pattern thrashing (Pitfall 2) via composite caching

### Phase 2: Selection Info Enhancement
**Rationale:** Extends existing selection rendering with no new state or mouse handling. Trivial addition with high user value. Validates coordinate utilities and label positioning before ruler implementation.

**Delivers:**
- Selection dimensions label ("24x16") above selection rectangle
- Smart label positioning (top-left, fallback to bottom-left/inside)
- Selection count in status bar ("Sel: 5x3 (15 tiles)")

**Addresses:** Selection count/dimensions (table stakes from FEATURES.md)

**Avoids:** Label overflow pitfall (Pitfall 4) via smart positioning and bounds checking

### Phase 3: Ruler Tool — Line Mode
**Rationale:** Single ruler mode first (straight line distance), proven ref-based pattern, no complex geometry. Line distance is foundation for all other ruler modes (shared distance calculation). Validates multi-mode state architecture before adding modes.

**Delivers:**
- Ruler tool enum and toolbar button
- Ref-based ruler state for line drag
- Straight line ruler overlay rendering
- Distance display in status bar ("Distance: 15 tiles (240px)")
- Escape key cancellation (extend existing window listener)

**Addresses:** Ruler line distance (table stakes from FEATURES.md)

**Avoids:** Ref state desync (Pitfall 3) by using discriminated union from start

### Phase 4: Ruler Tool — Additional Modes
**Rationale:** Builds on working line mode, rendering variants are independent. Differentiators (rectangle area, multi-point path, radius/circle) set product apart from basic image editors.

**Delivers:**
- Rectangle area mode (WxH, tile count, area calculation)
- Multi-point path mode (polyline with segment distances)
- Radius/circle mode (center, radius, circle area πr²)
- Mode cycling via Escape key when ruler active
- Mode indicator in status bar

**Addresses:** Advanced ruler modes (differentiators from FEATURES.md)

**Uses:** Coordinate utilities from Phase 1, ref-based pattern from Phase 3

### Phase 5: Center on Selection
**Rationale:** Simple viewport calculation leveraging existing selection bounds, no new tool or complex state. High value for navigation with minimal implementation risk.

**Delivers:**
- Center viewport on selection command (keyboard shortcut or View menu)
- Smooth pan animation to selection center (no zoom change)
- Viewport bounds clamping (don't scroll map out of bounds)

**Addresses:** Center on selection (differentiator from FEATURES.md)

**Avoids:** Viewport centering race condition (Pitfall 7) via ref-based interpolation

### Phase Ordering Rationale

- **Phase 1 first:** Grid is lowest risk (visual-only), establishes foundation (coordinate utilities, caching patterns) needed by all subsequent phases. Table stakes feature.
- **Phase 2 before ruler:** Selection info validates coordinate utilities and label positioning with simpler geometry (rectangles) before complex ruler overlays.
- **Phase 3 before Phase 4:** Single ruler mode validates state architecture before adding mode complexity. Line distance is dependency for all other modes.
- **Phase 5 last:** Center-to-selection is independent feature, can be deferred if needed. Simplest implementation (viewport math only).

**Dependency chain:** Phase 1 utilities → Phase 2 label positioning → Phase 3 ruler foundation → Phase 4 ruler variants. Phase 5 is independent.

**Architecture-driven grouping:** Phases 1-2 are rendering enhancements (no tool changes), Phases 3-4 are new tool implementation (ref-based drag), Phase 5 is viewport manipulation (no rendering changes).

**Pitfall mitigation:** Phase 1 prevents coordinate confusion and caching thrashing before they can occur. Phase 3 validates multi-mode state architecture before adding modes in Phase 4. Each phase is independently testable.

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Grid pattern caching — well-documented Canvas API, existing zoom-based caching pattern to extend
- **Phase 2:** Selection label positioning — standard text rendering, proven Canvas TextMetrics API
- **Phase 3:** Ruler line mode — established ref-based drag pattern from Phase 55, Math.hypot for distance
- **Phase 4:** Ruler mode variants — geometric calculations (area, perimeter) are trivial, rendering uses same Canvas APIs
- **Phase 5:** Viewport centering — simple coordinate math, existing viewport state management

**No phases need `/gsd:research-phase`** — all features use validated patterns from existing codebase and standard browser APIs. Implementation risks are mitigated via proven architectural patterns (ref-based drag, RAF-debounced overlay, composite caching), not novel technology.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies, all features use Canvas 2D API (already in production), native HTML inputs (already using), Math.hypot (ES6 standard). Official MDN documentation for all APIs. |
| Features | **MEDIUM** | WebSearch verified with official sources (GIMP, Photoshop, Tiled docs), limited Context7 coverage (image editor libraries not in Context7). Feature expectations confirmed across multiple editors. |
| Architecture | **HIGH** | Extends existing 2-layer canvas architecture with proven patterns. Ref-based drag from Phase 55 is battle-tested. Grid pattern caching extends existing zoom-based logic. No new architectural concepts. |
| Pitfalls | **HIGH** | Official Canvas API docs, HTML5 best practices, existing codebase analysis (CanvasEngine.ts, MapCanvas.tsx patterns). All pitfalls have documented solutions with implementation examples. |

**Overall confidence:** **HIGH**

Research is comprehensive with official sources for stack and architecture. Feature expectations validated across multiple industry-standard editors (GIMP, Photoshop, Tiled, Unity). Pitfalls are well-understood with proven mitigations from Canvas performance guides and existing codebase patterns.

### Gaps to Address

**Minor gaps requiring validation during implementation:**

- **Ruler mode keyboard shortcuts:** R key is common (GIMP, Photoshop) but might conflict with potential "Rotate" tool. Research suggests R for ruler, but need to verify against existing shortcuts in codebase. **Resolution:** Check ToolBar.tsx for existing shortcuts during Phase 3 planning.

- **Grid settings location:** Research shows Tiled uses Preferences (global), Unity uses per-scene settings. Recommended global (user preference), but need to confirm with user workflow. **Resolution:** Store in GlobalSlice (persists to localStorage), document in Phase 1 plan.

- **Ruler persistence:** GIMP persists measurements, Aseprite feature requests suggest clearing on tool change. Recommended transient (clear on tool change), but might need user testing. **Resolution:** Implement clear-on-tool-change in Phase 3, can add persistence toggle in future if requested.

- **Selection count format:** Status bar already shows "5x3", add count in parentheses "5x3 (15 tiles)" or replace with "15 tiles"? **Resolution:** Extend existing format to "5x3 (15 tiles)" in Phase 2, maintains backward compatibility.

- **Center-to-selection keyboard shortcut:** F key common in 3D tools, no standard for 2D editors. Consider Ctrl+E or no default (View menu only). **Resolution:** Defer keyboard shortcut decision to Phase 5 planning, View menu item is sufficient for MVP.

None of these gaps block implementation. All have reasonable defaults with easy adjustment paths if user feedback suggests different choices.

## Sources

### Primary (HIGH confidence)
- **Canvas 2D API** — [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) — Core rendering API, strokeStyle, fillText, measureText, createPattern
- **HTML5 input elements** — [MDN input type="color"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color) — Color picker (92% browser support, 100% Chromium)
- **JavaScript Math API** — [MDN Math.hypot](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/hypot) — Euclidean distance calculation
- **Existing codebase** — E:\NewMapEditor\src\core\canvas\CanvasEngine.ts, MapCanvas.tsx, EditorState.ts — Architectural patterns (ref-based drag, RAF-debounced overlay, grid caching)

### Secondary (MEDIUM confidence)
- **GIMP Measure Tool** — [Wikibooks](https://en.wikibooks.org/wiki/GIMP/Measure_Tool) — Ruler tool UX patterns, status bar display
- **Photoshop measurement** — [Adobe Help](https://helpx.adobe.com/photoshop/using/measurement.html) — Measurement scale and ruler tool behavior
- **Tiled preferences** — [Tiled 1.11.0 docs](https://doc.mapeditor.org/en/stable/manual/preferences/) — Grid customization settings location
- **Unity grid customization** — [Unity Manual 6000.1](https://docs.unity3d.com/6000.1/Documentation/Manual/CustomizeGrid.html) — Grid opacity, color, weight controls
- **Godot grid color PR** — [GitHub PR #101101](https://github.com/godotengine/godot/pull/101101) — Grid color customization rationale
- **Blender status bar** — [Blender 5.0 Manual](https://docs.blender.org/manual/en/latest/interface/window_system/status_bar.html) — Selection count display format

### Tertiary (LOW confidence)
- **Aseprite ruler requests** — [Community forum](https://community.aseprite.org/t/is-there-some-sort-of-ruler-tool-in-this-program/6437), [GitHub Issue #747](https://github.com/aseprite/aseprite/issues/747) — User demand for ruler tool, transient vs persistent discussion
- **SketchUp zoom shortcuts** — [Community forum](https://forums.sketchup.com/t/keyboard-shortcut-for-zoom-to-selection/22581) — Center-to-selection keyboard shortcut conventions
- **Canvas performance** — [HTML5 Canvas Performance Tips](https://gist.github.com/jaredwilli/5469626) — Pattern caching, layer optimization
- **Coordinate transforms** — [roblouie blog](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/) — Screen-to-canvas coordinate conversion patterns

---
*Research completed: 2026-02-13*
*Ready for roadmap: yes*
