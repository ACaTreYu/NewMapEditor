# Phase 63: Ruler Angle Display - Research

**Researched:** 2026-02-14
**Domain:** Canvas angle calculation and UI rendering
**Confidence:** HIGH

## Summary

Phase 63 adds angle measurements to the ruler tool's LINE and PATH modes. The implementation uses JavaScript's `Math.atan2()` to calculate angles from coordinate deltas, converts radians to degrees, and displays the values alongside existing distance measurements in both the transient overlay (during drag) and the status bar (when finalized).

The existing architecture already supports this cleanly: ruler measurements are stored in `rulerMeasurement` state (globalSlice.ts), calculated during mouse events (MapCanvas.tsx), rendered in the UI overlay (MapCanvas.tsx drawUiLayer), and displayed in the status bar (StatusBar.tsx). Angles are simply additional calculated fields that follow the same data flow.

**Primary recommendation:** Add `angle?: number` to LINE mode measurement, and `segmentAngles?: number[]` to PATH mode measurement. Calculate using `Math.atan2(dy, dx) * 180 / Math.PI` and normalize to 0-360° range. Display inline with existing labels using standard math convention (0° = right/east, increases counterclockwise).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Math.atan2() | Native ES5 | Angle calculation from coordinates | Standard JavaScript for angle from two points, handles all quadrants correctly |
| Canvas 2D API | Native | Text rendering overlay | Already used extensively for ruler rendering in MapCanvas |
| Zustand | 4.x (project) | State management | Already used for rulerMeasurement state |

### Supporting

No additional libraries needed. All functionality is native JavaScript/Canvas.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Math.atan2() | Math.atan() | atan() doesn't handle quadrants correctly, requires manual quadrant detection |
| Degree display | Radian display | Degrees are more intuitive for users (360° circle vs 2π radians) |
| 0-360° range | -180° to +180° range | 0-360° is clearer for compass/protractor mental model |

**Installation:** None required (native APIs only)

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes are additions to existing files:

```
src/
├── core/editor/slices/globalSlice.ts  # Add angle fields to rulerMeasurement type
├── utils/measurementFormatter.ts      # Update formatMeasurement to include angles
├── components/
│   ├── MapCanvas/MapCanvas.tsx        # Calculate angles in mouse handlers, render in overlay
│   └── StatusBar/StatusBar.tsx        # Display angle in measurement readout
```

### Pattern 1: Angle Calculation from Deltas

**What:** Use `Math.atan2(dy, dx)` to calculate angle from coordinate deltas, convert to degrees, normalize to 0-360° range.

**When to use:** Any time you need angle from two points (start and end coordinates).

**Example:**
```typescript
// Standard math convention: 0° = right, 90° = up, 180° = left, 270° = down
const dx = endX - startX;  // NOT absolute value — direction matters
const dy = startY - endY;  // Inverted: canvas Y increases downward, but we want 0° = right, 90° = up
const angleRad = Math.atan2(dy, dx);
let angleDeg = angleRad * 180 / Math.PI;
if (angleDeg < 0) angleDeg += 360;  // Normalize to 0-360° range
```

**Critical detail:** Canvas Y coordinates increase downward (0 at top), but standard math convention has Y increasing upward. To get standard angles (90° = up), invert the Y delta: `dy = startY - endY` instead of `endY - startY`.

**Source:** [Math.atan2() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2)

### Pattern 2: Ref-Based Transient State for Ruler

**What:** Ruler uses `rulerStateRef.current` for transient interaction state (start/end coords, waypoints), updates Zustand `rulerMeasurement` only when calculation changes.

**When to use:** Already established pattern in Phase 60. Angle calculation follows this same flow.

**Example (existing pattern):**
```typescript
// In handleMouseMove:
if (prev.endX !== x || prev.endY !== y) {
  rulerStateRef.current = { ...prev, endX: x, endY: y };

  const dx = Math.abs(x - prev.startX);
  const dy = Math.abs(y - prev.startY);
  setRulerMeasurement({
    mode: RulerMode.LINE,
    dx, dy,
    manhattan: dx + dy,
    euclidean: Math.hypot(dx, dy),
    startX: prev.startX, startY: prev.startY,
    endX: x, endY: y
  });
}
```

**For Phase 63:** Add angle calculation inside the same block, include in setRulerMeasurement call.

### Pattern 3: Inline Angle Display in Canvas Labels

**What:** Append angle to existing floating label text, render using same background + text pattern.

**When to use:** Displaying angle alongside distance in ruler overlay.

**Example:**
```typescript
// Line mode label (existing):
const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)})`;

// With angle (Phase 63):
const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)}, ${angle.toFixed(1)}°)`;
```

**Note:** Degree symbol (°) renders correctly in canvas text. 1 decimal place is sufficient precision for angles.

### Pattern 4: Path Segment Angle Calculation

**What:** Calculate angle for each segment between consecutive waypoints in PATH mode.

**When to use:** PATH mode has multiple segments (waypoint[0] to waypoint[1], waypoint[1] to waypoint[2], etc.).

**Example:**
```typescript
// In PATH mode mouse handler:
const waypoints = rulerStateRef.current.waypoints;
const segmentAngles: number[] = [];
for (let i = 0; i < waypoints.length - 1; i++) {
  const dx = waypoints[i + 1].x - waypoints[i].x;
  const dy = waypoints[i].y - waypoints[i + 1].y;  // Inverted for standard convention
  const angleRad = Math.atan2(dy, dx);
  let angleDeg = angleRad * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  segmentAngles.push(angleDeg);
}

setRulerMeasurement({
  mode: RulerMode.PATH,
  waypoints, totalDistance,
  segmentAngles,  // NEW: array of angles for each segment
  startX: waypoints[0].x, startY: waypoints[0].y,
  endX: waypoints[waypoints.length - 1].x, endY: waypoints[waypoints.length - 1].y
});
```

**Display strategy:** PATH labels are already complex (multiple segments). Display average angle or omit from overlay, but include full array in pinned measurements for notepad display.

### Anti-Patterns to Avoid

- **Calculating angle from absolute deltas:** `Math.atan2(Math.abs(dy), Math.abs(dx))` loses quadrant information. Always use signed deltas.
- **Using degrees in intermediate calculations:** Store angle in degrees only at the end. Use radians for any trigonometry (though this phase doesn't need any).
- **Displaying angles outside 0-360° range:** Negative angles confuse users. Always normalize.
- **Re-calculating on every render:** Angle is derived from coordinates. Calculate once when coordinates change, store in state, display from state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Angle from two points | Manual quadrant detection with atan() | Math.atan2(dy, dx) | atan2 handles all four quadrants automatically, accounts for dx=0 edge case |
| Degree/radian conversion | Custom formula | `rad * 180 / Math.PI` and `deg * Math.PI / 180` | Standard formula, no precision loss |
| Angle normalization | Custom modulo logic | `if (angle < 0) angle += 360;` | Simple, clear, handles -180° to +180° output from atan2 |

**Key insight:** Math.atan2() is specifically designed for this use case and handles edge cases (vertical lines, zero-length vectors, quadrant ambiguity) that make manual angle calculation error-prone.

## Common Pitfalls

### Pitfall 1: Canvas Y Coordinate Inversion

**What goes wrong:** Using `dy = endY - startY` produces inverted angles (90° points down instead of up).

**Why it happens:** Canvas Y coordinates increase downward (0 at top, 256 at bottom), opposite of standard math graphs. `Math.atan2()` expects standard convention.

**How to avoid:** Invert the Y delta before calling atan2: `dy = startY - endY`.

**Warning signs:** 90° angle points downward instead of upward. Angle values are 180° off from expected.

### Pitfall 2: Forgetting to Normalize Negative Angles

**What goes wrong:** `Math.atan2()` returns values in range -π to +π (-180° to +180°). Left quadrants (90° to 270°) return negative values.

**Why it happens:** atan2 uses signed output to distinguish upper vs lower quadrants on the left side.

**How to avoid:** Always add 360° to negative angles: `if (angleDeg < 0) angleDeg += 360;`

**Warning signs:** Angle displays show negative values like "-45°" instead of "315°".

### Pitfall 3: Using Absolute Deltas for Angle

**What goes wrong:** `Math.atan2(Math.abs(dy), Math.abs(dx))` always returns angles in 0°-90° range.

**Why it happens:** Absolute values remove sign information that atan2 uses to determine quadrant.

**How to avoid:** Use signed deltas directly (do not call Math.abs before atan2).

**Warning signs:** All angles between 0° and 90° regardless of line direction.

### Pitfall 4: Inconsistent Angle Convention Between Modes

**What goes wrong:** LINE mode uses one angle convention (e.g., 0° = up), PATH mode uses another (0° = right).

**Why it happens:** Copy-paste errors or confusion about coordinate system when implementing separately.

**How to avoid:** Use identical angle calculation code for both modes (extract to shared utility function if needed).

**Warning signs:** Same line drawn in LINE mode vs PATH mode shows different angles.

## Code Examples

Verified patterns based on project architecture:

### Calculate Angle from Coordinates (LINE Mode)

```typescript
// In MapCanvas.tsx handleMouseMove, inside LINE mode block:
const dx = x - prev.startX;              // Signed delta (NOT Math.abs)
const dy = prev.startY - y;              // Inverted for standard convention
const angleRad = Math.atan2(dy, dx);
let angleDeg = angleRad * 180 / Math.PI;
if (angleDeg < 0) angleDeg += 360;       // Normalize to 0-360°

setRulerMeasurement({
  mode: RulerMode.LINE,
  dx: Math.abs(x - prev.startX),         // Existing fields use absolute
  dy: Math.abs(y - prev.startY),
  manhattan: Math.abs(x - prev.startX) + Math.abs(y - prev.startY),
  euclidean: Math.hypot(x - prev.startX, y - prev.startY),
  angle: angleDeg,                        // NEW: angle in degrees
  startX: prev.startX, startY: prev.startY,
  endX: x, endY: y
});
```

### Display Angle in Canvas Overlay

```typescript
// In MapCanvas.tsx drawUiLayer, LINE mode label rendering:
const dx = Math.abs(rulerMeasurement.endX - rulerMeasurement.startX);
const dy = Math.abs(rulerMeasurement.endY - rulerMeasurement.startY);
const manhattan = dx + dy;
const euclidean = Math.hypot(dx, dy);
const angle = rulerMeasurement.angle ?? 0;  // Fallback for legacy measurements

const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)}, ${angle.toFixed(1)}°)`;
ctx.font = '13px sans-serif';
// ... rest of label rendering (background + text) ...
```

### Display Angle in Status Bar

```typescript
// In StatusBar.tsx, LINE mode measurement display:
{rulerMeasurement.mode === RulerMode.LINE && (
  <>
    Ruler: {rulerMeasurement.dx}×{rulerMeasurement.dy}
    (Tiles: {rulerMeasurement.manhattan}, Dist: {rulerMeasurement.euclidean?.toFixed(2)},
    {rulerMeasurement.angle?.toFixed(1)}°)
  </>
)}
```

### PATH Mode Segment Angles

```typescript
// In MapCanvas.tsx handleMouseMove, PATH mode block:
const waypoints = rulerStateRef.current.waypoints;
const segments: Array<{ dx: number; dy: number; distance: number; angle: number }> = [];
let totalDistance = 0;

for (let i = 0; i < waypoints.length - 1; i++) {
  const dx = waypoints[i + 1].x - waypoints[i].x;
  const dy = waypoints[i].y - waypoints[i + 1].y;  // Inverted
  const distance = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dy, dx);
  let angleDeg = angleRad * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;

  segments.push({ dx: Math.abs(dx), dy: Math.abs(dy), distance, angle: angleDeg });
  totalDistance += distance;
}

// Preview segment to cursor (active waypoint to mouse)
if (waypoints.length > 0) {
  const lastWp = waypoints[waypoints.length - 1];
  const dx = x - lastWp.x;
  const dy = lastWp.y - y;  // Inverted
  const distance = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dy, dx);
  let angleDeg = angleRad * 180 / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  segments.push({ dx: Math.abs(dx), dy: Math.abs(dy), distance, angle: angleDeg });
  totalDistance += distance;
}

setRulerMeasurement({
  mode: RulerMode.PATH,
  waypoints,
  totalDistance,
  segments,  // NEW: array of segment data with angles
  startX: waypoints[0].x, startY: waypoints[0].y,
  endX: x, endY: y
});
```

### Update formatMeasurement Utility

```typescript
// In utils/measurementFormatter.ts:
export const formatMeasurement = (m: RulerMeasurement): string => {
  if (m.mode === RulerMode.LINE) {
    const dx = Math.abs(m.endX - m.startX);
    const dy = Math.abs(m.endY - m.startY);
    const angle = m.angle ? `, ${m.angle.toFixed(1)}°` : '';
    return `Line: ${dx}×${dy} (${dx + dy} tiles, ${Math.hypot(dx, dy).toFixed(1)} dist${angle})`;
  } else if (m.mode === RulerMode.RECTANGLE) {
    const w = Math.abs(m.endX - m.startX) + 1;
    const h = Math.abs(m.endY - m.startY) + 1;
    return `Rect: ${w}×${h} (${w * h} tiles)`;
  } else if (m.mode === RulerMode.PATH) {
    const segInfo = m.segments
      ? ` (${m.segments.length} segs)`
      : '';
    return `Path: ${m.waypoints?.length ?? 0} pts (${(m.totalDistance ?? 0).toFixed(1)} dist${segInfo})`;
  } else if (m.mode === RulerMode.RADIUS) {
    return `Radius: ${(m.radius ?? 0).toFixed(1)} (${(m.area ?? 0).toFixed(0)} area)`;
  }
  return '';
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A — no angle display | Math.atan2 + degree conversion | Phase 63 | First implementation of angle measurement |
| Separate calculation per mode | Shared angle calculation pattern | Phase 63 | Consistency across LINE/PATH modes |

**Deprecated/outdated:** N/A (new feature)

## Open Questions

1. **PATH mode angle display strategy**
   - What we know: PATH can have many segments (2-50+ waypoints), each with different angle
   - What's unclear: Best UI for displaying multiple angles in floating label (limited space)
   - Recommendation: Display segment count in overlay, full angle array available in pinned measurements for notepad. RulerNotepadPanel can show expandable segment details.

2. **Angle precision (decimal places)**
   - What we know: `.toFixed(1)` = 1 decimal place (e.g., "45.5°"), `.toFixed(0)` = integer (e.g., "45°")
   - What's unclear: User preference for precision vs readability
   - Recommendation: Start with `.toFixed(1)` for consistency with distance display (`.toFixed(2)`). Can adjust based on feedback.

3. **Angle display in pinned measurements**
   - What we know: RulerNotepadPanel shows pinned measurements, uses formatMeasurement() utility
   - What's unclear: Whether PATH segments need detailed breakdown in notepad vs summary only
   - Recommendation: Phase 63 focuses on basic angle display (LINE + PATH summary). Detailed segment breakdown can be v3.1 enhancement if needed.

## Sources

### Primary (HIGH confidence)

- [Math.atan2() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2) - Official JavaScript specification
- Codebase files (E:\NewMapEditor\src\):
  - `core/editor/slices/globalSlice.ts` - RulerMode enum, rulerMeasurement type
  - `components/MapCanvas/MapCanvas.tsx` - Ruler calculation and rendering logic
  - `utils/measurementFormatter.ts` - Measurement display formatting
  - `components/StatusBar/StatusBar.tsx` - Status bar measurement readout

### Secondary (MEDIUM confidence)

- [Creating a Touch-Responsive Angle Measurement Tool Using Canvas](https://medium.com/huawei-developers/creating-a-touch-responsive-angle-measurement-tool-using-canvas-5582b688b90b) - Canvas angle measurement UI patterns
- [Drawing shapes with canvas - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes) - Canvas arc/angle rendering reference

### Tertiary (LOW confidence)

None. All findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native JavaScript APIs, no external dependencies
- Architecture: HIGH - Existing ruler implementation provides clear integration points
- Pitfalls: HIGH - Canvas Y-axis inversion and atan2 normalization are well-documented issues

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days — stable domain, native APIs don't change)
