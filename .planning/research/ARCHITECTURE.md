# Architecture Patterns: v1.1 Canvas and Polish

**Domain:** Scrollbar arrows and collapsible panels for map editor
**Researched:** 2026-02-02
**Confidence:** HIGH (all patterns verified against existing codebase and library docs)

## Current Architecture Overview

The editor uses a straightforward React component hierarchy with Zustand for state management:

```
App.tsx
  |-- ToolBar (keyboard shortcuts, tool selection)
  |-- PanelGroup (react-resizable-panels, horizontal)
  |     |-- Panel#main
  |     |     |-- main-area (div wrapper)
  |     |           |-- MapCanvas (canvas + custom scrollbars)
  |     |           |-- Minimap (overlay)
  |     |-- PanelResizeHandle
  |     |-- Panel#sidebar
  |           |-- RightSidebar
  |                 |-- AnimationPreview
  |                 |-- TilePalette
  |                 |-- MapSettingsPanel
  |-- StatusBar
```

**Key integration points for v1.1:**

| Component | Current State | v1.1 Integration |
|-----------|---------------|------------------|
| MapCanvas.tsx | Custom scrollbar implementation (thumb only) | Add arrow buttons |
| MapCanvas.css | Scrollbar styling (hardcoded colors) | Migrate to CSS variables, add arrow styles |
| App.tsx | PanelGroup with Panel components | No changes needed |
| RightSidebar.tsx | Stacked sections | Add collapse button (optional) |

## Scrollbar Arrow Buttons Integration

### Recommended Approach: Extend Existing Implementation

The current scrollbar implementation in `MapCanvas.tsx` is self-contained with:
- State: `scrollDrag` for tracking drag operations
- Metrics: `getScrollMetrics()` calculating thumb position/size
- Handlers: `handleScrollMouseDown`, `handleScrollMouseMove`, `handleScrollMouseUp`
- JSX: Horizontal and vertical track/thumb divs

**Decision: Keep scrollbar implementation in MapCanvas.tsx**

Rationale:
1. Scrollbar behavior is tightly coupled to viewport state
2. Arrow click handlers need direct access to `setViewport`
3. No benefit to extracting - would require prop drilling or context
4. Existing pattern works well and is maintainable

### Component Boundaries

**MapCanvas.tsx Changes:**

```
Container: .map-canvas-container
  |-- <canvas>
  |-- Horizontal scrollbar group:
  |     |-- .scroll-arrow-h.left (NEW)
  |     |-- .scroll-track-h
  |     |     |-- .scroll-thumb-h
  |     |-- .scroll-arrow-h.right (NEW)
  |-- Vertical scrollbar group:
  |     |-- .scroll-arrow-v.up (NEW)
  |     |-- .scroll-track-v
  |     |     |-- .scroll-thumb-v
  |     |-- .scroll-arrow-v.down (NEW)
  |-- Corner square (NEW, covers 14x14px intersection)
```

**New Functions Needed:**

| Function | Purpose |
|----------|---------|
| `handleArrowClick(direction)` | Scroll viewport by one screen worth |
| `handleArrowMouseDown(direction)` | Start continuous scroll on hold |
| `handleArrowMouseUp()` | Stop continuous scroll |

### Scrolling Behavior

Reference existing wheel zoom for scroll amount calculation:

```typescript
// Current visible tiles calculation (from getScrollMetrics):
const tilePixels = TILE_SIZE * viewport.zoom;
const visibleTilesX = canvas.width / tilePixels;
const visibleTilesY = canvas.height / tilePixels;

// Arrow click scroll amount (one screen worth, minus overlap):
const scrollAmount = Math.max(1, Math.floor(visibleTiles - 1));
```

**Continuous scroll on hold:**
- Use `setInterval` while mouse button held
- 100ms interval (10 scrolls/second feels responsive)
- Clear interval on mouseup or mouseleave
- Initial delay of 300ms before continuous scroll starts (prevent accidental continuous scroll)

### CSS Structure for Scrollbar Arrows

```css
/* Arrow button base */
.scroll-arrow {
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroll-arrow:hover {
  background: var(--bg-active);
}

.scroll-arrow:active {
  background: var(--accent-color);
}

/* Arrow icons via CSS borders (no external assets) */
.scroll-arrow::after {
  content: '';
  border: 4px solid transparent;
}

.scroll-arrow-h.left::after {
  border-right-color: var(--text-secondary);
}
/* etc. */
```

## Collapsible Panels Integration

### react-resizable-panels Collapse API

The library provides imperative API for collapsing (verified from [npm documentation](https://www.npmjs.com/package/react-resizable-panels)):

```typescript
import { ImperativePanelHandle, Panel } from 'react-resizable-panels';

const sidebarRef = useRef<ImperativePanelHandle>(null);

// Usage:
<Panel
  id="sidebar"
  ref={sidebarRef}
  collapsible={true}
  collapsedSize={0}
  minSize={15}
>
```

Methods available on `ImperativePanelHandle`:
- `collapse()` - Collapse to collapsedSize
- `expand()` - Restore to previous size
- `isCollapsed()` - Check current state
- `getSize()` - Get current size percentage

### Where to Place Collapse Button

**Option A: In PanelResizeHandle (Recommended)**

Place a button on the resize handle itself:

```tsx
<PanelResizeHandle className="resize-handle-vertical">
  <button
    className="collapse-button"
    onClick={() => sidebarRef.current?.isCollapsed()
      ? sidebarRef.current?.expand()
      : sidebarRef.current?.collapse()}
  />
</PanelResizeHandle>
```

Advantages:
- Visually associated with resize operation
- Common pattern in IDEs (VS Code uses similar)
- Works without adding new components

**Option B: In RightSidebar Header**

Add a toggle button inside the sidebar itself.

Disadvantage: Button disappears when collapsed (need separate expand mechanism).

**Option C: In ToolBar**

Add sidebar toggle to toolbar.

Disadvantage: Not discoverable at panel location.

### Recommended Implementation

Use Option A (resize handle button) with fallback double-click:

```tsx
// App.tsx additions
const sidebarRef = useRef<ImperativePanelHandle>(null);

<PanelResizeHandle
  className="resize-handle-vertical"
  onDoubleClick={() => {
    if (sidebarRef.current?.isCollapsed()) {
      sidebarRef.current?.expand();
    } else {
      sidebarRef.current?.collapse();
    }
  }}
>
  <button
    className="collapse-toggle"
    onClick={(e) => {
      e.stopPropagation();
      if (sidebarRef.current?.isCollapsed()) {
        sidebarRef.current?.expand();
      } else {
        sidebarRef.current?.collapse();
      }
    }}
    aria-label={sidebarRef.current?.isCollapsed() ? "Expand sidebar" : "Collapse sidebar"}
  >
    {/* Chevron icon */}
  </button>
</PanelResizeHandle>

<Panel
  id="sidebar"
  ref={sidebarRef}
  collapsible={true}
  collapsedSize={0}
  minSize={15}
>
```

### State Persistence

Collapsed state persists automatically via existing layout persistence:
- `onLayoutChanged` callback already saves to localStorage
- When collapsed, size becomes 0 (or collapsedSize)
- On load, `defaultLayout` will restore collapsed state

No additional work needed - react-resizable-panels handles this.

## CSS Variable Migration

### Files Requiring Migration

From v1.0 tech debt (verified in codebase):

| File | Status | Action |
|------|--------|--------|
| MapCanvas.css | Hardcoded | Migrate |
| StatusBar.css | Hardcoded | Migrate |
| MapSettingsPanel.css | Hardcoded | Migrate |
| AnimationPanel.css | Hardcoded | Migrate |
| AnimationPreview.css | Partial (has `#0d0d1a`) | Complete migration |

### Color Mapping

Current hardcoded values map to existing variables:

| Hardcoded | CSS Variable | Notes |
|-----------|--------------|-------|
| `#1a1a2e` | `var(--bg-primary)` | Main background |
| `#2a2a3e`, `#2a2a4e` | `var(--bg-secondary)` | Secondary background |
| `#0d0d1a` | New: `var(--bg-darker)` | Deeper background for inputs |
| `#3a3a4e` | `var(--border-color)` | Borders |
| `#4a4a6e`, `#4a4a8e` | `var(--bg-active)` | Active states |
| `#5a5a7e`, `#5a5a8e` | `var(--accent-color)` | Accents |
| `#6a6aae`, `#8a8ace` | New: `var(--accent-hover)` | Accent hover/active |
| `#e0e0e0`, `#cccccc` | `var(--text-primary)` | Primary text |
| `#888`, `#666` | `var(--text-secondary)` | Secondary text |

### New Variables to Add (App.css :root)

```css
:root {
  /* Existing... */

  /* New for complete coverage */
  --bg-darker: #0d0d1a;
  --accent-hover: #6a6aae;
}
```

## Keyboard Shortcuts for Tooltips

### Existing Keyboard Shortcut Implementation

ToolBar.tsx already handles keyboard shortcuts via `useEffect`:

```typescript
// Line 52-93 of ToolBar.tsx
React.useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Z, Ctrl+Y
    }
    // Tool shortcuts (single letter)
    const tool = tools.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
    if (tool) setTool(tool.tool);
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [...]);
```

### Current Tooltip Implementation

Using native HTML `title` attribute:

```tsx
<button title={`${tool.label} (${tool.shortcut})`}>
```

### Adding Radix Tooltips

For richer tooltips showing keyboard shortcuts:

```tsx
import * as Tooltip from '@radix-ui/react-tooltip';

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <button>...</button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="tooltip-content">
        {tool.label}
        <kbd className="tooltip-shortcut">{tool.shortcut}</kbd>
        <Tooltip.Arrow className="tooltip-arrow" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

**Dependency:** Requires `@radix-ui/react-tooltip` (not currently installed).

**Alternative:** Enhanced native tooltips using CSS:

```css
.toolbar-button {
  position: relative;
}

.toolbar-button::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -24px;
  /* ... tooltip styles */
  opacity: 0;
  transition: opacity 0.15s;
}

.toolbar-button:hover::after {
  opacity: 1;
}
```

**Recommendation:** Use Radix tooltips for accessibility and positioning control. It's a small dependency (tree-shakeable) with proper keyboard/screen reader support.

## Build Order Recommendations

Based on dependency analysis:

### Phase Order

1. **CSS Variable Migration** (No dependencies)
   - Pure CSS changes
   - No runtime impact
   - Quick wins, low risk
   - Fixes tech debt from v1.0

2. **Scrollbar Arrow Buttons** (Independent)
   - Self-contained in MapCanvas
   - Uses existing state patterns
   - No external dependencies

3. **Panel Collapse** (Independent)
   - Uses existing react-resizable-panels
   - Minimal code changes
   - Leverages library API

4. **Radix Tooltips** (If included in scope)
   - New dependency
   - ToolBar refactor
   - Lower priority

### Parallel Workstreams

CSS migration and scrollbar arrows can proceed in parallel - no conflicts.

Panel collapse is independent of scrollbar work.

## Summary

### Components Modified

| Component | Changes |
|-----------|---------|
| MapCanvas.tsx | Add arrow buttons, continuous scroll handlers |
| MapCanvas.css | Add arrow styles, migrate to CSS variables |
| App.tsx | Add ref to sidebar Panel, add collapsible prop |
| App.css | Add new CSS variables |
| StatusBar.css | Migrate to CSS variables |
| MapSettingsPanel.css | Migrate to CSS variables |
| AnimationPanel.css | Migrate to CSS variables |
| AnimationPreview.css | Complete variable migration |

### New Components

None required. All features integrate into existing components.

### New Dependencies

| Package | Purpose | Required? |
|---------|---------|-----------|
| @radix-ui/react-tooltip | Rich tooltips | Optional |

### Integration Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSS variable migration breaks light theme | LOW | Test both color schemes |
| Scrollbar arrows conflict with existing scroll logic | LOW | Reuse existing patterns |
| Panel collapse state not persisting | VERY LOW | Library handles automatically |

## Sources

- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - Collapse API documentation
- [GitHub bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) - Imperative panel API
- Existing codebase: MapCanvas.tsx, App.tsx, EditorState.ts
- v1.0 ROADMAP.md - Tech debt tracking for CSS variables
