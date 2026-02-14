# Requirements: AC Map Editor

**Defined:** 2026-02-13
**Core Value:** The map editing experience should feel intuitive and professional — tools work correctly, the layout maximizes the editing canvas, and workflows match what users expect from image editors.

## v3.0 Requirements

Requirements for v3.0 Panel Layout & Ruler Notes. Each maps to roadmap phases.

### Layout

- [ ] **LAYOUT-01**: Tile palette panel constrained to tileset image width (~640px) instead of stretching to full app width
- [ ] **LAYOUT-02**: Freed horizontal space hosts the ruler notepad panel as a new tab/section

### Ruler Notepad

- [ ] **NOTE-01**: Panel displays measurement log entries with type, value, and timestamp
- [ ] **NOTE-02**: Measurements auto-log to notepad when pinned (P key)
- [ ] **NOTE-03**: User can add/edit text labels on measurement entries
- [ ] **NOTE-04**: User can delete individual entries from the log
- [ ] **NOTE-05**: User can copy measurement list to clipboard

### Ruler Angle

- [ ] **ANGLE-01**: Line mode displays angle from horizontal (0° = right, standard math convention)
- [ ] **ANGLE-02**: Path mode displays angle of each segment

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Measurement

- **MEAS-01**: Custom measurement scales (user-defined units instead of raw tiles)

### Performance

- **PERF-01**: OffscreenCanvas + Web Worker rendering pipeline
- **PERF-02**: Chunked pre-rendering for larger map support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Ruler notepad in right sidebar | User wants it in freed horizontal space beside tile palette |
| Session persistence for notepad | Deferred — measurement log is per-session |
| Custom measurement scales | Deferred to future milestone |
| OffscreenCanvas/Web Worker | No perf issues currently, defer until needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | — | Pending |
| LAYOUT-02 | — | Pending |
| NOTE-01 | — | Pending |
| NOTE-02 | — | Pending |
| NOTE-03 | — | Pending |
| NOTE-04 | — | Pending |
| NOTE-05 | — | Pending |
| ANGLE-01 | — | Pending |
| ANGLE-02 | — | Pending |

**Coverage:**
- v3.0 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9 ⚠️

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after initial definition*
