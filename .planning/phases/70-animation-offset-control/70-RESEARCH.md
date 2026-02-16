# Phase 70: Animation Offset Control - Research

**Researched:** 2026-02-15
**Domain:** Tile Map Editor UI Integration & State Management
**Confidence:** HIGH

## Summary

Phase 70 adds animation offset control to the tile editor, enabling users to set frame offsets (0-127) for animated tiles through the Animations panel, with picker tool synchronization and contextual UI feedback. The implementation is a pure feature addition requiring **zero new dependencies** — all capabilities exist in the current React/TypeScript/Zustand stack.

The research reveals that AnimationPanel already has a local `frameOffset` state and input field, but the offset is not connected to GlobalSlice state management, not captured by the picker tool, and hardcoded to 0 in GameObjectSystem placement methods. The solution requires three integration points: (1) move offset to GlobalSlice for persistence, (2) extract offset in picker tool handler, (3) pass offset to GameObjectSystem placement methods.

**Primary recommendation:** Add `animationOffsetInput` to GlobalSlice (following existing `gameObjectToolState` pattern), wire AnimationPanel input to this state, modify picker tool to extract and sync offset, and update placeAnimatedSpawn/placeAnimatedWarp to encode the current offset value.

## Standard Stack

### Core (All Existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.3.1 | UI components | Controlled inputs already used in AnimationPanel (line 370: `value={frameOffset}`) |
| TypeScript | 5.7.2 | Type safety | Existing GameObjectToolState interface provides pattern for offset storage |
| Zustand | 5.0.3 | State management | GlobalSlice already stores gameObjectToolState — same pattern applies |

### Supporting (All Existing)
| Utility | Location | Purpose | Current Status |
|---------|----------|---------|----------------|
| TileEncoding.ts | src/core/map/ | Encode/decode offset from tile values | `getFrameOffset(tile)` and `makeAnimatedTile(animId, offset)` already implemented |
| AnimationPanel.tsx | src/components/ | Offset input UI | Local `frameOffset` state exists but not connected to GlobalSlice |
| StatusBar.tsx | src/components/ | Display offset on hover | Already decodes offset: `(cursorTileId >> 8) & 0x7F` (line 109) |
| MapCanvas.tsx | src/components/ | Picker tool handler | Already captures tile value, needs offset extraction |
| GameObjectSystem.ts | src/core/map/ | Place animated objects | Hardcoded offset 0 (line 125: `0x8000 | animId`) needs parameterization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GlobalSlice state | AnimationPanel local state | Local state doesn't persist across component unmount, no picker sync |
| Separate offset per animation ID | Single global offset | More complex UI, not required by specifications |
| Per-document offset | Global offset | Over-engineered — offset is a placement preference like selectedTile, not document state |

**Installation:**
No new packages required. All functionality exists in current stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── editor/
│   │   └── slices/
│   │       └── globalSlice.ts      # ADD: animationOffsetInput field
│   └── map/
│       ├── GameObjectSystem.ts     # MODIFY: add offset parameter to placeAnimated*()
│       └── TileEncoding.ts         # EXISTING: getFrameOffset(), makeAnimatedTile()
└── components/
    ├── AnimationPanel/
    │   └── AnimationPanel.tsx      # MODIFY: wire to GlobalSlice state
    └── MapCanvas/
        └── MapCanvas.tsx           # MODIFY: picker extracts offset, syncs to GlobalSlice
```

### Pattern 1: Offset State in GlobalSlice (Not Per-Document)

**What:** Store `animationOffsetInput` in GlobalSlice alongside `selectedTile` and `gameObjectToolState`

**When to use:** For placement preferences that apply across all documents (like tool settings, selected tile)

**Rationale:**
- Animation offset is a **user preference for placement**, not per-document state
- Consistent with existing `selectedTile` (GlobalSlice) vs `viewport` (DocumentsSlice) separation
- User sets offset once, places multiple tiles with that offset across any open document
- No need for per-document isolation (unlike undo stack, viewport position)

**Example:**
```typescript
// src/core/editor/slices/globalSlice.ts
export interface GlobalSlice {
  // ... existing fields
  animationOffsetInput: number;  // 0-127, default 0

  // Actions
  setAnimationOffsetInput: (offset: number) => void;
}

export const createGlobalSlice: StateCreator<GlobalSlice, [], [], GlobalSlice> = (set, get) => ({
  // ... existing state
  animationOffsetInput: 0,

  setAnimationOffsetInput: (offset) => set({
    animationOffsetInput: Math.max(0, Math.min(127, offset))
  }),
});
```

### Pattern 2: Picker Tool Offset Extraction and Sync

**What:** Picker tool extracts offset from picked tile and updates AnimationPanel state

**When to use:** When picker needs to capture complex tile state (animated tiles with offset)

**Current behavior (MapCanvas.tsx line 1951-1956):**
```typescript
case ToolType.PICKER:
  if (map) {
    setSelectedTile(map.tiles[y * MAP_WIDTH + x]);
    restorePreviousTool();
  }
  break;
```

**Required modification:**
```typescript
case ToolType.PICKER:
  if (map) {
    const tile = map.tiles[y * MAP_WIDTH + x];
    setSelectedTile(tile);

    // NEW: Extract offset if animated tile
    if (tile & ANIMATED_FLAG) {
      const offset = getFrameOffset(tile);  // From TileEncoding.ts
      setAnimationOffsetInput(offset);       // Sync to GlobalSlice
    }

    restorePreviousTool();
  }
  break;
```

**Why this works:**
- `getFrameOffset()` already exists in TileEncoding.ts: `(tile >> 8) & 0x7F`
- AnimationPanel subscribes to `animationOffsetInput` from GlobalSlice
- Offset input field auto-updates when picker captures a new value
- Enables inspect-adjust-replace workflow (PICK-01, PICK-02)

### Pattern 3: Warp Source/Dest Encoding as Offset

**What:** Warp tool uses offset field to encode routing data (dest*10 + src)

**Encoding:** `0x8000 | ((dest * 10 + src) << 8) | 0xFA`

**UI Pattern:**
```typescript
// GameObjectToolPanel.tsx (existing warp controls)
<select value={warpSrc} onChange={(e) => setWarpSettings(Number(e.target.value), warpDest, warpStyle)}>
  {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i}</option>)}
</select>

<select value={warpDest} onChange={(e) => setWarpSettings(warpSrc, Number(e.target.value), warpStyle)}>
  {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i}</option>)}
</select>
```

**Picker integration:**
```typescript
// When picking warp tile (0xFA animation ID)
const animId = tile & 0xFF;
if (animId === 0xFA) {  // Warp tile
  const encodedOffset = (tile >> 8) & 0x7F;
  const warpSrc = encodedOffset % 10;
  const warpDest = Math.floor(encodedOffset / 10);
  setWarpSettings(warpSrc, warpDest, warpStyle);  // Populate dropdowns
}
```

### Pattern 4: GameObjectSystem Offset Parameterization

**What:** Pass offset parameter to animated object placement methods

**Current (hardcoded offset 0, GameObjectSystem.ts line 125):**
```typescript
placeAnimatedSpawn(map: MapData, x: number, y: number, team: Team): boolean {
  const animId = 0xA3 + team;
  map.tiles[y * MAP_WIDTH + x] = 0x8000 | animId;  // Offset hardcoded to 0
  return true;
}
```

**Modified (with offset parameter):**
```typescript
placeAnimatedSpawn(map: MapData, x: number, y: number, team: Team, offset: number = 0): boolean {
  const animId = 0xA3 + team;
  map.tiles[y * MAP_WIDTH + x] = makeAnimatedTile(animId, offset);  // Use TileEncoding helper
  return true;
}
```

**Caller (documentsSlice.ts line 851):**
```typescript
case ToolType.SPAWN:
  const offset = get().animationOffsetInput;  // Read from GlobalSlice
  if (spawnVariant === 1) {
    success = gameObjectSystem.placeAnimatedSpawn(doc.map, x, y, selectedTeam, offset);
  } else {
    success = gameObjectSystem.placeSpawn(doc.map, x, y, selectedTeam);
  }
  break;
```

### Pattern 5: Input Validation with Visual Feedback

**What:** Range validation (0-127) with error state for out-of-range values

**Existing pattern (StatusBar.tsx line 153-161):**
```typescript
<input
  type="number"
  className="zoom-input"
  min={25}
  max={400}
  step={1}
  value={Math.round(viewport.zoom * 100)}
  onChange={handleZoomInput}
/>
```

**Offset input pattern:**
```typescript
const [offsetError, setOffsetError] = useState(false);

const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  const num = parseInt(value, 10);

  if (value === '' || isNaN(num)) {
    setOffsetError(true);
    return;
  }

  if (num < 0 || num > 127) {
    setOffsetError(true);
    return;
  }

  setOffsetError(false);
  setAnimationOffsetInput(num);
};

<input
  type="number"
  className={`offset-input ${offsetError ? 'error' : ''}`}
  min={0}
  max={127}
  value={animationOffsetInput}
  onChange={handleOffsetChange}
  disabled={currentTool !== ToolType.SPAWN && currentTool !== ToolType.WARP}
/>
```

**CSS (AnimationPanel.css):**
```css
.offset-input.error {
  border-color: var(--color-error);
  background-color: var(--color-error-bg);
}
```

### Anti-Patterns to Avoid

- **Storing offset in AnimationPanel local state:** Component unmount loses state, no picker sync
- **Per-document offset storage:** Over-engineered — offset is a placement preference, not document state
- **Direct tile value manipulation without TileEncoding helpers:** Use `makeAnimatedTile()` and `getFrameOffset()` for maintainability
- **Unconditional offset extraction:** Only extract offset for animated tiles (check `ANIMATED_FLAG`)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile offset encoding | Bit shift math in placement code | `TileEncoding.makeAnimatedTile(animId, offset)` | Already implemented, tested, documented |
| Offset decoding | Manual `(tile >> 8) & 0x7F` everywhere | `TileEncoding.getFrameOffset(tile)` | Single source of truth, type-safe |
| Input clamping | Custom range validation | Math.max(0, Math.min(127, offset)) | Standard pattern, used in setGridOpacity |
| State persistence | localStorage | Zustand GlobalSlice | Consistent with existing tool state, no serialization overhead |

**Key insight:** The codebase already has 90% of the required infrastructure. The task is integration, not implementation.

## Common Pitfalls

### Pitfall 1: Forgetting to Extract Offset on Picker
**What goes wrong:** Picker tool copies animated tile to selectedTile, but AnimationPanel offset input doesn't update

**Why it happens:** Current picker handler (MapCanvas.tsx line 1951-1956) only calls `setSelectedTile()`, doesn't extract offset

**How to avoid:** Add offset extraction after `setSelectedTile()`:
```typescript
if (tile & ANIMATED_FLAG) {
  const offset = getFrameOffset(tile);
  setAnimationOffsetInput(offset);
}
```

**Warning signs:** User picks animated tile with offset 50, AnimationPanel still shows 0

### Pitfall 2: Placing Static Tiles with Offset Encoding
**What goes wrong:** User places static tile (e.g., wall) but code tries to encode offset, resulting in unexpected animated flag

**Why it happens:** Not checking if tile is animated before applying offset encoding

**How to avoid:** Only encode offset for game object tools (SPAWN, WARP with animated variant):
```typescript
// CORRECT: Only for animated variants
if (spawnVariant === 1) {
  const offset = get().animationOffsetInput;
  success = gameObjectSystem.placeAnimatedSpawn(doc.map, x, y, selectedTeam, offset);
}

// INCORRECT: Applying offset to static spawn (spawnVariant === 0)
const offset = get().animationOffsetInput;
success = gameObjectSystem.placeSpawn(doc.map, x, y, selectedTeam, offset);  // Wrong!
```

**Warning signs:** Static tiles suddenly become animated (bit 15 set incorrectly)

### Pitfall 3: Offset Input Enabled for Non-Animated Tools
**What goes wrong:** User edits offset while pencil tool is active, expects tile placement to use offset

**Why it happens:** Offset input not conditionally disabled based on active tool

**How to avoid:** Disable offset input when tool doesn't use animation offsets:
```typescript
<input
  type="number"
  disabled={!isGameObjectTool(currentTool) || placementMode !== 'anim'}
  value={animationOffsetInput}
/>

function isGameObjectTool(tool: ToolType): boolean {
  return tool === ToolType.SPAWN || tool === ToolType.WARP;
}
```

**Warning signs:** User types offset value, switches to pencil tool, expects pencil to place animated tiles

### Pitfall 4: Warp Offset Collision with Frame Offset
**What goes wrong:** User sets offset to 50 in AnimationPanel, places warp, routing gets corrupted

**Why it happens:** Warp uses offset field for routing (dest*10 + src), not frame offset

**How to avoid:** Warp tool should use warpSrc/warpDest from gameObjectToolState, NOT animationOffsetInput:
```typescript
// CORRECT: Warp uses its own state
case ToolType.WARP:
  const { warpSrc, warpDest, warpStyle } = gameObjectToolState;
  success = gameObjectSystem.placeWarp(doc.map, x, y, warpStyle, warpSrc, warpDest);
  break;

// INCORRECT: Warp using animationOffsetInput
const offset = get().animationOffsetInput;
success = gameObjectSystem.placeWarp(doc.map, x, y, warpStyle, offset);  // Wrong!
```

**Warning signs:** Warp routing changes when AnimationPanel offset is modified

### Pitfall 5: StatusBar Offset Display for Static Tiles
**What goes wrong:** StatusBar shows "Offset: 0" for static tiles, confusing users

**Why it happens:** Unconditional offset display without checking ANIMATED_FLAG

**How to avoid:** Only show offset for animated tiles (already implemented correctly in StatusBar.tsx line 108-111):
```typescript
{cursorTileId !== undefined
  ? (cursorTileId & 0x8000)
    ? `Anim: ${(cursorTileId & 0xFF).toString(16).toUpperCase().padStart(2, '0')}  Offset: ${(cursorTileId >> 8) & 0x7F}`
    : `Tile: ${cursorTileId}`
  : 'Tile: --'}
```

**Warning signs:** Hovering over static walls shows "Anim: XX Offset: Y" instead of "Tile: XXX"

## Code Examples

Verified patterns from codebase analysis:

### Add Offset to GlobalSlice
```typescript
// src/core/editor/slices/globalSlice.ts (line 22-122)
export interface GlobalSlice {
  // ... existing fields
  animationOffsetInput: number;  // NEW: 0-127, for animated tile placement

  // Actions
  setAnimationOffsetInput: (offset: number) => void;  // NEW
}

export const createGlobalSlice: StateCreator<GlobalSlice, [], [], GlobalSlice> = (set, get) => ({
  // ... existing state
  animationOffsetInput: 0,  // NEW: default offset

  // NEW action
  setAnimationOffsetInput: (offset) => set({
    animationOffsetInput: Math.max(0, Math.min(127, offset))  // Clamp to valid range
  }),
});
```

### Wire AnimationPanel to GlobalSlice
```typescript
// src/components/AnimationPanel/AnimationPanel.tsx
import { useEditorStore } from '@core/editor';
import { getFrameOffset } from '@core/map/TileEncoding';

export const AnimationPanel: React.FC<Props> = ({ tilesetImage }) => {
  // REMOVE local frameOffset state
  // const [frameOffset, setFrameOffset] = useState(0);

  // NEW: Subscribe to GlobalSlice
  const animationOffsetInput = useEditorStore((state) => state.animationOffsetInput);
  const setAnimationOffsetInput = useEditorStore((state) => state.setAnimationOffsetInput);

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 127) {
      setAnimationOffsetInput(num);  // Update GlobalSlice
    }
  };

  // Update selected tile encoding
  const handleClick = (e: React.MouseEvent) => {
    // ... existing click logic
    if (placementMode === 'anim' && selectedAnimId !== null) {
      const anim = ANIMATION_DEFINITIONS[selectedAnimId];
      if (anim && anim.frames.length > 0) {
        const animatedTile = ANIMATED_FLAG | (animationOffsetInput << 8) | selectedAnimId;
        setSelectedTile(animatedTile);
      }
    }
  };

  return (
    <input
      type="number"
      className="offset-input"
      min={0}
      max={127}
      value={animationOffsetInput}  // GlobalSlice state
      onChange={handleOffsetChange}
      disabled={placementMode !== 'anim'}
    />
  );
};
```

### Picker Tool Offset Extraction
```typescript
// src/components/MapCanvas/MapCanvas.tsx (line 1951-1956)
import { getFrameOffset, isAnimatedTile } from '@core/map/TileEncoding';

const handleToolAction = (x: number, y: number) => {
  const setAnimationOffsetInput = useEditorStore.getState().setAnimationOffsetInput;

  switch (currentTool) {
    case ToolType.PICKER:
      if (map) {
        const tile = map.tiles[y * MAP_WIDTH + x];
        setSelectedTile(tile);

        // NEW: Extract and sync offset for animated tiles
        if (isAnimatedTile(tile)) {
          const offset = getFrameOffset(tile);
          setAnimationOffsetInput(offset);
        }

        restorePreviousTool();
      }
      break;
  }
};
```

### GameObjectSystem Offset Parameter
```typescript
// src/core/map/GameObjectSystem.ts (line 120-128)
import { makeAnimatedTile } from './TileEncoding';

placeAnimatedSpawn(map: MapData, x: number, y: number, team: Team, offset: number = 0): boolean {
  if (team === Team.NEUTRAL || team < 0 || team > 3) return false;
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;

  const animId = 0xA3 + team;
  map.tiles[y * MAP_WIDTH + x] = makeAnimatedTile(animId, offset);  // Use offset parameter
  map.modified = true;
  return true;
}

placeAnimatedWarp(map: MapData, x: number, y: number, offset: number = 0): boolean {
  // 3x3 animated warp pattern with offset
  const pattern = ANIMATED_WARP_PATTERN.map(tile =>
    tile >= 0x8000 ? makeAnimatedTile(tile & 0xFF, offset) : tile
  );
  return this.stamp3x3(map, x, y, pattern);
}
```

### DocumentsSlice Caller Modification
```typescript
// src/core/editor/slices/documentsSlice.ts (line 849-854)
case ToolType.SPAWN:
  const offset = get().animationOffsetInput;  // NEW: Read from GlobalSlice
  if (spawnVariant === 1) {
    success = gameObjectSystem.placeAnimatedSpawn(doc.map, x, y, selectedTeam, offset);
  } else {
    success = gameObjectSystem.placeSpawn(doc.map, x, y, selectedTeam);
  }
  break;

case ToolType.WARP:
  const warpOffset = get().animationOffsetInput;  // NEW: Read from GlobalSlice
  if (warpVariant === 1) {
    success = gameObjectSystem.placeAnimatedWarp(doc.map, x, y, warpOffset);
  } else {
    success = gameObjectSystem.placeWarp(doc.map, x, y, warpStyle, warpSrc, warpDest);
  }
  break;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded offset 0 in GameObjectSystem | Parameterized offset from GlobalSlice | Phase 70 | Enables user control over animation timing |
| AnimationPanel local state | GlobalSlice state | Phase 70 | Picker tool can sync offset, state persists across component lifecycle |
| Manual bit manipulation | TileEncoding helper functions | Phase 68 (v3.2) | Type-safe, maintainable offset encoding |

**Deprecated/outdated:**
- N/A (new feature, no existing offset control to deprecate)

## Open Questions

1. **Should offset input be visible for tools other than Spawn/Warp?**
   - What we know: AnimationPanel has "Tile/Anim" mode toggle (line 343-362), offset is disabled in Tile mode
   - What's unclear: Should offset be visible but disabled for all tools, or hidden completely for non-animated tools?
   - Recommendation: Keep visible but disabled (consistent with existing UI pattern in ToolBar.tsx line 662-675)

2. **Should warp Source/Dest dropdowns replace the offset input when Warp tool is active?**
   - What we know: Warp uses offset field for routing (dest*10 + src), not frame offset
   - What's unclear: UI precedence — show both controls, or swap offset input for Source/Dest dropdowns?
   - Recommendation: Show both — offset input disabled, Source/Dest dropdowns active (contextual display, WARP-01)

3. **Should animated warp (3x3 block) use per-tile offset or shared offset?**
   - What we know: ANIMATED_WARP_PATTERN has 9 tiles with different animation IDs (0x9A-0xA2)
   - What's unclear: Should all 9 tiles use same offset, or different offsets for visual variety?
   - Recommendation: Same offset for all 9 tiles (simpler UX, matches SEdit behavior)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: EditorState.ts, globalSlice.ts, AnimationPanel.tsx, MapCanvas.tsx, GameObjectSystem.ts, TileEncoding.ts, StatusBar.tsx
- Existing patterns: gameObjectToolState (GlobalSlice), zoom input validation (StatusBar.tsx), picker tool handler (MapCanvas.tsx)
- Technical spec: CLAUDE.md (animated tile encoding: `0x8000 | (offset << 8) | animId`)

### Secondary (MEDIUM confidence)
- .planning/research/ARCHITECTURE.md (state management patterns, component responsibilities)
- .planning/research/STACK.md (technology stack, no new dependencies required)

### Tertiary (LOW confidence)
- N/A (no external sources required, pure codebase analysis)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All required functionality exists in current stack (React, TypeScript, Zustand)
- Architecture: HIGH — Existing patterns (GlobalSlice state, picker tool, GameObjectSystem) directly apply
- Pitfalls: HIGH — Identified from codebase analysis (hardcoded offset 0, missing picker sync, validation patterns)

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days, stable domain)
