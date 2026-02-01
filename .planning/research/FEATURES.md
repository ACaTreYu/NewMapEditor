# Feature Landscape: Professional Editor UI

**Domain:** Professional editor UI (Photoshop/GIMP/Figma/VS Code style)
**Researched:** 2026-02-01
**Confidence:** MEDIUM (based on web research of established patterns, verified against multiple sources)

## Table Stakes

Features users expect from professional editor UIs. Missing = product feels incomplete or amateur.

### Layout & Structure

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Central canvas with maximum space** | All pro editors (Photoshop, GIMP, Figma, VS Code) maximize working area | Low | Users complained about Figma UI3 panels taking canvas space |
| **Resizable panels with drag dividers** | Standard in all professional tools; users expect to customize workspace | Medium | VS Code, Photoshop, GIMP all support this |
| **Panel size persistence** | Users shouldn't re-adjust layout every session | Low | localStorage or config file |
| **Minimum/maximum panel constraints** | Prevents panels from becoming unusably small or covering canvas | Low | react-resizable-panels handles this natively |
| **Consistent visual hierarchy** | Size, color, placement communicate importance | Low | Standard UI design principle |

### Toolbar

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Icon-only toolbar with tooltips** | Space-efficient, standard in Photoshop/GIMP/Figma | Low | All major editors use this pattern |
| **Tooltips with keyboard shortcuts** | Photoshop, Google Docs, VS Code all show shortcuts in tooltips | Low | Critical for discoverability |
| **Tooltip delay (~500ms)** | Prevents flickering on cursor movement | Low | Industry standard 300-500ms |
| **Keyboard shortcuts for all tools** | Power users expect keyboard-first workflow | Medium | Photoshop uses single-letter shortcuts (P, B, E, etc.) |
| **Active tool indication** | Visual feedback for current selection | Low | Highlight/pressed state on active tool icon |
| **Tool grouping** | Related tools grouped logically | Low | Drawing tools, selection tools, etc. |

### Tabbed Panels

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Tabs at top of panel** | Chrome, VS Code, Figma convention; users expect this placement | Low | Bottom tabs feel non-standard |
| **Tab click switches content** | Basic tab behavior | Low | Single view at a time |
| **Visual active tab indicator** | Users need to know which tab is selected | Low | Underline, background, or border |
| **Tab accessibility (ARIA roles)** | Screen reader support, keyboard navigation | Medium | role="tablist", role="tab", role="tabpanel" |
| **Tab key navigation** | Focus tabs with keyboard | Medium | Required for accessibility |

### Keyboard & Accessibility

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Keyboard-triggered tooltips** | Accessibility requirement (WCAG) | Low | Tab focus should show tooltip |
| **Focus indicators** | Users navigating with keyboard need visible focus | Low | CSS focus states |
| **Sufficient color contrast** | Readability, accessibility compliance | Low | Standard design requirement |
| **Screen reader support for tools** | aria-label, aria-describedby on tool buttons | Low | Basic accessibility |

### Visual Feedback

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Hover states on interactive elements** | Standard UI feedback | Low | All clickable elements need hover state |
| **Loading/processing indicators** | Users need feedback during operations | Low | Especially for file operations |
| **Cursor changes** | Cursor should indicate available actions | Low | Pointer on clickable, move on draggable |

## Differentiators

Features that set product apart. Not expected, but valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Spring-loaded shortcuts** | Hold key for temporary tool, release to return | High | Photoshop feature; power user favorite |
| **Shift+key to cycle tool variants** | Access related tools without menu | Medium | Photoshop pattern (Shift+L cycles lassos) |
| **Double-click to reset panel size** | Quick restore to default | Low | VS Code, many editors support this |
| **Collapsible panels** | Temporarily hide panels for max canvas | Medium | Tab key in GIMP hides all panels |
| **Panel collapse animation (smooth)** | Polished feel, spatial awareness | Medium | Keep under 300ms per Figma guidelines |
| **Dark mode support** | Eye comfort, battery savings on OLED | Medium | Expected by 2026, not critical for MVP |
| **Custom keyboard shortcuts** | Power users want to remap keys | High | Nice to have, not essential |
| **Workspace presets/layouts** | Save/restore different panel arrangements | High | VS Code, Photoshop have this |
| **Panel minimize to icons** | Collapse to thin strip while keeping access | Medium | VS Code activity bar pattern |
| **Touch-optimized drag handles** | Larger hit targets for touch screens | Low | Useful if supporting touch |
| **Microinteractions on state changes** | Buttons expand softly, cards fold into place | Medium | 2026 trend, adds polish |
| **Property labels toggle** | Show/hide text labels in properties | Low | Figma UI3 feature |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Floating/detachable panels** | GIMP users complained about this for years; harder to manage, obscures canvas | Fixed docked panels |
| **Instant tooltips (no delay)** | Creates flickering, distracting effect | Use 300-500ms delay |
| **Tooltips that disappear on hover** | WCAG violation; users can't read long tooltips | Keep tooltip visible while hovered |
| **Title attribute for tooltips** | Not keyboard accessible, poor screen reader support | Use proper tooltip components with ARIA |
| **Tabs requiring click to navigate (no keyboard)** | Accessibility failure | Support Tab key navigation |
| **Over-animated transitions** | Feels slow, wastes time | Keep animations under 300ms |
| **Auto-resizing panels on focus** | VS Code has complaints about this; unexpected behavior | Fixed sizes unless user drags |
| **More than 5 tabs in panel** | Cognitive overload | Group logically or use "More" overflow |
| **Nested tabs beyond 2 levels** | Confusing navigation | Use accordion or progressive disclosure |
| **Tooltips without keyboard trigger** | Excludes keyboard users | Fire tooltip on focus as well as hover |
| **Custom menu bar in Electron** | Extra complexity, breaks OS conventions | Use native Electron menu |
| **Panel gaps from window edge** | Wastes space; Figma UI3 got complaints about this | Panels flush to edges |

## Feature Dependencies

```
Layout Foundation
├── Central canvas area (must exist first)
├── Panel container structure
│   └── Resizable divider (depends on panel structure)
│       └── Panel size persistence (depends on divider)
│           └── Min/max constraints (depends on persistence logic)
└── Toolbar container
    ├── Tool icons
    │   └── Tooltips (depends on icons existing)
    │       └── Keyboard shortcuts in tooltips
    └── Active tool state (depends on icons)

Tabbed Panel
├── Tab container (role="tablist")
│   ├── Tab items (role="tab")
│   │   └── Active tab indicator
│   └── Tab keyboard navigation
└── Tab content panels (role="tabpanel")
    └── Content switching logic

Accessibility Layer (parallel track)
├── ARIA roles (add to components as built)
├── Focus indicators (CSS, can be added anytime)
└── Keyboard navigation (integrate with each component)
```

## MVP Recommendation

For the AC Map Editor UI milestone, prioritize in this order:

### Phase 1: Layout Structure (Must Have)

1. **Horizontal toolbar at top** - Move tools from current position, icon-only with tooltips
2. **Central canvas taking main area** - Full width, push palette to bottom
3. **Tabbed bottom panel** - Tiles/Settings/Animations as tabs
4. **Resizable divider** - Allow adjusting bottom panel height
5. **Panel persistence** - Remember size between sessions

### Phase 2: Polish (Should Have)

6. **Keyboard shortcuts in tooltips** - Show shortcut next to tool name
7. **Tab keyboard navigation** - Arrow keys, Tab key support
8. **Min/max panel constraints** - Prevent unusable sizes (10-50% as specified)
9. **Double-click divider to reset** - Quick restore to default

### Defer to Post-MVP

- **Spring-loaded shortcuts** - High complexity, power user feature
- **Dark mode** - Nice to have, not blocking
- **Custom keyboard shortcuts** - High complexity
- **Workspace presets** - Beyond scope of current milestone
- **Panel collapse animations** - Polish, not functional

## Implementation Notes

### Recommended Library

**react-resizable-panels** is the best fit for this project:
- Designed for VS Code-style layouts
- Supports persistence out of the box
- Handles min/max constraints
- Keyboard accessible (arrow key resizing)
- Zero dependencies, small bundle
- Works well with existing React/Zustand stack

### Tooltip Implementation

Use a proper tooltip component (not title attribute):
- 300-500ms delay on hover
- Show on Tab focus for accessibility
- Include keyboard shortcut in tooltip text
- Stay visible while being hovered (WCAG 1.4.13)
- Position to avoid canvas overlap

### Tab Panel Structure

Follow W3C ARIA patterns:
```html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tiles</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Settings</button>
  <button role="tab" aria-selected="false" aria-controls="panel-3">Animations</button>
</div>
<div role="tabpanel" id="panel-1">...</div>
<div role="tabpanel" id="panel-2" hidden>...</div>
<div role="tabpanel" id="panel-3" hidden>...</div>
```

## Sources

### HIGH Confidence (Official Documentation)
- [VS Code Custom Layout Documentation](https://code.visualstudio.com/docs/configure/custom-layout)
- [VS Code User Interface Documentation](https://code.visualstudio.com/docs/getstarted/userinterface)
- [VS Code Panel UX Guidelines](https://code.visualstudio.com/api/ux-guidelines/panel)
- [GIMP Dialogs and Docking Documentation](https://docs.gimp.org/2.10/en/gimp-concepts-docks.html)
- [GIMP Main Windows Documentation](https://docs.gimp.org/3.0/en/gimp-concepts-main-windows.html)
- [Adobe Photoshop Toolbar Customization](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html)
- [Figma UI3 Navigation Guide](https://help.figma.com/hc/en-us/articles/23954856027159-Navigating-UI3-Figma-s-new-UI)
- [Figma Left Sidebar Documentation](https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar)
- [W3C ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [MDN ARIA Tooltip Role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tooltip_role)

### MEDIUM Confidence (Multiple Sources Agree)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Primary resizable panel library for React
- [Dockview](https://dockview.dev/) - Alternative docking library
- [NN/g Tooltip Guidelines](https://www.nngroup.com/articles/tooltip-guidelines/) - UX research on tooltips
- [NN/g Tabs Used Right](https://www.nngroup.com/articles/tabs-used-right/) - Tab UX research
- [LogRocket Tooltip UX Design](https://blog.logrocket.com/ux-design/designing-better-tooltips-improved-ux/)
- [SetProduct Tooltip UI Design](https://www.setproduct.com/blog/tooltip-ui-design)
- [Tabs UI Design Guide](https://www.setproduct.com/blog/tabs-ui-design)
- [Microsoft Tooltips and Infotips Guidelines](https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-tooltips-and-infotips)

### LOW Confidence (WebSearch Only, Verify Before Using)
- Figma UI3 user feedback from forums (opinions may vary)
- 2026 UI trend predictions (not established patterns yet)
- Animation timing recommendations (varies by source)
