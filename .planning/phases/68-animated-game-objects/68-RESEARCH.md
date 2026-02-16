# Phase 68: Animated Game Objects - Research

**Researched:** 2026-02-15
**Domain:** TypeScript/React game object tool variants with animated tile encoding
**Confidence:** HIGH

## Summary

This phase adds animated variants to existing spawn and warp game object tools. The implementation follows established patterns from the codebase: toolbar variant dropdowns (like Flag team selector), game object placement via GameObjectSystem, and animated tile encoding using the 0x8000 flag. The animation definitions are already present in AnimationDefinitions.ts (extracted from Gfx.dll), so no new animation data is required.

The primary work involves: (1) adding variant dropdowns to ToolBar.tsx for spawn/warp tools, (2) extending GameObjectToolState with variant selection state, (3) implementing placement functions in GameObjectSystem for animated variants, and (4) ensuring CanvasEngine's existing animation rendering handles the new tiles.

**Primary recommendation:** Follow the Flag tool variant pattern exactly — toolbar dropdown + GameObjectToolState field + switch case in placeGameObject. Animated spawn uses single-tile placement with animation IDs 0xA3-0xA6, animated warp uses 3x3 stamp with animation IDs 0x9A-0xA2.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety for game object placement | Used throughout codebase |
| React 18 | 18.x | UI components for variant dropdowns | Project UI framework |
| Zustand | 4.x | State management for tool variants | Existing editor state pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Canvas API | Native | Animated tile rendering | Already handles animations via CanvasEngine |

**Installation:**
No new dependencies required — all functionality uses existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/ToolBar/        # Add spawn/warp variant dropdowns
├── core/map/GameObjectSystem.ts  # Add placeAnimatedSpawn/placeAnimatedWarp
├── core/map/GameObjectData.ts    # Add ANIMATED_SPAWN_IDS, ANIMATED_WARP_PATTERN
├── core/editor/slices/globalSlice.ts  # Add spawnVariant, warpVariant to GameObjectToolState
└── core/editor/slices/documentsSlice.ts  # Extend placeGameObject switch cases
```

### Pattern 1: Tool Variant Dropdown (Existing Pattern)
**What:** Toolbar button with dropdown menu to select tool variant (team, type, direction)
**When to use:** When a tool has multiple modes/configurations (Flag team, Switch type, Bunker direction)
**Example:**
```typescript
// From ToolBar.tsx lines 197-210 (Flag tool variant)
{
  tool: ToolType.FLAG,
  settingName: 'Team',
  getCurrentValue: () => gameObjectToolState.flagPadType,
  variants: [
    { label: 'Green', value: 0 },
    { label: 'Red', value: 1 },
    { label: 'Blue', value: 2 },
    { label: 'Yellow', value: 3 },
    { label: 'White', value: 4 },
  ],
  setter: setFlagPadType
}
```

### Pattern 2: Animated Tile Encoding (Existing Pattern)
**What:** 16-bit tile value with bit 15 set for animated tiles, animation ID in bits 0-7
**When to use:** Placing animated tiles (flags, spawn, warp, walls, etc.)
**Example:**
```typescript
// From TileEncoding.ts
const ANIMATED_FLAG = 0x8000;
const animatedTile = ANIMATED_FLAG | animationId;  // e.g., 0x8000 | 0xA3 = 0x80A3

// Animation definitions from AnimationDefinitions.ts:
// 0xA3 = Green OnMapSpawn (frames: 870-875)
// 0xA4 = Red OnMapSpawn (frames: 976, 977, 978, 979, 1016, 1017)
// 0xA5 = Blue OnMapSpawn (frames: 1099-1102, 1139-1140)
// 0xA6 = Yellow OnMapSpawn (frames: 1222-1225, 1262-1263)
```

### Pattern 3: Game Object Stamp Placement (Existing Pattern)
**What:** stamp3x3 helper in GameObjectSystem places 3x3 tile patterns at top-left origin
**When to use:** Placing multi-tile game objects (flags, spawns, poles)
**Example:**
```typescript
// From GameObjectSystem.ts lines 35-48
private stamp3x3(map: MapData, x: number, y: number, tiles: number[]): boolean {
  for (let i = y; i < y + 3; i++) {
    if (i < 0 || i >= MAP_HEIGHT) continue;
    for (let j = x; j < x + 3; j++) {
      if (j < 0 || j >= MAP_WIDTH) continue;
      const tileVal = tiles[(i - y) * 3 + (j - x)];
      if (tileVal >= 0) {
        map.tiles[i * MAP_WIDTH + j] = tileVal;
      }
    }
  }
  map.modified = true;
  return true;
}
```

### Pattern 4: Click-to-Stamp with Offset (Existing Pattern)
**What:** Mouse click placement with x-1, y-1 offset to center 3x3 stamp on cursor
**When to use:** 3x3 game objects that should be centered on click (spawn, flag, pole)
**Example:**
```typescript
// From MapCanvas.tsx lines 1526-1529
case ToolType.FLAG:
case ToolType.FLAG_POLE:
case ToolType.SPAWN:
  pushUndo();
  placeGameObject(x - 1, y - 1);  // Offset to center 3x3 on cursor
  commitUndo('Place game object');
```

### Anti-Patterns to Avoid
- **Hardcoding animation frames in placement code:** Animation frames are in AnimationDefinitions.ts and rendered by CanvasEngine. Placement only encodes animation ID.
- **Mixing variant state with tool type:** Variant selection (spawnVariant) is separate from currentTool (ToolType.SPAWN). Tool stays selected, variant changes.
- **Recreating stamp3x3 logic:** Use existing GameObjectSystem.stamp3x3 for multi-tile placement.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation rendering | Custom frame cycling logic | CanvasEngine.renderTile() | Already handles 0x8000 flag, frame offset, ANIMATION_DEFINITIONS lookup |
| Tile encoding | String parsing/bitwise ops | ANIMATED_FLAG \| animId | Standard pattern used throughout codebase |
| 3x3 placement | Custom loop | GameObjectSystem.stamp3x3() | Handles bounds checking, -1 skip tiles, modified flag |
| Variant dropdown | Custom dropdown component | ToolBar variantConfigs pattern | Consistent with Flag, Switch, Bunker tools |

**Key insight:** Animation rendering is already complete. This phase only adds placement logic with correct animation IDs. The CanvasEngine will automatically cycle frames based on the global animationFrame counter.

## Common Pitfalls

### Pitfall 1: Centering vs Top-Left Origin
**What goes wrong:** Animated warp should be centered on click, but stamp3x3 takes top-left origin
**Why it happens:** stamp3x3 uses SEdit's top-left convention, but UX expects center click
**How to avoid:** Apply -1 offset for 3x3 stamps: `placeAnimatedWarp(x - 1, y - 1)`
**Warning signs:** Animated warp appears offset from cursor, users click wrong tile

### Pitfall 2: Animation ID vs Frame Index
**What goes wrong:** Using tile frame (870) instead of animation ID (0xA3)
**Why it happens:** Requirements mention frame ranges (870-875), not animation IDs
**How to avoid:** Always encode with animation ID: `0x8000 | 0xA3`, NOT `0x8000 | 870`
**Warning signs:** Tiles render as solid color (#4a4a6a), no animation cycles

### Pitfall 3: Warp Routing vs Visual Block
**What goes wrong:** Trying to encode src/dest in animated warp tiles
**Why it happens:** Normal warp encodes routing in upper bits (see encodeWarpTile)
**How to avoid:** Animated warp is visual-only 3x3 block. Center tile (0x9E) should be pure animation, no routing.
**Warning signs:** Invalid warp encoding errors, game doesn't recognize warp

### Pitfall 4: Missing Variant State Initialization
**What goes wrong:** Spawn variant defaults to undefined, placement fails
**Why it happens:** New GameObjectToolState fields need default values
**How to avoid:** Add defaults in globalSlice.ts initial state: `spawnVariant: 0, warpVariant: 0`
**Warning signs:** TypeScript errors, variant dropdown shows empty, placement crashes

## Code Examples

Verified patterns from the codebase:

### Adding Tool Variant Configuration
```typescript
// In ToolBar.tsx, add to variantConfigs array (after line 297)
{
  tool: ToolType.SPAWN,
  settingName: 'Type',
  getCurrentValue: () => gameObjectToolState.spawnVariant,
  variants: [
    { label: 'Static', value: 0 },
    { label: 'Animated', value: 1 },
  ],
  setter: setSpawnVariant
},
{
  tool: ToolType.WARP,
  settingName: 'Type',
  getCurrentValue: () => gameObjectToolState.warpVariant,
  variants: [
    { label: 'Single', value: 0 },
    { label: '3x3 Animated', value: 1 },
  ],
  setter: setWarpVariant
}
```

### Placing Animated Spawn (Single Tile)
```typescript
// In GameObjectSystem.ts, add method
placeAnimatedSpawn(map: MapData, x: number, y: number, team: Team): boolean {
  if (team === Team.NEUTRAL || team < 0 || team > 3) return false;

  // Animation IDs: 0xA3 (green), 0xA4 (red), 0xA5 (blue), 0xA6 (yellow)
  const animId = 0xA3 + team;
  const tile = 0x8000 | animId;  // Encode animated tile

  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  map.tiles[y * MAP_WIDTH + x] = tile;
  map.modified = true;
  return true;
}
```

### Placing Animated Warp (3x3 Block)
```typescript
// In GameObjectData.ts, add pattern
export const ANIMATED_WARP_PATTERN: number[] = [
  0x8000 | 0x9A, 0x8000 | 0x9B, 0x8000 | 0x9C,  // Top row
  0x8000 | 0x9D, 0x8000 | 0x9E, 0x8000 | 0x9F,  // Middle row
  0x8000 | 0xA0, 0x8000 | 0xA1, 0x8000 | 0xA2,  // Bottom row
];

// In GameObjectSystem.ts, add method
placeAnimatedWarp(map: MapData, x: number, y: number): boolean {
  return this.stamp3x3(map, x, y, ANIMATED_WARP_PATTERN);
}
```

### Extending Placement Dispatcher
```typescript
// In documentsSlice.ts, extend placeGameObjectForDocument switch (after line 850)
case ToolType.SPAWN:
  if (gameObjectToolState.spawnVariant === 1) {
    success = gameObjectSystem.placeAnimatedSpawn(doc.map, x, y, selectedTeam);
  } else {
    success = gameObjectSystem.placeSpawn(doc.map, x, y, selectedTeam);
  }
  break;

case ToolType.WARP:
  if (gameObjectToolState.warpVariant === 1) {
    success = gameObjectSystem.placeAnimatedWarp(doc.map, x, y);
  } else {
    success = gameObjectSystem.placeWarp(doc.map, x, y, warpStyle, warpSrc, warpDest);
  }
  break;
```

### GameObjectToolState Extension
```typescript
// In types.ts (after line 143)
export interface GameObjectToolState {
  selectedTeam: Team;
  warpSrc: number;
  warpDest: number;
  warpStyle: number;
  spawnType: number;
  spawnVariant: number;  // 0 = static, 1 = animated
  warpVariant: number;   // 0 = single, 1 = 3x3 animated
  bunkerDir: number;
  bunkerStyle: number;
  holdingPenType: number;
  bridgeDir: number;
  conveyorDir: number;
  switchType: number;
  flagPadType: number;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual frame cycling | Global animationFrame counter | v2.8 | All animations sync'd, no per-tile state |
| Separate spawn tool per team | Team selector dropdown | v3.1 | Cleaner toolbar, follows Flag pattern |
| Hardcoded game object patterns | GameObjectData.ts arrays | v1.0 | Matches SEdit exact tile IDs |

**Deprecated/outdated:**
- None — all patterns are current

## Open Questions

None — all information needed for planning is available.

## Sources

### Primary (HIGH confidence)
- `E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx` - Variant dropdown pattern (Flag tool)
- `E:\NewMapEditor\src\core\map\GameObjectSystem.ts` - Placement functions, stamp3x3 pattern
- `E:\NewMapEditor\src\core\map\AnimationDefinitions.ts` - Animation IDs 0xA3-0xA6 (spawn), 0x9A-0xA2 (warp)
- `E:\NewMapEditor\src\core\map\GameObjectData.ts` - Existing game object tile patterns
- `E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts` - placeGameObject dispatcher pattern
- `E:\NewMapEditor\src\core\map\types.ts` - GameObjectToolState interface
- `E:\NewMapEditor\.planning\REQUIREMENTS.md` - Phase 68 requirements (ASPAWN-01 through AWARP-04)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, uses existing React/TypeScript/Zustand
- Architecture: HIGH - Follows established Flag/Switch variant pattern exactly
- Pitfalls: HIGH - Animation rendering already works, only placement logic needed

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable codebase, no fast-moving dependencies)
