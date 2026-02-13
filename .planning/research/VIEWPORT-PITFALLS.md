# Domain Pitfalls: Viewport, Zoom, and Animation Rendering

**Domain:** Canvas-based tile map editor viewport controls
**Researched:** 2026-02-11
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Coordinate System Confusion (Pixels vs Tiles)

**What goes wrong:** Viewport bounds calculations treat tile coordinates as pixel coordinates (or vice versa), causing features to only work at specific zoom levels. Symptoms: animations render at 0.25x zoom but not at 1x zoom, pan drag feels "off" at high zoom.

**Why it happens:** Viewport state stores TILE coordinates (`viewport.x = 50` means "50 tiles from left edge"), but developers instinctively think in pixels. When calculating visible tile ranges, they divide by `TILE_SIZE * zoom` assuming viewport values are pixels. The math accidentally works at extreme zoom levels (0.25x has huge tile ranges, 4x has tiny ranges), masking the bug during casual testing.

**Consequences:**
- Animations only render when zoomed out (viewport range calculation checks wrong tiles)
- Pan drag sensitivity changes with zoom (feels sluggish at high zoom, too fast at low zoom)
- Tool operations target wrong tiles (off-by-N errors that scale with zoom)
- Minimap viewport indicator shows incorrect position

**Prevention:**
1. **Document coordinate system clearly:**
   ```typescript
   interface Viewport {
     x: number;      // Tile coordinate (NOT pixels) - left edge in tiles
     y: number;      // Tile coordinate (NOT pixels) - top edge in tiles
     zoom: number;   // Multiplier (1.0 = 100%, 2.0 = 200%)
   }
   ```
2. **Conversion functions (not inline math):**
   ```typescript
   const screenToTile = (screenX: number, viewport: Viewport): number =>
     (screenX / (TILE_SIZE * viewport.zoom)) + viewport.x;

   const tileToScreen = (tileX: number, viewport: Viewport): number =>
     (tileX - viewport.x) * TILE_SIZE * viewport.zoom;
   ```
3. **Verify with concrete examples:** At zoom=1, viewport.x=50, screenX=0 should point to tile 50 (not tile 0 or tile 3.125)
4. **Copy working patterns:** When adding new viewport-dependent features, copy math from `getVisibleTiles()` in MapCanvas.tsx (proven correct)

**Detection:**
- Warning sign 1: Feature works at one zoom level but not others
- Warning sign 2: Math uses `viewport.x / (TILE_SIZE * zoom)` instead of `Math.floor(viewport.x)`
- Warning sign 3: Tile positions "drift" when zooming in/out
- Warning sign 4: Off-by-one errors that disappear at specific zoom levels

**References:**
- [Transforming Mouse Coordinates to Canvas Coordinates](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/)
- Current codebase: `MapCanvas.tsx` lines 139-153 (correct pattern), `AnimationPanel.tsx` lines 88-99 (broken pattern)

---

### Pitfall 2: Zoom-Dependent Pan Sensitivity

**What goes wrong:** Pan drag movement scales with zoom level instead of being 1:1 with mouse movement. Dragging 100px at 2x zoom moves half as far on screen compared to dragging 100px at 1x zoom. Users report "pan feels slow when zoomed in" or "pan is too fast when zoomed out."

**Why it happens:** Pan delta calculation divides screen pixel movement by `(TILE_SIZE * viewport.zoom)` to convert to tile delta. This formula is correct for mouse-to-tile coordinate conversion (e.g., placing a tile at cursor position), but WRONG for pan dragging where users expect 1:1 screen movement. The tile under the cursor should stay under the cursor during drag, regardless of zoom.

**Consequences:**
- Inconsistent pan UX across zoom levels
- Users overshoot/undershoot targets when panning at non-1x zoom
- "Slippery" feeling - map doesn't move exactly with cursor
- Harder to navigate map at high zoom (small drag movements barely pan)

**Prevention:**
1. **Use zoom-independent pan delta:**
   ```typescript
   // WRONG (zoom-dependent):
   const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom);

   // CORRECT (zoom-independent):
   const dx = (e.clientX - lastMousePos.x) / TILE_SIZE;
   ```
2. **Test at multiple zoom levels:** Pan 100px at 0.25x, 1x, 2x, 4x - all should FEEL the same
3. **Verify tile-under-cursor stays under cursor:** Pick a tile, start drag, move mouse 100px right, release - same tile should be under cursor
4. **Formula validation:** At any zoom level, dragging N pixels should pan by N/TILE_SIZE tiles (zoom-independent)

**Detection:**
- User testing reveals zoom-dependent sensitivity
- Pan feels "sluggish" or "too sensitive" depending on zoom
- Math uses `pixelDelta / (TILE_SIZE * zoom)` instead of `pixelDelta / TILE_SIZE`
- Tile slips out from under cursor during drag

---

### Pitfall 3: Frame Count-Based Animation Instead of Delta Time

**What goes wrong:** Animation frame counter increments by 1 every requestAnimationFrame tick instead of accumulating delta time. This causes animations to run faster on high-refresh-rate monitors (120Hz, 144Hz, 240Hz) and slower on low-refresh-rate monitors (30Hz, 60Hz locked). Zoom changes don't affect timing, but different hardware shows inconsistent animation speeds.

**Why it happens:** Developers use `animationFrame++` in RAF callback, assuming 60 FPS is universal. requestAnimationFrame fires at display refresh rate, which varies by monitor. Without delta time compensation, animation speed directly depends on monitor refresh rate.

**Consequences:**
- Animations run 2x speed on 120Hz monitors compared to 60Hz
- Animations run 4x speed on 240Hz gaming monitors
- Inconsistent UX across different user hardware
- Cannot accurately control animation timing (can't implement "2 frames per second" animation)

**Prevention:**
1. **Use delta time accumulation:**
   ```typescript
   const animate = (timestamp: DOMHighResTimeStamp) => {
     const deltaTime = timestamp - lastTimestamp;
     frameCounter += (deltaTime / 1000) * animationSpeed; // Seconds-based accumulation

     const framesPerSecond = 2; // Desired animation speed
     const currentFrame = Math.floor(frameCounter * framesPerSecond) % totalFrames;

     lastTimestamp = timestamp;
     requestAnimationFrame(animate);
   };
   ```
2. **Test on different refresh rates:** Use Chrome DevTools to simulate 30Hz, 60Hz, 120Hz (DevTools → Rendering → Frame rate override)
3. **Avoid frame counters as time:** Never use raw frame count for time-dependent logic

**Detection:**
- Animations run at different speeds on different monitors
- Users report "animations are too fast"
- Frame counter increments by 1 every RAF tick instead of by delta time
- No timestamp parameter used in RAF callback

**References:**
- [Ensuring Consistent Animation Speeds - Kirupa](https://www.kirupa.com/animations/ensuring_consistent_animation_speeds.htm)
- [requestAnimationFrame MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

---

## Moderate Pitfalls

### Pitfall 4: Zoom Input Validation Gaps

**What goes wrong:** Zoom input field accepts invalid values ("abc", "-100", "999999") without proper error handling, causing crashes, NaN viewport state, or zoom values outside intended range. Users type "2" expecting 200% but get 2% (0.02x zoom). Input formats inconsistent ("100" vs "100%" vs "1.0" vs "1.0x").

**Prevention:**
- Parse multiple formats: `parseInt(value.replace('%', '').replace('x', ''))` or `parseFloat(value)`
- Clamp to range: `Math.max(25, Math.min(400, parsedValue))`
- Show error state for invalid input (red border, don't update zoom)
- Unit test all format variations

---

### Pitfall 5: Slider Precision at Low Zoom Levels

**What goes wrong:** Linear zoom slider (0.25 to 4) makes it hard to select precise low zoom values. Range from 0.25x to 1x is 75% of total range (0.75 / 3.75 = 20%), so 80% of slider is for high zoom. Users struggle to select 0.5x or 0.75x precisely.

**Prevention:**
- Use logarithmic scale for slider (`value = Math.pow(2, sliderPosition)` transforms linear slider to log zoom)
- OR provide preset buttons (25%, 50%, 75%, 100%, 200%, 400%) for common values
- OR accept linear slider with small step (0.01) and let users type precise values in input field

---

## Minor Pitfalls

### Pitfall 6: Missing Keyboard Shortcuts

**What goes wrong:** Users expect Ctrl+0 (reset zoom), Ctrl+Plus (zoom in), Ctrl+Minus (zoom out) to work, but nothing happens because keyboard handlers aren't implemented. Forces users to use mouse for all zoom operations.

**Prevention:**
- Add `keydown` event listener at window level
- Check `e.ctrlKey && e.key === '0'` for reset
- Implement discrete zoom steps (10-20% per keypress) instead of continuous zoom

---

### Pitfall 7: Zoom Range Clamping Edge Cases

**What goes wrong:** Viewport clamps to `[0, MAP_WIDTH-10]` instead of dynamic range based on viewport size. At high zoom levels, users can't scroll to bottom-right corner of map. At low zoom levels, viewport allows scrolling past map bounds, showing empty space.

**Prevention:**
- Calculate max viewport based on zoom and canvas size:
  ```typescript
  const maxX = Math.max(0, MAP_WIDTH - (canvasWidth / (TILE_SIZE * zoom)));
  const maxY = Math.max(0, MAP_HEIGHT - (canvasHeight / (TILE_SIZE * zoom)));
  ```
- Clamp dynamically: `Math.max(0, Math.min(maxX, viewport.x))`

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Zoom slider updates on every pixel of drag | Laggy slider, dropped frames during drag | Debounce zoom updates to 16ms (1 frame), OR use Zustand's batching (already does this) | Non-issue with current stack |
| Redrawing all 4 canvas layers on every zoom change | Slow zoom animation, frame drops | Layer-specific invalidation (already implemented correctly) | Non-issue with current architecture |
| Re-calculating visible tiles on every render | High CPU usage, slow pan/zoom | Memoize `getVisibleTiles` with viewport as dependency (already correct) | Non-issue |

**Current architecture is already performant.** ✅ No optimization needed.

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Zoom slider too narrow | Hard to select precise zoom levels | 100-200px width, or use input field for precision |
| No visual feedback during zoom | User unsure if zoom changed | Animate zoom transitions (100-200ms) OR show zoom% in tooltip while dragging |
| Reset zoom button not obvious | Users can't find "return to 100%" | Dedicated "100%" button OR Ctrl+0 shortcut + tooltip |
| Zoom controls in wrong location | Hidden in menu, users don't discover | Status bar (always visible) or floating toolbar |

## "Looks Done But Isn't" Checklist

- [ ] **Animation rendering:** Animations play, but verify at ALL zoom levels (0.25x, 1x, 2x, 4x), not just one test case
- [ ] **Pan drag:** Panning works, but verify 1:1 movement at ALL zoom levels (drag 100px should feel same at 0.5x and 2x)
- [ ] **Zoom input:** Input accepts values, but verify all formats ("100", "100%", "1.0", "1.0x"), invalid input handling ("abc", "-50", "999")
- [ ] **Zoom slider:** Slider updates zoom, but verify bidirectional sync (slider → input, input → slider, wheel → both)
- [ ] **Viewport clamping:** Map doesn't scroll past edges, but verify at ALL zoom levels (edge case: zoomed in 4x, bottom-right corner accessible?)
- [ ] **Animation timing:** Animations run consistently, but verify on different refresh rate monitors (60Hz, 120Hz)
- [ ] **Keyboard shortcuts:** Implemented, but verify Ctrl+0/+/- work AND preventDefault so browser zoom doesn't interfere

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Coordinate system confusion | MEDIUM | 1. Add unit tests for screenToTile/tileToScreen 2. Audit all viewport math, replace with conversion functions 3. Test at multiple zoom levels |
| Zoom-dependent pan | LOW | 1. Remove zoom from pan delta denominator 2. Test at 3+ zoom levels, verify 1:1 movement 3. Deploy hotfix |
| Frame count animation | MEDIUM | 1. Replace frame++ with delta time accumulation 2. Test on 60Hz and 120Hz monitors 3. Add animation speed control UI |
| Invalid zoom input | LOW | 1. Add input validation wrapper function 2. Unit test all formats 3. Deploy patch |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Coordinate confusion | Phase 1: Animation Fix | Place animated tile, verify renders at 1x zoom |
| Zoom-dependent pan | Phase 2: Pan Fix | Drag 100px at different zoom levels, verify same tile-delta movement |
| Frame count animation | Phase 1: Animation Fix | Test animation speed on 60Hz vs 120Hz monitor (or DevTools simulation) |
| Zoom input validation | Phase 3: Zoom Controls | Type invalid values, verify error state; type various formats, verify acceptance |

---

*Pitfalls research for: Viewport fixes and zoom controls*
*Researched: 2026-02-11*
*Focus: Coordinate system confusion, zoom-dependent pan, animation timing*
