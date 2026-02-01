# Domain Pitfalls: Editor UI and Bug Fixes

**Domain:** Tile map editor - UI restructuring, pattern fill, animation systems
**Researched:** 2026-02-01
**Confidence:** MEDIUM (based on codebase analysis + web research)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Single-Tile Fill Instead of Pattern Fill

**What goes wrong:** The fill tool uses only the first tile of a multi-tile selection instead of tiling/repeating the entire stamp pattern across the filled area.

**Why it happens:** The flood fill algorithm accepts a single tile ID parameter and doesn't account for `tileSelection.width` and `tileSelection.height`. The current implementation in `EditorState.ts` lines 279-309 shows:
```typescript
fillArea: (x, y, tile) => {  // Only accepts single tile
  // ...
  map.tiles[index] = tile;   // Places same tile everywhere
}
```

**Consequences:**
- Multi-tile selections are useless with the fill tool
- Users must manually place repeating patterns tile-by-tile
- Inconsistent behavior between pencil tool (supports multi-tile) and fill tool

**Prevention:**
- Modify `fillArea` to accept `TileSelection` instead of single tile ID
- Calculate tile ID based on position within the pattern: `(x % width, y % height)`
- Use modulo arithmetic to tile the pattern across filled coordinates

**Detection:**
- Select 2x2 tile region in palette
- Use fill tool on empty area
- If only one tile appears, bug is present

**Phase mapping:** Fix during bug fix phase, before UI restructuring

**Sources:**
- [Tiled Map Editor documentation](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/) - "The currently active tile stamp will be repeated in the filled area"
- [Wikipedia - Flood Fill](https://en.wikipedia.org/wiki/Flood_fill) - Pattern fill requires tracking visited cells separately

---

### Pitfall 2: Placeholder Animation Data Masking Real Bug

**What goes wrong:** Animation panel generates fake/placeholder frame data that doesn't correspond to actual tileset animations, making it impossible to verify if the animation rendering code works correctly.

**Why it happens:** The `AnimationPanel.tsx` lines 46-56 generate placeholder animations:
```typescript
defaultAnims.push({
  id: i,
  frameCount: 4,
  frames: [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]  // Arbitrary math
});
```
These frame indices (`i * 4, i * 4 + 1...`) don't correspond to actual animated tile sequences in the tileset.

**Consequences:**
- Users see wrong tiles displayed for animations
- Animation preview shows garbage data
- Real animation data format requirements unclear
- Bug appears to be in rendering when it's actually in data loading

**Prevention:**
- Define animation data format spec first (from SEDIT analysis)
- Load real animation definitions from file or extract from Gfx.dll
- Remove placeholder generation entirely
- Add clear "No animations loaded" state instead of fake data

**Detection:**
- Open animation panel without loading file
- If animations show and display wrong frames, placeholder bug is active

**Phase mapping:** Fix during bug fix phase, requires understanding animation data format from SEDIT spec

---

### Pitfall 3: ResizeObserver Infinite Loop / Layout Thrashing

**What goes wrong:** Resizing panels triggers continuous re-renders or "ResizeObserver loop completed with undelivered notifications" errors, causing performance degradation or freezing.

**Why it happens:**
- ResizeObserver callback changes element size, triggering another observation
- React state updates inside ResizeObserver cause re-render cascade
- Canvas size change triggers draw(), which may trigger layout recalculation

**Consequences:**
- UI becomes unresponsive during resize
- Console fills with warnings
- Battery drain on laptops
- Potential browser tab crash

**Prevention:**
- Debounce ResizeObserver callbacks (50-100ms recommended)
- Use `requestAnimationFrame` to batch size updates
- Avoid changing observed element's size inside callback
- Set canvas size imperatively, not through React state if possible

**Detection:**
- Open DevTools console
- Resize panel divider rapidly
- Watch for "ResizeObserver loop" warnings or frame drops

**Phase mapping:** Address during UI restructuring phase

**Sources:**
- [web.dev ResizeObserver](https://web.dev/articles/resize-observer) - Spec details and loop prevention
- [PatternFly React Issue #7810](https://github.com/patternfly/patternfly-react/issues/7810) - Resize observer causing unnecessary re-renders

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 4: Conditionally Rendered Panels Without IDs

**What goes wrong:** When using react-resizable-panels, conditionally rendered panels lose their size state or cause "Previous layout not found for panel index" errors.

**Why it happens:** The Panel API doesn't require `id` and `order` props for static layouts, but they're essential when panels can appear/disappear (like the AnimationPanel and MapSettingsPanel toggles).

**Prevention:**
- Always provide `id` prop on every Panel component
- Always provide `order` prop to maintain consistent ordering
- Use stable IDs, not array indices

**Detection:**
- Toggle a panel off and on
- Resize it
- Toggle off and on again
- If size resets or error appears, IDs are missing

**Phase mapping:** UI restructuring phase

**Sources:**
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Conditional rendering documentation
- [Issue #372](https://github.com/bvaughn/react-resizable-panels/issues/372) - "Previous layout not found for panel index"

---

### Pitfall 5: Animation Timer Not Using Delta Time

**What goes wrong:** Animation speed varies based on device refresh rate. On 120Hz displays, animations run 2x faster than on 60Hz displays.

**Why it happens:** Using fixed `setInterval` (current code uses 150ms) or not accounting for actual elapsed time between frames. The current code:
```typescript
useEffect(() => {
  const timer = setInterval(() => {
    advanceAnimationFrame();  // Just increments counter
  }, FRAME_DURATION);
  // ...
}, []);
```

**Consequences:**
- Inconsistent animation speeds across devices
- Animations may appear too fast/slow
- Timer drift over long sessions

**Prevention:**
- Use `requestAnimationFrame` instead of `setInterval`
- Track elapsed time and only advance frame when duration threshold passed
- Store timestamp of last frame advancement
- Use delta time: `if (elapsed >= frameDuration) advanceFrame()`

**Detection:**
- Run on 120Hz monitor vs 60Hz monitor
- Compare animation speeds

**Phase mapping:** Animation bug fix phase

**Sources:**
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - "Use the first argument to calculate animation progress"
- [Kirupa - Ensuring Consistent Animation Speeds](https://www.kirupa.com/animations/ensuring_consistent_animation_speeds.htm)

---

### Pitfall 6: CSS Resize Breaking Flexbox Layout

**What goes wrong:** Using CSS `resize` property on flex children causes them to lose flex properties or behave unexpectedly.

**Why it happens:** The `resize` CSS property requires `overflow: auto/hidden/scroll` which can conflict with flex behavior. Browser implementations also differ - Firefox allows shrinking below original size, Chrome/Safari don't (historically).

**Prevention:**
- Don't use CSS `resize` property for panel dividers
- Implement drag-to-resize with JavaScript
- Only resize one panel, let flexbox handle the other
- Use established library (react-resizable-panels) for complex layouts

**Detection:**
- Try to resize a panel
- Check if adjacent panels reflow correctly
- Test in multiple browsers

**Phase mapping:** UI restructuring phase

**Sources:**
- [CSS-Tricks resize](https://css-tricks.com/almanac/properties/r/resize/) - Browser differences
- [Theodo - React Resizable Split Panels](https://blog.theodo.com/2020/11/react-resizeable-split-panels/) - "resize one panel, let flex handle the other"

---

### Pitfall 7: Canvas Flicker on Resize

**What goes wrong:** Canvas shows background color flash or partial rendering during resize operations.

**Why it happens:**
- Canvas is cleared before new size is set
- Double rendering from both window resize and ResizeObserver events
- React re-render clears and redraws canvas

**Prevention:**
- Set canvas size imperatively, avoid React state for dimensions
- Use `useLayoutEffect` instead of `useEffect` for size-dependent operations
- Debounce resize handler to batch updates
- Consider double-buffering for complex canvas operations

**Detection:**
- Resize window or panel rapidly
- Watch for flash of background color

**Phase mapping:** UI restructuring phase

**Sources:**
- [Developerway - No Flickering UI](https://www.developerway.com/posts/no-more-flickering-ui) - useLayoutEffect vs useEffect
- [React Three Fiber Discussion #1906](https://github.com/pmndrs/react-three-fiber/discussions/1906) - Double renders from resize

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Flood Fill Stack Overflow on Large Areas

**What goes wrong:** Filling very large empty areas (e.g., entire 256x256 map) causes stack overflow or "Maximum call stack size exceeded" error.

**Why it happens:** Recursive flood fill implementation. Each pixel adds to call stack.

**Prevention:**
- Use iterative implementation with explicit stack/queue (current code already does this correctly)
- Consider scanline optimization for large fills
- Add fill limit as safety valve

**Detection:**
- Create new empty map
- Try to fill entire map with one tile

**Phase mapping:** Already mitigated in current codebase (uses explicit stack)

**Sources:**
- [AlgoCademy - Flood Fill Guide](https://algocademy.com/blog/implementing-flood-fill-algorithms-a-comprehensive-guide/)
- [USACO Guide - Flood Fill](https://usaco.guide/silver/flood-fill)

---

### Pitfall 9: Pattern Fill Coordinate Offset Error

**What goes wrong:** Pattern fill tiles correctly but is offset from click position, or pattern doesn't align with existing tiles.

**Why it happens:** Using absolute map coordinates for pattern calculation instead of relative to fill origin. The pattern should align with the click position, not (0,0) of the map.

**Prevention:**
- Calculate pattern offset relative to fill start position
- `tileIndex = ((x - startX) % patternWidth, (y - startY) % patternHeight)`
- Or align to grid: `tileIndex = (x % patternWidth, y % patternHeight)` for grid-aligned patterns

**Detection:**
- Fill area with 2x2 checkered pattern
- Check if pattern starts at click point or is offset

**Phase mapping:** Bug fix phase (pattern fill implementation)

---

### Pitfall 10: Text Selection During Divider Drag

**What goes wrong:** Dragging the panel divider selects text in adjacent panels or triggers other unwanted drag behaviors.

**Why it happens:** Missing `e.preventDefault()` on mouse events during drag operation.

**Prevention:**
- Call `e.preventDefault()` in mousedown and mousemove handlers when dragging
- Set `user-select: none` on container during drag
- Use `pointer-events: none` on iframe/canvas during drag if present

**Detection:**
- Drag divider while there's text visible in a panel
- Check if text gets highlighted

**Phase mapping:** UI restructuring phase

**Sources:**
- [Theodo - React Resizable Panels](https://blog.theodo.com/2020/11/react-resizeable-split-panels/) - "Adding e.preventDefault if dragging is true"

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Toolbar restructure | State management complexity | Keep toolbar stateless, lift state to App |
| Tabbed panels | Tab state persistence | Store active tab in Zustand, not local state |
| Resizable divider | Layout thrashing | Debounce resize, use requestAnimationFrame |
| Pattern fill fix | Coordinate calculation | Test with various pattern sizes (1x2, 2x1, 2x2, 3x3) |
| Animation fix | Data format mismatch | Verify against SEDIT spec before implementing |
| Animation timing | Refresh rate variance | Use delta time, not fixed intervals |

---

## Implementation Checklist

### Before UI Restructuring
- [ ] Review react-resizable-panels docs for conditional panel handling
- [ ] Plan panel IDs and order values upfront
- [ ] Design debouncing strategy for resize handlers

### Before Pattern Fill Fix
- [ ] Understand current `fillArea` signature and callers
- [ ] Decide: align pattern to click point or to map grid?
- [ ] Write test cases for 1x1, 1xN, Nx1, NxN patterns

### Before Animation Fix
- [ ] Read SEDIT_Technical_Analysis.md for animation data format
- [ ] Locate actual animation data source (Gfx.dll or separate file)
- [ ] Remove placeholder generation code entirely

---

## Sources

### Authoritative (HIGH confidence)
- [Tiled Map Editor - Editing Tile Layers](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/)
- [MDN - requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [web.dev - ResizeObserver](https://web.dev/articles/resize-observer)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels)

### Community Verified (MEDIUM confidence)
- [Wikipedia - Flood Fill](https://en.wikipedia.org/wiki/Flood_fill)
- [Kirupa - Animation Speeds](https://www.kirupa.com/animations/ensuring_consistent_animation_speeds.htm)
- [Theodo - React Resizable Split Panels](https://blog.theodo.com/2020/11/react-resizeable-split-panels/)
- [Developerway - No Flickering UI](https://www.developerway.com/posts/no-more-flickering-ui)

### Codebase Analysis (HIGH confidence for this project)
- `E:\NewMapEditor\src\core\editor\EditorState.ts` - fillArea implementation
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` - placeholder generation
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` - resize handling
