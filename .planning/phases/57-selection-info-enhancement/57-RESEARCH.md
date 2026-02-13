# Phase 57: Selection Info Enhancement - Research

**Researched:** 2026-02-13
**Domain:** Canvas overlay rendering, text labels, viewport-aware positioning
**Confidence:** HIGH

## Summary

Phase 57 adds selection dimension and tile count display in two locations: status bar (existing component) and floating label (new canvas overlay). The status bar already displays selection info at lines 165-169 of StatusBar.tsx but only shows dimensions ("Sel: 5 x 3"), not tile count. The floating label is a new canvas overlay rendered on the UI layer alongside existing overlays (line preview at line 278, rect drag dimensions at line 544).

The implementation requires: (1) updating StatusBar.tsx to show tile count in format "Sel: 5x3 (15 tiles)", (2) adding floating label rendering to MapCanvas.tsx drawUiLayer() function using canvas fillText() with intelligent positioning based on viewport edges and zoom level, and (3) computing selection dimensions from either selectionDragRef (transient) or selection state (committed).

**Primary recommendation:** Extend existing patterns—status bar field update is trivial (2 lines), floating label follows established canvas text rendering at lines 313-316 and 541-544 with viewport-aware positioning logic similar to rect drag label.

## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | Native | Text rendering via fillText() | Already used for all canvas overlays (line 316, 544) |
| Zustand | 4.x | Selection state management | Single source of truth for editor state (EditorState.ts) |
| React 18 | 18.x | UI component updates | StatusBar.tsx component framework |
| TypeScript | 5.x | Type safety | Entire codebase uses strict mode |

### Supporting (No Additional Libraries Needed)
All functionality can be implemented with existing dependencies. No new packages required.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas fillText() | HTML overlay div | HTML would need manual viewport sync, CSS transforms for zoom, and z-index management—far more complex than canvas text |
| Status bar field | Separate tooltip | Unnecessary complexity when status bar already displays selection info |
| Computed tile count | Stored in state | Dimensions already stored (selection.startX/endX/startY/endY), tile count is trivial math—no need to store redundant data |

## Architecture Patterns

### Recommended Project Structure
```
src/components/StatusBar/
├── StatusBar.tsx         # Update line 165-169 to add tile count
└── StatusBar.css         # No changes needed

src/components/MapCanvas/
├── MapCanvas.tsx         # Add floating label to drawUiLayer() at line ~570 (after selection rect)
└── MapCanvas.css         # No changes needed
```

### Pattern 1: Status Bar Selection Info
**What:** Display selection dimensions and tile count in existing status bar field
**When to use:** Always when selection is active (width > 1 OR height > 1)
**Example:**
```typescript
// Current code (StatusBar.tsx lines 32, 165-169):
const showSelection = tileSelection.width > 1 || tileSelection.height > 1;
{showSelection && (
  <div className="status-field">
    Sel: {tileSelection.width} x {tileSelection.height}
  </div>
)}

// Enhanced version:
const showSelection = tileSelection.width > 1 || tileSelection.height > 1;
const tileCount = tileSelection.width * tileSelection.height;
{showSelection && (
  <div className="status-field">
    Sel: {tileSelection.width}x{tileSelection.height} ({tileCount} tiles)
  </div>
)}
```

### Pattern 2: Canvas Text Overlay with Viewport Awareness
**What:** Render floating text label positioned outside selection rectangle using canvas fillText()
**When to use:** When active selection exists (either selectionDragRef.current.active OR selection.active)
**Example:**
```typescript
// Add after selection rectangle rendering (MapCanvas.tsx ~line 570):
if (activeSelection) {
  const minX = Math.min(activeSelection.startX, activeSelection.endX);
  const minY = Math.min(activeSelection.startY, activeSelection.endY);
  const maxX = Math.max(activeSelection.startX, activeSelection.endX);
  const maxY = Math.max(activeSelection.startY, activeSelection.endY);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const tileCount = w * h;

  const selScreen = tileToScreen(minX, minY, overrideViewport);

  // Dimension text
  const labelText = `${w}x${h} (${tileCount})`;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Measure text for positioning
  const metrics = ctx.measureText(labelText);
  const textWidth = metrics.width;
  const textHeight = 16; // Approximate height

  // Intelligent positioning: prefer top-left corner, fallback to other corners if clipped
  let labelX = selScreen.x - textWidth - 8;
  let labelY = selScreen.y - textHeight - 4;

  // Fallback 1: If left edge is clipped, move to right side
  if (labelX < 0) {
    labelX = selScreen.x + w * tilePixels + 8;
  }

  // Fallback 2: If top edge is clipped, move below selection
  if (labelY < 0) {
    labelY = selScreen.y + h * tilePixels + 4;
  }

  // Background rectangle for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(labelX - 4, labelY - 2, textWidth + 8, textHeight + 4);

  // White text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(labelText, labelX, labelY);
}
```

### Pattern 3: Selection Dimension Computation
**What:** Compute selection width, height, and tile count from normalized coordinates
**When to use:** Both in status bar and floating label
**Example:**
```typescript
// Source: existing pattern at MapCanvas.tsx lines 555-560
const minX = Math.min(activeSelection.startX, activeSelection.endX);
const minY = Math.min(activeSelection.startY, activeSelection.endY);
const maxX = Math.max(activeSelection.startX, activeSelection.endX);
const maxY = Math.max(activeSelection.startY, activeSelection.endY);
const w = maxX - minX + 1; // +1 because coordinates are inclusive
const h = maxY - minY + 1;
const tileCount = w * h;
```

### Anti-Patterns to Avoid
- **Hard-coded label position:** Label must reposition intelligently based on viewport edges (not always top-left)
- **Pixel positioning instead of tile positioning:** Selection coordinates are tiles, not pixels—convert via tileToScreen()
- **Separate React component for label:** Canvas overlay is simpler than React portal + CSS positioning + viewport sync
- **Animating label position:** Label should snap to position, not animate (matches rect drag label behavior at line 544)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text rendering | Custom bitmap font renderer | Canvas fillText() | Native, hardware-accelerated, handles all fonts and sizes |
| Text measurement | Character width tables | ctx.measureText() | Accurate width for positioning, accounts for font variations |
| Viewport clipping detection | Manual bounds checking | Compare screen coords to canvas.width/height | Already used for scroll bar metrics (line 684-739) |
| Selection state access | Duplicate state tracking | Use activeSelection pattern (line 548-552) | Already computes transient vs committed selection |

**Key insight:** Canvas 2D text API is battle-tested and performant. Don't reimplement text layout—use fillText() with measureText() for positioning. The codebase already demonstrates this pattern in line labels (line 316) and rect drag labels (line 544).

## Common Pitfalls

### Pitfall 1: Label Clipping at Viewport Edges
**What goes wrong:** Label positioned outside viewport when selection is near top/left edge
**Why it happens:** Default top-left positioning doesn't check if label fits in visible area
**How to avoid:** Implement fallback positioning cascade—left→right, top→bottom
**Warning signs:** Label disappears or is cut off when selection is near edges

### Pitfall 2: Text Readability at Low/High Zoom
**What goes wrong:** Text too small at 0.25x zoom or overlaps selection at 4x zoom
**Why it happens:** Fixed font size doesn't scale with viewport zoom
**How to avoid:** Keep font size fixed (13px) regardless of zoom—text overlay should be legible at all zoom levels, not scaled with tiles. This matches existing pattern at line 313 (line preview label uses 14px fixed).
**Warning signs:** User reports can't read label at low zoom

### Pitfall 3: Performance Impact from Text Rendering
**What goes wrong:** Frame drops when rendering text every frame
**Why it happens:** fillText() is called unconditionally in drawUiLayer()
**How to avoid:** Text rendering is already part of drawUiLayer() which is RAF-debounced (lines 576-586) and only redraws when selection changes (line 667-671). No additional optimization needed—pattern is already correct.
**Warning signs:** FPS drops below 60 during selection drag

### Pitfall 4: Incorrect Tile Count for Single-Tile Selection
**What goes wrong:** Shows "Sel: 1x1 (1 tiles)" in status bar when single tile selected
**Why it happens:** `showSelection` check uses `width > 1 || height > 1` (line 32)—1x1 selection won't display
**How to avoid:** Current behavior is CORRECT—single tile selection shouldn't show status bar info (user decision from Phase 16). Tile count only relevant for multi-tile selections.
**Warning signs:** Status bar cluttered with "Sel: 1x1 (1 tiles)" for every tile click

### Pitfall 5: Z-Index Confusion with Canvas Layers
**What goes wrong:** Label renders below selection rectangle
**Why it happens:** Canvas render order matters—later draws appear on top
**How to avoid:** Render label AFTER selection rectangle in drawUiLayer(). Selection rect is at lines 547-572, so label should be added after line 572.
**Warning signs:** Label is invisible or appears behind selection border

## Code Examples

Verified patterns from codebase:

### Existing Canvas Text Label (Line Preview)
```typescript
// Source: MapCanvas.tsx lines 312-316
const count = lineTiles.length;
ctx.fillStyle = '#fff';
ctx.font = '14px sans-serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillText(`${count} tiles`, endScreen.x + tilePixels + 5, endScreen.y);
```

### Existing Canvas Text Label (Rect Drag Dimensions)
```typescript
// Source: MapCanvas.tsx lines 540-544
ctx.fillStyle = '#fff';
ctx.font = '12px sans-serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillText(`${w}x${h}`, topLeft.x + w * tilePixels + 4, topLeft.y);
```

### Existing Selection State Pattern
```typescript
// Source: MapCanvas.tsx lines 548-572
const activeSelection = selectionDragRef.current.active
  ? selectionDragRef.current
  : selection.active
    ? selection
    : null;

if (activeSelection) {
  const minX = Math.min(activeSelection.startX, activeSelection.endX);
  const minY = Math.min(activeSelection.startY, activeSelection.endY);
  const maxX = Math.max(activeSelection.startX, activeSelection.endX);
  const maxY = Math.max(activeSelection.startY, activeSelection.endY);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const selScreen = tileToScreen(minX, minY, overrideViewport);
  // ... render selection rectangle
}
```

### Status Bar Conditional Rendering
```typescript
// Source: StatusBar.tsx lines 32, 165-169
const showSelection = tileSelection.width > 1 || tileSelection.height > 1;

{showSelection && (
  <div className="status-field">
    Sel: {tileSelection.width} x {tileSelection.height}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Selection dimensions only | Dimensions + tile count | Phase 57 (this phase) | Users can see how many tiles are selected without mental math |
| Status bar info only | Status bar + floating label | Phase 57 (this phase) | Floating label provides contextual feedback during drag operations |
| Static positioning | Intelligent fallback positioning | Phase 57 (this phase) | Label remains visible when selection is near viewport edges |

**Deprecated/outdated:**
- N/A—this is a new feature, not replacing existing functionality

## Open Questions

1. **Should floating label appear during selection drag or only after mouseup?**
   - What we know: Rect drag label appears during drag (line 434-544), line preview label appears during drag (line 278-317)
   - What's unclear: User preference for selection drag—might be distracting vs helpful
   - Recommendation: Show during drag (consistent with other tools), verify in UAT

2. **Should label background be semi-transparent or opaque?**
   - What we know: No existing canvas text labels use backgrounds (lines 316, 544 render text directly)
   - What's unclear: Readability over complex tilesets
   - Recommendation: Semi-transparent black background (rgba(0,0,0,0.7)) for readability, matches paste preview opacity (line 324)

3. **Should zoom level affect label positioning strategy?**
   - What we know: At 4x zoom, selection can be very large; at 0.25x zoom, very small
   - What's unclear: Whether positioning fallbacks should prefer different corners at different zoom levels
   - Recommendation: Keep positioning logic zoom-agnostic (same cascade at all zooms), verify in UAT if adjustments needed

## Sources

### Primary (HIGH confidence)
- Codebase: E:\NewMapEditor\src\components\StatusBar\StatusBar.tsx (lines 1-177) - Current status bar implementation
- Codebase: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx (lines 1-1525) - Canvas overlay rendering patterns
- Codebase: E:\NewMapEditor\src\core\editor\slices\globalSlice.ts (lines 1-205) - TileSelection type and state
- Documentation: E:\NewMapEditor\.planning\codebase\ARCHITECTURE.md - Canvas layer architecture and data flow
- Documentation: E:\NewMapEditor\.planning\codebase\CONVENTIONS.md - Code style and naming conventions
- Documentation: E:\NewMapEditor\CLAUDE.md - Selection storage as tile coordinates (integers)

### Secondary (MEDIUM confidence)
- Phase context: Marching ants pattern confirmed from grep search showing "dual black/white strokes with offset lineDashOffset" in documentation
- Prior art: Line preview label (MapCanvas.tsx:313-316) and rect drag label (MapCanvas.tsx:541-544) demonstrate canvas text rendering

### Tertiary (LOW confidence)
- None—all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs already in use, no new dependencies
- Architecture: HIGH - Canvas overlay pattern established, extensive prior art in drawUiLayer()
- Pitfalls: HIGH - Based on observed patterns in existing canvas text rendering

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days—stable APIs, mature codebase)
