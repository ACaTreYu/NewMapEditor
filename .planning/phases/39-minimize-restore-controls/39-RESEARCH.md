# Phase 39: Minimize & Restore Controls - Research

**Researched:** 2026-02-10
**Domain:** MDI window state management (minimize/maximize/restore) with CSS-drawn controls
**Confidence:** HIGH

## Summary

Phase 39 adds full window control functionality to the MDI child windows established in Phase 34. Users gain minimize, maximize, and restore buttons in each window's title bar, with three window states: normal (draggable/resizable), minimized (compact bar at workspace top), and maximized (fills workspace, hides title bar). The technical challenge lies in managing window state transitions while preserving position/size for restoration, implementing CSS-drawn window control buttons, and coordinating window activation when the active window is minimized.

The existing architecture provides strong foundations: react-rnd already handles drag/resize for normal windows, Zustand's windowSlice stores per-window position/size/zIndex, and window activation logic exists for focus management. The additions are surgical: extend WindowState type with minimized/maximized booleans plus saved position/size for restoration, render minimized windows as fixed-width bars at workspace top, use react-rnd's `updateSize()` and `updatePosition()` API to programmatically maximize windows to workspace dimensions, and implement double-click title bar detection for maximize toggle.

CSS-drawn window control buttons follow Windows conventions: minimize (horizontal line dash), maximize (single square box), restore (overlapped squares), and close (X via rotated pseudo-elements). User locked in specific styling: Windows classic button order (minimize, maximize, close), close button turns red on hover, minimize/maximize get subtle neutral highlight. All icons use pure CSS with borders and pseudo-elements, no SVGs or Unicode.

**Primary recommendation:** Extend WindowState with `isMinimized: boolean`, `isMaximized: boolean`, and `savedBounds: { x, y, width, height }` for restore state. Create MinimizedBar component (160px wide, wraps horizontally at workspace top, lower z-index than normal windows). Implement maximize by setting window bounds to workspace dimensions via react-rnd API. Add CSS-drawn button icons using ::before/::after pseudo-elements. Handle double-click on title bar with onDoubleClick event to toggle maximize. When minimizing active window, auto-activate next highest z-index window.

## User Constraints

<user_constraints>
### Locked Decisions (from CONTEXT.md)

#### Minimized bar appearance
- Fixed width: 160px per bar
- Height matches child window title bar height (~28-30px)
- Shows document name + restore button + close button (mini title bar style)
- Uses the same styling as child window title bars (colors, font, active/inactive states)

#### Bar positioning & stacking
- Bars positioned at the **top** of the workspace, not bottom
- Lower z-index than normal windows — active windows render on top of minimized bars
- Horizontal row, left-to-right ordering
- Wraps to second row if bars overflow workspace width

#### Minimize/restore behavior
- **Instant swap** — no animation or transition, window disappears and bar appears immediately
- Restore returns window to **previous position and size**, brought to front (top z-order)
- When a window is minimized, the **next topmost window auto-activates**
- Minimized bars are **draggable** — user can reorder/reposition them within the workspace

#### Title bar button layout
- Button order: minimize, maximize, close (Windows classic: _ [] X)
- All three buttons present from Phase 39 — maximize is **fully functional**, not a placeholder
- Icons are **CSS-drawn** (borders, pseudo-elements) — no SVGs or Unicode text
- Hover states: **close button turns red** on hover, minimize/maximize get subtle neutral highlight

#### Maximize behavior (pulled forward from Phase 40)
- Maximized window fills entire MDI workspace area
- Maximized window hides title bar for maximum canvas space
- Maximized window canvas resizes to fill available space
- Double-click title bar toggles maximize/restore
- Restore button replaces maximize button when maximized

### Claude's Discretion
- Exact CSS-drawn icon shapes for minimize/maximize/close
- Minimized bar gap/spacing between bars
- How draggable bars snap back to grid when released
- z-index layering values
- How maximize interacts with tile/cascade window arrangement

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. Phase 40 maximize work was pulled into Phase 39 by user decision.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-rnd | 10.5.2 | Programmatic window control | Already in use for drag/resize; provides `updateSize()` and `updatePosition()` API for maximize/restore |
| Zustand | 5.0.3 | Window state storage | Already stores position/size/zIndex per window; extend with minimize/maximize flags |
| CSS pseudo-elements | Native | Window control button icons | Lightweight, scalable, no image assets; standard for pure CSS icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Flexbox | Native CSS | Minimized bar wrapping layout | Horizontal row with `flex-wrap: wrap` for multi-row overflow |
| onDoubleClick | React Native | Title bar maximize toggle | Built-in React event for detecting double-click |
| CSS z-index | Native | Layering (bars below windows) | Minimized bars at z-index 500, normal windows 1000+ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS pseudo-elements | SVG icons | Adds asset management; pseudo-elements are resolution-independent and lighter |
| CSS pseudo-elements | Unicode characters (−, □, ×) | Font rendering inconsistencies; pseudo-elements give pixel-perfect control |
| Flexbox wrapping | Absolute positioning with manual layout | Complex overflow math; flexbox handles wrapping natively |
| Zustand state extension | Separate minimize state map | Couples window position with minimize state; single source of truth is cleaner |

**Installation:**
No new dependencies — all capabilities already present in stack.

## Architecture Patterns

### Recommended State Structure

Extend `WindowState` type in `src/core/editor/slices/types.ts`:

```typescript
export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  title: string;
  isMinimized: boolean;      // NEW: window is minimized to bar
  isMaximized: boolean;      // NEW: window fills workspace
  savedBounds: {             // NEW: restore target when un-minimizing/un-maximizing
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}
```

### Pattern 1: Minimize Window Flow

**What:** Save current bounds, set isMinimized flag, auto-activate next window

**When to use:** User clicks minimize button in title bar

**Example:**
```typescript
// windowSlice.ts
minimizeWindow: (docId) => {
  set((state) => {
    const existing = state.windowStates.get(docId);
    if (!existing || existing.isMinimized) return {};

    // Save current bounds for restoration
    const savedBounds = {
      x: existing.x,
      y: existing.y,
      width: existing.width,
      height: existing.height
    };

    const newWindowStates = new Map(state.windowStates);
    newWindowStates.set(docId, {
      ...existing,
      isMinimized: true,
      savedBounds
    });

    // Auto-activate next topmost window if this was active
    let newActiveId = state.activeDocumentId;
    if (state.activeDocumentId === docId) {
      // Find next highest z-index window that isn't minimized
      const sortedWindows = Array.from(newWindowStates.entries())
        .filter(([id, ws]) => id !== docId && !ws.isMinimized)
        .sort((a, b) => b[1].zIndex - a[1].zIndex);
      newActiveId = sortedWindows.length > 0 ? sortedWindows[0][0] : null;
    }

    return { windowStates: newWindowStates, activeDocumentId: newActiveId };
  });
}
```

### Pattern 2: Restore Minimized Window

**What:** Restore saved bounds, clear isMinimized, raise to front

**When to use:** User clicks minimized bar

**Example:**
```typescript
// windowSlice.ts
restoreWindow: (docId) => {
  set((state) => {
    const existing = state.windowStates.get(docId);
    if (!existing || !existing.isMinimized) return {};

    const newWindowStates = new Map(state.windowStates);
    newWindowStates.set(docId, {
      ...existing,
      x: existing.savedBounds?.x ?? existing.x,
      y: existing.savedBounds?.y ?? existing.y,
      width: existing.savedBounds?.width ?? existing.width,
      height: existing.savedBounds?.height ?? existing.height,
      isMinimized: false,
      zIndex: state.nextZIndex
    });

    return {
      windowStates: newWindowStates,
      nextZIndex: state.nextZIndex + 1,
      activeDocumentId: docId
    };
  });
}
```

### Pattern 3: Maximize Window

**What:** Save current bounds, query workspace dimensions, set position to (0,0) and size to workspace bounds, set isMaximized flag

**When to use:** User clicks maximize button or double-clicks title bar

**Example:**
```typescript
// windowSlice.ts
maximizeWindow: (docId) => {
  set((state) => {
    const existing = state.windowStates.get(docId);
    if (!existing || existing.isMaximized) return {};

    // Query workspace dimensions
    const workspace = document.querySelector('.workspace');
    const workspaceWidth = workspace?.clientWidth || 1200;
    const workspaceHeight = workspace?.clientHeight || 800;

    // Save current bounds for restoration
    const savedBounds = {
      x: existing.x,
      y: existing.y,
      width: existing.width,
      height: existing.height
    };

    const newWindowStates = new Map(state.windowStates);
    newWindowStates.set(docId, {
      ...existing,
      x: 0,
      y: 0,
      width: workspaceWidth,
      height: workspaceHeight,
      isMaximized: true,
      savedBounds
    });

    return { windowStates: newWindowStates };
  });
}
```

### Pattern 4: Restore Maximized Window

**What:** Restore saved bounds, clear isMaximized flag

**When to use:** User clicks restore button or double-clicks title bar while maximized

**Example:**
```typescript
// windowSlice.ts
unmaximizeWindow: (docId) => {
  set((state) => {
    const existing = state.windowStates.get(docId);
    if (!existing || !existing.isMaximized) return {};

    const newWindowStates = new Map(state.windowStates);
    newWindowStates.set(docId, {
      ...existing,
      x: existing.savedBounds?.x ?? existing.x,
      y: existing.savedBounds?.y ?? existing.y,
      width: existing.savedBounds?.width ?? existing.width,
      height: existing.savedBounds?.height ?? existing.height,
      isMaximized: false
    });

    return { windowStates: newWindowStates };
  });
}
```

### Pattern 5: CSS-Drawn Window Control Buttons

**What:** Create button icons using borders and pseudo-elements for minimize (dash), maximize (square), restore (overlapped squares), close (X)

**When to use:** Rendering title bar buttons

**Example:**
```css
/* Minimize button - horizontal dash */
.window-minimize-btn::before {
  content: '';
  display: block;
  width: 8px;
  height: 2px;
  background: currentColor;
}

/* Maximize button - single square */
.window-maximize-btn::before {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
}

/* Restore button - overlapped squares */
.window-restore-btn::before {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
  position: relative;
  left: -2px;
  top: 2px;
}

.window-restore-btn::after {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
  border-bottom: 0;
  border-left: 0;
  position: absolute;
  top: 0;
  left: 2px;
}

/* Close button - X via rotated lines */
.window-close-btn::before,
.window-close-btn::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 2px;
  background: currentColor;
  top: 50%;
  left: 50%;
}

.window-close-btn::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.window-close-btn::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

/* Hover states */
.window-close-btn:hover {
  background: #dc3545; /* Red */
  color: white;
}

.window-minimize-btn:hover,
.window-maximize-btn:hover,
.window-restore-btn:hover {
  background: var(--bg-hover); /* Neutral highlight */
}
```

### Pattern 6: MinimizedBar Component

**What:** Render minimized windows as compact bars at workspace top using flexbox wrapping

**When to use:** Window has isMinimized flag set

**Example:**
```typescript
// components/Workspace/MinimizedBar.tsx
import React from 'react';
import { useEditorStore } from '@core/editor';

interface Props {
  documentId: string;
}

export const MinimizedBar: React.FC<Props> = ({ documentId }) => {
  const windowState = useEditorStore((state) => state.windowStates.get(documentId));
  const isActive = useEditorStore((state) => state.activeDocumentId === documentId);
  const restoreWindow = useEditorStore((state) => state.restoreWindow);
  const closeDocument = useEditorStore((state) => state.closeDocument);

  if (!windowState || !windowState.isMinimized) return null;

  const handleRestore = () => restoreWindow(documentId);
  const handleClose = () => closeDocument(documentId);

  return (
    <div className={`minimized-bar ${isActive ? 'active' : ''}`}>
      <div className="minimized-title" onClick={handleRestore}>
        {windowState.title}
      </div>
      <button className="minimized-restore-btn" onClick={handleRestore} title="Restore">
        <span className="restore-icon" />
      </button>
      <button className="minimized-close-btn" onClick={handleClose} title="Close">
        ×
      </button>
    </div>
  );
};
```

```css
/* Minimized bar container in workspace */
.minimized-bars-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  z-index: 500; /* Below normal windows (1000+) */
}

/* Individual minimized bar */
.minimized-bar {
  width: 160px;
  height: 28px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
}

.minimized-bar.active {
  background: var(--accent-primary);
  color: white;
}

.minimized-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}
```

### Pattern 7: Double-Click Title Bar Maximize Toggle

**What:** Detect double-click on title bar, toggle between maximize and restore

**When to use:** User double-clicks window title bar

**Example:**
```typescript
// ChildWindow.tsx
const handleTitleBarDoubleClick = useCallback(() => {
  if (windowState.isMaximized) {
    unmaximizeWindow(documentId);
  } else {
    maximizeWindow(documentId);
  }
}, [documentId, windowState.isMaximized, maximizeWindow, unmaximizeWindow]);

// In JSX:
<div
  className="window-title-bar"
  onMouseDown={handleTitleBarMouseDown}
  onDoubleClick={handleTitleBarDoubleClick}
>
  {/* ... */}
</div>
```

### Pattern 8: Conditional Title Bar Rendering for Maximized Windows

**What:** Hide title bar when window is maximized to maximize canvas space

**When to use:** Window has isMaximized flag set

**Example:**
```typescript
// ChildWindow.tsx
return (
  <Rnd {...rndProps}>
    <div className={`child-window ${isActive ? 'active' : ''} ${windowState.isMaximized ? 'maximized' : ''}`}>
      {!windowState.isMaximized && (
        <div className="window-title-bar" onDoubleClick={handleTitleBarDoubleClick}>
          {/* Title bar content */}
        </div>
      )}
      <div className="window-content">
        <MapCanvas {...canvasProps} />
      </div>
    </div>
  </Rnd>
);
```

### Anti-Patterns to Avoid

- **Animating minimize/restore transitions:** User specified instant swap, not animated transitions
- **Using window.innerWidth/outerHeight for maximize:** Workspace may not fill entire browser window; query `.workspace` element dimensions instead
- **Storing minimize state separately from window state:** Couples position/size with visibility; single WindowState object is single source of truth
- **Manually calculating minimized bar positions:** Flexbox with `flex-wrap: wrap` handles horizontal wrapping automatically
- **Forgetting to auto-activate next window on minimize:** Leaves workspace with no active document; always activate next highest z-index window

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS button icons | Import icon library (Font Awesome, Material Icons) | CSS pseudo-elements with borders | No external dependencies, resolution-independent, <100 bytes per icon |
| Programmatic window resize | Directly manipulate DOM styles | react-rnd `updateSize()` and `updatePosition()` API | Maintains internal state consistency, respects bounds constraints |
| Flexbox wrapping layout | Manual absolute positioning with overflow calculation | `display: flex; flex-wrap: wrap` | Browser handles wrapping natively, adapts to workspace resize automatically |
| Z-index sorting for next window | Custom sorting algorithm | Array.from().filter().sort() with z-index comparison | Standard JS array methods, concise, performant for <8 windows |

**Key insight:** Window control UX has decades of OS-level conventions (double-click title bar, minimize to bottom/top bar, close button turns red). Don't innovate on these patterns; users have muscle memory.

## Common Pitfalls

### Pitfall 1: Maximized Window Doesn't Resize with Workspace

**What goes wrong:** User resizes Electron window, maximized child window stays at old dimensions

**Why it happens:** Maximize only sets dimensions once, doesn't listen for workspace resize events

**How to avoid:** Use CSS instead of fixed pixel dimensions for maximized windows

**Warning signs:** Maximized window shows gaps/overflow when Electron window is resized

**Solution:**
```typescript
// Instead of setting width/height in pixels:
// WRONG:
newWindowStates.set(docId, { ...existing, width: 1200, height: 800, isMaximized: true });

// RIGHT:
newWindowStates.set(docId, { ...existing, width: '100%', height: '100%', isMaximized: true });

// OR: Use ResizeObserver to update on workspace dimension change
useEffect(() => {
  if (!windowState.isMaximized) return;

  const workspace = document.querySelector('.workspace');
  const observer = new ResizeObserver(() => {
    updateWindowState(documentId, {
      width: workspace.clientWidth,
      height: workspace.clientHeight
    });
  });

  if (workspace) observer.observe(workspace);
  return () => observer.disconnect();
}, [windowState.isMaximized, documentId, updateWindowState]);
```

### Pitfall 2: Minimized Bars Render Above Active Windows

**What goes wrong:** Minimized bars obscure the top portion of normal windows

**Why it happens:** Z-index not properly layered (bars at 1000+, windows also at 1000+)

**How to avoid:** Reserve separate z-index ranges: bars 500-999, windows 1000+

**Warning signs:** Active window content hidden behind minimized bars at workspace top

**Solution:**
```typescript
// windowSlice.ts constants
const BASE_Z_INDEX = 1000;           // Start for normal windows
const MINIMIZED_BAR_Z_INDEX = 500;   // Fixed z-index for minimized bars

// In MinimizedBar.css:
.minimized-bars-container {
  z-index: 500; /* Always below normal windows */
}
```

### Pitfall 3: Double-Click Title Bar Drags Window Instead

**What goes wrong:** First click in double-click starts drag operation, second click completes drag

**Why it happens:** mousedown handler initiates drag before doubleClick fires

**How to avoid:** Prevent drag on doubleClick, or use click timeout to distinguish single vs double

**Warning signs:** User double-clicks title bar, window moves instead of maximizing

**Solution:**
```typescript
const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const isDraggingRef = useRef(false);

const handleTitleBarMouseDown = (e: React.MouseEvent) => {
  // Delay drag initiation to allow doubleClick to fire first
  dragTimeoutRef.current = setTimeout(() => {
    isDraggingRef.current = true;
    // Start drag logic here
  }, 200);
};

const handleTitleBarMouseUp = () => {
  if (dragTimeoutRef.current) {
    clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = null;
  }
  isDraggingRef.current = false;
};

const handleTitleBarDoubleClick = () => {
  // Cancel any pending drag
  if (dragTimeoutRef.current) {
    clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = null;
  }

  // Toggle maximize
  if (windowState.isMaximized) {
    unmaximizeWindow(documentId);
  } else {
    maximizeWindow(documentId);
  }
};
```

### Pitfall 4: Restore Returns to Wrong Position After Cascade/Tile

**What goes wrong:** User tiles windows, minimizes one, restores it — window returns to pre-tile position

**Why it happens:** savedBounds captures state at minimize time, not accounting for arrangement commands

**How to avoid:** Update savedBounds on any position change (drag, tile, cascade), not just at minimize

**Warning signs:** Restored window position doesn't match position before minimize

**Solution:**
```typescript
// windowSlice.ts - update savedBounds on every position change
updateWindowState: (docId, updates) => {
  set((state) => {
    const existing = state.windowStates.get(docId);
    if (!existing) return {};

    const newWindowStates = new Map(state.windowStates);

    // If position/size changed and window is not minimized/maximized, update savedBounds
    const positionChanged = 'x' in updates || 'y' in updates || 'width' in updates || 'height' in updates;
    const needsSavedBoundsUpdate = positionChanged && !existing.isMinimized && !existing.isMaximized;

    const savedBounds = needsSavedBoundsUpdate
      ? {
          x: updates.x ?? existing.x,
          y: updates.y ?? existing.y,
          width: updates.width ?? existing.width,
          height: updates.height ?? existing.height
        }
      : existing.savedBounds;

    newWindowStates.set(docId, { ...existing, ...updates, savedBounds });
    return { windowStates: newWindowStates };
  });
}
```

### Pitfall 5: Maximized Window Canvas Doesn't Fill Space

**What goes wrong:** Title bar is hidden but canvas still sized for window-with-titlebar dimensions

**Why it happens:** MapCanvas doesn't recalculate available space when title bar visibility changes

**How to avoid:** Use `flex: 1` on window-content container so canvas auto-expands

**Warning signs:** White space at bottom of maximized window where title bar used to be

**Solution:**
```css
/* Workspace.css */
.child-window.maximized .window-content {
  flex: 1; /* Expand to fill all available space */
}

/* Alternative: Calculate canvas height dynamically */
.window-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative; /* Canvas can position:absolute with inset:0 */
}
```

## Code Examples

Verified patterns from existing codebase and standard React/CSS practices:

### Using react-rnd updatePosition/updateSize API
```typescript
// Source: react-rnd GitHub README
import { Rnd } from 'react-rnd';

const MyWindow: React.FC = () => {
  const rndRef = useRef<Rnd>(null);

  const maximize = () => {
    rndRef.current?.updatePosition({ x: 0, y: 0 });
    rndRef.current?.updateSize({ width: '100%', height: '100%' });
  };

  return (
    <Rnd ref={rndRef} {...props}>
      {/* content */}
    </Rnd>
  );
};
```

### Zustand selector pattern for window state
```typescript
// Source: Existing codebase (ChildWindow.tsx)
const windowState = useEditorStore((state) => state.windowStates.get(documentId));
const isActive = useEditorStore((state) => state.activeDocumentId === documentId);
const updateWindowState = useEditorStore((state) => state.updateWindowState);
```

### Flexbox wrapping for minimized bars
```css
/* Source: Modern CSS Layout Techniques (CSS-Tricks Flexbox Guide) */
.minimized-bars-container {
  display: flex;
  flex-wrap: wrap; /* Items wrap to next line */
  gap: 4px;        /* Space between bars */
  align-items: flex-start; /* Top-align rows */
}
```

### CSS pseudo-element icon patterns
```css
/* Source: CSS Windows Minimize, Maximize, and Close Buttons (tutorialpedia.org) */
/* Minimize - horizontal line */
.minimize::before {
  content: '';
  display: block;
  width: 10px;
  height: 2px;
  background: currentColor;
}

/* Maximize - square outline */
.maximize::before {
  content: '';
  display: block;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
}

/* Close - X shape */
.close::before,
.close::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 2px;
  background: currentColor;
  top: 50%;
  left: 50%;
}
.close::before { transform: translate(-50%, -50%) rotate(45deg); }
.close::after { transform: translate(-50%, -50%) rotate(-45deg); }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SVG/PNG icon assets | Pure CSS pseudo-element icons | ~2018 | Zero network requests, resolution-independent, <100 bytes per icon |
| Manual absolute positioning | Flexbox with flex-wrap | ~2017 (CSS Grid 2017, Flexbox 2015) | Browser-native wrapping, responsive by default |
| String-based position storage | Structured WindowState type | Phase 34 (2026-02-09) | Type safety, single source of truth, easier state management |
| Global window state | Per-document window state in Map | Phase 33 (2026-02-09) | Supports multi-document, no key collisions |

**Deprecated/outdated:**
- **jQuery UI draggable:** Replaced by react-rnd (native React, TypeScript support, lighter weight)
- **Icon fonts (Font Awesome, Material Icons):** Replaced by pure CSS pseudo-elements for simple geometric icons (minimize, maximize, close)
- **Window state in component state:** Moved to Zustand for global access and persistence

## Open Questions

1. **How do minimized bars interact with tile/cascade commands?**
   - What we know: Tile/cascade currently operate on all windowStates in map
   - What's unclear: Should minimized windows be excluded from tile/cascade? Should they be restored first?
   - Recommendation: Filter out `isMinimized: true` windows from tile/cascade algorithms. User must restore manually before arranging.

2. **Should double-click work on maximized window content area?**
   - What we know: Title bar is hidden when maximized, so title bar double-click isn't available
   - What's unclear: Should double-click on canvas/content restore maximized window?
   - Recommendation: No — canvas already handles double-click for tool operations. Provide only the restore button for un-maximize. This matches Windows OS behavior (maximized windows require title bar button or Win+Down keyboard shortcut).

3. **How should minimize/maximize interact with undo/redo?**
   - What we know: Undo/redo currently tracks map tile changes, not window state changes
   - What's unclear: Should window minimize/maximize be undoable actions?
   - Recommendation: No — window state is ephemeral UI state, not document content. Undo/redo should remain tile-operation-only. This matches standard MDI behavior.

4. **What happens if user closes active window while minimized bars exist?**
   - What we know: closeDocument auto-activates next document in documents map
   - What's unclear: Should it prefer non-minimized windows over minimized windows?
   - Recommendation: Yes — when auto-activating on close, filter to non-minimized windows first. Only activate a minimized window if no normal windows remain.

## Sources

### Primary (HIGH confidence)
- **react-rnd GitHub README** - Component API for updatePosition/updateSize methods
  - https://github.com/bokuweb/react-rnd
- **Existing codebase** - ChildWindow.tsx, windowSlice.ts, Workspace.css patterns
  - E:\NewMapEditor\src\components\Workspace\ChildWindow.tsx
  - E:\NewMapEditor\src\core\editor\slices\windowSlice.ts
- **MDN CSS z-index** - Stacking context documentation
  - https://developer.mozilla.org/en-US/docs/Web/CSS/z-index
- **MDN CSS Flexbox** - Flexible box layout specification
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Wrapping_items

### Secondary (MEDIUM confidence)
- **CSS-Tricks Flexbox Guide** - Complete guide to CSS flexbox wrapping behavior
  - https://css-tricks.com/snippets/css/a-guide-to-flexbox/
- **tutorialpedia.org** - CSS Windows minimize, maximize, and close buttons patterns
  - https://www.tutorialpedia.org/blog/css-windows-minimize-maximize-close-buttons/
- **KendoReact Window Docs** - Minimize/maximize state management patterns in React
  - https://www.telerik.com/kendo-react-ui/components/dialogs/window/minimizing-fullscreen
- **React Desktop TitleBar Component** - TitleBar component patterns with window controls
  - https://www.geeksforgeeks.org/react-desktop-windows-titlebar-component/

### Tertiary (LOW confidence)
- **Pure CSS Icons Gallery** - General CSS icon techniques (not window-control-specific)
  - https://www.hongkiat.com/blog/pure-css-icons-gallery/
- **State Management in React 2026** - Zustand as current best practice for client state
  - https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All libraries already in use (react-rnd, Zustand, CSS), no new dependencies
- Architecture: **HIGH** - Extends existing WindowState pattern from Phase 34, follows established Zustand slice pattern
- Pitfalls: **MEDIUM-HIGH** - Double-click drag conflict is known issue, maximize resize behavior requires testing

**Research date:** 2026-02-10
**Valid until:** ~30 days (stable technologies, no fast-moving dependencies)
