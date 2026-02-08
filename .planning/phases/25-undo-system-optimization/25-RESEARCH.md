# Phase 25: Undo System Optimization - Research

**Researched:** 2026-02-08
**Domain:** Undo/redo optimization, delta-based state management, memory efficiency
**Confidence:** HIGH

## Summary

The current undo system stores full 128KB Uint16Array copies (256x256 tiles x 2 bytes) for every operation. With a 50-entry stack, this consumes up to 12.8MB. Delta-based approaches store only changed tiles as position-value pairs, reducing typical undo entries from 128KB to hundreds of bytes.

Modern approaches use two patterns: (1) Command Pattern with execute/undo methods storing minimal state changes, or (2) Differential storage using JSON patches (RFC 6902). For tile map editors, the Command Pattern is simpler and more appropriate—each operation stores an array of `{x, y, oldValue, newValue}` tuples representing only the changed tiles.

**Primary recommendation:** Replace full tile array copies with delta entries storing only changed tiles. Use Map<string, TileDelta> for efficient position tracking. Bound both undo and redo stacks to maxUndoLevels.

## Standard Stack

### Core Implementation Approach

**Command Pattern** for undo/redo:

| Approach | When to Use | Memory Characteristics |
|----------|-------------|------------------------|
| **Command Pattern** | Discrete operations with known state changes | Stores minimal data per command (just changed values) |
| Differential Patches | Complex nested object state | Requires diffing algorithm, more overhead |
| Full Snapshots | Small state (<10KB) or infrequent changes | Simple but memory-intensive |

For tile map editors, **Command Pattern is standard** because:
- Each operation knows exactly which tiles changed
- Tile arrays are large (128KB) but changes are typically sparse (<1% modified per operation)
- No need for object diffing algorithms (tiles are primitive values in flat array)

### Delta Storage Structure

**Standard approach for tile map undo:**

```typescript
interface TileDelta {
  x: number;
  y: number;
  oldValue: number;  // 16-bit tile value before change
  newValue: number;  // 16-bit tile value after change
}

interface UndoEntry {
  deltas: TileDelta[];
  description: string;
}
```

**Memory calculation:**
- Full snapshot: 256 × 256 × 2 bytes = 131,072 bytes (128KB)
- Delta entry: N changed tiles × 12 bytes per delta
  - Single tile edit: 1 × 12 = 12 bytes (10,923x smaller)
  - Wall line (20 tiles + neighbors): ~40 × 12 = 480 bytes (273x smaller)
  - Paste operation (100 tiles): 100 × 12 = 1,200 bytes (109x smaller)

### No External Libraries Needed

TypeScript/Zustand has everything needed for delta-based undo:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State diffing for nested objects | Custom object diff | Libraries like zundo, zustand-travel | Only needed for complex object state, NOT for flat Uint16Array |
| Undo stack management | Custom queue logic | Simple array with maxLength check | Built-in Array methods sufficient |
| Delta compression | Custom compression | Direct position-value storage | Tile deltas already minimal (12 bytes each) |

**Key insight:** Tile map undo is simpler than general-purpose undo libraries solve. External libraries add complexity for features we don't need (nested object tracking, JSON patch format, reactive subscriptions).

## Architecture Patterns

### Recommended Data Structure

**Current (full snapshots):**
```typescript
interface MapAction {
  tiles: Uint16Array;  // Full 128KB copy
  description: string;
}
undoStack: MapAction[];
redoStack: MapAction[];
```

**Optimized (delta-based):**
```typescript
interface TileDelta {
  x: number;
  y: number;
  oldValue: number;
  newValue: number;
}

interface UndoEntry {
  deltas: TileDelta[];
  description: string;
}

undoStack: UndoEntry[];
redoStack: UndoEntry[];
maxUndoLevels: number;  // Already exists, now applies to both stacks
```

### Pattern 1: Collecting Changes During Operation

**What:** Before modifying map, snapshot affected tiles. After modification, compare to create deltas.

**When to use:** For operations that modify tiles through existing setTile/setTiles methods.

**Implementation:**
```typescript
// Pattern A: Explicit snapshot collection (for single-tile operations)
pushUndo: (description: string) => {
  const { map } = get();
  if (!map) return;

  // Snapshot current state (called BEFORE tile changes)
  set({ pendingUndoSnapshot: new Uint16Array(map.tiles) });
}

// After operation completes, compare and store deltas
commitUndo: (description: string) => {
  const { map, pendingUndoSnapshot, undoStack, maxUndoLevels } = get();
  if (!map || !pendingUndoSnapshot) return;

  const deltas: TileDelta[] = [];
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i] !== pendingUndoSnapshot[i]) {
      const y = Math.floor(i / MAP_WIDTH);
      const x = i % MAP_WIDTH;
      deltas.push({
        x, y,
        oldValue: pendingUndoSnapshot[i],
        newValue: map.tiles[i]
      });
    }
  }

  if (deltas.length > 0) {
    const entry: UndoEntry = { deltas, description };
    const newStack = [...undoStack, entry];
    if (newStack.length > maxUndoLevels) {
      newStack.shift();  // Remove oldest
    }
    set({ undoStack: newStack, redoStack: [], pendingUndoSnapshot: null });
  }
}
```

```typescript
// Pattern B: Direct delta construction (for batch operations that track changes)
// Used by setTiles, paste, batch operations that already know what changed
setTiles: (tiles: Array<{ x: number; y: number; tile: number }>) => {
  const { map } = get();
  if (!map) return;

  const deltas: TileDelta[] = [];
  for (const { x, y, tile } of tiles) {
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      const index = y * MAP_WIDTH + x;
      const oldValue = map.tiles[index];
      if (oldValue !== tile) {
        deltas.push({ x, y, oldValue, newValue: tile });
        map.tiles[index] = tile;
      }
    }
  }

  if (deltas.length > 0) {
    get().pushUndoDeltas(deltas, 'Batch operation');
  }

  map.modified = true;
  set({ map: { ...map } });
}
```

### Pattern 2: Applying Undo/Redo from Deltas

**What:** Restore map state by applying delta changes in reverse (undo) or forward (redo).

**Example:**
```typescript
undo: () => {
  const { map, undoStack, redoStack } = get();
  if (!map || undoStack.length === 0) return;

  const entry = undoStack[undoStack.length - 1];

  // Create redo entry with current state (before reverting)
  const redoDeltas: TileDelta[] = entry.deltas.map(d => ({
    x: d.x,
    y: d.y,
    oldValue: d.newValue,  // Swap old/new
    newValue: d.oldValue
  }));

  // Apply undo by restoring old values
  for (const delta of entry.deltas) {
    map.tiles[delta.y * MAP_WIDTH + delta.x] = delta.oldValue;
  }

  map.modified = true;
  set({
    map: { ...map },
    undoStack: undoStack.slice(0, -1),
    redoStack: [...redoStack, { deltas: redoDeltas, description: entry.description }]
  });
}

redo: () => {
  const { map, undoStack, redoStack } = get();
  if (!map || redoStack.length === 0) return;

  const entry = redoStack[redoStack.length - 1];

  // Create undo entry
  const undoDeltas: TileDelta[] = entry.deltas.map(d => ({
    x: d.x,
    y: d.y,
    oldValue: d.newValue,  // Swap old/new
    newValue: d.oldValue
  }));

  // Apply redo by restoring new values
  for (const delta of entry.deltas) {
    map.tiles[delta.y * MAP_WIDTH + delta.x] = delta.newValue;
  }

  map.modified = true;
  set({
    map: { ...map },
    undoStack: [...undoStack, { deltas: undoDeltas, description: entry.description }],
    redoStack: redoStack.slice(0, -1)
  });
}
```

### Pattern 3: Bounding Redo Stack

**What:** Limit redo stack to maxUndoLevels, discarding oldest entries.

**Why:** Currently redo stack can grow unbounded. After 50 undos, redo stack has 50 entries (6.4MB with current system, 24KB with deltas). Should match undo limit.

**Implementation:**
```typescript
// In undo() when adding to redoStack
const newRedoStack = [...redoStack, redoEntry];
if (newRedoStack.length > maxUndoLevels) {
  newRedoStack.shift();  // Remove oldest redo entry
}
set({ redoStack: newRedoStack, ... });
```

### Anti-Patterns to Avoid

**Anti-pattern 1: Storing full snapshots "for simplicity"**
- 128KB per entry × 50 entries = 6.4MB minimum memory
- With redo stack unbounded, can exceed 12MB
- Delta approach reduces this to <50KB for typical usage

**Anti-pattern 2: Not bounding redo stack**
- Undo stack bounded to maxUndoLevels (50 default)
- Redo stack currently unbounded
- Memory asymmetry violates principle of least surprise

**Anti-pattern 3: Creating deltas by diffing entire map**
- O(65536) comparison every operation (256×256 tiles)
- Unnecessary when operation knows exactly what changed
- Use direct delta construction when possible (setTiles, paste operations)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array diffing for large arrays | Manual index-by-index comparison | Direct delta tracking in operations | Operations already know what changed (setTiles receives position list, batch operations track mutations) |
| Complex JSON patch system | RFC 6902 implementation | Simple {x, y, oldValue, newValue} structure | Tile map is flat array, not nested objects. JSON patches add unnecessary complexity |
| Undo middleware libraries | zundo, zustand-travel integration | Custom implementation in EditorState | Libraries designed for reactive object state, we have simpler flat array problem |

**Key insight:** Tile map undo is fundamentally simpler than general-purpose undo systems. External libraries solve problems we don't have (nested object tracking, reactive subscriptions, automatic diffing). Direct delta storage in EditorState is 50 lines of code vs hundreds of lines of library integration.

## Common Pitfalls

### Pitfall 1: Forgetting to Swap oldValue/newValue in Redo

**What goes wrong:** Redo entries must swap the delta direction. If you copy undo deltas directly, redo applies the wrong values.

**Why it happens:** Delta has semantic oldValue/newValue, but when creating redo from undo, the "old" becomes "new" and vice versa.

**How to avoid:**
```typescript
// WRONG: Direct copy
const redoEntry = { deltas: entry.deltas, description: entry.description };

// CORRECT: Swap old/new
const redoDeltas = entry.deltas.map(d => ({
  x: d.x,
  y: d.y,
  oldValue: d.newValue,  // Swap
  newValue: d.oldValue   // Swap
}));
```

**Warning signs:** Redo applies same change as undo instead of reverting it.

### Pitfall 2: Not Bounding Redo Stack Size

**What goes wrong:** After many undo operations, redo stack grows unbounded, consuming memory that undo stack is limited to prevent.

**Why it happens:** maxUndoLevels applies to undo stack but redo stack grows without limit in current implementation.

**How to avoid:** Apply same size limit to both stacks:
```typescript
const newRedoStack = [...redoStack, redoEntry];
if (newRedoStack.length > maxUndoLevels) {
  newRedoStack.shift();
}
```

**Warning signs:** Memory usage grows during repeated undo operations.

### Pitfall 3: Calling pushUndo After Tile Modification

**What goes wrong:** Need old values to create deltas, but if map already modified, old values are lost.

**Why it happens:** Current pattern calls pushUndo() before operations, which works for full snapshots but needs adjustment for delta approach.

**How to avoid:** Two patterns:
1. **Snapshot before, commit after:** Call pushUndo to snapshot, modify tiles, call commitUndo to compute deltas
2. **Direct delta construction:** Operations that know changes (setTiles, paste) build deltas directly

**Warning signs:** Undo restores wrong values because oldValue wasn't captured before modification.

### Pitfall 4: Creating Empty Undo Entries

**What goes wrong:** Operation snapshots state but makes no actual changes (e.g., click on empty space with pencil tool), creating empty undo entry.

**Why it happens:** pushUndo called before knowing if operation will succeed/modify anything.

**How to avoid:** Only add to undo stack if deltas.length > 0:
```typescript
if (deltas.length > 0) {
  const entry: UndoEntry = { deltas, description };
  // ... add to stack
}
```

**Warning signs:** Undo stack grows but undo/redo do nothing (empty operations recorded).

## Code Examples

Verified patterns from current codebase analysis:

### Current Undo Pattern (Full Snapshots)
```typescript
// Source: E:\NewMapEditor\src\core\editor\EditorState.ts lines 732-746
pushUndo: (description) => {
  const { map, undoStack, maxUndoLevels } = get();
  if (!map) return;

  const action: MapAction = {
    tiles: new Uint16Array(map.tiles),  // Full 128KB copy
    description
  };

  const newStack = [...undoStack, action];
  if (newStack.length > maxUndoLevels) {
    newStack.shift();
  }

  set({ undoStack: newStack, redoStack: [] });
}
```

### Current Usage Pattern in MapCanvas
```typescript
// Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx lines 752-777
// Pattern: pushUndo before operation, then apply changes
pushUndo('Place game object');
placeGameObject(x, y);

// OR for tools with immediate feedback
pushUndo('Edit tiles');
handleToolAction(x, y);

// OR for drag operations: pushUndo on mousedown, operate during drag
pushUndo('Draw walls');  // mousedown
placeWall(x, y);         // during drag
```

### Batch Operations That Know Changes
```typescript
// Source: E:\NewMapEditor\src\core\editor\EditorState.ts lines 641-652
setTiles: (tiles) => {
  const { map } = get();
  if (!map) return;

  for (const { x, y, tile } of tiles) {
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      map.tiles[y * MAP_WIDTH + x] = tile;
    }
  }
  map.modified = true;
  set({ map: { ...map } });
}

// Called by paste, cut, delete operations:
// Source: lines 394, 332, 358
get().pushUndo('Paste');
get().setTiles(tiles);
```

## State of the Art

| Approach | Memory (50 entries) | Performance | Complexity |
|----------|---------------------|-------------|------------|
| **Full snapshots (current)** | 6.4MB (128KB × 50) | Fast apply (array copy) | Simple implementation |
| **Delta-based (recommended)** | 24-60KB (varies by operation) | Fast apply (sparse updates) | Moderate complexity |
| **JSON Patch libraries** | Similar to delta | Slower (patch parsing) | High complexity |

**Current industry trends:**

**2026 Best Practices:**
- Delta storage for large state structures (recommended by [Travels](https://github.com/mutativejs/travels), [JitBlox](https://www.jitblox.com/blog/designing-a-lightweight-undo-history-with-typescript))
- Command Pattern for known state changes (recommended by [Software Patterns Lexicon](https://softwarepatternslexicon.com/patterns-ts/6/2/3/))
- Bounded history with configurable limits (recommended by [Stack Interface](https://stackinterface.com/how-can-i-use-a-stack-interface-to-manage-undo-redo-functionality-in-my-application/))

**Memory optimization focus:**
Modern editors prioritize memory efficiency as dataset sizes grow. Map editors like [Advance Wars Map Editor](https://github.com/joaofrancese/awsmaped) explicitly document undo/redo limits should be kept low if computer has limited RAM.

## Open Questions

1. **Should pendingUndoSnapshot be stored per-operation or globally?**
   - What we know: Single global snapshot simpler, but prevents concurrent undo captures
   - What's unclear: Whether any operations overlap (e.g., nested action calls)
   - Recommendation: Start with global snapshot, refactor if edge cases found

2. **What about wall batch operations that track changes in Map<string, number>?**
   - What we know: Phase 24 uses Map<string, number> for deduplication, already tracks positions
   - What's unclear: Should WallSystem.placeWallBatch return deltas directly?
   - Recommendation: Convert Map entries to deltas in EditorState wrapper, keep WallSystem focused on wall logic

3. **Should we support "empty" undo entries for consistency?**
   - What we know: Current system always pushes entry even if no changes
   - What's unclear: User expectation—does Ctrl+Z after no-op click feel like bug or feature?
   - Recommendation: Filter empty entries (deltas.length === 0), reduces confusion

## Sources

### Primary (HIGH confidence)
- Current codebase analysis:
  - E:\NewMapEditor\src\core\editor\EditorState.ts (lines 26-30, 732-787)
  - E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx (lines 752-877, pushUndo usage patterns)
  - E:\NewMapEditor\src\core\map\WallSystem.ts (lines 192-244, batch operation implementation)

### Secondary (MEDIUM confidence)
- [Designing a lightweight undo history with TypeScript | JitBlox](https://www.jitblox.com/blog/designing-a-lightweight-undo-history-with-typescript) - Command Pattern over Memento, avoid state snapshots
- [GitHub - mutativejs/travels](https://github.com/mutativejs/travels) - Differential storage using JSON patches, 10x faster than snapshots
- [GitHub - charkour/zundo](https://github.com/charkour/zundo) - Zustand undo middleware, configurable history limits
- [GitHub - mutativejs/zustand-travel](https://github.com/mutativejs/zustand-travel) - High-performance undo/redo with patch-based tracking
- [Undo and Redo Mechanisms in TypeScript | Software Patterns Lexicon](https://softwarepatternslexicon.com/patterns-ts/6/2/3/) - Command Pattern for reversible operations
- [How to Use a Stack Interface for Undo/Redo (2026)](https://stackinterface.com/how-can-i-use-a-stack-interface-to-manage-undo-redo-functionality-in-my-application/) - Bounded stack implementation, monitor memory usage

### Tertiary (LOW confidence)
- [Advance Wars Map Editor](https://github.com/joaofrancese/awsmaped) - Undo/redo limit should be low for limited RAM (specific to that project's constraints, not general guidance)

## Metadata

**Confidence breakdown:**
- Delta structure design: HIGH - Well-established pattern in tile editors, straightforward position-value pairs
- Implementation approach: HIGH - Codebase analysis shows clear integration points, existing patterns compatible with delta approach
- Memory calculations: HIGH - Direct math on known data sizes (128KB arrays, 12 bytes per delta, typical operation sizes from Phase 24 analysis)
- Redo stack bounding: HIGH - Same mechanism as undo stack, trivial to apply

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - stable domain, TypeScript/Zustand patterns unlikely to change significantly)
