# Phase 7: SEdit Layout Foundation - Research

**Researched:** 2026-02-02
**Domain:** Win95/98 UI aesthetic, React layout systems, CSS beveled borders
**Confidence:** HIGH

## Summary

This phase restructures the UI with a Win95/98 aesthetic, making the map canvas the dominant element within a bordered window frame. The research focused on three core areas: (1) CSS techniques for creating authentic beveled borders matching Windows 95/98 controls, (2) React layout patterns for resizable panels with the existing react-resizable-panels library, and (3) flexbox centering strategies that handle overflow correctly.

The standard approach uses multiple box-shadow layers with inset/outset to create 3D beveled effects, leverages the already-installed react-resizable-panels v4.5.7 for smooth resizable dividers, and uses flexbox centering with careful overflow handling to center the canvas when smaller than the viewport.

**Primary recommendation:** Use CSS box-shadow with multiple layers (light highlight + dark shadow, both inset and outset) for Win95/98 borders. The app already uses react-resizable-panels correctly; extend that pattern for smooth continuous resizing. Apply flexbox centering but avoid justify-content: center on scrollable containers to prevent the flexbox scroll trap.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | 4.5.7 | Resizable split layouts | Industry standard for React panel systems, used by shadcn/ui. Already in codebase. |
| CSS box-shadow | CSS3 | 3D beveled borders | Native CSS, no library needed. Multiple shadows create authentic Win95/98 depth. |
| Flexbox | CSS3 | Centering & layout | Native CSS layout system, perfect for centering variable-size content. |
| ResizeObserver | Web API | Dynamic canvas sizing | Already in use (MapCanvas.tsx:270), native browser API for responsive sizing. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| 98.css | 0.1.x | Win95/98 reference | For inspiration only - don't add dependency. Copy border patterns. |
| CSS custom properties | CSS3 | Theme variables | Already in use (App.css). Extend for Win95/98 colors. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-resizable-panels | react-split-pane | Older library (2016-2021), less active maintenance. Current library is better. |
| CSS box-shadow | border-style: outset/inset | Browser-dependent rendering, less control. box-shadow is more reliable. |
| Flexbox centering | CSS Grid | Grid is overkill for simple centering. Flexbox is simpler and already in use. |

**Installation:**
```bash
# No new dependencies needed - everything is already available
# react-resizable-panels: ✓ v4.5.7 installed
# CSS features: ✓ Native browser support
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── App.tsx              # Main layout with PanelGroup (already exists)
├── App.css              # Add Win95/98 border utilities
├── components/
│   └── MapCanvas/
│       ├── MapCanvas.tsx       # Wrap canvas in bordered frame
│       └── MapCanvas.css       # Add .win95-frame, centering
```

### Pattern 1: Win95/98 Beveled Border (Inset)
**What:** Multiple box-shadows create 3D sunken effect for window frames
**When to use:** For map canvas window frame (appears recessed into UI)
**Example:**
```css
/* Source: 98.css patterns + Windows system colors */
.win95-frame-inset {
  /* Outer border - dark shadow on top/left, light on bottom/right */
  box-shadow:
    inset 1px 1px 0px 1px #000000,        /* Dark inner top/left */
    inset -1px -1px 0px 1px #FFFFFF,      /* Light inner bottom/right */
    inset 2px 2px 0px 1px #808080,        /* Shadow inner */
    inset -2px -2px 0px 1px #DFDFDF;      /* Highlight inner */
  border: none; /* box-shadow handles all borders */
}
```

### Pattern 2: Win95/98 Beveled Border (Outset/Raised)
**What:** Multiple box-shadows create 3D raised effect for interactive elements
**When to use:** For resize handle/divider (appears raised like Win95 bars)
**Example:**
```css
/* Source: 98.css raised border pattern */
.win95-raised-bar {
  box-shadow:
    1px 1px 0px 0px #DFDFDF,     /* Light outer bottom/right */
    -1px -1px 0px 0px #FFFFFF,   /* White outer top/left (highlight) */
    inset 1px 1px 0px 0px #808080,   /* Dark inner top/left */
    inset -1px -1px 0px 0px #C0C0C0; /* Face color inner */
  background: #C0C0C0; /* 3DFACE color */
}
```

### Pattern 3: Flexbox Centering Without Scroll Trap
**What:** Center canvas without losing scroll access when content overflows
**When to use:** Canvas container when canvas is smaller than available space
**Example:**
```css
/* Source: https://bhch.github.io/posts/2021/04/centring-flex-items-and-allowing-overflow-scroll/ */
.canvas-container {
  display: flex;
  /* DO NOT use justify-content: center - causes scroll trap */
  overflow: auto; /* Allow scrolling if needed */
}

.canvas-wrapper {
  /* Use auto margins to center, which doesn't break scrolling */
  margin: auto;
  /* Canvas will be centered but remain scrollable if it overflows */
}
```

### Pattern 4: React-Resizable-Panels Smooth Drag
**What:** Continuous resize without snap points using onLayoutChange
**When to use:** Bottom panel divider (already implemented in App.tsx)
**Example:**
```tsx
// Source: Current implementation in App.tsx:214-235
<PanelGroup orientation="vertical" onLayoutChange={handleBottomLayoutChange}>
  <Panel id="main" defaultSize={80} minSize={30}>
    {/* Main canvas area */}
  </Panel>

  <PanelResizeHandle className="resize-handle-horizontal">
    {/* Optional: collapse button */}
  </PanelResizeHandle>

  <Panel
    id="bottom"
    defaultSize={20}
    minSize={5}
    collapsible={true}
    collapsedSize={3}  /* Can drag to near-zero */
  >
    {/* Tiles panel */}
  </Panel>
</PanelGroup>
```

### Anti-Patterns to Avoid
- **Using justify-content: center on overflow container:** Creates "flexbox scroll trap" where content pushed off top is unreachable. Use margin: auto on child instead.
- **Single box-shadow for beveled border:** Won't look authentic. Win95/98 uses 4 distinct shadow layers (dark shadow, light highlight, face, border).
- **Overriding react-resizable-panels overflow property:** Panel uses overflow: hidden by default to prevent scrollbar flicker during resize. Don't override without good reason.
- **Setting min-width/height on canvas without considering zoom:** Canvas size is zoom-dependent (256 tiles * 16px * zoom). Let it size naturally.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable panel divider | Custom mouse tracking, drag state, constraints | react-resizable-panels (already installed) | Handles edge cases: keyboard accessibility, touch events, collision prevention, persist state, double-click reset. 500+ GitHub issues worth of solved problems. |
| Canvas dynamic sizing | Window resize listener, debouncing | ResizeObserver (already in use) | Already implemented in MapCanvas.tsx:270. Avoids resize loops, more efficient than window events. |
| Win95/98 beveled borders | Complex nested divs with borders | CSS box-shadow with multiple layers | 98.css proves this works. 4 box-shadows replicate exact Win95/98 appearance without DOM overhead. |
| Flexbox centering with overflow | JavaScript scroll position calculation | CSS margin: auto pattern | CSS-only solution, no JS needed. Well-documented pattern solves "scroll trap" bug. |

**Key insight:** React-resizable-panels already solves the complex drag interaction. The library handles smooth continuous resizing, collapse behavior, and edge cases. Don't rebuild what's already working - just style it with Win95/98 aesthetic.

## Common Pitfalls

### Pitfall 1: Flexbox Scroll Trap with justify-content: center
**What goes wrong:** When using `justify-content: center` on a flex container, content that overflows the top edge becomes unreachable. The browser treats the container's top as a hard boundary, pushing content into "negative space."
**Why it happens:** Flexbox calculates the mathematical center and distributes overflow equally. If content is 1000px tall and viewport is 600px, 200px goes off the top (unreachable) and 200px off the bottom (scrollable).
**How to avoid:**
- Remove `justify-content: center` from any container with `overflow: auto`
- Use `margin: auto` on the flex item instead
- For complex cases, use three-container pattern (root container → scroll container → content with margin: auto)
**Warning signs:** User reports "can't scroll to top" or "content is cut off" when canvas is zoomed larger than viewport.

### Pitfall 2: Box-Shadow vs Border Color Order
**What goes wrong:** Box-shadows render in the order specified (first shadow is bottom-most layer). Reversing the order makes borders look inverted (raised instead of sunken).
**Why it happens:** CSS box-shadow stacks like layers, with later shadows drawn on top of earlier ones.
**How to avoid:** Always list shadows in this order for inset frames:
1. Dark inner border (top/left)
2. Light inner border (bottom/right)
3. Shadow layer
4. Highlight layer
**Warning signs:** Borders look "backwards" or "popped out" instead of sunken.

### Pitfall 3: Panel Overflow Hidden by Default
**What goes wrong:** Content inside react-resizable-panels Panel components isn't scrollable by default because Panel uses `overflow: hidden` to prevent scrollbar flicker during resize.
**Why it happens:** Library design choice to avoid visual artifacts during drag operations.
**How to avoid:**
- Wrap panel content in an inner div with `overflow: auto` if scrolling is needed
- Don't try to override Panel's overflow style directly (certain styles can't be overridden)
- See react-resizable-panels docs on overflow handling
**Warning signs:** Content gets cut off inside panels, no scrollbars appear when expected.

### Pitfall 4: Canvas Sizing in Flexbox
**What goes wrong:** Setting canvas width/height to 100% doesn't work reliably in flex containers. Canvas needs explicit pixel dimensions.
**Why it happens:** Canvas element sizing is quirky - it has two dimensions (CSS size and internal bitmap size) that must match. Percentage values don't propagate correctly.
**How to avoid:**
- Use ResizeObserver to detect container size changes (already implemented in MapCanvas.tsx:270)
- Set canvas.width and canvas.height in pixels based on container clientWidth/clientHeight
- Don't use CSS 100% width/height on canvas - use explicit pixel values
**Warning signs:** Canvas appears stretched/blurry, or doesn't fill container properly.

### Pitfall 5: Windows Color Values for Dark Theme
**What goes wrong:** Authentic Win95/98 colors (#C0C0C0 gray, white highlights) look terrible on dark backgrounds.
**Why it happens:** Win95/98 used light gray desktop by default. The color values are designed for that context.
**How to avoid:**
- Use border *patterns* (shadow positions, layer structure) from Win95/98
- Use color *values* from existing CSS custom properties (--border-default, --bg-secondary)
- Map Win95/98 semantic roles to theme variables:
  - 3DFACE → --bg-secondary
  - 3DSHADOW → --border-default
  - 3DHIGHLIGHT → --border-subtle or rgba(255,255,255,0.2)
**Warning signs:** Borders have good 3D effect but colors clash with dark theme.

## Code Examples

Verified patterns from official sources:

### Complete Win95/98 Window Frame
```css
/* Combines beveled border with proper centering */
.map-window-frame {
  /* Win95/98 inset border - creates recessed window appearance */
  box-shadow:
    inset 1px 1px 0px 1px var(--color-dark-900),     /* Dark inner (top/left) */
    inset -1px -1px 0px 1px rgba(255,255,255,0.1),   /* Light inner (bottom/right) */
    inset 2px 2px 0px 1px var(--border-default),     /* Shadow */
    inset -2px -2px 0px 1px var(--border-subtle);    /* Highlight */

  /* Gray background visible around canvas */
  background: #808080; /* Win95 APPWORKSPACE - visible when canvas < frame */

  /* Centering that works with overflow */
  display: flex;
  /* NO justify-content: center - would cause scroll trap */

  /* Allow scrolling if canvas exceeds frame */
  overflow: auto;

  /* Padding creates gray border effect */
  padding: 8px;
}

.map-window-frame > canvas {
  /* Centered via margin, scrollable if needed */
  margin: auto;
  display: block;
}
```

### Win95/98 Raised Divider Bar
```css
/* Panel divider styled like Win95 window splitter */
.resize-handle-horizontal.win95-style {
  /* Raised appearance - opposite of inset */
  box-shadow:
    -1px -1px 0px 0px rgba(255,255,255,0.3),    /* Highlight outer (top/left) */
    1px 1px 0px 0px var(--border-default),      /* Shadow outer (bottom/right) */
    inset 1px 1px 0px 0px rgba(255,255,255,0.1), /* Inner highlight */
    inset -1px -1px 0px 0px var(--border-subtle); /* Inner shadow */

  background: var(--bg-secondary); /* Face color */

  /* Hover feedback - slight color shift */
  transition: background 0.15s ease;
}

.resize-handle-horizontal.win95-style:hover {
  background: var(--bg-hover);
}

/* Active state - appears pressed (invert shadows) */
.resize-handle-horizontal.win95-style[data-resize-handle-active] {
  box-shadow:
    inset -1px -1px 0px 0px rgba(255,255,255,0.3),
    inset 1px 1px 0px 0px var(--border-default);
}
```

### React Layout Structure
```tsx
// App.tsx modification - wrap MapCanvas in bordered frame
<Panel id="main" defaultSize={80} minSize={30}>
  <div className="main-area">
    {/* New: Win95-style window frame around canvas */}
    <div className="map-window-frame">
      <MapCanvas tilesetImage={tilesetImage} onCursorMove={handleCursorMove} />
    </div>
    <Minimap tilesetImage={tilesetImage} />
  </div>
</Panel>
```

### Canvas Size Calculation with Zoom
```tsx
// MapCanvas should calculate its size based on map dimensions and zoom
const calculateCanvasSize = (zoom: number) => {
  const MAP_SIZE_TILES = 256;
  const TILE_SIZE_PX = 16;

  // Canvas size in pixels at current zoom
  const canvasWidth = MAP_SIZE_TILES * TILE_SIZE_PX * zoom;
  const canvasHeight = MAP_SIZE_TILES * TILE_SIZE_PX * zoom;

  return { width: canvasWidth, height: canvasHeight };
};

// Canvas will be centered by parent flex container with margin: auto
// When canvas < viewport: centered with gray background visible
// When canvas > viewport: scrollable via parent's overflow: auto
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-split-pane | react-resizable-panels | 2021-2022 | Better accessibility, smaller bundle, active maintenance. Codebase already uses new approach. |
| Window resize listener | ResizeObserver | 2020 (widespread adoption) | More efficient, no debouncing needed. Already implemented in MapCanvas.tsx. |
| justify-content: center for centering | margin: auto for overflow-safe centering | 2021 awareness | Avoids flexbox scroll trap. Must adopt this pattern for canvas frame. |
| Nested div borders | Multiple box-shadow | Ongoing (CSS3) | Cleaner DOM, easier to theme. Use this for Win95/98 borders. |

**Deprecated/outdated:**
- **react-split-pane**: Last updated 2021, use react-resizable-panels instead (already done)
- **CSS border-style: outset/inset**: Inconsistent cross-browser rendering. Use box-shadow instead.
- **Percentage canvas sizing**: Use ResizeObserver + explicit pixel dimensions (already done)

## Open Questions

Things that couldn't be fully resolved:

1. **Gray background color for dark theme**
   - What we know: Win95/98 used #808080 (50% gray). Current theme has --bg-primary, --bg-secondary, but no "neutral gray" for desktop workspace.
   - What's unclear: Best gray shade that works with both dark and light themes. Too light looks washed out in dark theme, too dark disappears in light theme.
   - Recommendation: Test #4a4a4e (matches --color-dark-500) or add new CSS custom property --workspace-bg. User might have specific preference.

2. **Minimap positioning with new layout**
   - What we know: Minimap currently floats over canvas (position: absolute in .main-area)
   - What's unclear: Should minimap be inside the bordered frame or outside? Phase doesn't specify.
   - Recommendation: Keep current behavior (minimap inside .main-area, outside frame). Can be adjusted in future phase if needed.

3. **Scrollbar styling for Win95/98 aesthetic**
   - What we know: Custom scrollbars already implemented in MapCanvas (scroll-track-h/v classes)
   - What's unclear: Should the new window frame use custom Win95-style scrollbars, or rely on MapCanvas's existing scrollbars?
   - Recommendation: Window frame should NOT have its own scrollbars. Canvas should fill frame via margin: auto centering. If canvas exceeds viewport, user can pan with existing canvas drag controls (right-click drag already works).

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Official library docs, verified v4.5.7 usage
- [MDN: box-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-shadow) - CSS spec for multiple shadows
- [MDN: Flexbox Centering](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Aligning_items) - justify-content and align-items behavior
- Current codebase (App.tsx, MapCanvas.tsx) - Existing patterns verified

### Secondary (MEDIUM confidence)
- [98.css](https://jdan.github.io/98.css/) - Win95/98 border patterns verified via WebFetch
- [Windows System Colours GitHub Gist](https://gist.github.com/zaxbux/64b5a88e2e390fb8f8d24eb1736f71e0) - Windows XP Classic theme colors (proxy for Win95/98)
- [Flexbox Scroll Trap Article](https://bhch.github.io/posts/2021/04/centring-flex-items-and-allowing-overflow-scroll/) - Documented pitfall with solution
- [LogRocket: ResizeObserver in React](https://blog.logrocket.com/using-resizeobserver-react-responsive-designs/) - Best practices verified

### Tertiary (LOW confidence - marked for validation)
- Win95/98 exact color values (#C0C0C0 for 3DFACE) - inferred from XP Classic theme, not verified against actual Win95/98 system
- Gray background shade recommendation - needs user testing with actual theme

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, CSS features are native and well-documented
- Architecture: HIGH - Patterns verified in current codebase (react-resizable-panels) and official docs (MDN for CSS)
- Pitfalls: HIGH - Flexbox scroll trap documented with solutions, react-resizable-panels overflow behavior documented in library
- Win95/98 colors: MEDIUM - Color patterns verified via 98.css, exact values inferred from XP Classic theme
- Dark theme integration: MEDIUM - Needs testing with actual theme to find optimal gray shade

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain, React and CSS patterns don't change rapidly)
