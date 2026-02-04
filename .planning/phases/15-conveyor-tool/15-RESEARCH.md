# Phase 15: Conveyor Tool - Research

**Researched:** 2026-02-04
**Domain:** React canvas interaction patterns, drag-to-draw rectangles, dropdown UI patterns
**Confidence:** HIGH

## Summary

The CONVEYOR tool implementation follows established patterns already present in the codebase (BRIDGE, BUNKER, HOLDING_PEN rect tools) with two key additions: (1) a dropdown pattern for tool variants that will be retrofitted to other game object tools, and (2) live pattern preview during drag. The conveyor placement logic exists in `GameObjectSystem.placeConveyor()` with exact SEdit rectangle-filling patterns using 8-tile data arrays (4 tiles for each direction). Custom.dat parsing for conveyor data is already implemented. The primary research focus is on dropdown UI patterns for variant selection since the drag-to-draw and placement logic already exist.

The standard approach is to use native React state and event handlers for dropdown menus, avoiding heavyweight libraries for this simple use case. Keyboard handling for Escape cancellation follows existing patterns in the codebase (lineState, rectDragState cancellation). Undo support is straightforward using the existing `pushUndo()` system before `placeGameObjectRect()` calls.

**Primary recommendation:** Extend existing `RectDragState` pattern for conveyor placement, add visual dropdown component for tool variants using controlled React state, and implement live pattern preview by rendering conveyor tiles during drag similar to bunker/bridge rect preview.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Already in project, established patterns |
| Zustand | Current | State management | Already used for EditorState, game object tool state |
| Canvas API | Native | Tile rendering, preview | Direct control, no overhead, existing patterns |
| TypeScript | 5.x | Type safety | Project standard, prevents errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | No additional libraries needed | Use native React patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native dropdown | react-select, Headless UI | Adds dependency for simple dropdown; existing code uses native patterns |
| React Konva | Canvas API directly | Project already uses direct Canvas API throughout; Konva adds complexity |
| react-hotkeys-hook | Window event listeners | Simple keyboard handling doesn't justify library dependency |

**Installation:**
```bash
# No new packages needed - use existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ToolBar/              # Add CONVEYOR button, dropdown logic
│   ├── GameObjectToolPanel/  # Add conveyor direction selector
│   └── MapCanvas/            # Drag interaction, live preview rendering
├── core/
│   ├── editor/
│   │   └── EditorState.ts    # conveyorDir state, setConveyorDirection action
│   └── map/
│       ├── GameObjectSystem.ts  # placeConveyor() - already exists
│       └── GameObjectData.ts    # convLrData, convUdData - already exists
```

### Pattern 1: Rect Drag with Live Preview
**What:** User clicks canvas, drags to opposite corner, sees live tile preview while dragging, releases to place.
**When to use:** All drag-to-rectangle game object tools (BUNKER, BRIDGE, CONVEYOR, HOLDING_PEN, WALL_RECT).
**Example:**
```typescript
// Source: Existing codebase pattern (MapCanvas.tsx:528-531, 565-567, 613-616)
// Mouse down: Start rect drag
if (currentTool === ToolType.CONVEYOR) {
  setRectDragState({ active: true, startX: x, startY: y, endX: x, endY: y });
}

// Mouse move: Update end position
if (rectDragState.active) {
  setRectDragState({ endX: x, endY: y });
}

// Mouse up: Place object and clear state
if (rectDragState.active) {
  pushUndo('Place conveyor');
  placeGameObjectRect(rectDragState.startX, rectDragState.startY, rectDragState.endX, rectDragState.endY);
  setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
}
```

### Pattern 2: Escape Key Cancellation
**What:** When user presses Escape during drag, cancel the operation and reset state.
**When to use:** Any in-progress interaction that should be cancellable (line drawing, rect dragging).
**Example:**
```typescript
// Source: Existing codebase pattern (MapCanvas.tsx:633-641)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (rectDragState.active) {
        setRectDragState({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [rectDragState]);
```

### Pattern 3: Direction Selector Dropdown (New Pattern)
**What:** Clicking a tool button with variants shows a dropdown of visual options; selecting one activates the tool with that variant.
**When to use:** Game object tools with multiple variants (SPAWN types, BUNKER directions, CONVEYOR directions).
**Example:**
```typescript
// Source: React patterns (compound component pattern adaptation)
// Simple controlled dropdown without library dependencies
const [dropdownOpen, setDropdownOpen] = useState(false);

<div className="tool-button-with-dropdown">
  <button
    className={`toolbar-button ${currentTool === ToolType.CONVEYOR ? 'active' : ''}`}
    onClick={() => setDropdownOpen(!dropdownOpen)}
  >
    <span className="toolbar-icon">🎯</span>
    <span className="toolbar-label">Conveyor</span>
  </button>

  {dropdownOpen && (
    <div className="tool-dropdown">
      <button onClick={() => { setConveyorDirection(0); setTool(ToolType.CONVEYOR); setDropdownOpen(false); }}>
        Horizontal →
      </button>
      <button onClick={() => { setConveyorDirection(1); setTool(ToolType.CONVEYOR); setDropdownOpen(false); }}>
        Vertical ↓
      </button>
    </div>
  )}
</div>
```

### Pattern 4: Live Tile Pattern Preview During Drag
**What:** As user drags conveyor rectangle, render actual conveyor tiles at cursor position to preview final pattern.
**When to use:** Rectangle tools where pattern visualization helps user (conveyor, bridge).
**Example:**
```typescript
// Source: Adapted from existing rect drag preview (MapCanvas.tsx:330-361)
// In draw() function, during rectDragState.active:
if (rectDragState.active && currentTool === ToolType.CONVEYOR) {
  const minX = Math.min(rectDragState.startX, rectDragState.endX);
  const minY = Math.min(rectDragState.startY, rectDragState.endY);
  const maxX = Math.max(rectDragState.startX, rectDragState.endX);
  const maxY = Math.max(rectDragState.startY, rectDragState.endY);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const data = conveyorDir === 0 ? convLrData[0] : convUdData[0];

  // Render actual conveyor tiles at preview locations
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const tileId = calculateConveyorTile(row, col, w, h, conveyorDir, data);
      const screenPos = tileToScreen(minX + col, minY + row);
      drawTilePreview(ctx, tileId, screenPos.x, screenPos.y, tilePixels);
    }
  }
}
```

### Anti-Patterns to Avoid
- **Global dropdown state:** Don't store dropdown open/closed state in Zustand; use local component state (dropdowns are ephemeral UI).
- **Premature abstraction:** Don't create generic dropdown component yet; implement inline first, extract if pattern repeats 3+ times.
- **Library dependencies for simple dropdowns:** Don't use react-select or Headless UI for 2-option dropdown; native React is simpler.
- **Undo before drag starts:** Don't pushUndo() on mouse down; only call it on mouse up when placement completes.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conveyor tile pattern calculation | Custom algorithm | `GameObjectSystem.placeConveyor()` | Already implemented with exact SEdit logic (map.cpp:2697-2718) |
| Custom.dat conveyor data parsing | New parser | `CustomDatParser.ts` existing logic | Already parses CONV_LR (type 8) and CONV_UD (type 9) blocks |
| Rectangle drag state management | New state system | Existing `RectDragState` + `setRectDragState()` | Already handles BUNKER, BRIDGE, HOLDING_PEN, WALL_RECT |
| Undo/redo for conveyor placement | Custom undo logic | `pushUndo('Place conveyor')` before `placeGameObjectRect()` | Existing undo system captures tile state automatically |
| Keyboard shortcut handling | react-hotkeys-hook library | Existing window event listener pattern in ToolBar.tsx | Already handles all tool shortcuts (lines 92-133) |
| Tile rendering with animation | Animation library | Existing MapCanvas draw loop with ANIMATION_DEFINITIONS | Already renders animated tiles correctly |

**Key insight:** The conveyor tool is 90% already implemented. GameObjectSystem.placeConveyor() exists with exact SEdit logic for the 4-tile repeating pattern. Custom.dat parsing exists. Rect drag exists. Undo exists. The work is UI: (1) add toolbar button, (2) add dropdown for direction selection, (3) wire up keyboard shortcut, (4) add live preview rendering.

## Common Pitfalls

### Pitfall 1: Dropdown Click Propagation
**What goes wrong:** Clicking dropdown option triggers both the dropdown handler AND the toolbar button handler, causing dropdown to immediately reopen.
**Why it happens:** Event bubbling - click events propagate up through parent elements unless stopped.
**How to avoid:** Call `e.stopPropagation()` in dropdown option click handlers, or use `onBlur` to close dropdown when focus leaves.
**Warning signs:** Dropdown flickers or immediately reopens after selecting an option.

### Pitfall 2: Conveyor Pattern Edge Cases
**What goes wrong:** Rectangle dimensions that aren't multiples of pattern size show incomplete tiles at edges; SEdit's logic skips rightmost column for odd widths (LR) or bottom row for odd heights (UD).
**Why it happens:** Conveyor patterns are 2-tile wide (LR) or 2-tile tall (UD); odd dimensions create partial patterns.
**How to avoid:** Follow exact SEdit logic in GameObjectSystem.placeConveyor() - lines 340-342, 349-351 skip last tile when dimension is odd.
**Warning signs:** Extra tiles placed at rectangle edges, pattern doesn't repeat cleanly.

### Pitfall 3: Custom.dat Not Loaded
**What goes wrong:** User tries to place conveyor before loading custom.dat; convLrData/convUdData arrays contain zeros; placement fails silently or places tile 0.
**Why it happens:** Conveyor tile IDs come from custom.dat, not hardcoded like FLAG or BUNKER.
**How to avoid:** Check `hasCustomData('conveyor')` before allowing tool use; show warning in GameObjectToolPanel like SPAWN/SWITCH do (lines 47-52, 217-221).
**Warning signs:** Conveyor tool button active but placement does nothing; black tiles placed instead of conveyor graphics.

### Pitfall 4: Undo Granularity Mismatch
**What goes wrong:** User places large conveyor rectangle (20x20 = 400 tiles), presses undo, expects entire rectangle removed but only some tiles revert.
**Why it happens:** If pushUndo() is called per-tile instead of per-operation, undo stack has 400 entries instead of 1.
**How to avoid:** Call pushUndo() once before placeGameObjectRect(), not inside the tile-setting loop.
**Warning signs:** Undo requires multiple Ctrl+Z presses to remove one conveyor placement.

### Pitfall 5: Live Preview Performance
**What goes wrong:** Dragging large conveyor rectangles causes lag; frame rate drops as rectangle grows.
**Why it happens:** Drawing hundreds of tile previews per frame (e.g., 50x50 = 2500 tiles) without optimization.
**How to avoid:** Limit preview rectangle size in draw loop (e.g., max 30x30 for preview), or use lower opacity simple overlay instead of rendering every tile.
**Warning signs:** Cursor lags during drag; canvas stutters when dragging large rectangles.

## Code Examples

Verified patterns from official sources:

### Exact Conveyor Placement Logic (SEdit)
```typescript
// Source: Existing codebase - GameObjectSystem.ts:322-366
// This is the EXACT SEdit logic from map.cpp:2697-2718
placeConveyor(map: MapData, x1: number, y1: number, x2: number, y2: number, direction: number, data: number[]): boolean {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  if (w < 2 || h < 2) return false;  // Minimum 2x2
  if (minX < 0 || maxX >= MAP_WIDTH || minY < 0 || maxY >= MAP_HEIGHT) return false;
  if (data[0] === 0 && data[1] === 0) return false;  // No custom.dat

  for (let k = 0; k < h; k++) {
    for (let hh = 0; hh < w; hh++) {
      let tile: number;

      if (direction === 1) {
        // UD conveyor (vertical) - only doubles allowed on width
        if (w % 2 !== 0 && hh === w - 1) continue;  // Skip last column if odd width
        if (k === 0)
          tile = data[hh % 2];  // Top edge
        else if (k === h - 1)
          tile = data[hh % 2 + 6];  // Bottom edge
        else
          tile = data[(k % 2 + 1) * 2 + hh % 2];  // Middle
      } else {
        // LR conveyor (horizontal) - only doubles allowed on height
        if (h % 2 !== 0 && k === h - 1) continue;  // Skip last row if odd height
        if (hh === 0)
          tile = data[(k % 2) * 4];  // Left edge
        else if (hh === w - 1)
          tile = data[(k % 2) * 4 + 3];  // Right edge
        else
          tile = data[1 + (k % 2) * 4 + hh % 2];  // Middle
      }

      map.tiles[(minY + k) * MAP_WIDTH + (minX + hh)] = tile;
    }
  }

  map.modified = true;
  return true;
}
```

### Keyboard Shortcut Registration
```typescript
// Source: Existing codebase - ToolBar.tsx:92-133
// Add 'C' shortcut to existing pattern
const allToolsWithShortcuts = [
  // ... existing tools ...
  { tool: ToolType.CONVEYOR, label: 'Conveyor', icon: '🎯', shortcut: 'C' }
];

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Z, Ctrl+S, etc. - don't interfere
      return;
    }

    const tool = allToolsWithShortcuts.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
    if (tool) {
      setTool(tool.tool);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [setTool]);
```

### Game Object Tool Panel Direction Selector
```typescript
// Source: Existing codebase pattern - GameObjectToolPanel.tsx:203-215
// Conveyor direction selector (matches BRIDGE pattern)
{currentTool === ToolType.CONVEYOR && (
  <div className="gotool-field">
    <label className="gotool-label">Direction:</label>
    <select
      className="gotool-select"
      value={conveyorDir}
      onChange={(e) => setConveyorDirection(Number(e.target.value))}
    >
      <option value={0}>Horizontal</option>
      <option value={1}>Vertical</option>
    </select>
  </div>
)}

{/* Custom.dat warning for conveyor */}
{currentTool === ToolType.CONVEYOR && !hasCustomData('conveyor') && (
  <div className="gotool-warning">
    Requires custom.dat
  </div>
)}
```

### Rectangle Validation During Drag
```typescript
// Source: Existing codebase - MapCanvas.tsx:330-347
// Show red/green outline based on minimum size requirements
if (rectDragState.active) {
  const minX = Math.min(rectDragState.startX, rectDragState.endX);
  const minY = Math.min(rectDragState.startY, rectDragState.endY);
  const maxX = Math.max(rectDragState.startX, rectDragState.endX);
  const maxY = Math.max(rectDragState.startY, rectDragState.endY);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  let valid = true;
  if (currentTool === ToolType.CONVEYOR) {
    valid = w >= 2 && h >= 2;  // Minimum 2x2 for conveyor
  }

  // Draw outline in green (valid) or red (invalid)
  ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(topLeft.x, topLeft.y, w * tilePixels, h * tilePixels);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool buttons with modals | Inline dropdowns from button | 2020s web UI | Faster interaction, no modal overlay |
| Separate undo per tile | Undo per operation | Modern editors | User expectation: Ctrl+Z removes entire action |
| No live preview | Live pattern preview | Modern tools (Figma, etc.) | User sees result before committing |

**Deprecated/outdated:**
- Toolbar submenus: Modern editors use inline dropdowns or tool panels, not nested menus
- Separate "confirm" button: Drag-to-draw tools complete on mouse up, no extra confirmation needed
- Modal dialogs for tool options: Tool panel shows options inline for active tool

## Open Questions

Things that couldn't be fully resolved:

1. **Dropdown visual style: tile graphics vs text+icon**
   - What we know: User requested "visual dropdown" showing options "visually" like SEdit spawn tool dropdown
   - What's unclear: Whether to render actual conveyor tile graphics in dropdown (requires tileset access) or use text labels with arrow icons (→, ↓)
   - Recommendation: Start with text+icon (simpler); retrofit to tile graphics if user feedback requests it. Text is more accessible and doesn't depend on tileset loading.

2. **Undersized drag handling (below 2x2 minimum)**
   - What we know: SEdit requires minimum 2x2 for conveyor; existing code shows red outline for invalid sizes
   - What's unclear: Should releasing mouse at invalid size (1x1, 1x2, 2x1) show error message or silently fail?
   - Recommendation: Silent fail (no placement) matching existing BRIDGE/BUNKER behavior; red outline during drag is sufficient feedback.

3. **Dropdown retrofit scope for other tools**
   - What we know: User wants "all game object tools with variants" to use dropdown pattern (SPAWN types, BUNKER directions, etc.)
   - What's unclear: Whether retrofit happens in this phase or future phase; CONTEXT.md says "Also retrofit all game object tools"
   - Recommendation: Implement dropdown infrastructure for CONVEYOR first; retrofit other tools is separate work (potentially future phase 16+). Focus this phase on conveyor functionality.

4. **Live preview performance limits**
   - What we know: Drawing hundreds of tiles per frame can cause lag
   - What's unclear: Maximum rectangle size before preview degrades performance; whether to cap preview or use simplified rendering
   - Recommendation: Test with 50x50 rectangle (2500 tiles); if lag detected, cap preview at 30x30 and show size text for larger rectangles.

5. **Whether conveyor replaces base tile or overlays**
   - What we know: SEdit source (map.cpp:2360) directly sets `map.tiles[i * MAP_WIDTH + j] = tile`
   - What's unclear: None - SEdit replaces the tile entirely, no overlay concept in this map format
   - Recommendation: Follow SEdit exactly - replace tile value, don't overlay. This is already how placeConveyor() works.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `GameObjectSystem.ts` (lines 322-366) - exact SEdit placeConveyor() logic
- Existing codebase: `CustomDatParser.ts` (lines 119-129) - CONV_LR and CONV_UD parsing
- Existing codebase: `MapCanvas.tsx` (lines 528-531, 613-616) - rect drag pattern
- Existing codebase: `EditorState.ts` (lines 495-510) - undo system
- Existing codebase: `ToolBar.tsx` (lines 92-133) - keyboard shortcut pattern
- User CONTEXT.md: Phase 15 decisions (dropdown UX, drag interaction, undo support, appearance)

### Secondary (MEDIUM confidence)
- [React dropdown patterns](https://www.freecodecamp.org/news/build-a-dynamic-dropdown-component/) - compound component pattern overview
- [React canvas drag patterns](https://cluemediator.com/draggable-rectangle-on-canvas-using-react) - mouse event handling for drag-to-draw
- [React keyboard shortcuts](https://goulet.dev/posts/react-handle-keyboard-shortcuts/) - event listener patterns for Escape key

### Tertiary (LOW confidence)
- None - all critical findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; existing React 18 + Zustand + Canvas API patterns
- Architecture: HIGH - All patterns exist in codebase (rect drag, undo, keyboard shortcuts, tool panels)
- Pitfalls: HIGH - Verified against existing code and SEdit source logic for edge cases
- Dropdown pattern: MEDIUM - New pattern for this codebase but standard React practice; implementation details at Claude's discretion

**Research date:** 2026-02-04
**Valid until:** 2026-03-06 (30 days - stable domain, established patterns)
