# Phase 14: Toolbar Activation - Research

**Researched:** 2026-02-04
**Domain:** React toolbar integration, keyboard shortcuts, tool state management
**Confidence:** HIGH

## Summary

Phase 14 requires adding three game object tools (SPAWN, SWITCH, BRIDGE) to the toolbar with keyboard shortcuts and ensuring they function correctly. The codebase already has a well-established pattern for toolbar tool registration, keyboard shortcut handling, and tool state management through Zustand.

**Key findings:**
- Tool infrastructure is complete - SPAWN, SWITCH, and BRIDGE tools are fully implemented in `GameObjectSystem.ts` and already registered in `ToolType` enum
- Toolbar uses a declarative array-based registration pattern with icon, label, and shortcut
- Keyboard shortcuts have conflicts that must be resolved: 'W' (WALL vs SWITCH), 'B' (PENCIL vs BRIDGE), 'S' (Save vs SPAWN)
- Game object tools are split into two categories: stamp tools (3x3 click-to-place) and rect tools (drag-to-define rectangle)
- SPAWN and SWITCH are stamp tools (like FLAG, WARP), BRIDGE is a rect tool (like BUNKER, CONVEYOR)
- Custom.dat data is required for SPAWN, SWITCH, and BRIDGE to function

**Primary recommendation:** Add tools to existing toolbar arrays using established patterns, resolve keyboard conflicts by choosing non-conflicting keys, ensure GameObjectToolPanel displays appropriate controls for each tool.

## Standard Stack

The codebase uses an existing, well-established stack:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Already in use, component patterns established |
| Zustand | 4.x | State management | Already managing editor state including tool selection |
| TypeScript | 5.x | Type safety | Existing types for ToolType enum and tool state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hooks | Built-in | Event listeners, effects | Already used for keyboard shortcuts in ToolBar.tsx |
| CSS Variables | Native | Win98 theming | Already implemented for toolbar button states |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Array-based registration | Individual button components | Current pattern is cleaner, easier to maintain |
| Global keyboard listener | Per-component listeners | Current centralized approach prevents conflicts |
| Direct tool enum checks | Tool categories/sets | Current Set-based categorization is performant |

**Installation:**
No new dependencies required - all infrastructure exists.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ToolBar/
│   │   ├── ToolBar.tsx           # Tool button registration
│   │   └── ToolBar.css           # Button state styling
│   ├── GameObjectToolPanel/
│   │   ├── GameObjectToolPanel.tsx  # Tool-specific options UI
│   │   └── GameObjectToolPanel.css
│   └── MapCanvas/
│       └── MapCanvas.tsx         # Tool event dispatch
├── core/
│   ├── editor/
│   │   └── EditorState.ts        # Tool state management
│   └── map/
│       ├── types.ts              # ToolType enum
│       ├── GameObjectSystem.ts   # Tool implementation
│       └── GameObjectData.ts     # Tool data arrays
```

### Pattern 1: Declarative Tool Registration
**What:** Tools are registered by adding entries to typed arrays
**When to use:** Adding any new toolbar tool
**Example:**
```typescript
// From ToolBar.tsx:30-34
const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: '\u{1F6A9}', shortcut: 'F' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: '\u26F3', shortcut: 'P' },
  { tool: ToolType.WARP, label: 'Warp', icon: '\u25CE', shortcut: 'T' },
];

const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: '\u229E', shortcut: 'K' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: '\u229F', shortcut: 'N' },
];
```

### Pattern 2: Centralized Keyboard Handling
**What:** Single useEffect hook processes all tool shortcuts
**When to use:** All keyboard shortcut additions
**Example:**
```typescript
// From ToolBar.tsx:88-130
React.useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl shortcuts (file operations)
      switch (e.key.toLowerCase()) {
        case 's': e.preventDefault(); onSaveMap(); break;
        // ...
      }
      return;
    }
    // Tool shortcuts (single key, no modifiers)
    const tool = allToolsWithShortcuts.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
    if (tool) setTool(tool.tool);
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [setTool, undo, redo, onNewMap, onOpenMap, onSaveMap]);
```

### Pattern 3: Tool Event Dispatch
**What:** MapCanvas routes tool clicks to appropriate handlers based on currentTool
**When to use:** All game object tool placement
**Example:**
```typescript
// From MapCanvas.tsx:521-527
if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
    currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH ||
    currentTool === ToolType.WARP) {
  // Click-to-stamp game object tools
  pushUndo('Place game object');
  placeGameObject(x, y);
}
```

### Pattern 4: Contextual Tool Options Panel
**What:** GameObjectToolPanel shows/hides options based on active tool
**When to use:** Tools with configurable parameters
**Example:**
```typescript
// From GameObjectToolPanel.tsx:68-81
{currentTool === ToolType.SPAWN && (
  <div className="gotool-field">
    <label className="gotool-label">Type:</label>
    <select
      className="gotool-select"
      value={spawnType}
      onChange={(e) => setSpawnType(Number(e.target.value))}
    >
      <option value={0}>Type 1</option>
      <option value={1}>Type 2</option>
      <option value={2}>Type 3</option>
    </select>
  </div>
)}
```

### Pattern 5: Tool State in Zustand Store
**What:** All tool configuration stored centrally, accessed via hooks
**When to use:** Tool needs to remember settings between activations
**Example:**
```typescript
// From EditorState.ts:127-139
export interface GameObjectToolState {
  selectedTeam: Team;
  warpSrc: number;
  warpDest: number;
  warpStyle: number;
  spawnType: number;
  bunkerDir: number;
  bunkerStyle: number;
  holdingPenType: number;
  bridgeDir: number;
  conveyorDir: number;
  switchType: number;
}
```

### Anti-Patterns to Avoid
- **Individual button components:** Current array pattern is cleaner and prevents inconsistency
- **Multiple keyboard listeners:** Current centralized approach prevents conflicts and memory leaks
- **Hardcoded tool checks everywhere:** Use Set-based categorization (TEAM_TOOLS, CUSTOM_DAT_TOOLS) instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool button state management | Custom toggle logic | React state + CSS classes | Toolbar already uses `.active` class pattern |
| Keyboard shortcut conflicts | Manual key checking | Centralized registry in useEffect | Already prevents Ctrl+key conflicts, easy to audit |
| Tool categorization | Individual if statements | Set-based lookups | `TEAM_TOOLS.has(currentTool)` is cleaner, faster |
| Tool-specific UI rendering | Switch statements | Conditional rendering with `&&` | GameObjectToolPanel already uses this pattern |
| Custom.dat validation | Tool-level checks | `hasCustomData()` utility | Already implemented in GameObjectData.ts |

**Key insight:** All infrastructure for toolbar tools already exists. Adding new tools is purely declarative - no new systems needed.

## Common Pitfalls

### Pitfall 1: Keyboard Shortcut Conflicts
**What goes wrong:** Assigning 'S', 'W', or 'B' will conflict with existing tools or file operations
**Why it happens:**
- 'S' = Ctrl+S for Save (file operation with modifier)
- 'W' = WALL tool (already assigned)
- 'B' = PENCIL tool (already assigned, historically "Brush")
**How to avoid:** Choose non-conflicting single letters
**Warning signs:** Tool doesn't activate, or wrong tool activates
**Recommended shortcuts:**
- SPAWN: 'M' (Spawn point, not conflicting)
- SWITCH: 'H' (Switch, not conflicting - 'H' is used by theme but theme uses 'W'/'H'/'D' display, not shortcuts)
- BRIDGE: 'J' (Bridge, not conflicting)
**Alternative if conflicts occur:** Use Ctrl+Alt+key pattern (see research sources)

### Pitfall 2: Tool Category Misplacement
**What goes wrong:** Adding tool to wrong array (stamp vs rect) breaks event handling
**Why it happens:** SPAWN/SWITCH are 3x3 stamp tools, BRIDGE is drag-to-rect tool
**How to avoid:**
- Stamp tools (click-to-place 3x3): Add to `gameObjectStampTools` array
- Rect tools (drag-to-define): Add to `gameObjectRectTools` array
**Warning signs:** Tool doesn't place correctly, cursor preview wrong size
**Code reference:**
```typescript
// Stamp tools in MapCanvas.tsx:521-527
if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
    currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH || ...)

// Rect tools in MapCanvas.tsx:527-531
if (currentTool === ToolType.BUNKER || currentTool === ToolType.HOLDING_PEN ||
    currentTool === ToolType.BRIDGE || currentTool === ToolType.CONVEYOR || ...)
```

### Pitfall 3: Missing GameObjectToolPanel UI
**What goes wrong:** Tool activates but no options panel appears
**Why it happens:** Tool not added to GAME_OBJECT_TOOLS set, or no conditional render block
**How to avoid:**
1. Add tool to `GAME_OBJECT_TOOLS` set in GameObjectToolPanel.tsx:23-27
2. Add conditional render block for tool-specific options
3. For SPAWN: add to `TEAM_TOOLS` set (shows team selector)
4. For SPAWN/SWITCH/BRIDGE: add to `CUSTOM_DAT_TOOLS` set (shows warning if no data)
**Warning signs:** Clicking tool works but right panel stays empty

### Pitfall 4: Custom.dat Dependency Not Communicated
**What goes wrong:** User clicks SPAWN/SWITCH/BRIDGE, tool seems broken (nothing happens)
**Why it happens:** These tools require custom.dat data to be loaded first
**How to avoid:**
- Tools already check `hasCustomData()` before placing
- GameObjectToolPanel already shows "Requires custom.dat" warning
- Verify tool is added to `CUSTOM_DAT_TOOLS` set
**Warning signs:** Tool button works but clicks on map do nothing, no error message

### Pitfall 5: Forgetting allToolsWithShortcuts Array
**What goes wrong:** Keyboard shortcut doesn't work even though tool button does
**Why it happens:** Tool added to specific array (gameObjectStampTools) but not included in `allToolsWithShortcuts` concatenation
**How to avoid:** Update line 46 in ToolBar.tsx:
```typescript
// Current (line 46):
const allToolsWithShortcuts = [...tools, ...gameObjectStampTools, ...gameObjectRectTools, ...wallDrawTools];

// After adding SPAWN/SWITCH/BRIDGE, verify they're in the included arrays
```
**Warning signs:** Clicking toolbar button works, pressing key does nothing

## Code Examples

Verified patterns from codebase:

### Adding SPAWN Tool to Toolbar (Stamp Tool)
```typescript
// Source: ToolBar.tsx lines 30-34 (modified)
const gameObjectStampTools: ToolButton[] = [
  { tool: ToolType.FLAG, label: 'Flag', icon: '\u{1F6A9}', shortcut: 'F' },
  { tool: ToolType.FLAG_POLE, label: 'Pole', icon: '\u26F3', shortcut: 'P' },
  { tool: ToolType.WARP, label: 'Warp', icon: '\u25CE', shortcut: 'T' },
  { tool: ToolType.SPAWN, label: 'Spawn', icon: '⭐', shortcut: 'M' }, // NEW
  { tool: ToolType.SWITCH, label: 'Switch', icon: '🔘', shortcut: 'H' }, // NEW
];
```

### Adding BRIDGE Tool to Toolbar (Rect Tool)
```typescript
// Source: ToolBar.tsx lines 36-39 (modified)
const gameObjectRectTools: ToolButton[] = [
  { tool: ToolType.BUNKER, label: 'Bunker', icon: '\u229E', shortcut: 'K' },
  { tool: ToolType.HOLDING_PEN, label: 'H.Pen', icon: '\u229F', shortcut: 'N' },
  { tool: ToolType.BRIDGE, label: 'Bridge', icon: '🌉', shortcut: 'J' }, // NEW
];
```

### Adding SPAWN to MapCanvas Event Handling
```typescript
// Source: MapCanvas.tsx lines 521-527 (no changes needed - already future-proof)
// The conditional already checks ToolType.SPAWN, just needs to be registered in toolbar
if (currentTool === ToolType.FLAG || currentTool === ToolType.FLAG_POLE ||
    currentTool === ToolType.SPAWN || currentTool === ToolType.SWITCH ||
    currentTool === ToolType.WARP) {
  pushUndo('Place game object');
  placeGameObject(x, y);
}
```

### Adding SPAWN Options to GameObjectToolPanel
```typescript
// Source: GameObjectToolPanel.tsx (add to file)

// 1. Add to tool sets (lines 13-27, modified)
const TEAM_TOOLS = new Set([
  ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.HOLDING_PEN
]);

const CUSTOM_DAT_TOOLS = new Set([
  ToolType.SPAWN, ToolType.SWITCH, ToolType.BRIDGE, ToolType.CONVEYOR
]);

const GAME_OBJECT_TOOLS = new Set([
  ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH,
  ToolType.WARP, ToolType.BUNKER, ToolType.HOLDING_PEN, ToolType.BRIDGE,
  ToolType.CONVEYOR, ToolType.WALL_PENCIL, ToolType.WALL_RECT
]);

// 2. Spawn type selector already implemented (lines 68-81)
{currentTool === ToolType.SPAWN && (
  <div className="gotool-field">
    <label className="gotool-label">Type:</label>
    <select className="gotool-select" value={spawnType} onChange={(e) => setSpawnType(Number(e.target.value))}>
      <option value={0}>Type 1</option>
      <option value={1}>Type 2</option>
      <option value={2}>Type 3</option>
    </select>
  </div>
)}

// 3. Switch type selector already implemented (lines 84-98)
{currentTool === ToolType.SWITCH && (
  <div className="gotool-field">
    <label className="gotool-label">Type:</label>
    <select className="gotool-select" value={switchType} onChange={(e) => setSwitchType(Number(e.target.value))}>
      {switchData.map((_, i) => (
        <option key={i} value={i}>Switch {i + 1}</option>
      ))}
    </select>
  </div>
)}

// 4. Bridge direction already implemented (lines 188-200)
{currentTool === ToolType.BRIDGE && (
  <div className="gotool-field">
    <label className="gotool-label">Direction:</label>
    <select className="gotool-select" value={bridgeDir} onChange={(e) => setBridgeDirection(Number(e.target.value))}>
      <option value={0}>Horizontal</option>
      <option value={1}>Vertical</option>
    </select>
  </div>
)}
```

### Toolbar Button States (Already Implemented)
```css
/* Source: ToolBar.css - no changes needed */

/* Flat at rest */
.toolbar-button {
  border: 1px solid transparent;
  background: transparent;
}

/* Raised on hover */
.toolbar-button:hover:not(:disabled) {
  border-top: 1px solid var(--win98-ButtonHighlight);
  border-left: 1px solid var(--win98-ButtonHighlight);
  border-right: 1px solid var(--win98-ButtonDkShadow);
  border-bottom: 1px solid var(--win98-ButtonDkShadow);
}

/* Sunken when active (tool selected) */
.toolbar-button.active {
  border-top: 1px solid var(--win98-ButtonDkShadow);
  border-left: 1px solid var(--win98-ButtonDkShadow);
  border-right: 1px solid var(--win98-ButtonHighlight);
  border-bottom: 1px solid var(--win98-ButtonHighlight);
  background: var(--win98-ButtonShadow);
}
```

### Canvas Cursor Preview for Stamp Tools (Already Implemented)
```typescript
// Source: MapCanvas.tsx lines 293-308 (no changes needed - already includes SPAWN/SWITCH)
const stampTools = new Set([ToolType.FLAG, ToolType.FLAG_POLE, ToolType.SPAWN, ToolType.SWITCH]);
if (cursorTile.x >= 0 && cursorTile.y >= 0 && stampTools.has(currentTool)) {
  const cx = cursorTile.x;
  const cy = cursorTile.y;
  const valid = cx - 1 >= 0 && cx + 1 < MAP_WIDTH && cy - 1 >= 0 && cy + 1 < MAP_HEIGHT;
  const screen = tileToScreen(cx - 1, cy - 1);

  ctx.strokeStyle = valid ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 64, 64, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(screen.x + 1, screen.y + 1, 3 * tilePixels - 2, 3 * tilePixels - 2);

  // Cross-hair at center
  const centerScreen = tileToScreen(cx, cy);
  ctx.fillStyle = valid ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 64, 64, 0.2)';
  ctx.fillRect(centerScreen.x, centerScreen.y, tilePixels, tilePixels);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual tool buttons | Declarative array registration | Phase 13 | Easier to add tools consistently |
| Scattered keyboard listeners | Centralized useEffect hook | Phase 13 | Prevents conflicts, easier to audit |
| Manual tool state management | Zustand store | Phase 12 | Centralized state, React best practice |
| Inline tool logic | GameObjectSystem class | Phase 13 | Matches SEdit implementation exactly |
| Box-shadow bevels | Border-only Win98 style | Phase 12 | Authentic Win98 appearance |

**Deprecated/outdated:**
- None - codebase is current with modern React patterns (hooks, functional components)

## Open Questions

Things that couldn't be fully resolved:

1. **Keyboard Shortcut Character Conflicts**
   - What we know: 'S', 'W', 'B' are already assigned or reserved
   - What's unclear: Whether 'M', 'H', 'J' are acceptable to user (no requirements specified)
   - Recommendation: Use M/H/J for SPAWN/SWITCH/BRIDGE respectively. If user objects, can easily change single character in ToolButton array.

2. **Icon Selection for New Tools**
   - What we know: Existing tools use Unicode emoji/symbols
   - What's unclear: Best Unicode characters for SPAWN (spawn point), SWITCH (switch), BRIDGE (bridge)
   - Recommendation:
     - SPAWN: ⭐ (star, U+2B50) or 🎯 (bullseye, U+1F3AF)
     - SWITCH: 🔘 (radio button, U+1F518) or ⚙ (gear, U+2699)
     - BRIDGE: 🌉 (bridge at night, U+1F309) or — (em dash as simple bridge shape)
   - Note: Can be changed post-implementation based on visual preference

3. **Custom.dat Loading UX**
   - What we know: Tools show "Requires custom.dat" warning, but no way to load it from UI
   - What's unclear: Whether custom.dat loading should be part of this phase
   - Recommendation: Out of scope for Phase 14. Warning message is sufficient - user can load custom.dat via file system until Phase 15+ adds UI.

## Sources

### Primary (HIGH confidence)
- Codebase analysis - all files read directly from E:\NewMapEditor\src
- ToolBar.tsx - lines 19-46 (tool registration patterns)
- MapCanvas.tsx - lines 521-531 (tool event dispatch)
- GameObjectToolPanel.tsx - lines 13-27 (tool categorization)
- EditorState.ts - lines 127-139 (tool state interface)
- GameObjectSystem.ts - lines 99-118 (SPAWN/SWITCH implementation verified)
- types.ts - lines 101-124 (ToolType enum complete list)

### Secondary (MEDIUM confidence)
- [Adding Keyboard Shortcuts to Your React App - DEV Community](https://dev.to/lalitkhu/implement-keyboard-shortcuts-in-your-react-app-475c) - React keyboard patterns
- [React Hotkeys Hook](https://react-hotkeys-hook.vercel.app/) - Hook patterns (not using library, but patterns apply)
- [Guidelines for Keyboard User Interface Design - Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/dnacc/guidelines-for-keyboard-user-interface-design) - Conflict resolution
- [How to design great keyboard shortcuts - Knock](https://knock.app/blog/how-to-design-great-keyboard-shortcuts) - Discoverability patterns
- [98.css - Windows UI recreation](https://jdan.github.io/98.css/) - Win98 button states reference

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all infrastructure exists, verified in codebase
- Architecture: HIGH - patterns are established and consistent across existing tools
- Pitfalls: HIGH - derived from actual codebase structure, not theoretical

**Research date:** 2026-02-04
**Valid until:** 60 days (stable codebase, no fast-moving dependencies)

**Critical implementation notes:**
1. SPAWN and SWITCH go in `gameObjectStampTools` array (3x3 stamp)
2. BRIDGE goes in `gameObjectRectTools` array (drag-to-rect)
3. All three are already implemented in GameObjectSystem.ts - no logic changes needed
4. All three already have event handling in MapCanvas.tsx - no changes needed
5. GameObjectToolPanel already has UI for all three - just need to add to tool sets
6. Only changes needed: toolbar registration + keyboard shortcut assignment
