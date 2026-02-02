# Phase 9: Panel Redesign - Research

**Researched:** 2026-02-02
**Domain:** React panel layout systems, Windows 95/98 UI design patterns
**Confidence:** HIGH

## Summary

This phase redesigns the application layout from a tabbed bottom panel to a multi-panel layout matching SEdit: left animation panel, bottom tiles panel, with canvas in the center. The primary goal is maximizing canvas space while maintaining the Win95/98 classic aesthetic.

**Current state:** TabbedBottomPanel component at bottom with three tabs (Tiles/Animations/Settings), using react-resizable-panels for vertical resizing. Canvas sits above in a single main panel.

**Target state:** Dedicated left panel for animations (always visible, resizable), bottom panel for tiles only (no tabs, resizable), Settings moves to dialog (Phase 10). Canvas occupies the center area with more available space.

**Primary recommendation:** Use nested PanelGroup components from react-resizable-panels to create a left-right split (animation | main area), then a vertical split within the main area (canvas | tiles). This maximizes canvas space while providing intuitive resizing.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | ^4.5.7 | Panel layout system | Already in use, actively maintained (v4.4.1 published days ago), 1,455+ projects use it, handles complex nested layouts efficiently |
| ResizeObserver API | Native | Canvas sizing | Built into browsers, responds to container size changes without layout thrashing |
| requestAnimationFrame | Native | Animation timing | Browser-optimized for 60 FPS, automatically throttles inactive tabs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Canvas API | Native | Tile/animation rendering | Already in use for TilePalette and AnimationPanel drawing |
| CSS Custom Properties | Native | Theme system | Already established in App.css for Win95/98 colors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-resizable-panels | react-rnd | react-rnd is for individual draggable/resizable components, not panel layouts; react-resizable-panels is purpose-built for split-view layouts |
| Nested PanelGroups | Single PanelGroup with 3 panels | Single group can't handle both horizontal and vertical splits; nested groups required for SEdit-style layout |

**Installation:**
No new packages needed - all libraries already in project.

## Architecture Patterns

### Recommended Project Structure (After Phase 9)
```
src/
├── components/
│   ├── AnimationPanel/          # Move to left, always visible
│   ├── TilePalette/              # Rename to TilesetPanel, bottom only
│   ├── MapCanvas/                # Stays center, gets more space
│   ├── Toolbar/                  # Stays top, make compact
│   ├── Minimap/                  # Stays top-right (Phase 8)
│   ├── StatusBar/                # Stays bottom
│   └── TabbedBottomPanel/        # DELETE - tabs removed
├── App.tsx                       # MAJOR REFACTOR - nested PanelGroups
└── App.css                       # UPDATE - Win95 panel styling
```

### Pattern 1: Nested Panel Layout
**What:** Use nested PanelGroup components to create complex layouts with both horizontal and vertical splits.

**When to use:** When you need panels on multiple axes (left/right AND top/bottom).

**Example:**
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
<PanelGroup direction="horizontal">
  {/* Left panel: Animations */}
  <Panel id="animations" defaultSize={20} minSize={15} maxSize={30}>
    <AnimationPanel />
  </Panel>

  <PanelResizeHandle />

  {/* Main area: Canvas + Tiles */}
  <Panel id="main" defaultSize={80}>
    <PanelGroup direction="vertical">
      <Panel id="canvas" defaultSize={75} minSize={40}>
        <MapCanvas />
      </Panel>

      <PanelResizeHandle />

      <Panel id="tiles" defaultSize={25} minSize={15} maxSize={50}>
        <TilesetPanel />
      </Panel>
    </PanelGroup>
  </Panel>
</PanelGroup>
```

### Pattern 2: Efficient Animation Preview Rendering
**What:** Use requestAnimationFrame with timestamp delta tracking to animate all visible animations simultaneously without separate timers per animation.

**When to use:** When displaying multiple animated elements that share the same frame timing.

**Example:**
```typescript
// Source: Current AnimationPanel.tsx implementation (verified working)
useEffect(() => {
  let animationId: number;
  let lastFrameTime = 0;

  const animate = (timestamp: DOMHighResTimeStamp) => {
    if (timestamp - lastFrameTime >= FRAME_DURATION) {
      advanceAnimationFrame(); // Global frame counter
      lastFrameTime = timestamp;
    }
    animationId = requestAnimationFrame(animate);
  };

  animationId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationId);
}, [advanceAnimationFrame]);
```

### Pattern 3: Win95/98 Beveled Border Styling
**What:** Use CSS custom properties with multi-layer inset box-shadows to create authentic Win95/98 3D beveled effects.

**When to use:** For panel borders, title bars, dividers, and any UI element requiring the classic raised/sunken appearance.

**Example:**
```css
/* Source: https://github.com/jdan/98.css/blob/main/style.css */
:root {
  /* Win95/98 system colors */
  --button-face: #c0c0c0;        /* RGB(192, 192, 192) */
  --button-highlight: #ffffff;    /* RGB(255, 255, 255) */
  --button-shadow: #808080;       /* RGB(128, 128, 128) */
  --window-frame: #000000;        /* RGB(0, 0, 0) */
}

/* Raised elements (buttons, title bars) */
.win95-raised {
  box-shadow:
    inset -1px -1px var(--window-frame),
    inset 1px 1px var(--button-highlight),
    inset -2px -2px var(--button-shadow),
    inset 2px 2px var(--button-face);
}

/* Sunken elements (panels, inputs) */
.win95-sunken {
  box-shadow:
    inset -1px -1px var(--button-highlight),
    inset 1px 1px var(--window-frame),
    inset -2px -2px var(--button-face),
    inset 2px 2px var(--button-shadow);
}
```

### Pattern 4: Panel Title Bars
**What:** Create Win95/98-style panel title bars with classic blue gradient background and white text.

**When to use:** For all panel headers (Animations, Tileset) to maintain consistent Win95/98 aesthetic.

**Example:**
```css
/* Windows 98 introduced gradients, but Win95 used solid colors */
/* Use solid blue for Win95 authenticity, or subtle gradient for Win98 style */
.panel-title-bar {
  background: linear-gradient(to right, #000080, #1084d0); /* Win98 style */
  /* OR: background: #000080; for pure Win95 */
  color: #ffffff;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: bold;
  font-family: 'MS Sans Serif', Arial, sans-serif;
  box-shadow:
    inset -1px -1px var(--window-frame),
    inset 1px 1px var(--button-highlight);
}
```

### Pattern 5: Resize Handle Styling
**What:** Style resize handles with subtle visual indicators and proper cursor feedback.

**When to use:** Between all resizable panels.

**Example:**
```css
/* Already exists in App.css, enhance with Win95 styling */
.resize-handle-horizontal {
  flex: 0 0 6px;
  background-color: var(--border-subtle);
  cursor: row-resize;
  box-shadow:
    -1px -1px 0px 0px rgba(255,255,255,0.2),
    1px 1px 0px 0px var(--border-default);
}

.resize-handle-vertical {
  flex: 0 0 4px;
  background-color: var(--border-subtle);
  cursor: col-resize;
  box-shadow:
    -1px -1px 0px 0px rgba(255,255,255,0.2),
    1px 1px 0px 0px var(--border-default);
}
```

### Anti-Patterns to Avoid

- **Don't use single PanelGroup for multi-axis layouts:** react-resizable-panels requires nesting PanelGroups for horizontal + vertical splits. Single group with 3 panels only works for single-axis layouts.

- **Don't set panel sizes in pixels:** Use percentage-based defaultSize (0-100) for responsive layouts. Panels accept size props in flexible formats (50% = 50 numeric), but percentages ensure proper scaling.

- **Don't override flex properties on Panel components:** The library uses internal flex layout. Overriding display, flex-direction, or flex-wrap will break resizing behavior.

- **Don't use setInterval/setTimeout for animations:** requestAnimationFrame is browser-optimized for 60 FPS and automatically throttles when tab is inactive. setInterval/setTimeout waste CPU on background tabs.

- **Don't create separate timers per animation:** Use single global animation frame counter that all animations reference. Current AnimationPanel pattern is correct - one RAF loop updates global frame, all animations read same frame value.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Panel resizing | Custom drag handlers with mouse events | react-resizable-panels | Handles keyboard accessibility, nested layouts, constraints, persistence, and edge cases like touch devices |
| Animation timing | setInterval or per-animation timers | requestAnimationFrame with global frame counter | Browser-optimized 60 FPS, auto-throttles inactive tabs, single timer for all animations |
| Canvas responsive sizing | Manual window resize listeners | ResizeObserver API | Fires only when element actually resizes, not on every window event; prevents layout thrashing |
| Win95/98 3D borders | Manual border/outline CSS | Multi-layer box-shadow pattern | Authentic pixel-perfect recreation requires 4-layer shadows; border/outline can't create beveled effect |
| Panel state persistence | localStorage with manual serialization | react-resizable-panels onLayout + defaultLayout props | Library handles serialization, validation, and recovery from invalid states |

**Key insight:** Panel layout systems have complex edge cases around minimum sizes, nested constraints, keyboard navigation, and touch device support. react-resizable-panels solves these with battle-tested code (1,455+ projects). Custom implementations typically miss accessibility features and constraint propagation in nested layouts.

## Common Pitfalls

### Pitfall 1: Panel Constraint Conflicts
**What goes wrong:** Setting conflicting minSize/maxSize constraints on nested panels causes layout breakage or panels that can't resize.

**Why it happens:** Constraints propagate through nested PanelGroups. If inner panels have minSize values that sum to more than outer panel's size, the layout can't satisfy all constraints.

**How to avoid:**
- Outer panel minSize must be >= sum of inner panels' minSize + resize handles
- Test with minimum window size (1024x768) to ensure all constraints work
- Use percentage-based sizes that always sum to 100 within each PanelGroup

**Warning signs:** Panels snap to unexpected sizes, resize handles become unresponsive, console warnings about constraint violations.

### Pitfall 2: Animation Performance Degradation
**What goes wrong:** Creating separate requestAnimationFrame loops for each animation preview causes performance issues when many animations are visible.

**Why it happens:** Each RAF loop adds overhead. With 8 visible animations, you'd have 8 RAF callbacks firing 60 times per second (480 callbacks/sec) instead of 1.

**How to avoid:**
- Use single RAF loop that updates global frame counter
- All animations read same frame counter value during render
- Current AnimationPanel implementation already does this correctly

**Warning signs:** High CPU usage, janky scrolling, frame drops when animation panel is visible.

### Pitfall 3: Canvas Size Calculation Errors
**What goes wrong:** Canvas doesn't properly fill available space in nested panels, or shows wrong size until window resize.

**Why it happens:** Canvas element sizing requires explicit width/height. Using CSS sizing alone doesn't update canvas internal dimensions.

**How to avoid:**
- Use ResizeObserver on canvas container (not window resize events)
- Set canvas.width and canvas.height in ResizeObserver callback
- Current TilePalette implementation already does this correctly

**Warning signs:** Blurry/stretched canvas rendering, canvas clipped/scrolling, canvas doesn't respond to panel resize.

### Pitfall 4: Win95 Border Layering Order
**What goes wrong:** Multi-layer box-shadow borders render in wrong order, creating inverted (raised instead of sunken) appearance.

**Why it happens:** box-shadow layers are rendered in order - first shadow is furthest from element, last shadow is closest. Incorrect order inverts the 3D effect.

**How to avoid:**
- For sunken: dark shadows on top-left (inset 1px 1px), light on bottom-right (inset -1px -1px)
- For raised: reverse - light on top-left, dark on bottom-right
- Use CSS variables from verified Win95 recreation (98.css patterns)

**Warning signs:** Buttons look sunken instead of raised, input fields look raised instead of sunken, borders look flat.

### Pitfall 5: Panel Size Persistence Confusion
**What goes wrong:** Panel sizes reset every app launch despite thinking you've implemented persistence.

**Why it happens:** react-resizable-panels uses defaultSize (initial) not size (controlled). Setting defaultSize prop doesn't persist across sessions - needs onLayout callback + localStorage.

**How to avoid:**
- For Phase 9: User decided NO persistence - use defaultSize only
- If later adding persistence: Use onLayoutChange (not onLayoutChanged) with localStorage
- Verify using PanelGroup's getLayout() imperatively

**Warning signs:** Panels always start at same size regardless of user resizing, layout state not saved between sessions.

### Pitfall 6: Toolbar Button Size Conflicts
**What goes wrong:** Making toolbar buttons "smaller" while keeping current styling results in unusable click targets or cramped layouts.

**Why it happens:** Current buttons likely have padding, text labels, and spacing designed for larger size. Simply reducing size creates tiny hit targets.

**How to avoid:**
- Icon-only buttons (remove text labels, show on hover tooltips)
- Reduce padding while maintaining minimum 24px click target (27px recommended for desktop per Apple HIG)
- Use smaller icon assets if current icons are too large

**Warning signs:** Buttons hard to click, toolbar wraps to multiple rows, users complain about usability.

## Code Examples

Verified patterns from official sources:

### Nested Panel Layout (App.tsx refactor)
```typescript
// Source: https://github.com/bvaughn/react-resizable-panels
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';

export const App: React.FC = () => {
  return (
    <div className="app">
      <Toolbar />

      {/* Horizontal split: Animations | Main */}
      <PanelGroup direction="horizontal" className="app-content">
        {/* Left: Animation Panel */}
        <Panel id="animations" defaultSize={20} minSize={15} maxSize={30}>
          <AnimationPanel tilesetImage={tilesetImage} />
        </Panel>

        <PanelResizeHandle className="resize-handle-vertical" />

        {/* Main area: Canvas + Tiles */}
        <Panel id="main" defaultSize={80}>
          {/* Vertical split: Canvas | Tiles */}
          <PanelGroup direction="vertical">
            <Panel id="canvas" defaultSize={75} minSize={40}>
              <div className="main-area">
                <MapCanvas tilesetImage={tilesetImage} />
                <Minimap tilesetImage={tilesetImage} />
              </div>
            </Panel>

            <PanelResizeHandle className="resize-handle-horizontal" />

            <Panel id="tiles" defaultSize={25} minSize={15} maxSize={50}>
              <TilesetPanel tilesetImage={tilesetImage} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      <StatusBar />
    </div>
  );
};
```

### Animation Panel Title Bar
```tsx
// Source: Win95/98 design patterns
export const AnimationPanel: React.FC<Props> = ({ tilesetImage }) => {
  return (
    <div className="animation-panel">
      <div className="panel-title-bar">Animations</div>
      <div className="panel-body">
        <canvas ref={canvasRef} className="animation-canvas" />
      </div>
    </div>
  );
};
```

### Win95 Panel Styling
```css
/* Source: https://github.com/jdan/98.css/blob/main/style.css */
.animation-panel,
.tileset-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--button-face);
  box-shadow:
    inset -1px -1px var(--button-highlight),
    inset 1px 1px var(--window-frame),
    inset -2px -2px var(--button-face),
    inset 2px 2px var(--button-shadow);
}

.panel-title-bar {
  background: linear-gradient(to right, #000080, #1084d0);
  color: #ffffff;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  min-height: 18px;
}

.panel-body {
  flex: 1;
  overflow: auto;
  padding: 4px;
}
```

### Animation Preview (16x16 at actual size)
```typescript
// AnimationPanel modifications for 16x16 previews
const ANIM_PREVIEW_SIZE = 16; // Actual tile size, not 48
const PREVIEW_SPACING = 4;
const ROW_HEIGHT = ANIM_PREVIEW_SIZE + PREVIEW_SPACING;

// Draw animations in grid layout (3 columns) or single column (Claude's discretion)
const COLUMNS = 3; // Option: grid layout
// OR: const COLUMNS = 1; // Option: single column

for (let i = startIdx; i < endIdx; i++) {
  const anim = anims[i];
  const relativeIdx = i - startIdx;
  const col = relativeIdx % COLUMNS;
  const row = Math.floor(relativeIdx / COLUMNS);

  const x = col * (ANIM_PREVIEW_SIZE + 20 + PREVIEW_SPACING);
  const y = row * ROW_HEIGHT;

  // Draw 16x16 animation preview
  if (tilesetImage && anim.frames.length > 0) {
    const frameIdx = animationFrame % anim.frameCount;
    const tileId = anim.frames[frameIdx];
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;

    // Draw at actual 16x16 size
    ctx.drawImage(
      tilesetImage,
      srcX, srcY, TILE_SIZE, TILE_SIZE,
      x, y, ANIM_PREVIEW_SIZE, ANIM_PREVIEW_SIZE
    );
  }

  // Hex label (show on hover/selection only)
  if (isHovered || isSelected) {
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.fillText(
      anim.id.toString(16).toUpperCase(), // No leading zero: "D5" not "0D5"
      x + ANIM_PREVIEW_SIZE + 4,
      y + ANIM_PREVIEW_SIZE / 2
    );
  }
}
```

### Tileset Panel (no tabs, just tiles)
```typescript
// Rename TilePalette to TilesetPanel, remove tabs
export const TilesetPanel: React.FC<Props> = ({ tilesetImage }) => {
  return (
    <div className="tileset-panel">
      <div className="panel-title-bar">Tileset</div>
      <div className="panel-body">
        <TilePaletteCanvas tilesetImage={tilesetImage} />
      </div>
    </div>
  );
};
```

### Selection Preview on Canvas
```typescript
// MapCanvas.tsx - draw selection outline when placing tiles
const drawCursor = (ctx: CanvasRenderingContext2D) => {
  if (!isMouseInCanvas || currentTool !== ToolType.TILE) return;

  const { width, height } = tileSelection;

  // Draw selection outline (dashed white box matching SEdit)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]); // Dashed line
  ctx.strokeRect(
    cursorX * TILE_SIZE * zoom,
    cursorY * TILE_SIZE * zoom,
    width * TILE_SIZE * zoom,
    height * TILE_SIZE * zoom
  );
  ctx.setLineDash([]); // Reset
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tab-based panels | Always-visible dedicated panels | Modern design tools (2015+) | Photoshop, GIMP, Figma all use dedicated panels; tabs hide functionality and require extra clicks |
| Separate animation timers | Single RAF with global frame counter | HTML5 RAF introduction (2011) | 60 FPS browser-optimized rendering, automatic throttling for inactive tabs |
| Window resize events | ResizeObserver API | 2020 browser adoption | Fires only when elements actually resize, prevents unnecessary recalculations |
| Manual drag handlers | Declarative panel libraries | react-resizable-panels (2022+) | Handles accessibility, constraints, nested layouts, and persistence automatically |

**Deprecated/outdated:**
- **Tabbed panel pattern for tools:** Modern design apps use dedicated panels. Tabs require extra clicks and hide available tools from view.
- **setInterval for animations:** requestAnimationFrame is standard since 2011. setInterval wastes CPU and doesn't sync with display refresh.
- **Window.resize event for canvas sizing:** ResizeObserver is better - fires only when element resizes, not on every window size change.

## Open Questions

Things that couldn't be fully resolved:

1. **SEdit exact panel proportions**
   - What we know: SEdit has left animation panel and bottom tiles panel
   - What's unclear: Exact default width percentages, minimum sizes
   - Recommendation: Start with animation panel defaultSize={20} (20% width), tiles defaultSize={25} (25% height), adjust based on user testing

2. **Animation panel layout: grid vs single column**
   - What we know: 16x16 preview size is locked, hex labels show on hover/selection
   - What's unclear: Whether SEdit uses grid layout (multiple columns) or single column list
   - Recommendation: User marked as Claude's discretion. Single column is safer for narrow panels, grid layout fits more animations. Try single column first (simpler), can switch to 2-3 column grid if panel is wide enough.

3. **Selection outline style on canvas**
   - What we know: SEdit shows selection outline when placing multi-tile stamps
   - What's unclear: Exact visual style (solid, dashed, color)
   - Recommendation: Use dashed white line (common in tile editors). Can verify with SEdit screenshots if needed.

4. **Frame offset popup placement**
   - What we know: Frame offset field appears when animation is selected
   - What's unclear: Inline below canvas vs floating popup
   - Recommendation: Inline below canvas is simpler and follows current AnimationPanel pattern. Floating popup adds complexity for minimal benefit.

5. **Title bar gradient vs solid**
   - What we know: Win95 used solid colors, Win98 introduced gradients
   - What's unclear: Which version to match for "Win95/98 style"
   - Recommendation: Use Win98 gradient (linear-gradient from #000080 to #1084d0) - more visually interesting, "Win95/98" suggests either is acceptable.

## Sources

### Primary (HIGH confidence)
- react-resizable-panels library: [GitHub](https://github.com/bvaughn/react-resizable-panels), [npm](https://www.npmjs.com/package/react-resizable-panels), [Docs](https://react-resizable-panels.vercel.app/)
- 98.css Win95/98 recreation: [GitHub](https://github.com/jdan/98.css), [Demo](https://jdan.github.io/98.css/)
- MDN Web Docs: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [Canvas API animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- RetroBar Win95-98 theme: [Colors](https://github.com/dremin/RetroBar/blob/master/RetroBar/Themes/Windows%2095-98.xaml)
- Current project implementation: AnimationPanel.tsx (verified RAF pattern), TilePalette.tsx (verified ResizeObserver pattern), App.css (verified Win95 styling)

### Secondary (MEDIUM confidence)
- Electron BrowserWindow API: [Window sizing](https://www.electronjs.org/docs/latest/api/structures/base-window-options)
- Windows 95 color palette references: [Color-hex.com palette](https://www.color-hex.com/color-palette/4556)
- Windows interface guidelines: [Archive.org reference](https://archive.org/details/windowsinterface00micr)

### Tertiary (LOW confidence)
- Win95/98 title bar specific gradient values: Search results indicated Win98 introduced gradients but didn't provide exact hex values. Recommendation based on common Win98 gradient implementations (#000080 to #1084d0).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-resizable-panels already in use, verified version and adoption
- Architecture: HIGH - Nested PanelGroup pattern verified in official docs, current project patterns verified working
- Pitfalls: HIGH - Based on react-resizable-panels docs and common React/Canvas issues
- Win95/98 styling: MEDIUM - 98.css patterns verified, but some color values interpolated from multiple sources
- SEdit layout details: LOW - No direct access to SEdit for measurements, recommendations based on standard tool panel patterns

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - react-resizable-panels is stable, Win95/98 patterns are vintage and unchanging)
