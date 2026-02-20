# Phase 95: Tileset-Rendered Icons - Research

**Researched:** 2026-02-20
**Domain:** Toolbar icon rendering - canvas-to-dataURL pattern in React/TypeScript (Electron)
**Confidence:** HIGH

## Summary

Phase 95 converts six game object tool icons (flag, pole, warp, spawn, switch, conveyor) from static PNG imports to tileset-rendered canvas snippets. The existing pattern from v3.6 (spawn, pole, warp already tileset-rendered) is the complete reference implementation — this phase simply extends it to the remaining three tools: flag, switch, and conveyor.

**Critical discovery:** The current `ToolBar.tsx` already has tileset-rendering logic for spawn/pole/warp, but flag, switch, conveyor, bunker, and turret are declared as static PNG imports (`flagIcon from '@/assets/toolbar/flagicon.png'`, etc.). Those PNG files **do not exist on disk** — the imports are broken. The build succeeds anyway because Vite treats missing asset imports as empty strings in dev mode, resulting in broken `<img src="">` elements. Phase 95 must remove these dead imports and convert the three remaining game object tools (flag, switch, conveyor) to tileset-rendered icons. Bunker and turret are out of scope for Phase 95 (bunker is Phase 97; turret has its own static tile).

**Primary recommendation:** Add flag, switch, and conveyor to the existing `tilesetToolIcons` `useMemo` block in `ToolBar.tsx` using the same single-tile canvas snippet pattern. Remove the dead PNG imports. Provide a fallback `null` value when `tilesetImage` is not loaded, and render a neutral SVG icon (`LuFlag`, `LuToggleLeft`, `LuRotateCw`) as the fallback.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas API | Browser native | Draw tile slice to 16x16 canvas, export as dataURL | Zero deps, already used by spawn/pole/warp pattern |
| React `useMemo` | React 18 | Recompute icons only when `tilesetImage` changes | Prevents redundant canvas creation every render |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-icons/lu` | Current | Fallback SVG icons when tileset not loaded | Used for all other toolbar icons already |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `canvas.toDataURL()` | OffscreenCanvas | OffscreenCanvas is fine but toDataURL is simpler and already proven in this codebase |
| Single tile per tool | 3x3 thumbnail | 3x3 is too large for 22px toolbar button; single tile matches spawn/pole/warp convention |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
No new files needed. All changes are in `ToolBar.tsx` (one file).

### Pattern 1: The Existing Tileset Icon Pattern (v3.6)
**What:** A `useMemo` keyed on `tilesetImage` builds a `Record<string, string>` where values are `canvas.toDataURL()` snippets. The `renderToolButton` function checks `tilesetToolIcons[tool.icon]` and renders `<img src={...}>` when present, falling back to a Lucide SVG icon.

**When to use:** For any toolbar tool icon that should reflect a specific tile from the loaded tileset.

**Existing implementation in `src/components/ToolBar/ToolBar.tsx` (lines 294–333):**
```typescript
// Toolbar icons: static assets for bunker/conveyor/flag/switch, tileset-rendered for spawn/pole/warp
const tilesetToolIcons = useMemo(() => {
  const icons: Record<string, string> = {
    bunker: bunkerIcon,   // dead import — file doesn't exist
    conveyor: conveyorIcon, // dead import — file doesn't exist
    flag: flagIcon,       // dead import — file doesn't exist
    switch: switchIcon,   // dead import — file doesn't exist
    turret: turretIcon,   // dead import — file doesn't exist
  };
  if (!tilesetImage) return icons;

  const TILES_PER_ROW = 40;
  const drawTile = (ctx, tileId, dx, dy, dw, dh) => {
    const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
    const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
    ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE, dx, dy, dw, dh);
  };

  // Already tileset-rendered:
  const singles: [string, number][] = [['spawn', 1223], ['pole', 1361]];
  const warpAnim = ANIMATION_DEFINITIONS[0x9E];
  if (warpAnim?.frames.length > 0) {
    singles.push(['warp', warpAnim.frames[0]]);
  }
  for (const [name, tileId] of singles) {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      drawTile(ctx, tileId, 0, 0, 16, 16);
      icons[name] = canvas.toDataURL();
    }
  }
  return icons;
}, [tilesetImage]);
```

**Target state after Phase 95:**
```typescript
const tilesetToolIcons = useMemo(() => {
  const icons: Record<string, string | null> = {};
  if (!tilesetImage) return icons;  // all null → fallback SVGs render

  const TILES_PER_ROW = 40;
  const drawTile = (ctx, tileId, dx, dy, dw, dh) => { ... };

  const singles: [string, number][] = [
    ['spawn',    1223],  // anim 0xA6 "Yellow OnMapSpawn" frame 0
    ['pole',     1361],  // anim 0x6A "Neutral Cap Pad MM" frame 0
    ['flag',     905],   // anim 0x1C "Green Pad GreenFlag Sec" frame 0
    ['switch',   743],   // anim 0x7B "Switch Unflipped" frame 0
    ['conveyor', 1717],  // anim 0xB7 frame 0 (conveyor right top-left tile)
  ];
  const warpAnim = ANIMATION_DEFINITIONS[0x9E];
  if (warpAnim?.frames.length > 0) singles.push(['warp', warpAnim.frames[0]]);

  for (const [name, tileId] of singles) {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      drawTile(ctx, tileId, 0, 0, 16, 16);
      icons[name] = canvas.toDataURL();
    }
  }
  return icons;
}, [tilesetImage]);
```

**Render fallback (already in `renderToolButton`, lines 760–776):**
```typescript
const tilesetIcon = tilesetToolIcons[tool.icon];
// ...
{tilesetIcon
  ? <img src={tilesetIcon} width={16} height={16} alt={tool.label} className="tileset-tool-icon" draggable={false} />
  : IconComponent
    ? <IconComponent size={16} />
    : tool.label}
```
The `toolIcons` map already has `flag: LuFlag`, `switch: LuToggleLeft` as SVG fallbacks. For conveyor, a fallback SVG will need to be added to `toolIcons` (currently missing entirely).

### Pattern 2: Fallback When No Tileset Loaded
**What:** Return an empty or null-valued `icons` object when `tilesetImage` is null. The render function falls back to the SVG from `toolIcons` map.

**When to use:** tilesetImage prop is null (app just opened, no GFX patch loaded yet).

**Note:** Currently the code pre-populates `icons` with the dead PNG imports as a "fallback". After Phase 95, when no tileset is loaded, those entries should simply be absent from `icons`, and the existing `toolIcons` SVG map covers the fallback display.

### Anti-Patterns to Avoid
- **Keeping the dead PNG imports:** `bunkericon.png`, `conveyoricon.png`, `flagicon.png`, `switchicon.png`, `turreticon.png` do not exist. Remove all five imports.
- **Pre-populating `icons` with undefined/null values from dead imports:** These currently resolve to `undefined` or empty string at runtime, causing broken `<img src="">` renders.
- **Using `imageSmoothingEnabled = true`:** Tile art is pixel art — always set `imageSmoothingEnabled = false` before drawing.
- **Building the icon Map inside render (no useMemo):** Would recreate canvases on every state change. Use `useMemo([tilesetImage])`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pixel-perfect tile extraction | Custom pixel buffer manipulation | `ctx.drawImage(tilesetImage, srcX, srcY, 16, 16, 0, 0, 16, 16)` | Canvas API handles this natively |
| Animated icon cycling | Custom RAF loop per icon | Phase 96 (out of scope) | Phase 95 is static first-frame only |

## Tile ID Reference

These are the specific tile IDs to use for each tool icon. All verified against `AnimationDefinitions.ts` and `GameObjectData.ts`:

| Tool | Tile ID | Source | Animation ID | Name |
|------|---------|--------|--------------|------|
| spawn | 1223 | `ANIMATION_DEFINITIONS[0xA6].frames[0]` | 0xA6 | Yellow OnMapSpawn |
| pole | 1361 | `ANIMATION_DEFINITIONS[0x6A].frames[0]` | 0x6A | Neutral Cap Pad MM |
| warp | 1388 | `ANIMATION_DEFINITIONS[0x9E].frames[0]` | 0x9E | BigWarp MM |
| **flag** | **905** | `ANIMATION_DEFINITIONS[0x1C].frames[0]` | **0x1C** | **Green Pad GreenFlag Sec** |
| **switch** | **743** | `ANIMATION_DEFINITIONS[0x7B].frames[0]` | **0x7B** | **Switch Unflipped** |
| **conveyor** | **1717** | `ANIMATION_DEFINITIONS[0xB7].frames[0]` | **0xB7** | **Conveyor right top-left** |

Bold = newly added in Phase 95. Non-bold = already implemented in v3.6 but included for completeness.

**Note on spawn tile ID:** The current code hardcodes `['spawn', 1223]`. Tile 1223 is `ANIMATION_DEFINITIONS[0xA6].frames[1]` (Yellow OnMapSpawn frame 1), not frame 0 (which is 1222). This was an existing design choice in v3.6; Phase 95 should leave it unchanged unless the user explicitly overrides it.

**Note on conveyor:** The phase description says "tile IDs provided at plan time." Tile 1717 is the first frame of anim 0xB7 (conveyor-right top-left corner). This is the most recognizable single-tile representation of a conveyor. The user should confirm this choice at plan time or specify a different tile.

**Note on flag:** Tile 905 is frame 0 of anim 0x1C (Green Pad GreenFlag Secured). This is the green flag-on-pad secured state, which is visually the most flag-like tile. Alternatively, the green flag's center from FLAG_DATA[0] center position (index 4) is `0x801C` (anim 0x1C), same tile. Good choice.

## Common Pitfalls

### Pitfall 1: Dead PNG Imports Still Present
**What goes wrong:** Build succeeds but images show as broken `<img src="">` or empty string because `bunkericon.png`, etc. don't exist on disk.
**Why it happens:** Vite silently resolves missing asset imports as empty strings in some configurations.
**How to avoid:** Delete all five PNG import lines at the top of `ToolBar.tsx`. Do not add them to the icons object at all.
**Warning signs:** `<img src="">` in DOM inspector, browser network tab shows 404 for icon URLs.

### Pitfall 2: Missing Conveyor Fallback SVG
**What goes wrong:** When no tileset is loaded, conveyor tool shows no icon at all (not even text).
**Why it happens:** `toolIcons` map (line 33–51 of ToolBar.tsx) has `switch: LuToggleLeft` but may not have a conveyor entry.
**How to avoid:** Verify `toolIcons` has an entry for every tool that gets a tileset icon. For conveyor, a suitable Lucide icon is `LuArrowRight` or `LuChevronsRight`.
**Warning signs:** Conveyor button shows blank when tileset not loaded.

### Pitfall 3: Tile ID Out of Tileset Bounds
**What goes wrong:** Drawing a tile ID beyond the tileset image's actual dimensions results in a blank icon.
**Why it happens:** The default tileset is 640px wide (40 tiles) and varies in height. Tile 1717 is at row 42, column 37 → pixel (592, 672). If tileset is shorter, blank.
**How to avoid:** The standard tileset is tall enough for all referenced IDs. Verify by checking tileset height (should be 40+ rows for conveyor tiles at row 42+).
**Warning signs:** Blank icon even when tileset loaded; no JS error.

### Pitfall 4: Scope Creep Into Bunker/Turret
**What goes wrong:** Attempting to also fix bunker (PNG exists: `bunker-sedit.png`) or turret in this phase.
**Why it happens:** Both currently use dead PNG imports; tempting to fix everything at once.
**How to avoid:** Phase 95 scope is flag, pole, warp, spawn, switch, conveyor only. Bunker is Phase 97 (theme-adaptive). Turret is a game object tool but not in the six listed requirements. Leave bunker and turret fallbacks as-is (remove dead imports, add `null` to icons, let SVG fallbacks render).
**Warning signs:** Scope expanding beyond the six tools listed in ICON-01 through ICON-06.

### Pitfall 5: Type Change for icons Record
**What goes wrong:** TypeScript error when `icons[name]` can be `string | null` but `renderToolButton` expects `string`.
**Why it happens:** Changing the initial object type from `Record<string, string>` (all entries are strings from PNG imports) to `Record<string, string>` (entries only present when tileset loaded).
**How to avoid:** Change the type to `Record<string, string>` (no null needed) — simply omit absent keys. When `tilesetImage` is null, return empty `{}`. The render check `tilesetToolIcons[tool.icon]` is already falsy-checked.

## Code Examples

### Pattern: Adding New Tools to Existing singles Array
```typescript
// Source: ToolBar.tsx lines 313-329 (existing pattern, extended)
const singles: [string, number][] = [
  ['spawn',    1223],
  ['pole',     1361],
  ['flag',     905],   // anim 0x1C Green Pad GreenFlag Sec, frame 0
  ['switch',   743],   // anim 0x7B Switch Unflipped, frame 0
  ['conveyor', 1717],  // anim 0xB7 Conveyor right TL, frame 0
];
const warpAnim = ANIMATION_DEFINITIONS[0x9E];
if (warpAnim?.frames.length > 0) {
  singles.push(['warp', warpAnim.frames[0]]);
}
for (const [name, tileId] of singles) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    drawTile(ctx, tileId, 0, 0, 16, 16);
    icons[name] = canvas.toDataURL();
  }
}
```

### Pattern: Removing Dead PNG Imports
```typescript
// REMOVE these lines (files don't exist on disk):
// import bunkerIcon from '@/assets/toolbar/bunkericon.png';
// import conveyorIcon from '@/assets/toolbar/conveyoricon.png';
// import flagIcon from '@/assets/toolbar/flagicon.png';
// import switchIcon from '@/assets/toolbar/switchicon.png';
// import turretIcon from '@/assets/toolbar/turreticon.png';

// REMOVE the pre-populated fallback object:
// const icons: Record<string, string> = {
//   bunker: bunkerIcon,   // dead
//   conveyor: conveyorIcon, // dead
//   flag: flagIcon,       // dead
//   switch: switchIcon,   // dead
//   turret: turretIcon,   // dead
// };

// REPLACE with:
const icons: Record<string, string> = {};
if (!tilesetImage) return icons;
```

### Pattern: Fallback SVG for Conveyor Tool
```typescript
// In toolIcons map (line 33-51), ensure conveyor has a fallback:
import { LuChevronsRight } from 'react-icons/lu'; // or LuArrowRight

const toolIcons: Record<string, IconType> = {
  // ... existing entries ...
  conveyor: LuChevronsRight,  // fallback when no tileset loaded
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All game object icons: Lucide SVGs | spawn/pole/warp: tileset canvas snippets | v3.6 (Phase 79) | Visual consistency with actual game tiles |
| flag/switch/conveyor: dead PNG imports | (this phase) tileset canvas snippets | Phase 95 | Fix broken imports, achieve visual consistency |

**Deprecated/outdated:**
- Dead PNG imports (`bunkericon.png` etc.): Were presumably planned as placeholder assets, never created. Remove them.

## Open Questions

1. **Tile ID for flag icon: 905 or user override?**
   - What we know: Tile 905 is "Green Pad GreenFlag Sec" frame 0, visually shows a green flag secured on a pad. Phase context says "tile IDs provided at plan time."
   - What's unclear: User may want a different frame (e.g., just the flag itself, not the pad).
   - Recommendation: Use tile 905 (frame 0 of 0x1C). If user wants pure flag tile, they can specify at plan time. Fallback: the center of FLAG_DATA[0] resolves to anim 0x1C which is the same tile.

2. **Tile ID for conveyor icon: 1717 or user override?**
   - What we know: Tile 1717 is frame 0 of anim 0xB7 (conveyor-right TL corner). It shows the top-left corner piece of a right-moving conveyor.
   - What's unclear: May not be visually recognizable as "conveyor" to users. A center conveyor arrow tile might be clearer.
   - Recommendation: Use 1717 (first frame of 0xB7) as default. If user has a preference for a center/middle tile, note it at plan time.

3. **Turret icon: in scope or out of scope?**
   - What we know: ICON-01 through ICON-06 cover flag, pole, warp, spawn, switch, conveyor. Turret is not listed. But turret currently uses a dead PNG import too.
   - What's unclear: Whether to also fix turret's dead import in this phase.
   - Recommendation: Turret is NOT in scope for Phase 95 (not in ICON-01 through ICON-06). Fix turret's dead import by removing it and adding `null`/falling back to the existing `LuCircleDot` or adding a Lucide fallback for turret. Turret tile from anim 0xBD is tile 2728 — can optionally add it to singles array without violating scope since it's a cleanup, not a new requirement.

4. **Bunker dead import: handle in this phase?**
   - What we know: Bunker is Phase 97 (theme-adaptive). Its dead import also needs cleanup.
   - Recommendation: Remove bunker's dead PNG import in Phase 95 as part of the import cleanup, and let the existing `LuBrickWall` SVG fallback from `toolIcons` handle it until Phase 97.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx` — full implementation read
- Direct codebase inspection: `E:\NewMapEditor\src\core\map\GameObjectData.ts` — tile encoding and data arrays
- Direct codebase inspection: `E:\NewMapEditor\src\core\map\AnimationDefinitions.ts` — all 256 animation definitions with frame arrays
- Direct codebase inspection: `E:\NewMapEditor\src\components\ToolBar\ToolBar.css` — `.tileset-tool-icon { image-rendering: pixelated }` pattern confirmed
- Filesystem inspection: `E:\NewMapEditor\assets\toolbar\` — confirmed PNG icon files do not exist

### Secondary (MEDIUM confidence)
- None needed — all findings from direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, existing Canvas API pattern fully verified
- Architecture: HIGH — existing pattern in same file is the complete reference
- Pitfalls: HIGH — dead imports confirmed by filesystem check, tile IDs verified from AnimationDefinitions.ts
- Tile IDs: HIGH for switch (743) and warp (1388). MEDIUM for flag (905) and conveyor (1717) — user should confirm at plan time

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (codebase is stable; AnimationDefinitions and GameObjectData don't change often)
