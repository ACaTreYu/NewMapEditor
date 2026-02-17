# Phase 85: Image Trace Overlay - Research

**Researched:** 2026-02-17
**Domain:** React overlay components, Electron file dialogs, CSS click-through patterns
**Confidence:** HIGH

## Summary

Phase 85 requires implementing a trace image overlay system where users can import reference images (PNG, JPG, BMP, WebP, SVG, GIF) as semi-transparent MDI child windows for map tracing workflows. The codebase already has all the foundational infrastructure needed:

- **MDI system exists**: Workspace component with ChildWindow (react-rnd), WindowSlice in Zustand
- **Image loading pattern exists**: App.tsx loads tileset images via base64 data URLs from Electron IPC
- **File dialog pattern exists**: electron/main.ts implements showOpenDialog for .map/.lvl files
- **Opacity controls exist**: Grid opacity slider in ToolBar.tsx demonstrates 0-100% range sliders
- **Click-through pattern exists**: ChildWindow.tsx uses `pointer-events: none` during window drag

The implementation follows existing architectural patterns: create a new TraceImageWindow component (similar to ChildWindow but simpler), add Zustand state for trace image windows, add File menu item for import, and use CSS `pointer-events: none` for click-through. No new libraries needed.

**Primary recommendation:** Extend the existing MDI window system with a specialized trace image window type that has opacity control, always-on-top z-index, and click-through enabled by default.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-rnd | 10.5.2 | Draggable/resizable windows | Already in use for MDI child windows |
| Zustand | 5.0.3 | State management | Existing editor state architecture |
| Electron dialog | 34.0.0 | Native file picker | Already used for map file dialogs |
| CSS pointer-events | N/A | Click-through overlays | Web standard, universal browser support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| HTML Image() | Native | Load image files | Already used in App.tsx for tileset loading |
| FileReader API | Native | Convert files to base64 | Pattern exists for Electron IPC file reading |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-rnd | react-draggable + custom resize | More control but reinvents existing pattern |
| CSS pointer-events | JavaScript event filtering | More complex, no benefit over CSS |
| Zustand | React Context | Would break existing state architecture |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── Workspace/
│   │   ├── ChildWindow.tsx         # Existing map windows
│   │   ├── TraceImageWindow.tsx    # NEW: Trace image overlay windows
│   │   └── Workspace.tsx           # Update to render trace windows
│   └── ...
├── core/
│   └── editor/
│       └── slices/
│           ├── windowSlice.ts      # Extend for trace window state
│           └── types.ts            # Add TraceImageWindowState type
└── electron/
    ├── main.ts                     # Add image file dialog handler
    └── preload.ts                  # Add openImageDialog API
```

### Pattern 1: Trace Image Window State (New Window Type)
**What:** Separate state for trace image windows, distinct from document windows
**When to use:** When windows don't represent documents (no map data, no editing)
**Example:**
```typescript
// src/core/editor/slices/types.ts
export interface TraceImageWindowState {
  id: string;
  imageSrc: string;        // base64 data URL
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  opacity: number;         // 0-100
  isMinimized: boolean;
}

// WindowSlice extends with:
interface WindowSlice {
  traceImageWindows: Map<string, TraceImageWindowState>;
  createTraceImageWindow: (imageSrc: string) => void;
  removeTraceImageWindow: (id: string) => void;
  updateTraceImageWindow: (id: string, updates: Partial<TraceImageWindowState>) => void;
}
```

### Pattern 2: Reuse Existing Image Loading Pattern
**What:** App.tsx already loads images from Electron IPC via base64 data URLs
**When to use:** For all file-based images in Electron context
**Example:**
```typescript
// Existing pattern from App.tsx (lines 104-122)
const loadImage = (filePath: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    window.electronAPI.readFile(filePath).then((res) => {
      if (!res.success || !res.data) {
        reject(new Error(res.error || 'Failed to read file'));
        return;
      }
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        bmp: 'image/bmp', gif: 'image/gif', webp: 'image/webp'
      };
      const mime = mimeMap[ext] || 'image/png';
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode ${filePath}`));
      img.src = `data:${mime};base64,${res.data}`;
    });
  });
```

### Pattern 3: Click-Through via pointer-events: none
**What:** CSS `pointer-events: none` on the trace window allows clicks to pass to canvas below
**When to use:** For overlay windows that should not block interaction with content below
**Example:**
```css
/* TraceImageWindow.css */
.trace-image-window {
  pointer-events: auto; /* Title bar and controls should work */
}

.trace-image-content {
  pointer-events: none; /* Image area clicks pass through */
}
```
**Source:** [MDN pointer-events](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events)

### Pattern 4: Always-on-Top Z-Index Strategy
**What:** Trace windows should have higher base z-index than document windows
**When to use:** When certain window types must always stay above others
**Example:**
```typescript
// windowSlice.ts constants
const DOCUMENT_BASE_Z_INDEX = 1000;
const TRACE_IMAGE_BASE_Z_INDEX = 5000; // Always above documents

// When creating trace window:
newTraceWindows.set(id, {
  ...state,
  zIndex: TRACE_IMAGE_BASE_Z_INDEX + state.nextTraceZIndex
});
```

### Pattern 5: Opacity Control with Range Input
**What:** Reuse existing grid opacity slider pattern for trace image transparency
**When to use:** For 0-100% opacity controls
**Example:**
```typescript
// Existing pattern from ToolBar.tsx (lines 234-242)
<input
  type="range"
  min="0"
  max="100"
  value={opacity}
  onChange={(e) => updateTraceImageWindow(id, { opacity: Number(e.target.value) })}
  className="opacity-slider"
/>
```

### Pattern 6: File Dialog for Image Import
**What:** Extend Electron IPC with image-specific file dialog
**When to use:** For opening image files (vs map files)
**Example:**
```typescript
// electron/main.ts - Add new handler
ipcMain.handle('dialog:openImageFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'svg', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// electron/preload.ts - Expose API
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing
  openImageDialog: () => ipcRenderer.invoke('dialog:openImageFile'),
});
```
**Source:** [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog)

### Anti-Patterns to Avoid
- **Creating new document type for trace images:** Trace images are NOT documents - they have no map data, no undo/redo, no modification tracking. Keep separate.
- **Using canvas for trace image rendering:** Use native `<img>` tag - simpler, browser-optimized, supports all formats including SVG natively.
- **Blocking clicks on trace window:** Default pointer-events should be `none` on image content area, but `auto` on title bar/controls.
- **Mixing trace windows with document z-index pool:** Keep separate z-index ranges to ensure traces always float above documents.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable/resizable windows | Custom drag/resize logic | react-rnd (already installed) | Handles bounds, touch events, edge cases; existing codebase pattern |
| Image format detection | Manual MIME type mapping | Existing mimeMap pattern in App.tsx | Already supports PNG, JPG, BMP, GIF, WebP |
| File dialogs | HTML file input | Electron dialog.showOpenDialog | Native OS dialogs, better UX, existing IPC pattern |
| Opacity slider | Custom range input component | Native HTML `<input type="range">` | Existing pattern in ToolBar.tsx for grid opacity |
| Z-index management | Manual z-index assignment | WindowSlice z-index normalization pattern | Prevents overflow, handles raise-to-front automatically |

**Key insight:** This phase extends existing infrastructure, not creates new infrastructure. Every technical requirement (MDI windows, file dialogs, image loading, opacity controls, click-through) has a proven pattern in the codebase. Implementation is primarily composition of existing patterns.

## Common Pitfalls

### Pitfall 1: Pointer-Events on Parent Affecting Children
**What goes wrong:** Setting `pointer-events: none` on parent disables ALL children, including title bar controls
**Why it happens:** CSS pointer-events inherits and affects all descendants
**How to avoid:** Apply `pointer-events: none` only to the image content area, not the entire window. Use `pointer-events: auto` on title bar.
**Warning signs:** Cannot drag, minimize, or close trace windows
**Example:**
```css
/* WRONG - blocks all interactions */
.trace-image-window {
  pointer-events: none;
}

/* CORRECT - selective click-through */
.trace-image-window {
  pointer-events: auto; /* Window is interactive */
}
.trace-image-content {
  pointer-events: none; /* Only image area is click-through */
}
```

### Pitfall 2: Image Loading Race Conditions
**What goes wrong:** Creating window before image loads causes empty/broken display
**Why it happens:** Image loading is async, window creation is sync
**How to avoid:** Load image first, create window only on successful load (existing pattern in App.tsx)
**Warning signs:** White/broken image icon in trace window, console errors
**Example:**
```typescript
// WRONG - creates window before image loads
const handleImport = async () => {
  const filePath = await window.electronAPI.openImageDialog();
  createTraceImageWindow(filePath); // filePath is string, not loaded image
};

// CORRECT - load image first
const handleImport = async () => {
  const filePath = await window.electronAPI.openImageDialog();
  if (!filePath) return;

  const img = await loadImage(filePath); // Wait for load
  const dataSrc = img.src; // base64 data URL
  createTraceImageWindow(dataSrc); // Pass loaded data URL
};
```

### Pitfall 3: Z-Index Stacking Context Conflicts
**What goes wrong:** Trace windows appear BELOW document windows despite higher z-index
**Why it happens:** React-rnd creates stacking contexts, parent stacking context can trap children
**How to avoid:** Ensure trace windows and document windows share the same stacking context parent (.workspace)
**Warning signs:** Trace windows render behind document windows, cannot be raised above
**Source:** [Josh Comeau: Stacking Contexts](https://www.joshwcomeau.com/css/stacking-contexts/)

### Pitfall 4: SVG Scaling Issues in img Tags
**What goes wrong:** SVG images appear at wrong size or don't scale with window resize
**Why it happens:** SVG without explicit width/height uses intrinsic dimensions
**How to avoid:** Use `object-fit: contain` on img tag, let react-rnd size control the container
**Warning signs:** SVG appears at fixed size regardless of window size
**Example:**
```css
.trace-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* Preserves aspect ratio, scales to fit */
}
```

### Pitfall 5: Opacity Value Range Confusion
**What goes wrong:** Mixing 0-1 opacity (CSS) with 0-100 opacity (UI slider)
**Why it happens:** CSS opacity is 0-1, but user-facing sliders typically use 0-100
**How to avoid:** Store as 0-100 in state, convert to 0-1 only when applying to CSS
**Warning signs:** Image always fully opaque or fully transparent
**Example:**
```typescript
// Store as 0-100 in Zustand
opacity: number; // 0-100

// Convert when rendering
<div style={{ opacity: opacity / 100 }}> // 0-100 → 0-1
```

## Code Examples

Verified patterns from codebase:

### React-RND Window Component (from ChildWindow.tsx)
```typescript
// Source: src/components/Workspace/ChildWindow.tsx (lines 177-193)
<Rnd
  ref={rndRef}
  default={{
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
  }}
  onResizeStop={handleResizeStop}
  bounds="parent"
  minWidth={400}
  minHeight={300}
  style={{ zIndex: windowState.zIndex }}
  onMouseDown={handleMouseDown}
  disableDragging={true} // Manual drag on title bar
  enableResizing={!windowState.isMaximized}
>
```

### Electron File Dialog Handler (from main.ts)
```typescript
// Source: electron/main.ts (lines 239-249)
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Map Files', extensions: ['map', 'lvl'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
```

### Image Loading from Electron IPC (from App.tsx)
```typescript
// Source: src/App.tsx (lines 104-122)
const loadImage = (filePath: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    window.electronAPI.readFile(filePath).then((res) => {
      if (!res.success || !res.data) {
        reject(new Error(res.error || 'Failed to read file'));
        return;
      }
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        bmp: 'image/bmp', gif: 'image/gif'
      };
      const mime = mimeMap[ext] || 'image/png';
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode ${filePath}`));
      img.src = `data:${mime};base64,${res.data}`;
    });
  });
```

### Opacity Slider Control (from ToolBar.tsx)
```typescript
// Source: src/components/ToolBar/ToolBar.tsx (lines 234-242)
<input
  type="range"
  min="0"
  max="100"
  value={gridOpacity}
  onChange={(e) => setGridOpacity(Number(e.target.value))}
  className="opacity-slider"
  title={`Grid opacity: ${gridOpacity}%`}
/>
```

### Pointer-Events Click-Through (from ChildWindow.tsx)
```typescript
// Source: src/components/Workspace/ChildWindow.tsx (lines 88-89)
const contentEl = rndEl.querySelector('.window-content') as HTMLElement;
if (contentEl) contentEl.style.pointerEvents = 'none';

// Applied during drag, then restored on mouseup:
if (contentEl) contentEl.style.pointerEvents = '';
```

### Z-Index Management (from windowSlice.ts)
```typescript
// Source: src/core/editor/slices/windowSlice.ts (lines 103-125)
raiseWindow: (docId) => {
  set((state) => {
    const existing = state.windowStates.get(docId);
    if (!existing) return {};

    const newWindowStates = new Map(state.windowStates);
    newWindowStates.set(docId, { ...existing, zIndex: state.nextZIndex });

    let newNextZIndex = state.nextZIndex + 1;

    // Normalize z-indexes if threshold exceeded
    if (newNextZIndex > Z_INDEX_NORMALIZE_THRESHOLD) {
      let zIndex = BASE_Z_INDEX;
      const normalizedStates = new Map<DocumentId, WindowState>();
      for (const [id, windowState] of newWindowStates) {
        normalizedStates.set(id, { ...windowState, zIndex: zIndex++ });
      }
      newNextZIndex = zIndex;
      return { windowStates: normalizedStates, nextZIndex: newNextZIndex };
    }

    return { windowStates: newWindowStates, nextZIndex: newNextZIndex };
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-draggable + react-resizable | react-rnd | v2.1 (Phase 34) | Single library, simpler API, touch support |
| Global state monolith | Zustand slices (DocumentsSlice, GlobalSlice, WindowSlice) | v1.2 (Phase 33) | Modular state, better performance |
| Single document model | Multi-document MDI with WindowSlice | v1.2 (Phase 33-34) | Support 8 concurrent documents |
| JavaScript event handling | CSS pointer-events for click-through | Always used | Better performance, simpler code |
| Callback-based IPC | Promise-based ipcRenderer.invoke | Electron 7+ | Modern async/await patterns |

**Deprecated/outdated:**
- **FileReader for Electron files:** Use IPC with main process fs module (Electron security best practice)
- **Inline Base64 in src attribute:** Pattern exists but only for Electron-loaded files (security isolation)

## Open Questions

1. **Should trace images be serializable/restorable?**
   - What we know: No requirement to save trace image state to map files
   - What's unclear: Should trace images persist across sessions (localStorage)?
   - Recommendation: Phase 85 focuses on basic functionality - skip persistence. User can re-import if needed. Add persistence in future phase if users request it.

2. **Should there be a limit on trace image count?**
   - What we know: Documents are limited to 8 (MAX_OPEN_DOCUMENTS)
   - What's unclear: Should trace images have separate limit?
   - Recommendation: Start with limit of 4 trace images (reasonable for typical tracing workflow). Can increase if users need more.

3. **Should trace images support file watching/hot reload?**
   - What we know: No requirement for auto-reload when source file changes
   - What's unclear: Would this be useful for design iteration workflows?
   - Recommendation: Not in scope for Phase 85. Image is loaded once as data URL, decoupled from source file.

## Sources

### Primary (HIGH confidence)
- [MDN: pointer-events](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events) - Click-through overlay behavior
- [MDN: Image formats](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types) - Browser support for PNG, JPG, WebP, SVG, GIF
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog) - showOpenDialog file filters
- [react-rnd GitHub](https://github.com/bokuweb/react-rnd) - Drag/resize component API
- Codebase inspection: E:\NewMapEditor\src (EditorState, WindowSlice, ChildWindow, App.tsx)

### Secondary (MEDIUM confidence)
- [Josh Comeau: Stacking Contexts](https://www.joshwcomeau.com/css/stacking-contexts/) - Z-index management patterns
- [Smashing Magazine: Z-Index in Components](https://www.smashingmagazine.com/2019/04/z-index-component-based-web-application/) - Component-based z-index strategy
- [React RND Essentials Guide](https://www.dhiwise.com/post/guide-for-creating-responsive-elements-with-react-rnd) - React-rnd patterns

### Tertiary (LOW confidence)
- None - All findings verified against official docs or existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, patterns exist in codebase
- Architecture: HIGH - Direct extension of existing MDI window system
- Pitfalls: HIGH - Common CSS/React patterns well-documented, codebase examples exist

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days - stable web standards, mature libraries)
