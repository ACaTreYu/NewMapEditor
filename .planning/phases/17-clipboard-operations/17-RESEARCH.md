# Phase 17: Clipboard Operations - Research

**Researched:** 2026-02-05
**Domain:** In-memory clipboard for tile map selection copy/cut/paste/delete
**Confidence:** HIGH

## Summary

Phase 17 implements clipboard operations (copy, cut, paste, delete) for the marquee selection created in Phase 16. Research reveals this is a pure in-memory clipboard system (no system clipboard integration) that preserves full 16-bit tile values including animation flags and game object encodings. SEdit source code provides exact clipboard data format and keyboard shortcuts, while the existing undo/redo system provides the integration pattern.

**Key findings:**
- SEdit clipboard stores selection dimensions (width, height) + tile array in custom binary format
- Full 16-bit tile values preserved (animated flags, warp encodings, frame offsets all intact)
- Game objects (flags, spawns, switches, warps) are **embedded in tiles**, not separate structures
- SEdit shortcuts: Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste), Ctrl+D (delete), Ctrl+Insert (copy alias)
- Paste at original position matches SEdit behavior (user decision from CONTEXT.md)
- Undo integration uses existing `pushUndo()` pattern with tile array snapshots

**Primary recommendation:** Use Zustand store for clipboard state with exact SEdit data format (width + height + Uint16Array). Add clipboard actions to EditorState, keyboard handler to ToolBar.tsx. No external libraries needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.x | Clipboard state storage | Already project standard for all state (EditorState.ts) |
| React useEffect | 18.x | Keyboard event listeners | Already used for Escape cancellation (Phase 15/16) |
| TypeScript Uint16Array | N/A | Tile data storage | Matches existing map.tiles format, zero-copy efficiency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Internal clipboard only, no system integration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Internal clipboard | System clipboard (navigator.clipboard) | System integration adds serialization overhead, no benefit for tile-specific binary data |
| Zustand store | React useState | Local state doesn't persist across tool switches (requirement violation) |
| Full 16-bit values | Tile IDs only | Loses animation frame offsets, warp parameters (breaks game object fidelity) |

**Installation:**
```bash
# No additional packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/core/editor/
├── EditorState.ts       # Add clipboard state + actions here
src/components/
├── ToolBar/             # Add clipboard keyboard shortcuts here
│   └── ToolBar.tsx
└── MapCanvas/           # Render selection unchanged (Phase 16)
    └── MapCanvas.tsx
```

### Pattern 1: Clipboard State in Zustand Store
**What:** Store clipboard as `{ width, height, tiles, originX, originY }` in EditorState
**When to use:** Clipboard must persist across tool switches (user requirement)
**Example:**
```typescript
// In EditorState.ts
interface ClipboardData {
  width: number;
  height: number;
  tiles: Uint16Array;  // Full 16-bit values
  originX: number;     // Top-left X of copied region
  originY: number;     // Top-left Y of copied region
}

interface EditorState {
  // ... existing fields
  clipboard: ClipboardData | null;

  // Actions
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  deleteSelection: () => void;
}
```

**Rationale:** Matches SEdit's clipboard format exactly (buffer[0]=width, buffer[1]=height, buffer[2..N]=tiles). Origin coordinates enable paste-at-original-position behavior.

### Pattern 2: Keyboard Shortcuts in ToolBar
**What:** Extend existing ToolBar.tsx keyboard handler with clipboard shortcuts
**When to use:** Clipboard shortcuts must work with any tool active (user requirement)
**Example:**
```typescript
// In ToolBar.tsx useEffect (lines 227-268)
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'c':
        if (!e.shiftKey) {
          e.preventDefault();
          copySelection();
        }
        break;
      case 'x':
        e.preventDefault();
        cutSelection();
        break;
      case 'v':
        e.preventDefault();
        pasteClipboard();
        break;
      case 'd':
        e.preventDefault();
        deleteSelection();
        break;
      // ... existing cases (n, o, s, z, y)
    }
    return;
  }

  // Delete key (no modifier)
  if (e.key === 'Delete') {
    e.preventDefault();
    deleteSelection();
  }

  // ... existing tool shortcuts
};
```

**Rationale:** Matches existing pattern for Ctrl+N/O/S/Z/Y (lines 229-256). Centralizes all keyboard handling in one component.

### Pattern 3: Undo Integration
**What:** Call `pushUndo(description)` before clipboard operations that modify map
**When to use:** Cut, paste, delete all modify tiles (copy does not)
**Example:**
```typescript
// From EditorState.ts existing pattern (lines 495-509)
cutSelection: () => {
  const { map, selection, clipboard, pushUndo, setTiles } = get();
  if (!map || !selection.active) return;

  // 1. Copy to clipboard first
  copySelection();

  // 2. Push undo BEFORE modifying tiles
  pushUndo('Cut selection');

  // 3. Fill selection with DEFAULT_TILE (280)
  const tiles = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push({ x, y, tile: DEFAULT_TILE });
    }
  }
  setTiles(tiles);

  // 4. Selection persists (user decision)
};
```

**Rationale:** Exact pattern from SEdit map.cpp:3612-3617 (cut calls copyBits then fills with 280, adds undo). Matches existing EditorState undo integration.

### Pattern 4: Paste at Original Position
**What:** Paste tiles at clipboard.originX/Y, not cursor position
**When to use:** User decision from CONTEXT.md (SEdit behavior)
**Example:**
```typescript
pasteClipboard: () => {
  const { map, clipboard, selection, pushUndo, setTiles, setSelection } = get();
  if (!map || !clipboard) return;

  pushUndo('Paste');

  const tiles = [];
  for (let y = 0; y < clipboard.height; y++) {
    for (let x = 0; x < clipboard.width; x++) {
      const mapX = clipboard.originX + x;
      const mapY = clipboard.originY + y;

      // Silently discard out-of-bounds tiles (user decision)
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        const tile = clipboard.tiles[y * clipboard.width + x];
        tiles.push({ x: mapX, y: mapY, tile });
      }
    }
  }
  setTiles(tiles);

  // Set selection to pasted region (user decision)
  setSelection({
    startX: clipboard.originX,
    startY: clipboard.originY,
    endX: clipboard.originX + clipboard.width - 1,
    endY: clipboard.originY + clipboard.height - 1,
    active: true
  });
};
```

**Rationale:** From SEdit map.cpp:3662-3667 (paste at selection.tile, bounds-check and continue). User decision: paste at original position, pasted region becomes selection.

### Anti-Patterns to Avoid
- **System clipboard integration:** Adds serialization overhead for no UX benefit (clipboard doesn't need to persist after app close)
- **Copying tile IDs only:** Loses animation frame offsets (bits 8-14), warp parameters, breaks game object fidelity
- **Auto-switching to SELECT tool on paste:** User decision: paste in-place with any tool active
- **Separate game object tracking:** Game objects are embedded in 16-bit tiles (flags=0x8000|animID, warps=0x8000|style|(params<<8))

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rectangular region copy | Custom loop logic | Existing `selection` bounds + setTiles() | EditorState already has selection tracking (Phase 16) |
| Undo/redo for clipboard | Custom history system | `pushUndo(description)` | Already implemented (lines 495-509), handles tile snapshots |
| Keyboard event handling | New event listener | Extend ToolBar.tsx handler | Centralized (lines 227-268), already handles Ctrl+Z/S/N/O |
| Tile array storage | Custom buffer format | `Uint16Array` | Native typed array, matches map.tiles, zero-copy |

**Key insight:** All clipboard primitives already exist in EditorState (selection bounds, setTiles, pushUndo). Implementation is composition, not invention.

## Common Pitfalls

### Pitfall 1: Forgetting to Preserve Full 16-bit Values
**What goes wrong:** Copying `tile & 0x7FFF` (stripping animation flag) breaks animated tiles and game objects
**Why it happens:** Temptation to "simplify" by storing tile IDs only
**How to avoid:** Always copy full 16-bit values from map.tiles[index]. Game objects (warps, flags) encode metadata in upper bits.
**Warning signs:** Pasted warps have wrong src/dest, animated tiles lose frame offsets

**Code example (CORRECT):**
```typescript
// SEdit map.cpp:3610-3611 - stores full tile value
buffer[pos++] = map->mapData[map->selection.tile + y*map->header.width + x];

// Our equivalent
clipboard.tiles[y * width + x] = map.tiles[tileY * MAP_WIDTH + tileX];
```

**Code example (WRONG):**
```typescript
// DON'T strip animation flag
const tileId = map.tiles[index] & 0x7FFF; // WRONG - loses warp params, frame offsets
clipboard.tiles[i] = tileId;
```

### Pitfall 2: Not Handling Out-of-Bounds Paste
**What goes wrong:** Pasting near map edge crashes or corrupts map if bounds aren't checked
**Why it happens:** Clipboard width/height may exceed remaining map space at paste position
**How to avoid:** Bounds-check each tile individually, silently discard out-of-bounds (user decision from CONTEXT.md)
**Warning signs:** `map.tiles[index]` where index > 65535 (MAP_WIDTH * MAP_HEIGHT)

**Code example (from SEdit map.cpp:3664-3665):**
```typescript
// SEdit continues loop if out-of-bounds
if (map->selection.tile + y*map->header.width + x > map->header.width*map->header.height-1)
  continue;

// Our equivalent
if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
  continue; // Silently discard
}
```

### Pitfall 3: Clearing Selection After Delete/Cut
**What goes wrong:** User decision requires selection to persist after delete/cut (enables iterative workflows)
**Why it happens:** Intuition from other editors that clear selection after clipboard operations
**How to avoid:** Only modify `selection.active` state when explicitly canceled (Escape key from Phase 16)
**Warning signs:** Marching ants disappear after Ctrl+X or Delete

**Code example:**
```typescript
// WRONG - clears selection
deleteSelection: () => {
  // ... fill with DEFAULT_TILE
  clearSelection(); // WRONG - user decision: selection persists
};

// CORRECT - selection persists
deleteSelection: () => {
  // ... fill with DEFAULT_TILE
  // Selection state unchanged - marching ants stay visible
};
```

### Pitfall 4: Requiring Active Selection for Paste
**What goes wrong:** SEdit allows paste anywhere on map, not just into an existing selection
**Why it happens:** Misreading SEdit code - `selection.tile` used as paste origin, not requirement check
**How to avoid:** Only check `clipboard !== null` for paste. Use clipboard.originX/Y as target (user decision).
**Warning signs:** Paste disabled when selection not active

**Code example (from SEdit map.cpp:3642):**
```typescript
// SEdit checks selection exists to determine paste origin, not as requirement
// In our implementation, we store origin separately
pasteClipboard: () => {
  if (!clipboard) return; // Only check clipboard exists
  // Paste at clipboard.originX/Y regardless of selection.active
};
```

## Code Examples

Verified patterns from SEdit source:

### Copy Selection to Clipboard
```typescript
// Source: SEdit map.cpp:3584-3627
copySelection: () => {
  const { map, selection } = get();
  if (!map || !selection.active) return;

  const minX = Math.min(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxX = Math.max(selection.startX, selection.endX);
  const maxY = Math.max(selection.startY, selection.endY);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const tiles = new Uint16Array(width * height);

  let pos = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles[pos++] = map.tiles[y * MAP_WIDTH + x];
    }
  }

  set({
    clipboard: {
      width,
      height,
      tiles,
      originX: minX,
      originY: minY
    }
  });
},
```

### Delete Selection (Fill with DEFAULT_TILE)
```typescript
// Source: SEdit map.cpp:3194-3223
deleteSelection: () => {
  const { map, selection, pushUndo, setTiles } = get();
  if (!map || !selection.active) return;

  const minX = Math.min(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxX = Math.max(selection.startX, selection.endX);
  const maxY = Math.max(selection.startY, selection.endY);

  pushUndo('Delete selection');

  const tiles = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      tiles.push({ x, y, tile: DEFAULT_TILE }); // 280
    }
  }
  setTiles(tiles);

  // Selection persists (user decision from CONTEXT.md)
},
```

### Paste Clipboard at Original Position
```typescript
// Source: SEdit map.cpp:3634-3682
pasteClipboard: () => {
  const { map, clipboard, pushUndo, setTiles, setSelection } = get();
  if (!map || !clipboard) return;

  pushUndo('Paste');

  const tiles = [];
  for (let y = 0; y < clipboard.height; y++) {
    for (let x = 0; x < clipboard.width; x++) {
      const mapX = clipboard.originX + x;
      const mapY = clipboard.originY + y;

      // SEdit line 3664-3665: silently discard out-of-bounds
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        const tile = clipboard.tiles[y * clipboard.width + x];
        tiles.push({ x: mapX, y: mapY, tile });
      }
    }
  }
  setTiles(tiles);

  // Set selection to pasted region (user decision)
  setSelection({
    startX: clipboard.originX,
    startY: clipboard.originY,
    endX: clipboard.originX + clipboard.width - 1,
    endY: clipboard.originY + clipboard.height - 1,
    active: true
  });
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| System clipboard with serialization | In-memory clipboard with Uint16Array | Always (SEdit v1.x) | Zero serialization overhead, preserves binary tile data |
| Clipboard requires custom.dat for game objects | Game objects embedded in tiles | SubSpace v1.0 (1997) | Clipboard works without external data files |
| Paste at cursor position | Paste at original position | SEdit behavior | Enables precise region duplication |

**Deprecated/outdated:**
- **System clipboard integration:** Not needed for single-app tile editor, adds overhead
- **Separate game object clipboard:** Game objects are tiles (0x8000 flag + encoded metadata)

## Open Questions

1. **Should Ctrl+Insert work as copy alias?**
   - What we know: SEdit sedit.rc:345 has `VK_INSERT, COMM_COPY, VIRTKEY, CONTROL`
   - What's unclear: Whether modern users expect this legacy shortcut
   - Recommendation: Implement as documented (low implementation cost, backward compatibility)

2. **Should status bar show clipboard feedback?**
   - What we know: User decision from CONTEXT.md - "Claude's Discretion" for status bar messages
   - What's unclear: What messages are helpful vs noisy
   - Recommendation: Brief messages on copy/cut ("Copied 5x3 selection"), silent paste/delete

3. **Should empty clipboard disable Paste button/shortcut?**
   - What we know: SEdit grays out Paste menu when clipboard empty (frame.cpp:2764)
   - What's unclear: Whether this applies to keyboard shortcuts or just UI
   - Recommendation: Allow Ctrl+V always, silently no-op if clipboard null (simpler, fewer edge cases)

## Sources

### Primary (HIGH confidence)
- SEdit source code: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SeditSource\sedit_src\map.cpp` lines 3584-3682 (clipboard operations)
- SEdit source code: `sedit.rc` lines 342-352 (keyboard accelerators)
- SEdit source code: `resource.h` lines 67-71 (clipboard command IDs)
- Existing codebase: `src/core/editor/EditorState.ts` lines 495-509 (undo pattern)
- Existing codebase: `src/components/ToolBar/ToolBar.tsx` lines 227-268 (keyboard handler pattern)
- Phase 16 implementation: Selection state in Zustand (lines 40-46, 76, 155)

### Secondary (MEDIUM confidence)
- [Continuum Level Editor Manual](https://continuumlt.sourceforge.net/manual/) - confirms Edit menu has copy/cut/paste
- User decisions from CONTEXT.md - paste placement, delete behavior, selection persistence

### Tertiary (LOW confidence - not used)
- React clipboard blog posts - not applicable (internal clipboard only, no system integration)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zustand already project standard, SEdit source code provides exact clipboard format
- Architecture: HIGH - SEdit map.cpp:3584-3682 shows exact implementation, existing undo/keyboard patterns match
- Pitfalls: HIGH - SEdit source reveals all edge cases (bounds checking, 16-bit preservation, selection persistence)

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable domain, no fast-moving dependencies)
