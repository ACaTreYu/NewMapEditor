# Project Research Summary

**Project:** AC Map Editor v1.1 - Canvas Optimization and Polish
**Domain:** Desktop application UI refinement (Electron/React)
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

v1.1 is a polish release focused on maximizing canvas editing space through collapsible panels and improving navigation with classic SEdit-style scrollbars. The research confirms this is a low-risk, well-defined scope: all features build on existing infrastructure (react-resizable-panels already supports collapse, custom scrollbars just need arrow buttons added). The only new dependency needed is @radix-ui/react-collapsible (4.82 kB gzipped), though even this is optional since react-resizable-panels has native collapse support.

The recommended approach is to start with CSS variable migration (technical debt from v1.0) since it touches files that will be modified for scrollbar and panel work. This creates a clean foundation and avoids merge conflicts. The scrollbar arrows are pure extension work on the existing MapCanvas implementation - no library needed, just React components and CSS. Panel collapse uses the imperative API already available in react-resizable-panels.

Key risks are minor: the drag-to-expand "dead zone" in collapsed panels can confuse users (mitigate with explicit expand button), and CSS variable changes need testing in both light and dark modes. The keyboard shortcuts are already in tooltips via native `title` attributes - no work needed there. Total estimated effort is 6-9 hours across 4 small phases.

## Key Findings

### Recommended Stack

Minimal additions needed. The existing stack handles everything.

**Core technologies:**
- **No scrollbar library** - Extend existing MapCanvas implementation with arrow buttons. Evaluated react-scrollbars-custom (maintenance warning, seeking maintainers), SimpleBar (no arrow support), react-custom-scroll (basic only). All rejected.
- **@radix-ui/react-collapsible (optional)** - 4.82 kB headless primitive for sidebar section collapse. However, react-resizable-panels has native `collapsible` prop that handles the main panel collapse requirement.
- **Native CSS variables** - No tooling needed. Project already uses custom properties in App.css.

**What NOT to add:**
- CSS `::-webkit-scrollbar-button` - Only works with DOM overflow scrolling, not canvas-based virtual scrolling
- Radix Tooltips - Current native `title` attributes already show shortcuts. Custom tooltips are a differentiator, not table stakes.

### Expected Features

**Must have (table stakes):**
- Arrow buttons at scrollbar track ends (SEdit aesthetic)
- Click-to-scroll on arrows (one tile = 16px per click)
- Hold-to-repeat scrolling behavior
- Panel minimize toggle (collapse to maximize canvas)
- Expand from collapsed state
- State persistence (collapsed/expanded remembered)
- Double-click divider to reset panel sizes

**Should have (differentiators):**
- 3D beveled scrollbar buttons (authentic Win95/SEdit look)
- Corner resize square where scrollbars meet
- Collapse animation easing (smooth transition)

**Defer (v2+):**
- Custom Radix tooltip component (native `title` is sufficient)
- Keyboard shortcut customization
- Floating/detached panels
- Multiple collapse levels

**Already done (no work needed):**
- Keyboard shortcuts in tooltips - ToolBar.tsx already uses `title={`${tool.label} (${tool.shortcut})`}`

### Architecture Approach

All v1.1 features integrate into existing components with no new component files needed. The scrollbar arrows extend MapCanvas.tsx with new button elements and handlers. Panel collapse adds a ref and props to the existing Panel in App.tsx. CSS variable migration is pure stylesheet changes.

**Modified components:**
1. **MapCanvas.tsx** - Add arrow button elements, click/hold handlers for scroll
2. **MapCanvas.css** - Arrow button styling, migrate to CSS variables
3. **App.tsx** - Add `collapsible` prop and imperative ref to sidebar Panel
4. **App.css** - Add missing CSS variables (`--bg-darker`, `--accent-hover`)
5. **4 CSS files** - AnimationPanel.css, MapSettingsPanel.css, StatusBar.css need variable migration

### Critical Pitfalls

1. **Drag-to-expand dead zone** - Collapsed panels appear unresponsive when dragging to expand. The handle doesn't move until panel reaches minSize. **Avoid by:** Using explicit collapse/expand button, not relying solely on drag.

2. **localStorage layout conflicts** - If using both `autoSaveId` and `defaultSize` props, panel sizes can restore incorrectly or drag direction reverses. **Avoid by:** Maintaining current manual localStorage approach (editor-panel-sizes-v2), don't mix with autoSaveId.

3. **Collapsed panel size memory loss** - Drag-to-collapse doesn't remember pre-collapse size. **Avoid by:** Using imperative API (`collapse()`/`expand()`) which preserves size memory.

4. **CSS variable naming collisions** - New variables can shadow existing ones, breaking themes. **Avoid by:** Auditing existing variables before adding, testing both light and dark modes.

5. **Track click behavior mismatch** - Users may expect track click to jump to position (modern apps) vs page-scroll (classic). **Avoid by:** Deciding on one behavior and implementing consistently. Research suggests position-jump is expected.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: CSS Variable Consolidation
**Rationale:** Technical debt cleanup that touches files modified in later phases. Doing this first prevents merge conflicts and establishes consistent theming foundation.
**Delivers:** All CSS files using variables, 2 new variables added to App.css
**Addresses:** Tech debt from v1.0 (4 files with hardcoded colors)
**Avoids:** CSS variable naming collision pitfall (by establishing clear patterns first)
**Effort:** 1-2 hours

### Phase 2: Classic Scrollbars with Arrow Buttons
**Rationale:** Independent feature, no external dependencies, extends existing working implementation
**Delivers:** SEdit-style scrollbars with arrow buttons, click-and-hold scrolling, visual 3D styling
**Uses:** Existing MapCanvas scrollbar infrastructure, CSS variables from Phase 1
**Avoids:** Track click behavior mismatch (decide: position-jump or page-jump)
**Effort:** 2-3 hours

### Phase 3: Collapsible Bottom Panel
**Rationale:** Uses react-resizable-panels native API (already installed), straightforward integration
**Delivers:** Collapsible panel with toggle button, state persistence, double-click reset
**Uses:** react-resizable-panels imperative API
**Avoids:** Dead zone confusion (add explicit button), size memory loss (use imperative API)
**Effort:** 2-3 hours

### Phase 4: Polish and Testing
**Rationale:** Final validation across all modes, edge cases, and themes
**Delivers:** Verified light/dark mode support, Electron build testing, edge case handling
**Addresses:** Any integration issues discovered in Phases 1-3
**Effort:** 1 hour

### Phase Ordering Rationale

- **CSS first** because scrollbar and panel CSS files need variable migration, and doing it separately avoids conflicts
- **Scrollbars before panels** because they're completely independent - can be developed and tested in isolation
- **Panels last** because they may need subtle adjustments based on scrollbar layout changes (corner square placement)
- **All phases are low-risk** and can be done in any order if needed, but this sequence minimizes file conflicts

### Research Flags

Phases with standard patterns (skip deep research):
- **Phase 1 (CSS):** Well-documented, straightforward find/replace
- **Phase 2 (Scrollbars):** Existing implementation analysis complete, patterns clear
- **Phase 3 (Panels):** react-resizable-panels API documented, imperative usage understood
- **Phase 4 (Polish):** Testing phase, no research needed

No phases require additional research - v1.1 scope is fully understood.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal additions, all evaluated against alternatives |
| Features | MEDIUM-HIGH | Table stakes verified against SEdit style, some CSS pseudo-element limitations discovered |
| Architecture | HIGH | All changes integrate into existing components, no new patterns |
| Pitfalls | MEDIUM-HIGH | react-resizable-panels issues verified via GitHub, Electron quirks noted |

**Overall confidence:** HIGH

### Gaps to Address

- **Scrollbar track click behavior**: Research found both position-jump and page-jump patterns. Need to decide which matches SEdit behavior - verify against original SEdit if possible.
- **Light mode testing**: Most development happens in dark mode. CSS variable migration needs explicit light mode verification.
- **Electron packaged build**: Custom scrollbar rendering can differ between dev and packaged builds - needs testing after implementation.

## Sources

### Primary (HIGH confidence)
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Imperative API, collapse behavior
- [Radix UI Collapsible](https://www.radix-ui.com/primitives/docs/components/collapsible) - Version 1.1.12 verified
- MapCanvas.tsx local analysis - Existing scrollbar implementation lines 467-509
- App.tsx local analysis - Panel layout lines 20-38

### Secondary (MEDIUM confidence)
- [MDN ::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar) - Pseudo-element limitations
- [98.css](https://jdan.github.io/98.css/) - Windows 98 visual styling patterns
- [react-resizable-panels Issue #220](https://github.com/bvaughn/react-resizable-panels/issues/220) - Collapsed panel behavior
- [react-resizable-panels Discussion #269](https://github.com/bvaughn/react-resizable-panels/discussions/269) - Dead zone explanation

### Tertiary (LOW confidence)
- [CodePen Win95 Scrollbars](https://codepen.io/louh/pen/oZJQvm) - SCSS reference (verify CSS translation)

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
