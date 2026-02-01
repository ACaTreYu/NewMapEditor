# Phase 2: Layout and Toolbar - Research

**Researched:** 2026-02-01
**Domain:** React layout architecture, resizable panels, system theme integration
**Confidence:** HIGH

## Summary

Professional editor-style layouts with horizontal toolbar and resizable panels are well-established patterns in modern React/Electron applications. The standard approach uses either dedicated resizable panel libraries (react-resizable-panels or Allotment) or custom flexbox-based implementations with mouse event handling. System theme detection via `prefers-color-scheme` CSS media query is fully supported across browsers. Panel state persistence in Electron applications uses either localStorage in the renderer process or JSON files via the main process filesystem access.

The current codebase already implements flexbox layout patterns and has established IPC handlers for file operations. The phase should extend this foundation with resizable divider logic and state persistence for UI preferences.

**Primary recommendation:** Use react-resizable-panels 4.5.6 for resizable dividers (battle-tested, accessible), CSS custom properties with `prefers-color-scheme` for theming, and localStorage for panel size persistence.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | 4.5.6 | Resizable panel layouts | 317k dependents, accessibility-first, keyboard navigation, maintained by Brian Vaughn |
| CSS Flexbox | Native | Layout structure | Native browser support, no dependencies, full control |
| prefers-color-scheme | Native CSS | System theme detection | W3C standard, supported since 2020, automatic OS integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Allotment | 1.20.5 | Alternative resizable panels | If you want VS Code's exact split-view behavior |
| electron-window-state | Latest | Window state persistence | If you need window size/position persistence (not UI panels) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-resizable-panels | Custom implementation | More control, but must handle edge cases (touch events, keyboard a11y, min/max constraints) |
| react-resizable-panels | Allotment | VS Code heritage, similar features, but fewer downloads (113k vs 317k) |
| localStorage | Electron main process JSON | Better for large datasets, but overkill for single panel size value |

**Installation:**
```bash
npm install react-resizable-panels
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── Layout/              # New: layout container with resizable panels
│   │   ├── Layout.tsx       # Main layout component
│   │   └── Layout.css       # Layout-specific styles
│   ├── ToolBar/             # Existing: refactor for new design
│   ├── MapCanvas/           # Existing: stays in place
│   └── [other panels]/      # Existing components
└── App.tsx                  # Modify to use Layout component
```

### Pattern 1: Resizable Panel Layout
**What:** PanelGroup container with Panel children separated by PanelResizeHandle
**When to use:** Any layout requiring user-adjustable regions
**Example:**
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

<PanelGroup direction="vertical">
  <Panel defaultSize={75} minSize={40} maxSize={90}>
    <MapCanvas />
  </Panel>
  <PanelResizeHandle className="resize-handle" />
  <Panel defaultSize={25} minSize={10} maxSize={60}>
    <BottomPanel />
  </Panel>
</PanelGroup>
```

**Key constraints:**
- Panel elements must be direct children of PanelGroup
- Direction "vertical" means vertical split (horizontal divider)
- Sizes are percentages by default
- Use `onLayout` callback for persistence

### Pattern 2: System Theme Detection
**What:** CSS media query that detects OS dark/light mode preference
**When to use:** Always, for native-feeling applications
**Example:**
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --border-color: #e0e0e0;
  --text-primary: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a2e;
    --bg-secondary: #2a2a3e;
    --border-color: #3a3a4e;
    --text-primary: #cccccc;
  }
}
```

**JavaScript detection for dynamic changes:**
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

darkModeQuery.addEventListener('change', (e) => {
  console.log('Theme changed to:', e.matches ? 'dark' : 'light');
  // Re-render or update theme variables if needed
});
```

### Pattern 3: Pressed Button Effect
**What:** CSS transitions for 3D sunken button appearance
**When to use:** Active tool indicators
**Example:**
```css
/* Source: https://css-tricks.com/getting-deep-into-shadows/ */
.toolbar-button {
  border: 1px solid transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.15s ease;
}

.toolbar-button:hover {
  border-color: var(--border-color);
}

.toolbar-button.active {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  transform: translateY(1px);
  background-color: var(--bg-active);
}
```

### Pattern 4: State Persistence
**What:** Save UI preferences to localStorage on change
**When to use:** Any user-adjustable UI state
**Example:**
```typescript
// Save on resize
const handleLayoutChange = (sizes: number[]) => {
  localStorage.setItem('panelSizes', JSON.stringify(sizes));
};

// Restore on mount
const [defaultSizes, setDefaultSizes] = useState<number[]>(() => {
  const saved = localStorage.getItem('panelSizes');
  return saved ? JSON.parse(saved) : [75, 25];
});

<PanelGroup direction="vertical" onLayout={handleLayoutChange}>
  <Panel defaultSize={defaultSizes[0]}>...</Panel>
  <Panel defaultSize={defaultSizes[1]}>...</Panel>
</PanelGroup>
```

### Pattern 5: Full-Height Layout
**What:** Flexbox container taking full viewport height
**When to use:** Electron apps where body should fill window
**Example:**
```css
/* Source: https://github.com/trstringer/electron-flexbox-ui-layout */
html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
```

### Anti-Patterns to Avoid
- **Pixel-based min/max sizes with react-resizable-panels:** Library doesn't support pixel constraints, use percentages or remove constraints
- **Non-direct Panel children:** Wrapping Panel in divs breaks layout, Panel must be direct child of PanelGroup
- **Using onLayout instead of onLayoutChange:** onLayout fires on every pointer move, onLayoutChange fires only when released
- **Animating width/height for resize:** Use transform instead for GPU-accelerated smooth resizing

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable dividers | Custom mouse drag handlers | react-resizable-panels | Keyboard accessibility, touch support, collision detection, min/max enforcement, collapsed states |
| Theme detection | Manual OS queries | `prefers-color-scheme` CSS | Native browser support, auto-updates on OS change, no JavaScript needed |
| Panel state persistence | Custom file format | localStorage + JSON.stringify | Built into browsers, synchronous access, no IPC overhead |
| Toolbar tooltips | Custom hover delays | Native `title` attribute | Browser handles timing, accessibility built-in, no dependencies |
| Resize cursors | Custom cursor images | CSS cursor: `row-resize` / `col-resize` | Native OS cursors, automatic direction indicators, accessibility |

**Key insight:** Layout and theming are solved problems with native browser/CSS solutions. Use libraries for complex interaction patterns (resizing), native features for everything else.

## Common Pitfalls

### Pitfall 1: Panel Doesn't Take Height
**What goes wrong:** Panel renders with 0 height, invisible content
**Why it happens:** react-resizable-panels and Allotment both require explicit container sizing. PanelGroup takes dimensions from parent, which defaults to content height (0 if children have no intrinsic height).
**How to avoid:**
- Set parent to `height: 100%` or `flex: 1`
- Verify chain: html → body → #root → .app → PanelGroup all have explicit height
**Warning signs:** Panel content visible in dev tools but not on screen, computed height is 0px

### Pitfall 2: Layout Jumps on Initial Render
**What goes wrong:** Panels flash to wrong sizes then snap to correct sizes
**Why it happens:** defaultSize loads from localStorage after first render, causing layout shift
**How to avoid:** Use lazy initial state `useState(() => { ... })` to load from localStorage synchronously before first render
**Warning signs:** Visible flash/jump when app loads with saved state

### Pitfall 3: Panel Sizes Don't Persist
**What goes wrong:** User resizes panels, refreshes page, sizes reset
**Why it happens:** Using `onLayout` instead of `onLayoutChange`, or saving happens but loading doesn't restore to Panel components
**How to avoid:**
- Use `onLayoutChange` callback (fires on pointer release, not every move)
- Pass loaded sizes to Panel `defaultSize` props, not `size` (controlled vs uncontrolled)
**Warning signs:** Console logs show saving but Panel always renders with hardcoded sizes

### Pitfall 4: Theme Variables Don't Update
**What goes wrong:** Dark mode enabled in OS, but app stays light (or vice versa)
**Why it happens:** CSS custom properties defined outside `:root` or missing `@media (prefers-color-scheme)` queries
**How to avoid:**
- Define all theme variables in `:root` pseudo-class
- Use CSS custom properties (CSS variables), not hardcoded values
- Verify with DevTools: check computed styles update when OS theme changes
**Warning signs:** Computed values in inspector don't change when toggling OS dark mode

### Pitfall 5: Toolbar Buttons Lack Feedback
**What goes wrong:** Users click but don't notice active tool changed
**Why it happens:** No visual distinction between active and inactive states, or transition too subtle
**How to avoid:**
- Use multiple visual cues: inset shadow + background color + border
- Test at normal viewing distance (not close to monitor)
- Verify 4.5:1 contrast ratio between active/inactive states
**Warning signs:** User testing shows confusion about which tool is selected

### Pitfall 6: Divider Too Hard to Grab
**What goes wrong:** Users miss the resize handle, frustrated clicking
**Why it happens:** Visual divider is 1px but hit target is also 1px
**How to avoid:**
- Visual line can be 1-2px, but hit target should be 8-12px
- Use padding or transparent borders to expand clickable area
- Cursor change should trigger on full hit area, not just visible line
**Warning signs:** User complaints, analytics show few resize events despite power users

### Pitfall 7: Minimum Size Too Small
**What goes wrong:** User resizes panel until content becomes unusable (text truncated, buttons overlap)
**Why it happens:** No minSize set, or minSize based on guess not actual content requirements
**How to avoid:**
- Measure actual content at smallest usable size
- For bottom panel: minimum = tab bar height + one row of content
- Test at various window sizes, not just full screen
**Warning signs:** Bug reports about "broken layout" at small sizes

## Code Examples

Verified patterns from official sources:

### Complete Layout Component
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useState, useEffect } from 'react';

export const Layout: React.FC = () => {
  const [sizes, setSizes] = useState<number[]>(() => {
    const saved = localStorage.getItem('editor-panel-sizes');
    return saved ? JSON.parse(saved) : [80, 20]; // Default: 80% canvas, 20% bottom panel
  });

  const handleLayoutChange = (newSizes: number[]) => {
    localStorage.setItem('editor-panel-sizes', JSON.stringify(newSizes));
  };

  return (
    <PanelGroup
      direction="vertical"
      onLayout={handleLayoutChange}
      className="layout-container"
    >
      <Panel
        defaultSize={sizes[0]}
        minSize={40}  // Canvas needs at least 40% to be usable
        maxSize={90}  // Bottom panel needs at least 10%
      >
        <MapCanvas />
      </Panel>

      <PanelResizeHandle className="resize-handle" />

      <Panel
        defaultSize={sizes[1]}
        minSize={10}   // Minimum: tab bar + controls
        maxSize={60}   // Canvas needs at least 40%
      >
        <BottomPanel />
      </Panel>
    </PanelGroup>
  );
};
```

### Resize Handle Styling
```css
/* Source: https://blog.theodo.com/2020/11/react-resizeable-split-panels/ */
.resize-handle {
  flex: 0 0 2px;
  background-color: var(--border-color);
  cursor: row-resize;
  position: relative;
  transition: background-color 0.15s ease;
}

.resize-handle:hover {
  background-color: var(--accent-color);
}

/* Expand hit target without changing visual size */
.resize-handle::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -4px;
  bottom: -4px;
}

/* Data attribute added by react-resizable-panels during drag */
.resize-handle[data-resize-handle-active] {
  background-color: var(--accent-color);
}
```

### Toolbar with Icon + Label Below
```tsx
// Adapted from existing ToolBar.tsx with new design
const tools = [
  { id: 'select', icon: '⬚', label: 'Select' },
  { id: 'pencil', icon: '✏', label: 'Pencil' },
  { id: 'fill', icon: '🪣', label: 'Fill' },
  // ... more tools
];

<div className="toolbar">
  {tools.map(tool => (
    <button
      key={tool.id}
      className={`toolbar-button ${activeTool === tool.id ? 'active' : ''}`}
      onClick={() => setTool(tool.id)}
    >
      <span className="toolbar-icon">{tool.icon}</span>
      <span className="toolbar-label">{tool.label}</span>
    </button>
  ))}
</div>
```

```css
.toolbar {
  display: flex;
  gap: 8px; /* Equal spacing between all tools */
  padding: 8px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.toolbar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  min-width: 60px; /* Prevents label wrapping */
  border-radius: 4px;
  transition: all 0.15s ease;
}

.toolbar-button:hover {
  border-color: var(--border-color);
}

.toolbar-button.active {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translateY(1px);
}

.toolbar-icon {
  font-size: 20px;
}

.toolbar-label {
  font-size: 10px;
  color: var(--text-secondary);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-split-pane | react-resizable-panels | 2022 | Improved accessibility, keyboard navigation, better TypeScript support |
| Manual theme switching | prefers-color-scheme CSS | 2020 | Automatic OS sync, no JavaScript needed, user preference respected |
| Fixed pixel layouts | Responsive flexbox/grid | 2015+ | Works at any window size, better UX on different monitors |
| Mouse-only resize | Keyboard + touch support | 2022+ | Accessibility compliance, mobile-friendly (future-proof) |
| Hardcoded colors | CSS custom properties | 2018+ | Easy theming, runtime changes, no rebuild needed |

**Deprecated/outdated:**
- **react-split-pane v0.x:** Last major update 2020, use react-resizable-panels or Allotment instead
- **Manual `window.matchMedia` theme detection:** CSS handles it natively, JavaScript only needed for reactive frameworks
- **Absolute positioning for panels:** Use flexbox or CSS Grid, easier to maintain and more flexible

## Open Questions

Things that couldn't be fully resolved:

1. **Icon set selection**
   - What we know: Many free options available (Flaticon, Icons8, IconScout), current app uses emoji/unicode characters
   - What's unclear: User preference for emoji vs SVG icons, licensing for distribution
   - Recommendation: Continue using Unicode characters for consistency with Phase 1, document icon choices for future customization

2. **Exact minimum panel sizes**
   - What we know: Windows recommends minimum 640x480 for critical UI, Microsoft says "set minimum to smallest functional size"
   - What's unclear: Smallest functional size for bottom panel with tabs
   - Recommendation: Test-driven approach - implement tabs first (Phase 3), measure actual content, then set minSize based on measurements

3. **Toolbar overflow handling**
   - What we know: Small window widths could cause toolbar buttons to overflow
   - What's unclear: Whether this is in scope for Phase 2 (spec says "compact" but doesn't mention overflow)
   - Recommendation: Start with assumption that 1024px minimum window width (current app minimum) fits all tools, defer overflow handling unless testing shows problems

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels v4.5.6 - GitHub](https://github.com/bvaughn/react-resizable-panels) - Library documentation, API, examples
- [prefers-color-scheme - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) - CSS specification, browser support, usage
- [CSS box-shadow inset - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-shadow) - Pressed button effect technique
- [CSS cursor property - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cursor) - Resize cursor values

### Secondary (MEDIUM confidence)
- [Essential tools for implementing React panel layouts - LogRocket](https://blog.logrocket.com/essential-tools-implementing-react-panel-layouts/) - Library comparison, best practices
- [Create resizable split panels in React - Theodo](https://blog.theodo.com/2020/11/react-resizeable-split-panels/) - Implementation patterns
- [Electron flexbox UI layout - GitHub](https://github.com/trstringer/electron-flexbox-ui-layout) - Full-height layout pattern
- [Allotment library - GitHub](https://github.com/johnwalley/allotment) - Alternative library option
- [3D Buttons with CSS - CSS-Tricks](https://css-tricks.com/getting-deep-into-shadows/) - Pressed effect examples

### Tertiary (LOW confidence)
- [Toolbar UI Design - Mobbin](https://mobbin.com/glossary/toolbar) - General design patterns (not React-specific)
- [Free toolbar icons - Flaticon](https://www.flaticon.com/free-icons/toolbar) - Icon resources
- [Windows UX Guidelines - Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/uxguide/top-violations) - Desktop app guidelines (general, not specific minimums)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-resizable-panels is well-established (317k dependents), prefers-color-scheme is W3C standard since 2020
- Architecture: HIGH - Patterns verified in official documentation and production apps (VS Code, etc.)
- Pitfalls: MEDIUM - Collected from GitHub issues and implementation experience, not all verified in current codebase

**Research date:** 2026-02-01
**Valid until:** ~60 days (stable domain, library is mature with infrequent breaking changes)
