# Feature Landscape: v2.0 Modern UI & Settings Management

**Domain:** Map Editor UI Modernization & Settings Management
**Researched:** 2026-02-08
**Focus:** Modern minimalist UI design, settings serialization, Author field, SEdit map format parity

---

## Executive Summary

This research examines four key feature areas for v2.0:
1. **Modern minimalist UI** - Light neutral palette, flat design with subtle shadows (Figma/VS Code patterns)
2. **Settings serialization** - Auto-serialize 53 game settings to description field (Key=Value, non-defaults only)
3. **Author metadata** - Creator attribution field standard in game level editors
4. **SEdit format parity** - Parse settings from existing maps, match SEdit description conventions

**Key Finding:** The description field is the persistence mechanism for both settings and author. SEdit writes "sedit v2" signature; AC should write settings as `Key=Value, Key=Value` (comma-space separated) for non-default values only. This keeps files compact while enabling settings portability.

---

## Table Stakes Features

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Light neutral color palette | Standard for 2026 professional tools (VS Code, Figma use neutral grays) | Low | 8-12 shades of gray, base neutrals for text/backgrounds |
| Flat/minimal visual design | Pure flat design is outdated (2026), but minimal aesthetic with subtle depth is standard | Low | Small rounded corners (4-8px), subtle shadows for elevation |
| 8px grid spacing system | Industry standard for consistent UI (Material Design, Tailwind) | Low | All margins/paddings in multiples of 8px |
| Settings serialization to description | SEdit writes "sedit v2" to description field, AC maps should serialize settings | Medium | Key=Value format, only non-default values |
| Subtle shadows for depth | Modern UI uses shadows for hierarchy and layering | Low | Softer shadows (low opacity, high blur), element importance determines depth |
| Consistent icon style | Clean stroke-based icons (Lucide 1.5-2px, Heroicons 1.5px) | Low | Match stroke weight across all icons |
| Author metadata field | Standard in game level editors (Tiled, map creation tools) | Low | Single text field, displayed in UI, saved to description |
| Settings range validation | Prevent invalid values (e.g., LaserEnergy > 57 disables weapon) | Low | Min/max already in GameSettings, enforce in UI |

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auto-serialize ONLY non-default settings | Keeps description field compact, focuses on customizations | Medium | Compare against GAME_SETTINGS defaults, skip if value === default |
| Settings parsing from existing maps | Read settings from SEdit/AC maps that have embedded settings | High | Parse "Key=Value" from description, validate ranges, handle malformed data |
| Validation warnings for settings | Show warnings for unusual/extreme values (e.g., LaserEnergy=57 disables weapon) | Medium | Based on GameSettings descriptions, flag edge cases |
| Smart defaults per map type | Different default settings for different objectives (Frag vs Flag vs Switch) | Medium | Preset bundles based on objective type |
| Settings diff view | Show which settings differ from defaults in UI | Low | Visual indicator in settings dialog |
| Keyboard-accessible sliders | Arrow keys, Page Up/Down, Home/End for precise control | Low | Accessibility enhancement |
| Settings import/export | Copy settings between maps as JSON | Low | Useful for map series |
| Live settings preview | Show impact of settings changes (e.g., weapon range circles on canvas) | High | Requires game logic simulation |
| Dark mode support | 81.9% mobile, 82.7% desktop users prefer dark mode (2024 data) | Medium | Requires dual theme system with surface elevation |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Pure gradient backgrounds | Outdated 2026 aesthetic, conflicts with minimalist flat design | Use solid neutral backgrounds with subtle texture/noise if needed |
| Heavy skeuomorphism | Conflicts with flat/minimal design language | Use subtle depth via shadows, not 3D bevels |
| Full settings in description | Makes description unreadable, bloats file size | Only serialize non-default values with compact format |
| Custom JSON format in description | Breaks compatibility with SEdit/AC ecosystem | Use Key=Value pairs (standard format) |
| GUI color picker for palette | Over-engineering for a fixed design system | Use CSS variables/theme tokens |
| Per-element theme customization | Complexity explosion, consistency nightmare | System-wide light/dark mode only |
| Settings versioning in description | Adds complexity, map format version is sufficient | Use extendedSettings Record<string, number> in MapHeader |
| Animated UI transitions | Unnecessary for desktop editor, can feel sluggish | Instant UI updates, reserve animation for canvas operations |
| Settings templates library | Premature - users need to explore settings first | Defer to v2.1+ after user feedback |
| Inline settings documentation | Clutters UI, distracts from editing | Use tooltips/descriptions (already in GameSettings) |

---

## Feature Dependencies

```
Modern Minimalist UI
├─ Light neutral color palette (foundation)
├─ 8px grid spacing (layout system)
├─ Flat design with subtle shadows (visual hierarchy)
└─ Consistent icon style (visual language)

Settings Serialization
├─ Default value comparison (required for non-default filtering)
├─ Key=Value formatter (serialization)
├─ Description field parser (deserialization)
└─ Validation (data integrity)

Author Field
├─ MapHeader.author property (data model)
├─ Settings dialog input field (UI)
└─ Description field serialization (persistence)

Dark Mode (optional enhancement)
├─ Duplicate color palette (light + dark)
├─ Theme context/provider (state)
└─ Surface elevation via background lightness (dark-specific pattern)
```

---

## MVP Recommendation

### Prioritize (v2.0 Core)

1. **Modern minimalist UI** (8px grid, neutral palette, subtle shadows, flat design)
   - Immediate visual impact, sets professional tone
   - Low complexity, high value
   - **Effort:** 8-12 hours

2. **Author field** (MapHeader property, UI input, serialization)
   - Simple table stakes feature
   - Enables creator attribution
   - **Effort:** 2-3 hours

3. **Settings serialization to description** (non-default values only)
   - Core differentiator, enables map portability
   - Medium complexity but critical for SEdit parity
   - **Effort:** 6-8 hours

4. **Settings parsing from description** (read Key=Value pairs)
   - Completes the serialization loop
   - Enables loading existing AC maps with settings
   - **Effort:** 8-10 hours

### Defer (Post-v2.0)

- **Dark mode**: Nice-to-have, not blocking. Can add in v2.1 after light theme is solid
- **Live settings preview**: High complexity, requires game logic simulation
- **Settings diff view**: Polish feature, not critical for v2.0
- **Smart defaults per map type**: Can be added once serialization is proven
- **Validation warnings**: Polish feature, basic validation sufficient for v2.0

---

## Domain-Specific Implementation Details

### 1. Modern Minimalist UI (2026 Patterns)

#### Color Palette Structure

**Base Neutrals:**
- Page background: `#ffffff` (pure white) or `#f8f9fa` (off-white)
- Card/panel background: `#ffffff` with border or subtle shadow
- Border color: `#e0e0e0` to `#d1d5db`

**Text Grays:**
- Primary text: `#1a1a1a` to `#333333`
- Secondary text: `#666666` to `#737373`
- Disabled text: `#9ca3af` to `#bfbfbf`

**Accent Colors:**
- Primary action: `#007acc` (VS Code blue) or `#3b82f6` (Tailwind blue-500)
- Success: `#10b981` (green)
- Warning: `#f59e0b` (amber)
- Error: `#ef4444` (red)

**Total Palette:** 8-12 shades is optimal (Tailwind/Material convention)

#### Design Principles

**Spacing (8px Grid):**
```css
:root {
  --space-1: 4px;   /* Tight spacing */
  --space-2: 8px;   /* Base unit */
  --space-3: 16px;  /* Medium spacing */
  --space-4: 24px;  /* Large spacing */
  --space-5: 32px;  /* XL spacing */
  --space-6: 48px;  /* Section spacing */
}
```

**Shadows (Subtle Elevation):**
```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

**Border Radius:**
```css
:root {
  --radius-sm: 4px;   /* Buttons, inputs */
  --radius-md: 8px;   /* Cards, panels */
  --radius-lg: 12px;  /* Dialogs */
}
```

#### Component Patterns

**Buttons:**
- Primary: Solid fill with accent color, 4-6px radius, 8-12px padding
- Secondary: Outline with border, transparent background
- Disabled: Reduced opacity (0.5-0.6), no hover state

**Input Fields:**
- 1px border, 4px radius, 8px padding
- Focus state: Accent color border (2px) with subtle glow
- Error state: Red border, error message below

**Cards/Panels:**
- White background OR subtle shadow (not both)
- 8-12px padding for content
- 1px border (#e0e0e0) OR shadow-md

**Dialogs:**
- Centered, max-width 600-800px
- 24-32px padding
- Shadow-lg for elevation
- Semi-transparent backdrop (rgba(0,0,0,0.5))

#### Icon Standards

**Lucide/Heroicons:**
- Stroke weight: 1.5-2px
- Grid: 24x24px viewBox
- Sizing: 16px (compact), 20px (default), 24px (large)
- Style: Outline (line) icons, consistent stroke

### 2. Settings Serialization Format

#### SEdit Behavior Reference

SEdit always appends "sedit v2" to description field:
```c
// From map.cpp
if (!p) {
    p = (char *)malloc(map->header.descriptionLength + 10);
    sprintf(p, "%s\nsedit v2", map->header.description);
    free(map->header.description);
    map->header.description = p;
}
```

#### Recommended Format for AC Maps

```
[User description text]

Author=ArcJet
ShipSpeed=150, LaserDamage=50, MissileTTL=600, BouncySpeed=75
sedit v2
```

**Format Rules:**
1. User description comes first (free-form text)
2. Blank line separator
3. Author line: `Author=<name>` (optional)
4. Settings line: `Key=Value, Key=Value, ...` (comma-space separated)
5. Only include settings WHERE `value !== default`
6. Optional "sedit v2" signature line (compatibility)
7. Max length: 65535 chars (WORD type in MapHeader.descriptionLength)

#### Serialization Implementation

```typescript
/**
 * Serialize settings to description format
 * Only includes non-default values
 */
function serializeSettings(
  userDescription: string,
  author: string | undefined,
  settings: Record<string, number>
): string {
  const lines: string[] = [];

  // User description first
  if (userDescription.trim()) {
    lines.push(userDescription.trim());
    lines.push(''); // Blank separator
  }

  // Author
  if (author && author.trim()) {
    lines.push(`Author=${author.trim()}`);
  }

  // Settings (non-defaults only, alphabetical order)
  const nonDefaults = GAME_SETTINGS
    .filter(s => settings[s.key] !== undefined && settings[s.key] !== s.default)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(s => `${s.key}=${settings[s.key]}`)
    .join(', ');

  if (nonDefaults) {
    lines.push(nonDefaults);
  }

  // Signature
  lines.push('sedit v2');

  return lines.join('\n');
}
```

#### Parsing Implementation

```typescript
/**
 * Parse settings from description field
 * Returns { userDescription, author, settings }
 */
function parseDescription(description: string): {
  userDescription: string;
  author: string | undefined;
  settings: Record<string, number>;
} {
  const lines = description.split('\n');
  const result = {
    userDescription: '',
    author: undefined as string | undefined,
    settings: {} as Record<string, number>
  };

  const userDescLines: string[] = [];
  let inSettings = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip sedit signature
    if (trimmed === 'sedit v2') continue;

    // Author line
    if (trimmed.startsWith('Author=')) {
      result.author = trimmed.substring(7).trim();
      inSettings = true;
      continue;
    }

    // Settings line (contains = and ,)
    if (trimmed.includes('=') && (trimmed.includes(',') || /^[A-Za-z_]+=\d+$/.test(trimmed))) {
      inSettings = true;
      const settingsRegex = /([A-Za-z_]+)=(-?\d+)/g;
      let match;
      while ((match = settingsRegex.exec(trimmed)) !== null) {
        const [_, key, value] = match;
        const setting = GAME_SETTINGS.find(s => s.key === key);
        if (setting) {
          const numValue = parseInt(value, 10);
          // Validate range
          if (numValue >= setting.min && numValue <= setting.max) {
            result.settings[key] = numValue;
          } else {
            console.warn(`Setting ${key}=${numValue} out of range [${setting.min}, ${setting.max}]`);
          }
        }
      }
      continue;
    }

    // User description lines (before settings)
    if (!inSettings && trimmed) {
      userDescLines.push(line);
    }
  }

  result.userDescription = userDescLines.join('\n').trim();
  return result;
}
```

### 3. Author Field

#### Data Model

```typescript
// Update MapHeader interface
export interface MapHeader {
  // ... existing fields
  author?: string; // NEW: Creator name (max 255 chars)
}

// Update createDefaultHeader
export function createDefaultHeader(): MapHeader {
  return {
    // ... existing fields
    author: undefined
  };
}
```

#### UI Implementation

**Map Settings Dialog - Map Tab:**

```tsx
<div className="form-group">
  <label htmlFor="author">Author</label>
  <input
    type="text"
    id="author"
    maxLength={255}
    value={author || ''}
    onChange={(e) => setAuthor(e.target.value)}
    placeholder="Your name"
  />
</div>
```

**Placement:** After description field, before game settings tabs

#### Persistence

Author is stored in description field with `Author=` prefix. When saving:
1. Extract author from MapHeader.author
2. Serialize to description with `serializeSettings()`
3. Write description to map file

When loading:
1. Parse description with `parseDescription()`
2. Extract author from parsed result
3. Store in MapHeader.author

### 4. SEdit Format Parity

#### Current Coverage

**Implemented:**
- ✅ All fixed header fields (26 bytes base)
- ✅ Variable header (flag counts, name, description)
- ✅ Compressed tile data (zlib)
- ✅ extendedSettings for 53 game settings
- ✅ Version 1/2/3 map loading

**Missing for Parity:**
- ⚠️ Settings serialization to description (NEW in v2.0)
- ⚠️ Settings parsing from description (NEW in v2.0)
- ⚠️ Author field (NEW in v2.0)
- ⚠️ "sedit v2" signature in description (NEW in v2.0)

#### Description Field Limits

- Max length: **65535 chars** (WORD type)
- Null-terminated C string in file format
- SEdit default if empty: "sedit v2" or "New map"
- AC default if empty: "" (empty string)

**Typical sizes:**
- User description: 0-500 chars
- Author: 10-50 chars
- Settings (non-defaults): 50-500 chars (depends on customization)
- Total: Usually < 1000 chars, well under 65535 limit

#### Map File Write Flow

```typescript
async function saveMap(map: MapData): Promise<void> {
  // 1. Serialize settings to description
  const serializedDesc = serializeSettings(
    map.header.userDescription || '',
    map.header.author,
    map.header.extendedSettings
  );

  // 2. Update header description
  map.header.description = serializedDesc;
  map.header.descriptionLength = serializedDesc.length;

  // 3. Write map file (existing MapWriter logic)
  await writeMapFile(map);
}
```

#### Map File Read Flow

```typescript
async function loadMap(filePath: string): Promise<MapData> {
  // 1. Read map file (existing MapParser logic)
  const map = await readMapFile(filePath);

  // 2. Parse description
  const parsed = parseDescription(map.header.description);

  // 3. Update header with parsed data
  map.header.userDescription = parsed.userDescription;
  map.header.author = parsed.author;

  // 4. Merge parsed settings with extendedSettings (parsed takes precedence)
  map.header.extendedSettings = {
    ...getDefaultSettings(), // Fill with defaults
    ...map.header.extendedSettings, // Existing settings
    ...parsed.settings // Parsed settings override
  };

  return map;
}
```

---

## Complexity Assessment

| Feature | Implementation Effort | Risk | Priority |
|---------|----------------------|------|----------|
| 8px grid spacing | 1-2 hours (CSS variables) | Low | HIGH |
| Neutral color palette | 2-3 hours (design + CSS variables) | Low | HIGH |
| Flat design + subtle shadows | 2-4 hours (component restyling) | Low | HIGH |
| Icon consistency | 1-2 hours (verify Lucide usage, adjust sizes) | Low | MEDIUM |
| Author field (data model) | 1 hour (MapHeader + serialization) | Low | HIGH |
| Author field (UI) | 1 hour (MapSettingsDialog input) | Low | HIGH |
| Settings serialization | 4-6 hours (serialize + format + tests) | Medium | HIGH |
| Settings parsing | 6-8 hours (parse + validate + error handling) | High | MEDIUM |
| Dark mode | 8-12 hours (dual palette + theme context) | Medium | LOW |
| Settings diff view | 3-4 hours (UI indicator + comparison logic) | Low | LOW |
| Validation warnings | 2-3 hours (warning messages + tooltips) | Low | LOW |

**Total MVP Effort:** ~25-35 hours

---

## Phase Ordering Rationale

### Recommended Sequence

**Phase 1: UI Foundation (8-12 hours)**
1. Define CSS variables for 8px grid + color palette
2. Update global styles with flat design + shadows
3. Verify icon consistency (Lucide)
4. Update button/input/card styles

**Phase 2: Author Field (2-3 hours)**
1. Add MapHeader.author property
2. Add UI input in MapSettingsDialog
3. Update serializeSettings/parseDescription

**Phase 3: Settings Serialization (6-8 hours)**
1. Implement serializeSettings() with non-default filtering
2. Update MapWriter to serialize description
3. Add unit tests for serialization

**Phase 4: Settings Parsing (8-10 hours)**
1. Implement parseDescription() with regex parsing
2. Update MapParser to parse description
3. Add validation and error handling
4. Add unit tests for parsing

**Phase 5: Integration & Polish (4-6 hours)**
1. End-to-end testing (save → load → verify)
2. Fix TypeScript errors
3. Update documentation
4. Manual testing with SEdit maps

**Dependencies:**
- Phase 1 (UI) is independent, can be done first
- Phase 2 (Author) depends on Phase 3/4 (serialization format)
- Phase 3/4 should be done together (serialization + parsing)
- Phase 5 requires all previous phases complete

---

## Research Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| Modern UI trends | **HIGH** | Figma community, VS Code docs, design system articles (2026) |
| 8px grid system | **HIGH** | Material Design, Tailwind, multiple design system sources |
| Settings serialization best practices | **MEDIUM** | General game dev practices, no AC-specific source |
| SEdit description format | **HIGH** | Direct source code analysis (map.cpp lines 1234-1267) |
| Author field patterns | **MEDIUM** | Game level editor conventions (Tiled, general practice) |
| Icon styles | **HIGH** | Lucide/Heroicons official specs, 2026 design articles |
| Color palette structure | **HIGH** | Figma Untitled UI, design systems articles |

---

## Gaps and Open Questions

### Known Gaps

1. **Settings Ordering Strategy**
   - Alphabetical (simple, deterministic) vs category-based?
   - **Recommendation:** Alphabetical for simplicity

2. **Malformed Settings Handling**
   - What if description has `LaserDamage=999` (out of range)?
   - **Recommendation:** Clamp to min/max, log warning

3. **Backward Compatibility**
   - Old maps without settings in description?
   - **Recommendation:** Use extendedSettings defaults, no breaking changes

4. **Forward Compatibility**
   - Future settings not in current GAME_SETTINGS?
   - **Recommendation:** Parse but don't validate unknown keys

### Questions for Phase Planning

- Should dark mode be in v2.0 or deferred to v2.1?
- Should settings diff view be MVP or polish?
- Should validation warnings be v2.0 or v2.1?

---

## Sources

### Modern Minimalist UI Design
- [Visual Studio Code UI Design | Figma](https://www.figma.com/community/file/1260939392478898674/visual-studio-code-ui-design)
- [20 Best VS Code Themes in 2026 | Jit](https://www.jit.io/blog/best-vs-code-themes-2023)
- [Modern App Colors: Design Palettes That Work In 2026 - WebOsmotic](https://webosmotic.com/blog/modern-app-colors/)
- [5 Color Palettes For Balanced Web Design In 2026](https://www.elegantthemes.com/blog/design/color-palettes-for-balanced-web-design)
- [The Ultimate Guide to Creating Color Palettes in Figma | Untitled UI](https://www.untitledui.com/blog/figma-color-palettes)
- [Gray Color: Hex Code, Palettes & Meaning | Figma](https://www.figma.com/colors/gray/)
- [Neutral color systems V2 | Figma](https://www.figma.com/community/file/1393620106697420260/neutral-color-systems-v2)

### Shadows and Elevation
- [Shadows in UI design: Tips and best practices - LogRocket Blog](https://blog.logrocket.com/ux-design/shadows-ui-design-tips-best-practices/)
- [How to elevate your UI Design with depth and clarity | Design Systems Collective](https://www.designsystemscollective.com/how-to-elevate-your-ui-design-with-depth-and-clarity-eb8d43f39a13)
- [Elevation - Fluent 2 Design System](https://fluent2.microsoft.design/elevation)
- [UI Design Trends 2026: 15 Patterns Shaping Modern Websites - Landdding](https://landdding.com/blog/ui-design-trends-2026)

### 8px Grid System
- [The 8pt Grid System: A Simple Guide to Consistent UI Spacing](https://www.rejuvenate.digital/news/designing-rhythm-power-8pt-grid-ui-design)
- [What are spacing best practices (8pt grid system, internal ≤ external rule, etc.)?](https://cieden.com/book/sub-atomic/spacing/spacing-best-practices)
- [Everything you should know about 8 point grid system in UX design | UX Planet](https://uxplanet.org/everything-you-should-know-about-8-point-grid-system-in-ux-design-b69cb945b18d)
- [Spacing, grids, and layouts](https://www.designsystems.com/space-grids-and-layouts/)

### Button Design
- [Make sense of rounded corners on buttons | UX Collective](https://uxdesign.cc/make-sense-of-rounded-corners-on-buttons-dfc8e13ea7f7)
- [Where are rounded buttons most effective in a design?](https://cieden.com/book/sub-atomic/shapes/where-to-use-rounded-buttons)
- [Comparing the Aesthetics of Rounded and Rectangular Buttons | Medium](https://medium.com/@IrfanUlahBaig/comparing-the-aesthetics-of-rounded-and-rectangular-buttons-6294cae40061)

### Icon Libraries
- [Icons – Lucide](https://lucide.dev/icons)
- [25+ Best Open Source Icon Libraries in 2026 | Lineicons](https://lineicons.com/blog/best-open-source-icon-libraries)
- [Better Than Lucide: 5 Icon Libraries With More Variety](https://hugeicons.com/blog/design/8-lucide-icons-alternatives-that-offer-better-icons)
- [22 Best FREE Icon Sets for UI Design (2026 edition) | Untitled UI](https://www.untitledui.com/blog/free-icon-sets)

### Settings Serialization
- [Don't serialize default values](https://mth.st/blog/skip-default/)
- [Deep Dive: Data Serialization | Metaplay Docs](https://docs.metaplay.io/game-logic/utilities/deep-dive-data-serialization.html)
- [Persistent game settings - Learn MonoGame](https://learn-monogame.github.io/tutorial/game-settings/)
- [Configuring your server: config.json files | Hytale.game](https://hytale.game/en/configuring-your-server-config-json-files/)

### Map Editor Metadata
- [Tiled | Flexible level editor](http://www.mapeditor.org/)
- [Level editor - Wikipedia](https://en.wikipedia.org/wiki/Level_editor)
- [Is it possible to create metadata for individual tiles? - Tiled Forum](https://discourse.mapeditor.org/t/is-it-possible-to-create-metadata-for-individual-tiles/4405)

### SEdit Source Analysis
- Local file: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`
- Local source: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SeditSource\sedit_src\map.cpp`

---

## Document Metadata

**Version:** 1.0
**Author:** GSD Research Agent
**Date:** 2026-02-08
**Scope:** v2.0 Modern UI & Settings Management milestone
**Previous Version:** v1.0 (SELECT Tool & Animation Panel) - archived
**Next Steps:** Use findings to create phase plans for UI modernization and settings serialization
