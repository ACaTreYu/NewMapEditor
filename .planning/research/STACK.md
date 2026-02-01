# Technology Stack: Professional Editor UI

**Project:** AC Map Editor - Panel UI Milestone
**Researched:** 2026-02-01
**Focus:** Resizable panels, tabbed interfaces, toolbars, persistent layout

## Recommended Stack

### Panel Layout System
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-resizable-panels | ^4.5.7 | Resizable panel dividers | De-facto standard with 2.7M weekly downloads. Built-in localStorage persistence via `autoSaveId`. Used by shadcn/ui. Zero config for basic layouts. |

**Rationale:** react-resizable-panels wins over alternatives because:
1. **Built-in persistence** - `autoSaveId` prop automatically saves/restores layouts to localStorage
2. **Zustand-like simplicity** - Matches project's existing state philosophy
3. **Active maintenance** - Brian Vaughn (ex-React team) maintains it
4. **Ecosystem adoption** - Powers shadcn/ui Resizable component

### Tabbed Interface
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @radix-ui/react-tabs | ^1.1.13 | Tabbed panels | Headless primitive with full accessibility. VS Code-style tabs via custom styling. Works with existing unstyled approach. |

**Rationale:** Radix Tabs chosen because:
1. **Unstyled/headless** - Full control over appearance (VS Code/Chrome tab styling)
2. **Accessibility built-in** - WAI-ARIA compliant, keyboard navigation
3. **Controlled/uncontrolled modes** - Works with or without external state
4. **Small bundle** - 9.69 kB gzipped

### Toolbar Component
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @radix-ui/react-toolbar | ^1.1.11 | Horizontal toolbar | Roving tabindex for icon button navigation. Keyboard accessible. Supports toggle groups for tool selection. |

**Rationale:** Radix Toolbar chosen because:
1. **Purpose-built** - Designed for icon button toolbars with toggle states
2. **Keyboard navigation** - Arrow keys, Home/End, roving tabindex
3. **Composable** - Works with DropdownMenu, Popover for sub-tools
4. **Consistency** - Same design system as Tabs (Radix primitives)

### Tooltips
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @radix-ui/react-tooltip | ^1.2.8 | Icon button tooltips | Matches Radix ecosystem. Accessible. Handles delay/positioning automatically. |

**Rationale:** Using Radix Tooltip maintains ecosystem consistency. Alternatives like @floating-ui/react (0.27.17) are lower-level and require more setup.

### Icons
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| lucide-react | ^0.563.0 | Toolbar icons | Tree-shakable, consistent stroke style, 1667+ icons. Modern Feather Icons fork. |

**Rationale:** Lucide over react-icons because:
1. **Style consistency** - All icons match in weight/style (mixing icon sets looks amateur)
2. **Tree-shaking** - Only imported icons in bundle
3. **Active development** - Regular updates, community maintained
4. **Editor-appropriate** - Has pencil, eraser, layers, grid, zoom icons needed for editors

### Layout Persistence (Already Have)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zustand | ^4.4.7 (current) | Global state + persistence | Already in project. `persist` middleware handles localStorage. |

**Note:** react-resizable-panels has its own localStorage persistence via `autoSaveId`. For panel sizes, use that. For other layout preferences (active tool, panel visibility), use Zustand persist.

## Confidence Levels

| Library | Confidence | Verification |
|---------|------------|--------------|
| react-resizable-panels ^4.5.7 | HIGH | npm registry, GitHub, 2.7M weekly downloads |
| @radix-ui/react-tabs ^1.1.13 | HIGH | npm registry, official docs |
| @radix-ui/react-toolbar ^1.1.11 | HIGH | npm registry, official docs |
| @radix-ui/react-tooltip ^1.2.8 | HIGH | npm registry, official docs |
| lucide-react ^0.563.0 | HIGH | npm registry |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Panels | react-resizable-panels | allotment | allotment is VS Code-derived (good) but less ecosystem adoption. react-resizable-panels has better persistence API and wider usage. |
| Panels | react-resizable-panels | dockview | dockview is more powerful (floating panels, popouts) but heavier. Overkill for this project's needs. Consider if detachable panels needed later. |
| Tabs | @radix-ui/react-tabs | react-tabs | react-tabs is older, less composable, comes with default styles you'd strip out anyway. |
| Tabs | @radix-ui/react-tabs | react-tabtab | Draggable/closeable tabs, but abandoned maintenance. Use if drag-reorder tabs needed. |
| Toolbar | @radix-ui/react-toolbar | Custom div | Loses keyboard navigation and accessibility. Not worth the effort to rebuild. |
| Tooltips | @radix-ui/react-tooltip | @floating-ui/react | Lower-level, requires more setup. Radix is pre-configured. |
| Tooltips | @radix-ui/react-tooltip | react-tooltip | Works but doesn't match Radix ecosystem styling patterns. |
| Icons | lucide-react | react-icons | 50K+ icons but inconsistent styles across sets. Tempts mixing which looks unprofessional. |
| Icons | lucide-react | @heroicons/react | Good quality but fewer icons than Lucide. |

## What NOT to Use

| Library | Why Avoid |
|---------|-----------|
| react-split-pane | Unmaintained (last publish 3+ years ago). Known bugs with React 18. |
| golden-layout | jQuery-based internals. Not React-native. |
| Material UI (for this) | Heavy bundle overhead for just panels/tabs. Project uses unstyled approach. |
| Ant Design (for this) | Same reason - full component library when only primitives needed. |
| Headless UI tabs | Less mature than Radix. Tailwind-focused documentation. |

## Installation

```bash
# Panel layout
npm install react-resizable-panels

# Radix primitives (tabs, toolbar, tooltip)
npm install @radix-ui/react-tabs @radix-ui/react-toolbar @radix-ui/react-tooltip

# Icons
npm install lucide-react
```

Total addition: ~5 packages, all tree-shakable.

## Integration Notes

### With Existing Zustand Store

react-resizable-panels handles its own persistence for panel sizes. Don't duplicate:

```typescript
// Panel sizes: use react-resizable-panels autoSaveId
<PanelGroup autoSaveId="editor-layout" direction="horizontal">

// Other preferences: use Zustand persist
import { persist } from 'zustand/middleware'

const useLayoutStore = create(
  persist(
    (set) => ({
      leftPanelVisible: true,
      rightPanelVisible: true,
      activeToolbarTab: 'draw',
      // ...
    }),
    { name: 'editor-layout-prefs' }
  )
)
```

### With src/core/ Portability

These UI libraries stay in `src/components/` - they're renderer-specific. The `src/core/` directory remains portable with no UI dependencies.

### React 18 Compatibility

All recommended libraries support React 18.x:
- react-resizable-panels: React 16.8+
- @radix-ui/*: React 16.8+
- lucide-react: React 16.8+

## Architecture Implications

### Component Structure
```
src/components/
  layout/
    EditorLayout.tsx       # PanelGroup + Panels
    ResizablePanels.tsx    # Panel wrapper components
  panels/
    TabbedPanel.tsx        # Radix Tabs wrapper
    ToolPanel.tsx          # Left panel (tools)
    PropertiesPanel.tsx    # Right panel (properties/animations)
  toolbar/
    MainToolbar.tsx        # Radix Toolbar + icons
    ToolbarButton.tsx      # Button with tooltip
```

### Styling Approach

Radix primitives are unstyled. Use CSS modules or inline styles matching existing project approach:

```css
/* data-state attribute selectors */
[data-state="active"] { /* active tab styling */ }
[data-state="inactive"] { /* inactive tab styling */ }
```

## Sources

- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - HIGH confidence
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - Version 4.5.7
- [Radix UI Tabs](https://www.radix-ui.com/primitives/docs/components/tabs) - HIGH confidence
- [Radix UI Toolbar](https://www.radix-ui.com/primitives/docs/components/toolbar) - HIGH confidence
- [Radix UI Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) - HIGH confidence
- [Lucide Icons](https://lucide.dev/) - HIGH confidence
- [Zustand Persist](https://zustand.docs.pmnd.rs/integrations/persisting-store-data) - HIGH confidence
- [allotment GitHub](https://github.com/johnwalley/allotment) - Alternative evaluated
- [dockview](https://dockview.dev/) - Alternative evaluated
- [npm trends comparison](https://npmtrends.com/allotment-vs-react-resizable-vs-react-split-pane-vs-react-splitter-layout) - Download statistics
