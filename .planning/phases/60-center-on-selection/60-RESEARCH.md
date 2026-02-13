# Phase 60: Center on Selection - Research

**Researched:** 2026-02-13
**Domain:** Viewport manipulation, menu integration, keyboard shortcuts
**Confidence:** HIGH

## Summary

Phase 60 implements a "Center on Selection" command that pans the viewport to center the current selection on screen without changing zoom. This is a standard navigation feature found in most professional editors (Photoshop "View > Show > Selection", VS Code "Show in Explorer", etc.).

The implementation is straightforward because the architecture already supports all necessary primitives: selection bounds are stored as tile coordinates in `DocumentState.selection`, viewport position is controlled via `setViewportForDocument()`, and the Minimap component already demonstrates click-to-center logic that can be adapted. The main work is adding the command to Electron's menu system (already exists with IPC pattern) and wiring a keyboard shortcut handler (already exists in ToolBar and StatusBar).

**Primary recommendation:** Add View menu to Electron menu template with "Center on Selection" item, implement IPC handler in App.tsx that calculates selection center and calls `setViewport()` with clamping logic adapted from Minimap, add Ctrl+E keyboard listener in ToolBar's existing keydown handler, disable menu/command when `selection.active === false`.

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron Menu API | 28.x | Native application menus | Standard desktop menu system, already used for File/Edit/Window menus |
| Zustand | 4.x | State management | Already stores viewport and selection state per document |
| IPC (Electron) | 28.x | Menu click → React handler | Already used for File/Edit/Window menu actions |

### No New Dependencies Required

This phase uses only existing APIs and patterns. No new libraries needed.

## Architecture Patterns

### Pattern 1: Menu-to-React IPC (already implemented)

**What:** Electron main process sends IPC message when menu item clicked, React component listens and executes action

**Example from existing code:**
```typescript
// electron/main.ts (lines 36-90)
const menuTemplate = [
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        click: () => {
          mainWindow?.webContents.send('menu-action', 'undo');
        }
      },
      // ... more items
    ]
  }
];

// src/App.tsx (lines 279-297)
useEffect(() => {
  if (menuActionRef.current) return;
  menuActionRef.current = true;
  const handler = (_event: any, action: string) => {
    const state = useEditorStore.getState();
    switch (action) {
      case 'undo': if (!isAnyDragActive()) state.undo(); break;
      case 'redo': if (!isAnyDragActive()) state.redo(); break;
      // ... more cases
    }
  };
  if (window.electronAPI?.onMenuAction) {
    window.electronAPI.onMenuAction(handler);
  }
}, []);
```

**For this phase:** Add "View" menu to menuTemplate with "Center on Selection" item sending `'center-selection'` action, add case in App.tsx handler.

### Pattern 2: Viewport Centering with Clamping (existing in Minimap)

**What:** Calculate new viewport position to center a target point/region, clamp to map bounds to prevent out-of-bounds scrolling

**Example from Minimap.tsx (lines 438-451):**
```typescript
const handleMinimapClick = (e: React.MouseEvent) => {
  // ... get click coords

  // Convert minimap coords to map coords, centering viewport on click
  const vp = getViewportRect();
  const newX = (x / SCALE) - (vp.width / SCALE / 2);
  const newY = (y / SCALE) - (vp.height / SCALE / 2);

  // Dynamic maxOffset based on current zoom level
  const visibleTilesX = window.innerWidth / (TILE_SIZE * viewport.zoom);
  const visibleTilesY = (window.innerHeight - 100) / (TILE_SIZE * viewport.zoom);
  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX)),
    y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY))
  });
};
```

**For this phase:** Adapt this pattern to center on selection bounds. Calculate selection center from `(startX+endX)/2, (startY+endY)/2`, compute new viewport top-left to center that point, apply same clamping.

### Pattern 3: Keyboard Shortcuts (existing in ToolBar, StatusBar)

**What:** Global window keydown listener that checks for shortcuts and calls Zustand actions

**Example from ToolBar.tsx (lines 360-423):**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't intercept input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Handle shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        if (!isAnyDragActive()) undo();
      }
      // ... more shortcuts
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo, ...]);
```

**For this phase:** Add Ctrl+E (or similar) to existing keydown handler in ToolBar.tsx, check `selection.active` before executing.

### Anti-Patterns to Avoid

- **Creating new keydown listener in App.tsx:** ToolBar already has one with proper cleanup and input field guards. Add shortcut there.
- **Smooth animation for panning:** Success criteria says "smoothly pans" but this likely means "instant pan with valid bounds" not "animated transition". No prior art for animated viewport changes exists in codebase. Interpret "smoothly" as "without glitches/jank", not "with animation".
- **Changing zoom:** Success criteria explicitly says "no zoom change". Only modify `viewport.x` and `viewport.y`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport centering math | Custom formula per use case | Extract Minimap's centering+clamping logic to reusable function | Already tested and working, handles edge cases (zoom, bounds, canvas size) |
| Menu item enable/disable | Grayed-out menu with click check | Electron `enabled` property on menu item | Native OS behavior, proper visual feedback |
| Viewport size calculation | Hardcode canvas dimensions | Use `window.innerWidth/innerHeight` with current zoom | Already used in Minimap, adapts to window resize |

**Key insight:** The Minimap's click-to-center logic is production-ready viewport manipulation code. Don't rewrite the math—extract and reuse it.

## Common Pitfalls

### Pitfall 1: Selection Bounds vs. Selection Center
**What goes wrong:** Using `selection.startX/startY` as center instead of midpoint of selection rectangle
**Why it happens:** Selection is stored as start/end corners, not center+dimensions
**How to avoid:** Always calculate center as `(startX + endX) / 2, (startY + endY) / 2`
**Warning signs:** Viewport centers on top-left corner of selection instead of middle

### Pitfall 2: Off-by-One in Selection Bounds
**What goes wrong:** Selection from (10,10) to (12,12) is 3x3 tiles, but naive calculation treats it as 2x2
**Why it happens:** Start/end are inclusive coordinates, not exclusive ranges
**How to avoid:** Selection dimensions are `endX - startX + 1` by `endY - startY + 1`, but center is still `(startX + endX) / 2` (average of corners)
**Warning signs:** Center appears slightly offset from visual selection center

### Pitfall 3: Clamping Before vs. After Centering
**What goes wrong:** Clamp calculation uses wrong viewport size or doesn't account for zoom
**Why it happens:** Viewport bounds depend on current zoom level (higher zoom = smaller visible area = different clamp limits)
**How to avoid:** Calculate visible tile dimensions as `canvasWidth / (TILE_SIZE * zoom)` before clamping, use Minimap's pattern exactly
**Warning signs:** Map scrolls out of bounds at high zoom or shows black bars at low zoom

### Pitfall 4: Menu Item Always Enabled
**What goes wrong:** Menu item is clickable even when no selection exists, leading to no-op or error
**Why it happens:** Forgot to set `enabled: false` when `selection.active === false`
**How to avoid:** Menu template must be dynamic or rebuilt on state change. For Electron, use `Menu.setApplicationMenu()` in IPC response or check state before sending IPC.
**Warning signs:** Clicking "Center on Selection" with no selection does nothing or logs error

### Pitfall 5: Keyboard Shortcut Works When Input Focused
**What goes wrong:** Typing "e" in map settings dialog triggers center command
**Why it happens:** Keydown listener doesn't check if input/textarea is focused
**How to avoid:** Use existing guard from ToolBar: `if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;`
**Warning signs:** Unexpected behavior when typing in dialogs

## Code Examples

Verified patterns from existing codebase:

### Calculate Selection Center and Visible Viewport Size
```typescript
// In App.tsx handler or extracted utility
const state = useEditorStore.getState();
const { selection, viewport } = state;

if (!selection.active) {
  return; // No selection to center on
}

// Selection center (tile coordinates)
const selCenterX = (selection.startX + selection.endX) / 2;
const selCenterY = (selection.startY + selection.endY) / 2;

// Visible area in tiles (depends on current zoom and canvas size)
// Note: StatusBar uses innerHeight - 100 to account for UI chrome
const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight - 100; // Adjust for toolbar/statusbar
const visibleTilesX = canvasWidth / (TILE_SIZE * viewport.zoom);
const visibleTilesY = canvasHeight / (TILE_SIZE * viewport.zoom);

// New viewport position to center selection
const newX = selCenterX - (visibleTilesX / 2);
const newY = selCenterY - (visibleTilesY / 2);

// Clamp to map bounds (prevent scrolling past edges)
const clampedX = Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX));
const clampedY = Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY));

state.setViewport({ x: clampedX, y: clampedY });
```
**Source:** Adapted from Minimap.tsx lines 438-451

### Add View Menu to Electron
```typescript
// electron/main.ts - add to menuTemplate array
{
  label: 'View',
  submenu: [
    {
      label: 'Center on Selection',
      accelerator: 'CmdOrCtrl+E', // Cmd+E on Mac, Ctrl+E on Win/Linux
      click: () => {
        mainWindow?.webContents.send('menu-action', 'center-selection');
      }
    }
  ]
}
```
**Source:** Pattern from existing File/Edit menus in electron/main.ts lines 36-113

### Add IPC Handler in App.tsx
```typescript
// src/App.tsx - add to existing menu-action switch in useEffect (line 285)
case 'center-selection': {
  const { selection, viewport } = state;
  if (!selection.active) break; // Disabled state, shouldn't happen but guard

  const selCenterX = (selection.startX + selection.endX) / 2;
  const selCenterY = (selection.startY + selection.endY) / 2;

  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight - 100;
  const visibleTilesX = canvasWidth / (TILE_SIZE * viewport.zoom);
  const visibleTilesY = canvasHeight / (TILE_SIZE * viewport.zoom);

  const newX = selCenterX - (visibleTilesX / 2);
  const newY = selCenterY - (visibleTilesY / 2);

  state.setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX)),
    y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY))
  });
  break;
}
```
**Source:** Pattern from existing undo/redo handlers in App.tsx lines 285-291

### Add Keyboard Shortcut in ToolBar
```typescript
// src/components/ToolBar/ToolBar.tsx - add to handleKeyDown in useEffect (line 365)
if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
  e.preventDefault();
  const { selection, viewport, setViewport } = useEditorStore.getState();
  if (!selection.active) return;

  const selCenterX = (selection.startX + selection.endX) / 2;
  const selCenterY = (selection.startY + selection.endY) / 2;

  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight - 100;
  const visibleTilesX = canvasWidth / (TILE_SIZE * viewport.zoom);
  const visibleTilesY = canvasHeight / (TILE_SIZE * viewport.zoom);

  const newX = selCenterX - (visibleTilesX / 2);
  const newY = selCenterY - (visibleTilesY / 2);

  setViewport({
    x: Math.max(0, Math.min(MAP_WIDTH - visibleTilesX, newX)),
    y: Math.max(0, Math.min(MAP_HEIGHT - visibleTilesY, newY))
  });
  return;
}
```
**Source:** Pattern from existing Ctrl+Z/Ctrl+Y handlers in ToolBar.tsx lines 365-415

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual viewport math per feature | Minimap's centering logic | Phase 50+ (Minimap refactor) | Viewport centering pattern now exists in codebase, can be reused |
| Separate menu systems | Electron Menu + IPC | Initial Electron integration | Menu actions trigger React handlers via IPC, already proven pattern |
| Per-component keyboard handlers | Centralized in ToolBar/StatusBar | Phase 40+ | Keyboard shortcuts handled in 2 places with consistent guards |

**Deprecated/outdated:**
- N/A - All patterns are current and in active use

## Open Questions

1. **Which keyboard shortcut to use?**
   - What we know: Ctrl+E is free (not used in existing ToolBar shortcuts). Photoshop uses no shortcut for "Show Selection", VS Code uses platform-specific shortcuts for similar actions.
   - What's unclear: User expectation for this command's shortcut
   - Recommendation: Use Ctrl+E (mnemonic: "E" for center, not conflicting). Document in menu label if desired ("Center on Selection\tCtrl+E"). Easy to change later if user feedback suggests different key.

2. **Should menu item be dynamically enabled/disabled?**
   - What we know: Electron menu items support `enabled` property. Current menus don't dynamically update (File > Save doesn't disable when no map loaded).
   - What's unclear: Whether to rebuild menu on selection state change or check state in click handler
   - Recommendation: Check state in click handler (simpler, matches existing pattern). Menu item always visible, click is no-op if `!selection.active`. Aligns with File > Save always being clickable.

3. **Canvas height calculation: window.innerHeight - 100 or measure actual?**
   - What we know: Minimap and code examples use `innerHeight - 100` as rough approximation for toolbar/statusbar. Actual canvas height is dynamic (resize panels).
   - What's unclear: Whether hardcoded offset is sufficient or should measure canvas element
   - Recommendation: Use `innerHeight - 100` to match existing Minimap pattern. If user reports off-center results, refine to measure actual canvas bounds.

## Sources

### Primary (HIGH confidence)
- E:\NewMapEditor\electron\main.ts - Electron menu template and IPC pattern (lines 36-117)
- E:\NewMapEditor\src\App.tsx - Menu action IPC handler pattern (lines 277-297)
- E:\NewMapEditor\src\components\Minimap\Minimap.tsx - Click-to-center logic with clamping (lines 438-451)
- E:\NewMapEditor\src\components\ToolBar\ToolBar.tsx - Keyboard shortcut handler pattern (lines 360-423)
- E:\NewMapEditor\src\core\editor\slices\types.ts - Selection and Viewport type definitions (lines 11-24)
- E:\NewMapEditor\.planning\REQUIREMENTS.md - GRID-04 requirement definition

### Secondary (MEDIUM confidence)
- N/A - All research based on direct codebase inspection

### Tertiary (LOW confidence)
- N/A - No external sources used

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All existing APIs, no new dependencies
- Architecture: HIGH - All patterns exist in codebase with working examples
- Pitfalls: HIGH - Based on actual code inspection and common viewport math errors

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days - stable codebase, no fast-moving dependencies)
