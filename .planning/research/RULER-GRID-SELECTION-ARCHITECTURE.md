# Architecture Research: Ruler Tool, Grid Customization, and Selection Info Integration

**Domain:** Canvas overlay UI extensions for tile map editor
**Researched:** 2026-02-13
**Confidence:** HIGH

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI Components Layer                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐        │
│  │ StatusBar  │  │  ToolBar   │  │   MapCanvas         │        │
│  │ (new info) │  │ (ruler btn)│  │   (ruler overlay)   │        │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬──────────┘        │
│        │               │                    │                    │
├────────┴───────────────┴────────────────────┴────────────────────┤
│                    Zustand State Layer                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  GlobalSlice (extended)                                    │  │
│  │  + currentTool (add ToolType.RULER)                        │  │
│  │  + showGrid → gridSettings { opacity, weight, color, ... }│  │
│  │  + rulerState { mode, startX, startY, endX, endY }        │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  DocumentsSlice (extended)                                 │  │
│  │  + selection { startX, startY, endX, endY } (existing)     │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                  Canvas Rendering Layer                           │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌──────────────────────────────────┐   │
│  │   CanvasEngine     │  │  MapCanvas.tsx                   │   │
│  │   (unchanged)      │  │  + drawUiLayer (extended)        │   │
│  │   - map buffer     │  │    - draw ruler overlay          │   │
│  │   - blit to screen │  │    - draw custom grid pattern    │   │
│  └────────────────────┘  │    - draw selection info label   │   │
│                          └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Architecture Decision: No New Canvas Layers

**Ruling:** All new overlays (ruler, enhanced grid, selection info) render on the **existing UI overlay layer** in MapCanvas.tsx `drawUiLayer()` function.

**Rationale:**
- Existing 2-layer architecture is proven (map buffer + UI overlay)
- Adding 3rd layer increases complexity without benefit (all overlays are transient, low-frequency updates)
- Grid customization replaces existing grid pattern in same rendering path
- Ruler and selection info are logically similar to existing cursor/line previews
- Performance is non-issue (overlays redraw at ~60 FPS during interaction, idle most of the time)

**Integration points:**
1. **Grid rendering:** Modify existing grid pattern creation (MapCanvas.tsx lines 234-266)
2. **Ruler overlay:** Add new section in `drawUiLayer()` (similar to line preview, lines 270-310)
3. **Selection info:** Extend existing selection rendering (lines 540-565)

## Component Responsibilities

| Component | Responsibility | Integration Type |
|-----------|----------------|------------------|
| **GlobalSlice** | Ruler state (active, mode, coords), grid settings (opacity, weight, color, center markers), ruler tool enum | **MODIFY** — extend existing state |
| **MapCanvas.tsx** | Render ruler overlay, custom grid pattern, selection info labels in `drawUiLayer()` | **MODIFY** — extend existing function |
| **MapCanvas mouse handlers** | Handle ruler tool clicks (mouseDown/Move/Up) using ref-based state like line tool | **MODIFY** — add ruler cases in existing handlers |
| **StatusBar.tsx** | Display ruler measurements, selection dimensions (already has selection display) | **MODIFY** — add ruler info field |
| **ToolBar.tsx** | Ruler tool button, grid settings menu | **MODIFY** — add button + dropdown |
| **CanvasEngine** | No changes required (buffer rendering unchanged) | **NO CHANGE** |

## Recommended State Structure

### GlobalSlice Extension (src/core/editor/slices/globalSlice.ts)

```typescript
// EXISTING
export interface GlobalSlice {
  showGrid: boolean;  // REPLACE with gridSettings
  // ...
}

// NEW
export interface GridSettings {
  enabled: boolean;           // Show/hide grid (replaces showGrid)
  opacity: number;            // 0.0-1.0
  weight: number;             // Line thickness in pixels (1-3)
  color: string;              // CSS color (#fff, #000, custom)
  showCenterMarkers: boolean; // Draw center cross every N tiles
  centerMarkerInterval: number; // Tiles between center markers (e.g., 16)
}

export interface RulerState {
  active: boolean;      // Ruler drag in progress
  mode: RulerMode;      // Current measurement mode
  startX: number;       // Tile coordinates (integers)
  startY: number;
  endX: number;
  endY: number;
}

export enum RulerMode {
  STRAIGHT = 'straight',    // Linear distance + tile count
  MANHATTAN = 'manhattan',  // Horizontal + vertical (L-shaped)
  AREA = 'area',           // Rectangle area (width x height)
  PERIMETER = 'perimeter'  // Rectangle perimeter
}

export interface GlobalSlice {
  gridSettings: GridSettings;
  rulerState: RulerState;
  // Actions
  setGridSettings: (updates: Partial<GridSettings>) => void;
  setRulerMode: (mode: RulerMode) => void;
  // ... existing actions
}
```

**Storage:** Grid settings and ruler mode persist to localStorage (like existing tool state).

### Tool Enum Extension (src/core/map/types.ts)

```typescript
export enum ToolType {
  // ... existing tools
  RULER = 'ruler',  // NEW: measurement tool
}
```

## Data Flow

### Ruler Tool Interaction Flow

```
User clicks map with ruler tool active
    ↓
MapCanvas handleMouseDown
    ↓ (e.button === 0 && currentTool === ToolType.RULER)
rulerStateRef.current = { active: true, startX, startY, endX, endY }
    ↓
requestUiRedraw() (RAF-debounced)
    ↓
drawUiLayer() renders ruler overlay
    ↓ (mousemove)
rulerStateRef.current.endX/endY updated
    ↓
requestUiRedraw() (RAF-debounced)
    ↓
drawUiLayer() renders updated ruler overlay
    ↓ (mouseup)
Commit to Zustand (optional: save measurement to history)
rulerStateRef.current.active = false
requestUiRedraw()
```

**Key insight:** Ruler uses **ref-based transient state** during drag (like line tool, rect drag), then optionally commits to Zustand for persistent display.

### Grid Settings Flow

```
User changes grid opacity slider
    ↓
ToolBar onChange handler
    ↓
setGridSettings({ opacity: newValue })
    ↓
Zustand state update
    ↓
MapCanvas useEffect (viewport/gridSettings dependency)
    ↓
drawUiLayer() invalidates gridPatternRef (zoom changed)
    ↓
Recreates pattern with new opacity/weight/color
    ↓
Renders new grid pattern on UI overlay
```

**Invalidation trigger:** Grid pattern cache invalidates when `gridSettings` OR `viewport.zoom` changes.

### Selection Info Label Flow

```
User drags selection rectangle
    ↓
selectionDragRef.current updated (existing ref-based state)
    ↓
requestUiRedraw() (existing)
    ↓
drawUiLayer() draws selection rectangle (existing)
    ↓ NEW: Calculate selection dimensions
const width = maxX - minX + 1;
const height = maxY - minY + 1;
    ↓ NEW: Render info label above selection
ctx.fillText(`${width} x ${height}`, topLeft.x, topLeft.y - 10);
```

**Placement:** Label renders 10px above top-left corner of selection rect (like rect tool `WxH` label).

## Architectural Patterns

### Pattern 1: Ref-Based Transient State for Drags

**What:** Use `useRef` to store intermediate drag state (ruler coords, rect bounds) without triggering React re-renders. Commit to Zustand only on mouseup.

**When to use:** Any drag operation where intermediate positions don't need to persist or trigger side effects.

**Trade-offs:**
- **Pro:** Zero React re-renders during drag (60 FPS smooth)
- **Pro:** RAF-debounced overlay redraw decouples rendering from state updates
- **Con:** State invisible to React DevTools during drag (debug with console.log)
- **Con:** Requires manual cleanup on unmount/tool switch

**Example (existing pattern for ruler):**
```typescript
const rulerStateRef = useRef<RulerState>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });

const handleMouseDown = (e: React.MouseEvent) => {
  if (currentTool === ToolType.RULER) {
    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    rulerStateRef.current = { active: true, startX: x, startY: y, endX: x, endY: y };
    requestUiRedraw(); // RAF-debounced
  }
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (rulerStateRef.current.active) {
    const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    rulerStateRef.current.endX = x;
    rulerStateRef.current.endY = y;
    requestUiRedraw(); // RAF-debounced
  }
};

const handleMouseUp = () => {
  if (rulerStateRef.current.active) {
    // Optional: commit to Zustand for persistent display
    setRulerState(rulerStateRef.current);
    rulerStateRef.current.active = false;
    requestUiRedraw();
  }
};
```

**Existing precedent:** Line tool (lineStateRef), rect drag (rectDragRef), selection drag (selectionDragRef) all use this pattern.

### Pattern 2: Grid Pattern Cache Invalidation

**What:** Cache `createPattern()` result in ref, invalidate when zoom or grid settings change.

**When to use:** Expensive pattern creation operations that depend on viewport state.

**Trade-offs:**
- **Pro:** Avoids recreating pattern every frame (60 FPS to 0 FPS during static view)
- **Con:** Manual cache invalidation (must track all dependencies)

**Example (extend existing grid pattern logic):**
```typescript
const gridPatternRef = useRef<CanvasPattern | null>(null);
const gridPatternZoomRef = useRef<number>(-1);
const gridPatternSettingsRef = useRef<GridSettings | null>(null);

const drawUiLayer = useCallback(() => {
  const { gridSettings } = useEditorStore.getState();
  const tilePixelSize = Math.round(TILE_SIZE * viewport.zoom);

  // Invalidate cache if zoom OR settings changed
  const settingsChanged = !gridPatternSettingsRef.current ||
    gridPatternSettingsRef.current.opacity !== gridSettings.opacity ||
    gridPatternSettingsRef.current.weight !== gridSettings.weight ||
    gridPatternSettingsRef.current.color !== gridSettings.color;

  if (gridPatternZoomRef.current !== tilePixelSize || settingsChanged) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = tilePixelSize;
    patternCanvas.height = tilePixelSize;
    const pctx = patternCanvas.getContext('2d')!;

    pctx.strokeStyle = gridSettings.color;
    pctx.globalAlpha = gridSettings.opacity;
    pctx.lineWidth = gridSettings.weight;
    pctx.beginPath();
    pctx.moveTo(0, 0);
    pctx.lineTo(tilePixelSize, 0);
    pctx.moveTo(0, 0);
    pctx.lineTo(0, tilePixelSize);
    pctx.stroke();

    gridPatternRef.current = ctx.createPattern(patternCanvas, 'repeat');
    gridPatternZoomRef.current = tilePixelSize;
    gridPatternSettingsRef.current = { ...gridSettings };
  }

  // Render cached pattern (fast)
  if (gridPatternRef.current) {
    const offsetX = -(viewport.x % 1) * tilePixelSize;
    const offsetY = -(viewport.y % 1) * tilePixelSize;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.fillStyle = gridPatternRef.current;
    ctx.fillRect(-tilePixelSize, -tilePixelSize, canvas.width + tilePixelSize * 2, canvas.height + tilePixelSize * 2);
    ctx.restore();
  }
}, [viewport, /* gridSettings subscription needed */]);
```

**Existing precedent:** Current grid rendering uses zoom-based invalidation (MapCanvas.tsx lines 238-255).

### Pattern 3: Ruler Mode Switching (Escape to Cycle)

**What:** Escape key cycles through ruler modes when ruler is active, OR cancels ruler drag.

**When to use:** Tool with multiple modes but one toolbar button (avoid toolbar clutter).

**Trade-offs:**
- **Pro:** Single button activation, modes discoverable through use
- **Pro:** Escape key overloaded for both cancel (drag active) and cycle (drag inactive)
- **Con:** Mode not visually obvious (need status bar indicator)

**Example:**
```typescript
// Escape key handler (permanent listener, checks ref state)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && currentTool === ToolType.RULER) {
      if (rulerStateRef.current.active) {
        // Cancel active drag
        e.preventDefault();
        rulerStateRef.current.active = false;
        requestUiRedraw();
      } else {
        // Cycle ruler mode
        e.preventDefault();
        const modes = [RulerMode.STRAIGHT, RulerMode.MANHATTAN, RulerMode.AREA, RulerMode.PERIMETER];
        const currentIndex = modes.indexOf(rulerMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setRulerMode(nextMode);
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentTool, rulerMode, requestUiRedraw]);
```

**UX note:** Status bar shows current ruler mode ("Ruler: Straight | Manhattan | Area | Perimeter").

## Ruler Overlay Rendering Variants

### Mode 1: Straight Line Distance

```
Visual:
  Start ●───────────● End
         ╲         ╱
          15 tiles
           24 px

Render:
  - Green line from start to end (dashed)
  - Yellow highlight at start/end tiles
  - Label at midpoint: "15 tiles (240 px)"
  - Formula: sqrt((dx*dx) + (dy*dy))
```

### Mode 2: Manhattan Distance

```
Visual:
  Start ●──────────┐
        │  12 →    │
        │          │ 8 ↓
        └──────────● End

Render:
  - Green L-shaped line (horizontal then vertical)
  - Labels: "12 tiles →" (horizontal), "8 tiles ↓" (vertical)
  - Total label: "20 tiles (Manhattan)"
  - Formula: abs(dx) + abs(dy)
```

### Mode 3: Area

```
Visual:
  ┌────────────────┐
  │   12 x 8       │
  │   96 tiles     │
  └────────────────┘

Render:
  - Green rectangle outline (dashed)
  - Filled semi-transparent (rgba(0, 255, 128, 0.2))
  - Label inside rect: "12 x 8 (96 tiles)"
  - Formula: width * height
```

### Mode 4: Perimeter

```
Visual:
  ┌────────────────┐
  │                │ ← 12 tiles
  │                │
  └────────────────┘
       ↑ 8 tiles

Render:
  - Green rectangle outline (solid, thicker)
  - Labels on each side: "12", "8", "12", "8"
  - Total label: "40 tiles (perimeter)"
  - Formula: 2 * (width + height)
```

**Rendering order in `drawUiLayer()`:**
1. Grid (bottom layer of overlays)
2. Paste preview
3. Cursor highlight
4. Selection rectangle + info label (NEW)
5. Ruler overlay (NEW, top layer for visibility)
6. Line/rect previews (existing)

## Grid Customization UI

### Settings Panel (ToolBar dropdown)

```
┌─────────────────────────────┐
│ Grid Settings               │
├─────────────────────────────┤
│ ☑ Show Grid                 │
│                             │
│ Opacity:    [====●===] 50%  │
│ Line Width: [==●=====] 1px  │
│                             │
│ Color: ⬜ White  ⬛ Black   │
│        🎨 Custom: #______   │
│                             │
│ ☑ Center Markers            │
│   Interval: [16] tiles      │
│                             │
│ [Reset to Defaults]         │
└─────────────────────────────┘
```

**Defaults:**
- Opacity: 0.1 (10%, current hardcoded value)
- Line Width: 1px
- Color: #ffffff (white)
- Center Markers: OFF
- Interval: 16 tiles

**Center marker rendering:**
```typescript
if (gridSettings.showCenterMarkers) {
  ctx.strokeStyle = gridSettings.color;
  ctx.globalAlpha = gridSettings.opacity * 1.5; // Slightly brighter
  ctx.lineWidth = gridSettings.weight + 1;

  for (let y = 0; y < MAP_HEIGHT; y += gridSettings.centerMarkerInterval) {
    for (let x = 0; x < MAP_WIDTH; x += gridSettings.centerMarkerInterval) {
      const screenX = (x - viewport.x) * tilePixels;
      const screenY = (y - viewport.y) * tilePixels;

      // Draw small cross (+)
      ctx.beginPath();
      ctx.moveTo(screenX - 3, screenY);
      ctx.lineTo(screenX + 3, screenY);
      ctx.moveTo(screenX, screenY - 3);
      ctx.lineTo(screenX, screenY + 3);
      ctx.stroke();
    }
  }
}
```

## Selection Info Label Integration

**Current behavior:** Selection draws white rectangle with black outline (marching ants style in v2.8 milestone).

**New behavior:** Add dimension label above selection rectangle.

**Rendering logic (add to `drawUiLayer()` lines 540-565):**

```typescript
if (activeSelection) {
  const minX = Math.min(activeSelection.startX, activeSelection.endX);
  const minY = Math.min(activeSelection.startY, activeSelection.endY);
  const maxX = Math.max(activeSelection.startX, activeSelection.endX);
  const maxY = Math.max(activeSelection.startY, activeSelection.endY);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const selScreen = tileToScreen(minX, minY, overrideViewport);

  // Existing: Draw selection rectangle
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(selScreen.x, selScreen.y, w * tilePixels, h * tilePixels);

  // NEW: Draw dimension label
  const labelText = `${w} x ${h}`;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  // Background for readability
  const metrics = ctx.measureText(labelText);
  const labelWidth = metrics.width + 8;
  const labelHeight = 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(selScreen.x, selScreen.y - labelHeight - 2, labelWidth, labelHeight);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(labelText, selScreen.x + 4, selScreen.y - 4);
}
```

**Placement strategy:**
- Label above top-left corner (like rect tool)
- If near top edge (selScreen.y < 20), place below top-right corner instead
- Background ensures readability over any map content

## Anti-Patterns

### Anti-Pattern 1: Adding Third Canvas Layer for Ruler

**What people do:** Create separate ruler canvas layer on top of UI overlay.

**Why it's wrong:**
- Adds complexity without performance benefit (ruler redraws are infrequent)
- Requires additional canvas resize handling, pointer-events management
- Z-index coordination with existing layers
- Ruler overlay is functionally identical to line preview (both are transient geometric overlays)

**Do this instead:** Render ruler in `drawUiLayer()` alongside existing overlays.

### Anti-Pattern 2: Per-Frame Grid Pattern Recreation

**What people do:** Call `createPattern()` every `drawUiLayer()` call.

**Why it's wrong:**
- Creates new pattern 60 times per second during pan/zoom
- Causes frame drops (pattern creation is ~1-2ms, eats 6-12% of 16ms frame budget)
- Grid pattern only changes when zoom or settings change (rare)

**Do this instead:** Cache pattern in ref, invalidate only on zoom/settings change (existing pattern).

### Anti-Pattern 3: Ruler Measurement in Pixels Instead of Tiles

**What people do:** Display ruler measurements in pixels ("240 px") without tile count.

**Why it's wrong:**
- Users think in tiles (map is 256x256 tiles, game objects are tile-aligned)
- Pixel measurements are zoom-dependent (240 px at 1x zoom = 480 px at 2x zoom)
- Forces users to mentally divide by 16 (tile size) to understand distance

**Do this instead:** Primary measurement is tile count ("15 tiles"), secondary is pixels ("240 px at 1x zoom").

### Anti-Pattern 4: Committing Ruler State to Zustand on Every Mousemove

**What people do:** Call `setRulerState()` on every mousemove during drag.

**Why it's wrong:**
- Triggers React re-render on every pixel of drag (60+ times per second)
- Causes Zustand subscriptions to fire (components re-render unnecessarily)
- Ruler overlay already redraws via RAF-debounced `requestUiRedraw()`

**Do this instead:** Use ref-based transient state during drag, commit only on mouseup (existing pattern).

## Integration Checklist

### New Files
- **None** — all changes are extensions to existing files

### Modified Files

| File | Change Type | Description |
|------|-------------|-------------|
| `src/core/editor/slices/globalSlice.ts` | **EXTEND** | Add `gridSettings`, `rulerState`, `rulerMode` state + actions |
| `src/core/editor/slices/types.ts` | **EXTEND** | Add `GridSettings`, `RulerState`, `RulerMode` type definitions |
| `src/core/map/types.ts` | **EXTEND** | Add `ToolType.RULER` enum value |
| `src/components/MapCanvas/MapCanvas.tsx` | **EXTEND** | Add ruler overlay + grid customization + selection label to `drawUiLayer()` |
| `src/components/MapCanvas/MapCanvas.tsx` | **EXTEND** | Add ruler tool cases in mouse handlers (handleMouseDown/Move/Up) |
| `src/components/StatusBar/StatusBar.tsx` | **EXTEND** | Add ruler measurement display field |
| `src/components/ToolBar/ToolBar.tsx` | **EXTEND** | Add ruler button + grid settings dropdown |

### State Dependencies

```
GlobalSlice.gridSettings
    ↓ (subscription)
MapCanvas.drawUiLayer() → invalidate gridPatternRef → recreate pattern

GlobalSlice.rulerMode
    ↓ (direct read)
MapCanvas.drawUiLayer() → choose ruler rendering variant

rulerStateRef.current (transient)
    ↓ (ref-based, no subscription)
MapCanvas.drawUiLayer() → render active ruler overlay

DocumentsSlice.selection (existing)
    ↓ (existing subscription)
MapCanvas.drawUiLayer() → render selection + NEW: dimension label
```

## Build Order Recommendation

### Phase 1: Grid Customization (Low Risk)
1. Extend `GlobalSlice` with `gridSettings` (replace `showGrid: boolean`)
2. Migrate existing grid rendering to use `gridSettings.enabled/opacity/weight/color`
3. Add grid settings UI in ToolBar (dropdown panel)
4. Add center marker rendering logic

**Rationale:** Grid is isolated feature, no tool conflicts, visual-only changes.

**Verification:** Toggle grid settings, verify pattern updates without performance regression.

---

### Phase 2: Selection Info Labels (Low Risk)
1. Extend selection rendering in `drawUiLayer()` to add dimension label
2. Test label placement near edges (top/bottom overflow handling)

**Rationale:** Extends existing selection rendering, no new state, no mouse handling changes.

**Verification:** Drag selection, verify label displays `WxH` above rectangle.

---

### Phase 3: Ruler Tool — Straight Mode (Medium Risk)
1. Add `ToolType.RULER` enum
2. Add ruler button to ToolBar
3. Add `RulerState` + `RulerMode` to GlobalSlice
4. Add `rulerStateRef` to MapCanvas
5. Implement ruler mouse handlers (mouseDown/Move/Up) for straight line mode
6. Render straight line ruler overlay in `drawUiLayer()`
7. Add ruler measurement display to StatusBar

**Rationale:** Single mode first, proven ref-based pattern, no complex geometry.

**Verification:** Click-drag with ruler tool, verify line overlay + tile count display.

---

### Phase 4: Ruler Tool — Additional Modes (Low Risk)
1. Implement Manhattan, Area, Perimeter rendering variants
2. Add mode cycling via Escape key
3. Update StatusBar to show current mode

**Rationale:** Builds on working straight mode, rendering variants are independent.

**Verification:** Cycle modes with Escape, verify each mode renders correctly.

## Performance Considerations

| Operation | Frequency | Cost | Optimization |
|-----------|-----------|------|--------------|
| Grid pattern creation | Zoom/settings change (~1/sec peak) | 1-2ms | Already cached in ref |
| Ruler overlay rendering | Mousemove during drag (~60 FPS) | <0.5ms | RAF-debounced, simple geometry |
| Selection label rendering | Mousemove during drag (~60 FPS) | <0.1ms | Single text draw call |
| Center marker rendering | Viewport change (~1/sec) | ~0.5ms per 100 markers | Cull off-screen markers |

**All operations fit within 16ms frame budget.** No additional optimization needed.

**Center marker culling:**
```typescript
// Only render center markers in visible area + 1 tile margin
const startX = Math.floor(viewport.x / interval) * interval;
const endX = Math.ceil((viewport.x + visibleTilesX + 1) / interval) * interval;
// Same for Y
```

## Sources

- [HTML5 Canvas ruler library](https://github.com/MrFrankel/ruler) — Photoshop-like ruler pattern reference
- [Screen Ruler Tool](https://donesnap.com/screen-ruler/) — Canvas overlay distance measurement implementation
- [Grafana Canvas Panels](https://oneuptime.com/blog/post/2026-01-30-grafana-canvas-panels/view) — Modern canvas overlay architecture (2026)
- [Canvas Layers Architecture](https://2015fallhw.github.io/arcidau/CanvasLayers.html) — Multi-layer canvas performance patterns
- [Tiled Map Editor](https://github.com/mapeditor/tiled) — Industry-standard tile map editor reference
- Existing codebase: MapCanvas.tsx (line/rect preview patterns), CanvasEngine.ts (buffer architecture)

---
*Architecture research for: Ruler tool, grid customization, and selection info integration*
*Researched: 2026-02-13*
*Focus: Integration points, ref-based overlay patterns, grid pattern caching, build order*
