# Phase 43: Integration & Cleanup - Research

**Researched:** 2026-02-11
**Domain:** Code cleanup, UI refactoring, keyboard shortcut removal
**Confidence:** HIGH

## Summary

Phase 43 integrates the newly-implemented rotate and mirror operations with the undo/redo system, removes legacy clipboard-based transform code, restructures the toolbar layout, and eliminates single-letter keyboard shortcuts. The integration work is minimal because phases 41 and 42 already wired transforms to the delta-based undo system. The primary work is deletion, toolbar reorganization, and disabled-state UI logic.

The rotate and mirror operations are already fully functional with undo/redo via the delta system implemented in phases 41-42. This phase removes dead code (old clipboard transforms, eraser tool, 180°/-180° rotation algorithms if unused), restructures the toolbar UI from one rotate dropdown to two separate CW/CCW buttons, adds Cut/Copy/Paste toolbar buttons, reorders all toolbar items, and removes all single-letter tool shortcuts while preserving Ctrl+ shortcuts.

**Primary recommendation:** Focus on surgical deletions and toolbar UI restructuring. Zero new algorithm work required. All transform functionality is complete and tested.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Old Code Cleanup:**
- Full purge of old clipboard transform functions (mirrorClipboardHorizontal, mirrorClipboardVertical, rotateClipboard) — remove entirely if unused
- Remove old Ctrl+H, Ctrl+J, Ctrl+R keyboard bindings
- Remove all associated dead code — no commented-out remnants, no keeping "just in case"
- Remove Eraser tool entirely — delete ToolType.ERASER, all eraser logic, eraser icon, cleanup all references
- Remove 180° and -180° rotation options — remove from toolbar AND delete algorithm code if only used by those options

**Rotate Button UI Restructure:**
- Replace single Rotate dropdown button with TWO separate rotate buttons: CW and CCW
- Each button has a directional circular arrow icon indicating rotation direction
- No dropdown needed — each button executes its rotation immediately on click
- Icon style: simple/pragmatic (toolbar icons will be overhauled in a future milestone)
- Mirror button keeps its 4-item dropdown (Right/Left/Up/Down) unchanged

**Toolbar Ordering:**
- **Non-game tools first:** Select, Pencil, Fill, Picker | Rotate CW, Rotate CCW, Mirror | Cut, Copy, Paste
- **Game tools after:** Line, Rect | Wall, W.Draw, W.Rect | Flag, Pole, Warp, Spawn, Switch | Bunker, H.Pen, Bridge, Conveyor
- **End section:** Grid | Settings
- Cut/Copy/Paste get new toolbar buttons (existing shortcuts Ctrl+C/X/V remain)
- Line and Rect placed at the beginning of the game tools section

**Keyboard Shortcuts:**
- No new shortcuts for rotate or mirror — toolbar-only
- Remove ALL single-letter tool shortcuts (V, B, G, L, R, W, E, I, F, P, T, S, H, J, K, N, C, Q, A)
- Keep all Ctrl+ shortcuts: Ctrl+N (new), Ctrl+O (open), Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo), Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste), Ctrl+D / Delete (delete selection)

### Claude's Discretion

- Rotate button icon design (simple unicode or drawn arrows — whatever fits current toolbar)
- Cut/Copy/Paste toolbar button icon style
- Exact disabled state visual treatment for rotate/mirror when no selection exists
- Whether to add separator between Cut/Copy/Paste and the rotate/mirror group

### Deferred Ideas (OUT OF SCOPE)

- Move Selection tool (drag to reposition selected tiles) — future phase/milestone
- Toolbar icon overhaul — future milestone

</user_constraints>

## Standard Stack

### Core Technologies (Already in Use)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI components | Project standard |
| TypeScript | 5.x | Type safety | Project standard |
| Zustand | 4.x | State management | Project standard |
| CSS Modules | N/A | Component styling | Project standard |

**No new dependencies required.** This phase only removes code and reorganizes UI.

## Architecture Patterns

### Current Codebase Structure

```
src/
├── core/
│   ├── editor/
│   │   ├── EditorState.ts          # Main Zustand store
│   │   └── slices/
│   │       ├── documentsSlice.ts   # Per-doc state + actions
│   │       ├── globalSlice.ts      # Shared UI state
│   │       └── windowSlice.ts      # MDI window state
│   └── map/
│       ├── types.ts                # ToolType enum
│       ├── SelectionTransforms.ts  # Pure transform algorithms
│       └── ...
├── components/
│   └── ToolBar/
│       ├── ToolBar.tsx             # Toolbar UI + keyboard shortcuts
│       └── ToolBar.css             # Button styling
└── ...
```

### Pattern 1: Delta-Based Undo/Redo (Already Implemented)

**What:** Store tile deltas (x, y, oldValue, newValue) instead of full map snapshots
**When to use:** All map modification operations
**How transforms integrate:**
1. Call `pushUndoForDocument(id)` to capture pre-change snapshot
2. Modify map tiles via `setTilesForDocument(id, tiles)`
3. Call `commitUndoForDocument(id, description)` to create delta entry
4. Clear redo stack on new changes

**Example from documentsSlice.ts (Phase 41/42 implementation):**
```typescript
// Rotate/mirror pattern (already implemented)
rotateSelectionForDocument: (id, angle) => {
  const doc = get().documents.get(id);
  if (!doc || !doc.map || !doc.selection.active || doc.isPasting) return;

  // Extract → Transform → Clear → Write pattern
  const extracted = /* extract selection tiles */;
  const rotated = SelectionTransforms.rotate(extracted, width, height, angle);

  get().pushUndoForDocument(id);        // Capture before
  get().setTilesForDocument(id, clearTiles);  // Clear original
  get().setTilesForDocument(id, writeTiles);  // Write rotated
  get().commitUndoForDocument(id, `Rotate ${angle}°`);  // Create delta
}
```

**Status:** Fully implemented in phases 41-42. No changes needed for phase 43.

### Pattern 2: Action Buttons (Not Mode Tools)

**What:** Buttons that execute immediately without changing currentTool
**When to use:** Transform operations (rotate, mirror)
**Contrast with mode tools:** Pencil/Wall/Select change currentTool and stay active

**Example from ToolBar.tsx (Phase 41/42 implementation):**
```typescript
const handleToolClick = (tool: ToolType) => {
  // Action tools don't change currentTool, just open dropdown
  if (actionToolsSet.has(tool)) {
    setOpenDropdown(openDropdown === tool ? null : tool);
    return;
  }
  // Regular mode tools change currentTool
  setTool(tool);
}
```

**Status:** Already implemented. Phase 43 removes dropdown for rotate buttons.

### Pattern 3: Disabled State Logic

**What:** Buttons disabled when preconditions not met (no map, no selection, paste mode)
**Current implementation:** Undo/redo use document-aware checks
**Example:**
```typescript
const canUndo = useEditorStore((state) => {
  if (!state.activeDocumentId) return false;
  const doc = state.documents.get(state.activeDocumentId);
  return doc ? doc.undoStack.length > 0 : false;
});

<button disabled={!canUndo} onClick={undo}>Undo</button>
```

**New pattern for transforms:**
```typescript
const hasSelection = useEditorStore((state) => {
  if (!state.activeDocumentId) return false;
  const doc = state.documents.get(state.activeDocumentId);
  return doc ? doc.selection.active && !doc.isPasting : false;
});

<button disabled={!hasSelection} onClick={rotateCW}>Rotate CW</button>
```

### Pattern 4: Toolbar Button Organization

**Current structure:**
- Tools array: mode-change tools (pencil, select, etc.)
- Game object arrays: stamp tools, rect tools, wall tools
- Transform action tools: rotate, mirror (action buttons)

**New structure (phase 43):**
```
Non-game tools: Select, Pencil, Fill, Picker
Separator
Transforms: Rotate CW, Rotate CCW, Mirror
Separator
Clipboard: Cut, Copy, Paste
Separator
Game tools: Line, Rect
Separator
Wall tools: Wall, W.Draw, W.Rect
Separator
Game objects (stamp): Flag, Pole, Warp, Spawn, Switch
Separator
Game objects (rect): Bunker, H.Pen, Bridge, Conveyor
Separator
UI: Grid, Settings
```

### Anti-Patterns to Avoid

- **Don't keep "just in case" code:** Dead code removal must be complete. No commented-out functions, no "backup" copies.
- **Don't add complexity to simple buttons:** Rotate CW/CCW are direct action buttons, not dropdown tools. One click = one rotation.
- **Don't break undo on cleanup:** Verify that removing old clipboard transforms doesn't orphan any state or break undo chains.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toolbar icon creation | Custom SVG drawing code | Existing SVG files in `public/assets/toolbar/` | Icons already exist for all current tools. For new Cut/Copy/Paste buttons, create simple SVG files following existing pattern (16x16, monochrome). |
| Keyboard shortcut handling | Custom event dispatcher | Existing window keydown listener in ToolBar.tsx | Shortcut system already in place. Just remove single-letter mappings. |
| Disabled state computation | Complex condition chaining | Zustand selectors with early returns | Existing pattern for undo/redo (document-aware checks). |

**Key insight:** This phase is 90% deletion and 10% UI reorganization. Don't over-engineer simple changes.

## Common Pitfalls

### Pitfall 1: Incomplete Dead Code Removal

**What goes wrong:** Removing function definition but leaving references in types, exports, or tests
**Why it happens:** Search-and-delete without checking all usages
**How to avoid:**
1. Search for function name across entire codebase (not just current file)
2. Remove from type definitions (interfaces, method signatures)
3. Remove from export lists
4. Update any documentation/comments that reference deleted code
5. TypeScript will catch most missed references (use `npm run typecheck`)

**Warning signs:**
- TypeScript errors after deletion
- Unused import warnings
- Stale JSDoc comments mentioning deleted functions

**Example removal checklist for `rotateClipboard`:**
- [ ] Remove function implementation in globalSlice.ts
- [ ] Remove from GlobalSlice interface (method signature)
- [ ] Remove wrapper in EditorState.ts (backward-compat layer)
- [ ] Remove from BackwardCompatLayer interface
- [ ] Remove Ctrl+R binding from ToolBar.tsx keyboard handler
- [ ] Search for "rotateClipboard" across all files to catch stragglers

### Pitfall 2: Breaking Existing Keyboard Shortcuts

**What goes wrong:** Removing single-letter shortcuts also removes Ctrl+ shortcuts
**Why it happens:** Overly broad regex or deletion pattern
**How to avoid:**
1. Preserve the `if (e.ctrlKey || e.metaKey)` block entirely
2. Only remove the bottom section that checks `e.key` without modifiers
3. Test all Ctrl+ shortcuts after removal (Ctrl+C/X/V/Z/Y/D/N/O/S)

**Current structure (ToolBar.tsx):**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // ← KEEP THIS ENTIRE BLOCK
      switch (e.key.toLowerCase()) {
        case 'n': onNewMap(); break;
        case 'c': copySelection(); break;
        // ... etc
      }
      return;
    }

    // ← DELETE THIS SECTION (single-letter tool shortcuts)
    const tool = allToolsWithShortcuts.find(t =>
      t.shortcut.toLowerCase() === e.key.toLowerCase()
    );
    if (tool) setTool(tool.tool);
  };
}, [/* deps */]);
```

**Warning signs:**
- Ctrl+C stops working after changes
- Delete key no longer deletes selection
- File menu shortcuts (Ctrl+N/O/S) stop working

### Pitfall 3: Icon File Mismatch

**What goes wrong:** Toolbar references `cut.svg` but file doesn't exist, causing 404 in browser console
**Why it happens:** Forgetting to create icon files for new buttons (Cut/Copy/Paste)
**How to avoid:**
1. Create SVG files BEFORE updating ToolBar.tsx
2. Use consistent naming: `cut.svg`, `copy.svg`, `paste.svg`
3. Follow existing SVG structure (16x16 viewBox, monochrome, simple shapes)
4. Test in browser dev tools Network tab for 404s

**Warning signs:**
- Missing icon images in toolbar (broken image icon)
- 404 errors in browser console for `/assets/toolbar/*.svg`

### Pitfall 4: Disabled State Visual Feedback

**What goes wrong:** Buttons appear clickable but do nothing when no selection exists
**Why it happens:** Forgetting to add `disabled` prop or not wiring selector correctly
**How to avoid:**
1. Create `hasSelection` selector before rendering buttons
2. Add `disabled={!hasSelection}` to all transform/clipboard buttons
3. Verify CSS applies `.toolbar-button:disabled` styling (opacity + grayscale)
4. Test with no selection: buttons should appear grayed out

**Example selector:**
```typescript
const hasSelection = useEditorStore((state) => {
  if (!state.activeDocumentId) return false;
  const doc = state.documents.get(state.activeDocumentId);
  return doc ? doc.selection.active && !doc.isPasting : false;
});
```

**Warning signs:**
- Buttons remain full color when no selection exists
- Clicking button with no selection shows no visual response
- Console errors when clicking disabled button

### Pitfall 5: Removing Algorithm Code Still in Use

**What goes wrong:** Deleting `rotate180` function breaks 180° rotation
**Why it happens:** Assuming 180°/-180° removal means deleting algorithm, but only toolbar option removed
**How to avoid:**
1. Check if algorithm is used by remaining toolbar options BEFORE deleting
2. For rotate180: Used by both 180° AND -180° options → keep algorithm if either remains
3. Context decision says "remove 180° and -180° options" → delete BOTH variants → safe to delete algorithm

**Verification steps:**
1. Read user decision: "Remove 180° and -180° rotation options"
2. Check SelectionTransforms.rotate: handles all 4 angles (90, -90, 180, -180)
3. Check toolbar variants: lists all 4 options
4. User decision: remove BOTH 180° and -180° → safe to delete rotate180 function
5. Update rotate() dispatcher to only handle 90/-90

**Warning signs:**
- TypeScript error: "Property 'rotate180' does not exist"
- Runtime error when calling rotate() with 180 angle

## Code Examples

### Example 1: Remove Dead Clipboard Transform Functions

**File:** `src/core/editor/slices/globalSlice.ts`

**Current code (lines 151-201):**
```typescript
mirrorClipboardHorizontal: () => {
  const { clipboard } = get();
  if (!clipboard) return;
  // ... implementation
  set({ clipboard: { ...clipboard, tiles: newTiles } });
},

mirrorClipboardVertical: () => {
  // ... similar
},

rotateClipboard: () => {
  // ... implementation
}
```

**Action:** Delete all three functions entirely.

**Also remove from:**
1. `GlobalSlice` interface (lines 51-53)
2. `EditorState.ts` backward-compat wrappers (lines 410-420)
3. `BackwardCompatLayer` interface (line 58)

### Example 2: Remove Keyboard Bindings

**File:** `src/components/ToolBar/ToolBar.tsx`

**Current code (lines 350-362):**
```typescript
case 'h':
  e.preventDefault();
  mirrorHorizontal();
  break;
case 'j':
  e.preventDefault();
  mirrorVertical();
  break;
case 'r':
  e.preventDefault();
  rotateClipboard();
  break;
```

**Action:** Delete these three cases.

**Also remove (lines 372-376):**
```typescript
const tool = allToolsWithShortcuts.find((t) =>
  t.shortcut.toLowerCase() === e.key.toLowerCase()
);
if (tool) setTool(tool.tool);
```

**Replace with comment:**
```typescript
// Single-letter tool shortcuts removed (phase 43).
// All tools accessible via toolbar buttons.
```

### Example 3: Remove Eraser Tool

**Files to update:**
1. `src/core/map/types.ts`: Remove `ERASER = 'eraser'` from ToolType enum (line 108)
2. `src/components/ToolBar/ToolBar.tsx`: Remove eraser from tools array (line 30)
3. `public/assets/toolbar/eraser.svg`: Delete file
4. `src/components/MapCanvas/MapCanvas.tsx`: Remove eraser case from mouse handlers (if exists)

**Verification:** Search codebase for "ERASER" and "eraser" to find all references.

### Example 4: Restructure Rotate Buttons (Single to Dual)

**File:** `src/components/ToolBar/ToolBar.tsx`

**Current code (lines 214-228):**
```typescript
{
  tool: ToolType.ROTATE,
  settingName: 'Angle',
  getCurrentValue: () => 0,
  variants: [
    { label: '90° CW', value: 90 },
    { label: '90° CCW', value: -90 },
    { label: '180°', value: 180 },
    { label: '-180°', value: -180 },
  ],
  setter: (angle) => { /* ... */ }
}
```

**New approach:**
1. Remove ROTATE from variant configs (no dropdown)
2. Add two separate tools to basic tools array:
   ```typescript
   { tool: ToolType.ROTATE_CW, label: 'Rotate CW', icon: 'rotate-cw', shortcut: '' },
   { tool: ToolType.ROTATE_CCW, label: 'Rotate CCW', icon: 'rotate-ccw', shortcut: '' },
   ```
3. Create action handlers:
   ```typescript
   const rotateCW = () => {
     const activeDocId = useEditorStore.getState().activeDocumentId;
     if (!activeDocId) return;
     const doc = useEditorStore.getState().documents.get(activeDocId);
     if (!doc || !doc.selection.active || doc.isPasting) return;
     useEditorStore.getState().rotateSelectionForDocument(activeDocId, 90);
   };

   const rotateCCW = () => {
     // Same but angle -90
   };
   ```
4. Render as regular action buttons (no dropdown)

**Alternative approach (simpler):** Keep ROTATE enum, but render two separate buttons that call the same setter with hardcoded angles. No new enum values needed.

### Example 5: Add Disabled State to Transform Buttons

**File:** `src/components/ToolBar/ToolBar.tsx`

**Add selector:**
```typescript
const hasSelection = useEditorStore((state) => {
  if (!state.activeDocumentId) return false;
  const doc = state.documents.get(state.activeDocumentId);
  return doc ? doc.selection.active && !doc.isPasting : false;
});
```

**Update button rendering:**
```typescript
<button
  className="toolbar-button"
  onClick={rotateCW}
  disabled={!hasSelection}
  title="Rotate Clockwise 90°"
>
  <img src={`${iconBase}rotate-cw.svg`} alt="Rotate CW" className="toolbar-icon" />
</button>
```

**Apply to:** Rotate CW, Rotate CCW, Mirror, Cut, Copy, Paste buttons.

### Example 6: Reorder Toolbar Arrays

**File:** `src/components/ToolBar/ToolBar.tsx`

**Current rendering order (lines 469-485):**
```typescript
{tools.map(renderToolButton)}
<div className="toolbar-separator" />
{transformActionTools.map(renderToolButton)}
<div className="toolbar-separator" />
{gameObjectStampTools.map(renderToolButton)}
<div className="toolbar-separator" />
{gameObjectRectTools.map(renderToolButton)}
<div className="toolbar-separator" />
{wallDrawTools.map(renderToolButton)}
```

**New rendering order:**
```typescript
{/* Non-game tools */}
{tools.map(renderToolButton)}
<div className="toolbar-separator" />

{/* Transforms */}
{renderRotateCWButton()}
{renderRotateCCWButton()}
{renderMirrorButton()}
<div className="toolbar-separator" />

{/* Clipboard */}
{renderCutButton()}
{renderCopyButton()}
{renderPasteButton()}
<div className="toolbar-separator" />

{/* Game tools - drawing */}
{renderToolButton(lineTool)}
{renderToolButton(rectTool)}
<div className="toolbar-separator" />

{/* Wall tools */}
{[wallTool, ...wallDrawTools].map(renderToolButton)}
<div className="toolbar-separator" />

{/* Game objects - stamp */}
{gameObjectStampTools.map(renderToolButton)}
<div className="toolbar-separator" />

{/* Game objects - rect */}
{gameObjectRectTools.map(renderToolButton)}
<div className="toolbar-separator" />

{/* UI toggles */}
{renderGridButton()}
{renderSettingsButton()}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clipboard-based transforms (Ctrl+H/J/R modify clipboard in-place) | Selection-based transforms (operate on map tiles directly) | Phase 41-42 (Feb 2026) | Transforms now undo/redo correctly. Old clipboard approach bypassed undo system. |
| Single rotation dropdown with 4 options | Two separate CW/CCW buttons | Phase 43 (this phase) | Faster access to most common rotations (90° CW/CCW). 180° removed per user decision. |
| Single-letter tool shortcuts (V=select, B=pencil, etc.) | Toolbar-only tool selection | Phase 43 (this phase) | Avoids accidental tool changes when typing. All tools still accessible via mouse. |
| Eraser tool as separate mode | Delete key / Ctrl+D on selection | Phase 43 (this phase) | Eraser was redundant with selection delete. One less tool to maintain. |

**Deprecated/outdated:**
- `mirrorClipboardHorizontal` / `mirrorClipboardVertical` / `rotateClipboard`: Replaced by `rotateSelectionForDocument` / `mirrorSelectionForDocument` with undo support
- Ctrl+H / Ctrl+J / Ctrl+R shortcuts: Removed to avoid conflicts and confusion with new toolbar-based workflow
- ToolType.ERASER: Removed as redundant (selection + Delete does same thing)

## Open Questions

### Question 1: Rotate Button Icon Design

**What we know:**
- User decision: "simple/pragmatic" icons
- User decision: "don't over-invest in icon quality" (will be overhauled later)
- Existing icons: 16x16 SVG, monochrome, simple geometric shapes
- Need two icons: rotate-cw.svg and rotate-ccw.svg

**What's unclear:**
- Unicode arrows (↻ ↺) vs drawn SVG curves?
- Single arrow or double arrow (⟲ ⟳)?

**Recommendation:**
Use simple SVG circular arrows. Copy existing `rotate.svg`, modify to show single curved arrow pointing clockwise for CW, counter-clockwise for CCW. Total effort: ~10 minutes. Quality doesn't matter since icons will be replaced in future milestone.

**Example SVG structure:**
```svg
<!-- rotate-cw.svg -->
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M8,2 A6,6 0 1,1 8,14" stroke="currentColor" fill="none" stroke-width="2"/>
  <polygon points="12,3 14,6 10,6" fill="currentColor"/>
</svg>
```

### Question 2: Cut/Copy/Paste Icon Style

**What we know:**
- Standard icon metaphors: scissors (cut), two pages (copy), clipboard (paste)
- Existing icon style: flat, monochrome, 16x16
- User has discretion on exact style

**What's unclear:**
- Use standard Unicode symbols (✂ 📋) or drawn shapes?
- Match Windows/Mac conventions or custom design?

**Recommendation:**
Use minimal SVG shapes following existing toolbar pattern:
- Cut: Scissors icon (two triangular blades + X intersection)
- Copy: Two overlapping rectangles
- Paste: Clipboard with single rectangle

Copy structure from existing icons like `select.svg` or `rect.svg` for consistency.

### Question 3: Separator Between Clipboard and Transforms

**What we know:**
- User has discretion: "Whether to add separator between Cut/Copy/Paste and the rotate/mirror group"
- Current toolbar uses separators between functional groups
- New order: Transforms | Clipboard (adjacent groups)

**What's unclear:**
- Are transforms and clipboard conceptually related enough to group together?
- Would separator improve visual clarity or create clutter?

**Recommendation:**
**Add separator.** Transforms operate on map tiles in-place (rotate CW/CCW/Mirror), while clipboard operations move data across space/time (Cut/Copy/Paste). Visually distinct operations deserve visual separation. Follows existing pattern of separating tool categories.

### Question 4: Selection State During Paste Mode

**What we know:**
- Transform buttons disabled when `doc.isPasting === true`
- Existing guards: `if (!doc.selection.active || doc.isPasting) return;`

**What's unclear:**
- Should Cut/Copy buttons also be disabled during paste mode?
- Or only transforms (rotate/mirror)?

**Recommendation:**
Disable Cut/Copy during paste mode (consistent with transforms). User is in "paste mode" workflow, shouldn't switch to "cut mode" mid-paste. Cancel paste (Escape) to re-enable Cut/Copy. Paste button should remain enabled (paste completes the operation).

## Sources

### Primary (HIGH confidence)

- Codebase inspection: `src/core/editor/slices/documentsSlice.ts` (lines 616-785) — rotate/mirror actions with full undo integration
- Codebase inspection: `src/components/ToolBar/ToolBar.tsx` — current toolbar structure, keyboard shortcuts, variant configs
- Codebase inspection: `src/core/editor/slices/globalSlice.ts` — clipboard transform functions to be removed
- Phase 41/42 verification reports — confirmed undo/redo integration complete, no integration work needed for phase 43
- User CONTEXT.md — all locked decisions, discretion areas, deferred ideas

### Secondary (MEDIUM confidence)

None required. All research based on codebase inspection and prior phase documentation.

### Tertiary (LOW confidence)

None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, using existing React/Zustand/TypeScript
- Architecture: HIGH — All patterns already in use, just removing/reorganizing
- Pitfalls: HIGH — Based on common refactoring mistakes and codebase structure analysis

**Research date:** 2026-02-11
**Valid until:** 90 days (stable codebase, no external dependencies changing)
