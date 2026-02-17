# Phase 83: Save As Implementation - Research

**Researched:** 2026-02-17
**Domain:** File operations, Electron IPC dialogs, Zustand state management, MDI window title synchronization
**Confidence:** HIGH

## Summary

Phase 83 implements "Save As" functionality, allowing users to save a map under a different filename. This is a standard desktop application feature with well-established patterns in Electron applications.

The current implementation already has 90% of the infrastructure needed: MapService handles save operations via FileService abstraction, Electron IPC provides dialog APIs, and DocumentsSlice tracks filePath per document. The missing pieces are: (1) a Save As menu item and keyboard shortcut (Ctrl+Shift+S), (2) a saveMapDialog variant that accepts a defaultPath parameter to pre-fill the current filename, (3) state updates to change the document's filePath and window title after Save As completes.

**Primary recommendation:** Add Save As menu item with Ctrl+Shift+S accelerator, extend saveMapDialog IPC to accept defaultPath parameter, create updateFilePathForDocument action to update both DocumentState.filePath and WindowState.title, and connect handleSaveAs in App.tsx to orchestrate the full workflow.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 28.x | Desktop shell + IPC | Project's platform, handles file dialogs via dialog API |
| React 18 | 18.x | UI framework | App.tsx orchestrates file operations with useCallback hooks |
| Zustand | 4.x | State management | DocumentsSlice + WindowSlice manage per-document state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js fs | Built-in | File I/O | Already used in electron/main.ts for writeFile operations |
| Electron dialog | Built-in | Native file dialogs | showSaveDialog API with defaultPath parameter |

**Installation:** No new dependencies required. All work uses existing Electron + React stack.

## Architecture Patterns

### File Operation Flow (Existing Pattern)

The project uses a clean 4-layer architecture for file operations:

```typescript
// Layer 1: UI (App.tsx)
const handleSaveMap = useCallback(async () => {
  const map = useEditorStore.getState().map;
  const result = await mapService.saveMap(map, map.filePath);
  if (result.success) {
    markSaved();
  }
}, [markSaved, mapService]);

// Layer 2: Business Logic (MapService.ts)
async saveMap(map: MapData, filePath?: string): Promise<MapSaveResult> {
  if (!filePath) {
    const dialogResult = await this.fileService.saveMapDialog();
    filePath = dialogResult.filePath;
  }
  // ... serialize, compress, write
}

// Layer 3: Platform Abstraction (ElectronFileService.ts)
async saveMapDialog(): Promise<FileDialogResult> {
  const filePath = await window.electronAPI.saveFileDialog();
  return { filePath, canceled: !filePath };
}

// Layer 4: IPC Boundary (electron/main.ts)
ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'Map Files', extensions: ['map'] }]
  });
  return result.filePath;
});
```

**Save As follows the same pattern**, but needs defaultPath parameter passed through all layers.

### Multi-Document State Management

Documents are tracked in a Map with unique IDs:

```typescript
// DocumentState (slices/types.ts)
export interface DocumentState {
  map: MapData | null;
  filePath: string | null;  // ← Updated by Save As
  viewport: Viewport;
  // ... other per-document state
}

// WindowState (slices/types.ts)
export interface WindowState {
  title: string;  // ← Updated by Save As (derived from filePath)
  x: number;
  y: number;
  // ... window position/size
}
```

**Key insight:** Save As must update BOTH DocumentState.filePath (for next Save) AND WindowState.title (for window chrome). These are in separate slices.

### Window Title Synchronization Pattern

The project has two title synchronization points:

1. **Local window chrome** — ChildWindow.tsx displays WindowState.title in title bar
2. **Electron native title** — App.tsx updates via window.electronAPI.setTitle

```typescript
// App.tsx (lines 244-260)
const windowTitle = useEditorStore((state) => {
  if (!state.activeDocumentId) return 'AC Map Editor';
  const doc = state.documents.get(state.activeDocumentId);
  const filename = doc.filePath
    ? doc.filePath.split(/[\\/]/).pop() || 'Untitled'
    : 'Untitled';
  const modified = doc.map.modified ? ' *' : '';
  return `${filename}${modified} - AC Map Editor`;
});

useEffect(() => {
  document.title = windowTitle;
  window.electronAPI?.setTitle(windowTitle);
}, [windowTitle]);
```

**Save As must trigger this recomputation** by updating doc.filePath in the documents Map.

### Electron Dialog defaultPath Pattern

Electron's showSaveDialog supports pre-filling the filename:

```typescript
// Example from electron/main.ts (openPatchFolder)
const result = await dialog.showSaveDialog(mainWindow!, {
  defaultPath: '/existing/path/mymap.map',  // ← Pre-fills dialog
  filters: [{ name: 'Map Files', extensions: ['map'] }]
});
```

**Currently missing:** The IPC handler 'dialog:saveFile' doesn't accept a defaultPath parameter. Save As needs this to pre-fill the current filename.

### Menu Item and Keyboard Shortcut Pattern

Electron menu items use accelerator field for keyboard shortcuts:

```typescript
// electron/main.ts (existing pattern from View > Center on Selection)
{
  label: 'Center on Selection',
  accelerator: 'CmdOrCtrl+E',  // ← Cross-platform (Ctrl on Win/Linux, Cmd on Mac)
  click: () => {
    mainWindow?.webContents.send('menu-action', 'center-selection');
  }
}
```

**Save As needs:**
- Menu item: `File > Save As...` (below Save)
- Accelerator: `CmdOrCtrl+Shift+S` (standard across all desktop apps)
- Action: Send 'save-as' message to renderer

### Anti-Patterns to Avoid

- **Mutating DocumentState directly** — Always use set() to create new Map instances for Zustand reactivity
- **Forgetting to update WindowState.title** — Would cause window title to show old filename until next modification
- **Hardcoding Windows path separators** — Use `/[\\/]/` regex to split paths (project runs on Windows with Git Bash)
- **Skipping markSaved() after Save As** — Map should be marked clean after successful save

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File path extraction | Custom string parsing | `filePath.split(/[\\/]/).pop()` | Project already uses this pattern (App.tsx:223, App.tsx:249) |
| Native save dialogs | HTML file input | Electron dialog API | Already integrated, provides native UX |
| Per-document state updates | Direct mutation | Zustand set() with new Map | Ensures reactivity and immutability |
| Cross-platform shortcuts | Separate Windows/Mac configs | `CmdOrCtrl` modifier | Electron built-in, handles platform differences |

**Key insight:** The project's existing MapService abstraction is well-designed. Don't bypass it by calling Electron IPC directly from components.

## Common Pitfalls

### Pitfall 1: Forgetting to Update Window Title

**What goes wrong:** User saves as "newmap.map" but window title still shows "oldmap.map"

**Why it happens:** WindowState.title is separate from DocumentState.filePath, requires explicit update

**How to avoid:** Create a single action `updateFilePathForDocument` that updates BOTH filePath and derives new title from it

**Warning signs:** Window title doesn't update after Save As completes

### Pitfall 2: Breaking the Backward-Compatible API

**What goes wrong:** Existing code calling `markSaved()` breaks because it expects active document

**Why it happens:** EditorState.ts has backward-compatible wrappers (markSaved, etc.) that delegate to active document

**How to avoid:** New `updateFilePathForDocument` should only exist in DocumentsSlice, not exposed in backward-compat layer (Save As is MDI-specific, not needed for legacy single-doc callers)

**Warning signs:** TypeScript errors in App.tsx or other consumers of useEditorStore

### Pitfall 3: Not Handling Dialog Cancellation

**What goes wrong:** User clicks Cancel in Save As dialog, but code proceeds as if save succeeded

**Why it happens:** Forgetting to check `result.canceled` from dialog

**How to avoid:** Follow existing pattern from handleSaveMap (App.tsx:180-185): check for 'canceled' error before calling markSaved

**Warning signs:** No early return when dialog is canceled

### Pitfall 4: Modifying Map.filePath Instead of Document.filePath

**What goes wrong:** Save As updates `map.filePath` but not `doc.filePath`, causing state desync

**Why it happens:** Confusion between MapData.filePath (transient, from parser) and DocumentState.filePath (persistent)

**How to avoid:** ONLY update DocumentState.filePath. MapData.filePath is just metadata from loading, not the source of truth.

**Warning signs:** Next Save writes to original filename instead of new filename

### Pitfall 5: Forgetting to Mark Document as Saved

**What goes wrong:** After Save As, window title shows asterisk (*) indicating unsaved changes

**Why it happens:** Save As creates a new file, but document.modified flag is still true

**How to avoid:** Call `markSavedForDocument(id)` after successful Save As (same as regular Save)

**Warning signs:** Window title shows "newmap.map *" instead of "newmap.map"

## Code Examples

### Example 1: Extending IPC Handler to Accept defaultPath

```typescript
// electron/main.ts
ipcMain.handle('dialog:saveFile', async (_, defaultPath?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,  // ← Pre-fills current filename
    filters: [
      { name: 'Map Files', extensions: ['map'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});
```

### Example 2: Updating FileService Interface

```typescript
// src/core/services/FileService.ts
export interface FileService {
  saveMapDialog(defaultPath?: string): Promise<FileDialogResult>;
  // ... other methods
}

// src/adapters/electron/ElectronFileService.ts
async saveMapDialog(defaultPath?: string): Promise<FileDialogResult> {
  const filePath = await window.electronAPI.saveFileDialog(defaultPath);
  return {
    filePath,
    canceled: !filePath,
  };
}
```

### Example 3: Adding updateFilePathForDocument Action

```typescript
// src/core/editor/slices/documentsSlice.ts
export interface DocumentsSlice {
  // ... existing actions
  updateFilePathForDocument: (id: DocumentId, filePath: string) => void;
}

updateFilePathForDocument: (id, filePath) => {
  const doc = get().documents.get(id);
  if (!doc) return;

  // Extract filename from full path for window title
  const filename = filePath.split(/[\\/]/).pop() || 'Untitled';

  set((state) => {
    const newDocs = new Map(state.documents);
    newDocs.set(id, { ...doc, filePath });

    const newWindowStates = new Map(state.windowStates);
    const windowState = newWindowStates.get(id);
    if (windowState) {
      newWindowStates.set(id, { ...windowState, title: filename });
    }

    return { documents: newDocs, windowStates: newWindowStates };
  });
}
```

### Example 4: Save As Handler in App.tsx

```typescript
// src/App.tsx
const handleSaveAsMap = useCallback(async () => {
  const state = useEditorStore.getState();
  const { activeDocumentId, documents } = state;
  if (!activeDocumentId) return;

  const doc = documents.get(activeDocumentId);
  if (!doc?.map) return;

  // Pre-fill dialog with current filename (or default to 'Untitled.map')
  const defaultPath = doc.filePath || 'Untitled.map';

  // MapService.saveMap with explicit no-path triggers dialog
  const result = await mapService.saveMap(doc.map, undefined, defaultPath);
  if (!result.success) {
    if (result.error !== 'canceled') {
      alert(`Failed to save map: ${result.error}`);
    }
    return;
  }

  // Update document filePath and window title
  state.updateFilePathForDocument(activeDocumentId, result.filePath!);
  state.markSavedForDocument(activeDocumentId);

  alert('Map saved successfully!');
}, [mapService]);
```

### Example 5: Menu Item with Keyboard Shortcut

```typescript
// electron/main.ts (File menu)
{
  label: 'File',
  submenu: [
    { label: 'New', click: () => mainWindow?.webContents.send('menu-action', 'new') },
    { label: 'Open...', click: () => mainWindow?.webContents.send('menu-action', 'open') },
    { label: 'Save', click: () => mainWindow?.webContents.send('menu-action', 'save') },
    {
      label: 'Save As...',
      accelerator: 'CmdOrCtrl+Shift+S',  // ← Standard shortcut
      click: () => mainWindow?.webContents.send('menu-action', 'save-as')
    },
    { type: 'separator' },
    { label: 'Exit', click: () => app.quit() }
  ]
}

// src/App.tsx (menu-action listener)
const handler = (_event: any, action: string) => {
  const state = useEditorStore.getState();
  switch (action) {
    case 'new': state.createDocument(createEmptyMap()); break;
    case 'open': handleOpenMap(); break;
    case 'save': handleSaveMap(); break;
    case 'save-as': handleSaveAsMap(); break;  // ← New action
    // ...
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single global filePath | Per-document filePath in DocumentsSlice | Phase 33 (v2.0) | Enables MDI with separate save paths per window |
| Hardcoded path parsing | Regex `/[\\/]/` for cross-platform | Phase 26 (portability) | Supports Git Bash on Windows |
| Manual title updates | Reactive windowTitle derived state | Phase 34 (MDI) | Title auto-updates on filePath change |
| Single Save dialog | FileService abstraction | Phase 26 (portability) | Enables future web/Tauri ports |

**Deprecated/outdated:**
- Global `setMap(map, filePath)` — Use `createDocument(map, filePath)` for MDI
- Direct Electron IPC from components — Use MapService/FileService abstraction

## Open Questions

1. **Should Save As also update MapData.filePath?**
   - What we know: MapData.filePath is set by MapParser during load
   - What's unclear: Whether it needs to stay in sync with DocumentState.filePath
   - Recommendation: Update it for consistency, but DocumentState.filePath is source of truth

2. **Should Save As clear undo/redo stacks?**
   - What we know: Standard apps (Photoshop, VS Code) preserve undo after Save As
   - What's unclear: Whether user expects undo to still work after Save As
   - Recommendation: Keep undo stacks unchanged (matches user expectations)

3. **Should Save As prompt if target file exists?**
   - What we know: Electron's showSaveDialog has built-in overwrite confirmation
   - What's unclear: Whether we need additional validation
   - Recommendation: Trust Electron's native dialog behavior

## Sources

### Primary (HIGH confidence)
- Electron Documentation - dialog.showSaveDialog API (official docs)
- Project codebase - MapService.ts, ElectronFileService.ts, DocumentsSlice.ts (implementation patterns)
- Project codebase - App.tsx handleSaveMap (existing Save workflow)
- Project codebase - electron/main.ts menu configuration (keyboard shortcut pattern)

### Secondary (MEDIUM confidence)
- Windows Environment Rules from MEMORY.md (Git Bash path handling)
- Phase 33 UAT document (MDI per-document state architecture)

### Tertiary (LOW confidence)
- None — all patterns verified from existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project
- Architecture: HIGH - Existing patterns well-established and documented
- Pitfalls: HIGH - Common issues verified from similar file operations in codebase

**Research date:** 2026-02-17
**Valid until:** 60 days (stable domain, no fast-moving dependencies)
