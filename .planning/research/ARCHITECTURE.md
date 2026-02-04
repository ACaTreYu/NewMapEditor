# Architecture: Win98 Pixel-Accurate Theme Overhaul

**Domain:** Visual theme replacement for Electron/React tile map editor
**Researched:** 2026-02-04
**Confidence:** HIGH (based on thorough codebase audit + 98.css reference + Electron docs)

---

## Current Architecture Snapshot

### Component Tree (from codebase audit)

```
App.tsx
  |-- ToolBar               (toolbar buttons, theme toggle, keyboard shortcuts)
  |-- PanelGroup             (react-resizable-panels, horizontal)
  |     |-- Panel#main
  |     |     |-- PanelGroup (vertical)
  |     |           |-- Panel#canvas
  |     |           |     |-- main-area (div)
  |     |           |           |-- MapCanvas (canvas + custom scrollbars)
  |     |           |           |-- Minimap (overlay)
  |     |           |-- PanelResizeHandle.resize-handle-horizontal
  |     |           |-- Panel#tiles
  |     |                 |-- TilesetPanel (wrapper with title bar)
  |     |                       |-- TilePalette
  |     |-- PanelResizeHandle.resize-handle-vertical
  |     |-- Panel#animations
  |           |-- AnimationPanel
  |-- StatusBar
  |-- MapSettingsDialog (modal, opened from toolbar)
```

### Current CSS Architecture

**Two-tier CSS variable system in App.css:**
- Tier 1: Primitive color tokens (raw hex values: `--color-dark-800`, `--color-cream-200`, etc.)
- Tier 2: Semantic tokens mapped to primitives (`--bg-primary`, `--text-secondary`, etc.)
- Dark theme is `:root` default, light theme overrides via `.theme-light` class

**Theme switching mechanism:**
- `useTheme` hook in `src/hooks/useTheme.ts` manages state
- Three-way toggle: system / light / dark
- Persists to localStorage
- Applies class to `document.documentElement`: `.theme-light` or `.theme-dark`
- Used in two places: ToolBar (cycle button) and MapSettingsPanel (select dropdown)

**CSS file inventory (12 files):**

| File | Size/Complexity | Uses Semantic Vars? | Has Win95 Styling? |
|------|----------------|--------------------|--------------------|
| `App.css` | Large - variables + layout + handles | Yes (defines them) | Partial (title bar, inset frame) |
| `ToolBar.css` | Medium | Mixed (`--border-color` undefined ref) | No |
| `MapCanvas.css` | Large - scrollbars | Yes | Frame class exists but unused |
| `TilesetPanel.css` | Small | Yes | No |
| `TilePalette.css` | Medium | Mixed (`--border-color`, `--accent-color` undefined) | No |
| `AnimationPanel.css` | Medium | Yes | No |
| `AnimationPreview.css` | Medium | Mixed (`--border-color`, `--accent-color`) | No |
| `MapSettingsDialog.css` | Large | Mixed (some hardcoded `#c0c0c0`) | YES - extensive |
| `MapSettingsPanel.css` | Large | Yes | No |
| `TabbedBottomPanel.css` | Small | Yes | No |
| `Minimap.css` | Small | Mixed (`--border-color`) | No |
| `StatusBar.css` | Small | Yes | No |
| `RightSidebar.css` | Small | Mixed (`--border-color`) | No |

**Critical finding:** Several CSS files reference `--border-color` and `--accent-color` which are NOT defined in the variable system. The defined variables are `--border-default`, `--border-subtle`, `--accent-primary`, etc. These undefined references currently fall back to browser defaults (likely transparent or inherited), meaning those borders may already be invisible.

### Existing Win95/98 Patterns Already in Codebase

The MapSettingsDialog already has extensive Win95 styling that serves as the internal reference:

1. **Raised border (buttons, dialog frame):**
```css
box-shadow:
  inset -1px -1px 0px 0px #0a0a0a,   /* ButtonDkShadow - outer bottom-right */
  inset 1px 1px 0px 0px #ffffff,      /* ButtonHighlight - outer top-left */
  inset -2px -2px 0px 0px #808080,    /* ButtonShadow - inner bottom-right */
  inset 2px 2px 0px 0px #dfdfdf;      /* ButtonLight - inner top-left */
```

2. **Sunken border (inputs, text fields):**
```css
box-shadow:
  inset 1px 1px 0px 0px #808080,      /* ButtonShadow - outer top-left */
  inset -1px -1px 0px 0px #ffffff,    /* ButtonHighlight - outer bottom-right */
  inset 2px 2px 0px 0px #0a0a0a,     /* ButtonDkShadow - inner top-left */
  inset -2px -2px 0px 0px #dfdfdf;    /* ButtonLight - inner bottom-right */
```

3. **Pressed button (inverted raised):**
```css
box-shadow:
  inset 1px 1px 0px 0px #0a0a0a,
  inset -1px -1px 0px 0px #ffffff,
  inset 2px 2px 0px 0px #808080,
  inset -2px -2px 0px 0px #dfdfdf;
```

4. **Title bar gradient:** `linear-gradient(to right, #000080, #1084d0)`
5. **Font:** `'MS Sans Serif', Arial, sans-serif` at 11px
6. **Button base:** `background: #c0c0c0` with raised box-shadow

These patterns are correct per 98.css reference and should be standardized across the entire application.

---

## Recommended Architecture

### Decision 1: Replace Two-Tier Variable System with Win98 Flat Palette

**Recommendation: REPLACE.** Simplify to a single-tier system with Win98-specific semantic names.

**Rationale:**
- The two-tier system (primitives + semantic) exists to support dark/light theme switching. With only one theme (Win98), the indirection adds complexity with no benefit.
- Several components already have undefined variable references (`--border-color`, `--accent-color`), indicating the abstraction layer is already inconsistent.
- Win98 has a fixed, well-documented color palette. Direct named variables are clearer.
- The existing MapSettingsDialog already hardcodes Win98 colors directly, proving the pattern works.

**New variable system (replaces ALL existing variables):**

```css
:root {
  /* === Win98 System Colors === */
  --w98-surface:          #c0c0c0;  /* ButtonFace - dialog/button/panel surface */
  --w98-window:           #ffffff;  /* Window - input/content area backgrounds */
  --w98-desktop:          #008080;  /* Desktop teal - workspace background */

  /* === Bevel Colors (3D Edge Model) === */
  --w98-btn-highlight:    #ffffff;  /* ButtonHighlight - outer light edge */
  --w98-btn-light:        #dfdfdf;  /* ButtonLight - inner light edge */
  --w98-btn-shadow:       #808080;  /* ButtonShadow - inner dark edge */
  --w98-btn-dk-shadow:    #0a0a0a;  /* ButtonDkShadow - outer dark edge */

  /* === Text Colors === */
  --w98-text:             #000000;  /* WindowText / ButtonText */
  --w98-text-disabled:    #808080;  /* GrayText - disabled controls */
  --w98-text-highlight:   #ffffff;  /* HighlightText - selected text */

  /* === Title Bar === */
  --w98-title-active:     #000080;  /* ActiveTitle */
  --w98-title-active-end: #1084d0;  /* Gradient end */
  --w98-title-inactive:   #808080;  /* InactiveTitle */
  --w98-title-inactive-end: #b5b5b5;
  --w98-title-text:       #ffffff;  /* TitleText */

  /* === Selection / Highlight === */
  --w98-highlight:        #000080;  /* Highlight */
  --w98-highlight-text:   #ffffff;  /* HighlightText */

  /* === Spacing === */
  --w98-element-spacing:  8px;
  --w98-border-width:     2px;      /* Standard bevel border thickness */

  /* === Font === */
  --w98-font-family:      'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif;
  --w98-font-size:        11px;
}
```

**Why `--w98-` prefix:** Prevents collision with any remaining references during migration. Clear provenance. If a future theme is ever added, the namespace is clean.

### Decision 2: CSS Organization - One Master File + Per-Component Overrides

**Recommendation: Create `win98.css` master file loaded in App.css, keep per-component files.**

**Architecture:**

```
src/
  win98.css                          <-- NEW: variables + reusable patterns + global element styles
  App.css                            <-- MODIFIED: stripped of old variables, imports win98.css
  components/
    ToolBar/ToolBar.css              <-- MODIFIED: use new variables, Win98 patterns
    MapCanvas/MapCanvas.css          <-- MODIFIED: Win98 scrollbars
    StatusBar/StatusBar.css          <-- MODIFIED: Win98 status bar
    ... (each component CSS updated)
```

**Why not one single file?** Per-component CSS files are already established, co-located with their TSX files, and imported locally. This is a good pattern. Changing to a monolithic file would:
- Lose co-location (harder to find styles for a component)
- Create merge conflicts if multiple features are developed
- Violate the existing project convention

**Why a master `win98.css`?** Centralizes:
1. CSS custom properties (the variable palette)
2. Reusable bevel patterns as utility classes
3. Global element resets (buttons, inputs, selects get Win98 treatment globally)
4. Font face declarations if needed

**Import order:**
```css
/* App.css - top of file */
@import './win98.css';

/* Then App-specific layout styles */
```

### Decision 3: Bevel Patterns via CSS Custom Properties for Box-Shadow

**Recommendation: Define box-shadow patterns as CSS custom properties.**

CSS custom properties can hold complex values including full `box-shadow` declarations. This avoids repetition and ensures consistency.

```css
/* In win98.css */
:root {
  /* Reusable bevel patterns */
  --w98-raised:
    inset -1px -1px 0px 0px var(--w98-btn-dk-shadow),
    inset 1px 1px 0px 0px var(--w98-btn-highlight),
    inset -2px -2px 0px 0px var(--w98-btn-shadow),
    inset 2px 2px 0px 0px var(--w98-btn-light);

  --w98-sunken:
    inset 1px 1px 0px 0px var(--w98-btn-shadow),
    inset -1px -1px 0px 0px var(--w98-btn-highlight),
    inset 2px 2px 0px 0px var(--w98-btn-dk-shadow),
    inset -2px -2px 0px 0px var(--w98-btn-light);

  --w98-pressed:
    inset 1px 1px 0px 0px var(--w98-btn-dk-shadow),
    inset -1px -1px 0px 0px var(--w98-btn-highlight),
    inset 2px 2px 0px 0px var(--w98-btn-shadow),
    inset -2px -2px 0px 0px var(--w98-btn-light);

  --w98-field:
    inset -1px -1px 0px 0px var(--w98-btn-highlight),
    inset 1px 1px 0px 0px var(--w98-btn-shadow),
    inset -2px -2px 0px 0px var(--w98-btn-light),
    inset 2px 2px 0px 0px var(--w98-btn-dk-shadow);

  --w98-window-border:
    inset -1px -1px 0px 0px var(--w98-btn-dk-shadow),
    inset 1px 1px 0px 0px var(--w98-btn-highlight),
    inset -2px -2px 0px 0px var(--w98-btn-shadow),
    inset 2px 2px 0px 0px var(--w98-btn-light),
    0px 0px 0px 1px var(--w98-btn-dk-shadow);
}
```

**Usage in component CSS:**
```css
.toolbar { box-shadow: var(--w98-raised); }
.status-bar { box-shadow: var(--w98-sunken); }
button:active { box-shadow: var(--w98-pressed); }
input, textarea { box-shadow: var(--w98-field); }
```

**Why this works:** Chromium (which Electron uses) fully supports complex values in CSS custom properties. The `var()` references within the shadow values resolve correctly at computed time.

**Limitation:** You cannot combine a bevel variable with an additional external shadow using comma separation in the same `box-shadow` property, because the variable already contains commas. If a component needs both bevel AND drop shadow, use an outer wrapper element for the drop shadow or use `filter: drop-shadow()` for the outer shadow.

### Decision 4: Theme Toggle Removal Strategy

**Files to modify:**

| File | Action | Details |
|------|--------|---------|
| `src/hooks/useTheme.ts` | DELETE entirely | No longer needed |
| `src/components/ToolBar/Toolbar.tsx` | MODIFY | Remove `useTheme` import, `cycleTheme`, theme button |
| `src/components/MapSettingsPanel/MapSettingsPanel.tsx` | MODIFY | Remove `useTheme` import, Appearance section |
| `src/App.css` | MODIFY | Remove `.theme-light` block, remove Tier 1+2 variables |

**Step-by-step removal:**

1. **Remove from ToolBar:**
   - Delete `import { useTheme, Theme } from '../../hooks/useTheme'`
   - Delete `const { theme, setTheme } = useTheme()`
   - Delete `cycleTheme()` function
   - Delete `themeIcons` and `themeLabels` objects
   - Delete the theme cycle button JSX (lines 185-192)

2. **Remove from MapSettingsPanel:**
   - Delete `import { useTheme, Theme } from '../../hooks/useTheme'`
   - Delete `const { theme, setTheme } = useTheme()` (line 84)
   - Delete the entire "Appearance" settings section (lines 245-258)

3. **Remove the hook file:**
   - Delete `src/hooks/useTheme.ts` entirely

4. **Clean up App.css:**
   - Remove all Tier 1 primitive tokens (`--color-dark-*`, `--color-cream-*`, etc.)
   - Remove all Tier 2 semantic tokens (`--bg-primary`, `--text-secondary`, etc.)
   - Remove entire `.theme-light { ... }` block
   - The new `win98.css` import replaces all of this

5. **Clean up localStorage:**
   - The old 'theme' key in localStorage becomes inert. No action needed; it simply goes unused.

**What to keep:**
- The class-on-root pattern is no longer needed. No class toggle mechanism required.
- The `@import './win98.css'` at top of `App.css` replaces the variable system.

### Decision 5: Win98 Control Styles - Global CSS Targeting HTML Elements

**Recommendation: Global element targeting in `win98.css` for base controls, component-scoped for layout.**

Win98's visual language applies uniformly to ALL buttons, ALL inputs, ALL selects. This is best handled at the element level, not per-component:

```css
/* In win98.css - Global control styles */

/* All buttons get Win98 raised look */
button {
  background: var(--w98-surface);
  border: none;
  padding: 4px 12px;
  font-family: var(--w98-font-family);
  font-size: var(--w98-font-size);
  box-shadow: var(--w98-raised);
  cursor: pointer;
  min-height: 23px;
}

button:active:not(:disabled) {
  box-shadow: var(--w98-pressed);
  padding: 5px 11px 3px 13px;  /* Offset for pressed feel */
}

button:focus-visible {
  outline: 1px dotted #000000;
  outline-offset: -4px;
}

button:disabled {
  color: var(--w98-text-disabled);
}

/* All text inputs get Win98 sunken field look */
input[type="text"],
input[type="number"],
textarea,
select {
  background: var(--w98-window);
  border: none;
  padding: 3px 4px;
  font-family: var(--w98-font-family);
  font-size: var(--w98-font-size);
  color: var(--w98-text);
  box-shadow: var(--w98-field);
}

input[type="text"]:focus,
input[type="number"]:focus,
textarea:focus {
  outline: none;
}

/* Range sliders */
input[type="range"] {
  -webkit-appearance: none;
  background: transparent;
  height: 21px;
}

input[type="range"]::-webkit-slider-track {
  height: 2px;
  background: var(--w98-surface);
  box-shadow:
    inset 1px 1px 0px var(--w98-btn-shadow),
    inset -1px -1px 0px var(--w98-btn-highlight);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px;
  height: 21px;
  background: var(--w98-surface);
  box-shadow: var(--w98-raised);
}
```

**Why global?**
- Consistent: Every button in the app automatically gets Win98 styling
- Less CSS: No need to repeat `.win95-button` class on every button
- Maintainable: Change button style once, changes everywhere
- Matches Win98 reality: The OS applied a uniform control style

**Component-scoped CSS remains for:**
- Layout (flexbox, grid, positioning)
- Component-specific dimensions
- Overrides for special cases (e.g., toolbar buttons may be smaller)
- Canvas-related styles
- Scrollbar dimensions and positioning

### Decision 6: react-resizable-panels Handle Styling

**Recommendation: Style handles as Win98 raised bars. Fully achievable with CSS.**

The library exposes `className` on `PanelResizeHandle` and adds `data-resize-handle-active` during drag. The current codebase already uses both.

**Current handle styling (App.css):**
```css
.resize-handle-vertical {
  flex: 0 0 4px;
  background-color: var(--border-subtle);
  /* ... box-shadow for subtle 3D effect */
}
```

**Win98 handle replacement:**
```css
.resize-handle-vertical {
  flex: 0 0 4px;
  background-color: var(--w98-surface);
  box-shadow:
    inset -1px 0 0 0 var(--w98-btn-dk-shadow),
    inset 1px 0 0 0 var(--w98-btn-highlight),
    inset -2px 0 0 0 var(--w98-btn-shadow),
    inset 2px 0 0 0 var(--w98-btn-light);
  cursor: col-resize;
}

.resize-handle-horizontal {
  flex: 0 0 4px;
  background-color: var(--w98-surface);
  box-shadow:
    inset 0 -1px 0 0 var(--w98-btn-dk-shadow),
    inset 0 1px 0 0 var(--w98-btn-highlight),
    inset 0 -2px 0 0 var(--w98-btn-shadow),
    inset 0 2px 0 0 var(--w98-btn-light);
  cursor: row-resize;
}
```

**Constraints from the library (cannot override):**
- `display`, `flex-direction`, `flex-wrap` on PanelGroup
- `overflow: hidden` is default on panels

These do not conflict with Win98 styling, which only affects visual properties (colors, shadows, cursors).

### Decision 7: Electron Window Chrome - Keep Native, No Frameless

**Recommendation: Keep the native Electron window frame. Do NOT go frameless.**

**Rationale:**

1. **Cost-benefit:** A custom frameless Win98 title bar requires:
   - Setting `frame: false` in BrowserWindow
   - Building a custom title bar component with minimize/maximize/close buttons
   - Implementing `-webkit-app-region: drag` and `no-drag` zones
   - Handling window state (maximize, restore, minimize) via IPC
   - Handling double-click to maximize, snap to edges, etc.
   - Testing on Windows for edge cases (DPI scaling, multi-monitor)

   This is substantial work for a cosmetic feature on the outer chrome.

2. **Win98 authenticity vs. practical UX:** The native Windows title bar on modern Windows looks different from Win98, but it provides OS-level window management that users expect. A fake Win98 title bar would look authentic but lose snap-to-edge, aero shake, and taskbar thumbnails.

3. **Scope containment:** The milestone is about reskinning the *application content*. The window frame is OS-level chrome. Keeping it native keeps the scope focused.

4. **Future option:** If a custom title bar is desired later, it can be added as a separate milestone. The internal styling does not depend on frame choice.

**If the user later wants a custom title bar:** The approach would be:
- `electron/main.ts`: Add `frame: false` to BrowserWindow options
- Create `src/components/TitleBar/TitleBar.tsx` with Win98-styled title bar
- Add to top of App.tsx before ToolBar
- Wire up IPC for minimize/maximize/close

---

## Component Modification Scope

### Files Created (NEW)

| File | Purpose |
|------|---------|
| `src/win98.css` | Master Win98 theme: variables, bevel patterns, global control styles |

### Files Modified

| File | Scope of Change | Priority |
|------|-----------------|----------|
| `src/App.css` | Remove old variables + theme-light block; add `@import './win98.css'`; update layout styles to use new vars; update resize handles; remove transition properties | P0 - Foundation |
| `src/components/ToolBar/Toolbar.tsx` | Remove theme toggle button and useTheme import | P0 - Theme removal |
| `src/components/ToolBar/ToolBar.css` | Replace all vars; Win98 toolbar styling (raised bar); toolbar buttons get Win98 bevels | P1 - Controls |
| `src/components/MapCanvas/MapCanvas.css` | Win98 scrollbars (raised arrows, sunken track, raised thumb, dithered track pattern) | P1 - Scrollbars |
| `src/components/StatusBar/StatusBar.css` | Win98 status bar (sunken sections, surface background) | P1 - Controls |
| `src/components/TilesetPanel/TilesetPanel.css` | Update to new vars | P1 - Panels |
| `src/components/TilePalette/TilePalette.css` | Fix undefined var refs; Win98 styling | P1 - Panels |
| `src/components/AnimationPanel/AnimationPanel.css` | Win98 panel styling, slider, button | P1 - Panels |
| `src/components/AnimationPreview/AnimationPreview.css` | Fix undefined var refs; Win98 styling | P1 - Panels |
| `src/components/MapSettingsDialog/MapSettingsDialog.css` | Already mostly Win98. Migrate hardcoded values to new CSS vars | P2 - Polish |
| `src/components/MapSettingsPanel/MapSettingsPanel.tsx` | Remove useTheme import and Appearance section | P0 - Theme removal |
| `src/components/MapSettingsPanel/MapSettingsPanel.css` | Replace vars; Win98 input/slider/checkbox styling | P1 - Controls |
| `src/components/Minimap/Minimap.css` | Fix undefined var refs; Win98 border | P2 - Polish |
| `src/components\TabbedBottomPanel/TabbedBottomPanel.css` | Win98 tab styling | P2 - Polish |
| `src/components/RightSidebar/RightSidebar.css` | Fix undefined var refs; update to new vars | P2 - Polish |

### Files Deleted

| File | Reason |
|------|--------|
| `src/hooks/useTheme.ts` | Theme toggling system no longer needed |

### Files Unchanged

| File | Reason |
|------|--------|
| `electron/main.ts` | Keep native frame (Decision 7) |
| `electron/preload.ts` | No theme-related IPC |
| `src/App.tsx` | Layout structure stays the same (PanelGroup hierarchy). Only change: remove useTheme if used (currently not used in App.tsx). CSS class names on elements can stay since they are layout-structural, not theme-specific. |
| All `.tsx` component files (except ToolBar and MapSettingsPanel) | No JSX changes needed. CSS changes handle the visual overhaul. Class names can remain as-is. |

---

## Suggested Build Order

The build order respects dependencies between changes.

### Phase 1: Foundation (Must be first)

**Create `win98.css` + strip old theme system**

1. Create `src/win98.css` with all CSS custom properties and bevel pattern variables
2. Add global control styles (button, input, select, range) to `win98.css`
3. Add `@import './win98.css'` to top of `App.css`
4. Remove old Tier 1 + Tier 2 variables from `App.css`
5. Remove `.theme-light { ... }` block from `App.css`
6. Remove `useTheme` from ToolBar and MapSettingsPanel
7. Delete `src/hooks/useTheme.ts`

**Why first:** Everything else depends on the new variable system being in place. The global control styles mean many components will get partial Win98 treatment just from this step.

**Verification:** App should render with Win98 gray surface, buttons should have bevels. Some components may look broken where they referenced old vars -- that is expected and fixed in Phase 2.

### Phase 2: Core Chrome (ToolBar + StatusBar + Resize Handles)

**The structural frame of the application**

1. Update `App.css` layout styles: surface background on `.app`, resize handle bevels
2. Update `ToolBar.css`: Win98 raised toolbar, toolbar button bevels, active/pressed states
3. Update `StatusBar.css`: Win98 status bar with sunken field sections
4. Add `.panel-title-bar` Win98 styling to `App.css` (already partially exists)

**Why second:** These are the most visible chrome elements. Getting toolbar + status bar + resize handles right makes the app "feel" Win98 even before panels are done.

### Phase 3: Panel Styling (Tile palette, Animation panel, Settings)

**All panel content areas**

1. Update `TilesetPanel.css` and `TilePalette.css`
2. Update `AnimationPanel.css` and `AnimationPreview.css`
3. Update `MapSettingsPanel.css`
4. Update `RightSidebar.css`
5. Update `TabbedBottomPanel.css`

**Why third:** Panels are content areas within the chrome frame. Once the frame looks right, panel interiors can be styled systematically.

### Phase 4: Scrollbars + Specialty Controls

**Custom scrollbar overhaul in MapCanvas**

1. Update `MapCanvas.css` scrollbar styles: raised arrow buttons, sunken tracks, raised thumbs
2. Consider adding Win98 dithered track pattern (checkered gray/white)
3. Update `Minimap.css` border treatment

**Why fourth:** Scrollbars are visually important but self-contained. They do not block other work.

### Phase 5: Dialog Polish

**MapSettingsDialog refinement**

1. Migrate hardcoded color values in `MapSettingsDialog.css` to use new `--w98-*` vars
2. Verify tab styling matches Win98 property sheet tabs
3. Ensure button styles use global button styles (may need minimal overrides)

**Why last:** The MapSettingsDialog already has the most Win98-accurate styling in the codebase. This phase is refinement, not creation.

---

## Data Flow Changes

### Removed Data Flow

```
BEFORE:
localStorage('theme') --> useTheme hook --> document.classList --> CSS :root/.theme-light
                      \--> ToolBar (cycle button UI)
                       \--> MapSettingsPanel (select dropdown UI)

AFTER:
(nothing -- static CSS, no runtime theme state)
```

### Unchanged Data Flow

- Zustand editor state (tools, map data, viewport) -- untouched
- react-resizable-panels layout state -- untouched
- Electron IPC for file operations -- untouched
- Canvas rendering logic -- untouched

---

## Integration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Undefined CSS var references (`--border-color`, `--accent-color`) break during migration | HIGH (they exist today) | LOW (already broken) | Fix as part of Phase 1; map to new `--w98-*` vars |
| Global button/input styles conflict with specific component needs | MEDIUM | LOW | Component CSS can override global styles; specificity handles this naturally |
| `box-shadow` bevel var inside another `box-shadow` property causes syntax issues | LOW | MEDIUM | Test in Chromium/Electron; fallback to direct values if needed |
| MapSettingsDialog looks inconsistent after Phase 1 (mix of old hardcoded + new vars) | MEDIUM | LOW | Phase 5 cleanup; dialog already looks Win98 so visual impact is minor |
| Font rendering differs between MS Sans Serif and fallback Arial | LOW | LOW | Accept fallback; pixel-perfect font matching is not critical for editor usability |

---

## Win98 Visual Reference Patterns

### The 3D Edge Model

Every Win98 3D element uses four edge colors in a specific arrangement:

```
+--ButtonHighlight(#FFF)--ButtonLight(#DFD)--+
|                                             |
B                                             B
u  ButtonFace (#C0C0C0) surface              u
t                                             t
t                                             t
o                                             o
n                                             n
L                                             S
i                                             h
g                                             a
h                                             d
t                                             o
|                                             w
+--ButtonShadow(#808)--ButtonDkShadow(#000)--+
```

- **Raised** (buttons, toolbar, menu bar): Light on top-left, dark on bottom-right
- **Sunken** (input fields, status bar sections): Dark on top-left, light on bottom-right
- **Pressed** (button being clicked): Sunken but with content offset 1px right and down
- **Field** (text inputs, list boxes): Deeper sunken with reversed inner/outer

### Win98 Scrollbar Pattern

```
+---+--------------------+---+
| < |  [===thumb===]     | > |   <-- horizontal
+---+--------------------+---+

Arrow buttons: raised bevel, #c0c0c0 surface
Track: checkered pattern (alternating #c0c0c0 and #ffffff pixels) OR solid #c0c0c0
Thumb: raised bevel, #c0c0c0 surface
Corner piece: flat #c0c0c0
```

### Win98 Status Bar Pattern

```
+--sunken--+--sunken--+--sunken--+---------------------------+
| x:12 y:5 |  Tile:42 |  100%    |                           |
+-----------+----------+----------+---------------------------+
```

Each section is a sunken rectangle within the status bar. The status bar itself sits at the bottom of the window with a raised top edge.

### Win98 Toolbar Pattern

```
+=========================================================+  <-- raised top/left edge
| [New][Open][Save] | [Undo][Redo] | [tools...] |  info   |
+=========================================================+  <-- sunken bottom/right edge
```

Toolbar has a raised bevel. Buttons within it are flat by default, get a raised bevel on hover, and get a pressed (sunken) bevel when clicked/active.

---

## Sources

- [98.css - Design system for Windows 98 UIs](https://jdan.github.io/98.css/) - Visual reference for colors and patterns
- [98.css GitHub source](https://github.com/jdan/98.css) - CSS custom property definitions
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Handle styling capabilities, data attributes
- [Electron Custom Window Styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles) - Frameless window documentation
- [Windows System Colours by OS](https://gist.github.com/zaxbux/64b5a88e2e390fb8f8d24eb1736f71e0) - System color hex values
- Existing codebase: `MapSettingsDialog.css` (internal Win98 pattern reference already in project)
