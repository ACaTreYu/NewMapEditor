# Domain Pitfalls: v2.0 Modern Minimalist UI

**Domain:** Electron/React Tile Map Editor - Adding modern UI reskin, settings serialization, format parity, and TS error fixes to existing system
**Researched:** 2026-02-08

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: CSS Variable Cascade Blindness During Theme Replacement
**What goes wrong:** Replacing Win98 CSS variables with modern theme variables causes components to render with broken/missing styles because CSS variable inheritance and cascade order weren't properly mapped during migration.

**Why it happens:** The current codebase uses a two-tier CSS variable system (Tier 1: canonical Win98 colors like `--win98-ButtonFace`, Tier 2: semantic aliases like `--surface`). When replacing this system, developers assume they can just swap variable definitions in one central file, but components may have different cascade scopes, specificity conflicts, and inheritance chains that break when variable names or scoping changes.

**Consequences:**
- Components appear unstyled (transparent backgrounds, no borders, invisible text)
- Hover/active states fail silently
- Nested components lose inherited values
- Dialog overlays, scrollbars, and borders disappear
- Different browsers render differently due to cascade order bugs

**Prevention:**
1. **Map the dependency graph first:** Audit all 192+ `var(--win98-*)` references across 8 component CSS files before changing any variables
2. **Incremental replacement strategy:**
   - Phase 1: Add new modern variables ALONGSIDE existing Win98 variables (parallel system)
   - Phase 2: Replace variable references ONE COMPONENT AT A TIME, testing each
   - Phase 3: Remove old Win98 variables only after all references eliminated
3. **Visual regression testing:** Screenshot every component state (default, hover, active, disabled, focused) before and after each change
4. **Cascade order verification:** Test that child components properly inherit variables from parents (App.css → component CSS → inline styles)
5. **Avoid over-nesting:** Don't chain variables too deeply (modern palette → semantic tokens → component-specific → state-specific creates debugging nightmares)
6. **Use cascade layers (@layer) for specificity control:** Define explicit precedence order instead of specificity games

**Detection:**
- Warning sign 1: Component renders with default browser styles instead of themed styles
- Warning sign 2: Hover states work in isolation but break when nested in panels
- Warning sign 3: Different styles in dev vs production build
- Warning sign 4: Styles work in Chrome but break in Electron's Chromium version

**References:**
- [CSS Variables Gone Wrong: Pitfalls to Watch Out For](https://blog.pixelfreestudio.com/css-variables-gone-wrong-pitfalls-to-watch-out-for/)
- [CSS Custom Properties In The Cascade - Smashing Magazine](https://www.smashingmagazine.com/2019/07/css-custom-properties-cascade/)
- [Applying Inheritance in CSS (2026): Predictable Styling - TheLinuxCode](https://thelinuxcode.com/applying-inheritance-in-css-2026-predictable-styling-theming-and-safe-overrides/)

---

### Pitfall 2: Wrong Defaults = Wrong Serialization Output
**What goes wrong:** Auto-generating map settings into the description field produces incorrect output because the default values used for comparison don't match SEdit's actual defaults, causing settings to either be omitted when they should be included, or included when they should be omitted.

**Why it happens:**
1. **Source of truth mismatch:** Defaults defined in `GameSettings.ts` were transcribed from `AC_Setting_Info_25.txt`, but human transcription errors cause mismatches (e.g., `DHT_minimum` default is 1 in code but should match SEdit's binary defaults)
2. **Type conversion errors:** Settings stored as integers but serialized as strings without proper formatting (e.g., boolean toggles 0/1 vs true/false)
3. **Implicit vs explicit defaults:** SEdit may have different defaults for "unset" vs "explicitly set to default value"
4. **Game version drift:** AC settings may have different defaults than base SubSpace/Continuum

**Consequences:**
- Maps load with wrong gameplay parameters in AC client
- Settings string parsing fails due to incorrect format
- Non-default settings get omitted from description (players can't see customization)
- Default settings get included unnecessarily (description bloat)
- Cross-compatibility breaks between editor and game client

**Prevention:**
1. **Binary verification strategy:**
   - Load existing SEdit-created maps with various settings
   - Parse header AND description fields
   - Build truth table: "Setting X at value Y produces description string Z"
   - Verify GameSettings.ts defaults against this truth table
2. **Round-trip testing:**
   ```typescript
   // Test: Serialize → parse → serialize should produce identical output
   const original = createMapWithSettings({ LaserDamage: 27 }); // default value
   const serialized = serializeSettingsToDescription(original);
   const parsed = parseDescriptionToSettings(serialized);
   const reserialized = serializeSettingsToDescription(parsed);
   assert(serialized === reserialized);
   ```
3. **Default detection logic:**
   ```typescript
   // Only include setting in description if it differs from default
   const defaults = getDefaultSettings();
   const settingsString = Object.entries(settings)
     .filter(([key, value]) => value !== defaults[key])
     .map(([key, value]) => `${key}=${value}`)
     .join(', ');
   ```
4. **Validate against AC_Setting_Info_25.txt:** For each setting, verify min/max/default matches exactly
5. **Handle deprecated settings:** DHT vs DHT_players distinction (documentation says "do not use going forward")

**Detection:**
- Warning sign 1: Maps created in editor behave differently when loaded in AC client
- Warning sign 2: Description field contains "LaserDamage=27" when 27 is the default (should be omitted)
- Warning sign 3: Settings dialog shows correct values but description string is empty
- Warning sign 4: Parsing SEdit-created map produces different extendedSettings than original

**References:**
- [Default Values and Options - DeepWiki](https://deepwiki.com/elysiajs/json-accelerator/5.2-default-values-and-options)
- [Jackson Exceptions - Problems and Solutions | Baeldung](https://www.baeldung.com/jackson-exception)

---

### Pitfall 3: Binary Format Byte-Alignment Bugs
**What goes wrong:** MapParser produces files that differ byte-by-byte from SEdit-created files even when tile data and settings are identical, causing compatibility issues or corruption warnings.

**Why it happens:**
1. **Struct padding differences:** C++ SEdit uses packed structs, TypeScript uses manual offset calculation - easy to miss padding bytes
2. **Endianness assumptions:** Little-endian hardcoded but not verified on all platforms
3. **String encoding edge cases:** UTF-8 vs ASCII for name/description fields
4. **Variable header size calculation:** `numTeams` affects flag data offsets but calculation formula has off-by-one errors
5. **dataOffset miscalculation:** Header size must match exactly or compressed data starts at wrong position

**Consequences:**
- Maps load in editor but fail in AC client
- Tile data gets interpreted with wrong offset (visual corruption)
- Header fields read from wrong byte positions
- File size differs from SEdit despite identical content
- Silent data corruption on round-trip (save → load → save produces different bytes)

**Prevention:**
1. **Byte-by-byte comparison testing:**
   ```typescript
   // Create map in SEdit, load in editor, save, compare bytes
   const sEditBytes = fs.readFileSync('test_sedit_created.map');
   const editorBytes = fs.readFileSync('test_editor_saved.map');

   // Find first differing byte
   for (let i = 0; i < Math.min(sEditBytes.length, editorBytes.length); i++) {
     if (sEditBytes[i] !== editorBytes[i]) {
       console.error(`Byte ${i} differs: SEdit=${sEditBytes[i]}, Editor=${editorBytes[i]}`);
       console.error(`Context: offset=${i}, header field at this position=...`);
     }
   }
   ```

2. **Reference implementation comparison:**
   - Parse same map file with both parsers
   - Compare header field by field: `assert(editorHeader.maxPlayers === sEditHeader.maxPlayers)`
   - Verify dataOffset calculation matches
   - Check flag pole data alignment

3. **Fixed test vectors:**
   - Create minimal map: 1 team, no flags, empty name/description
   - Create maximal map: 4 teams, all flags, long name/description
   - Verify byte-exact match with SEdit for both cases

4. **Header size formula verification:**
   ```typescript
   // From MapParser.ts serialize():
   let headerSize = 26; // Base fixed header
   headerSize += numTeams * 2; // flagCount + flagPoleCount
   for (let i = 0; i < numTeams; i++) {
     headerSize += header.flagPoleCount[i]; // Variable pole data
   }
   headerSize += 2 + nameBytes.length; // nameLength (u16) + name
   headerSize += 2 + descBytes.length; // descLength (u16) + description
   headerSize += 1; // neutralCount

   // Verify this matches dataOffset from SEdit-created file
   ```

5. **Endianness testing:** Explicitly test on both little-endian (Windows) and big-endian systems if cross-platform

6. **Use hex diff tools:** `xxd` or `hexdump` to visually compare binary output

**Detection:**
- Warning sign 1: Editor-saved file size differs from SEdit-saved file with same content
- Warning sign 2: AC client shows "corrupt map file" warning
- Warning sign 3: Tile at (0,0) shows wrong tile ID after load
- Warning sign 4: Map name contains garbage characters after round-trip
- Warning sign 5: `dataOffset` field doesn't match actual compressed data position

**References:**
- [Kaitai Struct: declarative binary format parsing language](https://kaitai.io/)
- [EverParse: Verified efficient parsing for binary data formats](https://project-everest.github.io/everparse/)
- [Binary (Comparing and Merging Files) - GNU Diffutils](https://www.gnu.org/software/diffutils/manual/html_node/Binary.html)

---

### Pitfall 4: TypeScript Error Avalanche from Incremental Fixes
**What goes wrong:** Fixing one TypeScript error introduces 10 new errors elsewhere because type inference chains break, causing a whack-a-mole situation that stalls development.

**Why it happens:**
1. **Implicit `any` propagation:** Fixing explicit `any` types reveals implicit `any` in downstream code
2. **Type widening/narrowing changes:** Changing `number` to `number | undefined` breaks all callsites that assumed non-null
3. **Import path brittleness:** Fixing one path alias (`@core/map`) breaks others due to tsconfig.json misconfiguration
4. **Strict mode threshold:** Enabling `strictNullChecks` after 10K+ LOC reveals hundreds of null-safety issues
5. **Third-party type mismatch:** Upgrading `@types/node` to fix one error introduces incompatibilities with Electron types

**Consequences:**
- "Almost done" TS fix turns into 2-day debugging session
- Type errors cause runtime crashes in unrelated features
- Production build breaks despite dev mode working
- Team loses confidence in TypeScript, considers `// @ts-ignore` nuclear option

**Prevention:**
1. **Incremental build strategy (2026 best practice):**
   - Pin TypeScript version in package.json to avoid surprise upgrades
   - Use `tsbuildinfo` caching for faster iteration
   - Fix errors in dependency order (leaf modules first, then consumers)

2. **Vertical slice approach:**
   - Fix all errors in ONE module completely before moving to next
   - Example order for this codebase:
     1. `MapParser.ts` (6 errors, no deps on other modules)
     2. `WallSystem.ts` (1 error, depends on types.ts)
     3. `App.tsx` (unknown count, depends on everything)

3. **Type-level testing:**
   ```typescript
   // Add type tests to prevent regressions
   import { expectType } from 'tsd';

   const parser = new MapParser();
   const result = parser.parse(buffer);
   expectType<ParseResult>(result);
   expectType<MapData | undefined>(result.data);
   ```

4. **Avoid mass `any` → precise type fixes:**
   - Replace `any` with `unknown` first (forces type guards at use-site)
   - Then narrow to precise types one function at a time
   - Never change `any` → `T` without checking all consumers

5. **Separate type fixes from feature work:**
   - Don't add "modern UI reskin" and "fix TS errors" in same PR/phase
   - Type safety is infrastructure work, do it first

6. **Use `// @ts-expect-error` with explanation:**
   ```typescript
   // @ts-expect-error - Electron types mismatch, fixed in v35
   // See: https://github.com/electron/electron/issues/12345
   const result = ipcRenderer.invoke('load-map');
   ```

**Detection:**
- Warning sign 1: Fixing `MapParser.ts` line 284 introduces error in `EditorState.ts`
- Warning sign 2: `npm run typecheck` error count increases after "fix"
- Warning sign 3: IDE shows no errors but `tsc` command-line does (tsconfig mismatch)
- Warning sign 4: Errors only appear after clean build (`rm -rf node_modules && npm install`)

**References:**
- [TypeScript Best Practices for Large-Scale Web Applications in 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/)
- [Troubleshooting TypeScript Performance and Type Safety Issues - Mindful Chase](https://www.mindfulchase.com/explore/troubleshooting-tips/programming-languages/troubleshooting-typescript-performance-and-type-safety-issues-in-large-scale-projects.html)
- [Refactoring at Scale - Stefan Haas](https://stefanhaas.xyz/article/refactoring-at-scale/)

## Moderate Pitfalls

### Pitfall 5: Component Functionality Regression During CSS Migration
**What goes wrong:** After CSS theme replacement, components render correctly but interactive behavior breaks (buttons don't respond, dialogs can't be dismissed, scrollbars don't scroll).

**Why it happens:**
- Removed CSS classes that JavaScript event handlers depend on (e.g., `.active` class toggle)
- Changed z-index stacking that breaks modal focus trapping
- Removed `:hover` states that provide visual feedback users rely on
- Pointer-events CSS property accidentally set to `none` on interactive elements

**Prevention:**
- Test ALL interactive states after CSS changes: hover, active, focus, disabled
- Verify event handlers in React DevTools after style changes
- Keep functional CSS classes (`.active`, `.selected`, `.dragging`) even during theme migration
- Test keyboard navigation (Tab, Enter, Escape) after CSS changes

**Detection:**
- Warning sign: Button looks correct but onClick doesn't fire
- Warning sign: Dialog appears but clicking outside doesn't close it
- Warning sign: Scrollbar thumb renders but dragging doesn't scroll

---

### Pitfall 6: Description Field Auto-Generation Overwriting User Content
**What goes wrong:** If user manually edited the description field in an old workflow, auto-generation silently overwrites their custom text with generated settings.

**Why it happens:**
- No distinction between "description created by user" vs "description auto-generated from settings"
- Serialize function always overwrites entire description field
- No migration path for existing maps with user descriptions

**Prevention:**
- Add `author` field separately from `description` (v2.0 milestone includes this)
- Make description field read-only/hidden in UI (v2.0 milestone includes this)
- On load, detect if description contains settings format: if yes, parse it; if no, preserve as legacy
- Consider storing separate `userNotes` field for future extensibility

---

### Pitfall 7: Settings String Parsing Ambiguity
**What goes wrong:** Description field contains "LaserDamage=27, Author: Bob, MaxDHT=20" and parser fails because it can't distinguish setting keys from user text.

**Why it happens:**
- Settings use comma-separated format that conflicts with natural language
- No escaping mechanism for special characters
- Parser regex too permissive/too strict

**Prevention:**
- Use strict parser: `key=value` pairs only, reject unrecognized keys
- Validate all keys against GAME_SETTINGS list before parsing
- Log warnings for unrecognized tokens but don't fail parsing
- Consider alternative: store settings in binary header extension, not description text

---

## Minor Pitfalls

### Pitfall 8: Viewport-Specific CSS Breaking in Production
**What goes wrong:** Theme looks perfect in dev mode but breaks when packaged as Electron app due to different viewport sizes or DPI settings.

**Prevention:**
- Test at multiple zoom levels (Electron supports Ctrl+/Ctrl-)
- Test on high-DPI displays (125%, 150%, 200% scaling)
- Avoid hardcoded pixel values, prefer rem/em for scalability

---

### Pitfall 9: Unused CSS Import Errors After Theme Removal
**What goes wrong:** After deleting `win98-variables.css`, build fails with "Module not found: @import './styles/win98-variables.css'".

**Prevention:**
- Search codebase for all `@import` statements before deleting CSS files
- Use IDE refactoring to rename/move files instead of manual delete

---

### Pitfall 10: TypeScript Unused Variable Warnings vs Actual Bugs
**What goes wrong:** TypeScript shows 6 errors in MapParser.ts, but 5 are just unused imports (TS6133) while 1 is actual type error (TS2322).

**Prevention:**
- Fix actual type errors (TS2xxx) before unused variable warnings (TS6xxx)
- Consider enabling `noUnusedLocals` in tsconfig.json to catch at compile time
- Use ESLint rule `@typescript-eslint/no-unused-vars` with auto-fix

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| CSS Theme Replacement | Cascade order breaks nested components | Incremental replacement (one component at a time) + visual regression screenshots |
| Settings Serialization | Wrong defaults cause format mismatch | Build truth table from SEdit-created maps before coding |
| MapParser Parity | Byte alignment bugs | Hex diff testing + fixed test vectors |
| TypeScript Error Fixes | Error avalanche from type inference changes | Vertical slice approach (fix MapParser.ts → WallSystem.ts → App.tsx in order) |
| Description Auto-Gen | Overwrites user content | Make description read-only, add separate Author field |
| Settings Parsing | Comma-separated format conflicts with natural language | Strict parser with whitelist validation |
| Production Build | CSS works in dev but breaks in packaged app | Test at multiple DPI settings and viewport sizes |

---

## Research Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| CSS Migration Pitfalls | HIGH | Well-documented 2026 best practices for CSS variable cascade, confirmed with codebase analysis (192 var() refs, 8 component CSS files) |
| Settings Serialization | MEDIUM | AC_Setting_Info_25.txt provides defaults, but actual SEdit binary behavior needs verification with test maps |
| Binary Format Parity | MEDIUM | MapParser.ts code reviewed, but byte-level testing against SEdit required to confirm edge cases |
| TypeScript Errors | HIGH | Current errors identified (6 in MapParser.ts, 1 in WallSystem.ts), 2026 best practices for incremental fixes well-established |

---

## Sources

**CSS Theme Migration:**
- [CSS Variables Gone Wrong: Pitfalls to Watch Out For](https://blog.pixelfreestudio.com/css-variables-gone-wrong-pitfalls-to-watch-out-for/)
- [CSS Custom Properties In The Cascade - Smashing Magazine](https://www.smashingmagazine.com/2019/07/css-custom-properties-cascade/)
- [Applying Inheritance in CSS (2026) - TheLinuxCode](https://thelinuxcode.com/applying-inheritance-in-css-2026-predictable-styling-theming-and-safe-overrides/)
- [Using Custom Property "Stacks" to Tame the Cascade - CSS-Tricks](https://css-tricks.com/using-custom-property-stacks-to-tame-the-cascade/)
- [React & CSS in 2026: Best Styling Approaches Compared - Medium](https://medium.com/@imranmsa93/react-css-in-2026-best-styling-approaches-compared-d5e99a771753)

**Settings Serialization & Defaults:**
- [Default Values and Options - DeepWiki](https://deepwiki.com/elysiajs/json-accelerator/5.2-default-values-and-options)
- [Jackson Exceptions - Problems and Solutions | Baeldung](https://www.baeldung.com/jackson-exception)
- [BinaryFormatter Disabled Across Most Project Types - Microsoft](https://learn.microsoft.com/en-us/dotnet/core/compatibility/serialization/8.0/binaryformatter-disabled)

**Binary Format Testing:**
- [Kaitai Struct: declarative binary format parsing language](https://kaitai.io/)
- [EverParse: Verified efficient parsing for binary data formats](https://project-everest.github.io/everparse/)
- [Binary (Comparing and Merging Files) - GNU Diffutils](https://www.gnu.org/software/diffutils/manual/html_node/Binary.html)
- [Binary Parser - Blazing-fast declarative parser - GitHub](https://github.com/keichi/binary-parser)

**TypeScript Error Fixing:**
- [TypeScript Best Practices for Large-Scale Web Applications in 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/)
- [Troubleshooting TypeScript Performance and Type Safety Issues - Mindful Chase](https://www.mindfulchase.com/explore/troubleshooting-tips/programming-languages/troubleshooting-typescript-performance-and-type-safety-issues-in-large-scale-projects.html)
- [Refactoring at Scale - Stefan Haas](https://stefanhaas.xyz/article/refactoring-at-scale/)
- [Top 16 TypeScript Mistakes Developers Make - DEV Community](https://dev.to/leapcell/top-16-typescript-mistakes-developers-make-and-how-to-fix-them-4p9a)
