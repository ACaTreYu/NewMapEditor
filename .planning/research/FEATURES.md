# Feature Landscape: Windows 98 Pixel-Accurate Theme Overhaul

**Domain:** Pixel-accurate recreation of Windows 98 "Windows Standard" theme for an Electron/React tile map editor
**Researched:** 2026-02-04
**Confidence:** HIGH (based on 98.css library, Microsoft Win32 documentation, community recreation projects)

---

## Reference: Windows 98 "Windows Standard" System Color Palette

Before detailing features, here is the canonical color palette. Every feature below references these values.

| System Color Constant | Hex | RGB | CSS Variable (proposed) | Usage |
|---|---|---|---|---|
| COLOR_BTNFACE / COLOR_3DFACE | `#c0c0c0` | 192,192,192 | `--surface` | Button faces, dialog backgrounds, toolbar backgrounds, menu backgrounds |
| COLOR_BTNHIGHLIGHT / COLOR_3DHIGHLIGHT | `#ffffff` | 255,255,255 | `--button-highlight` | Light edge of raised 3D borders (top-left) |
| COLOR_BTNLIGHT / COLOR_3DLIGHT | `#dfdfdf` | 223,223,223 | `--button-face` | Inner light edge of 3D borders |
| COLOR_BTNSHADOW / COLOR_3DSHADOW | `#808080` | 128,128,128 | `--button-shadow` | Dark edge of 3D borders (bottom-right) |
| COLOR_3DDKSHADOW | `#0a0a0a` | 10,10,10 | `--window-frame` | Outermost dark edge of 3D borders |
| COLOR_WINDOW | `#ffffff` | 255,255,255 | `--window-bg` | Input field backgrounds, list backgrounds |
| COLOR_WINDOWTEXT | `#000000` | 0,0,0 | `--window-text` | Text in input fields, lists |
| COLOR_WINDOWFRAME | `#000000` | 0,0,0 | `--window-frame-color` | Window frame outline |
| COLOR_ACTIVECAPTION | `#000080` | 0,0,128 | `--active-title` | Active title bar (left side of gradient) |
| COLOR_GRADIENTACTIVECAPTION | `#1084d0` | 16,132,208 | `--active-title-gradient` | Active title bar (right side of gradient) |
| COLOR_INACTIVECAPTION | `#808080` | 128,128,128 | `--inactive-title` | Inactive title bar (left side) |
| COLOR_GRADIENTINACTIVECAPTION | `#b4b4b4` | 180,180,180 | `--inactive-title-gradient` | Inactive title bar (right side) |
| COLOR_CAPTIONTEXT | `#ffffff` | 255,255,255 | `--title-text` | Title bar text |
| COLOR_INACTIVECAPTIONTEXT | `#c0c0c0` | 192,192,192 | `--inactive-title-text` | Inactive title bar text |
| COLOR_MENUTEXT | `#000000` | 0,0,0 | `--menu-text` | Menu item text |
| COLOR_HIGHLIGHT | `#000080` | 0,0,128 | `--highlight` | Selected item background |
| COLOR_HIGHLIGHTTEXT | `#ffffff` | 255,255,255 | `--highlight-text` | Selected item text |
| COLOR_GRAYTEXT | `#808080` | 128,128,128 | `--disabled-text` | Disabled text |
| COLOR_BTNTEXT | `#000000` | 0,0,0 | `--button-text` | Button label text |
| COLOR_APPWORKSPACE | `#808080` | 128,128,128 | `--workspace` | MDI workspace background |
| COLOR_SCROLLBAR | `#c0c0c0` | 192,192,192 | `--scrollbar` | Scrollbar track color |
| COLOR_INFOBK | `#ffffe1` | 255,255,225 | `--tooltip-bg` | Tooltip background |
| COLOR_INFOTEXT | `#000000` | 0,0,0 | `--tooltip-text` | Tooltip text |
| COLOR_DESKTOP | `#008080` | 0,128,128 | `--desktop` | Desktop background (teal) |

---

## Reference: The Four Border Patterns

Windows 98 uses exactly four border compositions built from box-shadow layers. Understanding these is essential -- nearly every control is one of these four patterns.

### 1. Raised (Window / Button border)
Used on: window frames, buttons (normal state), toolbar buttons (pressed), scrollbar thumbs, scrollbar arrows

```
Outer top-left:  #ffffff  (ButtonHighlight)
Inner top-left:  #dfdfdf  (ButtonFace/3DLight)
Inner bot-right: #808080  (ButtonShadow)
Outer bot-right: #0a0a0a  (WindowFrame/3DDkShadow)
```

CSS box-shadow implementation:
```css
box-shadow:
  inset -1px -1px 0 0 #0a0a0a,   /* outer bottom-right: near-black */
  inset  1px  1px 0 0 #ffffff,   /* outer top-left: white */
  inset -2px -2px 0 0 #808080,   /* inner bottom-right: gray */
  inset  2px  2px 0 0 #dfdfdf;   /* inner top-left: light gray */
```

### 2. Sunken (Field / Input border)
Used on: text inputs, select dropdowns, list boxes, progress bar containers, scrollbar track (conceptually)

```
Outer top-left:  #808080  (ButtonShadow)
Inner top-left:  #0a0a0a  (WindowFrame)
Inner bot-right: #dfdfdf  (ButtonFace)
Outer bot-right: #ffffff  (ButtonHighlight)
```

CSS box-shadow implementation:
```css
box-shadow:
  inset -1px -1px 0 0 #ffffff,
  inset  1px  1px 0 0 #808080,
  inset -2px -2px 0 0 #dfdfdf,
  inset  2px  2px 0 0 #0a0a0a;
```

### 3. Etched / Grouping (Group box / Separator border)
Used on: fieldsets/group boxes, menu separators, toolbar separators

Combination of sunken outer + raised inner, creating an engraved line effect.
```
Line 1 (top/left):  #808080  (shadow)
Line 2 (bot/right): #ffffff  (highlight)
```

### 4. Status Field (Single sunken)
Used on: status bar sections

Only the sunken outer basic border (no inner border). Simpler than field borders.
```
Top-left:  #808080  (shadow)
Bot-right: #ffffff  (highlight)
```

---

## Reference: Typography

| Context | Font | Size | Weight | Notes |
|---|---|---|---|---|
| All UI text (labels, buttons, menus) | MS Sans Serif | 8pt (11px at 96 DPI) | Normal (400) | Bitmap font; use `"MS Sans Serif", "Microsoft Sans Serif", Arial, sans-serif` fallback chain |
| Title bar text | MS Sans Serif | 8pt | Bold (700) | White on blue gradient |
| Tooltip text | MS Sans Serif | 8pt | Normal | Black on light yellow |
| Status bar text | MS Sans Serif | 8pt | Normal | Black on gray |
| Window button glyphs | Marlett | Matched to caption height | Normal | Close/Min/Max/Restore symbols |
| Scrollbar arrow glyphs | Marlett or hand-drawn CSS | N/A | N/A | Small triangles rendered via font or CSS border trick |

On modern systems, "MS Sans Serif" may not be available as a web font. The fallback `"Microsoft Sans Serif"` is the TrueType equivalent. For pixel accuracy, consider bundling the MS W98 UI converted font (available as OTF/TTF conversion of the original bitmap font).

---

## Table Stakes

Features users expect for an authentic Windows 98 appearance. Missing any of these makes the theme feel "off" or incomplete.

### TS-01: Window Chrome (Raised Border Frame)

**What it is:** Every top-level window and panel in Windows 98 has a 4-pixel-wide 3D raised border (the "window border style": raised outer + raised inner). This is the outermost visual frame around the entire application window and around dialog boxes.

**Current state:** The MapSettingsDialog already has this border via box-shadow. The main application window does NOT -- Electron's native frame is used.

**What needs to change:**
- The main Electron window frame should either be custom-drawn (frameless + custom title bar) or rely on the native classic theme
- Dialog boxes (MapSettingsDialog): Already partially implemented, verify exact colors match the canonical values above
- All panel windows/sub-windows within the editor need consistent raised borders
- Border must be exactly 4 pixels wide (2px outer + 2px inner) using the Raised pattern

**States:**
- Normal: Full raised border as described
- Active vs Inactive: Different title bar colors only; border frame itself stays the same

**Complexity:** Medium

---

### TS-02: Title Bar (Active/Inactive with Gradient)

**What it is:** The horizontal bar at the top of each window containing the window title text and the minimize/maximize/close buttons. Windows 98 introduced a left-to-right gradient fill.

**Current state:** The dialog and panel title bars use `linear-gradient(to right, #000080, #1084d0)` which is correct for the active state. No inactive state is implemented.

**What needs to change:**
- Active title bar: `linear-gradient(to right, #000080, #1084d0)` -- already correct
- Inactive title bar: `linear-gradient(to right, #808080, #b4b4b4)` -- needs implementing for unfocused dialogs/panels
- Title bar height: 18px (matching SM_CYCAPTION)
- Title text: MS Sans Serif, 8pt, bold, white (active) or `#c0c0c0` (inactive)
- Title text vertically centered, left-aligned with ~4px left padding
- Optional small 16x16 icon at left edge (system menu icon)

**States:**
- Active: Navy-to-light-blue gradient, white bold text
- Inactive: Gray-to-light-gray gradient, silver text

**Complexity:** Low (mostly CSS, partially done)

---

### TS-03: Caption Buttons (Close, Minimize, Maximize/Restore)

**What it is:** The small square buttons at the right end of the title bar. In Windows 98, these are 16x14px raised buttons containing Marlett font glyphs.

**Current state:** Not implemented in current panel title bars. The dialog has no caption buttons (close is handled by a dialog button).

**What needs to change:**
- Each button: 16x14px with the Raised border pattern
- Close button glyph: Marlett "r" (or an X drawn with CSS/SVG)
- Minimize glyph: Marlett "0" (underscore/line at bottom)
- Maximize glyph: Marlett "1" (small rectangle outline)
- Restore glyph: Marlett "2" (overlapping rectangles)
- Background: `#c0c0c0` (same as button face)
- Grouped together at right side of title bar, 2px spacing

**States:**
- Normal: Raised border
- Hover: No visual change in classic Win98 (no hover effect on caption buttons)
- Pressed: Sunken border, glyph shifts 1px down-right
- Disabled: Grayed-out glyph (embossed text effect: white shadow + gray text)

**Complexity:** Medium (need to render glyphs pixel-accurately)

---

### TS-04: Menu Bar

**What it is:** The horizontal bar below the title bar containing text menu items (File, Edit, View, Help, etc.). In Windows 98, this is a flat gray bar with no border; menu items highlight on hover.

**Current state:** NOT IMPLEMENTED. The app uses an icon toolbar instead. A proper Win98 app needs a menu bar.

**What needs to change:**
- Add a horizontal menu bar below the title bar
- Background: `#c0c0c0` (ButtonFace) -- flat, no border on the bar itself
- Menu items: MS Sans Serif 8pt, black text, with keyboard shortcut underlines
- Item padding: approximately 6px horizontal, 2px vertical
- Height: approximately 19-20px
- Underlined accelerator keys (Alt key activates menu bar)

**States:**
- Normal: Black text on gray, no border
- Hover / Open: Sunken 1px border (dark top-left, light bottom-right), background stays gray
- Disabled item: Gray text with embossed effect (white 1px shadow offset down-right)

**Complexity:** High (new component, keyboard navigation, dropdown submenus)

---

### TS-05: Dropdown Menus

**What it is:** The popup panels that appear when clicking a menu bar item. They have a raised border, contain menu items with icons, text, shortcut labels, and separators.

**Current state:** NOT IMPLEMENTED.

**What needs to change:**
- Raised border (same pattern as window border)
- Background: `#c0c0c0` (ButtonFace)
- Drop shadow: 2px shadow on right and bottom edges (solid black, not blurred)
- Menu items: MS Sans Serif 8pt, black text
- Left gutter (24px wide) for check marks and icons
- Right area for keyboard shortcut text (right-aligned, gray or black)
- Submenu arrow: small right-pointing triangle at far right
- Separator: 2px etched horizontal line (1px `#808080` top + 1px `#ffffff` bottom)
- Selected item: Navy blue (`#000080`) background with white text

**States:**
- Normal item: Black text on gray
- Highlighted item: White text on navy blue
- Disabled item: Embossed gray text (white shadow + gray foreground)
- Separator: Non-interactive etched line
- Submenu: Small right triangle at right edge

**Complexity:** High (new component, keyboard navigation, nesting)

---

### TS-06: Toolbar (Flat Toolbar Buttons with 3D States)

**What it is:** The horizontal bar of icon buttons for tools and actions. In Windows 98 (post-IE4 shell update), toolbar buttons are "flat" by default -- no visible border until hovered.

**Current state:** Toolbar exists with modern styling (border-radius: 4px, smooth transitions). Needs full restyling.

**What needs to change:**
- Toolbar background: `#c0c0c0` (ButtonFace)
- Toolbar has a subtle bottom edge: 1px etched line or just flat
- Buttons: No visible border in default state (flat style)
- Button size: content-dependent, but typically 22x22 or 24x22 for icon-only
- Icon area: 16x16 icons centered in button
- Remove all border-radius (must be 0)
- Remove all CSS transitions (Win98 had instant state changes)
- Remove `transform: translateY(1px)` on active state

**States:**
- Normal: Transparent/flat -- no border, no background
- Hover: Single-pixel raised border (light top-left, dark bottom-right -- just 1px each, not the full 4px window border)
- Pressed / Active: Single-pixel sunken border
- Toggled on (e.g., active tool): Sunken border with hatched/checked background pattern OR solid slightly darker background
- Disabled: Grayed icon (50% opacity or embossed effect), no border interaction

**Separator between button groups:**
- Vertical etched line: 2px wide (1px `#808080` + 1px `#ffffff`), with 2px padding on each side
- Separators should group: File actions | Undo/Redo | Tools | Grid/Settings

**Complexity:** Medium

---

### TS-07: Scrollbars (Track, Thumb, Arrows)

**What it is:** The scroll controls on the map canvas (and any scrollable panels). In Windows 98, scrollbars are 16px wide with distinct arrow buttons, a draggable thumb, and a dithered track.

**Current state:** Custom scrollbars exist at 10px width with rounded thumbs (border-radius: 4px) and modern styling. Needs complete overhaul.

**What needs to change:**
- Width/height: 16px (up from current 10px)
- Arrow buttons: 16x16px, raised border pattern, containing a small black triangle glyph (~5x3px)
- Thumb: Raised border pattern, minimum 16px in the scroll direction, background `#c0c0c0`
- Track: Dithered checkerboard pattern of alternating `#c0c0c0` and `#ffffff` pixels (1x1 alternation)
  - CSS implementation: `background-image` with a 2x2px data URL or repeating gradient
- Corner piece (where H and V scrollbars meet): Solid `#c0c0c0`
- Remove all border-radius (must be 0)
- Remove all CSS transitions

**States:**
- Arrow button normal: Raised border
- Arrow button pressed: Sunken border, glyph shifts 1px down-right
- Arrow button disabled (at scroll extent): Raised border but glyph drawn in disabled color
- Thumb normal: Raised border
- Thumb dragging: Same appearance as normal (no visual change while dragging in Win98)
- Track click: Page scroll; the track area between thumb and arrow is the dithered pattern

**Complexity:** Medium-High (dithered track pattern is a detail that requires care)

---

### TS-08: Panel/Group Box Borders (Etched)

**What it is:** Group boxes (`<fieldset>`) in dialogs, and the borders around panel sections. Uses the etched/grouping border style (sunken outer + raised inner).

**Current state:** Panels use simple 1px solid borders. The MapSettingsDialog does not use group boxes.

**What needs to change:**
- All panel section dividers: Replace single solid borders with etched 2px lines
- Group boxes in settings dialog: `<fieldset>` with etched border
- Legend text: MS Sans Serif 8pt, positioned to interrupt the top border line
- Legend background: Matches parent background to "cut" through the border
- Remove all 1px solid borders and replace with appropriate 3D border style

**Complexity:** Low-Medium

---

### TS-09: Push Buttons (OK, Cancel, Apply, etc.)

**What it is:** Standard command buttons in dialogs. 75px wide, 23px tall, with raised 3D border.

**Current state:** `.win95-button` class exists and is close to correct. Review needed for exact values.

**What needs to change:**
- Verify standard dimensions: 75px wide, 23px tall
- Background: `#c0c0c0` (already correct)
- Font: MS Sans Serif 8pt (already set, verify rendering)
- Padding: 12px horizontal (per 98.css spec)
- Focus indicator: 1px dotted black outline, 4px inside the button edge (already implemented)
- Default button: Extra 1px black border around the outside (the "default push button" indicator)
- Remove hover brightening (Win98 buttons do NOT change on hover)

**States:**
- Normal: Raised border
- Hover: NO CHANGE (this is critical -- Win98 had no button hover state)
- Pressed: Sunken border, text shifts 1px down and 1px right
- Focused: Dotted rectangle inside button, 4px from edges
- Default button: Extra 1px solid black outline around entire button
- Disabled: Same raised border, text uses embossed disabled effect (white shadow + `#808080` text)

**Complexity:** Low (mostly already done, just need to remove hover state and verify)

---

### TS-10: Text Input Fields

**What it is:** Single-line and multi-line text entry fields with sunken 3D borders and white backgrounds.

**Current state:** `.text-input` and `.setting-number-input` classes exist with correct sunken border and white background. Using `#ffffcc` for focus -- non-standard.

**What needs to change:**
- Border: Sunken field border (sunken outer + sunken inner) -- already implemented
- Background: `#ffffff` (already correct)
- Focus background: Should remain `#ffffff`, NOT `#ffffcc` (Win98 did not change input background on focus)
- Focus indication: No visible focus ring on text inputs in Win98 (the blinking cursor was the indicator)
- Text color: `#000000`
- Disabled: Background changes to `#c0c0c0` (ButtonFace), text becomes `#808080`
- Font: MS Sans Serif 8pt

**States:**
- Normal: White background, sunken border, black text
- Focused: Same appearance + blinking text cursor (no background color change)
- Disabled: Gray background (`#c0c0c0`), gray text, same sunken border
- Read-only: Gray background (`#c0c0c0`), black text, same sunken border

**Complexity:** Low

---

### TS-11: Checkboxes

**What it is:** 13x13px square controls with a sunken border. When checked, displays a check mark (Marlett glyph or CSS equivalent).

**Current state:** Not explicitly styled in the current CSS (browser defaults or not used).

**What needs to change:**
- Size: 13x13px box
- Border: Sunken field border (same as text inputs)
- Background: `#ffffff` (white)
- Check mark: Black, rendered as a thick check shape
- Label: MS Sans Serif 8pt, positioned 6px to the right of the checkbox
- Disable native appearance: `-webkit-appearance: none` and custom draw

**States:**
- Unchecked: White box, sunken border, empty
- Checked: White box, sunken border, black check mark
- Disabled unchecked: Gray background (`#c0c0c0`), no check
- Disabled checked: Gray background, gray embossed check mark
- Focused: 1px dotted rectangle around the label text

**Complexity:** Medium (requires custom-drawn checkbox replacing native)

---

### TS-12: Radio Buttons

**What it is:** 12x12px circular controls with a 3D sunken circular border. When selected, shows a filled center dot.

**Current state:** Not explicitly styled (browser defaults or not used).

**What needs to change:**
- Size: 12x12px circle
- Border: Circular version of sunken border (dark top-left arc, light bottom-right arc)
- Background: `#ffffff` (white interior)
- Selected dot: 4x4px black filled circle in center
- Label: MS Sans Serif 8pt, positioned 6px to the right
- Disable native appearance and custom draw

**States:**
- Unselected: White circle, sunken border, empty
- Selected: White circle, sunken border, black center dot
- Disabled: Gray background circle, embossed dot if selected
- Focused: Dotted rectangle around label text

**Complexity:** Medium (circular 3D borders are trickier than rectangular)

---

### TS-13: Dropdown Select (Combobox)

**What it is:** A text field with a dropdown arrow button on the right. The text area has a sunken border; the arrow button has a raised border.

**Current state:** `.wall-select` uses modern styling with border-radius and single border.

**What needs to change:**
- Text area: Sunken field border, white background
- Arrow button: Raised border, `#c0c0c0` background, 17px wide, contains a black down-pointing triangle
- Arrow triangle: ~5px wide, ~3px tall, solid black
- Height: ~21-23px total
- Remove border-radius
- Dropdown list: Raised border, white background, navy highlight for selected item

**States:**
- Normal: Sunken text area + raised arrow button
- Hover: NO CHANGE (no hover effects)
- Open: Arrow button pressed (sunken), dropdown list appears below
- Disabled: Gray background in text area, glyph becomes gray/embossed
- Selected item in list: Navy background, white text

**Complexity:** Medium-High (custom select component needed for accurate dropdown appearance)

---

### TS-14: Tab Controls (Property Sheet Tabs)

**What it is:** The tab strip at the top of property sheets (tabbed dialogs). Each tab is a trapezoidal shape with 3D borders. The selected tab appears to be part of the content area.

**Current state:** Two tab systems exist:
1. Dialog tabs (`.dialog-tabs`): Partially styled with Win95 borders but uses `border-radius: 4px` and has some incorrect details
2. Bottom panel tabs (`.tab-bar`): Modern flat style with underline indicator

**What needs to change:**
- Tab shape: Rectangular with only top corners having at most a 1-2px chamfer (NOT rounded -- Win98 tabs had square corners)
- Selected tab: Slightly taller than unselected, extends 2px below the tab strip line to merge with content area
- Selected tab border: White/light on left and top, gray/dark on right -- bottom border is ABSENT (merges with panel)
- Unselected tabs: Shorter, have a bottom border, appear behind the selected tab
- Content area: Surrounded by raised border on all sides (matching window border)
- Tab strip background: `#c0c0c0`
- Remove `border-radius: 4px` (must be 0 or at most a 1-2px chamfer)
- Remove the modern underline indicator from bottom panel tabs
- Both dialog tabs AND bottom panel tabs must use the same Win98 tab style

**States:**
- Selected: Taller, merged with content area, bold text
- Unselected: Shorter, separated from content, normal weight text
- Hover: NO CHANGE (no hover effect on Win98 tabs)
- Disabled: Gray embossed text

**Complexity:** Medium (getting the "merged with content" illusion right is the main challenge)

---

### TS-15: Sliders / Trackbars

**What it is:** A horizontal or vertical slider with a channel (groove) and a draggable thumb, optionally with tick marks.

**Current state:** Settings dialog has `.setting-slider` with Win95-ish styling (sunken track, raised thumb). Animation panel has `.offset-slider` with modern round styling. Inconsistent.

**What needs to change:**
- Channel: Sunken 2px border, ~4px tall (for horizontal), `#c0c0c0` interior
- Thumb: Pointed or rectangular shape, raised 3D border, ~11x21px (horizontal) or ~21x11px (vertical)
  - Win98 trackbar thumb was a pointed shape (like an upward-pointing pointer) when tick marks are on one side
  - For simplicity, a rectangular raised thumb is acceptable
- Tick marks: Small 3px black lines below (or above) the channel, one per logical unit
- Track area: `#c0c0c0` background
- Both `.setting-slider` and `.offset-slider` must use the same Win98 styling

**States:**
- Normal: Raised thumb
- Dragging: Same appearance (no visual change in Win98)
- Focused: Dotted rectangle around the thumb
- Disabled: Grayed thumb, no interaction

**Complexity:** Low-Medium (mostly CSS; pointed thumb shape is optional refinement)

---

### TS-16: Status Bar

**What it is:** The horizontal bar at the bottom of the application window showing status information in sunken sections, with an optional sizing grip.

**Current state:** Exists as `.status-bar` but uses modern flat styling with subtle border.

**What needs to change:**
- Background: `#c0c0c0` (ButtonFace)
- Each section: Sunken status field border (single sunken outer only -- 1px `#808080` top-left, 1px `#ffffff` bottom-right)
- Section dividers: 1px gap between adjacent sunken sections
- Font: MS Sans Serif 8pt, black text
- Sizing grip: Small triangular pattern of raised dots in the bottom-right corner (3 rows of dots in a triangle arrangement)
- Height: ~22px (based on font height + padding + border)
- Padding: 2px inside each section

**States:**
- Normal: Sunken sections with text
- Sections can contain icons (16x16) alongside text

**Complexity:** Low-Medium

---

### TS-17: Tooltips

**What it is:** The small popup that appears when hovering over a toolbar button or control. Distinctive light yellow background.

**Current state:** Using browser native `title` attributes. No custom tooltip component.

**What needs to change:**
- Background: `#ffffe1` (light yellow -- COLOR_INFOBK)
- Border: 1px solid `#000000` (black)
- Font: MS Sans Serif 8pt, black text
- No border-radius (square corners)
- No box shadow
- Appears after ~400ms hover delay
- Positioned below or to the right of the element
- Single line, no wrapping for short tooltips

**States:**
- Visible: Yellow box with black border and black text
- Hidden: Not rendered

**Complexity:** Medium (need custom tooltip component replacing native browser tooltips)

---

### TS-18: Minimap Border

**What it is:** The minimap overlay in the top-right corner of the canvas area.

**Current state:** Has `border-radius: 4px` and modern box-shadow.

**What needs to change:**
- Remove `border-radius` (must be 0)
- Remove modern `box-shadow: 0 2px 8px rgba(0,0,0,0.3)`
- Apply raised window border (4px 3D raised pattern)
- Background: `#c0c0c0` (or match workspace)

**Complexity:** Low

---

### TS-19: Remove Dark/Light Theme System

**What it is:** The current app has dark/light theme support with a toggle button. Windows 98 had only one look. The theme system needs to be collapsed to a single Win98 theme.

**Current state:** Full CSS custom property theme system with dark (default), light, and system modes. Theme toggle button in toolbar.

**What needs to change:**
- Remove `.theme-light` class and all its variable overrides
- Remove `useTheme` hook and theme toggle button from toolbar
- Replace the two-tier CSS variable system with a single set of Win98 system color variables
- All colors become the Windows 98 Standard palette (documented above)
- The `--workspace-bg: #808080` is already correct for COLOR_APPWORKSPACE

**Complexity:** Medium (touches all CSS files, but is mostly deletion and replacement)

---

### TS-20: Remove All Modern CSS Artifacts

**What it is:** Systematic removal of visual patterns that break the Win98 illusion.

**Current state:** Modern patterns scattered throughout:
- `border-radius: 4px` on multiple elements
- `transition: all 0.15s ease` on buttons and borders
- `rgba()` with alpha transparency
- `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` font stack
- `box-shadow: 0 2px 8px rgba(0,0,0,0.3)` soft shadows
- `transform: translateY(1px)` on active buttons
- Hover color changes on buttons

**What needs to change:**
- Remove ALL `border-radius` (set to 0 everywhere)
- Remove ALL `transition` properties (Win98 had no animations)
- Remove ALL soft/blurred box shadows (only use the crisp 1px inset shadows for 3D borders)
- Replace font stack with `"MS Sans Serif", "Microsoft Sans Serif", Arial, sans-serif`
- Remove `transform` on active states (use padding shift instead: add 1px top-left, remove 1px bottom-right)
- Remove all `rgba()` transparency -- use solid colors only
- Set `font-size: 11px` globally (equivalent to 8pt at 96 DPI)

**Complexity:** Medium (audit and modify all CSS files)

---

## Differentiators

Subtle details that separate a "good enough" Win98 recreation from one that feels genuinely authentic. These are not immediately obvious but contribute to the subconscious sense of "rightness."

### DF-01: Dithered Scrollbar Track Pattern

**Why it matters:** The checkerboard dither pattern on scrollbar tracks is one of the most recognizable subtle textures of Win98. A solid gray track looks "almost right" but something feels off.

**Implementation:** Create a 2x2 pixel repeating pattern alternating `#c0c0c0` and `#ffffff`:
```css
background-image: url("data:image/svg+xml,...") /* 2x2 checkerboard */
/* or */
background: repeating-conic-gradient(#c0c0c0 0% 25%, #ffffff 0% 50%) 0 0 / 2px 2px;
```

**Complexity:** Low

---

### DF-02: Disabled Text Embossed Effect

**Why it matters:** Win98 disabled text was not simply grayed out -- it had a distinctive embossed/etched 3D appearance with a white highlight shadow, giving the impression of text stamped into the surface.

**Implementation:** Two overlapping text layers:
```css
.disabled-text {
  color: #808080;
  text-shadow: 1px 1px 0 #ffffff;
}
```

**Applies to:** Disabled button text, disabled menu items, disabled labels, disabled tab text.

**Complexity:** Low

---

### DF-03: Default Button Extra Border

**Why it matters:** In Win98 dialogs, one button was the "default" (usually OK or Apply). It had an extra 1px solid black border outside the normal raised border, making it subtly thicker than other buttons. This told you which button Enter would press.

**Implementation:** Add `outline: 1px solid #000000` or wrap in a container with `border: 1px solid #000000` for the default button.

**Complexity:** Low

---

### DF-04: Keyboard Accelerator Underlines in Menus

**Why it matters:** Every menu item in Win98 had one letter underlined (the accelerator key). Pressing Alt + that letter activated the item. This is a hallmark of Win98 keyboard accessibility.

**Implementation:** Underline the accelerator letter in each menu item label. In Win98, these underlines were always visible (Windows 2000+ could hide them until Alt was pressed, but Win98 showed them permanently).

**Complexity:** Low (markup change in menu items)

---

### DF-05: Menu Drop Shadow (2px Solid)

**Why it matters:** Win98 dropdown menus had a 2px wide solid black shadow on the right and bottom edges (NOT a soft/blurred CSS shadow). This was a "fake" shadow -- literally two extra black rectangles drawn at the edges.

**Implementation:** `box-shadow: 2px 2px 0 0 #000000` (no blur).

**Complexity:** Low

---

### DF-06: Toolbar Button Toggled State Hatched Background

**Why it matters:** When a toolbar button was "pressed in" (toggled on, like the active tool), Win98 sometimes displayed a hatched/dithered background pattern inside the sunken button. This was a very distinctive visual.

**Implementation:** Use the same 2x2 checkerboard pattern as scrollbar tracks (`#c0c0c0` and `#ffffff` alternating), inside the toggled button area, combined with a sunken 1px border.

**Complexity:** Low

---

### DF-07: Accurate Caption Button Glyphs

**Why it matters:** The Close (X), Minimize (_), Maximize (square), and Restore (overlapping squares) glyphs were pixel-specific shapes from the Marlett font. Using Unicode approximations or emoji looks wrong.

**Implementation options (in order of accuracy):**
1. Bundle Marlett font and use actual glyph characters (Marlett mappings: Close = `r`, Minimize = `0`, Maximize = `1`, Restore = `2`)
2. Draw pixel-accurate glyphs using CSS (tiny elements with specific pixel placement)
3. Use small inline SVGs matching the exact pixel patterns

**Complexity:** Medium

---

### DF-08: Focused Control Dotted Rectangle

**Why it matters:** In Win98, keyboard focus was shown as a 1px dotted black rectangle inside buttons (4px from edges) and around checkbox/radio button labels. This subtle indicator is part of the authentic feel.

**Implementation:**
```css
button:focus {
  outline: 1px dotted #000000;
  outline-offset: -4px;
}
```
Already partially implemented on `.win95-button:focus`. Needs to be applied consistently to all interactive controls.

**Complexity:** Low

---

### DF-09: Progress Bar Segments

**Why it matters:** Win98 progress bars showed progress as discrete blue blocks/segments rather than a smooth fill. Each segment was a small rectangle with 1-2px gaps.

**Implementation:** Use a `linear-gradient` that creates repeating navy blue blocks with gaps:
```css
background: repeating-linear-gradient(
  to right,
  #000080 0px, #000080 8px,
  transparent 8px, transparent 10px
);
```

**Complexity:** Low (only relevant if a progress bar is needed in the app)

---

### DF-10: Workspace (MDI Background)

**Why it matters:** Windows 98 MDI applications showed a gray (`#808080`, COLOR_APPWORKSPACE) background behind the document windows. This is the background visible when the map does not fill the viewport.

**Current state:** `--workspace-bg: #808080` exists but may not be consistently applied.

**What needs to change:** The area behind/around the map canvas should be solid `#808080`. No gradients, no patterns -- just flat gray.

**Complexity:** Low

---

### DF-11: Replace Emoji Toolbar Icons with Pixel Art

**Why it matters:** The current toolbar uses emoji characters as icons. Emoji render differently across platforms, are colorful, anti-aliased, and look distinctly modern. This is the single biggest visual betrayal of the Win98 theme.

**Implementation:**
- Create or source 16x16 pixel art icons in the Win98 16-color style
- Icons should have: hard edges, limited color palette, no anti-aliasing
- Reference: Windows 98 icon sets (alexmeub.com/old-windows-icons)
- Options: custom pixel art, adapted Win98 icon sprites, or monochrome CSS-drawn glyphs

**Complexity:** Medium-High (art asset creation or sourcing required)

---

### DF-12: Cursor Consistency

**Why it matters:** Win98 had specific cursor shapes. Modern OS cursors differ slightly but are generally close enough. For maximum authenticity, custom cursors could be used.

**What to do:**
- Default arrow, I-beam for text, crosshair for canvas: Already correct with native cursors
- For maximum authenticity: Bundle actual Win98 .cur files and use via `cursor: url(...)`
- This is very optional -- native cursors are close enough for nearly everyone

**Complexity:** Low (native cursors are fine; custom cursors are optional polish)

---

## Anti-Features

Modern UI patterns to deliberately remove or avoid. Including any of these would break the Windows 98 illusion.

### AF-01: Border Radius

**What to avoid:** Any `border-radius` value greater than 0. Windows 98 had NO rounded corners on any element.

**What to do instead:** Set `border-radius: 0` globally. Tab corners had at most a 2px chamfer (diagonal cut, not a curve).

**Currently present in:** Toolbar buttons (`border-radius: 4px`), minimap (`border-radius: 4px`), animation panel buttons (`border-radius: 4px`), wall select (`border-radius: 4px`), offset slider thumb (`border-radius: 50%`), place button (`border-radius: 4px`)

---

### AF-02: CSS Transitions and Animations

**What to avoid:** Smooth transitions on hover states, fading, sliding, easing. Windows 98 state changes were instantaneous.

**What to do instead:** Remove all `transition` properties. State changes should be immediate (0ms).

**Currently present in:** Toolbar buttons (`transition: all 0.15s ease`), resize handles (`transition: background-color 0.15s ease`), scrollbar thumbs (`transition: background 0.15s`), dialog tabs (`transition: background-color 0.1s ease`)

---

### AF-03: Soft/Blurred Shadows

**What to avoid:** `box-shadow` with blur radius. Win98 had only crisp, pixel-aligned shadows.

**What to do instead:** Use only `inset` box-shadows with 0 blur for 3D border effects. For dropdown menu shadows, use 2px solid black (no blur).

**Currently present in:** Minimap (`box-shadow: 0 2px 8px rgba(0,0,0,0.3)`), toolbar active button (`box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3)` -- note the blur)

---

### AF-04: Transparency / Alpha Blending

**What to avoid:** `rgba()` colors, `opacity` for visual effects, semi-transparent overlays. Windows 98 had no alpha compositing in its UI.

**What to do instead:** Use solid colors everywhere.

**Exception:** The dialog backdrop can use `rgba(0,0,0,0.5)` as a pragmatic compromise since it is technically outside the Win98 window's rendering.

**Currently present in:** Multiple files use `rgba(255,255,255,0.1)`, `rgba(255,255,255,0.2)`, `rgba(0,0,0,0.3)` etc. for resize handles, borders, shadows.

---

### AF-05: Button Hover Effects

**What to avoid:** Color changes, background transitions, or border changes when hovering over push buttons. Win98 push buttons had NO hover state.

**Exception:** Flat toolbar buttons (post-IE4 shell) DID have a hover state -- a single-pixel raised border appears on hover. This is the ONLY element with a hover effect.

**What to do instead:** Remove `:hover` color/background changes from all push buttons. Keep `:hover` only on flat toolbar buttons (show single-pixel raised border).

**Currently present in:** `.win95-button:hover` changes background to `#d0d0d0`. `.reset-button:hover` changes background and color. Tab `:hover` changes background.

---

### AF-06: Modern Iconography (Emoji Icons)

**What to avoid:** Emoji as toolbar icons. Emoji render differently across platforms and look distinctly modern/colorful, breaking the Win98 aesthetic.

**What to do instead:** Use 16x16 pixel art icons. See DF-11 for details.

**Currently present in:** All toolbar icons are emoji.

---

### AF-07: Underline Tab Indicators

**What to avoid:** Using a colored underline to indicate the active tab. This is a distinctly modern UI pattern (Material Design, etc.).

**What to do instead:** Use the Win98 tab control style where the selected tab merges with the content area.

**Currently present in:** `.tab.active` has `border-bottom: 2px solid var(--accent-primary)` in TabbedBottomPanel.

---

### AF-08: Gradient Backgrounds (Non-Title-Bar)

**What to avoid:** Gradient backgrounds on panels, toolbars, or any element other than the title bar. Only the window title bar has a gradient in Win98.

**What to do instead:** All surfaces are flat solid `#c0c0c0` (ButtonFace).

---

### AF-09: Dynamic Font Sizes / Multiple Font Weights

**What to avoid:** Varied font sizes (12px, 13px, 14px, etc.) and weights (600, 700) throughout the UI. Win98 used a single font at a single size almost everywhere.

**What to do instead:** MS Sans Serif 8pt (11px) normal weight everywhere. Bold only for: title bar text, selected tab text. Remove `text-transform: uppercase` from headers (not a Win98 convention).

**Currently present in:** `.palette-header` uses `font-size: 12px; font-weight: 600; text-transform: uppercase`. `.animation-panel .panel-header` uses `font-size: 13px; font-weight: 600`. Tabs use `font-size: 13px`. Various sizes scattered throughout.

---

### AF-10: Colored Accent Highlights

**What to avoid:** Purple, blue, or any custom-colored accent highlights on buttons, borders, or interactive elements beyond selection. Win98 used navy blue ONLY for selection highlights and title bars.

**What to do instead:** Interactive highlighting uses only `#000080` (navy) for selection backgrounds with `#ffffff` text. All other surfaces are `#c0c0c0` gray.

**Currently present in:** Resize handles turn accent color on hover. Place button uses accent background. The entire dark theme accent system (`#6a6aae`, `#5a5a7e`, etc.).

---

## Feature Dependencies

```
TS-19 (Remove dark theme) ──> TS-20 (Remove modern artifacts) ──> All other TS- items
     |
     v
TS-01 (Window chrome) + TS-02 (Title bar) + TS-03 (Caption buttons)
     |                  [Window frame group]
     v
TS-04 (Menu bar) + TS-05 (Dropdown menus)
     |              [Menu system -- depends on window frame being done]
     |
TS-06 (Toolbar)     [Independent, but should match new theme variables]
     |
TS-07 (Scrollbars)  [Independent]
     |
TS-09..TS-15        [Form controls -- independent of each other, depend on theme variables]
     |
TS-16 (Status bar)  [Independent]
     |
TS-17 (Tooltips)    [Independent, benefits from toolbar being done]
     |
DF-* items          [Can be sprinkled in during or after table stakes]
```

---

## MVP Recommendation

For a first-pass "looks like Win98" milestone, prioritize:

1. **TS-19 + TS-20**: Theme foundation (remove dark theme, remove modern artifacts, establish Win98 color variables)
2. **TS-02 + TS-03**: Title bars and caption buttons on panels/dialogs
3. **TS-06**: Toolbar restyling (flat buttons with 3D states)
4. **TS-07**: Scrollbars (16px, arrow buttons, dithered track)
5. **TS-09**: Push buttons (verify existing .win95-button, remove hover state)
6. **TS-14**: Tab controls (fix both bottom panel tabs and dialog tabs)
7. **TS-16**: Status bar (sunken sections)
8. **TS-10**: Text inputs (remove focus background color change)
9. **DF-02**: Disabled text embossed effect
10. **TS-18**: Minimap border (remove border-radius)

**Defer to post-MVP:**
- TS-04 + TS-05 (Menu bar + dropdowns): High complexity, significant new component work. The existing toolbar can serve as the primary control interface initially.
- TS-11 + TS-12 (Checkboxes + Radio buttons): Only needed if settings dialog uses them
- TS-13 (Custom dropdown select): Only one instance in the current UI (wall selector)
- DF-07 (Marlett font glyphs): CSS/SVG approximations are fine initially
- DF-09 (Progress bar segments): Only if a progress bar exists in the app
- DF-11 (Pixel art icons): Can use monochrome text/CSS glyphs as placeholder; full icon set is art production work
- DF-12 (Custom cursors): Native cursors are close enough

---

## Sources

### PRIMARY (HIGH confidence)
- [98.css by Jordan Scales](https://jdan.github.io/98.css/) -- Pixel-accurate CSS recreation of Win98 controls; CSS variables and border patterns verified against actual Win98 VM screenshots
- [98.css source on GitHub](https://github.com/jdan/98.css/blob/main/style.css) -- Authoritative CSS implementation with exact color values
- [Microsoft Border Style documentation](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb226804(v=vs.85)) -- Official specification of raised/sunken/etched border compositions
- [Microsoft GetSysColor / System Colors](http://www.jasinskionline.com/windowsapi/ref/g/getsyscolor.html) -- System color constant names and default values
- [Microsoft Win32 Status Bars](https://learn.microsoft.com/en-us/windows/win32/controls/status-bars) -- Official status bar specification
- [Microsoft Win32 Trackbar Controls](https://learn.microsoft.com/en-us/windows/win32/controls/trackbar-controls) -- Official slider/trackbar specification
- [Microsoft Win32 Tab Controls](https://learn.microsoft.com/en-us/windows/win32/controls/tab-controls) -- Official tab control specification
- [Marlett font documentation](https://learn.microsoft.com/en-us/typography/font-list/marlett) -- Caption button and UI glyph font

### SECONDARY (MEDIUM confidence)
- [OS-GUI.js](https://os-gui.js.org/) -- Community Win98 recreation with JS+CSS, scrollbar rendering details
- [Windows System Colours by OS (GitHub Gist)](https://gist.github.com/zaxbux/64b5a88e2e390fb8f8d24eb1736f71e0) -- System color values cross-referenced across Windows versions
- [Win98 theme file on GitHub](https://github.com/1j01/98/blob/master/desktop/Themes/Windows%20Official/Windows%2098%20(256%20color).theme) -- Actual Win98 theme file with color definitions
- [Microsoft Sans Serif on Wikipedia](https://en.wikipedia.org/wiki/Microsoft_Sans_Serif) -- Font history and specifications
- [Windows 98 Icons analysis by Alex Meub](https://alexmeub.com/old-windows-icons/) -- Icon design principles and pixel art details

### TERTIARY (LOW confidence -- cross-reference only)
- [Using Only CSS to Recreate Windows 98 (fjolt.com)](https://fjolt.com/article/css-windows-98) -- Blog post with CSS techniques
- [HackerNoon Win98 CSS article](https://hackernoon.com/recreate-windows-98-with-css) -- Community recreation guide
- [Win98 scrollbar CodePen by BeardedBear](https://codepen.io/BeardedBear/details/jObVXmV) -- Scrollbar recreation reference
- [Win98 gradient title bars discussion (VOGONS)](https://www.vogons.org/viewtopic.php?t=69710) -- Title bar gradient technical details
