# Technology Stack: v2.0 Modern UI & Map Format Enhancements

**Milestone:** v2.0 - Modern minimalist UI, settings serialization, SEdit map parsing parity, TypeScript strict cleanup
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

**No production dependencies required.** All v2.0 features can be implemented with native CSS capabilities (cascade layers, container queries, OKLCH colors, logical properties) and existing TypeScript tooling. Optional ESLint addition for TypeScript strict mode enforcement.

**Key Decision:** Replace Win98 two-tier CSS variable system with modern minimalist design using CSS layers, semantic design tokens in OKLCH color space, and container query-based responsive components.

---

## Stack Changes Overview

| Category | Current (v1.x) | v2.0 Change | Why |
|----------|----------------|-------------|-----|
| **CSS Architecture** | Win98 variables (two-tier system) | CSS layers + OKLCH tokens | Modern, maintainable, supports theming |
| **CSS Color System** | RGB/hex (#c0c0c0) | OKLCH color space | Perceptually uniform, better color mixing |
| **Responsive Design** | Fixed sizing | Container queries | Component-based responsiveness |
| **TypeScript Checking** | `strict: true` (errors exist) | Fix errors + optional ESLint | Type safety enforcement |
| **Settings Format** | Separate fields | SEdit description serialization | Map format parity |

**Production dependencies added:** None
**Dev dependencies considered:** ESLint + typescript-eslint (optional)

---

## 1. Modern Minimalist CSS Design System

### Recommended Approach: CSS Layers + Design Tokens

**Implementation:** Native CSS without frameworks
**Confidence:** HIGH

Replace the existing two-tier Win98 variable system with modern CSS capabilities:

#### CSS Cascade Layers (@layer)

**What:** Organize styles into distinct layers with explicit precedence order
**Why:** Solves specificity issues, makes theming predictable
**Browser support:** All modern browsers since 2022 ([Can I use](https://caniuse.com/css-cascade-layers))

```css
/* Define layer order (first = lowest precedence) */
@layer reset, base, components, utilities;

@layer reset {
  /* Remove Win98 bevel styles */
  * { box-sizing: border-box; }
}

@layer base {
  /* Core design tokens */
  :root {
    /* Color primitives (OKLCH) */
    --color-neutral-50: oklch(98% 0 0);
    --color-neutral-900: oklch(20% 0 0);

    /* Semantic tokens */
    --surface-primary: var(--color-neutral-50);
    --text-primary: var(--color-neutral-900);
  }
}

@layer components {
  /* Component-specific styles */
  .toolbar { /* ... */ }
}

@layer utilities {
  /* Highest precedence overrides */
  .hidden { display: none !important; }
}
```

**Benefits:**
- Layer precedence beats selector specificity (no more `!important` wars)
- Clean migration path: wrap existing Win98 CSS in `@layer legacy`, add new layers
- Explicit ordering prevents cascade conflicts

**Migration strategy:**
1. Define layer order in App.css
2. Wrap win98-*.css imports in `@layer legacy`
3. Add `@layer modern` for new minimalist styles
4. Gradually migrate components from legacy to modern layer

**Sources:**
- [MDN: @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer)
- [Smashing Magazine: CSS Cascade Layers](https://www.smashingmagazine.com/2022/01/introduction-css-cascade-layers/)
- [The Modern CSS Toolkit: What Actually Matters in 2026](https://www.nickpaolini.com/blog/modern-css-toolkit-2026)

#### OKLCH Color System

**What:** Perceptually uniform color space with Lightness, Chroma, Hue
**Why:** Consistent lightness across hues, better color mixing, accessibility-friendly
**Browser support:** 93% (Chrome 111+, Safari 15.4+, Firefox 113+, Edge 111+)

```css
:root {
  /* Primitive colors in OKLCH */
  --neutral-950: oklch(15% 0 0);      /* Near black */
  --neutral-100: oklch(96% 0 0);      /* Near white */
  --accent-500: oklch(60% 0.15 220);  /* Blue accent */

  /* Semantic tokens */
  --surface-base: var(--neutral-100);
  --text-primary: var(--neutral-950);
  --text-secondary: oklch(50% 0 0);   /* Mid gray */

  /* Generated tints/shades with color-mix */
  --accent-hover: color-mix(in oklch, var(--accent-500) 80%, white);
  --surface-raised: color-mix(in oklch, var(--surface-base) 95%, black);
}
```

**Advantages over HSL:**
- Lightness is perceptually consistent (HSL blue appears darker than HSL yellow at same L value)
- `color-mix(in oklch, ...)` produces vibrant gradients without graying
- Easier to maintain contrast ratios for WCAG compliance

**Migration from Win98 RGB:**
- Convert Win98 canonical colors (#c0c0c0 → oklch(76% 0 0))
- Use [oklch.org converter](https://oklch.org/) for batch conversion
- Keep semantic tier 2 names (--surface, --text-primary), update values

**Sources:**
- [MDN: oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch)
- [OKLCH in CSS: Why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [The Ultimate OKLCH Guide: Modern CSS Color Redefined](https://oklch.org/posts/ultimate-oklch-guide)

#### Container Queries

**What:** Apply styles based on parent container size, not viewport
**Why:** Components adapt to their context (sidebar vs full-width panel)
**Browser support:** Baseline 2023, 92% global ([Can I use](https://caniuse.com/css-container-queries))

```css
/* Define container context */
.panel {
  container-type: inline-size;
  container-name: panel;
}

/* Component adapts to container width */
@container panel (min-width: 400px) {
  .toolbar-button {
    flex-direction: row; /* Wide: icon + label */
    gap: 8px;
  }
}

@container panel (max-width: 399px) {
  .toolbar-button {
    flex-direction: column; /* Narrow: stacked */
    gap: 4px;
  }
}
```

**Use cases in v2.0:**
- Toolbar buttons collapse labels when in narrow sidebar
- Map settings panel adjusts slider layout when in narrow dialog
- Animation panel switches between grid/list based on available width

**Note:** Container *style* queries (query custom properties) are experimental, not ready for production. Use size queries only.

**Sources:**
- [MDN: CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
- [Container queries in 2026: Powerful, but not a silver bullet](https://blog.logrocket.com/container-queries-2026/)

#### CSS Logical Properties

**What:** Direction-agnostic properties (inline-start vs left, block-size vs height)
**Why:** Future-proof for RTL languages, semantic naming
**Browser support:** Modern browsers (since 2022)

```css
/* Physical properties (old) */
.panel {
  margin-left: 16px;
  padding-right: 8px;
  width: 200px;
  height: 100%;
}

/* Logical properties (new) */
.panel {
  margin-inline-start: 16px;  /* left in LTR, right in RTL */
  padding-inline-end: 8px;     /* right in LTR, left in RTL */
  inline-size: 200px;          /* width */
  block-size: 100%;            /* height */
}
```

**Recommendation for v2.0:** Use logical properties in new components. Not critical for migration (app is English-only), but establishes modern patterns.

**Sources:**
- [MDN: CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [CSS logical properties and values | CSS-Tricks](https://css-tricks.com/css-logical-properties-and-values/)

#### Focus Indicators (Accessibility)

**What:** Modern focus pseudo-classes for keyboard navigation
**Why:** WCAG 2.2 compliance, better UX for keyboard users

```css
/* Old approach: :focus (applies to mouse clicks too) */
button:focus {
  outline: 2px solid blue;
}

/* Modern approach: :focus-visible (keyboard only) */
button:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
}

/* Parent container styling when child focused */
.toolbar:has(:focus-visible) {
  border-color: var(--accent-500);
}
```

**WCAG 2.2 requirements:**
- Minimum contrast ratio: 3:1 for focus indicators
- Visible area: At least 2px thick or equivalent surface area
- Always visible during focus (no hover-only indicators)

**Sources:**
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [A guide to designing accessible, WCAG-conformant focus indicators](https://www.sarasoueidan.com/blog/focus-indicators/)
- [Focus or focus visible? A guide to make your focus state accessible](https://mayashavin.com/articles/focus-vs-focus-visible-for-accessibility)

### What NOT to Add

#### ❌ CSS Frameworks (Tailwind, Bootstrap, Pico)

**Why not:**
- Electron apps bundle everything → no CDN/download benefit
- Project already has custom component library
- Frameworks add unused CSS weight (Tailwind: 3MB dev, ~10-50KB prod after purge)
- Win98 → minimalist is style change, not capability gap

**Alternative:** Use native CSS features (layers, OKLCH, container queries)

#### ❌ CSS-in-JS Libraries (styled-components, emotion)

**Why not:**
- Adds runtime overhead (style injection on mount)
- Electron already has Chromium → no cross-browser CSS issues
- Existing .css files work perfectly
- Migration would require rewriting all components

**Alternative:** Keep .css modules, use CSS layers for organization

#### ❌ Design Token Tools (Style Dictionary, Token CSS)

**Why not:**
- Overkill for single-app project (not a design system shared across platforms)
- CSS custom properties already provide token functionality
- No build step needed for tokens

**Alternative:** Define tokens directly in CSS using `--custom-properties`

---

## 2. Settings Serialization (Map Description Field)

### Implementation: Pure String Formatting

**Approach:** TypeScript string template functions
**Confidence:** HIGH
**New dependencies:** None

#### SEdit Description Format

Based on SEdit source analysis (E:\AC-SEDIT-SRC-ANALYSIS), map description field stores:
```
Map Name
Author Name
Max Players: 16
Teams: 2
Objective: King of the Hill
Laser Damage: 3
...
```

**Implementation:**

```typescript
// src/core/map/DescriptionSerializer.ts

export function serializeSettings(header: MapHeader): string {
  const lines: string[] = [
    header.name || 'Untitled',
    `Author: ${header.author || 'Unknown'}`,  // NEW FIELD
    `Max Players: ${header.maxPlayers}`,
    `Teams: ${header.teams}`,
    `Objective: ${ObjectiveType[header.objective]}`,
    `Laser Damage: ${header.laserDamage}`,
    `Special Damage: ${header.specialDamage}`,
    // ... all settings fields
  ];
  return lines.join('\n');
}

export function deserializeSettings(description: string): Partial<MapHeader> {
  const lines = description.split('\n');
  const settings: Partial<MapHeader> = {};

  // Line 0: Map name
  settings.name = lines[0] || 'Untitled';

  // Parse key-value pairs
  for (const line of lines.slice(1)) {
    const match = line.match(/^(\w+(?:\s+\w+)*?):\s*(.+)$/);
    if (!match) continue;

    const [, key, value] = match;
    switch (key) {
      case 'Author':
        settings.author = value;
        break;
      case 'Max Players':
        settings.maxPlayers = parseInt(value, 10);
        break;
      // ... all settings fields
    }
  }

  return settings;
}
```

**Integration points:**
- `MapParser.parseV3()` - Call `deserializeSettings(header.description)` after reading header
- `MapSerializer.serialize()` - Call `serializeSettings(header)` before writing description field
- Maintains backward compatibility (existing maps without serialized settings parse name only)

**No libraries needed:**
- String manipulation: native JavaScript
- Regex parsing: native
- Type safety: TypeScript generics

**Sources:**
- Project documentation: E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md
- No external research needed (pure logic)

---

## 3. SEdit Map Parsing Parity

### Implementation: Enhanced MapParser Validation

**Approach:** Strict header field verification
**Confidence:** MEDIUM (depends on SEdit source analysis completeness)
**New dependencies:** None

#### Current Gaps (from typecheck output)

```
src/core/map/MapParser.ts(284,5): error TS2322: Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
  Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
```

**Root cause:** TypeScript 5.7+ stricter ArrayBuffer/SharedArrayBuffer type checking

**Fix:** Explicit type narrowing

```typescript
// Before (line 284)
tiles.buffer = decompressed.buffer; // ArrayBufferLike error

// After
tiles.buffer = decompressed.buffer as ArrayBuffer;

// OR (better): Specify generic type
const tiles = new Uint16Array<ArrayBuffer>(decompressed.buffer);
```

**Sources:**
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- [GitHub Issue #61480: AllowSharedBufferSource definition is incorrect](https://github.com/microsoft/TypeScript/issues/61480)
- [GitHub Issue #62240: Revert ts5.9 changes for Uint8Array](https://github.com/microsoft/TypeScript/issues/62240)

#### SEdit Header Verification

**Required validation (from SEdit spec):**
- Magic number: `0x4278`
- Version: 2 or 3 (reject others)
- Tile count: Exactly 65,536 after decompression
- Author field: New in v2.0 (add to MapHeader interface)

**New header field:**

```typescript
// src/core/map/types.ts
export interface MapHeader {
  // ... existing fields
  author?: string;  // NEW: Author name (optional for v1/v2 maps)
}
```

**Enhanced parsing:**

```typescript
// MapParser.parseV3()
private parseV3(buffer: ArrayBuffer, filePath?: string): ParseResult {
  // ... existing magic/version checks

  // Verify decompressed size BEFORE creating Uint16Array
  if (decompressed.byteLength !== TILE_COUNT * 2) {
    this.lastError = `Invalid tile data size: ${decompressed.byteLength} (expected ${TILE_COUNT * 2})`;
    return { success: false, error: this.lastError };
  }

  // ... parse header fields

  // NEW: Parse author from description or dedicated field (TBD from SEdit analysis)
  header.author = this.extractAuthor(header.description);

  return { success: true, data: { header, tiles, filePath, modified: false } };
}

private extractAuthor(description: string): string | undefined {
  const match = description.match(/^Author:\s*(.+)$/m);
  return match?.[1];
}
```

**Testing strategy:**
- Load SEdit-created maps (from E:\AC-SEDIT-SRC-ANALYSIS\sample-maps\ if available)
- Verify header fields match SEdit's display
- Round-trip test: save → load → verify identical

---

## 4. TypeScript Strict Mode Error Elimination

### Current Errors (from `npm run typecheck`)

```
src/core/map/MapParser.ts(11,3): error TS6133: 'MAP_WIDTH' is declared but its value is never read.
src/core/map/MapParser.ts(12,3): error TS6133: 'MAP_HEIGHT' is declared but its value is never read.
src/core/map/MapParser.ts(17,3): error TS6133: 'createEmptyMap' is declared but its value is never read.
src/core/map/MapParser.ts(192,11): error TS6133: 'compressedData' is declared but its value is never read.
src/core/map/MapParser.ts(284,5): error TS2322: Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
src/core/map/WallSystem.ts(162,62): error TS6133: 'addConnection' is declared but its value is never read.
```

**Error categories:**
1. **Unused imports (TS6133):** Remove or prefix with underscore
2. **Type incompatibility (TS2322):** Explicit type narrowing

### Fixes

#### Unused Imports/Variables

```typescript
// MapParser.ts
// Before
import {
  MAP_WIDTH,    // TS6133
  MAP_HEIGHT,   // TS6133
  createEmptyMap  // TS6133
} from './types';

// After (remove unused imports)
import {
  MapData,
  MapHeader,
  // MAP_WIDTH and MAP_HEIGHT removed (not needed)
  // createEmptyMap removed (not needed)
} from './types';

// OR (if needed for future use, signal intent)
import {
  MAP_WIDTH as _MAP_WIDTH,  // Prefixed with _ = "intentionally unused"
} from './types';
```

#### ArrayBuffer Type Issue

```typescript
// MapParser.ts line 284
// Before
const tiles = new Uint16Array(decompressed.buffer); // decompressed is Uint8Array
tiles.buffer = decompressed.buffer; // ERROR: ArrayBufferLike vs ArrayBuffer

// After
const tiles = new Uint16Array<ArrayBuffer>(decompressed.buffer);
// OR
const buffer: ArrayBuffer = decompressed.buffer as ArrayBuffer;
const tiles = new Uint16Array(buffer);
```

**Why this works:** TypeScript 5.7+ distinguishes ArrayBuffer from SharedArrayBuffer. Uint8Array.buffer returns `ArrayBufferLike` (union type). We know it's ArrayBuffer (not SharedArrayBuffer) in this context, so explicit cast is safe.

### Optional: ESLint for Ongoing Enforcement

**Recommendation:** Add ESLint with typescript-eslint
**Why:** Catches errors on save (editor integration), prevents regressions
**When:** Optional for v2.0, recommended for v2.1+

#### Installation

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

**Versions (current as of 2026-02-08):**
- eslint: ^9.x
- @typescript-eslint/parser: ^8.x
- @typescript-eslint/eslint-plugin: ^8.x

#### Configuration (.eslintrc.json)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/strict-type-checked"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

**Presets:**
- `recommended-type-checked` - Enables type-aware linting (requires type info)
- `strict-type-checked` - Stricter rules (no-explicit-any, no-unsafe-* rules)

**Benefits:**
- Editor integration (VS Code, Cursor) shows errors inline
- Catches unused variables, `any` types, type mismatches
- Auto-fix for many issues (unused imports, etc.)

**Package.json script:**

```json
"scripts": {
  "lint": "eslint src --ext .ts,.tsx",
  "lint:fix": "eslint src --ext .ts,.tsx --fix"
}
```

**Sources:**
- [typescript-eslint: no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any/)
- [typescript-eslint: Avoiding anys with Linting](https://typescript-eslint.io/blog/avoiding-anys/)
- [How to Configure TypeScript Strict Mode](https://oneuptime.com/blog/post/2026-01-24-typescript-strict-mode/view)

### Alternative: Incremental Strict Mode Plugin

**For large codebases with many errors:**

```bash
npm install -D typescript-strict-plugin
```

**Allows enabling strict mode per-file:**

```typescript
// @ts-strict-ignore  (at top of file)
// File excluded from strict checking

// No comment = strict mode enforced
```

**Verdict for v2.0:** Not needed (only 6 errors, all trivial fixes)

**Sources:**
- [npm: typescript-strict-plugin](https://www.npmjs.com/package/typescript-strict-plugin)
- [How to turn on TypeScript strict mode in specific files](https://blog.allegro.tech/2021/09/How-to-turn-on-TypeScript-strict-mode-in-specific-files.html)

---

## Recommended Stack Additions

| Tool | Version | Purpose | Install? |
|------|---------|---------|----------|
| **ESLint** | ^9.x | TypeScript error prevention | Optional |
| **@typescript-eslint/parser** | ^8.x | TypeScript parsing for ESLint | Optional |
| **@typescript-eslint/eslint-plugin** | ^8.x | TS-specific lint rules | Optional |

**All production features use native CSS/TypeScript capabilities.**

---

## Integration Summary

### CSS Migration Path

1. **Phase 1:** Add CSS layer structure to App.css
2. **Phase 2:** Define OKLCH color tokens in `@layer base`
3. **Phase 3:** Wrap existing win98-*.css in `@layer legacy`
4. **Phase 4:** Create new component styles in `@layer components`
5. **Phase 5:** Remove win98-*.css files when migration complete

**No breaking changes** - layers allow gradual migration

### TypeScript Fixes

1. **Quick fixes (5 min):**
   - Remove unused imports (MAP_WIDTH, MAP_HEIGHT, createEmptyMap, compressedData)
   - Remove unused parameter (addConnection)

2. **Type safety (10 min):**
   - Fix ArrayBuffer type narrowing (line 284)
   - Add `author?: string` to MapHeader interface

3. **Optional (30 min):**
   - Install ESLint + typescript-eslint
   - Configure strict-type-checked preset
   - Run `npm run lint:fix`

### Settings Serialization

1. **Create DescriptionSerializer.ts** (50 lines)
2. **Add `author` field to MapHeader** (1 line)
3. **Call serialize/deserialize in MapParser** (2 locations)
4. **Update MapSettingsDialog to edit author** (1 input field)

**Zero dependencies, pure logic.**

---

## Performance Considerations

### CSS

**OKLCH vs RGB:**
- Parsing performance: Identical (both native browser color parsing)
- Render performance: Identical (converted to device color space anyway)
- File size: Slightly larger (`oklch(60% 0.15 220)` vs `#4080ff`), negligible impact

**Container queries:**
- Performance: Minimal overhead (similar to media queries)
- Layout recalc: Only when container size changes (same as existing resize logic)

**Cascade layers:**
- Zero runtime cost (resolved at stylesheet parse time)
- Specificity calculation is simpler (layer precedence beats specificity)

### TypeScript

**Generic Uint16Array types:**
- Zero runtime cost (types erased in compilation)
- Build time: Negligible increase (type checking already enabled)

---

## Testing Strategy

### CSS Visual Regression

**Manual testing required** (no automated CSS testing in current stack)

**Test scenarios:**
1. Load existing map → verify no visual changes (legacy layer active)
2. Toggle to modern theme → verify minimalist appearance
3. Resize panels → verify container queries adapt components
4. Tab through UI → verify :focus-visible indicators visible

**Browser:** Electron uses Chromium → only test in app, no cross-browser needed

### TypeScript Type Safety

**Verification:**
```bash
npm run typecheck  # Should have 0 errors after fixes
```

**Test cases:**
1. Load v1 map (raw 131072 bytes) → verify parses without error
2. Load v2/v3 map → verify header fields populated
3. Save map → verify description serializes settings
4. Round-trip test: load → modify → save → reload → verify identical

### Settings Serialization

**Unit tests (optional):**

```typescript
import { serializeSettings, deserializeSettings } from './DescriptionSerializer';

describe('DescriptionSerializer', () => {
  it('round-trips all header fields', () => {
    const header: MapHeader = {
      name: 'Test Map',
      author: 'Jane Doe',
      maxPlayers: 16,
      teams: 2,
      // ... all fields
    };

    const serialized = serializeSettings(header);
    const deserialized = deserializeSettings(serialized);

    expect(deserialized.name).toBe('Test Map');
    expect(deserialized.author).toBe('Jane Doe');
    expect(deserialized.maxPlayers).toBe(16);
  });
});
```

**No test framework currently installed.** Add Vitest if needed:

```bash
npm install -D vitest
```

**Recommendation:** Manual testing sufficient for v2.0 (serialization logic is straightforward)

---

## What NOT to Add

### ❌ PostCSS / CSS Preprocessors (SASS, LESS)

**Why not:**
- Modern CSS (layers, OKLCH, container queries, custom properties) provides all needed features
- Vite supports native CSS out of box
- No build step complexity needed
- Existing .css files work perfectly

### ❌ CSS Minification Tools

**Why not:**
- Electron bundles all assets locally (no network download size concern)
- Vite already minifies in production build
- Chromium caches parsed stylesheets

### ❌ Zod / io-ts (Runtime Type Validation)

**Why not:**
- Map format is binary (DataView parsing), not JSON
- Validation already exists (magic number, version checks, tile count)
- No untrusted external input (users load their own map files)

**Alternative:** Existing MapParser validation + TypeScript compile-time types

### ❌ Prettier (Code Formatting)

**Why not:**
- Not a capability gap (code style is subjective)
- Adding formatter mid-project creates large diffs
- TypeScript + ESLint provide functional correctness

**If added later:** Separate PR, entire codebase reformatted at once

---

## Confidence Assessment

| Component | Confidence | Reasoning |
|-----------|-----------|-----------|
| CSS layers | HIGH | Baseline browser support (2022+), native Chromium feature |
| OKLCH colors | HIGH | 93% browser support, Chromium fully supports |
| Container queries | HIGH | Baseline 2023, widely used in production |
| Settings serialization | HIGH | Pure string logic, no external dependencies |
| TypeScript fixes | MEDIUM-HIGH | ArrayBuffer fix well-documented, unused imports trivial |
| SEdit parsing parity | MEDIUM | Depends on completeness of SEdit source analysis docs |

**Overall confidence: HIGH** - All features use proven, well-supported browser capabilities. No experimental features. TypeScript issues are all trivial fixes.

---

## Recommendations for Roadmap

### Critical Path (Must Do)

1. **Fix TypeScript errors** (30 min)
   - Blocks: Clean typecheck output
   - Risk: Low (trivial fixes)

2. **Define CSS layer structure** (1 hr)
   - Blocks: Modern CSS architecture
   - Risk: Low (wrap existing CSS in @layer legacy as fallback)

3. **Create OKLCH color tokens** (2 hrs)
   - Blocks: Minimalist theme
   - Risk: Low (convert existing colors, test visually)

4. **Implement settings serialization** (3 hrs)
   - Blocks: Map format parity
   - Risk: Low (pure logic, testable)

### Nice to Have (Defer to Later Phases)

5. **Container queries** - Use for responsive components as built
6. **ESLint setup** - Prevent future TypeScript regressions
7. **Logical properties** - Modernize CSS, no functional change

### Low Priority (Optional)

8. **Focus indicators audit** - Accessibility improvement (WCAG 2.2)
9. **CSS migration to logical properties** - Future-proofing (no RTL need currently)

---

## Migration Risks

### Low Risk

- **CSS layers:** Can wrap existing CSS in `@layer legacy`, add new `@layer modern`, remove legacy when ready
- **OKLCH colors:** Chromium fully supports, can test incrementally per component
- **TypeScript fixes:** Isolated changes, type errors are compile-time (no runtime risk)

### Medium Risk

- **Settings serialization format:** Must match SEdit exactly for compatibility
  - **Mitigation:** Load SEdit maps, compare parsed fields, iterate until match
  - **Fallback:** If format differs, keep separate "AC Map Editor" format, don't claim SEdit parity

### Negligible Risk

- **Container queries:** Progressive enhancement (components work without them, just not responsive)
- **ESLint:** Dev-only tool, zero runtime impact

---

## Summary

**Stack verdict:** No production dependencies needed. All v2.0 features implementable with:
- Native CSS (layers, OKLCH, container queries, logical properties)
- TypeScript 5.7 (with minor fixes for strict mode)
- Existing Electron/React/Vite stack

**Optional additions:**
- ESLint + typescript-eslint (dev-only, recommended for ongoing type safety)

**Key architectural decisions:**
- ✅ CSS layers for style organization (replace Win98 two-tier system)
- ✅ OKLCH for perceptually uniform colors
- ✅ Container queries for component-based responsiveness
- ✅ Pure TypeScript for settings serialization (no library needed)
- ✅ Explicit type narrowing for ArrayBuffer (TypeScript 5.7+ strictness)

**No technical blockers.** All capabilities exist in current browser engines and TypeScript tooling. Proceed to roadmap with confidence.

---

## Sources

### CSS
- [The Modern CSS Toolkit: What Actually Matters in 2026](https://www.nickpaolini.com/blog/modern-css-toolkit-2026)
- [MDN: @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer)
- [Smashing Magazine: CSS Cascade Layers](https://www.smashingmagazine.com/2022/01/introduction-css-cascade-layers/)
- [Can I use: CSS Cascade Layers](https://caniuse.com/css-cascade-layers)
- [MDN: oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch)
- [OKLCH in CSS: Why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [The Ultimate OKLCH Guide](https://oklch.org/posts/ultimate-oklch-guide)
- [MDN: CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
- [Can I use: CSS Container Queries (Size)](https://caniuse.com/css-container-queries)
- [Container queries in 2026: Powerful, but not a silver bullet](https://blog.logrocket.com/container-queries-2026/)
- [MDN: CSS logical properties and values](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [A guide to designing accessible, WCAG-conformant focus indicators](https://www.sarasoueidan.com/blog/focus-indicators/)

### TypeScript
- [TypeScript Documentation: TypeScript 5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- [GitHub: TypeScript Issue #61480 - AllowSharedBufferSource definition](https://github.com/microsoft/TypeScript/issues/61480)
- [GitHub: TypeScript Issue #62240 - Revert ts5.9 Uint8Array changes](https://github.com/microsoft/TypeScript/issues/62240)
- [typescript-eslint: no-explicit-any](https://typescript-eslint.io/rules/no-explicit-any/)
- [typescript-eslint: Avoiding anys with Linting](https://typescript-eslint.io/blog/avoiding-anys/)
- [How to Configure TypeScript Strict Mode](https://oneuptime.com/blog/post/2026-01-24-typescript-strict-mode/view)
- [npm: typescript-strict-plugin](https://www.npmjs.com/package/typescript-strict-plugin)

### Design Systems
- [Tailwind CSS Best Practices 2025-2026: Design Tokens](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)
- [Token CSS](https://tokencss.com/)
- [The developer's guide to design tokens and CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)

### Electron
- [Electron Performance Best Practices](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron Desktop App Development Guide for Business in 2026](https://www.forasoft.com/blog/article/electron-desktop-app-development-guide-for-business)
