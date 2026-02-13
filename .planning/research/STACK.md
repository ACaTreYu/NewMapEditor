# Stack Research: v2.9 Measurement & Grid

**Domain:** Ruler tool measurement overlays, grid customization controls, selection info labels
**Researched:** 2026-02-13
**Confidence:** HIGH

## Executive Summary

**No new dependencies required.** All three features (ruler tool, grid customization, selection info) can be implemented using existing validated capabilities:
- Canvas 2D API (already in use for rendering)
- Native HTML inputs (already in use for range/number, add type="color")
- Standard JavaScript Math API (Math.hypot for distance)

This milestone is a **pure feature addition** with zero stack changes.

## Recommended Stack

### Core Technologies (Unchanged)

All existing technologies remain as-is. No additions, no changes, no version bumps.

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Canvas 2D API | Browser native | Ruler overlays, measurement labels, grid rendering | Already validated in CanvasEngine |
| HTML5 inputs | Browser native | Grid customization controls (opacity/weight/color) | Already using range/number, add type="color" |
| JavaScript Math | ES6+ | Distance calculations (Math.hypot) | Standard library, no install |

### Supporting Libraries (None)

**No supporting libraries needed.** All functionality available via:
- CanvasRenderingContext2D (strokeStyle, lineWidth, fillText, measureText)
- Standard DOM events (already handled in MapCanvas.tsx)
- Zustand (already managing state)

## Feature-Specific Stack Usage

### 1. Ruler Tool (4 modes)

**What's needed:**
- Distance calculation: `Math.hypot(dx, dy)` for Euclidean distance
- Text rendering: `ctx.fillText()` for measurement labels
- Text measurement: `ctx.measureText()` for label positioning
- Line drawing: `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.stroke()`
- Coordinate transforms: Account for viewport zoom/pan

**Stack:**
- Canvas 2D API — already in use
- Math.hypot — ES6 standard (100% Electron support)

**Confidence:** HIGH (official MDN documentation, battle-tested in production)

### 2. Grid Customization

**What's needed:**
- Opacity control: `input type="range"` (0-100%)
- Line weight control: `input type="range"` (1-5px)
- Color control: `input type="color"` (hex color picker)
- Grid rendering: `ctx.strokeStyle`, `ctx.lineWidth`, `ctx.globalAlpha`

**Stack:**
- Native HTML inputs — already using range/number in StatusBar and SettingInput
- Canvas 2D API — already using createPattern for grid in MapCanvas.tsx
- Input type="color" — 92% browser support (Electron = Chromium = 100%)

**Confidence:** HIGH (already validated pattern, native browser API)

**Why native input over library:**
- Electron uses Chromium (consistent rendering)
- Zero bundle size increase
- Already using native inputs for zoom/settings
- Cross-platform styling via CSS (matches existing design tokens)

### 3. Selection Info Labels

**What's needed:**
- Text rendering: `ctx.fillText()` for dimension labels
- Text measurement: `ctx.measureText()` for bounds/centering
- Background rectangles: `ctx.fillRect()` for label backgrounds
- Text positioning: Calculate actualBoundingBoxAscent/Left for precise bounds

**Stack:**
- Canvas 2D API — TextMetrics interface for precise positioning
- UI overlay canvas — already exists in MapCanvas.tsx (separate from map buffer)

**Confidence:** HIGH (standard Canvas API, already rendering text in other contexts)

## Installation

**No new packages.** This milestone requires zero npm installs.

```bash
# Existing dependencies remain unchanged
# package.json: No modifications needed
```

## Alternatives Considered

### Color Picker Libraries

| Library | Why NOT Recommended |
|---------|---------------------|
| react-colorful (2.8 KB) | Overkill — native input sufficient for simple hex colors |
| react-color (40+ KB) | Heavy — 13 picker styles unnecessary for 1 grid color |
| PrimeReact ColorPicker | Adds dependency — breaks "zero new deps" principle |

**Decision:** Use `<input type="color">` because:
- Native, zero bundle size
- Matches existing pattern (native range/number inputs)
- Chromium color picker is consistent and functional
- Grid color is a utility setting, not a core design feature
- Can be styled with CSS to match design tokens

### Distance Calculation Approaches

| Approach | Why NOT Recommended |
|----------|---------------------|
| Manual `Math.sqrt(dx*dx + dy*dy)` | Verbose, less readable than Math.hypot |
| Vector math library | Overkill for simple 2D Euclidean distance |
| Lodash distance helper | Adds dependency for single function |

**Decision:** Use `Math.hypot(dx, dy)` because:
- ES6 standard (100% support)
- Cleaner than manual sqrt
- Handles edge cases (overflow/underflow)
- Zero dependencies

### Text Rendering Libraries

| Library | Why NOT Recommended |
|---------|---------------------|
| Fabric.js text objects | Heavy framework for simple labels |
| Konva.js text nodes | Scene graph overhead for static labels |
| Canvas text libraries | Canvas 2D API already sufficient |

**Decision:** Use native Canvas 2D text APIs because:
- Already using ctx.fillText() in other components
- TextMetrics provides precise positioning
- No layout complexity (simple measurement labels)
- Renders at 60fps with RAF-debounced overlay

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Third-party color picker | Adds bundle size, unnecessary | Native `<input type="color">` |
| Chart/graph libraries | Heavy for simple ruler overlays | Canvas 2D API directly |
| DOM-based measurement | Doesn't scale with zoom | Canvas-based overlays |
| CSS grid overlays | Poor performance at scale | Canvas createPattern fill |

## Integration Points

### Ruler Tool → CanvasEngine

- **Where:** UI overlay canvas (already exists in MapCanvas.tsx)
- **How:** RAF-debounced rendering during drag, same as selection marching ants
- **State:** Ruler start/end coords in ref (no Zustand spam), commit on mouseup
- **Text positioning:** Use `ctx.measureText()` to center labels above/below line

### Grid Customization → Zustand GlobalSlice

- **Where:** Add `gridOpacity`, `gridLineWidth`, `gridColor` to GlobalSlice
- **How:** Persist to localStorage (like other global preferences)
- **Rendering:** Modify existing createPattern grid in MapCanvas.tsx
- **Controls:** New GridSettingsPanel with range inputs + color input

### Selection Info → UI Overlay

- **Where:** Render on existing UI overlay canvas
- **When:** Active selection + not dragging
- **Text:** "WxH tiles" label at top-left or bottom-right of selection
- **Background:** Semi-transparent rect for readability

## Version Compatibility

All features use browser-native APIs. No compatibility concerns.

| API | Version | Notes |
|-----|---------|-------|
| Math.hypot | ES6 (2015) | 100% support in Chromium/Electron |
| input type="color" | HTML5 | 92% browser support, 100% Chromium |
| Canvas 2D API | Stable since 2014 | No breaking changes |
| TextMetrics | Stable since 2016 | actualBoundingBox properties available |

## Stack Patterns

**If adding future color customization (tileset palette, etc.):**
- Consider react-colorful (2.8 KB, TypeScript, tree-shakable)
- Only when multiple color pickers needed (3+ colors)
- For single colors, native input remains preferred

**If adding vector graphics (SVG export, etc.):**
- Do NOT mix SVG with Canvas rendering
- Keep Canvas for runtime, use separate SVG generation
- Consider Fabric.js only if full scene graph needed

## Sources

### Canvas 2D API
- [CanvasRenderingContext2D - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) — Core API reference
- [strokeStyle property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle) — Grid line styling
- [measureText() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText) — Text positioning
- [TextMetrics interface - MDN](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics) — Precise text bounds

### HTML5 Inputs
- [Input type="color" - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/color) — Color picker spec
- [Color input browser support - Can I use](https://caniuse.com/input-color) — 92% browser support

### JavaScript Math
- [Math.hypot() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/hypot) — Distance calculation
- [Calculate Euclidean distance - 30 seconds of code](https://www.30secondsofcode.org/js/s/euclidean-distance/) — Implementation examples

### Text Positioning
- [Better positioning of text using measureText - Chewett blog](https://chewett.co.uk/blog/1166/better-positioning-of-text-using-measuretext-with-html5-canvas/) — Practical positioning techniques
- [Understanding Canvas Text Metrics - Erik Onarheim](https://erikonarheim.com/posts/canvas-text-metrics/) — Text measurement deep dive

### React Color Pickers (Considered but NOT used)
- [react-colorful - npm](https://www.npmjs.com/package/react-colorful) — 2.8 KB, TypeScript (considered for future)
- [10 Best Color Pickers for React - ReactScript](https://reactscript.com/best-color-picker/) — 2026 comparison (research reference)

---
*Stack research for: v2.9 Measurement & Grid ruler tool, grid customization, selection info labels*
*Researched: 2026-02-13*
*Confidence: HIGH — All features use validated existing stack (Canvas 2D, native inputs, Math API)*
