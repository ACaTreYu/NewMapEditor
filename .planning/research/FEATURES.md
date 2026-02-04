# Feature Landscape: SELECT Tool & Animation Panel

**Domain:** Tile map editor (SubSpace/Continuum format)
**Researched:** 2026-02-04
**Focus:** SELECT tool functionality and Animation Panel redesign for AC Map Editor

---

## Executive Summary

This research examines SELECT tool implementation and animation panel design patterns in tile map editors, with specific focus on matching SEdit v2.02.00 behavior exactly. The SELECT tool in SEdit is a marquee-based rectangular selection system with copy/paste/cut/delete operations, mirror (horizontal/vertical), and 90° rotation. The animation panel displays a vertical scrollable list of all 256 animations with hex IDs, live previews, and frame offset control.

**Key Finding:** SEdit's SELECT tool operates on rectangular selections with transformation operations (rotate, mirror) that respect tile rotation/mirror lookup tables. The animation panel is a compact vertical list, not a grid - this is critical for matching SEdit UX.

---

## Table Stakes Features

Features users expect from a SELECT tool in a tile map editor. Missing these = tool feels incomplete.

### SELECT Tool Core

| Feature | Why Expected | Complexity | SEdit Implementation |
|---------|--------------|------------|---------------------|
| Rectangular marquee selection | Standard selection paradigm in all editors | Low | `struct seldata { int tile; int horz; int vert; }` - stores start tile + dimensions |
| Visual selection indicator | Users need to see what's selected | Low | Marching ants border drawn with `DrawSelection()` |
| Escape to deselect | Universal UX pattern | Low | Sets `selection.tile = -1` |
| Click-drag to define selection | Standard mouse interaction | Low | WM_LBUTTONDOWN tracking with mouse message loop |
| Selection persists until cleared | Allows multiple operations on same selection | Low | Selection stored in MapInfo struct |
| Delete selection contents | Clear tiles in selected area | Low | Fill selection with DEFAULT_TILE (280) |

### Copy/Cut/Paste Operations

| Feature | Why Expected | Complexity | SEdit Implementation |
|---------|--------------|------------|---------------------|
| Copy selection to clipboard | Core editing operation | Medium | Custom clipboard format "SEDIT" with width/height header + tile data |
| Cut selection to clipboard | Standard edit operation | Medium | Copy + fill with DEFAULT_TILE (280) |
| Paste clipboard at selection origin | Restore copied tiles | Medium | Read "SEDIT" clipboard format, paste at `selection.tile` position |
| Undo support for all operations | Users expect to undo mistakes | Medium | `BufferCompare()` creates undo buffer before changes |

### Keyboard Shortcuts

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ctrl+C for copy | Universal shortcut | Low | Standard Windows convention |
| Ctrl+X for cut | Universal shortcut | Low | Standard Windows convention |
| Ctrl+V for paste | Universal shortcut | Low | Standard Windows convention |
| Delete key to clear | Standard deletion method | Low | Fill selection with empty tile |
| Escape to deselect | Standard cancel action | Low | Clear selection state |

---

## Differentiators

Features that set this editor apart. Not expected by default, but provide significant value.

### Transformation Operations

| Feature | Value Proposition | Complexity | SEdit Implementation |
|---------|-------------------|------------|---------------------|
| Rotate selection 90° clockwise | Edit efficiency - avoid manual rotation | High | `RotateBits()` with rotation lookup table (`rotTbl[512]`), swaps width/height |
| Mirror horizontal | Create symmetric structures efficiently | High | `MirrorBits(direction)` with mirror lookup table (`mirTbl[512]`) |
| Mirror vertical | Create symmetric structures efficiently | High | Same as horizontal, different direction parameter |
| Transform respects tile semantics | Walls/objects rotate correctly | High | Uses `PseudoRD()` and `PseudoMD()` to lookup transformed tile IDs |
| Preserve animation frame offsets | Animated tiles maintain timing | Medium | Frame offset (bits 14-8) preserved during transformations |

**Implementation Note:** SEdit's transformation system uses pre-computed lookup tables for 512 tile/animation entries. Each entry maps original → 90° → 180° → 270° for rotation, and original → vert → horz → both for mirroring. This is NOT simple geometric transformation - it's content-aware tile semantics.

### Animation Panel Features

| Feature | Value Proposition | Complexity | Current Implementation |
|---------|-------------------|------------|----------------------|
| Tile/Anim mode toggle | Switch between placing static tiles and animations | Low | Not implemented - always places what's selected |
| Compact vertical list view | See many animations at once | Low | **Already implemented** (16x16 size, 20 visible) |
| Hex ID display (00-FF) | Match SEdit nomenclature exactly | Low | Shows on hover/selection only |
| Live animation preview | See animation in action before placing | Medium | **Already implemented** with RAF timer |
| Frame offset control (0-127) | Phase animations for visual effects | Low | **Already implemented** with slider |
| "Defined only" vs "All 256" filter | Hide unused animation slots | Low | **Already implemented** with toggle button |
| Scroll through animation list | Navigate 256 entries efficiently | Low | **Already implemented** with mouse wheel |

**Key Finding:** Current animation panel is already well-designed and matches SEdit's vertical list pattern. Only missing feature is Tile/Anim mode toggle.

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in tile map editors or features that don't fit this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Freeform (polygon) selection | SubSpace maps are tile-grid based, not pixel-based | Rectangular selection only |
| Magic wand selection | Tiles don't have "similar" pixels - they're discrete IDs | Use FILL tool for contiguous areas |
| Multi-selection (non-contiguous) | Adds complexity without clear benefit for grid-based editing | Single rectangular selection |
| Rotation by arbitrary angles | Tiles are discrete 16x16 sprites, not vectors | 90° increments only |
| Selection feathering/anti-aliasing | Not applicable to discrete tile grids | Hard edges only |
| Copy as image to system clipboard | SubSpace tiles have semantic meaning (walls, flags) | Custom clipboard format preserving tile IDs |
| Floating selection with alpha | Tiles are opaque sprites, not composited layers | Direct paste replaces tiles |
| Lasso selection | Unnecessary complexity for tile grids | Rectangular marquee sufficient |
| Selection by tile type | Use FILL tool or manual selection | Keep SELECT tool simple |
| Brush-style selection painting | Confusing UX - selection is not painting | Click-drag rectangle only |

---

## Feature Dependencies

### SELECT Tool Dependencies

```
SELECT tool requires:
├─ Canvas coordinate system (pixel → tile conversion)
├─ Viewport state (scroll position for screen-space drawing)
├─ Undo/redo system (all operations must be undoable)
├─ Clipboard API or custom clipboard system
├─ Tile rendering (to preview selection contents)
└─ Transformation tables (for rotate/mirror operations)
    ├─ rotTbl[512] - rotation lookup
    └─ mirTbl[512] - mirror lookup
```

### Animation Panel Dependencies (Existing)

```
Animation Panel currently has:
├─ Animation definitions (ANIMATION_DEFINITIONS)
├─ Tileset image (for rendering previews)
├─ Animation timer (RAF-based, 150ms per frame)
├─ Scroll state management
└─ Frame offset input control
```

**Missing for Tile/Anim Toggle:**
- Mode state in EditorState (boolean: `useAnimForPlacement`)
- Radio buttons or toggle UI
- Logic to switch between `selectedTile` and animated tile encoding

---

## SEdit-Specific Behaviors (Must Match Exactly)

### Selection Behavior

1. **Selection State Storage**
   - Stored in `MapInfo.selection` struct: `{ int tile; int horz; int vert; }`
   - `tile` = top-left tile index (0-65535)
   - `horz` = width in tiles
   - `vert` = height in tiles

2. **Selection Rendering**
   - Selection box drawn with `DrawSelection()` using gray pen (0x888888)
   - Marching ants effect (animated border) NOT implemented in SEdit
   - Solid 1px border, no animation

3. **Copy/Cut/Paste Format**
   - Clipboard format identifier: `RegisterClipboardFormat("SEDIT")`
   - Data structure:
     ```c
     WORD[0] = width (horizontal tile count)
     WORD[1] = height (vertical tile count)
     WORD[2..N] = tile data (row-major order)
     ```
   - Cut operation fills with tile 280 (DEFAULT_TILE)

4. **Rotation Behavior**
   - Rotates 90° clockwise
   - Width and height swap after rotation
   - Uses `PseudoRD(tile, isAnim)` to lookup rotated tile ID
   - If tile not in rotation table, placed unchanged
   - Selection dimensions clamped if rotation causes overflow beyond map edge

5. **Mirror Behavior**
   - Four directions: left (0), right (1), up (2), down (3)
   - Mirrors selection INTO adjacent area (not in-place)
   - Uses `PseudoMD(tile, isAnim)` to lookup mirrored tile ID
   - Calculates mirror start position based on direction:
     - Left: `selection.tile - selection.horz`
     - Right: `selection.tile + selection.horz`
     - Up: `selection.tile - selection.vert * width`
     - Down: `selection.tile + selection.vert * width`

6. **Menu Integration**
   - Edit menu: Copy, Cut, Paste, Delete
   - Transform menu: Rotate, Mirror (submenu with 4 directions)
   - Selection-dependent: menu items disabled when `selection.tile == -1`

### Animation Panel Behavior (SEdit Reference)

1. **Layout**
   - Vertical scrollable list, NOT a grid
   - Each row: `[HEX_ID] [FRAME_0] [FRAME_1] ... [FRAME_N]`
   - Hex ID in format "00" to "FF" (uppercase, zero-padded)
   - Row height: 16px (matches tile height exactly)

2. **Animation Display**
   - Shows ALL frames horizontally for each animation
   - Live animation NOT shown - displays static frames
   - Frame 0 always shown first
   - Up to 32 frames can be displayed per row

3. **Selection**
   - Entire row selects (not individual frame)
   - Selection highlight fills entire row width
   - Gray border around selected row

4. **Tile/Anim Toggle**
   - Radio buttons: `( ) Tile  (•) Anim`
   - When Anim selected, clicking animation row switches to TOOL_EDIT (pencil)
   - Automatically enables Anim mode on animation click (convenience)

5. **Offset Control**
   - Numeric input field (not slider) labeled "Offset"
   - Range: 0-127
   - Applied when placing animated tile

**Critical Difference from Current Implementation:**
- **SEdit shows ALL frames horizontally** (up to 32 frames)
- **Current implementation shows ONLY current frame** (animated preview)
- This is a significant UX difference - SEdit gives immediate visual feedback on frame sequence

---

## Implementation Recommendations

### SELECT Tool MVP (Phase 1)

**Must-have for basic functionality:**
1. Rectangular marquee selection (click-drag)
2. Visual selection indicator (marching ants or solid border)
3. Escape to deselect
4. Delete selection (fill with DEFAULT_TILE)
5. Copy/Cut/Paste with custom clipboard format
6. Undo/redo integration

**Complexity:** Medium
**Estimated effort:** 2-3 development sessions
**Blockers:** Need clipboard API (Electron provides this)

### SELECT Tool Complete (Phase 2)

**Add transformation operations:**
1. Rotate 90° clockwise
2. Mirror horizontal/vertical
3. Rotation/mirror lookup tables
4. Transform menu with keyboard shortcuts

**Complexity:** High (rotation/mirror tables are complex)
**Estimated effort:** 3-4 development sessions
**Blockers:** Must implement or port rotation/mirror lookup tables from SEdit

### Animation Panel Enhancement (Optional)

**Add SEdit parity:**
1. Tile/Anim mode toggle (radio buttons)
2. Show all frames horizontally (not just current frame)
3. Numeric offset input instead of slider
4. Hex ID format: "00" to "FF" (currently shows without leading zero)

**Complexity:** Low
**Estimated effort:** 1 development session
**Blockers:** None - purely additive changes

---

## Phase Ordering Rationale

**Recommended sequence:**

1. **SELECT MVP** (copy/paste/cut/delete)
   - Provides immediate editing value
   - Does not depend on transformation tables
   - Users can work around missing rotate/mirror with manual editing

2. **Animation Panel Tile/Anim Toggle** (if desired)
   - Simple addition to existing well-functioning panel
   - Does not block SELECT tool work

3. **SELECT Transformations** (rotate/mirror)
   - Requires porting or reimplementing lookup tables
   - High complexity, moderate value
   - Can be deferred to later milestone if time-constrained

**Dependency Note:** SELECT tool and animation panel are completely independent. They can be developed in parallel or in any order.

---

## Research Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| SELECT tool behavior | **HIGH** | Direct source code analysis of SEdit map.cpp, frame.cpp |
| Copy/paste format | **HIGH** | `copyBits()` and `pasteBits()` functions fully documented |
| Rotation/mirror semantics | **HIGH** | `RotateBits()` and `MirrorBits()` implementations analyzed |
| Animation panel layout | **HIGH** | anim.cpp source code + existing implementation review |
| Transformation tables | **MEDIUM** | Table structure documented, but complete tables not extracted |
| Industry patterns | **MEDIUM** | WebSearch results for Tilesetter, Sprite Fusion patterns |

---

## Gaps and Open Questions

### Known Gaps

1. **Rotation/Mirror Tables Not Extracted**
   - SEdit has `rotTbl[512]` and `mirTbl[512]` with mappings
   - Tables are hardcoded in utils.cpp (lines 170-334 per technical doc)
   - Need to either:
     - Extract tables from SEdit source
     - Regenerate tables from first principles
     - Start with empty tables and populate on-demand

2. **Clipboard Format on Web/Cross-Platform**
   - SEdit uses Windows clipboard API directly
   - Electron app has access to clipboard, but format may differ
   - May need adapter layer or JSON-based custom format

3. **Selection Rendering Performance**
   - Marching ants animation requires frequent redraws
   - May impact performance on large selections
   - Consider debouncing or frame limiting

### Questions for Phase-Specific Research

- **Rotation tables:** Should we port SEdit's tables exactly, or generate our own?
- **Mirror INTO adjacent area:** Is this behavior desirable, or should mirror be in-place?
- **Animation panel frames:** Show all 32 frames horizontally (SEdit), or keep current animated preview?

---

## Sources

### Primary Sources (HIGH Confidence)

- **SEdit v2.02.00 Source Code Analysis**
  - `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`
  - `map.cpp` lines 1483-1682 (SELECT tool implementation)
  - `map.cpp` lines 3414-3682 (RotateBits, MirrorBits, copyBits, pasteBits)
  - `anim.cpp` lines 1-297 (Animation panel implementation)
  - `main.h` lines 35-48 (seldata and undo_buf structures)

### Secondary Sources (MEDIUM Confidence)

- [Tilesetter Map Editing Documentation](https://www.tilesetter.org/docs/map_editing) - Marquee selection patterns
- [Sprite Fusion Tilemap Editor](https://www.spritefusion.com/) - Multi-tile selection and clipboard paste
- [Tiled Forum - Cut and Paste Discussion](https://discourse.mapeditor.org/t/how-to-cut-and-paste-tiles/408) - Community patterns

### Current Implementation

- `E:\NewMapEditor\src\core\editor\EditorState.ts` - Existing state management
- `E:\NewMapEditor\src\components\AnimationPanel\AnimationPanel.tsx` - Current animation panel implementation

---

## Document Metadata

**Version:** 1.0
**Author:** GSD Research Agent
**Date:** 2026-02-04
**Scope:** SELECT tool and Animation Panel redesign for AC Map Editor milestone
**Next Steps:** Use findings to create phase plans for SELECT tool implementation
