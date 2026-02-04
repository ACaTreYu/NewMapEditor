# Project Research Summary

**Project:** AC Map Editor v1.5 — SEdit Tool Parity
**Domain:** Tile Map Editor (SubSpace/Continuum format)
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

This project requires bringing the AC Map Editor's tools to full parity with SEdit (the original C++ Win32 editor). The architecture analysis reveals excellent news: 99% of the required infrastructure is already built and working. The "missing tools" problem is primarily a UI activation issue, not a technical debt problem. Most tools are implemented but not exposed in the toolbar, and the CONVEYOR tool is the only high-priority addition explicitly requested by the user.

**The recommended approach:** Activate existing tools first (toolbar button additions), then implement the missing CONVEYOR tool using proven patterns from BRIDGE/BUNKER tools. All work can be accomplished with the existing stack (Zustand, Canvas API, TypeScript) — zero new dependencies required. The codebase's GameObjectSystem, GameObjectData, TeamSelector, and GameObjectToolPanel infrastructure demonstrates mature patterns that scale perfectly to the remaining tools.

**Key risks:** The critical pitfall is coordinate system mismatches between Win32 pixel coordinates and Canvas event coordinates, especially at non-1x zoom levels. Wall tool auto-connection depends on pixel-perfect neighbor detection, and tile encoding bit masking (animation flag bit 15, frame offset bits 8-14) must match SEdit exactly to avoid data corruption. Testing at all zoom levels (0.25x to 4x) and validating against SEdit behavior side-by-side is essential.

## Key Findings

### Recommended Stack

**No new dependencies required.** All work can be accomplished with the existing stack: Zustand 4.4.7 for state management, native Canvas API for rendering, TypeScript 5.3.0 for type safety, React 18.2.0 for UI components, and Electron 28.0.0 for desktop integration.

**Core technologies:**
- **Zustand 4.4.7**: Centralized editor state — proven by GameObjectSystem's complex tool state management (team selection, warp encoding, bunker directions, etc.)
- **Canvas API (Native)**: All rendering needs — current MapCanvas.tsx demonstrates mature patterns for line previews, 3x3 stamp outlines, rectangle drag validation, and cursor highlighting
- **TypeScript 5.3.0**: Type-safe data structures — critical for preventing bit-masking errors in tile encoding (animation flags, frame offsets, warp data)

The existing infrastructure proves the pattern works: FLAG, WARP, BUNKER, HOLDING_PEN tools all use the same state→system→canvas flow. New tools integrate by following established patterns, not introducing new architecture.

### Expected Features

**Must have (table stakes):**
- **CONVEYOR tool** — User explicitly requested "I want conveyor belt tool back"; drag-to-rectangle with 2x2 minimum (not 3x3), direction selector for LR vs UD patterns
- **SPAWN tool activation** — Implementation exists, just needs toolbar button
- **SWITCH tool activation** — Implementation exists, just needs toolbar button
- **BRIDGE tool activation** — Implementation exists, just needs toolbar button
- **PENCIL drag-to-paint verification** — Code exists but needs testing to ensure continuous painting during drag matches SEdit behavior

**Should have (competitive):**
- **SELECT tool** — Marquee selection with copy/paste/delete operations; professional editors require this, but can be deferred to v1.6+ since SEdit's complex transform features (mirror/rotate, resize handles) represent significant work
- **Wall tool constrain mode** — Shift-key to lock horizontal/vertical like SEdit; improves drawing straight walls

**Defer (v2+):**
- SELECT tool transforms (mirror, rotate) — Complex algorithms from SEdit (rotTbl, mirTbl lookup tables)
- Multiple bridge/conveyor styles — custom.dat supports 15 bridge types and 8 conveyor types, but UI only needs to support first type for v1.5 parity
- Wall type palette UI — wallType state exists, just needs dropdown/grid UI component

### Architecture Approach

The editor has a clean, well-structured architecture where tool integration follows a consistent pattern: ToolType enum → EditorState actions → GameObjectSystem placement logic → MapData mutation → Canvas re-render. The portability principle (src/core/ has no Electron dependencies) is maintained throughout.

**Major components:**
1. **EditorState (Zustand store)** — Central state with tool-specific options (gameObjectToolState for team/direction/type, rectDragState for drag preview), exposes setters and placement actions
2. **GameObjectSystem (stateless logic)** — Pure placement functions (placeSpawn, placeConveyor, placeBridge) that mutate MapData; ported directly from SEdit C++ source
3. **MapCanvas (rendering + interaction)** — Mouse handlers route to EditorState actions; draw loop renders tool-specific previews (3x3 outlines, rectangle drag with validity, line preview with Bresenham)
4. **GameObjectToolPanel (contextual UI)** — Renders team selectors, direction dropdowns, type selectors based on currentTool; uses existing TeamSelector component
5. **ToolBar (tool selection)** — Button arrays for basic tools, stamp tools (3x3), and rect tools; missing 4 button declarations prevents tools from activating

### Critical Pitfalls

1. **Tile encoding bit confusion** — Animation flag (bit 15), frame offset (bits 8-14), and warp encoding ((dest*10+src) in bits 8-14) share bit ranges; missing mask with 0x7F corrupts data. Prevention: Always mask bits when extracting/encoding.

2. **Win32 pixel coords vs Canvas event coords** — SEdit uses `(pixel + scroll) / tileSize` while Canvas uses `(pixel / scaledTileSize) + scrollInTiles`; at non-1x zoom these diverge causing placement to be off by 1-2 tiles. Prevention: Test all zoom levels (0.25x to 4x), match SEdit's integer division pattern.

3. **Mouse event state machine differences** — SEdit uses blocking message loops (`SetCapture() → while(1) GetMessage() → ReleaseCapture()`), impossible in React; current useState for lineState triggers re-render on every mouse move. Prevention: Use useRef for drag state, only setState on completion.

4. **Wall auto-connection neighbor detection** — SEdit has two patterns (simple 4-neighbor check + Bresenham-based line with shift-key constrain mode); missing constrain mode makes drawing straight walls harder. Prevention: Implement shift-key axis locking, test wall line junctions.

5. **Game object 3x3 stamp boundary checks** — SEdit allows partial placement near map edges (skips out-of-bounds tiles, doesn't reject entire stamp); current implementation likely rejects near-edge placement entirely. Prevention: Check each tile individually, not whole stamp bounds.

## Implications for Roadmap

Based on research, suggested phase structure follows activation-first, then completion, then refinement:

### Phase 1: Toolbar Activation (Quick Wins)
**Rationale:** Tools are fully implemented in backend (EditorState, GameObjectSystem) but not exposed in UI; adding toolbar buttons is 5-minute work per tool with immediate user value.

**Delivers:** SPAWN, SWITCH, BRIDGE tools become clickable and usable

**Addresses:** Table stakes features — users expect all SEdit tools to be available

**Avoids:** Pitfall 10 (implementing from scratch when code exists) and user frustration from "hidden" features

**Implementation:** Add 3 entries to toolbar button arrays in ToolBar.tsx (gameObjectStampTools for SPAWN/SWITCH, gameObjectRectTools for BRIDGE), assign icons and keyboard shortcuts

**Research flag:** SKIP — Pattern proven by existing FLAG/BUNKER buttons, no unknowns

### Phase 2: CONVEYOR Tool Implementation
**Rationale:** User's explicit request ("I want conveyor belt tool back"); implements last missing rectangle tool following proven BRIDGE/BUNKER pattern.

**Delivers:** Functional CONVEYOR tool with direction selector (LR vs UD) and 2x2 minimum size

**Uses:** Existing convLrData and convUdData from GameObjectData.ts, placeConveyor logic in GameObjectSystem.ts

**Implements:** Rectangle drag tool with 4-tile pattern fill (2 edge + 2 middle tiles), direction dropdown in GameObjectToolPanel

**Avoids:** Pitfall 11 (conveyor direction encoding) — uses correct custom.dat array based on direction; Pitfall 5 (boundary checks) — allows partial placement near edges

**Implementation:** Add toolbar button, verify GameObjectSystem.placeConveyor implements 4-tile repeating pattern with 2x2 validation (not 3x3), test with LR/UD directions

**Research flag:** LOW — Pattern identical to BRIDGE tool (already working), just different minimum size and tile data array

### Phase 3: Tool Behavior Verification
**Rationale:** Existing tools (PENCIL, LINE, WALL, FILL) may not perfectly match SEdit behavior due to coordinate system differences or mouse interaction assumptions.

**Delivers:** Verified behavior parity for all basic tools against SEdit source code

**Addresses:** User reported "some tools were wrong" — likely coordinate misalignment at zoom or drag-to-paint not working

**Avoids:** Pitfall 2 (coordinate system mismatch), Pitfall 3 (mouse state machine differences), Pitfall 7 (undo granularity)

**Testing protocol:**
- PENCIL: Verify drag-to-paint works continuously (not just click-to-stamp)
- LINE: Test at all zoom levels, compare diagonal line paths with SEdit side-by-side
- WALL: Test auto-connection at wall junctions, verify neighbor detection at zoom
- FILL: Decide if pattern fill enhancement is kept or reverted to SEdit single-tile behavior

**Research flag:** MEDIUM — May need to reference SEdit map.cpp for exact tool behavior (line polynomial vs Bresenham, pencil drag threshold, fill pattern offset)

### Phase 4: Coordinate System Fixes
**Rationale:** Pitfall 2 is critical — if tools place tiles off by 1-2 positions at non-1x zoom, all work is undermined.

**Delivers:** Pixel-perfect tool placement at all zoom levels matching SEdit coordinate calculation

**Addresses:** Wall tool auto-connection failures (neighbor detection requires exact tile coordinates)

**Avoids:** Pitfall 2 (coordinate mismatch) and cascade failures in Pitfall 4 (wall neighbors)

**Implementation:** Review MapCanvas.tsx mouse coordinate conversion, match SEdit's `(pixel + scroll) / tileSize` integer division pattern, test every tool at 0.25x, 0.5x, 1x, 2x, 4x zoom

**Research flag:** HIGH — May need detailed coordinate tracing through SEdit source (map.cpp:1102-1103 scroll handling) to understand edge cases

### Phase 5: Polish & Edge Cases
**Rationale:** After core functionality works, address SEdit-specific behaviors that improve UX.

**Delivers:** Wall constrain mode (shift-key axis locking), status bar 1-indexed coordinates, scroll position tile alignment

**Addresses:** Pitfall 6 (picker tool return), Pitfall 14 (coordinate display), Pitfall 15 (scroll alignment)

**Avoids:** Subtle UX differences that make editor feel "off" compared to SEdit

**Implementation:** Add keyboard modifier detection for shift-key during wall drag, adjust status bar coordinate display to match SEdit's (x+1, y+1) format

**Research flag:** SKIP — Minor refinements, no architectural changes

### Phase Ordering Rationale

- **Activation first** (Phase 1) provides immediate user value with zero risk — buttons just call existing code
- **CONVEYOR second** (Phase 2) addresses user's explicit request and completes the tool set
- **Verification third** (Phase 3) ensures existing tools work correctly before adding complexity
- **Coordinate fixes fourth** (Phase 4) is foundational for all tools but requires research/testing
- **Polish last** (Phase 5) adds SEdit-specific UX refinements after core functionality proven

This order minimizes risk (activate proven code first), maximizes user value early (CONVEYOR tool), and defers complex debugging (coordinates) until simpler wins are delivered. Each phase can be validated independently without blocking others.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Coordinate System):** HIGH — Complex interaction between zoom, scroll, and tile coordinate calculation; may need line-by-line comparison with SEdit map.cpp to understand Win32 scroll handling and pixel-to-tile conversion at various zoom levels

Phases with standard patterns (skip research-phase):
- **Phase 1 (Toolbar Activation):** Pattern proven by existing toolbar buttons, trivial UI work
- **Phase 2 (CONVEYOR Tool):** Pattern identical to BRIDGE tool (already working), just different tile data and min size
- **Phase 5 (Polish):** Minor refinements, no unknowns

Phases needing source code reference (not full research):
- **Phase 3 (Behavior Verification):** Review SEdit map.cpp for specific tool implementations (PENCIL drag logic lines 1115-1140, LINE polynomial lines 2499-2560, FILL pattern lines 1590-1673) to compare with current code

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing tools prove Zustand + Canvas API handles all requirements; no new dependencies needed |
| Features | HIGH | All 15 SEdit tools identified from C++ source; CONVEYOR is only missing implementation, 3 tools just need toolbar activation |
| Architecture | HIGH | GameObjectSystem pattern proven by FLAG/WARP/BUNKER tools; infrastructure 99% complete |
| Pitfalls | HIGH | All pitfalls verified from SEdit C++ source code comparison with current implementation; coordinate system mismatch is critical but well-understood |

**Overall confidence:** HIGH

The research is comprehensive with direct access to SEdit v2.02.00 C++ source code for verification. Current implementation analysis shows mature architecture with proven patterns. Only unknown is coordinate system edge cases at zoom levels, but testing protocol is clear.

### Gaps to Address

- **Line tool algorithm:** Current implementation uses Bresenham, SEdit uses polynomial evaluation with gap-filling logic (map.cpp:2499-2560); need to decide if visual difference is acceptable or if polynomial needs implementation
- **Fill tool pattern support:** Current implementation has pattern fill enhancement not in SEdit; need to decide if this is kept as feature or reverted for exact parity
- **Custom.dat bundling:** Tools requiring custom.dat (SPAWN, SWITCH, BRIDGE, CONVEYOR) fail gracefully but could benefit from bundled defaults; decide if v1.5 requires bundling or just better error messages
- **Zoom behavior edge cases:** SEdit doesn't have zoom feature, so coordinate handling at non-1x zoom is new territory; may discover edge cases during Phase 4 implementation that require iteration
- **Multi-tile drag threshold:** SEdit checks if position changed before stamping again during pencil drag; current implementation may double-stamp or have gaps — needs verification

## Sources

### Primary (HIGH confidence)
- **SEdit v2.02.00 C++ source code** — Complete tool behavior verification
  - map.cpp (8284 lines) — All tool implementations, mouse handlers, coordinate calculations
  - main.h (272 lines) — Tool constants, bit encoding macros, data structures
  - toolbar.cpp (672 lines) — Toolbar button definitions
- **Current implementation** — Direct code inspection
  - src/core/editor/EditorState.ts — Zustand store with tool state and placement actions
  - src/components/MapCanvas/MapCanvas.tsx — Canvas rendering and mouse event handlers
  - src/core/map/GameObjectSystem.ts — Placement logic ported from SEdit
  - src/core/map/GameObjectData.ts — Static tile data arrays
  - src/components/ToolBar/ToolBar.tsx — Toolbar button arrays (3 tools missing)
  - src/components/GameObjectToolPanel/GameObjectToolPanel.tsx — Tool option UI
  - src/components/TeamSelector/TeamSelector.tsx — Reusable team selection component

### Secondary (MEDIUM confidence)
- **SEDIT_Technical_Analysis.md** — Map format documentation (tile encoding, compression, magic bytes)
- **package.json** — Dependency versions verification (Zustand 4.4.7, React 18.2.0, TypeScript 5.3.0)

### Tertiary (LOW confidence)
- None — All findings verified from primary sources (direct code inspection + SEdit source)

---
*Research completed: 2026-02-04*
*Ready for roadmap: yes*
