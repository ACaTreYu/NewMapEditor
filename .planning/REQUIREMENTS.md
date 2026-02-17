# Requirements: AC Map Editor

**Defined:** 2026-02-17
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.0.5 Requirements

Requirements for settings lifecycle fix. Maps must always have complete game settings in the description field.

### Settings Lifecycle

- [x] **SETT-01**: New maps get Format=1.1 + all 53 default settings serialized in the description immediately on creation
- [x] **SETT-02**: Opening an existing map syncs settings into the description (binary header values merged, all 53 keys always present, Format=1.1 prefix)
- [x] **SETT-03**: Every save re-serializes all current settings to description before writing to disk, regardless of Map Settings dialog interaction
- [x] **SETT-04**: Description field order is: Format=1.1, [settings...], [unrecognized pairs], Author=[author] — author is always last
- [x] **SETT-05**: Existing user text/unrecognized pairs in description are preserved through the serialization lifecycle

## Out of Scope

| Feature | Reason |
|---------|--------|
| Settings UI changes | No dialog changes needed — this is a data lifecycle fix |
| New settings fields | All 53 extended settings already defined and audited in v1.0.4 |
| Binary header modification | Settings go in description field, not binary header |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETT-01 | Phase 86 | Complete |
| SETT-02 | Phase 86 | Complete |
| SETT-03 | Phase 86 | Complete |
| SETT-04 | Phase 86 | Complete |
| SETT-05 | Phase 86 | Complete |

**Coverage:**
- v1.0.5 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 — all 5 requirements complete (Phase 86)*
