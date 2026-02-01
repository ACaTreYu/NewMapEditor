# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Status:** No testing framework configured

**Current State:**
- No test files exist in `src/` directory
- No test runner dependencies (Jest, Vitest, etc.) in `package.json`
- No test configuration files (`jest.config.js`, `vitest.config.ts`, etc.)
- TypeScript compilation configured but not for test execution

**Recommendation for Implementation:**
Testing should be added to this codebase. High-priority candidates for test coverage:
- Core utilities in `src/core/` (tile encoding, map parsing, wall systems)
- Zustand state management (EditorState actions)
- Canvas rendering logic (coordinate transformations)

## Testable Modules (Current)

**Utility Functions - Good Candidates:**
- `src/core/map/TileEncoding.ts` - Pure functions for tile value manipulation
  - `isAnimatedTile()`, `getAnimationId()`, `getFrameOffset()`
  - `makeStaticTile()`, `makeAnimatedTile()`, `makeWarpTile()`
  - `isWarpTile()`, `isPowerupTile()`, `isSwitchTile()`

- `src/core/map/WallSystem.ts` - Wall placement and neighbor connection logic
  - `isWallTile()` - tile identification
  - `getConnections()` - neighbor detection (private, needs exposure for testing)
  - `placeWall()`, `removeWall()` - state-modifying operations

- `src/core/editor/EditorState.ts` - Zustand store logic
  - Tile operations: `setTile()`, `setTiles()`, `fillArea()`
  - Undo/redo: `pushUndo()`, `undo()`, `redo()`
  - Coordinate operations: `setSelectedTile()`, `setTileSelection()`

**Canvas Rendering - Harder to Test:**
- `src/components/MapCanvas/MapCanvas.tsx`
  - Coordinate conversion: `screenToTile()`, `tileToScreen()`
  - Line drawing: `getLineTiles()` (Bresenham algorithm)
  - Scroll metrics: `getScrollMetrics()`
  - Canvas draw operations (visual testing needed)

**Components - Integration Testing:**
- `src/components/ToolBar/ToolBar.tsx` - Tool button logic
- `src/components/TilePalette/TilePalette.tsx` - Palette selection
- `src/App.tsx` - File I/O orchestration

## Manual Testing Patterns (Current)

**Electron IPC Testing:**
File operations tested through Electron's IPC:
- `dialog:openFile` - Open file dialog
- `dialog:saveFile` - Save file dialog
- `file:read` - Read file to base64
- `file:write` - Write base64 to file
- `compress` - Compress tile data with zlib
- `decompress` - Decompress tile data with zlib

Manual testing done via UI interactions in development mode (`npm run electron:dev`).

## Edge Cases Not Currently Covered

**Tile Encoding Edge Cases:**
- Animation ID overflow (exceeding 0xFF)
- Frame offset saturation (exceeding 0x7F)
- Invalid warp style values
- Mixed static/animated tile operations

**Map Operations Edge Cases:**
- Undo/redo with 50+ actions (maxUndoLevels)
- Tile operations on map boundaries
- Flood fill on entire 256x256 map (performance)
- Wall type switching during placement
- Concurrent wall neighbor updates

**Canvas Edge Cases:**
- Zoom to cursor at canvas edges
- Line drawing outside map bounds
- Scroll bar dragging beyond viewport limits
- Tileset image load failures
- Missing animation data for animated tiles

**File I/O Edge Cases:**
- Corrupted map header
- Incomplete compressed data
- File permission errors
- Large file handling (256x256 tiles = 131KB uncompressed)

## Performance Testing Needs

**Areas to Monitor:**
- **Canvas rendering:** 256x256 tiles at various zoom levels
  - Grid rendering at zoom < 0.5
  - Tileset image blitting performance
  - Animation frame updates (running animation preview)

- **State mutations:** Large tile operations
  - `fillArea()` on full map with unoptimized stack
  - `setTiles()` with hundreds of tiles

- **Memory:**
  - Undo stack at 50 actions (50 * 65536 tiles * 2 bytes = ~6.5MB)
  - Animation frame buffer (32 frames per animation * 256 animations)

## Suggested Test Structure (If Added)

**Directory Layout:**
```
src/core/map/__tests__/
├── TileEncoding.test.ts
├── WallSystem.test.ts
└── MapParser.test.ts

src/core/editor/__tests__/
└── EditorState.test.ts

src/components/__tests__/
├── MapCanvas.test.tsx
└── ToolBar.test.tsx
```

**Test Fixture Location:**
- Fixtures for test maps: `tests/fixtures/maps/`
- Sample tileset: `tests/fixtures/tileset.png`
- Animation data: `tests/fixtures/animations.json`

## Example Test Patterns (Recommended)

**Unit Test - Pure Function (TileEncoding):**
```typescript
describe('TileEncoding', () => {
  describe('isAnimatedTile', () => {
    it('should identify animated tiles by bit 15', () => {
      expect(isAnimatedTile(0x8000)).toBe(true);  // bit 15 set
      expect(isAnimatedTile(0x7FFF)).toBe(false); // bit 15 clear
    });

    it('should handle edge values', () => {
      expect(isAnimatedTile(0)).toBe(false);
      expect(isAnimatedTile(0xFFFF)).toBe(true);
    });
  });

  describe('makeAnimatedTile', () => {
    it('should combine animation ID and frame offset', () => {
      const tile = makeAnimatedTile(42, 10);
      expect(getAnimationId(tile)).toBe(42);
      expect(getFrameOffset(tile)).toBe(10);
    });

    it('should mask animation ID to 0xFF', () => {
      const tile = makeAnimatedTile(0x1FF, 0); // overflow
      expect(getAnimationId(tile)).toBe(0xFF);
    });
  });
});
```

**Unit Test - State Mutation (Zustand):**
```typescript
describe('EditorState', () => {
  it('should set tile and mark modified', () => {
    const { getState } = useEditorStore;
    // Create test map
    const map = createEmptyMap();
    const state = getState();
    state.setMap(map);

    state.setTile(10, 10, 42);
    const updated = getState();

    expect(updated.map?.tiles[10 * MAP_WIDTH + 10]).toBe(42);
    expect(updated.map?.modified).toBe(true);
  });

  it('should ignore out-of-bounds tiles', () => {
    const { getState } = useEditorStore;
    const map = createEmptyMap();
    const state = getState();
    state.setMap(map);

    // Should not crash
    state.setTile(-1, 0, 99);
    state.setTile(256, 0, 99);
    expect(getState().map?.modified).toBe(false);
  });
});
```

**Integration Test - Canvas Coordinate Conversion:**
```typescript
describe('MapCanvas coordinate conversion', () => {
  it('should convert screen coords to tile coords correctly', () => {
    // With zoom=1, viewport at (0,0), TILE_SIZE=16
    const tileX = screenToTile(32, 48);
    expect(tileX).toEqual({ x: 2, y: 3 });
  });

  it('should account for viewport offset', () => {
    // With viewport at (10,20), zoom=1
    const tileX = screenToTile(32, 48);
    expect(tileX).toEqual({ x: 12, y: 23 });
  });

  it('should handle zoom scaling', () => {
    // With zoom=2, TILE_SIZE=16, so tilePixels=32
    const tileX = screenToTile(64, 64);
    expect(tileX).toEqual({ x: 2, y: 2 });
  });
});
```

**Canvas Rendering Test (Snapshot or Visual):**
```typescript
describe('MapCanvas rendering', () => {
  it('should draw visible tiles only', () => {
    const canvas = createMockCanvas(640, 640);
    const ctx = canvas.getContext('2d')!;
    const drawSpy = jest.spyOn(ctx, 'drawImage');

    // With viewport (0,0) zoom 1, 40x40 visible tiles
    // Should call drawImage ~1600 times (or less if tiles skip)
    renderMap(canvas, map, viewport);

    expect(drawSpy).toHaveBeenCalledTimes(expect.any(Number));
  });
});
```

## Coverage Targets (If Implemented)

**High Priority (Core Logic):**
- `src/core/map/TileEncoding.ts` - Target: 100% (pure functions)
- `src/core/map/WallSystem.ts` - Target: 90% (complex neighbor logic)
- `src/core/editor/EditorState.ts` - Target: 85% (state mutations)

**Medium Priority (Utilities):**
- `src/core/map/types.ts` - Target: 80% (factories and helpers)
- Map parsing/serialization - Target: 75% (file format logic)

**Lower Priority (UI):**
- Components - Target: 60% (integration/snapshot tests)
- Canvas rendering - Target: 40% (visual testing harder)

## Running Tests (When Added)

**Suggested Commands:**
```bash
npm test                   # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report
npm test -- MapCanvas    # Run specific file
npm test -- --updateSnapshot  # Update snapshots
```

## CI/CD Integration (When Added)

**Recommended Pipeline:**
1. Run `npm run typecheck` (already available)
2. Run `npm test -- --coverage`
3. Enforce coverage thresholds (suggest 70% minimum)
4. Build project with `npm run build`

---

*Testing analysis: 2026-02-01*
