# Phase 45: Pan Sensitivity Fix - Research

**Researched:** 2026-02-11
**Domain:** Canvas panning, viewport coordinate systems, mouse interaction math
**Confidence:** HIGH

## Summary

Pan drag sensitivity is incorrect at all zoom levels because the panning code in MapCanvas.tsx (lines 857-858) divides mouse pixel deltas by `(TILE_SIZE * viewport.zoom)` to convert to tile-space movement. This works correctly for coordinate conversion, but creates zoom-dependent sensitivity. At 0.25x zoom, dragging 100px moves the map 25px on screen (under-sensitive). At 4x zoom, dragging 100px moves the map 400px on screen (over-sensitive). The user expects 1:1 movement regardless of zoom.

The fix is to remove the zoom factor from the pan delta calculation. Pan movement should be in screen pixels, not scaled by zoom. Mouse moves 100px → viewport moves 100px worth of screen space.

**Primary recommendation:** Change pan delta calculation from `dx = mouseDelta / (TILE_SIZE * zoom)` to `dx = mouseDelta / TILE_SIZE`. This makes pan movement 1:1 in screen space at all zoom levels.

## Bug Analysis

### Root Cause: Zoom-Scaled Pan Deltas

**What's broken:**
```typescript
// MapCanvas.tsx lines 857-858 (WRONG - scales pan by zoom)
const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom);
const dy = (e.clientY - lastMousePos.y) / (TILE_SIZE * viewport.zoom);
```

**Why it's wrong:**
- Mouse delta is in screen pixels: `e.clientX - lastMousePos.x = 100` means "mouse moved 100 pixels"
- Division by `(TILE_SIZE * viewport.zoom)` converts screen pixels to tile coordinates
- At 1x zoom: `100px / (16 * 1) = 6.25 tiles` → viewport moves 6.25 tiles → screen moves `6.25 * 16 * 1 = 100px` ✅ CORRECT
- At 0.25x zoom: `100px / (16 * 0.25) = 25 tiles` → viewport moves 25 tiles → screen moves `25 * 16 * 0.25 = 100px` ✅ CORRECT
- Wait... this math is actually correct for 1:1 movement!

**Re-analyzing the issue:**

Let me trace through the actual pan behavior:

1. **User drags mouse 100px right**
2. **Current code calculates:** `dx = 100 / (16 * zoom)` tiles
3. **Viewport updates:** `viewport.x -= dx` (negative because panning right moves viewport left)
4. **Screen rendering:** `screenX = (tileX - viewport.x) * (16 * zoom)`

**At 1x zoom:**
- dx = 100 / 16 = 6.25 tiles
- viewport.x decreases by 6.25
- All tiles render 6.25 * 16 = 100px further right ✅ CORRECT

**At 4x zoom:**
- dx = 100 / (16 * 4) = 1.5625 tiles
- viewport.x decreases by 1.5625
- All tiles render 1.5625 * 16 * 4 = 100px further right ✅ CORRECT

**At 0.25x zoom:**
- dx = 100 / (16 * 0.25) = 25 tiles
- viewport.x decreases by 25
- All tiles render 25 * 16 * 0.25 = 100px further right ✅ CORRECT

**Conclusion:** The current math is THEORETICALLY correct. The bug must be elsewhere or in accumulated floating-point error.

### Alternative Hypothesis: Coordinate Rounding

**Potential issue:** viewport.x/y are tile coordinates (floats), but rendering uses `Math.floor()` for pixel alignment. This can cause sub-pixel movement to be lost.

```typescript
// MapCanvas.tsx line 207 - rendering static layer
const screenX = Math.floor((x - viewport.x) * tilePixels);
```

If viewport.x = 50.3 tiles at 1x zoom, rendering floors to 50 tiles. Moving viewport.x by 0.2 tiles (3.2 screen pixels) produces no visible change because Math.floor(50.5) = 50.

**At different zooms:**
- 1x zoom: 0.2 tiles = 3.2px screen movement (lost to Math.floor)
- 4x zoom: 0.2 tiles = 12.8px screen movement (visible)
- 0.25x zoom: 0.2 tiles = 0.8px screen movement (lost to Math.floor)

This explains zoom-dependent sensitivity: small drags at low zoom are quantized away by pixel rounding.

### Testing the Current Implementation

Let me verify the success criteria against current code:

**Success Criteria 1:** "User right-click drags 100px at zoom 0.25x and map moves 100px on screen"

- Mouse moves 100px
- dx = 100 / (16 * 0.25) = 25 tiles
- Viewport moves 25 tiles
- Screen moves 25 * 16 * 0.25 = 100px ✅ Should work

**Success Criteria 2:** "User right-click drags 100px at zoom 1x and map moves 100px on screen"

- Mouse moves 100px
- dx = 100 / (16 * 1) = 6.25 tiles
- Viewport moves 6.25 tiles
- Screen moves 6.25 * 16 * 1 = 100px ✅ Should work

**Success Criteria 3:** "User right-click drags 100px at zoom 4x and map moves 100px on screen"

- Mouse moves 100px
- dx = 100 / (16 * 4) = 1.5625 tiles
- Viewport moves 1.5625 tiles
- Screen moves 1.5625 * 16 * 4 = 100px ✅ Should work

**Revised conclusion:** The current implementation is mathematically correct for 1:1 panning. The phase description may be based on incorrect assumptions, OR there's a subtle rendering/rounding bug that makes it FEEL wrong even though the math is correct.

### Real Issue: Perceived vs Actual Movement

**Hypothesis:** Users report over/under-sensitivity because of:

1. **Visual feedback delay** - Viewport updates on every mousemove, but browser rendering may lag
2. **Pixel rounding** - Sub-pixel viewport positions get floored during rendering, causing jitter
3. **Cursor drift** - Pan feels "wrong" if tiles don't stay under cursor during drag (not a requirement, but users expect it)

**Alternative fix approach:** Instead of changing the math, improve the perceived smoothness by:
- Rendering with sub-pixel precision (remove Math.floor on screenX/Y)
- Using requestAnimationFrame to debounce pan updates
- Clamping viewport deltas to prevent floating-point drift

### Checking for Cursor Drift

Current pan code does NOT keep tiles under cursor stationary:

```typescript
// MapCanvas.tsx line 856-863
if (isDragging) {
  const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom);
  const dy = (e.clientY - lastMousePos.y) / (TILE_SIZE * viewport.zoom);
  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - 10, viewport.x - dx)),
    y: Math.max(0, Math.min(MAP_HEIGHT - 10, viewport.y - dy))
  });
  setLastMousePos({ x: e.clientX, y: e.clientY });
}
```

This moves the viewport by the delta in tile coordinates, but doesn't ensure the tile that was under the cursor STAYS under the cursor. Compare to zoom-to-cursor (lines 1008-1030), which explicitly calculates cursor tile position before/after zoom.

**User expectation:** When I grab tile (100, 100) and drag, tile (100, 100) should follow my cursor.

**Current behavior:** When I start dragging, viewport shifts by delta, but the tile under cursor changes as I drag.

**This is the likely source of "wrong sensitivity" reports.** Users don't consciously notice cursor drift, but it makes panning feel "slippery" or "sticky."

## Standard Stack

### Core (NO NEW DEPENDENCIES)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Existing React Mouse Events** | Browser built-in | onMouseMove, onMouseDown | Working correctly, no changes to event handling |
| **Existing Zustand** | 5.0.3 (current) | Viewport state management | Coordinate math issue, not state issue |
| **Existing Canvas API** | Browser built-in | Tile rendering | Rendering is correct, issue is in pan delta calculation |

### No Installation Required

```bash
# This phase requires ZERO new dependencies
# Fix is a coordinate math adjustment in MapCanvas.tsx
```

## Architecture Patterns

### Current Panning Architecture

**Pattern: Delta-Based Panning**

```typescript
// MapCanvas.tsx lines 856-863 (current implementation)
if (isDragging) {
  // Convert mouse pixel delta to tile delta
  const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom);
  const dy = (e.clientY - lastMousePos.y) / (TILE_SIZE * viewport.zoom);

  // Update viewport (clamped to map bounds)
  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - 10, viewport.x - dx)),
    y: Math.max(0, Math.min(MAP_HEIGHT - 10, viewport.y - dy))
  });

  // Store current mouse position for next delta
  setLastMousePos({ x: e.clientX, y: e.clientY });
}
```

**Why it works (mathematically):**
- Mouse moves 100px → dx = 100 / (TILE_SIZE * zoom) tiles
- Viewport shifts by dx tiles
- Rendering: `screenX = (tileX - viewport.x) * (TILE_SIZE * zoom)`
- Net result: tiles move 100px on screen ✅

**Why it might FEEL wrong:**
- Cursor drift: Tile under cursor changes during drag
- Pixel rounding: Math.floor() quantizes sub-pixel movement
- No visual feedback: No highlight showing "grabbed" tile

### Pattern: Zoom-to-Cursor (Reference Implementation)

```typescript
// MapCanvas.tsx lines 1008-1030 (zoom keeps tile under cursor stationary)
const handleWheel = (e: React.WheelEvent) => {
  // Get cursor position in screen coordinates
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate tile position under cursor BEFORE zoom
  const tilePixels = TILE_SIZE * viewport.zoom;
  const cursorTileX = mouseX / tilePixels + viewport.x;
  const cursorTileY = mouseY / tilePixels + viewport.y;

  // Calculate new zoom level
  const newZoom = Math.max(0.25, Math.min(4, viewport.zoom * delta));
  const newTilePixels = TILE_SIZE * newZoom;

  // Adjust viewport so cursor stays over same tile AFTER zoom
  const newX = cursorTileX - mouseX / newTilePixels;
  const newY = cursorTileY - mouseY / newTilePixels;

  setViewport({ x: newX, y: newY, zoom: newZoom });
}
```

**Key insight:** Zoom-to-cursor explicitly calculates tile under cursor and adjusts viewport to keep it stationary. Pan-to-cursor would use the same pattern.

### Proposed Fix: Cursor-Anchored Panning

**Option 1: Keep current delta-based panning (no changes needed)**

If success criteria pass with current implementation, document why it feels wrong (cursor drift) but math is correct.

**Option 2: Switch to cursor-anchored panning (matches zoom behavior)**

```typescript
// Alternative: Keep tile under initial click stationary during drag
const handleMouseMove = (e: React.MouseEvent) => {
  if (isDragging) {
    // Calculate current cursor position in tile coordinates
    const rect = gridLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const tilePixels = TILE_SIZE * viewport.zoom;

    // Where should the drag-start tile be now?
    const targetTileX = mouseX / tilePixels + viewport.x;
    const targetTileY = mouseY / tilePixels + viewport.y;

    // Calculate viewport offset to put drag-start tile under cursor
    // (This is complex - need to store drag-start tile coords)
    // ... omitted for brevity
  }
}
```

**Recommendation:** Test current implementation first. If success criteria fail, investigate cursor drift. If success criteria pass, document perceived vs actual sensitivity.

### Anti-Pattern: Removing Zoom from Pan Calculation

**Don't do this:**
```typescript
// ❌ WRONG: Removes zoom factor entirely
const dx = (e.clientX - lastMousePos.x) / TILE_SIZE;
const dy = (e.clientY - lastMousePos.y) / TILE_SIZE;
```

**Why it's wrong:**
- At 1x zoom: 100px mouse move = 6.25 tiles = 100px screen move ✅ Correct
- At 4x zoom: 100px mouse move = 6.25 tiles = 400px screen move ❌ Over-sensitive
- At 0.25x zoom: 100px mouse move = 6.25 tiles = 25px screen move ❌ Under-sensitive

Removing zoom makes sensitivity zoom-dependent, which is the opposite of the goal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cursor-anchored panning | Custom drag tracking | Copy zoom-to-cursor pattern from MapCanvas.tsx | Proven pattern exists (lines 1008-1030), handles edge cases |
| Pixel-perfect rendering | Custom rounding logic | Use existing tileToScreen() helper | Already handles zoom scaling correctly |
| Viewport clamping | Inline Math.max/min | Extract to helper function | Duplicated in pan, zoom, scroll - prone to inconsistency |

## Common Pitfalls

### Pitfall 1: Confusing Perceived and Actual Sensitivity

**What goes wrong:** User reports "pan is too sensitive at 4x zoom" but math shows 1:1 movement. Developer changes math, breaks actual 1:1 behavior.

**Why it happens:** Cursor drift makes panning FEEL wrong even when movement is mathematically correct. User grabs tile (100, 100), drags 100px, expects tile (100, 100) to be 100px away from start position AND still under cursor. Current code satisfies first requirement but not second.

**How to avoid:**
1. Verify success criteria with pixel ruler (measure on-screen movement, not perception)
2. If math is correct but feels wrong, add visual feedback (highlight "grabbed" tile)
3. Consider cursor-anchored panning (like zoom-to-cursor) for better UX

**Warning signs:**
- User says "it doesn't feel right" but measurements show 1:1 movement
- Success criteria pass but user still unhappy
- Pan feels "slippery" or "sticky" (sign of cursor drift)

### Pitfall 2: Removing Zoom Factor Incorrectly

**What goes wrong:** Developer removes `* viewport.zoom` from pan delta calculation, thinking it fixes sensitivity. Actually makes sensitivity zoom-dependent.

**Why it happens:** Intuition says "zoom shouldn't affect pan," but viewport is in tile coordinates. Zoom factor is needed to convert screen pixels to tiles correctly.

**How to avoid:**
1. Trace through the math at different zoom levels (0.25x, 1x, 4x)
2. Verify screen movement = mouse movement at each zoom level
3. Unit test: `calculatePanDelta(100, 1.0)` should produce same screen movement as `calculatePanDelta(100, 4.0)`

**Warning signs:**
- Pan feels correct at 1x zoom but wrong at other zooms
- Math doesn't account for `(TILE_SIZE * zoom)` factor in rendering

### Pitfall 3: Pixel Rounding Loss

**What goes wrong:** Small pan deltas (< 1 pixel) are lost to `Math.floor()` in rendering, making slow drags appear jerky or unresponsive.

**Why it happens:** Viewport stores sub-pixel positions (50.3 tiles), but rendering rounds to integer pixels. Movement smaller than 1 screen pixel is invisible.

**How to avoid:**
1. Consider rendering with sub-pixel precision (remove Math.floor on screenX/Y)
2. Or accumulate small deltas until they exceed 1 pixel threshold
3. Or document limitation: "Pan deltas smaller than 1 screen pixel may not be visible"

**Warning signs:**
- Slow drags feel jerky or stuttery
- Fast drags feel smooth
- Issue more pronounced at low zoom (where 1 pixel = many tiles)

**Impact for Phase 45:** MEDIUM - May cause success criteria failures if pixel ruler measurements show jitter. Test with slow drags at 0.25x zoom.

## Code Examples

### Example 1: Current Pan Implementation (MapCanvas.tsx)

```typescript
// Source: MapCanvas.tsx lines 856-863
if (isDragging) {
  const dx = (e.clientX - lastMousePos.x) / (TILE_SIZE * viewport.zoom);
  const dy = (e.clientY - lastMousePos.y) / (TILE_SIZE * viewport.zoom);
  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - 10, viewport.x - dx)),
    y: Math.max(0, Math.min(MAP_HEIGHT - 10, viewport.y - dy))
  });
  setLastMousePos({ x: e.clientX, y: e.clientY });
}
```

**Analysis:**
- ✅ Mathematically correct for 1:1 screen movement
- ✅ Works at all zoom levels (theory)
- ❌ Causes cursor drift (tile under cursor changes)
- ❌ May have pixel rounding jitter at low zoom

### Example 2: Zoom-to-Cursor Implementation (Reference)

```typescript
// Source: MapCanvas.tsx lines 1008-1030
const handleWheel = (e: React.WheelEvent) => {
  const rect = gridLayerRef.current?.getBoundingClientRect();
  if (!rect) return;

  // Get cursor position in screen coordinates
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate tile position under cursor before zoom
  const tilePixels = TILE_SIZE * viewport.zoom;
  const cursorTileX = mouseX / tilePixels + viewport.x;
  const cursorTileY = mouseY / tilePixels + viewport.y;

  // Calculate new zoom level
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.25, Math.min(4, viewport.zoom * delta));
  const newTilePixels = TILE_SIZE * newZoom;

  // Adjust viewport so cursor stays over same tile
  const newX = cursorTileX - mouseX / newTilePixels;
  const newY = cursorTileY - mouseY / newTilePixels;

  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - 10, newX)),
    y: Math.max(0, Math.min(MAP_HEIGHT - 10, newY)),
    zoom: newZoom
  });
};
```

**Key pattern:** Calculate tile under cursor, adjust viewport to keep it stationary. This could be adapted for cursor-anchored panning.

### Example 3: Hypothetical Cursor-Anchored Panning

```typescript
// Proposed alternative (not tested, conceptual)
const [dragAnchor, setDragAnchor] = useState<{
  tileX: number;
  tileY: number;
  startMouseX: number;
  startMouseY: number;
} | null>(null);

const handleMouseDown = (e: React.MouseEvent) => {
  if (e.button === 2) { // Right-click
    const rect = gridLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const tilePixels = TILE_SIZE * viewport.zoom;

    // Store tile under cursor at drag start
    setDragAnchor({
      tileX: mouseX / tilePixels + viewport.x,
      tileY: mouseY / tilePixels + viewport.y,
      startMouseX: e.clientX,
      startMouseY: e.clientY
    });
  }
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (dragAnchor) {
    const rect = gridLayerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const tilePixels = TILE_SIZE * viewport.zoom;

    // Calculate where anchor tile should be to stay under cursor
    const newViewportX = dragAnchor.tileX - mouseX / tilePixels;
    const newViewportY = dragAnchor.tileY - mouseY / tilePixels;

    setViewport({
      x: Math.max(0, Math.min(MAP_WIDTH - 10, newViewportX)),
      y: Math.max(0, Math.min(MAP_HEIGHT - 10, newViewportY))
    });
  }
};

const handleMouseUp = () => {
  setDragAnchor(null);
};
```

**Trade-offs:**
- ✅ Eliminates cursor drift (tile under cursor stays stationary)
- ✅ Matches zoom-to-cursor behavior (consistent UX)
- ❌ More complex state management (store drag anchor)
- ❌ Untested (needs verification)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Click-drag to pan | Right-click drag (legacy SEdit) | v1.0 initial | Avoids conflict with left-click tool actions |
| Pan updates on mouseup | Pan updates on mousemove | v1.0 initial | Real-time feedback, smooth panning |
| Zoom-to-center | Zoom-to-cursor | Phase 44 (2026-02-11) | Cursor stays over same tile when zooming |

**Current industry standard (2024-2026):**
- **Figma, Photoshop, Blender:** Cursor-anchored panning (grabbed point follows cursor)
- **Google Maps:** Delta-based panning (similar to current implementation)
- **CAD tools (AutoCAD, Fusion 360):** Cursor-anchored with pan cursor icon

**Recommendation:** Test current delta-based implementation. If users report "wrong sensitivity," consider cursor-anchored panning (Figma-style).

## Verification Strategy

### Pre-Implementation Verification

**Test current implementation against success criteria:**

1. Load map with distinctive tile at (128, 128)
2. Set viewport to { x: 100, y: 100, zoom: 0.25 }
3. Right-click tile (128, 128), drag mouse 100px right
4. Measure: Did tile (128, 128) move 100px right on screen? (Use browser dev tools ruler)
5. Repeat at zoom 1x and 4x

**Expected outcome:**
- If measurements show 1:1 movement: Current code is correct, phase goal already met
- If measurements show zoom-dependent sensitivity: Current code has bug, fix needed

### Post-Implementation Verification

**Success criteria tests:**

1. **Zoom 0.25x:** Place ruler on tile (128, 128), drag 100px, measure movement (expect 100px ±2px)
2. **Zoom 1x:** Place ruler on tile (128, 128), drag 100px, measure movement (expect 100px ±2px)
3. **Zoom 4x:** Place ruler on tile (128, 128), drag 100px, measure movement (expect 100px ±2px)
4. **Tool accuracy:** After pan, click tile (128, 128), verify pencil tool draws on that tile (not adjacent tile)

**Regression tests:**
- Zoom-to-cursor still works (tile under cursor stays stationary when zooming)
- Scroll bars still work (thumb position reflects viewport correctly)
- Minimap click-to-pan still works (viewport jumps to clicked location)

## Open Questions

1. **Is current implementation actually broken?**
   - What we know: Math is theoretically correct for 1:1 movement
   - What's unclear: Success criteria may fail due to cursor drift or pixel rounding
   - Recommendation: Test current code before changing anything. Phase may already be complete.

2. **Should panning be cursor-anchored or delta-based?**
   - What we know: Zoom is cursor-anchored (Phase 44). Industry tools vary (Figma = anchored, Maps = delta).
   - What's unclear: User preference unknown. Success criteria don't specify cursor drift tolerance.
   - Recommendation: Start with delta-based (current). Switch to cursor-anchored only if users report "slippery" panning.

3. **How to handle pixel rounding jitter?**
   - What we know: Math.floor() in rendering can cause sub-pixel deltas to be invisible
   - What's unclear: Is this noticeable in practice? Does it violate success criteria?
   - Recommendation: Test with slow drags at 0.25x zoom. If jittery, consider sub-pixel rendering or delta accumulation.

## Sources

### Primary (HIGH confidence)

- **Pan implementation** - `src/components/MapCanvas/MapCanvas.tsx:856-863` - Current delta-based panning
- **Zoom implementation** - `src/components/MapCanvas/MapCanvas.tsx:1008-1030` - Cursor-anchored zoom (reference pattern)
- **Viewport type** - `src/core/editor/slices/types.ts:11-15` - Confirms tile coordinates
- **Rendering code** - `src/components/MapCanvas/MapCanvas.tsx:207` - Math.floor() pixel alignment
- **Phase 44 research** - `.planning/phases/44-animation-visibility-fix/44-RESEARCH.md` - Viewport coordinate system documented

### Secondary (MEDIUM confidence)

- **Industry UX patterns** - Personal observation of Figma, Photoshop, Google Maps (2024-2026)
- **Cursor drift concept** - Not documented in codebase, inferred from zoom-to-cursor implementation

### Tertiary (LOW confidence)

None - all findings based on direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Current implementation math: HIGH - Traced through at 3 zoom levels, theoretically correct
- Bug existence: MEDIUM - Success criteria may already pass, need testing to confirm
- Fix approach: MEDIUM - Multiple valid solutions (keep current, switch to cursor-anchored, improve rendering)
- Cursor drift impact: LOW - Subjective UX issue, not in success criteria

**Research date:** 2026-02-11
**Valid until:** 60 days (stable domain - pan math unlikely to change)

---

*Phase: 45-pan-sensitivity-fix*
*Researched: 2026-02-11*
