# Phase 62: Ruler Notepad Panel - Research

**Researched:** 2026-02-13
**Domain:** Editable measurement log panel with clipboard export in React/Electron
**Confidence:** HIGH

## Summary

Phase 62 implements a ruler notepad panel in the freed horizontal space beside the tile palette (created in Phase 61). The panel displays auto-logged measurement entries when users pin measurements (P key), supports inline text annotations, individual entry deletion, and clipboard export. Research reveals this is a pure React component using existing Zustand state (pinnedMeasurements array already exists from Phase 60), with clipboard export via Electron's native clipboard API and inline editing via contentEditable pattern.

**Key findings:**
- Zustand state already has `pinnedMeasurements` array with full measurement data (Phase 60)
- Pinned measurements use `Date.now()` for timestamps (already implemented in globalSlice.ts:212)
- Electron clipboard API (`clipboard.writeText()`) is accessible in renderer via preload script exposure
- Phase 61 provides `.tileset-freed-section` with `flex: 1` container ready for content
- Inline editing pattern uses simple controlled input or contentEditable for text labels
- `formatMeasurement()` function already exists in RightSidebar.tsx for consistent formatting

**Primary recommendation:** Create RulerNotepadPanel component in TilesetPanel's freed section. Use existing pinnedMeasurements array, add text label field to measurement entries, expose clipboard API via contextBridge, implement inline editing with controlled input pattern (simpler than contentEditable).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.x | State management for measurements | Already project standard, pinnedMeasurements exists in globalSlice.ts |
| React 18 | 18.x | Component rendering | Project standard, all UI components |
| Electron clipboard | 28.x | System clipboard export | Built into Electron, no additional dependencies |
| TypeScript | 5.x | Type safety | Project standard for all code |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Date.toLocaleString() | Native | Timestamp formatting | Simple locale-aware formatting without dependencies |
| Controlled input | React native | Inline text editing | Simpler than contentEditable, better React integration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Controlled input | contentEditable | contentEditable more complex (caret position, React warnings), controlled input simpler for single-line text |
| navigator.clipboard | Electron clipboard API | navigator.clipboard requires HTTPS context, Electron API more reliable in desktop app |
| date-fns/moment | Native Date methods | External libraries add bundle size, native methods sufficient for simple formatting |
| Separate notepad state | Extend pinnedMeasurements | Existing array already tracks all data, just need to add label field |

**Installation:**
```bash
# No additional packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── TilesetPanel/
│   ├── TilesetPanel.tsx      # Host RulerNotepadPanel in freed section
│   └── TilesetPanel.css
├── RulerNotepadPanel/         # New component (Phase 62)
│   ├── RulerNotepadPanel.tsx
│   └── RulerNotepadPanel.css
src/core/editor/slices/
└── globalSlice.ts             # Extend pinnedMeasurements with label field
electron/
└── preload.ts                 # Expose clipboard.writeText via contextBridge
```

### Pattern 1: Extend Pinned Measurements with Label Field
**What:** Add optional `label` field to pinnedMeasurements entries for user annotations
**When to use:** User needs to add context notes to measurements (NOTE-03 requirement)
**Example:**
```typescript
// In globalSlice.ts (lines 71-74)
pinnedMeasurements: Array<{
  id: string;
  measurement: NonNullable<GlobalSlice['rulerMeasurement']>;
  label?: string;  // NEW: User's text annotation
}>;

// New action
updateMeasurementLabel: (id: string, label: string) => void;

// In createGlobalSlice (add after unpinMeasurement)
updateMeasurementLabel: (id, label) => set((state) => ({
  pinnedMeasurements: state.pinnedMeasurements.map(p =>
    p.id === id ? { ...p, label } : p
  )
})),
```

**Rationale:** Minimal change to existing state structure. ID-based lookup for efficient updates. Optional field maintains backward compatibility.

### Pattern 2: Clipboard Export via Electron API
**What:** Expose Electron's clipboard.writeText() via preload script, format measurements as plain text
**When to use:** User clicks "Copy All" button to export measurement list (NOTE-05 requirement)
**Example:**
```typescript
// In electron/preload.ts (add to contextBridge.exposeInMainWorld)
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods
  writeClipboard: (text: string) => clipboard.writeText(text)
});

// In RulerNotepadPanel.tsx
const handleCopyAll = () => {
  const text = pinnedMeasurements.map(p => {
    const timestamp = new Date(parseInt(p.id)).toLocaleString();
    const measurement = formatMeasurement(p.measurement);
    const label = p.label ? ` - ${p.label}` : '';
    return `[${timestamp}] ${measurement}${label}`;
  }).join('\n');

  window.electronAPI.writeClipboard(text);
};
```

**Rationale:** Electron's clipboard API is synchronous and reliable in desktop context. Plain text format is portable and readable. timestamp/measurement/label format is self-documenting.

### Pattern 3: Inline Editing with Controlled Input
**What:** Toggle between display and edit states, use controlled input for text labels
**When to use:** User clicks measurement entry to add/edit label (NOTE-03 requirement)
**Example:**
```typescript
// In RulerNotepadPanel.tsx
const [editingId, setEditingId] = useState<string | null>(null);
const [editValue, setEditValue] = useState('');

const handleEditStart = (id: string, currentLabel: string) => {
  setEditingId(id);
  setEditValue(currentLabel || '');
};

const handleEditSave = () => {
  if (editingId) {
    updateMeasurementLabel(editingId, editValue);
    setEditingId(null);
  }
};

// In render
{pinnedMeasurements.map(p => (
  <div key={p.id} className="measurement-entry">
    <div className="measurement-value">{formatMeasurement(p.measurement)}</div>
    {editingId === p.id ? (
      <input
        className="measurement-label-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleEditSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleEditSave();
          if (e.key === 'Escape') setEditingId(null);
        }}
        autoFocus
      />
    ) : (
      <div
        className="measurement-label"
        onClick={() => handleEditStart(p.id, p.label || '')}
      >
        {p.label || 'Add note...'}
      </div>
    )}
  </div>
))}
```

**Rationale:** Controlled input avoids React/contentEditable conflicts. Blur saves automatically (familiar UX). Escape cancels edit (Phase 60 pattern). AutoFocus improves keyboard workflow.

### Pattern 4: Timestamp Formatting with toLocaleString
**What:** Format Date.now() timestamps (stored in id field) as human-readable strings
**When to use:** Display timestamp in measurement entries (NOTE-01 requirement)
**Example:**
```typescript
// Simple time-only format
const formatTimestamp = (id: string): string => {
  const date = new Date(parseInt(id));
  return date.toLocaleTimeString(); // "2:30:45 PM"
};

// Date + time format
const formatTimestamp = (id: string): string => {
  const date = new Date(parseInt(id));
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }); // "Feb 13, 2:30 PM"
};
```

**Rationale:** `toLocaleString()` handles timezone/locale automatically. No external dependencies. Existing pattern already uses `Date.now()` for IDs (globalSlice.ts:212).

### Pattern 5: Reuse formatMeasurement Function
**What:** Extract formatMeasurement from RightSidebar.tsx, make it shared utility
**When to use:** Display measurement values consistently across notepad and sidebar
**Example:**
```typescript
// In src/utils/measurementFormatter.ts (NEW FILE)
import { RulerMode } from '@core/editor/slices/globalSlice';
import type { useEditorStore } from '@core/editor';

type RulerMeasurement = NonNullable<ReturnType<typeof useEditorStore.getState>['rulerMeasurement']>;

export const formatMeasurement = (m: RulerMeasurement): string => {
  if (m.mode === RulerMode.LINE) {
    const dx = Math.abs(m.endX - m.startX);
    const dy = Math.abs(m.endY - m.startY);
    return `Line: ${dx}×${dy} (${dx + dy} tiles, ${Math.hypot(dx, dy).toFixed(1)} dist)`;
  } else if (m.mode === RulerMode.RECTANGLE) {
    const w = Math.abs(m.endX - m.startX) + 1;
    const h = Math.abs(m.endY - m.startY) + 1;
    return `Rect: ${w}×${h} (${w * h} tiles)`;
  } else if (m.mode === RulerMode.PATH) {
    return `Path: ${m.waypoints?.length ?? 0} pts (${(m.totalDistance ?? 0).toFixed(1)} dist)`;
  } else if (m.mode === RulerMode.RADIUS) {
    return `Radius: ${(m.radius ?? 0).toFixed(1)} (Area: ${(m.area ?? 0).toFixed(1)})`;
  }
  return '';
};

// In RulerNotepadPanel.tsx
import { formatMeasurement } from '@utils/measurementFormatter';
```

**Rationale:** DRY principle. Consistent formatting between sidebar and notepad. Existing function proven correct (lines 19-34 RightSidebar.tsx).

### Anti-Patterns to Avoid
- **Using contentEditable for single-line input:** Adds complexity (caret position, React warnings), controlled input simpler for labels
- **Persisting notepad state to localStorage:** User decision context suggests measurements are session-specific, no persistence requirement mentioned
- **Creating new clipboard abstraction:** Electron clipboard API already simple, abstraction adds indirection for no benefit
- **Storing timestamps separately:** ID field already uses `Date.now()`, reuse for timestamp display (DRY)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Measurement formatting | Custom string building | Reuse formatMeasurement from RightSidebar | Already implemented and tested (RightSidebar.tsx:19-34) |
| Pinned measurements state | New array in component state | Existing pinnedMeasurements in globalSlice | Already tracks all pinned measurements with IDs |
| Timestamp generation | Custom Date.now() wrapper | Existing id generation pattern | globalSlice.ts:212 already uses Date.now().toString() |
| Clipboard writing | Custom navigator.clipboard wrapper | Electron clipboard API via preload | More reliable in desktop context, already have contextBridge pattern |

**Key insight:** Phase 60 already built the measurement infrastructure (pinnedMeasurements, formatMeasurement patterns). Phase 62 is UI layer on top of existing data.

## Common Pitfalls

### Pitfall 1: Not Handling Empty Notepad State
**What goes wrong:** Empty panel shows no guidance, users don't know measurements can be pinned
**Why it happens:** Focusing on data display, forgetting zero-state UX
**How to avoid:** Add empty state message: "Press P while measuring to pin measurements here"
**Warning signs:** `pinnedMeasurements.length === 0` renders blank panel

**Code example:**
```typescript
// CORRECT - show helpful empty state
{pinnedMeasurements.length === 0 ? (
  <div className="notepad-empty-state">
    <p>Press <kbd>P</kbd> to pin measurements</p>
  </div>
) : (
  <div className="measurement-list">
    {pinnedMeasurements.map(...)}
  </div>
)}
```

### Pitfall 2: Forgetting to Clear Edit State on Delete
**What goes wrong:** Deleting entry while editing leaves stale editingId, causes errors
**Why it happens:** Delete action doesn't consider edit state lifecycle
**How to avoid:** Check if deleted ID matches editingId, clear if match
**Warning signs:** React warnings about missing key, input references null data

**Code example:**
```typescript
// CORRECT - clear edit state if deleting edited entry
const handleDelete = (id: string) => {
  if (editingId === id) {
    setEditingId(null);  // Clear edit state first
  }
  unpinMeasurement(id);
};
```

### Pitfall 3: Not Trimming Label Text Before Save
**What goes wrong:** Accidental whitespace-only labels, inconsistent spacing
**Why it happens:** Direct input value save without sanitization
**How to avoid:** Trim label text on save, treat empty trimmed string as no label
**Warning signs:** Labels that appear to have content but display as blank

**Code example:**
```typescript
// CORRECT - trim and validate before save
const handleEditSave = () => {
  if (editingId) {
    const trimmed = editValue.trim();
    updateMeasurementLabel(editingId, trimmed);  // Save trimmed or empty
    setEditingId(null);
  }
};
```

### Pitfall 4: Using contentEditable Without Caret Management
**What goes wrong:** Caret jumps to start on every keystroke, terrible UX
**Why it happens:** React re-renders reset contentEditable cursor position
**How to avoid:** Use controlled input instead of contentEditable for single-line text
**Warning signs:** Typing in contentEditable element moves cursor to start

**Code example:**
```typescript
// WRONG - contentEditable without caret management
<div
  contentEditable
  onInput={(e) => setLabel(e.currentTarget.textContent || '')}
>
  {label}
</div>

// CORRECT - controlled input
<input
  value={label}
  onChange={(e) => setLabel(e.target.value)}
/>
```

### Pitfall 5: Forgetting Keyboard Shortcuts for Edit Flow
**What goes wrong:** Users must click to save, can't use Enter/Escape (poor keyboard UX)
**Why it happens:** Only implementing onBlur save handler
**How to avoid:** Add onKeyDown handler for Enter (save) and Escape (cancel)
**Warning signs:** Tab/Enter/Escape don't work as expected in edit mode

**Code example:**
```typescript
// CORRECT - full keyboard support
<input
  onBlur={handleEditSave}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);  // Cancel without saving
    }
  }}
/>
```

## Code Examples

Verified patterns from existing codebase and official sources:

### Pinned Measurements Data Structure
```typescript
// Source: globalSlice.ts lines 71-74 (existing)
pinnedMeasurements: Array<{
  id: string;  // Date.now().toString() - used as timestamp source
  measurement: NonNullable<GlobalSlice['rulerMeasurement']>;
  label?: string;  // NEW: Phase 62 addition for user annotations
}>;
```

### RulerNotepadPanel Component
```typescript
// Source: Existing panel patterns (AnimationPanel.tsx, MapSettingsPanel.tsx)
import React, { useState } from 'react';
import { useEditorStore } from '@core/editor';
import { formatMeasurement } from '@utils/measurementFormatter';
import './RulerNotepadPanel.css';

export const RulerNotepadPanel: React.FC = () => {
  const pinnedMeasurements = useEditorStore(state => state.pinnedMeasurements);
  const unpinMeasurement = useEditorStore(state => state.unpinMeasurement);
  const updateMeasurementLabel = useEditorStore(state => state.updateMeasurementLabel);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditStart = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel || '');
  };

  const handleEditSave = () => {
    if (editingId) {
      updateMeasurementLabel(editingId, editValue.trim());
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (editingId === id) setEditingId(null);
    unpinMeasurement(id);
  };

  const handleCopyAll = () => {
    const text = pinnedMeasurements.map(p => {
      const timestamp = new Date(parseInt(p.id)).toLocaleString();
      const measurement = formatMeasurement(p.measurement);
      const label = p.label ? ` - ${p.label}` : '';
      return `[${timestamp}] ${measurement}${label}`;
    }).join('\n');
    window.electronAPI.writeClipboard(text);
  };

  const formatTimestamp = (id: string): string => {
    const date = new Date(parseInt(id));
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="ruler-notepad-panel">
      <div className="panel-header">
        <span>Measurements</span>
        {pinnedMeasurements.length > 0 && (
          <button className="copy-all-btn" onClick={handleCopyAll} title="Copy all to clipboard">
            Copy All
          </button>
        )}
      </div>

      {pinnedMeasurements.length === 0 ? (
        <div className="notepad-empty-state">
          <p>Press <kbd>P</kbd> to pin measurements</p>
        </div>
      ) : (
        <div className="measurement-list">
          {pinnedMeasurements.map(p => (
            <div key={p.id} className="measurement-entry">
              <div className="measurement-header">
                <span className="measurement-timestamp">{formatTimestamp(p.id)}</span>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(p.id)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
              <div className="measurement-value">{formatMeasurement(p.measurement)}</div>
              {editingId === p.id ? (
                <input
                  className="measurement-label-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  placeholder="Add note..."
                />
              ) : (
                <div
                  className="measurement-label"
                  onClick={() => handleEditStart(p.id, p.label || '')}
                >
                  {p.label || 'Add note...'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Electron Clipboard API Exposure
```typescript
// Source: Electron clipboard documentation + existing preload.ts pattern
// In electron/preload.ts
import { contextBridge, clipboard } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods
  writeClipboard: (text: string) => clipboard.writeText(text)
});

// Update interface
export interface ElectronAPI {
  // ... existing methods
  writeClipboard: (text: string) => void;
}
```

### TilesetPanel Integration
```typescript
// Source: Phase 61 implementation (TilesetPanel.tsx lines 34-36)
// In TilesetPanel.tsx
import { RulerNotepadPanel } from '../RulerNotepadPanel';

// Replace empty freed section with notepad panel
<div className="tileset-freed-section">
  <RulerNotepadPanel />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Notepad as separate window | Inline panel in freed space | Phase 61 (2026) | Better space utilization, single-window UX |
| Manual copy from UI | Clipboard export button | Common in modern apps | One-click export, formatted text ready to paste |
| Static read-only log | Inline editable annotations | Modern inline editing UX | Users can add context without external note-taking |
| Global edit mode | Per-entry edit toggle | React state management era | Clearer edit scope, less mode confusion |

**Deprecated/outdated:**
- **contentEditable for single-line inputs:** Controlled input pattern now preferred in React (better integration, no caret issues)
- **moment.js for formatting:** Native `Intl` APIs now sufficient for most date formatting (smaller bundle, no dependencies)

## Open Questions

1. **Should measurements persist across sessions (localStorage)?**
   - What we know: Grid settings already persist via localStorage (EditorState.ts:460-488)
   - What's unclear: Whether measurement log should survive app restart or be session-specific
   - Recommendation: Start without persistence (simpler), add if users request (can iterate based on feedback)

2. **Should notepad be collapsible/hideable?**
   - What we know: Phase 61 freed space is always visible when width allows
   - What's unclear: Whether users want to hide notepad to maximize tile palette space
   - Recommendation: Start always-visible (simpler), freed space already collapses at narrow widths

3. **Should there be a max entry count limit?**
   - What we know: No limit in pinnedMeasurements array, could grow unbounded
   - What's unclear: At what count does performance degrade
   - Recommendation: No limit initially (React handles hundreds of items fine), add scrolling or pagination only if performance issue observed

4. **Should Copy All include coordinates?**
   - What we know: Measurement objects have startX/startY/endX/endY fields
   - What's unclear: Whether coordinate data is useful in exported text
   - Recommendation: Omit coordinates initially (formatted measurement values are clearer), can add if users request

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/core/editor/slices/globalSlice.ts` lines 71-74, 206-221 (pinnedMeasurements implementation)
- Existing codebase: `src/components/RightSidebar/RightSidebar.tsx` lines 19-34 (formatMeasurement function)
- Existing codebase: `src/components/TilesetPanel/TilesetPanel.tsx` lines 34-36 (freed section container)
- Existing codebase: `electron/preload.ts` lines 1-41 (contextBridge pattern)
- Phase 61 plan: `.planning/phases/61-layout-restructure/61-01-PLAN.md` lines 95-98 (freed space structure)
- [Electron clipboard API documentation](https://www.electronjs.org/docs/latest/api/clipboard) - writeText method
- [MDN Date.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString) - timestamp formatting

### Secondary (MEDIUM confidence)
- [React inline editing pattern - LogRocket](https://blog.logrocket.com/build-inline-editable-ui-react/) - controlled input vs contentEditable tradeoffs
- [React contenteditable library](https://www.npmjs.com/package/react-contenteditable) - confirms contentEditable complexity in React
- [JavaScript timestamp formatting guide](https://www.xjavascript.com/blog/javascript-date-now-to-readable-format/) - Date formatting patterns

### Tertiary (LOW confidence - not used)
- None - all research verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project (Zustand, React, Electron clipboard)
- Architecture: HIGH - Existing patterns proven (pinnedMeasurements, panel components, formatMeasurement)
- Pitfalls: HIGH - Common React editing pitfalls well-documented, controlled input pattern well-established

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - stable domain, no fast-moving dependencies)
