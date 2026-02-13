# Pitfalls Research: Measurement Tools, Grid Customization, and Selection Info

**Domain:** Canvas measurement tools, grid customization, and selection info overlays in tile map editor
**Researched:** 2026-02-13
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Coordinate System Confusion Between Layers

**What goes wrong:**
Ruler measurements, info labels, and overlays position incorrectly after zoom/pan operations. Mouse coordinates from events target the wrong layer, causing measurements to drift or snap to wrong positions. Labels placed "outside selection" end up inside or off-screen.

**Why it happens:**
Canvas has two coordinate systems: screen coordinates (pixel position in viewport) and canvas coordinates (world position accounting for zoom/translation). When applying transformations with `ctx.scale()` and `ctx.translate()`, mouse event coordinates remain in screen space while drawing happens in canvas space. The transformation must be inverted to convert mouse position to canvas position. Current system uses manual viewport calculations (`tileToScreen` in MapCanvas.tsx line 150), but ruler tool will need inverse transform (`screenToTile`).

**How to avoid:**
1. Create dedicated coordinate transform utilities for both directions
2. Never apply canvas transforms to UI overlay layer (keep it in screen space)
3. Use `ctx.getTransform()` and `DOMMatrix.invertSelf()` for reliable conversion
4. Test all ruler modes at zoom levels 0.25x, 1x, 2x, 4x with fractional viewport positions

**Warning signs:**
- Ruler endpoints don't align with cursor during drag
- Labels drift after zoom changes
- Measurements correct at zoom 1.0 but wrong at other zooms
- "Pinned" overlays move when viewport pans

**Phase to address:**
Phase 1 (foundation) — establish coordinate transform utilities before any tool implementation

---

### Pitfall 2: Grid Pattern Regeneration Thrashing

**What goes wrong:**
Allowing user-configurable grid opacity, weight, and color means `createPattern()` must be regenerated dynamically. If regeneration happens on every frame or mousemove event, performance degrades severely. Current system only regenerates on zoom change (line 238: `if (gridPatternZoomRef.current !== tilePixelSize)`), but adding 3 new grid settings multiplies regeneration triggers.

**Why it happens:**
`createPattern()` is relatively expensive (creates off-screen canvas, draws pattern, converts to CanvasPattern object). Current code regenerates when `tilePixelSize` changes. Adding grid customization naively would trigger on ANY setting change. Without caching strategy, changing opacity slider causes 60+ regenerations per second during drag.

**How to avoid:**
1. Create composite cache key from ALL grid settings: `${tilePixelSize}-${opacity}-${weight}-${color}`
2. Use Map or object cache to store multiple patterns
3. Debounce pattern regeneration during slider drag (apply on mouseup, not mousemove)
4. Consider separating pattern creation from rendering: pattern defines shape, opacity applied via `ctx.globalAlpha` (avoids regeneration for opacity-only changes)
5. Limit cache size (max 20 patterns) with LRU eviction

**Warning signs:**
- Frame rate drops when adjusting grid settings
- DevTools profiler shows `createPattern` consuming >10ms per frame
- UI feels sluggish during grid customization
- Memory usage grows unbounded with grid changes

**Phase to address:**
Phase 2 (grid customization) — implement caching BEFORE exposing customization UI

---

### Pitfall 3: UI Overlay Z-Index and Event Blocking

**What goes wrong:**
Pinnable measurement overlays block mouse events to the map canvas underneath. Users cannot pan, paint, or interact with map when overlays cover the area. Alternatively, if overlays are non-interactive (`pointer-events: none`), users cannot drag/unpin them. Labels outside selection might obscure important map areas.

**Why it happens:**
Browser event model processes events top-to-bottom through DOM tree. The topmost element with `pointer-events: auto` receives the event and can stop propagation. Current architecture has 2 canvas layers (map + UI overlay). Adding pinned HTML overlays (for better text rendering) creates 3rd layer. CSS `z-index` doesn't control canvas draw order, only DOM element stacking.

**How to avoid:**
1. Use HTML overlay elements for pinned measurements, NOT canvas drawing
2. Apply `pointer-events: none` to overlay container, `pointer-events: auto` only to interactive widgets (close/pin buttons)
3. Add "minimize" button to pinned overlays (collapse to icon to reduce obstruction)
4. Implement "overlay manager" in Zustand to track all pinned overlays with z-order
5. Add drag handles to move pinned overlays (don't lock position)
6. Test: can user still paint/pan map with 5 pinned overlays visible?

**Warning signs:**
- Users report "map is frozen" after pinning overlays
- Cannot click map areas covered by labels
- Overlays cannot be interacted with after implementing non-blocking
- Overlays disappear when canvas redraws

**Phase to address:**
Phase 3 (pinnable overlays) — design HTML-based overlay system with proper event handling BEFORE implementing pin functionality

---

### Pitfall 4: Ref State Desync in Multi-Mode Tool

**What goes wrong:**
Ruler tool has 4 modes (line, rectangle, path, radius). Switching modes mid-measurement leaves dangling ref state. Path mode accumulates points in ref array, switching to line mode doesn't clear it, switching back to path shows ghost points. Escape key cancellation only clears some refs, not all mode-specific state.

**Why it happens:**
Current drag implementation uses refs for performance (lines 49-60 in MapCanvas.tsx show 5 separate drag state refs). Each tool mode needs different state shape: line needs `{start, end}`, rectangle needs `{start, end}`, path needs `{points: [{x,y}], complete: bool}`, radius needs `{center, radius}`. If each mode uses separate refs, mode switch doesn't trigger cleanup. If modes share refs, state shape conflicts.

**How to avoid:**
1. Create single `measurementStateRef` with discriminated union type:
   ```typescript
   type MeasurementState =
     | { mode: 'line', start: Point, end: Point }
     | { mode: 'rect', start: Point, end: Point }
     | { mode: 'path', points: Point[], complete: boolean }
     | { mode: 'radius', center: Point, radius: number }
     | { mode: 'none' }
   ```
2. Reset to `{mode: 'none'}` on tool change, mode change, or Escape
3. Add mode change handler that explicitly clears ref before setting new mode
4. Test: start line drag, press 'R' for rectangle mode, ensure line disappears
5. Add to existing Escape handler (window keydown listener, Phase 55 implementation)

**Warning signs:**
- Switching tools leaves visible measurement artifacts
- Escape doesn't fully clear ruler state
- Starting new measurement shows previous measurement briefly
- Undo/redo breaks ruler state

**Phase to address:**
Phase 1 (foundation) — design state management pattern for multi-mode tools BEFORE implementing individual modes

---

### Pitfall 5: Selection Info Label Overflow and Clipping

**What goes wrong:**
Selection info label (e.g., "24x16 tiles") positioned "outside top-left corner of selection" renders off-screen when selection is near viewport edge. At high zoom levels, label text becomes unreadable (too large or wraps). At low zoom levels, label overlaps selection border. Label update on every mousemove during selection drag causes flickering.

**Why it happens:**
Naive implementation positions label at `selectionY - labelHeight` in canvas coordinates. When selection near top edge, `selectionY - labelHeight < 0` clips label. Canvas coordinate space is infinite (negative coordinates exist), but screen canvas clips at (0,0). Current marching ants implementation (lines 448-477 in MapCanvas) draws directly on UI overlay with no bounds checking. Text rendering on canvas at various zoom levels doesn't scale — 12px font at 4x zoom becomes 48px.

**How to avoid:**
1. Calculate label position in SCREEN coordinates, not canvas coordinates
2. Implement "smart positioning": try top-left, if clipped try bottom-left, if clipped try top-right, if clipped try inside selection
3. Use HTML overlay for labels (CSS handles overflow, font scaling, better anti-aliasing)
4. Debounce label updates to RAF (same pattern as `requestUiRedraw` line 569)
5. Add optional label toggle (hide when screen space limited)
6. Clamp label position to visible viewport bounds with padding

**Warning signs:**
- Labels disappear when selection near edge
- DevTools shows labels exist but outside viewport bounds
- Text becomes giant at high zoom or microscopic at low zoom
- Selection drag stutters or frame rate drops

**Phase to address:**
Phase 4 (selection info) — implement smart positioning and HTML overlays BEFORE exposing to users

---

### Pitfall 6: RAF Throttling with Pinned Overlays

**What goes wrong:**
Browser throttles `requestAnimationFrame` when tab inactive or low-power mode enabled. Current animation system (line 94: `animationFrame` counter) drives all canvas updates. Pinned measurement overlays persist across frames, but if RAF throttles to 1fps or pauses, overlays appear to "freeze" or desync from map state. Particularly bad on iOS low-power mode.

**Why it happens:**
Browsers throttle RAF to conserve resources: inactive tabs drop to ~1fps, iOS low-power mode drops to 30fps. Current system increments `animationFrame` counter in RAF loop (stored in Zustand, subscribed by MapCanvas). This works for animated tiles because they're ephemeral. Pinned overlays are persistent UI state, should not depend on animation timing. Mixing animation-driven and persistent rendering causes sync issues.

**How to avoid:**
1. Separate persistent UI (pinned overlays, labels) from animated content (tiles, marching ants)
2. Render pinned overlays as HTML elements, not canvas drawings
3. Use CSS animations for marching ants instead of RAF (simpler, works when tab inactive)
4. Only use RAF for actual animation (tile frames), not for static UI updates
5. Add visibility check: detect when overlays go out of sync, force redraw

**Warning signs:**
- Overlays lag behind map panning
- Returning to tab shows stale overlay positions
- Mobile users report "frozen" overlays
- Overlays disappear after idle timeout

**Phase to address:**
Phase 3 (pinnable overlays) — use HTML-based overlays, not RAF-driven canvas rendering

---

### Pitfall 7: Viewport Centering Race Condition

**What goes wrong:**
"Center viewport on selection" feature commits viewport change to Zustand, triggers React re-render, MapCanvas subscribes to viewport change, requests redraw. Between Zustand update and canvas redraw, rapid tool changes or selection changes cause second viewport update, creating competing RAF requests. Canvas shows wrong viewport briefly before settling.

**Why it happens:**
Current viewport system uses Zustand state (line 80-90: `viewport` subscription). React re-render cycle not synchronous with canvas rendering. Sequence: (1) User clicks "center on selection" → (2) `setViewport()` called → (3) Zustand state updates → (4) MapCanvas receives new viewport → (5) useEffect triggers → (6) RAF scheduled → (7) Canvas redraws. If step 2 happens twice before step 7, only last viewport wins. Current pan implementation uses refs for immediate feedback (line 66: `panStartRef`), but centering action doesn't use refs.

**How to avoid:**
1. Add "centering animation" via ref-based interpolation (like pan drag)
2. Implement viewport update queue in CanvasEngine (serializes competing updates)
3. Add `isViewportAnimating` flag to prevent tool interactions during center
4. Use same pattern as existing pan: immediate viewport calc, RAF-throttled redraw, batch commit
5. Test: rapidly toggle selection and center, ensure smooth transition

**Warning signs:**
- Canvas "jumps" when centering on selection
- Viewport ends at wrong position after center
- Multiple RAF requests in flight simultaneously
- DevTools shows competing state updates

**Phase to address:**
Phase 5 (viewport centering) — implement animation system BEFORE exposing center-to-selection UI

---

### Pitfall 8: State Management Explosion

**What goes wrong:**
Adding 3 grid settings + 4 ruler modes + pinned overlay positions + selection info preferences creates 15+ new Zustand state fields. Current EditorState.ts already has 30+ fields (lines 1-150 show GlobalSlice + DocumentsSlice + WindowSlice). Adding naively to GlobalSlice creates single monolithic state object, triggering re-renders across unrelated components. Changing grid opacity re-renders toolbar.

**Why it happens:**
Current architecture uses slice pattern (DocumentsSlice, GlobalSlice, WindowSlice) but newer state additions go into GlobalSlice by default. Zustand subscribes to entire state object unless using `useShallow` (line 80: `useShallow` wrapper). Every state field change triggers subscription. Grid settings, ruler state, and overlay positions are independent concerns but stored adjacently.

**How to avoid:**
1. Create new `ViewportSlice` for grid settings, ruler state, overlay manager
2. Use granular selectors (line 105-108 shows pattern: individual field subscriptions)
3. Store per-document state in DocumentsSlice (selection info preferences)
4. Store global UI state in GlobalSlice (grid color preference)
5. Document state ownership in EditorState.ts comment header
6. Audit: which components subscribe to which fields? Minimize cross-cutting subscriptions

**Warning signs:**
- Changing grid color causes toolbar button flash
- DevTools Profiler shows unrelated component re-renders
- Bundle size grows disproportionately with new features
- State updates feel "laggy" (too many subscribers)

**Phase to address:**
Phase 1 (foundation) — design state slice architecture BEFORE adding any new state fields

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Drawing labels on canvas instead of HTML | No DOM manipulation needed | Text rendering quality poor, scaling issues, no accessibility, hard to style | Never — HTML overlays strictly superior |
| Storing all grid settings in single object | Simple initial implementation | Changing any setting regenerates entire pattern | Only for prototype — refactor before shipping |
| Using separate refs for each ruler mode | Easy to implement modes independently | Mode switching bugs, Escape cancellation incomplete | Never — use discriminated union from start |
| Skipping coordinate transform utilities | Fewer files to create initially | Every feature reimplements transforms, bugs multiply | Never — transforms are foundational |
| Caching only last grid pattern | Minimal memory overhead | Pattern regenerates on every setting change | Only for MVP with no customization — unacceptable with sliders |
| Hard-coding label positions (top-left only) | Simplest positioning logic | Labels clip at viewport edges | Only for initial prototype — add smart positioning before beta |
| Placing overlay state in GlobalSlice | Avoids creating new slice | Unrelated re-renders, state organization unclear | Only if <5 fields total — create slice at 5+ fields |
| Synchronous viewport centering (no animation) | No RAF coordination needed | Jarring UX, disorienting for users | Acceptable for MVP, add animation in polish phase |

## Integration Gotchas

Common mistakes when connecting new features to existing system.

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| CanvasEngine buffer | Drawing measurements on 4096x4096 buffer | Draw transient UI only on UI overlay canvas (uiLayerRef), never on buffer |
| Escape key handler | Adding per-tool Escape listener | Extend existing window keydown listener (Phase 55 implementation) with mode checks |
| Grid pattern cache | Storing in component state (useRef in MapCanvas) | Store in CanvasEngine or Zustand slice for cross-component access |
| Zustand subscriptions | Subscribing to entire state object | Use `useShallow` + granular selectors (see line 80-90 pattern) |
| Mouse event coordinates | Using `event.clientX/clientY` directly | Convert via `getBoundingClientRect()` then apply viewport transform |
| Tool switching | Clearing state in new tool's activation | Clear state in OLD tool's deactivation (prevents state leaks) |
| RAF redraw requests | Multiple components calling `requestAnimationFrame` | Use CanvasEngine's RAF management or existing `requestUiRedraw` pattern |
| Document-specific state | Storing in GlobalSlice | Store in DocumentsSlice per-document state (see line 82-89 pattern) |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Regenerating grid pattern on mousemove | Slider drag stutters, frame drops | Debounce to mouseup, cache by composite key | >10 settings changes/second |
| Redrawing all pinned overlays every frame | Scrolling becomes choppy with 3+ overlays | Use HTML overlays (browser handles dirty rects) | >3 pinned overlays |
| Searching Zustand documents Map on every render | Toolbar lags with multiple documents open | Cache active document ref, subscribe once | >5 open documents |
| Storing full path measurement history | Memory leak, tool switching slows | Limit path points to 1000, prune on mode switch | >500 path points |
| Drawing high-DPI text on canvas | Label rendering takes >16ms at 4K resolution | Use HTML with CSS transforms for text | >10 labels visible |
| Recalculating label positions during pan drag | Pan feels laggy, mouse cursor desyncs | Cache label offsets, apply viewport transform | Any pan operation |
| Cloning entire map for ruler preview | Memory spike, GC pauses | Use ref-based transient state, no cloning | Always — never clone map |
| Converting all tiles to screen coords | Zoom change takes >100ms | Convert only visible tiles, cache transform matrix | Zoom change at any scale |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Ruler tool always visible after activation | Clutters workspace, obscures map | Auto-dismiss after measurement complete, or pin explicitly |
| No visual feedback during ruler drag | Users unsure if tool is working | Show live dimension text during drag, not just on release |
| Grid settings hidden in menu | Users don't discover customization | Add grid icon to toolbar with dropdown for quick access |
| Pinned overlays cannot be moved | Overlay permanently blocks important area | Always add drag handles to pinned elements |
| Selection info label uses tile coordinates | Confusing for users thinking in pixels | Show both tile dimensions (24x16) and pixel dimensions (384x256) |
| Center-to-selection with no animation | Viewport "jumps," user loses orientation | Smooth pan animation over 300-500ms |
| Ruler modes not discoverable | Users don't know R/L/P/C shortcuts exist | Show mode toolbar or hover tooltip with shortcuts |
| Grid weight slider allows 0px | Grid becomes invisible, user thinks feature broken | Minimum weight 0.5px, disable at 0 weight instead |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Ruler tool:** Often missing cancellation (Escape, right-click) — verify cancel clears ref state and redraws UI layer
- [ ] **Grid customization:** Often missing pattern cache eviction — verify memory doesn't grow unbounded over session
- [ ] **Selection info label:** Often missing bounds checking — verify label visible at all zoom levels and viewport positions
- [ ] **Pinned overlays:** Often missing z-order management — verify overlays don't stack indefinitely or occlude each other
- [ ] **Coordinate transforms:** Often missing inverse transform — verify screen-to-tile works at fractional zoom (1.5x, 2.3x)
- [ ] **Viewport centering:** Often missing bounds clamping — verify centering on edge selection doesn't scroll map out of bounds
- [ ] **Ruler path mode:** Often missing point limit — verify 1000+ clicks doesn't crash or hang
- [ ] **Multi-mode state:** Often missing cleanup on tool switch — verify no ghost state when switching ruler → pencil → ruler
- [ ] **Grid color picker:** Often missing alpha channel — verify transparency works (rgba vs rgb)
- [ ] **Overlay events:** Often missing pointer-events CSS — verify map interactable under overlays

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Coordinate system confusion | MEDIUM | Add transform utilities retroactively, audit all mouse handlers, write integration tests |
| Grid pattern thrashing | LOW | Add caching layer without changing pattern generation logic, no API changes |
| UI overlay event blocking | HIGH | Refactor from canvas to HTML overlays, requires DOM restructuring and event handler rewrites |
| Ref state desync | MEDIUM | Consolidate refs into discriminated union, add reset function, audit Escape handler |
| Label overflow | LOW | Add bounds checking to existing positioning code, no state changes needed |
| RAF throttling | HIGH | Migrate from canvas to HTML rendering, major architectural change |
| Viewport centering race | MEDIUM | Add queueing system to CanvasEngine, requires engine modifications but no API changes |
| State management explosion | HIGH | Refactor into new slice, migrate existing code to new selectors, update all subscribers |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Coordinate system confusion | Phase 1: Foundation utilities | Write transform test: screen(100,100) → tile → screen === (100,100) at all zoom levels |
| Grid pattern thrashing | Phase 2: Grid customization | DevTools profiler: createPattern called max 1x per setting change, not per frame |
| UI overlay event blocking | Phase 3: HTML overlay infrastructure | Manual test: paint map with 5 pinned overlays visible, pan map underneath overlays |
| Ref state desync | Phase 1: Measurement state management | Mode switching test: start measurement in each mode, switch modes, verify clean slate |
| Label overflow | Phase 4: Selection info labels | Edge case test: selection at all 4 viewport edges + corners, verify label visible |
| RAF throttling | Phase 3: HTML overlay infrastructure | Tab inactive test: switch tabs, return after 30s, verify overlays not frozen |
| Viewport centering race | Phase 5: Viewport centering | Stress test: rapidly click center while panning, verify smooth convergence |
| State management explosion | Phase 1: State architecture design | Subscription audit: changing grid color triggers only grid render, not toolbar |

## Existing System Integration Notes

Critical context about current architecture that affects all new features:

### Canvas Architecture (CanvasEngine.ts)
- 4096x4096 off-screen buffer holds rendered map at native resolution
- Screen canvas shows viewport window into buffer via single `drawImage` blit
- Incremental tile patching for edits (lines 232-251: `patchTile`)
- **Implication:** Measurements MUST NOT be drawn on buffer (would persist across drags), draw only on UI overlay

### Drag State Pattern (MapCanvas.tsx lines 49-76)
- Ref-based state for performance (no React re-renders during drag)
- RAF-debounced redraw via `requestUiRedraw` (line 569)
- Batch Zustand commit on mouseup
- Escape cancellation via window keydown listener checking ref values
- **Implication:** Ruler tool must follow this exact pattern, document in phase plan

### Two-Layer Canvas (MapCanvas.tsx lines 38-39)
- `mapLayerRef`: static map tiles + grid + animations
- `uiLayerRef`: transient UI (cursor, line preview, marching ants, paste preview)
- Separate render functions: `drawMapLayer` (line 227), `drawUiLayer` (line 364)
- **Implication:** All measurement overlays go on UI layer, cleared/redrawn each frame

### Grid Rendering (MapCanvas.tsx lines 234-264)
- Uses `createPattern` with dynamically generated pattern canvas
- Pattern cached by `tilePixelSize` (zoom-dependent)
- Pattern offset calculation: `-(vp.x % 1) * tilePixelSize` for smooth scrolling
- **Implication:** Grid customization must extend this caching with composite key

### State Slices (EditorState.ts lines 1-17)
- DocumentsSlice: per-document state (map, viewport, selection, undo)
- GlobalSlice: shared state (tool, animations, tileset)
- WindowSlice: MDI state (open documents, active document)
- Backward-compatible layer mirrors active document to top-level fields
- **Implication:** New features must choose correct slice, document ownership

### Zustand Subscriptions (MapCanvas.tsx lines 80-128)
- Granular selectors to minimize re-renders
- `useShallow` for multi-field subscriptions
- Individual fields for frequently-changing state
- Grouped selectors for related state that changes together
- **Implication:** New state additions must follow this pattern, audit re-render impact

## Sources

### Coordinate Transform Issues
- [Transforming Mouse Coordinates to Canvas Coordinates – roblouie](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/)
- [Creating a Zoom UI - Steve Ruiz](https://www.steveruiz.me/posts/zoom-ui)
- [Transformations - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Transformations)

### Canvas Performance
- [HTML5 Canvas Performance and Optimization Tips, Tricks and Coding Best Practices · GitHub](https://gist.github.com/jaredwilli/5469626)
- [Optimising HTML5 Canvas Rendering: Best Practices and Techniques](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/)
- [High-Performance Canvas Rendering](https://plugfox.dev/high-performance-canvas-rendering/)

### Pattern Generation
- [Canvas advanced drawing techniques performance issues · Issue #27](https://github.com/flyskywhy/react-native-gcanvas/issues/27)
- [CanvasRenderingContext2D: createPattern() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern)

### Overlay Positioning
- [Improve text overlay styling and fix artboard label positioning bug](https://github.com/GraphiteEditor/Graphite/pull/2032)
- [Panning the viewport should not rotate grease pencil view aligned canvas orientation - blender](https://projects.blender.org/blender/blender/issues/85082)

### Layer Management
- [Using Multiple HTML5 Canvases as Layers – Unknown Kadath](https://html5.litten.com/using-multiple-html5-canvases-as-layers/)
- [How to Capture Mouse Events from Sibling/Parent DOM Elements in PIXI.js](https://www.cyberangles.org/blog/capture-mouse-events-from-sibling-or-parent-dom-element-in-pixi-js/)

### RAF and Animation
- [Throttling, Debouncing and RequestAnimationFrame in JavaScript](https://codebyritvik.hashnode.dev/throttling-debouncing-and-requestanimationframe-in-javascript)
- [When browsers throttle requestAnimationFrame - Motion Blog](https://motion.dev/blog/when-browsers-throttle-requestanimationframe)
- [Debouncing events with requestAnimationFrame() for better performance](https://gomakethings.com/debouncing-events-with-requestanimationframe-for-better-performance/)

### State Management
- [overlay-kit - A library for handling overlays more easily in React](https://github.com/toss/overlay-kit)
- [Common pitfalls to avoid when working with state machines](https://statemachine.app/article/Common_pitfalls_to_avoid_when_working_with_state_machines.html)

### Existing Codebase
- E:\NewMapEditor\src\core\canvas\CanvasEngine.ts (lines 1-100, 200-300)
- E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx (lines 1-200, 234-264)
- E:\NewMapEditor\src\core\editor\EditorState.ts (lines 1-150)
- Phase 55 implementation: ref-based drag pattern, Escape cancellation

---
*Pitfalls research for: Canvas measurement tools in tile map editor*
*Researched: 2026-02-13*
