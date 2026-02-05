# Phase 21: Zustand Store Optimization - Research

**Researched:** 2026-02-04
**Domain:** Zustand state management performance optimization
**Confidence:** HIGH

## Summary

This research investigates how to eliminate unnecessary re-renders in the AC Map Editor by migrating from bare `useEditorStore()` destructuring to granular Zustand selectors. Currently, every component destructures state from the store without selectors, causing all subscribed components to re-render on ANY state change. This is particularly problematic for `animationFrame`, which updates every 150ms and triggers re-renders in components that don't display animations.

The standard approach in Zustand is to use inline selector functions for primitive values and `useShallow` for multiple selections. For derived state like `canUndo`/`canRedo`, the pattern is to replace method-based computations with selector-based subscriptions. Store slicing is NOT needed for this project - granular selectors alone will solve the performance issues.

**Primary recommendation:** Migrate all components to use inline selector functions, use `useShallow` when destructuring multiple fields, and convert `canUndo`/`canRedo` from methods to selector-based derived state.

## Standard Stack

The project already uses the correct stack - no additional libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 4.5.7 | State management | Already installed, supports `useShallow` |
| React | 18.2.0 | UI framework | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/react/shallow | 4.5.7 (bundled) | `useShallow` helper for multi-field selections | When destructuring multiple values from store |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Selectors alone | Store slicing pattern | Slicing adds complexity without performance benefit for this use case |
| Manual selectors | zustand-computed middleware | Overkill for simple derived state; adds dependency |
| `useShallow` | Multiple separate selector calls | More verbose, but equally performant |

**Installation:**
No additional packages needed. Import `useShallow` from existing Zustand:
```bash
# Already installed
zustand@4.5.7 includes useShallow
```

## Architecture Patterns

### Current Store Structure
```
EditorState (single store)
├── State fields (~30 fields)
│   ├── map, filePath
│   ├── currentTool, previousTool, selectedTile, tileSelection
│   ├── animationFrame (updates every 150ms)
│   ├── viewport, selection, clipboard
│   ├── undoStack, redoStack
│   ├── gameObjectToolState, rectDragState
│   └── showGrid, showAnimations
└── Actions (~30 methods)
    ├── setMap, newMap, setTool, setSelectedTile
    ├── advanceAnimationFrame
    ├── undo, redo, canUndo, canRedo
    └── ... (tile operations, game object placement)
```

### Current Component Subscriptions

| Component | Fields Destructured | Re-render Triggers | Needs Animation? |
|-----------|---------------------|-------------------|------------------|
| MapCanvas | ~20 fields (map, viewport, showGrid, currentTool, selectedTile, tileSelection, **animationFrame**, selection, etc.) | ANY of 20 fields change | YES (draws animated tiles) |
| ToolBar | ~15 fields (currentTool, showGrid, map, gameObjectToolState, canUndo, canRedo, etc.) | ANY of 15 fields change | NO |
| StatusBar | 3 fields (viewport, currentTool, tileSelection) | ANY of 3 fields change | NO |
| Minimap | 3 fields (map, viewport, setViewport) | ANY of 3 fields change | NO |
| TilePalette | 6 fields (selectedTile, tileSelection, currentTool, wallType, setTileSelection, setWallType) | ANY of 6 fields change | NO |
| AnimationPanel | 3 fields (animationFrame, setSelectedTile, advanceAnimationFrame) | ANY of 3 fields change | YES (draws animation previews) |
| AnimationPreview | 3 fields (animationFrame, setSelectedTile, advanceAnimationFrame) | ANY of 3 fields change | YES (draws animation preview) |
| GameObjectToolPanel | 4 fields (currentTool, gameObjectToolState, setGameObjectTeam, setWarpSettings) | ANY of 4 fields change | NO |
| MapSettingsPanel | 2 fields (map, updateMapHeader) | ANY of 2 fields change | NO |
| MapSettingsDialog | 1 field (updateMapHeader) + uses getState() | Never (only subscribes to action) | NO |

**The Problem:**
- `animationFrame` changes every 150ms from `AnimationPanel`
- This triggers re-renders in MapCanvas, ToolBar, AnimationPanel, and AnimationPreview
- StatusBar, Minimap, TilePalette don't need `animationFrame` but re-render anyway if they destructure it
- ToolBar destructures `canUndo`/`canRedo` METHODS, not reactive values - buttons don't update when undo stack changes

### Pattern 1: Inline Selector for Primitive Values
**What:** Pass a selector function directly to `useEditorStore()`
**When to use:** Selecting a single primitive value or method
**Example:**
```typescript
// BAD: Subscribes to entire store
const { currentTool } = useEditorStore();

// GOOD: Subscribes only to currentTool
const currentTool = useEditorStore((state) => state.currentTool);
```

### Pattern 2: useShallow for Multiple Values
**What:** Wrap destructuring selector with `useShallow` for shallow comparison
**When to use:** Selecting multiple values at once
**Example:**
```typescript
// BAD: Creates new object on every render, always triggers re-render
const { map, viewport } = useEditorStore();

// ALSO BAD: Creates new object reference, Zustand sees it as changed
const { map, viewport } = useEditorStore((state) => ({
  map: state.map,
  viewport: state.viewport
}));

// GOOD: useShallow does shallow comparison of object properties
import { useShallow } from 'zustand/react/shallow';
const { map, viewport } = useEditorStore(
  useShallow((state) => ({
    map: state.map,
    viewport: state.viewport
  }))
);
```
Source: [useShallow documentation](https://zustand.docs.pmnd.rs/hooks/use-shallow)

### Pattern 3: Selector-Based Derived State
**What:** Replace methods using `get()` with selector subscriptions
**When to use:** For reactive computed values like `canUndo`, `canRedo`
**Example:**
```typescript
// CURRENT (BAD): Method doesn't trigger re-renders
interface EditorState {
  canUndo: () => boolean; // Uses get().undoStack.length > 0
}
const canUndo = useEditorStore((state) => state.canUndo); // Gets method, not value
const canUndoValue = canUndo(); // Must call it, doesn't re-render on stack change

// GOOD: Selector subscribes to undoStack
const canUndo = useEditorStore((state) => state.undoStack.length > 0);
// Re-renders automatically when undoStack changes
```

### Pattern 4: Action-Only Subscriptions
**What:** Subscribe only to action methods when component doesn't need state
**When to use:** When component only calls actions, doesn't display state
**Example:**
```typescript
// BAD: Subscribes to entire store
const { setTool, setSelectedTile } = useEditorStore();

// GOOD: Subscribe to actions individually (they're stable references)
const setTool = useEditorStore((state) => state.setTool);
const setSelectedTile = useEditorStore((state) => state.setSelectedTile);

// ALSO GOOD: useShallow for multiple actions
const { setTool, setSelectedTile } = useEditorStore(
  useShallow((state) => ({
    setTool: state.setTool,
    setSelectedTile: state.setSelectedTile
  }))
);
```

### Anti-Patterns to Avoid
- **Bare destructuring:** `const { field } = useEditorStore()` - subscribes to entire store
- **Object creation in selector:** `(state) => ({ field: state.field })` without `useShallow` - always sees as changed
- **Method-based derived state:** `canUndo()` - doesn't trigger re-renders
- **Premature store slicing:** Adds complexity without performance benefit when selectors suffice

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shallow object comparison | Custom `shallowEqual` function | `useShallow` from zustand/react/shallow | Official, optimized, tested solution |
| Computed state middleware | Custom computed value system | Selector pattern with memoization | Zustand's selector pattern is reactive by default |
| Store splitting | Separate stores for each domain | Single store with granular selectors | Simpler, no cross-store dependencies |
| Re-render debugging | Manual logging | React DevTools Profiler | Shows actual component render causes |

**Key insight:** Zustand's selector pattern IS the solution. Don't add middleware or split stores when the problem is just missing selectors.

## Common Pitfalls

### Pitfall 1: IDE Autocomplete Leads to Bare Destructuring
**What goes wrong:** VSCode suggests `const { field } = useEditorStore()` which subscribes to entire store
**Why it happens:** TypeScript autocomplete shows the interface, encouraging destructuring
**How to avoid:** Always write selectors explicitly: `useEditorStore((state) => state.field)`
**Warning signs:** Component re-renders when unrelated state changes

### Pitfall 2: Object Creation in Selector Without useShallow
**What goes wrong:** Selector returns new object every render: `(state) => ({ a: state.a, b: state.b })`
**Why it happens:** JavaScript creates new object reference, Zustand's `===` comparison sees it as changed
**How to avoid:** Wrap with `useShallow` when returning objects
**Warning signs:** Component re-renders on EVERY parent render, even when values unchanged

### Pitfall 3: Method-Based Derived State
**What goes wrong:** `canUndo: () => get().undoStack.length > 0` doesn't trigger re-renders
**Why it happens:** Method subscriptions return stable function reference, not reactive value
**How to avoid:** Use selector to subscribe to underlying state: `(state) => state.undoStack.length > 0`
**Warning signs:** UI doesn't update when derived state should change (undo button stays disabled)

### Pitfall 4: Over-Optimization with Store Slicing
**What goes wrong:** Splitting store into slices when selectors would suffice
**Why it happens:** Assumes store size causes performance issues
**How to avoid:** Use selectors first; only slice if you have proven cross-slice subscription issues
**Warning signs:** Complex slice composition code, cross-slice dependencies

### Pitfall 5: Mixing Selectors and Bare Destructuring
**What goes wrong:** Some components use selectors, others don't - inconsistent performance
**Why it happens:** Incremental migration without consistency
**How to avoid:** Migrate all components systematically, verify with checklist
**Warning signs:** Some components perform well, others don't

## Code Examples

Verified patterns from official sources:

### Component Migration: StatusBar (Simple Case)
```typescript
// BEFORE: Subscribes to entire store
const { viewport, currentTool, tileSelection } = useEditorStore();

// AFTER: Granular selectors
import { useShallow } from 'zustand/react/shallow';

const { viewport, currentTool, tileSelection } = useEditorStore(
  useShallow((state) => ({
    viewport: state.viewport,
    currentTool: state.currentTool,
    tileSelection: state.tileSelection
  }))
);
```
Source: [Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow)

### Component Migration: MapCanvas (Complex Case)
```typescript
// BEFORE: Destructures ~20 fields
const {
  map, viewport, showGrid, currentTool, selectedTile, tileSelection,
  animationFrame, rectDragState, gameObjectToolState, selection,
  setTile, setTiles, placeWall, eraseTile, fillArea, setSelectedTile,
  restorePreviousTool, setViewport, pushUndo, placeGameObject,
  placeGameObjectRect, setRectDragState, setSelection, clearSelection
} = useEditorStore();

// AFTER: Split into state and actions
import { useShallow } from 'zustand/react/shallow';

// State subscriptions (triggers re-renders)
const {
  map, viewport, showGrid, currentTool, selectedTile, tileSelection,
  animationFrame, rectDragState, gameObjectToolState, selection
} = useEditorStore(
  useShallow((state) => ({
    map: state.map,
    viewport: state.viewport,
    showGrid: state.showGrid,
    currentTool: state.currentTool,
    selectedTile: state.selectedTile,
    tileSelection: state.tileSelection,
    animationFrame: state.animationFrame,
    rectDragState: state.rectDragState,
    gameObjectToolState: state.gameObjectToolState,
    selection: state.selection
  }))
);

// Action subscriptions (stable references, don't cause re-renders)
const {
  setTile, setTiles, placeWall, eraseTile, fillArea, setSelectedTile,
  restorePreviousTool, setViewport, pushUndo, placeGameObject,
  placeGameObjectRect, setRectDragState, setSelection, clearSelection
} = useEditorStore(
  useShallow((state) => ({
    setTile: state.setTile,
    setTiles: state.setTiles,
    placeWall: state.placeWall,
    eraseTile: state.eraseTile,
    fillArea: state.fillArea,
    setSelectedTile: state.setSelectedTile,
    restorePreviousTool: state.restorePreviousTool,
    setViewport: state.setViewport,
    pushUndo: state.pushUndo,
    placeGameObject: state.placeGameObject,
    placeGameObjectRect: state.placeGameObjectRect,
    setRectDragState: state.setRectDragState,
    setSelection: state.setSelection,
    clearSelection: state.clearSelection
  }))
);
```

### Derived State Migration: canUndo/canRedo
```typescript
// BEFORE: Methods in store (not reactive)
interface EditorState {
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// Store implementation
canUndo: () => get().undoStack.length > 0,
canRedo: () => get().redoStack.length > 0,

// Component usage (BAD)
const { undo, redo, canUndo, canRedo } = useEditorStore();
// canUndo and canRedo are methods, must call them:
const canUndoValue = canUndo(); // Doesn't re-render when stack changes!

// AFTER: Remove methods from store, use selectors in components
// Store: Remove canUndo/canRedo methods entirely

// Component usage (GOOD)
const canUndo = useEditorStore((state) => state.undoStack.length > 0);
const canRedo = useEditorStore((state) => state.redoStack.length > 0);
const undo = useEditorStore((state) => state.undo);
const redo = useEditorStore((state) => state.redo);
// Now buttons update reactively when stacks change
```
Source: [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand)

### Animation Frame Isolation
```typescript
// PROBLEM: ToolBar subscribes to animationFrame unnecessarily

// BEFORE (ToolBar)
const {
  currentTool, setTool, showGrid, toggleGrid,
  undo, redo, canUndo, canRedo, map, gameObjectToolState,
  // ... other fields including animationFrame implicitly via bare destructuring
} = useEditorStore();

// AFTER (ToolBar): No animationFrame subscription
const currentTool = useEditorStore((state) => state.currentTool);
const setTool = useEditorStore((state) => state.setTool);
const showGrid = useEditorStore((state) => state.showGrid);
const toggleGrid = useEditorStore((state) => state.toggleGrid);
const canUndo = useEditorStore((state) => state.undoStack.length > 0);
const canRedo = useEditorStore((state) => state.redoStack.length > 0);
const undo = useEditorStore((state) => state.undo);
const redo = useEditorStore((state) => state.redo);
// ... etc, but NEVER subscribe to animationFrame

// MapCanvas DOES subscribe (needs it for drawing)
const animationFrame = useEditorStore((state) => state.animationFrame);
```

### Alternative: Single vs Multiple Selectors
```typescript
// Option 1: useShallow with object (recommended for 3+ fields)
const { map, viewport, currentTool } = useEditorStore(
  useShallow((state) => ({
    map: state.map,
    viewport: state.viewport,
    currentTool: state.currentTool
  }))
);

// Option 2: Individual selectors (more verbose, equally performant)
const map = useEditorStore((state) => state.map);
const viewport = useEditorStore((state) => state.viewport);
const currentTool = useEditorStore((state) => state.currentTool);

// Both prevent unnecessary re-renders. Choose based on preference.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `shallow` function | `useShallow` hook | Zustand 4.x | Hook API is cleaner, better TypeScript support |
| `equalityFn` parameter | `useShallow` wrapper | Zustand 4.x | Deprecated in v4, removed in v5 |
| Store slicing for performance | Granular selectors | Community consensus 2024-2025 | Simpler, less boilerplate |
| Computed state middleware | Selector pattern | Zustand 4.x+ | Built-in reactivity, no middleware needed |

**Deprecated/outdated:**
- `shallow` as second parameter: Use `useShallow` wrapper instead
- `equalityFn` parameter: Deprecated, use `useShallow` or custom hooks
- Multiple stores for performance: Use single store with selectors unless proven necessary

## Open Questions

Things that couldn't be fully resolved:

1. **Should actions be grouped with useShallow or selected individually?**
   - What we know: Actions are stable references, don't cause re-renders
   - What's unclear: Community preference varies between grouping vs individual
   - Recommendation: Group with `useShallow` when 3+ actions needed for cleaner code

2. **Performance measurement baseline**
   - What we know: Current implementation has unnecessary re-renders
   - What's unclear: Actual performance impact in production (animation is only 150ms interval)
   - Recommendation: Use React DevTools Profiler to measure before/after

3. **Should we create a custom selector hook for common patterns?**
   - What we know: Zustand docs show auto-generating selectors pattern
   - What's unclear: Worth the abstraction for ~10 components?
   - Recommendation: Migrate manually first, create helper if repetitive

## Sources

### Primary (HIGH confidence)
- [Zustand useShallow Hook](https://zustand.docs.pmnd.rs/hooks/use-shallow) - Official documentation for useShallow
- [Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow) - Official guide on preventing re-renders
- [Zustand Slices Pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern) - Official guide on store slicing
- [Zustand GitHub Repository](https://github.com/pmndrs/zustand) - Official repository, version 4.5.7

### Secondary (MEDIUM confidence)
- [Working with Zustand - TkDodo's blog](https://tkdodo.eu/blog/working-with-zustand) - Community best practices from respected React developer
- [Avoid performance issues when using Zustand](https://dev.to/devgrana/avoid-performance-issues-when-using-zustand-12ee) - Community article on common pitfalls
- [Best practices on using selectors in v5](https://github.com/pmndrs/zustand/discussions/2867) - Official GitHub discussion
- [useShallow vs selectors discussion](https://github.com/pmndrs/zustand/discussions/2541) - Community discussion on patterns

### Tertiary (LOW confidence)
- [Zustand adoption guide - LogRocket](https://blog.logrocket.com/zustand-adoption-guide/) - Overview article
- [Large-Scale React (Zustand) Project Structure](https://medium.com/@itsspss/large-scale-react-zustand-nest-js-project-structure-and-best-practices-93397fb473f4) - Community Medium article

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project already uses Zustand 4.5.7, useShallow is built-in
- Architecture patterns: HIGH - Official docs and community consensus on selector patterns
- Pitfalls: HIGH - Documented in official guides and community articles
- Code examples: HIGH - Verified from official documentation and current codebase structure
- Store slicing: MEDIUM - Community discussion shows mixed opinions, but consensus is selectors-first

**Research date:** 2026-02-04
**Valid until:** 2026-05-04 (90 days - Zustand is stable, patterns unlikely to change)

**Migration scope:**
- 10 components need migration
- 3 components need animationFrame (MapCanvas, AnimationPanel, AnimationPreview)
- 7 components should NOT subscribe to animationFrame
- 2 methods need conversion to selectors (canUndo, canRedo)
- 0 additional dependencies required
