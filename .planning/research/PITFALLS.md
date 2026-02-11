# Domain Pitfalls: Canvas Pan/Zoom/Animation Fixes

**Domain:** Tile map editor viewport controls (pan sensitivity, zoom controls, animation rendering)
**Researched:** 2026-02-11
**Context:** Fixing existing features in a 4-layer canvas system without breaking working functionality

## Critical Pitfalls

Mistakes that cause rewrites, broken rendering, or complete feature failure.

### Pitfall 1: Pan Delta Not Scaled by Zoom Factor
**What goes wrong:** Pan drag moves the map too much (oversensitive) or too little (undersensitive) at different zoom levels.

**Why it happens:** Mouse delta is in screen pixels, but viewport offset is in world coordinates. At 2x zoom, moving the mouse 100 pixels should only move the viewport 50 world units, but naive implementations apply the raw pixel delta directly to viewport offset.

**Consequences:**
- Pan feels "broken" - users can't control where they're dragging
- At 0.25x zoom, panning moves 4x too slow
- At 4x zoom, panning moves 4x too fast
- User frustration and loss of precision when navigating

**Prevention:**
```typescript
// WRONG: Direct pixel delta to viewport offset
viewport.x -= deltaX;
viewport.y -= deltaY;

// RIGHT: Scale delta by inverse of zoom
viewport.x -= deltaX / zoom;
viewport.y -= deltaY / zoom;
```

**Detection:** Test pan at min/max zoom levels. If pan speed feels different, delta isn't scaled correctly.

**Sources:**
- [Canvas Pan and Zoom](https://gist.github.com/balazsbotond/1a876d8ccec87e961ec4a4ae5efb5d33) - MEDIUM confidence
- [Panning and Zooming in HTML Canvas](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) - MEDIUM confidence
- [Zoom and Pan in Three.js](https://medium.com/@ceccarellisimone1/zoom-and-pan-in-three-js-customly-simple-interactions-in-data-graph-visualization-26643a5d0287) - MEDIUM confidence

### Pitfall 2: Transform Not Reset Before Clearing Canvas
**What goes wrong:** Animations only render correctly at certain zoom levels, leaving artifacts or not rendering at all at other zoom levels.

**Why it happens:** When using `ctx.scale()` or `ctx.translate()`, the transform affects ALL subsequent operations including `ctx.clearRect()`. If you don't reset the transform before clearing, you clear a scaled/translated rectangle instead of the entire canvas, leaving old frames visible as artifacts.

**Consequences:**
- Animation appears to work when zoomed out (scale < 1 clears more than needed)
- Animation breaks when zoomed in (scale > 1 clears less than canvas, leaving artifacts)
- Layer contents "smear" or "ghost" during animation
- Impossible to debug because it appears zoom-dependent

**Prevention:**
```typescript
// WRONG: Clear without resetting transform
ctx.scale(zoom, zoom);
ctx.translate(viewport.x, viewport.y);
ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears SCALED rect!

// RIGHT: Reset, clear, then apply transform
ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.scale(zoom, zoom);
ctx.translate(viewport.x, viewport.y);
```

**Detection:**
- Render animations at 0.25x, 1x, and 4x zoom
- If artifacts appear or animation disappears at any level, check clear order
- Warning sign: "it works when zoomed out but not when zoomed in"

**Sources:**
- [Panning and Zooming in HTML Canvas](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) - HIGH confidence
- [CanvasRenderingContext2D.setTransform() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setTransform) - HIGH confidence (official docs)
- [GitHub: canvas-zoom](https://github.com/richrobber2/canvas-zoom) - LOW confidence

### Pitfall 3: Transform Applied to Wrong Canvas Layer
**What goes wrong:** Some layers zoom/pan correctly while others don't, or UI elements zoom when they shouldn't.

**Why it happens:** In a multi-layer canvas system, each canvas has its own rendering context. Applying transform to one context doesn't affect others. If you forget to apply the transform to a layer (or mistakenly apply it to a UI layer), that layer renders in the wrong coordinate space.

**Consequences:**
- Tile layer zooms but overlay selection doesn't (or vice versa)
- UI elements (cursor, selection box) zoom with content instead of staying screen-space
- Marching ants animation moves with pan instead of staying on selection
- Layer alignment breaks at non-1x zoom

**Prevention:**
```typescript
// Identify which layers need world-space transform
const worldLayers = [tilesCanvas, animationsCanvas, overlayCanvas];
const screenLayers = [uiCanvas]; // No transform

worldLayers.forEach(canvas => {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(zoom, zoom);
  ctx.translate(viewport.x, viewport.y);
  // Draw world-space content
});

screenLayers.forEach(canvas => {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity only
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw screen-space UI
});
```

**Detection:**
- Check each layer independently at different zoom levels
- UI should stay same pixel size, content should scale
- Overlay selection rect should align with tile grid at all zooms

**Sources:**
- [Optimize HTML5 canvas rendering with layering](https://developer.ibm.com/tutorials/wa-canvashtml5layering/) - MEDIUM confidence
- [Canvas layer rendering transform issues](https://github.com/godotengine/godot/issues/58314) - LOW confidence (different framework)
- [Viewport and canvas transforms - Godot](https://docs.godotengine.org/en/stable/tutorials/2d/2d_transforms.html) - LOW confidence (different framework, general concepts)

### Pitfall 4: Using CSS Transform Instead of Canvas Transform
**What goes wrong:** Mouse hit detection breaks, performance tanks, or zoom/pan stop working entirely.

**Why it happens:** CSS `transform: scale()` and `transform: translate()` scale/move the entire canvas element in the DOM, but don't update the canvas coordinate system. Mouse events report screen coordinates, so when you calculate `canvas.getBoundingClientRect()` and convert mouse position, you get wrong coordinates.

**Consequences:**
- Click to select tile misses by increasing amounts as you zoom in
- Mouse cursor appears offset from actual click position
- Drag operations start/end at wrong locations
- Zoom-to-cursor calculation puts cursor in wrong place after zoom

**Prevention:**
- **Use canvas transform methods** (`ctx.scale()`, `ctx.translate()`) for zoom/pan
- **OR** use CSS transform but implement custom coordinate conversion accounting for CSS scale
- Don't mix approaches

```typescript
// WRONG: CSS transform without coordinate adjustment
canvas.style.transform = `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`;
// Mouse events now report wrong coordinates!

// RIGHT: Canvas transform
ctx.scale(zoom, zoom);
ctx.translate(pan.x, pan.y);
```

**Detection:**
- Click at known tile coordinates, see if click registers at that tile
- Zoom in and test again - if offset grows, CSS transform is the issue

**Sources:**
- [Transformer position after scaling canvas container](https://github.com/konvajs/konva/issues/609) - MEDIUM confidence
- [Performant Drag and Zoom using Fabric.js](https://medium.com/@Fjonan/performant-drag-and-zoom-using-fabric-js-3f320492f24b) - MEDIUM confidence
- [Canvas not drawing correctly after browser zoom](https://github.com/ericdrowell/KineticJS/issues/753) - LOW confidence (old issue)

## Moderate Pitfalls

Issues that cause bugs but are fixable without major refactoring.

### Pitfall 5: Zoom Input Without Range Validation
**What goes wrong:** User enters invalid zoom values (negative, zero, astronomically large) causing NaN, infinite loops, or canvas rendering failure.

**Why it happens:** Number input fields accept any numeric string. Without validation, `parseFloat("0")` or `parseFloat("-1")` gets passed to rendering code, causing division by zero or inverse scaling.

**Consequences:**
- Entering 0 zoom causes division by zero (pan delta / 0 = NaN)
- Negative zoom flips canvas rendering upside down
- Zoom > 100 causes memory allocation failure
- Canvas becomes blank, no error message

**Prevention:**
```typescript
// Input validation
function setZoom(input: string) {
  const value = parseFloat(input);

  // Validate range
  if (isNaN(value) || value <= 0) {
    return; // Or show error
  }

  // Clamp to reasonable bounds
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

  // Only update if different
  if (clamped !== currentZoom) {
    updateViewport({ zoom: clamped });
  }
}
```

**Prevention UX:**
- Show valid range in placeholder: "0.25 - 4.0"
- Clamp on blur, not on keystroke (allow typing "0." to get to "0.5")
- Display current clamped value in input after blur
- Don't show error for intermediate values during typing

**Detection:**
- Try entering: 0, -1, 999, NaN, empty string
- Check if canvas still renders
- Check console for errors

**Sources:**
- [Form Validation Best Practices](https://ivyforms.com/blog/form-validation-best-practices/) - MEDIUM confidence
- [Number Input modern control](https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/controls/modern-controls/modern-control-number-input) - LOW confidence (different framework)

### Pitfall 6: Zoom Slider and Input Field Out of Sync
**What goes wrong:** User drags slider to 2.0x, but input shows 1.5x, or vice versa. Clicking slider jumps to wrong zoom.

**Why it happens:** State management bug - slider and input are controlled by different state sources, or updates don't propagate correctly. Common with multiple UI controls for the same value.

**Consequences:**
- User confusion ("which value is correct?")
- Can't set precise zoom from input
- Slider jumps unexpectedly
- One control appears broken

**Prevention:**
```typescript
// Single source of truth
const zoom = useEditorStore(state => state.viewport.zoom);

// Both controls use same value and setter
<input
  type="number"
  value={zoom}
  onChange={e => setZoom(e.target.value)}
/>
<input
  type="range"
  value={zoom}
  onChange={e => setZoom(e.target.value)}
  min={MIN_ZOOM}
  max={MAX_ZOOM}
  step={0.25}
/>
```

**Prevention:**
- Use same Zustand state for both controls
- Use same onChange handler (or both call same state setter)
- Don't maintain separate local state for slider vs input
- Test: change slider, input should update; change input, slider should update

**Detection:**
- Change slider, check if input updates
- Change input, check if slider updates
- Check if both show same value on mount

**Sources:**
- [40 Slider UI Examples That Work](https://www.eleken.co/blog-posts/slider-ui) - MEDIUM confidence
- General React state management patterns - HIGH confidence (training data)

### Pitfall 7: Non-Integer Canvas Pixel Coordinates Cause Blurriness
**What goes wrong:** Tile borders appear blurry, text is fuzzy, crisp pixel art becomes anti-aliased.

**Why it happens:** Drawing at fractional pixel coordinates (e.g., `x = 10.5`) causes the browser to anti-alias across pixel boundaries. Zoom factors that don't align with pixel grid (e.g., 0.3x) produce non-integer draw positions.

**Consequences:**
- Crisp 16x16 tiles look blurry at certain zoom levels
- Grid lines appear thick/thin inconsistently
- Pixel art aesthetic is lost
- User reports "rendering quality is bad"

**Prevention:**
```typescript
// For pixel-perfect rendering at all zoom levels
ctx.imageSmoothingEnabled = false; // Disable anti-aliasing

// Round draw coordinates when zoom * tile size is not an integer
const tileSize = 16;
const screenX = Math.round(x * zoom);
const screenY = Math.round(y * zoom);
ctx.drawImage(tile, screenX, screenY);
```

**Note:** This is only critical if pixel-perfect rendering is a goal. For smooth zoom, slight blurriness at fractional zoom levels is expected.

**Detection:**
- Zoom to 0.3x or 1.7x (non-integer multiples of tile size)
- Check if tile borders are crisp or blurry
- Compare to 0.25x, 0.5x, 1x, 2x, 4x (integer multiples)

**Sources:**
- [How to Create Pixel Perfect Graphics Using HTML5 Canvas](https://medium.com/@oscar.lindberg/how-to-create-pixel-perfect-graphics-using-html5-canvas-3750eb5f1dc9) - MEDIUM confidence
- [Crisp pixel art look with image-rendering](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look) - HIGH confidence (official docs)

### Pitfall 8: Animation Loop Runs Faster on High Refresh Rate Displays
**What goes wrong:** Animation speed (marching ants, tile animations) runs twice as fast on 120Hz displays, or varies on different monitors.

**Why it happens:** `requestAnimationFrame` fires at the display's refresh rate (60Hz = 60fps, 120Hz = 120fps). Incrementing a frame counter on each RAF call means the counter increments twice as fast on 120Hz displays.

**Consequences:**
- Animation speed inconsistent across devices
- Marching ants selection appears to "race" on high-refresh displays
- Tile animations cycle too quickly
- Users on different monitors see different speeds

**Prevention:**
```typescript
// WRONG: Increment counter every frame
useEffect(() => {
  const interval = setInterval(() => {
    setAnimationFrame(f => f + 1);
  }, 1000 / 60); // Assumes 60fps
  return () => clearInterval(interval);
}, []);

// RIGHT: Use timestamp delta for frame-rate independent animation
let lastTimestamp = 0;
const ANIMATION_SPEED = 60; // Frames per second target

useEffect(() => {
  let rafId: number;
  const animate = (timestamp: number) => {
    const delta = timestamp - lastTimestamp;
    if (delta >= 1000 / ANIMATION_SPEED) {
      setAnimationFrame(f => f + 1);
      lastTimestamp = timestamp;
    }
    rafId = requestAnimationFrame(animate);
  };
  rafId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(rafId);
}, []);
```

**Alternative:** Current implementation uses `setInterval` which is frame-rate independent, but `requestAnimationFrame` would be more performant if implemented correctly.

**Detection:**
- Test on 60Hz and 120Hz displays (or simulate with browser DevTools)
- Measure animation speed (time 10 complete cycles)
- Should be identical on both displays

**Sources:**
- [Standardize your JavaScript games' framerate for different monitors](https://chriscourses.com/blog/standardize-your-javascript-games-framerate-for-different-monitors) - HIGH confidence
- [Window: requestAnimationFrame() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) - HIGH confidence (official docs)
- [Performant Game Loops in JavaScript](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) - MEDIUM confidence

## Minor Pitfalls

Small issues that are annoying but don't break functionality.

### Pitfall 9: Zoom Slider Step Doesn't Match Common Zoom Levels
**What goes wrong:** Slider can't land on nice round values like 1x, 2x, 3x, or requires pixel-perfect positioning.

**Why it happens:** Slider step doesn't evenly divide into common zoom values. If min=0.25, max=4, and step=0.1, you can get 1.0, 1.1, 1.2... but it's hard to hit exactly 2.0 or 3.0.

**Consequences:**
- User frustration ("why can't I select 2x zoom?")
- Slider feels imprecise
- Input field becomes necessary instead of optional

**Prevention:**
```typescript
// Choose step that divides evenly into desired zoom levels
// For 0.25x to 4x with nice stops at 0.5x, 1x, 1.5x, 2x, 2.5x, 3x, 3.5x, 4x
<input
  type="range"
  min={0.25}
  max={4}
  step={0.25} // Allows 0.25, 0.5, 0.75, 1, 1.25, 1.5, ...
/>
```

**Detection:**
- Try sliding to 1x, 2x, 3x, 4x
- Should snap exactly to those values

**Sources:**
- [Creating a Zoom UI](https://www.steveruiz.me/posts/zoom-ui) - MEDIUM confidence
- General UX best practices - HIGH confidence (training data)

### Pitfall 10: Zoom Input Shows Too Many Decimal Places
**What goes wrong:** Zoom input displays "1.9999999999" or "0.3333333333" instead of clean values.

**Why it happens:** Floating-point precision errors accumulate during zoom calculations. Multiplying zoom by 1.1 repeatedly doesn't produce exact values.

**Consequences:**
- UI looks unprofessional
- Users confused by long decimal strings
- Copy-pasting zoom value includes garbage precision

**Prevention:**
```typescript
// Display rounded value, store precise value
<input
  type="number"
  value={zoom.toFixed(2)} // Show 2 decimal places
  onChange={e => setZoom(parseFloat(e.target.value))}
/>

// Or round zoom values when setting
function setZoom(value: number) {
  const rounded = Math.round(value * 100) / 100; // Round to 2 decimals
  updateViewport({ zoom: rounded });
}
```

**Detection:**
- Zoom in/out multiple times with mouse wheel
- Check input field for excessive decimal places

**Sources:**
- General JavaScript floating-point handling - HIGH confidence (training data)

### Pitfall 11: No Visual Feedback During Zoom/Pan Operations
**What goes wrong:** Users unsure if zoom control is working, especially on large maps with slow render.

**Why it happens:** Zoom state updates immediately but canvas re-render has a delay. No loading indicator or transition feedback.

**Consequences:**
- Users click multiple times thinking it's broken
- Perceived performance is worse than actual
- No indication of zoom limits being reached

**Prevention:**
- Show zoom percentage in status bar (always visible)
- Disable zoom controls at min/max limits
- Debounce continuous zoom (mouse wheel) to avoid render thrashing
- Cursor change during pan drag

```typescript
// Visual feedback
<div className="status-bar">
  Zoom: {(zoom * 100).toFixed(0)}%
</div>

<button
  onClick={zoomIn}
  disabled={zoom >= MAX_ZOOM}
>
  +
</button>
```

**Detection:**
- Zoom to max/min, buttons should disable
- Status bar should update immediately
- User testing: "do you know current zoom level?"

**Sources:**
- [Form Validation Best Practices](https://ivyforms.com/blog/form-validation-best-practices/) - MEDIUM confidence (validation feedback principles)
- General UI/UX patterns - HIGH confidence (training data)

### Pitfall 12: Zoom Input Validates Too Early (Premature Validation)
**What goes wrong:** Error message appears as soon as user focuses input, or while typing intermediate values like "0." to get to "0.5".

**Why it happens:** Real-time validation triggers on every keystroke, before user finishes typing.

**Consequences:**
- User sees error before they've finished entering value
- Can't type "0.5" because "0" is invalid
- Frustrating UX, form feels hostile

**Prevention:**
```typescript
// Validate on blur, not on change
<input
  type="number"
  value={localValue}
  onChange={e => setLocalValue(e.target.value)} // Allow any input
  onBlur={e => {
    const parsed = parseFloat(e.target.value);
    if (isNaN(parsed) || parsed < MIN_ZOOM || parsed > MAX_ZOOM) {
      setLocalValue(zoom.toString()); // Reset to last valid
      setError(`Zoom must be between ${MIN_ZOOM} and ${MAX_ZOOM}`);
    } else {
      setZoom(parsed);
      setError(null);
    }
  }}
/>
```

**Detection:**
- Focus input, see if error appears immediately (should not)
- Type "0" and pause - error should not appear until blur/submit
- Type "0.5" - should accept without error

**Sources:**
- [A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) - HIGH confidence
- [Avoid early real-time validation for forms](https://blog.designary.com/p/avoid-early-real-time-validation-for-forms-as-it-harms-usability) - MEDIUM confidence

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Fix pan sensitivity | #1: Pan delta not scaled by zoom | Always divide mouse delta by zoom factor; test at min/max zoom |
| Fix animation rendering | #2: Transform not reset before clearing | Call `setTransform(1,0,0,1,0,0)` before `clearRect()` |
| Add zoom input field | #5: Zoom input without validation | Clamp to min/max, handle NaN, validate on blur |
| Add zoom slider | #6: Slider and input out of sync | Single Zustand state source for both controls |
| Multi-layer rendering | #3: Transform applied to wrong layer | Document which layers get world transform vs identity |
| Animation loop changes | #8: Animation speed varies by refresh rate | Use timestamp delta, not frame count |
| Mouse coordinate conversion | #4: Using CSS transform | Stick with canvas transform methods |
| Pixel-perfect rendering | #7: Non-integer coordinates | Set `imageSmoothingEnabled = false`, round coordinates |

## Integration Pitfalls

Risks when modifying existing working features.

### Pitfall 13: Breaking Existing Mouse Coordinate Conversion
**What goes wrong:** After adding zoom controls, existing tools (brush, wall, select) no longer click on the correct tile.

**Why it happens:** Mouse-to-world coordinate conversion doesn't account for new zoom/pan state, or transform order changes.

**Consequences:**
- Every tool breaks
- Regression in core functionality
- Requires fixing all mouse handlers

**Prevention:**
- Extract coordinate conversion to shared utility
- Test all tools after viewport changes
- Keep transform order consistent: scale THEN translate

```typescript
// Centralized conversion
function screenToWorld(screenX: number, screenY: number, viewport: Viewport) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;

  // Inverse of: ctx.scale(zoom, zoom); ctx.translate(viewport.x, viewport.y)
  const worldX = canvasX / viewport.zoom - viewport.x;
  const worldY = canvasY / viewport.zoom - viewport.y;

  return { x: worldX, y: worldY };
}
```

**Detection:**
- After implementing zoom controls, test every tool
- Click at known world coordinates, verify tool activates at that position

**Sources:**
- [Transforming Mouse Coordinates to Canvas Coordinates](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/) - MEDIUM confidence
- [Simple Canvas Pan And Zoom](https://gist.github.com/balazsbotond/1a876d8ccec87e961ec4a4ae5efb5d33) - MEDIUM confidence

### Pitfall 14: Render Loop Performance Degrades with Zoom Controls
**What goes wrong:** After adding zoom slider, canvas render becomes slow, choppy, or stutters during zoom.

**Why it happens:** Zoom changes trigger full canvas redraws without debouncing. Slider fires hundreds of onChange events during drag, each causing expensive render.

**Consequences:**
- UI feels laggy during zoom
- Animation frame rate drops
- High CPU usage

**Prevention:**
```typescript
// Debounce zoom updates during slider drag
const [pendingZoom, setPendingZoom] = useState<number | null>(null);

useEffect(() => {
  if (pendingZoom !== null) {
    const timeout = setTimeout(() => {
      updateViewport({ zoom: pendingZoom });
      setPendingZoom(null);
    }, 16); // ~60fps
    return () => clearTimeout(timeout);
  }
}, [pendingZoom]);

<input
  type="range"
  onChange={e => setPendingZoom(parseFloat(e.target.value))}
/>
```

**Alternative:** Use RAF-based throttling instead of setTimeout.

**Detection:**
- Drag zoom slider rapidly back and forth
- Check FPS in browser DevTools performance tab
- Should stay above 30fps

**Sources:**
- [Optimizing canvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - HIGH confidence (official docs)
- [Performance recommendation: use canvas renderer on low zoom](https://github.com/xyflow/xyflow/issues/5442) - LOW confidence (different library)

### Pitfall 15: Forgetting to Update Minimap After Viewport Changes
**What goes wrong:** Minimap viewport indicator doesn't move when zooming/panning with new controls.

**Why it happens:** Minimap component doesn't subscribe to viewport changes, or update isn't triggered.

**Consequences:**
- Minimap shows wrong viewport position
- User confusion about where they are in map
- Minimap appears broken

**Prevention:**
```typescript
// Minimap subscribes to same viewport state
const viewport = useEditorStore(state => state.viewport);

useEffect(() => {
  // Redraw minimap viewport indicator when viewport changes
  drawViewportIndicator(viewport);
}, [viewport.x, viewport.y, viewport.zoom]);
```

**Detection:**
- Use zoom controls, check if minimap viewport box updates
- Pan map, check if minimap indicator moves

**Sources:**
- Zustand reactive state patterns - HIGH confidence (training data)

## Confidence Assessment

| Finding | Confidence | Rationale |
|---------|-----------|-----------|
| Pan delta scaling (#1) | HIGH | Multiple authoritative sources, common pattern |
| Transform reset before clear (#2) | HIGH | MDN official docs + practical examples |
| Transform per layer (#3) | MEDIUM | Verified in other frameworks, applies to canvas generally |
| CSS vs canvas transform (#4) | HIGH | Multiple sources confirm hit detection issues |
| Zoom validation (#5) | HIGH | General form validation best practices |
| State sync (#6) | HIGH | React/Zustand state management patterns |
| Pixel coordinate blurriness (#7) | HIGH | MDN docs + pixel art rendering articles |
| Refresh rate animation (#8) | HIGH | MDN docs + game dev best practices |
| Slider step (#9) | MEDIUM | UX best practice, not highly documented |
| Decimal precision (#10) | HIGH | JavaScript floating-point behavior |
| Visual feedback (#11) | MEDIUM | General UX principles |
| Premature validation (#12) | HIGH | Multiple UX validation articles |
| Mouse coordinate regression (#13) | HIGH | Coordinate transform math is well-established |
| Render performance (#14) | HIGH | Canvas optimization patterns |
| Minimap sync (#15) | HIGH | Reactive state management patterns |

## Research Limitations

**Areas not deeply researched:**
- Device pixel ratio handling for high-DPI displays (assumed 1:1 for now)
- Touch/gesture zoom (pinch-to-zoom) on tablets
- Accessibility concerns (keyboard zoom controls, screen reader support)
- Memory usage with large canvases at high zoom
- Electron-specific canvas performance quirks on Windows

**Assumptions:**
- 4-layer canvas architecture remains unchanged
- Zustand state management for viewport
- Zoom range 0.25x to 4x (as specified in project context)
- Single tileset image (not dynamically loaded)
- 16x16 tile size (constant)

**Low-confidence areas:**
- Specific performance on Windows Electron Chromium build
- Interaction with existing wall auto-connect system at different zoom levels
- GPU vs CPU canvas rendering at extreme zoom levels

## Sources

### High Confidence (Official Docs)
- [CanvasRenderingContext2D.setTransform() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setTransform)
- [Window: requestAnimationFrame() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Optimizing canvas - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Crisp pixel art look - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)

### Medium Confidence (Technical Articles)
- [Panning and Zooming in HTML Canvas](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming)
- [Performant Drag and Zoom using Fabric.js](https://medium.com/@Fjonan/performant-drag-and-zoom-using-fabric-js-3f320492f24b)
- [How to Create Pixel Perfect Graphics](https://medium.com/@oscar.lindberg/how-to-create-pixel-perfect-graphics-using-html5-canvas-3750eb5f1dc9)
- [Standardize framerate for different monitors](https://chriscourses.com/blog/standardize-your-javascript-games-framerate-for-different-monitors)
- [A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [Form Validation Best Practices](https://ivyforms.com/blog/form-validation-best-practices/)
- [Optimize HTML5 canvas rendering with layering](https://developer.ibm.com/tutorials/wa-canvashtml5layering/)
- [Transforming Mouse Coordinates to Canvas Coordinates](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/)

### Low Confidence (Community Examples)
- [Simple Canvas Pan And Zoom Gist](https://gist.github.com/balazsbotond/1a876d8ccec87e961ec4a4ae5efb5d33)
- [GitHub: canvas-zoom](https://github.com/richrobber2/canvas-zoom)
- [Creating a Zoom UI](https://www.steveruiz.me/posts/zoom-ui)
- [40 Slider UI Examples](https://www.eleken.co/blog-posts/slider-ui)
