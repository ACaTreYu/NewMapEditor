# Phase 30: Settings Serialization - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Auto-serialize all 53 extended game settings to the map's description field as comma-space-delimited Key=Value pairs. Parse them back on load. The description field becomes fully machine-managed — the description textarea is hidden from the UI. Author metadata (from Phase 29) appends after the last setting.

</domain>

<decisions>
## Implementation Decisions

### Serialization Scope
- Serialize ALL 53 extendedSettings on every save (not just non-default)
- Header-level fields (maxPlayers, numTeams, objective, damage/recharge tiers, weapon toggles) are NOT serialized — they already live in the binary header
- This simplifies the logic (no default-comparison needed) and is future-proof for adding new settings

### Format & Ordering
- Delimiter: comma-space (`, `) between Key=Value pairs
- **Hard rule:** All Flagger settings (F-prefixed: FShipSpeed, FLaserDamage, etc.) MUST come after all non-flagger settings — game client requires this ordering
- Non-flagger settings can be in any order (no strict alphabetical requirement)
- Toggles (DisableSwitchSound, InvisibleMap, FogOfWar, FlagInPlay, Widescreen) serialize identically to other settings as Key=Value (e.g. `FogOfWar=1`), positioned before flagger settings

### Description Field Ownership
- Description field is fully machine-managed — user never sees or edits it
- Settings own the field; Author= and any future metadata go AFTER the last settings entry, comma-space separated
- Map Settings dialog keeps the Map tab but only shows Name and Author fields; description textarea is removed
- Raise the internal character limit (UI was 256, binary format supports 65K). ~1000 chars needed for all 53 settings + author

### Legacy & Edge Cases
- Unrecognized Key=Value pairs are preserved through save round-trips (future-proofing)
- Out-of-range values are clamped to the setting's min/max bounds on load
- Legacy maps without settings in description load with default extendedSettings values — on next save, all 53 settings get serialized

### Claude's Discretion
- Exact internal character limit for description field (something comfortably above ~1000)
- How to handle legacy user-written description text (non Key=Value content) on first save
- Ordering of non-flagger settings (any reasonable stable order)
- Whether to serialize Author= as part of the same system or keep Phase 29's separate serialize/parse helpers

</decisions>

<specifics>
## Specific Ideas

- "The FSetting= MUST go at the end of the non default settings listed or it wont work" — this is a game client constraint, not optional
- Author and any future metadata fields go after the last settings comma-space, not before
- All 53 settings always serialized (not just non-default) — simplifies logic, easy to extend with future settings

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-settings-serialization*
*Context gathered: 2026-02-09*
