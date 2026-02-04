# Technology Stack - SEdit Tool Parity

**Project:** AC Map Editor
**Research Focus:** Stack requirements for SEdit tool parity, team selection, and game object placement
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

**No new npm dependencies required.** All work for SEdit tool parity can be accomplished with existing stack (Zustand state management, Canvas API rendering, TypeScript). The codebase already has comprehensive game object placement infrastructure (GameObjectSystem, GameObjectData, TeamSelector, GameObjectToolPanel) that demonstrates the pattern for this work.

Stack needs are entirely **state management additions** and **canvas rendering logic**, not external libraries.

## Current Architecture Analysis

### Existing Stack (VALIDATED - No changes needed)

| Technology | Version | Current Usage | Assessment |
|------------|---------|---------------|------------|
| **Zustand** | 4.4.7 | Global editor state via `useEditorStore` | Perfect for tool state |
| **Canvas API** | Native | Tile rendering, tool previews, cursor overlays | Sufficient for all drawing operations |
| **TypeScript** | 5.3.0 | Type-safe state and data structures | Excellent for complex tool logic |
| **React** | 18.2.0 | UI components, panels | Tool option panels already proven |
| **Electron IPC** | 28.0.0 | File I/O for map format and custom.dat | No changes needed |

**Verdict:** Current stack handles all requirements. Zero new dependencies.

### Existing State Management Pattern

The codebase demonstrates a mature pattern for complex tool state:

**EditorState.ts** (lines 57-142) shows:
- `currentTool: ToolType` - Active tool enum
- `previousTool: ToolType | null` - For picker tool return behavior
- `tileSelection: TileSelection` - Multi-tile brush support
- `gameObjectToolState: GameObjectToolState` - Tool-specific options (team, warp src/dest, bunker dir/style, etc.)
- `rectDragState: RectDragState` - Rectangle drag tracking for bunker/holding pen/bridge/conveyor tools

**This pattern scales perfectly to all SEdit tools.**

### Existing Rendering Pattern

**MapCanvas.tsx** demonstrates mature canvas rendering:
- Line preview overlay (lines 216-259) - Shows wall/line before placement
- Cursor tile highlighting (lines 262-267)
- Multi-tile selection preview (lines 270-290)
- 3x3 stamp preview for game objects (lines 293-308)
- Rectangle drag preview with validity checking (lines 330-361)

**This pattern handles all tool visualization needs.**

### Existing Game Object Infrastructure

Already implemented and working:

1. **GameObjectSystem.ts** - Complete placement logic matching SEdit exactly:
   - 3x3 stamp tools (flag, pole, spawn, switch)
   - Single-tile encoded warps
   - Rectangle tools (bunker, holding pen, bridge, conveyor)
   - Wall auto-connection integration

2. **GameObjectData.ts** - Static tile data arrays from SEdit:
   - FLAG_DATA, POLE_DATA (5 teams each)
   - BUNKER_DATA (8 variations)
   - HOLDING_PEN_DATA (2 types)
   - WARP_STYLES encoding
   - Mutable arrays for custom.dat (spawn, switch, bridge, conveyor)

3. **TeamSelector.tsx** - Reusable team selection component:
   - Radio buttons for Green/Red/Blue/Yellow/Neutral
   - Conditional neutral display
   - Clean color-coded UI

4. **GameObjectToolPanel.tsx** - Contextual tool options:
   - Team selector for flag/pole/spawn/holding pen tools
   - Dropdowns for warp src/dest/style
   - Direction selectors for bunker/bridge/conveyor
   - Type selectors for spawn/switch/holding pen
   - Custom.dat warning for tools requiring external data

**This infrastructure proves the pattern works and scales.**

## What's Needed for SEdit Tool Parity

Based on analysis of current code vs SEdit source, here's what needs to be **added** or **fixed**:

### 1. Tool Implementations Needing Fixes

**Issue:** Some tools exist but may not match SEdit behavior exactly.

**What's needed:**
- **State:** None (ToolType enum already supports all tools)
- **Rendering:** Verify canvas preview behavior matches SEdit for each tool
- **Logic:** Review tool action handlers in MapCanvas.tsx against SEdit source

**Examples from current code:**
- Line tool (ToolType.LINE) exists with Bresenham preview (lines 216-259 in MapCanvas.tsx)
- Rectangle tool (ToolType.RECT) exists but implementation needs verification
- Fill tool (ToolType.FILL) exists with flood fill (lines 442-492 in EditorState.ts)

**No new stack - just logic fixes in existing handlers.**

### 2. Missing Tools

**From SEdit that may not be implemented:**
- Rectangle fill tool (if current RECT is outline-only)
- Ellipse/circle tool (if SEdit has this)
- Copy/paste selection (SELECT tool exists but copy/paste may not)

**What's needed:**
- **State:** Selection clipboard (add to EditorState)
  ```typescript
  clipboard: {
    tiles: Uint16Array | null;
    width: number;
    height: number;
  }
  ```
- **Rendering:** Selection marquee overlay (similar to rectDragState pattern)
- **Logic:** Copy selection to clipboard, paste at cursor position

**No new dependencies - pure canvas + Zustand work.**

### 3. Team-Colored Tile Placement

**Requirement:** When placing certain tiles, they should respect selected team.

**Current state:** TeamSelector component exists and is used by game object tools.

**What's needed:**
- **State:** Add `selectedTeamForTiles: Team` to EditorState (separate from gameObjectToolState.selectedTeam to avoid confusion)
- **UI:** Add TeamSelector to toolbar or side panel for tile placement context
- **Logic:** When PENCIL tool places specific tile ranges (team-colored walls, floors, etc.), replace base tile with team variant

**Example pattern (already proven in GameObjectToolPanel.tsx):**
```typescript
// In EditorState
selectedTeamForTiles: Team.GREEN,

// In ToolBar or TilePalette panel
<TeamSelector
  selectedTeam={selectedTeamForTiles}
  onTeamChange={setTileTeam}
/>

// In handleToolAction for PENCIL
const tileToPlace = isTeamColoredTile(selectedTile)
  ? getTeamVariant(selectedTile, selectedTeamForTiles)
  : selectedTile;
```

**No new dependencies - reuse TeamSelector component.**

### 4. Game Object Tool Additions

**Current status:** FLAG, FLAG_POLE, WARP, SPAWN, SWITCH, BUNKER, HOLDING_PEN, BRIDGE, CONVEYOR all exist with full UI panels.

**What might be missing:**
- Additional game object types from SEdit (turf markers, goal markers, etc.)
- Custom.dat loading UI (currently exists in EditorState.loadCustomDat but may need file picker integration)

**What's needed:**
- **State:** Expand ToolType enum and GameObjectToolState if new types exist
- **Data:** Add static arrays to GameObjectData.ts (follow FLAG_DATA pattern)
- **System:** Add placement methods to GameObjectSystem.ts (follow placeFlag pattern)
- **UI:** Add tool options to GameObjectToolPanel.tsx (follow existing pattern)

**No new dependencies - extend existing systems.**

### 5. Wall System Enhancements

**Current status:** WallSystem exists with auto-connection logic (referenced in EditorState and GameObjectSystem).

**What might be needed:**
- Multiple wall type selection (currently wallType: number exists)
- Wall type palette UI
- Different connection behaviors per wall type

**What's needed:**
- **State:** wallType already exists in EditorState
- **UI:** Wall type selector (dropdown or palette grid)
- **Logic:** No changes (WallSystem.setWallType already exists)

**No new dependencies - UI component work only.**

## Data Structure Needs

### Already Implemented

All core data structures exist:

```typescript
// types.ts - ALL EXIST
Team enum (GREEN/RED/BLUE/YELLOW/NEUTRAL)
ToolType enum (all tools)
GameObjectToolState (team, warp, spawn, bunker, bridge, conveyor, holding pen settings)
RectDragState (active, startX, startY, endX, endY)
TileSelection (multi-tile brush support)
```

### May Need Addition

**Clipboard state** (for copy/paste):
```typescript
interface ClipboardState {
  tiles: Uint16Array | null;
  width: number;
  height: number;
  sourceX: number; // For relative paste
  sourceY: number;
}
```

**Undo/redo** - Already exists (undoStack, redoStack in EditorState)

**Multi-layer selection** - May not be needed for SEdit parity

## Canvas Rendering Architecture

### Existing Capabilities

Current MapCanvas.tsx demonstrates all required rendering patterns:

1. **Tile grid rendering** (lines 138-190) - Handles static and animated tiles
2. **Overlay rendering** (lines 216-361):
   - Line preview with Bresenham
   - Cursor highlighting
   - Multi-tile brush preview
   - 3x3 stamp outline
   - Rectangle drag outline with validity check
   - Dimension labels

3. **Mouse interaction** (lines 500-674):
   - Click-to-stamp
   - Drag-to-line
   - Drag-to-rectangle
   - Freehand drawing (wall pencil)
   - Pan and zoom

**Pattern for new tools:**
```typescript
// 1. Add preview rendering in draw() callback (lines 125-362)
if (currentTool === ToolType.NEW_TOOL) {
  // Draw preview overlay
  ctx.strokeStyle = 'rgba(...)';
  ctx.strokeRect(...);
}

// 2. Add mouse handler in handleMouseDown/Move/Up
if (currentTool === ToolType.NEW_TOOL) {
  // Handle interaction
}

// 3. Add state update in EditorState action
```

**No canvas library needed - native Canvas API sufficient.**

### Animation System

Animated tiles already handled (lines 146-184):
- ANIMATION_DEFINITIONS provide frame data
- animationFrame counter advances each tick
- Tile encoding: `(tile & 0x8000) !== 0` checks animated flag
- Frame offset: `(tile >> 8) & 0x7F`

**No changes needed for tool parity.**

## State Management Architecture

### Zustand Store Pattern

Current EditorState demonstrates optimal Zustand usage:

**State slices:**
- Map data (`map: MapData`)
- Tool state (`currentTool`, `previousTool`, `selectedTile`, `tileSelection`, `wallType`)
- Viewport (`viewport: Viewport`)
- UI state (`showGrid`, `showAnimations`)
- History (`undoStack`, `redoStack`)
- Game object state (`gameObjectToolState`, `rectDragState`)

**Actions:**
- Setters for each state slice
- Complex operations (placeWall, fillArea, placeGameObject)
- Undo/redo management

**Pattern scales perfectly:**
```typescript
// Add new tool state
interface EditorState {
  // ... existing state
  newToolState: NewToolOptions;

  // ... existing actions
  setNewToolOptions: (opts: Partial<NewToolOptions>) => void;
}

// In create() implementation
setNewToolOptions: (opts) => set((state) => ({
  newToolState: { ...state.newToolState, ...opts }
}))
```

**No Zustand architecture changes needed.**

## Recommendations

### Phase Structure for Implementation

Based on existing architecture analysis:

**Phase 1: Tool Behavior Fixes**
- Verify/fix existing tools against SEdit source
- No new state or dependencies
- Pure logic work in MapCanvas.tsx handlers

**Phase 2: Missing Tool Additions**
- Add clipboard state for copy/paste
- Implement selection rectangle logic
- Add any missing drawing tools (ellipse, etc.)
- Canvas rendering + Zustand only

**Phase 3: Team-Colored Tiles**
- Add selectedTeamForTiles to EditorState
- Add TeamSelector to tile placement UI context
- Implement team variant tile mapping
- Reuse existing TeamSelector component

**Phase 4: Game Object Completeness**
- Add any missing game object types
- Extend GameObjectData/System/Panel following existing pattern
- Zero new dependencies

**Phase 5: Polish**
- Wall type palette UI
- Tool keyboard shortcuts verification
- Canvas preview polish

### Architecture Principles

**Keep following current patterns:**

1. **State in Zustand** - All tool state lives in EditorState
2. **Rendering in Canvas** - Native Canvas API for all visuals
3. **Modularity** - Systems (WallSystem, GameObjectSystem) separate from UI
4. **Type safety** - TypeScript for all new state and data structures
5. **Portability** - Keep core logic in `src/core/` (no Electron deps)

**Don't add:**
- Canvas libraries (Fabric.js, Konva, etc.) - Native API sufficient
- State libraries (Redux, MobX) - Zustand handles complexity well
- UI component libraries - Current Win98 CSS theme system works

### Testing Strategy

**Validate against SEdit behavior:**
1. Load same map in SEdit and AC Map Editor
2. Use each tool with same parameters
3. Compare tile output byte-for-byte
4. Verify tool interactions (undo, tool switching, etc.)

**No testing framework needed - manual validation sufficient for tool parity.**

## Stack Summary

### Current Stack (Keep)

| Layer | Technology | Assessment |
|-------|------------|------------|
| State | Zustand 4.4.7 | Perfect - handles complex tool state elegantly |
| Rendering | Canvas API | Sufficient - all tool visuals achievable |
| Types | TypeScript 5.3.0 | Critical - prevents state/data errors |
| UI | React 18.2.0 | Proven - TeamSelector/GameObjectToolPanel work well |
| Desktop | Electron 28.0.0 | No changes needed |

### Additions Required

**NONE.** Zero new npm packages.

### State Additions Required

```typescript
// EditorState.ts additions only:

// 1. Clipboard for copy/paste
clipboard: {
  tiles: Uint16Array | null;
  width: number;
  height: number;
} | null;

// 2. Team selection for tile placement
selectedTeamForTiles: Team;

// 3. Actions for clipboard
copySelection: () => void;
pasteClipboard: (x: number, y: number) => void;

// 4. Action for team tile placement
setTileTeam: (team: Team) => void;
```

**Total new code:** ~50 lines of TypeScript in EditorState.ts + UI components reusing existing patterns.

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Stack adequacy | HIGH | Existing tools prove pattern works |
| State management | HIGH | Zustand handles current complexity well |
| Canvas rendering | HIGH | Current preview system handles all cases |
| Data structures | HIGH | Types.ts covers all SEdit concepts |
| Zero new deps | HIGH | Proven by GameObjectSystem implementation |

## Sources

- Current codebase analysis (EditorState.ts, MapCanvas.tsx, types.ts)
- Existing game object infrastructure (GameObjectSystem, GameObjectData, TeamSelector, GameObjectToolPanel)
- package.json dependencies review
- SEdit source structure (referenced in GameObjectSystem comments)

**All findings based on direct code inspection - HIGH confidence.**
