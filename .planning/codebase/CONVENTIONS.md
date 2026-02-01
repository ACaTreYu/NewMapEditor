# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- React components: `PascalCase` with `.tsx` extension (e.g., `MapCanvas.tsx`, `ToolBar.tsx`)
- Utility modules: `camelCase` with `.ts` extension (e.g., `EditorState.ts`, `TileEncoding.ts`)
- Barrel exports (index files): `index.ts` for directory exports (e.g., `src/components/index.ts`, `src/core/editor/index.ts`)
- Classes and types: `PascalCase` (e.g., `WallSystem`, `MapHeader`)

**Functions:**
- Action/handler functions: `handle{Action}` prefix for event handlers (e.g., `handleMouseDown`, `handleToolAction`, `handleKeyDown`, `handleNewMap`)
- Utility functions: `camelCase` without prefix (e.g., `isAnimatedTile`, `makeStaticTile`, `getVisibleTiles`)
- Zustand store methods: `camelCase` (e.g., `setTile`, `setTiles`, `pushUndo`, `fillArea`)
- Private/internal functions: Prefix with underscore (e.g., `_buildLookupCache`, `_getConnections`, `_updateNeighbor`)

**Variables:**
- Local state: `camelCase` (e.g., `isDragging`, `lineState`, `selectedTile`, `cursorTile`)
- React state: `camelCase` with setter `set{Name}` (e.g., `showGrid`/`setShowGrid`, `currentTool`/`setTool`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `TILE_SIZE`, `MAP_WIDTH`, `DEFAULT_TILE`, `TILES_PER_ROW`)
- Interface prefix: `I` prefix avoided; use `Props`, `State`, `Config` suffixes instead (e.g., `Selection`, `Viewport`, `Animation`)

**Types:**
- Interfaces: `PascalCase` without `I` prefix (e.g., `MapData`, `MapHeader`, `EditorState`)
- Enums: `PascalCase` with descriptive names (e.g., `ToolType`, `ObjectiveType`, `Team`, `MapVersion`)
- Generic type params: Single uppercase letter or descriptive PascalCase (e.g., `React.FC<Props>`)
- Union/tuple types: Descriptive names in context (e.g., `LineState`, `DragState`)

## Code Style

**Formatting:**
- No explicit linter configured; formatting follows TypeScript/React best practices
- Indentation: 2 spaces (inferred from source files)
- Line length: No hard limit enforced, but ~100-120 characters typical
- Semicolons: Always present
- Single quotes: Avoided; double quotes used in JSX and strings

**Linting:**
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- Unused locals flagged: `"noUnusedLocals": true`
- Unused parameters flagged: `"noUnusedParameters": true`
- No fallthrough in switch: `"noFallthroughCasesInSwitch": true`

## Import Organization

**Order:**
1. External libraries (React, zustand, third-party)
2. Core modules (`@core/` aliases)
3. Component imports (`@components/` aliases)
4. Relative imports (CSS, local utilities)
5. Type-only imports when needed

**Example from MapCanvas.tsx:**
```typescript
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@core/editor';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, ToolType } from '@core/map';
import './MapCanvas.css';
```

**Path Aliases:**
- `@/*` → `src/*` (root utilities)
- `@core/*` → `src/core/*` (business logic)
- `@components/*` → `src/components/*` (React components)

Aliases are configured in `tsconfig.json` and `vite.config.ts`.

## Error Handling

**Patterns:**
- Null/undefined checks on state before operations: `if (!map) return;` (seen in EditorState tile operations)
- Bounds checking before array access: `if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;`
- Try-catch in Electron IPC handlers for file operations (e.g., in `electron/main.ts`)
- Return early pattern to avoid nested conditionals
- Silent failures in UI (e.g., image load fallback in `App.tsx`: fallback from PNG to BMP if PNG fails)
- Alert dialogs for user-facing errors: `alert('Failed to decompress: ' + error)`

**Example from EditorState.ts:**
```typescript
setTile: (x, y, tile) => {
  const { map } = get();
  if (!map || x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
  map.tiles[y * MAP_WIDTH + x] = tile;
  map.modified = true;
  set({ map: { ...map } });
}
```

## Logging

**Framework:** `console` methods (no structured logging library)

**Patterns:**
- `console.warn()` for recoverable issues (e.g., "No tileset found in assets/" in App.tsx)
- No debug logging for normal operations
- Minimal logging; errors surface through UI alerts or error states

## Comments

**When to Comment:**
- File-level comments: TSDoc format describing purpose and origin (e.g., "Based on SEDIT v2.02.00")
- Algorithm explanation: Comments above complex logic (Bresenham's algorithm in MapCanvas, flood fill in EditorState)
- Magic numbers: Inline comments explaining constants (e.g., "0x8000" = animated flag, "40" = tiles per row)
- Not required for self-documenting code (function names are descriptive)

**JSDoc/TSDoc:**
- Used for public utility functions and type definitions
- Format: `/** Doc comment */` above function/type
- Describes purpose, params, return value

**Example from TileEncoding.ts:**
```typescript
/**
 * Get the animation ID from an animated tile value
 */
export function getAnimationId(tile: number): number {
  return tile & ANIMATION_ID_MASK;
}
```

## Function Design

**Size:** Functions stay compact (most < 30 lines); use composition for complex logic

**Parameters:**
- Few parameters (< 4); use object destructuring for related params
- State retrieved from Zustand store rather than passed as params
- Position often as separate `x, y` params for readability

**Return Values:**
- Void functions for state mutations (Zustand actions)
- Typed return objects for computed values (e.g., `getScrollMetrics()` returns `{ thumbWidth, thumbHeight, thumbLeft, thumbTop }`)
- No null returns; use optional properties or early returns

**Example from MapCanvas.tsx:**
```typescript
const getScrollMetrics = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return { thumbWidth: 10, thumbHeight: 10, thumbLeft: 0, thumbTop: 0 };
  // calculations...
  return { thumbWidth, thumbHeight, thumbLeft, thumbTop };
}, [viewport]);
```

## Module Design

**Exports:**
- Named exports for individual functions/components: `export const functionName = ...`
- Classes exported as named: `export class WallSystem { ... }`
- Singleton instances exported: `export const wallSystem = new WallSystem();`

**Barrel Files:**
- Each directory has `index.ts` that re-exports public API
- Allows cleaner imports: `import { ToolType } from '@core/map'` instead of `@core/map/types`

**Example from src/components/index.ts:**
```typescript
export { MapCanvas } from './MapCanvas';
export { ToolBar } from './ToolBar';
export { TilePalette } from './TilePalette';
// ... others
```

## React Patterns

**Functional Components:**
- All components are functional with hooks
- Type-annotated with `React.FC<Props>` where Props interface defined
- Props interface defined locally in component file for UI components

**Hooks Usage:**
- `useRef` for canvas/DOM element access
- `useCallback` for memoized event handlers and computed values
- `useEffect` for side effects (resize observers, event listeners, image loading)
- `useState` for component-local state
- `useEditorStore` (Zustand) for application state

**Zustand Store:**
- Single store `useEditorStore` (EditorState.ts)
- Actions and state defined together in create() call
- State retrieved with `const { prop1, prop2 } = useEditorStore();`
- State mutations through action methods

## Algorithm Implementation

**Flood Fill:**
- Stack-based iterative approach in `EditorState.ts:fillArea()`
- Visited set prevents cycles
- Boundary checks built into iteration

**Bresenham Line:**
- Classic algorithm in `MapCanvas.tsx:getLineTiles()`
- Returns array of integer tile coordinates

**Wall Auto-Connection:**
- Neighbor checking and bit-flag system in `WallSystem.ts`
- Lookup cache for wall tile identification
- Index mapping table for connection states

---

*Convention analysis: 2026-02-01*
