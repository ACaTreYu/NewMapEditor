# Architecture Patterns for MDI Integration

**Domain:** Electron/React tile map editor with MDI (Multiple Document Interface)
**Researched:** 2026-02-09
**Confidence:** HIGH (patterns verified across multiple sources, Monaco Editor reference architecture)

## Executive Summary

Adding MDI to the existing single-document Zustand architecture requires splitting state into **per-document state** (map data, undo/redo, viewport, selection) and **global UI state** (current tool, tile selection, UI preferences). The recommended pattern uses a **document array in Zustand** with an **active document ID** pointer, avoiding multiple store instances while maintaining the existing snapshot-commit undo pattern.

Key architectural changes:
1. **Document Manager slice** - Array of document states + active document ID
2. **State path refactoring** - All map-accessing code must go through active document selector
3. **Component isolation** - MapCanvas becomes document-scoped, tools remain global
4. **File path tracking** - Each document tracks its own file path for save operations
5. **Dirty flag per document** - Window title/tab shows modified indicator per document

## Recommended Architecture

### Document-Centric State Structure

```typescript
// Per-document state (moves INTO document array)
interface DocumentState {
  id: string;                    // Unique document ID
  map: MapData | null;           // Map tiles + header
  filePath: string | null;       // Source file path
  viewport: Viewport;            // Scroll position + zoom
  selection: Selection;          // Active tile selection
  undoStack: UndoEntry[];        // Per-document undo
  redoStack: UndoEntry[];        // Per-document redo
  pendingUndoSnapshot: Uint16Array | null;
  clipboard: ClipboardData | null; // Per-document clipboard
  isPasting: boolean;
  pastePreviewPosition: PastePreviewPosition | null;
  title: string;                 // Display name for tab
  modified: boolean;             // Dirty flag
}

// Global UI state (stays at store root)
interface EditorState {
  documents: DocumentState[];    // Array of open documents
  activeDocumentId: string | null; // Currently focused document

  // Tool state (global - applies to whichever document is active)
  currentTool: ToolType;
  previousTool: ToolType | null;
  selectedTile: number;
  tileSelection: TileSelection;
  wallType: number;
  gameObjectToolState: GameObjectToolState;
  rectDragState: RectDragState;

  // UI state (global)
  animationFrame: number;        // Drives all animation
  showGrid: boolean;
  showAnimations: boolean;
  customDatLoaded: boolean;

  // Actions
  createDocument: (title?: string) => string;  // Returns new document ID
  closeDocument: (id: string) => void;
  setActiveDocument: (id: string) => void;
  getActiveDocument: () => DocumentState | null;
  // ... existing tool actions
  // ... per-document actions now take documentId as first param
}
```

### State Access Pattern

**Current code (single document):**
```typescript
const { map, viewport } = useEditorStore(
  useShallow(state => ({ map: state.map, viewport: state.viewport }))
);
```

**New code (MDI):**
```typescript
const activeDocument = useEditorStore(state => state.getActiveDocument());
const { map, viewport } = activeDocument ?? { map: null, viewport: defaultViewport };
```

OR use a selector helper:
```typescript
const useActiveDocument = () => {
  return useEditorStore(state => state.getActiveDocument());
};
```

### Component Hierarchy Changes

```
App
├── Toolbar (global - subscribes to currentTool, selectedTile)
├── DocumentTabs (NEW)
│   └── Tab[] (one per document, shows title + modified indicator)
├── MapWindow (per-document container)
│   ├── MapCanvas (per-document, subscribes to activeDocument.map/viewport)
│   ├── Minimap (per-document, subscribes to activeDocument.map/viewport)
│   └── StatusBar (per-document, subscribes to activeDocument + global tool)
├── TilePalette (global - sets selectedTile in global state)
├── AnimationsPanel (global - sets selectedTile)
└── MapSettingsDialog (per-document, operates on activeDocument.map.header)
```

**Key insight:** MapCanvas, Minimap, and StatusBar must be **document-scoped** because they render map-specific data. Toolbar and TilePalette remain **global** because tools apply to whichever document is active.

## Integration Points

### 1. Document Manager Slice (NEW)

**Location:** `src/core/editor/DocumentManager.ts`

**Responsibilities:**
- Create/close documents
- Manage document array
- Track active document ID
- Generate unique document IDs (use `crypto.randomUUID()`)
- Handle "New Document" counter for untitled documents

**Example:**
```typescript
createDocument: (title?: string) => {
  const id = crypto.randomUUID();
  const newDoc: DocumentState = {
    id,
    map: createEmptyMap(),
    filePath: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { startX: 0, startY: 0, endX: 0, endY: 0, active: false },
    undoStack: [],
    redoStack: [],
    pendingUndoSnapshot: null,
    clipboard: null,
    isPasting: false,
    pastePreviewPosition: null,
    title: title || `Untitled ${untitledCounter++}`,
    modified: false
  };
  set(state => ({
    documents: [...state.documents, newDoc],
    activeDocumentId: id
  }));
  return id;
}
```

### 2. EditorState Refactoring (MODIFY)

**File:** `src/core/editor/EditorState.ts`

**Changes:**
- Move per-document fields into `DocumentState` interface
- Keep global fields (currentTool, selectedTile, etc.) at root
- Update all actions to take `documentId` parameter OR operate on active document
- Add `getActiveDocument()` selector

**Migration pattern:**
```typescript
// OLD: setTile(x, y, tile)
setTile: (x, y, tile) => {
  const { map } = get();
  if (!map) return;
  map.tiles[y * MAP_WIDTH + x] = tile;
  map.modified = true;
  set({ map: { ...map } });
}

// NEW: setTile operates on active document
setTile: (x, y, tile) => {
  const state = get();
  const doc = state.getActiveDocument();
  if (!doc?.map) return;

  doc.map.tiles[y * MAP_WIDTH + x] = tile;
  doc.modified = true;

  // Update document in array
  set({
    documents: state.documents.map(d =>
      d.id === doc.id ? { ...d, map: { ...doc.map } } : d
    )
  });
}
```

**Critical:** All 30+ map-mutating actions need this refactor.

### 3. MapCanvas Component (MODIFY)

**File:** `src/components/MapCanvas/MapCanvas.tsx`

**Changes:**
- Replace direct store subscriptions with `getActiveDocument()` selector
- Handle null active document (show placeholder UI)
- All tool actions must operate on active document

**Example:**
```typescript
// OLD
const { map, viewport } = useEditorStore(
  useShallow(state => ({ map: state.map, viewport: state.viewport }))
);

// NEW
const activeDoc = useEditorStore(state => state.getActiveDocument());
const { map, viewport } = activeDoc ?? { map: null, viewport: { x: 0, y: 0, zoom: 1 } };

if (!activeDoc) {
  return <div className="map-canvas-empty">No document open</div>;
}
```

### 4. Document Tabs Component (NEW)

**Location:** `src/components/DocumentTabs/DocumentTabs.tsx`

**Responsibilities:**
- Render tab for each document
- Show active tab highlight
- Display modified indicator (`*` suffix if `document.modified`)
- Handle tab click (set active document)
- Handle tab close (call closeDocument, show save prompt if modified)
- Handle middle-click to close tab (standard UX)

**Design pattern:** Similar to browser tabs or VS Code editor tabs.

**Tab rendering:**
```typescript
<div className="document-tabs">
  {documents.map(doc => (
    <div
      key={doc.id}
      className={`tab ${doc.id === activeDocumentId ? 'active' : ''}`}
      onClick={() => setActiveDocument(doc.id)}
      onMouseDown={(e) => {
        if (e.button === 1) { // Middle click
          e.preventDefault();
          closeDocument(doc.id);
        }
      }}
    >
      <span className="tab-title">
        {doc.title}{doc.modified ? '*' : ''}
      </span>
      <button
        className="tab-close"
        onClick={(e) => {
          e.stopPropagation();
          closeDocument(doc.id);
        }}
      >
        ×
      </button>
    </div>
  ))}
</div>
```

### 5. StatusBar Component (MODIFY)

**File:** `src/components/StatusBar/StatusBar.tsx`

**Changes:**
- Subscribe to active document for document-specific data (zoom, viewport)
- Subscribe to global state for tool info
- No architectural changes, just selector updates

### 6. MapSettingsDialog Component (MODIFY)

**File:** `src/components/MapSettingsDialog/MapSettingsDialog.tsx`

**Changes:**
- `updateMapHeader` action must target active document
- Settings serialization operates on `activeDocument.map.header`

### 7. File Operations (MODIFY)

**Files:** Menu handlers calling FileService

**Changes:**
- **New:** Creates new document via `createDocument()`
- **Open:** Creates new document, loads map data into it
- **Save:** Saves active document, updates its `filePath` and `modified` flag
- **Save As:** Same as Save but with file picker
- **Close:** Prompts if modified, removes document from array

**Multi-document implications:**
- Each document tracks its own `filePath`
- "Save All" command saves all modified documents (future feature)
- Window title shows active document name

## Data Flow Changes

### Single Document (Current)

```
User Action (MapCanvas)
  → Store Action (setTile)
    → Mutate state.map
      → MapCanvas re-renders (subscribes to state.map)
```

### MDI (New)

```
User Action (MapCanvas)
  → Store Action (setTile)
    → Get active document
      → Mutate activeDoc.map
        → Update document in array
          → MapCanvas re-renders (subscribes to activeDocument)
```

**Performance consideration:** Immutable document array updates means all components subscribing to `documents` array will re-render. **Solution:** Components should subscribe to `getActiveDocument()` directly, NOT the entire documents array.

## Patterns to Follow

### Pattern 1: Active Document Selector

**What:** Centralized selector for accessing active document state

**When:** Any component needs to read/write document-specific data

**Example:**
```typescript
// In EditorState.ts
getActiveDocument: () => {
  const { documents, activeDocumentId } = get();
  if (!activeDocumentId) return null;
  return documents.find(d => d.id === activeDocumentId) ?? null;
}

// In components
const activeDoc = useEditorStore(state => state.getActiveDocument());
```

**Why:** Single source of truth for "which document is active"

### Pattern 2: Document-Scoped Actions

**What:** Actions that operate on a specific document by ID

**When:** Actions need to modify document state (tiles, undo, viewport, etc.)

**Example:**
```typescript
setTileInDocument: (documentId: string, x: number, y: number, tile: number) => {
  set(state => ({
    documents: state.documents.map(doc => {
      if (doc.id !== documentId || !doc.map) return doc;
      const newMap = { ...doc.map };
      newMap.tiles = new Uint16Array(doc.map.tiles);
      newMap.tiles[y * MAP_WIDTH + x] = tile;
      newMap.modified = true;
      return { ...doc, map: newMap, modified: true };
    })
  }));
}
```

**Optimization:** Use Immer for cleaner immutable updates (optional).

### Pattern 3: Null Document Handling

**What:** Components gracefully handle no active document

**When:** All components that render document-specific data

**Example:**
```typescript
const MapCanvas = () => {
  const activeDoc = useEditorStore(state => state.getActiveDocument());

  if (!activeDoc) {
    return (
      <div className="map-canvas-empty">
        <p>No document open</p>
        <button onClick={() => useEditorStore.getState().createDocument()}>
          New Map
        </button>
      </div>
    );
  }

  // Normal rendering with activeDoc.map, activeDoc.viewport, etc.
}
```

### Pattern 4: Document Title Generation

**What:** Human-readable titles for untitled documents

**When:** Creating new documents

**Example:**
```typescript
let untitledCounter = 1;

createDocument: (filePath?: string) => {
  const title = filePath
    ? path.basename(filePath, path.extname(filePath))
    : `Untitled ${untitledCounter++}`;
  // ...
}
```

**Edge case:** If user closes "Untitled 2" but "Untitled 3" is open, next new document is "Untitled 4" (counter doesn't reset).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Multiple Zustand Stores

**What:** Creating separate store instance per document

**Why bad:** Breaks hot module reload, complicates context passing, loses global state coordination

**Instead:** Single store with document array

### Anti-Pattern 2: Global Viewport State

**What:** Keeping viewport at root level, shared across documents

**Why bad:** Switching tabs would jump viewport to arbitrary position

**Instead:** Viewport is per-document (each document remembers its own scroll/zoom)

### Anti-Pattern 3: Subscribing to Documents Array

**What:** `const documents = useEditorStore(state => state.documents);`

**Why bad:** Every document mutation triggers re-render of ALL subscribers

**Instead:** Subscribe to `getActiveDocument()` for focused data only

### Anti-Pattern 4: Synchronous Document Creation

**What:** Creating document in render cycle or as side effect of render

**Why bad:** Causes infinite render loops

**Instead:** Document creation must be user-initiated action (button click, menu command)

### Anti-Pattern 5: Direct Array Mutation

**What:**
```typescript
const doc = state.documents.find(d => d.id === id);
doc.map.tiles[0] = 123; // MUTATES ARRAY
```

**Why bad:** Zustand won't detect change, components won't re-render

**Instead:** Always create new object references for changed documents

## Scalability Considerations

### At 1 Document (Current)

| Concern | Approach |
|---------|----------|
| Memory | Single 65KB map + undo stack |
| Rendering | 4 canvases, 256x256 visible region |
| State updates | Direct mutation with snapshot |

### At 5 Documents (Typical MDI Usage)

| Concern | Approach |
|---------|----------|
| Memory | 5x 65KB maps + 5x undo stacks = ~1-2MB |
| Rendering | Only active document renders (others unmounted) |
| State updates | Immutable array updates (5-element array is negligible) |

### At 20 Documents (Heavy Usage)

| Concern | Approach |
|---------|----------|
| Memory | 20x 65KB maps + undo stacks = ~4-8MB (acceptable) |
| Rendering | Still only active document (no performance impact) |
| State updates | Array operations still O(n) but n=20 is fast |

**Conclusion:** Document array architecture scales well up to 50+ documents before memory becomes a concern.

## Build Order

Implementation phases ordered by dependency:

### Phase 1: Document Manager Foundation (No UI Changes)

1. Create `DocumentState` interface
2. Add `documents` array and `activeDocumentId` to EditorState
3. Implement `createDocument`, `closeDocument`, `setActiveDocument`, `getActiveDocument`
4. Migrate initial map loading to create first document
5. **Test:** Existing single-document flow still works

### Phase 2: State Refactoring (Breaking Changes)

6. Move per-document fields from root to `DocumentState`
7. Refactor all map-mutating actions to operate on active document
8. Update all components to use `getActiveDocument()` selector
9. **Test:** All existing features work with single document

### Phase 3: UI Components (User-Facing)

10. Create `DocumentTabs` component
11. Add tab rendering with active indicator
12. Add tab close button with save prompt
13. Wire up tab switching
14. **Test:** Can create/close/switch documents

### Phase 4: File Operations Integration

15. Update "New" menu to create new document
16. Update "Open" menu to open in new document
17. Update "Save" menu to save active document
18. Update "Close" menu to close active document (with prompt)
19. **Test:** Full file lifecycle with multiple documents

### Phase 5: Polish

20. Add keyboard shortcuts (Ctrl+W to close, Ctrl+Tab to switch)
21. Add "Close All" and "Close Others" commands
22. Add drag-to-reorder tabs (optional)
23. Persist document order on app restart (optional)

**Estimated effort:** 3-5 days (Phase 1-2: 2 days, Phase 3-4: 2 days, Phase 5: 1 day)

**Risk areas:**
- Phase 2 refactoring is tedious (30+ actions to update)
- Undo/redo must remain per-document (easy to accidentally break)
- File path tracking must be correct for save operations

## Component Isolation Strategy

### Document-Scoped Components (Must Render Per Document)

- **MapCanvas** - Renders document.map, subscribes to document.viewport
- **Minimap** - Renders document.map overview
- **StatusBar** - Shows document zoom, cursor position (but also global tool)
- **MapWindow** - Container that may hide inactive documents

**Mounting strategy:** Only active document's components are mounted (others unmounted to save resources).

### Global Components (Shared Across All Documents)

- **Toolbar** - Tool selection applies to whichever document is active
- **TilePalette** - Tile selection applies to active document when drawing
- **AnimationsPanel** - Animation data is global (loaded once, applies to all documents)
- **MapSettingsDialog** - Modal that operates on active document when shown

**State coordination:** Global tool state (currentTool, selectedTile) applies to active document's operations.

## File Path Tracking

### Requirements

1. Each document tracks its own `filePath` (string | null)
2. Untitled documents have `filePath = null`
3. "Save" writes to `document.filePath` (error if null, fallback to Save As)
4. "Save As" updates `document.filePath` after successful write
5. "Open" sets `filePath` when loading
6. Tab title derives from `filePath` (basename) or "Untitled N"

### Window Title Pattern

**Single document:** `AC Map Editor - [filename]`
**MDI:** `AC Map Editor - [active_document_filename]`

Modified indicator: `AC Map Editor - [filename]*`

### Save Prompts

**Close document:** "Save changes to [filename]?" → Yes/No/Cancel
**Close all:** "Save changes to 3 documents?" → Save All/Discard All/Cancel
**Quit app:** "Save changes to 3 documents?" → Save All/Discard All/Cancel

## Monaco Editor Reference Pattern

VS Code's Monaco Editor uses a similar architecture for multi-file editing:

1. **Single editor instance** - One `monaco.editor.IStandaloneCodeEditor`
2. **Multiple text models** - One `monaco.editor.ITextModel` per file
3. **Model switching** - `editor.setModel(model)` on tab change
4. **View state preservation** - `editor.saveViewState()` and `restoreViewState()` per model

**Parallel in map editor:**
- Single MapCanvas instance (or one per document, unmounted when not active)
- Multiple `DocumentState` objects (one per map)
- Active document pointer switches on tab change
- Viewport per document preserves scroll/zoom

**Key difference:** Monaco shares a single editor DOM element across models. Map editor can either (A) unmount/remount MapCanvas on switch, or (B) keep one MapCanvas and swap its data source. **Recommendation:** (A) is simpler and avoids stale closure issues.

## Comparison: Architecture Options

### Option A: Document Array (Recommended)

**Structure:** Single Zustand store with `documents: DocumentState[]`

**Pros:**
- Simple mental model
- Easy to implement document operations (close, switch, reorder)
- Familiar pattern from Zustand documentation
- No context complexity

**Cons:**
- Immutable array updates (negligible for <50 documents)
- All map-mutating actions need refactor

### Option B: Multiple Store Instances

**Structure:** Create new Zustand store per document via `create()`

**Pros:**
- Per-document state is truly isolated
- No refactoring of actions needed

**Cons:**
- Context provider hell (one per document)
- Global state coordination is hard (which store is active?)
- Breaks HMR (hot module reload)
- NOT recommended by Zustand maintainers

### Option C: Slices Pattern

**Structure:** Separate slice per document, merged into root store

**Pros:**
- Modular organization

**Cons:**
- Dynamic slices (documents created at runtime) don't fit pattern
- Slices pattern is for static feature modules, not dynamic entities
- More complex than Option A with no benefits

**Verdict:** Option A (Document Array) is the clear winner.

## Sources

Research for this architecture was informed by:

- [Working with Zustand | TkDodo's blog](https://tkdodo.eu/blog/working-with-zustand) - Best practices for Zustand state management
- [Zustand multiple documents discussion](https://github.com/pmndrs/zustand/discussions/2496) - When to use multiple stores vs single store
- [Zustand array handling](https://github.com/pmndrs/zustand/discussions/1370) - Best practices for large state arrays
- [Monaco Editor multiple tabs](https://github.com/suren-atoyan/monaco-react/issues/148) - Reference architecture for multi-document editors
- [Monaco Editor tabs implementation](https://github.com/microsoft/monaco-editor/issues/604) - Model switching pattern for multi-file editing
- [React Tabs component patterns](https://dev.to/josephciullo/mastering-react-design-patterns-creating-a-tabs-component-1lem) - Compound component patterns for tab interfaces
- [MDI overview](https://en.wikipedia.org/wiki/Multiple-document_interface) - General MDI architecture patterns
- [State Management in 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Modern React state management patterns
- [Zustand Architecture Patterns at Scale](https://brainhub.eu/library/zustand-architecture-patterns-at-scale) - Scaling Zustand applications

**Confidence:** HIGH - Patterns are well-established in modern React applications (VS Code, CodeSandbox, etc.) and Zustand documentation explicitly supports array-based document management.
