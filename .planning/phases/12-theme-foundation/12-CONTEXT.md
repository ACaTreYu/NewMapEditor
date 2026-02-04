# Phase 12: Theme Foundation - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the Win98 CSS variable system, remove modern CSS artifacts, and make the entire app render in authentic Win98 grey with correct bevels and bitmap typography. The theme toggle is repurposed to switch between Win98 color schemes instead of dark/light. Later phases (13-16) will restyle specific components using this foundation.

</domain>

<decisions>
## Implementation Decisions

### Color Palette
- Strict Win98 system palette only — no app-specific extras
- Exact default Windows 98 color scheme values (#c0c0c0 ButtonFace, #000080 active title, etc.)
- Canvas area gets a sunken well treatment (sunken white/dark border frame, like Win98 document areas)
- CSS variable naming: Win98 system names as canonical source (--win98-ButtonFace, --win98-ButtonShadow, etc.) with semantic aliases mapped to them (--surface, --border-light, etc.)

### Bevel/Border Language
- Implemented as CSS border colors only (border-top/left highlight, border-bottom/right shadow) — no box-shadow tricks
- Both bevel depths included in foundation: 1px (simple raised/sunken) and 2px (outer + inner for deeper 3D effect)
- Full bevel vocabulary: raised, sunken, and etched (grooved) styles
- Delivered as CSS utility classes (.win98-raised, .win98-sunken, .win98-etched, etc.)

### Typography
- Actual MS Sans Serif bitmap font bundled via @font-face — pixel-perfect authenticity
- Anti-aliasing disabled (font-smooth: never / -webkit-font-smoothing: none) for crisp bitmap rendering
- MS Sans Serif Bold for title bars and captions — same font family, bold weight
- Two font sizes: 11px primary for most UI, 10px for status bar and secondary text

### Theme Toggle (Repurposed)
- Keep existing theme toggle, but repurpose from dark/light to Win98 color schemes
- Include 2-3 classic Win98 color schemes
- Default to Windows Standard scheme

### Modern CSS Purge
- Remove ALL CSS transitions and animations — every state change is instant, no exceptions
- Strip all rounded corners (border-radius) — sharp 90-degree corners everywhere
- Remove all modern box-shadows (non-bevel), gradients (non-title-bar), opacity fades, blur/filter effects
- If Win98 didn't have it, it goes

### Claude's Discretion
- Which 2-3 Win98 color schemes to include alongside Windows Standard (good variety, nostalgic feel)
- How to structure the theme switching mechanism
- Font loading strategy and fallback chain for MS Sans Serif
- Order of CSS purge operations

</decisions>

<specifics>
## Specific Ideas

- Canvas should look like a Win98 MDI document area — sunken into the surface
- The theme system should be structured so all Win98 system colors are defined once and schemes override them
- Bitmap font with no anti-aliasing is non-negotiable — this is core to the Win98 feel

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-theme-foundation*
*Context gathered: 2026-02-04*
