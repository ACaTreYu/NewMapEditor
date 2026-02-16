# Phase 69: Conveyor Fix & Farplane Toggle - Research

**Researched:** 2026-02-15
**Domain:** Animation data structures, tile rendering pipeline, boolean UI toggles with persistence
**Confidence:** HIGH

## Summary

Phase 69 addresses two independent issues: (1) fixing downward conveyor animation playback, and (2) adding a toggle for farplane color rendering on the editing canvas. The conveyor issue is purely a data problem - the animation definitions use inconsistent tile sequences for downward vs. horizontal conveyors. The farplane toggle is a straightforward boolean state addition following existing grid toggle patterns, with tile rendering logic already supporting conditional farplane display.

**Conveyor analysis:** Downward conveyors use hardcoded `CONV_DOWN_DATA` with 8 tiles `[1581, 1582, 1621, 1622, 1621, 1622, 1661, 1662]`, but animation 0x94 (starting at tile 1581) animates through a different sequence `[1581, 1583, 1585, 1587, 1589, 1591, 1593, 1595]` (every other tile, skipping the even tiles used in placement). Horizontal conveyors match correctly - `CONV_RIGHT_DATA` uses `[1717, 1718, 1718, 1719, ...]` and animation 0xB7 starts at 1717 and advances through the same tile set. The fix requires aligning downward conveyor placement data with the animation sequence extracted from Gfx.dll.

**Farplane rendering:** The CanvasEngine already renders tile 280 as `#b0b0b0` gray when no tileset is loaded (line 151). The minimap supports optional `farplaneImage` prop and renders farplane pixels behind tiles. The editing canvas does NOT currently use farplane - it shows gray for missing tilesets. Adding toggle support requires: (1) GlobalSlice boolean state `showFarplane` with toggle action, (2) conditional rendering in `CanvasEngine.renderTile()` to show farplane color vs. solid background, (3) UI checkbox in toolbar or settings panel, (4) localStorage persistence.

**Primary recommendation:** Fix conveyor data arrays to match Gfx.dll animation definitions (change CONV_DOWN_DATA to match 0x94/0x95/0x96/0x97/0x98/0x99 sequences). Add `showFarplane` boolean to GlobalSlice following `showGrid` pattern, implement toggle button in toolbar, persist to localStorage, and conditionally render farplane color in tile rendering when enabled.

## Standard Stack

No new dependencies - using existing architecture patterns.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.x | State management | Already used for GlobalSlice, follows `showGrid` pattern |
| React 18 | 18.x | UI components | Existing checkbox components (CheckboxInput.tsx) |
| Canvas API | Native | Tile rendering | CanvasEngine.renderTile() already handles conditional rendering |
| localStorage | Native | Settings persistence | Existing pattern for editor preferences |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons/lu | 0.x | Lucide icons | Use LuEye/LuEyeOff for farplane toggle button icon |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GlobalSlice state | DocumentsSlice per-document state | Farplane is UI preference, not document property |
| Toolbar button | Settings dialog checkbox | Toolbar provides faster access for frequent toggling |
| localStorage | Map file storage | Farplane toggle is editor preference, not map data |

**Installation:**
```bash
# No new packages needed - use existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── ToolBar/              # Add farplane toggle button
├── core/
│   ├── editor/
│   │   └── slices/
│   │       └── globalSlice.ts   # Add showFarplane boolean + toggleFarplane action
│   ├── canvas/
│   │   └── CanvasEngine.ts     # Conditional farplane rendering in renderTile()
│   └── map/
│       ├── GameObjectData.ts   # Fix CONV_DOWN_DATA array
│       └── AnimationDefinitions.ts  # Reference for animation sequences
```

### Pattern 1: Boolean Toggle State with Persistence
**What:** Global boolean setting with localStorage persistence, following showGrid pattern.
**When to use:** UI preferences that persist across sessions (grid visibility, farplane rendering, etc.).
**Example:**
```typescript
// Source: Existing codebase pattern - globalSlice.ts showGrid implementation
// GlobalSlice interface
export interface GlobalSlice {
  showGrid: boolean;
  showFarplane: boolean;  // NEW
  // ...
  toggleGrid: () => void;
  toggleFarplane: () => void;  // NEW
}

// createGlobalSlice implementation
export const createGlobalSlice: StateCreator<EditorState, [], [], GlobalSlice> = (set, get) => ({
  showGrid: localStorage.getItem('showGrid') === 'true',
  showFarplane: localStorage.getItem('showFarplane') === 'true',  // NEW

  toggleGrid: () => set((state) => {
    const newValue = !state.showGrid;
    localStorage.setItem('showGrid', String(newValue));
    return { showGrid: newValue };
  }),

  toggleFarplane: () => set((state) => {  // NEW
    const newValue = !state.showFarplane;
    localStorage.setItem('showFarplane', String(newValue));
    return { showFarplane: newValue };
  }),
});
```

### Pattern 2: Toolbar Toggle Button
**What:** Icon button that toggles boolean state and shows active/inactive visual state.
**When to use:** Frequently accessed toggles that affect canvas rendering (grid, farplane, etc.).
**Example:**
```typescript
// Source: Existing toolbar patterns - ToolBar.tsx grid toggle approach
// Add to ToolBar.tsx action buttons section
const { showFarplane, toggleFarplane } = useEditorStore(
  useShallow((state) => ({
    showFarplane: state.showFarplane,
    toggleFarplane: state.toggleFarplane
  }))
);

// Render toggle button
<button
  className={`toolbar-button ${showFarplane ? 'active' : ''}`}
  onClick={toggleFarplane}
  title="Toggle farplane background"
>
  {showFarplane ? <LuEye size={18} /> : <LuEyeOff size={18} />}
</button>
```

### Pattern 3: Conditional Tile Rendering
**What:** Render different backgrounds based on toggle state in CanvasEngine.renderTile().
**When to use:** Rendering modes that change canvas appearance without affecting map data.
**Example:**
```typescript
// Source: CanvasEngine.ts renderTile() - add farplane conditional
renderTile(
  ctx: CanvasRenderingContext2D,
  tile: number,
  destX: number,
  destY: number,
  destSize: number,
  animFrame: number
): void {
  const isAnimated = (tile & 0x8000) !== 0;
  if (isAnimated) {
    // ... existing animation rendering
  } else if (this.tilesetImage) {
    // ... existing static tile rendering
  } else {
    // No tileset - render fallback
    const state = useEditorStore.getState();
    if (state.showFarplane && this.farplaneColor) {
      ctx.fillStyle = this.farplaneColor;  // Use farplane color
    } else {
      ctx.fillStyle = tile === 280 ? '#b0b0b0' : `hsl(${(tile * 7) % 360}, 50%, 40%)`;
    }
    ctx.fillRect(destX, destY, destSize, destSize);
  }
}
```

### Pattern 4: Animation Data Alignment
**What:** Game object placement data arrays must match animation frame sequences extracted from Gfx.dll.
**When to use:** Any animated game object tool (conveyors, animated spawns, switches, etc.).
**Example:**
```typescript
// Source: GameObjectData.ts + AnimationDefinitions.ts
// BEFORE (incorrect - downward conveyor):
export const CONV_DOWN_DATA: number[] = [1581, 1582, 1621, 1622, 1621, 1622, 1661, 1662];
// Animation 0x94: frames: [1581, 1583, 1585, 1587, 1589, 1591, 1593, 1595]
// Mismatch: placement uses 1582, 1621, 1622, 1661, 1662 but animation skips these

// AFTER (correct - aligned with animation 0x94/0x95/0x96/0x97):
// Animation 0x94 (left column): [1581, 1583, 1585, 1587, 1589, 1591, 1593, 1595]
// Animation 0x95 (right column): [1582, 1584, 1586, 1588, 1590, 1592, 1594, 1596]
// Animation 0x96 (left column, row 2): [1621, 1623, 1625, 1627, 1629, 1631, 1633, 1635]
// Animation 0x97 (right column, row 2): [1622, 1624, 1626, 1628, 1630, 1632, 1634, 1636]
// Pattern: use first frame of each animation for 2x2 tile pattern
export const CONV_DOWN_DATA: number[] = [
  0x8000 | 0x94,  // Top-left (animated)
  0x8000 | 0x95,  // Top-right (animated)
  0x8000 | 0x96,  // Mid-left (animated)
  0x8000 | 0x97,  // Mid-right (animated)
  0x8000 | 0x96,  // Repeat mid-left
  0x8000 | 0x97,  // Repeat mid-right
  0x8000 | 0x98,  // Bottom-left (animated)
  0x8000 | 0x99,  // Bottom-right (animated)
];

// Reference: Horizontal conveyor (correct pattern):
// Animation 0xB7-0xBC: frames starting at 1717, 1718, 1719, 1757, 1758, 1759
export const CONV_RIGHT_DATA: number[] = [1717, 1718, 1718, 1719, 1757, 1758, 1758, 1759];
// This works because animations 0xB7, 0xB9, 0xBB use same tile IDs in frames
```

### Anti-Patterns to Avoid
- **Storing farplane in DocumentsSlice:** Farplane is a UI preference, not document data - store in GlobalSlice.
- **Modifying animation definitions:** Animation data comes from Gfx.dll and is read-only - fix placement data instead.
- **Hardcoding tile IDs in conveyor data:** Use animated tile encoding `0x8000 | animId` for proper animation playback.
- **Adding farplane to map file:** Farplane toggle is editor setting, not map data - persist to localStorage only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings persistence | Custom serialization | `localStorage.getItem/setItem` with JSON | Native API, simple, works across sessions |
| Toggle button icons | Custom SVG graphics | react-icons/lu (LuEye, LuEyeOff) | Consistent with existing toolbar icons |
| Animation frame calculation | Custom timing logic | Existing `animationFrame` counter in GlobalSlice | Already drives all animations via CanvasEngine |
| Farplane color extraction | Custom color sampling | Direct pixel access or solid color fallback | Minimap already has farplane pixel cache pattern |

**Key insight:** Both fixes use existing architecture. Conveyor fix is data correction (8 array entries). Farplane toggle follows `showGrid` pattern exactly (boolean + localStorage + toggle action + toolbar button).

## Common Pitfalls

### Pitfall 1: Conveyor Animation ID Mismatch
**What goes wrong:** Using static tile IDs instead of animated tile encoding causes conveyors to appear as static tiles instead of animating.
**Why it happens:** `CONV_DOWN_DATA` uses raw tile IDs like `1581` instead of animated encoding `0x8000 | 0x94`.
**How to avoid:** Encode all conveyor tiles as animated: `0x8000 | animationId` where animationId is 0x94-0x99 for downward, 0xB7-0xBC for horizontal.
**Warning signs:** Conveyor tiles placed but don't animate; appear as first frame only.

### Pitfall 2: Animation Frame Sequence Mismatch
**What goes wrong:** Placement data uses tiles that aren't in the animation sequence, causing flicker or wrong tiles during animation.
**Why it happens:** Assuming animation plays all tiles in tileset order, but Gfx.dll defines specific frame sequences that may skip tiles.
**How to avoid:** Cross-reference GameObjectData arrays with AnimationDefinitions.ts - each placed tile must be the first frame of its animation.
**Warning signs:** Conveyor animates but shows wrong tiles; pattern doesn't match original game.

### Pitfall 3: Farplane State in Wrong Slice
**What goes wrong:** Adding `showFarplane` to DocumentsSlice causes each document to have independent farplane toggle state.
**Why it happens:** Confusion about document data vs. UI preferences.
**How to avoid:** UI preferences (grid, farplane, zoom level) go in GlobalSlice; document data (map tiles, settings) goes in DocumentsSlice.
**Warning signs:** Farplane toggle resets when switching documents; inconsistent behavior across tabs.

### Pitfall 4: Missing localStorage Persistence
**What goes wrong:** Farplane toggle resets to default on app restart.
**Why it happens:** Forgetting to save to localStorage in toggle action, or forgetting to read from localStorage on initialization.
**How to avoid:** Follow exact `toggleGrid` pattern: save in toggle action, read in slice initialization.
**Warning signs:** Toggle works during session but doesn't persist after restart.

### Pitfall 5: Performance Impact from Farplane Rendering
**What goes wrong:** Rendering farplane color for every tile causes slowdown if implementation requires image lookups per tile.
**Why it happens:** Trying to match exact farplane pixel color from image for each tile instead of using average or solid color.
**How to avoid:** Use solid color fallback (e.g., tile-280 color `#b0b0b0`) or pre-computed average farplane color; don't lookup farplane image per tile.
**Warning signs:** Canvas rendering slows down when farplane toggle is enabled; frame rate drops.

### Pitfall 6: Conveyor Pattern Edge Cases
**What goes wrong:** Conveyor rectangles with odd dimensions show incomplete patterns or misaligned animations.
**Why it happens:** Conveyor patterns are 2-tile wide (horizontal) or 2-tile tall (vertical); placement logic in GameObjectSystem.placeConveyor() skips tiles for odd dimensions.
**How to avoid:** Don't modify placement logic - the skip behavior (lines 366, 375 in GameObjectSystem.ts) is correct SEdit behavior.
**Warning signs:** Extra tiles placed at edges; pattern doesn't tile seamlessly.

## Code Examples

Verified patterns from official sources:

### Conveyor Data Fix (Primary Task)
```typescript
// Source: AnimationDefinitions.ts lines 168-173 + GameObjectData.ts lines 94-97
// File: src/core/map/GameObjectData.ts

// BEFORE (incorrect):
export const CONV_DOWN_DATA: number[] = [1581, 1582, 1621, 1622, 1621, 1622, 1661, 1662];

// AFTER (correct - use animated tile encoding):
// Downward conveyors use animations 0x94-0x99 (6 animations for 2x3 tile pattern)
// Animation 0x94: frames [1581, 1583, 1585, 1587, 1589, 1591, 1593, 1595]
// Animation 0x95: frames [1582, 1584, 1586, 1588, 1590, 1592, 1594, 1596]
// Animation 0x96: frames [1621, 1623, 1625, 1627, 1629, 1631, 1633, 1635]
// Animation 0x97: frames [1622, 1624, 1626, 1628, 1630, 1632, 1634, 1636]
// Animation 0x98: frames [1661, 1663, 1665, 1667, 1669, 1671, 1673, 1675]
// Animation 0x99: frames [1662, 1664, 1666, 1668, 1670, 1672, 1674, 1676]

export const CONV_DOWN_DATA: number[] = [
  0x8000 | 0x94,  // Top-left
  0x8000 | 0x95,  // Top-right
  0x8000 | 0x96,  // Middle-left
  0x8000 | 0x97,  // Middle-right
  0x8000 | 0x96,  // Middle-left (repeat for pattern)
  0x8000 | 0x97,  // Middle-right (repeat for pattern)
  0x8000 | 0x98,  // Bottom-left
  0x8000 | 0x99,  // Bottom-right
];

// Horizontal conveyors (already correct - for reference):
export const CONV_RIGHT_DATA: number[] = [1717, 1718, 1718, 1719, 1757, 1758, 1758, 1759];
// These use static tiles because animations 0xB7-0xBC contain the same tiles in frames
```

### Farplane Toggle State (GlobalSlice)
```typescript
// Source: Existing showGrid pattern in globalSlice.ts
// File: src/core/editor/slices/globalSlice.ts

export interface GlobalSlice {
  showGrid: boolean;
  gridOpacity: number;
  gridLineWeight: number;
  gridColor: string;
  showFarplane: boolean;  // NEW - farplane background visibility
  // ... other state

  toggleGrid: () => void;
  toggleFarplane: () => void;  // NEW
  // ... other actions
}

export const createGlobalSlice: StateCreator<EditorState, [], [], GlobalSlice> = (set, get) => ({
  // ... existing state initialization
  showGrid: localStorage.getItem('showGrid') === 'true',
  gridOpacity: Number(localStorage.getItem('gridOpacity')) || 0.5,
  gridLineWeight: Number(localStorage.getItem('gridLineWeight')) || 1,
  gridColor: localStorage.getItem('gridColor') || '#00ff00',
  showFarplane: localStorage.getItem('showFarplane') === 'true',  // NEW - default false

  // ... existing actions
  toggleGrid: () => set((state) => {
    const newValue = !state.showGrid;
    localStorage.setItem('showGrid', String(newValue));
    return { showGrid: newValue };
  }),

  toggleFarplane: () => set((state) => {  // NEW
    const newValue = !state.showFarplane;
    localStorage.setItem('showFarplane', String(newValue));
    return { showFarplane: newValue };
  }),
});
```

### Toolbar Toggle Button
```typescript
// Source: ToolBar.tsx existing action buttons pattern
// File: src/components/ToolBar/ToolBar.tsx

import { LuEye, LuEyeOff } from 'react-icons/lu';

export const ToolBar: React.FC<Props> = ({ ... }) => {
  const { showFarplane, toggleFarplane } = useEditorStore(
    useShallow((state) => ({
      showFarplane: state.showFarplane,
      toggleFarplane: state.toggleFarplane
    }))
  );

  // Add to action buttons section (after grid toggle, before settings)
  return (
    <div className="toolbar">
      {/* ... existing tools */}

      <div className="toolbar-divider" />

      {/* Grid toggle (existing) */}
      <button
        className={`toolbar-button ${showGrid ? 'active' : ''}`}
        onClick={toggleGrid}
        title="Toggle grid (Ctrl+G)"
      >
        <LuGrid2X2 size={18} />
      </button>

      {/* Farplane toggle (NEW) */}
      <button
        className={`toolbar-button ${showFarplane ? 'active' : ''}`}
        onClick={toggleFarplane}
        title="Toggle farplane background"
      >
        {showFarplane ? <LuEye size={18} /> : <LuEyeOff size={18} />}
      </button>

      {/* Settings (existing) */}
      <button className="toolbar-button" onClick={...}>
        <LuSettings size={18} />
      </button>
    </div>
  );
};
```

### Conditional Farplane Rendering (CanvasEngine)
```typescript
// Source: CanvasEngine.ts renderTile() - add farplane conditional
// File: src/core/canvas/CanvasEngine.ts

export class CanvasEngine {
  private tilesetImage: HTMLImageElement | null = null;
  private farplaneColor: string = '#000000';  // NEW - default black/space

  /**
   * Set farplane background color (called from App.tsx when farplane image loads)
   */
  setFarplaneColor(color: string): void {  // NEW
    this.farplaneColor = color;
  }

  renderTile(
    ctx: CanvasRenderingContext2D,
    tile: number,
    destX: number,
    destY: number,
    destSize: number,
    animFrame: number
  ): void {
    const isAnimated = (tile & 0x8000) !== 0;
    if (isAnimated) {
      const animId = tile & 0xFF;
      const frameOffset = (tile >> 8) & 0x7F;
      const anim = ANIMATION_DEFINITIONS[animId];
      if (anim && anim.frames.length > 0 && this.tilesetImage) {
        const frameIdx = (animFrame + frameOffset) % anim.frameCount;
        const displayTile = anim.frames[frameIdx] || 0;
        const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
        const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
        ctx.drawImage(this.tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, destSize, destSize);
      } else {
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(destX, destY, destSize, destSize);
      }
    } else if (this.tilesetImage) {
      const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
      const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
      ctx.drawImage(this.tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, destX, destY, destSize, destSize);
    } else {
      // No tileset loaded - show fallback color
      // NEW: Check showFarplane state
      const state = useEditorStore.getState();
      if (state.showFarplane) {
        ctx.fillStyle = this.farplaneColor;  // Use farplane color
      } else {
        // Original fallback behavior
        ctx.fillStyle = tile === 280 ? '#b0b0b0' : `hsl(${(tile * 7) % 360}, 50%, 40%)`;
      }
      ctx.fillRect(destX, destY, destSize, destSize);
    }
  }
}
```

### Alternative: Farplane as Checkbox in Settings Panel
```typescript
// Source: MapSettingsDialog/CheckboxInput.tsx pattern
// Alternative location: Settings dialog instead of toolbar button
// File: src/components/MapSettingsDialog/MapSettingsDialog.tsx

import { CheckboxInput } from './CheckboxInput';

const MapSettingsDialog = () => {
  const { showFarplane, toggleFarplane } = useEditorStore(
    useShallow((state) => ({
      showFarplane: state.showFarplane,
      toggleFarplane: state.toggleFarplane
    }))
  );

  return (
    <div className="settings-dialog">
      {/* ... other settings tabs */}
      <div className="settings-tab">
        <h3>Display</h3>

        <CheckboxInput
          label="Show grid"
          checked={showGrid}
          onChange={(checked) => setShowGrid(checked)}
          description="Toggle grid overlay on canvas"
        />

        <CheckboxInput
          label="Show farplane background"
          checked={showFarplane}
          onChange={(checked) => toggleFarplane()}
          description="Display space background behind transparent tiles"
        />
      </div>
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static conveyor tiles | Animated conveyor tiles | v1.5 (Phase 15) | Conveyors visually show belt movement |
| Hardcoded tile IDs in placement | Animation ID encoding `0x8000 \| animId` | v3.2 (Phase 68) | Animated spawns, warps - now extends to conveyors |
| Gray fallback for missing tiles | Optional farplane background | v3.2 (Phase 69) | Matches in-game appearance during editing |
| Global settings in component state | Zustand GlobalSlice with localStorage | v2.x | Settings persist across sessions |

**Deprecated/outdated:**
- Manual animation frame tracking: Use global `animationFrame` counter from GlobalSlice
- Per-tile farplane lookups: Pre-compute average farplane color or use solid fallback
- Document-specific UI preferences: UI settings (grid, farplane) belong in GlobalSlice, not DocumentsSlice

## Open Questions

1. **Should farplane use exact pixel colors or solid fallback?**
   - What we know: Minimap has `farplanePixelsRef` with full pixel data; CanvasEngine currently uses solid colors
   - What's unclear: Whether to implement per-tile farplane pixel lookup (high fidelity) or solid color fallback (performance)
   - Recommendation: Start with solid color fallback (tile-280 average color or black #000000); add pixel-perfect farplane as future enhancement if requested

2. **Should farplane toggle be in toolbar or settings dialog?**
   - What we know: Grid toggle is in toolbar; other display preferences (opacity, color) are in settings dialog
   - What's unclear: Whether farplane is frequently toggled (toolbar) or set-once (settings)
   - Recommendation: Toolbar button for quick access, matching grid toggle pattern; users may toggle frequently to compare map appearance with/without farplane

3. **What default state for showFarplane?**
   - What we know: Grid defaults to false (off); farplane affects tile appearance significantly
   - What's unclear: Whether users expect farplane on by default (matches game) or off (clearer tile visibility)
   - Recommendation: Default false (off) - clearer tile editing; users can enable when they want game-accurate preview

4. **Should conveyor fix use static or animated tile encoding?**
   - What we know: Horizontal conveyors use static tiles (1717, 1718, ...); animated spawns/warps use `0x8000 | animId`
   - What's unclear: Why horizontal conveyors work with static tiles when animations 0xB7-0xBC exist
   - Recommendation: Use animated encoding `0x8000 | 0x94` for downward conveyors to match pattern and ensure correct animation playback; verify horizontal conveyors also work with animated encoding

5. **Do conveyors need frameOffset support?**
   - What we know: Animated spawns/warps use frameOffset (tile >> 8) & 0x7F for stagger; conveyors currently don't
   - What's unclear: Whether conveyors should support frame offsets for visual variety
   - Recommendation: Not needed for Phase 69 - conveyors animate uniformly; add frame offset as future enhancement if desired

## Sources

### Primary (HIGH confidence)
- Existing codebase: `AnimationDefinitions.ts` (lines 168-173, 203) - Gfx.dll animation sequences 0x94-0x99 (downward), 0xB7-0xBC (horizontal)
- Existing codebase: `GameObjectData.ts` (lines 94-97) - current CONV_DOWN_DATA and CONV_RIGHT_DATA arrays
- Existing codebase: `GameObjectSystem.ts` (lines 346-390) - placeConveyor() logic with skip behavior for odd dimensions
- Existing codebase: `CanvasEngine.ts` (lines 123-152) - renderTile() with fallback color logic (line 151)
- Existing codebase: `globalSlice.ts` - showGrid boolean pattern with localStorage persistence
- Existing codebase: `Minimap.tsx` (lines 26, 35, 43-44, 222-241) - farplaneImage prop and pixel cache
- Existing codebase: `ToolBar.tsx` - toolbar button patterns for toggles

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md (lines 23-30) - CFIX-01, FARP-01, FARP-02 requirement definitions
- STATE.md (lines 63-64) - notes on farplane as boolean setting with localStorage persistence
- Phase 68 plans - animated tile encoding pattern `0x8000 | animId` for spawns/warps

### Tertiary (LOW confidence)
- None - all findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Conveyor fix: HIGH - Animation definitions and placement data are clearly documented in code; mismatch is obvious
- Farplane toggle: HIGH - Pattern exists (showGrid), architecture supports it (CanvasEngine.renderTile fallback), localStorage persistence is standard
- UI placement: MEDIUM - Toolbar vs. settings dialog is design choice; both patterns exist in codebase
- Farplane rendering approach: MEDIUM - Solid color vs. pixel-perfect is performance tradeoff; both are viable

**Research date:** 2026-02-15
**Valid until:** 2026-03-17 (30 days - stable domain, existing patterns)
