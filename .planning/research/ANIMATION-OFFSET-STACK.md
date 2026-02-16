# Technology Stack: Animation Offset Control

**Project:** AC Map Editor - Animation Offset Control
**Researched:** 2026-02-15

## Recommended Stack

### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 4.x (existing) | Global offset state | Already used for `selectedTile`, `gameObjectToolState`. Lift `frameOffset` from React local state to Zustand for picker sync. |
| React useState | 18.x (existing) | Local UI state only | For transient UI state (hover, focus) that doesn't need picker sync. |

### Encoding/Decoding
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TileEncoding.ts | Existing | Offset extraction | `getFrameOffset()`, `getAnimationId()`, `makeAnimatedTile()` already exist. No new libs needed. |
| Bitwise operations | Native JS | Offset bit manipulation | Bits 14-8 store offset (0-127). Use shifts/masks: `(tile >> 8) & 0x7F`. |

### UI Components
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x (existing) | Component rendering | AnimationPanel, GameObjectToolPanel, StatusBar already exist. Add conditional rendering for tool-specific widgets. |
| HTML input[type="text"] | Native | Numeric offset input | Already used in AnimationPanel line 367-374. Keep simple, no library needed. |
| HTML select | Native | Warp Source/Dest dropdowns | Already used in GameObjectToolPanel line 58-78. Consistent pattern. |

### Validation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| parseInt + range check | Native JS | Offset validation | Already implemented in AnimationPanel.tsx:281-294. Pattern: `!isNaN(num) && num >= 0 && num <= 127`. |
| Conditional rendering | React | Tool-specific validation | Warp validates 0-9, general animations validate 0-127. Switch on `currentTool`. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| State management | Zustand global state | React Context | Zustand already in use, adding Context adds complexity |
| State management | Zustand global state | Redux | Overkill for single numeric field, Zustand is simpler |
| Offset input widget | HTML input[type="text"] | input[type="number"] | Number inputs have browser-specific spinners that vary UX, text input with validation is more controlled |
| Offset input widget | HTML input[type="text"] | Slider (range) | Slider is awkward for precise values (0-127 range on small slider), text input is more precise |
| Warp UI | Source/Dest dropdowns | Single offset input with help text | Dropdowns prevent invalid combos (e.g., offset 128 = invalid warp routing), better UX |
| Validation | Runtime parseInt + range check | TypeScript numeric constraints | TS can't enforce runtime range (0-127), still need JS validation |

## Installation

No new dependencies required. All features use existing stack:

```bash
# Already installed (no changes needed)
npm list zustand react
```

## Architecture Decisions

### Decision 1: Lift frameOffset to Zustand

**Problem:** AnimationPanel stores `frameOffset` in local React state (line 26). Picker can't update it because picker is in MapCanvas component.

**Options:**
1. Pass `setFrameOffset` callback from AnimationPanel → Workspace → MapCanvas (prop drilling)
2. Use React Context to share `frameOffset` state
3. Lift `frameOffset` to Zustand global state

**Decision:** Option 3 (Zustand global state)

**Rationale:**
- AnimationPanel already reads from Zustand (`animationFrame`, `selectedTile`)
- Picker already writes to Zustand (`setSelectedTile`)
- Consistent pattern: offset is tile metadata, like animation ID
- No prop drilling, no new Context provider
- Enables future features (status bar display, hotkeys) to access offset

**Implementation:**
```typescript
// globalSlice.ts (or new offsetSlice.ts)
interface OffsetState {
  frameOffset: number;
  setFrameOffset: (offset: number) => void;
}

// AnimationPanel.tsx
const frameOffset = useEditorStore((state) => state.frameOffset);
const setFrameOffset = useEditorStore((state) => state.setFrameOffset);

// MapCanvas.tsx (picker handler)
case ToolType.PICKER:
  const tile = map.tiles[y * MAP_WIDTH + x];
  setSelectedTile(tile);
  if (isAnimatedTile(tile)) {
    setFrameOffset(getFrameOffset(tile));
  }
  restorePreviousTool();
  break;
```

### Decision 2: Tool-Specific UI Widgets, Shared State

**Problem:** Different tools need different offset UIs (warp = dropdowns, animation = numeric input), but all write to same offset bits in tile encoding.

**Options:**
1. Separate state fields: `warpSrc`, `warpDest`, `frameOffset`, `spawnVariant` (status quo)
2. Unified `frameOffset` state, tool-specific UI widgets that encode/decode on read/write
3. Generic properties system like Tiled (arbitrary key-value pairs per tile)

**Decision:** Option 2 (unified state, tool-specific widgets)

**Rationale:**
- Tile encoding has single offset field (bits 14-8), not separate fields per tool
- Tool-specific state (Option 1) requires sync logic when switching tools or using picker
- Generic properties (Option 3) is overkill for fixed encoding format
- Option 2 matches encoding reality: one offset value, multiple interpretations

**Implementation:**
```typescript
// GameObjectToolPanel.tsx
const frameOffset = useEditorStore((state) => state.frameOffset);
const setFrameOffset = useEditorStore((state) => state.setFrameOffset);
const currentTool = useEditorStore((state) => state.currentTool);

// Decode offset to tool-specific values
const warpSrc = frameOffset % 10;
const warpDest = Math.floor(frameOffset / 10);

// Render tool-specific widgets
{currentTool === ToolType.WARP && (
  <>
    <select value={warpSrc} onChange={(e) => {
      const newSrc = Number(e.target.value);
      setFrameOffset(warpDest * 10 + newSrc);
    }}>
      {/* 0-9 options */}
    </select>
    <select value={warpDest} onChange={(e) => {
      const newDest = Number(e.target.value);
      setFrameOffset(newDest * 10 + warpSrc);
    }}>
      {/* 0-9 options */}
    </select>
  </>
)}

{currentTool === ToolType.SPAWN && (
  <input type="text" value={frameOffset} onChange={(e) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 0 && num <= 127) {
      setFrameOffset(num);
    }
  }} />
)}
```

### Decision 3: Status Bar Shows Offset on Hover

**Problem:** Users need to see what offset value an existing tile has before picking it.

**Options:**
1. Add offset to tooltip that appears on hover
2. Add offset to status bar text (e.g., "X: 45 Y: 67 Tile: 0x8094 Offset: 20")
3. Highlight offset in AnimationPanel when hovering tile with that offset

**Decision:** Option 2 (status bar text)

**Rationale:**
- Status bar already shows cursor position and tile ID (StatusBar.tsx line 46-52)
- Tooltips have delay, status bar is immediate
- AnimationPanel highlight (Option 3) requires scroll-to-view if offset row not visible
- Consistent with tile ID display pattern

**Implementation:**
```typescript
// MapCanvas.tsx (hover handler)
const handleMouseMove = (e: React.MouseEvent) => {
  // ... existing coordinate calculation ...
  const tile = map.tiles[y * MAP_WIDTH + x];
  const tileInfo = getTileInfo(tile, x, y);
  setCursorPosition({ x, y, tileId: tile, tileInfo });
};

// StatusBar.tsx
<div className="status-field">
  {hoverSource === 'map' && cursorTileInfo?.isAnimated && (
    <span>Offset: {cursorTileInfo.frameOffset}</span>
  )}
</div>
```

## Sources

### Existing Codebase
- `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — Zustand global state structure
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Current offset input implementation (local state)
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.tsx` — Warp Source/Dest dropdowns pattern
- `E:\NewMapEditor\src\core\map\TileEncoding.ts` — Offset encoding/decoding helpers
- `E:\NewMapEditor\src\components\StatusBar\StatusBar.tsx` — Status bar display pattern

### State Management Patterns
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction) — Official Zustand patterns (HIGH confidence)
- [React State Management](https://react.dev/learn/managing-state) — When to lift state vs keep local (HIGH confidence)

---
*Technology stack for: Animation Offset Control*
*Researched: 2026-02-15*
