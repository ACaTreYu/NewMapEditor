# Phase 34: MDI Window Management - Research

**Researched:** 2026-02-09
**Domain:** Multiple Document Interface (MDI) with draggable/resizable child windows in React
**Confidence:** MEDIUM-HIGH

## Summary

Phase 34 adds visual MDI window management on top of the multi-document state foundation completed in Phase 33. Users will see multiple map windows simultaneously, each with independent drag, resize, and arrangement capabilities. The workspace becomes a container for 1-N child windows, each rendering a MapCanvas for a specific document. The minimap, settings panel, and tools reflect whichever window is currently focused (active).

The challenge lies in choosing an appropriate React window management library. Three viable options emerged: **react-rnd** (low-level primitives for draggable/resizable divs), **react-mosaic** (tiling window manager with binary tree layout), and **FlexLayout** (tabbed docking manager with popout support). React-rnd offers maximum control but requires implementing tile/cascade algorithms manually. React-mosaic provides tiling but lacks free-form positioning. FlexLayout excels at tabbed layouts but adds complexity for child-window semantics.

Given the requirement for "move and resize child windows freely within the workspace" and "tile/cascade commands," **react-rnd** is recommended as the standard stack. It provides draggable/resizable primitives without imposing a rigid layout system, letting us implement classic MDI behaviors (cascade offset, tile grid calculation, z-order management) explicitly. The trade-off: we hand-roll tile/cascade logic instead of inheriting it from a framework.

**Primary recommendation:** Use react-rnd for draggable/resizable child windows, implement classic MDI window arrangement algorithms (cascade with 40px offsets, tile with equal divisions), manage z-index in Zustand for focus/raise, and enforce a document limit (max 8 open) to avoid canvas context exhaustion.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-rnd | 10.4.2 | Draggable/resizable component | Lightweight, TypeScript-ready, supports bounds/grid, 4.3k stars, active maintenance |
| Zustand | 4.5.7 | Window state (position, size, z-index) | Already in use for document state; natural extension for window metadata |
| CSS z-index | Native | Window stacking order | Built-in browser capability; increment on focus |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MapCanvas (existing) | Current | Per-window map rendering | One MapCanvas per window, keyed by documentId |
| Window menu (native) | Electron Menu API | Tile/Cascade/ArrangeIcons commands | Existing menu infrastructure from Phase 16 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-rnd | react-mosaic | Mosaic forces tiling layout; no free-form positioning; overkill for MDI semantics |
| react-rnd | FlexLayout | Tab-focused (not child windows); adds tabset/border complexity; user explicitly rejected "tabbed document interface" |
| react-rnd | GoldenLayout | Older library (last major update 2020); heavyweight for our needs; React integration via wrapper |
| Manual z-index | window.focus() API | No browser window API for child divs; must track z-index ourselves |

**Installation:**
```bash
npm install react-rnd
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── Workspace/
│   ├── Workspace.tsx         # MDI workspace container (renders child windows)
│   ├── ChildWindow.tsx       # Draggable/resizable window wrapper using react-rnd
│   └── Workspace.css         # Window chrome styling (title bar, borders, buttons)
src/core/editor/
├── slices/
│   ├── windowSlice.ts        # Window metadata (position, size, z-index per document)
│   └── windowArrangement.ts  # Tile/cascade algorithms
```

### Pattern 1: Child Window with react-rnd

**What:** Wrap each document's MapCanvas in a ChildWindow component that uses react-rnd for drag/resize.

**When to use:** For each open document, render one ChildWindow.

**Example:**
```typescript
// components/Workspace/ChildWindow.tsx
import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useEditorStore } from '@core/editor';
import { MapCanvas } from '@components/MapCanvas/MapCanvas';

interface ChildWindowProps {
  documentId: string;
  tilesetImage: HTMLImageElement | null;
}

export const ChildWindow: React.FC<ChildWindowProps> = ({ documentId, tilesetImage }) => {
  const windowState = useEditorStore((state) => state.windowStates.get(documentId));
  const isActive = useEditorStore((state) => state.activeDocumentId === documentId);
  const setActiveDocument = useEditorStore((state) => state.setActiveDocument);
  const updateWindowState = useEditorStore((state) => state.updateWindowState);
  const closeDocument = useEditorStore((state) => state.closeDocument);

  const handleFocus = useCallback(() => {
    if (!isActive) {
      setActiveDocument(documentId);
    }
  }, [isActive, documentId, setActiveDocument]);

  const handleDragStop = useCallback((e, d) => {
    updateWindowState(documentId, { x: d.x, y: d.y });
  }, [documentId, updateWindowState]);

  const handleResizeStop = useCallback((e, direction, ref, delta, position) => {
    updateWindowState(documentId, {
      x: position.x,
      y: position.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight
    });
  }, [documentId, updateWindowState]);

  if (!windowState) return null;

  return (
    <Rnd
      size={{ width: windowState.width, height: windowState.height }}
      position={{ x: windowState.x, y: windowState.y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      bounds="parent"
      minWidth={400}
      minHeight={300}
      style={{ zIndex: windowState.zIndex }}
      onMouseDown={handleFocus}
    >
      <div className={`child-window ${isActive ? 'active' : 'inactive'}`}>
        <div className="window-title-bar">
          <span className="window-title">{windowState.title}</span>
          <button className="window-close-btn" onClick={() => closeDocument(documentId)}>×</button>
        </div>
        <div className="window-content">
          <MapCanvas tilesetImage={tilesetImage} />
        </div>
      </div>
    </Rnd>
  );
};
```

**Source:** [react-rnd GitHub - Usage Examples](https://github.com/bokuweb/react-rnd)

### Pattern 2: Window State Slice in Zustand

**What:** Store window metadata (position, size, z-index) per document in a Zustand slice.

**When to use:** To persist and sync window UI state across component tree.

**Example:**
```typescript
// slices/windowSlice.ts
import { StateCreator } from 'zustand';

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  title: string; // Computed from document filePath
}

export interface WindowSlice {
  windowStates: Map<string, WindowState>;
  nextZIndex: number;

  createWindowState: (docId: string, title: string) => void;
  updateWindowState: (docId: string, updates: Partial<WindowState>) => void;
  raiseWindow: (docId: string) => void;
  removeWindowState: (docId: string) => void;
  arrangeWindows: (mode: 'cascade' | 'tileHorizontal' | 'tileVertical') => void;
}

export const createWindowSlice: StateCreator<
  WindowSlice & DocumentsSlice, // Full store type
  [],
  [],
  WindowSlice
> = (set, get) => ({
  windowStates: new Map(),
  nextZIndex: 1000,

  createWindowState: (docId, title) => {
    const state = get();
    const newWindow: WindowState = {
      x: 100 + (state.windowStates.size * 40), // Cascade offset
      y: 100 + (state.windowStates.size * 40),
      width: 800,
      height: 600,
      zIndex: state.nextZIndex,
      title
    };
    const newStates = new Map(state.windowStates);
    newStates.set(docId, newWindow);
    set({ windowStates: newStates, nextZIndex: state.nextZIndex + 1 });
  },

  raiseWindow: (docId) => {
    const state = get();
    const window = state.windowStates.get(docId);
    if (!window) return;
    const newStates = new Map(state.windowStates);
    newStates.set(docId, { ...window, zIndex: state.nextZIndex });
    set({ windowStates: newStates, nextZIndex: state.nextZIndex + 1 });
  },

  updateWindowState: (docId, updates) => {
    const state = get();
    const window = state.windowStates.get(docId);
    if (!window) return;
    const newStates = new Map(state.windowStates);
    newStates.set(docId, { ...window, ...updates });
    set({ windowStates: newStates });
  },

  // ... arrangeWindows implementation in Pattern 3
});
```

### Pattern 3: Cascade Arrangement Algorithm

**What:** Classic MDI cascade: stagger windows with fixed offset so title bars are visible.

**When to use:** Window > Cascade menu command.

**Example:**
```typescript
// slices/windowArrangement.ts
const CASCADE_OFFSET = 40; // pixels
const BASE_X = 100;
const BASE_Y = 100;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export function cascadeWindows(
  windowStates: Map<string, WindowState>,
  workspaceWidth: number,
  workspaceHeight: number
): Map<string, WindowState> {
  const newStates = new Map(windowStates);
  let index = 0;

  for (const [docId, window] of newStates) {
    const x = BASE_X + (index * CASCADE_OFFSET);
    const y = BASE_Y + (index * CASCADE_OFFSET);

    // Wrap around if we exceed workspace bounds
    const wrappedX = x + DEFAULT_WIDTH > workspaceWidth ? BASE_X : x;
    const wrappedY = y + DEFAULT_HEIGHT > workspaceHeight ? BASE_Y : y;

    newStates.set(docId, {
      ...window,
      x: wrappedX,
      y: wrappedY,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT
    });
    index++;
  }

  return newStates;
}

// Usage in windowSlice:
arrangeWindows: (mode) => {
  const state = get();
  const workspaceEl = document.querySelector('.workspace');
  const workspaceWidth = workspaceEl?.clientWidth || 1200;
  const workspaceHeight = workspaceEl?.clientHeight || 800;

  let newStates: Map<string, WindowState>;
  switch (mode) {
    case 'cascade':
      newStates = cascadeWindows(state.windowStates, workspaceWidth, workspaceHeight);
      break;
    case 'tileHorizontal':
      newStates = tileWindowsHorizontal(state.windowStates, workspaceWidth, workspaceHeight);
      break;
    case 'tileVertical':
      newStates = tileWindowsVertical(state.windowStates, workspaceWidth, workspaceHeight);
      break;
    default:
      return;
  }
  set({ windowStates: newStates });
}
```

**Source:** [Microsoft Learn - Arrange MDI Child Forms](https://learn.microsoft.com/en-us/dotnet/desktop/winforms/advanced/how-to-arrange-mdi-child-forms?view=netframeworkdesktop-4.8)

### Pattern 4: Tile Horizontal/Vertical Arrangement

**What:** Divide workspace into equal-sized regions (grid for horizontal, stack for vertical).

**When to use:** Window > Tile Horizontal/Vertical menu commands.

**Example:**
```typescript
export function tileWindowsHorizontal(
  windowStates: Map<string, WindowState>,
  workspaceWidth: number,
  workspaceHeight: number
): Map<string, WindowState> {
  const count = windowStates.size;
  if (count === 0) return windowStates;

  const newStates = new Map(windowStates);
  const windowHeight = Math.floor(workspaceHeight / count);

  let index = 0;
  for (const [docId, window] of newStates) {
    newStates.set(docId, {
      ...window,
      x: 0,
      y: index * windowHeight,
      width: workspaceWidth,
      height: windowHeight
    });
    index++;
  }

  return newStates;
}

export function tileWindowsVertical(
  windowStates: Map<string, WindowState>,
  workspaceWidth: number,
  workspaceHeight: number
): Map<string, WindowState> {
  const count = windowStates.size;
  if (count === 0) return windowStates;

  const newStates = new Map(windowStates);
  const windowWidth = Math.floor(workspaceWidth / count);

  let index = 0;
  for (const [docId, window] of newStates) {
    newStates.set(docId, {
      ...window,
      x: index * windowWidth,
      y: 0,
      width: windowWidth,
      height: workspaceHeight
    });
    index++;
  }

  return newStates;
}
```

**Source:** Derived from [Windows Forms LayoutMdi Documentation](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.form.layoutmdi?view=windowsdesktop-8.0)

### Pattern 5: Z-Index Focus Management

**What:** Increment z-index when a window is focused to bring it to front.

**When to use:** Every time user clicks a window.

**Example:**
```typescript
// In ChildWindow component:
const handleMouseDown = useCallback(() => {
  const state = useEditorStore.getState();
  if (state.activeDocumentId !== documentId) {
    state.setActiveDocument(documentId);
    state.raiseWindow(documentId); // Increment z-index
  }
}, [documentId]);

// In Rnd props:
<Rnd
  {...otherProps}
  onMouseDown={handleMouseDown}
  style={{ zIndex: windowState.zIndex }}
>
```

**Source:** [Microsoft Learn - MDI Z-Order](https://learn.microsoft.com/en-us/windows/win32/winmsg/about-the-multiple-document-interface)

### Pattern 6: Document Limit for Canvas Context Management

**What:** Enforce a maximum number of open documents (8) to avoid exhausting browser canvas contexts.

**When to use:** In createDocument action, check count before allowing new document.

**Example:**
```typescript
// In documentsSlice.ts:
const MAX_OPEN_DOCUMENTS = 8;

createDocument: (map, filePath) => {
  const state = get();
  if (state.documents.size >= MAX_OPEN_DOCUMENTS) {
    alert(`Maximum ${MAX_OPEN_DOCUMENTS} documents can be open simultaneously.`);
    return null;
  }
  // ... proceed with document creation
}
```

**Rationale:** MapCanvas uses 4 canvas contexts per document (static, anim, overlay, grid). Browser limits are 8-16 WebGL contexts; 2D contexts are less constrained but still finite. At 8 documents × 4 contexts = 32 contexts, we're safe on all browsers.

**Source:** [WebGL Context Loss Discussion](https://discourse.vtk.org/t/multiple-canvases-too-many-active-webgl-contexts-oldest-context-will-be-lost/5868)

### Anti-Patterns to Avoid

- **Storing window position in DocumentState:** Window position is UI metadata, not document data. Store in separate windowStates map, not in the document object itself.

- **Using FlexLayout tabsets for child windows:** User explicitly rejected "tabbed document interface" in requirements. FlexLayout is tab-focused; resist the temptation even though it has more features.

- **Z-index collision:** Don't use static z-index values per window. Use an incrementing counter (nextZIndex) to guarantee uniqueness.

- **Re-rendering all windows on any state change:** Each ChildWindow should subscribe only to its own windowState + activeDocumentId. Avoid wholesale store subscriptions.

- **Unlimited open documents:** Without a limit, users can open 20+ documents and hit canvas context limits, causing rendering failures and browser crashes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable/resizable divs | Custom mouse event handlers | react-rnd | Handles edge cases (bounds, constraints, touch events, resize handles) |
| Window title computation | Manual string parsing | Zustand selector | Reactive, memoized, single source of truth |
| Cascade wrap-around logic | Complex modulo arithmetic | Simple if-check for bounds | Clearer intent, easier to debug |
| Z-index allocator | Complex pool management | Incrementing counter | Simple, collision-free, no need to reclaim values |

**Key insight:** MDI window management is mostly bookkeeping (position, size, z-index) plus simple geometric algorithms (cascade offset, tile division). Don't over-engineer with complex layout engines or state machines. React-rnd handles the hard parts (drag, resize, touch); we just track metadata.

## Common Pitfalls

### Pitfall 1: Canvas Context Exhaustion

**What goes wrong:** User opens 10+ documents. Browser console shows "too many active contexts" or canvas rendering fails silently.

**Why it happens:** Each MapCanvas creates 4 canvas contexts. Browsers limit contexts (WebGL: 8-16, 2D: higher but still finite). Exceeded limit causes oldest context to be lost.

**How to avoid:** Enforce MAX_OPEN_DOCUMENTS = 8. Show alert when user tries to open more. Alternatively, virtualize inactive canvases (destroy context when window not visible, recreate on focus).

**Warning signs:** Blank canvases after opening many documents, "context lost" errors in console, memory usage spikes.

**Example fix:**
```typescript
createDocument: (map, filePath) => {
  if (get().documents.size >= MAX_OPEN_DOCUMENTS) {
    alert(`Maximum ${MAX_OPEN_DOCUMENTS} documents open. Close a document first.`);
    return null;
  }
  // ... proceed
}
```

### Pitfall 2: Z-Index Grows Without Bound

**What goes wrong:** After many focus changes, z-index reaches MAX_SAFE_INTEGER or CSS rendering breaks.

**Why it happens:** Incrementing nextZIndex forever without resetting.

**How to avoid:** Start z-index at 1000. Browsers handle z-index up to 2^31-1 (2.1 billion). At 1 focus/second, it takes 68 years to overflow. If paranoid, add logic to normalize z-indexes when nextZIndex exceeds 100000.

**Warning signs:** Windows stop raising to front; CSS rendering glitches; console shows parseInt errors.

**Example fix:**
```typescript
raiseWindow: (docId) => {
  const state = get();
  // Normalize if z-index grows too large
  if (state.nextZIndex > 100000) {
    normalizeZIndexes(); // Reassign all windows sequential z-indexes starting at 1000
  }
  // ... proceed with raise
}
```

### Pitfall 3: Window Position Saved in Document State

**What goes wrong:** When user reopens a saved .lvl file, window position is restored (confusing behavior). Or, closing and reopening the same file spawns window at saved position instead of cascade position.

**Why it happens:** Window position stored in DocumentState (which persists in map.description via Phase 33 serialization).

**How to avoid:** Keep window state completely separate. WindowState is ephemeral UI state, not document data. New documents always get fresh window positions via cascade offset.

**Warning signs:** Windows appear offscreen after reopening files; users complain "window position remembers my last session."

**Example fix:**
```typescript
// WRONG: DocumentState includes x, y, width, height
interface DocumentState {
  map: MapData;
  filePath: string | null;
  viewport: { x: number; y: number; zoom: number }; // OK - viewport is document state
  windowX: number; // WRONG - window position is UI metadata
  windowY: number;
}

// RIGHT: Separate WindowState slice
interface WindowState {
  x: number; // UI metadata only
  y: number;
  width: number;
  height: number;
  zIndex: number;
}
```

### Pitfall 4: Minimap Not Updating on Window Focus

**What goes wrong:** User clicks window B, but minimap still shows window A's viewport.

**Why it happens:** Minimap subscribes to `map` and `viewport` from top-level state, which Phase 33 syncs from activeDocument. If setActiveDocument isn't called on window focus, sync doesn't happen.

**How to avoid:** ChildWindow's onMouseDown MUST call setActiveDocument. Verify Minimap subscribes to `state.map` and `state.viewport` (backward-compatible fields).

**Warning signs:** Minimap doesn't update when switching windows; minimap shows wrong map; viewport indicator position is stale.

**Example fix:**
```typescript
// In ChildWindow.tsx:
const handleMouseDown = useCallback(() => {
  const state = useEditorStore.getState();
  if (state.activeDocumentId !== documentId) {
    state.setActiveDocument(documentId); // This syncs map/viewport to top-level
    state.raiseWindow(documentId);
  }
}, [documentId]);
```

### Pitfall 5: Unsaved Changes Prompt Doesn't Appear

**What goes wrong:** User closes window with unsaved changes via close button (×), but no "Save changes?" dialog appears.

**Why it happens:** Close button directly calls `closeDocument(docId)` without checking dirty flag first.

**How to avoid:** ChildWindow close button should call a wrapper function that checks `doc.map.modified` and shows 3-button dialog (Save / Don't Save / Cancel) before proceeding.

**Warning signs:** Users lose work; no prompt when closing modified documents; "I thought it would ask me to save" complaints.

**Example fix:**
```typescript
// In ChildWindow.tsx:
const handleClose = useCallback(async () => {
  const state = useEditorStore.getState();
  const doc = state.documents.get(documentId);
  if (doc?.map?.modified) {
    // TODO Phase 34: Implement 3-button dialog (Save / Don't Save / Cancel)
    // For now, use window.confirm as temporary solution
    const shouldSave = window.confirm('Save changes before closing?');
    if (shouldSave) {
      // Trigger save logic (need to wire up handleSaveMap from App.tsx context)
      // Phase 34 will need to make save action globally accessible
      return;
    }
  }
  closeDocument(documentId);
}, [documentId, closeDocument]);

<button className="window-close-btn" onClick={handleClose}>×</button>
```

### Pitfall 6: Window Cascades Off-Screen

**What goes wrong:** Opening 10 documents with CASCADE_OFFSET = 40px pushes windows beyond workspace bounds. Windows are unreachable.

**Why it happens:** Cascade algorithm doesn't check workspace dimensions.

**How to avoid:** Wrap cascade offset when window would exceed workspace bounds. Reset to BASE_X/BASE_Y.

**Warning signs:** Windows disappear after opening many documents; user can't find last opened window; workspace appears empty despite documents open.

**Example fix:**
```typescript
// In cascadeWindows function:
const x = BASE_X + (index * CASCADE_OFFSET);
const y = BASE_Y + (index * CASCADE_OFFSET);

// Wrap around if window would exceed workspace bounds
const wrappedX = x + DEFAULT_WIDTH > workspaceWidth ? BASE_X : x;
const wrappedY = y + DEFAULT_HEIGHT > workspaceHeight ? BASE_Y : y;
```

## Code Examples

Verified patterns from research:

### Workspace Component Rendering Child Windows

```typescript
// components/Workspace/Workspace.tsx
import React from 'react';
import { useEditorStore } from '@core/editor';
import { ChildWindow } from './ChildWindow';
import './Workspace.css';

interface WorkspaceProps {
  tilesetImage: HTMLImageElement | null;
}

export const Workspace: React.FC<WorkspaceProps> = ({ tilesetImage }) => {
  const documentIds = useEditorStore((state) => Array.from(state.documents.keys()));

  if (documentIds.length === 0) {
    return (
      <div className="workspace empty">
        <div className="empty-workspace-message">
          <p>No documents open</p>
          <p>File &gt; New or File &gt; Open to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      {documentIds.map((docId) => (
        <ChildWindow key={docId} documentId={docId} tilesetImage={tilesetImage} />
      ))}
    </div>
  );
};
```

### Menu Command Integration

```typescript
// In App.tsx or menu handler:
const handleCascadeWindows = useCallback(() => {
  useEditorStore.getState().arrangeWindows('cascade');
}, []);

const handleTileHorizontal = useCallback(() => {
  useEditorStore.getState().arrangeWindows('tileHorizontal');
}, []);

const handleTileVertical = useCallback(() => {
  useEditorStore.getState().arrangeWindows('tileVertical');
}, []);

// In electron/main.ts menu template:
{
  label: 'Window',
  submenu: [
    {
      label: 'Cascade',
      click: () => mainWindow.webContents.send('arrange-windows', 'cascade')
    },
    {
      label: 'Tile Horizontal',
      click: () => mainWindow.webContents.send('arrange-windows', 'tileHorizontal')
    },
    {
      label: 'Tile Vertical',
      click: () => mainWindow.webContents.send('arrange-windows', 'tileVertical')
    }
  ]
}
```

### Window Title Computation

```typescript
// Selector for window title (derived from document state):
const windowTitle = useEditorStore((state) => {
  const doc = state.documents.get(documentId);
  if (!doc) return 'Untitled';
  const filename = doc.filePath
    ? doc.filePath.split(/[\\/]/).pop() || 'Untitled'
    : 'Untitled';
  const modified = doc.map?.modified ? ' *' : '';
  return `${filename}${modified}`;
});

// Use in ChildWindow:
<div className="window-title-bar">
  <span className="window-title">{windowTitle}</span>
  <button className="window-close-btn" onClick={handleClose}>×</button>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Desktop native MDI (WinForms, MFC) | Web-based MDI with HTML/CSS | Mid-2010s (HTML5 Canvas adoption) | Enables cross-platform editors in browser/Electron; sacrifices native window chrome |
| Tab-based UIs (Chrome tabs) | Hybrid MDI (VS Code, Figma) | Late 2010s (Electron maturity) | Users can see multiple documents simultaneously; better for spatial tasks |
| GoldenLayout (v1, 2015) | react-rnd + custom logic (2020+) | 2020+ (React hooks, lighter libraries) | Less framework lock-in; simpler mental model; easier to customize |
| react-mosaic (tiling WM) | react-rnd (free-form) | Depends on use case | Mosaic for tiling apps (IDEs); rnd for classic MDI (editors, design tools) |

**Deprecated/outdated:**
- **GoldenLayout v1:** Last major update 2020; v2 exists but smaller community. React wrappers are thin and require manual lifecycle management.
- **jQuery UI Draggable/Resizable:** Pre-React era; avoid mixing jQuery with modern React (event system conflicts, ref management issues).
- **react-grid-layout for MDI:** Designed for dashboard grids, not overlapping windows. Forces grid snapping; no z-order.

## Open Questions

1. **Canvas Virtualization Strategy**
   - What we know: MapCanvas creates 4 contexts per document. At 8 documents = 32 contexts, we approach browser limits.
   - What's unclear: Should we virtualize inactive windows (destroy canvas contexts, recreate on focus)?
   - Recommendation: Start with MAX_OPEN_DOCUMENTS = 8 hard limit. Measure memory usage. If users demand more, implement virtualization (only active window has live contexts; inactive windows show static snapshot or recreate on focus).

2. **Window Close Dialog UX**
   - What we know: Requirement says "Closing a window with unsaved changes prompts user to save." Classic pattern is 3-button dialog (Save / Don't Save / Cancel).
   - What's unclear: window.confirm only has OK/Cancel. Need custom dialog component?
   - Recommendation: Phase 34 uses window.confirm as temporary solution (matches Phase 33 pattern). Phase 36 (UI Polish) can add proper 3-button dialog component. For now, confirm() is sufficient to meet the requirement.

3. **Workspace Bounds Enforcement**
   - What we know: react-rnd supports `bounds="parent"` to constrain dragging.
   - What's unclear: Should windows be allowed partially off-screen (edge dragging) or fully constrained?
   - Recommendation: Use `bounds="parent"` to keep windows fully visible. Users can't lose windows off-screen. Trade-off: can't push windows to screen edges for space. SEdit allows partial off-screen; we can relax bounds if users request it.

4. **Window Menu Active Document Indicator**
   - What we know: Classic MDI has Window menu listing all open documents with checkmark on active one.
   - What's unclear: Is this in scope for Phase 34 or deferred to Phase 36 (UI Polish)?
   - Recommendation: Defer to Phase 36. Window menu with document list is nice-to-have; core MDI functionality (drag, resize, tile, cascade, focus) is higher priority. Phase 34 delivers the visual MDI; Phase 36 adds polish.

5. **Title Bar Integration with Electron**
   - What we know: Phase 33 uses `window.electronAPI.setTitle()` to update Electron window title.
   - What's unclear: With multiple child windows, what should Electron title show? Active document name? "AC Map Editor - 3 documents open"?
   - Recommendation: Continue showing active document name. Matches classic MDI behavior (parent window title reflects active child). When no documents open, show "AC Map Editor".

## Sources

### Primary (HIGH confidence)
- [react-rnd GitHub Repository](https://github.com/bokuweb/react-rnd) - Installation, API, TypeScript support
- [react-rnd npm Package](https://www.npmjs.com/package/react-rnd) - Version 10.4.2, 4.3k stars
- [Microsoft Learn - Arrange MDI Child Forms](https://learn.microsoft.com/en-us/dotnet/desktop/winforms/advanced/how-to-arrange-mdi-child-forms?view=netframeworkdesktop-4.8) - Cascade/Tile algorithms
- [Microsoft Learn - Form.LayoutMdi Method](https://learn.microsoft.com/en-us/dotnet/api/system.windows.forms.form.layoutmdi?view=windowsdesktop-8.0) - MdiLayout enumeration
- Existing codebase: E:\NewMapEditor\src\core\editor\EditorState.ts - Phase 33 document state foundation
- Existing codebase: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx - 4-canvas architecture (32 contexts at 8 docs)

### Secondary (MEDIUM confidence)
- [FlexLayout React GitHub](https://github.com/caplin/FlexLayout) - Alternative considered; tabbed layout manager
- [react-mosaic GitHub](https://github.com/nomcopter/react-mosaic) - Alternative considered; tiling window manager
- [VTK Discourse - Multiple Canvas Context Limits](https://discourse.vtk.org/t/multiple-canvases-too-many-active-webgl-contexts-oldest-context-will-be-lost/5868) - Canvas context exhaustion
- [MDN - Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - Canvas memory management
- [Microsoft Learn - About MDI](https://learn.microsoft.com/en-us/windows/win32/winmsg/about-the-multiple-document-interface) - Z-order and focus management

### Tertiary (LOW confidence)
- WebSearch results on "React MDI window management 2026" - General landscape, no dominant library found
- WebSearch results on "cascade window arrangement algorithm" - Generic descriptions, no detailed formulas
- WebSearch results on "tile window split equal size" - Tiling WM concepts (i3, dwm), not directly applicable

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH - react-rnd is well-maintained and TypeScript-ready, but MDI use case not explicitly documented (examples show draggable cards, not child windows)
- Architecture: HIGH - Pattern is proven (WinForms MDI, web-based clones); implementation is straightforward bookkeeping
- Pitfalls: MEDIUM - Canvas context limits are well-documented; z-index and cascade pitfalls are derived from first principles, not verified in production

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - react-rnd stable; MDI patterns are mature and unlikely to change)
