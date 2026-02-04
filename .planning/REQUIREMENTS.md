# Requirements: AC Map Editor v1.6

**Defined:** 2026-02-04
**Core Value:** The map editing experience should feel intuitive and professional

## v1.6 Requirements

Requirements for SELECT tool and Animation Panel redesign. Each maps to roadmap phases.

### Selection

- [ ] **SEL-01**: User can marquee-select a rectangular region by dragging on the map canvas
- [ ] **SEL-02**: Active selection displays marching ants animated border
- [ ] **SEL-03**: User can cancel/deselect with Escape key
- [ ] **SEL-04**: Selection coordinates are accurate at all zoom levels (0.25x-4x)

### Clipboard

- [ ] **CLIP-01**: User can copy selection to clipboard (Ctrl+C)
- [ ] **CLIP-02**: User can cut selection to clipboard (Ctrl+X)
- [ ] **CLIP-03**: User can paste clipboard as floating preview (Ctrl+V)
- [ ] **CLIP-04**: User can delete selection contents (Delete key)
- [ ] **CLIP-05**: Floating paste preview renders semi-transparently and follows cursor
- [ ] **CLIP-06**: User can commit floating paste with click, or cancel with Escape

### Transforms

- [ ] **XFRM-01**: User can mirror clipboard contents horizontally
- [ ] **XFRM-02**: User can mirror clipboard contents vertically
- [ ] **XFRM-03**: User can rotate clipboard contents 90 degrees
- [ ] **XFRM-04**: All transforms use SEdit keyboard shortcuts

### Animation Panel

- [ ] **ANIM-01**: Animation panel displays 00-FF hex-numbered vertical list (replacing grid)
- [ ] **ANIM-02**: Tile/Anim radio toggle switches between placing static tile vs animated tile
- [ ] **ANIM-03**: Offset field controls animation frame offset

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Visual Polish

- **WIN98-01**: Win98 panel interiors with authentic inset borders
- **WIN98-02**: Win98 scrollbars matching classic appearance
- **WIN98-03**: Win98 dialog controls (buttons, checkboxes, radio buttons)

### Tool Verification

- **TOOL-01**: Tool behavior verification at all zoom levels
- **TOOL-02**: Wall constrain mode (shift-key axis locking)

## Out of Scope

| Feature | Reason |
|---------|--------|
| System clipboard integration | Internal clipboard preserves tile encoding without serialization overhead |
| Multi-selection (non-contiguous) | SEdit only supports single rectangle selection |
| Resize selection handles | SEdit doesn't have this; standard marquee only |
| Rotation by arbitrary angle | SEdit only supports 90° rotation |
| Content-aware transform tables | SEdit's rotTbl/mirTbl are complex; start with geometric transforms, upgrade if needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEL-01 | Phase 16 | Pending |
| SEL-02 | Phase 16 | Pending |
| SEL-03 | Phase 16 | Pending |
| SEL-04 | Phase 16 | Pending |
| CLIP-01 | Phase 17 | Pending |
| CLIP-02 | Phase 17 | Pending |
| CLIP-04 | Phase 17 | Pending |
| CLIP-03 | Phase 18 | Pending |
| CLIP-05 | Phase 18 | Pending |
| CLIP-06 | Phase 18 | Pending |
| XFRM-01 | Phase 19 | Pending |
| XFRM-02 | Phase 19 | Pending |
| XFRM-03 | Phase 19 | Pending |
| XFRM-04 | Phase 19 | Pending |
| ANIM-01 | Phase 20 | Pending |
| ANIM-02 | Phase 20 | Pending |
| ANIM-03 | Phase 20 | Pending |

**Coverage:**
- v1.6 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

**Phase Mapping:**
- Phase 16 (Marquee Selection Foundation): 4 requirements (SEL-01 to SEL-04)
- Phase 17 (Clipboard Operations): 3 requirements (CLIP-01, CLIP-02, CLIP-04)
- Phase 18 (Floating Paste Preview): 3 requirements (CLIP-03, CLIP-05, CLIP-06)
- Phase 19 (Mirror/Rotate Transforms): 4 requirements (XFRM-01 to XFRM-04)
- Phase 20 (Animation Panel Redesign): 3 requirements (ANIM-01 to ANIM-03)

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after roadmap creation*
