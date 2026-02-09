# Phase 36: Status Bar & UI Polish - Research

**Researched:** 2026-02-09
**Domain:** React component state management, CSS overflow/scrolling
**Confidence:** HIGH

## Summary

Phase 36 adds hover info to the status bar and fixes scrollbar issues in the Map Settings dialog. The technical domain is straightforward: lift hover state from map/tileset canvases to App.tsx, pass tile ID to StatusBar, and add CSS `overflow-y: auto` to dialog tab panels.

This is a polish phase with minimal architectural complexity. The codebase already has the StatusBar component with Props interface accepting `cursorTileId`, and App.tsx already tracks cursor position from MapCanvas. The missing pieces are: (1) tracking hover state from TilePalette, (2) distinguishing map vs tileset hover, (3) adding overflow CSS to `.tab-content`.

**Primary recommendation:** Use existing React state lifting patterns. No new libraries needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Already in use, state lifting via props/callbacks |
| Zustand | 4.x | Global state (not needed for this phase) | Hover is ephemeral local state |
| CSS3 | - | Overflow scrolling | Native browser capability |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Props drilling | Zustand store | Overkill for ephemeral hover state that doesn't need persistence |
| CSS overflow | Custom scrollbar component | Unnecessary complexity, native works fine |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended State Flow
```
TilePalette/MapCanvas (onMouseMove)
  → App.tsx (useState for cursorTileId + source)
    → StatusBar (props: cursorX, cursorY, cursorTileId, source?)
```

### Pattern 1: State Lifting for Hover Info
**What:** Lift tile ID from both MapCanvas and TilePalette to App.tsx, pass to StatusBar
**When to use:** Ephemeral UI state that needs to be displayed elsewhere
**Example:**
```typescript
// App.tsx
const [cursorTileId, setCursorTileId] = useState<number | undefined>(undefined);
const [hoverSource, setHoverSource] = useState<'map' | 'tileset' | null>(null);

const handleMapCursorMove = (x: number, y: number) => {
  // ... existing logic
  setCursorTileId(map.tiles[y * MAP_WIDTH + x]);
  setHoverSource('map');
};

const handleTilesetHover = (tileId: number | undefined) => {
  setCursorTileId(tileId);
  setHoverSource(tileId === undefined ? null : 'tileset');
};

// StatusBar.tsx
<div className="status-field status-field-tile">
  {cursorTileId !== undefined ? `Tile: ${cursorTileId}` : 'Tile: --'}
</div>
<div className="status-field status-field-coords">
  {cursorX >= 0 ? `X: ${cursorX}  Y: ${cursorY}` : 'X: --  Y: --'}
</div>
```

### Pattern 2: Scrollable Dialog Content
**What:** Add `overflow-y: auto` to tab panel container to enable scrolling
**When to use:** Content exceeds fixed-height containers
**Example:**
```css
/* MapSettingsDialog.css */
.tab-content {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;  /* Already present, verify it works */
  background: var(--bg-primary);
  min-height: 300px;
  max-height: 420px;  /* Fixed height triggers overflow */
}

.tab-panel {
  display: block;
  /* No height/overflow restrictions — content flows naturally */
}
```

### Anti-Patterns to Avoid
- **Global state for hover:** Hover is ephemeral and should be local/lifted props, not Zustand
- **Debouncing mouse events:** onMouseMove is already optimized by React; extra debouncing adds lag
- **Fixed pixel heights on tab panels:** Let content flow, only constrain `.tab-content` container

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mouse coordinate tracking | Custom event system | React onMouseMove callbacks | Already works, well-tested |
| Scrollbar styling | Custom scrollbar component | CSS overflow + native scrollbars | Cross-browser, accessible |
| Tile ID calculation | Custom coordinate math | Existing screenToTile patterns in MapCanvas/TilePalette | Already implemented, tested |

**Key insight:** This phase is about wiring existing patterns, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Stale Tile ID on Mouse Leave
**What goes wrong:** Status bar shows last-hovered tile even after cursor leaves canvas
**Why it happens:** onMouseLeave handler doesn't clear the tile ID state
**How to avoid:** Reset cursorTileId to `undefined` in mouse leave handlers
**Warning signs:** Status bar shows "Tile: 123" when cursor is outside both canvases

### Pitfall 2: Coordinates from Wrong Source
**What goes wrong:** Status bar shows map coordinates when hovering over tileset (or vice versa)
**Why it happens:** Not tracking which component sent the hover event
**How to avoid:** Either (a) pass separate callbacks, or (b) track hover source in state
**Warning signs:** Status bar shows "X: 5 Y: 3" when hovering over tileset at row 10

### Pitfall 3: Scroll Container Not Scrolling
**What goes wrong:** Dialog tabs have overflow content but no scrollbar appears
**Why it happens:** Parent has `overflow: hidden` or child has `overflow: auto` instead of parent
**How to avoid:** Verify `.tab-content` has `overflow-y: auto` and fixed `max-height`
**Warning signs:** Settings dialog cuts off bottom content with no scrollbar

### Pitfall 4: Props Drilling Multiple Levels
**What goes wrong:** Passing hover callbacks through intermediate components
**Why it happens:** TilePalette is wrapped by TilesetPanel which is wrapped by panels
**How to avoid:** Lift state directly to App.tsx, pass callbacks as props through wrappers
**Warning signs:** Multiple intermediate components with pass-through props

## Code Examples

Verified patterns from existing codebase:

### Cursor Tracking in MapCanvas (Existing Pattern)
```typescript
// MapCanvas.tsx (lines 812-818)
const handleMouseMove = (e: React.MouseEvent) => {
  const rect = gridLayerRef.current?.getBoundingClientRect();
  if (!rect) return;

  const { x, y } = screenToTile(e.clientX - rect.left, e.clientY - rect.top);
  setCursorTile({ x, y });
  onCursorMove?.(x, y);  // Callback to parent
  // ... tool logic
};
```

### Tile ID Calculation in App.tsx (Existing Pattern)
```typescript
// App.tsx (lines 101-108)
const handleCursorMove = useCallback((x: number, y: number) => {
  setCursorPos({ x, y });
  if (map && x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_WIDTH) {
    setCursorTileId(map.tiles[y * MAP_WIDTH + x]);
  } else {
    setCursorTileId(undefined);
  }
}, [map]);
```

### TilePalette Mouse Tracking (Add Hover Callback)
```typescript
// TilePalette.tsx - NEW pattern to add
interface Props {
  tilesetImage: HTMLImageElement | null;
  compact?: boolean;
  showRowLabels?: boolean;
  fullHeight?: boolean;
  onTileHover?: (tileId: number | undefined, col: number, row: number) => void;  // NEW
}

const handleMouseMove = (e: React.MouseEvent) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;
  const x = e.clientX - rect.left - offsetX;
  const y = e.clientY - rect.top;

  if (x >= 0) {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE) + scrollOffset;
    const tileId = row * TILES_PER_ROW + col;
    onTileHover?.(tileId, col, row);  // NEW
  }

  // ... existing drag logic
};

const handleMouseLeave = () => {
  onTileHover?.(undefined, -1, -1);  // NEW - clear on leave
  // ... existing drag logic
};
```

### Scrollable Dialog Content (Existing CSS)
```css
/* MapSettingsDialog.css (lines 84-91) - ALREADY CORRECT */
.tab-content {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;  /* ← Already present */
  background: var(--bg-primary);
  min-height: 300px;
  max-height: 420px;  /* ← Triggers overflow when content exceeds */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tooltip libraries | Native title attributes + status bar | Modern UIs (2020+) | Simpler, less dependencies |
| Custom scrollbars | Native CSS overflow | Always standard | Accessibility, cross-browser |

**Deprecated/outdated:**
- **Custom scrollbar libraries:** Native `overflow-y: auto` is standard and accessible
- **Mouse position polling:** React synthetic events are the standard (no setInterval needed)

## Open Questions

1. **Should status bar show different labels for map vs tileset hover?**
   - What we know: StatusBar currently shows "X: Y:" which is map-centric
   - What's unclear: Should tileset hover show "Col: Row:" or "Tile: X" only?
   - Recommendation: Start with same format (X/Y for map coords, Col/Row for tileset), can refine in UX polish

2. **Should tileset hover show tile coordinates or just tile ID?**
   - What we know: TilePalette already shows "Tile: 123" in `.palette-info` div
   - What's unclear: Is redundant info in status bar useful or cluttered?
   - Recommendation: Show both tile ID and col/row for consistency with map canvas

3. **Is the dialog scroll issue confirmed to exist?**
   - What we know: CSS already has `overflow-y: auto` and `max-height: 420px`
   - What's unclear: Is this a bug report from testing or hypothetical?
   - Recommendation: Test at 720p window size to verify if scrollbars appear when needed

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/StatusBar/StatusBar.tsx` (lines 1-58)
- Existing codebase: `src/components/MapCanvas/MapCanvas.tsx` (lines 812-818)
- Existing codebase: `src/components/TilePalette/TilePalette.tsx` (lines 187-253)
- Existing codebase: `src/components/MapSettingsDialog/MapSettingsDialog.css` (lines 84-91)
- Existing codebase: `src/App.tsx` (lines 101-108)

### Secondary (MEDIUM confidence)
- React documentation: State lifting pattern (standard React practice)
- MDN Web Docs: CSS overflow property (standard CSS)

### Tertiary (LOW confidence)
- None needed — this is internal refactoring based on existing patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing React patterns, no new libraries
- Architecture: HIGH - State lifting is well-documented React pattern
- Pitfalls: HIGH - Based on common React/CSS bugs in similar scenarios

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable patterns, unlikely to change)
