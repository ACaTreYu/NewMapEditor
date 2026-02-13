# Feature Landscape: Measurement, Grid Customization, and Selection Info

**Domain:** Tile map editor measurement tools and visual feedback
**Researched:** 2026-02-13
**Overall confidence:** MEDIUM (WebSearch verified with official sources, limited Context7 coverage)

## Table Stakes

Features users expect from tile/image editors. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes | Dependencies |
|---------|--------------|------------|-------|--------------|
| **Ruler: Line distance** | GIMP, Photoshop, standard in all image editors | Low | Click-drag measures straight line distance in pixels/tiles | Canvas overlay rendering |
| **Status bar: Selection count** | Photoshop Info panel, Blender status bar show selection stats | Low | "Sel: 5x3 (15 tiles)" format commonly used | Existing StatusBar component |
| **Grid: Toggle visibility** | Tiled, Unity, all map editors have grid toggle | Low | Already exists; table stakes confirmed | Existing showGrid state |
| **Grid: Opacity control** | Tiled, Unity, TileMap Studio allow grid opacity 0-100% | Low | Range slider 0-100%, stores as 0.0-1.0 | Existing createPattern grid |
| **Selection: Dimensions in status bar** | Already implemented in StatusBar.tsx (line 165-169) | N/A | `Sel: {width} x {height}` display | ✓ Already exists |
| **Ruler: Distance display in status bar** | GIMP shows distance/angle in status bar during measurement | Low | "Distance: 15 tiles (240px)" while dragging | Status bar update mechanism |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes | Dependencies |
|---------|-------------------|------------|-------|--------------|
| **Ruler: Rectangle area** | MAP Measurement Tool, Digimizer have area mode | Medium | Shows WxH and area (e.g., "8x12 = 96 tiles") | Line distance + rect calculation |
| **Ruler: Multi-point path** | Digimizer, MAP Tool support polyline measurement | Medium | Click multiple points, shows total distance + segment distances | Line distance + point array state |
| **Ruler: Radius/circle** | Map radius tools, useful for game mechanics (blast radius, range) | Medium | Click center, drag radius, shows radius + area (πr²) | Circle rendering + distance calculation |
| **Selection: Floating count label** | Uncommon in editors, reduces status bar clutter | Medium | Label positioned outside selection border (like transform handles) | Canvas overlay positioning logic |
| **Center on selection** | SketchUp, CAD tools have "Zoom to Selection" (F key common) | Low | Centers viewport on selection center, no zoom change | Viewport calculation from selection bounds |
| **Grid: Line weight control** | Unity allows grid thickness customization | Low | Thin/Medium/Thick presets (1px, 2px, 3px at 1x zoom) | Recreate grid pattern with lineWidth |
| **Grid: Color picker** | Godot PR #101101 adds grid color setting, Unity has color control | Low | Color picker for grid lines (default: #000000 50% opacity) | Recreate grid pattern with strokeStyle |
| **Ruler: Angle display** | GIMP measure tool shows angle 0-90° in each quadrant | Medium | Two-line mode: drag first line, then second line, shows angle between | Trigonometry calculation |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Ruler: Measurement scale/units** | Photoshop's measurement scale (e.g., "1 pixel = 1 foot") adds complexity for zero game design benefit | Display pixels and tiles only. Game designers think in tile units (16x16px tiles), not real-world units. |
| **Ruler: Measurement log** | Photoshop's measurement log (export to CSV) is overkill for map design | Transient measurements only. Use external screenshot/notes if needed. |
| **Grid: Arbitrary grid size** | Tiled Issue #368 requests custom grid sizes; AC maps are fixed 16x16px tiles | Fixed 16x16px grid. Changing grid size breaks tileset alignment. |
| **Selection: Pixel-precise bounds** | Image editors show pixel-level selection bounds; tile editor uses tile coords | Tile coordinates only. Status bar already shows tile dimensions (not pixel-level sub-tile selection). |
| **Ruler: Persistent measurement objects** | CAD tools save measurement annotations; map editor needs transient UI | Measurements disappear on tool change or Escape. Clean canvas, not persistent clutter. |
| **Grid: Snap-to-grid toggle per tool** | Tiled has "Snap to Fine Grid" per-tool complexity | All tools always snap to tile grid. 16x16px grid is fundamental to tile-based editing. |

## Feature Dependencies

```
Ruler (line distance)
  └─→ Ruler (rectangle area) (requires distance calculation)
  └─→ Ruler (multi-point path) (requires distance calculation + point array)
  └─→ Ruler (radius/circle) (requires distance calculation + circle rendering)
  └─→ Ruler (angle display) (requires two-line state machine)

Grid (toggle) [✓ exists]
  └─→ Grid (opacity control) (modifies existing pattern)
  └─→ Grid (line weight) (modifies existing pattern)
  └─→ Grid (color picker) (modifies existing pattern)

Selection (dimensions in status bar) [✓ exists]
  └─→ Selection (count in status bar) (calculate width × height)
  └─→ Selection (floating label) (requires canvas overlay positioning)

Center on selection (requires selection bounds)
```

## MVP Recommendation

### Phase 1: Ruler Foundation (Low-hanging fruit)
**Prioritize:**
1. **Ruler: Line distance** - Table stakes, enables all other ruler features
2. **Status bar: Selection count** - Trivial addition to existing display (15 tiles = multiply existing width×height)
3. **Center on selection** - Simple viewport calculation, high value for navigation

**Why this order:**
- Line distance is foundation for all ruler features (shared distance calculation)
- Selection count is 1-line change to existing StatusBar component
- Center-to-selection leverages existing selection bounds, no new state

### Phase 2: Grid Customization (User polish)
**Prioritize:**
1. **Grid: Opacity control** - Most requested grid feature (Tiled, Unity, all have this)
2. **Grid: Line weight** - Visual preference, pairs with opacity
3. **Grid: Color picker** - Completes grid customization triad

**Why this order:**
- All three modify existing `createPattern` grid rendering
- Opacity is most impactful (make grid subtle or prominent)
- Line weight and color are polish on top of opacity control

### Phase 3: Advanced Ruler (Differentiators)
**Prioritize:**
1. **Ruler: Rectangle area** - Natural extension of line distance, useful for region planning
2. **Ruler: Multi-point path** - Measures non-straight paths (corridors, routes)
3. **Ruler: Radius/circle** - Game mechanics-focused (weapon range, blast radius)

**Defer:**
- **Ruler: Angle display** - Niche use case (isometric alignment?), rarely needed in orthogonal tile maps
- **Selection: Floating label** - Nice-to-have, status bar count is sufficient

### Phase 4: Polish (Optional)
**If time allows:**
- **Selection: Floating label** - Reduces need to look at status bar, label follows selection
- **Ruler: Angle display** - For completeness, useful for diagonal measurements

## Implementation Patterns (from research)

### Ruler Tool Behavior (GIMP/Photoshop pattern)
**Standard UX:**
1. **Activation:** Tool palette icon or keyboard shortcut (R key common)
2. **Interaction:** Click start point, drag to end point, release
3. **Display:** Distance shown in status bar during drag, measurement line drawn on canvas
4. **Persistence:** Measurement line persists until tool change or Escape key
5. **Multi-mode:** Shift+drag for constrained angles (0°, 45°, 90°), Ctrl+click for multi-point

**GIMP specifics (from search):**
- Status bar displays: distance (pixels), angle (0-90° per quadrant)
- Optional info window with full details (more than status bar)
- Tool options: "Use info window" checkbox

**Photoshop specifics (from search):**
- Info panel (F8) shows Width, Height, Angle, Distance
- Ruler tool automatically selected when setting measurement scale
- Measurements persist as non-printing overlay

### Grid Customization (Tiled/Unity pattern)
**Standard UX:**
1. **Location:** View menu > Grid Settings or Preferences > Editor
2. **Controls:**
   - Show/Hide: Checkbox or View menu toggle (already exists)
   - Opacity: Slider 0-100% (stores as 0.0-1.0 for canvas globalAlpha)
   - Line Weight: Dropdown (Thin/Medium/Thick) or slider (1-5px at 1x zoom)
   - Color: Color picker (hex or RGB), default #000000 or #808080

**Tiled specifics (from search):**
- Grid settings in Edit > Preferences
- "Fine grid" divides tile grid further (not needed for AC)
- Grid color customization added because "black is not always best"

**Unity specifics (from search):**
- Grid color, opacity, size, scale, height all adjustable
- Grid preferences persist per project
- Snap-to-grid separate from grid visibility

### Selection Info Display (Photoshop/Blender pattern)
**Standard UX:**
1. **Status bar (primary):** "Sel: 5x3" or "Selection: 15 pixels"
2. **Info panel (secondary):** Width, Height, X, Y, Area (if panel open)
3. **Live update:** Dimensions update during marquee drag
4. **Format:** Width × Height for marquee, "N objects selected" for multi-object

**Photoshop Info panel (from search):**
- F8 to toggle Info panel
- Shows selection dimensions while dragging marquee
- Format: "W: 150 px H: 200 px" in dedicated panel section

**Blender status bar (from search):**
- Shows "N selected" and total count: "5 / 120 objects"
- Updates live as selection changes
- Different data per interaction mode (Edit mode shows vertices/edges/faces)

### Center on Selection (SketchUp/CAD pattern)
**Standard UX:**
1. **Trigger:** Keyboard shortcut (F key common) or View menu item
2. **Behavior:** Smooth pan to center selection bounds in viewport, no zoom change
3. **Edge case:** If no selection, no-op or center entire map
4. **Alternative:** "Zoom to Selection" changes zoom to fit selection (more aggressive)

**Implementation:**
```typescript
centerOnSelection() {
  if (!selection) return;
  const centerX = selection.x + selection.width / 2;
  const centerY = selection.y + selection.height / 2;
  const viewportCenterX = viewportWidth / (2 * zoom);
  const viewportCenterY = viewportHeight / (2 * zoom);
  setViewport({
    x: centerX - viewportCenterX,
    y: centerY - viewportCenterY
    // zoom unchanged
  });
}
```

### Marching Ants Animation (Canvas pattern)
**Already implemented in MapCanvas.tsx** - verified from codebase inspection.

**Standard pattern (from search):**
- Canvas `lineDashOffset` property animated over time
- Dual black/white strokes with offset for visibility on any background
- 4-6px dash/gap pattern, offset decrements each frame
- Driven by global animation frame counter (no per-selection RAF)

**AC implementation confirmed:**
- `animationFrame` counter in Zustand (line 94)
- `lineDashOffset` calculated from animationFrame (dual stroke pattern)
- Single global animation loop, all animated elements subscribe

## Measurement Display Formats

Based on research of GIMP, Photoshop, Digimizer patterns:

| Measurement Type | Status Bar Format | Canvas Overlay Format |
|------------------|-------------------|------------------------|
| Line distance | `Distance: 15 tiles (240px)` | Line + endpoints, dimension label at midpoint |
| Rectangle area | `Area: 8x12 = 96 tiles (1536px²)` | Rectangle + corner handles, WxH label at top |
| Multi-point path | `Path: 45 tiles (3 segments)` | Polyline + vertices, segment lengths at midpoints |
| Radius/circle | `Radius: 10 tiles (160px)` | Circle + center point + radius line, label at radius |
| Angle | `Angle: 45.0°` | Two lines + arc at vertex, angle label near arc |
| Selection count | `Sel: 5x3 (15 tiles)` | Existing marching ants border |

**Tile-first philosophy:**
- Primary unit is **tiles** (game design mental model)
- Secondary unit is **pixels** (technical reference)
- Format: `N tiles (Mpx)` or `NxM tiles (Kpx²)` for areas

## Grid Rendering Implementation

**Current implementation (from codebase inspection):**
- `createPattern` with Canvas 2D API (MapCanvas.tsx line 43)
- Pattern cached and recreated on zoom change (gridPatternZoomRef line 44)
- Fixed black color, fixed opacity

**Required changes for customization:**
```typescript
interface GridSettings {
  visible: boolean;      // Already exists as showGrid
  opacity: number;       // 0.0 to 1.0, default 0.5
  lineWeight: number;    // 1, 2, 3 (px at 1x zoom, scales with zoom)
  color: string;         // Hex color, default '#000000'
}

// Recreate pattern when ANY setting changes
function createGridPattern(zoom: number, settings: GridSettings): CanvasPattern {
  const patternCanvas = document.createElement('canvas');
  const tileSize = TILE_SIZE * zoom;
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const ctx = patternCanvas.getContext('2d')!;

  ctx.strokeStyle = settings.color;
  ctx.lineWidth = settings.lineWeight * zoom;
  ctx.globalAlpha = settings.opacity;

  // Draw grid lines (right and bottom edges)
  ctx.beginPath();
  ctx.moveTo(tileSize, 0);
  ctx.lineTo(tileSize, tileSize);
  ctx.lineTo(0, tileSize);
  ctx.stroke();

  return ctx.createPattern(patternCanvas, 'repeat')!;
}
```

**Grid settings storage:**
- Add `gridSettings: GridSettings` to Zustand GlobalSlice (UI preferences, not per-document)
- Persist to localStorage alongside other preferences
- No need to save to map file (rendering preference, not map data)

## Ruler Tool State Machine

**Tool modes (multi-mode ruler tool):**

| Mode | Activation | Interaction | Display |
|------|------------|-------------|---------|
| **Line** | Click-drag | Two points (start, end) | Distance in status bar, line on canvas |
| **Rectangle** | Click-drag + Shift | Two points, rectangle from bounds | WxH and area in status bar, rect on canvas |
| **Multi-point** | Click-click-... + Enter/Dblclick to end | Array of points | Total distance + segment count in status bar, polyline on canvas |
| **Radius** | Click-drag + Ctrl | Center point + radius | Radius + circle area in status bar, circle on canvas |
| **Angle** | Line mode + second line | Two lines sharing start point | Angle between lines in status bar, arc annotation on canvas |

**State machine:**
```typescript
type RulerMode = 'line' | 'rectangle' | 'multi-point' | 'radius' | 'angle';

interface RulerState {
  active: boolean;
  mode: RulerMode;
  points: Array<{ x: number; y: number }>; // Tile coordinates
  preview: { x: number; y: number } | null; // Current cursor position (not committed)
}

// Keyboard modifiers change mode DURING drag:
// - Shift: Switch to rectangle mode
// - Ctrl: Switch to radius mode
// - No modifier: Line mode (default)
// - Multi-point: Click without drag (discrete points)
```

**Escape cancellation:**
- Clear ruler state (same pattern as existing drag cancellation in MapCanvas.tsx)
- Window-level keydown listener checks `rulerStateRef.current.active`

## Floating Label Positioning

**Algorithm for label outside selection border:**

```typescript
function positionFloatingLabel(
  selection: { x: number; y: number; width: number; height: number },
  viewport: { x: number; y: number; zoom: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; anchor: 'top' | 'bottom' | 'left' | 'right' } {

  // Convert selection to screen coords
  const screenBounds = {
    left: (selection.x - viewport.x) * TILE_SIZE * viewport.zoom,
    top: (selection.y - viewport.y) * TILE_SIZE * viewport.zoom,
    right: (selection.x + selection.width - viewport.x) * TILE_SIZE * viewport.zoom,
    bottom: (selection.y + selection.height - viewport.y) * TILE_SIZE * viewport.zoom
  };

  // Prefer top-right corner (most visible, least likely to overlap UI)
  const labelHeight = 24; // px
  const margin = 4; // px gap from border

  // Try positions in priority order: top-right, top-left, bottom-right, bottom-left
  if (screenBounds.top > labelHeight + margin) {
    return { x: screenBounds.right, y: screenBounds.top - labelHeight, anchor: 'top' };
  } else if (screenBounds.bottom < canvasHeight - labelHeight - margin) {
    return { x: screenBounds.right, y: screenBounds.bottom + margin, anchor: 'bottom' };
  } else {
    // Fallback: inside border at top-left
    return { x: screenBounds.left + margin, y: screenBounds.top + margin, anchor: 'top' };
  }
}
```

**Label content:**
- `"15 tiles (5x3)"` format
- White text with black stroke (legible on any background)
- Small font (10-11px), bold weight

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| Ruler: Line distance | HIGH | GIMP docs, Photoshop docs, multiple image editors | Standard feature, clear UX patterns |
| Ruler: Multi-point/area | MEDIUM | Digimizer, MAP Tool (specialized tools) | Less common in general image editors |
| Grid customization | HIGH | Tiled docs, Unity docs, Godot PR | Table stakes for tile/map editors |
| Selection count display | HIGH | Photoshop Info panel, Blender status bar | Standard in all selection-based editors |
| Center on selection | MEDIUM | SketchUp forums, CAD tools | Common in 3D/CAD, less standardized in 2D editors |
| Floating label positioning | LOW | WebSearch only, no official patterns found | Custom implementation, unverified UX |
| Marching ants pattern | HIGH | Canvas 2D API docs, multiple tutorials | Standard Canvas API technique |

**Source hierarchy:**
- Context7: Not available for image editor libraries (GIMP, Photoshop not in Context7)
- Official docs: Adobe Photoshop docs (measurement tools), Tiled docs (grid customization)
- WebSearch verified: GIMP tutorials, Unity docs, Godot GitHub PR
- WebSearch unverified: Floating label positioning, center-to-selection keyboard shortcuts

## Open Questions

1. **Ruler tool keyboard shortcut:** R key is common (GIMP, Photoshop), but conflicts with potential "Rotate" shortcut. Recommend M (Measure) or U (rUler)?

2. **Grid settings location:** Preferences dialog (global) or View menu (per-document)? Research shows Tiled uses Preferences (global), Unity uses per-scene. **Recommendation:** Preferences (global) - grid display is user preference, not map data.

3. **Ruler persistence:** Should ruler measurements persist across tool changes, or clear immediately? GIMP persists, Aseprite feature requests suggest clearing. **Recommendation:** Clear on tool change (transient UI, not document state).

4. **Selection count format:** "15 tiles" vs "5x3 (15)" vs "5x3"? Status bar already shows "5x3" (from existing code). **Recommendation:** Add count in parentheses: "5x3 (15 tiles)".

5. **Center on selection keyboard shortcut:** F key is common in 3D tools, but might conflict with other shortcuts. **Recommendation:** Ctrl+E (center) or no default shortcut, just View menu item.

## Sources

**Measurement Tools:**
- [GIMP Measure Tool - Wikibooks](https://en.wikibooks.org/wiki/GIMP/Measure_Tool)
- [Set and manage measurement scales in Photoshop](https://helpx.adobe.com/photoshop/using/measurement.html)
- [Photoshop: Find Width and Height of Selected Area](https://techwelkin.com/photoshop-find-width-and-height-of-selected-area)
- [Digimizer Path Measurement Tool](https://www.digimizer.com/manual/u-path.php)
- [MAP Measurement Tool – Avenza Systems](https://support.avenza.com/hc/en-us/articles/360043635852-MAP-Measurement-Tool)
- [GIMP Ruler Tool: Measure distances and angles accurately](https://www.tutkit.com/en/text-tutorials/10664-gimp-ruler-tool-measure-distances-and-angles-precisely)

**Grid Customization:**
- [User Preferences — Tiled 1.11.0 documentation](https://doc.mapeditor.org/en/stable/manual/preferences/)
- [Add an editor setting for the GridMap grid color - Godot PR #101101](https://github.com/godotengine/godot/pull/101101)
- [Unity - Manual: Customize the grid](https://docs.unity3d.com/6000.1/Documentation/Manual/CustomizeGrid.html)
- [TileMap Studio - Free Tile Map Editor](https://tilemapstudio.app/)

**Selection Display:**
- [Status Bar - Blender 5.0 Manual](https://docs.blender.org/manual/en/latest/interface/window_system/status_bar.html)
- [Tilemap Studio](https://www.romhacking.net/utilities/1480/)

**Canvas Patterns:**
- [Marching Ants · Adam Koski](http://dandc87.github.io/posts/marching-ants/)
- [CanvasRenderingContext2D: lineDashOffset property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineDashOffset)
- [Marching ants effect - Plus2net Canvas Tutorial](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php)

**View Navigation:**
- [Keyboard Shortcuts — Tiled 1.11.0 documentation](https://doc.mapeditor.org/en/stable/manual/keyboard-shortcuts/)
- [Keyboard shortcut for Zoom to selection? - SketchUp Community](https://forums.sketchup.com/t/keyboard-shortcut-for-zoom-to-selection/22581)

**Aseprite Research (Ruler tool requests):**
- [Is there some sort of ruler tool in this program? - Aseprite Community](https://community.aseprite.org/t/is-there-some-sort-of-ruler-tool-in-this-program/6437)
- [Rulers tool · Issue #747 · aseprite/aseprite](https://github.com/aseprite/aseprite/issues/747)
