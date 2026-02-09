# Phase 29: Author Metadata - Research

**Researched:** 2026-02-08
**Domain:** React form input, string serialization, SubSpace map format
**Confidence:** HIGH

## Summary

Phase 29 adds author metadata support to the Map Settings dialog by introducing a dedicated text input field. The author name will be serialized into the existing description field using a "Author=name" format, preparing the groundwork for Phase 30's comprehensive settings serialization.

The implementation is straightforward: add a controlled text input to the Map tab of MapSettingsDialog, parse/serialize the author field from/to the description string, and ensure the existing UI patterns and state management approaches are followed consistently.

**Primary recommendation:** Use existing controlled input patterns from MapSettingsDialog, implement simple string parsing for "Author=name" format, and keep the textarea visible for now (Phase 30 will hide it when full serialization is implemented).

## User Constraints

**No CONTEXT.md exists for this phase** - no prior user decisions to honor.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18 | UI framework | Project standard, controlled component pattern for form inputs |
| TypeScript | Latest | Type safety | Project standard, ensures type safety for state management |
| Zustand | 4.x | State management | Project standard for EditorState |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | N/A | Simple string parsing | Built-in string methods sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual parsing | CSV parser library | Overkill - simple "Key=Value" format doesn't need external deps |
| React Hook Form | Controlled inputs with useState | Current codebase uses direct state management, no need to introduce new pattern |

**Installation:**
No new packages required. All functionality uses existing React patterns and built-in JavaScript string methods.

## Architecture Patterns

### Recommended Project Structure
```
src/components/MapSettingsDialog/
├── MapSettingsDialog.tsx       # Add author field in Map tab
├── MapSettingsDialog.css      # Existing styles work (.text-input)
src/core/map/
├── types.ts                   # MapHeader interface (description field exists)
src/core/editor/
├── EditorState.ts             # updateMapHeader action (already exists)
```

### Pattern 1: Controlled Input State Management
**What:** Use local state with useState for form fields, commit to Zustand on Apply
**When to use:** All Map Settings dialog inputs (current pattern in MapSettingsDialog.tsx)
**Example:**
```typescript
// Current pattern from MapSettingsDialog.tsx lines 14-18
const [localSettings, setLocalSettings] = useState<Record<string, number>>(() => getDefaultSettings());
const [mapName, setMapName] = useState('');
const [mapDescription, setMapDescription] = useState('');
const [isDirty, setIsDirty] = useState(false);

// Add author field following same pattern
const [mapAuthor, setMapAuthor] = useState('');

// Setter with dirty tracking (lines 83-91)
const setMapAuthorWithDirty = (author: string) => {
  setMapAuthor(author);
  setIsDirty(true);
};
```

### Pattern 2: Parse on Load, Serialize on Save
**What:** Extract author from description field on dialog open, serialize back on Apply
**When to use:** When dialog opens (useImperativeHandle open callback) and on Apply button
**Example:**
```typescript
// Parse on open (add to lines 21-34)
open: () => {
  const { map } = useEditorStore.getState();
  if (map) {
    setMapName(map.header.name);

    // Parse author from description
    const author = parseAuthor(map.header.description);
    setMapAuthor(author);

    // Keep original description for display
    setMapDescription(map.header.description);

    const defaults = getDefaultSettings();
    setLocalSettings({ ...defaults, ...map.header.extendedSettings });
  }
  setIsDirty(false);
  dialogRef.current?.showModal();
}

// Serialize on Apply (modify lines 46-53)
const handleApply = () => {
  // Serialize author into description
  const updatedDescription = serializeAuthor(mapDescription, mapAuthor);

  updateMapHeader({
    name: mapName,
    description: updatedDescription,
    extendedSettings: localSettings
  });
  setIsDirty(false);
};
```

### Pattern 3: Simple Key=Value String Parsing
**What:** Parse "Author=name" from description string, handle edge cases
**When to use:** Loading and saving author field
**Example:**
```typescript
// Parse author from description
function parseAuthor(description: string): string {
  // Match "Author=value" anywhere in string
  const match = description.match(/Author=([^,]+)/);
  return match ? match[1].trim() : '';
}

// Serialize author back into description
function serializeAuthor(description: string, author: string): string {
  // Remove existing Author= entry if present
  let result = description.replace(/Author=[^,]*(,\s*)?/, '');

  // Add author at beginning if not empty
  if (author.trim()) {
    result = `Author=${author.trim()}${result ? ', ' + result : ''}`;
  }

  return result;
}
```

### Anti-Patterns to Avoid
- **Directly modifying description textarea**: Phase 30 will hide it and make it auto-generated. For Phase 29, keep textarea visible but separate author into dedicated field.
- **Complex parsing with escaping**: Description field doesn't need escape sequences yet. Keep it simple for Phase 29.
- **Storing author in new MapHeader field**: Requirements specify using description field for serialization.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV/structured parsing | Custom escape/quote logic | Simple regex with string methods | Format is simple "Key=Value, Key=Value" without complex escaping needs |
| Form validation | Custom validation framework | HTML5 attributes (maxLength) | Current dialog uses maxLength={32} for name, same pattern works for author |
| State management | Custom setState wrapper | Existing useState + dirty flag pattern | MapSettingsDialog already has working pattern (lines 83-91) |

**Key insight:** This is a simple text field addition with basic string parsing. Over-engineering with validation libraries or complex parsers would add unnecessary complexity.

## Common Pitfalls

### Pitfall 1: Parsing Commas in Author Names
**What goes wrong:** Author name "Smith, John" breaks comma-separated parsing
**Why it happens:** Naive split(',') treats comma in name as delimiter
**How to avoid:** Use regex to match specific patterns like `Author=([^,]+)` - stops at first comma
**Warning signs:** Test with "Smith, John" as author name - if it truncates to "Smith", parsing is wrong
**Solution for Phase 29:** Document limitation - commas in author names not supported yet. Phase 30's comprehensive serialization can address this with proper escaping.

### Pitfall 2: Description Field Synchronization
**What goes wrong:** Author appears in both dedicated field and description textarea, causing confusion
**Why it happens:** Description field shows serialized format with "Author=name" string
**How to avoid:** For Phase 29, keep both visible but document that description will be hidden in Phase 30
**Warning signs:** User edits description textarea directly and author field becomes out of sync
**Solution:** Phase 30 will hide description textarea entirely. For Phase 29, accept this temporary inconsistency.

### Pitfall 3: Empty/Whitespace Author Names
**What goes wrong:** Empty author serializes as "Author=, " leaving empty entry
**Why it happens:** Serialization doesn't check for empty values
**How to avoid:** Only serialize author if `author.trim()` is non-empty
**Warning signs:** Description field contains "Author=, " with no actual name
**Solution:**
```typescript
if (author.trim()) {
  result = `Author=${author.trim()}${result ? ', ' + result : ''}`;
}
```

### Pitfall 4: Dirty Flag Not Triggering
**What goes wrong:** User changes author field but Apply button stays disabled
**Why it happens:** Forgot to call setIsDirty(true) in author field's onChange
**How to avoid:** Use consistent pattern: `setMapAuthorWithDirty` wrapper (same as setMapNameWithDirty, setMapDescriptionWithDirty)
**Warning signs:** Editing author doesn't enable Apply button
**Solution:** Follow existing pattern from lines 83-91

## Code Examples

Verified patterns from existing codebase:

### Text Input with Dirty Tracking (Current Pattern)
```typescript
// From MapSettingsDialog.tsx lines 119-128
<div className="setting-group">
  <label className="setting-label">Map Name</label>
  <input
    type="text"
    value={mapName}
    onChange={(e) => setMapNameWithDirty(e.target.value)}
    className="text-input"
    maxLength={32}
  />
</div>

// Add author field following identical pattern
<div className="setting-group">
  <label className="setting-label">Author</label>
  <input
    type="text"
    value={mapAuthor}
    onChange={(e) => setMapAuthorWithDirty(e.target.value)}
    className="text-input"
    maxLength={32}
  />
</div>
```

### Dialog Open with State Initialization
```typescript
// From MapSettingsDialog.tsx lines 21-34
useImperativeHandle(ref, () => ({
  open: () => {
    const { map } = useEditorStore.getState();
    if (map) {
      setMapName(map.header.name);
      setMapDescription(map.header.description);

      // ADD: Parse and set author
      const author = parseAuthor(map.header.description);
      setMapAuthor(author);

      const defaults = getDefaultSettings();
      setLocalSettings({ ...defaults, ...map.header.extendedSettings });
    }
    setIsDirty(false);
    dialogRef.current?.showModal();
  }
}));
```

### Apply Handler with Header Update
```typescript
// From MapSettingsDialog.tsx lines 46-53, MODIFIED
const handleApply = () => {
  // Serialize author into description
  const updatedDescription = serializeAuthor(mapDescription, mapAuthor);

  updateMapHeader({
    name: mapName,
    description: updatedDescription,  // Use serialized version
    extendedSettings: localSettings
  });
  setIsDirty(false);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Description field for all metadata | Dedicated UI fields, serialized to description | Phase 29-30 (v2.0) | Better UX, prepares for auto-serialization |
| Manual description editing | Auto-generated description from settings | Phase 30 (v2.0) | Users focus on settings, not format |
| No author attribution | Dedicated author field | Phase 29 (v2.0) | Map creators can be credited |

**Deprecated/outdated:**
- Manual entry of "Author=name" into description textarea - Phase 29 provides dedicated field

## Open Questions

1. **Should commas be supported in author names?**
   - What we know: Current simple parsing uses comma as delimiter
   - What's unclear: Whether to implement escaping/quoting in Phase 29 or defer to Phase 30
   - Recommendation: Document limitation for Phase 29. Phase 30's comprehensive serialization can add proper escaping if needed.

2. **Should author field have validation beyond maxLength?**
   - What we know: Map name uses maxLength={32}, no other validation
   - What's unclear: Whether author names should restrict special characters
   - Recommendation: Keep it simple - allow any characters except equals sign and comma for now. maxLength={32} like map name.

3. **Should description textarea remain editable in Phase 29?**
   - What we know: Phase 30 will hide it entirely (SERIAL-04: "Description box is hidden from user")
   - What's unclear: Whether to keep it read-only or editable during Phase 29
   - Recommendation: Keep editable for Phase 29, hide in Phase 30. This allows testing/verification during Phase 29.

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns:
  - `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.tsx` - Form input patterns (lines 14-18, 83-91, 119-138)
  - `E:\NewMapEditor\src\core\map\types.ts` - MapHeader interface with description field (lines 46-72)
  - `E:\NewMapEditor\src\core\editor\EditorState.ts` - updateMapHeader action (lines 283-293)
  - `E:\NewMapEditor\src\components\MapSettingsDialog\MapSettingsDialog.css` - Input styling (.text-input, .text-area)
- SEDIT Technical Analysis:
  - `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md` - Description field in map header (lines 99-102)
- Requirements:
  - `E:\NewMapEditor\.planning\REQUIREMENTS.md` - META-01, META-02, META-03 (lines 34-36)
- Official React docs:
  - [<input> – React](https://react.dev/reference/react-dom/components/input) - Controlled component patterns

### Secondary (MEDIUM confidence)
- [React Forms Validation Best Practices](https://www.dhiwise.com/post/react-form-validation-best-practices-with-tips-and-tricks) - Form validation patterns
- [React State Management 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries) - useState for local UI state is standard
- [TypeScript String split() Method](https://thelinuxcode.com/typescript-string-split-method-practical-patterns-edge-cases-and-modern-usage/) - Edge cases in string parsing
- [String Escape Characters](https://thelinuxcode.com/typescript-string-split-method-practical-patterns-edge-cases-and-safer-parsing/) - Handling special characters

### Tertiary (LOW confidence)
- [SubSpace Map File Format](http://www.rarefied.org/subspace/lvlformat.html) - Community documentation of .lvl format
- [Continuum Level Editor Manual](https://continuumlt.sourceforge.net/manual/) - Existing editor reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing React/TypeScript/Zustand patterns from codebase
- Architecture: HIGH - Following established MapSettingsDialog patterns
- Pitfalls: HIGH - Identified from codebase review and requirements analysis

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable domain, no breaking changes expected)

---

## Implementation Checklist

For planner reference:

- [ ] Add `mapAuthor` state to MapSettingsDialog
- [ ] Add author text input to Map tab (after name, before description)
- [ ] Implement `parseAuthor(description)` helper function
- [ ] Implement `serializeAuthor(description, author)` helper function
- [ ] Parse author on dialog open
- [ ] Serialize author on Apply
- [ ] Test with empty author (should not add "Author=" to description)
- [ ] Test with author containing spaces (should trim)
- [ ] Document comma limitation in author names
- [ ] Verify dirty flag triggers on author change
