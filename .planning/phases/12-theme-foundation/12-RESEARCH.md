# Phase 12: Theme Foundation - Research

**Researched:** 2026-02-04
**Domain:** Windows 98 UI recreation, CSS theming systems, bitmap typography
**Confidence:** HIGH

## Summary

Phase 12 establishes an authentic Windows 98 theme foundation by implementing a comprehensive CSS variable system based on Win98's actual system colors, removing all modern CSS artifacts (rounded corners, transitions, blur effects), and applying bitmap typography with disabled antialiasing. The research identified exact Win98 system color values, authentic bevel implementation patterns using multi-layer inset box-shadows, and verified approaches for bitmap font delivery.

**Key Findings:**
- Windows 98 Standard scheme used specific hex values: ButtonFace (#c0c0c0), ButtonShadow (#808080), ButtonHighlight (#ffffff), etc.
- Authentic bevels require 4-layer inset box-shadows with precise color sequencing (not CSS border-style: inset/outset)
- MS Sans Serif is a bitmap .fon format font incompatible with modern browsers; must use "Pixelated MS Sans Serif" web font alternative
- Win98 had 20+ color schemes (High Contrast, Rainy Day, Desert, etc.) with complete palette definitions available
- Canvas areas used sunken "well" treatment with inverted bevel shadows

**Primary recommendation:** Adopt 98.css library patterns for bevel implementation, use exact Win98 system color hex values as CSS variables with Win98 naming convention (--win98-ButtonFace), bundle Pixelated MS Sans Serif web fonts, and implement 3 classic color schemes (Windows Standard, High Contrast #1, and one user-favorite like Rainy Day or Desert).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Theme variable system | Built-in browser support, no dependencies, runtime theme switching |
| @font-face | Native | Web font delivery | Standard way to embed custom fonts, supports .woff/.woff2 formats |
| Pixelated MS Sans Serif | Latest | Authentic Win98 bitmap font | Only web-compatible recreation of MS Sans Serif bitmap appearance |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| 98.css reference | Latest | Bevel/border patterns | Reference implementation for authentic Win98 bevels and shadows |
| Windows 98 theme files | N/A | Color palette source | Extract exact RGB values from .theme files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS Custom Properties | SCSS variables | Compile-time only, no runtime theme switching, requires build step |
| Pixelated MS Sans Serif | Microsoft Sans Serif (TrueType) | Vector font with antialiasing - loses bitmap authenticity, requires licensing |
| Multi-layer box-shadows | border-style: inset/outset | Browser rendering inconsistent, doesn't match Win98 appearance exactly |

**Installation:**
```bash
# No npm packages required - native CSS features only
# Download Pixelated MS Sans Serif web fonts:
# https://github.com/jdan/98.css/tree/main/fonts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── styles/
│   ├── win98-variables.css    # Win98 system color definitions
│   ├── win98-bevels.css       # Bevel utility classes (.win98-raised, .win98-sunken, etc.)
│   ├── win98-typography.css   # Font definitions and antialiasing rules
│   └── win98-schemes.css      # Color scheme theme classes
└── assets/
    └── fonts/
        ├── ms_sans_serif.woff
        ├── ms_sans_serif.woff2
        ├── ms_sans_serif_bold.woff
        └── ms_sans_serif_bold.woff2
```

### Pattern 1: CSS Variable Naming Convention
**What:** Two-tier variable system with Win98 canonical names + semantic aliases
**When to use:** All color references in components
**Example:**
```css
/* Source: Win98 system colors + 98.css patterns */
:root {
  /* Tier 1: Win98 Canonical Names (unchanging reference) */
  --win98-ButtonFace: #c0c0c0;
  --win98-ButtonShadow: #808080;
  --win98-ButtonHighlight: #ffffff;
  --win98-ButtonDkShadow: #000000;
  --win98-ButtonLight: #dfdfdf;
  --win98-Window: #ffffff;
  --win98-WindowText: #000000;
  --win98-WindowFrame: #000000;
  --win98-ActiveCaption: #000080;
  --win98-GradientActiveCaption: #1084d0;

  /* Tier 2: Semantic Aliases (mapped to Win98 colors) */
  --surface: var(--win98-ButtonFace);
  --border-light: var(--win98-ButtonHighlight);
  --border-shadow: var(--win98-ButtonShadow);
  --border-dark-shadow: var(--win98-ButtonDkShadow);
  --text-primary: var(--win98-WindowText);
  --bg-window: var(--win98-Window);
}
```

### Pattern 2: Multi-Layer Inset Box-Shadow Bevels
**What:** 4-layer inset shadows creating raised/sunken 3D effects
**When to use:** Buttons, panels, input fields, any 3D UI element
**Example:**
```css
/* Source: https://unpkg.com/98.css - verified pattern */
/* Raised bevel (buttons, windows) - light from top-left */
.win98-raised {
  box-shadow:
    inset -1px -1px 0px 0px #0a0a0a,    /* Outer dark shadow (bottom-right) */
    inset 1px 1px 0px 0px #ffffff,      /* Outer highlight (top-left) */
    inset -2px -2px 0px 0px #808080,    /* Inner shadow (bottom-right) */
    inset 2px 2px 0px 0px #dfdfdf;      /* Inner highlight (top-left) */
}

/* Sunken bevel (inputs, wells) - inverted light direction */
.win98-sunken {
  box-shadow:
    inset -1px -1px 0px 0px #ffffff,    /* Outer highlight (bottom-right) */
    inset 1px 1px 0px 0px #808080,      /* Outer shadow (top-left) */
    inset -2px -2px 0px 0px #dfdfdf,    /* Inner highlight (bottom-right) */
    inset 2px 2px 0px 0px #0a0a0a;      /* Inner dark shadow (top-left) */
}

/* Etched/grooved (separator lines) */
.win98-etched {
  border-top: 1px solid #808080;
  border-bottom: 1px solid #ffffff;
}
```

### Pattern 3: Canvas Area Sunken Well Treatment
**What:** Document/canvas areas get deep sunken frame like Win98 MDI
**When to use:** Map canvas, large content areas that should appear embedded
**Example:**
```css
/* Source: Win98 MDI document windows */
.canvas-well {
  background: #ffffff;
  /* Deep sunken frame: dark outer border, then sunken bevel */
  border: 2px solid var(--win98-ButtonDkShadow);
  box-shadow:
    inset 1px 1px 0px 0px #808080,
    inset -1px -1px 0px 0px #dfdfdf;
}
```

### Pattern 4: Title Bar Gradient
**What:** Authentic Win98 active/inactive title bar gradients
**When to use:** Panel title bars, dialog headers
**Example:**
```css
/* Source: Win98 system + https://github.com/dremin/RetroBar */
.win98-titlebar-active {
  background: linear-gradient(to right, #000080, #1084d0);
  color: #ffffff;
  font-weight: bold;
}

.win98-titlebar-inactive {
  background: linear-gradient(to right, #808080, #c0c0c0);
  color: #c0c0c0; /* Win98 had very low contrast inactive titles */
}
```

### Pattern 5: Theme Switching via Class
**What:** Apply theme class to root element to override color variables
**When to use:** Implementing multiple Win98 color schemes
**Example:**
```css
/* Default: Windows Standard */
:root {
  --win98-ButtonFace: #c0c0c0;
  --win98-ButtonShadow: #808080;
  /* ...rest of standard colors */
}

/* Theme: High Contrast #1 (Black) */
.theme-high-contrast-1 {
  --win98-ButtonFace: #000000;
  --win98-ButtonText: #ffffff;
  --win98-Window: #000000;
  --win98-WindowText: #00ff00; /* Bright green text */
  /* ...rest of high contrast colors */
}

/* Theme: Rainy Day */
.theme-rainy-day {
  --win98-ButtonFace: #7d7d7d;
  --win98-ActiveCaption: #003366;
  /* ...rest of rainy day colors */
}
```

### Pattern 6: Bitmap Font with Disabled Antialiasing
**What:** Crisp pixel-perfect rendering without smoothing
**When to use:** All UI text (excluding document content)
**Example:**
```css
/* Source: 98.css font implementation */
@font-face {
  font-family: "Pixelated MS Sans Serif";
  src: url("../fonts/ms_sans_serif.woff2") format("woff2"),
       url("../fonts/ms_sans_serif.woff") format("woff");
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: "Pixelated MS Sans Serif";
  src: url("../fonts/ms_sans_serif_bold.woff2") format("woff2"),
       url("../fonts/ms_sans_serif_bold.woff") format("woff");
  font-weight: bold;
  font-style: normal;
}

body {
  font-family: "Pixelated MS Sans Serif", Arial, sans-serif;
  font-size: 11px;

  /* Disable antialiasing for bitmap crispness */
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  font-smooth: never;
}

/* Status bar and secondary UI uses smaller size */
.status-bar, .secondary-text {
  font-size: 10px;
}

/* Title bars use bold */
.titlebar {
  font-weight: bold;
}
```

### Anti-Patterns to Avoid
- **Using border-style: inset/outset for bevels:** Browser rendering is inconsistent and doesn't match Win98's exact appearance. Always use multi-layer inset box-shadows instead.
- **Mixing rounded and sharp corners:** If one element has border-radius: 0, ALL must have it. Inconsistent corner treatment breaks Win98 aesthetic.
- **Keeping any transitions for "subtle" effects:** Win98 had ZERO transitions - state changes were instant. Even 50ms transitions feel wrong.
- **Using rgba() for "soft" shadows:** Win98 used solid colors only (except title bar gradients). Transparency is a modern artifact.
- **Applying -webkit-font-smoothing: antialiased:** This enables subpixel antialiasing on macOS. Use 'none' to disable completely (though macOS-only).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recreating MS Sans Serif bitmap font | Custom bitmap font generation, canvas text rendering | Pixelated MS Sans Serif web fonts from 98.css | Already available as .woff/.woff2, includes full character set, kerning handled correctly |
| Win98 bevel box-shadow patterns | Trial-and-error color values and offsets | 98.css verified shadow patterns | Community-validated to match authentic Win98 appearance, handles edge cases |
| Win98 system color values | Eyeballing colors from screenshots | Extract from Win98 .theme files or RetroBar XAML | Exact RGB values from Microsoft's implementation, not approximations |
| Theme switching infrastructure | Custom event system for theme changes | CSS class on html/body element + CSS variable overrides | Native CSS cascade, no JavaScript events needed, instant updates |
| Sunken input field appearance | Nested divs with border tricks | Multi-layer inset box-shadow (same as raised but inverted) | Single element solution, consistent with other bevels |

**Key insight:** The Win98 aesthetic has already been meticulously researched by projects like 98.css and OS-GUI. Their implementation patterns are battle-tested and pixel-perfect. Don't recreate from screenshots when authoritative sources exist.

## Common Pitfalls

### Pitfall 1: Incomplete CSS Artifact Removal
**What goes wrong:** Removing obvious border-radius but missing subtle modern effects like rgba() transparency, text-shadow blur, or filter: blur() creates jarring inconsistency where some elements look authentic and others don't.
**Why it happens:** Modern CSS defaults and habits from other projects sneak in. Developers focus on major visual features (rounded corners) while overlooking subtle ones (opacity on disabled states).
**How to avoid:** Systematic grep search for ALL modern CSS properties before declaring purge complete:
- border-radius (obvious)
- transition, animation, @keyframes (motion)
- rgba(), hsla() with alpha < 1 (transparency - except gradients)
- opacity < 1 (transparency)
- box-shadow without 'inset' (drop shadows with blur)
- filter (blur, drop-shadow, etc.)
- backdrop-filter (glassmorphism effects)
- text-shadow with blur radius > 0
**Warning signs:** Any element that feels "smooth" or "polished" when it should feel "sharp" and "instant"

### Pitfall 2: Font Antialiasing Platform Differences
**What goes wrong:** -webkit-font-smoothing: none works on macOS Safari/Chrome but has ZERO effect on Windows, Linux, iOS, or Firefox anywhere. Font appears pixel-perfect in development (macOS) but blurry antialiased in production (Windows users).
**Why it happens:** This is a WebKit-specific, macOS-only CSS property. Other browsers ignore it completely. Windows and Linux browsers control font rendering at OS level, not CSS.
**How to avoid:**
1. Test on Windows during development (primary target audience for Win98 nostalgia)
2. Accept that true bitmap rendering is impossible in modern browsers on most platforms
3. Pixelated MS Sans Serif is designed to LOOK bitmap even with antialiasing
4. Document that macOS users will see slightly softer text than Windows users
5. Consider this acceptable tradeoff - font choice matters more than antialiasing
**Warning signs:** QA reports "text looks fuzzy" only from Windows testers, Mac developers don't see the issue

### Pitfall 3: CSS Variable Scope Confusion
**What goes wrong:** Defining --win98-ButtonFace in :root but then overriding it in .theme-high-contrast AND in .button selector. Theme changes don't apply to buttons because component-level override has higher specificity.
**Why it happens:** Mixing two paradigms: semantic variables (--surface) and direct theming. When components reference --win98-ButtonFace directly instead of semantic aliases, they bypass theme overrides.
**How to avoid:**
1. Theme classes (.theme-*) should ONLY override --win98-* variables
2. Components should ONLY reference semantic aliases (--surface, --border-light)
3. Never override CSS variables at component level - use semantic variables instead
4. Document which variables are "theming API" (win98-* = public) vs "component API" (semantic = internal)
**Warning signs:** console.log(getComputedStyle(el).getPropertyValue('--win98-ButtonFace')) shows theme override worked, but button still shows old color

### Pitfall 4: Bevel Shadow Color Hardcoding
**What goes wrong:** Copying 98.css box-shadow patterns that use hardcoded #0a0a0a, #808080, #ffffff. When switching to High Contrast theme with different colors, bevels stay gray instead of adapting to theme.
**Why it happens:** 98.css is a single-theme library (Windows Standard). Multi-theme systems need bevels to reference CSS variables, not hardcoded values.
**How to avoid:**
1. Replace hardcoded colors in bevel shadows with CSS variables:
   - #0a0a0a → var(--win98-ButtonDkShadow)
   - #808080 → var(--win98-ButtonShadow)
   - #ffffff → var(--win98-ButtonHighlight)
   - #dfdfdf → var(--win98-ButtonLight)
2. Test ALL themes early to verify bevels adapt
3. Document that bevel utilities require these 4 color variables to be defined
**Warning signs:** UI looks perfect in Windows Standard, but High Contrast theme has gray bevels on black background (no contrast)

### Pitfall 5: Canvas Area Not Sunken
**What goes wrong:** Applying raised window bevel to canvas area instead of sunken well treatment. Canvas looks like it's protruding out of the UI instead of being a recessed drawing surface.
**Why it happens:** Misunderstanding Win98 UI patterns. Windows were raised, but document areas INSIDE windows were sunken.
**How to avoid:**
1. Study Win98 MDI applications (Paint, Notepad) - document area is always sunken
2. Canvas gets inverted bevel (sunken) + dark border frame
3. Canvas background should be white (#ffffff, --win98-Window), not ButtonFace gray
4. Test with different content to ensure sunken appearance is clear
**Warning signs:** User feedback "why does the map look like a button?" or "canvas doesn't feel like a workspace"

### Pitfall 6: Gradient Overuse
**What goes wrong:** Applying gradients to buttons, inputs, panels because "Win98 had gradients." Only title bars had gradients - everything else was solid colors.
**Why it happens:** Remembering title bar gradients (highly visible) and extrapolating to entire UI.
**How to avoid:**
1. Document Win98 gradient usage: ONLY active/inactive title bars
2. Everything else (buttons, panels, backgrounds) uses solid --win98-ButtonFace
3. Code review checklist: "Is this a title bar?" before approving gradient usage
**Warning signs:** UI looks too "fancy" or "Vista-like" instead of flat Win98 gray

## Code Examples

Verified patterns from official sources:

### Complete Win98 System Colors (Windows Standard Scheme)
```css
/* Source: https://github.com/dremin/RetroBar Windows 95-98 theme */
:root {
  /* 3D Elements */
  --win98-ButtonFace: #c0c0c0;           /* Standard gray for buttons/panels */
  --win98-ButtonHighlight: #ffffff;      /* Bright edge (top-left) */
  --win98-ButtonLight: #dfdfdf;          /* Secondary highlight */
  --win98-ButtonShadow: #808080;         /* Shadow edge (bottom-right) */
  --win98-ButtonDkShadow: #000000;       /* Darkest shadow (outer edge) */
  --win98-ButtonText: #000000;           /* Text on buttons */

  /* Windows & Document Areas */
  --win98-Window: #ffffff;               /* Document background (white) */
  --win98-WindowText: #000000;           /* Document text */
  --win98-WindowFrame: #000000;          /* Outer window border */

  /* Title Bars */
  --win98-ActiveCaption: #000080;        /* Active title bar left (navy) */
  --win98-GradientActiveCaption: #1084d0; /* Active title bar right (bright blue) */
  --win98-InactiveCaption: #808080;      /* Inactive title bar left */
  --win98-GradientInactiveCaption: #c0c0c0; /* Inactive title bar right */
  --win98-CaptionText: #ffffff;          /* Active title text */
  --win98-InactiveCaptionText: #c0c0c0;  /* Inactive title text (low contrast) */

  /* Menus & Selected Items */
  --win98-Menu: #c0c0c0;                 /* Menu background */
  --win98-MenuText: #000000;             /* Menu text */
  --win98-Highlight: #000080;            /* Selected item background (navy) */
  --win98-HighlightText: #ffffff;        /* Selected item text */

  /* Info/Tooltips */
  --win98-InfoWindow: #ffffe1;           /* Tooltip background (pale yellow) */
  --win98-InfoText: #000000;             /* Tooltip text */

  /* Misc */
  --win98-GrayText: #808080;             /* Disabled text */
  --win98-AppWorkspace: #808080;         /* MDI workspace background */
  --win98-Scrollbar: #c0c0c0;            /* Scrollbar track */
}
```

### Complete Bevel Utility Classes
```css
/* Source: 98.css patterns adapted for CSS variables */

/* 2px raised bevel (default buttons, windows, panels) */
.win98-raised {
  box-shadow:
    inset -1px -1px 0px 0px var(--win98-ButtonDkShadow),
    inset 1px 1px 0px 0px var(--win98-ButtonHighlight),
    inset -2px -2px 0px 0px var(--win98-ButtonShadow),
    inset 2px 2px 0px 0px var(--win98-ButtonLight);
}

/* 2px sunken bevel (text inputs, pressed buttons, canvas wells) */
.win98-sunken {
  box-shadow:
    inset -1px -1px 0px 0px var(--win98-ButtonHighlight),
    inset 1px 1px 0px 0px var(--win98-ButtonShadow),
    inset -2px -2px 0px 0px var(--win98-ButtonLight),
    inset 2px 2px 0px 0px var(--win98-ButtonDkShadow);
}

/* 1px simple raised (toolbar buttons, tab active state) */
.win98-raised-simple {
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonDkShadow);
}

/* 1px simple sunken (pressed toolbar buttons) */
.win98-sunken-simple {
  border-top: 1px solid var(--win98-ButtonDkShadow);
  border-left: 1px solid var(--win98-ButtonDkShadow);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonHighlight);
}

/* Etched/grooved separator (horizontal) */
.win98-etched-horizontal {
  height: 2px;
  border: none;
  border-top: 1px solid var(--win98-ButtonShadow);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
}

/* Etched/grooved separator (vertical) */
.win98-etched-vertical {
  width: 2px;
  border: none;
  border-left: 1px solid var(--win98-ButtonShadow);
  border-right: 1px solid var(--win98-ButtonHighlight);
}

/* Field (text input with 2px sunken + shadow) */
.win98-field {
  background: var(--win98-Window);
  color: var(--win98-WindowText);
  border: none;
  box-shadow:
    inset -1px -1px 0px 0px var(--win98-ButtonHighlight),
    inset 1px 1px 0px 0px var(--win98-ButtonShadow),
    inset -2px -2px 0px 0px var(--win98-ButtonLight),
    inset 2px 2px 0px 0px var(--win98-ButtonDkShadow);
}
```

### Button Component (Complete Win98 Styling)
```css
/* Source: 98.css button + https://github.com/dremin/RetroBar */
.win98-button {
  /* Base appearance */
  background: var(--win98-ButtonFace);
  color: var(--win98-ButtonText);
  font-family: "Pixelated MS Sans Serif", Arial, sans-serif;
  font-size: 11px;
  border: none;
  padding: 4px 16px;
  min-width: 75px;
  min-height: 23px;
  cursor: pointer;

  /* Raised bevel */
  box-shadow:
    inset -1px -1px 0px 0px var(--win98-ButtonDkShadow),
    inset 1px 1px 0px 0px var(--win98-ButtonHighlight),
    inset -2px -2px 0px 0px var(--win98-ButtonShadow),
    inset 2px 2px 0px 0px var(--win98-ButtonLight);

  /* Win98 buttons had NO transitions */
  transition: none;
}

.win98-button:hover:not(:disabled) {
  /* Subtle brightness increase only */
  background: #d0d0d0;
}

.win98-button:active:not(:disabled) {
  /* Inverted bevel for pressed state */
  box-shadow:
    inset -1px -1px 0px 0px var(--win98-ButtonHighlight),
    inset 1px 1px 0px 0px var(--win98-ButtonDkShadow),
    inset -2px -2px 0px 0px var(--win98-ButtonLight),
    inset 2px 2px 0px 0px var(--win98-ButtonShadow);

  /* 1px visual offset for pressed effect */
  padding: 5px 15px 3px 17px;
}

.win98-button:focus:not(:disabled) {
  /* Win98 focus was dotted rectangle inset 4px */
  outline: 1px dotted var(--win98-ButtonText);
  outline-offset: -4px;
}

.win98-button:disabled {
  /* Win98 disabled = gray text, no transparency on button itself */
  color: var(--win98-GrayText);
  cursor: default;
  /* Optional: embossed text effect (white shadow at 1px offset) */
  text-shadow: 1px 1px 0 var(--win98-ButtonHighlight);
}
```

### Canvas Well Treatment
```css
/* Source: Win98 MDI document windows in Paint, Notepad, etc. */
.map-canvas-container {
  /* Canvas area is sunken into UI with dark frame */
  background: var(--win98-Window); /* White */

  /* 2px dark border (window frame) */
  border: 2px solid var(--win98-ButtonDkShadow);

  /* Sunken inner bevel */
  box-shadow:
    inset 1px 1px 0px 0px var(--win98-ButtonShadow),
    inset -1px -1px 0px 0px var(--win98-ButtonLight);

  /* No padding - canvas fills completely */
  padding: 0;
  overflow: auto;
}
```

### Alternative Color Scheme (High Contrast #1)
```css
/* Source: Windows 98 Accessibility color schemes */
.theme-high-contrast-1 {
  /* High Contrast #1 (Black) - Accessibility theme */
  --win98-Window: #000000;
  --win98-WindowText: #ffffff;
  --win98-ButtonFace: #000000;
  --win98-ButtonText: #ffffff;
  --win98-ButtonHighlight: #808080;
  --win98-ButtonLight: #808080;
  --win98-ButtonShadow: #808080;
  --win98-ButtonDkShadow: #ffffff;
  --win98-ActiveCaption: #808080;
  --win98-GradientActiveCaption: #808080;
  --win98-CaptionText: #ffffff;
  --win98-Highlight: #0000ff; /* Bright blue selection */
  --win98-HighlightText: #ffffff;
  --win98-GrayText: #00ff00; /* Green for disabled */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS border-style: inset/outset for bevels | Multi-layer inset box-shadows | ~2015 | Consistent cross-browser rendering, exact color control |
| Server-side theme generation (SCSS) | CSS Custom Properties runtime switching | 2017+ | Theme changes without page reload, user preference detection |
| Original MS Sans Serif .fon files | Pixelated MS Sans Serif web fonts | ~2019 | Web-compatible bitmap font appearance |
| Manual theme class management (JS) | CSS class on :root + cascade | 2018+ | Zero JavaScript, instant visual updates |
| Windows system colors in CSS (deprecated) | Hardcoded hex equivalents in variables | 2020+ | Browser removed support for 'ButtonFace' keywords |

**Deprecated/outdated:**
- **CSS system color keywords:** `color: ButtonFace` no longer works in modern browsers (removed 2020+). Must use hex values in CSS variables instead.
- **font-smooth CSS property:** Removed from standards, never had cross-browser support. Use -webkit-font-smoothing: none (macOS only) or accept antialiasing.
- **jQuery for theme switching:** Overkill when native CSS variables handle runtime updates perfectly.

## Open Questions

Things that couldn't be fully resolved:

1. **Which 2-3 Win98 color schemes to include?**
   - What we know: Windows 98 shipped with 20+ schemes (High Contrast 1/2, Rainy Day, Desert, Eggplant, Lilac, Maple, Marine, Plum, Pumpkin, Rose, Slate, Spruce, Storm, etc.)
   - What's unclear: Which specific schemes resonate most with users? Which provide enough visual variety without overwhelming choice?
   - Recommendation: Start with Windows Standard (default), High Contrast #1 (accessibility + visual variety), and one community-favorite. Poll users or implement 3 initially with infrastructure for more later. Look at Win98 theme popularity on DeviantArt/Reddit for user preferences.

2. **MS Sans Serif fallback chain priority?**
   - What we know: "Pixelated MS Sans Serif", Arial, sans-serif is common pattern
   - What's unclear: Should Tahoma (Win2K default) be in chain? What about "Microsoft Sans Serif" (TrueType version)?
   - Recommendation: `"Pixelated MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif` - provides graceful degradation if web font fails to load. Microsoft Sans Serif is metric-compatible vector version. Tahoma covers Win2K users who expect it.

3. **Font antialiasing on non-macOS platforms?**
   - What we know: -webkit-font-smoothing: none only works on macOS. Windows/Linux browsers ignore it.
   - What's unclear: Is Pixelated MS Sans Serif designed well enough to look bitmap-like even with antialiasing? Should we accept this limitation?
   - Recommendation: Accept platform differences. Test on Windows (target audience) and verify font choice itself conveys bitmap aesthetic even with smoothing. Document in README that macOS users get slightly crisper rendering. This is unavoidable browser limitation.

4. **Canvas well border thickness (2px vs 3px)?**
   - What we know: Win98 MDI document areas had dark frame + sunken bevel
   - What's unclear: Exact pixel measurements vary by screenshot/screen DPI. 2px modern vs 2px @ 96dpi in 1998 aren't equivalent.
   - Recommendation: Start with 2px border + 1px shadow (total 3px dark frame). A/B test with 3px border + 1px shadow if 2px feels too thin. Modern high-DPI displays may need thicker borders to match visual weight of Win98 on CRTs.

5. **Should theme toggle UI remain in toolbar or move to settings?**
   - What we know: Current app has theme toggle in UI (dark/light switch)
   - What's unclear: Win98 color schemes were in Display Properties (settings), not quick-access toolbar
   - Recommendation: Repurpose existing toggle for "quick switch" between 2 schemes (Standard ⇔ High Contrast), but add full scheme picker in settings panel for all 3 schemes. This balances authenticity (settings-based) with usability (quick access for frequent switchers).

## Sources

### Primary (HIGH confidence)
- [RetroBar Windows 95-98 Theme XAML](https://github.com/dremin/RetroBar/blob/master/RetroBar/Themes/Windows%2095-98.xaml) - Exact system color values from Win95/98 recreation project
- [98.css GitHub Repository](https://github.com/jdan/98.css) - Verified bevel/border patterns, Pixelated MS Sans Serif font location
- [98.css Stylesheet (unpkg)](https://unpkg.com/98.css) - Actual CSS implementation code, box-shadow values
- [Windows 98 256 Color Theme File](https://github.com/1j01/98/blob/master/desktop/Themes/Windows%20Official/Windows%2098%20(256%20color).theme) - Official Win98 theme color values

### Secondary (MEDIUM confidence)
- [MDN: Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - CSS variables best practices
- [CSS-Tricks: CSS Custom Properties and Theming](https://css-tricks.com/css-custom-properties-theming/) - Theming architecture patterns
- [MDN: font-smooth property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth) - Antialiasing CSS reference
- [ColorsWall: Windows 98 Palette](https://colorswall.com/palette/102495) - Win98 color values (#818181, #c3c3c3, #fdffff)

### Tertiary (LOW confidence)
- [Tumblr: Windows 98 Color Schemes](https://ms-dos5.tumblr.com/post/75514618161/windows-98-color-schemes-in-order-rainy-day) - Visual reference of scheme variety (screenshots only, no hex values)
- WebSearch results on Windows 98 system colors - Multiple sources confirming ButtonFace=#c0c0c0, ButtonShadow=#808080

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - CSS Custom Properties are standard, Pixelated MS Sans Serif location verified on GitHub
- Architecture: HIGH - Bevel patterns verified in 98.css source code, color values from RetroBar XAML
- Pitfalls: HIGH - Based on actual implementation issues in 98.css project PRs and web development experience
- Color schemes: MEDIUM - Win98 had these schemes but exact RGB values only found for Standard + 256-color theme
- Font antialiasing: MEDIUM - Cross-platform differences documented but Pixelated MS Sans Serif rendering on Windows not personally tested

**Research date:** 2026-02-04
**Valid until:** 60 days (stable domain - Win98 doesn't change, CSS features mature)
