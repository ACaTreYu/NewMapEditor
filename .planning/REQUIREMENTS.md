# Requirements: AC Map Editor v2.0

**Defined:** 2026-02-08
**Core Value:** The map editing experience should feel intuitive and professional

## v2.0 Requirements

Requirements for v2.0 Modern Minimalist UI. Each maps to roadmap phases.

### UI Modernization

- [x] **UI-01**: Editor uses light neutral color palette (white/light grey backgrounds, subtle borders, dark text)
- [x] **UI-02**: All spacing follows 8px grid system (8/16/24/32px increments)
- [x] **UI-03**: Buttons and inputs have rounded corners (4-8px border-radius)
- [x] **UI-04**: Panels and cards use subtle drop shadows for depth (opacity 0.1-0.2)
- [x] **UI-05**: Win98 theme system (win98-variables.css, win98-schemes.css, win98-bevels.css, win98-typography.css) is removed entirely
- [x] **UI-06**: All 60+ components use modern CSS design tokens (no hardcoded colors/spacing)
- [x] **UI-07**: Toolbar buttons use flat design with hover/active states (no 3D bevel effects)
- [x] **UI-08**: Status bar uses modern flat styling consistent with overall design
- [ ] **UI-09**: Map Settings dialog uses modern input styling (clean inputs, consistent spacing)
- [x] **UI-10**: Scrollbars use neutral-colored modern styling

### Settings Serialization

- [ ] **SERIAL-01**: On save, non-default map settings are auto-serialized to description field in Key=Value comma-separated format
- [ ] **SERIAL-02**: Non-flagger settings appear before flagger settings in serialized output
- [ ] **SERIAL-03**: On load, settings are parsed from description field and applied to map settings
- [ ] **SERIAL-04**: Description box is hidden from user (auto-generated, not user-editable)
- [ ] **SERIAL-05**: Settings serialization output is deterministic (alphabetical within category)
- [ ] **SERIAL-06**: Legacy maps without settings in description load correctly with defaults

### Author Metadata

- [ ] **META-01**: User can enter author name in Map Settings dialog (separate text field)
- [ ] **META-02**: Author is serialized into description field as "Author=name" on save
- [ ] **META-03**: Author is parsed from description field on load and displayed in settings

### SEdit Format Parity

- [ ] **PARITY-01**: Map parsing produces identical results to SEdit for valid map files
- [ ] **PARITY-02**: Map header writing matches SEdit byte layout (minus known SEdit bugs)
- [ ] **PARITY-03**: Default setting values match SEdit defaults exactly

### TypeScript Quality

- [x] **TS-01**: Zero TypeScript errors when running `npm run typecheck`
- [x] **TS-02**: All existing TypeScript errors in MapParser.ts, WallSystem.ts, and App.tsx are resolved

## Future Requirements

### v2.1+

- **DARK-01**: Dark mode theme option
- **DIFF-01**: Visual indicator for non-default settings in Map Settings dialog
- **WARN-01**: Validation warnings for problematic setting combinations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark mode / theme toggle | Single clean look for v2.0; light theme first, dark in v2.1+ |
| System clipboard integration | Internal clipboard preserves tile encoding |
| Settings diff view in dialog | Polish feature, defer to v2.1 |
| Content-aware transforms | Geometric transforms sufficient for now |
| Custom in-app menu bar | Staying with native Electron menu |
| Keyboard shortcut remapping | Low priority |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 27 | Complete |
| UI-02 | Phase 27 | Complete |
| UI-03 | Phase 27 | Complete |
| UI-04 | Phase 27 | Complete |
| UI-05 | Phase 27 | Complete |
| UI-06 | Phase 28 | Complete |
| UI-07 | Phase 28 | Complete |
| UI-08 | Phase 28 | Complete |
| UI-09 | Phase 31 | Pending |
| UI-10 | Phase 28 | Complete |
| SERIAL-01 | Phase 30 | Pending |
| SERIAL-02 | Phase 30 | Pending |
| SERIAL-03 | Phase 30 | Pending |
| SERIAL-04 | Phase 30 | Pending |
| SERIAL-05 | Phase 30 | Pending |
| SERIAL-06 | Phase 30 | Pending |
| META-01 | Phase 29 | Pending |
| META-02 | Phase 29 | Pending |
| META-03 | Phase 29 | Pending |
| PARITY-01 | Phase 31 | Pending |
| PARITY-02 | Phase 31 | Pending |
| PARITY-03 | Phase 31 | Pending |
| TS-01 | Phase 32 | Complete |
| TS-02 | Phase 32 | Complete |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24/24 ✓
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after Phase 27 completion*
