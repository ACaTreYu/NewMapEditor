# Phase 28: Core UI Modernization - Research

**Researched:** 2026-02-08
**Domain:** CSS modernization and design token completeness
**Confidence:** HIGH

## Summary

Phase 28 builds on Phase 27's CSS design system foundation by eliminating the remaining hardcoded CSS values across all components. Phase 27 successfully removed all Win98 variables (192 references → 0) and established a 2-tier design token system (OKLCH primitives + semantic aliases), but left some hardcoded values in place for legacy compatibility.

The remaining work involves auditing all component CSS files for hardcoded hex colors (#ffffff, #c0c0c0, rgba values), hardcoded pixel values for spacing/sizing, and hardcoded typography values. The scrollbar components already use modern design tokens from Phase 27, so UI-10 may be partially or fully satisfied.

**Primary recommendation:** Systematically audit all 14 component CSS files, catalog every hardcoded value (colors, spacing, typography), create missing design tokens as needed, and replace hardcoded values with var() references. Focus on the 7 files with known hardcoded hex colors first, then address spacing/typography tokens.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Design token system | Browser-native, zero dependencies, excellent performance |
| OKLCH Color Space | Native | Modern color primitives | Perceptually uniform, better for programmatic color scales |
| System Font Stack | Native | Typography | Native OS fonts provide best performance and accessibility |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rgba() fallback | Native | Shadow and overlay colors | When OKLCH doesn't work (shadows, semi-transparent overlays) |
| calc() expressions | Native | Dynamic spacing values | When tokens need mathematical relationships |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS Variables | SCSS/LESS variables | CSS vars are runtime-modifiable and theme-able; preprocessor vars compile away |
| OKLCH colors | RGB/HSL | OKLCH is more perceptually uniform but requires fallbacks for older browsers |
| System fonts | Web fonts (Inter, Roboto) | System fonts are faster (no download) but less consistent cross-platform |

**Installation:**
No packages needed - all CSS native features.

## Architecture Patterns

### Recommended Project Structure

Current structure (already established in Phase 27):
```
src/
├── styles/
│   └── variables.css         # Single source of truth for all design tokens
├── components/
│   └── [Component]/
│       ├── Component.tsx
│       └── Component.css     # Uses var() references to variables.css
└── App.css                   # Global styles, imports variables.css
```

### Pattern 1: Two-Tier Design Token System

**What:** Separate primitive values (Tier 1) from semantic aliases (Tier 2)
**When to use:** Always for maintainable design systems
**Example:**
```css
/* Tier 1: Primitives */
:root {
  --color-neutral-300: oklch(80% 0.005 280);
  --space-1: 8px;
  --font-size-xs: 11px;
}

/* Tier 2: Semantic Aliases */
:root {
  --text-disabled: var(--color-neutral-300);
  --input-padding: var(--space-1);
  --label-size: var(--font-size-xs);
}

/* Component CSS uses Tier 2 only */
.my-input {
  padding: var(--input-padding);
  color: var(--text-disabled);
  font-size: var(--label-size);
}
```

### Pattern 2: Text-on-Color Tokens

**What:** Define explicit tokens for text that appears on colored backgrounds
**When to use:** When hardcoded #ffffff appears for text on buttons/highlights
**Example:**
```css
:root {
  /* Tier 2: Text-on-color tokens */
  --text-on-accent: #ffffff;
  --text-on-dark: #ffffff;
  --text-on-light: var(--color-neutral-900);
}

.accent-button {
  background: var(--accent-primary);
  color: var(--text-on-accent);  /* NOT #ffffff */
}
```

### Pattern 3: Compact Spacing Tokens

**What:** Small spacing values (1-6px) for compact UI elements
**When to use:** For tight padding on small buttons, minimal gaps
**Example:**
```css
:root {
  /* Tier 1: Compact spacing (sub-8px) */
  --space-0_5: 4px;   /* Half step */
  --space-0_25: 2px;  /* Quarter step */
  --space-0_125: 1px; /* Eighth step */
}

.compact-button {
  padding: var(--space-0_25) var(--space-0_5);  /* 2px 4px */
}
```

### Pattern 4: Typography Scale Tokens

**What:** Font size tokens for all text sizes in the UI
**When to use:** When hardcoded 9px, 10px, 11px, 12px appear
**Example:**
```css
:root {
  /* Tier 1: Typography scale */
  --font-size-2xs: 9px;   /* Tiny labels */
  --font-size-xs: 11px;   /* Small UI text */
  --font-size-sm: 13px;   /* Compact controls */
  --font-size-base: 14px; /* Body text */

  /* Font weights */
  --font-weight-semibold: 600;
}

.tiny-label {
  font-size: var(--font-size-2xs);
}
```

### Anti-Patterns to Avoid

- **Hardcoded magic numbers:** `padding: 6px 10px;` → Use tokens or create new ones if missing
- **Inline hex colors:** `color: #ffffff;` → Create semantic token like `--text-on-accent`
- **Mixed token usage:** Using `var(--space-1)` and `4px` in same file → Pick tokens consistently
- **Over-tokenization:** Creating tokens for one-off values used in a single place → Acceptable for truly unique values
- **Under-tokenization:** Reusing raw values across files → DRY principle applies to design values

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color scales | Manual hex codes for neutral grays | OKLCH-based primitive scales | Perceptually uniform steps, easier to maintain |
| Spacing systems | Arbitrary pixel values | 8px grid system | Visual consistency, easier to align components |
| Focus states | Custom outlines and borders | CSS outline + box-shadow combo | Accessibility, browser consistency |
| Text on color | Hardcoded white/black | Semantic text-on-* tokens | Theme-ability, maintainability |

**Key insight:** The temptation with CSS is to hardcode "just this one value" because it's faster than creating a token. But this creates maintenance debt - every hardcoded value is a future refactor when the design system evolves.

## Common Pitfalls

### Pitfall 1: Incomplete Token Migration

**What goes wrong:** After creating design tokens, some hardcoded values remain scattered in component CSS files
**Why it happens:** Grep searches miss edge cases (rgba with spaces, multi-line values, calc expressions with hardcoded px)
**How to avoid:**
- Run multiple grep patterns: `grep -rE ":\s*#[0-9a-fA-F]"`, `grep -rE ":\s*[0-9]+px"`, `grep -rE "rgba?\([0-9]"`
- Manually audit each CSS file line-by-line for the most critical files
- Use browser DevTools to inspect computed styles and verify token usage
**Warning signs:**
- Different components have slightly different "disabled" colors
- Spacing feels inconsistent across UI
- Some hover states look different despite same intent

### Pitfall 2: Token Naming Inconsistency

**What goes wrong:** Some tokens use generic names (--text-light) while others are specific (--animation-panel-label-color)
**Why it happens:** Tokens added incrementally without naming conventions
**How to avoid:**
- Establish naming pattern: `--{category}-{variant}-{state}`
- Examples: `--text-disabled`, `--border-focus`, `--bg-hover`
- Component-specific tokens should be semantic: `--canvas-bg`, not `--map-canvas-background-color-value`
**Warning signs:**
- Hard to find the right token when styling a new component
- Token names don't clearly indicate their purpose
- Duplicate tokens with different names for same value

### Pitfall 3: Missing Compact Spacing Tokens

**What goes wrong:** 8px grid system is too coarse for compact UI elements (small buttons, tight labels)
**Why it happens:** Grid system designed for layouts, not all UI elements
**How to avoid:**
- Add fractional spacing tokens: `--space-0_5: 4px`, `--space-0_25: 2px`, `--space-0_125: 1px`
- Use these for internal padding on small elements
- Still align outer spacing to 8px grid
**Warning signs:**
- Hardcoded 1px, 2px, 4px, 6px values in component CSS
- Buttons and inputs look cramped or oversized
- Inconsistent padding on similar small elements

### Pitfall 4: OKLCH Browser Support

**What goes wrong:** OKLCH colors don't render in older browsers (pre-2023)
**Why it happens:** OKLCH is a newer CSS color space
**How to avoid:**
- Provide fallback for critical colors: `color: rgb(51, 51, 51); color: oklch(20% 0 0);`
- Use rgba() for shadows and semi-transparent colors (OKLCH doesn't work well here)
- Test in target browsers (Electron uses Chromium 114+, OKLCH supported)
**Warning signs:**
- Colors appear black or transparent in older browsers
- Shadows use OKLCH with alpha channel (not well-supported)

### Pitfall 5: Over-Specific Scrollbar Styling

**What goes wrong:** Custom scrollbar CSS breaks in different browsers or OS themes
**Why it happens:** Scrollbar pseudo-elements are non-standard and browser-specific
**How to avoid:**
- Use simple, minimal scrollbar styling
- Stick to webkit pseudo-elements for Chromium-based apps
- Test with different OS themes (light/dark mode)
- Keep scrollbar colors in design tokens for maintainability
**Warning signs:**
- Scrollbars look broken in Firefox or Safari
- Scrollbar disappears in dark mode
- Thumb is invisible against track

## Code Examples

Verified patterns from the existing codebase (Phase 27):

### Complete Token Migration Example

```css
/* BEFORE (Phase 27 input): */
.toolbar-button {
  background: var(--win98-ButtonFace);
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonDkShadow);
  color: var(--win98-ButtonText);
}

/* AFTER (Phase 27 output): */
.toolbar-button {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
}

.toolbar-button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.toolbar-button:active:not(:disabled) {
  background: var(--bg-active);
  border-color: var(--border-default);
}
```

### Remaining Hardcoded Values to Fix

```css
/* CURRENT (post-Phase 27, needs Phase 28): */
.animation-preview-canvas {
  background: #c0c0c0;  /* HARDCODED - should be var(--canvas-checkerboard-bg) or token */
}

.use-btn {
  color: #ffffff;  /* HARDCODED - should be var(--text-on-accent) */
}

.preview-header {
  padding: 6px 10px;  /* HARDCODED - should be var(--space-0_5) var(--space-1_25) or similar */
}

.tiny-label {
  font-size: 9px;  /* HARDCODED - should be var(--font-size-2xs) */
}

/* PROPOSED (Phase 28 target): */
:root {
  /* Add missing tokens */
  --canvas-checkerboard-bg: var(--color-neutral-300);
  --text-on-accent: #ffffff;
  --space-0_5: 4px;
  --space-0_75: 6px;
  --space-1_25: 10px;
  --font-size-2xs: 9px;
}

.animation-preview-canvas {
  background: var(--canvas-checkerboard-bg);
}

.use-btn {
  color: var(--text-on-accent);
}

.preview-header {
  padding: var(--space-0_75) var(--space-1_25);
}

.tiny-label {
  font-size: var(--font-size-2xs);
}
```

### Scrollbar Modernization (Already Done in Phase 27)

```css
/* Source: E:\NewMapEditor\src\components\MapCanvas\MapCanvas.css */
.scroll-track-h {
  background: var(--scrollbar-track);
  border-top: 1px solid var(--border-default);
}

.scroll-thumb-h {
  background: var(--scrollbar-thumb);
}

.scroll-thumb-h:hover {
  background: var(--scrollbar-thumb-hover);
}

.scroll-thumb-h:active {
  background: var(--accent-active);
}

/* This is already using modern design tokens - UI-10 likely satisfied */
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Win98 beveled borders (4-sided highlight/shadow) | Flat 1px borders + border-radius + box-shadow | Phase 27 (Feb 2026) | Modern appearance, GPU-accelerated shadows |
| Hardcoded RGB colors (#C0C0C0) | OKLCH primitives + semantic aliases | Phase 27 (Feb 2026) | Perceptually uniform, easier to theme |
| Preprocessor variables (SCSS/LESS) | CSS Custom Properties | Industry shift ~2020 | Runtime theming, better DevTools support |
| Fixed font sizes | Responsive typography scales | Industry best practice ~2018 | Better readability, accessibility |
| Separate light/dark stylesheets | Single stylesheet with var() tokens | Industry shift ~2019 | Easier maintenance, live theme switching |

**Deprecated/outdated:**
- `var(--win98-*)` tokens: Removed in Phase 27, replaced with modern semantic tokens
- Beveled border pseudo-elements: Removed in Phase 27, replaced with box-shadow elevation
- Bitmap fonts (MS Sans Serif): Removed in Phase 27, replaced with system font stack

## Open Questions

1. **Should compact spacing tokens follow strict mathematical scale or pragmatic values?**
   - What we know: Current codebase has 1px, 2px, 4px, 6px hardcoded values
   - What's unclear: Should we use strict halves (8px → 4px → 2px → 1px) or add pragmatic 6px?
   - Recommendation: Use pragmatic values for now (`--space-0_75: 6px`) since UI already relies on 6px spacing. Can consolidate later if design evolves.

2. **Should all #ffffff be tokenized or only semantic usage?**
   - What we know: #ffffff appears for text-on-accent (semantic) and canvas backgrounds (literal white)
   - What's unclear: Is pure white a primitive or always semantic?
   - Recommendation: Create `--text-on-accent: #ffffff` for semantic usage, but `--color-white: #ffffff` as primitive is acceptable for literal white backgrounds. Components should prefer semantic tokens.

3. **Should rgba() values be converted to OKLCH equivalents?**
   - What we know: Shadows use rgba() successfully (Phase 27), some semi-transparent overlays use rgba()
   - What's unclear: OKLCH with alpha channel support is inconsistent across browsers
   - Recommendation: Keep rgba() for shadows and semi-transparent colors. OKLCH works best for opaque colors.

4. **How to handle component-specific spacing that doesn't fit the grid?**
   - What we know: Some components use 1px, 2px, 3px for internal alignment
   - What's unclear: Should every pixel value have a token, or are some exceptions OK?
   - Recommendation: Tokenize recurring values (1px, 2px, 4px appear multiple times). One-off values in a single component can remain hardcoded with a comment explaining why.

## Sources

### Primary (HIGH confidence)
- Phase 27 execution artifacts: `E:\NewMapEditor\.planning\phases\27-css-design-system\`
  - 27-01-PLAN.md: Modern token system creation
  - 27-02-PLAN.md: Component CSS migration (192 Win98 refs → 0)
  - 27-VERIFICATION.md: Verification of Phase 27 completion
- Codebase inspection: `E:\NewMapEditor\src\`
  - variables.css: Complete 2-tier token system (OKLCH primitives + semantic aliases)
  - Component CSS files: All 14 files inspected for current state
  - MapCanvas.css: Scrollbar implementation already using modern tokens

### Secondary (MEDIUM confidence)
- CSS Custom Properties specification: MDN Web Docs (standard reference)
- OKLCH color space: CSS Color Module Level 4 (W3C standard)
- 8px grid systems: Material Design, Tailwind CSS documentation (industry patterns)

### Tertiary (LOW confidence)
- None used - all findings from direct codebase inspection and official specs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All CSS native features, well-documented
- Architecture: HIGH - Patterns already established in Phase 27, verified in production
- Pitfalls: HIGH - Based on direct codebase inspection and Phase 27 learnings

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days - CSS standards are stable, design system is mature)

---

## Codebase Audit Summary

**Hardcoded hex colors found (7 instances):**
- `AnimationPreview.css`: `background: #c0c0c0;`, `color: #ffffff;`
- `GameObjectToolPanel.css`: `color: #cc4400;`
- `MapSettingsDialog.css`: `color: #ffffff;`
- `TeamSelector.css`: `color: #ffffff;`
- `ToolBar.css`: `color: #ffffff;` (2 instances)

**Hardcoded rgba colors found (3 instances):**
- `MapSettingsDialog.css`: `rgba(0, 0, 0, 0.5)` (dialog overlay), `rgba(16, 132, 208, 0.2)` (focus ring, 2 instances)

**Hardcoded spacing found (30+ instances across 8 files):**
- AnimationPanel.css, AnimationPreview.css, GameObjectToolPanel.css, MapSettingsDialog.css, MapSettingsPanel.css, StatusBar.css, TeamSelector.css, TilePalette.css
- Common values: 1px, 2px, 4px, 6px, 10px, 12px (non-8px-grid values)

**Hardcoded font sizes found (20+ instances across 4 files):**
- AnimationPanel.css: 9px, 10px
- AnimationPreview.css: 9px, 10px, 11px
- GameObjectToolPanel.css: 9px, 10px
- MapSettingsDialog.css: 10px, 12px

**Hardcoded font weights found (1 instance):**
- AnimationPreview.css: `font-weight: 600;` (should be `var(--font-weight-semibold)`)

**Scrollbar status (UI-10):**
- MapCanvas.css scrollbars already use modern tokens: `var(--scrollbar-track)`, `var(--scrollbar-thumb)`, `var(--scrollbar-thumb-hover)`, `var(--border-default)`, `var(--bg-hover)`, `var(--bg-active)`, `var(--text-secondary)`
- **UI-10 appears SATISFIED** - scrollbars display neutral-colored modern styling via design tokens
