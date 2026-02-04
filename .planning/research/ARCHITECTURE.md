# Architecture Patterns: SELECT Tool and Animation Panel Redesign

**Domain:** Electron/React Tile Map Editor
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

This document analyzes integration patterns for adding SELECT tool with clipboard/transforms and redesigning the Animation Panel in the existing AC Map Editor architecture. The editor uses Zustand for state, Canvas API for rendering, and a clear separation between state logic (EditorState), pure placement functions (GameObjectSystem), and UI rendering (MapCanvas).

**Key findings:**
- SELECT tool requires **3 new state objects** in EditorState
- **13 new actions** for selection/clipboard/transforms
- **2 new rendering passes** in MapCanvas draw loop
- **Keyboard shortcuts** integrate into existing ToolBar pattern
- Animation Panel redesign needs **minimal changes** (add radio toggle, modify click handler)
- **Zero new components** required — all features integrate into existing architecture

## Current Architecture Overview

### Component Boundaries

| Component | Responsibility | State Access | Mutability |
|-----------|---------------|--------------|------------|
| **EditorState** (Zustand) | Central state management | Global store | Mutable via actions |
| **GameObjectSystem** | Pure placement logic | Receives MapData | Mutates MapData directly |
| **MapCanvas** | Rendering + mouse interaction | Reads state, calls actions | Read-only |
| **ToolBar** | Tool selection UI | Reads currentTool, calls setTool | Read-only |
| **AnimationPanel** | Animation selection UI | Reads animationFrame, calls setSelectedTile | Read-only |
| **MapSettingsDialog** | Header editing UI | Calls updateMapHeader | Read-only |

### Data Flow Pattern

```
User Input (MapCanvas mouse event)
  → EditorState action (e.g., setTile, placeWall)
    → Mutate MapData.tiles directly
      → Trigger Zustand state update
        → React re-renders (MapCanvas draws new state)
```

### Existing Undo/Redo System

Current pattern:
1. Before mutation: `pushUndo('description')` captures current tile state
2. Perform mutation: `map.tiles[index] = value`
3. Mark modified: `map.modified = true`
4. Update state: `set({ map: { ...map } })`

Undo/redo stores **entire tile arrays** (65536 tiles × 2 bytes = 131KB per snapshot, max 50 levels = 6.5MB max).

## SELECT Tool Architecture

### New State Requirements

Add to EditorState interface (in `src/core/editor/EditorState.ts`):

```typescript
// Selection state (rectangle bounds)
interface SelectionState {
  active: boolean;
  startX: number;  // Tile coordinates
  startY: number;
  endX: number;
  endY: number;
}

// Clipboard state (copied tile data)
interface ClipboardState {
  tiles: Uint16Array;  // Flat array of tile values
  width: number;
  height: number;
  isEmpty: boolean;
}

// Floating paste state (semi-transparent preview)
interface FloatingPasteState {
  active: boolean;
  x: number;  // Current mouse position in tile coords
  y: number;
  clipboardWidth: number;
  clipboardHeight: number;
}

// Add to EditorState:
interface EditorState {
  // ... existing fields
  selectionState: SelectionState;
  clipboardState: ClipboardState;
  floatingPasteState: FloatingPasteState;

  // Actions (13 new)
  setSelection: (x1: number, y1: number, x2: number, y2: number) => void;
  clearSelection: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (x: number, y: number) => void;
  deleteSelection: () => void;
  mirrorSelectionH: () => void;
  mirrorSelectionV: () => void;
  rotateSelection90: () => void;
  startFloatingPaste: () => void;
  updateFloatingPastePosition: (x: number, y: number) => void;
  commitFloatingPaste: () => void;
  cancelFloatingPaste: () => void;
}
```

### Integration Points

#### 1. MapCanvas Mouse Handlers

**SELECT tool behavior** (add to `src/components/MapCanvas/MapCanvas.tsx`):

```typescript
// In handleMouseDown (e.button === 0, currentTool === ToolType.SELECT):
if (currentTool === ToolType.SELECT) {
  if (!selectionState.active) {
    // Start new selection
    setSelection(x, y, x, y);
  } else if (isInsideSelection(x, y)) {
    // Click inside existing selection: could add drag-move in future
    // For Phase 1: just start new selection
    clearSelection();
    setSelection(x, y, x, y);
  } else {
    // Click outside: clear and start new selection
    clearSelection();
    setSelection(x, y, x, y);
  }
}

// In handleMouseMove (selectionState.active && currentTool === ToolType.SELECT):
if (selectionState.active && e.buttons === 1 && currentTool === ToolType.SELECT) {
  // Update selection end position
  setSelection(selectionState.startX, selectionState.startY, x, y);
}

// In handleMouseUp:
// Finalize selection (no action needed, just stop dragging)
```

**Floating paste behavior**:

```typescript
// When Ctrl+V pressed and clipboard not empty:
startFloatingPaste(); // Activates floatingPasteState

// In handleMouseMove (floatingPasteState.active):
if (floatingPasteState.active) {
  updateFloatingPastePosition(x, y);
}

// In handleMouseDown (floatingPasteState.active):
if (floatingPasteState.active) {
  if (e.button === 0) {
    commitFloatingPaste(); // Write tiles, push undo, clear floating state
  } else {
    cancelFloatingPaste(); // Just clear floating state
  }
  return; // Don't process other tool logic
}

// On Escape key:
cancelFloatingPaste();
```

#### 2. Rendering in MapCanvas.draw()

Add three rendering passes (insert after drawing tiles and grid, before cursor highlight):

```typescript
// Add to MapCanvas.draw() around line 260:

// 1. Draw selection rectangle (marching ants)
if (selectionState.active) {
  const marchingAntsOffset = (Date.now() / 50) % 16; // Animate dashes
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -marchingAntsOffset;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  const minX = Math.min(selectionState.startX, selectionState.endX);
  const minY = Math.min(selectionState.startY, selectionState.endY);
  const w = Math.abs(selectionState.endX - selectionState.startX) + 1;
  const h = Math.abs(selectionState.endY - selectionState.startY) + 1;

  const screen = tileToScreen(minX, minY);
  ctx.strokeRect(screen.x, screen.y, w * tilePixels, h * tilePixels);
  ctx.setLineDash([]); // Reset
}

// 2. Draw floating paste preview (semi-transparent)
if (floatingPasteState.active && !clipboardState.isEmpty) {
  ctx.globalAlpha = 0.6;
  for (let py = 0; py < clipboardState.height; py++) {
    for (let px = 0; px < clipboardState.width; px++) {
      const tile = clipboardState.tiles[py * clipboardState.width + px];
      const screenX = (floatingPasteState.x + px - viewport.x) * tilePixels;
      const screenY = (floatingPasteState.y + py - viewport.y) * tilePixels;

      // Draw tile from tileset (handle animated tiles)
      if (tilesetImage) {
        const isAnimated = (tile & 0x8000) !== 0;
        if (isAnimated) {
          const animId = tile & 0xFF;
          const frameOffset = (tile >> 8) & 0x7F;
          const anim = ANIMATION_DEFINITIONS[animId];
          if (anim && anim.frames.length > 0) {
            const frameIdx = (animationFrame + frameOffset) % anim.frameCount;
            const displayTile = anim.frames[frameIdx] || 0;
            const srcX = (displayTile % TILES_PER_ROW) * TILE_SIZE;
            const srcY = Math.floor(displayTile / TILES_PER_ROW) * TILE_SIZE;
            ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
              screenX, screenY, tilePixels, tilePixels);
          }
        } else {
          const srcX = (tile % TILES_PER_ROW) * TILE_SIZE;
          const srcY = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
          ctx.drawImage(tilesetImage, srcX, srcY, TILE_SIZE, TILE_SIZE,
            screenX, screenY, tilePixels, tilePixels);
        }
      }
    }
  }
  ctx.globalAlpha = 1.0; // Restore

  // Draw outline around floating paste
  const screen = tileToScreen(floatingPasteState.x, floatingPasteState.y);
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.strokeRect(screen.x, screen.y,
    clipboardState.width * tilePixels,
    clipboardState.height * tilePixels);
}
```

#### 3. Keyboard Shortcuts

Add to ToolBar keyboard handler (in `src/components/ToolBar/ToolBar.tsx`):

```typescript
// In handleKeyDown (around line 228):
if (e.ctrlKey || e.metaKey) {
  switch (e.key.toLowerCase()) {
    // ... existing Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Z, Ctrl+Y
    case 'c':
      e.preventDefault();
      if (selectionState.active) copySelection();
      break;
    case 'x':
      e.preventDefault();
      if (selectionState.active) cutSelection();
      break;
    case 'v':
      e.preventDefault();
      if (!clipboardState.isEmpty) startFloatingPaste();
      break;
    case 'd':
      e.preventDefault();
      if (selectionState.active) clearSelection();
      break;
  }
} else if (e.key === 'Delete' || e.key === 'Backspace') {
  if (selectionState.active) {
    e.preventDefault();
    deleteSelection();
  }
} else if (e.key === 'Escape') {
  if (floatingPasteState.active) {
    e.preventDefault();
    cancelFloatingPaste();
  } else if (selectionState.active) {
    e.preventDefault();
    clearSelection();
  }
}
```

### Transform Operations Implementation

```typescript
// Add to EditorState actions (in src/core/editor/EditorState.ts):

// Mirror Horizontal
mirrorSelectionH: () => {
  const { map, selectionState } = get();
  if (!selectionState.active || !map) return;

  const minX = Math.min(selectionState.startX, selectionState.endX);
  const minY = Math.min(selectionState.startY, selectionState.endY);
  const w = Math.abs(selectionState.endX - selectionState.startX) + 1;
  const h = Math.abs(selectionState.endY - selectionState.startY) + 1;

  pushUndo('Mirror Horizontal');

  // Copy selected region to temp buffer
  const temp = new Uint16Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const srcIdx = (minY + py) * MAP_WIDTH + (minX + px);
      temp[py * w + px] = map.tiles[srcIdx];
    }
  }

  // Write back mirrored
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const srcIdx = py * w + (w - 1 - px); // Mirror X
      const dstIdx = (minY + py) * MAP_WIDTH + (minX + px);
      map.tiles[dstIdx] = temp[srcIdx];
    }
  }

  map.modified = true;
  set({ map: { ...map } });
},

// Mirror Vertical (similar pattern, mirror Y)
mirrorSelectionV: () => {
  // Similar to mirrorSelectionH but srcIdx = (h - 1 - py) * w + px
},

// Rotate 90° clockwise
rotateSelection90: () => {
  const { map, selectionState, clipboardState } = get();
  if (!selectionState.active || !map) return;

  const minX = Math.min(selectionState.startX, selectionState.endX);
  const minY = Math.min(selectionState.startY, selectionState.endY);
  const w = Math.abs(selectionState.endX - selectionState.startX) + 1;
  const h = Math.abs(selectionState.endY - selectionState.startY) + 1;

  // Copy selection to temp
  const temp = new Uint16Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const srcIdx = (minY + py) * MAP_WIDTH + (minX + px);
      temp[py * w + px] = map.tiles[srcIdx];
    }
  }

  // Rotate 90° clockwise: newX = oldY, newY = w - 1 - oldX
  // Result dimensions: h×w
  const rotated = new Uint16Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const newX = py;
      const newY = w - 1 - px;
      rotated[newY * h + newX] = temp[py * w + px];
    }
  }

  // Copy to clipboard (dimensions changed, can't rotate in-place for non-square)
  set({
    clipboardState: {
      tiles: rotated,
      width: h,
      height: w,
      isEmpty: false
    }
  });

  // Clear selection
  set({ selectionState: { ...selectionState, active: false } });
}
```

### EditorState Action Implementations

```typescript
// Copy selection
copySelection: () => {
  const { map, selectionState } = get();
  if (!selectionState.active || !map) return;

  const minX = Math.min(selectionState.startX, selectionState.endX);
  const minY = Math.min(selectionState.startY, selectionState.endY);
  const w = Math.abs(selectionState.endX - selectionState.startX) + 1;
  const h = Math.abs(selectionState.endY - selectionState.startY) + 1;

  const tiles = new Uint16Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const srcIdx = (minY + py) * MAP_WIDTH + (minX + px);
      tiles[py * w + px] = map.tiles[srcIdx];
    }
  }

  set({
    clipboardState: {
      tiles,
      width: w,
      height: h,
      isEmpty: false
    }
  });
},

// Cut selection (copy + delete)
cutSelection: () => {
  const { copySelection, deleteSelection } = get();
  copySelection();
  deleteSelection();
},

// Delete selection (fill with DEFAULT_TILE)
deleteSelection: () => {
  const { map, selectionState, pushUndo } = get();
  if (!selectionState.active || !map) return;

  pushUndo('Delete selection');

  const minX = Math.min(selectionState.startX, selectionState.endX);
  const minY = Math.min(selectionState.startY, selectionState.endY);
  const maxX = Math.max(selectionState.startX, selectionState.endX);
  const maxY = Math.max(selectionState.startY, selectionState.endY);

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      map.tiles[py * MAP_WIDTH + px] = DEFAULT_TILE;
    }
  }

  map.modified = true;
  set({ map: { ...map } });
},

// Start floating paste
startFloatingPaste: () => {
  const { clipboardState } = get();
  if (clipboardState.isEmpty) return;

  set({
    floatingPasteState: {
      active: true,
      x: 0,
      y: 0,
      clipboardWidth: clipboardState.width,
      clipboardHeight: clipboardState.height
    }
  });
},

// Update floating paste position
updateFloatingPastePosition: (x, y) => {
  const { floatingPasteState } = get();
  if (!floatingPasteState.active) return;

  set({
    floatingPasteState: {
      ...floatingPasteState,
      x,
      y
    }
  });
},

// Commit floating paste
commitFloatingPaste: () => {
  const { map, clipboardState, floatingPasteState, pushUndo } = get();
  if (!floatingPasteState.active || clipboardState.isEmpty || !map) return;

  pushUndo('Paste');

  const { x: startX, y: startY } = floatingPasteState;
  for (let py = 0; py < clipboardState.height; py++) {
    for (let px = 0; px < clipboardState.width; px++) {
      const mapX = startX + px;
      const mapY = startY + py;
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        const tile = clipboardState.tiles[py * clipboardState.width + px];
        map.tiles[mapY * MAP_WIDTH + mapX] = tile;
      }
    }
  }

  map.modified = true;
  set({
    map: { ...map },
    floatingPasteState: { active: false, x: 0, y: 0, clipboardWidth: 0, clipboardHeight: 0 }
  });
},

// Cancel floating paste
cancelFloatingPaste: () => {
  set({
    floatingPasteState: { active: false, x: 0, y: 0, clipboardWidth: 0, clipboardHeight: 0 }
  });
}
```

## Animation Panel Redesign Architecture

### Current Implementation Analysis

The existing AnimationPanel (`src/components/AnimationPanel/AnimationPanel.tsx`) already implements:
- Canvas rendering with vertical scrolling list
- 16×16px preview tiles
- Toggle between "all 256" and "defined only" animations
- Offset slider (0-127) for frame offset
- Click to select, button to place on map
- Animated previews using requestAnimationFrame

### Redesign Requirements

From milestone context:
- **Tile/Anim radio toggle**: Place first frame as static tile vs placing animated tile
- **Existing offset field**: Already implemented as slider

### Proposed Changes

**Minimal modifications required** (in `src/components/AnimationPanel/AnimationPanel.tsx`):

```typescript
// Add selection mode state (line ~24):
const [selectionMode, setSelectionMode] = useState<'tile' | 'anim'>('anim');

// Modify panel header to include radio toggle (lines 200-214):
<div className="panel-header">
  Animations
  <div className="mode-toggle">
    <label>
      <input
        type="radio"
        value="tile"
        checked={selectionMode === 'tile'}
        onChange={(e) => setSelectionMode(e.target.value as 'tile' | 'anim')}
      />
      Tile
    </label>
    <label>
      <input
        type="radio"
        value="anim"
        checked={selectionMode === 'anim'}
        onChange={(e) => setSelectionMode(e.target.value as 'tile' | 'anim')}
      />
      Anim
    </label>
  </div>
  <button className="toggle-button" ...>
</div>

// Modify handlePlaceAnimation to switch behavior (lines 183-192):
const handlePlaceAnimation = () => {
  if (selectedAnimId === null) return;

  const anim = ANIMATION_DEFINITIONS[selectedAnimId];
  if (!anim || anim.frames.length === 0) return;

  if (selectionMode === 'tile') {
    // Place first frame as static tile
    setSelectedTile(anim.frames[0]);
  } else {
    // Place as animated tile (existing behavior)
    const animatedTile = ANIMATED_FLAG | (frameOffset << 8) | selectedAnimId;
    setSelectedTile(animatedTile);
  }
};
```

**No architectural changes needed.** The AnimationPanel is already a self-contained component that:
- Manages its own scroll/hover state
- Renders to canvas for performance
- Calls EditorState actions (setSelectedTile) to update map
- Uses existing animation data (ANIMATION_DEFINITIONS)

## Component Dependencies

### New Components Needed

**None.** All features integrate into existing components.

### Modified Components

| Component | Modifications | Lines Changed |
|-----------|--------------|---------------|
| types.ts | Add SelectionState, ClipboardState, FloatingPasteState | ~30 lines |
| EditorState.ts | Add 3 state objects + 13 actions | ~200 lines |
| MapCanvas.tsx | Add selection/floating paste rendering + mouse handlers | ~100 lines |
| ToolBar.tsx | Add keyboard shortcuts (Ctrl+C/X/V/D, Delete, Escape) | ~25 lines |
| AnimationPanel.tsx | Add Tile/Anim radio toggle, modify place handler | ~30 lines |

### Unchanged Components

- GameObjectSystem (no selection logic needed)
- WallSystem
- MapSettingsDialog
- TilePalette
- GameObjectToolPanel

## Build Order Recommendation

### Phase 1: Core Selection (Day 1)

1. Add state interfaces to `src/core/map/types.ts`
2. Add selectionState to EditorState with initial state
3. Implement setSelection, clearSelection actions
4. Add selection rectangle drawing in MapCanvas.draw()
5. Add SELECT tool to ToolBar tools array
6. Add mouse handlers for rectangle selection in MapCanvas
7. **Test:** Select, drag, release, clear selection

**Deliverable:** Working rectangle selection with marching ants

### Phase 2: Clipboard Operations (Day 2)

1. Add clipboardState to EditorState
2. Implement copySelection, cutSelection, deleteSelection actions
3. Add keyboard shortcuts (Ctrl+C/X, Delete) to ToolBar
4. **Test:** Select tiles, copy, cut, delete

**Deliverable:** Clipboard operations work, no visual paste yet

### Phase 3: Floating Paste (Day 3)

1. Add floatingPasteState to EditorState
2. Implement startFloatingPaste, updateFloatingPastePosition actions
3. Implement commitFloatingPaste, cancelFloatingPaste actions
4. Add floating paste rendering in MapCanvas.draw()
5. Add paste mouse/keyboard handlers
6. Add Ctrl+V shortcut
7. **Test:** Copy, move cursor, paste, see preview, click to commit

**Deliverable:** Full copy-paste workflow with preview

### Phase 4: Transforms (Day 4)

1. Implement mirrorSelectionH, mirrorSelectionV actions
2. Implement rotateSelection90 action
3. Add transform keyboard shortcuts or toolbar buttons
4. **Test:** Select region, mirror/rotate, verify correct transformation

**Deliverable:** Transform operations work correctly

### Phase 5: Animation Panel Redesign (Day 5)

1. Add selectionMode state to AnimationPanel
2. Add Tile/Anim radio toggle to UI
3. Modify handlePlaceAnimation to switch behavior
4. Add CSS for radio toggle
5. **Test:** Toggle modes, verify tile vs anim placement

**Deliverable:** Animation panel supports tile/anim modes

## Architectural Patterns to Follow

### 1. State Mutation Pattern

Continue existing pattern:
- State lives in Zustand store
- Actions mutate MapData directly
- Trigger re-render with `set({ map: { ...map } })`
- Works because shallow copy forces React update

### 2. Undo Pattern

For all selection operations:
```typescript
// Before mutation:
pushUndo('Operation description');

// Perform mutation:
map.tiles[index] = newValue;

// Mark modified:
map.modified = true;

// Update state:
set({ map: { ...map } });
```

### 3. Keyboard Shortcut Pattern

Existing pattern in ToolBar:
- Single useEffect hook listens to window keydown
- Check modifiers first (Ctrl/Meta)
- Prevent default for captured keys
- Call EditorState actions directly

### 4. Canvas Rendering Pattern

Existing pattern in MapCanvas:
- Single draw() function renders all layers
- Called on state changes via useEffect([draw])
- Rendering order: tiles → grid → selection → floating → cursor
- Use tileToScreen() for coordinate conversion

## Scalability Considerations

| Concern | At Current (256×256) | With SELECT Tool | With Large Selections |
|---------|---------------------|-----------------|---------------------|
| State size | ~131KB per map | +262KB clipboard (worst case) | Same (clipboard is copy of selection) |
| Render performance | 60fps at 1x zoom | 60fps (marching ants add 1 strokeRect) | 60fps (floating paste draws only visible tiles) |
| Undo stack | 50 levels × 131KB = 6.5MB | Same (clipboard not in undo) | Same |
| Memory | Low | Low | Low (clipboard released on paste commit) |

**No performance concerns.** Selection state is 5 integers, clipboard is temporary, rendering adds minimal overhead.

## Anti-Patterns to Avoid

### 1. DO NOT Store Selection in MapData

**Wrong:**
```typescript
interface MapData {
  tiles: Uint16Array;
  selection: SelectionState; // NO - selection is editor state, not map data
}
```

**Correct:**
```typescript
interface EditorState {
  map: MapData | null;
  selectionState: SelectionState; // YES - selection is ephemeral UI state
}
```

**Why:** Selection is editor state, not map data. Belongs in EditorState, not saved with map files.

### 2. DO NOT Copy Selection State Into Undo

**Wrong:**
```typescript
pushUndo: (description) => {
  const action = {
    tiles: new Uint16Array(map.tiles),
    selection: selectionState // NO - don't save selection in undo
  };
}
```

**Correct:**
```typescript
// Selection cleared by undo/redo is acceptable behavior
undo: () => {
  // ... restore tiles
  clearSelection(); // Clear selection on undo
}
```

**Why:** Undo/redo affects map tiles only. Selection state is ephemeral UI state that doesn't need restoration.

### 3. DO NOT Render Selection in GameObjectSystem

**Wrong:**
```typescript
// In GameObjectSystem
renderSelection(map, selectionState) { // NO - rendering doesn't belong here
  // Drawing logic here
}
```

**Correct:**
```typescript
// In MapCanvas.draw()
if (selectionState.active) {
  // Render marching ants here
}
```

**Why:** GameObjectSystem is for pure placement logic, not rendering. Rendering belongs in MapCanvas.

### 4. DO NOT Use Separate Canvas for Floating Paste

**Wrong:**
```typescript
<canvas ref={floatingPasteCanvas} className="floating-paste-layer" />
```

**Correct:**
```typescript
// Single canvas, render floating paste as overlay in draw()
if (floatingPasteState.active) {
  ctx.globalAlpha = 0.6;
  // Draw tiles from clipboard
}
```

**Why:** Separate canvas adds complexity, layering issues, coordinate sync problems. Single canvas with alpha blending is simpler and more performant.

## Known Limitations

### 1. Rotation Changes Dimensions

Rotating non-square selections changes dimensions (w×h → h×w).

**Solution:** Copy rotated result to clipboard instead of in-place rotation. User can then paste wherever they want.

**Rationale:** Better UX than restricting rotation to square selections only.

### 2. Marching Ants on Large Selections

Marching ants draw single rectangle around entire selection. For very large selections (e.g., 200×200 tiles), the dashed line may appear to animate slowly due to path length.

**Mitigation:** Acceptable. Large selections are rare in 256×256 maps. Animation still visible and smooth.

### 3. Clipboard Not Persistent

Clipboard state is in-memory only. Cleared on map close or app restart.

**Future enhancement:** Could serialize to localStorage or system clipboard API.

### 4. No Multi-Selection

Current implementation supports single rectangular selection only. No polygon selections, magic wand, etc.

**Rationale:** Matches behavior of similar tile editors (Tiled, SEDIT). Rectangular selection covers 95% of use cases.

## Integration Checklist

Before implementation:

- [ ] Add new interfaces to types.ts (SelectionState, ClipboardState, FloatingPasteState)
- [ ] Extend EditorState interface with new state + 13 actions
- [ ] Implement state initialization in useEditorStore create()
- [ ] Implement 13 actions in EditorState.ts (pure state logic)
- [ ] Add SELECT tool button to ToolBar tools array
- [ ] Modify MapCanvas mouse handlers (handleMouseDown/Move/Up/Leave)
- [ ] Add selection/floating rendering passes to MapCanvas.draw()
- [ ] Add keyboard shortcuts to ToolBar handleKeyDown
- [ ] Add Tile/Anim toggle to AnimationPanel UI
- [ ] Modify AnimationPanel handlePlaceAnimation behavior
- [ ] Write unit tests for transform operations (mirror, rotate)
- [ ] Test undo/redo with clipboard operations
- [ ] Test floating paste escape/cancel behavior

## Architecture Quality Gates

Selection state management:
- [ ] Selection state is editor-only (not in MapData)
- [ ] Selection cleared on map load/close
- [ ] Selection survives tool switches (can select, switch to pencil, switch back)

Clipboard operations:
- [ ] Copy/cut operations trigger no undo (they're non-destructive)
- [ ] Delete selection triggers undo
- [ ] Paste triggers undo
- [ ] Clipboard survives tool switches
- [ ] Clipboard contains correct tile data (not references)

Floating paste:
- [ ] Floating paste is cancelable (Escape or right-click)
- [ ] Floating paste shows semi-transparent preview (alpha 0.6)
- [ ] Floating paste follows cursor correctly
- [ ] Floating paste commits on left-click
- [ ] Floating paste handles map edges (doesn't paste out of bounds)

Marching ants:
- [ ] Animate smoothly (60fps)
- [ ] White dashed line visible on all backgrounds
- [ ] Animation phase independent of other timers

Transforms:
- [ ] Mirror H/V preserve tile data correctly
- [ ] Rotate copies to clipboard (doesn't destroy selection)
- [ ] Transforms trigger undo
- [ ] Transforms handle animated tiles correctly (preserve flags/offsets)

Keyboard shortcuts:
- [ ] Don't conflict with existing shortcuts
- [ ] Work with Ctrl on Windows/Linux, Cmd on Mac
- [ ] Escape cancels floating paste first, then clears selection

Animation Panel:
- [ ] Tile mode places static tiles (first frame)
- [ ] Anim mode places animated tiles (with offset)
- [ ] Mode survives animation selection changes
- [ ] Offset slider works in both modes (ignored in Tile mode)

## Sources

Modern canvas editor patterns and selection tool architectures referenced:

**Canvas Editor Architecture:**
- [tldraw: Infinite Canvas SDK for React](https://tldraw.dev/) - Reference for selection logic with nested transforms and flexible hit-testing
- [Konva Canvas Designer Editor](https://konvajs.org/docs/sandbox/Canvas_Editor.html) - React canvas editor patterns with selection and transformations
- [Building Diagram Tool with Canvas + React](https://integrtr.com/blog/building-diagram-tool-with-canvas-react/) - clearSelection handler on canvas click with event bubbling

**Marching Ants Implementation:**
- [Marching Ants - CodeProject](https://www.codeproject.com/Articles/27748/Marching-Ants) - Dashed pen with offset that increments in timer tick
- [Canvas Marching Ants Tutorial](https://www.plus2net.com/html_tutorial/html-canvas-marching-ants.php) - setLineDash with lineDashOffset animation technique
- [Marching Ants on Canvas (CodePen)](https://codepen.io/jaymc/pen/EwXrXW) - Working implementation with Date.now() for animation phase

**Tile Editor Selection and Transforms:**
- [Tiled Editor: Editing Tile Layers](https://doc.mapeditor.org/en/stable/manual/editing-tile-layers/) - Reference for tile selection and transform patterns (flip, mirror, rotate)
- [Tiled Forum: How to Transform Tiles](https://discourse.mapeditor.org/t/how-to-transform-tile-scale-rotate-flip/1411) - Flip, mirror, and rotate tools for tile selections
- [Tiled Forum: Rotate/Flip Whole Layer](https://discourse.mapeditor.org/t/can-i-rotate-flip-a-whole-layer/5239) - Selection transform behavior and limitations

**Implementation Notes:**
- Tiles typically only rotate 90° or mirror along vertical/horizontal axis
- Rectangular select, magic wand, and select same tile tools replace current selection by default
- Selection tools commonly work on brush canvas, not just map tiles
