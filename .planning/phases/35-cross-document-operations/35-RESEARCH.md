# Phase 35: Cross-Document Operations - Research

**Researched:** 2026-02-09
**Domain:** Cross-document clipboard and tool state sharing in multi-document editor
**Confidence:** HIGH

## Summary

Phase 35 enables clipboard and picker tool to work across multiple open map documents. Currently (Phase 34), each document has its own independent clipboard stored in per-document state. The picker tool (ToolType.PICKER) samples a tile from the map and stores it in global `selectedTile` state, which already works cross-document. Cross-document clipboard requires moving clipboard storage from per-document to global state, while cross-document picker already works but needs verification.

The core architectural decision is **where to store clipboard data**: per-document (current) vs. global (required for cross-document operations). The current architecture has `clipboard: ClipboardData | null` inside `DocumentState`, meaning each document's clipboard is isolated. For XDOC-01 (copy from map A, paste into map B), clipboard must be global so copy operations populate a shared clipboard that all documents can paste from.

The picker tool already stores `selectedTile` and `tileSelection` in `GlobalSlice`, not per-document. When a user picks a tile (I key), it calls `setSelectedTile(tile)` which updates global state. Switching to a different document and drawing will use that globally-picked tile. This satisfies XDOC-02 with zero code changes—verification testing only.

**Primary recommendation:** Move clipboard state from `DocumentState` to `GlobalSlice`. Per-document paste preview state (isPasting, pastePreviewPosition) stays per-document since paste mode is document-specific. Clipboard data (width, height, tiles, origin) becomes shared across all documents.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.5.7 | State management | Already in use; global state naturally shared across all selectors |
| TypeScript | (current) | Type safety | Strict mode enabled, zero-error baseline from Phase 32 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Uint16Array | Built-in | Clipboard tile storage | Already used in clipboard; preserves full 16-bit tile encoding |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Global clipboard | Per-document clipboard with cross-doc access | Current architecture—doesn't support cross-document paste |
| Clipboard middleware | Manual clipboard state sync | Over-engineering—Zustand global state is sufficient |
| System clipboard API | Navigator.clipboard API with custom encoding | Adds OS integration complexity; not required for internal copy/paste |

**Installation:**
```bash
# No new packages needed—Zustand 4.5.7 already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/core/editor/
├── EditorState.ts               # Main store (no changes needed)
├── slices/
│   ├── types.ts                 # Move ClipboardData out of DocumentState
│   ├── documentsSlice.ts        # Remove per-document clipboard actions
│   ├── globalSlice.ts           # Add global clipboard state and actions
│   └── windowSlice.ts           # No changes needed
```

### Pattern 1: Global Clipboard State

**What:** Store clipboard data in `GlobalSlice` instead of `DocumentState` so copy operations from any document populate a shared clipboard accessible to all documents.

**When to use:** When clipboard operations should work across document boundaries (XDOC-01 requirement).

**Example:**
```typescript
// types.ts - ClipboardData stays unchanged
export interface ClipboardData {
  width: number;
  height: number;
  tiles: Uint16Array;  // Full 16-bit values (preserves animation flags)
  originX: number;
  originY: number;
}

// globalSlice.ts - Add clipboard to global state
export interface GlobalSlice {
  // Tool state
  currentTool: ToolType;
  selectedTile: number;
  tileSelection: TileSelection;

  // Global clipboard (NEW - moved from DocumentState)
  clipboard: ClipboardData | null;

  // Actions
  setClipboard: (data: ClipboardData | null) => void;
  mirrorClipboardHorizontal: () => void;
  mirrorClipboardVertical: () => void;
  rotateClipboard: () => void;
}

export const createGlobalSlice: StateCreator<GlobalSlice, [], [], GlobalSlice> = (set, get) => ({
  clipboard: null,  // Initially empty

  setClipboard: (data) => set({ clipboard: data }),

  mirrorClipboardHorizontal: () => {
    const { clipboard } = get();
    if (!clipboard) return;

    const { width, height, tiles } = clipboard;
    const newTiles = new Uint16Array(tiles.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newTiles[y * width + (width - 1 - x)] = tiles[y * width + x];
      }
    }
    set({ clipboard: { ...clipboard, tiles: newTiles } });
  },

  // ... other clipboard transformations
});
```

**Why:** Zustand's global state is naturally accessible to all components/documents. Moving clipboard to global makes copy-from-A-paste-to-B work automatically.

### Pattern 2: Per-Document Paste Preview State

**What:** Keep `isPasting` and `pastePreviewPosition` in `DocumentState` even though clipboard is global.

**When to use:** When paste preview behavior is document-specific (user may be in paste mode on document A but not document B).

**Example:**
```typescript
// types.ts - DocumentState keeps paste preview state
export interface DocumentState {
  map: MapData | null;
  filePath: string | null;
  viewport: Viewport;
  selection: Selection;
  // clipboard: ClipboardData | null;  // REMOVED - moved to global
  isPasting: boolean;                  // KEPT - per-document paste mode
  pastePreviewPosition: PastePreviewPosition | null;  // KEPT - per-document preview
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pendingUndoSnapshot: Uint16Array | null;
  modified: boolean;
}

// documentsSlice.ts - Paste actions read global clipboard, write per-doc preview state
startPastingForDocument: (id) => {
  const doc = get().documents.get(id);
  const clipboard = get().clipboard;  // Read from GLOBAL state
  if (!doc || !clipboard) return;

  const newDocs = new Map(get().documents);
  newDocs.set(id, { ...doc, isPasting: true, pastePreviewPosition: null });
  set({ documents: newDocs });
}
```

**Why:** Paste preview is a document-specific UI concern (marching ants border, preview position). Clipboard data is shared, but the "am I currently pasting?" state is per-document.

### Pattern 3: Picker Tool Already Works Cross-Document

**What:** Picker tool stores `selectedTile` in `GlobalSlice`, so picking from document A and drawing on document B already works.

**When to use:** Already implemented—just verify it works correctly.

**Example:**
```typescript
// MapCanvas.tsx - Picker handler (UNCHANGED from Phase 34)
case ToolType.PICKER:
  if (map) {
    setSelectedTile(map.tiles[y * MAP_WIDTH + x]);  // Updates GLOBAL selectedTile
    restorePreviousTool();
  }
  break;

// Drawing with picked tile works because setTile reads global selectedTile:
const tile = getSelectedTileId();  // Reads from global state
setTile(x, y, tile);
```

**Why:** The architecture already treats tool selection as global state. Picker modifies global state, so it automatically works across documents.

### Pattern 4: Copy/Cut Actions Update Global Clipboard

**What:** Refactor `copySelectionForDocument` and `cutSelectionForDocument` to write to global clipboard instead of per-document clipboard.

**When to use:** When implementing XDOC-01 (cross-document copy/paste).

**Example:**
```typescript
// documentsSlice.ts - Copy writes to GLOBAL clipboard
copySelectionForDocument: (id) => {
  const doc = get().documents.get(id);
  if (!doc || !doc.map || !doc.selection.active) return;

  const { selection, map } = doc;
  const minX = Math.min(selection.startX, selection.endX);
  const maxX = Math.max(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxY = Math.max(selection.startY, selection.endY);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const tiles = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mapX = minX + x;
      const mapY = minY + y;
      tiles[y * width + x] = map.tiles[mapY * MAP_WIDTH + mapX];
    }
  }

  // Write to GLOBAL clipboard via set() call
  set({ clipboard: { width, height, tiles, originX: minX, originY: minY } });
}
```

**Why:** Global clipboard enables any document to paste the copied data. No need to track which document the data came from.

### Pattern 5: Backward-Compatible Wrapper Actions

**What:** Update EditorState.ts backward-compatible wrappers to use global clipboard actions.

**When to use:** To maintain API compatibility with existing components during migration.

**Example:**
```typescript
// EditorState.ts - Backward-compatible wrappers (updated signatures)
copySelection: () => {
  const id = get().activeDocumentId;
  if (!id) return;
  get().copySelectionForDocument(id);
  // Sync top-level clipboard field for components still reading state.clipboard
  set((state) => ({ clipboard: state.clipboard }));  // Already global, just signal update
},

startPasting: () => {
  const id = get().activeDocumentId;
  if (!id) return;
  get().startPastingForDocument(id);
  // Sync top-level isPasting from active document
  set((state) => syncTopLevelFields(state as EditorState));
},

mirrorHorizontal: () => {
  get().mirrorClipboardHorizontal();  // Calls global action
}
```

**Why:** Components currently call `copySelection()` and `mirrorHorizontal()` without document IDs. Wrappers delegate to new global clipboard actions transparently.

### Anti-Patterns to Avoid

- **Storing clipboard in both global and per-document state:** Pick one—global for cross-doc, or per-document for isolated. Hybrid causes sync bugs.

- **Forgetting to preserve 16-bit tile encoding:** ClipboardData.tiles is `Uint16Array`, not `number[]`. Preserve animation flags (bit 15) and game object data.

- **Clearing clipboard on document switch:** Clipboard is global, so it should persist across document switches. Don't clear on `setActiveDocument`.

- **Making isPasting global:** Paste preview mode is per-document. If user starts pasting on doc A and switches to doc B, B should not be in paste mode automatically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-document state sharing | Custom event bus or pub-sub | Zustand global state | Already part of the architecture; no new dependencies |
| Clipboard data serialization | Custom binary format | Uint16Array (existing) | Already preserves 16-bit tile encoding; proven from Phase 25 |
| Clipboard transformation (mirror/rotate) | Re-implement rotation logic | Port existing actions from documentsSlice | Logic already exists and is tested |
| Paste preview rendering | Separate canvas overlay | Existing MapCanvas paste preview | Already renders paste preview in MapCanvas.tsx |

**Key insight:** The hard work is already done. Clipboard logic exists in documentsSlice.ts (lines 448-690), just needs to be moved to globalSlice and wired to global state instead of per-document state.

## Common Pitfalls

### Pitfall 1: Forgetting to Remove Clipboard from DocumentState

**What goes wrong:** After moving clipboard to global state, old per-document clipboard field still exists. Components read stale data from document state instead of global state.

**Why it happens:** Incomplete migration—types updated but initialization code still creates per-document clipboard.

**How to avoid:** Search codebase for `clipboard:` in types.ts, documentsSlice.ts, EditorState.ts. Remove ALL per-document clipboard references. Run TypeScript compiler to catch missed references.

**Warning signs:** Paste works within a document but fails across documents; clipboard appears to reset when switching documents; TypeScript shows no errors but runtime behavior is wrong.

**Example fix:**
```typescript
// types.ts - REMOVE clipboard from DocumentState
export interface DocumentState {
  map: MapData | null;
  filePath: string | null;
  viewport: Viewport;
  selection: Selection;
  // clipboard: ClipboardData | null;  // DELETE THIS LINE
  isPasting: boolean;
  pastePreviewPosition: PastePreviewPosition | null;
  // ...
}

// Verify createDocumentFromMap() doesn't initialize clipboard
export function createDocumentFromMap(map: MapData, filePath?: string): DocumentState {
  return {
    map,
    filePath: filePath || null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
    // clipboard: null,  // DELETE THIS LINE
    isPasting: false,
    pastePreviewPosition: null,
    // ...
  };
}
```

### Pitfall 2: Losing Animation Flags on Cross-Document Paste

**What goes wrong:** User copies animated tiles from map A, pastes into map B, and tiles lose their animation flags (appear as static tiles).

**Why it happens:** Clipboard stores `Uint16Array` with full 16-bit encoding, but paste action only reads the lower 15 bits (tile ID), dropping bit 15 (animation flag).

**How to avoid:** Ensure `pasteAtForDocument` writes the full 16-bit value from `clipboard.tiles[index]` to `map.tiles[mapY * MAP_WIDTH + mapX]`. No masking or bit manipulation—copy the value as-is.

**Warning signs:** Animated tiles become static after paste; game objects lose type encoding; paste appears to work but tile behavior is wrong in-game.

**Example fix:**
```typescript
// WRONG: Masks off animation bit
const tileId = clipboard.tiles[dy * clipboard.width + dx] & 0x7FFF;
tiles.push({ x: mapX, y: mapY, tile: tileId });

// RIGHT: Preserves full 16-bit encoding
const tile = clipboard.tiles[dy * clipboard.width + dx];  // Full value
tiles.push({ x: mapX, y: mapY, tile });
```

### Pitfall 3: Paste Preview State Leaking Across Documents

**What goes wrong:** User starts paste mode on document A, switches to document B, and document B also shows paste preview/marching ants.

**Why it happens:** `isPasting` or `pastePreviewPosition` accidentally moved to global state, or `setActiveDocument` syncs paste state from inactive document.

**How to avoid:** Keep `isPasting` and `pastePreviewPosition` in `DocumentState`. Each document has independent paste preview state. When switching documents, MapCanvas reads paste state from the active document only.

**Warning signs:** All open documents show paste preview simultaneously; pressing Escape cancels paste mode on all documents.

**Example fix:**
```typescript
// DocumentState - Keep paste preview state per-document
export interface DocumentState {
  // ...
  isPasting: boolean;                  // Per-document
  pastePreviewPosition: PastePreviewPosition | null;  // Per-document
}

// MapCanvas.tsx - Read paste state from active document only
const { isPasting, pastePreviewPosition } = useEditorStore(
  useShallow((state) => {
    const doc = state.activeDocumentId ? state.documents.get(state.activeDocumentId) : null;
    return {
      isPasting: doc?.isPasting || false,
      pastePreviewPosition: doc?.pastePreviewPosition || null
    };
  })
);
```

### Pitfall 4: Backward-Compat Wrappers Not Updated

**What goes wrong:** Components call `copySelection()` or `mirrorHorizontal()` (old API), but these still write to per-document clipboard. Cross-document paste fails silently.

**Why it happens:** Moved clipboard actions to globalSlice but forgot to update EditorState.ts backward-compatible wrappers.

**How to avoid:** Audit ALL wrapper actions in EditorState.ts that touch clipboard. Update them to call global clipboard actions, not per-document clipboard actions.

**Warning signs:** TypeScript compiles, app runs, copy/paste works within a document, but cross-document paste doesn't work.

**Example fix:**
```typescript
// EditorState.ts - Update wrappers to use global clipboard
copySelection: () => {
  const id = get().activeDocumentId;
  if (!id) return;
  get().copySelectionForDocument(id);  // This now writes to GLOBAL clipboard
  set((state) => syncTopLevelFields(state as EditorState));
},

mirrorHorizontal: () => {
  get().mirrorClipboardHorizontal();  // Calls GLOBAL action, not per-document
  set((state) => syncTopLevelFields(state as EditorState));
},

rotateClipboard: () => {
  get().rotateClipboard();  // Calls GLOBAL action
  set((state) => syncTopLevelFields(state as EditorState));
}
```

### Pitfall 5: Top-Level Clipboard Sync in Backward-Compat Layer

**What goes wrong:** EditorState.ts maintains top-level `clipboard` field (from Phase 33 backward compat). After moving clipboard to global, this field doesn't update or syncs from wrong source.

**Why it happens:** `syncTopLevelFields()` reads clipboard from active document's state, but clipboard no longer exists in DocumentState—it's in GlobalSlice.

**How to avoid:** Update `syncTopLevelFields()` to read clipboard from global state, not from active document state. Or remove top-level clipboard field entirely if no components use it.

**Warning signs:** Components reading `state.clipboard` see null even after copying; paste preview doesn't render.

**Example fix:**
```typescript
// EditorState.ts - Update syncTopLevelFields to NOT sync clipboard from document
function syncTopLevelFields(state: EditorState): Partial<EditorState> {
  const { activeDocumentId, documents } = state;
  if (!activeDocumentId) {
    return {
      map: null,
      filePath: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
      // clipboard: null,  // Don't sync clipboard—it's global now
      isPasting: false,
      pastePreviewPosition: null,
      undoStack: [],
      redoStack: [],
      pendingUndoSnapshot: null
    };
  }

  const doc = documents.get(activeDocumentId);
  if (!doc) {
    return { /* same as above */ };
  }

  return {
    map: doc.map,
    filePath: doc.filePath,
    viewport: doc.viewport,
    selection: doc.selection,
    // clipboard: doc.clipboard,  // REMOVE THIS - clipboard is global
    isPasting: doc.isPasting,
    pastePreviewPosition: doc.pastePreviewPosition,
    undoStack: doc.undoStack,
    redoStack: doc.redoStack,
    pendingUndoSnapshot: doc.pendingUndoSnapshot
  };
}

// If components still read state.clipboard, keep top-level field but sync from global:
// In EditorState store initialization:
export const useEditorStore = create<EditorState>()((set, get, store) => ({
  ...createDocumentsSlice(set, get, store),
  ...createGlobalSlice(set, get, store),
  ...createWindowSlice(set, get, store),

  // Top-level backward-compat field now mirrors global clipboard
  clipboard: null,  // Initial value

  // Override setClipboard to sync top-level field
  setClipboard: (data) => {
    set({ clipboard: data });  // Updates global clipboard AND top-level field
  },

  // ... rest of store
}));
```

## Code Examples

Verified patterns based on existing codebase architecture:

### Moving ClipboardData Type (No Changes Needed)

```typescript
// types.ts - ClipboardData definition stays unchanged
export interface ClipboardData {
  width: number;
  height: number;
  tiles: Uint16Array;  // Full 16-bit values
  originX: number;
  originY: number;
}
```

**Source:** E:\NewMapEditor\src\core\editor\slices\types.ts (lines 34-41)

### Adding Global Clipboard to GlobalSlice

```typescript
// globalSlice.ts - Add clipboard state and actions
export interface GlobalSlice {
  // Existing tool state
  currentTool: ToolType;
  previousTool: ToolType | null;
  selectedTile: number;
  tileSelection: TileSelection;

  // NEW: Global clipboard
  clipboard: ClipboardData | null;

  // Existing actions
  setTool: (tool: ToolType) => void;
  setSelectedTile: (tile: number) => void;
  setTileSelection: (selection: TileSelection) => void;

  // NEW: Clipboard actions
  setClipboard: (data: ClipboardData | null) => void;
  mirrorClipboardHorizontal: () => void;
  mirrorClipboardVertical: () => void;
  rotateClipboard: () => void;
}

export const createGlobalSlice: StateCreator<GlobalSlice, [], [], GlobalSlice> = (set, get) => ({
  // Existing state
  currentTool: ToolType.PENCIL,
  previousTool: null,
  selectedTile: DEFAULT_TILE,
  tileSelection: { startCol: 0, startRow: 7, width: 1, height: 1 },

  // NEW: Clipboard state
  clipboard: null,

  // Existing actions
  setTool: (tool) => set((state) => ({
    currentTool: tool,
    previousTool: tool === ToolType.PICKER ? state.currentTool : state.previousTool
  })),

  setSelectedTile: (tile) => {
    const col = tile % TILES_PER_ROW;
    const row = Math.floor(tile / TILES_PER_ROW);
    set({
      selectedTile: tile,
      tileSelection: { startCol: col, startRow: row, width: 1, height: 1 }
    });
  },

  // NEW: Clipboard actions
  setClipboard: (data) => set({ clipboard: data }),

  mirrorClipboardHorizontal: () => {
    const { clipboard } = get();
    if (!clipboard) return;

    const { width, height, tiles } = clipboard;
    const newTiles = new Uint16Array(tiles.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newTiles[y * width + (width - 1 - x)] = tiles[y * width + x];
      }
    }
    set({ clipboard: { ...clipboard, tiles: newTiles } });
  },

  mirrorClipboardVertical: () => {
    const { clipboard } = get();
    if (!clipboard) return;

    const { width, height, tiles } = clipboard;
    const newTiles = new Uint16Array(tiles.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newTiles[(height - 1 - y) * width + x] = tiles[y * width + x];
      }
    }
    set({ clipboard: { ...clipboard, tiles: newTiles } });
  },

  rotateClipboard: () => {
    const { clipboard } = get();
    if (!clipboard) return;

    const { width, height, tiles, originX, originY } = clipboard;
    const newTiles = new Uint16Array(tiles.length);
    // Rotate 90 degrees clockwise: (x,y) -> (height-1-y, x)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const newX = height - 1 - y;
        const newY = x;
        newTiles[newY * height + newX] = tiles[y * width + x];
      }
    }
    set({
      clipboard: {
        width: height,  // Swap dimensions
        height: width,
        tiles: newTiles,
        originX,
        originY
      }
    });
  }
});
```

**Source:** Adapted from E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts (lines 623-690), moving clipboard transformations to global scope.

### Updating Copy Action to Write Global Clipboard

```typescript
// documentsSlice.ts - Update copySelectionForDocument
copySelectionForDocument: (id) => {
  const state = get();
  const doc = state.documents.get(id);
  if (!doc || !doc.map || !doc.selection.active) return;

  const { selection, map } = doc;
  const minX = Math.min(selection.startX, selection.endX);
  const maxX = Math.max(selection.startX, selection.endX);
  const minY = Math.min(selection.startY, selection.endY);
  const maxY = Math.max(selection.startY, selection.endY);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const tiles = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mapX = minX + x;
      const mapY = minY + y;
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        tiles[y * width + x] = map.tiles[mapY * MAP_WIDTH + mapX];
      }
    }
  }

  // Write to GLOBAL clipboard (changed from per-document)
  set({ clipboard: { width, height, tiles, originX: minX, originY: minY } });
}
```

**Source:** Adapted from E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts (lines 448-472), changing destination from `doc.clipboard` to global `clipboard`.

### Updating Paste Actions to Read Global Clipboard

```typescript
// documentsSlice.ts - Update startPastingForDocument
startPastingForDocument: (id) => {
  const state = get();
  const doc = state.documents.get(id);
  const clipboard = state.clipboard;  // Read from GLOBAL state (changed)
  if (!doc || !clipboard) return;

  const newDocs = new Map(state.documents);
  newDocs.set(id, { ...doc, isPasting: true, pastePreviewPosition: null });
  set({ documents: newDocs });
},

// documentsSlice.ts - Update pasteAtForDocument
pasteAtForDocument: (id, x, y) => {
  const state = get();
  const doc = state.documents.get(id);
  const clipboard = state.clipboard;  // Read from GLOBAL state (changed)
  if (!doc || !doc.map || !clipboard) return;

  // Build tile list from clipboard
  const tiles: Array<{ x: number; y: number; tile: number }> = [];
  for (let dy = 0; dy < clipboard.height; dy++) {
    for (let dx = 0; dx < clipboard.width; dx++) {
      const mapX = x + dx;
      const mapY = y + dy;
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        // CRITICAL: Preserve full 16-bit tile encoding
        tiles.push({ x: mapX, y: mapY, tile: clipboard.tiles[dy * clipboard.width + dx] });
      }
    }
  }

  if (tiles.length === 0) return;

  get().pushUndoForDocument(id);
  get().setTilesForDocument(id, tiles);
  get().commitUndoForDocument(id, 'Paste tiles');

  // Update selection to pasted region and exit paste mode
  const newDocs = new Map(state.documents);
  newDocs.set(id, {
    ...state.documents.get(id)!,
    selection: {
      startX: x,
      startY: y,
      endX: Math.min(MAP_WIDTH - 1, x + clipboard.width - 1),
      endY: Math.min(MAP_HEIGHT - 1, y + clipboard.height - 1),
      active: true
    },
    isPasting: false,
    pastePreviewPosition: null
  });
  set({ documents: newDocs });
}
```

**Source:** Adapted from E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts (lines 530-614), changing clipboard source from `doc.clipboard` to `state.clipboard`.

### Removing Clipboard from DocumentState Type

```typescript
// types.ts - Update DocumentState interface
export interface DocumentState {
  map: MapData | null;
  filePath: string | null;
  viewport: Viewport;
  selection: Selection;
  // clipboard: ClipboardData | null;  // REMOVE THIS LINE
  isPasting: boolean;                  // Keep paste preview state
  pastePreviewPosition: PastePreviewPosition | null;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pendingUndoSnapshot: Uint16Array | null;
  modified: boolean;
}

// types.ts - Update createDocumentFromMap helper
export function createDocumentFromMap(map: MapData, filePath?: string): DocumentState {
  return {
    map,
    filePath: filePath || null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
    // clipboard: null,  // REMOVE THIS LINE
    isPasting: false,
    pastePreviewPosition: null,
    undoStack: [],
    redoStack: [],
    pendingUndoSnapshot: null,
    modified: false
  };
}
```

**Source:** E:\NewMapEditor\src\core\editor\slices\types.ts (lines 63-108), removing clipboard field.

### Verifying Picker Tool Works Cross-Document (No Changes)

```typescript
// MapCanvas.tsx - Picker handler (existing code, unchanged)
case ToolType.PICKER:
  if (map) {
    setSelectedTile(map.tiles[y * MAP_WIDTH + x]);  // Updates GLOBAL selectedTile
    restorePreviousTool();
  }
  break;

// Verification test:
// 1. Open two maps (A and B)
// 2. Click map A, press I key, click a tile (e.g., tile 100)
// 3. Click map B, press D key (draw tool), click canvas
// 4. Expected: Tile 100 is drawn on map B (proves picker works cross-document)
```

**Source:** E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx (lines 1028-1033). No changes needed—picker already uses global state.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-document clipboard | Global clipboard with per-document paste preview | Phase 35 (2026-02) | Enables cross-document copy/paste operations |
| All clipboard state per-document | Split: clipboard data global, paste preview per-document | Phase 35 (2026-02) | Balances sharing (clipboard) with isolation (paste preview) |
| Tool selection stored per-document | Tool selection in global state | Phase 25-33 | Picker tool works cross-document automatically |

**Deprecated/outdated:**
- **Per-document clipboard in multi-document editor:** Standard in single-document editors, but multi-document editors (VS Code, Photoshop, SEdit) use global clipboards.

## Open Questions

1. **Should clipboard be cleared when all documents close?**
   - What we know: User can copy tiles from document A, close A, open document B, and paste. Clipboard persists across document lifecycle.
   - What's unclear: User expectation—should closing all documents clear clipboard (like closing the app), or should clipboard persist until overwritten?
   - Recommendation: Keep clipboard until overwritten (simpler, matches OS clipboard behavior). Phase 35 doesn't need special cleanup logic.

2. **Should there be a clipboard size limit?**
   - What we know: Clipboard stores `Uint16Array` with width × height tiles. A 256×256 selection = 65,536 × 2 bytes = 131 KB.
   - What's unclear: Should there be a max clipboard size (e.g., 100×100 tiles) to prevent memory issues?
   - Recommendation: No limit for Phase 35. Map is fixed 256×256, so max clipboard is 131 KB (negligible). Add limit only if users report performance issues.

3. **How to handle paste between maps with different tilesets?**
   - What we know: XDOC-01 requires paste to work across documents. If map A uses tileset1.png and map B uses tileset2.png, tile IDs may not match.
   - What's unclear: Should paste remap tile IDs, or paste raw IDs (which may look wrong)?
   - Recommendation: Paste raw tile IDs (Phase 35 scope). Future requirement MDIX-03 ("Smart clipboard tileset mapping") deferred. Users opening maps with different tilesets is rare in Armor Critical workflow.

4. **Should cut operation clear the selection on source document after switching?**
   - What we know: Cut copies to clipboard and fills source area with DEFAULT_TILE (280). If user cuts from doc A, switches to doc B, and pastes, the cut area on A is already cleared.
   - What's unclear: Should cut also clear the selection marching ants on the source document?
   - Recommendation: Yes—cut should call `clearSelectionForDocument(id)` after clearing tiles. Consistent with standard editor behavior (cut removes selection).

## Sources

### Primary (HIGH confidence)
- Existing codebase: E:\NewMapEditor\src\core\editor\slices\documentsSlice.ts (lines 448-690) — clipboard actions implementation
- Existing codebase: E:\NewMapEditor\src\core\editor\slices\globalSlice.ts (lines 1-150) — global state pattern, picker tool
- Existing codebase: E:\NewMapEditor\src\core\editor\slices\types.ts (lines 34-41) — ClipboardData type definition
- Phase 33 Research: E:\NewMapEditor\.planning\phases\33-document-state-refactoring\33-RESEARCH.md — slices pattern, per-document vs global state separation

### Secondary (MEDIUM confidence)
- [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) — when to use global vs scoped state
- [Clipboard API - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) — web standard for clipboard operations (not used directly, but reference for clipboard concepts)
- [W3C Clipboard API and events](https://www.w3.org/TR/clipboard-apis/) — clipboard behavior standards

### Tertiary (LOW confidence)
- Web search results on cross-component state sharing with Zustand — general patterns, not specific to clipboard
- Web search results on multi-document editor architectures — high-level concepts, not implementation details

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zustand 4.5.7 already in use; no new dependencies
- Architecture: HIGH — Moving clipboard from documentsSlice to globalSlice is a straightforward refactor; existing code provides 240+ lines of clipboard logic to port
- Pitfalls: HIGH — All pitfalls derived from direct codebase analysis (types.ts, documentsSlice.ts, EditorState.ts backward-compat layer)

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days — stable architecture, no external dependencies changing)
