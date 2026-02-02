# Feature Landscape: v1.1 Canvas & Polish

**Domain:** Map editor canvas optimization and navigation (SEdit-style interface)
**Researched:** 2026-02-02
**Confidence:** MEDIUM-HIGH (existing patterns in v1.0 verified, new features researched against established UI patterns)

## Milestone Context

This research focuses specifically on v1.1 features for maximizing canvas space with better navigation. The editor already has:
- Resizable right sidebar panel (react-resizable-panels v4.5.7)
- Custom CSS scrollbars (WebKit-style, no arrow buttons)
- Keyboard shortcuts implemented but NOT shown in tooltips
- CSS variables partially implemented (4 files still hardcoded)
- Panel size persistence via localStorage

---

## Table Stakes

Features users expect for these specific v1.1 capabilities. Missing = incomplete implementation.

### Classic Scrollbars with Arrow Buttons

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Arrow buttons at track ends** | SEdit-style requires visible up/down/left/right buttons; matches Windows 95/98 aesthetic users expect | Medium | Use `::-webkit-scrollbar-button` pseudo-elements |
| **Click-to-scroll behavior** | Arrow buttons scroll by one "line" (16px = one tile) per click | Low | Standard scrollbar behavior |
| **Click-and-hold repeat** | Holding arrow button continues scrolling | Low | Native browser behavior when button enabled |
| **Visual button feedback** | Pressed state when arrow clicked | Low | CSS `:active` pseudo-class |
| **Hover state on arrows** | Indicate interactive element | Low | CSS `:hover` pseudo-class |
| **Track click scrolls by page** | Clicking track area (not thumb) scrolls by one page | Low | Native scrollbar behavior |
| **Thumb drag** | Already implemented | N/A | Existing functionality |

**Expected Visual Style (SEdit/Win95-like):**
- Button background: `#c3c7cb` (classic Windows gray)
- Button border: 3D beveled effect (highlight on top/left, shadow on bottom/right)
- Arrow color: Dark gray (`#555555`) or black
- Track background: Darker than buttons (`#888888` or similar)
- Thumb: 3D raised appearance

**Implementation Note:** The project already has custom scrollbars in MapCanvas.css (lines 17-68) using hardcoded colors. These use modern rounded thumb style without arrow buttons. Need to add arrow buttons via `::-webkit-scrollbar-button` pseudo-elements.

### Collapsible/Minimizable Panels

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Minimize toggle** | User should be able to collapse panel to maximize canvas | Low | react-resizable-panels has `collapsible` prop |
| **Visible minimize control** | Button or double-click affordance to trigger collapse | Low | Chevron icon or minimize button |
| **Expand from collapsed state** | Must be able to restore panel after collapsing | Low | Same control toggles state |
| **Collapsed size > 0** | Show tab bar even when collapsed (not fully hidden) | Low | Use `collapsedSize` prop (e.g., 32px for tab bar only) |
| **Smooth collapse animation** | Transition should be perceptible but quick | Low | CSS transition 150-300ms |
| **State persistence** | Remember collapsed state between sessions | Low | Already storing panel sizes in localStorage |

**Expected Behavior:**
1. Panel has minimize button (chevron down) or double-click divider behavior
2. When minimized: Panel collapses to show only tab bar headers
3. Tab bar remains visible and clickable
4. Clicking a tab or expand button restores panel to previous size
5. Collapsed state persisted in localStorage

**Implementation Note:** react-resizable-panels supports this via:
- `collapsible={true}` on Panel
- `collapsedSize={number}` for minimum collapsed size
- Imperative API: `collapse()`, `expand()`, `isCollapsed()`

### Keyboard Shortcuts in Tooltips

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Shortcut visible in tooltip text** | Standard in Photoshop, VS Code, Google Docs | Low | Already have tooltips, just add shortcut text |
| **Format: "Tool Name (Shortcut)"** | Industry standard format | Low | E.g., "Pencil (B)", "Save (Ctrl+S)" |
| **OS-appropriate modifier keys** | Show Cmd on Mac, Ctrl on Windows | Low | Check `navigator.platform` or `navigator.userAgentData` |
| **Consistent tooltip delay** | 300-500ms hover before showing | Low | May already be implemented via `title` attribute |
| **Tooltip on focus** | Accessibility: keyboard users need shortcuts too | Medium | Requires custom tooltip component if using `title` |

**Current Implementation Analysis:**
The ToolBar.tsx (lines 97-166) already shows shortcuts in the `title` attribute:
```tsx
title="New Map (Ctrl+N)"
title={`${tool.label} (${tool.shortcut})`}
```
This is already correct. However, using native `title` attributes has limitations:
- No focus trigger (keyboard users can't see them)
- No hover delay control (browser-dependent)
- Basic styling only

**Recommendation:** Current `title` attribute approach is acceptable for v1.1. Custom tooltip component is a differentiator, not table stakes.

### Double-Click Divider to Reset Panel Size

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Double-click triggers reset** | Standard in VS Code, many IDEs | Low | Add onDoubleClick handler to resize handle |
| **Reset to default size** | Return to initial panel proportions (75/25 currently) | Low | Store default in constant, apply via imperative API |
| **Visual feedback** | Cursor change or subtle animation on reset | Low | Optional polish |

**Expected Behavior:**
1. User double-clicks the vertical resize handle between main area and sidebar
2. Panel sizes reset to default (currently 75% main, 25% sidebar)
3. If panel was collapsed, expand to default size

**Implementation Note:** react-resizable-panels `PanelResizeHandle` (aliased as `Separator` in imports) can accept an `onDoubleClick` handler via wrapper or direct prop. Use the imperative Panel API `resize(size)` to reset sizes.

---

## Differentiators

Nice polish beyond minimum requirements.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Animated arrow buttons on hover** | Extra visual feedback, classic feel | Low | Slight color shift on hover |
| **3D beveled scrollbar buttons** | Authentic Win95/SEdit appearance | Medium | CSS border tricks or SVG |
| **Custom tooltip component** | Focus-triggered, styled, accessible | Medium | Beyond `title` attribute |
| **Keyboard collapse toggle** | Power user shortcut to collapse panel | Low | E.g., Ctrl+\ or F8 |
| **Collapse animation easing** | Smooth spring or ease-out-cubic | Low | CSS transition timing function |
| **Reset animation** | Brief transition when double-click resets | Low | 150ms transition on resize |
| **Corner resize square** | Classic scrollbar corner element (where H and V scrollbars meet) | Low | `::-webkit-scrollbar-corner` pseudo-element |
| **Scrollbar button images** | SVG arrows instead of CSS border triangles | Medium | More authentic look |

---

## Anti-Features

Things to deliberately NOT build for v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Fully hidden collapsed panel** | Users lose context, can't see tabs | Keep tab bar visible (collapsedSize > 0) |
| **Auto-collapse on window resize** | Unexpected behavior, loses user intent | Only collapse via explicit user action |
| **Multiple collapse levels** | Complexity without benefit | Single collapsed state sufficient |
| **Floating/detached panels** | Out of scope, SEdit didn't have this | Fixed docked panels only |
| **Modern flat scrollbars** | Contradicts SEdit-style requirement | Classic 3D beveled appearance |
| **Scrollbar hide on inactive** | Mac-like behavior, doesn't match SEdit | Always visible scrollbars |
| **Tooltip on click instead of hover** | Non-standard, confusing | Standard hover tooltip behavior |
| **Shortcut customization** | High complexity, beyond v1.1 scope | Fixed shortcuts only |

---

## Feature Dependencies

```
v1.1 Features (building on v1.0)
├── Classic Scrollbars
│   ├── MapCanvas.css migration to CSS variables (dependency: tech debt)
│   └── ::-webkit-scrollbar-button styling
│       ├── Arrow triangle CSS or SVG
│       └── Hover/active states
│
├── Collapsible Panels
│   ├── react-resizable-panels collapsible prop
│   │   └── collapsedSize prop (for tab bar visibility)
│   ├── Collapse trigger (button or double-click)
│   │   └── Imperative API (collapse/expand)
│   └── State persistence
│       └── localStorage update to include collapsed state
│
├── Keyboard Shortcuts in Tooltips
│   └── Already implemented via title attribute (no changes needed)
│
└── Double-Click Divider Reset
    ├── onDoubleClick handler on resize handle
    └── Imperative API resize() call
```

---

## CSS Variable Migration (Tech Debt)

Four files need migration from hardcoded colors to CSS variables:

### AnimationPanel.css (109 lines)
Hardcoded colors found:
- `#1a1a2e` (background)
- `#2a2a4e` (borders)
- `#e0e0e0` (text)
- `#0d0d1a` (dark background)
- `#888` (secondary text)
- `#666` (muted text)
- `#6a6aae` (accent)
- `#4a4a8e`, `#5a5aae` (button colors)
- `#3a3a6e` (hover)

### MapSettingsPanel.css (210 lines)
Hardcoded colors found:
- `#1a1a2e` (background)
- `#2a2a4e` (borders)
- `#e0e0e0` (text)
- `#0d0d1a` (dark background)
- `#c0c0c0` (label text)
- `#888` (section title)
- `#666` (muted text)
- `#6a6aae`, `#8a8ace` (accent/slider)

### MapCanvas.css (69 lines)
Hardcoded colors found:
- `#1a1a2e` (container background)
- `#0d0d1a` (scroll track)
- `#2a2a4e` (track border)
- `#4a4a6e`, `#5a5a8e`, `#6a6aae` (thumb colors)

### StatusBar.css (39 lines)
Hardcoded colors found:
- `#1a1a2e` (background)
- `#3a3a4e` (border)
- `#666` (label)
- `#aaa` (value)

**Mapping to CSS Variables:**
| Hardcoded | CSS Variable |
|-----------|--------------|
| `#1a1a2e` | `var(--bg-primary)` |
| `#2a2a3e` | `var(--bg-secondary)` |
| `#0d0d1a` | Need new: `var(--bg-darker)` |
| `#2a2a4e` | Close to `var(--border-color)` |
| `#3a3a4e` | `var(--border-color)` |
| `#4a4a6e` | `var(--bg-active)` |
| `#e0e0e0` | `var(--text-primary)` |
| `#c0c0c0` | `var(--text-primary)` |
| `#888888` | `var(--text-secondary)` |
| `#666666` | Need new: `var(--text-muted)` |
| `#5a5a7e` | `var(--accent-color)` |
| `#6a6aae` | Need new: `var(--accent-light)` |

---

## Implementation Recommendations

### Phase 1: CSS Variable Consistency (Prep work)
1. Add missing CSS variables to App.css `:root`
2. Update AnimationPanel.css, MapSettingsPanel.css, MapCanvas.css, StatusBar.css
3. Test both dark and light themes

### Phase 2: Classic Scrollbars
1. Update MapCanvas.css scrollbar styles to add arrow buttons
2. Use `::-webkit-scrollbar-button` pseudo-elements
3. Apply 3D beveled appearance for SEdit style
4. Ensure arrow click scrolls by 16px (one tile)

### Phase 3: Collapsible Panel
1. Add `collapsible={true}` and `collapsedSize={32}` to Panel
2. Add collapse toggle button to panel header
3. Persist collapsed state to localStorage
4. Test expand/collapse animation smoothness

### Phase 4: Double-Click Reset
1. Add onDoubleClick handler to PanelResizeHandle
2. Reset panels to default sizes (75/25)
3. If collapsed, expand to default

### Keyboard Shortcuts in Tooltips
Already implemented - no work needed. Current `title` attributes include shortcuts.

---

## Complexity Assessment

| Feature | Estimated Effort | Risk |
|---------|------------------|------|
| CSS variable migration | 1-2 hours | Low - straightforward find/replace |
| Classic scrollbars | 2-3 hours | Low - CSS only, well-documented pattern |
| Collapsible panel | 2-3 hours | Low - library supports it natively |
| Double-click reset | 1 hour | Low - simple event handler |
| **Total** | **6-9 hours** | **Low** |

---

## Sources

### HIGH Confidence (Official/Authoritative)
- [MDN ::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar) - Scrollbar pseudo-elements
- [Chrome Scrollbar Styling](https://developer.chrome.com/docs/css-ui/scrollbar-styling) - Modern styling API
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Panel API documentation
- [W3Schools Custom Scrollbar](https://www.w3schools.com/howto/howto_css_custom_scrollbar.asp) - Implementation guide

### MEDIUM Confidence (Multiple Sources Agree)
- [98.css](https://jdan.github.io/98.css/) - Windows 98 CSS design system
- [Win95.CSS](https://alexbsoft.github.io/win95.css/) - Windows 95 styled framework
- [Orangeable Scrollbar Styling](https://orangeable.com/css/scrollbars) - Comprehensive scrollbar guide
- [NN/g Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/) - Collapsible panel UX
- [Balsamiq Splitter Guidelines](https://balsamiq.com/learn/ui-control-guidelines/splitters/) - Divider behavior patterns
- [UI Patterns Keyboard Shortcuts](https://ui-patterns.com/patterns/keyboard-shortcuts) - Shortcut discoverability
- [Knock Keyboard Shortcuts Design](https://knock.app/blog/how-to-design-great-keyboard-shortcuts) - Tooltip best practices
- [Chakra UI Splitter](https://chakra-ui.com/docs/components/splitter) - Double-click reset pattern

### LOW Confidence (Single Source/Verify)
- [CodePen Win95 Scrollbars](https://codepen.io/louh/pen/oZJQvm) - SCSS implementation example
- [CopyProgramming Webkit Scrollbar Arrows](https://copyprogramming.com/howto/how-to-add-arrows-with-webkit-scrollbar-button) - Arrow button tutorial
