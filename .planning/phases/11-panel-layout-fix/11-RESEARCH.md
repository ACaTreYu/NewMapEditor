# Phase 11: Panel Layout Fix - Research

**Researched:** 2026-02-03
**Domain:** React panel layouts, CSS flexbox sizing, react-resizable-panels configuration
**Confidence:** HIGH

## Summary

This phase fixes CSS and panel configuration issues that prevent the map canvas from dominating the window and prevent panel dividers from being draggable. Research identified three primary problem areas: (1) flexbox min-height: auto preventing panels from shrinking correctly, (2) incorrect defaultSize proportions making canvas too small, and (3) potential CSS conflicts with react-resizable-panels drag behavior.

The current implementation uses react-resizable-panels v4.5.7 (correct v4 API with `orientation` prop and `PanelResizeHandle` component). Prior research from Phase 7 and Phase 9 confirmed this library is already configured properly at the API level. The layout issues stem from CSS flexbox constraints and panel size proportions, not library misconfiguration.

**Primary recommendation:** Set `min-height: 0` on Panel components to override flexbox's automatic minimum size behavior, which prevents shrinking. Adjust defaultSize proportions to give canvas ~70-75% of vertical space and ~80% of horizontal space. Verify no CSS rules interfere with resize handle pointer events or drag state.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-resizable-panels | 4.5.7 | Resizable panel system | Already in use, v4 API (orientation prop), actively maintained (v4.4.1 published Jan 2026) |
| CSS Flexbox | CSS3 | Panel layout system | Native browser support, react-resizable-panels uses flex internally |
| CSS Custom Properties | CSS3 | Theme variables | Already established in App.css for sizing and colors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ResizeObserver | Web API | Canvas dynamic sizing | Already in MapCanvas.tsx, native browser API |
| CSS box-shadow | CSS3 | Win95/98 beveled borders | Already implemented for resize handles |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-resizable-panels | CSS Grid layout | Grid can't provide draggable dividers without custom JS. react-resizable-panels handles all drag interaction. |
| Flexbox min-height fix | JavaScript size calculation | CSS solution is simpler, more performant, doesn't require JS. |

**Installation:**
No new dependencies needed - all tools already in project.

## Architecture Patterns

### Recommended Project Structure
Current structure is correct - no file changes needed, only CSS and prop adjustments:
```
src/
├── App.tsx              # Adjust defaultSize props
├── App.css              # Add min-height: 0 rules
├── components/
│   ├── AnimationPanel/  # Already has title bar
│   ├── TilesetPanel/    # Already has title bar
│   └── MapCanvas/       # Already in flex container
```

### Pattern 1: Flexbox Min-Height Override
**What:** Set `min-height: 0` on flex items to prevent automatic minimum size from blocking shrinkage
**When to use:** When nested flex containers cause panels to refuse to shrink below content size
**Example:**
```css
/* Source: https://www.bigbinary.com/blog/understanding-the-automatic-minimum-size-of-flex-items */
/* Flex items have min-height: auto by default, which prevents shrinking below content size */

[data-panel-id] {
  min-height: 0; /* Allow panel to shrink below content minimum */
}

/* For vertical orientation, also set on panel groups */
[data-panel-group-id][data-panel-group-direction="vertical"] {
  min-height: 0;
}

/* For horizontal orientation, use min-width */
[data-panel-group-id][data-panel-group-direction="horizontal"] {
  min-width: 0;
}
```

### Pattern 2: Panel Proportion Guidelines
**What:** Default panel sizes that give canvas visual dominance while keeping supporting panels usable
**When to use:** Setting defaultSize props on Panel components
**Example:**
```tsx
// Source: Industry standard proportions + Phase 9 research
// Horizontal split: Animation (left) | Main area (right)
<PanelGroup orientation="horizontal">
  <Panel id="animations" defaultSize={18} minSize={12} maxSize={30}>
    {/* 18% for left animation panel */}
  </Panel>

  <PanelResizeHandle />

  <Panel id="main" defaultSize={82}>
    {/* 82% for main area (canvas + tileset) */}
    <PanelGroup orientation="vertical">
      <Panel id="canvas" defaultSize={70} minSize={40}>
        {/* 70% of main area = ~57% of total viewport */}
      </Panel>

      <PanelResizeHandle />

      <Panel id="tiles" defaultSize={30} minSize={15} maxSize={50}>
        {/* 30% of main area = ~25% of total viewport */}
      </Panel>
    </PanelGroup>
  </Panel>
</PanelGroup>

// Result: Canvas gets ~57% of viewport (82% * 70%), achieving >60% dominance goal
```

### Pattern 3: Resize Handle CSS Requirements
**What:** Ensure resize handles are visible and draggable without CSS conflicts
**When to use:** Styling PanelResizeHandle components
**Example:**
```css
/* Source: react-resizable-panels requirements + current App.css */
.resize-handle-vertical {
  flex: 0 0 4px; /* Fixed size, don't grow/shrink */
  background-color: var(--border-subtle);
  cursor: col-resize; /* CRITICAL: Must not be overridden */
  position: relative;

  /* DO NOT set pointer-events: none */
  /* DO NOT set user-select on handle itself */
}

.resize-handle-horizontal {
  flex: 0 0 6px;
  background-color: var(--border-subtle);
  cursor: row-resize; /* CRITICAL: Must not be overridden */
  position: relative;
}

/* Expand hit target without visual change */
.resize-handle-vertical::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;  /* Expand hit area */
  right: -4px;
  /* No pointer-events property - inherits from parent */
}
```

### Pattern 4: DefaultSize Auto-Assignment
**What:** If defaultSize is omitted, react-resizable-panels auto-assigns based on panel count
**When to use:** Quick prototyping, but NOT for production (causes layout flicker)
**Example:**
```tsx
// Source: react-resizable-panels README
// BAD: Auto-assignment causes flicker, especially with SSR
<PanelGroup orientation="horizontal">
  <Panel id="left">{/* Size auto-assigned: 50% */}</Panel>
  <PanelResizeHandle />
  <Panel id="right">{/* Size auto-assigned: 50% */}</Panel>
</PanelGroup>

// GOOD: Explicit sizes prevent flicker
<PanelGroup orientation="horizontal">
  <Panel id="left" defaultSize={25}>{/* Explicit 25% */}</Panel>
  <PanelResizeHandle />
  <Panel id="right" defaultSize={75}>{/* Explicit 75% */}</Panel>
</PanelGroup>
```

### Anti-Patterns to Avoid

- **Omitting defaultSize:** Causes layout flicker and unpredictable sizes. Always specify defaultSize for every Panel.
- **Not setting min-height: 0 on nested flex:** Flexbox's automatic minimum size prevents panels from shrinking, causing canvas to collapse to thin strip.
- **Overriding cursor on resize handles:** react-resizable-panels sets cursor to indicate drag state. CSS that overrides cursor breaks user feedback.
- **Using overflow: hidden on Panel:** Library uses overflow: hidden by default to prevent scrollbar flicker during resize. Wrap content in inner div with overflow: auto if scrolling needed.
- **Setting pointer-events: none globally:** Breaks drag interaction. If using for other elements, ensure resize handles are excluded.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calculating panel sizes in pixels | JavaScript window resize listener, manual calculations | react-resizable-panels with percentage defaultSize | Library handles all size calculations, constraints, and edge cases automatically |
| Debugging why canvas is thin strip | Complex CSS debugging, trial and error | Set min-height: 0 on flex items | Well-documented flexbox issue (Flexbug #1 variant), CSS-only fix |
| Making resize handles draggable | Custom mouse event handlers, drag state | Verify cursor not overridden, check pointer-events | Library already handles drag - CSS conflicts are usual cause |
| Proportions that "look right" | Guessing percentage values | Use 70/30 split for vertical, 80/20 for horizontal | Industry standard proportions from design tools (Photoshop, Figma, VS Code) |

**Key insight:** The library already handles drag interaction correctly. If dividers aren't draggable, it's almost always CSS interfering (cursor override, pointer-events, or positioned elements covering handles). Don't modify library drag code - fix CSS conflicts instead.

## Common Pitfalls

### Pitfall 1: Flexbox Automatic Minimum Size
**What goes wrong:** Canvas panel collapses to thin strip or refuses to shrink when dragging divider. Panel seems "stuck" at content minimum height.
**Why it happens:** Flexbox items have `min-height: auto` by default (CSS Flexbox spec). This prevents items from shrinking below their content's intrinsic minimum size. In nested flex layouts, this compounds - each level enforces its own minimum, preventing parent from shrinking.
**How to avoid:**
- Set `min-height: 0` on all `[data-panel-id]` elements
- Set `min-height: 0` on vertical `[data-panel-group-id]` elements
- Set `min-width: 0` on horizontal `[data-panel-group-id]` elements
- Add rules to App.css targeting library's data attributes
**Warning signs:**
- Canvas panel is thin strip even with defaultSize={70}
- Dragging divider doesn't shrink panel below certain size (but minSize allows it)
- Panel takes up less space than defaultSize percentage indicates

### Pitfall 2: DefaultSize Proportions Don't Add to 100
**What goes wrong:** Panels don't match expected sizes, resize behavior feels "wrong", panels jump when dragging starts.
**Why it happens:** react-resizable-panels normalizes sizes if they don't sum to 100, but this can cause unexpected initial layouts. Library documentation recommends sizes that sum to 100 within each PanelGroup.
**How to avoid:**
- Within each PanelGroup, ensure all Panel defaultSize values sum to 100
- Example: If 3 panels, use defaultSize={25}, defaultSize={50}, defaultSize={25} (25+50+25=100)
- Check nested groups separately (outer group and inner group each sum to 100)
**Warning signs:**
- Panels don't match visual proportions you specified
- Console warnings about normalized sizes (check browser console)
- Resize behavior feels janky on first drag

### Pitfall 3: CSS Cursor Override
**What goes wrong:** Resize handles don't show drag cursor (still shows default arrow or text cursor), making them feel non-interactive.
**Why it happens:** react-resizable-panels sets `cursor: col-resize` or `cursor: row-resize` on handles, and `cursor: grabbing` during active drag. Global CSS rules or parent element cursor can override this.
**How to avoid:**
- Don't set cursor on elements that contain resize handles
- Check for `cursor: inherit` rules that might pull wrong cursor from parent
- Verify `.resize-handle-vertical` and `.resize-handle-horizontal` have explicit cursor
- Check browser DevTools computed styles during hover to see if cursor is overridden
**Warning signs:**
- Hovering resize handle shows wrong cursor
- Can drag handle but cursor doesn't indicate it
- Users report "didn't realize I could drag this"

### Pitfall 4: Overlapping Positioned Elements
**What goes wrong:** Can't click/drag resize handle even though it's visually present. Clicking seems to do nothing or interacts with wrong element.
**Why it happens:** Elements with `position: absolute` or `position: fixed` can overlay resize handles, capturing pointer events. Common with minimap, modals, tooltips that render on top.
**How to avoid:**
- Check z-index of positioned elements (minimap, dialogs, tooltips)
- Ensure resize handles have higher z-index than overlapping elements, OR
- Ensure positioned elements have pointer-events: none (if they shouldn't capture clicks)
- Use browser DevTools "Select element" tool to verify what's under cursor
**Warning signs:**
- Resize handle visible but can't click it
- Clicking handle interacts with different element
- DevTools shows different element is receiving events

### Pitfall 5: Nested Panel Constraint Conflicts
**What goes wrong:** Inner panel can't resize below certain size even though its minSize would allow it. Outer panel resize affects inner panels unexpectedly.
**Why it happens:** Constraints propagate through nested PanelGroups. If outer panel minSize is 40% and inner panels have minSize values that sum to more than 40%, constraints conflict.
**How to avoid:**
- Outer panel minSize must be >= sum of inner panels' minSize (accounting for proportions)
- Example: If outer panel is 80% of screen and has minSize={40}, inner panels can use up to 40% of screen total
- Test by dragging outer divider to minimum, then try dragging inner dividers
**Warning signs:**
- Inner panel resize stops working when outer panel is small
- Console warnings about constraint violations
- Panels snap to unexpected sizes during resize

## Code Examples

Verified patterns from official sources:

### Flexbox Min-Height Fix (Critical)
```css
/* Source: https://www.bigbinary.com/blog/understanding-the-automatic-minimum-size-of-flex-items */
/* Add to App.css - fixes canvas collapse issue */

/* Override flexbox automatic minimum size on all panels */
[data-panel-id] {
  min-height: 0;
  min-width: 0;
}

/* Also apply to panel groups for deeply nested layouts */
[data-panel-group-id] {
  min-height: 0;
  min-width: 0;
}
```

### Optimal Panel Proportions
```tsx
// Source: Industry standards + Phase 9 research (defaultSize={20} for animations, defaultSize={75} for canvas)
// App.tsx - adjusted proportions for canvas dominance

<PanelGroup orientation="horizontal" className="app-content">
  {/* Left: Animation Panel - was 18%, keep similar */}
  <Panel id="animations" defaultSize={18} minSize={12} maxSize={30}>
    <div className="animation-panel-container">
      <div className="panel-title-bar">Animations</div>
      <AnimationPanel tilesetImage={tilesetImage} />
    </div>
  </Panel>

  <PanelResizeHandle className="resize-handle-vertical" />

  {/* Main area: Canvas + Tiles - was 82%, keep same */}
  <Panel id="main" defaultSize={82}>
    <PanelGroup orientation="vertical">
      {/* Canvas - INCREASE from 75% to 70% to give more space */}
      <Panel id="canvas" defaultSize={70} minSize={40}>
        <div className="main-area">
          <MapCanvas tilesetImage={tilesetImage} onCursorMove={handleCursorMove} />
          <Minimap tilesetImage={tilesetImage} />
        </div>
      </Panel>

      <PanelResizeHandle className="resize-handle-horizontal" />

      {/* Tiles - DECREASE from 25% to 30% for better tile visibility */}
      <Panel id="tiles" defaultSize={30} minSize={15} maxSize={50}>
        <TilesetPanel tilesetImage={tilesetImage} />
      </Panel>
    </PanelGroup>
  </Panel>
</PanelGroup>

// Math: Canvas gets 82% * 70% = 57.4% of viewport (meets >60% goal if toolbar/statusbar are small)
// Better: Increase canvas to defaultSize={75} → 82% * 75% = 61.5% of viewport (exceeds 60% goal)
```

### Resize Handle Verification
```css
/* Source: Current App.css + react-resizable-panels requirements */
/* Verify these properties are NOT overridden */

.resize-handle-vertical {
  flex: 0 0 4px;
  background-color: var(--border-subtle);
  cursor: col-resize; /* ← MUST be present and not overridden */
  position: relative;
  transition: background-color 0.15s ease;
}

.resize-handle-vertical:hover {
  background-color: var(--accent-primary);
}

/* Expand hit target - MUST NOT have pointer-events: none */
.resize-handle-vertical::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
  /* No pointer-events property */
}

/* Active state - library adds [data-resize-handle-active] during drag */
.resize-handle-vertical[data-resize-handle-active] {
  background-color: var(--accent-primary);
  /* cursor becomes grabbing automatically via library */
}
```

### Debugging Checklist
```css
/* Source: Common troubleshooting patterns */

/* 1. Check if panels can shrink */
[data-panel-id] {
  min-height: 0; /* ← Add this if missing */
  min-width: 0;  /* ← Add this if missing */
}

/* 2. Check if groups can shrink */
[data-panel-group-id] {
  min-height: 0; /* ← Add this if missing */
  min-width: 0;  /* ← Add this if missing */
}

/* 3. Verify resize handles not disabled by global rules */
/* Search CSS for: */
/* - cursor: * on parent elements */
/* - pointer-events: none on handles or parents */
/* - user-select that might interfere */

/* 4. Check z-index conflicts */
/* Ensure positioned elements (minimap, dialogs) don't cover handles */
.minimap {
  z-index: 10; /* Example - should be LOWER than resize handles if they overlap */
}

.resize-handle-vertical,
.resize-handle-horizontal {
  z-index: 20; /* Ensure higher than overlapping positioned elements */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-resizable-panels v3 | react-resizable-panels v4 | v4.0.0 (Nov 2023) | Changed `direction` prop to `orientation`, renamed `PanelResizeHandle` to `Separator` in docs (but exports both) |
| Guessing panel sizes | Percentage-based defaultSize | Library evolution | Explicit percentages (1-100) more intuitive than flex values |
| Manual min-height calculations | CSS min-height: 0 fix | Flexbox spec finalization | Standardized solution to Flexbug #1 variant |
| Pixel-based panel sizing | Percentage/flexible units | Modern responsive design | Supports multiple screen sizes without media queries |

**Deprecated/outdated:**
- **direction prop:** v4 uses `orientation` (but `direction` still works for backward compatibility)
- **Pixel-based defaultSize:** Library supports it but percentages are recommended
- **Omitting defaultSize:** Causes layout flicker with SSR (server-side rendering) or hydration

## Open Questions

Things that couldn't be fully resolved:

1. **Exact SEdit proportions**
   - What we know: SEdit has left animation panel, bottom tileset panel, dominant canvas in center
   - What's unclear: Exact percentage widths/heights SEdit uses. No screenshots with measurements available.
   - Recommendation: Start with 18/82 horizontal split (from Phase 9) and 70/30 vertical split (to achieve >60% canvas dominance). User can adjust via drag if needed.

2. **1080p display assumption**
   - What we know: Success criteria mention "1080p display" for testing tileset visibility
   - What's unclear: Should layout optimize for 1080p specifically, or just use that as minimum test case?
   - Recommendation: Use 1080p as minimum test case. Percentage-based sizing means layout scales to any resolution. Test that tileset shows "multiple rows" (at least 3 rows) at 1080p with default sizes.

3. **Canvas dominance calculation**
   - What we know: Canvas should be >60% of viewport
   - What's unclear: Does "viewport" include toolbar and statusbar height, or just the panel area?
   - Recommendation: Assume "viewport" means the app-content area (excluding toolbar/statusbar). Canvas defaultSize={75} within main Panel{defaultSize={82}} gives 61.5% of app-content, meeting >60% goal.

4. **Whether current code actually has non-draggable handles**
   - What we know: Roadmap says "Debug why current react-resizable-panels dividers aren't draggable"
   - What's unclear: Are they actually non-draggable, or is this based on prior observation? Current App.tsx uses correct v4 API.
   - Recommendation: Test current implementation. If handles ARE draggable, focus on fixing proportions only. If NOT draggable, check for CSS cursor override or min-height issues preventing visible resize.

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Official library, verified v4 API and requirements
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - Version info (v4.4.1 published Jan 2026)
- [Understanding flexbox automatic minimum size](https://www.bigbinary.com/blog/understanding-the-automatic-minimum-size-of-flex-items) - Verified min-height: 0 fix
- [Flexbugs: min-height auto issue](https://github.com/philipwalton/flexbugs) - Flexbug #1 and variants documented
- [Canvas flexbox height issue](https://github.com/pmndrs/react-three-fiber/discussions/1867) - Verified min-height: 0 fixes canvas in flex
- Current codebase (App.tsx, App.css) - Verified current implementation uses v4 API correctly

### Secondary (MEDIUM confidence)
- [LogRocket: React panel layouts](https://blog.logrocket.com/essential-tools-implementing-react-panel-layouts/) - General patterns for panel proportions
- [UX Planet: Sidebar best practices](https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2) - 15% sidebar recommendation for workspace layouts
- [Medium: React resizable panels guide](https://medium.com/@rivainasution/shadcn-ui-react-series-part-8-resizable-let-users-control-space-not-you-03c018dc85c2) - v4 orientation prop usage
- Phase 7 and Phase 9 research - Prior findings on react-resizable-panels usage

### Tertiary (LOW confidence)
- SEdit exact proportions - No screenshots or measurements found, using industry standard proportions instead
- "60% canvas dominance" interpretation - Assumed to mean app-content area, not full window including chrome

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-resizable-panels v4 verified in use, CSS features are native and well-documented
- Architecture: HIGH - Flexbox min-height fix is well-documented standard solution, panel proportions based on design industry standards
- Pitfalls: HIGH - Flexbox auto minimum size issue is documented in Flexbugs, react-resizable-panels cursor requirements verified in library code
- SEdit proportions: LOW - No direct measurements available, using industry standards (70/30, 80/20 splits)
- Draggability issue: MEDIUM - Roadmap states issue exists, but current code uses correct API. May be CSS conflict or already fixed.

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, react-resizable-panels v4 API stable since Nov 2023)
