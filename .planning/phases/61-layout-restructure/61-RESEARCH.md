# Phase 61: Layout Restructure - Research

**Researched:** 2026-02-13
**Domain:** CSS layout (Flexbox/Grid) for fixed-width panel with flexible sibling
**Confidence:** HIGH

## Summary

This research investigates how to constrain the tile palette panel to a fixed 640px width while freeing horizontal space to its right for Phase 62 (ruler notepad panel). The current implementation uses `react-resizable-panels` v4.5.7 for vertical panel splits (canvas/tileset), and the tile palette stretches to fill the full bottom panel width via `flex: 1`.

The key challenge is transforming the bottom panel from a single full-width container to a horizontal split with:
1. Left section: Tile palette constrained to 640px (tileset width: 40 tiles × 16px)
2. Right section: Empty space (fills remaining width, collapses to zero at narrow widths)
3. Non-resizable divider (1px border only)
4. Unified vertical resize behavior (both sections resize together when bottom panel height changes)

**Primary recommendation:** Use CSS Flexbox with `flex: 0 0 640px` for tile palette and `flex: 1` for freed space. Wrap both in a horizontal flex container within the existing `Panel` component. This approach requires minimal changes and preserves all existing panel behaviors (collapse, resize, persistence).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Freed space and tile palette share the same bottom panel height** — unified resize
- **Freed space can collapse to zero width at narrow window sizes** (tile palette takes priority)
- **Bottom panel maintains its current height** (no shrinking to fit)
- **Fixed 640px tile palette width** (not dynamic based on loaded tileset)
- **640px is content area only** — borders/padding are additional
- **At window widths narrower than 640px**, palette stays 640px with horizontal scroll
- **Vertical scroll behavior within tile palette stays unchanged**
- **Subtle 1px border line between tile palette and freed space** (matching existing panel borders)
- **Divider is not resizable** — tile palette is always fixed at 640px
- **Existing panel headers and labels stay as-is**

### Claude's Discretion
- Freed space empty state appearance (before Phase 62 fills it)
- Whether tile palette and freed space are two distinct panels or one panel with internal split — pick what matches existing panel system
- CSS approach for the layout constraint

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Flexbox | Native | Fixed-width column with flexible sibling | Industry standard for one-dimensional layouts, native browser support, no dependencies |
| react-resizable-panels | ^4.5.7 | Vertical panel resize (canvas/tileset) | Already in use, no changes needed for this phase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS Grid | Native | Alternative two-column layout | Could use `grid-template-columns: 640px 1fr` but Flexbox is simpler for this use case |
| CSS overflow | Native | Horizontal scroll when window < 640px | Standard pattern for preserving fixed widths |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flexbox | CSS Grid | Grid is equally valid (`grid-template-columns: 640px 1fr`) but Flexbox is simpler for single-row layout |
| Single Panel with internal flex | Two separate Panels in PanelGroup horizontal | Two Panels would add unnecessary resizing complexity (user wants non-resizable divider) |
| Fixed width on TilePalette | Fixed width on parent container | Parent container approach is cleaner (keeps TilePalette component unchanged) |

**Installation:**
No new packages needed - all functionality exists in native CSS.

## Architecture Patterns

### Current Structure (Before Phase 61)
```tsx
// App.tsx - Bottom panel in vertical PanelGroup
<Panel id="tiles" defaultSize={25} minSize={10}>
  <TilesetPanel tilesetImage={tilesetImage} ... />
</Panel>
```

```tsx
// TilesetPanel.tsx - Full-width flex container
<div className="tileset-panel">  // display: flex; flex-direction: column;
  <div className="panel-title-bar">Tileset</div>
  <div className="tileset-panel-body">  // flex: 1;
    <TilePalette compact fullHeight ... />
  </div>
</div>
```

```tsx
// TilePalette.tsx - Stretches to fill parent
<div className="tile-palette">  // flex: 1; min-width: 660px;
  <canvas ref={canvasRef} />  // width = compact ? container.clientWidth : PALETTE_WIDTH + offsetX
</div>
```

### Recommended Structure (After Phase 61)
```tsx
// App.tsx - No changes needed (Panel stays vertical)
<Panel id="tiles" defaultSize={25} minSize={10}>
  <TilesetPanel tilesetImage={tilesetImage} ... />
</Panel>
```

```tsx
// TilesetPanel.tsx - NEW: Horizontal flex split
<div className="tileset-panel">
  <div className="panel-title-bar">Tileset</div>

  <div className="tileset-panel-body">  // NEW: display: flex; flex-direction: row;
    {/* Left: Fixed 640px tile palette */}
    <div className="tileset-palette-section">  // flex: 0 0 640px; overflow-x: auto;
      <TilePalette compact fullHeight ... />
    </div>

    {/* Right: Freed space for Phase 62 */}
    <div className="tileset-freed-section">  // flex: 1; min-width: 0; border-left: 1px;
      {/* Empty for now, Phase 62 will add ruler notepad here */}
    </div>
  </div>
</div>
```

### Pattern 1: Fixed-Width Flexbox Column
**What:** Use `flex: 0 0 640px` to create a fixed-width column that neither grows nor shrinks
**When to use:** When you need a column to maintain exact pixel width regardless of parent size
**Example:**
```css
/* Source: https://css-tricks.com/snippets/css/a-guide-to-flexbox/ */
.tileset-palette-section {
  flex: 0 0 640px;  /* flex-grow: 0, flex-shrink: 0, flex-basis: 640px */
  overflow-x: auto;  /* Horizontal scroll if parent < 640px */
  border-right: 1px solid var(--border-default);
}
```

**How it works:**
- `flex-grow: 0` — Does not expand to fill extra space
- `flex-shrink: 0` — Does not shrink below flex-basis
- `flex-basis: 640px` — Base width is exactly 640px

### Pattern 2: Flexible Sibling with min-width: 0
**What:** Use `flex: 1` with `min-width: 0` for the flexible column to fill remaining space
**When to use:** When you want a column to take all remaining space after fixed columns are allocated
**Example:**
```css
/* Source: https://css-tricks.com/snippets/css/a-guide-to-flexbox/ */
.tileset-freed-section {
  flex: 1;  /* Grows to fill remaining space */
  min-width: 0;  /* CRITICAL: Allows shrinking below content size */
  overflow: hidden;  /* Hide content that doesn't fit */
}
```

**Why `min-width: 0` is critical:**
- Flexbox items default to `min-width: auto` (size of content)
- Without `min-width: 0`, long content can prevent shrinking
- This allows the section to collapse to zero width at narrow window sizes
- Source: [MDN Flexbox Controlling Ratios](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis)

### Pattern 3: Horizontal Scroll for Narrow Windows
**What:** Use `overflow-x: auto` on fixed-width column to enable scrolling when parent is narrower than 640px
**When to use:** When fixed content must remain full-width even in small viewports
**Example:**
```css
.tileset-palette-section {
  flex: 0 0 640px;
  overflow-x: auto;  /* Show horizontal scrollbar if parent < 640px */
  overflow-y: hidden;  /* TilePalette has its own vertical scroll */
}
```

**Expected behavior:**
- Window width > 640px: No horizontal scroll, freed space visible
- Window width < 640px: Horizontal scroll appears, freed space collapses to zero

### Pattern 4: Unified Vertical Resize
**What:** Keep both sections inside the same `Panel` so vertical resize affects both equally
**When to use:** When horizontal siblings should always have the same height
**Example:**
```tsx
// Both sections are children of tileset-panel-body, which is inside Panel
<Panel id="tiles" defaultSize={25}>  {/* Vertical resize handle affects this Panel */}
  <TilesetPanel>
    <div className="tileset-panel-body">  {/* height: 100% minus title bar */}
      <div className="tileset-palette-section">...</div>  {/* height: 100% */}
      <div className="tileset-freed-section">...</div>  {/* height: 100% */}
    </div>
  </TilesetPanel>
</Panel>
```

**Why this works:**
- `react-resizable-panels` controls the height of the `Panel` component
- Both horizontal sections are flex children of `tileset-panel-body`
- Flexbox row layout gives both sections `height: 100%` by default (stretch alignment)

## CSS Grid Alternative (Considered but Not Recommended)

CSS Grid could achieve the same layout with `grid-template-columns: 640px 1fr`:

```css
.tileset-panel-body {
  display: grid;
  grid-template-columns: 640px 1fr;  /* Fixed 640px + flexible remainder */
  height: 100%;
}
```

**Tradeoffs:**
- **Pro:** Slightly more explicit about column widths
- **Con:** Requires learning Grid syntax (team is already using Flexbox extensively)
- **Con:** Grid is overkill for a simple two-column layout
- **Decision:** Stick with Flexbox for consistency with existing codebase

Source: [MDN grid-template-columns](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable horizontal divider | Custom drag handler with state | Keep it simple: non-resizable 1px border | User decision: divider is not resizable, always 640px |
| Window width detection | JavaScript listeners to toggle layout | CSS `overflow-x: auto` and `min-width: 0` | Native CSS handles narrow windows automatically |
| Separate Panel components | Two `<Panel>` in horizontal `<PanelGroup>` | Single Panel with internal flex split | Simpler, preserves vertical resize behavior |

**Key insight:** The user wants a fixed 640px width with no resizing. Custom JavaScript solutions add complexity without benefit. Native CSS Flexbox handles all requirements (fixed width, flexible sibling, horizontal scroll, unified resize).

## Common Pitfalls

### Pitfall 1: Forgetting min-width: 0 on Flexible Sibling
**What goes wrong:** Freed space section doesn't collapse to zero at narrow widths, causing horizontal scroll for entire bottom panel
**Why it happens:** Flexbox items default to `min-width: auto`, which prevents shrinking below content size
**How to avoid:** Always set `min-width: 0` on flex items that should shrink below content size
**Warning signs:** Horizontal scrollbar appears on entire app when window < 640px, freed space has minimum width even when empty

### Pitfall 2: Using flex: 1 on Fixed-Width Column
**What goes wrong:** Tile palette grows beyond 640px at wide window sizes
**Why it happens:** `flex: 1` means `flex-grow: 1`, allowing expansion
**How to avoid:** Use `flex: 0 0 640px` for truly fixed width (no grow, no shrink, exact 640px basis)
**Warning signs:** Tile palette wider than 640px, tiles appear stretched or extra whitespace visible

### Pitfall 3: Not Accounting for Borders/Padding in 640px
**What goes wrong:** Tile palette canvas is smaller than 640px because borders/padding are subtracted
**Why it happens:** User decision states "640px is content area only — borders/padding are additional"
**How to avoid:** Set `width: 640px` on the inner content (TilePalette), then add borders/padding to the outer wrapper
**Warning signs:** Canvas draws fewer than 40 tiles, horizontal scroll appears even when window > 640px

### Pitfall 4: Breaking TilePalette's Existing Scroll Behavior
**What goes wrong:** TilePalette's vertical scroll (for tile rows) stops working
**Why it happens:** Wrapper adds `overflow: hidden` which blocks TilePalette's internal scroll
**How to avoid:** Only set `overflow-x: auto` on wrapper, let `overflow-y` default to `visible` (TilePalette handles vertical scroll internally)
**Warning signs:** Can't scroll through tile rows, only 8-12 rows visible

### Pitfall 5: Changing TilePalette Component Unnecessarily
**What goes wrong:** TilePalette breaks in other uses (right sidebar TilesetPanel in older phases)
**Why it happens:** TilePalette is used in multiple contexts (bottom panel compact mode, right sidebar full mode)
**How to avoid:** Keep TilePalette unchanged, apply 640px constraint to parent wrapper only
**Warning signs:** TilesetPanel in right sidebar looks broken after changes

## Code Examples

Verified patterns from codebase analysis:

### Current TilesetPanel Structure (Before Changes)
```tsx
// Source: E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.tsx
export const TilesetPanel: React.FC<Props> = ({ tilesetImage, onTileHover, onChangeTileset }) => {
  return (
    <div className="tileset-panel">
      <div className="panel-title-bar tileset-title-bar">
        <span>Tileset</span>
        <button className="tileset-change-btn" onClick={onChangeTileset}>...</button>
      </div>
      <div className="tileset-panel-body">
        <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
      </div>
    </div>
  );
};
```

```css
/* Source: E:\NewMapEditor\src\components\TilesetPanel\TilesetPanel.css */
.tileset-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.tileset-panel-body {
  flex: 1;
  overflow-y: auto;
}
```

### Recommended Changes for Phase 61
```tsx
// TilesetPanel.tsx - Add horizontal split
export const TilesetPanel: React.FC<Props> = ({ tilesetImage, onTileHover, onChangeTileset }) => {
  return (
    <div className="tileset-panel">
      <div className="panel-title-bar tileset-title-bar">
        <span>Tileset</span>
        <button className="tileset-change-btn" onClick={onChangeTileset}>...</button>
      </div>
      <div className="tileset-panel-body">
        {/* Left: Fixed 640px tile palette */}
        <div className="tileset-palette-section">
          <TilePalette tilesetImage={tilesetImage} compact fullHeight onTileHover={onTileHover} />
        </div>

        {/* Right: Freed space (empty for now, Phase 62 will fill) */}
        <div className="tileset-freed-section">
          {/* Empty state: subtle background, no content */}
        </div>
      </div>
    </div>
  );
};
```

```css
/* TilesetPanel.css - Change to horizontal flex layout */
.tileset-panel-body {
  flex: 1;
  display: flex;              /* NEW: horizontal flex container */
  flex-direction: row;        /* NEW: left-to-right layout */
  overflow: hidden;           /* Change from overflow-y: auto */
}

.tileset-palette-section {
  flex: 0 0 640px;            /* NEW: fixed 640px, no grow/shrink */
  overflow-x: auto;           /* NEW: horizontal scroll if parent < 640px */
  overflow-y: hidden;         /* TilePalette handles vertical scroll internally */
  border-right: 1px solid var(--border-default);  /* NEW: separator */
}

.tileset-freed-section {
  flex: 1;                    /* NEW: fills remaining space */
  min-width: 0;               /* NEW: allows collapse to zero */
  background: var(--bg-secondary);  /* NEW: subtle empty state */
  overflow: hidden;           /* NEW: hide overflow */
}
```

### TilePalette Width Behavior (No Changes Needed)
```tsx
// Source: E:\NewMapEditor\src\components\TilePalette\TilePalette.tsx
const PALETTE_WIDTH = TILES_PER_ROW * TILE_SIZE; // 640px

// Resize canvas based on container
useEffect(() => {
  const container = containerRef.current;
  const canvas = canvasRef.current;
  if (!container || !canvas) return;

  const resizeObserver = new ResizeObserver(() => {
    const offsetX = showRowLabels ? ROW_LABEL_WIDTH : 0;
    // In compact mode (bottom panel), canvas width = container width (now constrained by parent)
    canvas.width = compact ? container.clientWidth : PALETTE_WIDTH + offsetX;
    canvas.height = fullHeight && tilesetImage ? tilesetImage.height : visibleRows * TILE_SIZE;
    draw();
  });

  resizeObserver.observe(container);
  // ...
}, [compact, showRowLabels, visibleRows, fullHeight, tilesetImage, draw]);
```

**Why TilePalette doesn't need changes:**
- `compact` mode already uses `container.clientWidth` for canvas width
- Parent wrapper constrains container to 640px via `flex: 0 0 640px`
- TilePalette's ResizeObserver automatically detects the constraint and sizes canvas accordingly
- No props or logic changes needed

## Empty State Appearance (Claude's Discretion)

Since Phase 62 will fill the freed space with a ruler notepad panel, the empty state only needs to be:
1. **Visually subtle** — Don't distract from tile palette
2. **Clearly empty** — User should understand it's reserved space
3. **Match existing design** — Use semantic color tokens

**Recommended approach:**
```css
.tileset-freed-section {
  background: var(--bg-secondary);  /* Slightly different from tile palette */
  /* No placeholder text or graphics needed — Phase 62 is immediate next step */
}
```

**Alternative (if Phase 62 is delayed):**
```tsx
<div className="tileset-freed-section">
  <div className="freed-space-placeholder">
    <span className="placeholder-text">Reserved for ruler notepad</span>
  </div>
</div>
```

```css
.freed-space-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  font-style: italic;
}
```

**Decision:** Use simple background color only. Phase 62 is next, no need for elaborate placeholder.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `flex: 1` on all flex items | `flex: 0 0 <width>px` for fixed columns | Always standard | Fixed-width columns are explicit |
| `min-width: auto` (default) | `min-width: 0` for shrinkable items | CSS Flexbox best practice (2016+) | Prevents unexpected scrollbars |
| JavaScript window resize listeners | CSS `overflow: auto` and media queries | Modern CSS (2018+) | Simpler, more performant |
| Separate resizable panels | Non-resizable internal sections | User decision (Phase 61) | Simpler UX for fixed-width requirements |

**Deprecated/outdated:**
- **Manual width calculation in JavaScript:** CSS Flexbox handles this automatically
- **`-webkit-box` flexbox syntax:** Use modern `display: flex` (2016+ standard)
- **Percentage-based flex-basis for fixed widths:** Use exact pixel values when width must not change

## Open Questions

None. All requirements are clear and implementation is straightforward with standard CSS Flexbox patterns.

## Sources

### Primary (HIGH confidence)
- [CSS-Tricks: A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) - Comprehensive flexbox reference
- [MDN: Controlling Ratios of Flex Items](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis) - min-width: 0 pattern
- [MDN: grid-template-columns](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns) - Grid alternative reference
- [W3Docs: How to Add a Fixed Width Column with CSS Flexbox](https://www.w3docs.com/snippets/css/how-to-add-a-fixed-width-column-with-css-flexbox.html) - Fixed width patterns
- [Every Layout: The Sidebar](https://every-layout.dev/layouts/sidebar/) - Sidebar layout pattern
- Codebase analysis: E:\NewMapEditor\src\components\TilesetPanel\* (current implementation)
- Codebase analysis: E:\NewMapEditor\src\components\TilePalette\TilePalette.tsx (PALETTE_WIDTH constant)

### Secondary (MEDIUM confidence)
- [GeeksforGeeks: How to Set a Fixed Width Column with CSS Flexbox](https://www.geeksforgeeks.org/css/how-to-set-a-fixed-width-column-with-css-flexbox/) - Additional examples
- [TheLinuxCode: Fixed-Width Column with Flexbox](https://thelinuxcode.com/how-to-set-a-fixed-width-column-with-css-flexbox-without-surprises/) - Practical guide

### Tertiary (LOW confidence)
None - all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native CSS Flexbox is industry standard, no dependencies
- Architecture: HIGH - Patterns verified in existing codebase (TilePalette, TilesetPanel)
- Pitfalls: HIGH - Common flexbox issues are well-documented in MDN and CSS-Tricks
- Implementation: HIGH - All requirements map to standard CSS patterns

**Research date:** 2026-02-13
**Valid until:** 60 days (stable CSS features, no framework dependencies)
