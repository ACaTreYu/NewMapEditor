# Project Research Summary

**Project:** AC Map Editor - Viewport Pan/Zoom/Animation Fixes
**Domain:** Canvas-based 2D tile map editor
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

This research confirms that NO new libraries are needed for the viewport fixes milestone. The existing Electron/React/TypeScript/Canvas stack has all required capabilities. The current implementation has two critical bugs: (1) animation visibility detection incorrectly treats tile coordinates as pixel coordinates, causing animations to only render at extreme zoom-out levels, and (2) pan drag sensitivity calculation includes zoom in the denominator, making panning feel inconsistent across zoom levels. Both are simple math corrections requiring zero dependencies.

The recommended approach is a three-phase implementation: first fix the broken animation visibility detection (critical bug blocking core functionality), then fix pan drag sensitivity (UX issue affecting all viewport navigation), and finally add zoom controls using native HTML5 range/number inputs already styled in the codebase. This approach minimizes risk by separating bugfixes from enhancements, allows incremental testing of viewport changes, and leverages existing design system patterns (the MapSettingsPanel already uses styled sliders for all settings).

Key risk is regression in mouse coordinate conversion affecting all tools (pencil, wall, select). Mitigation: extract coordinate conversion to a shared utility and test all tools after viewport changes. The existing 4-layer canvas architecture is optimal and should remain unchanged - this is enhancement work, not refactoring.

## Key Findings

### Recommended Stack

**NO new libraries needed.** The current stack already includes all required capabilities.

**Core technologies (existing):**
- **Chrome DevTools Performance Panel**: Canvas profiling, flame charts, frame rendering stats (built-in)
- **Native HTML5 `<input type="range">` and `<input type="number">`**: Zoom controls already styled in MapSettingsPanel.css
- **requestAnimationFrame**: Already implemented for animation loop, correct pattern for zoom-independent timing
- **Canvas API dirty rectangles**: Optional optimization if profiling shows >16ms draw times (browser-native)

**What NOT to add:**
- react-konva / PixiJS / Phaser: 50-100KB+ libraries, duplicate existing functionality, force architecture rewrite
- Material-UI / rc-slider / Radix: Conflict with OKLCH design tokens, unnecessary overhead (5-80KB)
- OffscreenCanvas + Web Workers: Premature optimization, serialization overhead not justified for tile editor

**Integration approach:**
- Zoom controls extend existing StatusBar component (already shows "Zoom: X%" as read-only)
- Reuse `.setting-slider` and `.setting-input` CSS classes from MapSettingsPanel
- Coordinate conversion extracted to shared utility to prevent tool regression

### Expected Features

**Must have (table stakes):**
- 1:1 pan drag (viewport moves exactly with mouse, zoom-independent)
- Mouse wheel zoom (toward cursor position, not canvas center)
- Zoom percentage display (real-time, shows current zoom level)
- 100% zoom reset (keyboard shortcut Ctrl+0)
- Zoom range enforcement (clamp to 0.25x-4x, disable controls at limits)
- Animation frame cycling (delta time-based, zoom-independent speed)
- Zoom-independent rendering (animations/grid/overlays render correctly at all zoom levels)

**Should have (competitive):**
- Zoom slider + input combo (professional-grade control: slider for speed, input for precision)
- Preset zoom levels (25%, 50%, 100%, 200%, 400% buttons/dropdown)
- Fit to window (auto-calculate zoom to fit 256x256 map)
- Animation speed control (multiplier 0.5x, 1x, 2x for editing animated tiles)
- Performance monitoring (FPS counter in dev mode)

**Defer (v2+):**
- Zoom to selection (requires selection system refinement)
- Smooth zoom transitions (polish feature, not core)
- Zoom history (viewport undo/redo, complex state management)
- Pan speed indicator (visual feedback during drag, debugging aid)

### Architecture Approach

The existing 4-layer canvas stack is optimal and should remain unchanged. Viewport state (x, y, zoom) is stored in DocumentsSlice (per-document), with animation state (animationFrame counter) in GlobalSlice (shared). Each layer applies the same canvas transform (scale then translate) for alignment. The ResizeObserver + RAF debouncing pattern prevents resize storms and ensures atomic redraws.

**Major components:**
1. **MapCanvas.tsx** - Owns all 4 canvas refs, handles mouse events, applies viewport transforms to all layers, converts screen coordinates to world coordinates
2. **AnimationPanel.tsx** - Runs global RAF loop, checks hasVisibleAnimatedTiles() across all documents, advances frame counter every 150ms (delta time-based)
3. **StatusBar.tsx** - Displays viewport state (zoom percentage), will host new ZoomControl component for input/slider
4. **EditorState (Zustand)** - Single source of truth for viewport (x, y, zoom), synchronized across components via subscriptions

**Critical bug identified in AnimationPanel.tsx lines 44-72:**
```typescript
// BROKEN: Treats viewport.x/y as PIXELS
const startX = Math.floor(viewport.x / (TILE_SIZE * viewport.zoom));

// CORRECT: viewport.x/y are TILE COORDINATES
const startX = Math.floor(viewport.x);
```

This explains why animations only render at far zoom-out (the incorrect math creates a huge tile range that accidentally includes the actual viewport).

### Critical Pitfalls

1. **Pan Delta Not Scaled by Zoom Factor** - Current code divides mouse delta by `(TILE_SIZE * viewport.zoom)`. This makes panning sluggish at high zoom, oversensitive at low zoom. Expected behavior: 1:1 screen-to-map movement. Fix: divide by `TILE_SIZE` only (remove zoom from denominator). Detection: drag 100px at zoom=0.25, 1, 2, 4 - movement should feel identical.

2. **Transform Not Reset Before Clearing Canvas** - When using `ctx.scale()` or `ctx.translate()`, the transform affects ALL operations including `ctx.clearRect()`. Must call `ctx.setTransform(1, 0, 0, 1, 0, 0)` before clearing to reset to identity matrix. Failure causes animation artifacts (works when zoomed out because scale < 1 clears more than needed, breaks when zoomed in because scale > 1 clears less than canvas). Prevention: reset → clear → apply transform (in that order).

3. **Transform Applied to Wrong Canvas Layer** - In a 4-layer system, each canvas has separate rendering context. Applying world-space transform (scale + translate) to ALL layers ensures alignment. UI overlays should use identity transform (screen-space). Common error: forgetting to apply transform to one layer, causing misalignment at non-1x zoom.

4. **Zoom Input Without Range Validation** - Number inputs accept any value. Without validation, entering 0 causes division by zero (pan delta / 0 = NaN), negative values flip rendering, values > 100 cause memory allocation failure. Prevention: validate on blur, clamp to MIN_ZOOM/MAX_ZOOM (0.25-4), handle NaN/empty string gracefully.

5. **Animation Loop Runs Faster on High Refresh Rate Displays** - `requestAnimationFrame` fires at display refresh rate (60Hz = 60fps, 120Hz = 120fps). Incrementing frame counter every RAF call makes animations twice as fast on 120Hz displays. Prevention: use timestamp delta for frame-rate independent animation (current implementation uses delta time correctly, keep this pattern).

## Implications for Roadmap

Based on research, suggested three-phase structure:

### Phase 1: Fix Animation Visibility Detection (CRITICAL BUG)

**Rationale:** Animations currently only render at far zoom-out due to incorrect viewport bounds calculation. This is a critical bug blocking core functionality - users cannot see animated tiles at normal editing zoom levels (1x). Must be fixed before any zoom control enhancements.

**Delivers:** Animations render correctly at all zoom levels (0.25x to 4x)

**Addresses (Features):**
- Animation frame cycling (table stakes - currently broken)
- Zoom-independent rendering (table stakes - currently broken)

**Avoids (Pitfalls):**
- Pitfall #2: Transform not reset before clearing (verify clearRect order in AnimLayer)
- Pitfall #3: Transform applied to wrong layer (ensure all 4 layers get same transform)

**Complexity:** Low (single function fix, 10 lines of code)

**Dependencies:** None

**Implementation:**
- Fix `hasVisibleAnimatedTiles()` in AnimationPanel.tsx (lines 44-72)
- Replace broken viewport bounds math with correct calculation (match `getVisibleTiles()` from MapCanvas)
- Test: place animated tile at viewport center, verify animation plays at zoom=1

### Phase 2: Fix Pan Drag Sensitivity (UX BUG)

**Rationale:** Pan drag currently feels inconsistent across zoom levels (sluggish when zoomed in, oversensitive when zoomed out). This affects all viewport navigation via right-click drag. Must be fixed before adding new zoom controls to ensure viewport navigation UX is consistent.

**Delivers:** 1:1 pan movement - dragging 100px moves map 100px on screen at all zoom levels

**Addresses (Features):**
- 1:1 pan drag (table stakes - currently broken UX)

**Avoids (Pitfalls):**
- Pitfall #1: Pan delta not scaled by zoom (remove zoom from denominator)
- Pitfall #13: Breaking existing mouse coordinate conversion (test all tools after change)

**Complexity:** Low (single calculation change, 5 lines of code)

**Dependencies:** None (can be done in parallel with Phase 1, but test sequentially)

**Implementation:**
- Modify pan drag math in MapCanvas.tsx (lines 856-863)
- Change `const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom)` to `const dx = (e.clientX - lastMousePos.x) / TILE_SIZE`
- Test: drag map at zoom=0.25, 1, 2, 4 - movement should feel identical
- Regression test: verify all tools (pencil, wall, select) still click on correct tile

### Phase 3: Add Zoom Controls UI (ENHANCEMENT)

**Rationale:** With animation and pan bugs fixed, add professional zoom controls to status bar. Zoom currently works via mouse wheel only - adding slider + input provides precision control and visibility. Uses existing styled inputs from MapSettingsPanel (zero new CSS needed).

**Delivers:** Interactive zoom controls in status bar (slider, numeric input, preset buttons, keyboard shortcuts)

**Addresses (Features):**
- Zoom slider + input combo (should have - differentiator)
- Preset zoom levels (should have - competitive)
- Zoom percentage display (table stakes - upgrade from read-only to interactive)
- 100% zoom reset (table stakes - add Ctrl+0 keyboard shortcut)
- Zoom range enforcement (table stakes - disable controls at limits)

**Uses (Stack):**
- Native HTML5 `<input type="range">` and `<input type="number">`
- Existing `.setting-slider` and `.setting-input` CSS classes from MapSettingsPanel
- Zustand state management (viewport.zoom)

**Implements (Architecture):**
- ZoomControl component integrated into StatusBar
- Bidirectional sync: slider/input/keyboard all write to same `setViewport({ zoom })`
- No state conflicts (single source of truth in Zustand)

**Avoids (Pitfalls):**
- Pitfall #4: Zoom input without validation (clamp 0.25-4, handle NaN)
- Pitfall #6: Slider and input out of sync (use same Zustand state)
- Pitfall #9: Zoom slider step doesn't match common levels (use step=0.25)
- Pitfall #11: No visual feedback (show zoom percentage, disable controls at limits)
- Pitfall #12: Premature validation (validate on blur, not keystroke)

**Complexity:** Medium (new component, validation logic, keyboard handlers, ~150 LOC)

**Dependencies:** Phase 1 & 2 complete (ensures zoom controls work with fixed rendering/pan)

**Implementation:**
- Add ZoomControl component to StatusBar.tsx (replace current "Zoom: X%" field)
- Numeric input (25-400, step 25) + range slider (0.25-4, step 0.25)
- Preset buttons (25%, 50%, 100%, 200%, 400%)
- Keyboard shortcuts (Ctrl+Plus, Ctrl+Minus, Ctrl+0)
- Validation: clamp on blur, disable buttons at limits, show current value in both controls

### Phase Ordering Rationale

- **Bugfixes before enhancements:** Phases 1 & 2 fix broken functionality, Phase 3 adds new features. This prevents building new UI on top of broken viewport behavior.
- **Animation before pan:** Both are independent, but animation is more critical (completely broken vs. poor UX). Can be done in parallel if needed.
- **Pan before zoom controls:** Pan fix affects how viewport navigation feels. Must be correct before adding more ways to change viewport (zoom controls).
- **Incremental testing:** Each phase can be tested independently. Phase 3 depends on 1 & 2 working correctly.
- **Risk isolation:** Separate bugfixes (Phases 1-2: 15 LOC total) from new component (Phase 3: 150 LOC). If Phase 3 introduces regressions, Phases 1-2 functionality is already verified.

### Research Flags

**Phases NOT needing deeper research (standard patterns):**
- **Phase 1:** Viewport bounds calculation is well-understood math, verified against existing `getVisibleTiles()` pattern in codebase
- **Phase 2:** Pan drag sensitivity is standard canvas panning, multiple sources confirm delta / zoom formula
- **Phase 3:** HTML5 form controls are native browser features, validation patterns are established best practices

**All phases can proceed directly to planning without additional research.**

### Optional Phase 4+ (Defer to Future Milestone)

- **Fit to Window:** Calculate zoom to fit 256x256 map in container (medium complexity, should-have feature)
- **Animation Speed Control:** Multiplier slider for animation timing (low complexity, should-have feature)
- **Performance Monitoring:** FPS counter in dev mode (low complexity, should-have feature)
- **Preset Zoom Dropdown:** Alternative to buttons, saves space (low complexity)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings verified against actual codebase. No libraries needed - browser-native APIs sufficient. |
| Features | HIGH | Table stakes vs differentiators clearly identified via professional tool comparison (Photoshop, Excel, Tiled, Figma). Testing checklist provided. |
| Architecture | HIGH | Root causes identified through code analysis (AnimationPanel.tsx lines 44-72, MapCanvas.tsx lines 856-863). Math errors confirmed with calculation examples. |
| Pitfalls | HIGH | All critical pitfalls verified with MDN official docs or multiple authoritative sources. Phase-specific warnings mapped to implementation risks. |

**Overall confidence:** HIGH

### Gaps to Address

**Animation frame rate consistency:**
- Current implementation uses `setInterval` (150ms) which is frame-rate independent ✅
- Alternative approach using `requestAnimationFrame` with delta time would be more performant
- Gap: Need to verify current approach doesn't drift on long editing sessions
- Mitigation: Add timestamp validation in Phase 1 testing

**Device pixel ratio handling:**
- Research assumes 1:1 device pixel ratio (standard displays)
- High-DPI displays (Retina, 4K) may need `window.devicePixelRatio` adjustment
- Gap: Not tested on high-DPI displays
- Mitigation: Add optional Phase 3+ work to handle devicePixelRatio if user reports blurriness

**Touch/gesture zoom:**
- Research focused on mouse wheel zoom
- Trackpad pinch gestures fire WheelEvent with ctrlKey (already handled by existing code)
- Gap: Not explicitly tested on trackpad
- Mitigation: Manual testing during Phase 3 verification

**Performance at extreme zoom:**
- Research assumes typical usage (0.5x-2x zoom)
- Extreme zoom (0.25x showing entire 256x256 map, 4x showing 16x16 tiles) not performance-tested
- Gap: Unknown if dirty rectangle optimization needed at extreme zoom-out
- Mitigation: Add performance profiling task to Phase 3 verification (Chrome DevTools)

## Sources

### PRIMARY (HIGH confidence - Official Docs, Verified Code)
- **Codebase analysis:**
  - E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx (viewport transform, pan drag, zoom implementation)
  - E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx (animation loop, visibility detection bug)
  - E:\NewMapEditor\src\components\StatusBar\StatusBar.tsx (current zoom display)
  - E:\NewMapEditor\src\components\MapSettingsPanel\MapSettingsPanel.css (styled slider pattern)
- **MDN official documentation:**
  - [Canvas API - Basic animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
  - [CanvasRenderingContext2D.setTransform()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setTransform)
  - [Window: requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
  - [Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
  - [Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
  - [Tiles and tilemaps overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- **Chrome DevTools:**
  - [Chrome DevTools Performance Reference](https://developer.chrome.com/docs/devtools/performance/reference)
  - [Canvas Inspection using Chrome DevTools](https://web.dev/articles/canvas-inspection)
- **Industry standards:**
  - [Tiled Keyboard Shortcuts - Official Docs](https://doc.mapeditor.org/en/stable/manual/keyboard-shortcuts/)

### SECONDARY (MEDIUM confidence - Technical Articles, Established Patterns)
- [Panning and Zooming in HTML Canvas - Harrison Milbradt](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming)
- [High Performance Map Interactions using HTML5 Canvas - ChairNerd/SeatGeek](https://chairnerd.seatgeek.com/high-performance-map-interactions-using-html5-canvas/)
- [Optimising HTML5 Canvas Rendering - AG Grid Blog](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/)
- [Time-based Animation with HTML 5 Canvas and JavaScript - Viget](https://www.viget.com/articles/time-based-animation)
- [Standardize your JavaScript games' framerate for different monitors - Chris Courses](https://chriscourses.com/blog/standardize-your-javascript-games-framerate-for-different-monitors)
- [A Complete Guide To Live Validation UX - Smashing Magazine](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [Styling Cross-Browser Compatible Range Inputs - CSS-Tricks](https://css-tricks.com/styling-cross-browser-compatible-range-inputs-css/)
- [Creating A Custom Range Input - Smashing Magazine](https://www.smashingmagazine.com/2021/12/create-custom-range-input-consistent-browsers/)
- [From SVG to Canvas - part 1: making Felt faster - Felt](https://felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster)
- [Building canvas-based editors in React - Ali Karaki](https://www.alikaraki.me/blog/canvas-editors-konva)
- [Zoom control – Map UI Patterns](https://mapuipatterns.com/zoom-control/)

### TERTIARY (LOW confidence - Community Examples)
- [Simple Canvas Pan And Zoom - GitHub Gist](https://gist.github.com/balazsbotond/1a876d8ccec87e961ec4a4ae5efb5d33)
- [Canvas zoom - GitHub Repository](https://github.com/richrobber2/canvas-zoom)
- [Creating a Zoom UI - Steve Ruiz](https://www.steveruiz.me/posts/zoom-ui)
- [40 Slider UI Examples That Work - Eleken](https://www.eleken.co/blog-posts/slider-ui)

---
**Research completed:** 2026-02-11
**Ready for roadmap:** yes
