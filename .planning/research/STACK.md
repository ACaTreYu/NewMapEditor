# Technology Stack: v1.1 Canvas & Polish

**Project:** AC Map Editor - Canvas Optimization and Navigation Improvements
**Researched:** 2026-02-02
**Focus:** Classic scrollbars with arrow buttons, collapsible/minimizable panels

## Executive Summary

The v1.1 features require **minimal stack additions**. The existing custom scrollbar implementation in MapCanvas.tsx is a solid foundation - adding arrow buttons is pure CSS/React extension work, not a library problem. For collapsible panels, Radix UI Collapsible (already researched for v1.0 but not installed) is the recommended approach.

**Recommendation:** Extend existing custom scrollbar implementation + add @radix-ui/react-collapsible for panel collapse. No scrollbar library needed.

## Recommended Stack Additions

### Collapsible Panels

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @radix-ui/react-collapsible | ^1.1.12 | Panel collapse/expand | Headless primitive with animation support. 4.82 kB gzipped. Accessibility built-in (WAI-ARIA Disclosure pattern). Matches existing unstyled approach. |

**Installation:**
```bash
npm install @radix-ui/react-collapsible
```

**Rationale:**
1. **Headless/unstyled** - Full control over appearance, matches project philosophy
2. **Small bundle** - 4.82 kB gzipped, minimal overhead
3. **Accessibility** - Keyboard navigation, ARIA states built-in
4. **Animation-ready** - Works with CSS transitions via `data-state` attribute
5. **Ecosystem consistency** - Radix was recommended for v1.0 (Tabs, Toolbar) but not used; this is a good entry point

### Classic Scrollbars with Arrow Buttons

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **No library needed** | N/A | Windows-style scrollbars | Extend existing MapCanvas custom scrollbar implementation. Arrow buttons are React components + CSS, not a library concern. |

**Rationale for NOT using a scrollbar library:**

1. **Existing implementation is solid** - MapCanvas.tsx already has:
   - Custom thumb elements with CSS styling
   - Drag handling with global mouse listeners
   - Viewport synchronization via Zustand
   - Percentage-based thumb positioning

2. **Library limitations:**
   - react-scrollbars-custom: Maintenance warning ("Maintainers Wanted!"), 3 years since last publish
   - react-custom-scroll: No arrow button support documented
   - SimpleBar: No arrow button support

3. **Arrow buttons are simple:**
   - Two button elements per scrollbar track
   - onClick handlers that adjust viewport by small increment
   - CSS styling for Windows-classic look (3D beveled appearance)
   - Repeat behavior on mousedown (interval-based scrolling)

4. **CSS ::-webkit-scrollbar-button is NOT an option:**
   - Only works on actual overflow-scrolling elements
   - MapCanvas uses virtual scrolling (canvas rendering, not DOM overflow)
   - Would require complete architecture change

## What NOT to Add

| Technology | Why Avoid |
|------------|-----------|
| react-scrollbars-custom | Maintenance warning, seeking maintainers. Last publish 3 years ago. Overkill for extending existing implementation. |
| SimpleBar | No arrow button support. Designed for replacing native scrollbars, not virtual scroll viewports. |
| react-custom-scroll | Basic feature set, no arrow buttons. Smaller community. |
| CSS ::-webkit-scrollbar-button | Only works with DOM overflow scrolling. MapCanvas uses canvas-based virtual scrolling - completely different paradigm. |
| Full scrollbar library migration | Existing implementation works well. Adding arrow buttons doesn't justify replacing it. |

## Integration with Existing Stack

### Scrollbar Arrow Buttons (Pure Extension)

The existing scrollbar implementation in MapCanvas.tsx:

```typescript
// Current: thumb-only scrollbars
<div className="scroll-track-h">
  <div className="scroll-thumb-h" ... />
</div>
```

Extended pattern:

```typescript
// New: track with arrow buttons
<div className="scroll-track-h">
  <button className="scroll-arrow left" onClick={() => scrollBy(-SCROLL_STEP)} />
  <div className="scroll-thumb-h" ... />
  <button className="scroll-arrow right" onClick={() => scrollBy(SCROLL_STEP)} />
</div>
```

**Implementation details:**
- Arrow buttons fire `setViewport()` with incremental changes
- Repeat scrolling on mousedown via `setInterval`
- Stop on mouseup/mouseleave
- CSS uses border-based triangles or SVG arrows
- 3D bevel effect via box-shadow/inset borders for Windows-classic look

### Collapsible Panels with Radix

Pattern for RightSidebar sections:

```typescript
import * as Collapsible from '@radix-ui/react-collapsible';

<Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
  <div className="sidebar-section-header">
    <span>Animation Preview</span>
    <Collapsible.Trigger asChild>
      <button className="collapse-toggle">
        {isOpen ? <ChevronDown /> : <ChevronRight />}
      </button>
    </Collapsible.Trigger>
  </div>
  <Collapsible.Content className="sidebar-section-content">
    <AnimationPreview tilesetImage={tilesetImage} />
  </Collapsible.Content>
</Collapsible.Root>
```

**State persistence:**
- Use Zustand persist middleware for collapsed state
- Key: `editor-panel-collapsed-state`
- Value: `{ animation: boolean, tiles: boolean, settings: boolean }`

### CSS Variable Tooling

**No library needed.** CSS custom properties are native and the project already uses them in App.css.

For better organization (optional):
- Group related variables with naming convention: `--scrollbar-*`, `--panel-*`
- Consider a `variables.css` file imported in App.css if the list grows

## Confidence Levels

| Technology | Confidence | Verification |
|------------|------------|--------------|
| @radix-ui/react-collapsible ^1.1.12 | HIGH | npm registry, official Radix docs, 1992 dependent projects |
| Custom scrollbar extension (no library) | HIGH | Existing implementation analysis, DOM/React patterns |
| CSS custom properties (native) | HIGH | MDN, browser support tables |

## Installation Summary

```bash
# Only one new dependency needed
npm install @radix-ui/react-collapsible
```

**Total new dependencies:** 1 package (4.82 kB gzipped)

## Sources

### Verified (HIGH confidence)
- [Radix UI Collapsible Documentation](https://www.radix-ui.com/primitives/docs/components/collapsible) - Official docs, version 1.1.12
- [MDN ::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar) - Browser support and pseudo-element reference
- MapCanvas.tsx (local) - Existing scrollbar implementation analysis

### Evaluated (alternatives rejected)
- [react-scrollbars-custom GitHub](https://github.com/xobotyi/react-scrollbars-custom) - Maintenance warning noted
- [SimpleBar](https://grsmto.github.io/simplebar/) - No arrow button support
- [react-custom-scroll npm](https://www.npmjs.com/package/react-custom-scroll) - Basic features only

### Background research
- [This Dot Labs - Custom Scrollbars with React](https://www.thisdot.co/blog/creating-custom-scrollbars-with-react)
- [Orangeable - Styling Scrollbars with CSS](https://orangeable.com/css/scrollbars)
- [npm-compare: scrollbar libraries](https://npm-compare.com/react-custom-scrollbars,react-scrollbars-custom)
