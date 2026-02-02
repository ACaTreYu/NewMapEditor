# Domain Pitfalls: v1.1 Canvas & Polish

**Domain:** Custom scrollbars, collapsible panels, CSS variable migration, tooltip accessibility
**Researched:** 2026-02-02
**Confidence:** MEDIUM-HIGH (Context7 + official docs + GitHub issues)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Custom Scrollbar Track Click Does Page Jump Instead of Position Jump

**What goes wrong:** Clicking on the scrollbar track causes the viewport to page-scroll (jump by viewport-sized increment) instead of jumping directly to the clicked position. This differs from native scrollbar behavior in most modern applications.

**Why it happens:** The current `MapCanvas.tsx` implementation (lines 467-475, 477-497) handles thumb dragging but has no track click handler. When users click the track expecting to jump to that scroll position, nothing happens or they must click the thumb first.

**Consequences:**
- Users can't quickly navigate to specific map positions
- Requires multiple clicks/drags to reach distant areas
- Inconsistent with modern app UX expectations (VS Code, Figma, etc.)

**Prevention:**
- Add `onClick` handler to scroll track elements (`.scroll-track-h`, `.scroll-track-v`)
- Calculate click position relative to track: `const clickPercent = (e.clientX - trackRect.left) / trackRect.width`
- Set viewport directly: `setViewport({ x: clickPercent * MAP_WIDTH })`
- Distinguish track clicks from thumb clicks using `e.target` comparison

**Detection:**
- Click on the empty track area (not the thumb)
- Check if viewport jumps to corresponding position
- Compare behavior to VS Code or Chrome scrollbars

**Phase mapping:** Scrollbar enhancement phase

**Sources:**
- [Creating Custom Scrollbars with React](https://www.thisdot.co/blog/creating-custom-scrollbars-with-react) - "Clicking anywhere on the track repositions the thumb"
- [Implementing a scrollbar for React Flow](https://medium.com/@christian_maehler/implementing-a-scrollbar-for-react-flow-29653c2562fd) - Track click implementation pattern

---

### Pitfall 2: Collapsible Panel Drag-to-Expand "Dead Zone" Confusion

**What goes wrong:** When a panel is collapsed, dragging the resize handle to expand it appears unresponsive. The handle doesn't move visually until the panel reaches minimum size, then suddenly jumps to cursor position.

**Why it happens:** This is intentional behavior in react-resizable-panels matching VS Code's UX. The handle can't move while the panel is collapsed without appearing "detached" from the panel edge.

**Consequences:**
- Users think the panel is stuck or broken
- Repeated frustrated drag attempts
- Support requests about "broken resize"

**Prevention:**
- Do NOT rely on drag-to-expand as primary expand mechanism
- Implement click-to-expand button/icon (like VS Code's Explorer icon)
- Add visual indicator showing panel is collapsed (chevron, icon, etc.)
- Use imperative API (`panelRef.current.expand()`) for explicit expand action

**Detection:**
- Collapse a panel by dragging past minSize
- Try to expand by dragging the resize handle
- Observe the "dead zone" where dragging appears non-responsive

**Phase mapping:** Collapsible panel implementation

**Sources:**
- [react-resizable-panels Discussion #269](https://github.com/bvaughn/react-resizable-panels/discussions/269) - Maintainer confirms behavior is intentional, recommends click-to-expand
- [GitHub bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) - Imperative Panel API documentation

---

### Pitfall 3: localStorage Layout Restoration Conflicts with defaultSize

**What goes wrong:** After a page refresh, panel drag direction becomes reversed (dragging left expands right panel), or panels restore to wrong sizes and behave erratically.

**Why it happens:** The `autoSaveId` feature in react-resizable-panels stores layout percentages in localStorage. When these conflict with `defaultSize` props (especially during conditional rendering or layout changes), internal state becomes inconsistent.

**Consequences:**
- Panel sizes jump unexpectedly on load
- Resize handle moves opposite to drag direction
- Layout state corrupts and requires localStorage clear

**Prevention:**
- Choose ONE layout persistence approach: either `autoSaveId` OR manual localStorage
- If using `autoSaveId`, don't provide `defaultSize` props
- If using `defaultSize`, manage persistence manually via `onLayoutChanged` callback
- Current implementation (App.tsx lines 20-31, 36-38) uses manual approach correctly - maintain this pattern
- Version your localStorage key (current: `editor-panel-sizes-v2`) when layout structure changes

**Detection:**
- Resize panels to specific configuration
- Refresh page
- If layout restores correctly, persistence is working
- If panels jump or behave wrong, there's a conflict

**Phase mapping:** Any phase adding new panels or changing panel structure

**Sources:**
- [react-resizable-panels CHANGELOG](https://github.com/bvaughn/react-resizable-panels/blob/main/CHANGELOG.md) - "Changed the local storage key for persisted sizes to avoid restoring pixel-based sizes"
- [Apache Airflow Fix](https://www.mail-archive.com/commits@airflow.apache.org/msg424494.html) - "autoSaveId has been replaced with manual sessionStorage management"

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 4: CSS Variable Name Collision During Theme Migration

**What goes wrong:** New CSS variables shadow or conflict with existing variables, causing colors to be wrong in specific components or theme modes.

**Why it happens:** The current `App.css` (lines 1-35) defines variables like `--bg-primary`, `--bg-secondary` at `:root` level. Adding new variables with similar names or overriding in component CSS creates specificity battles.

**Consequences:**
- Dark mode shows light colors or vice versa
- Specific components look wrong while others are correct
- Hard to debug due to CSS cascade complexity

**Prevention:**
- Audit all existing CSS variable usages before adding new ones
- Use consistent naming: `--{component}-{property}` for component-specific, `--{semantic}` for global
- Current convention (`--bg-primary`, `--text-primary`, `--border-color`) should be maintained
- Document which components override global variables
- Test BOTH light and dark modes after any CSS variable change

**Detection:**
- Toggle between light/dark mode after CSS changes
- Check all panels in both modes
- Look for hardcoded hex values that should be variables

**Phase mapping:** CSS variable consolidation phase

**Sources:**
- [CSS-Tricks Dark Mode Guide](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) - Naming and specificity strategies
- [Medium - Dark Mode with CSS light-dark()](https://medium.com/front-end-weekly/forget-javascript-achieve-dark-mode-effortlessly-with-brand-new-css-function-light-dark-2024-94981c61756b) - Modern CSS theming approaches

---

### Pitfall 5: Radix Tooltip Disappears When Hovering Tooltip Content (WCAG Violation)

**What goes wrong:** Tooltip content disappears when users move their cursor from the trigger to the tooltip content itself, preventing them from reading or interacting with tooltip content.

**Why it happens:** Radix UI Tooltip triggers `onMouseLeave` when cursor exits trigger element, even when moving toward the tooltip content. This violates WCAG 2.1 Success Criterion 1.4.13 (Content on Hover or Focus).

**Consequences:**
- Users with motor impairments can't read tooltips
- Long tooltip content can't be fully read
- Accessibility audit failures
- Violates WCAG 2.1 AA compliance

**Prevention:**
- Use `delayDuration` prop to give users time to move to content
- Consider wrapping keyboard shortcuts in `<kbd>` elements instead of tooltips
- For critical information, use non-tooltip UI (inline text, help icons with popovers)
- Test tooltip accessibility with keyboard navigation

**Detection:**
- Hover over a toolbar button with a tooltip
- Try to move cursor to the tooltip content
- If tooltip disappears immediately, the issue is present

**Phase mapping:** Tooltip keyboard shortcut display phase

**Sources:**
- [Radix UI Tooltip Issue #620](https://github.com/radix-ui/primitives/issues/620) - WCAG 2.1 AA Hover Content Disappearing
- [Radix Primitives Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) - WCAG compliance documentation

---

### Pitfall 6: Collapsed Panel Size Not Remembered After Expand

**What goes wrong:** When expanding a collapsed panel, it returns to `minSize` instead of the size it was before collapsing.

**Why it happens:** The react-resizable-panels library only remembers pre-collapse size when using the explicit `collapse()` imperative API. Dragging past minSize to collapse bypasses the size memory mechanism.

**Consequences:**
- Users must re-resize panels after every expand
- Frustrating workflow interruption
- Panel layout customization feels "lost"

**Prevention:**
- Use imperative API for collapse/expand: `panelRef.current.collapse()` and `panelRef.current.expand()`
- Store pre-collapse size manually in component state before collapsing
- Use `onCollapse` and `onExpand` callbacks to track state
- Consider storing expanded sizes per-panel in localStorage

**Detection:**
- Resize panel to specific size (e.g., 30%)
- Collapse the panel (drag past minSize OR click collapse button)
- Expand the panel
- If it returns to minSize (10%) instead of 30%, size memory isn't working

**Phase mapping:** Collapsible panel implementation

**Sources:**
- [react-resizable-panels Issue #220](https://github.com/bvaughn/react-resizable-panels/issues/220) - Collapsed panel behavior regression
- [react-resizable-panels Discussion #316](https://github.com/bvaughn/react-resizable-panels/discussions/316) - Starting panel as collapsed

---

### Pitfall 7: Scrollbar Thumb Size Doesn't Update on Zoom

**What goes wrong:** Custom scrollbar thumb size remains constant regardless of zoom level, even though the visible area changes. At high zoom, thumb should be smaller (less visible content); at low zoom, thumb should be larger.

**Why it happens:** The current `getScrollMetrics` calculation (MapCanvas.tsx lines 291-305) correctly calculates thumb size based on visible tiles, but if this isn't recalculated on zoom change, the thumb becomes inaccurate.

**Consequences:**
- Visual mismatch between thumb size and actual scroll range
- Users can't accurately gauge their position in the map
- Confusion about how much content is visible

**Prevention:**
- Ensure `getScrollMetrics` is called whenever `viewport.zoom` changes
- Current implementation uses `useCallback` with `[viewport]` dependency - verify this includes zoom
- Test scrollbar thumb size at zoom 0.25x, 1x, and 4x

**Detection:**
- Set zoom to 1x, note scrollbar thumb size
- Zoom out to 0.25x
- Thumb should be significantly larger (more of map visible)
- If thumb size unchanged, zoom dependency is missing

**Phase mapping:** Scrollbar enhancement phase

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Scrollbar Visible During Pan Operation Creates Visual Noise

**What goes wrong:** When panning the map via right-click drag or middle-click drag, the scrollbar thumbs animate smoothly but create visual distraction from the main canvas content.

**Why it happens:** Scrollbars update position on every mouse move event during pan, causing continuous repaints.

**Prevention:**
- Consider hiding scrollbars during active pan (set opacity to 0.3 or hide)
- Or throttle scrollbar position updates during pan (every 50ms instead of every frame)
- Use CSS `transition` on thumb position for smoother movement

**Detection:**
- Pan the map rapidly
- Watch scrollbar thumbs
- If movement feels choppy or distracting, throttling may help

**Phase mapping:** Scrollbar polish phase (lower priority)

---

### Pitfall 9: Keyboard Shortcut Text in Tooltip Doesn't Match Platform

**What goes wrong:** Tooltip shows "Ctrl+S" on macOS where users expect "Cmd+S", or shows raw keyboard key names instead of symbols.

**Why it happens:** Hardcoded keyboard shortcut strings without platform detection.

**Consequences:**
- Mac users confused by "Ctrl" references
- Inconsistent with native application conventions
- Minor but noticeable polish issue

**Prevention:**
- Detect platform: `navigator.platform.includes('Mac')`
- Use symbols on Mac: Cmd (), Opt (), Shift ()
- Use words on Windows/Linux: Ctrl, Alt, Shift
- Create utility function: `formatShortcut('ctrl+s')` returns platform-appropriate string

**Detection:**
- Test on macOS
- Check if tooltips show "Ctrl" or "Cmd"

**Phase mapping:** Tooltip enhancement phase

---

### Pitfall 10: Collapsible Panel Toggle Button State Out of Sync

**What goes wrong:** A toggle button shows panel as expanded when it's actually collapsed (or vice versa), especially after imperative API calls or drag-to-collapse.

**Why it happens:** Button state managed separately from panel state. When panel collapses via drag (not button click), button doesn't update.

**Prevention:**
- Use `isCollapsed()` from panel ref as source of truth
- Subscribe to `onCollapse` and `onExpand` callbacks
- Never store separate "isCollapsed" state - derive from panel ref
- Re-render button when panel state changes

**Detection:**
- Click toggle button to expand panel
- Drag panel to collapse it
- Check if toggle button still shows "expanded" state

**Phase mapping:** Collapsible panel implementation

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Scrollbar track click | Thumb vs track click detection | Use `e.target` comparison, not position math |
| Collapsible panels | Dead zone confusion | Add explicit expand button, don't rely on drag |
| Collapsible panels | Size memory loss | Use imperative API, not drag-to-collapse |
| CSS variables | Theme mode conflicts | Test both light AND dark modes after every change |
| Tooltips | WCAG hover violation | Add delay, consider inline kbd elements |
| localStorage | Layout restoration bugs | Version your storage keys, pick ONE persistence method |
| Keyboard shortcuts | Platform mismatch | Detect platform, use appropriate symbols |

---

## Implementation Checklist

### Before Scrollbar Enhancements
- [ ] Map current scrollbar event handlers (MapCanvas.tsx lines 467-509)
- [ ] Plan track click vs thumb drag distinction
- [ ] Decide: page-jump or position-jump on track click
- [ ] Test scrollbar behavior at multiple zoom levels

### Before Collapsible Panels
- [ ] Review react-resizable-panels imperative API
- [ ] Design collapse/expand button UI
- [ ] Plan size memory strategy (imperative API vs manual)
- [ ] Decide which panels get collapse capability

### Before CSS Variable Migration
- [ ] Audit all existing CSS variables in App.css
- [ ] List all hardcoded colors in component CSS files
- [ ] Create before/after test checklist for light and dark modes
- [ ] Document any component-specific variable overrides

### Before Tooltip Enhancements
- [ ] Audit current tooltip usage (ToolBar.tsx uses native `title`)
- [ ] Decide: Radix Tooltip vs native title for keyboard shortcuts
- [ ] Plan keyboard shortcut formatting utility
- [ ] Test accessibility with keyboard navigation

---

## Electron-Specific Considerations

### Scrollbar Rendering Quirks

Electron (Chromium-based) has known issues with custom scrollbar rendering:
- [Electron Issue #38543](https://github.com/electron/electron/issues/38543) - Unexpected scrollbar rendering
- [Electron Issue #4294](https://github.com/electron/electron/issues/4294) - Empty gaps with custom scrollbars

**Mitigation:**
- Test scrollbar appearance in packaged Electron build, not just dev mode
- Use `-webkit-scrollbar` pseudo-elements cautiously
- Prefer JavaScript-controlled custom scrollbars (current approach) over CSS-only

### Window Resize and Viewport Sync

Electron window resize can cause scrollbar calculation drift:
- Scrollbar track size changes during resize
- If calculations use stale dimensions, thumbs appear wrong

**Mitigation:**
- Recalculate scrollbar metrics on window resize (ResizeObserver handles this)
- Don't cache track dimensions - recalculate each render
- Current `getScrollMetrics` is a `useCallback` - ensure deps are correct

---

## Sources

### Authoritative (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Official API documentation
- [Radix Primitives Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) - WCAG compliance docs
- [Chrome Developer Docs - Scrollbar Styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling) - Chromium scrollbar CSS

### GitHub Issues (MEDIUM-HIGH confidence)
- [react-resizable-panels Issue #220](https://github.com/bvaughn/react-resizable-panels/issues/220) - Collapsed panel regression
- [react-resizable-panels Discussion #269](https://github.com/bvaughn/react-resizable-panels/discussions/269) - Drag-to-expand behavior
- [Radix Primitives Issue #620](https://github.com/radix-ui/primitives/issues/620) - WCAG tooltip violation

### Community Verified (MEDIUM confidence)
- [Creating Custom Scrollbars with React](https://www.thisdot.co/blog/creating-custom-scrollbars-with-react) - Track click implementation
- [CSS-Tricks Dark Mode Guide](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) - Theme variable strategies
- [Electron Tech Talk - Window Resize](https://www.electronjs.org/blog/tech-talk-window-resize-behavior) - Resize behavior details

### Codebase Analysis (HIGH confidence for this project)
- `E:\NewMapEditor\src\App.tsx` - Panel layout with manual localStorage persistence
- `E:\NewMapEditor\src\App.css` - CSS variable definitions
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` - Custom scrollbar implementation
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css` - Scrollbar styling
- `E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx` - Keyboard shortcut handling
