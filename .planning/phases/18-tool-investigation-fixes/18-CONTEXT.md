# Phase 18: Tool Investigation & Fixes - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit all tools against SEdit source code and fix functionality gaps to achieve full parity. Reference: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`

This is an investigation + fix phase — no new tools, but existing tools must match SEdit behavior exactly (with improvements where SEdit has bugs).

</domain>

<decisions>
## Implementation Decisions

### Tool Scope
- Audit ALL tools: PENCIL, FILL, WALL, PICKER, SPAWN, SWITCH, BRIDGE, CONVEYOR, SELECT
- Skip ERASE — it's simple (just places tile 280)
- Full variant parity for game objects (spawn types, switch colors, bridge directions)
- Audit all keyboard shortcuts against SEdit
- Discover any tools/modes in SEdit we haven't implemented yet — document for future phases
- Audit right-click behavior per tool
- Base click/drag behavior only — skip modifier combos (Shift/Ctrl/Alt)

### Parity Definition
- Improved where sensible — match behavior but fix obvious SEdit bugs/quirks
- Document and improve quirky behaviors — note the quirk, implement better, document difference
- Match SEdit's wall auto-connection algorithm exactly (may differ from our Bresenham)
- Keep our current fill algorithm — it works correctly
- Verify 16-bit tile encoding matches SEdit (bits 8-14 for animation flags)
- Visual parity too — cursor shapes, preview opacity, hover effects should match
- Keep our current undo granularity — acceptable as-is
- Verify exact tile IDs for game objects (spawn points, switches, bridges)
- Match SEdit boundary handling at map edges
- Verify tool behavior at all zoom levels (0.25x, 0.5x, 1x, 2x, 4x)
- Match animated tile placement behavior exactly (Tile/Anim toggle, offset)
- Match SEdit cursor shapes
- Match PICKER tool behavior exactly
- Match status bar information display
- Match tile palette multi-tile selection behavior
- Match holding pen wall handling exactly
- Match SEdit's line drawing algorithm for WALL tool
- Match conveyor direction tile IDs exactly

### Fix Approach
- Fix issues immediately as found (not audit-then-batch)
- Fix all issues regardless of complexity — no deferring
- One big commit with all fixes at the end
- Create full audit report documenting everything checked and fixed

### Edge Case Handling
- Fix SEdit bugs — our editor should handle edge cases gracefully
- Graceful out-of-bounds handling — clamp to bounds, no errors
- Don't over-engineer rapid click/drag handling
- Always place tile on click even with no drag

### Claude's Discretion
- Order of tool audits
- Exact audit report format
- How to structure fixes in code

</decisions>

<specifics>
## Specific Ideas

- Reference document: `E:\AC-SEDIT-SRC-ANALYSIS\SEDIT\SEdit-SRC-Analysis\SEDIT_Technical_Analysis.md`
- Wall auto-connection should match SEdit exactly (currently using Bresenham, may need change)
- Holding pen walls need specific attention
- New tools/modes discovered → document for future phases, don't implement in this phase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-tool-investigation-fixes*
*Context gathered: 2026-02-06*
