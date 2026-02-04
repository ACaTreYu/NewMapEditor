# Technology Stack: Win98 Pixel-Accurate CSS Reskin

**Project:** AC Map Editor - Windows 98 Visual Theme Overhaul
**Researched:** 2026-02-04
**Focus:** CSS techniques for pixel-accurate Windows 98 recreation, no new dependencies
**Confidence:** HIGH - Primary source is 98.css v0.1.21 source code (complete extraction verified)

## Executive Summary

No new npm dependencies are needed. The Win98 look is achieved entirely through CSS custom properties, `box-shadow` patterns, and inline SVG data URIs. The 98.css library by Jordan Scales serves as the authoritative visual reference -- its complete source has been extracted and analyzed below. The project already has partial Win98 styling in `MapSettingsDialog.css` (buttons, inputs, sliders) that uses the correct patterns. This milestone extends those patterns to every control in the application.

**Recommendation:** Hand-write all Win98 CSS using the project's existing CSS custom property system. Replace Tier 1 primitive tokens with Win98 system colors. Replace Tier 2 semantic tokens with Win98 border/shadow composite variables. Add new composite variables for the 98.css box-shadow bevel patterns. No fonts to install (use system Arial at 11px with `-webkit-font-smoothing: none` for the Electron/Chromium environment).

## New Dependencies

**None.** Zero new packages.

| Category | Decision | Rationale |
|----------|----------|-----------|
| 98.css library | DO NOT install | Use as visual reference only. Installing it would conflict with existing CSS custom property system and require fighting its global styles. Hand-writing gives full control. |
| OS-GUI.js | DO NOT install | Includes JavaScript window management we do not need. CSS portion less documented than 98.css. |
| XP.css / 7.css | DO NOT install | Wrong OS generation. |
| Win98 fonts (Pixelated MS Sans Serif) | DO NOT install | 98.css bundles WOFF2 bitmap font recreations, but Electron's Chromium renders system Arial at 11px with `-webkit-font-smoothing: none` acceptably for a desktop app. Avoids font loading complexity. If pixel-perfect text is later desired, the 98.css WOFF2 files (7 KB each) can be added. |

---

## Win98 Color Palette (Exact Values)

These are the colors extracted directly from 98.css source and verified against Windows 98 "Windows Standard" theme system color constants.

### Core System Colors

| CSS Variable Name | Hex Value | Win32 Constant | Role |
|-------------------|-----------|----------------|------|
| `--surface` | `#c0c0c0` | `COLOR_BTNFACE` / `COLOR_3DFACE` | Base surface for all controls, window backgrounds, toolbar, panels |
| `--button-highlight` | `#ffffff` | `COLOR_BTNHIGHLIGHT` / `COLOR_3DHIGHLIGHT` | Bright edge of raised elements (top-left outer) |
| `--button-face` | `#dfdfdf` | `COLOR_3DLIGHT` | Light edge of raised elements (top-left inner) |
| `--button-shadow` | `#808080` | `COLOR_BTNSHADOW` / `COLOR_3DSHADOW` | Dark edge of raised elements (bottom-right inner) |
| `--window-frame` | `#0a0a0a` | `COLOR_3DDKSHADOW` | Darkest edge of raised elements (bottom-right outer). Not pure black. |
| `--text-color` | `#222222` | `COLOR_BTNTEXT` | Standard control text |
| `--dialog-blue` | `#000080` | `COLOR_ACTIVECAPTION` | Title bar gradient start, selection highlight |
| `--dialog-blue-light` | `#1084d0` | N/A | Title bar gradient end |
| `--dialog-gray` | `#808080` | `COLOR_INACTIVECAPTION` | Inactive title bar gradient start |
| `--dialog-gray-light` | `#b5b5b5` | N/A | Inactive title bar gradient end |
| `--link-blue` | `#0000ff` | N/A | Hyperlink color |

### Important Clarifications

- **`--window-frame` is `#0a0a0a`, NOT `#000000`.** 98.css uses near-black, not pure black, for the darkest edge. This is a subtle but intentional detail.
- **`--button-face` is `#dfdfdf`, NOT `#c0c0c0`.** The "light" inner bevel edge is lighter than the surface itself. This creates the layered 3D effect.
- **`--surface` (`#c0c0c0`) is "silver" in CSS named colors.** The compiled 98.css uses `silver` for `--surface`.
- **White (`#ffffff`) is used as the brightest highlight**, not a lighter grey. This is the key reason Win98 buttons look so crisp -- maximum contrast between highlight and shadow.

### Additional Colors Used in 98.css

| Hex | Where Used |
|-----|------------|
| `#c0c7c8` | Slider thumb face (slightly blue-tinted grey -- matches Win98 scrollbar thumb) |
| `#87888f` | Slider thumb shadow edge |
| `#a9a9a9` | Range track shadow (`darkgrey` CSS named color) |
| `#ffffcc` | Not in 98.css, but used in existing project for input focus highlight |

---

## Box-Shadow Bevel System (The Core Technique)

This is the fundamental pattern that makes Win98 CSS work. Every Win98 control uses `box-shadow` with multiple `inset` layers (zero blur, zero spread) to simulate beveled 3D edges. The pattern works because `inset box-shadow` at different pixel offsets creates concentric rectangular borders of different colors.

### Why box-shadow Instead of border

1. **Borders can only have one color per side.** Win98 bevels need TWO colors per side (outer + inner).
2. **box-shadow layers stack.** Multiple `inset` shadows at 1px and 2px create the two-layer effect.
3. **No layout impact.** `box-shadow` does not affect element sizing, unlike `border`.
4. **Easy state toggling.** Switching from raised to sunken is just swapping the shadow variable.

### The Four Border Variables (CRITICAL)

These four composite variables from 98.css are the building blocks for ALL controls:

```css
/* RAISED BUTTON (normal state) - light on top-left, dark on bottom-right */
--border-raised-outer: inset -1px -1px var(--window-frame),    /* bottom-right: near-black */
                       inset 1px 1px var(--button-highlight);  /* top-left: white */
--border-raised-inner: inset -2px -2px var(--button-shadow),   /* bottom-right: #808080 */
                       inset 2px 2px var(--button-face);       /* top-left: #dfdfdf */

/* SUNKEN BUTTON (pressed/inset state) - dark on top-left, light on bottom-right */
--border-sunken-outer: inset -1px -1px var(--button-highlight),  /* bottom-right: white */
                       inset 1px 1px var(--window-frame);        /* top-left: near-black */
--border-sunken-inner: inset -2px -2px var(--button-face),       /* bottom-right: #dfdfdf */
                       inset 2px 2px var(--button-shadow);       /* top-left: #808080 */
```

**How to read this:** Each variable contains two `inset` shadow declarations. Negative offsets paint bottom-right edges. Positive offsets paint top-left edges. The 1px layer is the outer edge, the 2px layer is the inner edge.

**Usage:** Always combine outer + inner: `box-shadow: var(--border-raised-outer), var(--border-raised-inner);`

### Visual Breakdown of a Raised Button

```
+--+------------------------------+--+
|WH|            #dfdfdf            |  |  WH = #ffffff (button-highlight)
+--+                               +--+
|  |                               |GR|  GR = #808080 (button-shadow)
|  |         #c0c0c0 surface       |  |
|  |                               |  |
+--+                               +--+
|  |            #808080            |BK|  BK = #0a0a0a (window-frame)
+--+------------------------------+--+

Outer ring (1px): white top-left, near-black bottom-right
Inner ring (2px): #dfdfdf top-left, #808080 bottom-right
```

### Window Border Variant

Windows use a slightly different mapping -- `button-face` and `button-highlight` are swapped in the outer ring:

```css
--border-window-outer: inset -1px -1px var(--window-frame),
                       inset 1px 1px var(--button-face);      /* dfdfdf, not white */
--border-window-inner: inset -2px -2px var(--button-shadow),
                       inset 2px 2px var(--button-highlight);  /* white, not dfdfdf */
```

This creates a subtly different feel -- windows have white on the INNER ring, buttons have white on the OUTER ring.

### Field/Input Border (Sunken Container)

Text inputs, checkboxes, list boxes, and other "content containers" use a different order that emphasizes the sunken appearance:

```css
--border-field: inset -1px -1px var(--button-highlight),   /* bottom-right outer: white */
                inset 1px 1px var(--button-shadow),         /* top-left outer: #808080 */
                inset -2px -2px var(--button-face),          /* bottom-right inner: #dfdfdf */
                inset 2px 2px var(--window-frame);           /* top-left inner: near-black */
```

Note: This is a single 4-layer variable, not split into outer/inner. The shadow/frame colors are swapped compared to normal sunken borders -- `button-shadow` is outer and `window-frame` is inner, creating a deeper inset look.

### Status Bar Field Border (Shallow Inset)

Status bar sections use a simplified 2-layer sunken effect:

```css
--border-status-field: inset -1px -1px var(--button-face),    /* #dfdfdf */
                       inset 1px 1px var(--button-shadow);     /* #808080 */
```

### Tab Border (Open Bottom)

Tab items omit the bottom edge entirely:

```css
--border-tab: inset -1px 0 var(--window-frame),     /* right: near-black, NO bottom */
              inset 1px 1px var(--button-face),       /* left + top: #dfdfdf */
              inset -2px 0 var(--button-shadow),      /* right inner: #808080, NO bottom */
              inset 2px 2px var(--button-highlight);   /* left + top inner: white */
```

The `0` y-value on negative insets means no bottom shadow -- the tab "opens" downward into the content area.

### Default (Focused) Button Border

The "default" button (usually OK/Enter) has a thicker border with an extra black outline:

```css
--default-button-border-raised-outer: inset -2px -2px var(--window-frame),
                                      inset 1px 1px var(--window-frame);
--default-button-border-raised-inner: inset 2px 2px var(--button-highlight),
                                      inset -3px -3px var(--button-shadow),
                                      inset 3px 3px var(--button-face);
```

---

## Control-by-Control CSS Patterns

### Buttons (Normal)

```css
button {
  background: var(--surface);                        /* #c0c0c0 */
  border: none;
  border-radius: 0;
  box-shadow: var(--border-raised-outer), var(--border-raised-inner);
  color: transparent;
  text-shadow: 0 0 var(--text-color);               /* Trick: makes text render over shadow */
  min-width: 75px;
  min-height: 23px;
  padding: 0 12px;
  font-family: "MS Sans Serif", Arial, sans-serif;
  font-size: 11px;
  -webkit-font-smoothing: none;
}

button:active {
  box-shadow: var(--border-sunken-outer), var(--border-sunken-inner);
  text-shadow: 1px 1px var(--text-color);            /* 1px offset simulates pressed text shift */
}

button:focus {
  outline: 1px dotted #000000;
  outline-offset: -4px;                              /* Focus rect is INSIDE the button */
}

button:disabled {
  color: var(--button-shadow);                        /* Grey text */
  text-shadow: 1px 1px 0 var(--button-highlight);    /* White offset = embossed disabled look */
}
```

**Key details:**
- The `color: transparent` + `text-shadow: 0 0` trick is how 98.css renders text that shifts on press. Normal CSS does not let you offset text position on `:active`, but `text-shadow` offset achieves it.
- Focus outline is INSIDE the button (`outline-offset: -4px`), not outside. This is authentic Win98.
- Disabled text has a white shadow 1px below-right, creating the classic "embossed" disabled text look.

### Toolbar Buttons (Small, Icon-Only)

Toolbar buttons in Win98 behave differently from dialog buttons:
- **No border in normal state** (flat/transparent)
- **Raised border on hover** (98.css does not model this, but Win98 IE4+ toolbars did)
- **Sunken border when active/pressed**

```css
.toolbar-button {
  background: transparent;
  border: none;
  padding: 3px;
  min-width: auto;
  min-height: auto;
}

.toolbar-button:hover {
  box-shadow: var(--border-raised-outer), var(--border-raised-inner);
  background: var(--surface);
}

.toolbar-button:active,
.toolbar-button.active {
  box-shadow: var(--border-sunken-outer), var(--border-sunken-inner);
  background: var(--surface);
}
```

### Toolbar Separator

```css
.toolbar-separator {
  width: 2px;
  height: 22px;
  margin: 0 2px;
  box-shadow: inset 1px 0 var(--button-shadow),     /* Left line: dark */
              inset -1px 0 var(--button-highlight);   /* Right line: light */
}
```

### Text Inputs

```css
input[type="text"], textarea, select {
  background-color: var(--button-highlight);          /* White, not grey */
  border: none;
  border-radius: 0;
  box-shadow: var(--border-field);                    /* Deep inset */
  padding: 3px 4px;
  font-family: "MS Sans Serif", Arial, sans-serif;
  font-size: 11px;
  height: 21px;
  -webkit-font-smoothing: none;
  appearance: none;
}

input:disabled, input:read-only {
  background-color: var(--surface);                    /* Grey when disabled */
}
```

### Checkboxes

98.css uses hidden native checkboxes with `::before` and `::after` pseudo-elements on the adjacent label. The checkbox box itself is a white square with `--border-field` inset shadow. The checkmark is an inline SVG via `background-image`.

```css
input[type="checkbox"] {
  appearance: none;
  position: fixed;
  opacity: 0;
}

input[type="checkbox"] + label {
  position: relative;
  margin-left: 19px;                                   /* Space for the fake checkbox */
  line-height: 13px;
}

input[type="checkbox"] + label::before {
  content: "";
  position: absolute;
  left: -19px;
  width: 13px;
  height: 13px;
  background: var(--button-highlight);                  /* White box */
  box-shadow: var(--border-field);                      /* Sunken border */
}

input[type="checkbox"]:checked + label::after {
  content: "";
  position: absolute;
  left: -16px;                                          /* 3px from left edge of box */
  width: 7px;
  height: 7px;
  background: url("data:image/svg+xml,...checkmark...");  /* Inline SVG checkmark */
}

input[type="checkbox"]:active + label::before {
  background: var(--surface);                            /* Grey when pressed */
}

input[type="checkbox"]:disabled + label::before {
  background: var(--surface);                            /* Grey when disabled */
}
```

**Checkmark SVG (from 98.css):**
```
data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='%23000'/%3E%3C/svg%3E
```

Disabled checkmark uses `fill='gray'` instead of `fill='%23000'`.

### Radio Buttons

Radio buttons in 98.css use SVG backgrounds for BOTH the circular border and the dot. The circle cannot be achieved with `box-shadow` + `border-radius` at pixel-accurate fidelity because CSS anti-aliases circles. The SVG approach renders pixel-perfect circles.

```css
input[type="radio"] + label::before {
  /* 12x12 SVG with pixel-art circle border */
  background: url("data:image/svg+xml,...radio-border...");
  width: 12px;
  height: 12px;
}

input[type="radio"]:checked + label::after {
  /* 4x4 SVG dot */
  background: url("data:image/svg+xml,...radio-dot...");
  width: 4px;
  height: 4px;
}
```

**Practical recommendation for this project:** Since we are NOT pixel-matching at the individual-pixel level for radio circles, a simpler CSS approach works well enough:

```css
input[type="radio"] + label::before {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  box-shadow: inset -1px -1px var(--button-highlight),
              inset 1px 1px var(--button-shadow),
              inset -2px -2px var(--button-face),
              inset 2px 2px var(--window-frame);
}
```

However, if pixel-perfect is truly required, use the 98.css SVG data URIs directly (they are MIT licensed).

### Tabs

```css
/* Tab list container */
menu[role="tablist"] {
  display: flex;
  list-style: none;
  margin: 0 0 -2px 0;                                  /* Overlap with content border */
  padding-left: 3px;
}

/* Individual tab */
menu[role="tablist"] > li {
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  box-shadow: var(--border-tab);                        /* Open-bottom bevel */
  z-index: 1;
}

/* Selected tab */
menu[role="tablist"] > li[aria-selected="true"] {
  background-color: var(--surface);
  padding-bottom: 2px;                                  /* Extends down to cover border */
  margin-top: -2px;                                     /* Slightly taller */
  margin-left: -3px;                                    /* Overlaps neighbors */
  z-index: 8;                                           /* Above content border */
}

/* Tab content panel (window below tabs) */
.window[role="tabpanel"] {
  position: relative;
  z-index: 2;                                           /* Below selected tab */
  box-shadow: var(--border-window-outer), var(--border-window-inner);
}
```

**Key detail:** The selected tab's `margin-bottom: -2px` (from the container) plus `padding-bottom: 2px` makes it visually connect to the panel below by painting over the panel's top border.

### Scrollbars (Webkit/Chromium)

Since this is an Electron app (Chromium), `::-webkit-scrollbar` pseudo-elements work perfectly:

```css
::-webkit-scrollbar {
  width: 16px;
}
::-webkit-scrollbar:horizontal {
  height: 17px;
}

/* Track: dithered grey/white pattern */
::-webkit-scrollbar-track {
  background-image: url("data:image/svg+xml,...2x2-checkerboard...");
}

/* Thumb: raised button */
::-webkit-scrollbar-thumb {
  background-color: var(--button-face);                  /* #dfdfdf */
  box-shadow: var(--border-raised-outer), var(--border-raised-inner);
}

/* Corner */
::-webkit-scrollbar-corner {
  background: var(--button-face);
}

/* Arrow buttons - SVG backgrounds for each direction */
::-webkit-scrollbar-button:vertical:start {
  height: 17px;
  background-image: url("data:image/svg+xml,...up-arrow...");
}
::-webkit-scrollbar-button:vertical:end {
  height: 17px;
  background-image: url("data:image/svg+xml,...down-arrow...");
}
::-webkit-scrollbar-button:horizontal:start {
  width: 16px;
  background-image: url("data:image/svg+xml,...left-arrow...");
}
::-webkit-scrollbar-button:horizontal:end {
  width: 16px;
  background-image: url("data:image/svg+xml,...right-arrow...");
}
```

**Scrollbar track dither pattern (from 98.css):**
A 2x2 SVG checkerboard of silver and white that tiles:
```
data:image/svg+xml;charset=utf-8,%3Csvg width='2' height='2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M1 0H0v1h1v1h1V1H1V0z' fill='silver'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 0H1v1H0v1h1V1h1V0z' fill='%23fff'/%3E%3C/svg%3E
```

**Scrollbar arrow button SVGs:** The 98.css library embeds 16x17 SVG images for each arrow button. Each SVG contains:
1. The raised bevel border (matching `--border-raised`)
2. A silver fill center
3. A black arrow glyph

These can be extracted directly from the compiled 98.css source (MIT license).

### Sliders (Range Inputs)

98.css sliders use SVG-based thumbs, but the existing project already has working Win98-style sliders in `MapSettingsDialog.css` using pure `box-shadow`. The existing approach is sufficient:

```css
/* Track: thin black line with sunken bevel */
input[type="range"]::-webkit-slider-runnable-track {
  height: 2px;
  background: black;
  border-right: 1px solid grey;
  border-bottom: 1px solid grey;
  box-shadow: 1px 0 0 white, 1px 1px 0 white, 0 1px 0 white,
              -1px 0 0 darkgrey, -1px -1px 0 darkgrey, 0 -1px 0 darkgrey,
              -1px 1px 0 white, 1px -1px darkgrey;
}

/* Thumb: raised button style (simplified from project's existing pattern) */
input[type="range"]::-webkit-slider-thumb {
  width: 11px;
  height: 21px;
  background: var(--surface);
  box-shadow: var(--border-raised-outer), var(--border-raised-inner);
  transform: translateY(-8px);
}
```

### Window/Dialog Frame

```css
.window {
  background: var(--surface);
  padding: 3px;
  box-shadow: var(--border-window-outer), var(--border-window-inner);
}
```

### Title Bar

```css
.title-bar {
  background: linear-gradient(90deg, var(--dialog-blue), var(--dialog-blue-light));
  padding: 3px 2px 3px 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-bar-text {
  font-weight: bold;
  color: white;
  letter-spacing: 0;
}

/* Inactive window */
.title-bar.inactive {
  background: linear-gradient(90deg, var(--dialog-gray), var(--dialog-gray-light));
}
```

### Title Bar Buttons (Close/Min/Max)

```css
.title-bar-controls button {
  min-width: 16px;
  min-height: 14px;
  padding: 0;
  /* Standard raised border */
  box-shadow: var(--border-raised-outer), var(--border-raised-inner);
}

/* Each button has an SVG icon background */
.title-bar-controls button[aria-label="Close"] {
  background-image: url("data:image/svg+xml,...x-icon...");
  background-repeat: no-repeat;
  background-position: top 3px left 4px;
  margin-left: 2px;                                     /* Gap before close button */
}
```

### Status Bar

```css
.status-bar {
  display: flex;
  gap: 1px;
  margin: 0 1px;
}

.status-bar-field {
  box-shadow: var(--border-status-field);                /* Shallow inset */
  flex-grow: 1;
  padding: 2px 3px;
}
```

### Fieldset / Group Box

98.css uses an SVG `border-image` to create the etched/groove border. This is more pixel-accurate than CSS `border: 2px groove` which varies by browser:

```css
fieldset {
  border-image: url("data:image/svg+xml,...groupbox-border...") 2;
  padding: 10px;
  padding-block-start: 8px;
  margin: 0;
}

legend {
  background: var(--surface);                            /* Covers the border behind text */
}
```

A simpler alternative that is close enough:
```css
fieldset {
  border: 2px groove var(--surface);
}
```

### Progress Bar

```css
.progress-indicator {
  height: 32px;
  box-shadow: var(--border-sunken-inner);
  padding: 4px;
  border: none;
  appearance: none;
}

.progress-indicator-bar {
  height: 100%;
  background-color: var(--dialog-blue);                  /* Navy blue fill */
}

/* Segmented variant (classic Win98 look) */
.progress-indicator.segmented .progress-indicator-bar {
  background-color: transparent;
  background-image: linear-gradient(90deg, var(--dialog-blue) 0 16px, transparent 0 2px);
  background-repeat: repeat;
  background-size: 18px 100%;
}
```

### Sunken Panel (List View / Tree View Container)

```css
.sunken-panel {
  box-sizing: border-box;
  border: 2px groove transparent;
  border-image: url("data:image/svg+xml,...sunken-panel-border...") 2;
  overflow: auto;
  background-color: white;
}
```

### Tree View

```css
ul.tree-view {
  background: var(--button-highlight);                    /* White */
  box-shadow: var(--border-field);                        /* Deep inset */
  padding: 6px;
}

ul.tree-view ul {
  border-left: 1px dotted #808080;                        /* Dotted connector lines */
  margin-left: 16px;
  padding-left: 16px;
}
```

### Table Headers

```css
table > thead > tr > * {
  background: var(--surface);
  box-shadow: var(--border-raised-outer), var(--border-raised-inner);
  font-weight: normal;
  height: 17px;
  padding: 0 6px;
  position: sticky;
  top: 0;
}
```

### Select / Dropdown

```css
select {
  appearance: none;
  background-color: white;
  box-shadow: var(--border-field);
  padding: 3px 4px;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,...dropdown-arrow...");
  background-position: top 2px right 2px;
  background-repeat: no-repeat;
  height: 21px;
}

select:focus {
  background-color: var(--dialog-blue);                   /* Navy highlight */
  color: white;
}
```

### Disabled Text Pattern

```css
:disabled, :disabled + label {
  color: var(--button-shadow);                             /* #808080 */
}

button:disabled, :disabled + label {
  text-shadow: 1px 1px 0 var(--button-highlight);         /* White shadow = embossed look */
}
```

---

## CSS Custom Property Architecture

### Recommended Variable Structure

Replace the existing two-tier system with Win98-native variables. The current Tier 1 (primitives) and Tier 2 (semantic) approach maps well:

**Tier 1: Win98 System Colors (primitives)**
```css
:root {
  --win98-surface: #c0c0c0;
  --win98-button-highlight: #ffffff;
  --win98-button-face: #dfdfdf;
  --win98-button-shadow: #808080;
  --win98-window-frame: #0a0a0a;
  --win98-text-color: #222222;
  --win98-dialog-blue: #000080;
  --win98-dialog-blue-light: #1084d0;
  --win98-dialog-gray: #808080;
  --win98-dialog-gray-light: #b5b5b5;
  --win98-window-bg: #ffffff;
  --win98-desktop: #008080;
}
```

**Tier 2: Composite Border Variables**
```css
:root {
  --border-raised-outer: inset -1px -1px var(--win98-window-frame),
                         inset 1px 1px var(--win98-button-highlight);
  --border-raised-inner: inset -2px -2px var(--win98-button-shadow),
                         inset 2px 2px var(--win98-button-face);
  --border-sunken-outer: inset -1px -1px var(--win98-button-highlight),
                         inset 1px 1px var(--win98-window-frame);
  --border-sunken-inner: inset -2px -2px var(--win98-button-face),
                         inset 2px 2px var(--win98-button-shadow);
  --border-window-outer: inset -1px -1px var(--win98-window-frame),
                         inset 1px 1px var(--win98-button-face);
  --border-window-inner: inset -2px -2px var(--win98-button-shadow),
                         inset 2px 2px var(--win98-button-highlight);
  --border-field: inset -1px -1px var(--win98-button-highlight),
                  inset 1px 1px var(--win98-button-shadow),
                  inset -2px -2px var(--win98-button-face),
                  inset 2px 2px var(--win98-window-frame);
  --border-status-field: inset -1px -1px var(--win98-button-face),
                         inset 1px 1px var(--win98-button-shadow);
  --border-tab: inset -1px 0 var(--win98-window-frame),
                inset 1px 1px var(--win98-button-face),
                inset -2px 0 var(--win98-button-shadow),
                inset 2px 2px var(--win98-button-highlight);
}
```

**Tier 2: Semantic Mapping (backward-compatible with existing CSS)**
```css
:root {
  --bg-primary: var(--win98-surface);
  --bg-secondary: var(--win98-surface);
  --bg-tertiary: var(--win98-surface);
  --bg-hover: #d4d0c8;                                    /* Slightly warm grey for hover */
  --bg-active: var(--win98-surface);
  --border-default: var(--win98-button-shadow);
  --border-subtle: var(--win98-button-face);
  --text-primary: var(--win98-text-color);
  --text-secondary: var(--win98-text-color);
  --text-tertiary: var(--win98-button-shadow);
  --accent-primary: var(--win98-dialog-blue);
  --input-bg: var(--win98-window-bg);
  --input-border: var(--win98-window-frame);
  --scrollbar-track: var(--win98-surface);
  --scrollbar-thumb: var(--win98-button-face);
  --workspace-bg: var(--win98-button-shadow);              /* #808080 appworkspace */
}
```

### Migration Strategy

The existing `App.css` has Tier 1 dark/light primitives and Tier 2 semantic tokens. The safest migration path:

1. **Replace Tier 1 primitives** with Win98 system colors
2. **Add composite border variables** as new Tier 2 tokens
3. **Re-map existing semantic tokens** to Win98 colors
4. **Remove `.theme-light` class** entirely (single Win98 theme)
5. **Remove dark palette** variables (no longer needed)

This preserves all existing `var(--bg-primary)` etc. references in component CSS files while adding the new Win98-specific bevel variables.

---

## Typography

### Font Stack

```css
button, label, input, select, textarea, .window, .title-bar, [role="tab"] {
  font-family: "MS Sans Serif", Arial, sans-serif;
  font-size: 11px;
  -webkit-font-smoothing: none;
}
```

**Why Arial at 11px works for this project:**
- This is an Electron desktop app, not a public website. Users are on Windows.
- Arial at 11px closely matches MS Sans Serif at its native size.
- `-webkit-font-smoothing: none` in Chromium removes sub-pixel anti-aliasing, giving crisper edges.
- Avoids the complexity of bundling custom WOFF2 fonts.

**If pixel-perfect fonts are later desired:**
- Extract `ms_sans_serif.woff2` and `ms_sans_serif_bold.woff2` from 98.css (7 KB each, MIT license)
- Add `@font-face` declarations pointing to `assets/fonts/`
- Use `font-family: "Pixelated MS Sans Serif", Arial, sans-serif`

---

## What the Project Already Has Right

The existing `MapSettingsDialog.css` already uses correct 98.css patterns:

| Pattern | Status | Notes |
|---------|--------|-------|
| Raised button box-shadow | Correct | `.win95-button` matches 98.css exactly |
| Sunken input box-shadow | Correct | `.text-input` matches `--border-field` pattern |
| Title bar gradient | Correct | `linear-gradient(to right, #000080, #1084d0)` |
| Button press inversion | Correct | Shadow values properly inverted on `:active` |
| Font family | Correct | `'MS Sans Serif', Arial, sans-serif` at 11px |
| Slider track/thumb | Correct | Simplified version of 98.css pattern |
| Focus outline | Correct | `1px dotted #000000` with `outline-offset: -4px` |

What needs to be extended to ALL controls:

| Component | Current Style | Needs |
|-----------|---------------|-------|
| Toolbar buttons | Modern flat + border-radius | Win98 flat-until-hover, raised on hover, sunken on active |
| Tab bar | Modern underline active indicator | Win98 tab bevels with `--border-tab` |
| Status bar | Flat with subtle border-top | Win98 sunken field sections |
| Panel borders | 1px solid flat borders | Win98 window bevel (`--border-window-*`) |
| Resize handles | Colored accent bars | Win98 raised bar appearance |
| Right sidebar sections | Flat borders | Win98 group box or window borders |
| Scrollbars (native) | Themed via `--scrollbar-*` vars | Full Win98 scrollbar with arrow buttons |

---

## What NOT to Do

| Anti-Pattern | Why Wrong | Correct Approach |
|--------------|-----------|------------------|
| Use `border: 2px outset/inset` | Browser-dependent rendering, not pixel-accurate | Use `box-shadow` with explicit color values |
| Use `border: 2px groove/ridge` for group boxes | Varies by browser rendering engine | Use SVG `border-image` or manual double-shadow |
| Use `border-radius` anywhere except tab corners | Win98 has zero border-radius on buttons/inputs | `border-radius: 0` everywhere, `3px` only on tab top corners |
| Use CSS `filter` for hover effects | Feels modern, breaks Win98 aesthetic | Use box-shadow state changes only |
| Use CSS `transition` on borders | Win98 UI has zero animation on control state changes | Remove all `transition` properties from controls |
| Use opacity for disabled state | Win98 uses embossed text technique, not transparency | Use `color: grey` + `text-shadow: 1px 1px white` |
| Install 98.css as a dependency | Global styles conflict with existing system | Extract patterns into custom properties |
| Use CSS named colors (`grey`, `silver`) | Ambiguous across specs | Use explicit hex values |

---

## SVG Data URIs Reference

The following SVGs from 98.css can be reused directly (MIT license). These are the exact encoded URIs from the compiled stylesheet:

### Checkmark (7x7, for checked checkbox)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='%23000'/%3E%3C/svg%3E
```

### Checkmark Disabled (7x7, grey)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='gray'/%3E%3C/svg%3E
```

### Close Button Icon (8x7)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='8' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0V0z' fill='%23000'/%3E%3C/svg%3E
```

### Minimize Icon (6x2)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='6' height='2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' d='M0 0h6v2H0z'/%3E%3C/svg%3E
```

### Maximize Icon (9x9)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='9' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9 0H0v9h9V0zM8 2H1v6h7V2z' fill='%23000'/%3E%3C/svg%3E
```

### Scrollbar Track (2x2 checkerboard)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='2' height='2' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M1 0H0v1h1v1h1V1H1V0z' fill='silver'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 0H1v1H0v1h1V1h1V0z' fill='%23fff'/%3E%3C/svg%3E
```

### Scrollbar Up Arrow Button (16x17)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 0H0v16h1V1h14V0z' fill='%23DFDFDF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 1H1v14h1V2h12V1H2z' fill='%23fff'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 17H0v-1h15V0h1v17z' fill='%23000'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 1h-1v14H1v1h14V1z' fill='gray'/%3E%3Cpath fill='silver' d='M2 2h12v13H2z'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8 6H7v1H6v1H5v1H4v1h7V9h-1V8H9V7H8V6z' fill='%23000'/%3E%3C/svg%3E
```

### Scrollbar Down Arrow Button (16x17)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 0H0v16h1V1h14V0z' fill='%23DFDFDF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 1H1v14h1V2h12V1H2z' fill='%23fff'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 17H0v-1h15V0h1v17z' fill='%23000'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 1h-1v14H1v1h14V1z' fill='gray'/%3E%3Cpath fill='silver' d='M2 2h12v13H2z'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M11 6H4v1h1v1h1v1h1v1h1V9h1V8h1V7h1V6z' fill='%23000'/%3E%3C/svg%3E
```

### Scrollbar Left Arrow Button (16x17)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 0H0v16h1V1h14V0z' fill='%23DFDFDF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 1H1v14h1V2h12V1H2z' fill='%23fff'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 17H0v-1h15V0h1v17z' fill='%23000'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 1h-1v14H1v1h14V1z' fill='gray'/%3E%3Cpath fill='silver' d='M2 2h12v13H2z'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9 4H8v1H7v1H6v1H5v1h1v1h1v1h1v1h1V4z' fill='%23000'/%3E%3C/svg%3E
```

### Scrollbar Right Arrow Button (16x17)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 0H0v16h1V1h14V0z' fill='%23DFDFDF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 1H1v14h1V2h12V1H2z' fill='%23fff'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 17H0v-1h15V0h1v17z' fill='%23000'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 1h-1v14H1v1h14V1z' fill='gray'/%3E%3Cpath fill='silver' d='M2 2h12v13H2z'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 4H6v7h1v-1h1V9h1V8h1V7H9V6H8V5H7V4z' fill='%23000'/%3E%3C/svg%3E
```

### Dropdown Arrow Button (16x17)
```
data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 0H0v16h1V1h14V0z' fill='%23DFDFDF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M2 1H1v14h1V2h12V1H2z' fill='%23fff'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16 17H0v-1h15V0h1v17z' fill='%23000'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M15 1h-1v14H1v1h14V1z' fill='gray'/%3E%3Cpath fill='silver' d='M2 2h12v13H2z'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M11 6H4v1h1v1h1v1h1v1h1V9h1V8h1V7h1V6z' fill='%23000'/%3E%3C/svg%3E
```

---

## Confidence Assessment

| Claim | Confidence | Source |
|-------|------------|--------|
| Color values (#c0c0c0, #dfdfdf, etc.) | HIGH | Extracted from 98.css v0.1.21 compiled source + uncompiled source |
| Box-shadow bevel patterns | HIGH | Extracted from 98.css source, cross-verified with compiled output |
| Control-specific CSS patterns | HIGH | Direct extraction from 98.css source |
| SVG data URIs for icons/scrollbars | HIGH | Direct extraction from 98.css compiled output |
| Font rendering approach | MEDIUM | `-webkit-font-smoothing: none` works in Chromium but effect varies; no true bitmap font rendering in modern browsers |
| No new dependencies needed | HIGH | Verified against project's existing CSS custom property system |
| Existing project patterns are correct | HIGH | Compared `MapSettingsDialog.css` against 98.css source - exact match on bevel patterns |

## Sources

### Primary (HIGH confidence)
- [98.css GitHub Repository](https://github.com/jdan/98.css) - MIT license, v0.1.21, complete source extracted
- [98.css Documentation Site](https://jdan.github.io/98.css/) - Component examples and HTML patterns
- [98.css Author's Notes](https://notes.jordanscales.com/98-dot-css) - Design goals and pixel-matching methodology

### Secondary (MEDIUM confidence)
- [Windows System Colours by OS](https://gist.github.com/zaxbux/64b5a88e2e390fb8f8d24eb1736f71e0) - Win98 system color constant values
- [Using Only CSS to Recreate Windows 98](https://fjolt.com/article/css-windows-98) - Font rendering techniques
- [OS-GUI.js](https://os-gui.js.org/) - Alternative Win98 CSS library (evaluated, not recommended)
- [Win 98 Scrollbars CodePen](https://codepen.io/BeardedBear/details/jObVXmV) - Scrollbar implementation reference

### Evaluated Alternatives (not recommended)
- [XP.css](https://botoxparty.github.io/XP.css/) - Wrong OS generation
- [7.css](https://khang-nd.github.io/7.css/) - Wrong OS generation
- [Retro CSS List](https://github.com/matt-auckland/retro-css) - Catalog of alternatives
