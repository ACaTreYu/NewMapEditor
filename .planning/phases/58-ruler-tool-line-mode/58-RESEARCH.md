# Phase 58: Ruler Tool — Line Mode - Research

**Researched:** 2026-02-13
**Domain:** Canvas-based measurement tool with ref-based drag pattern
**Confidence:** HIGH

## Summary

Phase 58 adds a dedicated ruler tool for measuring straight-line distance between two points on the tile map. The tool follows established editor patterns: ref-based drag state in MapCanvas (like line/rect tools), toolbar button for activation (like other tools), visual overlay on UI layer (yellow line with crosshairs), and dual distance metrics (Manhattan + Euclidean) in status bar and on-canvas label.

The implementation reuses proven patterns from Phase 57 (floating label with intelligent positioning) and existing line/rect drag tools (ref-based state, escape cancellation, RAF-debounced rendering). No new libraries required — all functionality builds on existing Canvas API, Zustand state, and React component architecture.

**Primary recommendation:** Follow the ref-based drag pattern established in v2.8 for zero-re-render performance. Store ruler state in `rulerStateRef` similar to `lineStateRef` and `rectDragRef`. Render on UI layer in `drawUiLayer()` alongside other overlays. Use Phase 57's floating label pattern for on-canvas measurement display.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual feedback:**
- Solid colored line (not dashed, not dual-stroke)
- Yellow/gold color — high contrast against map tiles, distinct from selection (blue) and grid (white)
- Small crosshair markers at start and end points
- Distance label appears at midpoint of the ruler line
- Label has dark background for readability (same pattern as Phase 57 floating label)

**Activation & workflow:**
- Dedicated toolbar button (standard tool switching, like other tools in the editor)
- No keyboard shortcut — toolbar only
- Stays in ruler mode after measurement (user switches tools manually to exit)
- Escape cancels current measurement but stays in ruler mode

**Measurement display:**
- Show both Manhattan (tile-grid) and Euclidean (straight-line) distance
- Euclidean precision: 2 decimal places (e.g., "5.83")
- Format: "Ruler: 5×3 (Tiles: 8, Dist: 5.83)" — dx×dy dimensions, then labeled values
- On-canvas label shows same full info as status bar (no abbreviated version)
- "Tiles" = Manhattan distance (dx + dy), "Dist" = Euclidean distance

**Measurement persistence:**
- Last measurement stays visible on canvas until next drag or Escape
- Starting a new measurement clears the previous ruler line from canvas
- Status bar retains values until next measurement or tool switch

### Claude's Discretion

- Exact crosshair marker size and style
- Line thickness (should be readable at all zoom levels)
- Label font size and positioning details at midpoint
- Toolbar icon design
- How ruler interacts with existing tool state (e.g., does switching away clear the ruler overlay)

### Deferred Ideas (OUT OF SCOPE)

- **Floating measurement notepad/panel** — Resizable panel listing all previous measurements, click to re-highlight ruler line. Overlaps with RULER-05 (pin/lock). Best suited for Phase 59 as part of advanced modes, or as a separate phase if scope is large.
- **Multiple simultaneous ruler lines** — Showing several measurements at once on canvas. Related to the notepad concept, scoped to Phase 59's pin/lock feature.

</user_constraints>

## Standard Stack

This phase uses existing project stack — no new dependencies required.

### Core (Already Installed)
| Library | Version | Purpose | Already In Use |
|---------|---------|---------|----------------|
| React 18 | 18.x | UI components (MapCanvas, ToolBar, StatusBar) | ✅ All components |
| Zustand | 4.x | Global state management (currentTool, gameObjectToolState) | ✅ EditorState.ts |
| TypeScript | 5.x | Type-safe tool enum, state interfaces | ✅ All .ts/.tsx files |
| Canvas API | Native | Line rendering, text rendering, coordinate transforms | ✅ MapCanvas drawUiLayer |
| Lucide React | Latest | Toolbar icon for ruler tool | ✅ ToolBar.tsx (LuRuler or similar) |

### Supporting (Already Available)
| API | Purpose | Existing Pattern |
|-----|---------|------------------|
| React refs | Transient drag state (zero re-renders) | `lineStateRef`, `rectDragRef`, `selectionDragRef` in MapCanvas.tsx |
| requestAnimationFrame | RAF-debounced UI redraw | `requestUiRedraw()` pattern in MapCanvas.tsx |
| Canvas 2D Context | Line drawing, text rendering, coordinate math | `drawUiLayer()` function in MapCanvas.tsx |
| Zustand selectors | Tool state (`currentTool`), shallow equality | `useShallow` in MapCanvas.tsx, ToolBar.tsx |

**Installation:**
None required — all stack components already in use.

## Architecture Patterns

### Pattern 1: Ref-Based Drag State (Zero Re-Renders)

**What:** Store transient drag state in a React ref instead of useState. Update ref values directly during mousemove, trigger RAF-debounced canvas redraws without React re-renders.

**When to use:** Any drag operation where intermediate states don't need to trigger React component updates. Ruler tool is a perfect fit — drag endpoints change on every mousemove but don't affect React component tree.

**Example from MapCanvas.tsx (lines 28-34, 55-59):**
```typescript
// Line drawing state
interface LineState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Ref-based state refs (no React re-renders)
const lineStateRef = useRef<LineState>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
const rectDragRef = useRef<{ active: boolean; startX: number; startY: number; endX: number; endY: number }>({
  active: false, startX: 0, startY: 0, endX: 0, endY: 0
});
```

**Ruler adaptation:**
```typescript
interface RulerState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const rulerStateRef = useRef<RulerState>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
```

**Pattern details:**
1. **mousedown:** Set `rulerStateRef.current = { active: true, startX: x, startY: y, endX: x, endY: y }`, call `requestUiRedraw()`
2. **mousemove:** Update `rulerStateRef.current.endX/endY`, call `requestUiRedraw()` (no setState → zero React re-renders)
3. **mouseup:** Keep ref active (persistence requirement), call `requestUiRedraw()`
4. **Escape:** Set `rulerStateRef.current.active = false`, call `requestUiRedraw()`

### Pattern 2: RAF-Debounced UI Redraw

**What:** Batch multiple rapid ref updates (e.g., mousemove events) into a single requestAnimationFrame callback that redraws the UI layer once per frame.

**When to use:** Always pair with ref-based state. Prevents redundant canvas redraws when mouse events fire faster than 60fps.

**Example from MapCanvas.tsx (lines 609-620):**
```typescript
// RAF-debounced UI redraw (for ref-based transient state)
const requestUiRedraw = useCallback(() => {
  uiDirtyRef.current = true;
  if (uiRafIdRef.current !== null) return;
  uiRafIdRef.current = requestAnimationFrame(() => {
    uiRafIdRef.current = null;
    if (uiDirtyRef.current) {
      uiDirtyRef.current = false;
      drawUiLayer();
    }
  });
}, [drawUiLayer]);
```

**Ruler usage:** Call `requestUiRedraw()` after every `rulerStateRef.current` mutation (mousedown, mousemove, mouseup, Escape).

### Pattern 3: Floating Label with Intelligent Positioning

**What:** Render a floating text label on the canvas with a dark semi-transparent background. Label auto-repositions to avoid viewport clipping using fallback logic.

**When to use:** When you need to show dynamic measurement data on the canvas that must remain readable at all zoom levels.

**Example from Phase 57 (MapCanvas.tsx lines 573-605):**
```typescript
// Floating dimension label (skip 1x1 selections)
if (w > 1 || h > 1) {
  const labelText = `${w}x${h} (${w * h})`;
  ctx.font = '13px sans-serif';
  const metrics = ctx.measureText(labelText);
  const textWidth = metrics.width;
  const textHeight = 18; // 13px font + padding
  const pad = 4;

  // Default: above-left of selection
  let labelX = selScreen.x;
  let labelY = selScreen.y - pad;

  // Fallback 1: left edge clipped -> move to right side
  if (labelX < 0) {
    labelX = selScreen.x + w * tilePixels;
  }

  // Fallback 2: top edge clipped -> move below selection
  if (labelY - textHeight < 0) {
    labelY = selScreen.y + h * tilePixels + textHeight + pad;
  }

  // Background rectangle for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(labelX - pad, labelY - textHeight, textWidth + pad * 2, textHeight);

  // Text rendering
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(labelText, labelX, labelY);
}
```

**Ruler adaptation:**
- Position label at midpoint of ruler line: `labelX = (startScreen.x + endScreen.x) / 2`, `labelY = (startScreen.y + endScreen.y) / 2`
- Label text: `"Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)})"`
- Same fallback logic for edge clipping
- Same dark background + white text pattern

### Pattern 4: Tool Enum + Toolbar Button

**What:** Add a new ToolType enum value, render a toolbar button that calls `setTool(ToolType.RULER)`, check `currentTool === ToolType.RULER` in mouse handlers.

**When to use:** Every new tool in the editor. Standard activation pattern.

**Example from types.ts (lines 104-127):**
```typescript
export enum ToolType {
  SELECT = 'select',
  PENCIL = 'pencil',
  FILL = 'fill',
  LINE = 'line',
  RECT = 'rect',
  WALL = 'wall',
  PICKER = 'picker',
  MIRROR = 'mirror',
  // ... more tools
}
```

**Example from ToolBar.tsx (lines 56-61, 423-444):**
```typescript
const coreTools: ToolButton[] = [
  { tool: ToolType.SELECT, label: 'Select', icon: 'select', shortcut: '' },
  { tool: ToolType.PENCIL, label: 'Pencil', icon: 'pencil', shortcut: '' },
  // ... more tools
];

const renderToolButton = (tool: ToolButton) => {
  const isActive = currentTool === tool.tool;
  const IconComponent = toolIcons[tool.icon];

  return (
    <button
      key={tool.tool}
      className={`toolbar-button ${isActive ? 'active' : ''}`}
      onClick={() => setTool(tool.tool)}
      title={tool.label}
    >
      {IconComponent ? <IconComponent size={16} /> : tool.label}
    </button>
  );
};
```

**Ruler implementation:**
1. Add `RULER = 'ruler'` to ToolType enum (types.ts)
2. Add `{ tool: ToolType.RULER, label: 'Ruler', icon: 'ruler', shortcut: '' }` to appropriate tool array in ToolBar.tsx
3. Add `ruler: LuRuler` to `toolIcons` mapping (or similar Lucide icon)
4. In MapCanvas handleMouseDown: `if (currentTool === ToolType.RULER) { /* start ruler drag */ }`

### Pattern 5: Escape Key Cancellation (Permanent Listener)

**What:** A permanent window-level keydown listener that checks ref values to cancel active drag operations. Prevents re-render thrash from conditional useEffect dependencies.

**When to use:** Cancelling ref-based drag state (line preview, rect drag, selection drag, ruler measurement).

**Example from MapCanvas.tsx (lines 1396-1438):**
```typescript
// Escape key cancellation for ref-based transient state (permanent listener)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Cancel line preview
      if (lineStateRef.current.active) {
        e.preventDefault();
        lineStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
        requestUiRedraw();
      }
      // Cancel rect drag
      if (rectDragRef.current.active) {
        e.preventDefault();
        rectDragRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
        requestUiRedraw();
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [documentId, requestUiRedraw]);
```

**Ruler addition:**
```typescript
// Cancel ruler measurement
if (rulerStateRef.current.active) {
  e.preventDefault();
  rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
  requestUiRedraw();
}
```

### Pattern 6: Tool Switch Cleanup

**What:** When currentTool changes, cancel any active drag operations to prevent orphaned UI state.

**When to use:** Always for tools that use ref-based drag state.

**Example from MapCanvas.tsx (lines 1333-1359):**
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
}, [currentTool, requestUiRedraw]);
```

**Ruler addition:**
```typescript
// Cancel ruler measurement
if (rulerStateRef.current.active) {
  rulerStateRef.current = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
  requestUiRedraw();
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distance calculation | Custom Euclidean formula | `Math.sqrt(dx*dx + dy*dy)` or `Math.hypot(dx, dy)` | Built-in, optimized, tested |
| Manhattan distance | Loop-based accumulation | `Math.abs(dx) + Math.abs(dy)` | One-liner, no iteration needed |
| Text measurement | Fixed width assumptions | `ctx.measureText(labelText).width` | Handles variable-width fonts accurately |
| Midpoint calculation | Complex line-intersection logic | `(start + end) / 2` for both x and y | Direct arithmetic, zero edge cases |
| Color constants | Hardcoded RGB/hex strings | CSS variable or const declaration at top of file | Maintainability, easy to change theme |
| Crosshair rendering | Custom path drawing | Two short lines (vertical + horizontal) via `ctx.moveTo/lineTo` | Canvas API primitive, 4 lines of code |

**Key insight:** Canvas API provides all primitives needed (line drawing, text measurement, coordinate transforms). Ruler tool is ~50 lines of new code — most complexity is in intelligent label positioning (already solved in Phase 57).

## Common Pitfalls

### Pitfall 1: Forgetting to Clear Previous Measurement on New Drag

**What goes wrong:** User drags a new ruler line, but the old measurement persists on canvas, creating visual clutter.

**Why it happens:** Ruler state is ref-based and only clears on Escape or tool switch. If mousedown doesn't reset the ref, stale visual data remains.

**How to avoid:** In handleMouseDown when currentTool === RULER, always reset `rulerStateRef.current` to new coordinates (even if `active` was already true):
```typescript
rulerStateRef.current = {
  active: true,
  startX: x,
  startY: y,
  endX: x,
  endY: y
};
```

**Warning signs:** Multiple ruler lines visible on canvas after several measurements.

### Pitfall 2: Label Clipping at Viewport Edges

**What goes wrong:** Ruler label renders partially off-screen when measurement spans near viewport edge.

**Why it happens:** Default label position (midpoint of line) doesn't check canvas bounds.

**How to avoid:** Implement Phase 57's fallback positioning logic:
1. Calculate default position at midpoint
2. Check if `labelX < 0` → shift right
3. Check if `labelY - textHeight < 0` → shift down
4. Check if `labelX + textWidth > canvas.width` → shift left
5. Check if `labelY > canvas.height` → shift up

**Warning signs:** Label text cut off at screen edges, dark background rectangle partially visible.

### Pitfall 3: Zoom-Dependent Line Thickness

**What goes wrong:** Ruler line becomes invisibly thin at low zoom (0.25x) or excessively thick at high zoom (4x).

**Why it happens:** Using `tilePixels` or zoom-scaled values for `ctx.lineWidth`.

**How to avoid:** Use a fixed pixel lineWidth independent of zoom:
```typescript
ctx.lineWidth = 2; // Fixed 2px line, readable at all zoom levels
```
Same pattern for crosshair size — use fixed pixel dimensions (e.g., 8px crosshair arms), not tile-scaled values.

**Warning signs:** Line disappears at low zoom, becomes comically thick at high zoom.

### Pitfall 4: Status Bar Not Updating During Drag

**What goes wrong:** Status bar shows stale ruler data or no data during active drag.

**Why it happens:** Status bar reads Zustand state, but ruler uses ref-based drag state (not in Zustand).

**How to avoid:** Two approaches:
1. **Preferred:** Add `rulerMeasurement` to Zustand globalSlice, update on mousemove (acceptable re-render for status bar only, not MapCanvas)
2. **Alternative:** Pass ruler values via StatusBar props from MapCanvas (requires lifting state or using context)

Recommendation: Use approach 1 (Zustand) for consistency with existing tool state patterns.

**Warning signs:** Status bar shows "Ruler: --" or previous measurement during active drag.

### Pitfall 5: Measurement Persists When Switching Tools

**What goes wrong:** User switches from RULER to PENCIL, but ruler line remains visible on canvas.

**Why it happens:** Tool switch cleanup (currentTool useEffect) doesn't clear `rulerStateRef.current.active`.

**How to avoid:** Add ruler cleanup to the existing tool switch useEffect (Pattern 6 above). Set `rulerStateRef.current.active = false` when currentTool changes away from RULER.

**Warning signs:** Ruler line overlay persists after switching tools, interferes with other tool visuals.

## Code Examples

Verified patterns from existing codebase:

### Distance Calculation

```typescript
// Manhattan distance (tile-grid movement)
const dx = Math.abs(endX - startX);
const dy = Math.abs(endY - startY);
const manhattanDistance = dx + dy;

// Euclidean distance (straight-line)
const euclideanDistance = Math.sqrt(dx * dx + dy * dy);
// Or using Math.hypot (more accurate for large values):
const euclideanDistance = Math.hypot(dx, dy);
```

### Ruler Line Rendering (UI Layer)

```typescript
// In drawUiLayer function, after existing overlay rendering
if (rulerStateRef.current.active && currentTool === ToolType.RULER) {
  const { startX, startY, endX, endY } = rulerStateRef.current;

  // Screen coordinates
  const startScreen = tileToScreen(startX, startY, overrideViewport);
  const endScreen = tileToScreen(endX, endY, overrideViewport);

  // Yellow/gold solid line
  ctx.strokeStyle = '#FFD700'; // Gold color
  ctx.lineWidth = 2;
  ctx.setLineDash([]); // Solid line, not dashed
  ctx.beginPath();
  ctx.moveTo(startScreen.x + tilePixels / 2, startScreen.y + tilePixels / 2);
  ctx.lineTo(endScreen.x + tilePixels / 2, endScreen.y + tilePixels / 2);
  ctx.stroke();

  // Crosshair at start point
  const crosshairSize = 8; // Fixed 8px crosshair
  ctx.beginPath();
  ctx.moveTo(startScreen.x + tilePixels / 2 - crosshairSize, startScreen.y + tilePixels / 2);
  ctx.lineTo(startScreen.x + tilePixels / 2 + crosshairSize, startScreen.y + tilePixels / 2);
  ctx.moveTo(startScreen.x + tilePixels / 2, startScreen.y + tilePixels / 2 - crosshairSize);
  ctx.lineTo(startScreen.x + tilePixels / 2, startScreen.y + tilePixels / 2 + crosshairSize);
  ctx.stroke();

  // Crosshair at end point
  ctx.beginPath();
  ctx.moveTo(endScreen.x + tilePixels / 2 - crosshairSize, endScreen.y + tilePixels / 2);
  ctx.lineTo(endScreen.x + tilePixels / 2 + crosshairSize, endScreen.y + tilePixels / 2);
  ctx.moveTo(endScreen.x + tilePixels / 2, endScreen.y + tilePixels / 2 - crosshairSize);
  ctx.lineTo(endScreen.x + tilePixels / 2, endScreen.y + tilePixels / 2 + crosshairSize);
  ctx.stroke();
}
```

### Floating Label at Midpoint

```typescript
// After ruler line rendering
if (rulerStateRef.current.active && currentTool === ToolType.RULER) {
  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const manhattan = dx + dy;
  const euclidean = Math.hypot(dx, dy);

  const labelText = `Ruler: ${dx}×${dy} (Tiles: ${manhattan}, Dist: ${euclidean.toFixed(2)})`;

  // Midpoint coordinates
  const midX = (startScreen.x + endScreen.x) / 2;
  const midY = (startScreen.y + endScreen.y) / 2;

  // Text measurement
  ctx.font = '13px sans-serif';
  const metrics = ctx.measureText(labelText);
  const textWidth = metrics.width;
  const textHeight = 18;
  const pad = 4;

  // Default: centered at midpoint
  let labelX = midX - textWidth / 2;
  let labelY = midY - textHeight / 2;

  // Fallback: shift if clipped
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
}
```

### Mouse Handler Integration

```typescript
// In handleMouseDown
if (e.button === 0 && currentTool === ToolType.RULER) {
  // Start ruler measurement
  rulerStateRef.current = {
    active: true,
    startX: x,
    startY: y,
    endX: x,
    endY: y
  };
  requestUiRedraw();
}

// In handleMouseMove
if (rulerStateRef.current.active) {
  const prevRuler = rulerStateRef.current;
  if (prevRuler.endX !== x || prevRuler.endY !== y) {
    rulerStateRef.current = { ...prevRuler, endX: x, endY: y };
    requestUiRedraw();
  }
}

// In handleMouseUp - ruler stays active (persistence requirement)
// No special handling needed — measurement persists until next drag or Escape
```

## State of the Art

| Consideration | Current Approach | Phase 58 Approach | Notes |
|---------------|------------------|-------------------|-------|
| Drag performance | Ref-based state (v2.8) | Same ref-based pattern | Proven in line/rect tools |
| Label rendering | Fixed 13px font (Phase 57) | Reuse same pattern | Readable at all zoom levels |
| Tool activation | ToolType enum + toolbar button | Add RULER to enum | Standard tool pattern |
| Escape cancellation | Permanent window listener (v2.8) | Add ruler to existing listener | No new listener needed |
| Status bar display | Coordinate + tile ID | Add ruler measurement field | Conditional render |

**Current best practices (established in v2.8):**
- Ref-based drag state for zero-re-render performance
- RAF-debounced `requestUiRedraw()` for batch canvas updates
- Permanent escape listener checks all ref values
- Tool switch cleanup via currentTool useEffect

**No deprecated patterns to avoid.**

## Open Questions

### 1. Should ruler measurement be stored in Zustand for status bar access?

**What we know:**
- Status bar currently reads Zustand state (`viewport`, `currentTool`, `tileSelection`)
- Ruler uses ref-based drag state for performance (like line/rect tools)
- Status bar needs live measurement values during drag

**What's unclear:**
- Does adding `rulerMeasurement` to Zustand cause unnecessary MapCanvas re-renders?
- Can we use a separate Zustand slice that only StatusBar subscribes to?

**Recommendation:**
Add `rulerMeasurement: { dx: number; dy: number; manhattan: number; euclidean: number } | null` to globalSlice. Update on mousemove inside `if (rulerStateRef.current.active)` block. StatusBar subscribes with shallow equality. MapCanvas doesn't subscribe (uses ref values for rendering), so no re-render cost.

**Confidence:** HIGH — This pattern matches how `tileSelection` works (global state read by StatusBar, updated by MapCanvas actions).

### 2. What Lucide icon best represents a ruler tool?

**What we know:**
- ToolBar.tsx uses Lucide React icons (LuPencil, LuSquareDashed, etc.)
- Icon should be recognizable at 16px size
- Available ruler-related icons: LuRuler, LuSeparatorHorizontal, LuMove

**What's unclear:**
- LuRuler is the obvious choice, but does it exist in the Lucide set?

**Recommendation:**
Use `LuRuler` if available. Fallback to `LuSeparatorHorizontal` (represents a horizontal line) or `LuMove` (represents measurement/positioning). Verify icon name against Lucide React documentation during planning.

**Confidence:** MEDIUM — Icon name needs verification, but pattern is well-established.

### 3. Should ruler state persist across tool switches (beyond Escape)?

**What we know:**
- User requirement: "Last measurement stays visible on canvas until next drag or Escape"
- Current implementation: Tool switch cleanup clears all drag state refs
- Conflicting concerns: Persistence (user wants to see measurement) vs. cleanup (no orphaned UI)

**What's unclear:**
- Does "stays visible" mean only while RULER tool is active, or even after switching to PENCIL?
- If it persists across tool switches, how does user clear it besides Escape?

**Recommendation:**
Clear ruler measurement on tool switch (same as line preview, rect drag). User requirement is met by "stays visible until next drag" (next ruler drag) and Escape (manual clear). This avoids visual confusion when using other tools. Update CONTEXT.md to clarify: measurement persists within RULER mode, clears on tool switch.

**Confidence:** MEDIUM — Requires user clarification, but tool switch cleanup is safer default.

## Sources

### Primary (HIGH confidence)
- MapCanvas.tsx (lines 28-1558) - Ref-based drag patterns, drawUiLayer rendering, tool mouse handlers
- ToolBar.tsx (lines 1-688) - Tool enum usage, toolbar button patterns, icon mapping
- StatusBar.tsx (lines 1-177) - Zustand state subscriptions, conditional field rendering
- types.ts (lines 104-127) - ToolType enum definition
- Phase 57 PLAN.md (lines 84-136) - Floating label implementation pattern with intelligent positioning
- Phase 57 CONTEXT.md - Label background pattern (`rgba(0, 0, 0, 0.7)` with white text)

### Secondary (MEDIUM confidence)
- ROADMAP.md (lines 70-83) - Phase 58 success criteria, Phase 59 scope boundary
- REQUIREMENTS.md (lines 19-24, 60-67) - RULER-01 requirement definition, traceability table

### Tertiary (Documentation only)
- CLAUDE.md - Project structure, tech stack summary, Canvas API mention

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in use, verified in package.json and imports
- Architecture patterns: HIGH - All 6 patterns verified in existing MapCanvas.tsx code with line numbers
- Pitfalls: HIGH - Derived from existing line/rect tool implementation and Phase 57 label rendering
- Code examples: HIGH - All examples are direct extractions or minimal adaptations of verified code
- Open questions: MEDIUM-HIGH - Questions 1-2 have clear recommendations, question 3 needs user input

**Research date:** 2026-02-13
**Valid until:** 30 days (stable patterns, unlikely to change before Phase 59)

**Next steps:**
1. Clarify question 3 (ruler persistence across tool switches) with user if needed
2. Verify LuRuler icon availability in Lucide React during planning
3. Proceed to planning with high confidence — all technical unknowns resolved
