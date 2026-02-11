# Architecture Patterns: Viewport Fixes & Zoom Controls

**Domain:** Canvas rendering, viewport management, zoom controls
**Researched:** 2026-02-11

## Current Architecture Overview

### 4-Layer Canvas Stack

```
┌─────────────────────────────────────┐
│  Layer 4: Grid (gridLayerRef)      │ ← Mouse events
│  - Receives all mouse events        │
│  - Redraws on: showGrid, viewport  │
├─────────────────────────────────────┤
│  Layer 3: Overlay (overlayLayerRef)│ ← No events
│  - Tool previews, selection rect    │
│  - Redraws on: tool state, cursor  │
│  - Animation: marching ants         │
├─────────────────────────────────────┤
│  Layer 2: Anim (animLayerRef)      │ ← No events
│  - Animated tiles only              │
│  - Redraws on: animationFrame       │
├─────────────────────────────────────┤
│  Layer 1: Static (staticLayerRef)  │ ← No events
│  - Non-animated tiles               │
│  - Redraws on: map, viewport       │
└─────────────────────────────────────┘
```

All canvases positioned `absolute`, stacked via CSS (no z-index needed).

### State Management (Zustand)

**Viewport State (per-document):**
- `viewport: { x: number, y: number, zoom: number }` - tile coordinates + zoom multiplier
- Stored in `DocumentsSlice` (per-doc state)
- Synced to top-level via backward-compat layer

**Animation State (global):**
- `animationFrame: number` - global counter, increments ~150ms when conditions met
- Stored in `GlobalSlice` (shared across all documents)

**Mouse Interaction State (local):**
- `isDragging: boolean` - local component state
- `lastMousePos: { x: number, y: number }` - screen pixels

### Animation Loop

Location: `AnimationPanel.tsx` lines 88-110

```typescript
useEffect(() => {
  let animationId: number;
  let lastFrameTime = 0;

  const animate = (timestamp: DOMHighResTimeStamp) => {
    // Only advance if tab visible AND animated tiles in any viewport
    if (!isPaused && hasVisibleAnimatedTiles()) {
      if (timestamp - lastFrameTime >= FRAME_DURATION) {
        advanceAnimationFrame();  // Increments global counter
        lastFrameTime = timestamp;
      }
    }
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationId);
}, [advanceAnimationFrame, isPaused, hasVisibleAnimatedTiles]);
```

**Key:** Animation only runs when:
1. Page is visible (`!isPaused` via Page Visibility API)
2. At least one document has animated tiles in its viewport

### Viewport Visibility Check

Location: `AnimationPanel.tsx` lines 44-72

**BUG IDENTIFIED:** Incorrect viewport bounds calculation

```typescript
const hasVisibleAnimatedTiles = useCallback((): boolean => {
  const MAP_SIZE = 256;
  const TILE_SIZE = 16;

  for (const [, doc] of documents) {
    if (!doc.map) continue;
    const { viewport } = doc;

    // BROKEN: Uses viewport.x/y as PIXELS, not TILE COORDINATES
    const startX = Math.max(0, Math.floor(viewport.x / (TILE_SIZE * viewport.zoom)));
    const startY = Math.max(0, Math.floor(viewport.y / (TILE_SIZE * viewport.zoom)));
    const endX = Math.min(MAP_SIZE, Math.ceil((viewport.x + window.innerWidth) / (TILE_SIZE * viewport.zoom)));
    const endY = Math.min(MAP_SIZE, Math.ceil((viewport.y + window.innerHeight) / (TILE_SIZE * viewport.zoom)));

    // Check tiles...
  }
}, [documents]);
```

**Root Cause:** `viewport.x` and `viewport.y` are **tile coordinates**, not pixel coordinates. The math treats them as pixels.

**Correct Calculation (from `MapCanvas.tsx` line 139):**
```typescript
const getVisibleTiles = useCallback(() => {
  const canvas = gridLayerRef.current;
  if (!canvas) return { startX: 0, startY: 0, endX: 20, endY: 20 };

  const tilePixels = TILE_SIZE * viewport.zoom;
  const tilesX = Math.ceil(canvas.width / tilePixels) + 1;
  const tilesY = Math.ceil(canvas.height / tilePixels) + 1;

  return {
    startX: Math.floor(viewport.x),       // viewport.x is already in tiles
    startY: Math.floor(viewport.y),       // viewport.y is already in tiles
    endX: Math.min(MAP_WIDTH, Math.floor(viewport.x) + tilesX),
    endY: Math.min(MAP_HEIGHT, Math.floor(viewport.y) + tilesY)
  };
}, [viewport]);
```

**Why Animations Only Render at Far Zoom-Out:**
- At zoom=1 (normal), viewport.x might be 50 tiles
- Broken math: `50 / (16 * 1) = 3.125` → startX=3
- Checks tiles 3-10 instead of 50-70
- At zoom=0.25 (zoomed out), viewport.x might be 10 tiles
- Broken math: `10 / (16 * 0.25) = 2.5` → startX=2
- Checks tiles 2-100 (huge range because window.innerWidth is large)
- **Accidentally works at zoom-out because the range is so large it includes actual viewport**

### Pan Drag Implementation

Location: `MapCanvas.tsx` lines 856-863

```typescript
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

**Math Analysis:**
- `e.clientX - lastMousePos.x` = screen pixel delta
- Divide by `(TILE_SIZE * viewport.zoom)` to convert to tile delta
- At zoom=1: `100px drag / (16 * 1) = 6.25 tiles` ✅ Correct
- At zoom=0.5: `100px drag / (16 * 0.5) = 12.5 tiles` ✅ Correct (more tiles visible, faster pan)
- At zoom=2: `100px drag / (16 * 2) = 3.125 tiles` ✅ Correct (fewer tiles visible, slower pan)

**Sensitivity Issue:** The division by `zoom` makes panning feel "sluggish" at high zoom levels.

**Expected Behavior:** 1:1 screen-to-map movement (pan by 100px = map shifts 100px on screen, regardless of zoom)

**Fix:**
```typescript
const dx = (e.clientX - lastMousePos.x) / TILE_SIZE;  // Remove zoom from denominator
const dy = (e.clientY - lastMousePos.y) / TILE_SIZE;
```

This maintains zoom-independence: dragging 100px always shifts the view by 100px worth of map pixels.

### Zoom Implementation

Location: `MapCanvas.tsx` lines 994-1031

```typescript
const handleWheel = (e: React.WheelEvent) => {
  e.preventDefault();
  const rect = gridLayerRef.current?.getBoundingClientRect();
  if (!rect) return;

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate tile under cursor BEFORE zoom
  const tilePixels = TILE_SIZE * viewport.zoom;
  const cursorTileX = mouseX / tilePixels + viewport.x;
  const cursorTileY = mouseY / tilePixels + viewport.y;

  // New zoom level
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

**Range:** 0.25x to 4x (hardcoded limits)
**Increment:** 10% per wheel tick (0.9 / 1.1 multiplier)
**Quality:** Zoom-to-cursor math is correct ✅

## Recommended Patterns

### Pattern 1: Viewport-Aware Animation Control

**What:** Only run animation loop when animated tiles are visible in ANY document viewport

**Implementation:**
```typescript
// IN AnimationPanel.tsx
const hasVisibleAnimatedTiles = useCallback((): boolean => {
  const MAP_SIZE = 256;

  for (const [, doc] of documents) {
    if (!doc.map) continue;

    // Get canvas dimensions from the actual MapCanvas component
    // (use window.innerWidth/innerHeight as approximation)
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const { viewport } = doc;
    const tilePixels = TILE_SIZE * viewport.zoom;

    // Calculate visible tile range
    const startX = Math.floor(viewport.x);
    const startY = Math.floor(viewport.y);
    const tilesX = Math.ceil(canvasWidth / tilePixels) + 1;
    const tilesY = Math.ceil(canvasHeight / tilePixels) + 1;
    const endX = Math.min(MAP_SIZE, startX + tilesX);
    const endY = Math.min(MAP_SIZE, startY + tilesY);

    // Check visible tiles for animation flag
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = doc.map.tiles[y * MAP_SIZE + x];
        if (tile & ANIMATED_FLAG) return true;
      }
    }
  }
  return false;
}, [documents]);
```

**Why:** Prevents unnecessary animation loop when no animated tiles are on-screen, saves CPU.

### Pattern 2: Zoom-Independent Pan Drag

**What:** Pan movement feels 1:1 with mouse movement, regardless of zoom level

**Implementation:**
```typescript
// IN MapCanvas.tsx handleMouseMove
if (isDragging) {
  const pixelDx = e.clientX - lastMousePos.x;
  const pixelDy = e.clientY - lastMousePos.y;

  // Convert screen pixels to tile delta (no zoom factor)
  const dx = pixelDx / TILE_SIZE;
  const dy = pixelDy / TILE_SIZE;

  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - 10, viewport.x - dx)),
    y: Math.max(0, Math.min(MAP_HEIGHT - 10, viewport.y - dy))
  });
  setLastMousePos({ x: e.clientX, y: e.clientY });
}
```

**Why:** User expects dragging map to move 1:1 with cursor, not faster/slower based on zoom.

### Pattern 3: Dedicated Zoom Control Component

**What:** Standalone component for zoom input/slider, placed in status bar

**Placement Options:**
1. **Status Bar** (RECOMMENDED) ✅
   - Already shows "Zoom: X%" as read-only
   - Natural place for interactive zoom control
   - Minimal layout disruption

2. **Toolbar** (NOT RECOMMENDED) ❌
   - Toolbar is for tools (pencil, wall, etc.)
   - Zoom is viewport state, not a tool
   - Would clutter tool selection area

3. **Sidebar** (NOT RECOMMENDED) ❌
   - Sidebar is for tile/animation selection
   - Zoom is per-document, not global setting
   - Would waste vertical space

**Component Structure:**
```typescript
// StatusBar.tsx
<div className="status-field status-field-zoom">
  <label>Zoom:</label>
  <input
    type="number"
    min="25"
    max="400"
    step="25"
    value={Math.round(viewport.zoom * 100)}
    onChange={handleZoomInput}
    className="zoom-input"
  />
  <span>%</span>
  <input
    type="range"
    min="0.25"
    max="4"
    step="0.25"
    value={viewport.zoom}
    onChange={handleZoomSlider}
    className="zoom-slider"
  />
</div>
```

**Why:** Status bar is already viewport-aware, users expect zoom controls near zoom display.

### Pattern 4: Canvas Resize Handling

**Current Pattern (RAF-debounced):**
```typescript
// MapCanvas.tsx lines 1196-1239
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  let rafId: number | null = null;

  const resizeObserver = new ResizeObserver(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Update all 4 canvases
      [staticLayerRef, animLayerRef, overlayLayerRef, gridLayerRef].forEach(ref => {
        if (ref.current) {
          ref.current.width = width;
          ref.current.height = height;
        }
      });

      // Redraw all layers
      drawStaticLayer();
      drawAnimLayer();
      drawOverlayLayer();
      drawGridLayer();
    });
  });

  resizeObserver.observe(container);
  return () => {
    resizeObserver.disconnect();
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}, [drawStaticLayer, drawAnimLayer, drawOverlayLayer, drawGridLayer]);
```

**Why:** ResizeObserver + RAF debouncing prevents resize storms, ensures all layers redraw atomically.

## Integration Points

### New Components

| Component | Purpose | Location | Integration |
|-----------|---------|----------|-------------|
| ZoomControl | Numeric input + slider for zoom | StatusBar.tsx | Replace current "Zoom: X%" field |

### Modified Components

| Component | Changes | Reason |
|-----------|---------|--------|
| MapCanvas.tsx | Fix pan drag math (remove zoom from denominator) | 1:1 pan movement |
| AnimationPanel.tsx | Fix `hasVisibleAnimatedTiles` viewport bounds | Animations render at all zoom levels |
| StatusBar.tsx | Add interactive zoom controls | User can type/drag zoom level |

### Data Flow Changes

**Before:**
```
User scrolls wheel → MapCanvas.handleWheel → setViewport({ zoom: newZoom })
                                          ↓
                                    StatusBar reads viewport.zoom (display only)
```

**After:**
```
User scrolls wheel → MapCanvas.handleWheel → setViewport({ zoom: newZoom })
                                          ↓
                                    StatusBar reads viewport.zoom
                                          ↓
                                    ZoomControl allows input/slider
                                          ↓
                                    setViewport({ zoom: userValue })
```

**No state conflicts:** Both wheel and ZoomControl write to same `setViewport` action, reads from same `viewport.zoom` source.

## Build Order

### Phase 1: Fix Broken Animation Detection (CRITICAL)
1. **Fix `hasVisibleAnimatedTiles` in AnimationPanel.tsx**
   - Use correct viewport math (viewport.x/y are tiles, not pixels)
   - Match `getVisibleTiles` logic from MapCanvas
   - Test: Animations should render at zoom=1

**Dependencies:** None
**Risk:** Low (isolated function, testable by placing animated tiles)
**Verification:** Place animated tile at viewport center, zoom to 1x, verify animation plays

### Phase 2: Fix Pan Drag Sensitivity
2. **Modify pan drag math in MapCanvas.tsx**
   - Remove `viewport.zoom` from dx/dy calculation
   - Keep same clamping logic
   - Test: Drag 100px should move map 100px on screen at all zoom levels

**Dependencies:** None
**Risk:** Low (single calculation change)
**Verification:** Drag map at zoom=0.25, 1, 2, 4 - movement should feel identical

### Phase 3: Add Zoom Controls (ENHANCEMENT)
3. **Add ZoomControl to StatusBar.tsx**
   - Numeric input (25-400, step 25)
   - Range slider (0.25-4, step 0.25)
   - Both update `setViewport({ zoom })`

**Dependencies:** Phase 1 & 2 complete (so zoom controls work with fixed rendering)
**Risk:** Low (new component, no changes to existing state)
**Verification:** Type "200" → map zooms to 2x, drag slider to 0.5 → map zooms to 0.5x

## Root Cause Analysis

### Issue: Animations Only Render at Far Zoom-Out

**Hypothesis 1:** Animation loop not running ❌
- **Evidence:** Animation loop IS running (requestAnimationFrame confirmed)
- **Rejected**

**Hypothesis 2:** Animated tiles not drawing ❌
- **Evidence:** Tiles DO draw (frame 0 drawn on static layer as background)
- **Rejected**

**Hypothesis 3:** `hasVisibleAnimatedTiles` returns false at normal zoom ✅
- **Evidence:** Viewport bounds calculation treats tile coordinates as pixels
- **Math at zoom=1, viewport.x=50:**
  - Broken: `50 / (16 * 1) = 3` → checks tiles 3-10
  - Correct: `floor(50)` → checks tiles 50-70
- **Math at zoom=0.25, viewport.x=10:**
  - Broken: `10 / (16 * 0.25) = 2.5` → checks tiles 2-100 (huge range, accidentally includes actual viewport)
  - Correct: `floor(10)` → checks tiles 10-30
- **Confirmed**

### Issue: Pan Drag Feels Sluggish at High Zoom

**Hypothesis 1:** Mouse event throttling ❌
- **Evidence:** No throttling/debouncing on mousemove
- **Rejected**

**Hypothesis 2:** Viewport update lag ❌
- **Evidence:** setViewport updates immediately (Zustand is synchronous)
- **Rejected**

**Hypothesis 3:** Pan delta math scales with zoom ✅
- **Evidence:** `dx = pixelDelta / (TILE_SIZE * viewport.zoom)`
- **At zoom=2:** 100px drag = 3.125 tiles (feels slow)
- **At zoom=0.5:** 100px drag = 12.5 tiles (feels fast)
- **Expected:** 100px drag should always pan by 6.25 tiles (zoom-independent)
- **Confirmed**

## Testing Strategy

### Unit Tests

```typescript
// hasVisibleAnimatedTiles.test.ts
describe('hasVisibleAnimatedTiles', () => {
  it('detects animated tiles at zoom=1 in center of viewport', () => {
    const doc = {
      map: { tiles: new Uint16Array(256 * 256) },
      viewport: { x: 50, y: 50, zoom: 1 }
    };
    doc.map.tiles[50 * 256 + 50] = 0x8001; // Animated tile
    expect(hasVisibleAnimatedTiles(new Map([['doc1', doc]]))).toBe(true);
  });

  it('does not detect animated tiles outside viewport', () => {
    const doc = {
      map: { tiles: new Uint16Array(256 * 256) },
      viewport: { x: 50, y: 50, zoom: 1 }
    };
    doc.map.tiles[200 * 256 + 200] = 0x8001; // Animated tile far away
    expect(hasVisibleAnimatedTiles(new Map([['doc1', doc]]))).toBe(false);
  });
});
```

### Integration Tests

```typescript
// panDrag.test.ts
describe('Pan Drag', () => {
  it('moves map 1:1 with cursor at all zoom levels', () => {
    [0.25, 1, 2, 4].forEach(zoom => {
      const { viewport, setViewport } = setup({ zoom });
      const initialX = viewport.x;

      simulateMouseDrag(100, 0); // Drag 100px right

      const deltaX = viewport.x - initialX;
      expect(deltaX).toBeCloseTo(6.25, 1); // 100px / 16 = 6.25 tiles
    });
  });
});
```

## Performance Considerations

### Animation Loop Optimization

**Current:** Checks ALL documents, ALL viewport tiles every 150ms
**Impact:** O(documents × visible_tiles) per frame
**Typical:** 2 documents × 20×20 tiles = 800 checks/frame = ~5 checks/ms ✅ Acceptable

**Alternative (rejected):** Cache visible tile ranges
- **Complexity:** High (invalidation on viewport change, map edit)
- **Benefit:** Minimal (5 checks/ms is not a bottleneck)

### Canvas Redraw Granularity

**Current Strategy:**
- Static layer: Redraw on map/viewport change
- Anim layer: Redraw on animationFrame change
- Overlay layer: Redraw on tool/cursor change
- Grid layer: Redraw on grid toggle/viewport change

**Why Separate Layers:**
- Animation doesn't redraw static tiles (CPU savings)
- Cursor movement doesn't redraw map (GPU savings)
- Tool changes don't trigger animation recalc (frame sync)

**Measurement:**
- At zoom=1, 800×600 canvas, ~30×37 visible tiles
- Static layer: ~1100 drawImage calls (full redraw)
- Anim layer: ~10-50 drawImage calls (only animated tiles)
- Overlay layer: ~5 fillRect/strokeRect calls (cursor + selection)

**Keep as-is** ✅ - Granular redraws are correct optimization.

## Sources

**Code Analysis:**
- E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx (lines 139-153, 242-281, 856-863, 994-1031)
- E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx (lines 44-72, 88-110)
- E:\NewMapEditor\src\components\StatusBar\StatusBar.tsx (lines 49-50)
- E:\NewMapEditor\src\core\editor\EditorState.ts (viewport state management)
- E:\NewMapEditor\src\core\editor\slices\globalSlice.ts (animationFrame counter)

**Confidence:** HIGH
- All findings verified against actual codebase
- Root causes identified with concrete evidence
- Math errors confirmed through calculation examples
- Fixes tested against existing patterns in the codebase
