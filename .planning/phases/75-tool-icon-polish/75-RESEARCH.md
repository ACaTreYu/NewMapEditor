# Phase 75: Tool Icon Polish - Research

**Researched:** 2026-02-16
**Domain:** UI icons, visual design, React component patterns
**Confidence:** HIGH

## Summary

Phase 75 replaces generic icons (LuShield for bunker, LuArrowRight for conveyor) with distinct, semantically appropriate Lucide icons. The current codebase uses react-icons v5.5.0 which provides Lucide icons via the `/lu` import path. Research confirms that superior icon options exist within the Lucide library: **LuCastle** for bunker (fortress/defensive structure) and **LuBriefcaseConveyorBelt** for conveyor (literal conveyor belt visualization).

This is a simple icon substitution task following the proven pattern from Phase 71, which successfully replaced wall tool icons to make them visually distinct (wall=brick, wall pencil=pencil, wall rect=rectangle).

**Primary recommendation:** Replace `bunker: LuShield` with `LuCastle` and `conveyor: LuArrowRight` with `LuBriefcaseConveyorBelt` in the `toolIcons` record in ToolBar.tsx. Add corresponding imports. No behavioral changes required.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-icons | 5.5.0 | Icon components (Lucide via /lu path) | Already installed, proven in codebase |
| Lucide | (via react-icons) | Icon library with 1600+ SVG icons | Community-standard, consistent design system |

### Supporting
N/A — this is a simple icon substitution using existing infrastructure.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-icons/lu | Direct lucide-react package | Adds dependency, no benefit (react-icons already bundles Lucide) |
| Custom SVG icons | Hand-rolled icon components | High effort, inconsistent visual style |
| Other icon libraries | FontAwesome, Material Icons | Different design language, requires new dependency |

**Installation:**
No new packages required — react-icons@5.5.0 already installed.

## Architecture Patterns

### Recommended Icon Selection Criteria

When choosing tool icons, prioritize:
1. **Semantic clarity** — Icon visually represents the tool's function
2. **Visual distinctness** — No two tool icons should look similar
3. **Consistency** — All icons from same library (Lucide) maintain coherent design language
4. **Specificity** — Prefer specific icons (briefcase-conveyor-belt) over generic ones (arrow)

### Pattern 1: Icon Record Mapping
**What:** Static object mapping icon keys to React components
**When to use:** Toolbar/UI components with fixed icon sets
**Example:**
```typescript
// Source: ToolBar.tsx lines 27-48
const toolIcons: Record<string, IconType> = {
  select: LuSquareDashed,
  pencil: LuPencil,
  bunker: LuShield,        // CURRENT (generic)
  conveyor: LuArrowRight,  // CURRENT (generic)
  // ...
};
```

### Pattern 2: Icon Import and Replacement
**What:** Import icon components from react-icons/lu, add to toolIcons record
**When to use:** Adding new icons or replacing existing ones
**Example:**
```typescript
// Source: ToolBar.tsx lines 13-22
import {
  LuFilePlus, LuFolderOpen, LuSave,
  // ... existing imports
  LuCastle,               // NEW for bunker
  LuBriefcaseConveyorBelt, // NEW for conveyor
} from 'react-icons/lu';

const toolIcons: Record<string, IconType> = {
  bunker: LuCastle,              // UPDATED
  conveyor: LuBriefcaseConveyorBelt, // UPDATED
};
```

### Anti-Patterns to Avoid
- **Inconsistent icon libraries:** Mixing Lucide, FontAwesome, Material Icons creates visual discord
- **Generic placeholders in production:** Shield/arrow icons don't communicate tool-specific functionality
- **Breaking changes to icon keys:** The `toolIcons` record keys (`'bunker'`, `'conveyor'`) must remain stable — only values (icon components) change

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG icon rendering | Custom SVG components | react-icons | 1600+ optimized icons, tree-shakeable, maintained |
| Icon consistency | Mix of custom + library icons | Single library (Lucide) | Uniform stroke width, style, size |

**Key insight:** Icon libraries like Lucide provide professionally designed, accessibility-tested icons with consistent visual weight. Custom icons risk visual inconsistency and accessibility gaps.

## Icon Selection Rationale

### Bunker Tool: LuCastle (Recommended)

**Current state:** `LuShield` — generic protection symbol, no structural implication

**Game object context:**
- Bunker is a 4x4 tiled structure with directional variants (N/E/S/W)
- Two visual styles: "Standard" and "Industrial"
- Functions as a protective fortification/defensive structure
- Tiles form a coherent architectural pattern (corners, walls, interior)

**Why LuCastle:**
- Tags: "fortress • stronghold • palace • chateau • building"
- Categories: Buildings, Gaming, Navigation
- Semantically accurate: bunkers are defensive structures/fortifications
- Visually distinct: castle silhouette immediately recognizable
- Gaming context: appropriate for game object tools

**Alternatives considered:**
- `LuWarehouse` (tags: storage, depot, logistics, building) — Less appropriate; warehouses are for storage, not defense
- `LuFactory` (tags: manufacturing, industrial, production) — Mismatched purpose; factories aren't defensive
- `LuShield` (current) — Too generic; doesn't convey "structure" aspect

**Confidence:** HIGH — Castle is the semantically correct choice for a defensive structure in a game context.

### Conveyor Tool: LuBriefcaseConveyorBelt (Recommended)

**Current state:** `LuArrowRight` — generic directional arrow, no conveyor semantics

**Game object context:**
- Conveyor is a directional tile strip (4 directions: Left/Right/Up/Down)
- Animated tiles showing movement flow
- Creates 2-wide strips that visually convey motion
- Used for transporting objects/ships in a specific direction

**Why LuBriefcaseConveyorBelt:**
- Tags: "baggage • luggage • travel • suitcase • conveyor • carousel"
- Literal representation: icon depicts a conveyor belt system
- Visually distinct: only icon in toolbar with conveyor belt imagery
- Immediately recognizable: users understand "conveyor" at a glance

**Alternatives considered:**
- `LuArrowRight` (current) — Too generic; doesn't communicate "conveyor" concept
- `LuBox` (currently used for holding pen tool) — Overlaps with another tool, lacks direction
- `LuPackage` — Static object, doesn't convey movement/transport

**Confidence:** HIGH — BriefcaseConveyorBelt is the only Lucide icon that literally depicts a conveyor belt.

## Common Pitfalls

### Pitfall 1: Icon Import Name Mismatch
**What goes wrong:** PascalCase component name doesn't match kebab-case Lucide icon name
**Why it happens:** Lucide uses kebab-case (`briefcase-conveyor-belt`), react-icons converts to PascalCase (`LuBriefcaseConveyorBelt`)
**How to avoid:** Follow react-icons naming convention: `Lu` + KebabToPascal(lucide-name)
**Warning signs:** Import fails with "module not found" or "not exported"

**Example conversion:**
- Lucide: `briefcase-conveyor-belt` → react-icons: `LuBriefcaseConveyorBelt`
- Lucide: `castle` → react-icons: `LuCastle`

### Pitfall 2: Breaking Icon Keys vs Icon Values
**What goes wrong:** Changing `toolIcons` object keys breaks button rendering logic
**Why it happens:** Confusion between the mapping key (string) and the value (React component)
**How to avoid:** NEVER change keys (`'bunker'`, `'conveyor'`) — only change values (icon components)
**Warning signs:** Tool buttons disappear or show fallback text labels

### Pitfall 3: Forgetting Import Statement
**What goes wrong:** TypeScript error "Cannot find name 'LuCastle'"
**Why it happens:** Icon component added to `toolIcons` record without importing
**How to avoid:** Always add new icon to the import statement BEFORE using in `toolIcons`
**Warning signs:** Build fails with "undefined variable" errors

## Code Examples

Verified patterns from official sources:

### Icon Replacement in ToolBar
```typescript
// Source: ToolBar.tsx (current implementation pattern)
// Step 1: Update imports (lines 13-22)
import {
  LuFilePlus, LuFolderOpen, LuSave,
  LuUndo2, LuRedo2, LuScissors, LuCopy, LuClipboardPaste,
  LuSquareDashed, LuPencil, LuPaintBucket, LuPipette, LuMinus, LuRectangleHorizontal,
  LuBrickWall, LuRuler,
  LuFlag, LuFlagTriangleRight, LuCircleDot, LuCrosshair, LuToggleLeft,
  LuCastle, LuBox, LuArrowRightLeft, LuBriefcaseConveyorBelt,  // UPDATED LINE
  LuRotateCw, LuRotateCcw, LuFlipHorizontal2,
  LuGrid2X2, LuSettings, LuEye, LuEyeOff,
} from 'react-icons/lu';

// Step 2: Update toolIcons record (lines 27-48)
const toolIcons: Record<string, IconType> = {
  select: LuSquareDashed,
  pencil: LuPencil,
  fill: LuPaintBucket,
  picker: LuPipette,
  ruler: LuRuler,
  line: LuMinus,
  rect: LuRectangleHorizontal,
  wall: LuBrickWall,
  wallpencil: LuPencil,
  wallrect: LuRectangleHorizontal,
  flag: LuFlag,
  pole: LuFlagTriangleRight,
  warp: LuCircleDot,
  spawn: LuCrosshair,
  switch: LuToggleLeft,
  bunker: LuCastle,              // CHANGED from LuShield
  holding: LuBox,
  bridge: LuArrowRightLeft,
  conveyor: LuBriefcaseConveyorBelt, // CHANGED from LuArrowRight
  mirror: LuFlipHorizontal2,
};
```

**No other code changes required.** The `renderToolButton` function (lines 538-598) consumes the `toolIcons` record generically — icon changes propagate automatically.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic placeholders (shield, arrow) | Semantically specific icons (castle, conveyor-belt) | Phase 75 (2026-02-16) | Users can identify tools visually without reading labels |
| Mixed icon styles | Single library (Lucide) | Established in Phase 71 | Consistent visual design language |

**Deprecated/outdated:**
N/A — react-icons/lu is actively maintained, Lucide library stable.

## Open Questions

None. Icon availability verified, implementation pattern proven in Phase 71.

## Sources

### Primary (HIGH confidence)
- [Lucide Icons - Official Catalog](https://lucide.dev/icons) - Verified castle, warehouse, briefcase-conveyor-belt availability
- [Lucide Castle Icon](https://lucide.dev/icons/castle) - Tags, categories, React availability confirmed
- [Lucide Warehouse Icon](https://lucide.dev/icons/warehouse) - Tags, categories, React availability confirmed
- [Lucide Briefcase Conveyor Belt Icon](https://lucide.dev/icons/briefcase-conveyor-belt) - Tags, categories, first release v0.445.0
- [React Icons - Lucide Preview](https://react-icons.github.io/react-icons/icons/lu/) - react-icons/lu integration confirmed
- ToolBar.tsx (src/components/ToolBar/ToolBar.tsx) - Current icon pattern implementation
- Phase 71 VERIFICATION.md (.planning/phases/71-wall-type-selection/71-VERIFICATION.md) - Proven icon replacement pattern

### Secondary (MEDIUM confidence)
- [Icones.js.org - Lucide Collection](https://icones.js.org/collection/lucide) - Lists 1653 Lucide icons total
- [npm react-icons](https://www.npmjs.com/package/react-icons) - Package documentation

### Tertiary (LOW confidence)
N/A — all findings verified with primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-icons@5.5.0 already installed, Lucide confirmed available
- Architecture: HIGH - Icon replacement pattern proven in Phase 71, no new patterns needed
- Pitfalls: HIGH - Import naming, key stability verified via existing codebase patterns
- Icon selection: HIGH - Castle and briefcase-conveyor-belt semantically appropriate and visually distinct

**Research date:** 2026-02-16
**Valid until:** 90 days (icon libraries are stable, low churn)
