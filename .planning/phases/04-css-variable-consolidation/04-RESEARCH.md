# Phase 4: CSS Variable Consolidation - Research

**Researched:** 2026-02-02
**Domain:** CSS theming with custom properties and React state management
**Confidence:** HIGH

## Summary

This phase migrates hardcoded colors in four CSS files (AnimationPanel, MapSettingsPanel, MapCanvas, StatusBar) to CSS custom properties while implementing a dual-theme system (dark and light). The codebase already has a CSS variables foundation in App.css with 7 existing variables, but 83 hardcoded hex colors remain across 6 CSS files. The implementation requires three-way theme management (dark, light, system preference) with localStorage persistence and React state for theme toggle UI.

The standard approach uses CSS custom properties defined at :root, React's useState/useEffect hooks for theme management, prefers-color-scheme media query for system preference detection, and localStorage for persistence. The key challenge is preventing FOUC (Flash of Unstyled Content) during theme initialization.

**Primary recommendation:** Use semantic naming for CSS variables (purpose-based, not component-based), implement three-way theme toggle with localStorage persistence, apply theme class to document root element for instant switching, and inline critical theme initialization script to prevent FOUC.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Theme variable system | Browser-native, no dependencies, performant |
| React useState | 18.2.0 | Theme state management | Already in project, standard React pattern |
| React useEffect | 18.2.0 | localStorage sync & listener | Standard lifecycle management |
| localStorage API | Native | Theme persistence | Browser-native, 5MB storage sufficient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| window.matchMedia | Native | System preference detection | For prefers-color-scheme queries |
| MediaQueryList | Native | System preference change listener | For live system theme change detection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage | Context API only | Loses persistence across sessions |
| React state | CSS-only with :root toggle | Harder to integrate with UI components |
| Semantic variables | Component-scoped variables | Less flexible, harder to maintain consistency |
| Class-based theming | Data attribute theming | Classes are more widely documented and tested |

**Installation:**
```bash
# No additional dependencies required
# All functionality is native browser APIs + existing React 18
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── App.css                    # Theme variable definitions at :root
├── components/
│   ├── ThemeToggle/          # NEW: Theme toggle button component
│   │   ├── ThemeToggle.tsx
│   │   └── ThemeToggle.css
│   ├── AnimationPanel/
│   │   └── AnimationPanel.css  # MIGRATE: Replace hardcoded colors
│   ├── MapSettingsPanel/
│   │   └── MapSettingsPanel.css  # MIGRATE: Replace hardcoded colors
│   ├── MapCanvas/
│   │   └── MapCanvas.css       # MIGRATE: Replace hardcoded colors
│   └── StatusBar/
│       └── StatusBar.css       # MIGRATE: Replace hardcoded colors
└── hooks/
    └── useTheme.ts             # NEW: Custom hook for theme logic
```

### Pattern 1: Semantic Variable Naming (Two-Tier System)
**What:** Separate primitive color tokens from semantic usage tokens
**When to use:** When you want flexibility to change colors without touching components
**Example:**
```css
/* Source: Multiple industry sources + existing codebase pattern */
:root {
  /* Tier 1: Primitive tokens (color definitions) */
  --color-dark-900: #0d0d1a;
  --color-dark-800: #1a1a2e;
  --color-dark-700: #2a2a4e;
  --color-dark-600: #3a3a4e;
  --color-dark-500: #4a4a6e;
  --color-neutral-400: #666;
  --color-neutral-300: #888;
  --color-neutral-200: #aaa;
  --color-neutral-100: #c0c0c0;
  --color-neutral-050: #e0e0e0;
  --color-accent-600: #6a6aae;
  --color-accent-500: #5a5a7e;
  --color-accent-400: #8a8ace;

  /* Light theme primitives (warm cream palette) */
  --color-cream-900: #544739;  /* Dark text */
  --color-cream-800: #967259;  /* Medium text */
  --color-cream-100: #F9F9F7;  /* Lightest bg */
  --color-cream-200: #F4F3EF;  /* Light bg */
  --color-cream-300: #EFEEE8;  /* Border */
  --color-cream-400: #EAE8E0;  /* Subtle border */
  --color-blue-500: #5a7d9e;   /* Light theme accent */
  --color-blue-600: #4a6d8e;   /* Light theme accent hover */

  /* Tier 2: Semantic tokens (usage-based) */
  --bg-primary: var(--color-dark-800);
  --bg-secondary: var(--color-dark-700);
  --bg-tertiary: var(--color-dark-900);
  --bg-hover: var(--color-dark-500);
  --bg-active: var(--color-dark-600);

  --border-default: var(--color-dark-600);
  --border-subtle: var(--color-dark-700);

  --text-primary: var(--color-neutral-050);
  --text-secondary: var(--color-neutral-300);
  --text-tertiary: var(--color-neutral-400);

  --accent-primary: var(--color-accent-500);
  --accent-hover: var(--color-accent-600);
  --accent-active: var(--color-accent-400);

  --scrollbar-track: var(--color-dark-900);
  --scrollbar-thumb: var(--color-dark-500);
  --scrollbar-thumb-hover: var(--color-accent-500);

  --input-bg: var(--color-dark-900);
  --input-border: var(--color-dark-700);
  --input-focus: var(--color-accent-600);

  --slider-track: var(--color-dark-700);
  --slider-thumb: var(--color-accent-600);
  --slider-thumb-active: var(--color-accent-400);
}

/* Light theme overrides */
.theme-light {
  --bg-primary: var(--color-cream-100);
  --bg-secondary: var(--color-cream-200);
  --bg-tertiary: var(--color-cream-200);
  --bg-hover: var(--color-cream-400);
  --bg-active: var(--color-cream-300);

  --border-default: var(--color-cream-300);
  --border-subtle: var(--color-cream-400);

  --text-primary: var(--color-cream-900);
  --text-secondary: var(--color-cream-800);
  --text-tertiary: var(--color-neutral-400);

  --accent-primary: var(--color-blue-500);
  --accent-hover: var(--color-blue-600);
  --accent-active: var(--color-blue-600);

  --scrollbar-track: var(--color-cream-200);
  --scrollbar-thumb: var(--color-cream-400);
  --scrollbar-thumb-hover: var(--color-blue-500);

  --input-bg: #ffffff;
  --input-border: var(--color-cream-300);
  --input-focus: var(--color-blue-500);

  --slider-track: var(--color-cream-300);
  --slider-thumb: var(--color-blue-500);
  --slider-thumb-active: var(--color-blue-600);
}

/* Canvas exception: stays neutral regardless of theme */
.map-canvas,
.palette-canvas {
  /* Canvas rendering background - not themed */
  background-color: #0d0d1a !important;
}
```

### Pattern 2: Three-Way Theme State Management
**What:** Dark, Light, and System preference modes with localStorage persistence
**When to use:** Modern apps should always provide system preference option
**Example:**
```typescript
// Source: Multiple React theming guides (2025-2026)
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  // Initialize from localStorage or default to 'system'
  const [themeChoice, setThemeChoice] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'system';
  });

  // Compute effective theme (resolve 'system' to actual theme)
  const getEffectiveTheme = (choice: Theme): 'light' | 'dark' => {
    if (choice === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return choice;
  };

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(
    () => getEffectiveTheme(themeChoice)
  );

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${effectiveTheme}`);
  }, [effectiveTheme]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('theme', themeChoice);
  }, [themeChoice]);

  // Listen for system preference changes (only when theme is 'system')
  useEffect(() => {
    if (themeChoice !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setEffectiveTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeChoice]);

  // Update effective theme when choice changes
  useEffect(() => {
    setEffectiveTheme(getEffectiveTheme(themeChoice));
  }, [themeChoice]);

  const setTheme = (theme: Theme) => {
    setThemeChoice(theme);
  };

  return { theme: themeChoice, effectiveTheme, setTheme };
}
```

### Pattern 3: FOUC Prevention with Inline Script
**What:** Initialize theme class before React hydration to prevent flash
**When to use:** Always, for production-quality theme switching
**Example:**
```html
<!-- Source: React dark mode guides (2025-2026) -->
<!-- In index.html, before any CSS loads -->
<script>
  (function() {
    const stored = localStorage.getItem('theme') || 'system';
    let effective = stored;

    if (stored === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    document.documentElement.classList.add('theme-' + effective);
  })();
</script>
```

### Pattern 4: Toolbar Theme Toggle Component
**What:** Icon button that cycles through themes with tooltip
**When to use:** Quick-access theme toggle in toolbar
**Example:**
```typescript
// Source: Common UI pattern from Material-UI and shadcn
import { useTheme } from '../../hooks/useTheme';

const THEME_ICONS = {
  light: '☀️',   // Sun for light mode
  dark: '🌙',    // Moon for dark mode
  system: '🖥️'  // Monitor for system mode
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const order: Theme[] = ['system', 'light', 'dark'];
    const current = order.indexOf(theme);
    const next = (current + 1) % order.length;
    setTheme(order[next]);
  };

  return (
    <button
      className="toolbar-button"
      onClick={cycleTheme}
      title={`Theme: ${theme} (click to change)`}
    >
      <span className="toolbar-icon">{THEME_ICONS[theme]}</span>
      <span className="toolbar-label">Theme</span>
    </button>
  );
}
```

### Anti-Patterns to Avoid
- **Using media queries inside variables:** CSS variables cannot be used in @media or @container queries - always apply theme classes to root element instead
- **Component-scoped variables only:** Creates maintenance burden, use semantic variables that components reference
- **No FOUC prevention:** Users will see theme flash on page load, hurting perceived quality
- **Forgetting system preference listener:** App won't update when user changes OS theme while app is running
- **Inline style calculations:** Don't use inline styles for colors that should theme, move to CSS with variables

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color interpolation/mixing | Custom lightness/darkness functions | CSS relative color syntax or design tokens | Browser-native, consistent, no math errors |
| Theme context provider | Custom context from scratch | useState + useEffect pattern shown above | Simpler, less code, easier to debug |
| Local storage wrapper | Custom localStorage hooks | Direct localStorage with error handling | Adds complexity without benefit for simple use case |
| System preference detection | Manual user-agent parsing | window.matchMedia('prefers-color-scheme') | Standard API, reliable, handles edge cases |

**Key insight:** CSS theming is mature technology - the patterns above are battle-tested and handle edge cases you won't think of until production (FOUC, system preference changes, localStorage errors, media query racing).

## Common Pitfalls

### Pitfall 1: Flash of Unstyled Content (FOUC)
**What goes wrong:** Page loads with default theme, then flashes to user's preferred theme
**Why it happens:** React initializes theme after first render, causing visible theme switch
**How to avoid:** Add inline <script> in index.html before CSS that reads localStorage and applies theme class immediately
**Warning signs:** Users report seeing brief flash of light theme on page load

### Pitfall 2: Forgetting Canvas Neutrality
**What goes wrong:** Tile canvas rendering changes colors with theme, making tiles unrecognizable
**Why it happens:** CSS variables cascade to all children unless explicitly overridden
**How to avoid:** Use !important override or explicit hex color for canvas drawing backgrounds (not canvas chrome like scrollbars)
**Warning signs:** Tiles look different between dark/light modes, especially dark tiles on light background

### Pitfall 3: Missing System Preference Listener
**What goes wrong:** App doesn't update when user changes OS theme while app is running
**Why it happens:** Only checking system preference on mount, not listening for changes
**How to avoid:** Add MediaQueryList change event listener in useEffect when theme is 'system'
**Warning signs:** App theme doesn't update when user switches OS theme without reloading

### Pitfall 4: Inconsistent Variable Usage
**What goes wrong:** Some components use variables, others have hardcoded colors, creating maintenance nightmare
**Why it happens:** Incomplete migration or lazy copy-paste from old code
**How to avoid:** Complete audit of all CSS files, verify zero hardcoded hex colors remain (use grep verification)
**Warning signs:** Some UI elements don't respond to theme changes

### Pitfall 5: localStorage Quota Exceeded
**What goes wrong:** App crashes or loses theme preference on devices with full localStorage
**Why it happens:** No error handling around localStorage operations
**How to avoid:** Wrap localStorage calls in try-catch, fail gracefully to default theme
**Warning signs:** Users report theme not persisting on some devices

### Pitfall 6: Over-Engineering Variable Naming
**What goes wrong:** Variables named like --animation-panel-header-background become unmaintainable
**Why it happens:** Component-based naming taken too far
**How to avoid:** Use semantic variables (--bg-primary) that components reference, not component-specific variables
**Warning signs:** Need to change 20 variables to adjust one color

### Pitfall 7: Transition Flicker During Theme Switch
**What goes wrong:** Rapid theme cycling causes visual glitches with CSS transitions
**Why it happens:** Multiple transition properties firing at once
**How to avoid:** Either instant switch (no transitions) OR very subtle fade (200ms max on opacity only)
**Warning signs:** Users report "glitchy" feeling when switching themes rapidly

## Code Examples

Verified patterns from official sources:

### Migration Example: AnimationPanel.css
```css
/* BEFORE (hardcoded) */
.animation-panel {
  background: #1a1a2e;
  border-left: 1px solid #2a2a4e;
}

.animation-panel .panel-header {
  color: #e0e0e0;
  background: #0d0d1a;
  border-bottom: 1px solid #2a2a4e;
}

.toggle-button {
  color: #e0e0e0;
  background: #2a2a4e;
}

.toggle-button:hover {
  background: #3a3a6e;
}

/* AFTER (CSS variables) */
.animation-panel {
  background: var(--bg-primary);
  border-left: 1px solid var(--border-default);
}

.animation-panel .panel-header {
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-default);
}

.toggle-button {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.toggle-button:hover {
  background: var(--bg-hover);
}
```

### Migration Example: Slider Styles
```css
/* BEFORE (hardcoded with webkit-specific colors) */
.offset-slider {
  background: #2a2a4e;
}

.offset-slider::-webkit-slider-thumb {
  background: #6a6aae;
}

.offset-slider::-webkit-slider-thumb:active {
  background: #8a8ace;
}

/* AFTER (CSS variables) */
.offset-slider {
  background: var(--slider-track);
}

.offset-slider::-webkit-slider-thumb {
  background: var(--slider-thumb);
}

.offset-slider::-webkit-slider-thumb:active {
  background: var(--slider-thumb-active);
}
```

### Component Usage Example
```typescript
// Source: Component using theme hook
import { useTheme } from '../../hooks/useTheme';

export function MapSettingsPanel() {
  const { theme, effectiveTheme } = useTheme();

  // Use effectiveTheme for logic (never 'system', always 'light' or 'dark')
  const iconColor = effectiveTheme === 'dark' ? 'white' : 'black';

  // CSS handles theming automatically via variables
  return (
    <div className="map-settings-panel">
      {/* Component renders normally, CSS variables handle colors */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS preprocessor variables (SASS/LESS) | CSS custom properties (native) | 2015-2018 | Runtime theme switching now possible |
| Toggle dark/light only | Three-way: dark/light/system | 2020-present | Respects user OS preference by default |
| Context API for theme | useState + useEffect pattern | 2021-present | Simpler, less boilerplate for basic theming |
| Data attributes for themes | CSS classes on root | 2019-present | Better browser support, wider documentation |
| localStorage only | localStorage + system preference | 2019-present | Better UX for users who don't set preference |

**Deprecated/outdated:**
- **@media prefers-color-scheme only:** Modern apps should allow manual override, not just system
- **Separate CSS files per theme:** CSS variables make this unnecessary and harder to maintain
- **CSS-in-JS for theming:** Native CSS variables are more performant and simpler for static themes
- **Component-level theme props:** Prop drilling is anti-pattern, use CSS variables instead

## Open Questions

Things that couldn't be fully resolved:

1. **Transition Animation Duration**
   - What we know: Common options are instant (0ms) or subtle (100-200ms opacity fade)
   - What's unclear: User preference for this specific app's aesthetic
   - Recommendation: Start with instant switching, add subtle transition in future phase if requested

2. **Accent Color Choice for Light Theme**
   - What we know: Dark theme uses purple (#6a6aae), light theme needs different color for contrast
   - What's unclear: Whether to keep purple family or choose different hue (blue, teal, etc.)
   - Recommendation: Use muted blue (#5a7d9e) for light theme accent - better contrast on cream background, familiar Windows aesthetic

3. **Canvas Scrollbar Chrome Theming Scope**
   - What we know: Canvas drawing must stay neutral, chrome should theme
   - What's unclear: Exact definition of "chrome" - does it include just scrollbars, or also surrounding container?
   - Recommendation: Theme container background and scrollbar colors, keep only the actual tile drawing area neutral

4. **Inline Styles in MapCanvas.tsx**
   - What we know: MapCanvas has inline styles for scrollbar thumb positioning (dynamic values)
   - What's unclear: Whether there are color-related inline styles that need migration
   - Recommendation: Review MapCanvas.tsx during planning, inline positioning styles are acceptable, only migrate color-related inline styles if found

## Sources

### Primary (HIGH confidence)
- [MDN: Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - Fallback values, inheritance, theming best practices (January 2025)
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) - System preference detection
- Codebase analysis - 83 hardcoded colors across 6 files, existing 7 CSS variables in App.css

### Secondary (MEDIUM confidence)
- [Create a Light and Dark Mode Theme Toggle in React](https://jeffszuc.com/posts/articles/theme-toggle) - React theme state management (2026)
- [Theme Switching: Dark, Light, Auto Mode in React](https://sreyas.com/blog/theme-switching-dark-light-auto-mode-in-react/) - Three-way theme pattern
- [Dark Mode Toggle and prefers-color-scheme](https://dev.to/abbeyperini/dark-mode-toggle-and-prefers-color-scheme-4f3m) - localStorage override pattern
- [Fixing Dark Mode Flickering (FOUC) in React and Next.js](https://notanumber.in/blog/fixing-react-dark-mode-flickering) - FOUC prevention (2025)
- [Material UI: Dark Mode](https://mui.com/material-ui/customization/dark-mode/) - Industry standard implementation patterns

### Tertiary (LOW confidence)
- [CSS Variable Naming](https://www.munq.me/blog/css-variables) - Naming convention recommendations
- [Thinking Deeply About Theming and Color Naming](https://css-tricks.com/thinking-deeply-about-theming-and-color-naming/) - Semantic vs component naming tradeoffs
- [Figma: Cream Color](https://www.figma.com/colors/cream/) - Warm cream palette hex codes for light theme

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native browser APIs + existing React 18, no new dependencies needed
- Architecture: HIGH - Patterns verified in multiple 2025-2026 sources, widely adopted in production apps
- Pitfalls: HIGH - FOUC and system preference handling documented in official guides, other pitfalls from direct codebase analysis

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain, patterns unlikely to change)
