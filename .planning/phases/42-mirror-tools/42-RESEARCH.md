# Phase 42: Mirror Tools - Research

**Researched:** 2026-02-11
**Domain:** 2D array mirroring algorithms, adjacent copy placement, tile map selection transforms, TypeScript/Zustand state management
**Confidence:** HIGH

## Summary

Phase 42 implements adjacent mirroring of selected map tiles with 4 directional options (Right, Left, Up, Down). This is a COPY operation, NOT an in-place flip. The original selection remains intact, and a mirrored duplicate is placed adjacent to it in the specified direction.

The technical challenges are: (1) mirroring a rectangular sub-region while preserving 16-bit tile values (including animation flags), (2) calculating the correct adjacent placement coordinates for each direction, (3) handling map bounds clipping when mirrored copy extends beyond map edges, and (4) updating selection bounds to encompass BOTH the original and mirrored copy.

**Primary recommendation:** Reuse existing mirror algorithms from Phase 19's clipboard transforms (already implemented as `mirrorClipboardHorizontal` and `mirrorClipboardVertical`), but adapt them for adjacent placement instead of in-place transformation. Follow the same in-place rotation pattern from Phase 41 (extract → transform → write → update bounds → commit undo) with modifications for copy placement.

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
- Variant dropdown UX pattern (Phase 14-02, Phase 41)
- SelectionTransforms module pattern (Phase 41)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extend SelectionTransforms.ts | Create new MirrorTransforms.ts | No benefit — rotation and mirroring are related operations, keep together |
| New mirror slice | Extend DocumentsSlice | No benefit — mirrors are per-document operations |
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
│   │       └── documentsSlice.ts    # Add mirrorSelectionForDocument action
│   └── map/
│       ├── SelectionTransforms.ts   # Add mirrorHorizontal, mirrorVertical, mirrorRight, mirrorLeft, etc.
│       └── types.ts                 # Add MIRROR to ToolType enum
└── components/
    └── ToolBar/
        └── ToolBar.tsx               # Add mirror button with variant dropdown
```

**Design principle:** Keep mirror algorithms in `src/core/map/SelectionTransforms.ts` alongside rotation algorithms for portability to AC app. ToolBar triggers actions, documentsSlice orchestrates, SelectionTransforms contains pure mirror logic.

### Pattern 1: Horizontal Mirror Algorithm

**What:** For horizontal mirroring (flip left-to-right), reverse each row independently. Dimensions unchanged.

**When to use:** Internal transformation before adjacent placement

**Example:**
```typescript
// Horizontal mirror: reverse each row independently
// Source: Existing mirrorClipboardHorizontal from globalSlice.ts
function mirrorHorizontal(
  tiles: Uint16Array,
  width: number,
  height: number
): { tiles: Uint16Array; width: number; height: number } {
  const mirrored = new Uint16Array(width * height);

  // Reverse each row
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstIdx = y * width + (width - 1 - x);
      mirrored[dstIdx] = tiles[srcIdx];
    }
  }

  return { tiles: mirrored, width, height };
}
```

**Example visualization:**
```
[1 2 3]     [3 2 1]
[4 5 6] --> [6 5 4]
[7 8 9]     [9 8 7]
```

### Pattern 2: Vertical Mirror Algorithm

**What:** For vertical mirroring (flip top-to-bottom), reverse row order. Dimensions unchanged.

**When to use:** Internal transformation before adjacent placement

**Example:**
```typescript
// Vertical mirror: reverse row order
// Source: Existing mirrorClipboardVertical from globalSlice.ts
function mirrorVertical(
  tiles: Uint16Array,
  width: number,
  height: number
): { tiles: Uint16Array; width: number; height: number } {
  const mirrored = new Uint16Array(width * height);

  // Reverse rows
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      const dstIdx = (height - 1 - y) * width + x;
      mirrored[dstIdx] = tiles[srcIdx];
    }
  }

  return { tiles: mirrored, width, height };
}
```

**Example visualization:**
```
[1 2 3]     [7 8 9]
[4 5 6] --> [4 5 6]
[7 8 9]     [1 2 3]
```

### Pattern 3: Adjacent Copy Placement

**What:** Extract selection → mirror it → write mirrored copy adjacent to original → update selection to encompass both areas

**When to use:** All 4 mirror directions (Right, Left, Up, Down)

**Adjacent placement coordinates by direction:**
- **Mirror Right:** mirrored copy starts at (minX + width, minY) — immediately to the right
- **Mirror Left:** mirrored copy starts at (minX - width, minY) — immediately to the left
- **Mirror Up:** mirrored copy starts at (minX, minY - height) — immediately above
- **Mirror Down:** mirrored copy starts at (minX, minY + height) — immediately below

**Example:**
```typescript
// In documentsSlice.ts
mirrorSelectionForDocument: (id, direction: 'right' | 'left' | 'up' | 'down') => {
  const doc = get().documents.get(id);
  if (!doc || !doc.map || !doc.selection.active || doc.isPasting) return;

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

  // 2. Mirror extracted tiles
  const mirrored = SelectionTransforms.mirror(extracted, width, height, direction);

  // 3. Calculate adjacent placement position
  let copyX = minX;
  let copyY = minY;
  switch (direction) {
    case 'right':
      copyX = minX + width;
      break;
    case 'left':
      copyX = minX - width;
      break;
    case 'up':
      copyY = minY - height;
      break;
    case 'down':
      copyY = minY + height;
      break;
  }

  // 4. Snapshot for undo (before changes)
  get().pushUndoForDocument(id);

  // 5. Write mirrored copy to adjacent position (clip out-of-bounds)
  const tiles: Array<{ x: number; y: number; tile: number }> = [];
  let idx = 0;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const mapX = copyX + dx;
      const mapY = copyY + dy;
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        tiles.push({ x: mapX, y: mapY, tile: mirrored.tiles[idx] });
      }
      idx++;
    }
  }

  get().setTilesForDocument(id, tiles);

  // 6. Update selection to encompass BOTH original and mirrored copy
  const newMinX = Math.max(0, Math.min(minX, copyX));
  const newMinY = Math.max(0, Math.min(minY, copyY));
  const newMaxX = Math.min(MAP_WIDTH - 1, Math.max(maxX, copyX + width - 1));
  const newMaxY = Math.min(MAP_HEIGHT - 1, Math.max(maxY, copyY + height - 1));

  get().setSelectionForDocument(id, {
    startX: newMinX,
    startY: newMinY,
    endX: newMaxX,
    endY: newMaxY,
    active: true
  });

  // 7. Commit undo
  get().commitUndoForDocument(id, `Mirror ${direction}`);
}
```

**Key differences from rotation:**
- **NO clearing of original area** — original tiles remain intact
- **Write to DIFFERENT coordinates** — adjacent position, not in-place
- **Selection expands** — encompasses both original and copy (2× width for left/right, 2× height for up/down)

### Pattern 4: Variant Dropdown UI (Reuse from Phase 41)

**What:** Toolbar button with dropdown showing all mirror directions (existing pattern from Phase 14-02, Phase 41)

**When to use:** Tools with multiple variants/modes

**Example (adapted from Phase 41 rotate variant):**
```typescript
// In ToolBar.tsx
const variantConfigs: ToolVariantConfig[] = [
  // ... existing configs ...
  {
    tool: ToolType.MIRROR,
    settingName: 'Direction',
    getCurrentValue: () => 0, // No persistent value, executes on click
    variants: [
      { label: 'Right', value: 0 },
      { label: 'Left', value: 1 },
      { label: 'Up', value: 2 },
      { label: 'Down', value: 3 },
    ],
    setter: (dirIndex) => {
      const directions = ['right', 'left', 'up', 'down'] as const;
      const activeDocId = useEditorStore.getState().activeDocumentId;
      if (!activeDocId) return;
      const doc = useEditorStore.getState().documents.get(activeDocId);
      if (!doc || !doc.selection.active || doc.isPasting) return;
      useEditorStore.getState().mirrorSelectionForDocument(activeDocId, directions[dirIndex]);
    }
  },
];
```

**Behavior:** Click variant → execute mirror immediately → close dropdown. No persistent "selected direction" — it's an action, not a mode.

### Pattern 5: Direction Type Safety

**What:** Use TypeScript union types for mirror directions instead of magic numbers

**When to use:** All mirror-related type definitions

**Example:**
```typescript
// In SelectionTransforms.ts or types.ts
export type MirrorDirection = 'right' | 'left' | 'up' | 'down';

export function mirror(
  tiles: Uint16Array,
  width: number,
  height: number,
  direction: MirrorDirection
): { tiles: Uint16Array; width: number; height: number } {
  switch (direction) {
    case 'right':
    case 'left':
      return mirrorHorizontal(tiles, width, height);
    case 'up':
    case 'down':
      return mirrorVertical(tiles, width, height);
  }
}
```

**Note:** Right/Left both use horizontal mirror (flip left-to-right), Up/Down both use vertical mirror (flip top-to-bottom). The difference is in the PLACEMENT coordinates, not the mirror algorithm.

### Anti-Patterns to Avoid

- **DON'T mirror in-place:** This is a COPY operation. Original selection stays untouched.
- **DON'T update selection to only cover mirrored copy:** Selection should encompass BOTH original and copy (expanded bounds).
- **DON'T forget bounds clipping:** Mirror left/up can place copy at negative coordinates — clip to map bounds.
- **DON'T mirror clipboard:** Phase 43 removes old clipboard transforms. New mirrors work on map selections only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mirror algorithms | Custom flip formulas | Existing mirrorClipboardHorizontal/Vertical patterns | Already tested, handles edge cases |
| Adjacent coordinate math | Manual offset calculations | Simple `minX ± width`, `minY ± height` | Clear, readable, less error-prone |
| Undo tracking | Manual before/after snapshots | Existing `pushUndo`/`commitUndo` | Already handles deltas, memory-optimized |
| Variant dropdown UI | New dropdown component | Existing variantConfigs pattern | Consistent UX, keyboard navigation, click-outside close |
| Bounds checking | Manual x/y validation loops | Existing `setTilesForDocument` | Already clips out-of-bounds tiles |

**Key insight:** This phase reuses mirror algorithms from Phase 19 (globalSlice clipboard transforms) but adapts them for adjacent placement. The undo, UI, and bounds handling all reuse existing patterns from Phase 41.

## Common Pitfalls

### Pitfall 1: In-Place Mirror Instead of Adjacent Copy

**What goes wrong:** Mirroring overwrites the original selection instead of creating an adjacent copy.

**Why it happens:** Reusing rotation code pattern without adapting for copy semantics.

**How to avoid:** DO NOT clear original area before writing mirrored tiles. Write mirrored tiles to DIFFERENT coordinates (adjacent position). Verify with visual test: after mirror right, selection [1 2 3] should show [1 2 3][3 2 1] on the map.

**Warning signs:** Original tiles disappear after mirror, or selection moves to a new position.

### Pitfall 2: Selection Doesn't Expand After Mirror

**What goes wrong:** After mirroring, selection marquee only shows original area or only the mirrored copy.

**Why it happens:** Forgot to update selection bounds to encompass both areas.

**How to avoid:** Calculate new selection bounds using `Math.min(minX, copyX)` for start and `Math.max(maxX, copyX + width - 1)` for end. Test: after mirror right, selection should be twice as wide (original + copy).

**Warning signs:** Marching ants selection rectangle doesn't cover both original and mirrored copy.

### Pitfall 3: Negative Coordinate Crash

**What goes wrong:** Mirroring left/up near top-left edge causes negative coordinates, leading to crashes or corruption.

**Why it happens:** Adjacent placement calculation produces negative X or Y values (e.g., mirror left from x=5 with width=10 → copyX=-5).

**How to avoid:** Use existing `setTilesForDocument` which silently clips out-of-bounds tiles with `if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT)` check. When updating selection bounds, clamp with `Math.max(0, ...)` and `Math.min(MAP_WIDTH-1, ...)`.

**Warning signs:** Mirror left/up near map edges causes errors, or tiles appear corrupted.

### Pitfall 4: Wrong Mirror Direction

**What goes wrong:** Mirror right produces left mirror, or mirror up produces down mirror.

**Why it happens:** Confusing mirror algorithm (horizontal vs vertical) with placement direction (right vs left).

**How to avoid:**
- **Right/Left directions:** both use `mirrorHorizontal` (flip left-to-right), placement differs (right: +width, left: -width)
- **Up/Down directions:** both use `mirrorVertical` (flip top-to-bottom), placement differs (up: -height, down: +height)

Verify with test case: selection [1 2 3] mirror right should produce [1 2 3][3 2 1], NOT [1 2 3][1 2 3].

**Warning signs:** Mirrored copy looks identical to original instead of flipped.

### Pitfall 5: Animation Flag Loss During Mirror

**What goes wrong:** Tiles with animation flags (bit 15 set) lose their animated state after mirroring.

**Why it happens:** Using wrong data type or bitwise operations that strip flags.

**How to avoid:** Use `Uint16Array` everywhere (preserves full 16-bit values including animation flags). Never use `Array<number>` or `number[]` for tiles. Verify with `console.assert(tile & 0x8000)` on known animated tiles before/after mirror.

**Warning signs:** Animated tiles become static after mirroring.

## Code Examples

Verified patterns from existing codebase:

### Horizontal Mirror (Existing Pattern)
```typescript
// Source: globalSlice.ts lines 151-165
mirrorClipboardHorizontal: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      newTiles[y * width + (width - 1 - x)] = tiles[y * width + x];
    }
  }

  set({ clipboard: { ...clipboard, tiles: newTiles } });
},
```

### Vertical Mirror (Existing Pattern)
```typescript
// Source: globalSlice.ts lines 167-181
mirrorClipboardVertical: () => {
  const { clipboard } = get();
  if (!clipboard) return;

  const { width, height, tiles } = clipboard;
  const newTiles = new Uint16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      newTiles[(height - 1 - y) * width + x] = tiles[y * width + x];
    }
  }

  set({ clipboard: { ...clipboard, tiles: newTiles } });
},
```

### Selection Bounds Calculation (Existing Pattern)
```typescript
// Source: documentsSlice.ts rotateSelectionForDocument (Phase 41)
const minX = Math.min(doc.selection.startX, doc.selection.endX);
const minY = Math.min(doc.selection.startY, doc.selection.endY);
const maxX = Math.max(doc.selection.startX, doc.selection.endX);
const maxY = Math.max(doc.selection.startY, doc.selection.endY);
const width = maxX - minX + 1;
const height = maxY - minY + 1;
```

### Extract Selection to Temp Array (Existing Pattern)
```typescript
// Source: documentsSlice.ts rotateSelectionForDocument (Phase 41)
const extracted = new Uint16Array(width * height);
let pos = 0;
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    extracted[pos++] = doc.map.tiles[y * MAP_WIDTH + x];
  }
}
```

### Delta-Based Undo (Existing Pattern)
```typescript
// Source: documentsSlice.ts rotateSelectionForDocument (Phase 41)
get().pushUndoForDocument(id); // Snapshot before changes

// ... make tile changes via setTilesForDocument ...

get().commitUndoForDocument(id, 'Mirror Right'); // Commit with description
```

### Batch Tile Write with Bounds Clipping (Existing Pattern)
```typescript
// Source: documentsSlice.ts rotateSelectionForDocument (Phase 41)
const tiles: Array<{ x: number; y: number; tile: number }> = [];
let idx = 0;
for (let dy = 0; dy < rotated.height; dy++) {
  for (let dx = 0; dx < rotated.width; dx++) {
    const mapX = minX + dx;
    const mapY = minY + dy;
    if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
      tiles.push({ x: mapX, y: mapY, tile: rotated.tiles[idx] });
    }
    idx++;
  }
}
get().setTilesForDocument(id, tiles);
```

### Variant Dropdown Config (Existing Pattern from Phase 41)
```typescript
// Source: ToolBar.tsx lines 213-229 (Phase 41 ROTATE variant)
{
  tool: ToolType.ROTATE,
  settingName: 'Angle',
  getCurrentValue: () => 0, // No persistent value, action on click
  variants: [
    { label: '90° CW', value: 90 },
    { label: '90° CCW', value: -90 },
    { label: '180°', value: 180 },
    { label: '-180°', value: -180 },
  ],
  setter: (angle) => {
    const activeDocId = useEditorStore.getState().activeDocumentId;
    if (!activeDocId) return;
    const doc = useEditorStore.getState().documents.get(activeDocId);
    if (!doc || !doc.selection.active || doc.isPasting) return;
    useEditorStore.getState().rotateSelectionForDocument(activeDocId, angle as 90 | -90 | 180 | -180);
  }
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clipboard-based transforms (Ctrl+H/J) | Selection-based adjacent copy | Phase 42 (v2.5) | User mirrors what they see on the map, creates adjacent duplicate |
| Global state for map/selection | Document-based state (MDI) | Phase 33 (v2.1) | Mirrors work per-document, not globally |
| Full map snapshots for undo | Delta-based undo | Phase 25 (v1.7) | Mirroring 5×5 selection creates ~50 deltas (original + copy), not 65KB snapshot |
| Manual keyboard shortcuts | Variant dropdown UI | Phase 14-02 (v1.5), Phase 41 (v2.5) | Discoverable UI, no memorizing Ctrl+combos |

**Deprecated/outdated:**
- `mirrorClipboardHorizontal()` / `mirrorClipboardVertical()` in globalSlice.ts — will be removed in Phase 43
- Ctrl+H / Ctrl+J keyboard shortcuts for clipboard transforms — will be removed in Phase 43

## Open Questions

1. **Should selection expand to encompass both areas or only show mirrored copy?**
   - What we know: User should see the result of the operation
   - What's unclear: Does selecting both areas make subsequent operations easier or more confusing?
   - Recommendation: Select BOTH areas (original + copy) so user can immediately see the full result and perform additional operations on the combined area if desired. This matches "adjacent copy" semantics — the result is the expanded area.

2. **What happens when mirrored copy extends beyond map bounds?**
   - What we know: Existing `setTilesForDocument` clips out-of-bounds tiles
   - What's unclear: Should operation be rejected entirely, or partial mirror allowed?
   - Recommendation: Allow partial mirror (clip out-of-bounds tiles). User can undo if unexpected. Matches paste behavior and rotation behavior from Phase 41.

3. **Should mirror be disabled during paste mode?**
   - What we know: Paste mode (`isPasting: true`) has its own preview overlay
   - What's unclear: Can user mirror while in paste mode? Should it cancel paste?
   - Recommendation: Disable mirror button when `isPasting === true`, similar to rotate and other edit operations. Keep UX simple: one mode at a time.

4. **Should mirror operations have keyboard shortcuts?**
   - What we know: Old Ctrl+H/J will be removed in Phase 43
   - What's unclear: Should new mirrors have shortcuts? If so, which keys?
   - Recommendation: No keyboard shortcuts in Phase 42. Phase 43 can add them if user requests. Toolbar dropdown is sufficient for discoverability.

5. **What icon should represent the mirror tool?**
   - What we know: Rotate uses '↻' (circular arrow)
   - What's unclear: What's a clear icon for "adjacent mirror copy"?
   - Recommendation: Use '⇆' (left-right arrows) or similar bidirectional icon. Can use bitmap icon like other tools (e.g., `mirror.png` in toolbar assets).

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns (documentsSlice.ts rotateSelectionForDocument, globalSlice.ts mirrorClipboard*, ToolBar.tsx) — verified by direct inspection
- Phase 41 implementation (SelectionTransforms.ts, rotation pattern) — directly inspected
- Project CLAUDE.md, MEMORY.md, REQUIREMENTS.md — design decisions and architecture
- Milestone planning context — mirror = adjacent COPY, not in-place flip

### Secondary (MEDIUM confidence)
- [JavaScript Array Manipulation | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) — array reversal patterns
- [Typed Arrays | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray) — Uint16Array operations

### Tertiary (LOW confidence)
- General WebSearch results for "2D array mirror" — standard algorithms, not TypeScript-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, uses existing Zustand + TypeScript, reuses Phase 41 patterns
- Architecture: HIGH — verified by inspecting existing code patterns (rotation, clipboard mirrors, delta undo, variant dropdown)
- Pitfalls: MEDIUM — inferred from mirror semantics (adjacent copy vs in-place) and existing codebase patterns, not battle-tested in this specific codebase yet

**Research date:** 2026-02-11
**Valid until:** ~30 days (stable domain — 2D mirror algorithms don't change, existing codebase patterns are locked, Phase 41 just completed with same patterns)
