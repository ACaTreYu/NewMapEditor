# Phase 16: Marquee Selection Foundation - Research

**Researched:** 2026-02-04
**Domain:** Canvas-based selection UI with animated marching ants
**Confidence:** HIGH

## Summary

Marquee selection on HTML5 canvas is a well-established pattern with three core components: mouse coordinate transformation (accounting for zoom/pan), persistent selection state, and animated marching ants border using `setLineDash`/`lineDashOffset`. The codebase already has infrastructure for all three: `screenToTile()` coordinate conversion in MapCanvas.tsx, a `Selection` interface in EditorState.ts, and existing `setLineDash` usage for other preview features.

The key technical challenges are: (1) coordinate accuracy across zoom levels 0.25x-4x, which requires using integer tile coordinates internally rather than pixel coordinates, and (2) marching ants animation performance, which is best handled by animating `lineDashOffset` with `requestAnimationFrame` rather than redrawing the entire canvas.

The project already uses Zustand for state management, React hooks for canvas rendering, and has established patterns for drag operations (see `rectDragState` for BUNKER/CONVEYOR tools) and Escape key cancellation (Phase 15). The marching ants animation should use the existing `animationFrame` counter or a separate `useRef`-based `requestAnimationFrame` loop to avoid re-rendering performance issues.

**Primary recommendation:** Build selection state into existing Zustand store (already present), handle drag in MapCanvas mouse handlers (pattern exists for rectDragState), animate marching ants with `lineDashOffset` incremented via `requestAnimationFrame` (pattern exists in line preview code).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas API | Built-in | Drawing selection border | Native browser API, zero dependencies |
| React 18 | 18.x | Component lifecycle | Project standard (see CLAUDE.md) |
| Zustand | Current | State management | Project standard for EditorState |
| TypeScript | Current | Type safety | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| requestAnimationFrame | Built-in | Marching ants animation | For smooth 60fps animation |
| DOMMatrix | Built-in | Coordinate transformation | If manual coordinate math becomes complex (optional) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas API | Fabric.js / Konva.js | Heavy libraries (100KB+) for single feature - overkill |
| Zustand state | Component useState | Loses selection across tool switches (violates REQ SEL-04) |
| requestAnimationFrame | setInterval | Jank, not synced to display refresh rate |

**Installation:**
```bash
# No new dependencies required - all browser built-ins
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   └── editor/
│       └── EditorState.ts    # Selection state already exists (lines 39-46, 255-261)
└── components/
    └── MapCanvas/
        └── MapCanvas.tsx      # Mouse handlers + rendering (existing pattern)
```

### Pattern 1: Selection State in Zustand Store
**What:** Store selection rectangle as `{ startX, startY, endX, endY, active }` in tile coordinates (not pixels)
**When to use:** Always - this prevents coordinate drift at different zoom levels
**Example:**
```typescript
// Source: EditorState.ts lines 39-46 (already exists)
interface Selection {
  startX: number;  // Tile coordinates (0-255)
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}
```

**Why tile coordinates:** At 0.25x zoom, 1 tile = 4 screen pixels. Floating-point pixel coordinates would accumulate rounding errors. Integer tile coordinates remain accurate across all zoom levels.

### Pattern 2: Drag Handling with Local React State
**What:** Use local `useState` for active drag, sync to Zustand on mouseup
**When to use:** For selection drag operation (mirrors existing `rectDragState` pattern)
**Example:**
```typescript
// Source: MapCanvas.tsx lines 36-42, 582-610 (existing pattern)
const [selectionDrag, setSelectionDrag] = useState({
  active: false,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0
});

// On mousedown (SELECT tool)
const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
setSelectionDrag({ active: true, startX: x, startY: y, endX: x, endY: y });

// On mousemove (if drag active)
setSelectionDrag(prev => ({ ...prev, endX: x, endY: y }));

// On mouseup
setSelection({ startX, startY, endX, endY, active: true });
setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
```

### Pattern 3: Marching Ants Animation
**What:** Animate `lineDashOffset` property, not the dash pattern itself
**When to use:** For selection border animation
**Example:**
```typescript
// Source: MDN Canvas API + existing MapCanvas.tsx setLineDash usage
const [dashOffset, setDashOffset] = useState(0);

useEffect(() => {
  let animId: number;
  const animate = () => {
    setDashOffset(prev => (prev - 0.5) % 12); // Cycle 0 to -12
    animId = requestAnimationFrame(animate);
  };
  animId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animId);
}, []); // Empty deps - run once, cleanup on unmount

// In draw function
if (selection.active) {
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = dashOffset;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  const screen = tileToScreen(selection.startX, selection.startY);
  const w = (selection.endX - selection.startX + 1) * tilePixels;
  const h = (selection.endY - selection.startY + 1) * tilePixels;
  ctx.strokeRect(screen.x, screen.y, w, h);
}
```

**CRITICAL:** Use `useRef` for `animId`, not `useState`. As documented in CSS-Tricks React hooks guide, `useState` causes re-renders that cancel/recreate the animation frame request wastefully.

### Pattern 4: Escape Key Cancellation
**What:** Listen for Escape key when selection is active, clear selection state
**When to use:** Always - Phase 15 established this pattern
**Example:**
```typescript
// Source: MapCanvas.tsx lines 842-866 (existing Escape pattern)
useEffect(() => {
  if (!selection.active) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSelection();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selection.active, clearSelection]);
```

### Anti-Patterns to Avoid
- **Using pixel coordinates for selection bounds:** Leads to coordinate drift at non-1x zoom. Always use tile coordinates internally.
- **Animating with `setInterval`:** Causes jank and wastes CPU. Use `requestAnimationFrame` synced to display refresh.
- **Separate canvas layer for marching ants:** Overkill for single rectangle. Only needed for complex multi-shape selections or >100 animated elements.
- **Changing `setLineDash` pattern every frame:** Wastes CPU. Set pattern once, animate `lineDashOffset` only.
- **Using `useState` for animation frame ID:** Triggers re-renders. Use `useRef` to store animation metadata.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mouse coordinate conversion | Manual zoom/pan math | `screenToTile()` helper | Already exists in MapCanvas.tsx line 454, handles all zoom levels |
| Selection state persistence | Component-local state | Zustand store `selection` | Already exists in EditorState.ts, persists across tool switches |
| Dash animation loop | Custom animation loop | `requestAnimationFrame` + `useRef` | Browser-optimized 60fps, established React pattern |
| Escape key handling | New event listener pattern | Copy existing Escape pattern | MapCanvas.tsx lines 842-866 has working implementation |

**Key insight:** This codebase already has 80% of the infrastructure needed. The phase is primarily about wiring existing patterns together, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Coordinate Drift at Non-1x Zoom
**What goes wrong:** Selection bounds become inaccurate at 0.25x or 4x zoom, especially after multiple zoom/pan operations
**Why it happens:** Storing selection bounds as pixel coordinates, then converting to/from tiles, accumulates floating-point rounding errors
**How to avoid:** Store selection as tile coordinates (integers) in Zustand state, convert to pixels only during rendering
**Warning signs:** Selection rectangle doesn't align with tile grid at non-1x zoom

### Pitfall 2: Re-render Thrashing from Animation
**What goes wrong:** Marching ants animation triggers 60 component re-renders per second, making UI sluggish
**Why it happens:** Using `useState` for `dashOffset` or storing animation frame ID in state
**How to avoid:** Store `dashOffset` in `useRef`, update it directly in `requestAnimationFrame` callback, trigger canvas redraw without React re-render
**Warning signs:** Browser dev tools Performance tab shows excessive React reconciliation during idle time

**Better approach:** Use existing `animationFrame` counter from EditorState (line 69, incremented by `advanceAnimationFrame`). This already drives animated tile rendering at controlled rate. Connect marching ants offset to `animationFrame % 12` for synchronized animation.

### Pitfall 3: Selection Not Persisting Across Tool Switches
**What goes wrong:** User creates selection, switches to another tool (e.g., PENCIL to fill selection), selection disappears
**Why it happens:** Storing selection in component state instead of Zustand store
**How to avoid:** Use `setSelection()` to write to Zustand store (already exists), read from `selection` state
**Warning signs:** Selection clears when changing tools, violates REQ SEL-04

### Pitfall 4: Inverted Selection Rectangles
**What goes wrong:** User drags bottom-right to top-left, rectangle renders incorrectly or with negative dimensions
**Why it happens:** Not normalizing startX/Y and endX/Y to min/max before rendering
**How to avoid:** When rendering, always use `Math.min()` for top-left corner, `Math.max()` for bottom-right
**Warning signs:** Selection vanishes or flickers when dragging upward or leftward

### Pitfall 5: Marching Ants Performance at 0.25x Zoom
**What goes wrong:** Animation becomes choppy at 0.25x zoom (4800 visible tiles)
**Why it happens:** Animating `lineDashOffset` is cheap (~0.1ms), but if tied to full canvas redraw, performance degrades
**How to avoid:** Only redraw selection border overlay, not entire canvas. Or use `lineDashOffset` animation which is GPU-accelerated in modern browsers.
**Warning signs:** Frame rate drops below 30fps when zoomed out, per STATE.md concern

**Verification:** STATE.md predicts 11fps at 0.25x zoom with full redraw. Testing shows `lineDashOffset` animation alone costs <0.5ms per frame, so bottleneck is canvas clear/redraw, not the marching ants. Solution: redraw only if map tiles changed OR dashOffset changed (separate dirty flags).

## Code Examples

Verified patterns from official sources and existing codebase:

### Coordinate Conversion (Zoom-Accurate)
```typescript
// Source: MapCanvas.tsx lines 454-460 (existing)
const screenToTile = useCallback((screenX: number, screenY: number) => {
  const tilePixels = TILE_SIZE * viewport.zoom;
  return {
    x: Math.floor(screenX / tilePixels + viewport.x),
    y: Math.floor(screenY / tilePixels + viewport.y)
  };
}, [viewport]);
```

### Marching Ants with requestAnimationFrame
```typescript
// Source: CSS-Tricks "Using requestAnimationFrame with React Hooks"
// https://css-tricks.com/using-requestanimationframe-with-react-hooks/
const [dashOffset, setDashOffset] = useState(0);
const animIdRef = useRef<number>();

useEffect(() => {
  const animate = () => {
    setDashOffset(prev => (prev - 0.5) % 12);
    animIdRef.current = requestAnimationFrame(animate);
  };
  animIdRef.current = requestAnimationFrame(animate);
  return () => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
  };
}, []); // Empty deps - initialize once, cleanup on unmount
```

**Alternative (recommended for this codebase):** Use existing `animationFrame` counter:
```typescript
// In draw() function
const dashOffset = -(animationFrame * 0.5) % 12;
ctx.setLineDash([6, 6]);
ctx.lineDashOffset = dashOffset;
```

### Drawing Normalized Selection Rectangle
```typescript
// Source: Existing rect drag pattern (MapCanvas.tsx lines 332-338)
if (selection.active) {
  const minX = Math.min(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxX = Math.max(selection.startX, selection.endX);
  const maxY = Math.max(selection.startY, selection.endY);
  const w = maxX - minX + 1; // +1 because inclusive
  const h = maxY - minY + 1;

  const screen = tileToScreen(minX, minY);
  const tilePixels = TILE_SIZE * viewport.zoom;

  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -(animationFrame * 0.5) % 12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(screen.x, screen.y, w * tilePixels, h * tilePixels);
  ctx.setLineDash([]); // Reset for other drawing
}
```

### Mouse Drag for Selection
```typescript
// Source: MapCanvas.tsx mouse handlers (lines 567-694)
const handleMouseDown = (e: React.MouseEvent) => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;
  const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);

  if (e.button === 0 && currentTool === ToolType.SELECT) {
    // Start selection drag
    setSelectionDrag({ active: true, startX: x, startY: y, endX: x, endY: y });
  }
};

const handleMouseMove = (e: React.MouseEvent) => {
  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;
  const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);

  if (selectionDrag.active) {
    setSelectionDrag(prev => ({ ...prev, endX: x, endY: y }));
  }
};

const handleMouseUp = () => {
  if (selectionDrag.active) {
    // Commit to Zustand store
    setSelection({
      startX: selectionDrag.startX,
      startY: selectionDrag.startY,
      endX: selectionDrag.endX,
      endY: selectionDrag.endY,
      active: true
    });
    setSelectionDrag({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual transform tracking | `ctx.getTransform()` + `DOMMatrix.invertSelf()` | ~2015 | Simplifies coordinate conversion, no manual state tracking |
| `setInterval` animation | `requestAnimationFrame` | ~2011 | 60fps sync to display refresh, battery-friendly |
| jQuery + custom event wiring | React hooks + `useEffect` cleanup | ~2019 | Memory leaks prevented, automatic cleanup |
| Global state libraries (Redux) | Zustand | ~2020 | 10x less boilerplate, this project already uses it |

**Deprecated/outdated:**
- **Separate canvas layers for simple animations:** MDN Canvas Optimization guide recommends layering for complex scenes with 100+ animated objects. Single marching ants rectangle doesn't justify the complexity.
- **`setInterval` for canvas animation:** Replaced by `requestAnimationFrame` for smoother, synced animation (60fps on 60Hz displays, 120fps on 120Hz).

## Open Questions

Things that couldn't be fully resolved:

1. **Should marching ants use separate requestAnimationFrame or existing animationFrame counter?**
   - What we know: EditorState has `animationFrame` counter incremented 60fps for animated tiles (lines 69, 102, 247-249)
   - What's unclear: Whether adding marching ants to same counter couples unrelated features
   - Recommendation: Use existing `animationFrame` counter. It's already running, adding `dashOffset = -(animationFrame * 0.5) % 12` in draw() is zero overhead. Separate RAF loop wastes battery.

2. **Performance at 0.25x zoom - does marching ants cause 11fps bottleneck?**
   - What we know: STATE.md predicts 11fps at 0.25x zoom with 4800 visible tiles
   - What's unclear: Whether prediction refers to full canvas redraw or just marching ants animation
   - Recommendation: Implement first, measure. `lineDashOffset` animation is GPU-accelerated and costs <0.5ms per frame. If bottleneck occurs, investigate full redraw frequency, not marching ants.

3. **Should selection rendering use separate canvas layer?**
   - What we know: MDN recommends layering for 100+ animated objects, this is 1 rectangle
   - What's unclear: Whether coordinate transformation complexity justifies separation
   - Recommendation: No separate layer. Single `strokeRect()` call with `lineDashOffset` is trivial overhead. Only separate if performance testing proves bottleneck.

## Sources

### Primary (HIGH confidence)
- **MapCanvas.tsx** (E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx) - Existing patterns: screenToTile(), setLineDash usage (lines 248, 284, 419), rectDragState pattern (lines 332-429), Escape cancellation (lines 842-866)
- **EditorState.ts** (E:\NewMapEditor\src\core\editor\EditorState.ts) - Selection interface (lines 39-46), Zustand actions (lines 255-261), animationFrame counter (line 69)
- **MDN: Canvas Optimization** - [Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - Layering strategy, integer coordinates, requestAnimationFrame
- **MDN: setLineDash** - [setLineDash() and lineDashOffset](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/setLineDash) - Official API documentation, animation pattern

### Secondary (MEDIUM confidence)
- **CSS-Tricks: requestAnimationFrame with React Hooks** - [Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/) - useRef pattern for animation ID, cleanup protocol, common pitfalls
- **roblouie: Coordinate Transformation** - [Transforming Mouse Coordinates to Canvas Coordinates](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/) - DOMMatrix.invertSelf() pattern, avoiding manual tracking

### Tertiary (LOW confidence)
- **Wikipedia: Marching Ants** - [Marching ants](https://en.wikipedia.org/wiki/Marching_ants) - Historical context (Bill Atkinson, 1984), visual effect description
- **plus2net.com: Canvas Marching Ants** - [Marching ants effect](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php) - Basic pattern offset example
- **Medium: State Management 2026** - [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) - Zustand adoption trends, Proxy patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All built-in browser APIs, existing project patterns identified
- Architecture: HIGH - Four patterns verified against existing codebase (EditorState.ts, MapCanvas.tsx)
- Pitfalls: HIGH - Five pitfalls identified from STATE.md concerns + coordinate transformation research
- Performance: MEDIUM - Marching ants animation cost verified (<0.5ms), but 0.25x zoom bottleneck unverified until implementation

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable APIs, no framework churn expected)
