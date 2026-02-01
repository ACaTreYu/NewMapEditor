# Codebase Concerns

**Analysis Date:** 2026-02-01

## Tech Debt

**MapCanvas Component Size and Complexity:**
- Issue: Single component contains 547 lines with multiple responsibilities - rendering, input handling, scroll management, and tool execution all in one file
- Files: `src/components/MapCanvas/MapCanvas.tsx`
- Impact: Difficult to test, maintain, and extend individual features. Changes to one concern (e.g., scroll logic) risk breaking others (e.g., drawing). Large dependency list on line 40-57 suggests tight coupling to store state
- Fix approach: Split into smaller components - separate `<TileRenderer>`, `<ScrollBars>`, `<InputHandler>` or extract input handlers to custom hooks. Create `useMapCanvasInput()` and `useCanvasRendering()` hooks

**EditorState Store Size:**
- Issue: Zustand store has 388 lines containing 30+ actions mixing tile operations, UI state, viewport management, and undo/redo logic
- Files: `src/core/editor/EditorState.ts`
- Impact: Hard to reason about state transitions. Undo/redo stack tied to tile operations makes testing harder. Performance concern with 50-level undo history storing full Uint16Array copies (512KB+ memory overhead)
- Fix approach: Consider splitting into multiple stores or extracting undo/redo to separate state management. Document state mutation patterns clearly

**Hardcoded Magic Numbers:**
- Issue: Tile constants duplicated across codebase (TILES_PER_ROW = 40 appears in MapCanvas.tsx, EditorState.ts, TilePalette.tsx, WallSystem.ts)
- Files: `src/components/MapCanvas/MapCanvas.tsx:14`, `src/core/editor/EditorState.ts:18`, `src/components/TilePalette/TilePalette.tsx:15`
- Impact: Single change to tileset dimensions requires updates in 4+ places. Risk of inconsistency
- Fix approach: Export TILES_PER_ROW from `src/core/map/types.ts` as central constant. Audit entire codebase for other duplicated values (TILE_SIZE, offsets)

**Animation Data Placeholder Only:**
- Issue: AnimationPanel.tsx line 164-176 uses hardcoded placeholder animations instead of loading real animation data from Gfx.dll or animation file
- Files: `src/components/AnimationPanel/AnimationPanel.tsx:164-176`
- Impact: Animated tiles cannot be properly edited. Users see placeholder frame patterns, not actual game animations
- Fix approach: Implement real animation loader from Gfx.dll or external JSON file. Consider supporting animation frame offset editing UI

## Known Bugs

**Potential Stack Overflow in Flood Fill:**
- Symptoms: Filling large contiguous regions with same tile may cause stack overflow on large maps
- Files: `src/core/editor/EditorState.ts:279-309`
- Trigger: Select fill tool, click on a large empty area (>50,000 tiles)
- Workaround: Use smaller fills or break region with walls. Not tested with 256x256 maps filled completely with same tile
- Root cause: Iterative stack-based flood fill (lines 287-305) grows without limit. On 256x256 all-same-tile maps, could push 65,000+ items to stack before completion
- Fix approach: Implement iterative breadth-first flood fill with size limit, or switch to depth-first with proper recursion limit

**MapParser V2 Format Handling:**
- Symptoms: V2 (legacy) map files treated as V3 with defaults, losing original metadata
- Files: `src/core/map/MapParser.ts:90-94`
- Trigger: Open a v2 format map file
- Current mitigation: Falls through to V3 parser with comment noting simplification
- Impact: V2 maps lose header information during round-trip save (cannot load-modify-save V2 maps)
- Fix approach: Implement proper V2 parser with correct header field offsets

**Tile Index Bounds Not Fully Validated in Pencil Tool:**
- Symptoms: Multi-tile stamp could place tiles outside map bounds without proper clamping
- Files: `src/components/MapCanvas/MapCanvas.tsx:435-447`
- Trigger: Drag multi-tile selection near bottom-right edge of map
- Current mitigation: Line 375 checks bounds before placement in line tool, but line 442 (pencil) doesn't clamp dx/dy iteration
- Risk: Writing to out-of-bounds memory locations in Uint16Array
- Fix approach: Add bounds check in pencil tool loop: `if (x + dx < MAP_WIDTH && y + dy < MAP_HEIGHT)`

## Security Considerations

**Electron IPC File Path Not Validated:**
- Risk: User-supplied file paths passed directly to fs.readFileSync/writeFileSync without sanitization
- Files: `electron/main.ts:83-99`
- Current mitigation: Electron's file dialogs return validated paths, but if code is extended to accept command-line arguments or external input, path traversal possible
- Recommendations: Validate file paths against allowed directories. Use path.resolve() and path.relative() to ensure path doesn't escape allowed folder. Reject paths containing ".." sequences

**Base64 Encoding Buffer Size No Limit:**
- Risk: Large files or malformed data could cause DoS via memory exhaustion during base64 encoding/decoding
- Files: `src/App.tsx:66-70`, `src/App.tsx:104-107`, `electron/main.ts:85-87`
- Current mitigation: Maps are fixed size (256x256), but if code extends to variable-size formats, no size check before allocation
- Recommendations: Add maximum file size check before reading. Validate TILE_COUNT matches expected size in MapParser

**Animation Data Loading Unimplemented:**
- Risk: When animation loading is implemented (line 165 in AnimationPanel), loading external JSON/DLL could be injection vector
- Files: `src/components/AnimationPanel/AnimationPanel.tsx:164`
- Recommendations: When loading animation data, validate JSON schema. Use allowlist for animation frame indices. Never directly eval() animation data

## Performance Bottlenecks

**Full Redraw on Every State Change:**
- Problem: MapCanvas redraws entire 256x256 tile grid on every store update (line 277-279), even when only viewport changed
- Files: `src/components/MapCanvas/MapCanvas.tsx:277-279`
- Cause: `draw()` function has 18 dependencies including entire `map` object. Any map modification triggers recompute of `draw` callback, which rerenders all tiles
- Impact: At 1x zoom on 256x256 map, ~65k tiles rendered per frame. Heavy CPU usage during painting/filling operations
- Improvement path: Memoize visible tile range. Only redraw dirty rectangles. Split rendering into background canvas + overlay for cursor/selection

**Wall System findWallType Linear Search:**
- Problem: Each wall placement triggers neighbor updates, each calling findWallType which iterates all 15 wall types checking all 16 tiles per type (240 comparisons)
- Files: `src/core/map/WallSystem.ts:173-181`
- Impact: Placing a line of 10 walls = 40+ neighbor updates = 10,000+ array lookups. Visible lag when drawing long wall lines
- Improvement path: Invert wall tile lookup - create Map<tileId, wallType> in constructor for O(1) lookup

**Zustand Store Mutation Creates New Map Copy:**
- Problem: All tile operations create shallow copy of entire MapData object (lines 238, 251, 259, 276, 308 in EditorState.ts)
- Files: `src/core/editor/EditorState.ts:232-309`
- Impact: Each tile modification allocates new object. Undo stack stores 50 full Uint16Array copies (512KB each = 25.6MB for undo alone)
- Improvement path: Use structural sharing or implement copy-on-write. Store only changed tile ranges instead of full array in undo stack

**Scroll Metrics Recalculate Every Frame:**
- Problem: getScrollMetrics called on every render (line 509) without memoization
- Files: `src/components/MapCanvas/MapCanvas.tsx:509`
- Impact: Recalculates scroll bar thumb positions 60fps even when viewport unchanged
- Improvement path: Memoize with useMemo, depend only on viewport/canvas size

## Fragile Areas

**Canvas Lifecycle and ResizeObserver:**
- Files: `src/components/MapCanvas/MapCanvas.tsx:261-274`
- Why fragile: ResizeObserver created in useEffect that depends on `[draw]`. If draw dependency changes, observer is recreated. Observer.disconnect() in cleanup could race with new observer creation
- Safe modification: Separate resize logic into dedicated hook. Ensure observer created once with stable callback
- Test coverage: No resize behavior tests. Changes to viewport or zoom interaction could break on window resize

**Line Drawing State Machine:**
- Files: `src/components/MapCanvas/MapCanvas.tsx:30-36`, `320-387`
- Why fragile: lineState tracks drawing across 3 event handlers (mouseDown, mouseMove, mouseUp). If mouse events fire out of order or pointer capture lost, state becomes invalid
- Safe modification: Add timeout to reset line state if mouseUp never fires. Add pointer capture with setPointerCapture() for reliability
- Test coverage: No edge cases tested (rapid clicks, drag outside window, lost focus)

**Undo/Redo Stack Management:**
- Files: `src/core/editor/EditorState.ts:311-366`
- Why fragile: redo() and undo() directly mutate MapData.tiles array (lines 339, 359) then call set(). If component unmounts between pushUndo and redo, stale closure captured wrong map reference
- Safe modification: Create new MapData object in undo/redo, don't mutate in place. Use Map.copy() utility
- Test coverage: No tests for undo/redo sequence validation or memory cleanup

**WallSystem Wall Type Lookup Cache Staleness:**
- Files: `src/core/map/WallSystem.ts:56-75`
- Why fragile: wallTileLookup cache built once in constructor but never updated if wallTypes array is modified. Current code doesn't allow modification, but fragile to future changes
- Safe modification: Rebuild cache whenever wallTypes changes. Add setWallTypes() method if custom walls ever supported
- Test coverage: No tests for wall tile detection accuracy

## Scaling Limits

**256x256 Fixed Map Size:**
- Current capacity: Only supports 256x256 tiles (65,536 tiles = 131KB uncompressed, 256KB with 16-bit encoding)
- Limit: Cannot edit larger or smaller maps. Hard-coded constants throughout (MAP_WIDTH, MAP_HEIGHT in types.ts)
- Scaling path: Parametrize map dimensions. Make MapHeader include width/height. Support variable sizes like 64x64 to 512x512

**Undo History Memory Limit:**
- Current capacity: 50 undo levels, each storing full 256x256 tile array (131KB per action = 6.5MB total)
- Limit: On older machines with <256MB RAM, undo history could consume significant memory. No warning when hitting limit
- Scaling path: Implement smart undo that only stores delta regions, not full arrays. Add configurable undo level limit with UI warning

**Wall Type Count Fixed at 15:**
- Current capacity: DEFAULT_WALL_TYPES array hardcoded with exactly 15 types (WallSystem.ts line 16-47)
- Limit: Cannot add custom wall types from mods or custom tilesets
- Scaling path: Make wall types loadable from file. Store as array of arrays, make extensible

## Dependencies at Risk

**Electron 28 (ESM/Native Module Compatibility):**
- Risk: Electron 28 uses newer native module compilation. If project adds native dependencies (for image processing, compression), build chain complexity increases
- Current impact: zlib is Node.js built-in, no risk currently
- Migration plan: Future compression libraries should be pure JS. If adding image libraries, ensure prebuilt binaries available for Windows/Mac/Linux

**Zustand 4.4.7 (Upcoming v5 Major Change):**
- Risk: Zustand v5 changes shallow subscriptions to deep subscriptions and removes some selector patterns
- Files: All imports of `useEditorStore` throughout codebase
- Current impact: Code uses basic `.create()` pattern, should be compatible but test thoroughly before upgrading
- Migration plan: Run Zustand v5 beta locally. Test all store operations. May need refactor of selector patterns

## Missing Critical Features

**File Format Version Support Gap:**
- Problem: V2 format not properly supported (treated as V3 with defaults). V1 raw format supported but loses modifications on save
- Blocks: Cannot reliably work with legacy maps from older SEDIT versions
- Impact: Users cannot round-trip v1/v2 maps - load old map, edit, save returns v3 format
- Fix priority: High (impacts data integrity)

**Animation System Not Functional:**
- Problem: Animated tiles render as placeholders. Animation data loading only a stub
- Blocks: Cannot place or preview animated tiles properly
- Impact: Half of map editing features unavailable
- Fix priority: High (core feature)

**No Tileset Selection UI:**
- Problem: Tileset must be placed manually at `assets/tileset.png` or `.bmp`. No built-in file picker
- Blocks: Cannot switch tilesets for different map packs
- Impact: Limited to single tileset per installation
- Fix priority: Medium (usability)

**No Map Validation/Integrity Check:**
- Problem: No tools to check for invalid tile references, broken wall connections, out-of-bounds flag poles
- Blocks: Cannot verify map before release
- Impact: Maps could contain errors without user knowledge
- Fix priority: Medium (quality assurance)

## Test Coverage Gaps

**Canvas Drawing and Rendering:**
- What's not tested: Tile rendering correctness, grid display accuracy, zoom scaling, canvas resize behavior, scrolling bounds clamping
- Files: `src/components/MapCanvas/MapCanvas.tsx`
- Risk: Rendering regressions could go unnoticed. UI layout changes might break canvas positioning
- Priority: High (largest, most complex component)

**Tool Behavior and Line Drawing:**
- What's not tested: Pencil stamp placement with multi-tile selections at boundaries, line tool with off-map coordinates, wall auto-connection logic, fill algorithm with disconnected regions
- Files: `src/components/MapCanvas/MapCanvas.tsx:429-462`, `src/core/map/WallSystem.ts`
- Risk: Edge cases cause silent failures or map corruption
- Priority: High (data mutation critical path)

**State Transitions and Undo/Redo:**
- What's not tested: Complex undo sequences, redo after new action, undo from empty stack, state consistency after undo/redo
- Files: `src/core/editor/EditorState.ts:311-371`
- Risk: Undo corruption possible. No verification undo/redo produce expected state
- Priority: High (user data integrity)

**File I/O and Map Parsing:**
- What's not tested: Corrupted file handling, oversized files, malformed headers, decompression failures, round-trip save-load-save consistency
- Files: `src/core/map/MapParser.ts`, `electron/main.ts:92-120`, `src/App.tsx:46-173`
- Risk: Corrupted file could crash editor or lose changes. No error recovery
- Priority: High (data safety)

**Component Integration:**
- What's not tested: Multi-panel interactions (tile palette + canvas), settings panel updates, animation panel placement, toolbar state consistency
- Files: `src/App.tsx`, all components
- Risk: UI state could become inconsistent. Settings changes might not apply
- Priority: Medium

---

*Concerns audit: 2026-02-01*
