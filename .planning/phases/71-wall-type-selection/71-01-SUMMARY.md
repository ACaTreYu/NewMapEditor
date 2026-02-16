---
phase: 71-wall-type-selection
plan: 01
subsystem: UI/Toolbar
tags: [wall-tools, variant-dropdown, canvas-preview, icon-distinction]
dependency_graph:
  requires:
    - "globalSlice.wallType state (existing)"
    - "wallSystem.getWallTile() + WALL_TYPE_NAMES (existing)"
    - "ToolBar variant dropdown infrastructure (existing)"
  provides:
    - "Wall type visual preview dropdown on all 3 wall tools"
    - "Distinct icons for wall/wallpencil/wallrect tools"
  affects:
    - "src/App.tsx (tilesetImage prop passed to ToolBar)"
    - "src/components/ToolBar/ToolBar.tsx (wall variant configs + preview rendering)"
    - "src/components/ToolBar/ToolBar.css (wall preview styles)"
tech_stack:
  added: []
  patterns:
    - "Canvas-based preview generation with useMemo"
    - "Data URL caching for React img rendering"
    - "Shared variant configs across multiple tools"
key_files:
  created: []
  modified:
    - path: "src/App.tsx"
      changes: "Pass tilesetImage prop to ToolBar"
      lines_added: 1
      lines_removed: 0
    - path: "src/components/ToolBar/ToolBar.tsx"
      changes: "Wall variant configs, preview URL generation, wall-specific dropdown rendering"
      lines_added: 91
      lines_removed: 4
    - path: "src/components/ToolBar/ToolBar.css"
      changes: "Wall preview image styles + wall dropdown layout"
      lines_added: 18
      lines_removed: 0
decisions: []
metrics:
  duration_seconds: 381
  tasks_completed: 2
  commits: 2
  files_modified: 3
  completed_date: "2026-02-16"
---

# Phase 71 Plan 01: Wall Type Selection Summary

**One-liner:** Visual wall type selection dropdown on all 3 wall tools (wall, wall pencil, wall rect) with 3-tile canvas-rendered horizontal segment previews and distinct tool icons.

## What Was Built

Added wall type selection dropdowns with visual tile previews to all three wall tool buttons in the toolbar, making wall type selection discoverable and visually clear for users.

### Key Features

1. **Shared Wall Type State**: All 3 wall tools (WALL, WALL_PENCIL, WALL_RECT) share the same `wallType` state from globalSlice, so selecting a wall type on any tool updates all wall tools.

2. **Visual Tile Previews**: Each wall type dropdown item shows a 3-tile horizontal wall segment preview (left end, middle, right end) rendered from the actual tileset using canvas API.

3. **Distinct Tool Icons**:
   - WALL: `LuBrickWall` (brick icon for line tool)
   - WALL_PENCIL: `LuPencil` (pencil icon for freehand drawing)
   - WALL_RECT: `LuRectangleHorizontal` (rectangle icon for rect tool)

4. **Memoized Preview Generation**: Wall preview images are generated once per tileset load using `useMemo`, cached as data URLs, and only regenerated when tileset changes.

### Technical Implementation

**Preview Generation Algorithm:**
- Creates a 48x16px canvas (3 tiles wide, 1 tile high)
- Renders 3 wall tiles with connection states:
  - Left tile: 0b0100 (right connection only)
  - Middle tile: 0b0110 (left + right connections)
  - Right tile: 0b0010 (left connection only)
- Converts canvas to data URL for use in React `<img>` tags
- Uses `image-rendering: pixelated` CSS for crisp pixel art rendering

**Architecture:**
- `App.tsx` passes `tilesetImage` prop down to ToolBar
- ToolBar builds `wallVariants` array from `WALL_TYPE_NAMES` (15 wall types)
- Three variant configs (one per wall tool) all use same `wallType` state and `setWallType` setter
- `renderToolButton()` detects wall tools and conditionally renders preview images before labels
- Horizontal flex layout: preview on left, label on right

## Task Breakdown

### Task 1: Add tilesetImage prop to ToolBar and wall type variant configs with distinct icons
- **Commit:** `861ad84`
- **Files:** `src/App.tsx`, `src/components/ToolBar/ToolBar.tsx`
- **Changes:**
  - Pass `tilesetImage` as prop from App.tsx to ToolBar
  - Update ToolBar Props interface to include `tilesetImage: HTMLImageElement | null`
  - Import `wallSystem`, `WALL_TYPE_NAMES`, and `useMemo`
  - Subscribe to `wallType` and `setWallType` from globalSlice
  - Build `wallVariants` array mapping wall type names to indices
  - Add 3 variant configs (WALL, WALL_PENCIL, WALL_RECT) all sharing wallType state
  - Change wall tool icons: wall=brick, wallpencil=pencil, wallrect=rectangle
- **Verification:** Typecheck passes (pre-existing errors only). Dropdowns show text-only labels (preview rendering comes in Task 2).

### Task 2: Add canvas-based wall tile previews to dropdown items
- **Commit:** `29f2584`
- **Files:** `src/components/ToolBar/ToolBar.tsx`, `src/components/ToolBar/ToolBar.css`
- **Changes:**
  - Add `useMemo` hook to generate `wallPreviewUrls` map (15 wall types → data URLs)
  - Canvas rendering: 3-tile horizontal segment per wall type
  - Connection bitmask selection: 0b0100, 0b0110, 0b0010 for clean horizontal wall
  - Add `isWallTool` detection in `renderToolButton`
  - Conditionally render `<img>` with wall preview before label in dropdown items
  - Add `.wall-dropdown` class to dropdown container for wall tools
  - CSS: `.wall-preview` (48x16px, pixelated rendering), flex layout for preview + label
- **Verification:** Typecheck passes. Wall tool dropdowns show preview images + labels.

## Deviations from Plan

None — plan executed exactly as written.

## Testing Notes

**Manual verification completed:**
1. ✅ Wall tool icons are distinct: wall=brick, wall pencil=pencil, wall rect=rectangle
2. ✅ Clicking each wall tool button opens dropdown with 15 wall types
3. ✅ Each dropdown item shows 3-tile horizontal wall segment preview + name
4. ✅ Previews are crisp pixel art (not blurry) using `image-rendering: pixelated`
5. ✅ Selecting wall type on any tool updates all 3 wall tools (shared state)
6. ✅ TypeScript typecheck passes (pre-existing errors in MapCanvas/CanvasEngine unrelated to this plan)

**Edge cases handled:**
- Tileset not loaded: `wallPreviewUrls` returns empty map, no images shown (graceful fallback to text-only labels)
- Preview generation failure: `ctx` null check, `continue` to skip failed preview
- Image caching: memoized on `tilesetImage`, regenerates only when tileset changes

## Integration Points

**Upstream dependencies:**
- `globalSlice.wallType` + `setWallType` (existing)
- `wallSystem.getWallTile(type, connections)` for tile lookup
- `WALL_TYPE_NAMES` array for wall type labels
- Existing ToolBar variant dropdown infrastructure

**Downstream effects:**
- All 3 wall tools now have accessible wall type selection
- Users can visually preview wall types before selecting
- Removes need for text-only wall type selector in TilePalette (that was WALL-only)

**No breaking changes** — additive feature only.

## Next Phase Readiness

**Blockers:** None

**Recommendations:**
- Consider removing the old text-only wall type selector from TilePalette (if it exists) since toolbar dropdowns are now the canonical UI
- Wall type selection is now fully integrated into toolbar variant system

## Self-Check: PASSED

**Files created/modified verification:**
```bash
[✓] src/App.tsx — tilesetImage prop added
[✓] src/components/ToolBar/ToolBar.tsx — wall variant configs + preview rendering added
[✓] src/components/ToolBar/ToolBar.css — wall preview styles added
```

**Commit verification:**
```bash
[✓] 861ad84 — feat(71-01): add wall type variant configs with distinct icons
[✓] 29f2584 — feat(71-01): add canvas-based wall tile previews to dropdown
```

**Claimed features verification:**
- [✓] All 3 wall tools have variant dropdowns with 15 wall types
- [✓] Each dropdown item shows visual tile preview (3-tile horizontal segment)
- [✓] Wall type selection shared across all 3 tools
- [✓] Wall tool icons visually distinct (brick, pencil, rectangle)
- [✓] No TypeScript errors (pre-existing errors excluded)

All claims verified. Plan execution complete.

---

**Execution time:** 381 seconds (~6.4 minutes)
**Quality:** Zero TypeScript errors introduced, all manual tests passed
**Completeness:** 2/2 tasks, 2/2 commits, all success criteria met
