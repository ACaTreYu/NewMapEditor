# Architecture Patterns: Animation Offset Control

**Domain:** Tile Map Editor - Parameterized Tile Placement
**Researched:** 2026-02-15

## Recommended Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Zustand Store                             │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ selectedTile   │  │ frameOffset  │  │ currentTool       │   │
│  │ (16-bit value) │  │ (0-127)      │  │ (ToolType enum)   │   │
│  └────────────────┘  └──────────────┘  └───────────────────┘   │
└───────┬──────────────────────┬────────────────────┬─────────────┘
        │                      │                    │
        │ read/write           │ read/write         │ read
        │                      │                    │
    ┌───▼──────────────┐  ┌───▼────────────────┐  │
    │  MapCanvas       │  │ AnimationPanel     │  │
    │  - Picker tool   │  │ - Offset input     │  │
    │  - Hover handler │  │ - Tile/Anim toggle │  │
    └──────────────────┘  └────────────────────┘  │
                                                   │
                          ┌────────────────────────▼───────────────┐
                          │ GameObjectToolPanel                    │
                          │ - Contextual widgets per tool:         │
                          │   * Warp: Source/Dest dropdowns        │
                          │   * Spawn: Team/Variant selector       │
                          │   * Animation: Numeric offset input    │
                          └────────────────────────────────────────┘
                                           │
                                           │ read frameOffset,
                                           │ write encoded tile
                                           │
                                      ┌────▼─────────────┐
                                      │ TileEncoding.ts  │
                                      │ - makeWarpTile() │
                                      │ - makeAnimatedTile() │
                                      │ - getFrameOffset() │
                                      └──────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Zustand Store** | Single source of truth for offset value | All UI components (read/write) |
| **AnimationPanel** | General animation offset input (0-127) | Zustand (reads/writes `frameOffset`) |
| **GameObjectToolPanel** | Tool-specific offset UI (warps, spawns) | Zustand (reads `frameOffset`, `currentTool`; writes `frameOffset`) |
| **MapCanvas** | Picker captures offset, hover shows offset | Zustand (reads map data, writes `frameOffset` on pick) |
| **StatusBar** | Display offset of hovered tile | MapCanvas (receives hover data via props) |
| **TileEncoding.ts** | Encode/decode offset to/from tile bits | All components (utility functions) |

## Patterns to Follow

### Pattern 1: Unified Offset State

**What:** Single `frameOffset` field in Zustand, tool-specific widgets encode/decode on read/write.

**When:** Different tools interpret offset differently (warp routing, spawn variant, frame offset).

**Why:** Matches tile encoding reality (one offset field, bits 14-8). Avoids state sync bugs when switching tools or using picker.

**Example:**
```typescript
// Zustand slice
interface OffsetState {
  frameOffset: number; // 0-127, raw offset value
  setFrameOffset: (offset: number) => void;
}

// GameObjectToolPanel - Warp UI (encodes Source/Dest to offset)
const frameOffset = useEditorStore((state) => state.frameOffset);
const setFrameOffset = useEditorStore((state) => state.setFrameOffset);

// Decode offset to warp routing
const warpSrc = frameOffset % 10;
const warpDest = Math.floor(frameOffset / 10);

// Encode warp routing to offset
const handleWarpSrcChange = (newSrc: number) => {
  setFrameOffset(warpDest * 10 + newSrc);
};

// AnimationPanel - General animation UI (uses offset directly)
const frameOffset = useEditorStore((state) => state.frameOffset);
<input type="text" value={frameOffset} onChange={(e) => {
  const num = parseInt(e.target.value, 10);
  if (!isNaN(num) && num >= 0 && num <= 127) {
    setFrameOffset(num);
  }
}} />
```

### Pattern 2: Picker Syncs Offset to UI

**What:** When picker tool captures a tile, decode its offset and update Zustand state.

**When:** User clicks picker (I) tool on map tile.

**Why:** Enables inspect-adjust-replace workflow. User picks tile → sees offset in UI → adjusts offset → re-places tile.

**Example:**
```typescript
// MapCanvas.tsx - Picker handler
case ToolType.PICKER:
  if (map) {
    const tile = map.tiles[y * MAP_WIDTH + x];

    // Set selected tile (existing behavior)
    setSelectedTile(tile);

    // NEW: Sync offset to UI state
    if (isAnimatedTile(tile)) {
      const offset = getFrameOffset(tile);
      setFrameOffset(offset);

      // Also sync animation ID to AnimationPanel selection
      const animId = getAnimationId(tile);
      setSelectedAnimId(animId); // Requires lifting to Zustand
    }

    restorePreviousTool();
  }
  break;
```

### Pattern 3: Conditional UI Widget Per Tool

**What:** GameObjectToolPanel shows different widgets based on `currentTool`. All widgets read/write same `frameOffset` state.

**When:** User switches tools (warp, spawn, animation).

**Why:** Tool-specific semantics (Source/Dest vs Team/Variant vs Frame) map to same underlying offset bits.

**Example:**
```typescript
// GameObjectToolPanel.tsx
const currentTool = useEditorStore((state) => state.currentTool);
const frameOffset = useEditorStore((state) => state.frameOffset);
const setFrameOffset = useEditorStore((state) => state.setFrameOffset);

return (
  <div className="game-object-tool-panel">
    {currentTool === ToolType.WARP && (
      <WarpOffsetControls
        frameOffset={frameOffset}
        setFrameOffset={setFrameOffset}
      />
    )}

    {currentTool === ToolType.SPAWN && (
      <SpawnOffsetControls
        frameOffset={frameOffset}
        setFrameOffset={setFrameOffset}
      />
    )}

    {/* Fallback for general animation tools */}
    {![ToolType.WARP, ToolType.SPAWN].includes(currentTool) && (
      <AnimationOffsetControls
        frameOffset={frameOffset}
        setFrameOffset={setFrameOffset}
      />
    )}
  </div>
);
```

### Pattern 4: Status Bar Extracts Offset from Hover

**What:** When user hovers over animated tile, status bar shows offset value.

**When:** Mouse moves over map canvas tile.

**Why:** Visual feedback before picking. User sees offset value → decides to pick or not.

**Example:**
```typescript
// MapCanvas.tsx - Hover handler
const handleMouseMove = (e: React.MouseEvent) => {
  // ... existing coordinate calculation ...
  const tile = map.tiles[y * MAP_WIDTH + x];

  // Extract tile info including offset
  const tileInfo = getTileInfo(tile, x, y);

  // Pass to StatusBar via prop or Zustand
  setCursorTileInfo(tileInfo);
};

// StatusBar.tsx
interface Props {
  cursorTileInfo?: TileInfo;
  // ... other props
}

export const StatusBar: React.FC<Props> = ({ cursorTileInfo }) => {
  return (
    <div className="status-bar">
      {/* ... coordinates, tile ID ... */}

      {cursorTileInfo?.isAnimated && (
        <div className="status-field">
          <span>Offset: {cursorTileInfo.frameOffset}</span>
        </div>
      )}
    </div>
  );
};
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Offset State Per Tool

**What:** Having `warpSrc`, `warpDest`, `spawnTeam`, `frameOffset` as separate Zustand fields.

**Why bad:**
- Picker doesn't know which field to update when capturing tile
- Switching tools doesn't preserve offset value (e.g., pick warp with offset 25, switch to spawn, offset resets)
- State sync complexity when multiple tools can place same animation ID with different offsets

**Instead:** Single `frameOffset` field, tool-specific widgets encode/decode it.

### Anti-Pattern 2: Prop Drilling setFrameOffset Callback

**What:** Passing `setFrameOffset` from AnimationPanel → Workspace → MapCanvas as prop.

**Why bad:**
- Couples components that shouldn't know about each other
- Breaks component reusability
- Hard to maintain as component tree grows

**Instead:** Lift `frameOffset` to Zustand, all components access via `useEditorStore`.

### Anti-Pattern 3: Offset Validation Only in UI

**What:** Validating offset range (0-127) only in input field `onChange` handler.

**Why bad:**
- TileEncoding.makeAnimatedTile() can still be called with invalid offset from other code
- Picker can extract invalid offset from corrupted map file
- No enforcement at encoding layer

**Instead:** Validate at both UI layer (user feedback) and encoding layer (defensive programming).

**Example:**
```typescript
// TileEncoding.ts - Defensive validation
export function makeAnimatedTile(animId: number, frameOffset: number = 0): number {
  // Clamp to valid range
  const validOffset = Math.max(0, Math.min(127, frameOffset));
  return ANIMATED_FLAG | ((validOffset & FRAME_OFFSET_MASK) << FRAME_OFFSET_SHIFT) | (animId & ANIMATION_ID_MASK);
}

// AnimationPanel.tsx - UI validation with feedback
const handleOffsetChange = (value: string) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    setOffsetError('Invalid number');
    return;
  }
  if (num < 0 || num > 127) {
    setOffsetError('Offset must be 0-127');
    return;
  }
  setOffsetError(null);
  setFrameOffset(num);
};
```

### Anti-Pattern 4: Updating selectedTile Without Offset

**What:** When offset changes, not updating `selectedTile` to reflect new offset value.

**Why bad:**
- User changes offset in UI, expects next placement to use new offset
- But `selectedTile` still has old offset bits
- Placement uses stale offset value

**Instead:** Update `selectedTile` whenever offset changes.

**Example:**
```typescript
// AnimationPanel.tsx - Update selectedTile when offset changes
const handleOffsetChange = (value: string) => {
  const num = parseInt(value, 10);
  if (!isNaN(num) && num >= 0 && num <= 127) {
    setFrameOffset(num);

    // Update selectedTile with new offset
    if (selectedAnimId !== null) {
      const anim = ANIMATION_DEFINITIONS[selectedAnimId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = makeAnimatedTile(selectedAnimId, num);
        setSelectedTile(animatedTile);
      }
    }
  }
};
```

## Scalability Considerations

| Concern | At MVP (1 tool) | At v4+ (5+ tools) | At v5+ (custom tools) |
|---------|----------------|-------------------|----------------------|
| **Offset state** | Single `frameOffset` field | Same, tools decode differently | Same, plugin tools add decoders |
| **UI widgets** | Conditional rendering in GameObjectToolPanel | Same, more conditionals | Plugin system registers custom widgets |
| **Validation** | Range check (0-127) | Tool-specific ranges (warp 0-99, spawn 0-15) | Plugin-defined validators |
| **Encoding** | Hardcoded `makeWarpTile()`, `makeAnimatedTile()` | More encoder functions | Plugin-defined encoders |

### Scaling to More Tools

**Current approach (hardcoded):**
```typescript
{currentTool === ToolType.WARP && <WarpControls />}
{currentTool === ToolType.SPAWN && <SpawnControls />}
{currentTool === ToolType.CONVEYOR && <ConveyorControls />}
```

**Future approach (data-driven):**
```typescript
const toolConfigs: Record<ToolType, ToolOffsetConfig> = {
  [ToolType.WARP]: {
    widget: WarpControls,
    encode: (params) => params.dest * 10 + params.src,
    decode: (offset) => ({ src: offset % 10, dest: Math.floor(offset / 10) }),
    validate: (offset) => offset >= 0 && offset <= 99,
  },
  [ToolType.SPAWN]: {
    widget: SpawnControls,
    encode: (params) => params.team * 4 + params.variant,
    decode: (offset) => ({ team: Math.floor(offset / 4), variant: offset % 4 }),
    validate: (offset) => offset >= 0 && offset <= 15,
  },
};

const config = toolConfigs[currentTool];
{config && <config.widget frameOffset={frameOffset} setFrameOffset={setFrameOffset} />}
```

## Sources

- `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` — Existing Zustand state structure
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` — Offset input pattern, selectedTile update logic
- `E:\NewMapEditor\src\components\GameObjectToolPanel\GameObjectToolPanel.tsx` — Tool-specific UI conditional rendering
- `E:\NewMapEditor\src\core\map\TileEncoding.ts` — Encoding/decoding functions, validation examples
- [React Conditional Rendering](https://react.dev/learn/conditional-rendering) — Official React patterns for tool-specific UIs (HIGH confidence)
- [Zustand State Management](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions) — Best practices for global state actions (HIGH confidence)

---
*Architecture patterns for: Animation Offset Control*
*Researched: 2026-02-15*
