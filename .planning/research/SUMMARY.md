# Project Research Summary

**Project:** AC Map Editor -- Windows 98 Theme Overhaul (v1.4)
**Domain:** Pixel-accurate OS theme recreation via CSS in Electron/React
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

The Win98 theme overhaul is a pure CSS project with zero new dependencies. The core technique is a 4-color box-shadow bevel system (white, light grey, dark grey, near-black) applied to every control in the application. The authoritative reference is the 98.css library (MIT, v0.1.21), whose complete source has been extracted and verified against actual Win98 system color constants. Critically, the project already has a working implementation of these exact bevel patterns in `MapSettingsDialog.css` -- the work is extending these proven patterns to the 12 remaining CSS files while removing the dark/light theme toggle system.

The recommended approach is: create a single `win98.css` master file defining all CSS custom properties (system colors, bevel shadow composites, typography) with global element-level control styles (button, input, select, range). Import this into `App.css`, remove the old two-tier dark/light variable system and the `useTheme` hook entirely, then systematically convert each component's CSS file. No new React components are needed for MVP -- this is predominantly a CSS-only change with two small TypeScript deletions (theme toggle from ToolBar, appearance section from MapSettingsPanel, deletion of `useTheme.ts`).

The top risks are: (1) ghost CSS variables (`--border-color`, `--accent-color`) that are referenced in 5 component files but never defined, causing silent failures during migration; (2) residual `border-radius` values in 25+ locations that break the Win98 zero-radius aesthetic; and (3) CSS transitions and hover effects that make the app "feel" modern despite looking retro. All three are preventable with upfront auditing and a global CSS reset in Phase 1. The Electron window frame should remain native (not frameless) to contain scope -- the inner application chrome is the target, not the OS-level window.

## Key Findings

### Recommended Stack

No new dependencies. Zero npm packages to install. The entire Win98 visual language is achievable with CSS custom properties, `box-shadow` patterns with `inset` layers at 1px and 2px offsets, and inline SVG data URIs for glyphs (checkmarks, scrollbar arrows, radio dots). The 98.css library serves as a visual reference only -- installing it as a dependency would conflict with the existing CSS architecture and require fighting its global styles.

**Core technologies (unchanged from current):**
- **CSS Custom Properties:** Single-tier Win98 palette replacing the existing two-tier dark/light system
- **box-shadow inset patterns:** The fundamental building block for all 3D beveled controls
- **Inline SVG data URIs:** For checkmark glyphs, scrollbar arrows, and radio button dots (extracted from 98.css, MIT licensed)
- **Arial 11px with `-webkit-font-smoothing: none`:** Acceptable Win98 font approximation for an Electron desktop app without bundling custom fonts

### Expected Features

**Must have (table stakes) -- the "looks like Win98" bar:**
- TS-19/20: Remove dark/light theme, purge all modern CSS artifacts (border-radius, transitions, rgba, soft shadows)
- TS-02/03: Title bars with active/inactive gradients and pixel-accurate caption button glyphs
- TS-06: Flat toolbar buttons with 3D hover/pressed states (no border at rest, raised on hover, sunken on press)
- TS-07: 16px scrollbars with raised arrow buttons, dithered checkerboard track, raised thumb
- TS-09: Push buttons verified against exact Win98 sizing (75x23px) with no hover effect
- TS-14: Tab controls with flush-merge illusion (active tab overlaps content border)
- TS-16: Status bar with shallow sunken field sections
- TS-10: Text inputs with sunken field borders, no focus background color change
- TS-08: Etched group box borders on panel sections
- TS-18: Minimap border (remove border-radius, add raised bevel)

**Should have (differentiators for authenticity):**
- DF-01: Dithered scrollbar track (2x2 checkerboard SVG)
- DF-02: Disabled text embossed effect (`color: #808080; text-shadow: 1px 1px 0 #ffffff`)
- DF-03: Default button extra black border
- DF-06: Toolbar toggled-on button hatched background
- DF-08: Focused control dotted rectangle (inside buttons, around labels for checkboxes)

**Defer to v2+:**
- TS-04/05: Menu bar and dropdown menus (high complexity, new component, keyboard navigation -- toolbar serves as primary control)
- TS-11/12: Custom checkbox and radio button recreation (only needed if settings dialog uses them extensively)
- TS-13: Custom select/dropdown component (native dropdown popup is unstylable; accept mismatch for the few dropdowns that exist)
- DF-07: Marlett font glyphs for caption buttons (CSS/SVG approximations are sufficient)
- DF-11: Replace emoji toolbar icons with 16x16 pixel art (art asset creation/sourcing required)
- DF-12: Custom Win98 cursors (native cursors are close enough)

### Architecture Approach

Create one new file (`src/win98.css`) as the master theme containing all CSS custom properties and global element-level styles. Import it at the top of `App.css`. Keep per-component CSS files co-located with their TSX components (established project convention). Delete `src/hooks/useTheme.ts` and remove theme references from ToolBar and MapSettingsPanel. Keep native Electron window frame. Style `react-resizable-panels` handles as Win98 raised bars via CSS only.

**Major components of the CSS architecture:**
1. **`win98.css`** -- Centralized variables (15 system colors, 5+ bevel pattern composites, font stack) and global element resets (button, input, select, range slider)
2. **Per-component CSS files (12 files)** -- Updated to reference `--w98-*` variables, stripped of modern artifacts, given appropriate bevel patterns
3. **Bevel pattern system** -- Five named composite variables (`--w98-raised`, `--w98-sunken`, `--w98-field`, `--w98-pressed`, `--w98-status`) stored as CSS custom properties and referenced everywhere via `box-shadow: var(--w98-raised)`

### Critical Pitfalls

1. **Ghost CSS variables** -- `--border-color` and `--accent-color` are used in 5 component files (ToolBar, TilePalette, RightSidebar, AnimationPreview, Minimap) but NEVER defined. Must audit and fix before any theme work begins or these will silently produce invisible/wrong borders.

2. **Wrong bevel color order** -- The 4-color system (`#ffffff` / `#dfdfdf` / `#808080` / `#0a0a0a`) must be applied in exact order. Swapping inner/outer layers produces "almost right but subtly wrong" 3D effects. Prevention: define shadow patterns as CSS custom properties ONCE, never hand-write the 4-layer shadow in individual components.

3. **Residual border-radius** -- 25+ occurrences of `border-radius: 4px` (and `50%` on slider thumbs) across 9 CSS files. Even one survivor breaks the Win98 zero-radius aesthetic. Prevention: add `* { border-radius: 0 !important; }` as a development safety net during migration.

4. **CSS transitions and hover effects** -- 4 `transition` properties and numerous `:hover` color changes make the app feel modern despite looking retro. Win98 had instant state changes with no hover on standard buttons. Prevention: grep and remove all `transition` properties; audit every `:hover` rule.

5. **Leftover dark theme colors** -- Hardcoded dark palette values (e.g., `#0d0d1a` in AnimationPreview.css) and the theme-switching mechanism (`.theme-light` class toggle) will fight the Win98 colors if not removed. Prevention: grep for non-Win98 hex values after migration.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Theme Foundation

**Rationale:** Everything depends on the new variable system. Must be first. This single phase will make the app "mostly grey and beveled" even before individual components are polished.

**Delivers:** Win98 CSS variable palette, bevel pattern composites, global element resets, removal of dark/light theme toggle, cleanup of ghost variable references.

**Addresses:** TS-19 (remove dark theme), TS-20 (remove modern artifacts -- global pass), partial TS-09 (buttons get global treatment)

**Avoids:** Pitfall 1 (ghost variables), Pitfall 3 (border-radius via global reset), Pitfall 5 (font stack), Pitfall 15 (leftover dark colors)

**Key tasks:**
- Create `src/win98.css` with all `--w98-*` variables and bevel composites
- Add global button/input/select/range element styles to `win98.css`
- Add `@import './win98.css'` to `App.css`
- Remove old Tier 1 + Tier 2 variables and `.theme-light` block from `App.css`
- Delete `src/hooks/useTheme.ts`
- Remove theme toggle from `Toolbar.tsx` and appearance section from `MapSettingsPanel.tsx`
- Audit and fix all undefined `--border-color` / `--accent-color` references
- Add global `border-radius: 0` reset
- Remove all `transition` properties

### Phase 2: Application Chrome

**Rationale:** Toolbar, status bar, and resize handles form the visual frame. Getting these right makes the app "feel Win98" at a glance even before panel interiors are detailed.

**Delivers:** Win98 toolbar with flat-to-raised button behavior, Win98 status bar with sunken sections, Win98 resize handles as raised bars, panel title bars with active/inactive gradients.

**Addresses:** TS-06 (toolbar), TS-16 (status bar), TS-02/03 (title bars and caption buttons), resize handles

**Avoids:** Pitfall 4 (transitions/hover -- toolbar is the main offender), Pitfall 6 (pressed button text shift), Pitfall 16 (status bar uses shallow sunken, not full sunken)

**Key tasks:**
- Restyle `ToolBar.css` -- flat buttons, no border at rest, raised on hover, sunken on active/toggled
- Restyle `StatusBar.css` -- shallow sunken field sections
- Update resize handles in `App.css` -- raised bar bevels
- Style panel title bars with active gradient; add inactive gradient support

### Phase 3: Panel Interiors

**Rationale:** Once the outer chrome is correct, systematically convert all panel content areas. These are largely independent of each other and can be done in any order.

**Delivers:** Win98-styled tile palette, animation panel, settings panel, right sidebar, tabbed bottom panel.

**Addresses:** TS-14 (tabs), TS-10 (text inputs), TS-15 (sliders), TS-08 (group boxes), TS-11/12 (checkboxes/radios if needed)

**Avoids:** Pitfall 11 (tab border overlap), Pitfall 12 (checkbox/radio recreation), Pitfall 13 (slider pseudo-elements), Pitfall 8 (disabled text embossed effect)

**Key tasks:**
- Update `TilesetPanel.css`, `TilePalette.css`
- Update `AnimationPanel.css`, `AnimationPreview.css`
- Update `MapSettingsPanel.css` -- sliders, inputs, checkboxes
- Update `TabbedBottomPanel.css` -- Win98 tab styling
- Update `RightSidebar.css`

### Phase 4: Scrollbars and Canvas Chrome

**Rationale:** Scrollbars are visually important but self-contained. The map canvas scrollbars need significant work (10px to 16px, add arrow buttons, add dithered track). Minimap border is a quick fix bundled here.

**Delivers:** Win98 scrollbars with raised arrows, dithered track, raised thumb. Win98-styled minimap border.

**Addresses:** TS-07 (scrollbars), TS-18 (minimap), DF-01 (dithered track)

**Avoids:** Pitfall 10 (missing checkerboard pattern), Pitfall 3 (scrollbar thumb border-radius)

**Key tasks:**
- Overhaul `MapCanvas.css` scrollbar styles -- 16px width, arrow buttons via SVG, dithered track via 2x2 SVG
- Remove scrollbar thumb border-radius
- Update `Minimap.css` -- remove border-radius, add raised bevel

### Phase 5: Dialog Polish and Consistency Pass

**Rationale:** The MapSettingsDialog already has the most accurate Win98 styling. This phase migrates its hardcoded values to the new variable system and does a full visual consistency audit.

**Delivers:** MapSettingsDialog using centralized variables, verified tab styling, consistent disabled states, default button border, overall visual consistency.

**Addresses:** DF-02 (disabled embossed text), DF-03 (default button border), DF-06 (toggled toolbar hatched background), DF-08 (focus dotted rectangle)

**Avoids:** Pitfall 7 (wrong focus indicator), Pitfall 8 (disabled opacity instead of embossed), Pitfall 17 (spacing constants)

**Key tasks:**
- Migrate `MapSettingsDialog.css` hardcoded colors to `--w98-*` variables
- Verify tab flush-merge illusion
- Apply disabled embossed text pattern globally
- Add default button extra border to dialog OK/Apply buttons
- Full visual audit against Win98 screenshots

### Phase Ordering Rationale

- **Phase 1 must be first** because all subsequent phases depend on the `--w98-*` variable system and bevel composites being in place. Without this foundation, each component would need to define its own colors, leading to inconsistency.
- **Phase 2 before Phase 3** because chrome (toolbar, status bar, resize handles) is the most visible framing element. Users notice the app frame first, panel content second.
- **Phase 3 and Phase 4 are interchangeable** in order. Both are independent of each other. Phase 3 is suggested first because it covers more surface area and more components.
- **Phase 5 is last** because it is refinement, not creation. The MapSettingsDialog already works. This phase is about consistency and polish.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Scrollbars):** The custom scrollbar system in MapCanvas uses a non-standard implementation. The interaction between native `::-webkit-scrollbar` and the project's custom scrollbar divs needs investigation during phase planning. The dithered track pattern via SVG data URI is well-documented but needs testing in the specific Electron version.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Entirely well-documented. The variable system, bevel patterns, and theme removal are all established patterns with exact CSS values available from STACK.md.
- **Phase 2 (Chrome):** Standard CSS work. The toolbar flat-button pattern and status bar sunken fields are fully documented in STACK.md with copy-paste-ready CSS.
- **Phase 3 (Panels):** Mostly variable substitution and border-radius removal. Tab control flush-merge is the only tricky part, and it is well-documented with a known technique (margin-bottom: -1px + z-index).
- **Phase 5 (Polish):** Refinement of existing patterns. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero dependencies. All CSS patterns extracted directly from 98.css v0.1.21 source (MIT). Color values cross-verified against Win32 system color constants. |
| Features | HIGH | 20 table-stakes features and 12 differentiators catalogued with exact CSS for each. Priority ordering based on visibility and dependency analysis. |
| Architecture | HIGH | Full codebase audit completed: 12 CSS files inventoried, component tree mapped, existing Win98 patterns identified in MapSettingsDialog.css and verified correct. |
| Pitfalls | HIGH | 19 pitfalls identified from codebase audit, community experience (HN discussions, 98.css issues), and cross-referencing multiple CSS recreation projects. Ghost variable issue verified via grep. |

**Overall confidence:** HIGH

### Gaps to Address

- **Custom scrollbar implementation details:** The MapCanvas uses a custom scrollbar system (not native `::-webkit-scrollbar`). Phase 4 planning should examine whether to convert to native Chromium scrollbar pseudo-elements or continue with the custom approach.
- **Electron Chromium version compatibility:** The project uses Electron 28. Some CSS features (like `appearance: base-select` for styleable dropdowns) require newer Chromium. This only matters for the deferred TS-13 custom select feature.
- **High-DPI rendering:** Box-shadow bevel borders may appear slightly blurry at 125%/150% Windows scaling. The pragmatic approach (accept it) is recommended, but if pixel-perfect rendering is required, forcing `--force-device-scale-factor=1` is an option. Defer this decision to Phase 5 testing.
- **Emoji icon replacement:** DF-11 (replacing emoji toolbar icons with 16x16 pixel art) requires art asset creation or sourcing. This is deferred to v2+ but is the single biggest remaining visual anachronism after all CSS work is complete.

## Sources

### Primary (HIGH confidence)
- [98.css GitHub Repository](https://github.com/jdan/98.css) -- Complete source extracted, v0.1.21, MIT license. Authoritative for all color values, bevel patterns, and control CSS.
- [98.css Documentation](https://jdan.github.io/98.css/) -- Component examples and HTML patterns.
- [Microsoft Border Style Documentation](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb226804(v=vs.85)) -- Official Win32 raised/sunken/etched border specification.
- [Microsoft Win32 Control Documentation](https://learn.microsoft.com/en-us/windows/win32/controls/) -- Official specs for tab controls, trackbars, status bars.

### Secondary (MEDIUM confidence)
- [Windows System Colours by OS (GitHub Gist)](https://gist.github.com/zaxbux/64b5a88e2e390fb8f8d24eb1736f71e0) -- System color values cross-referenced across Windows versions.
- [OS-GUI.js](https://os-gui.js.org/) -- Alternative Win98 CSS+JS library, used for cross-referencing scrollbar and control patterns.
- [Electron Custom Window Styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles) -- Frameless window documentation (evaluated, not recommended for this milestone).
- [Win98 Scrollbar CSS (CodePen)](https://codepen.io/BeardedBear/details/jObVXmV) -- Community scrollbar implementation reference.

### Tertiary (LOW confidence)
- [Using Only CSS to Recreate Windows 98 (fjolt.com)](https://fjolt.com/article/css-windows-98) -- Blog post with font rendering techniques.
- [HN Discussions on 98.css](https://news.ycombinator.com/item?id=42056918) -- Developer experiences with high-DPI and pixel accuracy issues.

---
*Research completed: 2026-02-04*
*Ready for roadmap: yes*
