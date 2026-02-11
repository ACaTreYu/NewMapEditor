# Feature Landscape: Viewport Controls & Animation Rendering

**Domain:** 2D Tile Map Editor Canvas Controls
**Researched:** 2026-02-11

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **1:1 Pan Drag** | Industry standard - viewport moves exactly with mouse movement | Low | At scale 1.0, each mouse pixel = one canvas pixel. Transform mouse delta by 1/scale for zoomed views. |
| **Mouse Wheel Zoom** | Universal across all canvas/map tools | Low | Should zoom toward cursor position, not canvas center. Standard: Ctrl+MouseWheel or MouseWheel alone (preference). |
| **Zoom Percentage Display** | Users need to know current zoom level | Low | Display as "100%" or "1:1" in status bar or zoom control. Update in real-time during zoom. |
| **100% Zoom Reset** | Quick return to natural size (16px tiles at 16px) | Low | Keyboard shortcut Ctrl+0. Also available as button or preset option. |
| **Zoom Range Enforcement** | Prevents unusable zoom levels (too small/large) | Low | Typical range: 10-400% or 0.25x-4x. Clamp at boundaries, disable zoom controls at limits. |
| **Animation Frame Cycling** | Tiles must animate through frames over time | Medium | Use requestAnimationFrame with delta time. Should be zoom-independent (same speed at all zoom levels). |
| **Zoom-Independent Rendering** | Animations/grid/overlays render correctly at all zoom levels | Medium | Apply canvas transform, but calculate animation timing independently of zoom. Avoid visual artifacts during zoom. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Zoom Slider + Input Combo** | Professional-grade control - both quick adjustment (slider) and precision (input) | Medium | Slider for fast changes, input for exact values. Bidirectional sync. Common in Adobe products, Excel, etc. |
| **Preset Zoom Levels** | Quick jump to standard zoom levels | Low | Common presets: 25%, 50%, 100%, 200%, 400%. Dropdown or buttons. Photoshop also uses 33.3%, 66.7%. |
| **Fit to Window** | Auto-calculate zoom to fit entire 256x256 map in viewport | Medium | Calculate based on container size vs. map dimensions. Useful for overview. |
| **Zoom to Selection** | Focus on selected area by calculating optimal zoom/pan | Medium | Calculate bounding box of selection, set zoom to fit it in viewport with padding. |
| **Pan Speed Indicator** | Visual feedback during drag showing how fast viewport moves | Low | Could show velocity or drag delta in status bar. Useful for debugging sensitivity issues. |
| **Smooth Zoom Transitions** | Interpolate between zoom levels for polished feel | Medium | Animate zoom changes over 100-200ms. Optional - can be preference. Some users prefer instant zoom. |
| **Zoom History** | Remember previous zoom/pan positions | Medium | Undo/redo for viewport changes. Alt+Left/Right to go back/forward. Useful when comparing areas. |
| **Animation Speed Control** | Let users slow down/speed up tile animations for editing | Low | Multiplier (0.5x, 1x, 2x) applied to animation frame timing. Helps when placing animated tiles. |
| **Performance Monitoring** | Show FPS/frame time in dev mode | Low | Overlay or status bar. Helps validate 60fps target, debug slow rendering. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Pan Acceleration/Momentum** | Map editor needs precise control, not smooth scrolling like maps | Use 1:1 pixel mapping - viewport stops exactly when mouse stops |
| **Continuous Zoom on Hold** | Holding +/- for continuous zoom is imprecise, overshoots target | Use discrete zoom steps (10-20% per press). Repeating key events OK. |
| **Automatic Frame Rate Limiting** | requestAnimationFrame already limits to display refresh rate | Trust browser's RAF scheduling. Don't add setTimeout throttling. |
| **Zoom-Dependent Animation Speed** | Animations shouldn't speed up/slow down when zooming | Use delta time independent of zoom level. Only visual scale changes. |
| **Pan with Mouse Edges** | Moving mouse to screen edge to pan is awkward for tile editors | Stick with right-click drag and scrollbars. Edge panning is for RTS games. |
| **Pinch Zoom on Desktop** | Trackpad pinch gestures fire WheelEvent with ctrlKey - already handled | Don't add separate pinch detection. Browser handles it. |
| **Separate Zoom for Each Layer** | All layers must zoom together for alignment | Apply same transform to all 4 canvas layers (static, anim, overlay, grid) |
| **Zoom Snapping to Presets** | Users need smooth zoom, not jumps to nearest preset | Presets are shortcuts, not constraints. Allow any zoom value in range. |

## Feature Dependencies

```
Zoom Slider → Zoom Percentage Display (slider needs to show current value)
Zoom Slider → Zoom Range Enforcement (slider min/max)
Zoom Input → Zoom Percentage Display (input shows/sets current value)
Fit to Window → Zoom Range Enforcement (calculated zoom must respect min/max)
Zoom to Selection → Fit to Window (similar calculation logic)
1:1 Pan Drag → Zoom-Independent Rendering (transform coordinates by scale)
Animation Frame Cycling → Zoom-Independent Rendering (timing unaffected by zoom)
Performance Monitoring → Animation Frame Cycling (measure RAF timing)
```

## Pan Sensitivity - Expected Behavior

### The "Correct" 1:1 Mapping

**Definition:** Viewport displacement = Mouse displacement * (1 / zoom)

**Implementation:**
```typescript
// On mouse move during right-click drag:
const deltaX = currentMouseX - previousMouseX;
const deltaY = currentMouseY - previousMouseY;

// Update viewport (canvas coordinates)
viewport.x -= deltaX / viewport.zoom;
viewport.y -= deltaY / viewport.zoom;
```

**Why This Formula:**
- At 1.0x zoom: deltaX/1.0 = deltaX (mouse moves 10px → viewport moves 10px)
- At 2.0x zoom: deltaX/2.0 = deltaX/2 (mouse moves 10px → viewport moves 5 canvas px, but appears as 10 screen pixels)
- At 0.5x zoom: deltaX/0.5 = deltaX*2 (mouse moves 10px → viewport moves 20 canvas px, but appears as 10 screen pixels)

**User Experience:**
- The tile under the cursor when drag starts should stay under the cursor during drag
- No "slipping" or "skating" - viewport moves exactly with mouse
- Works consistently at all zoom levels
- Feels like "grabbing" the canvas and moving it

**Common Mistake:**
Using `deltaX * viewport.zoom` inverts the relationship - more zoom = faster pan (wrong).

**Sources:**
- [Panning and Zooming in HTML Canvas](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming) (MEDIUM confidence)
- [Transforming Mouse Coordinates to Canvas Coordinates](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/) (MEDIUM confidence)
- [Simple Canvas Pan And Zoom](https://gist.github.com/balazsbotond/1a876d8ccec87e961ec4a4ae5efb5d33) (MEDIUM confidence)

## Zoom Controls - Expected UX

### Standard Keyboard Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| Ctrl+Plus (+) | Zoom in one step | ~10-20% increment |
| Ctrl+Minus (-) | Zoom out one step | ~10-20% decrement |
| Ctrl+0 | Reset to 100% | Universal standard |
| Ctrl+MouseWheel | Zoom toward cursor | Alternative to Ctrl+/- |
| MouseWheel alone | Zoom toward cursor | Optional preference (conflicts with scrolling) |

**Sources:**
- [Using hot keys and keyboard shortcuts](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067050) (HIGH confidence)
- [CTRL + 0 Windows Keyboard Shortcut Tip](https://www.easyit.com/you-wont-believe-what-happens-when-you-press-ctrl-0/) (MEDIUM confidence)
- [Tiled Keyboard Shortcuts](https://doc.mapeditor.org/en/stable/manual/keyboard-shortcuts/) (HIGH confidence)

### Zoom Slider Design

**Layout:**
- Horizontal slider with - button on left, + button on right
- Percentage display integrated (above/below slider or as editable input)
- Common placement: status bar, floating toolbar, or top control bar
- Width: 100-200px for usable precision

**Behavior:**
- Logarithmic scale (equal visual steps for 25%, 50%, 100%, 200%, 400%)
- Tick marks at preset values (optional, improves precision)
- Live preview during drag (update canvas as slider moves)
- Click on +/- buttons = discrete step (same as keyboard shortcuts)
- Drag slider = continuous zoom

**Preset Dropdown/Buttons:**
Standard values across professional tools:
- 25%, 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%
- Or simplified: 25%, 50%, 100%, 200%, 400%
- "Fit" option to auto-calculate zoom

**Sources:**
- [How to Zoom in Premiere Pro](https://www.aeanet.org/how-to-zoom-in-premiere-pro/) (MEDIUM confidence)
- [How to Change the Zoom Level in Excel](https://www.thebricks.com/resources/how-to-change-zoom-level-in-excel) (HIGH confidence)
- [Zoom control – Map UI Patterns](https://mapuipatterns.com/zoom-control/) (MEDIUM confidence)

### Zoom Input Field

**Format:**
- Display as percentage: "100%" or decimal: "1.0x"
- Editable text input with validation
- Accept formats: "100", "100%", "1.0", "1.0x"
- Clamp to min/max range on blur/enter

**Behavior:**
- Select all on focus (easy to replace value)
- Enter key applies and commits zoom
- Escape key cancels edit, reverts to previous
- Invalid input shows error state, doesn't apply
- Out-of-range input clamps to nearest valid value

**Sources:**
- [Creating a Zoom UI](https://www.steveruiz.me/posts/zoom-ui) (MEDIUM confidence)
- [40 Slider UI Examples That Work](https://www.eleken.co/blog-posts/slider-ui) (MEDIUM confidence)

## Animation Rendering - Expected Behavior

### Frame Timing (Zoom-Independent)

**Standard Approach:**
```typescript
// In requestAnimationFrame callback:
const deltaTime = timestamp - lastTimestamp;
const animationSpeed = 1.0; // Multiplier (0.5x = half speed, 2x = double speed)

// Increment frame counter based on elapsed time, not frame count
frameCounter += (deltaTime / 1000) * animationSpeed;

// Calculate which frame to show (e.g., 4 frames cycling at 2 fps = 0.5s per frame)
const framesPerSecond = 2; // Typical tile animation speed
const totalFrames = 4;
const currentFrame = Math.floor(frameCounter * framesPerSecond) % totalFrames;
```

**Why This Matters:**
- Animation speed independent of display refresh rate (60Hz, 120Hz, 144Hz)
- Animation speed independent of zoom level (same timing at 0.25x and 4x)
- Consistent across different computers and monitors
- Can be adjusted with speed multiplier without changing code

**Sources:**
- [Ensuring Consistent Animation Speeds](https://www.kirupa.com/animations/ensuring_consistent_animation_speeds.htm) (MEDIUM confidence)
- [Time-based Animation with HTML 5 Canvas and JavaScript](https://www.viget.com/articles/time-based-animation) (HIGH confidence)
- [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) (HIGH confidence)

### Rendering Pipeline

**Four-Layer Architecture (Current):**
1. **Static Layer** - Non-animated tiles, redrawn on map/viewport changes
2. **Anim Layer** - Animated tiles only, redrawn every RAF tick
3. **Overlay Layer** - Tool cursors, selection, preview, redrawn on tool/cursor changes
4. **Grid Layer** - Optional grid, redrawn on grid toggle or viewport changes

**Transform Application:**
```typescript
// Apply to ALL layers for consistent alignment:
ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
ctx.translate(canvasWidth/2, canvasHeight/2); // Center
ctx.scale(zoom, zoom); // Apply zoom
ctx.translate(-viewport.x, -viewport.y); // Apply pan

// Now draw in world coordinates (tile coordinates * TILE_SIZE)
```

**Performance Optimization:**
- Static layer: only redraw when map data or viewport changes
- Anim layer: redraw every frame, but ONLY animated tiles (skip static)
- Overlay layer: redraw when tool state or cursor position changes
- Grid layer: only redraw when grid visibility or viewport changes

**Conditional Animation Loop:**
```typescript
// Only run RAF loop when animations exist or tool is active
const hasAnimatedTiles = map.tiles.some(tile => tile & 0x8000); // Bit 15 = animated
const needsOverlayUpdates = currentTool !== ToolType.Select || selectionActive;

if (hasAnimatedTiles || needsOverlayUpdates) {
  requestAnimationFrame(renderLoop);
}
```

**Sources:**
- [High Performance Map Interactions using HTML5 Canvas](https://chairnerd.seatgeek.com/high-performance-map-interactions-using-html5-canvas/) (HIGH confidence)
- [From SVG to Canvas – part 1: making Felt faster](https://felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster) (MEDIUM confidence)

### Zoom-Specific Considerations

**Tile Size Rendering:**
- Tiles are 16x16px at 100% zoom
- At 200% zoom: 32x32px screen space
- At 50% zoom: 8x8px screen space
- At 25% zoom: 4x4px screen space (minimum useful)

**Animation Frame Selection:**
- Frame offset (0-127) stored per tile instance
- Frame selection based on: `(globalFrameCounter + tileFrameOffset) % totalFrames`
- Allows animated tiles to start at different frames (staggered effect)

**Visual Artifacts to Avoid:**
- Sub-pixel rendering causing tile "shimmering" during zoom
- Misaligned grid lines at non-integer zooms (use Math.floor on positions)
- Blurry tiles (use `ctx.imageSmoothingEnabled = false` for pixel art)
- Marching ants selection moving at zoom-dependent speeds (use fixed pixel dash offset)

**Sources:**
- [Tiles and tilemaps overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) (HIGH confidence)
- [Infinite Canvas: Building a Seamless, Pan-Anywhere Image Space](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/) (MEDIUM confidence)

## MVP Recommendation

### Must-Have (Phase 1)
1. **Fix Pan Sensitivity** - Implement correct 1:1 formula (`delta / zoom`)
   - Complexity: Low
   - Impact: Critical UX issue
   - Dependencies: None

2. **Fix Animation Rendering** - Delta time-based frame counter
   - Complexity: Low
   - Impact: Animations currently broken at normal zoom
   - Dependencies: None

3. **Zoom Percentage Display** - Show current zoom in status bar
   - Complexity: Low
   - Impact: Users need to know current zoom
   - Dependencies: Status bar component exists

### Should-Have (Phase 2)
4. **Zoom Slider** - Horizontal slider with +/- buttons
   - Complexity: Medium
   - Impact: Standard UI control for zoom
   - Dependencies: Zoom percentage display

5. **Zoom Input Field** - Editable text input with validation
   - Complexity: Medium
   - Impact: Precision control, pairs with slider
   - Dependencies: Zoom percentage display, validation logic

6. **Preset Zoom Levels** - Dropdown or buttons for 25%, 50%, 100%, 200%, 400%
   - Complexity: Low
   - Impact: Quick navigation to standard zoom levels
   - Dependencies: Zoom input field (shares validation)

### Nice-to-Have (Phase 3+)
7. **Fit to Window** - Auto-calculate zoom to fit 256x256 map
   - Complexity: Medium
   - Impact: Convenient overview
   - Dependencies: Zoom enforcement, viewport calculation

8. **Animation Speed Control** - Multiplier slider (0.5x, 1x, 2x)
   - Complexity: Low
   - Impact: Helps when editing animated tiles
   - Dependencies: Fixed animation timing (Phase 1)

9. **Performance Monitoring** - FPS counter in dev mode
   - Complexity: Low
   - Impact: Validate optimizations
   - Dependencies: None

### Defer
- **Zoom to Selection** - Requires selection system refinement
- **Smooth Zoom Transitions** - Polish feature, not core functionality
- **Zoom History** - Viewport undo/redo, complex state management

## Complexity Assessment

| Feature | Complexity | Reasoning |
|---------|------------|-----------|
| Fix Pan Sensitivity | Low | Single formula change in mouse move handler |
| Fix Animation Timing | Low | Replace frame counter with delta time accumulator |
| Zoom Percentage Display | Low | Read state.viewport.zoom, format as percentage, display in status bar |
| Keyboard Shortcuts (Ctrl+0/+/-) | Low | Add keyboard event listeners, call existing setViewport |
| Zoom Slider | Medium | HTML range input + sync with zoom state + +/- button handlers |
| Zoom Input Field | Medium | Text input + validation + format parsing + blur/enter handlers |
| Preset Zoom Buttons | Low | Buttons that call setViewport with fixed values |
| Fit to Window | Medium | Calculate container dimensions, map dimensions, set zoom to fit ratio |
| Animation Speed Control | Low | Multiply delta time by speed multiplier in RAF loop |
| Zoom to Selection | Medium | Calculate selection bounds, fit bounds in viewport with padding |
| Performance Monitoring | Low | Track RAF timestamps, calculate FPS, display in overlay |
| Smooth Zoom Transitions | Medium | Tween zoom value over time, requires animation state management |

## Testing Checklist

### Pan Sensitivity
- [ ] At 1x zoom: drag 100px → viewport moves 100px (1:1)
- [ ] At 2x zoom: drag 100px → viewport moves 50 canvas px (appears 1:1 on screen)
- [ ] At 0.5x zoom: drag 100px → viewport moves 200 canvas px (appears 1:1 on screen)
- [ ] Tile under cursor stays under cursor during drag (no slipping)

### Zoom Controls
- [ ] Ctrl+Plus zooms in by 10-20%
- [ ] Ctrl+Minus zooms out by 10-20%
- [ ] Ctrl+0 resets to 100% zoom
- [ ] Mouse wheel zooms toward cursor position, not canvas center
- [ ] Zoom enforced to 0.25x-4x range (25%-400%)
- [ ] Slider updates when zoom changes via keyboard/wheel
- [ ] Input field updates when zoom changes via slider/keyboard
- [ ] Typing "200" or "200%" into input sets zoom to 2x
- [ ] Typing "500" clamps to 400% (max)
- [ ] Typing invalid text shows error, doesn't change zoom

### Animation Rendering
- [ ] Animations play at same speed at 0.25x, 1x, and 4x zoom
- [ ] Animations play at consistent speed on 60Hz and 120Hz monitors
- [ ] Frame offset per tile works (staggered animation start)
- [ ] No visual artifacts during zoom (blurring, misalignment, shimmering)
- [ ] RAF loop stops when no animations and no active tool (performance)

### Performance
- [ ] Maintains 60 FPS during idle (no map changes)
- [ ] Maintains 60 FPS during continuous pan drag
- [ ] Maintains 60 FPS during continuous zoom (mouse wheel held)
- [ ] Maintains 60 FPS with multiple animated tiles visible
- [ ] Static layer doesn't redraw unless viewport/map changes
- [ ] Animation layer only redraws animated tiles, not entire map

## Sources

### HIGH Confidence (Official Docs, Established Standards)
- [Window: requestAnimationFrame() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Tiles and tilemaps overview - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- [Tiled Keyboard Shortcuts - Official Docs](https://doc.mapeditor.org/en/stable/manual/keyboard-shortcuts/)
- [How to Change the Zoom Level in Excel - Microsoft](https://www.thebricks.com/resources/how-to-change-zoom-level-in-excel)
- [Time-based Animation with HTML 5 Canvas and JavaScript - Viget](https://www.viget.com/articles/time-based-animation)
- [High Performance Map Interactions using HTML5 Canvas - ChairNerd/SeatGeek](https://chairnerd.seatgeek.com/high-performance-map-interactions-using-html5-canvas/)

### MEDIUM Confidence (Industry Articles, Community Patterns)
- [Panning and Zooming in HTML Canvas - Harrison Milbradt](https://harrisonmilbradt.com/blog/canvas-panning-and-zooming)
- [Creating a Zoom UI - Steve Ruiz](https://www.steveruiz.me/posts/zoom-ui)
- [Zoom control – Map UI Patterns](https://mapuipatterns.com/zoom-control/)
- [Ensuring Consistent Animation Speeds - Kirupa](https://www.kirupa.com/animations/ensuring_consistent_animation_speeds.htm)
- [From SVG to Canvas – part 1: making Felt faster - Felt](https://felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster)
- [How to Zoom in Premiere Pro - AEANET](https://www.aeanet.org/how-to-zoom-in-premiere-pro/)
- [Infinite Canvas: Building a Seamless, Pan-Anywhere Image Space - Codrops](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/)
- [40 Slider UI Examples That Work - Eleken](https://www.eleken.co/blog-posts/slider-ui)
- [Transforming Mouse Coordinates to Canvas Coordinates - roblouie](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/)

### LOW Confidence (WebSearch Only, Unverified)
- [Simple Canvas Pan And Zoom - GitHub Gist](https://gist.github.com/balazsbotond/1a876d8ccec87e961ec4a4ae5efb5d33)
- [CTRL + 0 Windows Keyboard Shortcut Tip - EasyiT](https://www.easyit.com/you-wont-believe-what-happens-when-you-press-ctrl-0/)
