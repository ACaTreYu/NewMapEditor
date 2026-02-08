# Phase 27: CSS Design System - Research

**Researched:** 2026-02-08
**Domain:** CSS design systems, modern minimalist UI, CSS custom properties
**Confidence:** HIGH

## Summary

Phase 27 establishes a modern minimalist design foundation by replacing the existing Win98 theme system with contemporary CSS design patterns. The project currently uses a well-structured two-tier CSS variable system (Tier 1: Win98 primitives → Tier 2: semantic tokens) that can be migrated efficiently by replacing Tier 1 values while preserving Tier 2 semantic names.

Research reveals strong browser support for modern CSS features in Electron 28 (Chromium 120), including OKLCH colors and cascade layers. The 8px grid system is industry-standard, supported by Apple HIG and Material Design. Light neutral palettes with subtle shadows (opacity 0.1-0.2) align with 2026 design trends emphasizing soft, accessible interfaces.

**Primary recommendation:** Preserve the existing two-tier variable architecture. Replace Win98 primitive values with modern equivalents (OKLCH colors, system fonts, 8px spacing scale). Remove Win98-specific CSS files and bevel classes. Use subtle drop shadows for depth instead of 3D border effects.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Design tokens | W3C standard, universal browser support, runtime themability |
| OKLCH Color Space | Native | Perceptually uniform colors | 93% browser support (Chrome 111+, included in Chromium 120), predictable lightness manipulation |
| System Font Stack | Native | Typography | Zero network latency, OS-native appearance, accessibility |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @layer (Cascade Layers) | Native (optional) | Style organization | When managing complex specificity hierarchies; supported since Chromium 99 |
| @supports | Native | Feature detection | Providing fallbacks for OKLCH (though not needed for Electron 28) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OKLCH | RGB/HSL hex colors | OKLCH provides perceptually uniform lightness; RGB/HSL easier for non-technical users but requires tools for palette generation |
| CSS Variables | Sass variables | CSS variables allow runtime changes and theming; Sass requires compile-time changes |
| System fonts | Custom web fonts | System fonts are instant (no FOUT); custom fonts enable unique branding but add load time |

**Installation:**
```bash
# No dependencies required - all native CSS features
```

## Architecture Patterns

### Recommended Project Structure
```
src/styles/
├── variables.css         # NEW: Modern design tokens (replaces win98-variables.css)
├── tokens/               # OPTIONAL: Organized token files
│   ├── colors.css       # Color primitives and semantic aliases
│   ├── spacing.css      # 8px grid spacing scale
│   ├── typography.css   # Font families, sizes, line heights
│   └── shadows.css      # Elevation/depth shadows
└── (deleted)
    ├── win98-variables.css   # DELETE
    ├── win98-schemes.css     # DELETE
    ├── win98-bevels.css      # DELETE
    └── win98-typography.css  # DELETE
```

### Pattern 1: Three-Tier Design Token Hierarchy

**What:** Organize CSS variables in primitive → semantic → component layers
**When to use:** Managing design systems with 50+ components requiring consistent theming

**Example:**
```css
/* Tier 1: Primitive tokens (raw values) */
:root {
  /* Colors - OKLCH for perceptual uniformity */
  --color-neutral-0: oklch(100% 0 0);        /* Pure white */
  --color-neutral-50: oklch(98% 0 0);        /* Off-white */
  --color-neutral-100: oklch(95% 0 0);       /* Light grey */
  --color-neutral-200: oklch(90% 0 0);
  --color-neutral-300: oklch(80% 0 0);
  --color-neutral-500: oklch(60% 0 0);       /* Mid grey */
  --color-neutral-700: oklch(30% 0 0);       /* Dark grey */
  --color-neutral-900: oklch(20% 0 0);       /* Near black */

  --color-blue-500: oklch(60% 0.15 250);     /* Primary blue */
  --color-blue-600: oklch(50% 0.15 250);     /* Darker blue */

  /* Spacing - 8px base unit */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Tier 2: Semantic aliases (context-aware names) */
:root {
  /* Surface colors */
  --surface: var(--color-neutral-0);
  --surface-secondary: var(--color-neutral-50);

  /* Text colors */
  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-700);
  --text-tertiary: var(--color-neutral-500);

  /* Background colors */
  --bg-primary: var(--color-neutral-0);
  --bg-secondary: var(--color-neutral-50);
  --bg-hover: var(--color-neutral-100);

  /* Border colors */
  --border-default: var(--color-neutral-300);
  --border-subtle: var(--color-neutral-200);

  /* Accent colors */
  --accent-primary: var(--color-blue-500);
  --accent-hover: var(--color-blue-600);
}

/* Tier 3: Component tokens (component-specific overrides) */
.toolbar {
  --toolbar-bg: var(--surface);
  --toolbar-border: var(--border-subtle);
  --toolbar-button-hover: var(--bg-hover);
}
```

**Sources:**
- [The developer's guide to design tokens and CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [Navigating the World of Design Tokens Naming Conventions](https://medium.com/@ebomb1000/navigating-the-world-of-design-tokens-naming-conventions-144aeba3ceaa)

### Pattern 2: 8px Grid Spacing System

**What:** Base all spacing values on multiples of 8px for consistent rhythm and alignment
**When to use:** Always, for padding, margins, gaps, and component sizing

**Example:**
```css
/* Spacing scale based on 8px base unit */
:root {
  --space-0: 0;
  --space-1: 8px;    /* 1 × base */
  --space-2: 16px;   /* 2 × base */
  --space-3: 24px;   /* 3 × base */
  --space-4: 32px;   /* 4 × base */
  --space-5: 40px;   /* 5 × base */
  --space-6: 48px;   /* 6 × base */
  --space-8: 64px;   /* 8 × base */
  --space-10: 80px;  /* 10 × base */
}

/* Component usage */
.toolbar {
  padding: var(--space-1) var(--space-2);  /* 8px 16px */
  gap: var(--space-1);                     /* 8px */
}

.panel {
  padding: var(--space-3);                 /* 24px */
}

.dialog {
  padding: var(--space-4);                 /* 32px */
}
```

**Why 8px:**
- Highly divisible (half is 4px, quarter is 2px)
- Aligns with common screen resolutions and device pixel ratios
- Endorsed by Apple HIG and Material Design
- Forces consistent spacing decisions

**Sources:**
- [The 8pt Grid: Consistent Spacing in UI Design](https://cieden.com/book/sub-atomic/spacing/spacing-best-practices)
- [Spacing units | U.S. Web Design System](https://designsystem.digital.gov/design-tokens/spacing-units/)

### Pattern 3: System Font Stack

**What:** Use OS-native fonts for zero latency and native appearance
**When to use:** Default for all UI text; custom fonts only for branding when needed

**Example:**
```css
:root {
  /* System UI font stack */
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, 'Courier New', monospace;

  /* Font sizes aligned to 8px grid (line heights as multiples) */
  --font-size-xs: 11px;      /* Line height: 16px (2×8) */
  --font-size-sm: 13px;      /* Line height: 16px (2×8) */
  --font-size-base: 14px;    /* Line height: 24px (3×8) */
  --font-size-lg: 16px;      /* Line height: 24px (3×8) */
  --font-size-xl: 18px;      /* Line height: 24px (3×8) */

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}

body {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  line-height: 1.5; /* 24px for 16px text */

  /* Modern font rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Sources:**
- [Modern Font Stacks](https://modernfontstacks.com/)
- [System fonts repository](https://github.com/system-fonts/modern-font-stacks)

### Pattern 4: Subtle Depth with Drop Shadows

**What:** Replace 3D beveled borders with subtle drop shadows for modern depth
**When to use:** Cards, panels, elevated UI elements, interactive states

**Example:**
```css
/* Shadow elevation scale */
:root {
  /* Base shadows using rgba for broad compatibility */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Card with subtle elevation */
.panel {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
}

/* Interactive elevation on hover */
.toolbar-button {
  transition: box-shadow 150ms ease;
}

.toolbar-button:hover {
  box-shadow: var(--shadow-md);
}

/* Dialog with prominent elevation */
.dialog {
  box-shadow: var(--shadow-xl);
}
```

**Best practices:**
- Use lower opacity (0.05-0.1) for subtle depth
- Combine multiple layered shadows for realism
- Animate shadow for hover states
- Keep blur values soft (4-15px)

**Sources:**
- [Designing Beautiful Shadows in CSS](https://www.joshwcomeau.com/css/designing-shadows/)
- [Shadows in UI design: Tips and best practices](https://blog.logrocket.com/ux-design/shadows-ui-design-tips-best-practices/)

### Pattern 5: Border Radius for Modern Feel

**What:** Apply consistent rounded corners to UI elements
**When to use:** Buttons, inputs, panels, cards - avoid on canvas/viewport frames

**Example:**
```css
:root {
  --radius-none: 0;
  --radius-sm: 4px;   /* Buttons, small elements */
  --radius-md: 6px;   /* Cards, inputs */
  --radius-lg: 8px;   /* Panels, dialogs */
  --radius-full: 9999px; /* Pills, avatars */
}

.button {
  border-radius: var(--radius-sm);
}

.input {
  border-radius: var(--radius-md);
}

.panel {
  border-radius: var(--radius-lg);
}
```

**Sources:**
- Phase requirements UI-03: 4-8px border-radius specification

### Anti-Patterns to Avoid

- **Mixing measurement units:** Don't mix px, rem, em haphazardly. Stick to px for spacing tokens (easier debugging), use rem/em only when scaling with font size is needed
- **Hardcoded values in components:** Always reference design tokens, never `color: #f0f0f0` directly
- **Over-using shadows:** Too many elevated elements create visual noise. Reserve shadows for cards, dialogs, dropdowns
- **Breaking the 8px grid:** Resist "just 5px" padding adjustments. Stay on grid for consistency
- **Pure black/white:** Use near-black (oklch(20% 0 0)) and off-white (oklch(98% 0 0)) for softer appearance

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color palette generation | Manual color picker values | OKLCH with calculated lightness steps | Perceptually uniform lightness; predictable contrast ratios; easier to maintain |
| Spacing scale | Ad-hoc pixel values | 8px grid system with token variables | Consistency across design; forces rhythm; reduces decision fatigue |
| Shadow layering | Single box-shadow values | Layered shadow tokens (2-3 shadows per level) | More realistic depth perception; better matches physical light behavior |
| Font loading | Custom @font-face | System font stack | Zero network latency; familiar to users; excellent Unicode coverage |
| CSS organization | Flat structure | Cascade layers (@layer) or clear naming convention | Prevents specificity wars; easier to reason about override order |

**Key insight:** CSS design tokens are about constraint and consistency. Custom solutions for colors/spacing introduce maintenance burden and inconsistency. Established patterns (8px grid, OKLCH, system fonts) are battle-tested across thousands of production apps.

## Common Pitfalls

### Pitfall 1: Converting RGBA opacity to OKLCH incorrectly

**What goes wrong:** Opacity in box-shadow using OKLCH alpha causes rendering issues or confusion
**Why it happens:** OKLCH supports alpha channel but shadow definitions often need rgba for compatibility
**How to avoid:** Keep shadows as rgba() values in design tokens, convert surface/text colors to OKLCH
**Warning signs:** Shadows appear too dark/light, browser console warnings

**Example:**
```css
/* AVOID: OKLCH in shadows (can be problematic) */
--shadow-sm: 0 1px 2px 0 oklch(0% 0 0 / 0.05);

/* PREFER: rgba in shadows (universal support) */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
```

### Pitfall 2: Breaking 8px grid with "pixel-perfect" adjustments

**What goes wrong:** Designer specs call for 13px padding; developer implements it, breaking rhythm
**Why it happens:** Designer used visual alignment instead of grid constraint
**How to avoid:** Round to nearest 8px increment; explain grid benefits to design stakeholders
**Warning signs:** Components misalign at different zoom levels; spacing feels arbitrary

### Pitfall 3: Too many color tokens

**What goes wrong:** Creating --color-neutral-50, --color-neutral-75, --color-neutral-100... with 20+ shades
**Why it happens:** Fear of constraint; trying to match every possible design mockup shade
**How to avoid:** Start with 5-7 neutral shades; add more only when clear need arises
**Warning signs:** Difficult to choose which grey to use; colors too similar to distinguish

**Recommendation:** Start with --color-neutral-0/50/100/300/500/700/900 (7 values). Covers 90% of use cases.

### Pitfall 4: Removing all borders when adding shadows

**What goes wrong:** Cards/panels blend into white background despite shadow
**Why it happens:** Assumption that shadows alone provide sufficient boundary definition
**How to avoid:** Use subtle 1px border (--border-subtle with very light grey) + shadow for definition
**Warning signs:** Elements disappear on white backgrounds; loss of component boundaries

**Example:**
```css
/* AVOID: Shadow only */
.card {
  box-shadow: var(--shadow-sm);
}

/* PREFER: Subtle border + shadow */
.card {
  border: 1px solid var(--border-subtle);  /* Light grey */
  box-shadow: var(--shadow-sm);
}
```

### Pitfall 5: Inconsistent hover/active states

**What goes wrong:** Some buttons darken on hover, others add shadow, others change border
**Why it happens:** No system-wide hover pattern defined
**How to avoid:** Document standard interaction patterns in design tokens
**Warning signs:** User confusion; inconsistent feel across interface

**Recommendation:**
```css
/* Standard button hover pattern */
.button:hover {
  background: var(--bg-hover);  /* Slightly darker */
  box-shadow: var(--shadow-sm); /* Add subtle elevation */
}
```

## Code Examples

Verified patterns from official sources and industry standards:

### Complete Modern Design Token System

```css
/**
 * variables.css - Modern Design System Tokens
 * Replaces win98-variables.css
 */

:root {
  /* ========================================
   * COLOR PRIMITIVES - OKLCH
   * ======================================== */

  /* Neutral palette (light theme) */
  --color-neutral-0: oklch(100% 0 0);      /* Pure white */
  --color-neutral-50: oklch(98% 0 0);      /* Off-white */
  --color-neutral-100: oklch(95% 0.005 280); /* Very light grey with slight cool tone */
  --color-neutral-200: oklch(90% 0.005 280);
  --color-neutral-300: oklch(80% 0.005 280); /* Light grey */
  --color-neutral-500: oklch(60% 0.005 280); /* Mid grey */
  --color-neutral-700: oklch(35% 0.005 280); /* Dark grey */
  --color-neutral-900: oklch(20% 0.01 280);  /* Near black */

  /* Accent blue */
  --color-blue-400: oklch(70% 0.12 250);
  --color-blue-500: oklch(60% 0.15 250);
  --color-blue-600: oklch(50% 0.15 250);

  /* ========================================
   * SPACING - 8PX GRID
   * ======================================== */

  --space-0: 0;
  --space-1: 8px;     /* Base unit */
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 40px;
  --space-6: 48px;
  --space-8: 64px;
  --space-10: 80px;

  /* ========================================
   * TYPOGRAPHY
   * ======================================== */

  /* Font families */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
               Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', Menlo, Monaco,
               'Courier New', monospace;

  /* Font sizes (aligned to 8px grid line heights) */
  --font-size-xs: 11px;    /* Compact UI text */
  --font-size-sm: 13px;    /* Secondary text */
  --font-size-base: 14px;  /* Body text */
  --font-size-lg: 16px;    /* Large body */
  --font-size-xl: 18px;    /* Headings */

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line heights (multiples of 8px) */
  --line-height-tight: 1.25;   /* 20px for 16px text */
  --line-height-normal: 1.5;   /* 24px for 16px text */
  --line-height-relaxed: 1.75; /* 28px for 16px text */

  /* ========================================
   * BORDER RADIUS
   * ======================================== */

  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* ========================================
   * SHADOWS
   * ======================================== */

  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
               0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
               0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
               0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
               0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* ========================================
   * SEMANTIC ALIASES
   * ======================================== */

  /* Surface colors */
  --surface: var(--color-neutral-0);
  --surface-secondary: var(--color-neutral-50);

  /* Text colors */
  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-700);
  --text-tertiary: var(--color-neutral-500);
  --text-disabled: var(--color-neutral-300);

  /* Background colors */
  --bg-primary: var(--color-neutral-0);
  --bg-secondary: var(--color-neutral-50);
  --bg-tertiary: var(--color-neutral-100);
  --bg-hover: var(--color-neutral-100);
  --bg-active: var(--color-neutral-200);

  /* Border colors */
  --border-default: var(--color-neutral-300);
  --border-subtle: var(--color-neutral-200);
  --border-emphasis: var(--color-neutral-500);

  /* Accent colors */
  --accent-primary: var(--color-blue-500);
  --accent-hover: var(--color-blue-600);
  --accent-active: var(--color-blue-600);

  /* Input/field colors */
  --input-bg: var(--color-neutral-0);
  --input-border: var(--color-neutral-300);
  --input-focus: var(--color-blue-500);

  /* Workspace background (behind canvas) */
  --workspace-bg: var(--color-neutral-200);
}
```

### Migration Strategy: Component Update Example

```css
/* BEFORE: Win98 beveled button */
.toolbar-button {
  background: var(--win98-ButtonFace);
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonDkShadow);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
  padding: 3px;
}

.toolbar-button:hover {
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonDkShadow);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
}

/* AFTER: Modern flat button */
.toolbar-button {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: var(--space-1);  /* 8px */
  transition: background 150ms ease, box-shadow 150ms ease;
}

.toolbar-button:hover {
  background: var(--bg-hover);
  box-shadow: var(--shadow-sm);
}

.toolbar-button:active {
  background: var(--bg-active);
}

.toolbar-button.active {
  background: var(--bg-active);
  border-color: var(--border-emphasis);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RGB/HSL colors | OKLCH color space | 2023 (Chrome 111) | Perceptually uniform lightness; easier palette generation |
| Pixel MS Sans Serif font | System UI font stack | 2020+ | Zero latency; native OS appearance; better Unicode support |
| 3D beveled borders | Flat design + subtle shadows | 2018+ | Modern aesthetic; better mobile translation; reduced visual weight |
| Manual specificity management | @layer cascade layers | 2022 (Chrome 99) | Explicit priority control; prevents specificity wars |
| Ad-hoc spacing | 8px/4px grid systems | 2010s (Material Design) | Consistent rhythm; forces design constraint; better alignment |

**Deprecated/outdated:**
- **Win98 beveled borders:** Using multiple border colors to simulate 3D depth. Replaced by flat design with subtle drop shadows
- **Bitmap pixel fonts:** MS Sans Serif, system fonts with antialiasing disabled. Replaced by system-ui font stack with subpixel rendering
- **Theme toggle classes:** Switching entire theme via body class. Replaced by CSS variables that update at :root level
- **RGB color manipulation:** Manually calculating lighter/darker shades. OKLCH allows mathematical lightness adjustment
- **!important hacks:** Fighting specificity with !important. @layer provides explicit ordering

## Open Questions

1. **Should we use @layer for CSS organization?**
   - What we know: Supported since Chromium 99 (included in Electron 28); helps manage specificity
   - What's unclear: Whether the codebase complexity warrants cascade layers vs. simpler BEM-style naming
   - Recommendation: Start without @layer (simpler), add if specificity conflicts arise during migration. Not required for phase success.

2. **Should component-specific tokens (Tier 3) be inline or separate files?**
   - What we know: Components already have .css files; some define local variables
   - What's unclear: Best practice for component token organization in this codebase size
   - Recommendation: Keep component tokens in component .css files (co-located with usage). Only create separate tokens/ directory if central token management becomes needed.

3. **Should we provide OKLCH fallbacks for older Electron versions?**
   - What we know: Electron 28 uses Chromium 120 (supports OKLCH); project specifies Electron 28
   - What's unclear: Whether backwards compatibility is needed
   - Recommendation: No fallbacks needed. Electron 28 requirement is documented; Chromium 120 fully supports OKLCH.

## Browser Support

### Electron 28 Compatibility

| Feature | Chromium Version | Electron 28 | Status |
|---------|-----------------|-------------|--------|
| OKLCH colors | Chrome 111+ | Chromium 120 | ✅ Fully supported |
| @layer cascade layers | Chrome 99+ | Chromium 120 | ✅ Fully supported |
| CSS Custom Properties | Universal | All versions | ✅ Fully supported |
| system-ui font | Universal | All versions | ✅ Fully supported |

**Source:** Electron 28.0.0 bundles Chromium 120.0.6099.56 (released December 2023)

**Confidence:** HIGH - Verified via Electron release notes and Chromium version mapping

## Implementation Checklist

Based on phase requirements UI-01 through UI-05:

- [ ] Create new `src/styles/variables.css` with modern design tokens
  - [ ] OKLCH color primitives (neutrals 0/50/100/300/500/700/900)
  - [ ] 8px spacing scale (space-0 through space-10)
  - [ ] System font stack (font-sans, font-mono)
  - [ ] Border radius tokens (radius-sm/md/lg: 4px/6px/8px)
  - [ ] Shadow elevation scale (shadow-xs through shadow-xl, opacity 0.05-0.1)
  - [ ] Semantic aliases (preserve existing --surface, --text-primary, etc. names)

- [ ] Update `src/App.css` imports
  - [ ] Replace win98-variables.css import with new variables.css
  - [ ] Remove win98-bevels.css import
  - [ ] Remove win98-typography.css import
  - [ ] Remove win98-schemes.css import

- [ ] Delete Win98 CSS files
  - [ ] Delete `src/styles/win98-variables.css`
  - [ ] Delete `src/styles/win98-schemes.css`
  - [ ] Delete `src/styles/win98-bevels.css`
  - [ ] Delete `src/styles/win98-typography.css`

- [ ] Update body typography (in App.css)
  - [ ] Set font-family: var(--font-sans)
  - [ ] Set font-size: var(--font-size-base) (14px)
  - [ ] Enable modern font smoothing (antialiased, not disabled)

- [ ] Remove Win98 bevel CSS classes from components
  - [ ] Remove .win98-raised, .win98-sunken class usages
  - [ ] Remove .win98-raised-deep, .win98-sunken-deep class usages
  - [ ] Remove .win98-field, .win98-well class usages
  - [ ] Note: No components use these classes directly (grep returned 0 results)

## Sources

### Primary (HIGH confidence)

- **Electron Documentation:**
  - [Electron 28.0.0 Release](https://www.electronjs.org/blog/electron-28-0) - Chromium 120 bundled version
  - [Electron Releases](https://www.electronjs.org/docs/latest/tutorial/electron-timelines) - Version history

- **W3C Standards:**
  - [MDN: oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) - OKLCH specification
  - [MDN: @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer) - Cascade layers
  - [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/--*) - CSS variables

- **Browser Compatibility:**
  - [Can I Use: OKLCH](https://caniuse.com/mdn-css_types_color_oklch) - 93% support, Chrome 111+
  - [Can I Use: Cascade Layers](https://caniuse.com/css-cascade-layers) - Chrome 99+

### Secondary (MEDIUM confidence)

- **Design System Best Practices:**
  - [Tailwind CSS Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) - Design tokens, typography
  - [The developer's guide to design tokens and CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/) - Token architecture
  - [Naming Tokens in Design Systems](https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676) - Naming conventions

- **Color Systems:**
  - [OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) - Perceptual uniformity benefits
  - [Defining colors in modern CSS: OKLCH](https://medium.com/@alekswebnet/defining-colors-in-modern-css-why-its-time-to-switch-to-oklch-c6b972d98520) - 2026 usage patterns

- **Spacing Systems:**
  - [8px Grid Best Practices](https://cieden.com/book/sub-atomic/spacing/spacing-best-practices) - 8pt grid fundamentals
  - [U.S. Web Design System: Spacing Units](https://designsystem.digital.gov/design-tokens/spacing-units/) - Token patterns

- **Typography:**
  - [Modern Font Stacks](https://modernfontstacks.com/) - System font recommendations
  - [GitHub: system-fonts/modern-font-stacks](https://github.com/system-fonts/modern-font-stacks) - Implementation patterns

- **Shadows & Depth:**
  - [Designing Beautiful Shadows in CSS](https://www.joshwcomeau.com/css/designing-shadows/) - Layered shadow techniques
  - [Shadows in UI design: Tips and best practices](https://blog.logrocket.com/ux-design/shadows-ui-design-tips-best-practices/) - Elevation principles

- **Modern UI Trends:**
  - [Modern App Colors: Design Palettes That Work In 2026](https://webosmotic.com/blog/modern-app-colors/) - Neutral palette trends
  - [UI Color Palette 2026: Best Practices](https://www.interaction-design.org/literature/article/ui-color-palette) - Color system structure

- **CSS Architecture:**
  - [Organizing Design System Component Patterns With CSS Cascade Layers](https://css-tricks.com/organizing-design-system-component-patterns-with-css-cascade-layers/) - @layer usage
  - [Cascade Layers Guide](https://css-tricks.com/css-cascade-layers/) - Implementation patterns

### Tertiary (LOW confidence)

None - all findings verified through official documentation or multiple credible sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All features are native CSS with verified Electron 28/Chromium 120 support
- Architecture: HIGH - Patterns sourced from W3C standards, established design systems (US Gov, Material Design)
- Pitfalls: MEDIUM-HIGH - Based on industry blog posts and documented best practices; some context-specific

**Research date:** 2026-02-08
**Valid until:** ~60 days (2026-04-08) - CSS standards are stable; design trends evolve slowly

**Codebase Context:**
- Current system: Two-tier CSS variables (Win98 primitives → semantic aliases)
- Component count: 19 CSS files across components
- CSS variable usage: 73+ var(--win98-*) references across codebase
- No Win98 CSS classes used directly in components (grep .win98- returned 0 results)
- Migration strategy: Replace Tier 1 values, preserve Tier 2 semantic names for backwards compatibility

**Key Technical Decisions:**
- ✅ Use OKLCH colors (perceptual uniformity)
- ✅ Use 8px spacing grid (industry standard)
- ✅ Use system font stack (zero latency)
- ✅ Use subtle shadows instead of bevels (modern aesthetic)
- ✅ Preserve existing semantic variable names (--surface, --text-primary, etc.)
- ⚠️ @layer optional (evaluate during implementation)
- ⚠️ Component token tier optional (add if needed)
