# Phase 74: Multi-Tile Previews - Research

**Researched:** 2026-02-16
**Domain:** Canvas rendering, semi-transparent tile preview patterns for multi-tile game objects
**Confidence:** HIGH

## Summary

This phase extends the existing conveyor preview pattern (live semi-transparent tile rendering during drag) to other multi-tile game object tools: animated warp (3x3 block), bunker (4x4+ pattern), and bridge (strip pattern). The implementation is straightforward because the codebase already has a complete reference implementation in the conveyor preview (MapCanvas.tsx lines 458-537) that shows how to render tile patterns with `ctx.globalAlpha = 0.7` during rect drag operations.

The key technical elements are: (1) tile pattern generation logic from GameObjectData (ANIMATED_WARP_PATTERN, BUNKER_DATA, bridgeLrData/bridgeUdData), (2) animated tile rendering using ANIMATION_DEFINITIONS and the global animationFrame counter, (3) drawing at cursor position for hover previews (warp 3x3 on single-tile hover) vs during rect drag (bunker/bridge), and (4) proper bounds checking to avoid out-of-viewport rendering.

**Primary recommendation:** Extract the conveyor preview rendering logic into a reusable helper function, then apply the same pattern to warp (hover preview centered on cursor), bunker (rect drag preview), and bridge (rect drag preview). All necessary tile data and rendering infrastructure already exists.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas API | Native | 2D tile rendering with alpha blending | Direct control, existing pattern throughout MapCanvas |
| TypeScript | 5.x | Type safety for tile data structures | Project standard |
| React 18 | 18.x | UI component lifecycle for ref-based rendering | Existing MapCanvas pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 4.x | State management for animationFrame counter | Already used for animation tick subscription |

**Installation:**
No new dependencies required — all functionality uses existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/MapCanvas/
│   └── MapCanvas.tsx           # Add preview rendering for warp/bunker/bridge
├── core/map/
│   ├── GameObjectData.ts       # ANIMATED_WARP_PATTERN, BUNKER_DATA (already exist)
│   └── AnimationDefinitions.ts # Animation frame sequences (already exist)
└── core/editor/slices/
    └── globalSlice.ts          # animationFrame counter (already exists)
```

### Pattern 1: Semi-Transparent Tile Preview (CONVEYOR - Existing Reference)
**What:** Render tile pattern at 70% opacity during drag/hover using exact placement algorithm
**When to use:** Any multi-tile game object tool that shows what will be placed before commit
**Example:**
```typescript
// Source: MapCanvas.tsx lines 458-537 (conveyor preview)
// Live tile preview for CONVEYOR tool
if (currentTool === ToolType.CONVEYOR && tilesetImage && w >= 1 && h >= 1) {
  const data = /* get tile data based on direction */;
  if (data) {
    ctx.globalAlpha = 0.7;  // Semi-transparent

    for (let k = 0; k < h; k++) {
      for (let hh = 0; hh < w; hh++) {
        let tile: number | undefined;
        // Exact same logic as GameObjectSystem.placeConveyor()
        if (placementDir === 1) {
          if (w > 1 && w % 2 !== 0 && hh === w - 1) continue;
          if (k === 0)
            tile = data[hh % 2];
          // ... (exact SEdit algorithm)
        }

        if (tile !== undefined) {
          const screenX = Math.floor((minX + hh - vp.x) * tilePixels);
          const screenY = Math.floor((minY + k - vp.y) * tilePixels);

          const isAnim = (tile & 0x8000) !== 0;
          if (isAnim && tilesetImage) {
            const animId = tile & 0xFF;
            const frameOffset = (tile >> 8) & 0x7F;
            const anim = ANIMATION_DEFINITIONS[animId];
            if (anim && anim.frames.length > 0) {
              const frameIdx = (animFrameRef.current + frameOffset) % anim.frameCount;
              const displayTile = anim.frames[frameIdx] || 0;
              // Draw animated frame
              ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
                screenX, screenY, tilePixels, tilePixels);
            }
          } else if (tilesetImage) {
            // Draw static tile
            ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, tilePixels, tilePixels);
          }
        }
      }
    }

    ctx.globalAlpha = 1.0;  // Reset alpha
  }
}
```

### Pattern 2: Hover Preview for Single-Click Tools (WARP - New)
**What:** Show 3x3 preview centered on cursor position when hovering (before click)
**When to use:** Multi-tile tools that use single click placement (animated warp with variant=1)
**Example:**
```typescript
// Warp hover preview (animated warp variant only)
if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 &&
    currentTool === ToolType.WARP && gameObjectToolState.warpVariant === 1) {
  const cx = cursorTileRef.current.x;
  const cy = cursorTileRef.current.y;
  const topLeftX = cx - 1;
  const topLeftY = cy - 1;

  ctx.globalAlpha = 0.7;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const tile = ANIMATED_WARP_PATTERN[row * 3 + col];
      const mapX = topLeftX + col;
      const mapY = topLeftY + row;

      // Render tile at (mapX, mapY) with animation support
      // (same rendering logic as conveyor)
    }
  }

  ctx.globalAlpha = 1.0;
}
```

### Pattern 3: Rect Drag Preview (BUNKER/BRIDGE - Extends Existing)
**What:** Render full pattern during rect drag using exact placement algorithm
**When to use:** Drag-to-rectangle game object tools (bunker, bridge, holding pen)
**Example:**
```typescript
// Bunker preview during rect drag
if (rectDragRef.current.active && currentTool === ToolType.BUNKER && w >= 2 && h >= 2) {
  const j = bunkerStyle * 4 + bunkerDir;
  if (j >= 0 && j < BUNKER_DATA.length) {
    const pattern = BUNKER_DATA[j];

    ctx.globalAlpha = 0.7;

    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        let tile: number;
        // Exact same logic as GameObjectSystem.placeBunker()
        if (row === 0 && col === 0)
          tile = pattern[0];
        else if (row === 0 && col === w - 1)
          tile = pattern[3];
        // ... (exact SEdit algorithm)

        if (tile > -1) {
          // Render tile at (minX + col, minY + row)
        }
      }
    }

    ctx.globalAlpha = 1.0;
  }
}
```

### Pattern 4: Animation Frame Synchronization (Existing)
**What:** Use global animationFrame counter for all animated tile previews
**When to use:** Any preview rendering that includes animated tiles
**Example:**
```typescript
// From MapCanvas.tsx - animationFrame subscription
const { animationFrame } = useEditorStore(
  useShallow((state) => ({ animationFrame: state.animationFrame }))
);
const animFrameRef = useRef(animationFrame);

// In drawUiLayer():
const anim = ANIMATION_DEFINITIONS[animId];
if (anim && anim.frames.length > 0) {
  const frameIdx = (animFrameRef.current + frameOffset) % anim.frameCount;
  const displayTile = anim.frames[frameIdx] || 0;
  // Draw displayTile from tileset
}
```

### Anti-Patterns to Avoid
- **Rendering outside viewport:** Always calculate screenX/screenY and check bounds before drawing
- **Different logic than placement:** Preview MUST use exact same pattern logic as GameObjectSystem placement methods to avoid misleading users
- **Forgetting to reset alpha:** Always restore `ctx.globalAlpha = 1.0` after preview rendering
- **Static frame rendering:** Animated tiles must use animationFrame counter, not static first frame

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile pattern generation | Custom 3x3/4x4 algorithms | GameObjectData arrays + placement logic | Exact SEdit compatibility, already tested |
| Animation frame lookup | Frame calculation | ANIMATION_DEFINITIONS[animId].frames | Extracted from Gfx.dll, complete data |
| Screen coordinate conversion | Manual viewport math | tileToScreen() helper (if exists) or viewport formula | Consistent zoom/pan handling |
| Alpha blending | Manual pixel manipulation | ctx.globalAlpha = 0.7 | Native Canvas API, hardware accelerated |

**Key insight:** The conveyor preview is a complete reference implementation. All other previews are the same pattern with different tile data sources and trigger conditions (hover vs rect drag).

## Common Pitfalls

### Pitfall 1: Preview Logic Drift from Placement Logic
**What goes wrong:** Preview shows different pattern than what actually gets placed
**Why it happens:** Copying placement logic into preview, then making edits in only one place
**How to avoid:** Use identical pattern generation logic. Consider extracting shared logic into helper functions (e.g., `getConveyorTile(row, col, width, height, direction, data)`)
**Warning signs:** User reports "preview doesn't match placement", off-by-one errors in pattern

### Pitfall 2: Animated Warp Offset Encoding
**What goes wrong:** Warp center tile (0x9E) preview uses wrong offset value
**Why it happens:** Phase 73 added animation offset support, warp routing uses offset for dest/src
**How to avoid:** ANIMATED_WARP_PATTERN tiles should use `makeAnimatedTile(animId, offset)` where offset is either 0 (border tiles) or routing offset (center 0x9E tile). Preview must read current warpSrc/warpDest from gameObjectToolState.
**Warning signs:** Warp preview shows wrong animation frame, routing data not visible in preview

### Pitfall 3: Performance with Large Rect Drags
**What goes wrong:** UI becomes sluggish when dragging large bunker/bridge rectangles
**Why it happens:** Rendering hundreds of tiles every mousemove with animation lookups
**How to avoid:** (1) Already RAF-debounced via requestUiRedraw(), (2) Conveyor already handles this fine — bunker/bridge are same complexity. No special optimization needed for this phase.
**Warning signs:** Frame drops during drag, but conveyor drag doesn't have this issue

### Pitfall 4: Forgetting Animated Tile Rendering
**What goes wrong:** Preview shows static tile IDs instead of animated frames
**Why it happens:** Copying static tile rendering code without the `(tile & 0x8000)` check
**How to avoid:** Always check `isAnim = (tile & 0x8000) !== 0` and use ANIMATION_DEFINITIONS for animated tiles
**Warning signs:** Warp preview shows solid color (#4a4a6a fallback), no animation cycles

## Code Examples

Verified patterns from the codebase:

### Conveyor Preview Reference (Complete Implementation)
```typescript
// Source: MapCanvas.tsx lines 458-537
// This is the REFERENCE IMPLEMENTATION for all multi-tile previews
if (currentTool === ToolType.CONVEYOR && tilesetImage && w >= 1 && h >= 1) {
  const convDir = gameObjectToolState.conveyorDir;
  let placementDir: number;
  let data: number[] | null = null;

  // Get direction-specific tile data
  switch (convDir) {
    case 0: // Left
      placementDir = 0;
      if (convLrData.length > 0 && convLrData[0][0] !== 0) data = convLrData[0];
      break;
    case 1: // Right
      placementDir = 0;
      data = CONV_RIGHT_DATA;
      break;
    // ... (other directions)
  }

  if (data) {
    ctx.globalAlpha = 0.7;

    for (let k = 0; k < h; k++) {
      for (let hh = 0; hh < w; hh++) {
        let tile: number | undefined;

        // EXACT SAME LOGIC as GameObjectSystem.placeConveyor()
        if (placementDir === 1) {
          if (w > 1 && w % 2 !== 0 && hh === w - 1) continue;
          if (k === 0)
            tile = data[hh % 2];
          else if (k === h - 1)
            tile = data[hh % 2 + 6];
          else
            tile = data[(k % 2 + 1) * 2 + hh % 2];
        } else {
          if (h > 1 && h % 2 !== 0 && k === h - 1) continue;
          if (hh === 0)
            tile = data[(k % 2) * 4];
          else if (hh === w - 1)
            tile = data[(k % 2) * 4 + 3];
          else
            tile = data[1 + (k % 2) * 4 + hh % 2];
        }

        if (tile !== undefined) {
          const screenX = Math.floor((minX + hh - vp.x) * tilePixels);
          const screenY = Math.floor((minY + k - vp.y) * tilePixels);

          const isAnim = (tile & 0x8000) !== 0;
          if (isAnim && tilesetImage) {
            const animId = tile & 0xFF;
            const frameOffset = (tile >> 8) & 0x7F;
            const anim = ANIMATION_DEFINITIONS[animId];
            if (anim && anim.frames.length > 0) {
              const frameIdx = (animFrameRef.current + frameOffset) % anim.frameCount;
              const displayTile = anim.frames[frameIdx] || 0;
              const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
              const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
              ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
                screenX, screenY, tilePixels, tilePixels);
            }
          } else if (tilesetImage) {
            const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
            const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
            ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, tilePixels, tilePixels);
          }
        }
      }
    }

    ctx.globalAlpha = 1.0;
  }
}
```

### Paste Preview Reference (Similar Pattern)
```typescript
// Source: MapCanvas.tsx lines 335-377
// Shows same semi-transparent tile rendering with animation support
if (isPasting && clipboard && pastePreviewRef.current && tilesetImage) {
  const previewX = pastePreviewRef.current.x;
  const previewY = pastePreviewRef.current.y;

  ctx.globalAlpha = 0.7;  // Same opacity as conveyor

  for (let dy = 0; dy < clipboard.height; dy++) {
    for (let dx = 0; dx < clipboard.width; dx++) {
      const mapX = previewX + dx;
      const mapY = previewY + dy;

      if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) continue;

      const tile = clipboard.tiles[dy * clipboard.width + dx];
      // ... (same animated tile rendering as conveyor)
    }
  }

  ctx.globalAlpha = 1.0;
}
```

### Existing Stamp Tool Cursor Preview
```typescript
// Source: MapCanvas.tsx lines 413-428
// Shows 3x3 outline for flag/spawn tools, but NO tile preview
const stampTools = new Set([ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH]);
if (cursorTileRef.current.x >= 0 && cursorTileRef.current.y >= 0 && stampTools.has(currentTool)) {
  const cx = cursorTileRef.current.x;
  const cy = cursorTileRef.current.y;
  const valid = cx - 1 >= 0 && cx + 1 < MAP_WIDTH && cy - 1 >= 0 && cy + 1 < MAP_HEIGHT;
  const screen = tileToScreen(cx - 1, cy - 1, overrideViewport);

  ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(screen.x + 1, screen.y + 1, 3 * tilePixels - 2, 3 * tilePixels - 2);

  // Currently only shows outline, Phase 74 adds tile preview inside
}
```

### Animated Warp Pattern Data
```typescript
// Source: GameObjectData.ts lines 85-91
// Animation IDs 0x9A-0xA2 for BigWarp TL/TM/TR/ML/MM/MR/BL/BM/BR
export const ANIMATED_WARP_PATTERN: number[] = [
  0x8000 | 0x9A, 0x8000 | 0x9B, 0x8000 | 0x9C,  // Top row
  0x8000 | 0x9D, 0x8000 | 0x9E, 0x8000 | 0x9F,  // Middle row (0x9E = center)
  0x8000 | 0xA0, 0x8000 | 0xA1, 0x8000 | 0xA2,  // Bottom row
];

// Warp placement with routing (Phase 72/73)
// Center tile uses makeAnimatedTile(0x9E, dest * 10 + src)
// Border tiles use makeAnimatedTile(animId, 0) — no offset
```

### Bunker Pattern Data
```typescript
// Source: GameObjectData.ts lines 40-60
// 8 types (2 styles x 4 directions), 16 tiles each
// Index = style * 4 + direction (0=N, 1=E, 2=S, 3=W)
export const BUNKER_DATA: number[][] = [
  // Style 0 (Standard), Dir N
  [301, 302, 302, 303, 341, 337, 338, 343, 341, 377, 378, 343, 381, 417, 418, 383],
  // ... (7 more patterns)
];

// Used in GameObjectSystem.placeBunker() lines 165-212
// Pattern: [TL, TM1, TM2, TR, ML, fill1, fill2, MR, ...]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No multi-tile previews | Conveyor shows live preview | Phase 15 (v1.5) | Users see exact placement before commit |
| Static tile rendering | Animation-aware rendering | Phase 68 (v3.2) | Previews animate in sync with placed tiles |
| Outline-only previews | Semi-transparent tile rendering | Phase 15 | Professional visual feedback |

**Deprecated/outdated:**
- Outline-only previews for multi-tile tools — conveyor/paste now show actual tiles at 70% opacity

## Open Questions

None — all information needed for planning is available.

## Sources

### Primary (HIGH confidence)
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` - Conveyor preview implementation (lines 458-537), paste preview (lines 335-377), stamp tool outlines (lines 413-428)
- `E:\NewMapEditor\src\core\map\GameObjectData.ts` - ANIMATED_WARP_PATTERN (lines 85-91), BUNKER_DATA (lines 40-60), bridgeLrData/bridgeUdData (lines 130-131)
- `E:\NewMapEditor\src\core\map\GameObjectSystem.ts` - placeBunker() (lines 165-212), placeBridge() (lines 270-360), placeAnimatedWarp() (lines 133-150)
- `E:\NewMapEditor\src\core\map\AnimationDefinitions.ts` - Frame sequences for 0x9A-0xA2 (warp), all animation IDs
- `E:\NewMapEditor\.planning\phases\15-conveyor-tool\15-RESEARCH.md` - Original conveyor preview design patterns
- `E:\NewMapEditor\.planning\phases\68-animated-game-objects\68-RESEARCH.md` - Animated tile rendering patterns
- `E:\NewMapEditor\.planning\REQUIREMENTS.md` - Phase 74 requirements (PREV-01 through PREV-04)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing Canvas API patterns, no new dependencies
- Architecture: HIGH - Complete reference implementation exists (conveyor preview)
- Pitfalls: HIGH - Known issues from conveyor implementation, animation offset integration

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable codebase, no fast-moving dependencies)
