# Phase 80: Sidebar Independence - Research

**Researched:** 2026-02-16
**Domain:** React component layout and CSS flexbox collapsible panels
**Confidence:** HIGH

## Summary

Phase 80 decouples the minimap from the animations panel, allowing the animations panel to collapse independently while the minimap remains visible in a fixed top-right corner position. The current implementation (v3.6) has both components stacked in a single `right-sidebar-container`, with a collapse toggle that hides the entire sidebar including the minimap. The goal is to restructure the layout so the minimap floats above the collapsible animations panel.

The phase requires:
1. Repositioning minimap from stacked layout to fixed corner overlay
2. Updating collapse logic to only hide animations panel + game object tool panel
3. Ensuring canvas expands horizontally when animations panel collapses
4. Adding toolbar toggle button for collapse/expand control

**Primary recommendation:** Use CSS `position: absolute` for minimap within a `position: relative` parent container, allowing it to overlay the canvas area while the animations panel remains in a standard flex column. The collapse state should be managed in App.tsx component state (already exists as `rightSidebarCollapsed`).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component state and conditional rendering | Already in use, component-local state pattern established |
| CSS Flexbox | Native | Collapsible panel layout | Already used throughout app for panel layouts |
| CSS Positioning | Native | Fixed minimap corner overlay | Standard approach for fixed overlays independent of document flow |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons/lu | 0.13.x | Lucide icons for toolbar button | Already in use for all toolbar icons (LuPanelRight/LuPanelLeft candidates) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Component state | Zustand global state | Overkill for single UI toggle; component state is simpler and sufficient |
| Absolute positioning | CSS Grid overlay | Grid overlay more complex, absolute positioning is simpler and well-understood |
| New toolbar button | Reuse existing collapse toggle | Existing toggle is in wrong location (between canvas and sidebar); toolbar placement provides better discoverability |

**Installation:**

No new dependencies required. All necessary libraries already installed.

## Architecture Patterns

### Recommended Project Structure

Current structure (no changes needed):
```
src/
├── components/
│   ├── AnimationPanel/      # Collapsible panel
│   ├── GameObjectToolPanel/  # Follows animations panel visibility
│   ├── Minimap/              # Fixed overlay component
│   └── ToolBar/              # Add collapse toggle button here
├── App.tsx                   # Layout orchestration + collapse state
└── App.css                   # Layout styles
```

### Pattern 1: Fixed Corner Overlay with Relative Parent

**What:** Minimap positioned absolutely within a relatively-positioned parent, allowing it to overlay the canvas while remaining independent of sidebar collapse state.

**When to use:** When a component must remain visible at a fixed screen position regardless of sibling visibility changes.

**Example:**
```tsx
// App.tsx structure
<div className="app-content">
  {/* Canvas area with relative positioning */}
  <div className="canvas-area-wrapper" style={{ position: 'relative', flex: 1 }}>
    <PanelGroup orientation="horizontal">
      <Panel id="main" defaultSize={100}>
        {/* ... existing canvas/tileset panels ... */}
      </Panel>
    </PanelGroup>

    {/* Minimap overlays top-right corner */}
    <div className="minimap-overlay">
      <Minimap tilesetImage={tilesetImage} farplaneImage={farplaneImage} />
    </div>
  </div>

  {/* Sidebar toggle */}
  <button className="sidebar-collapse-toggle" />

  {/* Collapsible animations panel */}
  {!rightSidebarCollapsed && (
    <div className="right-sidebar-container">
      <AnimationPanel />
      <GameObjectToolPanel />
    </div>
  )}
</div>
```

```css
/* App.css */
.canvas-area-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.minimap-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 100;
  pointer-events: auto;
}

/* When sidebar is expanded, minimap stays in fixed position */
/* When sidebar is collapsed, minimap still overlays canvas at same position */
```

### Pattern 2: Conditional Rendering for Collapse

**What:** Use React conditional rendering to completely unmount collapsed panels, preventing layout thrashing and improving performance.

**When to use:** When panel visibility is binary (shown/hidden) with no animation requirements.

**Example:**
```tsx
// App.tsx - already established pattern
{!rightSidebarCollapsed && (
  <>
    <div className="animation-panel-container">
      <AnimationPanel tilesetImage={tilesetImage} />
    </div>
    <GameObjectToolPanel />
  </>
)}
```

### Pattern 3: Toolbar Toggle Button

**What:** Add toggle button to toolbar following existing icon button patterns, using Lucide icons for consistency.

**When to use:** When adding UI controls that affect global layout state.

**Example:**
```tsx
// ToolBar.tsx - add before toolbar-spacer
import { LuPanelRight, LuPanelLeft } from 'react-icons/lu';

interface ToolBarProps {
  // ... existing props
  rightSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

// In render:
<button
  className={`toolbar-button ${!rightSidebarCollapsed ? 'active' : ''}`}
  onClick={onToggleSidebar}
  title={rightSidebarCollapsed ? 'Show Animations Panel' : 'Hide Animations Panel'}
>
  {rightSidebarCollapsed ? <LuPanelRight size={16} /> : <LuPanelLeft size={16} />}
</button>
```

### Anti-Patterns to Avoid

- **Changing minimap position based on sidebar state:** Minimap should always stay in top-right corner, not move when sidebar collapses
- **Using CSS transitions on conditional rendering:** Causes layout jank; if animations needed, use CSS transforms with persistent DOM elements
- **Z-index wars:** Use explicit z-index layering: canvas (1) → minimap (100) → modals (1000)
- **Percentage-based minimap positioning:** Use fixed pixel offsets (e.g., `top: 8px; right: 8px`) for consistent positioning regardless of parent size

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flexbox collapse animation | Custom JavaScript animation loop | CSS `display: none` with conditional rendering | Phase explicitly avoids animations (v3.6 pattern: instant collapse), custom animations add complexity and maintenance burden |
| Minimap positioning math | Manual viewport calculations for placement | CSS `position: absolute` with `top/right` offsets | Browser layout engine handles positioning, viewport resizes, and overflow correctly |
| Sidebar state management | Custom event emitter or pub/sub | React component state (useState) | Already established in App.tsx (line 24), simple boolean toggle doesn't need global state |

**Key insight:** The existing codebase already has all necessary patterns established. Phase 80 is a restructuring exercise, not a greenfield implementation. Reuse existing collapse toggle mechanics (App.tsx lines 352-370) and toolbar button patterns (ToolBar.tsx lines 960-1048).

## Common Pitfalls

### Pitfall 1: Minimap Obscures Canvas Interaction

**What goes wrong:** User cannot interact with canvas tiles beneath the minimap overlay.

**Why it happens:** Absolute positioned elements capture pointer events by default, blocking interaction with underlying layers.

**How to avoid:** Minimap already handles clicks internally (navigate viewport), so this is correct behavior. No action needed — minimap is an interactive overlay by design.

**Warning signs:** User complaints about inability to edit tiles near top-right corner (unlikely — minimap is 128x128px, ~6% of typical 1920x1080 screen).

### Pitfall 2: Minimap Appears Behind Sidebar When Expanded

**What goes wrong:** When animations panel is expanded, minimap renders behind the sidebar instead of overlaying it.

**Why it happens:** Incorrect z-index or parent stacking context issues.

**How to avoid:**
1. Ensure minimap's parent `.canvas-area-wrapper` does NOT create new stacking context (avoid `z-index`, `opacity < 1`, `transform`, `filter`)
2. Set explicit `z-index: 100` on `.minimap-overlay`
3. Verify sidebar has lower z-index (or none, relying on DOM order)

**Warning signs:** Minimap disappears when sidebar expands; minimap partially hidden behind sidebar edge.

### Pitfall 3: Canvas Doesn't Expand When Sidebar Collapses

**What goes wrong:** Sidebar collapses but canvas width remains fixed, leaving whitespace.

**Why it happens:** Canvas container still reserves space for collapsed sidebar; flexbox doesn't recalculate.

**How to avoid:**
1. Ensure sidebar is conditionally rendered (fully removed from DOM), not just hidden with `visibility: hidden` or `opacity: 0`
2. Canvas container must have `flex: 1` to fill available space
3. Remove fixed widths on canvas container

**Warning signs:** Whitespace appears where sidebar was; canvas doesn't resize; horizontal scrollbar appears unnecessarily.

### Pitfall 4: Toolbar Button State Desync

**What goes wrong:** Toolbar toggle button shows incorrect icon (e.g., "collapse" icon when sidebar is already collapsed).

**Why it happens:** Toolbar receives stale `rightSidebarCollapsed` prop; state not passed correctly from App.tsx.

**How to avoid:**
1. Pass `rightSidebarCollapsed` as prop from App.tsx to ToolBar
2. Use `rightSidebarCollapsed` directly for icon selection (no derived state in ToolBar)
3. Pass toggle callback (`setRightSidebarCollapsed`) as prop, not inline arrow function

**Warning signs:** Clicking toggle button once has no effect; icon doesn't change after click; sidebar state and button state mismatch.

## Code Examples

Verified patterns from existing codebase:

### Conditional Panel Rendering (Established Pattern)

Source: App.tsx lines 359-369

```tsx
// Current v3.6 implementation - entire sidebar conditionally rendered
<div className={`right-sidebar-container ${rightSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
  <Minimap tilesetImage={tilesetImage} farplaneImage={farplaneImage} />
  {!rightSidebarCollapsed && (
    <>
      <div className="animation-panel-container">
        <div className={`panel-title-bar ${focusedPanel === 'animations' ? 'active' : 'inactive'}`}>Animations</div>
        <AnimationPanel tilesetImage={tilesetImage} />
      </div>
      <GameObjectToolPanel />
    </>
  )}
</div>
```

### Phase 80 Proposed Structure

```tsx
// App.tsx - Restructured layout
<div className="app-content">
  {/* Main canvas area with relative positioning for minimap overlay */}
  <div className="canvas-area-wrapper">
    <PanelGroup orientation="horizontal" style={{ flex: 1, minWidth: 0 }}>
      <Panel id="main" defaultSize={100}>
        <PanelGroup orientation="vertical">
          <Panel id="canvas" defaultSize={75} minSize={40}>
            <div className="main-area" onMouseDown={() => setFocusedPanel('canvas')}>
              <Workspace
                tilesetImage={tilesetImage}
                farplaneImage={farplaneImage}
                onCloseDocument={handleCloseDocument}
                onCursorMove={handleCursorMove}
              />
            </div>
          </Panel>
          <PanelResizeHandle className="resize-handle-horizontal" />
          <Panel id="tiles" defaultSize={25} minSize={10}>
            <TilesetPanel tilesetImage={tilesetImage} onTileHover={handleTilesetHover} onChangeTileset={handleChangeTileset} />
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>

    {/* Minimap overlay - always visible in top-right corner */}
    <div className="minimap-overlay">
      <Minimap tilesetImage={tilesetImage} farplaneImage={farplaneImage} />
    </div>
  </div>

  {/* Sidebar collapse toggle */}
  <button
    className={`sidebar-collapse-toggle ${rightSidebarCollapsed ? 'collapsed' : 'expanded'}`}
    onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
    title={rightSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
  />

  {/* Collapsible animations panel */}
  {!rightSidebarCollapsed && (
    <div className="right-sidebar-container">
      <div className="animation-panel-container">
        <div className={`panel-title-bar ${focusedPanel === 'animations' ? 'active' : 'inactive'}`}>Animations</div>
        <AnimationPanel tilesetImage={tilesetImage} />
      </div>
      <GameObjectToolPanel />
    </div>
  )}
</div>
```

### CSS Layout Styles

```css
/* App.css additions/modifications */

/* Wrapper for canvas + minimap overlay */
.canvas-area-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: row;
}

/* Minimap overlay - fixed top-right corner */
.minimap-overlay {
  position: absolute;
  top: var(--space-1); /* 8px */
  right: var(--space-1); /* 8px */
  z-index: 100;
  pointer-events: auto; /* Minimap is interactive (click to navigate) */
}

/* Sidebar container - remove minimap from stacked layout */
.right-sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  width: 130px;
  min-width: 130px;
  flex-shrink: 0;
  margin-right: 1px;
  /* Minimap no longer inside this container */
}
```

### Toolbar Toggle Button

Source: ToolBar.tsx lines 1033-1048 (pattern for Map Settings button)

```tsx
// ToolBar.tsx interface update
interface ToolBarProps {
  tilesetImage: HTMLImageElement | null;
  onNewMap: () => void;
  onOpenMap: () => void;
  onSaveMap: () => void;
  rightSidebarCollapsed: boolean;      // NEW
  onToggleSidebar: () => void;         // NEW
}

// Add imports at top
import { LuPanelRight, LuPanelLeft } from 'react-icons/lu';

// Add button before toolbar-spacer (around line 1048)
<button
  className={`toolbar-button ${!rightSidebarCollapsed ? 'active' : ''}`}
  onClick={onToggleSidebar}
  title={rightSidebarCollapsed ? 'Show Animations Panel' : 'Hide Animations Panel'}
>
  {rightSidebarCollapsed ? <LuPanelRight size={16} /> : <LuPanelLeft size={16} />}
</button>

<div className="toolbar-spacer" />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stacked minimap + animations in sidebar | Independent minimap overlay | Phase 80 (v3.7) | Minimap always visible, animations panel can collapse independently |
| Single collapse toggle hides entire sidebar | Toolbar toggle + minimap stays visible | Phase 80 (v3.7) | Canvas maximization without losing minimap navigation |
| Minimap inside flex column | Minimap in absolute positioned overlay | Phase 80 (v3.7) | Fixed corner position regardless of sidebar state |

**Deprecated/outdated:**

- **Stacked sidebar layout (v3.6):** Minimap and animations panel stacked in same container; collapse hides both. Replaced by independent minimap overlay pattern.
- **Edge collapse toggle (v3.6):** 6px vertical strip between canvas and sidebar (App.css lines 91-129). Replaced by toolbar toggle button for better discoverability.

## Open Questions

1. **Minimap overlay positioning edge cases**
   - What we know: Minimap is 128x128px, needs 8px margin from edges
   - What's unclear: Behavior at very small window sizes (< 800px width) — does minimap overlap critical UI?
   - Recommendation: Test at 800x600 resolution; add media query to hide minimap if necessary (`@media (max-width: 800px) { .minimap-overlay { display: none; } }`)

2. **Toolbar button placement**
   - What we know: Toolbar has clear groupings (file ops, edit tools, game tools, view controls)
   - What's unclear: Best placement for sidebar toggle — with grid/farplane view controls, or separate group?
   - Recommendation: Place with grid toggle and farplane toggle (view controls group) for semantic consistency

3. **Keyboard shortcut**
   - What we know: Toolbar buttons often have keyboard shortcuts (Ctrl+S, Ctrl+Z, etc.)
   - What's unclear: Should sidebar toggle have a shortcut? If so, what key?
   - Recommendation: No keyboard shortcut initially (not a frequent operation); add later if user feedback requests it

## Sources

### Primary (HIGH confidence)

- **E:\NewMapEditor\src\App.tsx** - Current sidebar layout structure (lines 317-375), collapse state management (line 24), conditional rendering pattern (lines 359-369)
- **E:\NewMapEditor\src\App.css** - Sidebar container styles (lines 131-151), collapse toggle styles (lines 91-129), panel layout patterns
- **E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx** - Toolbar button patterns (lines 1033-1048), icon imports (lines 15-23), prop interface structure (lines 849-863)
- **E:\NewMapEditor\src\components\Minimap\Minimap.tsx** - Minimap component structure (437 lines), current rendering and interaction logic
- **E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx** - Animation panel structure (377 lines), width constant PANEL_WIDTH = 128 (line 21)
- **E:\NewMapEditor\.planning\REQUIREMENTS.md** - Phase 80 requirements (lines 6-48), success criteria, out-of-scope items

### Secondary (MEDIUM confidence)

- **react-icons/lu documentation** - Lucide icon library, confirmed LuPanelRight and LuPanelLeft icons available for sidebar toggle button

### Tertiary (LOW confidence)

None — all research based on existing codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies required
- Architecture: HIGH - Patterns established in codebase (absolute positioning for overlays, conditional rendering for collapse, toolbar button patterns)
- Pitfalls: HIGH - Common CSS positioning and React state issues well-documented, specific to established patterns

**Research date:** 2026-02-16
**Valid until:** 30 days (stable codebase, no fast-moving dependencies)
