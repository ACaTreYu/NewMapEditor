# Domain Pitfalls: Windows 98 Pixel-Accurate Theme for Electron/React

**Domain:** Win98 CSS recreation in existing Electron/React tile map editor
**Researched:** 2026-02-04
**Confidence:** HIGH (verified against 98.css source, official MS docs, codebase audit)

---

## Critical Pitfalls

Mistakes that cause rewrites or major visual breakage across the application.

---

### Pitfall 1: Ghost CSS Variables (`--border-color` / `--accent-color` Are Undefined)

**What goes wrong:** The current codebase has a split variable naming problem. `App.css` defines the two-tier system with `--border-default`, `--border-subtle`, `--accent-primary`, etc. But many component CSS files still reference `--border-color` and `--accent-color` -- variables that are NEVER DEFINED in `App.css`. These unresolved variables currently fall back to browser defaults (transparent or inherited), meaning borders in ToolBar, TilePalette, RightSidebar, AnimationPreview, and Minimap are already rendering with fallback behavior. When the Win98 theme replaces the variable system, these orphaned references will silently produce invisible borders or wrong colors.

**Files affected (verified via codebase grep):**
- `ToolBar.css` -- uses `--border-color` (3 occurrences)
- `TilePalette.css` -- uses `--border-color` (7) and `--accent-color` (1)
- `RightSidebar.css` -- uses `--border-color` (2)
- `AnimationPreview.css` -- uses `--border-color` (4) and `--accent-color` (3)
- `Minimap.css` -- uses `--border-color` (1)

**Why it happens:** The variable naming was migrated from a simpler system to the two-tier system, but not all component files were updated. The old names are still referenced but no longer defined.

**Consequences:** After Win98 theme lands, these components will have missing or transparent borders while others have correct Win98 beveled borders. The inconsistency will be visually jarring and hard to debug because the CSS will not produce errors -- custom properties that resolve to nothing just silently fail.

**Prevention:**
1. Before starting ANY theme work, do a full audit: grep for `var(--` across all CSS files and verify every variable is defined in the root
2. Normalize all variables to the canonical names FIRST, as a prerequisite commit
3. Create a variable reference table and enforce it

**Detection:** Visual inspection will miss this because current fallback behavior may coincidentally look "okay." Must be caught via code search.

**Phase:** Must be resolved in Phase 1 (Foundation) before any Win98 styling begins.

---

### Pitfall 2: Wrong Bevel Border Color Order (The #1 Win98 CSS Mistake)

**What goes wrong:** The Win98 3D effect uses a very specific 4-color system applied in a specific order. Getting the order wrong produces borders that look "almost right" but subtly broken -- either the element looks inverted (sunken when it should be raised) or the inner/outer border layers are swapped, producing a flat or mushy appearance instead of crisp 3D.

**The correct 98.css color system (verified from source):**

| Variable | Hex | Role |
|----------|-----|------|
| `--button-highlight` | `#ffffff` | Brightest edge (top-left outer for raised) |
| `--button-face` | `#dfdfdf` | Inner light edge |
| `--surface` | `#c0c0c0` | Background / button face |
| `--button-shadow` | `#808080` | Inner dark edge |
| `--window-frame` | `#0a0a0a` | Darkest edge (bottom-right outer for raised) |

**Correct raised button box-shadow (outset/raised):**
```css
box-shadow:
  inset -1px -1px 0px 0px #0a0a0a,   /* outer dark: bottom-right */
  inset  1px  1px 0px 0px #ffffff,   /* outer light: top-left */
  inset -2px -2px 0px 0px #808080,   /* inner dark */
  inset  2px  2px 0px 0px #dfdfdf;   /* inner light */
```

**Correct sunken field box-shadow (inset/sunken):**
```css
box-shadow:
  inset -1px -1px 0px 0px #dfdfdf,   /* outer light: bottom-right */
  inset  1px  1px 0px 0px #808080,   /* outer dark: top-left */
  inset -2px -2px 0px 0px #ffffff,   /* inner light */
  inset  2px  2px 0px 0px #0a0a0a;   /* inner dark */
```

**The existing codebase already has this pattern in `MapSettingsDialog.css`, and it is CORRECT.** The risk is in applying it inconsistently across all the other components that need converting.

**Why it happens:** Developers confuse which colors go on which sides, or swap the inner and outer layer assignments. The difference between `#dfdfdf` (inner highlight) and `#ffffff` (outer highlight) is subtle, so swapping them passes casual visual inspection but looks wrong compared to a real Win98 screenshot.

**Consequences:** The entire application looks "off" in a way that is hard to pinpoint. Users who remember Win98 will feel something is wrong but cannot articulate what.

**Prevention:**
1. Define the box-shadow patterns as CSS custom properties or mixins ONCE, then reuse everywhere
2. Create named patterns: `--shadow-raised`, `--shadow-sunken`, `--shadow-field`, `--shadow-status`
3. Never hand-write the 4-layer shadow -- always reference the pattern
4. Compare every element against a Win98 VM screenshot

**Detection:** Side-by-side comparison with actual Win98 screenshot. Look specifically at: which edge is bright, which is dark, and whether there are 2 or 4 distinct color steps.

**Phase:** Phase 1 (Foundation) -- define the shadow system. Phase 2+ (Components) -- apply it.

---

### Pitfall 3: Residual `border-radius` Breaking the Win98 Aesthetic

**What goes wrong:** Windows 98 has ZERO rounded corners anywhere in its UI. The current codebase has `border-radius` in 25+ locations across 9 CSS files, including `4px` on toolbar buttons, inputs, selects, textareas, scrollbar thumbs, minimap, animation panel buttons, and tab pill indicators. If even one `border-radius` survives the migration, it creates a jarring anachronism -- a single rounded element in an otherwise square UI screams "this is not real Win98."

**Specific occurrences found in codebase:**
- `ToolBar.css` line 20: `border-radius: 4px` on toolbar buttons
- `MapCanvas.css` line 54: `border-radius: 4px` on scrollbar thumbs
- `AnimationPanel.css` lines 29, 72, 80, 98: rounded buttons and sliders
- `AnimationPreview.css` lines 61, 80, 88, 111: rounded inputs and buttons
- `MapSettingsPanel.css` lines 93, 102, 118, 150, 165, 182: rounded everything
- `TilePalette.css` line 75: rounded select dropdown
- `Minimap.css` line 8: `border-radius: 4px` on minimap container
- `MapSettingsDialog.css` line 65: `border-radius: 4px 4px 0 0` on tabs (should be `2px 2px 0 0` for Win98 tabs, or `0` entirely)

**Why it happens:** Modern UI defaults to rounded corners. Developers adding new components unconsciously add `border-radius` because it "looks better" in modern contexts. Also, search-and-replace of `border-radius: 4px` to `border-radius: 0` misses values like `border-radius: 50%` (used on circular slider thumbs) and `border-radius: 2px`.

**Consequences:** The Win98 illusion breaks. Even one rounded corner is immediately noticeable.

**Prevention:**
1. Add a global reset: `* { border-radius: 0 !important; }` during development as a safety net
2. After all components are converted, grep the entire CSS for `border-radius` and verify each occurrence is either `0` or intentionally different (Win98 tabs have very slight 2px top corners)
3. Consider a lint rule or pre-commit check

**Detection:** `grep -r "border-radius" src/ --include="*.css"` -- every hit must be justified.

**Phase:** Phase 1 (Foundation) -- add global reset. Phase 2+ -- remove per-component instances properly.

---

### Pitfall 4: CSS Transitions and Hover Effects That Win98 Did Not Have

**What goes wrong:** Windows 98 had NO CSS transitions, no hover color changes on standard buttons, and no smooth animations on UI controls. The current codebase has `transition` properties in 5 locations and `:hover` background-color changes on nearly every interactive element. Leaving these in creates a "Windows 98 cosplay" rather than a "Windows 98 recreation" -- the shape is right but the behavior is modern.

**Specific transition instances found:**
- `App.css` line 249: `transition: background-color 0.15s ease` on resize handle
- `MapCanvas.css` line 56: `transition: background 0.15s` on scrollbar thumb
- `MapSettingsDialog.css` line 72: `transition: background-color 0.1s ease` on tabs
- `ToolBar.css` line 24: `transition: all 0.15s ease` on toolbar buttons

**Win98 behavior specifics:**
- **Standard buttons:** Always raised. No hover state. Only pressed (inverted shadow) and focused (inner dotted outline) states.
- **Toolbar buttons:** FLAT by default (no visible border). Show raised border on hover. Show sunken border when pressed. This is the ONE place Win98 had a hover effect -- but it reveals borders, not changes colors.
- **Menu items:** Highlight on hover (blue background, white text). No transition -- instant.
- **Scrollbars:** No hover state changes. Thumb is always the same color.

**Why it happens:** Modern UI conventions are deeply ingrained. Developers add hover effects reflexively.

**Consequences:** The app "feels" modern despite looking retro. Users notice the disconnect between visual style and interaction behavior.

**Prevention:**
1. Remove ALL `transition` properties in the Win98 theme (instant state changes)
2. Audit every `:hover` rule: standard buttons get NO hover effect; toolbar buttons get flat-to-raised hover; menu items get instant highlight
3. Scrollbar thumbs and tracks: remove hover color changes entirely
4. Exception: The resize handles can keep a subtle cursor change, but no color transition

**Detection:** Slowly hover over every interactive element and ask: "Would Windows 98 do this?"

**Phase:** Phase 2 (Component styling) -- remove transitions as each component is converted.

---

### Pitfall 5: Font Anti-Aliasing Ruining Pixel Crispness

**What goes wrong:** Windows 98 used MS Sans Serif, a bitmap font rendered WITHOUT anti-aliasing. Modern browsers (Chromium) render all text with subpixel anti-aliasing by default, producing smooth but "smeared" text that looks nothing like Win98. The current codebase uses `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` -- a fully modern font stack.

**The font situation:**
- Win98 used **MS Sans Serif** at **8pt** (11px at 96 DPI) for almost all UI text
- MS Sans Serif is a **bitmap font** -- it exists only at specific sizes (8, 10, 12, 14, 18, 24pt)
- Modern systems do not include MS Sans Serif; the TrueType replacement "Microsoft Sans Serif" renders differently
- Web-safe alternatives: **Pixelated MS Sans Serif** (W95FA font by Alina Sava), **MS W98 UI** (TTF conversion by Lev Leontev), or fall back to `"Microsoft Sans Serif", Arial, Helvetica, sans-serif`

**Why it happens:** Developers set the font family but forget about anti-aliasing, or use the font at non-native sizes where it renders poorly.

**Consequences:** Text looks blurry or "too smooth" compared to the crisp pixel borders. The visual disconnect between sharp box-shadow borders and smoothed text is the single most common "looks Win98 but feels wrong" complaint.

**Prevention:**
1. Choose a font strategy:
   - **Pragmatic (recommended for a tool):** Use `"Microsoft Sans Serif", "MS Sans Serif", Arial, sans-serif` and accept minor smoothing. The editor is a TOOL, not a museum piece -- readability matters more than pixel authenticity.
   - **Purist:** Bundle W95FA or MS W98 UI as a web font, use only at native pixel sizes (11px), and set `-webkit-font-smoothing: none` (note: this value is non-standard and may not work in all Chromium versions; `antialiased` is the most you can reliably control).
2. Set font-size consistently to `11px` for body text, `11px bold` for title bars
3. Do NOT use `em` or `rem` units for Win98 UI text -- use `px` exclusively
4. Test at 100% zoom on a 96 DPI display for baseline truth

**Detection:** Screenshot the app at 100% zoom and compare text rendering against a Win98 VM screenshot at the same DPI.

**Phase:** Phase 1 (Foundation) -- set global font stack and sizing. Revisit in Phase 3 if purist approach is desired.

---

## Moderate Pitfalls

Mistakes that cause delays, visual inconsistencies, or localized technical debt.

---

### Pitfall 6: Incorrect Pressed/Active Button State (Padding Shift)

**What goes wrong:** In Win98, pressing a button does TWO things: (1) inverts the box-shadow (light/dark swap), and (2) shifts the text content 1px down and 1px right to simulate physical depression. Many CSS recreations get the shadow inversion right but forget the text shift, or they shift by the wrong amount.

**The existing codebase gets this PARTIALLY right** in `MapSettingsDialog.css` line 159:
```css
.win95-button:active {
  padding: 5px 15px 3px 17px; /* Slight offset for pressed effect */
}
```
This shifts content by adjusting padding. But the shift values are asymmetric (1px down, 1px right should be: `padding: 5px 15px 3px 17px` which means top+1, right-1, bottom-1, left+1 relative to `4px 16px`). This appears correct. The risk is that other button-like elements (toolbar buttons, reset buttons, scrollbar arrows) won't replicate this pattern.

**Prevention:**
1. Define the pressed state as a reusable pattern alongside the shadow pattern
2. Apply consistently to ALL button-like elements: dialog buttons, toolbar buttons, scrollbar arrows, dropdown buttons
3. Scrollbar arrow buttons should shift their arrow glyph by 1px on press

**Detection:** Click and hold every button. Does the text/icon shift down-right by exactly 1px?

**Phase:** Phase 2 (Component styling).

---

### Pitfall 7: Wrong Focus Indicator (Outline vs. Dotted Inner Border)

**What goes wrong:** Win98 focus on buttons is a 1px dotted black rectangle INSIDE the button, inset from the border by ~2-3px. Modern CSS `outline` is rendered OUTSIDE the element. Using `outline` produces a focus ring that floats outside the button border, which is immediately wrong.

**The existing codebase handles this correctly** in `MapSettingsDialog.css`:
```css
.win95-button:focus {
  outline: 1px dotted #000000;
  outline-offset: -4px;
}
```
The `outline-offset: -4px` pulls the dotted outline inside the button. This is the correct technique.

**The risk:** Other focusable elements (inputs, selects, checkboxes) need different focus treatment:
- **Text inputs:** No visible focus indicator beyond the cursor appearing (Win98 did not highlight the input border on focus)
- **Checkboxes/radios:** Dotted outline around the LABEL text, not the checkbox itself
- **Tabs:** Dotted outline inside the active tab

**Prevention:**
1. Remove ALL default focus outlines globally: `*:focus { outline: none; }`
2. Re-add Win98-correct focus indicators per control type
3. CRITICAL: Maintain keyboard accessibility! Do not just hide focus indicators -- replace them with correct ones
4. Use `:focus-visible` (not `:focus`) to avoid showing focus on mouse click

**Detection:** Tab through every focusable element with keyboard. Does each one show the correct Win98 focus indicator?

**Phase:** Phase 2 (Component styling) -- apply per component.

---

### Pitfall 8: Disabled Controls Missing the Embossed Text Effect

**What goes wrong:** Win98 disabled button text is not just "grey text." It is grey text (`#808080`) with a white (`#ffffff`) text-shadow offset 1px to the bottom-right, creating an embossed/etched appearance. Simply using `opacity: 0.6` (as the current codebase does in `MapSettingsDialog.css` line 168) looks wrong -- it dims the entire button including its 3D borders, which Win98 never does.

**Correct disabled button in Win98:**
- Background: stays `#c0c0c0` (unchanged)
- Box-shadow: stays raised (unchanged)
- Text color: `#808080`
- Text shadow: `1px 1px 0px #ffffff`
- No opacity change on the element

**Why it happens:** `opacity` is the easy modern solution. The embossed text-shadow technique is non-obvious.

**Prevention:**
```css
.win95-button:disabled {
  color: #808080;
  text-shadow: 1px 1px 0px #ffffff;
  cursor: default;
  /* NO opacity change */
  /* Box-shadow stays normal raised */
}
```

**Detection:** Disable a button and compare against a Win98 screenshot.

**Phase:** Phase 2 (Component styling).

---

### Pitfall 9: Select/Dropdown Styling Limitations in Chromium

**What goes wrong:** The `<select>` element's dropdown popup (the options list that appears when clicked) CANNOT be styled with traditional CSS in Chromium. You can style the closed select box (the trigger) using `appearance: none`, but the dropdown itself renders as a native OS widget. This means the select trigger can look perfectly Win98 while the dropdown is a modern OS popup.

**Current codebase uses `<select>` in:**
- `MapSettingsPanel.css` -- `.setting-select` with modern styling
- `TilePalette.css` -- `.wall-select` with modern styling

**Options:**
1. **Accept the mismatch (pragmatic):** Style the select trigger as Win98, accept the modern dropdown. Users understand this is a web app.
2. **Use `appearance: base-select`:** Available in Chrome 135+. Electron 28 uses an older Chromium version and likely does not support this. Would need to verify.
3. **Build custom dropdown component:** Full visual control but significant effort. Need to handle keyboard navigation, screen readers, z-index stacking.

**Prevention:**
1. For this project, recommend Option 1 (accept mismatch) -- the editor has very few dropdowns (wall type selector, objective selector)
2. If the mismatch is unacceptable, build a lightweight custom `<Win98Select>` React component using a `<div>` with ARIA roles
3. Do NOT try to style `<option>` elements -- this is a dead end

**Detection:** Open any dropdown and see if the popup matches the Win98 style.

**Phase:** Phase 2 or Phase 3 (can be deferred since dropdowns are few).

---

### Pitfall 10: Scrollbar Track Missing the Checkerboard Pattern

**What goes wrong:** Win98 scrollbar tracks (the area between the arrows and the thumb) have a subtle dithered/checkerboard pattern, not a solid color. The current codebase uses a solid color for scrollbar tracks (`var(--scrollbar-track)`). Simply changing the color to grey is incomplete.

**Win98 scrollbar track pattern:**
- The track is a 2x2 pixel checkerboard alternating between `#c0c0c0` (silver) and `#ffffff` (white)
- This produces the characteristic speckled/dithered grey appearance
- When the track is "pressed" (clicking in the track to page-scroll), the pattern inverts

**CSS technique for the checkerboard:**
```css
background-image: url("data:image/svg+xml,..."); /* 2x2 checkerboard SVG */
/* OR */
background: repeating-conic-gradient(#c0c0c0 0% 25%, #ffffff 0% 50%) 0 0 / 2px 2px;
```

**Additional scrollbar issues:**
- Current scrollbar thumbs have `border-radius: 4px` -- must be `0`
- Current scrollbar is `10px` wide; Win98 scrollbars are `16px` (or `17px` including the border)
- Scrollbar arrows need the 3D raised button treatment with proper pressed states
- The corner piece where scrollbars meet should be flat `#c0c0c0`

**Prevention:**
1. Define the checkerboard pattern as a reusable CSS snippet or background-image
2. Set scrollbar width to `16px` for both custom scrollbars and `::-webkit-scrollbar`
3. Arrow buttons get the standard raised box-shadow and pressed state with 1px content shift

**Detection:** Compare scrollbar appearance against Win98 screenshot. The track should NOT be a solid color.

**Phase:** Phase 2 (Scrollbar component styling).

---

### Pitfall 11: Tab Control Border Overlap (The Flush-Tab Problem)

**What goes wrong:** Win98 property sheet tabs have a very specific visual trick: the active tab's bottom border OVERLAPS the content area's top border, making the tab appear to "merge" into the content panel. Getting this wrong produces either a double border (two lines between tab and content) or a visible gap.

**The existing codebase in `MapSettingsDialog.css`** attempts this with `margin-bottom: -1px` on the selected tab. This is the correct approach, but the implementation has a subtle issue: the tab uses `border-radius: 4px 4px 0 0` which is slightly too round for Win98 (should be `2px 2px 0 0` at most, and many Win98 implementations use `0` for truly square tabs).

**Additional tab control details frequently missed:**
- First tab is NOT flush against the left edge -- it has ~2px left margin
- Unselected tabs are slightly shorter (vertically) than the selected tab
- Tab text should NOT be bold (contrary to what the existing code does: `font-weight: bold` on selected tab). In Win98, selected tab text is the same weight, just slightly elevated.

**Prevention:**
1. Use `margin-bottom: -1px` on active tab and `position: relative; z-index: 2` so its background covers the content area border
2. Content area border-top must be the same color as the tab's bottom overlap
3. Set tab border-radius to `2px 2px 0 0` (or `0` for strict accuracy)
4. Compare against Win98 property sheet screenshots -- pay attention to tab height, not just tab styling

**Detection:** Look for double borders or gaps between tab bar and content area.

**Phase:** Phase 2 (Dialog/Tab component styling).

---

### Pitfall 12: Checkbox and Radio Button Recreation in Chromium

**What goes wrong:** Native HTML checkboxes and radios cannot be fully styled without `appearance: none`. Once you strip native appearance, you must rebuild EVERYTHING: the box/circle, the checkmark/dot, the checked state, the indeterminate state, the disabled state, and the focus indicator. Missing any state produces broken controls.

**Win98 checkbox specifics:**
- 13x13px sunken box with white interior
- Checkmark is a specific pattern (not a Unicode character) -- a 2px-wide angular mark
- Disabled checkbox: grey background (`#c0c0c0`) instead of white, grey checkmark instead of black
- Focus: dotted outline around the LABEL, not the checkbox itself

**Win98 radio button specifics:**
- Circular, but rendered as pixel art (not a smooth circle) -- at 12x12px it looks distinctly pixelated
- The dot in the center when selected is a small filled circle
- Achieving pixel-accurate circular radio buttons in CSS requires either a bitmap/SVG or accepting that CSS `border-radius: 50%` will render a smoother circle than Win98 had

**Current codebase uses:**
- `accent-color: var(--accent-primary)` on checkboxes (MapSettingsPanel.css) -- this is a modern approach that tints the native checkbox. It cannot produce the Win98 look.
- Standard HTML inputs with no custom styling beyond sizing

**Prevention:**
1. Use `appearance: none` on all checkboxes and radios
2. Rebuild using `::before` pseudo-elements for the box/circle and `::after` for the checkmark/dot
3. Apply the standard sunken box-shadow for the checkbox container
4. Use a small inline SVG or CSS border trick for the checkmark -- do NOT use Unicode characters like `\2713` as they render differently across platforms
5. Handle all states: unchecked, checked, disabled unchecked, disabled checked, focused

**Detection:** Toggle every checkbox and radio in every state (normal, checked, disabled, disabled+checked). Compare against Win98 screenshots.

**Phase:** Phase 2 (Form control styling).

---

### Pitfall 13: Slider/Trackbar Styling Across Chromium Pseudo-Elements

**What goes wrong:** HTML `<input type="range">` requires vendor-specific pseudo-elements for styling: `::-webkit-slider-thumb` and `::-webkit-slider-runnable-track` for Chromium. These pseudo-elements have different default behaviors (e.g., the thumb has default margin, the track has default height). Missing the Chromium-specific pseudo-element means the slider renders with native Chromium styling, which completely breaks the Win98 look.

**Win98 trackbar specifics:**
- Track is a sunken channel (thin horizontal groove)
- Thumb is a raised trapezoid/pointer shape (not a square or circle)
- 98.css provides a `has-box-indicator` class for a rectangular thumb variant
- Tick marks appear below/beside the track at regular intervals
- The current codebase uses circular slider thumbs (`border-radius: 50%`) -- this must change to a rectangular shape

**Prevention:**
1. Always include both `::-webkit-slider-thumb` AND `::-webkit-slider-runnable-track` styling
2. Set `-webkit-appearance: none` on both the input AND the thumb
3. Use rectangular thumbs (no border-radius) with the standard raised box-shadow
4. Track should use the sunken box-shadow pattern
5. Tick marks are NOT natively supported in HTML range inputs -- if needed, render them as a separate element below the slider using calculated positioned markers

**Detection:** Interact with every slider in the app. Does the thumb look raised and rectangular? Does the track look sunken?

**Phase:** Phase 2 (Form control styling).

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without restructuring.

---

### Pitfall 14: High-DPI / Retina Display Scaling Blurs 1px Borders

**What goes wrong:** On displays with `devicePixelRatio > 1` (e.g., 1.25x, 1.5x, 2x), CSS `1px` borders may render as sub-pixel lines, fractional widths, or slightly blurred edges. The Win98 3D border effect depends on exactly 1 physical pixel per border line. At 150% Windows scaling (common on modern laptops), a CSS `1px` becomes 1.5 physical pixels, which Chromium anti-aliases into a blurry 2px line.

**Why it happens:** Electron inherits the system DPI scaling. On Windows, users frequently run at 125% or 150% scaling. CSS pixels are device-independent by design.

**Consequences:** Borders look fuzzy instead of crisp. The 4-color bevel system degrades because color boundaries become blurred.

**Prevention:**
1. **Accept the limitation (pragmatic):** On high-DPI displays, the borders will be slightly thicker but still visually correct in relative terms. This is the approach 98.css takes.
2. **For purists:** Consider forcing 100% DPI in Electron via `--force-device-scale-factor=1` in the app launch flags. This makes the entire UI render at exactly 1:1 pixels but may make the window too small on high-DPI screens.
3. Do NOT try to use fractional pixel values (e.g., `0.5px`) to compensate -- Chromium rounds these unpredictably.
4. Test at multiple DPI settings: 100%, 125%, 150%, 200%.

**Detection:** Run the app at non-100% Windows scaling and inspect borders closely.

**Phase:** Phase 3 (Polish) -- test and decide on DPI strategy.

---

### Pitfall 15: Leftover Dark Theme CSS Fighting Win98 Colors

**What goes wrong:** The current theme system uses CSS custom properties with dark theme as default and `.theme-light` as override. When replacing this with a Win98 theme, there are multiple ways leftover CSS can fight the new theme:
1. Components using hardcoded dark colors (e.g., `background: #0d0d1a` in AnimationPreview.css line 31)
2. Components using undefined old variables (`--border-color`) that resolve to nothing
3. The `.theme-light` class still being toggled, overriding Win98 variables
4. Media query `prefers-color-scheme: dark` from Electron's native theme system injecting dark styles

**Hardcoded dark colors found in codebase:**
- `AnimationPreview.css:31` -- `background: #0d0d1a` (hardcoded dark background)
- Various `rgba(0,0,0,...)` and `rgba(255,255,255,...)` values in App.css box shadows

**Why it happens:** During a theme migration, it is easy to update the variable definitions but miss hardcoded values and the theme-switching logic.

**Consequences:** Dark patches appear in an otherwise grey Win98 UI. Or the app briefly flashes dark before settling into Win98 colors (FOUC).

**Prevention:**
1. Grep for hardcoded color values: `#0d0d1a`, `#1a1a2e`, `#2a2a4e`, etc. from the dark palette
2. Replace ALL hardcoded colors with CSS variables
3. Remove or disable the theme-switching mechanism (`.theme-light` class toggle)
4. Set `nativeTheme.themeSource = 'light'` in Electron main process to prevent OS dark mode from interfering
5. Consider removing the Tier 1 primitive dark palette entirely to prevent accidental usage

**Detection:** Search for any hex color that is not in the Win98 palette (`#c0c0c0`, `#808080`, `#dfdfdf`, `#ffffff`, `#0a0a0a`, `#000080`, etc.).

**Phase:** Phase 1 (Foundation) -- clean hardcoded colors. Phase 2 -- verify per component.

---

### Pitfall 16: Status Bar Field Style vs. Button Borders

**What goes wrong:** In Win98, the status bar at the bottom uses a DIFFERENT border style than other elements. Status bar fields use only a "sunken outer" border (single-level inset), while buttons use the full 4-layer raised border and text inputs use the full 4-layer sunken border. Using the wrong border depth on the wrong element type is a common accuracy mistake.

**Win98 border types:**
1. **Raised button:** 4-layer outset (highlight + face outer, shadow + frame inner)
2. **Sunken field (text input):** 4-layer inset (shadow + frame outer, highlight + face inner)
3. **Status bar field:** 2-layer inset only (shadow outer, highlight inner -- half the depth)
4. **Group box (fieldset):** 2-layer etched (sunken outer + raised inner)

**Prevention:**
1. Define separate shadow patterns for each border type
2. Map each component to its correct border type:
   - Buttons, scrollbar arrows, toolbar -> Raised button
   - Text inputs, list boxes, tree views -> Sunken field
   - Status bar sections -> Status field
   - Fieldset/group boxes -> Group box (etched)
3. The status bar should NOT use the full sunken-field shadow

**Detection:** Compare border depth of status bar vs. text input -- they should look different.

**Phase:** Phase 2 (Component styling).

---

### Pitfall 17: Spacing and Sizing Constants Off By a Few Pixels

**What goes wrong:** Win98 had very specific sizing constants that are not round CSS numbers. Getting these wrong by even 2-3px makes the UI feel "loose" or "cramped" compared to authentic Win98.

**Key Win98 sizing constants (from 98.css and MS Windows User Experience guide):**
- Standard button: `75px` wide, `23px` tall
- Button padding: `12px` horizontal (left+right)
- Title bar height: `18px` (content) + border
- Menu bar height: `20px`
- Status bar height: `20px`
- Scrollbar width: `16px` (or `17px` including border)
- Dialog margin: `7px` from edge to content, `4px` between related controls, `7px` between unrelated groups
- Tab padding: ~`3px 12px`
- Default font: `11px` (8pt at 96 DPI)

**Why it happens:** Developers round to "nice" CSS numbers (20px, 24px, 8px padding) instead of the authentic values.

**Prevention:**
1. Reference the Microsoft Windows User Experience guide (or 98.css source) for exact measurements
2. Define sizing constants as CSS custom properties
3. Pixel-compare against Win98 VM screenshots for critical elements (buttons, title bar, status bar)

**Detection:** Measure element sizes in browser DevTools and compare against reference values.

**Phase:** Phase 2 (Component styling) -- apply correct sizes as each component is converted.

---

### Pitfall 18: Title Bar Gradient Using Wrong Blue Values

**What goes wrong:** The Win98 active title bar gradient goes from navy blue (`#000080`) on the left to a lighter blue (`#1084d0`) on the right. Using wrong endpoint colors (e.g., `#0000ff` or `#4169e1`) is immediately noticeable because the title bar is the most recognizable Win98 visual element. The inactive title bar uses grey (`#808080` to `#b5b5b5`).

**The existing codebase gets this right** in both `App.css` and `MapSettingsDialog.css`:
```css
background: linear-gradient(to right, #000080, #1084d0);
```

**The risk:** Inactive window title bars are often forgotten. The existing code only has the active gradient.

**Correct inactive title bar:**
```css
background: linear-gradient(to right, #808080, #b5b5b5);
```

**Prevention:**
1. Define both active and inactive gradients as CSS custom properties
2. Apply inactive styling to any panel title bar that is not the "focused" panel

**Detection:** Are all title bar gradients using `#000080` to `#1084d0`? Does any panel show an inactive grey gradient?

**Phase:** Phase 2 (Panel styling).

---

### Pitfall 19: `image-rendering: pixelated` Not Applied to Tileset/Map Canvas

**What goes wrong:** The map editor renders 16x16px tile sprites that get scaled when zooming. Without `image-rendering: pixelated` (or `crisp-edges`), Chromium applies bilinear filtering, making the tiles blurry at non-1x zoom levels. This is not strictly a Win98 theme issue, but it is critical for a pixel-art tool and aligns with the Win98 aesthetic of sharp pixels.

**Current codebase:** The Minimap already has `image-rendering: pixelated; image-rendering: crisp-edges;` (correct). But the main map canvas and tile palette canvas may be missing it (they use Canvas API, which is controlled by the `imageSmoothingEnabled` context property, not CSS -- but CSS `image-rendering` affects the canvas element's own scaling).

**Prevention:**
1. Ensure `ctx.imageSmoothingEnabled = false` on all canvas contexts
2. Add `image-rendering: pixelated` to all canvas element CSS
3. Test at 200% and 400% zoom to verify pixels remain sharp

**Detection:** Zoom into the map at 2x or 4x. Are individual pixels of tiles sharp rectangles or blurry blobs?

**Phase:** Phase 1 (Foundation) or existing -- verify it is already correct.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Foundation (variables, reset) | Ghost variables `--border-color`/`--accent-color` cause silent failures | Audit and normalize ALL variable names before starting |
| Foundation (variables, reset) | Leftover dark theme hardcoded colors | Grep for dark palette hex values, replace with variables |
| Foundation (global reset) | `border-radius` survivors | Add `* { border-radius: 0 !important; }` as safety net |
| Button styling | Wrong shadow order or missing pressed text shift | Define shadow patterns as reusable custom properties |
| Input/form styling | Checkbox/radio native styling leaks through | Use `appearance: none` and rebuild entirely with pseudo-elements |
| Slider styling | Missing Chromium pseudo-element causes native fallback | Always style both `::-webkit-slider-thumb` and `::-webkit-slider-runnable-track` |
| Scrollbar styling | Missing checkerboard track pattern | Implement via SVG data URI or `repeating-conic-gradient` |
| Tab control | Double border at tab-content junction | Use `margin-bottom: -1px` and `z-index` layering |
| Select dropdown | Dropdown popup unstylable | Accept mismatch or build custom component |
| Disabled states | Using `opacity` instead of embossed text | Use `color: #808080; text-shadow: 1px 1px 0px #ffffff` |
| Status bar | Using full sunken border instead of status field border | Define separate border types for different element categories |
| Polish/DPI | Blurry borders at non-100% scaling | Test at 125%/150%, accept or force DPI |
| Polish/transitions | Leftover `transition` properties | Grep and remove all `transition` from Win98 CSS |

---

## Sources

### Primary References (HIGH confidence)
- [98.css source code (style.css)](https://github.com/jdan/98.css/blob/main/style.css) -- Verified color values, shadow patterns, and sizing
- [98.css documentation](https://jdan.github.io/98.css/) -- Component reference with visual examples
- [Microsoft Win32 tab controls](https://learn.microsoft.com/en-us/windows/win32/controls/tab-controls) -- Official Win32 control specifications

### Secondary References (MEDIUM confidence)
- [OS-GUI.js](https://os-gui.js.org/) -- Alternative Win98 CSS+JS library for cross-reference
- [Windows 98 color palette](https://www.color-hex.com/color-palette/1054902) -- Community-verified hex values
- [Sub-pixel rendering in browsers](https://chenhuijing.com/blog/about-subpixel-rendering-in-browsers/) -- Technical analysis of border rendering
- [Electron DPI issues](https://github.com/electron/electron/issues/8533) -- Per-monitor DPI awareness problems
- [Custom checkbox/radio styling](https://www.scottohara.me/blog/2021/09/24/custom-radio-checkbox-again.html) -- Modern `appearance: none` technique
- [MDN ::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-scrollbar) -- Scrollbar pseudo-element reference
- [Win98 scrollbar CSS (CodePen)](https://codepen.io/BeardedBear/details/jObVXmV) -- Community implementation
- [Chrome customizable select](https://developer.chrome.com/blog/a-customizable-select) -- `appearance: base-select` documentation
- [Electron dark mode docs](https://www.electronjs.org/docs/latest/tutorial/dark-mode) -- nativeTheme API reference

### Font References (MEDIUM confidence)
- [W95FA font (free recreation)](https://fontsarena.com/w95fa-by-alina-sava/) -- Scalable OTF recreation of MS Sans Serif
- [MS W98 UI font (TTF conversion)](https://martyr.shop/products/ms-w98-ui) -- Direct conversion from bitmap original
- [Ultimate Oldschool PC Font Pack](https://int10h.org/oldschool-pc-fonts/readme/) -- Comprehensive bitmap font collection with web fonts

### Community Discussion (LOW confidence -- used for pitfall discovery, not authoritative)
- [HN discussion: 98.css (2024)](https://news.ycombinator.com/item?id=42056918) -- Developer experiences with high-DPI and pixel accuracy
- [HN discussion: 98.css (2020)](https://news.ycombinator.com/item?id=22940564) -- Original launch discussion with detailed technical feedback
- [CSS-only Windows 98 recreation](https://fjolt.com/article/css-windows-98) -- Full CSS-only approach with checkbox/radio techniques
- [Addressing sub-pixel rendering issues](https://medium.com/design-bootcamp/addressing-sub-pixel-rendering-and-pixel-alignment-issues-in-web-development-cf4adb6ea6ac) -- Browser rendering pipeline details
