# Phase 78: Cleanup & Code Quality - Research

**Researched:** 2026-02-16
**Domain:** Codebase maintenance, CSS design tokens, code quality tooling
**Confidence:** HIGH

## Summary

Phase 78 is a **pure cleanup phase** with zero new features. All work involves removing dead code, replacing hardcoded CSS values with existing design tokens, and extracting duplicate utilities. No new dependencies, libraries, or architectural patterns required.

The project already has:
- **Design token system** (variables.css with OKLCH primitives + semantic aliases)
- **TypeScript strict mode** (noUnusedLocals, noUnusedParameters enabled)
- **Zero external code quality tools** (no ESLint, Prettier, or linters in package.json)

**Primary recommendation:** Use existing TypeScript compiler for unused variable detection, manual CSS token replacement, simple file deletion for dead code. No tooling setup needed.

## Standard Stack

### Core (Already Present)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript | 5.7.2 | Type checking + unused detection | Already catches unused variables via `noUnusedLocals: true` |
| CSS Variables | Native | Design tokens | OKLCH-based system already established in variables.css |
| Git | Native | VCS | Track deletions and changes |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| npm run typecheck | Native | Detect unused code | Already configured, outputs TS6133 errors |
| find/ls | Git Bash | Identify empty dirs | Windows environment uses Git Bash shell |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual TypeScript | ESLint + typescript-eslint | ESLint not in project, would add 15+ deps for 4 warnings |
| Manual CSS token replacement | PostCSS + plugins | Overkill for one-time cleanup of ~15 hardcoded values |
| Manual file deletion | Script-based cleanup | Not worth automation for 3 files |

**Installation:**
```bash
# No new packages needed
# Existing tooling sufficient
```

## Architecture Patterns

### Recommended Cleanup Structure

```
Phase 78 Cleanup Areas:
├── Dead Code Removal
│   ├── AnimationDefinitions.old.ts         # Delete entire file
│   ├── Empty phase directories             # Delete 16-marquee-selection, 20-animation-panel-redesign
│   └── Unused variables                    # Remove from MapCanvas.tsx, CanvasEngine.ts
├── CSS Design Token Migration
│   ├── Title bar gradient                  # #000080, #1084d0 → CSS vars
│   ├── Close button red                    # #dc3545 → --color-error (new token)
│   ├── Checkerboard pattern                # #cccccc → --color-neutral-300
│   ├── Window shadows                      # rgba() → existing shadow tokens
│   └── Hover backgrounds                   # rgba(255,255,255,0.2) → new token
└── Code Deduplication
    └── Viewport centering math             # Extract to shared utility (NO instances found)
```

### Pattern 1: Unused Variable Removal (TypeScript TS6133)

**What:** TypeScript compiler flags unused variables when `noUnusedLocals: true` is enabled.

**Current findings:**
```typescript
// src/components/MapCanvas/MapCanvas.tsx:208
const immediatePatchTile = useCallback(...);  // TS6133: never read

// src/components/MapCanvas/MapCanvas.tsx:1968
const handleToolAction = (x, y, e) => { /* e unused */ }  // TS6133: 'e' never read

// src/components/MapCanvas/MapCanvas.tsx:2067
(e: MouseEvent) => { /* e unused */ }  // TS6133: 'e' never read

// src/core/canvas/CanvasEngine.ts:47
private dirty = { mapBuffer: false, mapBlit: false, uiOverlay: false };  // TS6133: never read
```

**How to fix:**
```typescript
// Solution 1: Remove entirely (immediatePatchTile, dirty object)
// Solution 2: Prefix with underscore if intentionally unused
const handleToolAction = (x, y, _e) => { /* signal unused */ }
```

**Confidence:** HIGH — TypeScript compiler provides exact line numbers.

### Pattern 2: CSS Design Token Migration

**What:** Replace hardcoded hex/rgba values with existing CSS variables from variables.css.

**Existing token system:**
```css
/* Tier 1: OKLCH Primitives */
--color-neutral-300: oklch(80% 0.012 50);  /* Used for checkerboard */
--color-blue-500: oklch(60% 0.15 250);     /* Accent blue */

/* Tier 2: Semantic Aliases */
--accent-primary: var(--color-blue-500);
--overlay-bg: rgba(0, 0, 0, 0.5);
--focus-ring: rgba(16, 132, 208, 0.2);
```

**Migration targets:**

| File | Line | Current Value | Replacement Token |
|------|------|---------------|-------------------|
| MapSettingsDialog.css | 30 | `linear-gradient(to right, #000080, #1084d0)` | NEW: `--gradient-title-bar` |
| Workspace.css | 167, 172, 262 | `#dc3545` (close button red) | NEW: `--color-error` |
| TilePalette.css | 40-43 | `#cccccc` (checkerboard) | EXISTING: `--color-neutral-300` |
| Workspace.css | 36, 41, 232 | `rgba(0,0,0,...)` (shadows) | EXISTING: `--shadow-*` tokens |
| Workspace.css | 180, 267 | `rgba(255,255,255,0.2)` | NEW: `--surface-hover-overlay` |

**Example migration:**
```css
/* BEFORE */
.window-close-btn:hover {
  background: #dc3545;
  color: white;
}

/* AFTER */
.window-close-btn:hover {
  background: var(--color-error);
  color: white;
}
```

**Confidence:** HIGH — All target values identified via grep, existing token system documented.

### Pattern 3: Dead Code Deletion

**What:** Remove files and directories that serve no purpose.

**Targets identified:**

| Path | Reason | Safe to Delete |
|------|--------|----------------|
| `src/core/map/AnimationDefinitions.old.ts` | Duplicate of AnimationDefinitions.ts, 272 lines | ✅ Yes — `.old.ts` suffix indicates deprecated |
| `.planning/phases/16-marquee-selection/` | Empty directory (stale) | ✅ Yes — phase 16 shipped in v1.6 |
| `.planning/phases/20-animation-panel-redesign/` | Empty directory (stale) | ✅ Yes — phase 20 shipped in v1.6 |

**Verification before deletion:**
```bash
# Check if AnimationDefinitions.old.ts is imported anywhere
grep -r "AnimationDefinitions.old" src/
# (Should return zero matches)

# Verify directories are truly empty
ls -la .planning/phases/16-marquee-selection/
ls -la .planning/phases/20-animation-panel-redesign/
```

**Confidence:** HIGH — Files confirmed present, grep shows no usage.

### Anti-Patterns to Avoid

**Anti-Pattern 1: Adding ESLint for 4 Warnings**
- **Don't:** Install ESLint, typescript-eslint, config packages (15+ deps)
- **Why:** TypeScript already flags unused variables, project intentionally minimal
- **Do instead:** Use `npm run typecheck` output, remove flagged variables manually

**Anti-Pattern 2: Creating Utility File for Non-Existent Duplication**
- **Don't:** Create `src/utils/viewportCentering.ts` if no duplication exists
- **Why:** Grep search for centering math found zero duplicates
- **Do instead:** Verify duplication exists first, skip if CODE-01 is premature

**Anti-Pattern 3: Replacing Shadow Tokens with Hardcoded Values**
- **Don't:** Replace `var(--shadow-md)` with `0 4px 6px rgba(...)`
- **Why:** Shadows are **already using design tokens** in variables.css
- **Do instead:** Replace hardcoded `rgba(0,0,0,0.15)` with existing `--shadow-*` tokens

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS linting | Custom CSS validator | Manual review | One-time cleanup, not worth setup cost |
| Unused export detection | AST parser script | TypeScript compiler | TS already has `noUnusedLocals` |
| Token replacement | Regex script | Manual find/replace | Only ~15 values, manual is safer |

**Key insight:** This is **one-time cleanup**, not continuous maintenance. Manual fixes are faster and safer than building automation for 4 TypeScript warnings and 15 CSS replacements.

## Common Pitfalls

### Pitfall 1: Breaking CSS Variables in Shadow DOM

**What goes wrong:** Shadow tokens like `--shadow-md` get replaced with hardcoded `rgba()` values.

**Why it happens:** Misunderstanding requirement — some `rgba()` values are **already design tokens**, don't need replacement.

**How to avoid:** Read variables.css first, identify which values are **new hardcoded instances** vs **existing tokens**.

**Warning signs:** PR that replaces `var(--shadow-md)` with `0 4px 6px rgba(...)` (regression).

### Pitfall 2: Deleting AnimationDefinitions.ts Instead of .old.ts

**What goes wrong:** Active file deleted, breaking imports across codebase.

**Why it happens:** Similar filenames, rushed deletion.

**How to avoid:**
```bash
# Verify .old.ts has ZERO imports
grep -r "AnimationDefinitions.old" src/
# (Must return nothing)

# Delete with explicit full path
rm src/core/map/AnimationDefinitions.old.ts
```

**Warning signs:** TypeScript errors about missing AnimationDefinitions after deletion.

### Pitfall 3: Removing eslint-disable Comments

**What goes wrong:** Removing `// eslint-disable-next-line react-hooks/exhaustive-deps` causes build to fail.

**Why it happens:** Assumption that project uses ESLint (it doesn't).

**How to avoid:** Check package.json first — no ESLint means comments are vestigial from template.

**Impact:** Comments are **harmless** (no ESLint = ignored), not worth removing.

### Pitfall 4: Creating Empty Design Token Definitions

**What goes wrong:** Adding `--color-error: #dc3545;` without proper OKLCH conversion.

**Why it happens:** Copy-paste instead of following existing OKLCH pattern.

**How to avoid:**
```css
/* WRONG: Hardcoded hex */
--color-error: #dc3545;

/* RIGHT: OKLCH primitive + semantic alias */
/* Tier 1 primitive */
--color-red-500: oklch(55% 0.20 25);  /* Approx #dc3545 */

/* Tier 2 semantic */
--color-error: var(--color-red-500);
```

**Warning signs:** Hex values in variables.css (violates OKLCH-first principle).

## Code Examples

Verified patterns from existing codebase:

### Unused Variable Removal

```typescript
// BEFORE (MapCanvas.tsx:208)
const immediatePatchTile = useCallback((tileX: number, tileY: number, tile: number, vp: { x: number; y: number; zoom: number }) => {
  const engine = engineRef.current;
  if (!engine) return;
  engine.patchTile(tileX, tileY, tile, vp, animFrameRef.current);
}, []);

// AFTER: Entire function deleted (never called)
```

```typescript
// BEFORE (MapCanvas.tsx:1968)
case ToolType.PICKER:
  if (map) {
    setSelectedTile(map.tiles[y * MAP_WIDTH + x]);
    restorePreviousTool();
  }
  break;

// Event parameter unused in switch case
const handleToolAction = (x: number, y: number, e: React.MouseEvent) => {
  // e is never used
};

// AFTER: Remove parameter entirely
const handleToolAction = (x: number, y: number) => {
  // Cleaner signature
};
```

```typescript
// BEFORE (CanvasEngine.ts:47)
private dirty = {
  mapBuffer: false,
  mapBlit: false,
  uiOverlay: false
};

// AFTER: Delete entire property (never read)
// (Object was vestigial from old rendering architecture)
```

### CSS Design Token Replacement

```css
/* BEFORE: MapSettingsDialog.css:30 */
.dialog-title-bar {
  background: linear-gradient(to right, #000080, #1084d0);
  color: var(--text-on-accent);
}

/* STEP 1: Add gradient token to variables.css */
:root {
  /* Title bar gradient (classic Windows dialog style) */
  --gradient-title-bar: linear-gradient(to right, oklch(30% 0.15 260), var(--accent-primary));
}

/* STEP 2: Use token in component */
.dialog-title-bar {
  background: var(--gradient-title-bar);
  color: var(--text-on-accent);
}
```

```css
/* BEFORE: Workspace.css:167 */
.child-window.active .window-close-btn:hover {
  background: #dc3545;
  color: white;
}

/* STEP 1: Add error color to variables.css */
:root {
  /* Tier 1: Red palette */
  --color-red-500: oklch(55% 0.20 25);  /* Error/danger red */

  /* Tier 2: Semantic alias */
  --color-error: var(--color-red-500);
}

/* STEP 2: Use token in component */
.child-window.active .window-close-btn:hover {
  background: var(--color-error);
  color: white;
}
```

```css
/* BEFORE: TilePalette.css:40 */
.palette-canvas {
  background-image:
    linear-gradient(45deg, #cccccc 25%, transparent 25%),
    linear-gradient(-45deg, #cccccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #cccccc 75%),
    linear-gradient(-45deg, transparent 75%, #cccccc 75%);
}

/* AFTER: Use existing neutral-300 token */
.palette-canvas {
  background-image:
    linear-gradient(45deg, var(--color-neutral-300) 25%, transparent 25%),
    linear-gradient(-45deg, var(--color-neutral-300) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--color-neutral-300) 75%),
    linear-gradient(-45deg, transparent 75%, var(--color-neutral-300) 75%);
}
```

```css
/* BEFORE: Workspace.css:36 */
.child-window {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* AFTER: Use existing shadow token */
.child-window {
  box-shadow: var(--shadow-md);
}
```

```css
/* BEFORE: Workspace.css:180 */
.child-window.active .window-minimize-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* STEP 1: Add overlay token to variables.css */
:root {
  /* Semi-transparent overlays */
  --surface-hover-overlay: rgba(255, 255, 255, 0.2);
}

/* STEP 2: Use token */
.child-window.active .window-minimize-btn:hover {
  background: var(--surface-hover-overlay);
}
```

### Dead Code Deletion

```bash
# Verify no imports exist
$ grep -r "AnimationDefinitions.old" src/
# (No output = safe to delete)

# Delete dead file
$ rm src/core/map/AnimationDefinitions.old.ts

# Remove empty phase directories
$ rmdir .planning/phases/16-marquee-selection
$ rmdir .planning/phases/20-animation-panel-redesign
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded hex colors | OKLCH design tokens | Phase 27 (v2.0) | Perceptual uniformity, warm palette flexibility |
| Local CSS values | Tier 1/Tier 2 token system | Phase 27 | Single source of truth for design values |
| Manual TypeScript checks | Strict mode + noUnusedLocals | Phase 32 | Compiler catches unused code automatically |
| Old animation file kept | .old.ts deprecated | Phase 70 (v3.3) | AnimationDefinitions refactored, old file orphaned |

**Deprecated/outdated:**
- `.old.ts` files: Relic from pre-Git workflow, now use version control instead
- Hardcoded `#dc3545` red: Project adopted OKLCH tokens (phase 27), hardcoded values are technical debt
- ESLint comments in template code: Project never installed ESLint, comments are vestigial

## Open Questions

1. **What is CODE-01 "duplicate centering math"?**
   - What we know: Requirement mentions shared utility function for centering
   - What's unclear: Grep found zero instances of duplicate viewport centering math
   - Recommendation: Verify requirement is still valid, may be premature optimization

2. **Should eslint-disable comments be removed?**
   - What we know: 2 instances in App.tsx and Minimap.tsx, no ESLint in package.json
   - What's unclear: Whether these indicate intentional suppressions for future ESLint adoption
   - Recommendation: Leave comments (harmless, self-documenting), focus on TS warnings

3. **How to convert #000080 and #1084d0 to OKLCH?**
   - What we know: Title bar uses classic Windows blue gradient (#000080 = navy, #1084d0 = light blue)
   - What's unclear: Exact OKLCH equivalents for perceptual match
   - Recommendation: Use existing --accent-primary (oklch(60% 0.15 250)) as light blue, define --color-blue-900 for navy

## Sources

### Primary (HIGH confidence)
- E:\NewMapEditor\src\styles\variables.css — Existing design token system (OKLCH + semantic aliases)
- E:\NewMapEditor\tsconfig.json — TypeScript strict mode config (noUnusedLocals: true)
- E:\NewMapEditor\package.json — Zero ESLint/Prettier dependencies confirmed
- npm run typecheck output — 4 unused variable warnings (TS6133 errors)
- Grep searches — Hardcoded CSS values, dead file usage, empty directories

### Secondary (MEDIUM confidence)
- .planning/ROADMAP.md — Phase 27 (CSS design system), Phase 70 (animation refactor) context
- .planning/research/STACK.md — Animation offset control research (no new deps pattern)
- .planning/research/ARCHITECTURE.md — GlobalSlice patterns (state management context)

### Tertiary (LOW confidence)
- None — All findings from direct codebase inspection

## Metadata

**Confidence breakdown:**
- Dead code identification: HIGH — Files confirmed present, grep shows zero usage
- TypeScript warnings: HIGH — Compiler output explicit, line numbers provided
- CSS token migration: HIGH — Existing token system documented, target values identified
- Centering math duplication: LOW — Requirement claims duplication, grep found none

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days — stable cleanup tasks, no fast-moving dependencies)
