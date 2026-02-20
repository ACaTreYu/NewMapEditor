# Phase 91: Overlay Z-Order & Minimap Size - Research

**Researched:** 2026-02-20
**Domain:** CSS z-index stacking contexts, Canvas API sizing
**Confidence:** HIGH

## Summary

Phase 91 is a pure CSS and single-constant change. Two requirements: (1) minimap and game object tool panel must not be covered by maximized MDI windows; (2) minimap canvas must render at 160x160 instead of 128x128. No new libraries, no state changes, no IPC changes.

The root cause of the z-index bug is clear from code inspection. MDI child windows (React-Rnd elements) live inside `.workspace` (a `position: relative` element with no z-index, so it does NOT form its own stacking context). Their inline `style={{ zIndex: windowState.zIndex }}` values (starting at `BASE_Z_INDEX = 1000`) therefore participate in `.main-area`'s stacking context. The minimap (`.minimap`, `z-index: 100`) and game object tool panel (`.game-object-tool-panel`, `z-index: 100`) are siblings of `.workspace` inside `.main-area`. Since 100 < 1000, MDI windows cover the overlays when maximized. The fix is to raise the overlay z-indexes above the MDI ceiling.

The minimap size change is isolated to `MINIMAP_SIZE = 128` in `Minimap.tsx`. This constant drives both the `<canvas>` element's `width`/`height` attributes AND all rendering math (farplane cache, image data buffers, viewport rectangle, checkerboard). The SCALE constant `MINIMAP_SIZE / MAP_WIDTH` will update automatically when `MINIMAP_SIZE` changes. The farplane pixel cache is built at `MINIMAP_SIZE x MINIMAP_SIZE`, so it too recomputes correctly on next mount. No additional rendering code needs changing.

**Primary recommendation:** Set minimap and game-object-tool-panel `z-index` to a value above the MDI window ceiling (e.g., 10000), document the z-index budget in a CSS comment, and change `MINIMAP_SIZE` from 128 to 160 in `Minimap.tsx`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS (native) | — | z-index stacking, layout | No library needed for z-index changes |
| Canvas API (native) | — | Minimap rendering | Already used; no change to approach |

### Supporting
None required. This phase has no new dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raising overlay z-indexes | Give `.workspace` its own stacking context via `isolation: isolate` | Isolation approach contains MDI z-indexes inside workspace but requires verifying it doesn't break existing behavior (Rnd positioning, overflow clipping). Direct z-index raise is simpler and more explicit. |

**Installation:** No new packages.

## Architecture Patterns

### DOM Stacking Context Structure (current)

```
.main-area  (position: relative — forms stacking context)
  .workspace  (position: relative, NO z-index — does NOT form own stacking context)
    [Rnd div]  (zIndex: 1000–100000, position: absolute)
      .child-window
    [Rnd div]  (zIndex: 1001, position: absolute)
      .child-window
  .minimap  (position: absolute, z-index: 100)  ← COVERED by MDI windows
  .game-object-tool-panel  (position: absolute, z-index: 100)  ← COVERED
```

Because `.workspace` has no z-index, its children (the Rnd elements) participate directly in `.main-area`'s stacking context. The overlay elements share the same stacking context but at z-index 100, well below the MDI floor of 1000.

### Pattern 1: Overlay Z-Index Above MDI Ceiling

**What:** Set overlay z-indexes to a value guaranteed to exceed any MDI window z-index.

**When to use:** Always — overlays that must stay above draggable/resizable floating windows.

**Current MDI z-index range (from `windowSlice.ts`):**
- `BASE_Z_INDEX = 1000` (first window)
- `Z_INDEX_NORMALIZE_THRESHOLD = 100000` (normalization kicks in here)
- Trace image windows: `TRACE_BASE_Z_INDEX = 5000`

The normalization threshold is 100,000. After normalization, the highest window gets z-index back near 1000. So overlays at `z-index: 10000` would survive normalization events too... **but only if we account for the window count**. With many open windows, zIndex increments could temporarily exceed 10000. The safe ceiling is `Z_INDEX_NORMALIZE_THRESHOLD - 1 = 99999`, so overlays should be at or above 100000. However, the threshold is the trigger to normalize back down to 1000-range. So any value above the current `nextZIndex` would work at a given instant, but after many window operations without normalization, the MDI z-index could approach 100000.

**Recommended overlay z-index: 200000** — above `Z_INDEX_NORMALIZE_THRESHOLD` (100000), and matching the existing tooltip/dropdown pattern in ToolBar.css which already uses `z-index: 200000`. This is consistent with the existing pattern in the codebase.

**Evidence from ToolBar.css (lines 113, 182):**
```css
/* z-index: 200000 is already used for toolbar dropdowns */
z-index: 200000;
```

Using 200000 for overlays matches the existing codebase convention.

### Pattern 2: Minimap Size Constant

**What:** Single constant `MINIMAP_SIZE = 128` in `Minimap.tsx` drives all rendering math.

**How it works:**
- `SCALE = MINIMAP_SIZE / MAP_WIDTH` — recalculates automatically
- `canvas width={MINIMAP_SIZE} height={MINIMAP_SIZE}` — sets canvas pixel dimensions
- `createImageData(MINIMAP_SIZE, MINIMAP_SIZE)` — image buffer sized to canvas
- `farplaneImage` is scaled to `MINIMAP_SIZE x MINIMAP_SIZE` in cache build

Changing `MINIMAP_SIZE` to 160 affects all of the above correctly without any additional code changes. The rendering loops iterate over `MAP_HEIGHT/MAP_WIDTH` (always 256x256), then place pixels at `Math.floor(x/2)` / `Math.floor(y/2)`. At 128, the scale is 0.5 px/tile; at 160, scale = 160/256 = 0.625 px/tile.

**One consideration:** The pixel-placement loop uses `if (x % 2 === 0 && y % 2 === 0)` — i.e., every other tile. This hard-codes a 2x subsampling regardless of MINIMAP_SIZE. This means at 160x160, only 128x128 pixels will be filled (the bottom-right corner of the canvas will be blank). This is a **pre-existing rendering bug that exists independent of this phase**. At MINIMAP_SIZE=128, it exactly fills the canvas. At MINIMAP_SIZE=160, 32px of bottom and right edge would be unfilled.

The fix for this secondary issue: update the loop to use the actual SCALE factor rather than hardcoded `% 2`. But this is a new behavior change. The phase description says "minimap renders at 160x160" — so the rendering must actually fill the canvas. The planner should include fixing the subsampling logic.

**Correct rendering approach for 160x160:**
```typescript
// Instead of: if (x % 2 === 0 && y % 2 === 0)
// Use: place pixel at floor(x * SCALE), floor(y * SCALE)
const px = Math.floor(x * SCALE);
const py = Math.floor(y * SCALE);
// Skip if same px,py as previous tile (multiple source tiles map to same minimap pixel)
```

Or equivalently, iterate over minimap pixels and map back to tiles:
```typescript
for (let py = 0; py < MINIMAP_SIZE; py++) {
  for (let px = 0; px < MINIMAP_SIZE; px++) {
    const tx = Math.floor(px / SCALE);
    const ty = Math.floor(py / SCALE);
    // look up tile at (tx, ty)
  }
}
```

The second approach (iterate minimap pixels, map to tiles) is cleaner for arbitrary SCALE values.

### Pattern 3: Z-Index Budget Documentation

**What:** CSS comment block documenting all z-index values to prevent future conflicts.

**Best practice:** Single place in CSS (typically global CSS or a dedicated z-index layer comment) that lists all z-index values in use.

**Recommended location:** At the top of `App.css` or as a comment header in `Minimap.css` and `GameObjectToolPanel.css`.

**Example format:**
```css
/*
 * Z-INDEX BUDGET
 * ==============
 * 1–999:    Document-internal stacking (dialogs, dropdowns within components)
 * 1000–99999: MDI child windows (windowSlice.ts BASE_Z_INDEX=1000, normalized at 100000)
 * 5000–99999: Trace image windows (TRACE_BASE_Z_INDEX=5000)
 * 200000:   Always-on-top overlays (minimap, game object tool panel, toolbar dropdowns)
 *
 * Rule: Never use z-index between 100000 and 199999 (reserved gap).
 */
```

### Anti-Patterns to Avoid
- **Using `z-index: 99999`:** Below the MDI normalization threshold (100000), so MDI windows could still cover overlays before normalization fires.
- **Adding `z-index` to `.workspace`:** This would create a new stacking context, containing all MDI windows within it, but could break Rnd positioning behavior or clip shadows/tooltips. More invasive than a simple overlay z-index raise.
- **Making the farplane cache rebuild independent of MINIMAP_SIZE:** It already rebuilds correctly because the effect depends on `farplaneImage` identity, not a size check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stacking context isolation | Custom portal system for overlays | CSS z-index with documented budget | Portal approach requires React Portal and DOM restructuring; CSS z-index is sufficient |
| Minimap rendering at arbitrary scale | Custom scaling algorithm | Iterate minimap pixels, map back to tile coords | Simple, correct for any SCALE value |

## Common Pitfalls

### Pitfall 1: Subsampling Loop Not Updated for 160px
**What goes wrong:** `MINIMAP_SIZE` changes to 160 but the `if (x % 2 === 0 && y % 2 === 0)` loop guard still skips every other tile. Result: only 128x128 pixels written, 32px right/bottom margins empty.
**Why it happens:** The loop guard was written specifically for 128px (0.5 scale = every 2nd tile). It doesn't generalize.
**How to avoid:** Replace the `% 2` guard with the inverse-SCALE approach: iterate minimap pixels, map to tile coords.
**Warning signs:** Visible empty right/bottom edge on minimap after size change.

### Pitfall 2: Farplane Cache Built at Old Size
**What goes wrong:** Farplane pixel cache is built at `MINIMAP_SIZE x MINIMAP_SIZE`. If `MINIMAP_SIZE` changes in code but the cache was built at the old size, the rendering reads wrong pixel offsets.
**Why it happens:** The cache is built in a `useEffect` keyed on `farplaneImage` identity. It rebuilds on next mount or when farplane changes. So after hot-reload or app restart, it builds at the new size automatically.
**How to avoid:** No action needed — the cache rebuilds automatically. But note that in a hot-reload scenario, if `MINIMAP_SIZE` changes at runtime, the old cache may briefly be wrong until the effect re-fires. Not a production concern.

### Pitfall 3: Z-Index 10000 Not Sufficient After Many Window Raises
**What goes wrong:** Using `z-index: 10000` for overlays. If a user raises windows many times without triggering the 100,000 normalization threshold, windows could reach z-index 10001+ and cover the overlay.
**Why it happens:** `nextZIndex` increments by 1 on each raise/maximize. After 9000 operations from the base of 1000, windows reach 10000.
**How to avoid:** Use `z-index: 200000` (above the normalization ceiling of 100,000), matching the existing toolbar dropdown pattern.

### Pitfall 4: `.workspace` Overflow Clip Does Not Prevent Z-Index Bleed
**What goes wrong:** Thinking `overflow: hidden` on `.workspace` creates a stacking context that contains MDI window z-indexes.
**Why it happens:** In CSS, `overflow: hidden` + `position: relative` does NOT create a stacking context. Only `z-index` (non-auto) + `position` creates a stacking context. `.workspace` has no z-index property.
**How to avoid:** Verify with devtools. The fix must be at the overlay level (raise their z-index), not at the workspace level (unless you want to add `isolation: isolate`).

### Pitfall 5: At 800x600 Minimum Window Size, Minimap and Tool Panel Overlap
**What goes wrong:** At 800x600, the minimap (top-right, 160px wide) and game object tool panel (bottom-right, 160px wide) may overlap if the canvas panel height is small.
**Why it happens:** Both are absolutely positioned in `.main-area` right-side. The canvas panel (`.main-area`) shrinks when the bottom tileset panel is open.
**How to avoid:** Test at 800x600 with tileset panel visible. If they overlap, the CSS needs `pointer-events` or layout adjustments. Document the minimum safe height. This is a success criterion requirement (#3) — must verify at minimum window size.

## Code Examples

### Z-Index Fix (CSS)
```css
/* Minimap.css */
.minimap {
  position: absolute;
  top: 8px;
  right: 8px;
  /* z-index budget: MDI windows use 1000-99999; overlays at 200000 (above normalization ceiling) */
  z-index: 200000;
  /* ... rest unchanged */
}
```

```css
/* GameObjectToolPanel.css */
.game-object-tool-panel {
  position: absolute;
  bottom: 8px;
  right: 8px;
  /* z-index budget: MDI windows use 1000-99999; overlays at 200000 (above normalization ceiling) */
  z-index: 200000;
  /* ... rest unchanged */
}
```

### Minimap Size Constant Change (TypeScript)
```typescript
// Minimap.tsx — before
const MINIMAP_SIZE = 128;
const SCALE = MINIMAP_SIZE / MAP_WIDTH; // 0.5 pixels per tile

// After
const MINIMAP_SIZE = 160;
const SCALE = MINIMAP_SIZE / MAP_WIDTH; // 0.625 pixels per tile
```

### Rendering Loop Fix (TypeScript)
```typescript
// Before (hardcoded 2x subsampling — only correct for 128px):
for (let y = 0; y < MAP_HEIGHT; y++) {
  for (let x = 0; x < MAP_WIDTH; x++) {
    if (x % 2 === 0 && y % 2 === 0) {
      const px = Math.floor(x / 2);
      const py = Math.floor(y / 2);
      // ...
    }
  }
}

// After (iterate minimap pixels, map back to tile coords — correct for any MINIMAP_SIZE):
for (let py = 0; py < MINIMAP_SIZE; py++) {
  for (let px = 0; px < MINIMAP_SIZE; px++) {
    const tx = Math.min(MAP_WIDTH - 1, Math.floor(px / SCALE));
    const ty = Math.min(MAP_HEIGHT - 1, Math.floor(py / SCALE));
    const tileValue = map.tiles[ty * MAP_WIDTH + tx];
    const idx = (py * MINIMAP_SIZE + px) * 4;
    // ... color lookup and assignment
  }
}
```

### Z-Index Budget Comment (CSS, for App.css)
```css
/*
 * Z-INDEX BUDGET
 * ==============
 * 1–2:      Component-internal stacking (MapSettingsDialog tabs: 1, 2)
 * 500:      Minimized bars container (Workspace.css)
 * 1000–99999: MDI child windows (windowSlice.ts BASE_Z_INDEX=1000, normalizes at 100000)
 * 5000–99999: Trace image windows (TRACE_BASE_Z_INDEX=5000)
 * 200000:   Always-on-top overlays: minimap, game object tool panel, toolbar dropdowns
 *
 * Stacking context: .main-area (position: relative) is the root.
 * .workspace has no z-index, so MDI windows participate in .main-area's stacking context.
 * Overlays at 200000 are guaranteed above MDI windows regardless of normalization state.
 */
```

## Files to Change

| File | Change | Lines |
|------|--------|-------|
| `src/components/Minimap/Minimap.tsx` | `MINIMAP_SIZE`: 128 → 160, rewrite rendering loop | 29, 321-388 |
| `src/components/Minimap/Minimap.css` | `z-index`: 100 → 200000, add comment | 5 |
| `src/components/GameObjectToolPanel/GameObjectToolPanel.css` | `z-index`: 100 → 200000, add comment | 5 |
| `src/App.css` | Add z-index budget comment block | Top of file (after imports) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual z-index values | Same (no ecosystem change) | — | N/A — pure CSS stacking |
| Canvas subsampling via `% 2` | Iterate minimap pixels (inverse SCALE) | This phase | Correct fill for arbitrary sizes |

## Open Questions

1. **Should the rendering loop refactor be in scope?**
   - What we know: The `% 2` subsampling guard leaves the canvas partially empty at 160px. The success criterion says "minimap renders at 160x160" which implies it must be fully drawn.
   - What's unclear: Whether the phase description intended to include fixing the loop.
   - Recommendation: Yes, include the loop fix in scope. It's required to satisfy success criterion #2. Without it, 160x160 canvas has visible empty margins.

2. **Farplane cache at 160px needs rebuild trigger**
   - What we know: The `createImageData(MINIMAP_SIZE, MINIMAP_SIZE)` in the farplane cache effect will automatically use the new size. However, the `lastFarplaneRef` check prevents rebuilding if the same `farplaneImage` object is reused across hot-reloads.
   - What's unclear: Whether hot-reload will create a new `farplaneImage` reference or reuse the old one.
   - Recommendation: Not a concern in production (app restarts fresh). In dev, hot-reload invalidates the component instance and reruns effects. Low risk.

3. **Minimum size overlap (success criterion #3)**
   - What we know: Minimap is top-right (8px margin), game object panel is bottom-right (8px margin). At 160px each, the two panels need at least 160 + 8 + 8 + 160 = 336px height in `.main-area` to avoid overlap.
   - What's unclear: What `.main-area` height is at minimum 800x600 window with the tileset panel open.
   - Recommendation: Test manually. The canvas panel defaults to 75% of vertical space; at 600px total height with toolbar (~36px) + statusbar (~24px) = ~540px app-content, canvas panel ≈ 405px. That comfortably fits 336px. But with tileset panel at max size it could be less. Include a verification step.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/core/editor/slices/windowSlice.ts` — z-index constants and normalization logic verified
- Direct codebase inspection: `src/components/Minimap/Minimap.tsx` — MINIMAP_SIZE constant and all usages
- Direct codebase inspection: `src/components/Minimap/Minimap.css` — current z-index: 100
- Direct codebase inspection: `src/components/GameObjectToolPanel/GameObjectToolPanel.css` — current z-index: 100
- Direct codebase inspection: `src/components/ToolBar/ToolBar.css` — existing z-index: 200000 pattern
- Direct codebase inspection: `src/App.tsx` — DOM structure, Minimap and GameObjectToolPanel as siblings of Workspace in `.main-area`
- MDN CSS Stacking Contexts documentation (well-established, stable spec): `overflow: hidden` alone does not create a stacking context; `z-index` (non-auto) + positioned element does.

### Secondary (MEDIUM confidence)
- CSS stacking context behavior: `position: relative` without `z-index` does not form a new stacking context (standard CSS behavior, confirmed via MDN spec knowledge, training data cutoff Aug 2025)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure CSS + single constant
- Architecture: HIGH — DOM structure verified by code inspection, z-index math verified by reading constants
- Pitfalls: HIGH — all identified pitfalls are verified from actual code (% 2 guard, z-index values, threshold constants)

**Research date:** 2026-02-20
**Valid until:** Stable indefinitely (no external dependencies, all findings from codebase inspection)
