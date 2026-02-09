# Phase 33: Document State Refactoring - Research

**Researched:** 2026-02-09
**Domain:** Multi-document state management with Zustand
**Confidence:** HIGH

## Summary

This phase refactors the single-document Zustand store into a multi-document architecture where each open map has independent state (tiles, undo/redo, viewport, selection, dirty flag) while global UI state (active tool, tileset selection, animation frame) remains shared. The established pattern combines Zustand's slices pattern for organizing state domains with a document map keyed by document ID. No MDI UI is built in this phase—only the state foundation.

The current EditorState.ts (861 lines) mixes per-document concerns (map data, undo stacks, viewport, selection) with global concerns (currentTool, selectedTile, showGrid). The refactoring separates these into distinct slices: a `documentsSlice` managing a Map<documentId, DocumentState>, a `globalSlice` for shared UI state, and an `activeDocumentId` pointer. All existing components access state through the same `useEditorStore` hook—backwards compatibility is maintained by providing selectors that target the active document.

**Primary recommendation:** Use Zustand slices pattern with a central document map. Global state stays global, per-document state moves into a `documents: Map<string, DocumentState>` structure, and an `activeDocumentId` pointer tracks the current document. Existing components continue using `useEditorStore` with minimal changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Document model shape:**
- **Per-document state:** map data (tile grid), viewport position, zoom level, selection (marquee area), undo/redo stacks, file path, modified/dirty flag, map settings
- **Global state (shared across all docs):** active tool (DRAW, FILL, SELECT, etc.), selected tile(s) in tileset palette, animation frame counter, panel visibility/sizes, UI preferences
- Switching documents does NOT change your current tool or tileset brush — those persist globally

**Active document switching:**
- Minimap updates instantly to reflect the active document's map and viewport
- Title bar shows the active document's filename and modified state (e.g., "mymap.lvl *")
- Selection visuals (marching ants) resume when switching to a doc with an active selection — Claude's discretion on exact behavior
- Settings dialog state (open/closed, active tab) — Claude's discretion on whether global or per-document

**Document lifecycle:**
- App starts with an empty workspace (no documents open), NOT a blank untitled map
- File > New creates a new untitled document alongside existing open documents
- File > Open opens the file as a new document alongside existing ones
- No hard limit on open documents — let users open as many as they want
- Closing a modified document shows classic 3-button dialog: Save / Don't Save / Cancel

**Undo/redo isolation:**
- Each document has its own independent undo/redo stack
- Fixed undo history limit per document (e.g., 100 entries) — oldest entries dropped when exceeded
- Undo scope is data only — tile placements, fills, pastes, map settings changes. Viewport/zoom changes are NOT undoable
- Ctrl+Z always applies to the currently active document
- Saving does NOT clear undo history — user can undo past the last save point

### Claude's Discretion

- Internal architecture for the document store (map of document IDs, slices, etc.)
- How to migrate existing single-doc actions to per-document pattern
- Marching ants resume behavior on document switch
- Settings dialog state scope (global vs per-document)
- Canvas context management strategy for many open documents

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.5.7 | State management | Already in use; supports slices pattern, no provider wrapping needed |
| zustand/react/shallow | 4.5.7 | Shallow equality for multi-field selectors | Already used throughout codebase (MapCanvas.tsx, etc.) |
| TypeScript | (current) | Type safety | Strict mode enabled (Phase 32), zero-error baseline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.randomUUID() | Browser API | Generate document IDs | Guaranteed unique IDs for new documents |
| Map<string, T> | Built-in | Document storage | Better iteration and has() checks than plain objects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand slices | Zustand Context pattern (createStore + useStore) | Context pattern creates per-component-tree instances; we need ONE global store with multiple documents, not multiple store instances |
| Map<id, doc> | Array of documents | Map gives O(1) lookup by ID; array requires find() |
| Single store with slices | Multiple independent stores | Single store keeps all state in one place; multiple stores complicate cross-slice access |

**Installation:**
```bash
# No new packages needed—Zustand 4.5.7 already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/core/editor/
├── EditorState.ts           # Main store: combines slices
├── slices/
│   ├── documentsSlice.ts    # Per-document state (map, undo, viewport, selection)
│   ├── globalSlice.ts       # Shared UI state (tool, tileset, animation, grid)
│   └── types.ts             # Shared types (DocumentState, DocumentId, etc.)
└── selectors/
    ├── documentSelectors.ts # Derived state (active doc helpers, canUndo/Redo)
    └── index.ts             # Re-exports
```

### Pattern 1: Slices Pattern for State Organization

**What:** Split a large Zustand store into smaller "slices" representing distinct state domains, then merge them into a single store.

**When to use:** When state has natural boundaries (per-document vs. global, or different feature areas).

**Example:**
```typescript
// slices/documentsSlice.ts
import { StateCreator } from 'zustand';
import { DocumentState, DocumentId } from './types';

export interface DocumentsSlice {
  documents: Map<DocumentId, DocumentState>;
  activeDocumentId: DocumentId | null;

  createDocument: (map: MapData, filePath?: string) => DocumentId;
  closeDocument: (id: DocumentId) => void;
  setActiveDocument: (id: DocumentId) => void;
  updateDocument: (id: DocumentId, updates: Partial<DocumentState>) => void;
}

export const createDocumentsSlice: StateCreator<
  DocumentsSlice & GlobalSlice, // Full store type
  [],
  [],
  DocumentsSlice
> = (set, get) => ({
  documents: new Map(),
  activeDocumentId: null,

  createDocument: (map, filePath) => {
    const id = crypto.randomUUID();
    const doc: DocumentState = {
      map,
      filePath: filePath || null,
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
      undoStack: [],
      redoStack: [],
      pendingUndoSnapshot: null,
      // ... other per-doc state
    };
    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.set(id, doc);
      return { documents: newDocs, activeDocumentId: id };
    });
    return id;
  },

  closeDocument: (id) => {
    set((state) => {
      const newDocs = new Map(state.documents);
      newDocs.delete(id);
      const newActiveId = state.activeDocumentId === id
        ? (newDocs.size > 0 ? newDocs.keys().next().value : null)
        : state.activeDocumentId;
      return { documents: newDocs, activeDocumentId: newActiveId };
    });
  },

  // ... other actions
});
```

```typescript
// slices/globalSlice.ts
export interface GlobalSlice {
  currentTool: ToolType;
  previousTool: ToolType | null;
  selectedTile: number;
  tileSelection: TileSelection;
  animationFrame: number;
  showGrid: boolean;
  showAnimations: boolean;

  setTool: (tool: ToolType) => void;
  setSelectedTile: (tile: number) => void;
  advanceAnimationFrame: () => void;
  // ... other global actions
}

export const createGlobalSlice: StateCreator<
  DocumentsSlice & GlobalSlice,
  [],
  [],
  GlobalSlice
> = (set) => ({
  currentTool: ToolType.PENCIL,
  previousTool: null,
  selectedTile: DEFAULT_TILE,
  tileSelection: { startCol: 0, startRow: 7, width: 1, height: 1 },
  animationFrame: 0,
  showGrid: false,
  showAnimations: true,

  setTool: (tool) => set((state) => ({
    currentTool: tool,
    previousTool: tool === ToolType.PICKER ? state.currentTool : state.previousTool
  })),

  // ... other global actions
});
```

```typescript
// EditorState.ts
import { create } from 'zustand';
import { createDocumentsSlice, DocumentsSlice } from './slices/documentsSlice';
import { createGlobalSlice, GlobalSlice } from './slices/globalSlice';

type EditorState = DocumentsSlice & GlobalSlice;

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createDocumentsSlice(...a),
  ...createGlobalSlice(...a),
}));
```

**Source:** [Zustand Slices Pattern Documentation](https://zustand.docs.pmnd.rs/guides/slices-pattern)

### Pattern 2: Document ID Generation

**What:** Use `crypto.randomUUID()` to generate unique document IDs.

**When to use:** When creating new documents that need stable identifiers for the lifetime of the application session.

**Example:**
```typescript
createDocument: (map, filePath) => {
  const id = crypto.randomUUID(); // e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  // ... create document with this ID
  return id;
}
```

**Why:** UUIDs are guaranteed unique, work in all modern browsers, and avoid collision issues with sequential IDs or timestamps.

### Pattern 3: Map<string, T> for Document Storage

**What:** Use JavaScript `Map` instead of plain objects for storing documents by ID.

**When to use:** When you need frequent lookups, iterations, and size checks on a collection keyed by string IDs.

**Example:**
```typescript
interface DocumentsSlice {
  documents: Map<DocumentId, DocumentState>;

  getDocument: (id: DocumentId) => DocumentState | undefined {
    return get().documents.get(id);
  }

  hasDocument: (id: DocumentId) => boolean {
    return get().documents.has(id);
  }

  getAllDocuments: () => DocumentState[] {
    return Array.from(get().documents.values());
  }
}
```

**Why:**
- O(1) lookups with `.get(id)`
- O(1) checks with `.has(id)`
- Easy iteration with `.values()`, `.keys()`, `.entries()`
- Built-in `.size` property
- Cleaner than `Object.keys()` and bracket notation

### Pattern 4: Backwards-Compatible Selectors

**What:** Provide helper selectors that make the active document's state look like the old single-document structure.

**When to use:** To minimize breaking changes in existing components during refactoring.

**Example:**
```typescript
// selectors/documentSelectors.ts
import { useEditorStore } from '../EditorState';
import { useShallow } from 'zustand/react/shallow';

/** Get the active document's map data (null if no active doc) */
export const useActiveMap = () => useEditorStore((state) => {
  const doc = state.activeDocumentId ? state.documents.get(state.activeDocumentId) : null;
  return doc?.map || null;
});

/** Get the active document's viewport */
export const useActiveViewport = () => useEditorStore((state) => {
  const doc = state.activeDocumentId ? state.documents.get(state.activeDocumentId) : null;
  return doc?.viewport || { x: 0, y: 0, zoom: 1 };
});

/** Get multiple active document fields with shallow equality */
export const useActiveDocument = () => useEditorStore(
  useShallow((state) => {
    const doc = state.activeDocumentId ? state.documents.get(state.activeDocumentId) : null;
    return {
      map: doc?.map || null,
      viewport: doc?.viewport || { x: 0, y: 0, zoom: 1 },
      selection: doc?.selection || { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
      filePath: doc?.filePath || null,
    };
  })
);

/** Check if active document can undo (reactive selector) */
export const useCanUndo = () => useEditorStore((state) => {
  const doc = state.activeDocumentId ? state.documents.get(state.activeDocumentId) : null;
  return doc ? doc.undoStack.length > 0 : false;
});
```

**Why:** Components like `MapCanvas.tsx` currently do `const map = useEditorStore(state => state.map)`. With selectors, migration becomes `const map = useActiveMap()` instead of refactoring all the component logic.

### Pattern 5: Immutable Updates for Map<T> in Zustand

**What:** Always create a new Map when updating documents to ensure Zustand detects changes.

**When to use:** Every time you modify the `documents` Map.

**Example:**
```typescript
updateDocument: (id, updates) => {
  set((state) => {
    const doc = state.documents.get(id);
    if (!doc) return state;

    const newDocs = new Map(state.documents); // Shallow copy Map
    newDocs.set(id, { ...doc, ...updates }); // Update doc immutably
    return { documents: newDocs };
  });
}
```

**Why:** Zustand relies on reference equality. If you mutate the Map in place (`state.documents.set(id, ...)`), Zustand won't trigger re-renders. Creating a new Map ensures subscribers see the change.

### Pattern 6: Two-Phase Commit for Undo (Existing Pattern)

**What:** Use `pushUndo()` to snapshot state before changes, then `commitUndo(description)` after changes to create delta-based undo entry.

**When to use:** Already used in the codebase (Phase 25). Migrate to per-document undo stacks.

**Example:**
```typescript
// Before (single-doc):
get().pushUndo();
get().setTiles([...]);
get().commitUndo('Paint tiles');

// After (multi-doc): Same API, but actions work on active document
const docId = get().activeDocumentId;
if (!docId) return;
get().pushUndoForDocument(docId);
get().setTilesForDocument(docId, [...]);
get().commitUndoForDocument(docId, 'Paint tiles');
```

**Why:** Existing pattern is proven and efficient (delta-based undo with snapshot-commit). Just scope it per-document instead of global.

### Anti-Patterns to Avoid

- **Storing activeDocument as a reference:** Don't do `activeDocument: DocumentState | null`. Store `activeDocumentId: string | null` and look up the document in the Map. Otherwise, updates to the document won't propagate to activeDocument.

- **Mutating Map in place:** `state.documents.set(id, doc)` without creating a new Map breaks Zustand reactivity.

- **Creating new store instances:** This phase refactors ONE global store, not creating multiple store instances with Context. The Zustand Context pattern (createStore + useStore) is for per-component-tree state; we need a single global store managing multiple documents.

- **Copying entire undo stacks unnecessarily:** When updating a document, shallow-copy the document object but keep undo stack references intact unless actually modifying the stack.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Document ID generation | Sequential counters, timestamps | `crypto.randomUUID()` | Guaranteed uniqueness, no collision risk, built-in browser API |
| Deep equality checks for selectors | Custom object comparison | `useShallow` from zustand/react/shallow | Already used in codebase, handles nested objects correctly |
| Undo history limit management | Manual array slicing | Bounded array with shift() | Simple, clear intent: `if (stack.length > maxLevels) stack.shift()` |
| State update batching | Custom debounce/throttle for every action | Zustand's built-in batching | Zustand already batches updates within the same tick |
| Document dirty flag tracking | Manual boolean flipping on every action | Set `modified: true` in document update actions | Explicit, auditable, no magic |

**Key insight:** Zustand's simplicity is a feature. The slices pattern provides just enough structure to organize state without introducing Redux-level boilerplate. Avoid over-engineering with custom middleware or complex architectures—the standard patterns are proven and sufficient.

## Common Pitfalls

### Pitfall 1: Forgetting to Update activeDocumentId When Closing Active Document

**What goes wrong:** User closes the active document, but `activeDocumentId` still points to the deleted document ID. All actions fail silently or throw errors.

**Why it happens:** The `closeDocument` action deletes the document but doesn't update `activeDocumentId` to a valid document or `null`.

**How to avoid:** Always check if the closed document is active. If so, set `activeDocumentId` to the first remaining document (or `null` if none exist).

**Warning signs:** After closing a document, the minimap is blank, undo/redo stops working, and console shows "document not found" warnings.

**Example fix:**
```typescript
closeDocument: (id) => {
  set((state) => {
    const newDocs = new Map(state.documents);
    newDocs.delete(id);

    // If we closed the active doc, switch to another or null
    const newActiveId = state.activeDocumentId === id
      ? (newDocs.size > 0 ? newDocs.keys().next().value : null)
      : state.activeDocumentId;

    return { documents: newDocs, activeDocumentId: newActiveId };
  });
}
```

### Pitfall 2: Map Updates Don't Trigger Re-Renders

**What goes wrong:** You update a document with `state.documents.set(id, newDoc)` but components don't re-render.

**Why it happens:** Zustand uses shallow equality on the state object. Mutating a Map in place doesn't change the Map reference, so Zustand thinks nothing changed.

**How to avoid:** Always create a new Map: `new Map(state.documents)`, then mutate the copy.

**Warning signs:** State updates appear to work in Redux DevTools, but UI doesn't reflect changes.

**Example fix:**
```typescript
// WRONG:
set((state) => {
  state.documents.set(id, { ...doc, modified: true });
  return state; // Same Map reference = no re-render
});

// RIGHT:
set((state) => {
  const newDocs = new Map(state.documents);
  newDocs.set(id, { ...state.documents.get(id), modified: true });
  return { documents: newDocs }; // New Map reference = re-render
});
```

### Pitfall 3: Undo History Grows Without Bound

**What goes wrong:** After prolonged editing, undo stacks consume gigabytes of memory, causing performance degradation or crashes.

**Why it happens:** Forgot to enforce `maxUndoLevels` limit by dropping oldest entries when stack exceeds threshold.

**How to avoid:** In `commitUndo`, check stack length and shift oldest entry if exceeded.

**Warning signs:** Memory usage climbs steadily over time; app slows down after many edits; browser tab crashes with "out of memory" error.

**Example fix:**
```typescript
commitUndoForDocument: (id, description) => {
  set((state) => {
    const doc = state.documents.get(id);
    if (!doc || !doc.pendingUndoSnapshot) return state;

    // ... build deltas ...

    const newStack = [...doc.undoStack, entry];
    if (newStack.length > state.maxUndoLevels) {
      newStack.shift(); // Drop oldest entry
    }

    const newDocs = new Map(state.documents);
    newDocs.set(id, { ...doc, undoStack: newStack, redoStack: [] });
    return { documents: newDocs };
  });
}
```

### Pitfall 4: Actions Operate on Wrong Document After Fast Switching

**What goes wrong:** User clicks document A, then quickly clicks document B before A's action completes. Action applies to B instead of A.

**Why it happens:** Action reads `activeDocumentId` at execution time instead of capturing it at invocation time.

**How to avoid:** For async actions or actions that could race, capture `activeDocumentId` at the start of the action.

**Warning signs:** Undo/redo sometimes affects the wrong document; tiles appear in unexpected maps; console shows "document mismatch" errors.

**Example fix:**
```typescript
// WRONG:
setTile: (x, y, tile) => {
  // ... some async work or delay ...
  const docId = get().activeDocumentId; // Could have changed by now!
  const doc = get().documents.get(docId);
  // ... apply tile to doc
}

// RIGHT:
setTile: (x, y, tile) => {
  const docId = get().activeDocumentId; // Capture immediately
  if (!docId) return;
  // ... rest of action uses docId, not get().activeDocumentId
}
```

### Pitfall 5: Canvas Memory Leaks with Many Open Documents

**What goes wrong:** Opening 10+ documents causes browser memory to balloon; closing documents doesn't free memory; performance degrades over time.

**Why it happens:** Canvas contexts are not garbage collected if references persist. Each document may hold references to canvas ImageData, tile arrays, or animation frames.

**How to avoid:**
1. Only the active document needs a canvas context. Inactive documents can store tile data only.
2. When switching away from a document, release heavy resources (ImageData snapshots, etc.).
3. Use WeakMap for canvas context caching if needed.

**Warning signs:** Memory usage climbs with each opened document; closing documents doesn't reduce memory; browser DevTools show retained ImageData objects.

**Example fix:**
```typescript
// In document state, avoid storing ImageData or canvas contexts directly.
// Instead, render on-demand when document becomes active.
// For inactive documents, store only the tile grid (Uint16Array).

// MapCanvas.tsx should check if the document is active before allocating resources:
useEffect(() => {
  if (!map || !isActiveDocument) {
    // Release canvas resources for inactive documents
    return;
  }
  // Render active document
}, [map, isActiveDocument]);
```

### Pitfall 6: Dirty Flag Not Updated on All State Changes

**What goes wrong:** User makes changes (paste, fill, settings update) but title bar doesn't show asterisk (*) indicating unsaved changes.

**Why it happens:** Some actions modify document state but forget to set `modified: true`.

**How to avoid:** Every action that changes map data, settings, or anything saveable must set the dirty flag. Audit all document update actions.

**Warning signs:** After editing, "Save" command is disabled or doesn't prompt on close; users lose work because app didn't warn about unsaved changes.

**Example fix:**
```typescript
// Audit all actions that modify document state:
setTilesForDocument: (id, tiles) => {
  const doc = get().documents.get(id);
  if (!doc) return;

  // ... apply tiles ...

  const newDocs = new Map(get().documents);
  newDocs.set(id, { ...doc, modified: true }); // Always set dirty flag
  set({ documents: newDocs });
}
```

## Code Examples

Verified patterns from research and existing codebase:

### Creating a New Document

```typescript
// From documentsSlice.ts
createDocument: (map: MapData, filePath?: string) => {
  const id = crypto.randomUUID();
  const doc: DocumentState = {
    map,
    filePath: filePath || null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
    clipboard: null,
    isPasting: false,
    pastePreviewPosition: null,
    undoStack: [],
    redoStack: [],
    pendingUndoSnapshot: null,
    // ... other per-doc state from current EditorState
  };

  set((state) => {
    const newDocs = new Map(state.documents);
    newDocs.set(id, doc);
    return { documents: newDocs, activeDocumentId: id };
  });

  return id;
}
```

### Switching Active Document

```typescript
setActiveDocument: (id: DocumentId) => {
  const state = get();
  if (!state.documents.has(id)) {
    console.warn(`Document ${id} not found`);
    return;
  }
  set({ activeDocumentId: id });
}
```

### Updating Document State (Immutable Pattern)

```typescript
setTilesForDocument: (id: DocumentId, tiles: Array<{ x: number; y: number; tile: number }>) => {
  const doc = get().documents.get(id);
  if (!doc) return;

  // Apply tile changes to map
  const newMap = { ...doc.map };
  for (const { x, y, tile } of tiles) {
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      newMap.tiles[y * MAP_WIDTH + x] = tile;
    }
  }

  // Update document immutably
  const newDocs = new Map(get().documents);
  newDocs.set(id, {
    ...doc,
    map: { ...newMap, modified: true }
  });

  set({ documents: newDocs });
}
```

### Per-Document Undo with History Limit

```typescript
commitUndoForDocument: (id: DocumentId, description: string) => {
  const state = get();
  const doc = state.documents.get(id);
  if (!doc || !doc.pendingUndoSnapshot) return;

  // Build deltas (existing pattern from Phase 25)
  const deltas: TileDelta[] = [];
  for (let i = 0; i < doc.map.tiles.length; i++) {
    if (doc.map.tiles[i] !== doc.pendingUndoSnapshot[i]) {
      deltas.push({
        x: i % MAP_WIDTH,
        y: Math.floor(i / MAP_WIDTH),
        oldValue: doc.pendingUndoSnapshot[i],
        newValue: doc.map.tiles[i]
      });
    }
  }

  if (deltas.length === 0) {
    // No changes — don't create empty undo entry
    const newDocs = new Map(state.documents);
    newDocs.set(id, { ...doc, pendingUndoSnapshot: null });
    set({ documents: newDocs });
    return;
  }

  const entry: UndoEntry = { deltas, description };
  const newStack = [...doc.undoStack, entry];

  // Enforce history limit (user decision: 100 entries)
  if (newStack.length > state.maxUndoLevels) {
    newStack.shift(); // Drop oldest
  }

  const newDocs = new Map(state.documents);
  newDocs.set(id, {
    ...doc,
    undoStack: newStack,
    redoStack: [], // Clear redo on new action
    pendingUndoSnapshot: null
  });

  set({ documents: newDocs });
}
```

### Backwards-Compatible Wrapper for Existing Actions

```typescript
// Wrapper that makes per-document actions look like old single-doc API
setTile: (x: number, y: number, tile: number) => {
  const docId = get().activeDocumentId;
  if (!docId) return;
  get().setTilesForDocument(docId, [{ x, y, tile }]);
}

pushUndo: () => {
  const docId = get().activeDocumentId;
  if (!docId) return;
  get().pushUndoForDocument(docId);
}

commitUndo: (description: string) => {
  const docId = get().activeDocumentId;
  if (!docId) return;
  get().commitUndoForDocument(docId, description);
}
```

### Component Migration Example (MapCanvas.tsx)

```typescript
// BEFORE (Phase 32):
const { map, viewport } = useEditorStore(
  useShallow((state) => ({ map: state.map, viewport: state.viewport }))
);

// AFTER (Phase 33) — Option 1: Direct selector
const { map, viewport } = useEditorStore(
  useShallow((state) => {
    const doc = state.activeDocumentId ? state.documents.get(state.activeDocumentId) : null;
    return {
      map: doc?.map || null,
      viewport: doc?.viewport || { x: 0, y: 0, zoom: 1 }
    };
  })
);

// AFTER (Phase 33) — Option 2: Helper hook (cleaner)
const { map, viewport } = useActiveDocument();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single global map state | Map of documents by ID | Zustand 4.x era (2023+) | Enables MDI, per-document undo, cleaner state boundaries |
| Plain objects for collections | Map<K, V> for keyed data | ES6 (2015), widely adopted 2020+ | Better performance, cleaner API, built-in size property |
| Redux slices (combineReducers) | Zustand slices pattern | Zustand 3.x+ (2021+) | No boilerplate, no actions/reducers split, same store benefits |
| createContext from zustand/context | Slices pattern for multiple concerns | Zustand 4.x (deprecated createContext) | Context pattern for per-tree instances; slices for organizing single store |

**Deprecated/outdated:**
- **zustand/context (createContext):** Deprecated in Zustand 4.x. Use vanilla `createStore` + React Context if per-component-tree instances are needed. For this phase, we don't need that—we need one global store with slices.
- **Storing documents as array:** Replaced by `Map<id, doc>` for O(1) lookups.

## Open Questions

1. **Canvas Context Management for Inactive Documents**
   - What we know: React-based canvas apps can leak memory if contexts aren't released. Search results suggest rendering inactive documents on-demand rather than maintaining contexts for all open docs.
   - What's unclear: Should we render all documents' canvases but hide inactive ones (simple but memory-heavy), or only render the active document (efficient but requires re-render on switch)?
   - Recommendation: Start with "only render active document" approach. MapCanvas.tsx already re-renders on map changes; switching documents triggers the same re-render path. Measure performance with 10+ open documents and optimize if needed.

2. **Settings Dialog State Scope**
   - What we know: User marked as "Claude's discretion." Options: global (dialog state shared across docs) or per-document (each doc remembers which tab was open).
   - What's unclear: User preference not specified.
   - Recommendation: Make settings dialog state **global** (simpler). When user opens settings for document A, switches to document B, and closes the dialog, it's less confusing if the dialog state is shared. Per-document dialog state adds complexity with minimal UX benefit.

3. **Marching Ants Resume Behavior on Document Switch**
   - What we know: User wants marching ants to resume when switching to a doc with an active selection. Each document already stores its own selection state.
   - What's unclear: Should the animation offset reset (marching ants start from beginning) or continue (animation phase persists across switches)?
   - Recommendation: **Reset animation offset** on document switch. Simpler implementation, and users don't notice a brief reset. Persisting animation phase requires storing offset in document state (adds complexity for negligible UX gain).

4. **Empty Workspace vs. Blank Untitled Document on Startup**
   - What we know: User decision is "app starts with an empty workspace (no documents open)."
   - What's unclear: What does App.tsx render when `activeDocumentId` is null? Blank canvas? Welcome screen?
   - Recommendation: Render a **blank/disabled canvas** with a message like "No document open. Use File > New or File > Open." Phase 34 (MDI UI) will add a proper welcome screen; for now, a simple placeholder is sufficient.

## Sources

### Primary (HIGH confidence)
- Zustand Slices Pattern: [Official Documentation](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- Zustand GitHub Discussions: [Multi-store vs. Slices](https://github.com/pmndrs/zustand/discussions/2496)
- MDN Web Docs: [crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- MDN Web Docs: [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- Existing codebase: E:\NewMapEditor\src\core\editor\EditorState.ts (861 lines, Phase 25 undo pattern)

### Secondary (MEDIUM confidence)
- TkDodo's Blog: [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) — explains when to use Context pattern vs. global store
- GitHub Discussion: [Global vs Scoped Store in Zustand](https://github.com/pmndrs/zustand/discussions/2772)
- Cloudscape Design: [Unsaved Changes Pattern](https://cloudscape.design/patterns/general/unsaved-changes/)
- Dev.to: [Canvas Performance Engineering](https://dev.to/shivuser/how-we-made-our-canvas-application-30x-faster-a-deep-dive-into-performance-engineering-2f8p)
- Redux Docs: [Implementing Undo History](https://redux.js.org/usage/implementing-undo-history) — undo pattern principles (framework-agnostic)
- Atlys Engineering: [Slice-Based Zustand Store for Next.js](https://engineering.atlys.com/a-slice-based-zustand-store-for-next-js-14-and-typescript-6b92385a48f5)

### Tertiary (LOW confidence)
- WebSearch results on "multi-document editor state management" — general patterns, not Zustand-specific
- WebSearch results on "Electron title bar dirty flag" — custom title bar libraries, not state management

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zustand 4.5.7 already in use; slices pattern is documented and proven
- Architecture: HIGH — Slices pattern + Map<id, doc> is standard Zustand approach; existing codebase provides 861 lines of reference implementation for per-document actions
- Pitfalls: MEDIUM-HIGH — Common pitfalls identified from search results (Map reactivity, undo limits, memory leaks) and existing codebase patterns (delta-based undo, snapshot-commit)

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days — Zustand is stable, patterns unlikely to change rapidly)
