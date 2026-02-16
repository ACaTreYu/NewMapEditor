# Phase 76: Warm UI Palette - Research

**Researched:** 2026-02-16
**Domain:** CSS color design system, OKLCH color space
**Confidence:** HIGH

## Summary

Phase 76 shifts the UI color palette from cool blue-grey tones (hue 280°) to warm cream/beige tones to create a more inviting, warmer interface feel. The project already uses a modern OKLCH-based two-tier design token system established in Phase 27, requiring only targeted hue value changes in the neutral color primitives.

Research confirms that warm neutral colors in OKLCH use hue values in the 40-80° range (yellow-orange spectrum) for cream/beige/tan tones, compared to the current 280° (blue-purple spectrum). The existing architecture supports this change with minimal impact: updating 7 primitive color definitions in `variables.css` will cascade through 327 semantic token usages across 18 component CSS files automatically.

No new dependencies, no structural changes, no component updates required. This is a pure design token value substitution that leverages the existing two-tier token architecture.

**Primary recommendation:** Update OKLCH hue values from 280° (cool) to 50-60° (warm) for neutral palette primitives in `src/styles/variables.css`. Maintain existing lightness and chroma values to preserve contrast ratios and accessibility. Test rendered appearance and adjust chroma if needed for desired warmth intensity.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OKLCH Color Space | Native CSS | Perceptually uniform colors | Already established in Phase 27; supported in Electron 28 (Chromium 120+); allows hue rotation while maintaining lightness |
| CSS Custom Properties | Native | Design tokens | Existing two-tier system (primitives → semantic aliases) enables cascading changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Online OKLCH Color Picker | N/A (web tool) | Visual validation of warm hues | Use oklch.fyi or oklch.net to preview warm hue ranges before committing values |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OKLCH hue shift | RGB/HSL warm palette | OKLCH maintains perceptual uniformity across lightness values; RGB/HSL would require recalculating all 7 neutral shades to maintain contrast |
| Direct hue values | Calculated warm palette tool | Direct values give precise control; tools might generate unnecessary intermediate shades |

**Installation:**
```bash
# No dependencies required - pure CSS variable changes
```

## Architecture Patterns

### Pattern 1: Two-Tier Design Token System (Existing)

**What:** Primitive color values (Tier 1) mapped to semantic aliases (Tier 2) that components consume.

**Current implementation:**
```css
/* Tier 1: Primitives (WHAT WE CHANGE) */
--color-neutral-100: oklch(95% 0.005 280);   /* Cool hue: 280° */

/* Tier 2: Semantic aliases (UNCHANGED) */
--surface-secondary: var(--color-neutral-50);
--bg-tertiary: var(--color-neutral-100);
```

**How Phase 76 uses it:**
- Change Tier 1 hue values: `280` → `50-60` (warm range)
- Tier 2 semantic names stay identical
- All 327 component usages cascade automatically

**Why this works:**
- Components reference semantic tokens (`--bg-hover`), not primitives
- Semantic tokens map to primitives via `var(--color-neutral-X)`
- Changing primitive hue propagates through entire system
- Zero component CSS changes required

**Example change:**
```css
/* BEFORE (cool) */
--color-neutral-50: oklch(98% 0.005 280);   /* Cool blue-grey */
--color-neutral-100: oklch(95% 0.005 280);
--color-neutral-200: oklch(90% 0.005 280);

/* AFTER (warm) */
--color-neutral-50: oklch(98% 0.005 50);    /* Warm cream */
--color-neutral-100: oklch(95% 0.005 50);
--color-neutral-200: oklch(90% 0.005 50);
```

**Source:** Existing architecture from Phase 27 research (`E:\NewMapEditor\.planning\phases\27-css-design-system\27-RESEARCH.md`)

### Pattern 2: OKLCH Hue Rotation for Temperature Shift

**What:** Rotating hue value (H parameter in OKLCH) changes color temperature while preserving perceptual lightness (L) and saturation intensity (C).

**OKLCH Parameters:**
- **L (Lightness):** 0-100% — perceptual brightness (KEEP SAME)
- **C (Chroma):** 0-0.37 — colorfulness intensity (KEEP SAME or adjust slightly)
- **H (Hue):** 0-360° — color wheel position (CHANGE: 280° → 50-60°)

**Hue ranges by temperature:**
- **Cool tones:** 200-280° (blue, purple)
- **Neutral-cool:** 280° (blue-grey) — **current state**
- **Warm tones:** 40-80° (yellow, orange)
- **Neutral-warm:** 50-60° (cream, beige) — **target state**

**Why hue rotation works:**
- OKLCH maintains perceptual uniformity: rotating hue doesn't break contrast ratios
- Same lightness values (95%, 90%, 80%, etc.) remain equally distinguishable
- Chroma stays low (0.005) for neutral appearance regardless of hue

**Example:**
```css
/* Cool neutral (current) */
--color-neutral-100: oklch(95% 0.005 280);   /* Blue-grey */

/* Warm neutral (target) */
--color-neutral-100: oklch(95% 0.005 50);    /* Cream */
                              /* ↑      ↑ */
                              /* Keep   Change */
```

**Sources:**
- [OKLCH in CSS: Consistent, accessible color palettes - LogRocket Blog](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes)
- [oklch() - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch)
- [Create mathematically generated CSS color schemes with OKLCh. - SuperGeekery](https://supergeekery.com/blog/create-mathematically-generated-css-color-schemes-with-oklch)

### Pattern 3: Preserve Achromatic Extremes

**What:** Pure white (L=100%, C=0) and near-black (L=20%, C=0) should remain achromatic (no hue) to avoid color tint on extreme values.

**Current implementation:**
```css
--color-neutral-0: oklch(100% 0 0);      /* Pure white - no hue */
--color-neutral-900: oklch(20% 0 0);     /* Near black - no hue */
```

**Rule for Phase 76:**
- **Neutral-0 (pure white):** Keep `oklch(100% 0 0)` — no change
- **Neutral-50 through 700:** Apply warm hue (50-60°)
- **Neutral-900 (near black):** Keep `oklch(20% 0 0)` — no change

**Why:**
- Tinted whites/blacks look "wrong" (cream-white is acceptable for 50, but not 0)
- Text on backgrounds relies on neutral extremes for maximum contrast
- Midtones (50-700) can carry warm hue without looking unnatural

**Example:**
```css
/* Correct: Achromatic extremes, warm midtones */
--color-neutral-0: oklch(100% 0 0);        /* Pure white - no hue */
--color-neutral-50: oklch(98% 0.005 50);   /* Warm cream */
--color-neutral-100: oklch(95% 0.005 50);  /* Warm light grey */
--color-neutral-900: oklch(20% 0 0);       /* Pure near-black - no hue */

/* Avoid: Tinted extremes */
--color-neutral-0: oklch(100% 0.01 50);    /* ❌ Cream-white (too tinted) */
--color-neutral-900: oklch(20% 0.01 50);   /* ❌ Warm-black (looks muddy) */
```

**Source:** Industry best practice from design systems (Material Design, Tailwind CSS neutral palettes)

### Anti-Patterns to Avoid

- **Changing lightness values:** Don't adjust L values when shifting temperature. Contrast ratios depend on lightness deltas, not hue. Changing lightness breaks accessibility.
- **Over-saturating warm tones:** Don't increase chroma beyond 0.01 for neutrals. High chroma (>0.02) makes backgrounds look "colored" rather than "warm neutral."
- **Inconsistent hue across scale:** Don't use different hues for different neutral shades (e.g., 40° for light, 60° for dark). Keep hue constant across scale for perceptual harmony.
- **Forgetting to test:** Don't commit hue changes without visual testing. Even perceptually uniform colors can feel "off" in context. Preview in actual UI before finalizing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Warm neutral palette generation | Manual RGB/hex picker conversions | OKLCH hue rotation from existing palette | OKLCH preserves perceptual uniformity; manual RGB conversion requires recalculating all contrast ratios |
| Color temperature validation | Eyeballing in browser | Online OKLCH color picker (oklch.fyi) | Visual tool shows full spectrum, allows precise hue selection with live preview |
| Contrast ratio testing | Assumptions based on lightness | Browser DevTools contrast checker | WCAG AA/AAA validation built into DevTools; validates actual rendered colors |

**Key insight:** OKLCH's perceptual uniformity means hue changes are "safe" if L and C remain constant. Don't rebuild the entire palette from scratch — rotate hue and validate visually.

## Common Pitfalls

### Pitfall 1: Warm Hue Too Yellow (Hue > 70°)

**What goes wrong:** UI looks sickly yellow or jaundiced instead of warm and inviting.

**Why it happens:** Hue values 70-100° shift from cream/beige (warm neutral) to yellow (saturated warm). Even low chroma can't neutralize strong yellow.

**How to avoid:** Stay in 40-60° range for warm neutrals. Preview at 50° first, adjust ±10° if needed. Never exceed 70° for neutral backgrounds.

**Warning signs:**
- Whites look cream-colored in an unpleasant way
- UI feels "dated" (resembles aged paper or old computer monitors)
- Color appears more saturated than neutral despite low chroma

**Correction:**
```css
/* TOO YELLOW (avoid) */
--color-neutral-100: oklch(95% 0.005 80);   /* ❌ Sickly yellow-grey */

/* CORRECT (cream/beige) */
--color-neutral-100: oklch(95% 0.005 50);   /* ✅ Warm cream-grey */
```

### Pitfall 2: Increasing Chroma for "More Warmth"

**What goes wrong:** Backgrounds look colored (beige, tan) rather than neutral with warm undertones.

**Why it happens:** Chroma controls saturation intensity. Neutrals require very low chroma (0.005-0.01). Increasing chroma makes colors perceptually "colored."

**How to avoid:** Keep chroma at existing values (0.005). If warmth feels insufficient, adjust hue ±5° instead of increasing chroma.

**Warning signs:**
- Backgrounds look "painted" beige/tan instead of subtle warm grey
- Text contrast feels off (colored backgrounds reduce perceived contrast)
- UI looks like a "themed" design (brown, tan) rather than neutral

**Correction:**
```css
/* OVER-SATURATED (avoid) */
--color-neutral-100: oklch(95% 0.02 50);    /* ❌ Beige (too colorful) */

/* CORRECT (warm neutral) */
--color-neutral-100: oklch(95% 0.005 50);   /* ✅ Warm grey (subtle) */
```

### Pitfall 3: Applying Warm Hue to Accent Colors

**What goes wrong:** Blue accent colors shift toward teal/cyan, losing brand color identity.

**Why it happens:** Confusion between "warm UI palette" (neutrals only) and "warm accent colors" (not the goal).

**How to avoid:** Only change neutral palette hues (--color-neutral-*). Leave accent blues (--color-blue-*) unchanged.

**Warning signs:**
- Primary buttons look teal instead of blue
- Hover states on accent elements appear green-ish
- Focus rings no longer match brand blue

**Correction:**
```css
/* INCORRECT: Warming accent blue */
--color-blue-500: oklch(60% 0.15 50);       /* ❌ Teal (was blue) */

/* CORRECT: Keep accent blue unchanged */
--color-blue-500: oklch(60% 0.15 250);      /* ✅ Blue (unchanged) */
```

### Pitfall 4: Not Testing Hover States

**What goes wrong:** Hover backgrounds (--bg-hover, --bg-active) don't feel visually distinct after hue shift.

**Why it happens:** Hover states use different lightness values from same neutral palette. Warm hue might reduce perceived contrast between rest/hover states.

**How to avoid:** After changing hues, test all interactive states: button hover, toolbar hover, input focus. Verify perceived contrast still feels clear.

**Warning signs:**
- Hover states feel "muddy" or hard to distinguish
- Users don't notice hover feedback
- Active/selected states blend with rest state

**Validation test:**
1. Hover over toolbar buttons — should clearly lighten
2. Click buttons — active state should be noticeably darker than hover
3. Focus inputs — border should be clearly visible

## Code Examples

Verified patterns from existing codebase and OKLCH standards:

### Current Cool Palette (Before Phase 76)

```css
/* src/styles/variables.css (current state) */
:root {
  /* Neutral palette - Cool tone (slight blue-grey) */
  --color-neutral-0: oklch(100% 0 0);              /* Pure white */
  --color-neutral-50: oklch(98% 0.005 280);        /* Off-white (cool) */
  --color-neutral-100: oklch(95% 0.005 280);       /* Light grey (cool) */
  --color-neutral-200: oklch(90% 0.005 280);       /* Lighter grey (cool) */
  --color-neutral-300: oklch(80% 0.005 280);       /* Light-medium grey (cool) */
  --color-neutral-500: oklch(60% 0.005 280);       /* Medium grey (cool) */
  --color-neutral-700: oklch(35% 0.005 280);       /* Dark grey (cool) */
  --color-neutral-900: oklch(20% 0 0);             /* Very dark grey */
}
```

**Analysis:**
- Hue 280° = blue-purple spectrum (cool)
- Chroma 0.005 = very low saturation (neutral appearance)
- Extremes (0, 900) are achromatic (C=0, H=0)

### Target Warm Palette (After Phase 76)

```css
/* src/styles/variables.css (target state) */
:root {
  /* Neutral palette - Warm tone (cream/beige direction) */
  --color-neutral-0: oklch(100% 0 0);              /* Pure white (unchanged) */
  --color-neutral-50: oklch(98% 0.005 50);         /* Off-white (warm) */
  --color-neutral-100: oklch(95% 0.005 50);        /* Light grey (warm) */
  --color-neutral-200: oklch(90% 0.005 50);        /* Lighter grey (warm) */
  --color-neutral-300: oklch(80% 0.005 50);        /* Light-medium grey (warm) */
  --color-neutral-500: oklch(60% 0.005 50);        /* Medium grey (warm) */
  --color-neutral-700: oklch(35% 0.005 50);        /* Dark grey (warm) */
  --color-neutral-900: oklch(20% 0 0);             /* Very dark grey (unchanged) */
}
```

**Changes:**
- Hue: `280` → `50` (cool blue-grey → warm cream)
- Chroma: Unchanged at `0.005` (maintains neutral appearance)
- Lightness: Unchanged (preserves contrast ratios)
- Extremes: Unchanged (neutral-0 and neutral-900 remain achromatic)

**Cascade impact:**
- 327 usages across 18 component CSS files update automatically
- Semantic tokens (--surface, --bg-hover, --border-default) inherit new warm hue
- No component CSS changes required

### Visual Comparison (Conceptual)

```
Cool Palette (280°):
  Neutral-50:  Very pale blue-grey
  Neutral-100: Pale blue-grey
  Neutral-200: Light blue-grey
  Neutral-300: Blue-grey
  Neutral-500: Medium blue-grey
  Neutral-700: Dark blue-grey

Warm Palette (50°):
  Neutral-50:  Very pale cream
  Neutral-100: Pale cream-grey
  Neutral-200: Light cream-grey
  Neutral-300: Cream-grey
  Neutral-500: Medium warm grey
  Neutral-700: Dark warm grey
```

### Alternative Warm Hue Values

```css
/* Option A: Conservative warm (closer to neutral) */
--color-neutral-100: oklch(95% 0.005 60);    /* Hue 60° - subtle warmth */

/* Option B: Recommended warm (cream/beige) */
--color-neutral-100: oklch(95% 0.005 50);    /* Hue 50° - clear warmth */

/* Option C: Strong warm (more yellow undertone) */
--color-neutral-100: oklch(95% 0.005 40);    /* Hue 40° - orange-cream */
```

**Recommendation:** Start with Option B (hue 50°). If warmth feels too subtle, try Option C (hue 40°). If warmth feels too strong, try Option A (hue 60°). Never exceed 70° or go below 30°.

### Validation Test Pattern

```css
/* After changing hues, test these semantic tokens visually */
.test-panel {
  background: var(--surface);              /* Should feel warm white */
  border: 1px solid var(--border-subtle); /* Should feel warm light grey */
}

.test-panel:hover {
  background: var(--bg-hover);             /* Should clearly contrast with --surface */
}

.test-button:active {
  background: var(--bg-active);            /* Should clearly contrast with --bg-hover */
}

.test-input {
  background: var(--input-bg);             /* Should feel warm white */
  border: 1px solid var(--input-border);  /* Should feel warm grey */
}

.test-input:focus {
  border-color: var(--input-focus);        /* Should remain blue (accent unchanged) */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual RGB warm palette | OKLCH hue rotation | 2023+ (Chrome 111) | Perceptually uniform warmth; maintains contrast ratios automatically |
| Hardcoded color values | Two-tier design tokens | Phase 27 (v2.0) | Change primitives, semantics cascade; no component updates needed |
| Cool blue-grey neutrals | Warm cream/beige neutrals | Phase 76 (v3.4) | More inviting, warmer UI feel; aligns with 2026 design trends |

**Design trend context (2026):**
- Warm neutral palettes increasingly popular in productivity tools
- Cream/beige backgrounds reduce eye strain vs. pure white
- Warm tones psychologically associated with comfort, approachability
- Cool blues still dominant for accent/action colors (maintain separation)

## Open Questions

1. **What specific warm hue value (40-60°) should we use?**
   - What we know: Range is 40-60° for cream/beige; 50° is middle of range
   - What's unclear: User preference for warmth intensity (subtle vs. clear)
   - Recommendation: Start with 50° (clear warm without being yellow). Validate visually. Adjust ±10° if needed based on rendered appearance. Document final choice in PLAN.md.

2. **Should we adjust chroma values for warmer appearance?**
   - What we know: Current chroma is 0.005 (very neutral); increasing chroma adds saturation
   - What's unclear: Whether warmth goal requires slight chroma increase (0.005 → 0.008)
   - Recommendation: Keep chroma at 0.005 initially. Only increase to 0.008 if hue rotation alone feels insufficient. Increasing chroma risks "colored" appearance (see Pitfall 2).

3. **Do accent blue colors need adjustment after neutral shift?**
   - What we know: Accent blues (--color-blue-500, etc.) currently use hue 250° (blue)
   - What's unclear: Whether warm neutral backgrounds require warmer blue accents for harmony
   - Recommendation: Keep accent blues unchanged at 250°. Warm neutrals pair well with cool accents (design principle: contrast between neutral and accent temperatures). Only adjust if visual testing reveals disharmony.

## Impact Analysis

### Files Modified
- **1 file:** `src/styles/variables.css` — Update 7 neutral primitive hue values (280° → 50°)

### Files Automatically Updated (via CSS cascade)
- **18 component CSS files:** 327 usages of semantic tokens inherit new warm hue
- **0 TypeScript/React files:** No code changes required

### Visual Impact Areas
- **All UI surfaces:** Backgrounds, panels, dialogs shift from cool to warm
- **Hover states:** Toolbar buttons, inputs, interactive elements feel warmer
- **Borders:** All border colors shift from cool grey to warm grey
- **Text on backgrounds:** Contrast ratios maintained (lightness unchanged)

### Testing Focus
- **Hover states:** Verify perceived contrast still clear
- **Input focus:** Blue focus rings should stand out against warm backgrounds
- **Text readability:** Confirm no readability degradation
- **Color harmony:** Verify warm neutrals pair well with blue accents

## Implementation Checklist

- [ ] Update `src/styles/variables.css` neutral palette hues (280° → 50°)
  - [ ] --color-neutral-50: Change hue from 280 to 50
  - [ ] --color-neutral-100: Change hue from 280 to 50
  - [ ] --color-neutral-200: Change hue from 280 to 50
  - [ ] --color-neutral-300: Change hue from 280 to 50
  - [ ] --color-neutral-500: Change hue from 280 to 50
  - [ ] --color-neutral-700: Change hue from 280 to 50
  - [ ] Verify neutral-0 remains `oklch(100% 0 0)` (achromatic)
  - [ ] Verify neutral-900 remains `oklch(20% 0 0)` (achromatic)

- [ ] Visual validation
  - [ ] Load editor, verify warm appearance of all panels
  - [ ] Test toolbar button hover states (should feel warm, contrast clear)
  - [ ] Test input focus states (blue ring should stand out)
  - [ ] Test dialog backgrounds (warm white, not beige)
  - [ ] Test borders (warm grey, not brown)

- [ ] Contrast validation
  - [ ] Use DevTools contrast checker on text/background pairs
  - [ ] Verify WCAG AA compliance maintained (4.5:1 for body text)
  - [ ] Check StatusBar text against background
  - [ ] Check toolbar icons against background

- [ ] Cross-component consistency
  - [ ] All panels use consistent warm palette
  - [ ] No components appear "more warm" or "less warm" (hue consistency)
  - [ ] Hover/active states consistent across all interactive elements

- [ ] Edge case testing
  - [ ] Minimap background (uses --workspace-bg → neutral-200)
  - [ ] Scrollbar track/thumb (uses neutral-100, neutral-300)
  - [ ] Canvas checker background (uses neutral-300)
  - [ ] Dialog overlay (uses rgba, unchanged)

## Sources

### Primary (HIGH confidence)

- **OKLCH Specification:**
  - [oklch() - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch) - Official CSS spec
  - [oklch() | CSS-Tricks](https://css-tricks.com/almanac/functions/o/oklch/) - Implementation guide

- **OKLCH Color Tools:**
  - [oklch.fyi - OKLCH Color Picker, Generator and Converter](https://oklch.fyi/) - Visual color picker
  - [OKLCH Color Picker & Converter](https://oklch.net/) - Alternative picker tool

- **Existing Codebase:**
  - `E:\NewMapEditor\src\styles\variables.css` - Current cool palette (hue 280°)
  - `E:\NewMapEditor\.planning\phases\27-css-design-system\27-RESEARCH.md` - Two-tier token system architecture
  - Grep analysis: 327 semantic token usages across 18 component CSS files

### Secondary (MEDIUM confidence)

- **OKLCH Best Practices:**
  - [OKLCH in CSS: Consistent, accessible color palettes - LogRocket Blog](https://blog.logrocket.com/oklch-css-consistent-accessible-color-palettes) - Palette generation patterns
  - [Create mathematically generated CSS color schemes with OKLCh. - SuperGeekery](https://supergeekery.com/blog/create-mathematically-generated-css-color-schemes-with-oklch) - Hue rotation techniques
  - [Generating colors with the CSS oklch() function | Go Make Things](https://gomakethings.com/generating-colors-with-the-css-oklch-function/) - CSS implementation

- **Color Temperature Research:**
  - Web search: OKLCH warm neutral hue ranges (40-80° for yellow-orange spectrum)
  - Web search: Warm neutrals (beige/tan/cream) typically 40-60° hue range
  - Industry practice: Design systems keep extremes (white, near-black) achromatic

### Tertiary (LOW confidence)

- **Design Trends:**
  - Web search: 2026 warm neutral palette trends (increasing adoption for productivity tools)
  - Context: Warm tones associated with comfort, approachability (psychological research)

**Note:** Specific hue value (50° recommendation) is based on mid-range of warm neutral spectrum (40-60°), not verified in official sources. Visual testing required to confirm optimal value.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - OKLCH native CSS, existing architecture established
- Architecture: HIGH - Two-tier token system verified in codebase, cascade behavior understood
- Hue ranges: MEDIUM - Warm neutral range (40-60°) from color theory, not OKLCH-specific official docs
- Pitfalls: MEDIUM-HIGH - Based on color design best practices, some project-specific assumptions

**Research date:** 2026-02-16
**Valid until:** ~30 days (2026-03-18) - OKLCH spec stable; specific hue choice may need iteration based on visual feedback

**Key Technical Decisions:**
- ✅ Use hue rotation (280° → 50°) for warm shift
- ✅ Keep lightness values unchanged (preserve contrast ratios)
- ✅ Keep chroma values unchanged at 0.005 (maintain neutral appearance)
- ✅ Keep extremes (neutral-0, neutral-900) achromatic
- ✅ Keep accent blues unchanged (cool accent vs. warm neutral is intentional)
- ⚠️ Final hue value (40-60° range) requires visual validation
- ⚠️ Chroma adjustment (0.005 → 0.008) optional if warmth insufficient
