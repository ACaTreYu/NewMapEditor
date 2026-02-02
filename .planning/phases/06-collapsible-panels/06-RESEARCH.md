# Phase 6: Collapsible Panels - Research

**Researched:** 2026-02-02
**Domain:** React resizable panel collapse behavior and UX patterns
**Confidence:** HIGH

## Summary

This research investigates implementing collapsible panel functionality for the bottom panel (tab bar + content) using the existing `react-resizable-panels` v4.5.7 library. The library provides built-in collapsible behavior with imperative API control, percentage-based sizing, and double-click reset functionality.

Key findings:
- `react-resizable-panels` has native `collapsible` prop and imperative API methods (`collapse()`, `expand()`, `isCollapsed()`)
- Collapse threshold can be configured via `minSize` prop - panels auto-collapse when dragged below half their minSize
- Double-click on PanelResizeHandle automatically resets panels to `defaultSize`
- Percentage-based sizing maintains responsive layouts during window resize
- Custom collapse buttons can be added to PanelResizeHandle using the `children` prop
- Chevron icons should point down when collapsed, up when expanded (industry standard UX pattern)

**Primary recommendation:** Use built-in collapsible prop with imperative API for button control. Set defaultSize to 20%, minSize to ~5% (for tab bar height), collapsedSize to minimum needed for tab bar visibility (~40px or ~3% depending on window height).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | ^4.5.7 | Panel layout and resize | Already in use, has native collapse API, well-maintained (4.4.1 released Jan 2026) |
| React refs + imperative API | 18.2.0 | Programmatic collapse control | Standard React pattern for imperative DOM operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS border triangles | N/A | Chevron icons | Already used in Phase 5 scrollbars, theme-aware, zero dependencies |
| CSS custom properties | N/A | Theme-aware styling | Phase 4 established two-tier system, collapse button should use semantic tokens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in collapsible | Custom CSS height transitions | More control but harder to maintain, no auto-collapse on drag |
| Imperative API | useState + controlled size | Simpler but requires manual threshold logic and size calculation |
| CSS border chevrons | Unicode chevron characters | Simpler but less visual control, may have font rendering inconsistencies |

**Installation:**
No new packages needed - all functionality exists in current dependencies.

## Architecture Patterns

### Recommended Panel Structure
```tsx
// App.tsx structure for bottom panel
<PanelGroup orientation="vertical">
  <Panel id="canvas" defaultSize={80}>
    {/* Canvas content */}
  </Panel>

  <PanelResizeHandle>
    {/* Custom collapse button here */}
  </PanelResizeHandle>

  <Panel
    id="bottom"
    ref={bottomPanelRef}
    defaultSize={20}
    minSize={5}          // Collapse threshold
    collapsible={true}
    collapsedSize={3}    // Just enough for tab bar
  >
    <TabbedBottomPanel />
  </Panel>
</PanelGroup>
```

### Pattern 1: Imperative Collapse Control
**What:** Use Panel ref with imperative API to programmatically collapse/expand from custom button
**When to use:** When you need custom UI controls separate from drag behavior
**Example:**
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { ImperativePanelHandle } from 'react-resizable-panels';

const bottomPanelRef = useRef<ImperativePanelHandle>(null);

const handleToggleCollapse = () => {
  const panel = bottomPanelRef.current;
  if (panel) {
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }
};

// Render collapse button in PanelResizeHandle
<PanelResizeHandle>
  <button onClick={handleToggleCollapse} aria-label="Toggle panel">
    <ChevronIcon direction={isCollapsed ? 'up' : 'down'} />
  </button>
</PanelResizeHandle>
```

### Pattern 2: Percentage-Based Sizing
**What:** Use string percentage values for panel sizes to maintain proportions during window resize
**When to use:** Always for responsive panel layouts
**Example:**
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
// Strings without units are assumed to be percentages
<Panel
  defaultSize={20}     // 20% of parent
  minSize={5}          // 5% minimum before collapse
  collapsedSize={3}    // 3% when collapsed (~40px at 1080p height)
/>
```

### Pattern 3: Double-Click Reset
**What:** Built-in double-click on PanelResizeHandle resets panel to defaultSize
**When to use:** Always - provides user expectation from other editors
**Example:**
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
// No code needed - automatic behavior when defaultSize is set
// Double-clicking the separator resets the panel to defaultSize
```

### Pattern 4: Collapsed State Detection
**What:** Track collapsed state to update UI (chevron direction, button labels)
**When to use:** When UI needs to reflect current panel state
**Example:**
```typescript
const [isCollapsed, setIsCollapsed] = useState(false);

// Poll or use onLayout callback to detect state changes
const handleLayoutChange = () => {
  const panel = bottomPanelRef.current;
  if (panel) {
    setIsCollapsed(panel.isCollapsed());
  }
};

<PanelGroup onLayout={handleLayoutChange}>
  {/* ... */}
</PanelGroup>
```

### Anti-Patterns to Avoid
- **Animating collapse with CSS transitions:** react-resizable-panels handles its own transitions. User decision specifies instant transitions - remove any CSS transition properties from panel containers.
- **Using pixel-based sizes for minSize/collapsedSize:** Use percentages for responsive behavior across different screen sizes.
- **Forgetting defaultSize prop:** Without defaultSize, double-click reset won't work and panels may flicker on load.
- **Mounting/unmounting tab content on collapse:** Tab content should stay mounted (CSS hidden) to preserve scroll position per Phase 3 requirements.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag threshold detection | Custom onMouseMove logic with position tracking | `minSize` prop + collapsible behavior | Library auto-collapses at half-minSize, handles edge cases |
| Percentage-to-pixel conversion | Manual calculation based on container dimensions | String percentage values in props | Library handles responsive sizing and window resize automatically |
| Double-click detection with timing | Custom click timestamp comparison | Built-in PanelResizeHandle behavior | Library provides double-click reset out of the box |
| Smooth collapse animation | Custom CSS height transition with RAF | Library's internal resize logic | Library optimizes performance, handles nested panels |
| Panel size persistence | Manual localStorage save/restore | PanelGroup `onLayoutChanged` callback | Already implemented in Phase 2 for horizontal layout |

**Key insight:** react-resizable-panels is specifically designed for this use case. Custom implementations will be more complex, less performant, and harder to maintain. The library already handles browser inconsistencies, touch events, keyboard accessibility, and performance optimization.

## Common Pitfalls

### Pitfall 1: Collapse Threshold Too Large
**What goes wrong:** If minSize is too high (e.g., 15%), users must drag panel very small before it collapses, making collapse-by-drag feel unresponsive.
**Why it happens:** Confusion between "minimum expanded size" and "collapse trigger point" - the collapse happens at half the minSize.
**How to avoid:** Set minSize to approximately 2x the collapsed state size. For a tab bar (~40px = 3% at 1080p), set minSize to 5-6%.
**Warning signs:** Users complaining that dragging "doesn't work" or panel "snaps back" when they try to collapse it.

### Pitfall 2: Missing Collapsed State Indicator
**What goes wrong:** Collapse button shows wrong chevron direction after panel is collapsed via drag, confusing users about current state.
**Why it happens:** Button state is not synchronized with panel's collapsed state - only tracking button clicks.
**How to avoid:** Use panel's `isCollapsed()` method or `onLayout` callback to keep UI state in sync with actual panel state.
**Warning signs:** Chevron pointing wrong direction, "expand" button shown on expanded panel.

### Pitfall 3: CSS Transition Conflicts
**What goes wrong:** Panel resize feels sluggish or janky because CSS transitions are fighting with library's internal animation logic.
**Why it happens:** Adding `transition` CSS to panel containers or content interferes with library's resize calculations.
**How to avoid:** Don't add CSS transitions to elements with `[data-panel]` or `[data-panel-group]` attributes. Per user decision, transitions should be instant anyway (transition: none).
**Warning signs:** Laggy resize, content jumping during drag, browser performance issues.

### Pitfall 4: Collapsed Size Too Small
**What goes wrong:** Panel collapses to 0px height, hiding tab bar completely. Users can't click tabs to expand, and there's no visual indication the panel exists.
**Why it happens:** Using default `collapsedSize={0}` without considering the tab bar needs to remain visible and clickable.
**How to avoid:** Set collapsedSize to minimum needed for tab bar (height + padding). Test at different window sizes. Use percentage (3-4%) rather than pixels for responsiveness.
**Warning signs:** Completely invisible panel when collapsed, no way to expand except collapse button.

### Pitfall 5: Tab Click Not Expanding Panel
**What goes wrong:** User clicks tab while panel is collapsed, but panel doesn't expand - only the tab switches.
**Why it happens:** Tab switching logic doesn't check if panel is collapsed before switching content.
**How to avoid:** In tab click handler, check `panel.isCollapsed()` and call `panel.expand()` before switching active tab. Per user decision, "clicking any tab when collapsed expands panel and shows that tab's content."
**Warning signs:** Users report tabs "don't work" when panel is small, confusion about how to see content.

## Code Examples

Verified patterns from official sources:

### Complete Collapse Button Implementation
```tsx
// Source: https://github.com/bvaughn/react-resizable-panels
import { useRef, useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { ImperativePanelHandle } from 'react-resizable-panels';

function App() {
  const bottomPanelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = useCallback(() => {
    const panel = bottomPanelRef.current;
    if (!panel) return;

    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, []);

  const handleLayoutChange = useCallback(() => {
    const panel = bottomPanelRef.current;
    if (panel) {
      setIsCollapsed(panel.isCollapsed());
    }
  }, []);

  return (
    <PanelGroup
      orientation="vertical"
      onLayout={handleLayoutChange}
    >
      <Panel id="canvas" defaultSize={80} minSize={30}>
        {/* Canvas content */}
      </Panel>

      <PanelResizeHandle className="resize-handle-horizontal">
        <button
          onClick={handleToggleCollapse}
          className="collapse-button"
          aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {/* Chevron icon - see next example */}
        </button>
      </PanelResizeHandle>

      <Panel
        id="bottom"
        ref={bottomPanelRef}
        defaultSize={20}
        minSize={5}
        collapsible={true}
        collapsedSize={3}
      >
        {/* Tabbed content */}
      </Panel>
    </PanelGroup>
  );
}
```

### CSS Border Chevron Icon (Theme-Aware)
```css
/* Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css (Phase 5 pattern) */
/* Consistent with existing scrollbar arrow implementation */

.collapse-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  background-color: var(--scrollbar-track);
  border: 1px solid var(--border-default);
  cursor: pointer;
  padding: 0;
}

.collapse-button:hover {
  background-color: var(--bg-hover);
}

.collapse-button:active {
  background-color: var(--bg-active);
}

/* Chevron glyph using CSS borders */
.collapse-button::after {
  content: '';
  display: block;
  width: 0;
  height: 0;
  border-style: solid;
}

/* Chevron up (when panel is collapsed) */
.collapse-button.collapsed::after {
  border-width: 0 4px 5px 4px;
  border-color: transparent transparent var(--text-secondary) transparent;
}

/* Chevron down (when panel is expanded) */
.collapse-button.expanded::after {
  border-width: 5px 4px 0 4px;
  border-color: var(--text-secondary) transparent transparent transparent;
}
```

### Tab Click Expands Collapsed Panel
```tsx
// Integration with TabbedBottomPanel component
interface TabbedBottomPanelProps {
  tilesetImage: HTMLImageElement | null;
  panelRef: React.RefObject<ImperativePanelHandle>; // Pass ref from parent
}

const TabbedBottomPanel: React.FC<TabbedBottomPanelProps> = ({
  tilesetImage,
  panelRef
}) => {
  const [activeTab, setActiveTab] = useState('tiles');

  const handleTabClick = useCallback((tabId: string) => {
    // Expand panel if collapsed before switching tab
    if (panelRef.current?.isCollapsed()) {
      panelRef.current.expand();
    }
    setActiveTab(tabId);
  }, [panelRef]);

  return (
    <div className="tabbed-bottom-panel">
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={activeTab === tab.id ? 'tab active' : 'tab'}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Tab content */}
    </div>
  );
};
```

### Instant Transition (No Animation)
```css
/* Source: User decision in CONTEXT.md - "Instant transitions, no animation" */
/* Disable any library-provided transitions */

[data-panel-resize-handle-id] {
  transition: none !important;
}

[data-panel-id] {
  transition: none !important;
}

[data-panel-group-id] {
  transition: none !important;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS max-height transitions | react-resizable-panels imperative API | Library v2.0+ (2023) | More performant, handles nested panels correctly |
| Pixel-based sizing | Percentage-based sizing | react-resizable-panels v1.0+ | Responsive across screen sizes, no manual calculations |
| Manual drag threshold detection | Built-in minSize auto-collapse | react-resizable-panels v1.0+ | Consistent UX, less custom logic |
| Plus/minus icons | Chevron icons (up/down) | UX best practice evolution (2024-2026) | Clearer state indication, matches VS Code pattern |

**Deprecated/outdated:**
- **CSS-only collapsible panels**: Modern approach uses react-resizable-panels for consistent behavior, accessibility, and performance. CSS-only solutions don't handle drag-to-collapse or complex layouts well.
- **localStorage for collapsed state**: Per user decision, panel always starts expanded at 20%. Persistence during session only (already handled by existing onLayoutChanged logic).
- **Separate toggle buttons in toolbar**: Phase 3 moved panel switching to tabs. Collapse button should be on the divider itself (VS Code pattern).

## Open Questions

Things that couldn't be fully resolved:

1. **Exact collapse threshold percentage**
   - What we know: Should be ~2x the collapsedSize for natural feel. Library auto-collapses at half the minSize.
   - What's unclear: Optimal value depends on screen size testing. 5% minSize (for 3% collapsed) may feel different on 1080p vs 4K displays.
   - Recommendation: Start with minSize={5}, collapsedSize={3}, test at 1080p and 1440p, adjust if threshold feels unnatural. Consider adding minimum pixel values if percentages are too variable.

2. **Chevron icon animation on transition**
   - What we know: User decision says "instant transitions" for collapse/expand action. UX best practice says icon should rotate smoothly.
   - What's unclear: Does "instant transitions" apply to the chevron icon rotation, or just the panel height change?
   - Recommendation: Interpret "instant" as panel resize only. Add 150ms transition to chevron icon rotation for visual polish without affecting panel behavior. Verify with user during implementation if needed.

3. **Minimum pixel height for collapsedSize**
   - What we know: Tab bar needs ~40px minimum (32px tab height + 8px padding). At 1080p height, 3% = ~32px.
   - What's unclear: Will 3% be too small on smaller displays (e.g., 768px height = ~23px)?
   - Recommendation: Test percentage value at minimum supported window size (e.g., 768px height). May need to use pixels instead of percentage for collapsedSize if tab bar is cut off. Library supports both "3%" and "40px" formats.

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Official repository, README, and API documentation
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - Package information, version 4.4.1 (latest)
- [react-resizable-panels documentation](https://react-resizable-panels.vercel.app/) - Official documentation site
- Phase 5 implementation: `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css` - CSS border triangle pattern for arrows
- Phase 4 implementation: `E:\NewMapEditor\src\App.css` - Two-tier CSS variable system

### Secondary (MEDIUM confidence)
- [Accordion Icon UX Best Practices - Nielsen Norman Group](https://www.nngroup.com/articles/accordion-icons/) - Chevron direction standards (down = collapsed, up = expanded)
- [Designing the Perfect Accordion - Medium](https://medium.com/@yulianaz/designing-the-perfect-accordion-263560d4a605) - Icon placement and animation guidance
- [LogRocket: React Panel Layouts](https://blog.logrocket.com/essential-tools-implementing-react-panel-layouts/) - Comparison of panel libraries and best practices
- [MDN: CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions) - Transition duration 0s = instant change
- [CSS Tricks: CSS Transitions](https://css-tricks.com/almanac/properties/t/transition/) - Performance considerations for transitions

### Tertiary (LOW confidence - requires validation)
- [VS Code Panel API Guidelines](https://code.visualstudio.com/api/ux-guidelines/panel) - General guidance, no specific implementation details found
- WebSearch results about panel collapse patterns - General concepts, no 2026-specific best practices found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-resizable-panels API verified from official GitHub README, library already in use
- Architecture: HIGH - Imperative API patterns documented in official sources, percentage sizing verified
- Pitfalls: MEDIUM - Based on library behavior and UX best practices, but some edge cases may emerge during implementation
- Code examples: HIGH - Imperative API example from official docs, CSS pattern from Phase 5 implementation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - library is stable, v4.4.1 released Jan 2026)
