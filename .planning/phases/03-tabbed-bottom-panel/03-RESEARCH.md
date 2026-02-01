# Phase 3: Tabbed Bottom Panel - Research

**Researched:** 2026-02-01
**Domain:** React tabs component with keyboard navigation and accessibility
**Confidence:** HIGH

## Summary

Tabbed bottom panel implementation requires combining React state management, ARIA accessibility patterns, and CSS-based content hiding to preserve scroll position. The standard approach uses controlled component pattern with keyboard event handlers for arrow key navigation following WAI-ARIA automatic activation pattern.

User decisions locked in underline tab styling (blue accent, no animation), instant content swap with CSS hiding (not unmounting), and arrow key navigation with automatic tab switching. The project uses Unicode emoji icons in toolbar, so tabs should follow this pattern rather than adding new icon library dependencies.

**Primary recommendation:** Build custom tab component using controlled state pattern, role="tablist" ARIA attributes, arrow key handlers, and CSS display:none for content hiding to preserve scroll position.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already in project, hooks-based state management |
| Zustand | 4.4.7 | State management | Already managing editor state, lightweight |
| CSS Custom Properties | N/A | Theming | Already used in project for dark theme |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | N/A | No additional libraries needed | Project uses native Unicode icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom tabs | Material UI Tabs | User locked in specific styling (underline, no animation) incompatible with MUI default behavior |
| Custom tabs | React Aria Tabs | Adds library dependency for simple 3-tab interface, overkill for this use case |
| Unicode icons | lucide-react | User already using Unicode emoji in toolbar, adding library inconsistent with existing pattern |
| Unicode icons | phosphor-icons | Same as above, unnecessary dependency |

**Installation:**
```bash
# No additional packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── TabbedBottomPanel/      # New container component
│   ├── TabbedBottomPanel.tsx
│   ├── TabbedBottomPanel.css
│   └── index.ts
├── TilePalette/             # Existing, moved into tab content
├── AnimationPanel/          # Existing, moved into tab content
└── MapSettingsPanel/        # Existing, moved into tab content
```

### Pattern 1: Controlled Tabs with ARIA
**What:** Parent component manages active tab state, renders tab bar and content panels
**When to use:** Small number of tabs (3), needs keyboard navigation and accessibility
**Example:**
```typescript
// Based on WAI-ARIA Tabs Pattern (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

interface Tab {
  id: string;
  label: string;
  icon: string;
  panel: React.ReactNode;
}

const TabbedBottomPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tiles');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs: Tab[] = [
    { id: 'tiles', label: 'Tiles', icon: '🎨', panel: <TilePalette /> },
    { id: 'animations', label: 'Animations', icon: '▶', panel: <AnimationPanel /> },
    { id: 'settings', label: 'Settings', icon: '⚙', panel: <MapSettingsPanel /> }
  ];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = index;

    if (e.key === 'ArrowLeft') {
      targetIndex = index > 0 ? index - 1 : tabs.length - 1;
    } else if (e.key === 'ArrowRight') {
      targetIndex = index < tabs.length - 1 ? index + 1 : 0;
    } else {
      return; // Not an arrow key, do nothing
    }

    e.preventDefault();
    // Automatic activation: switch tab and focus
    setActiveTab(tabs[targetIndex].id);
    tabRefs.current[targetIndex]?.focus();
  };

  return (
    <div className="tabbed-bottom-panel">
      <div role="tablist" aria-orientation="horizontal" className="tab-bar">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            className="tab-panel"
          >
            {tab.panel}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Pattern 2: CSS Content Hiding (Not Unmounting)
**What:** Use CSS `display: none` or `hidden` attribute to hide inactive tabs while keeping them mounted
**When to use:** Need to preserve scroll position, component state, and avoid remounting cost
**Example:**
```css
/* User requirement: keep all tabs mounted, hide via CSS */
.tab-panel {
  display: block;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.tab-panel[hidden] {
  display: none;
}
```

### Pattern 3: Underline Active Tab Styling
**What:** Bottom border on active tab for visual indicator
**When to use:** User specified underline tabs with blue accent, no animation
**Example:**
```css
/* Based on common CSS tabs pattern */
.tab {
  padding: 6px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.tab:hover:not(.active) {
  background-color: rgba(255, 255, 255, 0.05);
}

.tab.active {
  border-bottom-color: #3B82F6; /* Blue accent */
  color: var(--text-primary);
}

/* User requirement: no animated underline slide */
/* Do NOT add transition to border-bottom-color */
```

### Anti-Patterns to Avoid
- **Conditional mounting:** User explicitly required keeping tabs mounted with CSS hiding, not unmounting
- **Animated transitions:** User specified instant swap, no fade or animation
- **Manual activation:** User specified automatic activation (arrow keys immediately switch tabs)
- **Adding icon libraries:** Project uses Unicode emoji consistently, don't introduce new dependencies

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| N/A for this phase | N/A | N/A | No complex problems requiring libraries - tabs are simple enough for custom implementation given locked requirements |

**Key insight:** User requirements (specific styling, no animation, Unicode icons) make custom implementation simpler than adapting existing library. Pre-built tab libraries optimize for flexibility this project doesn't need.

## Common Pitfalls

### Pitfall 1: Breaking Keyboard Focus Management
**What goes wrong:** Arrow keys work but focus indicator disappears or tab navigation breaks screen reader
**Why it happens:** Forgetting `tabIndex={-1}` on inactive tabs or not calling `.focus()` after state change
**How to avoid:** Set `tabIndex={0}` only on active tab, `tabIndex={-1}` on inactive tabs, always call `tabRefs.current[targetIndex]?.focus()` after arrow key navigation
**Warning signs:** Can't see which tab is focused with keyboard, Tab key skips through all tabs instead of jumping in/out of tablist

### Pitfall 2: Scroll Position Reset on Tab Switch
**What goes wrong:** Switching away from a tab and back resets scroll position to top
**Why it happens:** Unmounting component destroys DOM state, including scroll position
**How to avoid:** Use CSS `display: none` or `hidden` attribute instead of conditional rendering, keep all panels mounted
**Warning signs:** User scrolls palette, switches to settings, comes back and palette is scrolled to top

### Pitfall 3: Missing ARIA Relationships
**What goes wrong:** Screen readers don't announce tab/panel relationships or active state
**Why it happens:** Missing `aria-controls`, `aria-labelledby`, or `aria-selected` attributes
**How to avoid:** Follow WAI-ARIA tabs pattern exactly - tab has `aria-controls="panel-id"`, panel has `aria-labelledby="tab-id"`, active tab has `aria-selected="true"`
**Warning signs:** Screen reader says "button" instead of "tab", doesn't announce which panel is shown

### Pitfall 4: Animation Preview Performance
**What goes wrong:** Animation previews continue running in hidden Animations tab, wasting CPU/GPU
**Why it happens:** `requestAnimationFrame` continues even when component is `display: none`
**How to avoid:** Check if tab is active before calling `advanceAnimationFrame`, or pause RAF loop when tab hidden
**Warning signs:** High CPU usage when Animations tab not visible, battery drain

### Pitfall 5: Hover State on Active Tab
**What goes wrong:** Active tab shows hover background tint, looks inconsistent
**Why it happens:** CSS `:hover` applies regardless of active state
**How to avoid:** Use `.tab:hover:not(.active)` selector to exclude active tab from hover styles
**Warning signs:** Active tab background flickers or changes on hover

## Code Examples

Verified patterns from official sources:

### Automatic Activation Keyboard Handler
```typescript
// Source: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-automatic/
// WAI-ARIA example demonstrates automatic activation pattern

const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
  let targetIndex = currentIndex;

  switch (e.key) {
    case 'ArrowLeft':
      // Wrap to last tab if at first
      targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      break;
    case 'ArrowRight':
      // Wrap to first tab if at last
      targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      break;
    default:
      return; // Not handled, let browser handle it
  }

  e.preventDefault();
  // Automatic activation: change state and focus
  setActiveTab(tabs[targetIndex].id);
  tabRefs.current[targetIndex]?.focus();
};
```

### Tab Bar Layout with Equal Width Centered
```css
/* User requirement: equal width tabs, centered in panel width */
.tab-bar {
  display: flex;
  justify-content: center;
  gap: 0;
  padding: 0;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 120px; /* Equal width */
  height: 32px; /* User requirement: 28-32px compact height */
  padding: 0 16px;
  justify-content: center;
}
```

### Preserving Scroll Position with Hidden Attribute
```tsx
// All panels are mounted, hidden attribute controls visibility
{tabs.map((tab) => (
  <div
    key={tab.id}
    role="tabpanel"
    hidden={activeTab !== tab.id}
  >
    {tab.panel}
  </div>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Conditional rendering (`{active && <Panel />}`) | CSS hiding with `hidden` attribute | React 16+ | Preserves scroll position and component state |
| Manual roving tabindex | `tabIndex={active ? 0 : -1}` pattern | WAI-ARIA APG 1.2 | Simpler focus management |
| `useEffect` cleanup for RAF | React 19's `<Activity>` component | React 19 (2024) | Automatic effect cleanup when hidden, but project on React 18 |

**Deprecated/outdated:**
- `<Activity>` component: Not available in React 18.2 (project version), only in React 19+

## Open Questions

Things that couldn't be fully resolved:

1. **Animation preview performance when tab hidden**
   - What we know: CSS `display: none` keeps React effects (like RAF loop) running, wasting resources
   - What's unclear: Should pause animation loop when Animations tab inactive, or is CPU impact negligible?
   - Recommendation: Start without pausing (user marked as Claude's discretion), measure performance, optimize if needed

2. **Icon choices for tabs**
   - What we know: User wants icon + text, left to Claude's discretion
   - What's unclear: Exact Unicode emoji for each tab
   - Recommendation: Use existing toolbar icons where applicable (⚙ for Settings matches toolbar), creative choice for Tiles and Animations

3. **Spacing between icon and label**
   - What we know: User wants compact 28-32px height
   - What's unclear: Exact gap value
   - Recommendation: 6-8px gap matches toolbar button spacing pattern

## Sources

### Primary (HIGH confidence)
- WAI-ARIA Tabs Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- WAI-ARIA Automatic Activation Example: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-automatic/
- Project codebase: src/App.tsx, src/components/ToolBar/ToolBar.tsx, src/core/editor/EditorState.ts
- Project CSS patterns: App.css, ToolBar.css (theme variables, button styles)

### Secondary (MEDIUM confidence)
- [React Tabs component - Material UI](https://mui.com/material-ui/react-tabs/) - ARIA patterns reference
- [Tabs – React Aria](https://react-spectrum.adobe.com/react-aria/Tabs.html) - Adobe's accessible tabs implementation
- [Keyboard Accessible Tabs with React](https://dev.to/eevajonnapanula/keyboard-accessible-tabs-with-react-5ch4) - Implementation guide
- [Best React Icon Libraries for 2026](https://mighil.com/best-react-icon-libraries) - Icon library comparison (decided against)

### Tertiary (LOW confidence)
- React 19 `<Activity>` component - Not applicable to project (React 18.2), future consideration if upgrading

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, using existing project patterns
- Architecture: HIGH - WAI-ARIA tabs pattern well-documented, user requirements specific and clear
- Pitfalls: HIGH - Common tab implementation mistakes well-documented, verified with official ARIA patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable domain, React 18 mature, ARIA patterns stable)
