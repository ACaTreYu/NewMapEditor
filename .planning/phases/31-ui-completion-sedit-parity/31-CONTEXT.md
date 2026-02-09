# Phase 31: UI Completion & SEdit Parity - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the visual modernization of the Map Settings dialog with modern input styling, AND achieve exact byte-level compatibility with SEdit's map format (parsing and writing). This covers modern UI for the last major component and format parity for interoperability with existing AC tools.

</domain>

<decisions>
## Implementation Decisions

### Settings Dialog Layout
- Consolidate 10 tabs into fewer groups (Claude picks sensible groupings based on setting relationships)
- Compact/efficient density — settings close together, maximize visible settings without scrolling
- Fixed-size dialog — predictable dimensions, content scrolls within sections if needed
- No description textarea (removed in Phase 30 — settings auto-serialize)

### Input Control Types
- **Numeric settings** (damage, speeds, rates): Slider + editable number field side by side (current approach, keep it)
- **Boolean settings** (missiles enabled, fog of war, etc.): Checkboxes — not toggle switches
- **Enum settings** (objective type, team count): Claude decides — dropdown or segmented control based on what fits the modern design

### SEdit Format Parity
- Reference source: SEdit source analysis documentation only (no reference map files available)
- Bug handling: Fix obvious SEdit bugs rather than replicating them — write correct bytes
- String encoding: Claude decides pragmatically (ASCII vs UTF-8 for name/description fields)
- Save format version: Claude decides whether to always write V3 or preserve loaded version

### Default Value Alignment
- Must match SEdit defaults exactly — zero tolerance for drift across all 53 settings
- Cross-reference AC_Setting_Info_25.txt AND SEdit source code analysis for verification
- Fix any incorrect defaults silently, but produce a logged summary of what changed
- Migration for old maps: Claude decides migration logic for maps saved with potentially wrong defaults

### Claude's Discretion
- Tab grouping logic (how to consolidate 10 tabs into fewer sections)
- Dialog dimensions and internal spacing
- Dropdown vs segmented control for enum inputs
- String encoding strategy (ASCII vs UTF-8)
- Save format version strategy (always V3 vs preserve loaded version)
- Migration approach for maps with old defaults

</decisions>

<specifics>
## Specific Ideas

- Dialog should feel compact and efficient — a tool for power users who know these settings
- Checkboxes chosen deliberately over toggle switches — matches the utilitarian feel
- Slider + number field combo is the proven pattern from current implementation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-ui-completion-sedit-parity*
*Context gathered: 2026-02-09*
