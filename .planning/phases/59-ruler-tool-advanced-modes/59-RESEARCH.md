# Phase 59: Ruler Tool — Advanced Modes - Research

**Researched:** 2026-02-13
**Domain:** Canvas UI measurement tools, multi-modal tool patterns, React state management
**Confidence:** HIGH

## Summary

Phase 59 extends the ruler tool (Phase 58) with three additional measurement modes: rectangle (area + tile count), path (multi-point cumulative distance), and radius (circle from center). Users can pin measurements to persist multiple overlays simultaneously. This requires mode selection UI, mode-specific mouse handlers, and a pinned measurements collection in Zustand state.

Research confirms all features use existing patterns with zero new dependencies. Rectangle mode reuses the ref-based drag pattern from Phase 58 (line mode). Path mode uses click-to-add waypoint accumulation (similar to polygon tools in GIS/CAD). Radius mode uses center-drag pattern like circle drawing tools. Pinning requires migrating from single `rulerMeasurement` to an array of pinned measurements with unique IDs.

**Primary recommendation:** Use a `rulerMode` enum in GlobalSlice (line/rectangle/path/radius), mode-specific rendering in drawUiLayer, and a `pinnedMeasurements: Array<{id, mode, data}>` collection for persistence. All modes share the same ref-based drag pattern established in Phase 58.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Already in use (existing dependency) |
| Zustand | 4.x | State management | Project standard for editor state |
| Canvas API | Native | Rendering overlays | Zero-dependency, project standard |
| TypeScript | 5.x | Type safety | Project standard, compile-time safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons/lu | 0.x | Lucide icons for mode buttons | Used for toolbar icons (existing) |
| Math API (native) | N/A | Math.hypot, Math.PI, Math.sqrt | Distance/area/radius calculations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Enum for modes | String literals | Enum provides type safety, autocomplete, prevents typos |
| Array for pinned | Map with IDs | Array is simpler, Map only beneficial for frequent lookups by ID (not needed) |
| localStorage for pins | In-memory only | localStorage adds persistence across sessions but increases complexity (deferred to future) |

**Installation:**
```bash
# No new dependencies required - all patterns use existing stack
```

## Architecture Patterns

### Recommended State Structure

**GlobalSlice extensions:**
```typescript
// In src/core/editor/slices/globalSlice.ts
export enum RulerMode {
  LINE = 'line',
  RECTANGLE = 'rectangle',
  PATH = 'path',
  RADIUS = 'radius'
}

export interface RulerMeasurement {
  mode: RulerMode;
  // Line mode
  dx?: number;
  dy?: number;
  manhattan?: number;
  euclidean?: number;
  // Rectangle mode
  width?: number;
  height?: number;
  tileCount?: number;
  // Path mode
  waypoints?: Array<{ x: number; y: number }>;
  totalDistance?: number;
  // Radius mode
  centerX?: number;
  centerY?: number;
  radius?: number;
  area?: number;
}

export interface PinnedMeasurement {
  id: string; // Date.now() or crypto.randomUUID()
  measurement: RulerMeasurement;
}

interface GlobalSlice {
  // ...existing fields
  rulerMode: RulerMode;
  rulerMeasurement: RulerMeasurement | null;
  pinnedMeasurements: PinnedMeasurement[];

  // Actions
  setRulerMode: (mode: RulerMode) => void;
  setRulerMeasurement: (measurement: RulerMeasurement | null) => void;
  pinMeasurement: () => void; // Pins current rulerMeasurement
  unpinMeasurement: (id: string) => void;
  clearAllPinnedMeasurements: () => void;
}
```

**Ref-based transient state (MapCanvas.tsx):**
```typescript
// Existing pattern from Phase 58 line mode
interface RulerState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  // Path mode additions
  waypoints: Array<{ x: number; y: number }>; // Empty for non-path modes
}

const rulerStateRef = useRef<RulerState>({
  active: false,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  waypoints: []
});
```

### Pattern 1: Mode-Specific Mouse Handlers

**What:** Branch mouse handlers based on `currentRulerMode` to handle different interaction patterns per mode.

**When to use:** Multi-modal tools where each mode has distinct click/drag behavior.

**Example:**
```typescript
// In handleMouseDown
if (currentTool === ToolType.RULER && e.button === 0) {
  if (rulerMode === RulerMode.LINE || rulerMode === RulerMode.RECTANGLE || rulerMode === RulerMode.RADIUS) {
    // Click-drag modes: set start point
    rulerStateRef.current = {
      active: true,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      waypoints: []
    };
  } else if (rulerMode === RulerMode.PATH) {
    // Click-to-add-waypoint mode
    if (!rulerStateRef.current.active) {
      // First click: start path
      rulerStateRef.current = {
        active: true,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        waypoints: [{ x, y }]
      };
    } else {
      // Subsequent clicks: add waypoint
      rulerStateRef.current.waypoints.push({ x, y });
    }
  }
  requestUiRedraw();
  return;
}

// In handleMouseMove
if (rulerStateRef.current.active) {
  const prev = rulerStateRef.current;
  if (prev.endX !== x || prev.endY !== y) {
    rulerStateRef.current = { ...prev, endX: x, endY: y };

    // Update Zustand based on mode
    if (rulerMode === RulerMode.LINE) {
      const dx = Math.abs(x - prev.startX);
      const dy = Math.abs(y - prev.startY);
      setRulerMeasurement({
        mode: RulerMode.LINE,
        dx, dy,
        manhattan: dx + dy,
        euclidean: Math.hypot(dx, dy)
      });
    } else if (rulerMode === RulerMode.RECTANGLE) {
      const width = Math.abs(x - prev.startX);
      const height = Math.abs(y - prev.startY);
      setRulerMeasurement({
        mode: RulerMode.RECTANGLE,
        width, height,
        tileCount: width * height
      });
    } else if (rulerMode === RulerMode.RADIUS) {
      const radius = Math.hypot(x - prev.startX, y - prev.startY);
      setRulerMeasurement({
        mode: RulerMode.RADIUS,
        centerX: prev.startX,
        centerY: prev.startY,
        radius,
        area: Math.PI * radius * radius
      });
    } else if (rulerMode === RulerMode.PATH && prev.waypoints.length > 0) {
      // Calculate cumulative distance
      let total = 0;
      for (let i = 0; i < prev.waypoints.length - 1; i++) {
        const wp1 = prev.waypoints[i];
        const wp2 = prev.waypoints[i + 1];
        total += Math.hypot(wp2.x - wp1.x, wp2.y - wp1.y);
      }
      // Add preview segment to cursor
      const last = prev.waypoints[prev.waypoints.length - 1];
      total += Math.hypot(x - last.x, y - last.y);

      setRulerMeasurement({
        mode: RulerMode.PATH,
        waypoints: [...prev.waypoints, { x, y }],
        totalDistance: total
      });
    }

    requestUiRedraw();
  }
  return;
}
```

### Pattern 2: Mode-Specific Rendering

**What:** Render different overlay shapes based on measurement mode.

**When to use:** Visual feedback must match interaction mode.

**Example:**
```typescript
// In drawUiLayer
if (rulerStateRef.current.active && currentTool === ToolType.RULER) {
  const { startX, startY, endX, endY, waypoints } = rulerStateRef.current;

  if (rulerMode === RulerMode.LINE) {
    // Existing Phase 58 line rendering (yellow line + crosshairs)
  } else if (rulerMode === RulerMode.RECTANGLE) {
    // Rectangle outline
    const startScreen = tileToScreen(startX, startY, overrideViewport);
    const endScreen = tileToScreen(endX, endY, overrideViewport);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(
      startScreen.x,
      startScreen.y,
      endScreen.x - startScreen.x,
      endScreen.y - startScreen.y
    );
  } else if (rulerMode === RulerMode.RADIUS) {
    // Circle from center to cursor
    const centerScreen = tileToScreen(startX, startY, overrideViewport);
    const endScreen = tileToScreen(endX, endY, overrideViewport);
    const radiusScreen = Math.hypot(
      endScreen.x - centerScreen.x,
      endScreen.y - centerScreen.y
    );
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, radiusScreen, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (rulerMode === RulerMode.PATH && waypoints.length > 0) {
    // Polyline through waypoints + preview to cursor
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    const firstScreen = tileToScreen(waypoints[0].x, waypoints[0].y, overrideViewport);
    ctx.moveTo(firstScreen.x, firstScreen.y);
    for (let i = 1; i < waypoints.length; i++) {
      const wpScreen = tileToScreen(waypoints[i].x, waypoints[i].y, overrideViewport);
      ctx.lineTo(wpScreen.x, wpScreen.y);
    }
    // Preview segment to cursor
    const cursorScreen = tileToScreen(endX, endY, overrideViewport);
    ctx.lineTo(cursorScreen.x, cursorScreen.y);
    ctx.stroke();
  }
}
```

### Pattern 3: Pinned Measurement Collection

**What:** Store array of pinned measurements in Zustand, render all in drawUiLayer.

**When to use:** Persistent overlays that survive mode changes and new measurements.

**Example:**
```typescript
// In drawUiLayer (after active measurement rendering)
for (const pinned of pinnedMeasurements) {
  const { mode, ...data } = pinned.measurement;

  if (mode === RulerMode.LINE && data.dx !== undefined && data.dy !== undefined) {
    // Render pinned line (faded or different color)
    // Use data.startX, data.endX from stored measurement
  } else if (mode === RulerMode.RECTANGLE && data.width !== undefined) {
    // Render pinned rectangle
  } else if (mode === RulerMode.RADIUS && data.radius !== undefined) {
    // Render pinned circle
  } else if (mode === RulerMode.PATH && data.waypoints) {
    // Render pinned path
  }
}
```

**Pinning action:**
```typescript
pinMeasurement: () => set((state) => {
  if (!state.rulerMeasurement) return {};
  const pinned: PinnedMeasurement = {
    id: Date.now().toString(), // or crypto.randomUUID() if available
    measurement: state.rulerMeasurement
  };
  return {
    pinnedMeasurements: [...state.pinnedMeasurements, pinned]
  };
}),

unpinMeasurement: (id) => set((state) => ({
  pinnedMeasurements: state.pinnedMeasurements.filter(p => p.id !== id)
})),

clearAllPinnedMeasurements: () => set({ pinnedMeasurements: [] })
```

### Pattern 4: Mode Selection UI

**What:** Toolbar dropdown or button group to switch between ruler modes.

**When to use:** Tool has multiple distinct modes requiring explicit user selection.

**Example:**
```typescript
// In ToolBar.tsx or StatusBar.tsx
const RULER_MODES = [
  { mode: RulerMode.LINE, label: 'Line', icon: '📏' },
  { mode: RulerMode.RECTANGLE, label: 'Rectangle', icon: '▭' },
  { mode: RulerMode.PATH, label: 'Path', icon: '⤷' },
  { mode: RulerMode.RADIUS, label: 'Radius', icon: '◯' }
];

<div className="ruler-mode-selector">
  {RULER_MODES.map(({ mode, label, icon }) => (
    <button
      key={mode}
      className={rulerMode === mode ? 'active' : ''}
      onClick={() => setRulerMode(mode)}
      title={label}
    >
      {icon}
    </button>
  ))}
</div>
```

**Alternative:** Use keyboard shortcuts (L for line, R for rectangle, P for path, C for circle) like Photoshop's tool modifiers.

### Anti-Patterns to Avoid

- **Separate refs per mode:** Don't create `lineStateRef`, `rectStateRef`, `pathStateRef`, `radiusStateRef` — use single `rulerStateRef` with mode-agnostic fields (startX/Y, endX/Y, waypoints). Keeps code DRY.
- **Storing pinned measurements in refs:** Pinned measurements must persist across tool changes, so they belong in Zustand, not refs. Refs reset on unmount.
- **Hard-coding mode checks:** Use switch statements or lookup tables instead of if-else chains for mode-specific logic. More maintainable.
- **Mixing screen and tile coordinates:** Always store tile coordinates, convert to screen for rendering. Prevents zoom drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique IDs | Custom counter | `Date.now().toString()` or `crypto.randomUUID()` | Built-in, collision-resistant, no state needed |
| Circle area calculation | Manual formula | `Math.PI * radius * radius` | Built-in Math.PI constant, accurate |
| Polyline distance sum | Loop with temp vars | Array.reduce or for-loop accumulator | Standard pattern, readable |
| Color pickers | Custom HTML input | `<input type="color">` | Native browser support, accessible |
| Mode icons | Custom SVG | Lucide icons or Unicode symbols | Existing dependency, consistent with toolbar |

**Key insight:** Measurement geometry is well-trodden territory — use Math API and standard Canvas drawing primitives. Don't reinvent Pythagorean theorem or circle rendering.

## Common Pitfalls

### Pitfall 1: Path Mode Completion Ambiguity

**What goes wrong:** User doesn't know how to finish a path (clicks keep adding waypoints indefinitely).

**Why it happens:** No explicit "done" action for path mode (unlike drag modes which complete on mouseup).

**How to avoid:**
- **Double-click to finish path** (industry standard in GIS/CAD tools, e.g., QGIS, AutoCAD)
- **Escape to finish path** (already used for cancel, so this would be "commit and finish")
- **Right-click to finish path** (some tools use right-click as "complete")
- **Close path by clicking near start point** (snap-to-start threshold, common in polygon drawing)

**Warning signs:** Users report "can't get out of path mode" or "how do I stop adding points?"

**Recommendation:** Use double-click to finish path (standard), Escape to cancel/clear path (consistent with Phase 58).

### Pitfall 2: Pinned Measurements Coordinate Storage

**What goes wrong:** Pinned measurements disappear or move incorrectly after zoom changes.

**Why it happens:** Storing screen coordinates instead of tile coordinates, or not storing enough data to reconstruct rendering.

**How to avoid:**
- Store tile coordinates in pinned measurements, NOT screen coordinates
- For line mode: store `{ startX, startY, endX, endY }` in tiles
- For rectangle mode: store corner tile coordinates
- For radius mode: store `{ centerX, centerY, radius }` in tiles
- For path mode: store `waypoints: Array<{x, y}>` in tiles
- Convert to screen coordinates at render time using tileToScreen

**Warning signs:** Pinned measurements shift position when zooming, or disappear entirely.

### Pitfall 3: Mode Switch Cleanup

**What goes wrong:** Switching from path mode to line mode leaves waypoints in rulerStateRef, causing incorrect rendering.

**Why it happens:** Not resetting mode-specific state fields when mode changes.

**How to avoid:**
- Add `useEffect(() => { /* clear rulerStateRef.waypoints */ }, [rulerMode])` to reset transient state on mode change
- Or clear all transient state when mode changes (simplest)
- Follow existing pattern from Phase 58 tool switch cleanup (lines 1442-1464 in MapCanvas.tsx)

**Warning signs:** Leftover visual artifacts from previous mode, incorrect calculations mixing mode data.

### Pitfall 4: Status Bar Overflow

**What goes wrong:** Status bar text gets very long with multiple measurements displayed, wrapping or clipping.

**Why it happens:** Rectangle mode shows "Width × Height (N tiles)", path mode shows "Path: N points, Dist: X", radius shows "Radius: X, Area: Y" — all verbose.

**How to avoid:**
- Use compact notation: "Rect: 10×5 (50)" instead of "Rectangle: Width 10, Height 5, Tile Count 50"
- Show only active measurement in status bar, not pinned measurements (pinned measurements visible on canvas only)
- Use abbreviations: "Path: 5pts, 42.3t" instead of "Path: 5 waypoints, 42.3 tiles"
- Fallback to icon-only display with tooltips if space is tight

**Warning signs:** Status bar text truncated with "..." or wrapping to multiple lines.

## Code Examples

Verified patterns from project codebase:

### Coordinate Transform (Phase 58, MapCanvas.tsx lines 164-169, 792-794)

```typescript
// Tile to screen (viewport-aware)
const tileToScreen = useCallback((tileX: number, tileY: number, overrideViewport?: ViewportOverride) => {
  const vp = overrideViewport ?? viewport;
  const tilePixels = TILE_SIZE * vp.zoom;
  return {
    x: (tileX - vp.x) * tilePixels,
    y: (tileY - vp.y) * tilePixels
  };
}, [viewport]);

// Screen to tile (viewport-aware)
const screenToTile = useCallback((screenX: number, screenY: number) => {
  const tilePixels = TILE_SIZE * viewport.zoom;
  return {
    x: Math.floor(viewport.x + screenX / tilePixels),
    y: Math.floor(viewport.y + screenY / tilePixels)
  };
}, [viewport]);
```

**Usage:** Always use these functions for coordinate conversion. Never manually calculate `x * zoom` — viewport offset must be accounted for.

### Tool Cleanup on Switch (Phase 58, MapCanvas.tsx lines 1442-1464)

```typescript
// Cancel active drags when tool switches (TOOL-03)
useEffect(() => {
  // Cancel rect drag
  if (rectDragRef.current.active) {
    rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    requestUiRedraw();
  }
  // Cancel line preview
  if (lineStateRef.current.active) {
    lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    requestUiRedraw();
  }
  // Cancel ruler measurement (RULER-01)
  if (rulerStateRef.current.active) {
    rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
    setRulerMeasurement(null);
    requestUiRedraw();
  }
}, [currentTool]);
```

**Pattern:** Add mode-specific cleanup to this useEffect when implementing mode switching (clear waypoints, reset mode-specific flags).

### Floating Label Positioning (Phase 57, MapCanvas.tsx lines 658-689)

```typescript
// Floating label with edge-aware positioning
const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)})`;
ctx.font = '13px sans-serif';
const metrics = ctx.measureText(labelText);
const textWidth = metrics.width;
const textHeight = 18;
const pad = 4;

// Midpoint position
let labelX = (startCenterX + endCenterX) / 2 - textWidth / 2;
let labelY = (startCenterY + endCenterY) / 2;

// Edge clipping fallbacks
if (labelX < 0) labelX = 0;
if (labelY - textHeight < 0) labelY = textHeight;
if (labelX + textWidth > canvas.width) labelX = canvas.width - textWidth;
if (labelY > canvas.height) labelY = canvas.height;

// Background
ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

// Text
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'left';
ctx.textBaseline = 'bottom';
ctx.fillText(labelText, labelX, labelY);
```

**Pattern:** Use for all mode-specific floating labels. Ensure label stays on-screen at all zoom levels.

### Euclidean Distance Calculation (Phase 58, MapCanvas.tsx line 1102)

```typescript
// Manhattan distance (tile-grid)
const dx = Math.abs(x - prev.startX);
const dy = Math.abs(y - prev.startY);
const manhattan = dx + dy;

// Euclidean distance (straight-line)
const euclidean = Math.hypot(dx, dy);
```

**Pattern:** `Math.hypot(dx, dy)` is equivalent to `Math.sqrt(dx*dx + dy*dy)` but more accurate for edge cases. Always use for Euclidean distance.

### Circle Rendering (Standard Canvas API)

```typescript
// Draw circle with center and radius (in screen coordinates)
ctx.strokeStyle = '#FFD700';
ctx.lineWidth = 2;
ctx.setLineDash([]);
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
ctx.stroke();

// Calculate area (in tile units)
const area = Math.PI * radiusTiles * radiusTiles;
```

**Pattern:** Use `ctx.arc(x, y, radius, 0, 2*Math.PI)` for full circle. Radius parameter is in screen pixels at render time.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single ruler tool | Multi-mode ruler (line/rect/path/radius) | 2020s (QGIS, AutoCAD) | Users measure complex shapes without tool switching |
| Measurement disappears on tool change | Pin/lock measurements to persist | 2010s (CAD/GIS standard) | Compare multiple measurements, reference during editing |
| String mode identifiers | TypeScript enums for modes | TypeScript adoption | Type safety, autocomplete, compile-time checks |
| localStorage for all UI state | Zustand with selective persistence | React state management evolution | In-memory state is faster, persist only settings that benefit |

**Deprecated/outdated:**
- **Single measurement at a time:** Modern tools support pinning multiple measurements for comparison (this phase implements pinning)
- **Fixed mode per tool activation:** Tools now have sub-modes switchable without leaving the tool (mode selector in toolbar)
- **Manual cleanup in componentWillUnmount:** useEffect with dependency arrays handle cleanup declaratively

## Real-World Implementations

### Avenza MAP Measurement Tool
Source: [MAP Measurement Tool – Avenza Systems](https://support.avenza.com/hc/en-us/articles/360043635852-MAP-Measurement-Tool)

**Features:**
- Measures distances (two points), path distances (multiple points), azimuths, perimeter and area
- Hold Shift to add new points on path
- Total distance label shows cumulative length + distance from last point to cursor (real-time preview)
- Click checkmark or press Enter to finish measurement

**Pattern to adopt:** Real-time distance preview for path mode (total distance + preview segment).

### GIMP Measure Tool
Source: [GIMP/Measure Tool - Wikibooks](https://en.wikibooks.org/wiki/GIMP/Measure_Tool)

**Features:**
- Measures length, width, height, angle
- Information shown in status bar
- No distinct modes (single line measurement)

**Pattern to adopt:** Status bar display format (compact, single line).

### Photoshop Ruler Tool
Source: [Ruler Tool Tips for Photoshop](https://photorelive.com/blog/photoshop/tips-on-how-to-use-the-ruler-tool-in-photoshop)

**Features:**
- Measures distances, angles, straightness
- Custom measurement scale support
- Single-purpose tool (no modes)

**Pattern to note:** Photoshop doesn't have multi-mode ruler — separate tools for different shapes (consistent with Phase 58 decision to add modes to single tool).

### AutoCAD Distance Tool (Cumulative)
Source: [To Find the Cumulative Distance Between a Series of Points | AutoCAD](https://knowledge.autodesk.com/support/autocad/learn-explore/caas/CloudHelp/cloudhelp/2016/ENU/AutoCAD-Core/files/GUID-577B54DC-6895-4AD0-BEE4-B02B0EE5D5A3-htm.html)

**Features:**
- Measures cumulative distance between multiple points
- Click points sequentially, Enter to finish
- Displays total distance

**Pattern to adopt:** Enter or double-click to finish path (explicit completion action).

## Open Questions

1. **Pin Keyboard Shortcut**
   - What we know: Common shortcuts in CAD/image editors are Ctrl+K (pin), Ctrl+Shift+K (unpin all), or dedicated toolbar button
   - What's unclear: Should pin be automatic on measurement completion, or explicit user action?
   - Recommendation: Explicit pin action via keyboard shortcut (P key when measurement active) or toolbar button "Pin Measurement". Allows quick measurements without cluttering canvas.

2. **Pinned Measurement Visual Distinction**
   - What we know: Pinned measurements should be visually distinct from active measurement (faded color, dashed line, or different opacity)
   - What's unclear: Optimal visual encoding (color vs opacity vs line style)
   - Recommendation: Use 50% opacity + dashed line for pinned measurements (gold color retained for consistency). Active measurement remains solid gold 100% opacity.

3. **Path Mode Completion UX**
   - What we know: Industry uses double-click (GIS), Enter key (CAD), or right-click (some image editors)
   - What's unclear: Best fit for tile map editor context (game designers, not CAD professionals)
   - Recommendation: Double-click to finish path (most intuitive, no keyboard needed), Escape to cancel entire path (consistent with Phase 58).

4. **Maximum Pinned Measurements**
   - What we know: No limit risks performance issues with hundreds of overlays, memory bloat
   - What's unclear: Reasonable limit for tile map editing use case
   - Recommendation: Start with no enforced limit (trust user judgment), add limit if performance issues arise (likely 50-100 pinned measurements is safe).

5. **Mode Selector Location**
   - What we know: Could go in toolbar (near ruler button), status bar (context area), or floating palette
   - What's unclear: Best UX for mode switching without cluttering UI
   - Recommendation: Add mode buttons to status bar (right side, before resize grip) when ruler tool is active. Saves toolbar space, contextually visible only when relevant.

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: MapCanvas.tsx, globalSlice.ts, StatusBar.tsx (Phase 58 implementation)
- Phase 58-01-PLAN.md and 58-VERIFICATION.md (ruler tool line mode patterns)
- Phase 56-01-PLAN.md (grid settings localStorage persistence pattern)
- Phase 57-01-PLAN.md (floating label positioning pattern)

### Secondary (MEDIUM confidence)
- [GIMP/Measure Tool - Wikibooks](https://en.wikibooks.org/wiki/GIMP/Measure_Tool) — Ruler tool UX patterns in GIMP
- [MAP Measurement Tool – Avenza Systems](https://support.avenza.com/hc/en-us/articles/360043635852-MAP-Measurement-Tool) — Multi-mode measurement tool with path/area support
- [AutoCAD Cumulative Distance](https://knowledge.autodesk.com/support/autocad/learn-explore/caas/CloudHelp/cloudhelp/2016/ENU/AutoCAD-Core/files/GUID-577B54DC-6895-4AD0-BEE4-B02B0EE5D5A3-htm.html) — Multi-point path distance pattern
- [React Canvas State Management Discussion](https://lavrton.com/how-to-optimise-rendering-of-a-set-of-elements-in-react-ad01f5b161ae/) — Optimizing React canvas rendering with multiple elements
- [Photoshop Elements Pixel Measurement](https://community.adobe.com/t5/photoshop-elements-discussions/how-can-i-measure-selected-area-of-pixels-using-photoshop-elements-12/td-p/5725604) — Rectangle area measurement UI pattern

### Tertiary (LOW confidence)
- General UI/UX design trends 2026 (not ruler-tool-specific, used for general UI pattern awareness)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All existing dependencies, zero new libraries required
- Architecture: HIGH — Extends Phase 58 patterns directly, all patterns validated in codebase
- Pitfalls: MEDIUM-HIGH — Coordinate storage and mode cleanup pitfalls are well-understood, path completion UX requires user testing

**Research date:** 2026-02-13
**Valid until:** ~60 days (stable patterns, no fast-moving dependencies)
