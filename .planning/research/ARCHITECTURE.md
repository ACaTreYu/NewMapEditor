# Architecture Integration for SEdit Tool Parity

**Domain:** Tile map editor (SubSpace/Continuum format)
**Researched:** 2026-02-04
**Focus:** Integration of missing tools (conveyor, spawn, switch) with existing architecture

## Executive Summary

The editor has a clean, well-structured architecture that already supports most game object tools. New tools integrate seamlessly through existing patterns:

1. **Tool definitions** already exist in `ToolType` enum and toolbar
2. **Game object placement logic** already implemented in `GameObjectSystem`
3. **Team selection UI** already exists as reusable component
4. **Tool panel** already renders contextual options
5. **Canvas rendering** already handles tool previews and drag interactions

**Key finding:** Most infrastructure is ALREADY BUILT. Missing pieces are primarily activation and wiring, not new architecture patterns.

## Current Architecture Overview

### Data Flow: User Click → Map Mutation

```
User Interaction
      ↓
MapCanvas mouse handlers (onMouseDown/Move/Up)
      ↓
EditorState action (placeGameObject, placeGameObjectRect)
      ↓
GameObjectSystem placement logic
      ↓
MapData.tiles mutation
      ↓
EditorState.set triggers re-render
      ↓
Canvas redraws with updated tiles
```

### Component Boundaries

| Component | Responsibility | State Source | Communicates With |
|-----------|---------------|--------------|-------------------|
| **EditorState** | Central state (Zustand) | Global store | All components via hooks |
| **MapCanvas** | Rendering + mouse events | Local + EditorState | EditorState actions |
| **ToolBar** | Tool selection buttons | EditorState | EditorState.setTool |
| **GameObjectToolPanel** | Tool-specific options UI | EditorState | EditorState setters |
| **TeamSelector** | Team radio buttons | Props from parent | Parent callback |
| **GameObjectSystem** | Placement algorithms | Stateless | MapData (mutates) |
| **GameObjectData** | Static tile arrays | Module-level | GameObjectSystem |

### Integration Points

**1. Tool Type Declaration (types.ts)**
```typescript
export enum ToolType {
  // Already defined:
  SPAWN = 'spawn',
  SWITCH = 'switch',
  CONVEYOR = 'conveyor',
  BRIDGE = 'bridge',
  // ...
}
```
✅ All tool types already exist in enum

**2. EditorState Store (EditorState.ts)**
```typescript
interface EditorState {
  currentTool: ToolType;
  gameObjectToolState: GameObjectToolState;  // Team, settings
  rectDragState: RectDragState;              // Drag preview

  // Actions already exist:
  setGameObjectTeam(team: Team): void;
  setSpawnType(type: number): void;
  setSwitchType(type: number): void;
  setConveyorDirection(dir: number): void;

  placeGameObject(x, y): boolean;           // For click-to-stamp
  placeGameObjectRect(x1, y1, x2, y2): boolean; // For drag-to-rect
}
```
✅ All state and actions already implemented

**3. Canvas Mouse Handlers (MapCanvas.tsx)**
```typescript
const handleMouseDown = (e) => {
  if (currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH) {
    // Click-to-stamp tools (3x3)
    pushUndo('Place game object');
    placeGameObject(x, y);
  }
  else if (currentTool === ToolType.CONVEYOR || currentTool === ToolType.BRIDGE) {
    // Drag-to-rectangle tools
    setRectDragState({ active: true, startX: x, startY: y, endX: x, endY: y });
  }
};

const handleMouseUp = () => {
  if (rectDragState.active) {
    pushUndo('Place game object');
    placeGameObjectRect(rectDragState.startX, rectDragState.startY,
                        rectDragState.endX, rectDragState.endY);
    setRectDragState({ active: false, ... });
  }
};
```
✅ Pattern already implemented for FLAG/WARP (stamp) and BUNKER/HOLDING_PEN (rect)

**4. GameObjectSystem Placement (GameObjectSystem.ts)**
```typescript
class GameObjectSystem {
  placeSpawn(map, x, y, team, spawnType): boolean { ... }
  placeSwitch(map, x, y, switchType): boolean { ... }
  placeConveyor(map, x1, y1, x2, y2, direction, data): boolean { ... }
  placeBridge(map, x1, y1, x2, y2, direction, data): boolean { ... }
}
```
✅ All placement logic already implemented (from SEdit map.cpp port)

**5. Tool Panel Options (GameObjectToolPanel.tsx)**
```typescript
const GameObjectToolPanel: React.FC = () => {
  const { currentTool, gameObjectToolState, setSpawnType, ... } = useEditorStore();

  if (currentTool === ToolType.SPAWN) {
    return <select value={spawnType} onChange={e => setSpawnType(Number(e.target.value))}>
      <option value={0}>Type 1</option>
      ...
    </select>;
  }
  // Similar for SWITCH, CONVEYOR
};
```
✅ Already renders contextual UI for each tool type

**6. Toolbar Buttons (ToolBar.tsx)**
```typescript
const tools: ToolButton[] = [
  { tool: ToolType.PENCIL, label: 'Pencil', icon: '✏', shortcut: 'B' },
  // ... (8 basic tools already in toolbar)
];

const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: '🚩', shortcut: 'F' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: '⛳', shortcut: 'P' },
  { tool: ToolType.WARP, label: 'Warp', icon: '◎', shortcut: 'T' },
  // SPAWN and SWITCH missing here
];

const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: '⊞', shortcut: 'K' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: '⊟', shortcut: 'N' },
  // BRIDGE and CONVEYOR missing here
];
```
⚠️ **Missing:** Toolbar button declarations for SPAWN, SWITCH, BRIDGE, CONVEYOR

## What's Missing

### 1. Toolbar Button Declarations

**File:** `src/components/ToolBar/ToolBar.tsx`

**Issue:** Tools are implemented everywhere except the toolbar UI array declarations.

**Fix:** Add to existing arrays:
```typescript
const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: '🚩', shortcut: 'F' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: '⛳', shortcut: 'P' },
  { tool: ToolType.WARP, label: 'Warp', icon: '◎', shortcut: 'T' },
  // ADD:
  { tool: ToolType.SPAWN, label: 'Spawn', icon: '🔵', shortcut: 'S' },  // or appropriate icon
  { tool: ToolType.SWITCH, label: 'Switch', icon: '⚡', shortcut: 'H' }, // or appropriate icon
];

const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: '⊞', shortcut: 'K' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: '⊟', shortcut: 'N' },
  // ADD:
  { tool: ToolType.BRIDGE, label: 'Bridge', icon: '🌉', shortcut: 'J' },
  { tool: ToolType.CONVEYOR, label: 'Conveyor', icon: '⇄', shortcut: 'C' },
];
```

**Impact:** Purely UI — no logic changes needed.

### 2. Canvas Cursor Preview Rendering

**File:** `src/components/MapCanvas/MapCanvas.tsx`

**Issue:** Draw loop has previews for FLAG/WARP/BUNKER but not SPAWN/SWITCH/BRIDGE/CONVEYOR.

**Current code (lines 293-361):**
```typescript
// Draw preview for game object stamp tools (3x3 outline at cursor)
const stampTools = new Set([ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH]);
// ✅ SPAWN and SWITCH already in this set!

// Draw rectangle outline during drag for rect tools
if (rectDragState.active) {
  // Validity check based on tool
  if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
      currentTool === ToolType.BRIDGE) {
    valid = w >= 3 && h >= 3;
  }
  if (currentTool === ToolType.CONVEYOR) {
    valid = w >= 2 && h >= 2;
  }
  // ✅ BRIDGE and CONVEYOR already handled!
}
```

**Status:** ✅ Already implemented correctly

### 3. Canvas Mouse Handler Integration

**File:** `src/components/MapCanvas/MapCanvas.tsx`

**Issue:** Mouse handlers explicitly list tool types in conditionals.

**Current code (lines 521-532, 577-582):**
```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
      currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH ||
      currentTool === ToolType.WARP) {
    // ✅ SPAWN and SWITCH already here
  }
  else if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
           currentTool === ToolType.BRIDGE || currentTool === ToolType.CONVEYOR ||
           currentTool === ToolType.WALL_RECT) {
    // ✅ BRIDGE and CONVEYOR already here
  }
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (e.buttons === 1 && !e.altKey) {
    if (currentTool !== ToolType.WALL && ... &&
        currentTool !== ToolType.SPAWN && currentTool !== ToolType.SWITCH &&
        currentTool !== ToolType.WARP && currentTool !== ToolType.BUNKER &&
        currentTool !== ToolType.HOLDING_PEN && currentTool !== ToolType.BRIDGE &&
        currentTool !== ToolType.CONVEYOR) {
      // ✅ All tools already listed in exclusion
    }
  }
};
```

**Status:** ✅ Already implemented correctly

### 4. EditorState Action Routing

**File:** `src/core/editor/EditorState.ts`

**Current code (lines 312-391):**
```typescript
placeGameObject: (x, y) => {
  switch (currentTool) {
    case ToolType.FLAG: ...
    case ToolType.FLAG_POLE: ...
    case ToolType.WARP: ...
    case ToolType.SPAWN:  // ✅ Already implemented
      success = gameObjectSystem.placeSpawn(map, x, y, selectedTeam, spawnType);
      break;
    case ToolType.SWITCH:  // ✅ Already implemented
      success = gameObjectSystem.placeSwitch(map, x, y, switchType);
      break;
  }
}

placeGameObjectRect: (x1, y1, x2, y2) => {
  switch (currentTool) {
    case ToolType.BUNKER: ...
    case ToolType.HOLDING_PEN: ...
    case ToolType.BRIDGE:  // ✅ Already implemented
      const bridgeData = bridgeDir === 0 ? bridgeLrData : bridgeUdData;
      success = gameObjectSystem.placeBridge(map, x1, y1, x2, y2, bridgeDir, bridgeData[0]);
      break;
    case ToolType.CONVEYOR:  // ✅ Already implemented
      const convData = conveyorDir === 0 ? convLrData : convUdData;
      success = gameObjectSystem.placeConveyor(map, x1, y1, x2, y2, conveyorDir, convData[0]);
      break;
    case ToolType.WALL_RECT: ...
  }
}
```

**Status:** ✅ Already implemented correctly

### 5. Tool Panel UI Options

**File:** `src/components/GameObjectToolPanel/GameObjectToolPanel.tsx`

**Current code:**
```typescript
const TEAM_TOOLS = new Set([
  ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.HOLDING_PEN
]);  // ✅ SPAWN already included

// Team selector renders for SPAWN (lines 59-65)
{TEAM_TOOLS.has(currentTool) && (
  <TeamSelector selectedTeam={selectedTeam} onTeamChange={setGameObjectTeam}
                allowNeutral={currentTool !== ToolType.SPAWN && ...} />
)}

// Spawn type dropdown (lines 68-81) ✅ Already implemented

// Switch type dropdown (lines 84-98) ✅ Already implemented

// Bridge direction dropdown (lines 188-200) ✅ Already implemented

// Conveyor direction dropdown (lines 203-215) ✅ Already implemented
```

**Status:** ✅ All UI already implemented

## Build Order (If Starting Fresh)

Based on dependencies, here's the order components WOULD be built (for reference):

1. **Core Types** → `types.ts` (ToolType enum, GameObjectToolState)
2. **Data Layer** → `GameObjectData.ts` (static tile arrays)
3. **Business Logic** → `GameObjectSystem.ts` (placement algorithms)
4. **State Management** → `EditorState.ts` (Zustand store with actions)
5. **UI Components** → `TeamSelector.tsx` (reusable team picker)
6. **Tool Options Panel** → `GameObjectToolPanel.tsx` (contextual settings)
7. **Toolbar Buttons** → `ToolBar.tsx` (tool selection)
8. **Canvas Interaction** → `MapCanvas.tsx` (mouse handlers + rendering)

**Critical path:** Types → Data → System → State → UI

## Recommended Implementation Order (Actual)

Since infrastructure exists, just activate the tools:

### Phase 1: Toolbar Activation (15 min)
1. Add SPAWN button to `gameObjectStampTools` array
2. Add SWITCH button to `gameObjectStampTools` array
3. Choose appropriate icons (Unicode or emoji)
4. Assign keyboard shortcuts (check for conflicts)

**Verification:** Buttons appear, clicking changes `currentTool` state

### Phase 2: Bridge/Conveyor Activation (15 min)
1. Add BRIDGE button to `gameObjectRectTools` array
2. Add CONVEYOR button to `gameObjectRectTools` array
3. Choose appropriate icons
4. Assign keyboard shortcuts

**Verification:** Buttons appear, tool options panel shows direction dropdown

### Phase 3: Custom.dat Loading (Already Done)
- `CustomDatParser.ts` already exists ✅
- `loadCustomDat` action already in EditorState ✅
- Tool panel already shows "Requires custom.dat" warning ✅

**Status:** No work needed

### Phase 4: Testing & Polish (30 min)
1. Test spawn placement with all 3 types
2. Test switch placement with custom.dat loaded
3. Test bridge/conveyor drag-to-rectangle
4. Verify team selection affects spawn correctly
5. Check cursor previews render correctly
6. Verify undo/redo works for all tools

## Architecture Patterns to Maintain

### 1. Centralized State (Zustand)
All editor state lives in `EditorState.ts`. No component-local state for editor concerns.

**Why:** Single source of truth, time-travel debugging via undo/redo

### 2. Stateless Systems (GameObjectSystem)
Pure functions that mutate MapData but hold no state themselves.

**Why:** Testable, portable to AC app, no memory leaks

### 3. Controlled Components (Tool Panel)
All form inputs get value from EditorState, call setters on change.

**Why:** Predictable data flow, no sync issues

### 4. Tool-Specific Rendering (MapCanvas)
Canvas draw loop checks `currentTool` and renders appropriate preview.

**Why:** Visual feedback before committing action

### 5. Undo Boundary at Actions (EditorState)
`pushUndo()` called before mutation, captures current state.

**Why:** Granular undo, user controls commit timing

## Data Flow Examples

### Example 1: Placing a Spawn Point

```
1. User clicks "Spawn" toolbar button
   → ToolBar.tsx calls setTool(ToolType.SPAWN)

2. EditorState.currentTool updates to SPAWN
   → All components re-render

3. GameObjectToolPanel sees SPAWN tool
   → Renders team selector + type dropdown

4. User selects "Red" team, "Type 2"
   → Calls setGameObjectTeam(Team.RED) and setSpawnType(1)
   → EditorState.gameObjectToolState updates

5. User moves cursor over canvas
   → MapCanvas.handleMouseMove updates cursorTile state
   → Draw loop renders 3x3 preview outline at cursor

6. User clicks canvas at (50, 50)
   → MapCanvas.handleMouseDown calls:
     - pushUndo('Place game object')
     - placeGameObject(50, 50)

7. EditorState.placeGameObject executes:
   → Switch on currentTool → SPAWN case
   → Calls gameObjectSystem.placeSpawn(map, 50, 50, Team.RED, 1)

8. GameObjectSystem.placeSpawn:
   → Calculates spawn data index: team * 3 + type = 1 * 3 + 1 = 4
   → Gets tiles from spawnData[4] (from custom.dat)
   → Calls stamp3x3 to place 9 tiles at (50,50)
   → Sets map.modified = true

9. EditorState updates map reference
   → Triggers re-render

10. MapCanvas.draw renders updated tiles
    → Spawn point now visible on map
```

### Example 2: Placing a Conveyor (Drag-to-Rectangle)

```
1. User clicks "Conveyor" toolbar button
   → ToolBar.tsx calls setTool(ToolType.CONVEYOR)

2. User selects "Horizontal" direction
   → GameObjectToolPanel calls setConveyorDirection(0)
   → EditorState.gameObjectToolState.conveyorDir = 0

3. User presses mouse down at (10, 10)
   → MapCanvas.handleMouseDown:
     - Tool is CONVEYOR (rect tool)
     - Calls setRectDragState({ active: true, startX: 10, startY: 10, endX: 10, endY: 10 })

4. User drags to (15, 15)
   → MapCanvas.handleMouseMove:
     - rectDragState.active is true
     - Calls setRectDragState({ endX: 15, endY: 15 })
   → Draw loop renders dashed rectangle outline
   → Shows "6x6" dimension label
   → Green outline (valid size)

5. User releases mouse
   → MapCanvas.handleMouseUp:
     - Calls pushUndo('Place game object')
     - Calls placeGameObjectRect(10, 10, 15, 15)
     - Calls setRectDragState({ active: false, ... })

6. EditorState.placeGameObjectRect executes:
   → Switch on currentTool → CONVEYOR case
   → Gets convData = convLrData[0] (horizontal)
   → Calls gameObjectSystem.placeConveyor(map, 10, 10, 15, 15, 0, convData)

7. GameObjectSystem.placeConveyor:
   → Calculates rect: minX=10, minY=10, w=6, h=6
   → Validates: w >= 2, h >= 2 ✓
   → Iterates 6x6 grid
   → For each position, calculates tile from pattern:
     - Edge tiles use data[0], data[3]
     - Interior tiles use data[1], data[2] with alternation
   → Places all tiles
   → Sets map.modified = true

8. EditorState updates map reference
   → MapCanvas re-renders with conveyor tiles
```

## Critical Integration Points

### Point 1: Tool Type Enum
**File:** `src/core/map/types.ts:101-124`
**Status:** ✅ Complete
**Responsibility:** Define all possible tool types
**Consumers:** EditorState, MapCanvas, ToolBar, GameObjectToolPanel

### Point 2: GameObjectToolState
**File:** `src/core/map/types.ts:126-139`
**Status:** ✅ Complete
**Responsibility:** Store current settings for each tool (team, direction, type, etc.)
**Consumers:** EditorState, GameObjectToolPanel

### Point 3: EditorState Actions
**File:** `src/core/editor/EditorState.ts:109-123`
**Status:** ✅ Complete
**Responsibility:** Expose setters for tool options
**Consumers:** GameObjectToolPanel (calls setters), MapCanvas (reads state)

### Point 4: Placement Actions
**File:** `src/core/editor/EditorState.ts:122-124`
**Status:** ✅ Complete
**Responsibility:** Route tool click/drag to correct GameObjectSystem method
**Consumers:** MapCanvas mouse handlers

### Point 5: GameObjectSystem Methods
**File:** `src/core/map/GameObjectSystem.ts`
**Status:** ✅ Complete (all 10 placement methods implemented)
**Responsibility:** Pure placement logic from SEdit
**Consumers:** EditorState placement actions

### Point 6: Custom.dat Data
**File:** `src/core/map/GameObjectData.ts:82-91`
**Status:** ✅ Complete (mutable arrays, parser integration)
**Responsibility:** Provide tile data for spawn/switch/bridge/conveyor
**Consumers:** GameObjectSystem placement methods

### Point 7: Toolbar Button Arrays
**File:** `src/components/ToolBar/ToolBar.tsx:19-44`
**Status:** ⚠️ Missing 4 button declarations
**Responsibility:** Render clickable tool buttons
**Consumers:** User (clicks to activate tools)

### Point 8: Canvas Mouse Handlers
**File:** `src/components/MapCanvas/MapCanvas.tsx:500-643`
**Status:** ✅ Complete (already handles all tool types)
**Responsibility:** Translate mouse events to tool actions
**Consumers:** EditorState actions

### Point 9: Canvas Rendering
**File:** `src/components/MapCanvas/MapCanvas.tsx:124-362`
**Status:** ✅ Complete (previews for all tool types)
**Responsibility:** Draw cursor previews and drag rectangles
**Consumers:** Visual feedback loop

### Point 10: Tool Options Panel
**File:** `src/components/GameObjectToolPanel/GameObjectToolPanel.tsx`
**Status:** ✅ Complete (all tool UIs implemented)
**Responsibility:** Render contextual settings for current tool
**Consumers:** User (changes settings before placing)

## Anti-Patterns to Avoid

### 1. Component State for Editor Concerns
**Don't:**
```typescript
const [selectedTeam, setSelectedTeam] = useState(Team.GREEN);
```
**Do:**
```typescript
const { gameObjectToolState } = useEditorStore();
const { selectedTeam } = gameObjectToolState;
```
**Why:** Zustand state survives component unmount, enables undo/redo

### 2. Direct MapData Mutation in Components
**Don't:**
```typescript
// In MapCanvas.tsx
map.tiles[y * MAP_WIDTH + x] = tileId;
```
**Do:**
```typescript
// In MapCanvas.tsx
setTile(x, y, tileId);  // Calls EditorState action
```
**Why:** Actions trigger re-renders, undo, modification tracking

### 3. Tool Logic in Canvas Component
**Don't:**
```typescript
// In MapCanvas.tsx
const placeSpawn = (x, y) => {
  const team = gameObjectToolState.selectedTeam;
  const data = spawnData[team * 3 + spawnType];
  // ... stamp logic
};
```
**Do:**
```typescript
// In MapCanvas.tsx
placeGameObject(x, y);  // Delegates to EditorState → GameObjectSystem
```
**Why:** Business logic in portable src/core/, UI in src/components/

### 4. Hardcoded Tool Lists
**Don't:**
```typescript
if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
    currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH) {
  // Stamp tools
}
```
**Do:**
```typescript
const STAMP_TOOLS = new Set([ToolType.FLAG, ToolType.FLAG_POLE,
                              ToolType.SPAWN, ToolType.SWITCH]);
if (STAMP_TOOLS.has(currentTool)) { ... }
```
**Why:** Easier to maintain, self-documenting

### 5. Missing Undo Boundary
**Don't:**
```typescript
const handleMouseDown = () => {
  placeGameObject(x, y);  // No undo push
};
```
**Do:**
```typescript
const handleMouseDown = () => {
  pushUndo('Place game object');
  placeGameObject(x, y);
};
```
**Why:** User loses undo capability for that action

## Testing Strategy

### Unit Tests (Portable Core)
- `GameObjectSystem.placeSpawn()` with all team/type combos
- `GameObjectSystem.placeConveyor()` with LR/UD directions
- `GameObjectData` custom.dat parsing
- Wall connection updates for holding pen borders

### Integration Tests (Component)
- Tool button click → currentTool state change
- Team selector change → gameObjectToolState update
- Canvas click → correct placement action called
- Undo/redo preserves gameObjectToolState

### E2E Tests (User Flow)
1. New map → SPAWN tool → select team → click canvas → verify 3x3 placement
2. Load custom.dat → SWITCH tool → select type → click canvas → verify tiles
3. CONVEYOR tool → select horizontal → drag 10x3 rect → verify pattern
4. BRIDGE tool → select vertical → drag 4x8 rect → verify edge tiles
5. Undo after spawn → verify tiles revert → redo → verify tiles return

## Performance Considerations

### 1. Canvas Rendering
- Current: Renders visible tiles only (viewport culling)
- Impact: Negligible for new tools (same tile count)

### 2. Undo Stack
- Current: Stores full tile array copy (Uint16Array 131KB)
- Impact: 4 new tools don't increase memory (same undo mechanism)

### 3. Tool Panel Re-renders
- Current: Renders only when currentTool or gameObjectToolState changes
- Impact: Negligible (conditional rendering already optimized)

### 4. Custom.dat Loading
- Current: One-time parse, stores in module-level arrays
- Impact: None (already implemented and cached)

## Known Limitations

### 1. Custom.dat Required for 4 Tools
**Tools:** SPAWN, SWITCH, BRIDGE, CONVEYOR
**Workaround:** Tool panel shows warning, placement fails gracefully
**Future:** Bundle default custom.dat in assets/

### 2. No Multi-Selection Placement
**Current:** Tools place one object at a time
**SEdit:** Also one-at-a-time (no multi-select)
**Impact:** Feature parity maintained

### 3. No Object Deletion Tool
**Current:** Eraser deletes tiles but doesn't track "object boundaries"
**SEdit:** Same behavior (tile-based, not object-based)
**Impact:** Not a regression

### 4. Bridge/Conveyor Require 15/8 Data Tiles
**Current:** Uses first data array entry only
**SEdit:** Supports multiple bridge/conveyor styles in custom.dat
**Future:** Add style selector dropdown (data already supports it)

## Summary

**Architecture Status:** ✅ **99% Complete**

The editor's architecture is remarkably complete. All the hard work is done:
- State management ✅
- Business logic ✅
- UI components ✅
- Mouse interaction ✅
- Rendering ✅

**Missing:** Just toolbar button declarations (4 lines of code per tool).

**Integration Complexity:** **TRIVIAL**
- No new components needed
- No new patterns needed
- No architecture changes needed
- Just activating existing infrastructure

**Estimated Effort:** 1 hour to add buttons + test thoroughly

**Confidence:** HIGH — Infrastructure is proven (works for FLAG, WARP, BUNKER, HOLDING_PEN)
