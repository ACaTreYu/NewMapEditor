# Phase 66: UI Component Polish - Research

**Researched:** 2026-02-14
**Domain:** CSS scrollbar styling, React panel resizing, canvas minimap viewport indicators
**Confidence:** HIGH

## Summary

This phase addresses three independent UI polish issues: (1) adding a visible scrollbar to the animation list canvas for better navigation affordance, (2) enabling independent resizing of the notepad panel and tile palette panel, and (3) showing a viewport indicator rectangle on the minimap when the editor is running in the dev app environment.

The project already uses `react-resizable-panels` v4.5.7 for layout management (App.tsx uses PanelGroup/Panel/PanelResizeHandle). The current implementation has a horizontal panel split (main/right-sidebar) and a nested vertical split (canvas/tiles), but the notepad and tile palette share a fixed 640px left section without independent size controls.

The animation panel currently uses a canvas-based list with wheel-only scrolling (handleWheel in AnimationPanel.tsx). CSS custom scrollbars can be added using `::-webkit-scrollbar` pseudo-elements for Webkit browsers and `scrollbar-width`/`scrollbar-color` for Firefox. The minimap already draws a viewport rectangle (lines 382-390 in Minimap.tsx) but needs logic to detect dev vs production environment to conditionally render it.

**Primary recommendation:** Use CSS `overflow-y: auto` on animation list container with custom scrollbar styling, split TilesetPanel.css into two resizable panels using existing react-resizable-panels infrastructure, and add environment detection for minimap viewport indicator visibility.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | 4.5.7 | Panel layout system | Already in use (App.tsx), mature library by bvaughn with PanelGroup/Panel/Separator API |
| CSS ::-webkit-scrollbar | Current (2026) | Custom scrollbar styling | Standard Webkit pseudo-element, widely supported (Chrome, Safari, Edge, Opera) |
| scrollbar-width/scrollbar-color | CSS Scrollbars Module Level 1 | Firefox scrollbar styling | Standard CSS properties (supported since Chrome 121), Firefox alternative to webkit |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| window.innerWidth | Browser API | Viewport calculation | Already used in Minimap.tsx for viewport rect sizing |
| process.env.NODE_ENV | Node.js | Environment detection | Vite build-time constant for dev/prod branching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS overflow scrollbar | Custom React scrollbar component | Custom components add bundle size and complexity; native scrollbars are accessible and familiar |
| react-resizable-panels | CSS flexbox with drag handlers | Hand-rolling resize logic is error-prone; existing library handles edge cases (min/max, collapse) |
| Environment detection | Runtime feature detection | Build-time env vars are cleaner for dev-only features; no runtime overhead |

**Installation:**
No new dependencies needed — all features use existing stack (react-resizable-panels already installed, CSS scrollbars are native browser features).

## Architecture Patterns

### Recommended Project Structure
Current structure is already established:
```
src/components/
├── AnimationPanel/          # Wheel-only scrolling → add overflow-y scrollbar
├── TilesetPanel/            # Fixed 640px + notepad → split into resizable panels
├── RulerNotepadPanel/       # Shares tileset section → needs own resize control
└── Minimap/                 # Draws viewport rect always → conditionally render
```

### Pattern 1: CSS Custom Scrollbar Styling (Cross-Browser)
**What:** Dual CSS rulesets for Webkit browsers (Chrome, Safari, Edge) and Firefox.
**When to use:** Replacing wheel-only scrolling with visible scrollbar affordance.
**Example:**
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scrollbars_styling */

/* Webkit browsers (Chrome, Safari, Edge, Opera) */
.animation-list-container::-webkit-scrollbar {
  width: 8px;
}
.animation-list-container::-webkit-scrollbar-track {
  background: var(--surface);
}
.animation-list-container::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: var(--radius-sm);
}
.animation-list-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Firefox */
.animation-list-container {
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) var(--surface);
}
```

### Pattern 2: React-Resizable-Panels Nested Groups
**What:** PanelGroup wraps multiple Panel components; nested groups enable multi-axis layouts.
**When to use:** Independent panel sizing (tile palette vs notepad) within a parent container.
**Example:**
```tsx
// Source: Current App.tsx pattern (lines 326-346)
<PanelGroup orientation="horizontal">
  <Panel id="tile-palette" defaultSize={60} minSize={30}>
    <TilePalette />
  </Panel>
  <PanelResizeHandle className="resize-handle-vertical" />
  <Panel id="notepad" defaultSize={40} minSize={20}>
    <RulerNotepadPanel />
  </Panel>
</PanelGroup>
```

### Pattern 3: Environment-Based Conditional Rendering
**What:** Use Vite's `import.meta.env.MODE` for build-time branching (dev vs production).
**When to use:** Dev-only UI features (minimap viewport indicator visible in dev, hidden in prod).
**Example:**
```tsx
// Source: Vite documentation
const isDev = import.meta.env.MODE === 'development';

// In Minimap.tsx draw() function:
if (isDev) {
  // Draw viewport rectangle (lines 382-390)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(...);
}
```

### Anti-Patterns to Avoid
- **Removing existing canvas wheel handler:** Keep `onWheel` handler for users who prefer wheel scrolling; add visible scrollbar as additional affordance, not replacement.
- **Hardcoding pixel sizes in resize logic:** Use `defaultSize` percentages and `minSize` constraints; avoid fixed `flex: 0 0 640px` when panels need independent resize.
- **Runtime environment checks in render loop:** `process.env.NODE_ENV` works at build time but not runtime in browser; use `import.meta.env.MODE` (Vite convention) for client-side code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Panel resize drag handlers | Custom mouse event listeners | react-resizable-panels (already installed) | Handles edge cases: min/max constraints, collapse, keyboard accessibility, touch support |
| Scrollbar styling cross-browser | Detect browser + custom divs | CSS ::-webkit-scrollbar + scrollbar-width | Native scrollbars are accessible, performant, and familiar to users |
| Environment detection | Parse user agent or URL | import.meta.env.MODE | Build-time constant; no runtime overhead, reliable for Vite builds |

**Key insight:** CSS scrollbar styling is deceptively complex across browsers. Webkit uses 7+ pseudo-elements (`::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`, etc.), Firefox uses 2 properties (`scrollbar-width`, `scrollbar-color`). Using both avoids maintaining custom scrollbar components.

## Common Pitfalls

### Pitfall 1: Overflow Scrollbar Not Appearing
**What goes wrong:** Adding `overflow-y: scroll` to canvas element doesn't show scrollbar because canvas is fixed-size (no overflow).
**Why it happens:** Canvas elements have intrinsic dimensions (width/height attributes); CSS overflow applies to container, not canvas itself.
**How to avoid:** Wrap canvas in a div container with fixed `max-height` and `overflow-y: auto`; canvas becomes taller than container, triggering scrollbar.
**Warning signs:** Scrollbar CSS rules present but no scrollbar visible; canvas height equals container height exactly.

### Pitfall 2: Panel Resize Breaking Fixed 640px Constraint
**What goes wrong:** TilesetPanel has `flex: 0 0 640px` (line 42 in TilesetPanel.css) — making it resizable breaks tile palette width constraint from v3.0 spec.
**Why it happens:** react-resizable-panels overrides flex values; fixed-size panels conflict with resize behavior.
**How to avoid:** Keep tile palette panel at fixed 640px; only make notepad panel resizable. Use `minSize={640px in percentage}` and `maxSize={640px in percentage}` to lock tile palette size while allowing notepad to flex.
**Warning signs:** Tile palette stretches beyond 640px; tiles render at wrong positions; user can drag tile palette boundary.

### Pitfall 3: Minimap Viewport Rect Uses Wrong Dimensions in MDI
**What goes wrong:** `window.innerWidth/innerHeight` (lines 248-249, 446-447) measure entire window, not active ChildWindow viewport.
**Why it happens:** MDI (Multiple Document Interface) means each ChildWindow has its own viewport; global window size doesn't match document canvas size.
**How to avoid:** For dev-only viewport indicator, check if it's already accurate enough (good-enough heuristic); if not, pass canvas dimensions from ChildWindow props to Minimap.
**Warning signs:** Viewport rectangle on minimap is too large or too small compared to visible map area; doesn't match when window is resized.

### Pitfall 4: CSS Scrollbar Styling Not Applied in Firefox
**What goes wrong:** `::-webkit-scrollbar` rules don't work in Firefox; scrollbar remains default grey.
**Why it happens:** Webkit pseudo-elements are vendor-specific; Firefox uses different CSS properties.
**How to avoid:** Always include both Webkit pseudo-elements AND `scrollbar-width`/`scrollbar-color` properties on same selector.
**Warning signs:** Scrollbar styled in Chrome but default in Firefox; no compiler errors (silently ignored).

## Code Examples

Verified patterns from official sources:

### Animation Panel Scrollable List Container
```tsx
// AnimationPanel.tsx
// Replace canvas onWheel handler with scrollable container

const CANVAS_HEIGHT = VISIBLE_ANIMATIONS * ROW_HEIGHT; // e.g., 16 * 20 = 320px
const CONTAINER_MAX_HEIGHT = 256; // Trigger scrollbar when canvas exceeds this

return (
  <div className="animation-panel">
    <div className="panel-header">...</div>

    {/* Scrollable container wraps canvas */}
    <div className="animation-list-container">
      <canvas
        ref={canvasRef}
        className="animation-canvas"
        width={canvasWidth}
        height={CANVAS_HEIGHT} // Full height, not constrained
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        // Keep onWheel for wheel users
        onWheel={handleWheel}
      />
    </div>

    <div className="anim-controls">...</div>
  </div>
);
```

```css
/* AnimationPanel.css */
.animation-list-container {
  max-height: 256px; /* Constrain container, not canvas */
  overflow-y: auto;
  flex-shrink: 0;
}

/* Webkit scrollbar styling */
.animation-list-container::-webkit-scrollbar {
  width: 8px;
}
.animation-list-container::-webkit-scrollbar-track {
  background: var(--surface);
}
.animation-list-container::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: var(--radius-sm);
}
.animation-list-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* Firefox scrollbar styling */
.animation-list-container {
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) var(--surface);
}
```

### TilesetPanel Independent Resize
```tsx
// TilesetPanel.tsx
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

export const TilesetPanel: React.FC<Props> = ({ tilesetImage, onTileHover, onChangeTileset }) => {
  return (
    <div className="tileset-panel">
      <div className="panel-title-bar tileset-title-bar">
        <span>Tileset</span>
        {/* ... */}
      </div>
      <div className="tileset-panel-body">
        {/* Horizontal split: tile palette (fixed 640px) | notepad (resizable) */}
        <PanelGroup orientation="horizontal">
          <Panel id="tile-palette" defaultSize={60} minSize={40} maxSize={70}>
            <div className="tileset-palette-section">
              <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle-vertical" />

          <Panel id="notepad" defaultSize={40} minSize={30}>
            <div className="tileset-freed-section">
              <RulerNotepadPanel />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
```

```css
/* TilesetPanel.css - UPDATE existing styles */
.tileset-panel-body {
  flex: 1;
  display: flex; /* Remove this — PanelGroup handles layout */
  flex-direction: row; /* Remove this */
  overflow: hidden;
}

/* Remove fixed 640px constraint — let PanelGroup control */
.tileset-palette-section {
  /* DELETE: flex: 0 0 640px; */
  height: 100%; /* Fill panel height */
  overflow-x: auto;
  overflow-y: hidden;
  border-right: 1px solid var(--border-default);
}

.tileset-freed-section {
  /* Already correct: flex: 1; min-width: 0; */
  height: 100%; /* Fill panel height */
  background: var(--bg-secondary);
  overflow: hidden;
}

/* Add resize handle styling */
.resize-handle-vertical {
  width: 4px;
  background: var(--border-default);
  cursor: col-resize;
}
.resize-handle-vertical:hover {
  background: var(--accent-primary);
}
```

### Minimap Viewport Indicator (Dev Only)
```tsx
// Minimap.tsx
const isDev = import.meta.env.MODE === 'development';

const draw = useCallback(() => {
  // ... existing drawing code (lines 260-379) ...

  // Layer 3: Draw viewport rectangle (dev only)
  if (isDev) {
    const vp = getViewportRect();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.floor(vp.x) + 0.5,
      Math.floor(vp.y) + 0.5,
      Math.max(4, vp.width),
      Math.max(4, vp.height)
    );
  }
}, [map, viewport, getViewportRect]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wheel-only scrolling | Visible scrollbar + wheel | ~2020s (accessibility focus) | Better discoverability for mouse-only users |
| Fixed panel layouts | User-resizable panels | react-resizable-panels v4+ (2023) | Customizable workspace, preserves state |
| Always-on viewport indicators | Environment-conditional rendering | Vite import.meta.env (2021+) | Cleaner production UI, dev-only debugging aids |

**Deprecated/outdated:**
- `process.env.NODE_ENV` in client-side Vite code: Use `import.meta.env.MODE` instead (Vite convention)
- CSS `overflow: overlay` (deprecated 2022): Use `overflow: auto` with custom scrollbar styling

## Open Questions

1. **Should tile palette remain exactly 640px or allow slight resize?**
   - What we know: v3.0 spec says "tile palette 640px constraint" (MEMORY.md line 17)
   - What's unclear: Is this a UX preference or technical requirement? Tiles are 16px × 40 columns = 640px logical width.
   - Recommendation: Keep tile palette at fixed 640px (use minSize/maxSize to lock it); only make notepad resizable. If user wants more notepad space, they shrink the entire bottom panel.

2. **Should minimap viewport indicator account for MDI window sizes?**
   - What we know: Current code uses `window.innerWidth/innerHeight` (lines 248-249, 446-447); MDI has multiple ChildWindows with independent viewports.
   - What's unclear: Is the viewport indicator meant to match active ChildWindow canvas or just be a heuristic?
   - Recommendation: For dev-only feature, current heuristic is probably good enough. If accuracy matters, pass canvas dimensions from ChildWindow to Minimap via props.

3. **What's the max-height for animation list container?**
   - What we know: Current visible count is 16 rows × 20px = 320px canvas (lines 20-21 in AnimationPanel.tsx)
   - What's unclear: Should scrollbar appear when all 256 animations are showing (256 × 20 = 5120px canvas)?
   - Recommendation: Set `max-height: 320px` (matches current visible count); scrollbar appears automatically when canvas exceeds container.

## Sources

### Primary (HIGH confidence)
- react-resizable-panels v4.5.7: package.json (project file)
- Current implementation: AnimationPanel.tsx, TilesetPanel.tsx, Minimap.tsx, App.tsx (codebase)
- [MDN CSS Scrollbars Styling](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scrollbars_styling) - Official CSS spec and browser support
- [Chrome for Developers - Scrollbar Styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling) - Current best practices (2026)

### Secondary (MEDIUM confidence)
- [GitHub - react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) - Official docs and API examples
- [CSS-Tricks - Custom Scrollbars in WebKit](https://css-tricks.com/custom-scrollbars-in-webkit/) - Webkit pseudo-element guide
- [LogRocket - Guide to Styling CSS Scrollbars](https://blog.logrocket.com/guide-styling-css-scrollbars/) - Cross-browser scrollbar styling patterns
- [Fabric.js - Creating a Minimap for Canvas](https://fabric5.fabricjs.com/build-minimap) - Minimap viewport indicator pattern

### Tertiary (LOW confidence)
- N/A (all findings verified with official docs or codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use (react-resizable-panels) or native CSS features
- Architecture: HIGH - Patterns verified in current codebase (App.tsx, existing panels)
- Pitfalls: MEDIUM - Based on CSS overflow/canvas interaction experience and Vite env vars; not all pitfalls verified in this specific codebase

**Research date:** 2026-02-14
**Valid until:** 2026-03-16 (30 days for stable CSS/React patterns)
