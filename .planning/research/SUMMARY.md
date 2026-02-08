# Project Research Summary: v2.0

**Project:** AC Map Editor v2.0 — Modern UI & Settings Management
**Domain:** Electron/React Tile Map Editor (SubSpace/Continuum format)
**Researched:** 2026-02-08
**Overall Confidence:** HIGH

---

## Executive Summary

The v2.0 milestone transforms the AC Map Editor from a Win98 aesthetic to a modern minimalist design while adding critical settings management features for map portability. Research reveals that **modern desktop editors in 2026 prioritize clean neutral color palettes (8-12 gray shades), subtle depth via shadows rather than flat gradients, and the 8px grid spacing system** (Material Design, Tailwind standard). The visual redesign requires zero new dependencies — CSS variables and existing component structure support the entire UI modernization.

Settings management introduces a **non-default value serialization pattern** — the 53 game settings in GameSettings.ts are serialized to the map's description field ONLY when values differ from defaults, keeping files compact while enabling settings portability. Format follows `Key=Value, Key=Value` (comma-space separated, alphabetical order) matching game configuration best practices. An **Author field** follows game level editor conventions (Tiled, standard practice) for creator attribution.

The SEdit format parity goal is achievable: SEdit writes "sedit v2" signature to description, AC will write settings + author + signature. The description field (max 65535 chars, typically <1000) accommodates user text + metadata without format changes. **Critical finding:** The MapHeader already has `extendedSettings: Record<string, number>` — serialization bridges this runtime state to persistent storage, parsing reverses the flow.

Key architectural decisions: (1) CSS variables for theme tokens (--space-*, --color-*, --shadow-*) enable system-wide consistency, (2) Settings serialization happens at save time via `serializeSettings()` function, (3) Settings parsing happens at load time via `parseDescription()` with regex extraction and range validation, (4) Author field stores in MapHeader.author and serializes to description with "Author=" prefix for SEdit compatibility.

Risks center on **backward compatibility** (old maps without settings in description must load without errors), **malformed data handling** (parse errors must not crash editor), and **UI consistency** (all 50+ components must adopt new design system). Mitigation: strict parsing with fallbacks to defaults, comprehensive validation, CSS variable adoption enforced via linter rules, and phased rollout (core components first, then secondary panels).

---

## Key Findings

### Stack: Zero New Dependencies Required

**Modern UI design in 2026 uses CSS primitives, not frameworks.** All visual modernization features can be implemented with CSS variables (already supported in all browsers), existing React component structure, and the Canvas API for editor-specific rendering. Icon library (Lucide) is already installed and follows 2026 design standards (1.5-2px stroke weight, 24x24 grid).

**Core technologies (validated for v2.0):**
- **CSS Variables (browser native)**: Theme tokens for 8px grid spacing, neutral color palette, shadow elevations — `--space-2: 8px`, `--color-gray-500: #666666`, `--shadow-md: 0 4px 6px rgba(0,0,0,0.1)`
- **Lucide Icons 0.263.1**: Already installed, matches 2026 standards (1.5px stroke, outline style, 24x24 grid) — verify consistent sizing (16/20/24px) across components
- **TypeScript 5.3.0**: Settings serialization/parsing logic — pure string manipulation, regex extraction, no external parsers needed
- **Existing MapHeader structure**: `extendedSettings: Record<string, number>` already holds 53 settings — serialization writes to description, parsing reads from description

**NO new npm packages required.** Research into UI frameworks (Material-UI, Ant Design, Chakra) shows they ADD complexity without benefit for a desktop editor with fixed design system. Custom CSS with variables provides full control, zero bundle bloat, and matches VS Code/Figma approach.

**Key decision:** CSS-in-JS is REJECTED. Modern editors use plain CSS with CSS variables for themes. Emotion/styled-components add 50KB+ bundle size, compilation overhead, and React DevTools noise. Plain CSS files with BEM naming + CSS variables provide same capabilities with better performance.

### Features: Table Stakes vs Differentiators

**Table stakes (users expect these in 2026 desktop editors):**
1. **Light neutral color palette** — 8-12 gray shades (base neutrals, text grays, borders), accent colors limited (primary/success/warning/error)
2. **8px grid spacing system** — All margins/paddings in multiples of 8px (8, 16, 24, 32, 48)
3. **Flat design with subtle shadows** — NOT pure flat (outdated 2025), NOT heavy skeuomorphism — minimal aesthetic with shadow-based depth
4. **Settings serialization** — Game settings must persist to map file for portability (SEdit writes "sedit v2", AC writes settings)
5. **Author field** — Creator attribution is standard in game level editors

**Differentiators (set AC Map Editor apart):**
1. **Auto-serialize ONLY non-default settings** — Keeps description compact, highlights customizations (e.g., 5 settings changed = 80 chars, not 2000+ chars)
2. **Settings parsing from existing maps** — Read settings from any AC/SEdit map with embedded settings (enables map sharing)
3. **Validation warnings** — Flag unusual values (e.g., LaserEnergy=57 disables weapon per GameSettings descriptions)
4. **Settings diff view** — Visual indicator showing which settings differ from defaults in UI

**Anti-features (explicitly NOT building):**
- Pure gradient backgrounds (outdated 2026 aesthetic)
- Custom JSON format in description (breaks SEdit compatibility)
- Dark mode in v2.0 (defer to v2.1 — 81.9% users prefer dark, but light theme first)
- Animated UI transitions (unnecessary for desktop, feels sluggish)
- Settings templates library (premature, users need to explore first)

### Architecture: CSS Variables + Serialization Functions

The existing architecture already supports all v2.0 features without structural changes. **Zero new React components needed** — all features integrate into existing MapSettingsDialog, MapParser, MapWriter, and global CSS files. The modernization is purely a visual redesign (CSS changes) plus data persistence logic (serialize/parse functions).

**Major components and required modifications:**

1. **Global CSS Variables** — Define theme tokens in new file `src/styles/theme.css`:
   ```css
   :root {
     /* 8px grid */
     --space-1: 4px;  --space-2: 8px;  --space-3: 16px;  --space-4: 24px;

     /* Neutral palette */
     --color-bg-primary: #ffffff;
     --color-bg-secondary: #f8f9fa;
     --color-text-primary: #1a1a1a;
     --color-text-secondary: #666666;
     --color-border: #e0e0e0;

     /* Shadows */
     --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
     --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
     --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

     /* Borders */
     --radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 12px;
   }
   ```

2. **Component CSS Files** — Update 50+ CSS files to use theme tokens. Priority order:
   - Phase 1: Core components (MapCanvas, ToolBar, TilePalette) — ~10 files
   - Phase 2: Dialogs and panels (MapSettingsDialog, AnimationPanel) — ~15 files
   - Phase 3: Secondary components (Minimap, status bar) — ~25 files

   **Pattern to follow:**
   ```css
   /* OLD */
   .button { padding: 12px; background: #f0f0f0; border-radius: 6px; }

   /* NEW */
   .button {
     padding: var(--space-3);
     background: var(--color-bg-secondary);
     border-radius: var(--radius-sm);
   }
   ```

3. **MapHeader Extension** — Add Author field to types.ts:
   ```typescript
   export interface MapHeader {
     // ... existing 16 fields ...
     author?: string; // NEW: Creator name (max 255 chars)
   }
   ```

4. **Settings Serialization** — New utility file `src/core/map/SettingsSerializer.ts`:
   ```typescript
   export function serializeSettings(
     userDescription: string,
     author: string | undefined,
     settings: Record<string, number>
   ): string;

   export function parseDescription(description: string): {
     userDescription: string;
     author: string | undefined;
     settings: Record<string, number>;
   };
   ```

5. **MapSettingsDialog** — Add Author input field in Map tab:
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

6. **MapWriter Integration** — Update save flow to serialize settings:
   ```typescript
   // Before writing map file
   map.header.description = serializeSettings(
     map.header.userDescription || '',
     map.header.author,
     map.header.extendedSettings
   );
   ```

7. **MapParser Integration** — Update load flow to parse settings:
   ```typescript
   // After reading map file
   const parsed = parseDescription(map.header.description);
   map.header.userDescription = parsed.userDescription;
   map.header.author = parsed.author;
   map.header.extendedSettings = {
     ...getDefaultSettings(), // Fill defaults first
     ...parsed.settings // Parsed settings override
   };
   ```

**Key architectural patterns:**
- **CSS Variables for theming**: All spacing/colors/shadows via CSS variables, no hardcoded values
- **Serialization at save boundary**: Settings → description happens in MapWriter, not throughout app
- **Parsing at load boundary**: Description → settings happens in MapParser, not in UI components
- **Fallback to defaults**: Invalid/missing settings always fall back to GAME_SETTINGS defaults

### Pitfalls: Backward Compatibility & Parsing Robustness

Research identified 12 pitfalls across critical, moderate, and minor severity. The top 5 critical pitfalls that could block v2.0 success:

1. **Backward compatibility breakage** — Old maps (v1.0-v1.7) have no settings in description field. If parser expects settings and fails hard, all existing maps become unloadable. **Mitigation:** Parser must gracefully handle missing settings, empty description, or description with only user text. Fallback to `getDefaultSettings()` for all missing keys. Test with 10+ legacy maps from v1.0-v1.7.

2. **Malformed settings data crash** — User manually edits map file, writes `LaserDamage=INVALID` or `UnknownSetting=123`. Regex parsing fails or parseInt returns NaN. **Mitigation:** Wrap parsing in try-catch, validate with `!isNaN(numValue)` before assignment, ignore unknown keys silently (forward compatibility), log warnings for debugging but never crash.

3. **Description field overflow** — Settings serialization writes 53 settings × 20 chars avg = 1060 chars. User description 500 chars. Total 1560 chars. But what if user writes 10,000 char description? Description field max is 65535 (WORD), but should we allow that? **Mitigation:** Enforce max user description length of 5000 chars in UI (textarea maxLength), warn if total description exceeds 10,000 chars, truncate user text (not settings) if overflow occurs on save.

4. **CSS variable adoption inconsistency** — 50+ CSS files need updates. If some components use theme tokens and others use hardcoded values, UI will look broken (mismatched spacing, wrong colors). **Mitigation:** Enforce CSS variable usage via ESLint plugin (stylelint-no-literal-values), require all new CSS to use variables, batch update files by priority (core → dialogs → secondary).

5. **Settings ordering non-determinism** — Serialization uses `GAME_SETTINGS.filter().map().join()`. If settings array order changes between versions, description field string changes even with same values, causing spurious git diffs and map "modified" state. **Mitigation:** Always sort settings alphabetically by key before serialization: `.sort((a, b) => a.key.localeCompare(b.key))`. This guarantees deterministic output.

**Additional critical pitfalls:**

6. **Author field confusion with user description** — If user writes "Author=Bob" in user description text, parser extracts "Bob" as author even though it's part of description. **Mitigation:** Parse Author line ONLY if it's on its own line (line-based regex, not global search). Document that "Author=" is reserved prefix.

7. **Settings validation silently fails** — Parser clamps out-of-range values but doesn't notify user. User expects `LaserDamage=999` but gets `LaserDamage=225` (max value). **Mitigation:** Log warning messages for clamped values, show toast notification on load if settings were adjusted.

---

## Implications for Roadmap

Based on research, v2.0 features should be developed in 5 sequential phases. The modernization work (UI + Author) is low-risk and foundational. Settings serialization/parsing is medium-risk and critical for portability. TypeScript error elimination is ongoing cleanup work that can happen in parallel.

### Phase 1: UI Foundation — CSS Variables & Design System

**Rationale:** Must establish visual design system before component updates. CSS variables are the foundation for all styling changes. This phase is LOW RISK (purely additive, doesn't affect functionality) and HIGH VISIBILITY (immediate visual impact).

**Delivers:** Theme tokens defined (`--space-*`, `--color-*`, `--shadow-*`, `--radius-*`), global CSS file created, documentation for using variables, ESLint rules to enforce variable usage.

**Addresses features:**
- Light neutral color palette (table stakes)
- 8px grid spacing system (table stakes)
- Flat design with subtle shadows (table stakes)

**Avoids pitfalls:**
- **Pitfall 4 (CSS inconsistency)** — Enforce variable usage via linter, all new CSS must use tokens
- **Pitfall 8 (hardcoded values)** — Centralize theme in one file, grep for hardcoded colors/spacing

**Effort:** 4-6 hours
**Risk:** LOW
**Research flag:** Standard patterns (CSS variables, design tokens) — no phase-specific research needed

---

### Phase 2: Core Component Modernization

**Rationale:** Update highest-visibility components first (MapCanvas frame, ToolBar, TilePalette). Users see immediate improvement. Validates that CSS variable system works before rolling out to all 50+ components.

**Delivers:** MapCanvas container styling updated (border, shadow), ToolBar buttons redesigned (rounded corners, spacing), TilePalette grid updated (consistent spacing), scrollbars styled with neutral colors.

**Addresses features:**
- Consistent icon style (table stakes)
- Button design with rounded corners (modern standard)
- Card/panel styling with subtle shadows

**Avoids pitfalls:**
- **Pitfall 4 (CSS inconsistency)** — Test that variables work correctly before full rollout
- **Pitfall 9 (icon size inconsistency)** — Audit all Lucide icons, enforce 16/20/24px sizes

**Effort:** 6-8 hours
**Risk:** LOW
**Research flag:** Standard patterns — no phase-specific research needed

---

### Phase 3: Author Field Implementation

**Rationale:** Simple feature with clear value (creator attribution). Validates the serialization/parsing pattern before adding complex settings logic. Establishes the MapHeader → description → MapHeader round-trip flow.

**Delivers:** MapHeader.author property, UI input field in MapSettingsDialog (Map tab), Author line in description field ("Author=<name>"), parsing logic extracts Author from description on load.

**Addresses features:**
- Author metadata field (table stakes)

**Avoids pitfalls:**
- **Pitfall 6 (Author confusion)** — Parse Author line ONLY if on its own line
- **Pitfall 1 (backward compatibility)** — Old maps without Author load fine (author = undefined)

**Effort:** 2-3 hours
**Risk:** LOW
**Research flag:** Standard patterns — no phase-specific research needed

---

### Phase 4: Settings Serialization & Parsing

**Rationale:** Core differentiator for v2.0. Enables map portability and SEdit format parity. MEDIUM RISK due to parsing complexity and backward compatibility requirements. Must be implemented carefully with comprehensive testing.

**Delivers:** `serializeSettings()` function (write Key=Value to description), `parseDescription()` function (read Key=Value from description), MapWriter integration (save flow), MapParser integration (load flow), non-default filtering logic, range validation.

**Addresses features:**
- Settings serialization to description (table stakes)
- Auto-serialize ONLY non-default settings (differentiator)
- Settings parsing from existing maps (differentiator)

**Avoids pitfalls:**
- **Pitfall 1 (backward compatibility)** — Test with legacy maps (no settings in description)
- **Pitfall 2 (malformed data)** — Try-catch around parsing, validate all inputs
- **Pitfall 3 (description overflow)** — Enforce max user description length in UI
- **Pitfall 5 (non-determinism)** — Sort settings alphabetically before serialization
- **Pitfall 7 (validation silence)** — Log warnings for clamped values

**Effort:** 10-14 hours (includes comprehensive testing)
**Risk:** MEDIUM
**Research flag:** Settings parsing patterns validated in FEATURES.md — implement with caution, test exhaustively

---

### Phase 5: Remaining UI Components + Polish

**Rationale:** Complete the modernization by updating all remaining components (MapSettingsDialog tabs, AnimationPanel, Minimap, status bar, dialogs). This is LOW RISK repetitive work following patterns established in Phase 2.

**Delivers:** All 50+ CSS files updated to use theme tokens, MapSettingsDialog tabs redesigned (consistent spacing, modern inputs), AnimationPanel updated (card styling, shadows), Minimap border/shadow updated, dialogs centered with modern styling.

**Addresses features:**
- Complete visual consistency across entire app
- Settings diff view (optional differentiator)

**Avoids pitfalls:**
- **Pitfall 4 (CSS inconsistency)** — Final audit ensures all components use variables
- **Pitfall 9 (icon size inconsistency)** — Final audit of all icon usages

**Effort:** 8-12 hours
**Risk:** LOW
**Research flag:** Standard patterns — no phase-specific research needed

---

### Phase 6: TypeScript Error Elimination (Parallel Work)

**Rationale:** Can happen in parallel with Phases 1-5. Ongoing cleanup work to eliminate type errors surfaced by stricter tsconfig settings. LOW RISK but potentially HIGH EFFORT depending on error count.

**Delivers:** Zero TypeScript errors in `npm run typecheck`, stricter type checking enabled (noImplicitAny, strictNullChecks), type definitions for all Electron IPC calls, properly typed Zustand selectors.

**Effort:** 6-10 hours (varies based on error count)
**Risk:** LOW
**Research flag:** TypeScript patterns — no phase-specific research needed

---

### Phase Ordering Rationale

**Sequential dependencies:**
- Phase 1 → Phase 2: CSS variables must exist before component updates
- Phase 2 → Phase 5: Core components establish patterns for remaining components
- Phase 3 → Phase 4: Author field validates serialization pattern before adding complex settings logic

**Parallelization opportunities:**
- Phase 6 (TypeScript errors) is fully independent — can run in parallel with Phases 1-5

**Risk mitigation through ordering:**
- Phase 1 (CSS variables) is LOW RISK foundation — if design system doesn't work, catch it here before component updates
- Phase 3 (Author field) is SIMPLE validation — test serialization/parsing round-trip before complex settings logic
- Phase 4 (Settings serialization) is MEDIUM RISK — comprehensive testing phase, isolated from UI work
- Phase 5 (Remaining UI) is REPETITIVE low-risk work — follows proven patterns from Phase 2

**Pitfall avoidance:**
- Testing CSS variable system (Phase 1) prevents inconsistency issues in Phase 5
- Validating serialization pattern with Author (Phase 3) reduces risk in Phase 4
- Comprehensive parsing tests (Phase 4) catch backward compatibility issues before release

### Research Flags

**Phases needing deeper research during planning:**
- **NONE** — All v2.0 features follow standard patterns. Modern UI design (CSS variables, 8px grid, shadows) is well-documented. Settings serialization (Key=Value format, non-default filtering) follows game development best practices. SEdit description format analyzed from source code. All patterns validated.

**Phases with standard patterns (no phase-specific research needed):**
- **Phase 1 (CSS Variables)** — CSS custom properties are standard web platform feature
- **Phase 2 (Core Components)** — Button/card/input styling follows Figma/VS Code patterns
- **Phase 3 (Author Field)** — Simple text field + serialization (MapHeader → description)
- **Phase 4 (Settings Serialization)** — Regex parsing + validation, standard patterns
- **Phase 5 (Remaining UI)** — Repetitive component updates, same patterns as Phase 2
- **Phase 6 (TypeScript Errors)** — Standard TypeScript strict mode fixes

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies required. CSS variables (native), TypeScript (existing), MapHeader structure (existing). No UI framework needed — plain CSS with tokens follows VS Code/Figma approach. Sources: MDN CSS docs, existing codebase structure. |
| Features | **HIGH** | Modern UI patterns validated from 2026 design sources (Figma Untitled UI, VS Code themes, Material Design). Settings serialization follows game dev best practices (Metaplay, MonoGame docs). SEdit format analyzed from source code (map.cpp). Author field is standard in level editors (Tiled). |
| Architecture | **HIGH** | Clear integration points: CSS variables in global file, serialization functions in new SettingsSerializer.ts, MapHeader extension in types.ts, MapWriter/MapParser updates. NO structural changes — purely additive logic + CSS updates. |
| Pitfalls | **MEDIUM-HIGH** | Backward compatibility risks validated (legacy maps without settings). CSS variable adoption challenges based on codebase size (50+ files). Malformed data handling follows standard defensive parsing patterns. Settings ordering determinism requirement identified. |

**Overall confidence: HIGH**

Research is comprehensive across all four dimensions. Stack decisions validated (no new dependencies, CSS variables sufficient), feature scope clear (modern UI + settings serialization), architecture integration points specific (file names, function signatures), pitfalls documented with mitigations (backward compatibility, parsing robustness, CSS consistency).

---

## Gaps to Address

**Known gaps requiring attention during implementation:**

1. **Dark mode design deferred to v2.1** — 81.9% mobile and 82.7% desktop users prefer dark mode (2024 data), but research recommends light theme first for v2.0. **Resolution:** Design CSS variable structure to support dual themes (e.g., `--color-bg-primary` works for both light/dark), implement light theme completely, add dark mode in v2.1 by duplicating color palette.

2. **Settings validation warnings not designed** — FEATURES.md identifies validation warnings as a differentiator (e.g., "LaserEnergy=57 disables weapon"), but UI pattern not specified. **Resolution:** Use toast notifications on load (non-blocking), log warnings to console for debugging, consider inline warnings in MapSettingsDialog (defer to v2.1 if complex).

3. **Settings diff view not prioritized** — Visual indicator showing which settings differ from defaults is a differentiator but not in MVP phases. **Resolution:** Defer to v2.1. Can be added as small enhancement after core serialization proven.

4. **TypeScript error count unknown** — Phase 6 effort depends on number of errors from stricter tsconfig. **Resolution:** Run `npm run typecheck` with strict flags enabled to get error count BEFORE starting Phase 6. If > 100 errors, consider splitting into sub-phases.

5. **SEdit compatibility testing plan** — Research analyzed SEdit source but didn't test actual SEdit map loading. **Resolution:** Download SEdit, create test maps with various settings, save in AC Map Editor, load in SEdit, verify settings round-trip correctly. Test both directions: SEdit → AC and AC → SEdit.

---

## Sources

### Primary Sources (HIGH Confidence)

**Modern UI Design (2026 Patterns):**
- [The Ultimate Guide to Creating Color Palettes in Figma | Untitled UI](https://www.untitledui.com/blog/figma-color-palettes) — Neutral color system structure (8-12 shades, base neutrals + text grays)
- [Gray Color: Hex Code, Palettes & Meaning | Figma](https://www.figma.com/colors/gray/) — Role of gray in UI design systems
- [The 8pt Grid System: A Simple Guide to Consistent UI Spacing](https://www.rejuvenate.digital/news/designing-rhythm-power-8pt-grid-ui-design) — 8px grid principles (multiples of 8, divisibility by 2 and 4)
- [Shadows in UI design: Tips and best practices - LogRocket Blog](https://blog.logrocket.com/ux-design/shadows-ui-design-tips-best-practices/) — Subtle shadow implementation (opacity, blur, element hierarchy)
- [Visual Studio Code UI Design | Figma](https://www.figma.com/community/file/1260939392478898674/visual-studio-code-ui-design) — VS Code light theme reference

**Settings Serialization Best Practices:**
- [Don't serialize default values](https://mth.st/blog/skip-default/) — Best practice to skip serialization if value === default (keeps payloads compact)
- [Deep Dive: Data Serialization | Metaplay Docs](https://docs.metaplay.io/game-logic/utilities/deep-dive-data-serialization.html) — Game configuration serialization patterns
- [Persistent game settings - Learn MonoGame](https://learn-monogame.github.io/tutorial/game-settings/) — Game settings persistence patterns

**SEdit Format Analysis:**
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md` — Complete map format specification
- `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SeditSource\sedit_src\map.cpp` — Description field handling (lines 1234-1267: always appends "sedit v2")

**Existing Codebase:**
- `E:\NewMapEditor\src\core\map\GameSettings.ts` — Complete list of 53 settings with min/max/default values
- `E:\NewMapEditor\src\core\map\types.ts` — MapHeader structure with extendedSettings Record<string, number>
- `E:\NewMapEditor\CLAUDE.md` — Project overview, tech stack, existing features

---

### Secondary Sources (MEDIUM Confidence)

**UI Design Trends (2026):**
- [Modern App Colors: Design Palettes That Work In 2026 - WebOsmotic](https://webosmotic.com/blog/modern-app-colors/) — Color trends (calmer, deeper, function over gradients)
- [5 Color Palettes For Balanced Web Design In 2026](https://www.elegantthemes.com/blog/design/color-palettes-for-balanced-web-design) — Functional color roles (action, warning, neutral)
- [UI Design Trends 2026: 15 Patterns Shaping Modern Websites - Landdding](https://landdding.com/blog/ui-design-trends-2026) — Shadow and depth effects for dark interfaces

**Icon Standards:**
- [Icons – Lucide](https://lucide.dev/icons) — Stroke-based icon library (1.5-2px stroke, 24x24 grid, customizable)
- [25+ Best Open Source Icon Libraries in 2026 | Lineicons](https://lineicons.com/blog/best-open-source-icon-libraries) — Icon library comparison (Lucide, Heroicons, alternatives)
- [Better Than Lucide: 5 Icon Libraries With More Variety](https://hugeicons.com/blog/design/8-lucide-icons-alternatives-that-offer-better-icons) — Lucide context (clean, consistent, open source)

**Button & Spacing:**
- [Make sense of rounded corners on buttons | UX Collective](https://uxdesign.cc/make-sense-of-rounded-corners-on-buttons-dfc8e13ea7f7) — Rounded corners (simplicity, optimism, accessibility)
- [What are spacing best practices (8pt grid system, internal ≤ external rule, etc.)?](https://cieden.com/book/sub-atomic/spacing/spacing-best-practices) — Internal spacing ≤ external spacing rule
- [Spacing, grids, and layouts](https://www.designsystems.com/space-grids-and-layouts/) — Design system spacing patterns

**Level Editor Metadata:**
- [Tiled | Flexible level editor](http://www.mapeditor.org/) — Level editor reference (arbitrary properties on maps/tiles)
- [Level editor - Wikipedia](https://en.wikipedia.org/wiki/Level_editor) — Level editor overview (metadata includes designer name)

---

### Tertiary Sources (LOW Confidence)

**CSS & Theming:**
- [Elevation - Fluent 2 Design System](https://fluent2.microsoft.design/elevation) — Microsoft design system elevation patterns
- [Neutral color systems V2 | Figma](https://www.figma.com/community/file/1393620106697420260/neutral-color-systems-v2) — Ready-made neutral color system (140+ colors, dark & light themes)
- [VS Code Color Palette](https://www.color-hex.com/color-palette/1038547) — VS Code color hex values reference

**Game Configuration:**
- [Configuring your server: config.json files | Hytale.game](https://hytale.game/en/configuring-your-server-config-json-files/) — JSON config patterns (key-value structure)
- [Serialization/Build: any plans to save only "non-default" values? - Unity Discussions](https://discussions.unity.com/t/serialization-build-any-plans-to-save-only-non-default-values/920008) — Unity serialization discussions

---

**Research completed:** 2026-02-08
**Ready for roadmap:** Yes — All four research dimensions complete, phase structure proposed with rationale, confidence assessed, gaps documented, pitfalls catalogued with mitigations
