# Phase 33: Document State Refactoring - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Per-document state isolation with independent undo/redo. Refactor the single-document Zustand store so multiple maps can coexist in memory, each with its own state. This phase does NOT add MDI UI (tabs, windows) — that's Phase 34. This phase creates the data/state foundation.

</domain>

<decisions>
## Implementation Decisions

### Document model shape
- **Per-document state:** map data (tile grid), viewport position, zoom level, selection (marquee area), undo/redo stacks, file path, modified/dirty flag, map settings
- **Global state (shared across all docs):** active tool (DRAW, FILL, SELECT, etc.), selected tile(s) in tileset palette, animation frame counter, panel visibility/sizes, UI preferences
- Switching documents does NOT change your current tool or tileset brush — those persist globally

### Active document switching
- Minimap updates instantly to reflect the active document's map and viewport
- Title bar shows the active document's filename and modified state (e.g., "mymap.lvl *")
- Selection visuals (marching ants) resume when switching to a doc with an active selection — Claude's discretion on exact behavior
- Settings dialog state (open/closed, active tab) — Claude's discretion on whether global or per-document

### Document lifecycle
- App starts with an empty workspace (no documents open), NOT a blank untitled map
- File > New creates a new untitled document alongside existing open documents
- File > Open opens the file as a new document alongside existing ones
- No hard limit on open documents — let users open as many as they want
- Closing a modified document shows classic 3-button dialog: Save / Don't Save / Cancel

### Undo/redo isolation
- Each document has its own independent undo/redo stack
- Fixed undo history limit per document (e.g., 100 entries) — oldest entries dropped when exceeded
- Undo scope is data only — tile placements, fills, pastes, map settings changes. Viewport/zoom changes are NOT undoable
- Ctrl+Z always applies to the currently active document
- Saving does NOT clear undo history — user can undo past the last save point

### Claude's Discretion
- Internal architecture for the document store (map of document IDs, slices, etc.)
- How to migrate existing single-doc actions to per-document pattern
- Marching ants resume behavior on document switch
- Settings dialog state scope (global vs per-document)
- Canvas context management strategy for many open documents

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for multi-document state management in Zustand.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 33-document-state-refactoring*
*Context gathered: 2026-02-09*
