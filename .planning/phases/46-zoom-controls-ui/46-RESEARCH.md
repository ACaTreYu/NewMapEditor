# Phase 46: Zoom Controls UI - Research

**Researched:** 2026-02-11
**Domain:** React UI components for zoom controls (slider, input, presets, keyboard shortcuts)
**Confidence:** HIGH

## Summary

Phase 46 adds professional zoom controls to the status bar. The current implementation has zoom state in Zustand (`viewport.zoom`, range 0.25-4.0) and mouse wheel zoom-to-cursor working correctly. This phase adds UI controls: numeric input field, range slider, preset buttons (25%, 50%, 100%, 200%, 400%), and keyboard shortcuts (Ctrl+0, Ctrl+=, Ctrl+-).

Research reveals that native HTML `<input type="range">` and `<input type="number">` are the standard approaches in 2026, avoiding third-party slider libraries. Custom CSS styling with vendor prefixes provides cross-browser consistency. The controlled input pattern with React state ensures real-time synchronization between all controls.

**Primary recommendation:** Use native HTML range and number inputs with custom CSS styling. Implement controlled components that all sync to Zustand `viewport.zoom`. Place controls in StatusBar component between existing zoom display and tool indicator.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | Controlled inputs | Already in use; native DOM APIs sufficient |
| Zustand | existing | Zoom state management | Already manages viewport.zoom |
| TypeScript | existing | Type safety | Already in use |

### Supporting
No additional libraries needed. Native HTML inputs suffice.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native inputs | react-range, rc-slider | Adds bundle size, complexity for features we don't need |
| Native inputs | Material-UI Slider | Heavy dependency for single component |
| CSS styling | Headless UI library | Over-engineered for simple slider |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/StatusBar/
├── StatusBar.tsx         # Main component (add zoom controls)
├── StatusBar.css         # Existing styles (extend with zoom control styles)
└── ZoomControls.tsx      # Optional: Extract to sub-component for clarity
```

**Decision:** Start with inline controls in StatusBar.tsx. Extract to ZoomControls.tsx only if complexity warrants it.

### Pattern 1: Controlled Input Synchronization
**What:** All zoom controls (slider, input, presets, keyboard) update the same Zustand state
**When to use:** When multiple UI elements control the same value
**Example:**
```typescript
// StatusBar.tsx
const { viewport, setViewport } = useEditorStore(
  useShallow((state) => ({
    viewport: state.viewport,
    setViewport: state.setViewport
  }))
);

const handleZoomChange = (newZoom: number) => {
  const clampedZoom = Math.max(0.25, Math.min(4, newZoom));
  setViewport({ zoom: clampedZoom });
};

// Slider
<input
  type="range"
  min={0.25}
  max={4}
  step={0.01}
  value={viewport.zoom}
  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
/>

// Number input
<input
  type="number"
  min={25}
  max={400}
  value={Math.round(viewport.zoom * 100)}
  onChange={(e) => handleZoomChange(parseInt(e.target.value) / 100)}
/>

// Preset button
<button onClick={() => handleZoomChange(1)}>100%</button>
```

### Pattern 2: Keyboard Shortcuts with useEffect
**What:** Global keyboard listener for Ctrl+0, Ctrl+=, Ctrl+-
**When to use:** For app-wide keyboard shortcuts
**Example:**
```typescript
// StatusBar.tsx or dedicated hook
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;

    if (e.key === '0') {
      e.preventDefault();
      setViewport({ zoom: 1 }); // Reset to 100%
    } else if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      // Zoom in to next preset or +25%
      const presets = [0.25, 0.5, 1, 2, 4];
      const nextPreset = presets.find(p => p > viewport.zoom);
      setViewport({ zoom: nextPreset || Math.min(4, viewport.zoom + 0.25) });
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      // Zoom out to previous preset or -25%
      const presets = [0.25, 0.5, 1, 2, 4];
      const prevPreset = [...presets].reverse().find(p => p < viewport.zoom);
      setViewport({ zoom: prevPreset || Math.max(0.25, viewport.zoom - 0.25) });
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [viewport.zoom, setViewport]);
```

### Pattern 3: Range Input Custom Styling
**What:** Cross-browser consistent styling for `<input type="range">`
**When to use:** Always for professional appearance
**Example:**
```css
/* Source: https://www.smashingmagazine.com/2021/12/create-custom-range-input-consistent-browsers/ */

/* Remove default styling */
.zoom-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 120px;
}

/* Track styles - WebKit browsers */
.zoom-slider::-webkit-slider-runnable-track {
  background: var(--slider-track);
  height: 4px;
  border-radius: var(--radius-full);
}

/* Track styles - Firefox */
.zoom-slider::-moz-range-track {
  background: var(--slider-track);
  height: 4px;
  border-radius: var(--radius-full);
}

/* Thumb styles - WebKit browsers */
.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 1px solid var(--border-default);
  margin-top: -5px; /* Center on track */
}

/* Thumb styles - Firefox */
.zoom-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 1px solid var(--border-default);
}

/* Hover/active states */
.zoom-slider::-webkit-slider-thumb:hover {
  background: var(--slider-thumb-active);
}

.zoom-slider::-moz-range-thumb:hover {
  background: var(--slider-thumb-active);
}
```

### Pattern 4: Button Disable at Limits
**What:** Disable zoom in/out buttons when at min/max
**When to use:** For UI clarity and preventing invalid actions
**Example:**
```typescript
const canZoomIn = viewport.zoom < 4;
const canZoomOut = viewport.zoom > 0.25;

<button
  className="zoom-preset-btn"
  disabled={!canZoomOut}
  onClick={() => handleZoomChange(viewport.zoom - 0.25)}
  aria-label="Zoom out"
>
  -
</button>

<button
  className="zoom-preset-btn"
  disabled={!canZoomIn}
  onClick={() => handleZoomChange(viewport.zoom + 0.25)}
  aria-label="Zoom in"
>
  +
</button>
```

```css
/* Style disabled buttons */
.zoom-preset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none; /* Prevent clicks */
}
```

### Anti-Patterns to Avoid
- **Debouncing zoom input:** Causes laggy feedback. Update immediately; Zustand handles re-renders efficiently.
- **Uncontrolled inputs:** Creates desync between input display and actual zoom. Always use controlled pattern.
- **Percentage as internal state:** Store zoom as multiplier (0.25-4), only convert to percentage for display.
- **Using `aria-disabled` instead of `disabled`:** Native `disabled` provides correct semantics and prevents keyboard activation. Only use `aria-disabled` for custom elements (not needed here).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range slider | Custom drag logic | Native `<input type="range">` | Browser handles drag, touch, keyboard, accessibility |
| Number validation | Manual min/max checks | HTML `min`/`max` attributes + controlled pattern | Browser validates, shows spinners, handles edge cases |
| Percentage formatting | String manipulation | `Math.round(zoom * 100)` | Simple, no edge cases |
| Keyboard shortcuts | Custom event parsing | Standard Ctrl+0/+/- conventions | Users expect these shortcuts; cross-platform (metaKey for Mac) |

**Key insight:** Native HTML inputs already solve 90% of the problem. Only custom styling is needed, not custom behavior.

## Common Pitfalls

### Pitfall 1: Slider Range Misconfiguration
**What goes wrong:** Slider min/max don't match zoom constraints (0.25-4), causing incorrect values
**Why it happens:** Copying slider examples without adjusting range
**How to avoid:** Explicitly set `min={0.25} max={4} step={0.01}` and test at boundaries
**Warning signs:** Slider thumb can't reach edges, zoom jumps unexpectedly

### Pitfall 2: Number Input Returns Strings
**What goes wrong:** `e.target.value` is a string, causes type errors or NaN
**Why it happens:** HTML inputs always return strings
**How to avoid:** Always parse: `parseInt(e.target.value)` or `parseFloat(e.target.value)`
**Warning signs:** TypeScript errors, zoom becomes NaN, viewport breaks

### Pitfall 3: Percentage/Multiplier Conversion Bugs
**What goes wrong:** Forgetting to divide by 100 when converting percentage input to zoom multiplier
**Why it happens:** Mixing percentage (25-400) and multiplier (0.25-4) representations
**How to avoid:** Convert at the boundary: input shows `zoom * 100`, onChange divides by 100
**Warning signs:** Zoom goes to 25x or 0.25% instead of expected value

### Pitfall 4: Keyboard Shortcuts Break Other Inputs
**What goes wrong:** Ctrl+= triggers zoom while user is typing in a text field
**Why it happens:** Global keydown listener doesn't check focus context
**How to avoid:** Check `document.activeElement` or use event target checking
**Warning signs:** Can't type "=" or "-" in any input field

**Better approach:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // Don't intercept if user is typing in an input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (!(e.ctrlKey || e.metaKey)) return;
  // ... handle shortcuts
};
```

### Pitfall 5: Zoom Presets Not Updating Button State
**What goes wrong:** Preset buttons don't show "active" state when zoom matches that preset
**Why it happens:** Forgetting to compare current zoom to preset values
**How to avoid:** Add active class when `Math.abs(viewport.zoom - preset) < 0.01`
**Warning signs:** Visual feedback is missing, users unsure which zoom level is active

## Code Examples

Verified patterns from official sources and codebase conventions:

### Zoom Slider Component
```typescript
// StatusBar.tsx
import React, { useEffect } from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import './StatusBar.css';

const ZOOM_PRESETS = [0.25, 0.5, 1, 2, 4];
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

export const StatusBar: React.FC<Props> = ({ cursorX, cursorY, cursorTileId, hoverSource }) => {
  const { viewport, setViewport, currentTool, tileSelection } = useEditorStore(
    useShallow((state) => ({
      viewport: state.viewport,
      setViewport: state.setViewport,
      currentTool: state.currentTool,
      tileSelection: state.tileSelection
    }))
  );

  const showSelection = tileSelection.width > 1 || tileSelection.height > 1;
  const zoomPercent = Math.round(viewport.zoom * 100);

  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    setViewport({ zoom: clampedZoom });
  };

  const handleZoomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseInt(e.target.value, 10);
    if (!isNaN(percent)) {
      handleZoomChange(percent / 100);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === '0') {
        e.preventDefault();
        setViewport({ zoom: 1 }); // Reset to 100%
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        const nextPreset = ZOOM_PRESETS.find(p => p > viewport.zoom);
        setViewport({ zoom: nextPreset || Math.min(ZOOM_MAX, viewport.zoom + 0.25) });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const prevPreset = [...ZOOM_PRESETS].reverse().find(p => p < viewport.zoom);
        setViewport({ zoom: prevPreset || Math.max(ZOOM_MIN, viewport.zoom - 0.25) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewport.zoom, setViewport]);

  return (
    <div className="status-bar">
      {/* Existing fields */}
      <div className="status-field status-field-coords">
        {/* ... existing coords display ... */}
      </div>

      <div className="status-field status-field-tile">
        {cursorTileId !== undefined ? `Tile: ${cursorTileId}` : 'Tile: --'}
      </div>

      {/* NEW: Zoom controls */}
      <div className="status-field status-field-zoom-controls">
        {/* Zoom slider */}
        <input
          type="range"
          className="zoom-slider"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={viewport.zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          aria-label="Zoom level"
        />

        {/* Zoom percentage input */}
        <input
          type="number"
          className="zoom-input"
          min={ZOOM_MIN * 100}
          max={ZOOM_MAX * 100}
          value={zoomPercent}
          onChange={handleZoomInput}
          aria-label="Zoom percentage"
        />
        <span className="zoom-percent-label">%</span>

        {/* Preset buttons */}
        {ZOOM_PRESETS.map(preset => {
          const isActive = Math.abs(viewport.zoom - preset) < 0.01;
          return (
            <button
              key={preset}
              className={`zoom-preset-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleZoomChange(preset)}
              title={`Zoom to ${preset * 100}%`}
            >
              {preset * 100}%
            </button>
          );
        })}
      </div>

      <div className="status-field">
        Tool: {currentTool}
      </div>

      {showSelection && (
        <div className="status-field">
          Sel: {tileSelection.width} x {tileSelection.height}
        </div>
      )}

      <div className="status-spacer" />
      <div className="status-resize-grip" />
    </div>
  );
};
```

### Zoom Controls CSS
```css
/* StatusBar.css - Add to existing file */

/* Zoom controls container */
.status-field-zoom-controls {
  display: flex;
  align-items: center;
  gap: var(--space-0_5);
  min-width: 350px;
}

/* Zoom slider */
.zoom-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 100px;
}

.zoom-slider::-webkit-slider-runnable-track {
  background: var(--slider-track);
  height: 4px;
  border-radius: var(--radius-full);
}

.zoom-slider::-moz-range-track {
  background: var(--slider-track);
  height: 4px;
  border-radius: var(--radius-full);
}

.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 1px solid var(--border-default);
  margin-top: -4px;
}

.zoom-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--slider-thumb);
  border: 1px solid var(--border-default);
}

.zoom-slider::-webkit-slider-thumb:hover {
  background: var(--slider-thumb-active);
}

.zoom-slider::-moz-range-thumb:hover {
  background: var(--slider-thumb-active);
}

/* Zoom number input */
.zoom-input {
  width: 48px;
  padding: var(--space-px) var(--space-0_5);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  text-align: right;
}

.zoom-input:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 2px var(--focus-ring);
}

/* Remove spinners for cleaner look */
.zoom-input::-webkit-inner-spin-button,
.zoom-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.zoom-input[type=number] {
  -moz-appearance: textfield;
}

.zoom-percent-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* Preset buttons */
.zoom-preset-btn {
  padding: var(--space-px) var(--space-0_75);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;
}

.zoom-preset-btn:hover {
  background: var(--bg-hover);
}

.zoom-preset-btn:active {
  background: var(--bg-active);
}

.zoom-preset-btn.active {
  background: var(--accent-primary);
  color: var(--text-on-accent);
  border-color: var(--accent-primary);
}

.zoom-preset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party slider libs | Native `<input type="range">` | ~2020 | Better performance, smaller bundles, accessibility built-in |
| jQuery UI slider | React controlled components | ~2016 | State-driven UI, better React integration |
| `::-webkit-slider-*` only | Cross-browser pseudo-elements | ~2021 | Firefox, Safari, Chrome all supported |
| `e.key === 'Add'` for + | `e.key === '=' \|\| e.key === '+'` | ~2019 | Works across keyboard layouts |

**Deprecated/outdated:**
- `react-input-range`: Unmaintained since 2019
- `nouislider`: Vanilla JS library, poor React integration
- Polyfills for `<input type="range">`: All modern browsers support it natively

## Open Questions

1. **Should zoom controls be collapsible?**
   - What we know: StatusBar has limited horizontal space
   - What's unclear: Do users need zoom controls visible at all times?
   - Recommendation: Start with always-visible. Add collapse toggle in future phase if users request it.

2. **Should slider show tick marks at presets?**
   - What we know: HTML5 `<datalist>` can show tick marks
   - What's unclear: Browser support varies, styling is inconsistent
   - Recommendation: Skip tick marks for MVP. Add if user feedback requests it.

3. **Should zoom input support keyboard step (arrow up/down)?**
   - What we know: Native number input supports arrow keys for ±1 increments
   - What's unclear: Is ±1% step useful, or should it be ±25%?
   - Recommendation: Use native step="1" (±1% per arrow key). Users can type exact values if needed.

## Sources

### Primary (HIGH confidence)
- [MDN: `<input type="range">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range) - HTML specification
- [Smashing Magazine: Custom Range Input](https://www.smashingmagazine.com/2021/12/create-custom-range-input-consistent-browsers/) - Cross-browser styling
- [MDN: `aria-disabled` attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled) - Accessibility
- Codebase: `src/core/editor/slices/types.ts` - Viewport interface definition
- Codebase: `src/components/MapCanvas/MapCanvas.tsx` (lines 1007-1043) - Existing wheel zoom implementation
- Codebase: `src/styles/variables.css` - Design tokens for consistent styling

### Secondary (MEDIUM confidence)
- [ReactScript: Best Range Slider Components 2026](https://reactscript.com/best-range-slider/) - Library comparison
- [Developer Way: Debouncing in React](https://www.developerway.com/posts/debouncing-in-react) - Performance patterns (determined NOT needed for zoom)
- [CSS-Tricks: Styling Range Inputs](https://css-tricks.com/styling-cross-browser-compatible-range-inputs-css/) - Additional styling techniques
- [Map UI Patterns: Zoom Control](https://mapuipatterns.com/zoom-control/) - UI design conventions
- [Computer Hope: Ctrl+0 shortcut](https://www.computerhope.com/jargon/c/ctrl-0.htm) - Standard keyboard conventions

### Tertiary (LOW confidence)
- [Eleken: 40 Slider UI Examples](https://www.eleken.co/blog-posts/slider-ui) - Design inspiration (not implementation guidance)
- Various Reddit/forum discussions on zoom UI patterns (anecdotal, not authoritative)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native HTML inputs are well-established, no dependencies needed
- Architecture: HIGH - Controlled component pattern is React standard, existing codebase uses this pattern
- Pitfalls: HIGH - Verified with MDN docs, existing codebase patterns (ToolBar keyboard shortcuts)

**Research date:** 2026-02-11
**Valid until:** ~30 days (stable APIs, no major changes expected)
