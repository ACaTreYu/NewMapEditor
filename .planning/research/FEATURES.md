# Feature Landscape: SEdit Tool Parity

**Domain:** Tile Map Editor (SubSpace/Continuum format)
**Researched:** 2026-02-04
**Source:** SEdit v2.02.00 C++ source code analysis

## Executive Summary

SEdit contains **15 distinct tools** with specific mouse interaction patterns. The current NewMapEditor has **13 tools implemented** but the **CONVEYOR tool** is completely missing (user's primary request).

**Critical findings:**
- CONVEYOR tool is NOT implemented (user wants it back)
- PENCIL drag-to-paint behavior likely works but needs verification
- SELECT tool is missing (marquee selection + copy/paste/transform)
- All other tools appear correctly implemented

## Confidence Assessment

**HIGH** - All findings verified from SEdit C++ source code (map.cpp:1-8284, toolbar.cpp:1-672, main.h:239-254).

---

## Tool Comparison Table

| Tool | SEdit Constant | Mouse Behavior | Min Size | Current Status |
|------|----------------|----------------|----------|----------------|
| Edit (Pencil) | TOOL_EDIT | Click or drag to paint | 1x1 | ⚠️ Needs verification |
| Line | TOOL_LINE | Click-drag line preview, place on release | 1x1 | ✅ Correct |
| Wall | TOOL_WALL | Click-drag line preview, auto-connect walls | 1x1 | ✅ Correct |
| Picker | TOOL_PICKER | Click to pick tile, auto-return to prev tool | 1x1 | ✅ Correct |
| Select | TOOL_SELECT | Drag rectangle, resize handles, copy/paste | NxM | ❌ Missing |
| Fill | TOOL_FILL | Click to flood fill with pattern | 1x1 | ✅ Correct |
| Flag | TOOL_FLAG | Click 3x3 stamp (team-colored) | 3x3 | ✅ Correct |
| Pole | TOOL_POLE | Click 3x3 stamp (team-colored) | 3x3 | ✅ Correct |
| Spawn | TOOL_SPAWN | Click 3x3 stamp (team-colored) | 3x3 | ✅ Correct |
| Switch | TOOL_SWITCH | Click 3x3 stamp | 3x3 | ✅ Correct |
| Warp | TOOL_WARP | Click single tile | 1x1 | ✅ Correct |
| Bunker | TOOL_BUNKER | Drag rectangle, 4x4 pattern fill | 3x3 | ✅ Correct |
| Holding Pen | TOOL_HOLDING_PEN | Drag rectangle, border tiles | 3x3 | ✅ Correct |
| Bridge | TOOL_BRIDGE | Drag rectangle, 3-tile pattern fill | 3x3 | ✅ Correct |
| **Conveyor** | **TOOL_CONV** | **Drag rectangle, 4-tile pattern fill** | **2x2** | **❌ MISSING** |

---

## CRITICAL: Missing CONVEYOR Tool

**User's specific request:** "I want conveyor belt tool back"

**SEdit behavior (map.cpp:757-770, 1541-1590, 2697-2719):**
- **Mouse down:** Start rectangle corner
- **Mouse drag:** Show preview rectangle
- **Mouse up:** Fill rectangle with conveyor tiles
- **Direction:** Uses `hConvDir` (0 = left-right, 1 = up-down)
- **Type:** Uses `hConvType` to index `conv_lr_data` or `conv_ud_data`
- **Tile placement:** Fills with 4-tile repeating pattern (2 edge + 2 middle tiles)
- **Minimum size:** 2x2 tiles (vs 3x3 for bridges/bunkers)
- **Visual feedback:** Single tile highlight during hover (16x16 pixels)

**Current implementation status:**
- ToolType.CONVEYOR exists in types.ts enum ✅
- convLrData and convUdData exist in GameObjectData.ts ✅
- EditorState has conveyorDir state ✅
- MapCanvas mouse handlers check for CONVEYOR but don't implement it ❌
- No ConveyorToolPanel for direction selection ❌

**What's needed:**
1. Add CONVEYOR button to toolbar (gameObjectRectTools array in ToolBar.tsx)
2. Create ConveyorToolPanel component (copy BridgeToolPanel structure)
3. Verify placeConveyor logic in GameObjectSystem.ts
4. Test with 2x2, 3x3, 4x4, 5x5 rectangles

---

## Table Stakes: All 15 SEdit Tools

### 1. EDIT Tool (Pencil/Brush)
**Verified from:** map.cpp:599-627, 1115-1140, 1674-1717

**Behavior:**
- Click: Places tile immediately
- Drag: Continues placing tiles (drag-to-paint)
- Multi-tile: Stamps NxM tile regions if selection is multi-tile
- Animation support: Can place animated tiles with frame offset
- Undo: Snapshot on mouse down, not per tile

**Current status:** ⚠️ **Likely works but needs verification**
- PENCIL tool exists
- MapCanvas.tsx:574-585 has drag-to-paint code
- Multi-tile stamping implemented (MapCanvas.tsx:681-694)

---

### 2. LINE Tool
**Verified from:** map.cpp:629-646, 1143-1172, 1718-1760

**Behavior:**
- Mouse down: Set line start point
- Mouse drag: Show preview line (yellow dashed)
- Mouse up: Place tiles along Bresenham line
- Works with both regular tiles AND walls
- Shows "N tiles" count during preview

**Current status:** ✅ **Correct**
- Implemented in MapCanvas.tsx:512-520, 590-609
- Bresenham algorithm in getLineTiles (MapCanvas.tsx:97-122)
- Visual preview matches SEdit (MapCanvas.tsx:216-259)

---

### 3. WALL Tool (Auto-connecting Line)
**Verified from:** map.cpp:648-661, 1173-1204, 1761-1807

**Behavior:**
- Click-drag line like LINE tool
- Places auto-connecting walls along line
- Updates neighbors using wall connection algorithm (15 types x 16 states)

**Current status:** ✅ **Correct**
- WallSystem handles auto-connection
- Same line preview as LINE tool

---

### 4. PICKER Tool (Eyedropper)
**Verified from:** map.cpp:663-681, 1206-1266, 1808-1871

**Behavior:**
- Click tile: Picks tile value
- Static tiles: Sets tileSel, switches to TILE mode
- Animated tiles: Sets animSel, extracts frame offset
- Auto-returns to previous tool after pick

**Current status:** ✅ **Correct**
- restorePreviousTool() implemented (EditorState.ts:204-206)
- Works for both static and animated tiles

---

### 5. SELECT Tool (Marquee Selection)
**Verified from:** map.cpp:773-819, 1483-1540, 2068-2422, 2720-3105

**Behavior:**
- Drag to create selection rectangle
- 9 resize handles (corners + edges)
- Operations: Copy (Ctrl+C), Cut (Ctrl+X), Paste (Ctrl+V), Delete (Del)
- Transforms: Mirror (horizontal/vertical), Rotate (90°)
- Fill selection with current tile/pattern
- Can drag entire selection to move it

**Current status:** ❌ **MISSING**
- ToolType.SELECT exists in enum
- No implementation in MapCanvas or EditorState
- No clipboard data structure
- No transform algorithms

**Implementation needs:**
- Selection rectangle state
- Clipboard: width, height, tile array
- Mirror/rotate transform algorithms (SEdit has rotTbl and mirTbl arrays)
- 9-handle resize logic
- Copy/cut/paste/delete operations

---

### 6. FILL Tool (Flood Fill)
**Verified from:** map.cpp:905-925, 1590-1673

**Behavior:**
- Click: Flood fills contiguous area
- Pattern support: Tiles multi-tile selection with pattern

**Current status:** ✅ **Correct**
- Implemented in EditorState.ts:442-492
- Pattern tiling works correctly

---

### 7-11. Game Object Stamp Tools (3x3)
All verified from map.cpp, all ✅ **Correct**:
- FLAG (map.cpp:699-720, 1271-1311): Team-colored 3x3 flag
- POLE (map.cpp:699-720, 1313-1356): Team-colored 3x3 pole (center tile varies by team)
- SPAWN (map.cpp:684-697, 1410-1458): Team-colored 3x3 spawn (handles -1 tiles)
- SWITCH (map.cpp:721-733, 1358-1408): 3x3 switch structure
- WARP (map.cpp:928-940, 1460-1481): Single animated tile with warp encoding

---

### 12-15. Game Object Rectangle Tools (Drag)
All verified from map.cpp, one ❌ **MISSING**:
- BUNKER (map.cpp:820-865, 1541-1590, 2554-2590): 4x4 pattern fill, min 3x3 ✅
- HOLDING_PEN (map.cpp:735-755, 1541-1590, 2666-2696): Border tiles, min 3x3 ✅
- BRIDGE (map.cpp:867-903, 1541-1590, 2591-2665): 3-tile pattern, min 3x3 ✅
- **CONVEYOR** (map.cpp:757-770, 1541-1590, 2697-2719): **4-tile pattern, min 2x2** ❌

---

## Behavior Fixes Needed

### PENCIL: Verify Drag-to-Paint Works

**Issue:** Code exists for drag-to-paint but needs testing.

**Expected behavior (SEdit):**
```cpp
// WM_MOUSEMOVE handler (implicit)
if (left_button_held && currentTool == TOOL_EDIT) {
    EditMap(x, y, useAnim, map);  // Continue placing
}
```

**Current code (MapCanvas.tsx:574-585):**
```typescript
else if (e.buttons === 1 && !e.altKey) {
  // Drawing with left button held (non-line tools)
  if (currentTool !== ToolType.WALL && /* ... excluded tools ... */) {
    handleToolAction(x, y);  // Should call PENCIL placement
  }
}
```

**Status:** Code looks correct, just needs verification that it actually works.

---

## Anti-Features: What NOT to Build

### Eraser as Distinct Behavior
**Why:** SEdit has no special eraser tool. Erasing is just placing DEFAULT_TILE (280).
**What to do:** Keep ERASER tool but it's just a convenience wrapper for "place tile 280".

### Walls Without Auto-Connection
**Why:** Manual wall placement without neighbor updates looks broken.
**What to do:** WALL_PENCIL must always call wall system for auto-connection.

### Animated Tiles Without Frame Offset Control
**Why:** Multiple copies of same animation need varied frame offsets to look good.
**What to do:** Keep AnimationPanel frame offset slider (already implemented).

---

## MVP Recommendation

### Phase 1: CONVEYOR Tool (HIGH PRIORITY - User Request)
**Why:** User explicitly said "I want conveyor belt tool back"

**Steps:**
1. Add CONVEYOR to gameObjectRectTools in ToolBar.tsx
2. Create ConveyorToolPanel (copy BridgeToolPanel.tsx, change to H/V direction)
3. Verify GameObjectSystem.placeConveyor implements 4-tile pattern
4. Test drag-to-rectangle with 2x2 minimum (NOT 3x3 like other tools)
5. Verify left-right vs up-down direction selection

**Acceptance criteria:**
- Button appears in toolbar between Bridge and Wall tools
- Click CONVEYOR shows direction panel
- Drag 2x2+ rectangle places conveyor tiles
- Direction (LR vs UD) uses correct tile data
- Minimum 2x2 enforced (smaller = invalid)

---

### Phase 2: Verify PENCIL Drag-to-Paint
**Why:** Ensure existing code actually works

**Steps:**
1. Test single-tile drag painting
2. Test multi-tile stamp dragging
3. Verify undo snapshots correctly (on mouse down, not per tile)

---

### Phase 3: SELECT Tool (If Time Permits)
**Why:** Professional editors need copy/paste

**Steps (basic version):**
1. Drag-to-select rectangle (no resize handles yet)
2. Copy (Ctrl+C): Store selected tiles
3. Paste (Ctrl+V): Stamp at cursor
4. Delete (Del): Fill with DEFAULT_TILE
5. Defer: Mirror/rotate transforms, resize handles

---

## Feature Dependencies

```
CONVEYOR Tool
  ├─ custom.dat parsing ✅ (already done)
  ├─ conv_lr_data, conv_ud_data ✅ (in GameObjectData.ts)
  ├─ Direction selector UI ❌ (needs ConveyorToolPanel)
  ├─ Drag-to-rectangle ✅ (same as Bridge/Bunker)
  └─ 2x2 minimum validation ❌ (currently checks 3x3)

SELECT Tool
  ├─ Selection rectangle state ❌
  ├─ Clipboard data structure ❌
  ├─ Transform algorithms ❌ (mirror/rotate)
  ├─ 9-handle resize ❌ (complex)
  └─ Copy/paste/delete operations ❌
```

---

## SEdit Tool Constants (main.h:239-254)

```c
#define TOOL_EDIT               COMM_EDIT         // 403
#define TOOL_SELECT             COMM_SELECT       // 410
#define TOOL_WALL               COMM_WALL         // 422
#define TOOL_FLAG               COMM_FLAG         // 423
#define TOOL_POLE               COMM_POLE         // 424
#define TOOL_FILL               COMM_FILL         // 425
#define TOOL_HOLDING_PEN        COMM_HOLDING_PEN  // 426
#define TOOL_BUNKER             COMM_BUNKER       // 427
#define TOOL_SPAWN              COMM_SPAWN        // 428
#define TOOL_BRIDGE             COMM_BRIDGE       // 429
#define TOOL_WARP               COMM_WARP         // 430
#define TOOL_SWITCH             COMM_SWITCH       // 431
#define TOOL_PICKER             COMM_PICKER       // 432
#define TOOL_CONV               COMM_CONV         // 433  ← MISSING IN EDITOR
#define TOOL_LINE               COMM_LINE         // 434
```

---

## Sources

All findings verified from SEdit v2.02.00 C++ source code:

**PRIMARY SOURCES (HIGH confidence):**
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SeditSource\sedit_src\map.cpp` (8284 lines) - Complete tool behavior implementation
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SeditSource\sedit_src\main.h` (272 lines) - Tool constants, data structures
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SeditSource\sedit_src\toolbar.cpp` (672 lines) - Toolbar button definitions
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md` - Technical reference

**CURRENT IMPLEMENTATION (verification):**
- `E:\NewMapEditor\src\core\map\types.ts` - Tool enum, ToolType definitions
- `E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx` - Current toolbar buttons
- `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` - Mouse handling, tool behavior
- `E:\NewMapEditor\src\core\editor\EditorState.ts` - Tool state management, placement logic
- `E:\NewMapEditor\src\core\map\GameObjectData.ts` - Game object tile data arrays
- `E:\NewMapEditor\src\core\map\GameObjectSystem.ts` - Game object placement logic
