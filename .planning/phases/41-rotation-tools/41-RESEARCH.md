# Phase 41: Rotation Tools - Research

**Researched:** 2026-02-11
**Domain:** 2D array rotation algorithms, tile map selection transforms, TypeScript/Zustand state management
**Confidence:** HIGH

## Summary

Phase 41 implements in-place rotation of selected map tiles with 4 rotation options (90°, -90°, 180°, -180°). This is a geometric transformation on tile coordinates within the map grid, NOT clipboard manipulation. The selection rectangle resizes to fit rotated dimensions (e.g., 3×5 → 5×3 for 90° rotations).

The technical challenges are: (1) rotating a rectangular sub-region of the 256×256 tile array while preserving 16-bit tile values (including animation flags), (2) resizing the selection bounds to accommodate dimension changes, and (3) integrating with the existing delta-based undo system.

**Primary recommendation:** Use transpose+reverse pattern for 90° rotations (high clarity, O(n²) time, O(n²) space for temp buffer). For 180° rotations, use simple reversal (O(n²) time, O(1) space). Both approaches work cleanly with Uint16Array tiles and the existing snapshot-commit undo pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety | Already project standard |
| Zustand | 4.x | State management | Already project standard (GlobalSlice + DocumentsSlice) |
| Uint16Array | Native | Tile storage | Already used for map tiles (16-bit tile values) |

### Supporting
No new libraries needed. This phase uses existing infrastructure:
- Delta-based undo system (Phase 25)
- Selection state in DocumentsSlice (Phase 19)
- Variant dropdown UX pattern (Phase 14-02)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Transpose+reverse | In-place layer rotation | Clearer code vs. minor memory savings (temp buffer ≤256 tiles max) |
| New transform slice | Extend DocumentsSlice | No benefit — transforms are per-document operations |
| Custom undo handling | Use existing delta system | No benefit — delta system already handles tile changes |

**Installation:**
No new dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── editor/
│   │   └── slices/
│   │       └── documentsSlice.ts    # Add rotate actions here
│   └── map/
│       └── SelectionTransforms.ts   # NEW: Rotation algorithms (portable core logic)
└── components/
    └── ToolBar/
        └── ToolBar.tsx               # Add rotate button with variant dropdown
```

**Design principle:** Keep rotation algorithms in `src/core/` for portability to AC app. ToolBar triggers actions, documentsSlice orchestrates, SelectionTransforms.ts contains pure rotation logic.

### Pattern 1: Rotation Algorithm (Transpose + Reverse)

**What:** For 90° clockwise rotation of a width×height sub-region, create new height×width array, transpose source into it, then reverse each row.

**When to use:** 90° and -90° rotations (dimension changes)

**Example:**
```typescript
// 90° Clockwise: transpose then reverse rows
// Source: https://medium.com/swlh/matrix-rotation-in-javascript-269cae14a124
function rotate90Clockwise(
  tiles: Uint16Array,
  width: number,
  height: number
): { tiles: Uint16Array; width: number; height: number } {
  const newWidth = height;
  const newHeight = width;
  const rotated = new Uint16Array(width * height);

  // Transpose: row i, col j → row j, col (width - 1 - i)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstX = y;
      const dstY = width - 1 - x;
      rotated[dstY * newWidth + dstX] = tiles[srcIdx];
    }
  }

  return { tiles: rotated, width: newWidth, height: newHeight };
}
```

**For -90° (counter-clockwise):** Transpose then reverse columns (or reverse rows first, then transpose).

```typescript
// -90° Counter-clockwise: transpose then reverse columns
function rotate90CounterClockwise(
  tiles: Uint16Array,
  width: number,
  height: number
): { tiles: Uint16Array; width: number; height: number } {
  const newWidth = height;
  const newHeight = width;
  const rotated = new Uint16Array(width * height);

  // Transpose: row i, col j → row (height - 1 - j), col i
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstX = height - 1 - y;
      const dstY = x;
      rotated[dstY * newWidth + dstX] = tiles[srcIdx];
    }
  }

  return { tiles: rotated, width: newWidth, height: newHeight };
}
```

### Pattern 2: 180° Rotation (Simple Reversal)

**What:** Reverse order of all tiles in the selection. No dimension change.

**When to use:** 180° and -180° rotations (dimensions stay same)

**Example:**
```typescript
// 180° rotation: reverse all elements
// Source: Standard algorithm pattern
function rotate180(
  tiles: Uint16Array,
  width: number,
  height: number
): { tiles: Uint16Array; width: number; height: number } {
  const rotated = new Uint16Array(tiles.length);

  for (let i = 0; i < tiles.length; i++) {
    rotated[tiles.length - 1 - i] = tiles[i];
  }

  return { tiles: rotated, width, height };
}
```

**Note:** 180° and -180° are mathematically identical, but both are provided for UI symmetry with 90°/-90°.

### Pattern 3: In-Place Rotation on Map with Undo

**What:** Extract selection → rotate → write back to map → update selection bounds → commit undo

**When to use:** All rotation operations on map selections

**Example:**
```typescript
// In documentsSlice.ts
rotateSelectionForDocument: (id, angle: 90 | -90 | 180 | -180) => {
  const doc = get().documents.get(id);
  if (!doc || !doc.map || !doc.selection.active) return;

  const { selection, map } = doc;
  const minX = Math.min(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxX = Math.max(selection.startX, selection.endX);
  const maxY = Math.max(selection.startY, selection.endY);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // 1. Extract selection into temp array
  const extracted = new Uint16Array(width * height);
  let pos = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      extracted[pos++] = map.tiles[y * MAP_WIDTH + x];
    }
  }

  // 2. Rotate extracted tiles
  const rotated = SelectionTransforms.rotate(extracted, width, height, angle);

  // 3. Snapshot for undo (before changes)
  get().pushUndoForDocument(id);

  // 4. Clear original area and write rotated tiles
  // (handle potential bounds overflow by clipping)
  const tiles: Array<{ x: number; y: number; tile: number }> = [];

  // Clear original area
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push({ x, y, tile: DEFAULT_TILE });
    }
  }

  // Write rotated tiles (may extend beyond original bounds)
  let idx = 0;
  for (let dy = 0; dy < rotated.height; dy++) {
    for (let dx = 0; dx < rotated.width; dx++) {
      const mapX = minX + dx;
      const mapY = minY + dy;
      if (mapX < MAP_WIDTH && mapY < MAP_HEIGHT) {
        tiles.push({ x: mapX, y: mapY, tile: rotated.tiles[idx] });
      }
      idx++;
    }
  }

  get().setTilesForDocument(id, tiles);

  // 5. Update selection bounds to new dimensions
  const newSelection = {
    startX: minX,
    startY: minY,
    endX: Math.min(MAP_WIDTH - 1, minX + rotated.width - 1),
    endY: Math.min(MAP_HEIGHT - 1, minY + rotated.height - 1),
    active: true
  };
  get().setSelectionForDocument(id, newSelection);

  // 6. Commit undo
  get().commitUndoForDocument(id, `Rotate ${angle}°`);
}
```

### Pattern 4: Variant Dropdown UI

**What:** Toolbar button with dropdown showing all rotation options (existing pattern from Phase 14-02)

**When to use:** Tools with multiple variants/modes (flags, switches, bunkers, etc.)

**Example (already in codebase):**
```typescript
// In ToolBar.tsx
const variantConfigs: ToolVariantConfig[] = [
  // ... existing configs ...
  {
    tool: ToolType.ROTATE, // NEW
    settingName: 'Angle',
    getCurrentValue: () => 0, // No persistent value, executes on click
    variants: [
      { label: '90° CW', value: 90 },
      { label: '90° CCW', value: -90 },
      { label: '180°', value: 180 },
      { label: '-180°', value: -180 },
    ],
    setter: (angle) => {
      get().rotateSelection(angle); // Immediate action on active document
    }
  },
];
```

**Behavior:** Click variant → execute rotation immediately → close dropdown. No persistent "selected rotation" — it's an action, not a mode.

### Anti-Patterns to Avoid

- **DON'T rotate clipboard:** Phase 43 removes old clipboard transforms. New rotations work on map selections only.
- **DON'T use pixel coordinates for rotation:** Rotate tile indices, not screen positions.
- **DON'T forget dimension swap:** 90° rotations MUST swap width/height.
- **DON'T rotate without selection:** Operations must check `selection.active` and no-op if false.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 2D rotation math | Custom rotation formulas | Transpose+reverse pattern | Well-tested, readable, handles edge cases |
| Undo tracking | Manual before/after snapshots | Existing `pushUndo`/`commitUndo` | Already handles deltas, memory-optimized |
| Variant dropdown UI | New dropdown component | Existing variantConfigs pattern | Consistent UX, keyboard navigation, click-outside close |
| Bounds checking | Manual x/y validation loops | Existing `setTilesForDocument` | Already clips out-of-bounds tiles |

**Key insight:** This phase composes existing patterns (delta undo, variant dropdown, tile batch write) with standard rotation algorithms. No novel infrastructure needed.

## Common Pitfalls

### Pitfall 1: Off-by-One Errors in Dimension Swap

**What goes wrong:** Rotating a 3×5 selection (3 wide, 5 tall) and getting a 3×5 result instead of 5×3.

**Why it happens:** Confusing width/height or startX/endX/startY/endY calculations.

**How to avoid:** Extract width and height first as `width = maxX - minX + 1`, `height = maxY - minY + 1`. After 90° rotation, `newWidth = height`, `newHeight = width`. Test with non-square selections (e.g., 2×5, 3×7).

**Warning signs:** Selection marquee doesn't resize after rotation, or rotated tiles appear cut off.

### Pitfall 2: Animation Flag Loss During Rotation

**What goes wrong:** Tiles with animation flags (bit 15 set) lose their animated state after rotation.

**Why it happens:** Using wrong data type or bitwise operations that strip flags.

**How to avoid:** Use `Uint16Array` everywhere (preserves full 16-bit values including animation flags). Never use `Array<number>` or `number[]` for tiles. Verify with `console.assert(tile & 0x8000)` on known animated tiles before/after rotation.

**Warning signs:** Animated tiles become static after rotation.

### Pitfall 3: Selection Origin Shift

**What goes wrong:** After rotation, selection jumps to a different map position instead of rotating in-place.

**Why it happens:** Not preserving `minX`, `minY` as top-left anchor point during rotation.

**How to avoid:** Extract selection using `minX/minY` as base, rotate the extracted array, write rotated result back starting at same `minX/minY` position. The selection grows/shrinks around its top-left corner.

**Warning signs:** User rotates a selection at (100, 50) and it appears at (0, 0) or random location.

### Pitfall 4: Map Bounds Overflow

**What goes wrong:** Rotating a 10×200 selection near right edge causes crash or corruption when result becomes 200×10.

**Why it happens:** Not checking if rotated dimensions fit within map boundaries.

**How to avoid:** Use existing `setTilesForDocument` which silently clips out-of-bounds tiles (lines 580-583 in documentsSlice.ts). Update selection bounds with `Math.min(MAP_WIDTH - 1, ...)` to clamp to map edges.

**Warning signs:** Rotation near map edges causes tiles to disappear or selection extends beyond visible map.

### Pitfall 5: Disabled State for No Selection

**What goes wrong:** User clicks rotate button with no active selection → operation no-ops silently OR rotates wrong thing.

**Why it happens:** Forgot to check `selection.active` before executing.

**How to avoid:** In variant setter, `if (!selection.active) return;` as first line. In UI layer, disable rotate button when no selection (similar to copy/paste buttons).

**Warning signs:** Rotate button clickable when nothing is selected, or rotates last clipboard data instead of map selection.

## Code Examples

Verified patterns from existing codebase:

### Selection Bounds Calculation (Existing Pattern)
```typescript
// Source: documentsSlice.ts lines 448-451
const minX = Math.min(doc.selection.startX, doc.selection.endX);
const minY = Math.min(doc.selection.startY, doc.selection.endY);
const maxX = Math.max(doc.selection.startX, doc.selection.endX);
const maxY = Math.max(doc.selection.startY, doc.selection.endY);
const width = maxX - minX + 1;
const height = maxY - minY + 1;
```

### Extract Selection to Temp Array (Existing Pattern)
```typescript
// Source: documentsSlice.ts lines 453-463
const tiles = new Uint16Array(width * height);
let pos = 0;
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    tiles[pos++] = doc.map.tiles[y * MAP_WIDTH + x];
  }
}
```

### Delta-Based Undo (Existing Pattern)
```typescript
// Source: documentsSlice.ts lines 476, 489-490
get().pushUndoForDocument(id); // Snapshot before changes

// ... make tile changes via setTilesForDocument ...

get().commitUndoForDocument(id, 'Rotate 90°'); // Commit with description
```

### Batch Tile Write with Bounds Clipping (Existing Pattern)
```typescript
// Source: documentsSlice.ts lines 574-585
const tiles: Array<{ x: number; y: number; tile: number }> = [];
for (let dy = 0; dy < clipboard.height; dy++) {
  for (let dx = 0; dx < clipboard.width; dx++) {
    const mapX = x + dx;
    const mapY = y + dy;

    // Silently discard out-of-bounds tiles
    if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
      tiles.push({ x: mapX, y: mapY, tile: clipboard.tiles[dy * clipboard.width + dx] });
    }
  }
}
get().setTilesForDocument(id, tiles);
```

### Variant Dropdown Config (Existing Pattern)
```typescript
// Source: ToolBar.tsx lines 128-206
const variantConfigs: ToolVariantConfig[] = [
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
  },
  // ... more configs
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clipboard-based transforms (Ctrl+R) | Selection-based in-place transforms | Phase 41-43 (v2.5) | User rotates what they see on the map, not invisible clipboard data |
| Global state for map/selection | Document-based state (MDI) | Phase 33 (v2.1) | Rotations work per-document, not globally |
| Full map snapshots for undo | Delta-based undo | Phase 25 (v1.7) | Rotating 5×5 selection creates ~25 deltas, not 65KB snapshot |
| Manual keyboard shortcuts | Variant dropdown UI | Phase 14-02 (v1.5) | Discoverable UI, no memorizing Ctrl+combos |

**Deprecated/outdated:**
- `mirrorClipboardHorizontal()` / `mirrorClipboardVertical()` / `rotateClipboard()` in globalSlice.ts — will be removed in Phase 43
- Ctrl+H / Ctrl+J / Ctrl+R keyboard shortcuts for clipboard transforms — will be removed in Phase 43

## Open Questions

1. **Should rotation be disabled during paste mode?**
   - What we know: Paste mode (`isPasting: true`) has its own preview overlay
   - What's unclear: Can user rotate while in paste mode? Should it cancel paste?
   - Recommendation: Disable rotate button when `isPasting === true`, similar to other edit operations. Keep UX simple: one mode at a time.

2. **What happens when rotated selection extends beyond map bounds?**
   - What we know: Existing `setTilesForDocument` clips out-of-bounds tiles
   - What's unclear: Should selection bounds also be clipped, or extend beyond visible area?
   - Recommendation: Clip selection bounds to map boundaries (use `Math.min(MAP_WIDTH-1, ...)`) so marching ants don't draw outside map. Matches paste behavior.

3. **Should rotation preserve selection direction (startX/Y vs endX/Y)?**
   - What we know: Selection has `startX/Y` (drag start) and `endX/Y` (drag end), normalized via min/max
   - What's unclear: After rotation, should new selection maintain original drag direction?
   - Recommendation: Always set `start = topLeft, end = bottomRight` after rotation. Drag direction is irrelevant after transform.

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns (documentsSlice.ts, ToolBar.tsx, globalSlice.ts) — verified by direct inspection
- Project CLAUDE.md, MEMORY.md, REQUIREMENTS.md — design decisions and architecture
- [2-Dimensional Matrix Rotation in JavaScript | Medium](https://medium.com/swlh/matrix-rotation-in-javascript-269cae14a124) — transpose+reverse algorithm
- [JavaScript Program to Inplace rotate square matrix by 90 degrees | GeeksforGeeks](https://www.geeksforgeeks.org/javascript-program-to-inplace-rotate-square-matrix-by-90-degrees-set-1/) — in-place rotation algorithm

### Secondary (MEDIUM confidence)
- [GitHub - tinwatchman/2d-array-rotation](https://github.com/tinwatchman/2d-array-rotation) — library design patterns for rectangular arrays
- [How to Rotate a Two-Dimensional Array | Baeldung](https://www.baeldung.com/cs/rotate-2d-matrix) — algorithm complexity analysis
- [Rotate a 2D Array or Matrix - Complete Tutorial | GeeksforGeeks](https://www.geeksforgeeks.org/dsa/complete-guide-on-2d-array-matrix-rotations/) — comprehensive rotation techniques

### Tertiary (LOW confidence)
- WebSearch results for "TypeScript Uint16Array rotate" — general JavaScript patterns, not TypeScript-specific with typed arrays
- npm package `2d-array-rotation` — library exists but implementation not inspected

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, uses existing Zustand + TypeScript
- Architecture: HIGH — verified by inspecting existing code patterns (delta undo, variant dropdown, selection bounds)
- Pitfalls: MEDIUM — inferred from common rotation bugs + existing codebase patterns, not battle-tested in this specific codebase yet

**Research date:** 2026-02-11
**Valid until:** ~30 days (stable domain — 2D rotation algorithms don't change, existing codebase patterns are locked)
