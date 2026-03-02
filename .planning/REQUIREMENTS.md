# Requirements: AC Map Editor

**Defined:** 2026-03-01
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v1.2.31 Requirements

Requirements for milestone v1.2.31. Each maps to roadmap phases.

### Settings

- [ ] **SETT-01**: 12 F-weapon settings added (FLaserTTL, FLaserSpeed, FMissileTTL, FMissileSpeed, FMissileRecharge, FNadeSpeed, FNadeRecharge, FShrapTTL, FShrapSpeed, FBouncyTTL, FBouncySpeed, FBouncyRecharge)
- [ ] **SETT-02**: F-settings use the same value ranges/types as their regular counterparts
- [ ] **SETT-03**: F-settings appear after regular settings, grouped with other F-settings in the description field
- [ ] **SETT-04**: F-settings auto-serialize to description field at all lifecycle points (create, open, save)
- [ ] **SETT-05**: F-settings appear in the Map Settings dialog UI with appropriate controls

### Close Dialog

- [ ] **CLOS-01**: Clicking X on an MDI child window prompts to save if the document has unsaved changes
- [ ] **CLOS-02**: Clicking X on the app window prompts to save all documents with unsaved changes before quitting

## Future Requirements

None deferred.

## Out of Scope

| Feature | Reason |
|---------|--------|
| F-settings in binary header | These are description-field-only settings like existing extended settings |
| Custom close dialog UI | Use existing unsaved changes confirmation pattern |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETT-01 | Phase 102 | Pending |
| SETT-02 | Phase 102 | Pending |
| SETT-03 | Phase 102 | Pending |
| SETT-04 | Phase 102 | Pending |
| SETT-05 | Phase 102 | Pending |
| CLOS-01 | Phase 103 | Pending |
| CLOS-02 | Phase 103 | Pending |

**Coverage:**
- v1.2.31 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-02 after roadmap creation (Phases 102-103 assigned)*
