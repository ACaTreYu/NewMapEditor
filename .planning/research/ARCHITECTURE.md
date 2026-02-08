# Architecture Integration: v2.0 Modern Minimalist UI

**Domain:** Electron/React tile map editor
**Researched:** 2026-02-08

## Recommended Integration Strategy

v2.0 introduces five feature categories that integrate at different architectural layers. The key insight: leverage the existing two-tier CSS variable system by replacing primitives, not rebuilding the structure.

### Component Boundaries

| Component | Responsibility | v2.0 Changes |
|-----------|---------------|--------------|
| **src/styles/** | Design token definitions | Replace win98-variables.css primitives with modern tokens, keep semantic tier intact |
| **src/core/map/MapParser.ts** | Binary format serialization | Add author field to MapHeader, implement description auto-generation |
| **src/core/map/types.ts** | Map data structures | Extend MapHeader interface with author: string |
| **src/core/services/MapService.ts** | File I/O business logic | Add settings-to-description serialization before save |
| **MapSettingsDialog.tsx** | Map metadata UI | Add Author input field, hide Description field (display-only auto-generated) |
| **All 60+ component CSS files** | Component styling | Update to reference new semantic variables (no structural changes) |

## Data Flow: Settings-to-Description Serialization

```
User edits map settings (MapSettingsDialog)
  ↓
Settings stored in MapHeader (EditorState)
  ↓
User triggers Save (App.tsx → MapService)
  ↓
MapService.saveMap() calls new serializeSettings() helper
  ↓
  serializeSettings(MapHeader) → string (SEdit format)
  ↓
MapHeader.description = generated string
  ↓
MapParser.serialize() writes header with description
  ↓
File saved to disk
```

**Reverse flow (Load):**
```
MapService.loadMap() → MapParser.parse()
  ↓
MapHeader.description extracted
  ↓
parseSettings(description) → update MapHeader fields
  ↓
EditorState.setMap(map)
  ↓
MapSettingsDialog displays parsed settings + author
```

## Pattern 1: CSS Modernization Without Structural Change

**Current architecture:** Two-tier CSS variable system
- **Tier 1 (Primitives):** `--win98-ButtonFace`, `--win98-ButtonHighlight`, etc. (20 canonical colors)
- **Tier 2 (Semantic):** `--surface`, `--text-primary`, `--border-default` (40+ tokens)
- **Components:** Reference only Tier 2 semantic tokens

**Recommended approach:** Replace Tier 1, keep Tier 2 names

### Before (win98-variables.css):
```css
:root {
  /* Tier 1: Win98 primitives */
  --win98-ButtonFace: #c0c0c0;
  --win98-ButtonHighlight: #ffffff;
  --win98-ButtonShadow: #808080;

  /* Tier 2: Semantic aliases */
  --surface: var(--win98-ButtonFace);
  --text-primary: var(--win98-WindowText);
  --border-default: var(--win98-ButtonShadow);
}
```

### After (modern-variables.css):
```css
:root {
  /* Tier 1: Modern primitives */
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-700: #404040;
  --color-neutral-900: #171717;

  /* Tier 2: Semantic aliases (KEEP NAMES) */
  --surface: var(--color-neutral-50);
  --text-primary: var(--color-neutral-900);
  --border-default: var(--color-neutral-200);
}
```

**Why this works:**
- Components already use `--surface`, `--text-primary`, etc. → zero component CSS changes
- Only change what Tier 2 points to, not the Tier 2 names themselves
- Drop-in replacement strategy

**Files to modify:**
1. **DELETE:** `src/styles/win98-variables.css`, `win98-schemes.css`, `win98-bevels.css`, `win98-typography.css`
2. **CREATE:** `src/styles/modern-variables.css` (single file, 60-80 lines)
3. **UPDATE:** `src/App.css` (replace @import statements)
4. **UPDATE:** 15+ component CSS files (remove `.win98-*` utility classes, replace with inline styles using semantic tokens)

**CSS Bevel Pattern Migration:**
- **Win98:** `.win98-raised-deep` (uses ::before pseudo-element for 2px depth)
- **Modern:** `border: 1px solid var(--border-default); box-shadow: 0 1px 3px rgba(0,0,0,0.1);`
- Replace all `.win98-*` class references with inline shadow styles

## Pattern 2: Settings-to-Description Serialization

**Where logic lives:** New module `src/core/map/SettingsSerializer.ts`

**Why separate module:**
- MapParser handles binary format (low-level byte operations)
- SettingsSerializer handles text format (high-level business logic)
- Clear separation of concerns: byte-level vs semantic-level

**Module structure:**
```typescript
// src/core/map/SettingsSerializer.ts

interface SerializedSettings {
  author?: string;
  maxPlayers?: number;
  numTeams?: number;
  objective?: string;
  // ... other settings
}

/**
 * Convert MapHeader to SEdit-format description string
 * Format: "Author: Name\nMaxPlayers: 16\nTeams: 2\n..."
 */
export function serializeSettings(header: MapHeader): string {
  const lines: string[] = [];

  // Only include non-default values (sparse format)
  if (header.author && header.author !== '') {
    lines.push(`Author: ${header.author}`);
  }
  if (header.maxPlayers !== 16) {
    lines.push(`MaxPlayers: ${header.maxPlayers}`);
  }
  // ... etc for all settings

  return lines.join('\n');
}

/**
 * Parse SEdit-format description string into MapHeader updates
 * Returns partial MapHeader with only parsed fields
 */
export function parseSettings(description: string): Partial<MapHeader> {
  const updates: Partial<MapHeader> = {};
  const lines = description.split('\n');

  for (const line of lines) {
    const [key, value] = line.split(':').map(s => s.trim());

    switch (key) {
      case 'Author':
        updates.author = value;
        break;
      case 'MaxPlayers':
        updates.maxPlayers = parseInt(value, 10);
        break;
      // ... etc
    }
  }

  return updates;
}
```

**Integration points:**

1. **MapService.saveMap()** (before serialization):
```typescript
async saveMap(map: MapData, filePath?: string): Promise<MapSaveResult> {
  // Generate description from settings BEFORE serialization
  map.header.description = serializeSettings(map.header);

  // Then existing serialization flow
  const headerBuffer = mapParser.serialize(map);
  // ... rest of save logic
}
```

2. **MapService.loadMap()** (after parsing):
```typescript
async loadMap(): Promise<MapLoadResult> {
  // Existing parse logic
  const parseResult = mapParser.parse(readResult.data!, filePath);
  const mapData = parseResult.data!;

  // Parse description back into settings
  if (mapData.header.description) {
    const updates = parseSettings(mapData.header.description);
    Object.assign(mapData.header, updates);
  }

  return { success: true, map: mapData, filePath };
}
```

**SEdit format specification:**
- **Research gap:** Could not locate official SEdit description format spec
- **Recommended approach:** Reverse-engineer from SEdit .map files
- **Format hypothesis (LOW CONFIDENCE):** Key-value pairs, newline-delimited, colon separator
  ```
  Author: PlayerName
  MaxPlayers: 16
  Teams: 2
  Objective: FLAG
  LaserDamage: 3
  ```
- **Validation strategy:** Test round-trip with actual SEdit maps before shipping

## Pattern 3: Author Field Integration

**Data flow:**
```
MapHeader interface (types.ts)
  ↓
createDefaultHeader() factory (types.ts)
  ↓
EditorState.map.header (Zustand store)
  ↓
MapSettingsDialog UI (React component)
  ↓
MapParser.serialize() (binary output)
```

**Required changes:**

1. **types.ts** (MapHeader interface):
```typescript
export interface MapHeader {
  // ... existing 20 fields
  author: string;  // NEW: map author name
  extendedSettings: Record<string, number>;
}
```

2. **types.ts** (createDefaultHeader):
```typescript
export function createDefaultHeader(): MapHeader {
  return {
    // ... existing defaults
    name: 'Untitled',
    description: '',
    author: '',  // NEW: empty by default
    neutralCount: 0,
    extendedSettings: {}
  };
}
```

3. **MapParser.ts** (serialize method):
Author is part of description auto-generation (via SettingsSerializer), NOT a separate binary field. No MapParser changes needed beyond existing description serialization.

4. **MapSettingsDialog.tsx** (UI changes):
```tsx
// General tab
<div className="settings-row">
  <label htmlFor="map-name">Map Name:</label>
  <input
    id="map-name"
    type="text"
    value={mapName}
    onChange={(e) => setMapName(e.target.value)}
  />
</div>

<div className="settings-row">
  <label htmlFor="map-author">Author:</label>
  <input
    id="map-author"
    type="text"
    value={author}
    onChange={(e) => setAuthor(e.target.value)}
  />
</div>

{/* REMOVE Description textarea - now auto-generated and hidden */}
```

**Persistence:**
- Author stored in `MapHeader.author` field (in-memory)
- On save: included in serialized description string
- On load: parsed from description string back into `author` field

## Pattern 4: SEdit Map Format Parity Audit

**Audit strategy:**

1. **Baseline comparison:**
   - Load same .map file in both SEdit and AC Map Editor
   - Compare parsed MapHeader field-by-field
   - Document any discrepancies

2. **Round-trip test:**
   - Load SEdit-created map
   - Save unchanged
   - Binary diff original vs saved
   - Expect byte-for-byte match (excluding compression variations)

3. **Edge case testing:**
   - v1 raw maps (131072 bytes)
   - v2 legacy compressed maps
   - v3 current format with all fields populated
   - Maps with zero teams, max teams, etc.

**Known gaps (from existing code analysis):**

1. **MapParser.ts line 192:** `compressedData` unused (dead code)
2. **MapParser.ts:** V2 format treated as V3 (comment says "for simplicity")
   - **Risk:** May not handle V2-specific differences correctly
   - **Fix:** Implement proper V2 parsing or document V2 deprecation

**Recommended tooling:**
```bash
# Compare two map files field-by-field
npm run map-audit <sedit-map.map> <our-map.map>
```

**Acceptance criteria:**
- [ ] All v3 header fields match SEdit byte-for-byte
- [ ] Round-trip saves produce identical binary (compression order may vary)
- [ ] Parser handles all SEdit-created maps without errors
- [ ] Edge cases (0 teams, max settings, etc.) match SEdit behavior

## Pattern 5: TypeScript Error Elimination

**Existing errors (from `npm run typecheck`):**

| File | Error | Fix Strategy |
|------|-------|--------------|
| MapParser.ts:11-17 | Unused imports (MAP_WIDTH, MAP_HEIGHT, createEmptyMap) | Remove imports |
| MapParser.ts:192 | Unused variable (compressedData) | Remove or use for validation |
| MapParser.ts:284 | Type mismatch (ArrayBufferLike → ArrayBuffer) | Cast: `buffer.slice(0) as ArrayBuffer` |
| WallSystem.ts:162 | Unused parameter (addConnection) | Prefix with underscore: `_addConnection` |

**Path alias issues:**
- **tsconfig.json:** Defines `@/`, `@core/`, `@components/`
- **vite.config.ts:** Defines same aliases
- **Current status:** Aliases work (no import errors reported)
- **v2.0 impact:** None (no new aliases needed)

**Systematic elimination approach:**

1. **Run baseline:** `npm run typecheck > errors-baseline.txt`
2. **Fix by category:**
   - Unused imports/variables (6 errors) → Remove or use
   - Type mismatches (1 error) → Add type assertions
3. **Verify:** `npm run typecheck` → zero errors
4. **Lock in:** Add to CI pipeline

**New code standards for v2.0:**
- All new modules must pass `tsc --noEmit` before commit
- Use `strict: true` (already enabled)
- Prefer explicit return types on public APIs

## Scalability Considerations

| Concern | Current (v1.7) | v2.0 Impact | Future (v3.0+) |
|---------|---------------|-------------|----------------|
| **CSS bundle size** | 4 theme files + 15 component CSS (15KB total) | Single modern-variables.css (3KB), inline shadows replace bevels → 10KB total | CSS-in-JS migration if bundle > 20KB |
| **Settings count** | 20 MapHeader fields | +1 (author) | Description format supports 50+ without binary format changes |
| **Theme switching** | 3 Win98 schemes (removed in v2.0) | Single modern theme only | Multi-theme via CSS variable swapping (Tier 1 replacement pattern) |
| **Map format versions** | v1/v2/v3 parser support | No new versions | Future v4 format needs new parser path |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Rebuilding CSS Token System
**What goes wrong:** Renaming all semantic tokens breaks 60+ component files
**Why it happens:** Misunderstanding the two-tier system architecture
**Prevention:** Replace Tier 1 primitives ONLY, keep Tier 2 names unchanged
**Instead:** Update primitive values, not semantic names

### Anti-Pattern 2: Settings Logic in MapParser
**What goes wrong:** MapParser becomes bloated with business logic
**Why it happens:** Convenience of "already touching this file"
**Prevention:** MapParser handles ONLY binary format, SettingsSerializer handles text format
**Instead:** Create separate SettingsSerializer.ts module

### Anti-Pattern 3: Inline Description Generation in Components
**What goes wrong:** Description format scattered across UI, not round-trip safe
**Why it happens:** "Just need author field in dialog"
**Prevention:** Centralize all description logic in SettingsSerializer
**Instead:** Components call serialization helpers, never inline string building

### Anti-Pattern 4: Assuming SEdit Format Without Verification
**What goes wrong:** Serialized maps don't load in SEdit
**Why it happens:** No official spec available, guessed format
**Prevention:** Reverse-engineer from real SEdit maps, test round-trip
**Instead:** Load 10+ SEdit maps, parse descriptions, extract format patterns

## Phase-Specific Integration Notes

**Suggested phase ordering (dependencies considered):**

### Phase 1: CSS Modernization Foundation
**What:** Replace win98-variables.css with modern-variables.css
**Why first:** Foundation for all visual changes, no functional dependencies
**Files:** 1 create, 4 delete, 1 update (App.css)

### Phase 2: Component CSS Updates (Batch 1 of 3)
**What:** Update 20 component CSS files (remove .win98-* classes, add inline shadows)
**Why:** Can be done incrementally, no breaking changes
**Files:** 20 component CSS files

### Phase 3: Component CSS Updates (Batch 2 of 3)
**What:** Next 20 component CSS files
**Files:** 20 component CSS files

### Phase 4: Component CSS Updates (Batch 3 of 3)
**What:** Final 20+ component CSS files
**Files:** 20+ component CSS files

### Phase 5: Author Field Integration
**What:** MapHeader extension + MapSettingsDialog UI
**Why after CSS:** Visual changes settled, functional changes isolated
**Files:** types.ts, MapSettingsDialog.tsx

### Phase 6: Settings Serialization Module
**What:** Create SettingsSerializer.ts with serialize/parse functions
**Why after author:** Author field exists, can test with simple case
**Files:** Create SettingsSerializer.ts, add tests

### Phase 7: MapService Integration
**What:** Call serializer in saveMap/loadMap
**Why after serializer:** Serializer module tested independently first
**Files:** MapService.ts

### Phase 8: SEdit Format Parity Audit
**What:** Test suite comparing SEdit vs our parser
**Why after serialization:** Full round-trip functionality exists
**Files:** Create audit tooling

### Phase 9: TypeScript Error Elimination
**What:** Fix all 6 existing type errors
**Why last:** Functional changes complete, now lock in type safety
**Files:** MapParser.ts, WallSystem.ts

**Total estimated changes:**
- 1 new module (SettingsSerializer.ts)
- 4 deleted files (win98-*.css)
- 1 created file (modern-variables.css)
- 60+ modified files (component CSS + 5 functional files)
- ~400-600 LOC changes (200 deletions, 200-400 additions)

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| CSS modernization | **HIGH** | Two-tier system already exists, proven pattern from web search sources |
| Settings serialization architecture | **HIGH** | Clear separation of concerns, standard module pattern |
| Author field integration | **HIGH** | Simple extension of existing MapHeader pattern |
| SEdit format parity | **MEDIUM** | No official spec found, requires reverse-engineering |
| TypeScript fixes | **HIGH** | Errors are trivial (unused vars, type casts) |

## Gaps to Address

**During phase execution:**

1. **SEdit description format spec:**
   - Current: Hypothesis based on common key-value patterns
   - Needed: Reverse-engineer from 10+ real SEdit maps
   - Method: Parse existing .map files, extract description field, identify pattern

2. **V2 map format handling:**
   - Current: Treated as V3 "for simplicity" (MapParser.ts:92)
   - Needed: Document V2 deprecation OR implement proper V2 parsing
   - Risk: V2 maps may fail to load correctly

3. **Description field UI:**
   - Current: Assumed hidden (display-only)
   - Needed: Confirm if "read-only visible" or "completely hidden"
   - User preference: Show auto-generated value or not?

4. **Multi-theme support:**
   - Current: Removing all themes for single modern look
   - Future: If themes needed, Tier 1 replacement pattern supports it
   - Decision: Document theme extension pattern for v3.0+

## Sources

**Design Systems & CSS Variables:**
- [Why Minimalist UI Design in 2026](https://www.anctech.in/blog/explore-how-minimalist-ui-design-in-2026-focuses-on-performance-accessibility-and-content-clarity-learn-how-clean-interfaces-subtle-interactions-and-data-driven-layouts-create-better-user-experie/)
- [Pico CSS - Minimal CSS Framework](https://picocss.com/)
- [Tailwind CSS Best Practices 2025-2026: Design Tokens](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)
- [The developer's guide to design tokens and CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [Design tokens explained - Contentful](https://www.contentful.com/blog/design-token-system/)
- [Design tokens with confidence - W3C standard](https://uxdesign.cc/design-tokens-with-confidence-862119eb819b)

**Map File Formats:**
- [MAP file format - Wikipedia](https://en.wikipedia.org/wiki/MAP_(file_format))
- [Map Serialization and Deserialization with Jackson](https://www.baeldung.com/jackson-map)

**SubSpace/Continuum Resources:**
- [Continuum Level Editor](https://continuumlt.sourceforge.net/manual/)
- [Nobel's Continuum Map Development Guide](https://www.trenchwars.org/twdev/?x=resources)
- [SEdit on SourceForge](https://sourceforge.net/projects/sedit/)
