# Phase 71: Wall Type Selection - Research

**Researched:** 2026-02-15
**Domain:** UI dropdown components, visual tile previews, Canvas API rendering, Zustand state management
**Confidence:** HIGH

## Summary

Phase 71 implements a wall type selector dropdown in the toolbar allowing users to select from all 15 wall types with visual tile previews. The selected wall type will be used by all three wall tools (wall line, wall pencil, wall rect).

The technical challenges are: (1) creating visual previews of wall types showing horizontal segments with end tiles, (2) integrating with the existing variant dropdown pattern used for game object tools, (3) ensuring all three wall tools use the selected wall type from Zustand state, and (4) making wall tool icons visually distinct from each other in the toolbar.

**Primary recommendation:** Reuse the existing variant dropdown pattern from ToolBar.tsx (used for spawns, flags, bunkers, etc.), extend it to support custom rendering for visual tile previews, and leverage the existing WallSystem infrastructure which already manages 15 wall types and the current selection.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety | Already project standard |
| Zustand | 4.x | State management | Already project standard (GlobalSlice has `wallType`) |
| Canvas API | Native | Tile rendering | Already used for tileset rendering |
| React | 18.x | UI components | Already project standard |

### Supporting
No new libraries needed. This phase uses existing infrastructure:
- Variant dropdown UI pattern (ToolBar.tsx)
- WallSystem (already manages 15 wall types, tile mappings)
- GlobalSlice state (already has `wallType: number` field)
- Canvas rendering utilities (CanvasEngine.ts for tile drawing)
- Lucide React Icons (toolbar icons)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas-based preview | HTML/CSS tile sprite | Canvas allows precise tile rendering with existing tileset, matches main editor |
| Variant dropdown with custom render | New custom dropdown component | No benefit — variant pattern already supports custom content |
| Three separate wall type fields | Shared wall type state | Complexity for no UX benefit — user expects one wall type across all wall tools |

**Installation:**
No new dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── editor/
│   │   └── slices/
│   │       └── globalSlice.ts       # Already has wallType field + setWallType action
│   └── map/
│       ├── WallSystem.ts             # Already has 15 wall types, WALL_TYPE_NAMES
│       └── types.ts                  # Already has ToolType enum with wall tools
└── components/
    └── ToolBar/
        ├── ToolBar.tsx               # Add wall type variant config with preview renderer
        └── ToolBar.css               # Add preview canvas styling
```

**Design principle:** Reuse existing variant dropdown infrastructure, extend renderer to support canvas-based tile previews. Wall tools already read from GlobalSlice.wallType, no changes needed to tool handlers.

### Pattern 1: Wall Type Visual Preview Rendering

**What:** Render a horizontal wall segment (3 tiles: left end, middle, right end) on a canvas to show wall type appearance in dropdown.

**When to use:** For each wall type option in the dropdown

**Example:**
```typescript
// In ToolBar.tsx - new helper function
function renderWallPreview(
  wallType: number,
  tilesetImage: HTMLImageElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const TILE_SIZE = 16;
  const PREVIEW_WIDTH = 3 * TILE_SIZE;  // 3 tiles wide
  canvas.width = PREVIEW_WIDTH;
  canvas.height = TILE_SIZE;

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Get wall tiles for horizontal segment
  // Connection states: left end (0b0100 = RIGHT), middle (0b0110 = LEFT+RIGHT), right end (0b0010 = LEFT)
  const leftTile = wallSystem.getWallTile(wallType, 0b0100);   // Has right connection
  const middleTile = wallSystem.getWallTile(wallType, 0b0110); // Has left+right
  const rightTile = wallSystem.getWallTile(wallType, 0b0010);  // Has left connection

  // Draw tiles from tileset
  const TILES_PER_ROW = 40;

  [leftTile, middleTile, rightTile].forEach((tile, idx) => {
    const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
    const dstX = idx * TILE_SIZE;

    ctx.drawImage(
      tilesetImage,
      srcX, srcY, TILE_SIZE, TILE_SIZE,
      dstX, 0, TILE_SIZE, TILE_SIZE
    );
  });

  return canvas;
}
```

**Rationale:** Using connection states 0b0100 (right only), 0b0110 (left+right), 0b0010 (left only) creates a clean horizontal segment that shows the wall's visual style without corner pieces.

### Pattern 2: Variant Dropdown with Custom Preview Content

**What:** Extend existing variant dropdown pattern to render canvas previews alongside labels.

**When to use:** Wall type selector in toolbar

**Example:**
```typescript
// In ToolBar.tsx - extend variantConfigs
const tilesetImage = useEditorStore((state) => state.tilesetImage); // Need to expose in store

const variantConfigs: ToolVariantConfig[] = [
  // ... existing configs ...
  {
    tool: ToolType.WALL,  // Will also apply to WALL_PENCIL, WALL_RECT via shared wallType
    settingName: 'Type',
    getCurrentValue: () => useEditorStore.getState().wallType,
    variants: WALL_TYPE_NAMES.map((name, index) => ({
      label: name,
      value: index,
      // NEW: Optional preview renderer
      renderPreview: tilesetImage
        ? () => renderWallPreview(index, tilesetImage)
        : undefined
    })),
    setter: (type) => useEditorStore.getState().setWallType(type)
  },
];

// Modify toolbar-dropdown-item rendering to support canvas preview
// In renderToolButton() where dropdown items are created:
{config.variants.map(v => {
  const isSelected = config.getCurrentValue() === v.value;
  return (
    <button
      key={v.value}
      className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        handleVariantSelect(tool.tool, v.value);
      }}
    >
      {v.renderPreview && (
        <div className="variant-preview">
          {/* Append canvas as DOM element */}
          {v.renderPreview()}
        </div>
      )}
      <span className="variant-label">{v.label}</span>
    </button>
  );
})}
```

**Note:** Need to expose tilesetImage in GlobalSlice or create a ref-based approach to access it from ToolBar.

### Pattern 3: Shared Wall Type State (Already Implemented)

**What:** All three wall tools (WALL, WALL_PENCIL, WALL_RECT) read from the same `GlobalSlice.wallType` field.

**Current implementation (no changes needed):**
```typescript
// In globalSlice.ts (already exists)
export interface GlobalSlice {
  wallType: number;  // Current wall type (0-14)
  setWallType: (type: number) => void;
}

// In WallSystem.ts (already exists)
export class WallSystem {
  private currentType: number = 0;  // Synced with GlobalSlice via setWallType

  setWallType(type: number): void {
    if (type >= 0 && type < this.wallTypes.length) {
      this.currentType = type;
    }
  }

  placeWall(map: MapData, x: number, y: number): void {
    // Uses this.currentType for placement
    const connections = this.getConnections(map, x, y);
    const tile = this.getWallTile(this.currentType, connections);
    map.tiles[y * MAP_WIDTH + x] = tile;
    // ...
  }
}

// In globalSlice.ts createGlobalSlice (already exists)
setWallType: (type) => {
  wallSystem.setWallType(type);  // Keep WallSystem in sync
  set({ wallType: type });
},
```

**Impact:** Zero changes needed to wall placement logic — tools already use the selected wall type from state.

### Pattern 4: Distinct Wall Tool Icons

**What:** Use different Lucide icons or visual variants for the three wall tools to make them visually distinguishable.

**Current state:** All three use `LuBrickWall` icon (identical appearance)

**Options:**
```typescript
// Option 1: Different Lucide icons
import { LuBrickWall, LuPencil, LuRectangleHorizontal } from 'react-icons/lu';

const toolIcons: Record<string, IconType> = {
  wall: LuBrickWall,         // Line tool (existing)
  wallpencil: LuPencil,      // Pencil tool (change to pencil)
  wallrect: LuRectangleHorizontal,  // Rect tool (change to rectangle)
};

// Option 2: Icon + overlay indicator (CSS-based)
// Add small corner badge/indicator via CSS on .toolbar-button for wall-pencil/wall-rect

// Option 3: Use layered icons (icon + small modifier)
// Brick icon with small pencil or rectangle in corner
```

**Recommendation:** Option 1 (different base icons) is simplest and clearest. Wall line keeps `LuBrickWall`, wall pencil uses `LuPencil`, wall rect uses `LuRectangleHorizontal`.

### Pattern 5: Dropdown Trigger on All Wall Tools

**What:** Any of the three wall tools can open the wall type dropdown (shared variant config).

**Implementation approach:**
```typescript
// Current pattern: Each tool can have its own variant config
// For wall tools, we want shared dropdown but separate tool selection

// Option A: Three separate variant configs, all controlling same wallType
{
  tool: ToolType.WALL,
  settingName: 'Type',
  getCurrentValue: () => wallType,
  variants: [...wallTypeVariants],
  setter: setWallType
},
{
  tool: ToolType.WALL_PENCIL,
  settingName: 'Type',
  getCurrentValue: () => wallType,
  variants: [...wallTypeVariants],  // Same variants
  setter: setWallType  // Same setter
},
// ... same for WALL_RECT

// Option B: Modify handleToolClick to share dropdown state across wall tools
// If user clicks wall-pencil while wall dropdown is open, keep dropdown open but switch tool
```

**Recommendation:** Option A (duplicate configs) is simpler and matches existing pattern. Slightly more code but zero complexity.

### Anti-Patterns to Avoid

- **DON'T create per-tool wall type state:** All wall tools should share the same wall type selection (user expects consistency)
- **DON'T render static images for previews:** Use canvas to dynamically render from tileset (adapts to custom tilesets)
- **DON'T re-implement dropdown logic:** Reuse existing variant dropdown pattern from ToolBar.tsx
- **DON'T hardcode wall tile IDs in preview:** Use WallSystem.getWallTile() to query correct tiles (respects wall type data)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown UI component | Custom select component | Existing variant dropdown pattern | Already handles click-outside, keyboard nav, styling |
| Tile rendering | Manual sprite positioning | CanvasEngine.renderTile or inline drawImage | Handles tileset layout, already tested |
| Wall type data | Hardcoded tile arrays | WallSystem.wallTypes, WALL_TYPE_NAMES | Already centralized, supports all 15 types |
| Connection state calculation | Manual bit operations | WallSystem.getWallTile(type, connections) | Already maps connection bitmask to correct tile index |
| State management | Component-local state | GlobalSlice.wallType | Already shared across tools, synced with WallSystem |

**Key insight:** All infrastructure already exists. This phase is primarily UI integration — adding visual previews to the existing variant dropdown pattern and ensuring all wall tools use the shared state.

## Common Pitfalls

### Pitfall 1: Preview Canvas Not Showing Tiles

**What goes wrong:** Dropdown shows blank canvases instead of wall tile previews.

**Why it happens:** Tileset image not loaded yet when preview canvases are created, or rendering before tileset is available.

**How to avoid:**
- Check `tilesetImage.complete` before rendering previews
- Conditionally render previews only when tileset is loaded
- Use React `useMemo` to cache preview canvases and regenerate on tileset change

**Warning signs:** Console errors like "Failed to execute 'drawImage'" or blank white rectangles in dropdown

### Pitfall 2: Wall Tools Using Different Wall Types

**What goes wrong:** Placing wall with line tool uses type 0, but wall pencil uses type 5.

**Why it happens:** WallSystem.currentType not synced with GlobalSlice.wallType, or tools bypassing state.

**How to avoid:** All wall placement calls must use `wallSystem.placeWall()` which reads from `this.currentType`. Ensure `setWallType()` updates both GlobalSlice and WallSystem in a single action.

**Verification:** Place wall with line tool, switch to pencil, place another — both should use same wall type from dropdown.

**Warning signs:** Switching between wall tools produces different wall types without changing dropdown selection.

### Pitfall 3: Preview Shows Wrong Tiles

**What goes wrong:** Preview canvas shows disconnected single tiles or wrong connection states.

**Why it happens:** Using wrong connection bitmask (e.g., 0b0000 for isolated tile instead of 0b0110 for horizontal segment).

**How to avoid:** Use connection states that produce clean horizontal segment:
- Left end: `0b0100` (has right connection)
- Middle: `0b0110` (has left + right)
- Right end: `0b0010` (has left connection)

Test with multiple wall types to verify visual appearance.

**Warning signs:** Preview shows T-junctions, corners, or isolated tiles instead of straight horizontal segments.

### Pitfall 4: Dropdown Renders on Every Frame

**What goes wrong:** Preview canvases regenerated continuously, causing performance issues.

**Why it happens:** Creating new canvas elements in render function without memoization.

**How to avoid:**
- Use `useMemo` to cache preview canvases per wall type
- Regenerate only when tileset changes
- Or generate once on mount and store in ref

**Warning signs:** Browser DevTools shows high canvas creation rate, UI feels sluggish when hovering dropdown.

### Pitfall 5: Icons Not Visually Distinct

**What goes wrong:** User can't tell which wall tool is which (all look like brick walls).

**Why it happens:** Using same `LuBrickWall` icon for all three tools.

**How to avoid:**
- Wall line: `LuBrickWall` (keep existing)
- Wall pencil: `LuPencil` or `LuEdit3`
- Wall rect: `LuRectangleHorizontal` or `LuSquare`

Verify icons are distinguishable at 16px size in toolbar.

**Warning signs:** User confusion, mis-clicking wrong wall tool.

## Code Examples

Verified patterns from existing codebase:

### Existing Wall Type State Management
```typescript
// Source: globalSlice.ts lines 28, 137, 201-204
export interface GlobalSlice {
  wallType: number;
  // ...
  setWallType: (type: number) => void;
}

// Initial state
wallType: 0,

// Action
setWallType: (type) => {
  wallSystem.setWallType(type);  // Keep WallSystem in sync
  set({ wallType: type });
},
```

### Existing Variant Dropdown Pattern
```typescript
// Source: ToolBar.tsx lines 201-322 (variantConfigs)
const variantConfigs: ToolVariantConfig[] = [
  {
    tool: ToolType.FLAG,
    settingName: 'Team',
    getCurrentValue: () => gameObjectToolState.flagPadType,
    variants: [
      { label: 'Green', value: 0 },
      { label: 'Red', value: 1 },
      { label: 'Blue', value: 2 },
      // ...
    ],
    setter: setFlagPadType
  },
  // ... more configs
];

// Rendering (lines 498-520)
{showDropdown && (
  <div className="toolbar-dropdown">
    {config.variants.map(v => {
      const isSelected = config.getCurrentValue() === v.value;
      return (
        <button
          key={v.value}
          className={`toolbar-dropdown-item ${isSelected ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleVariantSelect(tool.tool, v.value, v.value2);
          }}
        >
          {v.label}
        </button>
      );
    })}
  </div>
)}
```

### Existing Wall Type Data
```typescript
// Source: WallSystem.ts lines 50-54
export const WALL_TYPE_NAMES = [
  'Basic', 'Stone', 'Metal', 'Dark', 'Tech',
  'Crystal', 'Pattern A', 'Pattern B', 'Block A', 'Block B',
  'Blue Metal', 'Industrial', 'Red Metal', 'Purple Metal', 'Gray Metal'
];

// Wall type tile arrays (lines 16-46)
const DEFAULT_WALL_TYPES: number[][] = [
  // Type 0: Basic Wall (16 tiles for all connection states)
  [49, 10, 47, 51, 50, 89, 9, 7, 48, 8, 46, 11, 52, 6, 12, 13],
  // ... 14 more types
];

// Connection state to tile index mapping (lines 10-12)
const WALL_INDEX_DATA = [
  15, 14, 11, 10, 12, 13, 8, 9, 3, 2, 7, 6, 0, 1, 4, 5
];

// Query tile for specific connection state (lines 102-106)
getWallTile(type: number, connections: number): number {
  if (type < 0 || type >= this.wallTypes.length) return 0;
  const index = WALL_INDEX_DATA[connections & 0xF];
  return this.wallTypes[type][index];
}
```

### Canvas Tile Rendering Pattern
```typescript
// Source: CanvasEngine.ts lines 358-389 (renderTile method)
private renderTile(
  ctx: CanvasRenderingContext2D,
  tile: number,
  x: number,
  y: number,
  size: number,
  animFrame: number
): void {
  if (!this.tilesetImage) return;

  // Handle static tiles
  if ((tile & 0x8000) === 0) {
    const col = tile % TILES_PER_ROW;
    const row = Math.floor(tile / TILES_PER_ROW);
    ctx.drawImage(
      this.tilesetImage,
      col * TILE_SIZE,
      row * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
      x,
      y,
      size,
      size
    );
    return;
  }
  // ... animated tile handling
}
```

### Existing TilePalette Wall Selector (Text Dropdown)
```typescript
// Source: TilePalette.tsx lines 305-320
{currentTool === ToolType.WALL && (
  <div className="wall-selector">
    <div className="palette-header">Wall Type</div>
    <select
      value={wallType}
      onChange={(e) => setWallType(parseInt(e.target.value))}
      className="wall-select"
    >
      {WALL_TYPE_NAMES.map((name, index) => (
        <option key={index} value={index}>
          {index}: {name}
        </option>
      ))}
    </select>
  </div>
)}
```

**Note:** This text-based selector already exists in TilePalette (only shown when WALL tool is active). Phase 71 moves wall type selection to toolbar with visual previews, making it accessible for all wall tools.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Text dropdown in TilePalette | Visual preview dropdown in Toolbar | Phase 71 (v3.4) | Wall type selection discoverable, shows actual appearance, works for all wall tools |
| Single wall tool with line drawing | Three wall tools (line, pencil, rect) | Phase 70 (v3.3) | Multiple wall placement modes share same type selector |
| No visual preview of wall types | Canvas-rendered previews in dropdown | Phase 71 (v3.4) | User sees wall appearance before selecting |

**Current state (before Phase 71):**
- Wall type selector exists in TilePalette as text dropdown
- Only visible when WALL tool is active
- WALL_PENCIL and WALL_RECT tools have no dedicated selector UI
- No visual preview of wall types

## Open Questions

1. **Should wall type dropdown be shared across all three wall tools or separate?**
   - What we know: All tools read from same `GlobalSlice.wallType`
   - What's unclear: UX — should clicking any wall tool show wall type dropdown?
   - Recommendation: Shared dropdown (Option A from Pattern 5) — user expects wall type to persist across tool switches. All three wall tools show same dropdown, selecting type affects all.

2. **What size should preview canvases be?**
   - What we know: Tiles are 16×16px, dropdown items need to fit in small space
   - What's unclear: 3 tiles (48px wide) or 5 tiles (80px wide) for better visual?
   - Recommendation: 3 tiles (48×16px) — shows left end, middle, right end. Compact, shows essential style. Can scale to 2× (32px height) for clarity if needed.

3. **Should wall type selector remain in TilePalette?**
   - What we know: TilePalette selector only shows for WALL tool currently
   - What's unclear: Keep both (toolbar + palette) or remove palette version?
   - Recommendation: Keep both for Phase 71 (safe migration). Phase 72 can remove TilePalette version if toolbar version is sufficient.

4. **How to handle missing tileset on preview render?**
   - What we know: Tileset loaded asynchronously, may not be ready
   - What's unclear: Show placeholder, skip preview, or defer dropdown render?
   - Recommendation: Show text-only fallback (just wall type name) if tileset not loaded. Most users will have tileset ready by time they use wall tools.

5. **Should wall type persist across sessions (localStorage)?**
   - What we know: Grid settings persist, tool selection does not
   - What's unclear: Is wall type a "preference" or "session state"?
   - Recommendation: Do NOT persist for Phase 71 (matches existing tool state behavior). Can add in future if users request it.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx` — Variant dropdown pattern, tool button rendering
- Existing codebase: `E:\NewMapEditor\src\core\map\WallSystem.ts` — Wall types data, connection logic, WALL_TYPE_NAMES
- Existing codebase: `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — Wall type state management
- Existing codebase: `E:\NewMapEditor\src\core\canvas\CanvasEngine.ts` — Tile rendering with Canvas API
- Existing codebase: `E:\NewMapEditor\src\components\TilePalette\TilePalette.tsx` — Current wall type selector (text dropdown)
- Project CLAUDE.md, MEMORY.md — Architecture patterns, project structure

### Secondary (MEDIUM confidence)
- [Canvas API: drawImage() | MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) — Canvas tile rendering API
- [React useMemo | React Docs](https://react.dev/reference/react/useMemo) — Preview canvas caching pattern

### Tertiary (LOW confidence)
- General WebSearch results for "dropdown with custom content" — UI patterns, not React-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all infrastructure exists (WallSystem, variant dropdown pattern, Canvas rendering)
- Architecture: HIGH — verified by inspecting existing code patterns (variant dropdown, wall tools, GlobalSlice state)
- Pitfalls: MEDIUM — inferred from canvas rendering requirements and dropdown UX considerations, not battle-tested in this specific feature yet
- Integration: HIGH — all connection points identified and verified (GlobalSlice, WallSystem, ToolBar, existing wall placement logic)

**Research date:** 2026-02-15
**Valid until:** ~30 days (stable domain — wall type infrastructure locked, variant dropdown pattern established in Phase 14-42, canvas rendering stable)

---
*Research for Phase 71: Wall Type Selection*
*Confidence: HIGH — All patterns verified in existing codebase, zero new dependencies required*
