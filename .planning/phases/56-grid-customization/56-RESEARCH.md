# Phase 56: Grid Customization - Research

**Researched:** 2026-02-13
**Domain:** Canvas rendering, UI controls (sliders, color pickers), localStorage persistence
**Confidence:** HIGH

## Summary

Grid customization requires three main components: (1) UI controls for opacity/weight/color settings, (2) canvas rendering modifications to apply settings to the existing pattern-based grid, and (3) localStorage persistence for settings. The existing codebase already has robust patterns for all three areas.

The current grid implementation (MapCanvas.tsx lines 233-266) uses `createPattern()` with a cached pattern that regenerates on zoom changes. Grid customization extends this by making stroke color, opacity, and line width configurable instead of hardcoded.

The existing MapSettingsDialog already demonstrates production-ready slider controls (SettingInput.tsx) that can be reused for opacity and line weight. For color selection, native HTML5 `<input type="color">` provides zero-dependency color picking with broad browser support. Settings persistence follows the existing Zustand GlobalSlice pattern (globalSlice.ts lines 92-94 show showGrid boolean already persists).

**Primary recommendation:** Extend GlobalSlice with three grid settings fields (opacity, lineWeight, color), add UI controls to ToolBar or RightSidebar using existing SettingInput pattern plus native color input, modify grid rendering to use settings instead of hardcoded values, and persist to localStorage via Zustand subscribe.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas API | Native | Grid pattern rendering | Already used for grid (lines 233-266 MapCanvas.tsx), zero dependencies |
| HTML5 input[type=color] | Native | Color picker UI | Modern standard, zero dependencies, works in Electron/Chromium |
| localStorage | Native | Settings persistence | Browser standard, synchronous API, works in Electron renderer |
| Zustand | 4.x | State management | Existing store pattern, already persists showGrid toggle |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-colorful | 5.x | Advanced color picker | Only if native picker UX is insufficient (2.8KB, but adds dependency) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native color input | react-colorful library | Library is 2.8KB and provides richer UX, but native input is zero-cost and sufficient for grid color |
| localStorage | electron-store | electron-store provides schema validation and main-process access, but localStorage is simpler for renderer-only settings |
| Zustand GlobalSlice | Separate settings file | Zustand provides reactivity and already persists showGrid; separate file adds complexity |

**Installation:**
No new dependencies required — all features use existing stack (Canvas API, HTML5 inputs, localStorage, Zustand).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/editor/slices/globalSlice.ts     # Add gridOpacity, gridLineWeight, gridColor fields
├── components/MapCanvas/MapCanvas.tsx    # Modify grid rendering to use settings
├── components/ToolBar/ToolBar.tsx        # Add grid settings UI controls (or RightSidebar)
└── components/MapSettingsDialog/         # Reuse SettingInput.tsx pattern for sliders
    └── SettingInput.tsx                  # Reference implementation (already exists)
```

### Pattern 1: Grid Settings State (Zustand GlobalSlice)
**What:** Add three fields to GlobalSlice for grid appearance settings
**When to use:** Grid settings are shared across all documents (not per-document state)
**Example:**
```typescript
// src/core/editor/slices/globalSlice.ts
export interface GlobalSlice {
  // Existing fields...
  showGrid: boolean;

  // NEW: Grid appearance settings
  gridOpacity: number;      // 0-100 (percentage)
  gridLineWeight: number;   // 1-3 (pixels)
  gridColor: string;        // Hex color (#RRGGBB)

  // NEW: Grid setting actions
  setGridOpacity: (opacity: number) => void;
  setGridLineWeight: (weight: number) => void;
  setGridColor: (color: string) => void;
}

// Initial state defaults (align with current hardcoded values)
export const createGlobalSlice: StateCreator<GlobalSlice> = (set) => ({
  // ...existing state
  showGrid: false,
  gridOpacity: 10,          // Current: rgba(255,255,255,0.1) → 10%
  gridLineWeight: 1,        // Current: 1px
  gridColor: '#FFFFFF',     // Current: white

  // Actions
  setGridOpacity: (opacity) => set({ gridOpacity: Math.max(0, Math.min(100, opacity)) }),
  setGridLineWeight: (weight) => set({ gridLineWeight: Math.max(1, Math.min(3, weight)) }),
  setGridColor: (color) => set({ gridColor: color }),
});
```
**Source:** Existing pattern from globalSlice.ts lines 92-94 (showGrid toggle)

### Pattern 2: Dynamic Grid Pattern Generation
**What:** Modify grid rendering to use configurable settings instead of hardcoded values
**When to use:** Grid pattern cache must regenerate when settings change (opacity, weight, color, OR zoom)
**Example:**
```typescript
// src/components/MapCanvas/MapCanvas.tsx (lines 233-266)
// CURRENT: Hardcoded rgba(255, 255, 255, 0.1) with lineWidth 1
// NEW: Use Zustand state values

const { showGrid, gridOpacity, gridLineWeight, gridColor } = useEditorStore(
  useShallow((state) => ({
    showGrid: state.showGrid,
    gridOpacity: state.gridOpacity,
    gridLineWeight: state.gridLineWeight,
    gridColor: state.gridColor
  }))
);

// Invalidate pattern cache when ANY grid setting changes (not just zoom)
const gridCacheKeyRef = useRef<string>('');

// Inside drawUiLayer callback:
if (showGrid) {
  const tilePixelSize = Math.round(TILE_SIZE * vp.zoom);
  const cacheKey = `${tilePixelSize}-${gridOpacity}-${gridLineWeight}-${gridColor}`;

  if (gridCacheKeyRef.current !== cacheKey) {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = tilePixelSize;
    patternCanvas.height = tilePixelSize;
    const pctx = patternCanvas.getContext('2d');
    if (pctx) {
      // Convert hex color to rgba with opacity
      const r = parseInt(gridColor.slice(1, 3), 16);
      const g = parseInt(gridColor.slice(3, 5), 16);
      const b = parseInt(gridColor.slice(5, 7), 16);
      const alpha = gridOpacity / 100;

      pctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      pctx.lineWidth = gridLineWeight;
      pctx.beginPath();
      pctx.moveTo(0, 0);
      pctx.lineTo(tilePixelSize, 0);
      pctx.moveTo(0, 0);
      pctx.lineTo(0, tilePixelSize);
      pctx.stroke();

      gridPatternRef.current = ctx.createPattern(patternCanvas, 'repeat');
      gridCacheKeyRef.current = cacheKey;
    }
  }
  // ... rest of grid rendering (fill with pattern)
}
```
**Source:** Current implementation at MapCanvas.tsx lines 233-266, modified to use dynamic settings

### Pattern 3: Slider Controls (Reuse Existing Component)
**What:** Use SettingInput.tsx pattern for opacity and line weight sliders
**When to use:** When adding range-based settings with min/max bounds
**Example:**
```typescript
// In ToolBar.tsx or new GridSettingsPanel component
import { SettingInput } from '../MapSettingsDialog/SettingInput';

const gridOpacity = useEditorStore(state => state.gridOpacity);
const setGridOpacity = useEditorStore(state => state.setGridOpacity);
const gridLineWeight = useEditorStore(state => state.gridLineWeight);
const setGridLineWeight = useEditorStore(state => state.setGridLineWeight);

// Opacity slider (0-100%)
<SettingInput
  setting={{
    key: 'gridOpacity',
    label: 'Grid Opacity',
    min: 0,
    max: 100,
    default: 10,
    category: 'Grid'
  }}
  value={gridOpacity}
  onChange={setGridOpacity}
  onReset={() => setGridOpacity(10)}
/>

// Line weight slider (1-3px)
<SettingInput
  setting={{
    key: 'gridLineWeight',
    label: 'Line Weight',
    min: 1,
    max: 3,
    default: 1,
    category: 'Grid'
  }}
  value={gridLineWeight}
  onChange={setGridLineWeight}
  onReset={() => setGridLineWeight(1)}
/>
```
**Source:** SettingInput.tsx lines 1-74, MapSettingsDialog.css lines 254-288 (slider styling)

### Pattern 4: Native Color Picker
**What:** HTML5 `<input type="color">` for zero-dependency color selection
**When to use:** Simple hex color picking with native OS color dialog
**Example:**
```typescript
// In grid settings UI component
const gridColor = useEditorStore(state => state.gridColor);
const setGridColor = useEditorStore(state => state.setGridColor);

<div className="color-input-row">
  <label className="setting-label">Grid Color</label>
  <input
    type="color"
    value={gridColor}
    onChange={(e) => setGridColor(e.target.value)}
    className="color-picker-input"
  />
  <span className="color-value-display">{gridColor}</span>
  <button
    onClick={() => setGridColor('#FFFFFF')}
    className="reset-button"
    title="Reset to default"
  >
    &#8634;
  </button>
</div>

/* CSS for color input */
.color-picker-input {
  width: 40px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.color-value-display {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
```
**Source:** HTML5 standard, existing CSS token system from variables.css

### Pattern 5: localStorage Persistence (Zustand Subscribe)
**What:** Persist grid settings to localStorage and restore on init
**When to use:** Settings should survive application restart
**Example:**
```typescript
// src/core/editor/EditorState.ts (store initialization)
const STORAGE_KEY = 'ac-map-editor-grid-settings';

interface GridSettings {
  opacity: number;
  lineWeight: number;
  color: string;
}

// Load persisted settings on store creation
const loadGridSettings = (): Partial<GridSettings> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Apply persisted settings to initial state
const persisted = loadGridSettings();
const store = create<EditorState>()((...args) => ({
  ...createGlobalSlice(...args),
  ...createDocumentsSlice(...args),
  ...createWindowSlice(...args),

  // Override defaults with persisted values
  gridOpacity: persisted.opacity ?? 10,
  gridLineWeight: persisted.lineWeight ?? 1,
  gridColor: persisted.color ?? '#FFFFFF',
}));

// Subscribe to changes and persist
store.subscribe((state, prevState) => {
  if (
    state.gridOpacity !== prevState.gridOpacity ||
    state.gridLineWeight !== prevState.gridLineWeight ||
    state.gridColor !== prevState.gridColor
  ) {
    const settings: GridSettings = {
      opacity: state.gridOpacity,
      lineWeight: state.gridLineWeight,
      color: state.gridColor,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
});
```
**Source:** Pattern adapted from [Mastering State Persistence with Local Storage in React](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c), existing Zustand subscribe pattern from CanvasEngine.ts lines 410-449

### Anti-Patterns to Avoid
- **Pattern cache per-zoom only:** Don't cache on zoom alone — cache key must include all settings (opacity, weight, color, zoom) or pattern won't update when settings change
- **Unvalidated color input:** Don't trust user input — validate hex format and clamp opacity/weight to min/max bounds
- **Per-document grid settings:** Grid appearance is global UI state, not per-document — use GlobalSlice, not DocumentsSlice
- **Synchronous render blocking:** Don't block rendering on localStorage reads — load once on init, persist async via subscribe

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color picker | Custom HSV/RGB picker UI | Native `<input type="color">` | Browser-native color dialog, OS integration, zero dependencies, hex output |
| Settings validation | Manual min/max clamping per field | Reuse SettingInput component | Already handles clamping, reset buttons, number inputs with slider sync |
| localStorage sync | Manual save on every state change | Zustand subscribe pattern | Batches writes, prevents race conditions, handles serialization errors |
| Pattern cache invalidation | Separate refs for zoom/opacity/weight/color | Single cache key string | String concat avoids multi-ref comparison bugs |

**Key insight:** The existing codebase already has production-ready patterns for sliders (SettingInput.tsx), pattern caching (MapCanvas.tsx grid code), and state management (GlobalSlice). Grid customization is 90% integration, 10% new code.

## Common Pitfalls

### Pitfall 1: Pattern Cache Invalidation
**What goes wrong:** Grid doesn't update when settings change, only when zoom changes
**Why it happens:** Cache key only checks zoom (gridPatternZoomRef.current), not opacity/weight/color
**How to avoid:** Use composite cache key string like `${zoom}-${opacity}-${weight}-${color}` instead of single number
**Warning signs:** Grid color/opacity changes require toggling grid off/on to see effect

### Pitfall 2: Color Format Mismatch
**What goes wrong:** Native color picker returns lowercase hex (#ffffff), CSS expects uppercase, or rgba() conversion fails
**Why it happens:** JavaScript's `parseInt(hex, 16)` works case-insensitive but string comparisons don't
**How to avoid:** Normalize to uppercase on input with `.toUpperCase()`, or use case-insensitive cache keys
**Warning signs:** Pattern regenerates on every frame despite "identical" color values

### Pitfall 3: localStorage Quota Exceeded
**What goes wrong:** localStorage.setItem() throws QuotaExceededError in edge cases
**Why it happens:** Browsers limit localStorage to 5-10MB, JSON serialization of large state
**How to avoid:** Wrap setItem in try/catch, store only grid settings (not entire state), fail gracefully
**Warning signs:** Settings don't persist after multiple restarts, console errors on save

### Pitfall 4: Hardcoded Line Width with Pattern Scale
**What goes wrong:** Line weight stays 1px at all zoom levels, appears too thin at 4x zoom
**Why it happens:** Pattern canvas size scales with zoom, but lineWidth is hardcoded to 1
**How to avoid:** Keep lineWidth as physical pixels (1-3px), NOT scaled by zoom — pattern repeat handles scale
**Warning signs:** Grid lines disappear or become too thick at high zoom levels

### Pitfall 5: Missing UI Redraw Trigger
**What goes wrong:** Grid settings change in Zustand, but UI layer doesn't redraw
**Why it happens:** drawUiLayer dependencies don't include gridOpacity/gridLineWeight/gridColor
**How to avoid:** Add grid settings to drawUiLayer's useCallback dependencies OR use Zustand subscribe
**Warning signs:** Grid changes only appear after mouse move or other UI interaction

## Code Examples

Verified patterns from project codebase:

### Existing Grid Rendering (Current Implementation)
```typescript
// Source: MapCanvas.tsx lines 233-266
// This is the CURRENT code to be modified

if (showGrid) {
  const tilePixelSize = Math.round(TILE_SIZE * vp.zoom);
  if (tilePixelSize > 0) {
    // Recreate pattern when zoom changes
    if (gridPatternZoomRef.current !== tilePixelSize) {
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = tilePixelSize;
      patternCanvas.height = tilePixelSize;
      const pctx = patternCanvas.getContext('2d');
      if (pctx) {
        pctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';  // HARDCODED
        pctx.lineWidth = 1;                             // HARDCODED
        pctx.beginPath();
        pctx.moveTo(0, 0);
        pctx.lineTo(tilePixelSize, 0);
        pctx.moveTo(0, 0);
        pctx.lineTo(0, tilePixelSize);
        pctx.stroke();
        gridPatternRef.current = ctx.createPattern(patternCanvas, 'repeat');
        gridPatternZoomRef.current = tilePixelSize;
      }
    }
    if (gridPatternRef.current) {
      const offsetX = -(vp.x % 1) * tilePixelSize;
      const offsetY = -(vp.y % 1) * tilePixelSize;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.fillStyle = gridPatternRef.current;
      ctx.fillRect(-tilePixelSize, -tilePixelSize, canvas.width + tilePixelSize * 2, canvas.height + tilePixelSize * 2);
      ctx.restore();
    }
  }
}
```

### Existing Slider Component (Reuse Pattern)
```typescript
// Source: SettingInput.tsx lines 35-73
// This component already exists — reuse for grid sliders

return (
  <div className="setting-input-row">
    <label className="setting-input-label">{label}</label>
    <div className="setting-input-controls">
      <span className="range-label min">{min}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={handleSliderChange}
        className="setting-slider"
      />
      <span className="range-label max">{max}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        className="setting-number-input"
      />
      <button
        type="button"
        className="reset-button"
        onClick={onReset}
        disabled={isDefault}
        title={`Reset to default (${defaultValue})`}
      >
        &#8634;
      </button>
    </div>
  </div>
);
```

### Hex Color to RGBA Conversion
```typescript
// Utility function for converting hex + opacity to rgba string
function hexToRgba(hex: string, opacity: number): string {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse RGB components
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  // Clamp opacity to 0-1 range
  const alpha = Math.max(0, Math.min(1, opacity / 100));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Usage in grid rendering:
pctx.strokeStyle = hexToRgba(gridColor, gridOpacity);
```
**Source:** Pattern from [MDN Canvas API: Applying styles and colors](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External color picker libraries (react-color 2.x) | Native `<input type="color">` or react-colorful 5.x | ~2021 (Chromium 89+) | Native input eliminates 100KB+ dependencies for simple hex picking |
| electron-json-storage for settings | localStorage in renderer + electron-store for main process | ~2020 (Electron 9+) | Renderer-only settings use simpler localStorage, no IPC overhead |
| Manual localStorage sync on every setState | Zustand subscribe middleware | ~2021 (Zustand 3.0+) | Subscribe batches writes, prevents race conditions |
| Hardcoded grid appearance | User-configurable grid settings | Not yet implemented | Matches industry standard (Photoshop, Figma, Aseprite all allow grid customization) |

**Deprecated/outdated:**
- react-color (last updated 2018, 100KB+ bundle, React 16 patterns): Use native color input or react-colorful instead
- electron-settings (synchronous file I/O on main thread): Use localStorage for renderer state, electron-store for main process
- Grid pattern regeneration on every frame: Always cache pattern, invalidate only on settings/zoom change

## Open Questions

1. **UI Placement**
   - What we know: Grid toggle button exists in ToolBar
   - What's unclear: Should grid customization controls go in ToolBar (inline), RightSidebar (dedicated panel), or ToolBar dropdown menu?
   - Recommendation: Start with ToolBar dropdown (matches "Grid" button), can move to RightSidebar if controls feel cramped

2. **Default Grid Color**
   - What we know: Current hardcoded value is white (#FFFFFF) at 10% opacity
   - What's unclear: Should default adapt to theme (white for dark canvas, black for light canvas)?
   - Recommendation: Keep white #FFFFFF default for now, theme-aware colors can be Phase 57+

3. **Line Weight Physical vs Logical Pixels**
   - What we know: Current implementation uses physical pixels (lineWidth = 1)
   - What's unclear: Should line weight scale with zoom (1px at 1x = 4px at 4x) or stay constant?
   - Recommendation: Keep physical pixels (constant visual weight), aligns with existing implementation and user expectations

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `E:\NewMapEditor\src\components\MapCanvas\MapCanvas.tsx` (lines 233-266) - Current grid rendering implementation
  - `E:\NewMapEditor\src\components\MapSettingsDialog\SettingInput.tsx` (lines 1-74) - Slider component pattern
  - `E:\NewMapEditor\src\core\editor\slices\globalSlice.ts` (lines 14-62, 92-94) - State management pattern
  - `E:\NewMapEditor\src\styles\variables.css` (lines 1-186) - CSS design token system
- [MDN: Canvas API - Applying styles and colors](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors) - Canvas strokeStyle, lineWidth, globalAlpha
- [HTML Living Standard: input type=color](https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)) - Native color picker specification

### Secondary (MEDIUM confidence)
- [react-colorful GitHub](https://github.com/omgovich/react-colorful) - Verified library if native picker insufficient (2.8KB, 5.5k stars)
- [Mastering State Persistence with Local Storage in React](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c) - localStorage patterns with React hooks
- [Flexible Canvas Grid (without blurred lines)](https://xon5.medium.com/flexible-canvas-grid-without-blurred-lines-907fcadf5bfc) - Canvas grid rendering best practices

### Tertiary (LOW confidence)
- [10 Best Color Pickers For React (2026 Update)](https://reactscript.com/best-color-picker/) - Library comparison (not needed for native input approach)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All features use existing codebase patterns or native browser APIs
- Architecture: HIGH - Grid rendering, Zustand state, and UI patterns already proven in production code
- Pitfalls: MEDIUM-HIGH - Based on Canvas API documentation and common localStorage gotchas, not project-specific experience

**Research date:** 2026-02-13
**Valid until:** ~60 days (Canvas API/localStorage are stable standards, React patterns mature)
