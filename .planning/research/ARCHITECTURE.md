# Architecture Patterns for UI Refactor

**Project:** AC Map Editor
**Focus:** React/Zustand panel layout, toolbars, tabs
**Researched:** 2026-02-01
**Confidence:** HIGH (verified with official documentation and established patterns)

## Executive Summary

The current architecture has a monolithic MapCanvas (547 lines) handling rendering, input, and scroll logic in one component. The refactor to horizontal toolbar / main canvas / tabbed bottom panel follows well-established IDE-style editor patterns. Use `react-resizable-panels` for the panel layout (2.7M+ weekly downloads, TypeScript support, accessibility built-in). Keep Zustand for global editor state, but extract canvas-specific logic into custom hooks. The compound components pattern works well for tabs.

## Current Architecture Analysis

### Component Structure

```
App.tsx (205 lines)
  |-- ToolBar.tsx (200 lines) - horizontal, top
  |-- app-content (flex row)
  |    |-- MapCanvas.tsx (547 lines) - MONOLITHIC, needs decomposition
  |    |-- right-panels (column)
  |         |-- TilePalette.tsx (248 lines)
  |         |-- AnimationPanel.tsx (227 lines) - conditional
  |-- MapSettingsPanel.tsx (240 lines) - overlay/modal style
  |-- StatusBar.tsx (61 lines)
```

### Current State Management

The EditorState.ts (388 lines) Zustand store manages:
- Map data and file path
- Tool state (current tool, previous tool, selected tile)
- Tile selection (multi-tile)
- Animation state
- Viewport (x, y, zoom)
- Selection region
- Undo/redo stacks
- UI toggles (showGrid, showAnimations)
- All tile operations (setTile, setTiles, placeWall, eraseTile, fillArea)

**Assessment:** This is appropriately scoped for global state. The store handles data that multiple components need access to. No changes recommended to the store architecture.

### MapCanvas Responsibilities (Problem Area)

The 547-line MapCanvas currently handles:
1. Canvas rendering (tiles, grid, line preview, cursor highlight)
2. Coordinate conversion (screen to tile, tile to screen)
3. Viewport calculations (visible tiles, scroll metrics)
4. Mouse input (click, drag, pan, wheel zoom)
5. Tool actions (pencil, eraser, fill, picker, wall, line)
6. Line drawing state and Bresenham algorithm
7. Scroll bar rendering and interaction
8. Resize observation

**Assessment:** This violates single responsibility. Should be decomposed into:
- Rendering logic (custom hook or utility)
- Input handling (custom hook)
- Scroll bars (separate component)
- Coordinate utilities (pure functions in core/)

## Recommended Architecture

### Target Component Structure

```
App.tsx
  |-- TopToolbar.tsx - horizontal toolbar at top
  |-- PanelGroup (vertical direction)
       |-- Panel (main area, defaultSize: 75)
       |    |-- MapCanvas.tsx (simplified - rendering only)
       |-- PanelResizeHandle
       |-- Panel (bottom tabs, defaultSize: 25, collapsible)
            |-- BottomTabs.tsx
                 |-- TilePalette (tab)
                 |-- MapSettings (tab)
                 |-- Animations (tab)
       |-- StatusBar.tsx (outside panels, fixed height)
```

### Layout Implementation

```typescript
// App.tsx target structure
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

export const App: React.FC = () => {
  return (
    <div className="app">
      <TopToolbar />
      <PanelGroup direction="vertical" className="main-panels">
        <Panel defaultSize={75} minSize={30}>
          <MapCanvas tilesetImage={tilesetImage} />
        </Panel>
        <PanelResizeHandle className="resize-handle-horizontal" />
        <Panel defaultSize={25} minSize={15} collapsible>
          <BottomTabs />
        </Panel>
      </PanelGroup>
      <StatusBar />
    </div>
  );
};
```

## Component Boundaries

### TopToolbar (refactored from ToolBar)

**Responsibility:** File operations, edit operations, tool selection, view toggles

**Props:** Keep current prop interface (callbacks from App)

**Local state:** None (all state from Zustand)

**Changes from current:**
- Remove animations/settings toggle buttons (moved to tabs)
- Keep file, undo/redo, tool, grid toggle buttons
- Same keyboard shortcuts

### MapCanvas (simplified)

**Responsibility:** Render map tiles to canvas, display overlays

**Extract to hooks:**
```typescript
// useCanvasRenderer.ts - drawing logic
const { draw, canvasRef } = useCanvasRenderer(tilesetImage, viewport, map, showGrid);

// useMapInput.ts - mouse/keyboard handling
const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = useMapInput(viewport, currentTool, callbacks);

// useViewportCalculations.ts - coordinate conversion
const { screenToTile, tileToScreen, getVisibleTiles } = useViewportCalculations(viewport);
```

**Local state:**
- `cursorTile` (hover position)
- `isDragging` (pan state)
- `lineState` (wall/line tool preview)

**Keep in Zustand:**
- viewport (x, y, zoom) - persisted/shared
- map data - shared
- tool state - shared

### ScrollBars (new component)

**Extract from MapCanvas:**
```typescript
// ScrollBars.tsx
interface Props {
  viewport: Viewport;
  onViewportChange: (v: Partial<Viewport>) => void;
}
```

**Responsibility:** Horizontal and vertical scroll bar rendering and interaction

**Local state:** `scrollDrag` (which bar is being dragged)

### BottomTabs (new component)

**Responsibility:** Tabbed container for TilePalette, MapSettings, Animations

**Pattern:** Compound components for accessibility

```typescript
interface TabContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

// Usage
<BottomTabs defaultTab="tiles">
  <BottomTabs.List>
    <BottomTabs.Tab id="tiles">Tiles</BottomTabs.Tab>
    <BottomTabs.Tab id="settings">Settings</BottomTabs.Tab>
    <BottomTabs.Tab id="animations">Animations</BottomTabs.Tab>
  </BottomTabs.List>
  <BottomTabs.Panels>
    <BottomTabs.Panel id="tiles"><TilePalette /></BottomTabs.Panel>
    <BottomTabs.Panel id="settings"><MapSettingsPanel /></BottomTabs.Panel>
    <BottomTabs.Panel id="animations"><AnimationPanel /></BottomTabs.Panel>
  </BottomTabs.Panels>
</BottomTabs>
```

**Local state:** `activeTab` (which tab is visible)

**Accessibility:** WAI-ARIA tab pattern with `role="tablist"`, `role="tab"`, `role="tabpanel"`, arrow key navigation

### TilePalette (minimal changes)

**Changes:**
- Remove wall type selector (move to dedicated wall panel or toolbar sub-menu)
- Adjust dimensions for horizontal layout in bottom panel

### MapSettingsPanel (minimal changes)

**Changes:**
- Remove overlay positioning (now in tab)
- Adjust layout for panel context

### AnimationPanel (minimal changes)

**Changes:**
- Adjust dimensions for bottom panel
- Keep animation timer and preview logic

## State Management Patterns

### What Stays in Zustand (Global)

| State | Reason |
|-------|--------|
| map, filePath | Core data, accessed everywhere |
| currentTool, selectedTile | Toolbar + Canvas need it |
| viewport | Canvas + StatusBar need it |
| undo/redo stacks | Toolbar + Canvas need it |
| animations | Canvas + AnimationPanel need it |
| showGrid | Toolbar + Canvas need it |

### What Uses Local State

| State | Component | Reason |
|-------|-----------|--------|
| cursorTile | MapCanvas | Only canvas cares about hover |
| isDragging | MapCanvas | Canvas-internal pan state |
| lineState | MapCanvas | Tool preview, internal to canvas |
| scrollDrag | ScrollBars | Internal to scroll bars |
| activeTab | BottomTabs | UI state, not app state |
| scrollOffset | TilePalette | Internal scroll position |

### Custom Hooks to Extract

**useCanvasRenderer(tilesetImage, viewport, map, showGrid, animations)**
- Contains draw() function
- Returns canvasRef and draw trigger
- ~150 lines extracted from MapCanvas

**useMapInput(viewport, setViewport, toolCallbacks)**
- Contains mouse handlers
- Returns event handler functions
- ~100 lines extracted from MapCanvas

**useCoordinates(viewport)**
- Contains screenToTile, tileToScreen, getVisibleTiles
- Pure calculations
- ~40 lines, could also be pure functions in core/

## File Structure After Refactor

```
src/
  components/
    TopToolbar/
      TopToolbar.tsx
      TopToolbar.css
      index.ts
    MapCanvas/
      MapCanvas.tsx (simplified ~200 lines)
      MapCanvas.css
      ScrollBars.tsx (~100 lines)
      useCanvasRenderer.ts (~150 lines)
      useMapInput.ts (~100 lines)
      index.ts
    BottomTabs/
      BottomTabs.tsx
      BottomTabs.css
      index.ts
    TilePalette/ (existing, adjust dimensions)
    MapSettingsPanel/ (existing, remove overlay)
    AnimationPanel/ (existing, adjust dimensions)
    StatusBar/ (existing)
  core/
    editor/
      EditorState.ts (unchanged)
    map/
      coordinates.ts (new - pure coordinate functions)
      (existing files)
```

## Patterns to Follow

### Pattern 1: Custom Hook Extraction

**When:** Component has 5+ lines of hook logic before return

**How:**
```typescript
// Before (in component)
const [value, setValue] = useState(initial);
useEffect(() => { /* complex effect */ }, [deps]);
const computed = useMemo(() => { /* calculation */ }, [deps]);

// After (custom hook)
function useFeature(deps) {
  const [value, setValue] = useState(initial);
  useEffect(() => { /* complex effect */ }, [deps]);
  const computed = useMemo(() => { /* calculation */ }, [deps]);
  return { value, setValue, computed };
}

// In component
const { value, setValue, computed } = useFeature(deps);
```

### Pattern 2: Compound Components for Tabs

**When:** Building accessible tab interfaces

**How:**
```typescript
const TabContext = createContext<TabContextValue | null>(null);

function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      <div role="tablist">{children}</div>
    </TabContext.Provider>
  );
}

function Tab({ id, children }) {
  const { activeTab, setActiveTab } = useContext(TabContext);
  return (
    <button
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }) {
  const { activeTab } = useContext(TabContext);
  if (activeTab !== id) return null;
  return <div role="tabpanel">{children}</div>;
}
```

### Pattern 3: Resizable Panels

**When:** Need user-adjustable layout regions

**How:**
```typescript
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

<PanelGroup direction="vertical">
  <Panel defaultSize={75} minSize={30}>
    {/* Main content */}
  </Panel>
  <PanelResizeHandle />
  <Panel defaultSize={25} minSize={15} collapsible>
    {/* Collapsible panel */}
  </Panel>
</PanelGroup>
```

**Persistence:**
```typescript
<PanelGroup autoSaveId="editor-layout">
  {/* Saves to localStorage */}
</PanelGroup>
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Prop Drilling Through Many Levels

**Problem:** Passing props through components that don't use them

**Current risk:** tilesetImage is passed App -> MapCanvas, App -> TilePalette, App -> AnimationPanel

**Solution:** Keep current pattern (acceptable at 1-2 levels) OR create TilesetContext if it gets worse

### Anti-Pattern 2: Massive Render Functions

**Problem:** Single component does everything

**Current issue:** MapCanvas's draw() is 140 lines

**Solution:** Extract sub-renderers
```typescript
const drawTiles = useCallback(() => { /* tiles */ }, [deps]);
const drawGrid = useCallback(() => { /* grid */ }, [deps]);
const drawOverlays = useCallback(() => { /* overlays */ }, [deps]);

const draw = useCallback(() => {
  drawTiles();
  drawGrid();
  drawOverlays();
}, [drawTiles, drawGrid, drawOverlays]);
```

### Anti-Pattern 3: Zustand for Ephemeral State

**Problem:** Putting transient UI state in global store

**Example of what NOT to do:**
```typescript
// Don't put these in Zustand
cursorTile: { x: -1, y: -1 },  // Changes on every mouse move
isDragging: false,             // Only MapCanvas cares
activeTab: 'tiles',            // Only BottomTabs cares
```

### Anti-Pattern 4: Re-creating Objects in Render

**Problem:** Creating new object references on each render

**Current issue potential:** Some handlers may create new objects

**Solution:** Use useMemo/useCallback appropriately
```typescript
// Bad - new object every render
onViewportChange({ x: newX })

// Good - stable callback
const handleViewportChange = useCallback((changes) => {
  setViewport(changes);
}, [setViewport]);
```

## Refactoring Order

Recommended sequence to minimize risk and maintain working state:

### Phase 1: Add Dependencies
1. Install react-resizable-panels
2. No functional changes yet

### Phase 2: Layout Shell
1. Wrap existing content in PanelGroup structure
2. Keep components in current positions initially
3. Verify nothing breaks

### Phase 3: Extract Hooks from MapCanvas
1. Create useCanvasRenderer hook
2. Create useMapInput hook
3. Create useCoordinates utilities
4. MapCanvas becomes composition of hooks

### Phase 4: Extract ScrollBars
1. Move scroll bar JSX to ScrollBars component
2. Pass viewport and handler props
3. Update styles

### Phase 5: Create BottomTabs
1. Build compound components (Tabs, Tab, TabPanel)
2. Move TilePalette to first tab
3. Move MapSettingsPanel to second tab
4. Move AnimationPanel to third tab

### Phase 6: Toolbar Simplification
1. Rename ToolBar to TopToolbar
2. Remove panel toggle buttons (now tabs handle this)
3. Adjust layout if needed

### Phase 7: Polish
1. Adjust panel sizes for optimal default
2. Add autoSaveId for layout persistence
3. Test keyboard navigation in tabs
4. Verify accessibility

## Dependencies to Add

```bash
npm install react-resizable-panels
```

No other dependencies needed. The project already has React 18 and Zustand.

## Performance Considerations

### Canvas Re-renders

The draw() function runs on every state change that affects rendering. Current dependencies:
- map (tiles changed)
- viewport (pan/zoom)
- showGrid (toggle)
- tilesetImage (load)
- lineState (line tool preview)
- cursorTile (hover highlight)
- animations, animationFrame (animated tiles)

**Optimization:** The current approach of re-drawing on state change is appropriate for canvas. The draw function is already memoized with useCallback. No changes needed.

### Zustand Subscriptions

Components already use selective subscriptions:
```typescript
const { map, viewport } = useEditorStore();
```

This is correct. Components only re-render when their subscribed state changes.

### Tab Panel Lazy Rendering

The TabPanel pattern (returning null when not active) means inactive panels don't render. This is appropriate.

## Testing Considerations

### Component Tests

With custom hooks extracted, testing becomes easier:

```typescript
// Test hooks in isolation
test('useCoordinates converts screen to tile correctly', () => {
  const { result } = renderHook(() => useCoordinates({ x: 0, y: 0, zoom: 1 }));
  expect(result.current.screenToTile(32, 32)).toEqual({ x: 2, y: 2 });
});

// Test components with mocked hooks
test('MapCanvas renders without crashing', () => {
  render(<MapCanvas tilesetImage={mockImage} />);
});
```

### Integration Tests

The panel layout can be tested by checking that resize handles work and panels render at expected sizes.

## Sources

### Panel Layout
- [react-resizable-panels GitHub](https://github.com/bvaughn/react-resizable-panels) - Official documentation
- [react-resizable-panels npm](https://www.npmjs.com/package/react-resizable-panels) - 2.7M+ weekly downloads
- [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/resizable) - Built on react-resizable-panels

### Component Patterns
- [Martin Fowler - Modularizing React Applications](https://martinfowler.com/articles/modularizing-react-apps.html) - Component decomposition patterns
- [TkDodo - Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) - Local vs global state patterns
- [DailyJS - Techniques for decomposing React components](https://medium.com/dailyjs/techniques-for-decomposing-react-components-e8a1081ef5da)

### Tabs and Accessibility
- [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) - Accessibility requirements
- [React Aria Toolbar](https://react-spectrum.adobe.com/react-aria/Toolbar.html) - ARIA toolbar implementation

### State Management
- [Zustand GitHub](https://github.com/pmndrs/zustand) - Official Zustand documentation
- [State Management in 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Current best practices
