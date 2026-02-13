# Canvas Engine Research Summary

**Project:** AC Map Editor v2.8 Canvas Engine
**Domain:** Decoupling Canvas 2D rendering from React render cycle
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

- **The problem is React, not Canvas.** Canvas 2D draws complete in <1ms. React re-renders during drag operations cost 5-10ms each and fire 5-10x per mousemove, consuming 30-110ms/sec of main thread. Every production canvas editor (Excalidraw, tldraw, Figma, Konva) solves this identically: React owns UI chrome, an imperative loop owns the canvas.
- **60% of the infrastructure already exists.** `immediatePatchTile()`, `immediateBlitToScreen()`, `pendingTilesRef`, `useEditorStore.subscribe()` for viewport, `getState()` for animation -- all proven patterns in the codebase. The milestone connects these pieces and removes React from remaining hot paths (pencil drag, cursor tracking, line preview, selection drag).
- **Zero new dependencies required.** Everything needed is `useRef`, `requestAnimationFrame`, `useEditorStore.subscribe()`, `useEditorStore.getState()`, and Canvas 2D API. No OffscreenCanvas, no WebGL, no third-party canvas libraries, no custom signals framework.
- **The primary risk is two sources of truth during drag.** When pending tiles live in a ref while Zustand holds stale data, animation ticks, undo, resize, and tool switches can all read wrong state. This is the #1 pitfall to design around.
- **Extract a CanvasEngine class** that owns buffer, contexts, subscriptions, and drag-local state. React component reduces to lifecycle management (mount/unmount/resize) and event routing. This is a mechanical extraction of existing code, not a rewrite.

## Agreed Patterns (All Research Converges On)

These patterns appear in ALL four research documents. They are settled decisions, not open questions.

1. **On-demand RAF, not persistent game loop.** Editor is idle most of the time. RAF fires only during active interactions, coalescing 5-10 mousemove events into 1 draw per frame.
2. **Ref-based drag state, not React useState.** Cursor position, selection rectangle, line endpoint, pending tiles -- all stored in refs during drag. Zero React re-renders until mouseup.
3. **Batch commit on mouseup.** Accumulate changes in `pendingTilesRef` Map during drag. Single `setTiles()` + `commitUndo()` call on mouseup. One React re-render per operation.
4. **Per-layer dirty flags.** Separate flags for `mapBuffer` (tile changes), `mapBlit` (viewport changes), and `uiOverlay` (cursor/selection changes). Skip layers that haven't changed.
5. **Zustand subscribe() for canvas, useEditorStore() for React.** Store subscriptions fire synchronously outside React's render cycle. Canvas redraws go through subscriptions; UI panels go through hooks.
6. **CanvasEngine class encapsulates all pixel operations.** Buffer management, tile rendering, blit, grid, overlays -- all in a class that React attaches/detaches via lifecycle effects.
7. **Undo works identically.** Snapshot-diff undo doesn't care how many intermediate mutations occurred. `pushUndo()` before drag, `setTiles()` + `commitUndo()` after -- produces identical deltas to current per-tile approach.

## Key Decisions (To Resolve During Planning)

| Decision | Options | Recommendation | Notes |
|----------|---------|----------------|-------|
| Wall pencil during drag | (A) Keep Zustand per-move, (B) Local buffer like pencil | **A for v2.8** | Wall auto-connection reads 8 neighbors from store. Extracting that logic is high effort, low frequency tool. |
| Undo during active drag | (A) Block Ctrl+Z, (B) Commit-then-undo | **A: Block** | What Photoshop/GIMP do. Simpler, no edge cases. |
| Resize during active drag | (A) Defer resize, (B) Reapply pending after rebuild | **A: Defer** | Simpler. Resize on mouseup. Rare edge case. |
| subscribeWithSelector middleware | (A) Add now, (B) Use basic subscribe | **A: Add** | Non-breaking. Enables granular subscriptions (animation frame, viewport, map tiles separately). |
| CanvasEngine file structure | (A) Single file, (B) Split into modules | **A: Single file** | Rendering code is ~400 lines total. Split only if it exceeds ~500 lines. |
| Tool switch during drag | (A) Commit pending, (B) Discard pending | **A: Commit** | User drew tiles intentionally. Don't lose their work. |
| drawMapLayer React useEffect | (A) Remove immediately, (B) Guard with isDragActive | **B: Guard first** | Safer migration. Remove in later phase once engine subscriptions are proven. |

## Risk Register (Top 5)

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | **Two sources of truth during drag** -- animation tick, undo, resize read stale Zustand while pending tiles are in ref | CRITICAL | HIGH | Overlay read function `getTileAt()` that checks pending before store. Block undo during drag. Skip animation for pending tile positions. |
| 2 | **React re-render overwrites imperative canvas** -- any React re-render during drag triggers drawMapLayer which diffs against stale prevTilesRef and "un-patches" pending tiles | CRITICAL | HIGH | Guard drawMapLayer with `isDragActive` flag: skip tile diff during drag, blit-only. |
| 3 | **Stale closures in useCallback** -- imperative functions close over old viewport/map when deps haven't re-fired | MODERATE | MEDIUM | Use `getState()` at call time instead of closure variables. Or use CanvasEngine class methods (no closures). |
| 4 | **Component unmount during drag loses pending tiles** -- MDI close or tab switch while dragging | MODERATE | LOW | Cleanup effect commits pending tiles before unmount. Global mouseup listener (like scroll drag already does). |
| 5 | **Double blit per viewport change** -- store.subscribe AND React useEffect both fire drawImage | LOW | HIGH (currently happening) | Route viewport blits through subscription only. Remove viewport from drawMapLayer useEffect deps. |

## Recommended Phase Structure

### Phase 51: Extract CanvasEngine Class

**Rationale:** Foundation for all subsequent phases. Mechanical extraction of existing code with no behavioral change. Low risk.
**Delivers:** `src/core/canvas/CanvasEngine.ts` with buffer management, `renderTile()`, `fullBufferRebuild()`, `incrementalPatch()`, `blitToScreen()`. React component creates engine in useEffect, delegates rendering.
**Addresses:** Code organization, eliminates useCallback/useEffect dependency chains for rendering
**Avoids:** Risk 3 (stale closures) -- class methods don't have closure problems
**Research needed:** NO -- mechanical extraction of proven code

### Phase 52: Engine Subscribes to Zustand

**Rationale:** Decouple canvas rendering from React render cycle. Viewport blits, map tile updates, animation ticks, and UI state changes all driven by direct store subscriptions.
**Delivers:** Engine self-renders when Zustand state changes. React useEffect for rendering removed. `isDragActive` guard prevents engine from re-rendering during drag.
**Addresses:** Risk 5 (double blit), removes React from rendering hot path for non-drag operations
**Avoids:** Risk 2 (React overwrite) -- drawMapLayer no longer triggered by React re-renders
**Research needed:** NO -- existing subscribe pattern at line 754 is the exact template

### Phase 53: Decouple Pencil Drag

**Rationale:** Pencil is the highest-frequency drag tool and the primary performance bottleneck. `setTile()` per mousemove is the #1 source of unnecessary re-renders.
**Delivers:** `beginDrag()` / `paintTile()` / `commitDrag()` / `cancelDrag()` API. Pending tiles accumulated in Map ref. Buffer patched + blitted imperatively. Single `setTiles()` on mouseup.
**Addresses:** Core performance goal -- zero React re-renders during pencil drag
**Avoids:** Risk 1 (two sources of truth) -- overlay read function, animation skip for pending positions, undo blocked during drag
**Research needed:** MAYBE -- verify undo snapshot-diff produces identical results with batch commit vs per-tile commit. Test case: draw 50 tiles, Ctrl+Z should revert all 50.

### Phase 54: Decouple Cursor and UI Overlay

**Rationale:** `setCursorTile()` (useState) triggers full re-render on every mousemove. Line preview, selection rectangle, and paste preview have the same problem.
**Delivers:** Cursor position, line state, selection drag, paste preview position all stored in refs. UI layer redrawn imperatively via dirty flag. Zero React re-renders for overlay updates.
**Addresses:** Remaining re-render sources during all tool interactions
**Avoids:** Risk 3 (stale closures) -- engine reads viewport from getState(), not closure
**Research needed:** NO -- same ref + imperative draw pattern as Phase 53

### Phase 55: Extend to Remaining Drag Tools

**Rationale:** Apply proven pattern from Phases 53-54 to wall pencil, selection, rect tools. Each tool has the same structure.
**Delivers:** Consistent performance across all tools. Wall pencil keeps Zustand per-move (auto-connect complexity). Selection and rect tools use ref-based drag state.
**Addresses:** Tool consistency, edge cases (tool switch during drag, Escape cancellation, unmount during drag)
**Avoids:** Risk 4 (unmount data loss) -- global mouseup listener, cleanup effect
**Research needed:** NO -- repeating proven pattern per tool

### Phase Ordering Rationale

- **51 before 52:** Engine class must exist before it can subscribe to Zustand.
- **52 before 53:** Subscription-driven rendering must be in place so that removing `setTile()` during drag doesn't break non-drag rendering.
- **53 before 54:** Pencil drag is the biggest performance win and validates the batch commit + overlay read pattern that 54 and 55 depend on.
- **54 before 55:** Cursor/UI decoupling is shared infrastructure for all tools. 55 extends it per-tool.
- **Each phase is independently verifiable** -- all existing functionality must still work after each phase.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 53:** Verify undo integration with batch commit. The snapshot-diff system should be equivalent, but edge cases (multi-tile stamps, wall pencil mid-drag, Escape cancellation) need explicit test cases in the plan.

**Phases with standard patterns (skip research):**
- **Phase 51:** Pure extraction, no design decisions
- **Phase 52:** Direct template from existing line 754 subscription
- **Phase 54:** Same pattern as Phase 53 but simpler (no store writes)
- **Phase 55:** Repetition of proven pattern per tool

## What NOT to Build

All research unanimously agrees these are anti-features for v2.8:

| Anti-Feature | Why Not |
|--------------|---------|
| OffscreenCanvas / Web Worker | Bottleneck is React, not canvas speed. Worker adds postMessage latency and serialization complexity for zero gain. |
| WebGL / WebGPU renderer | Canvas 2D drawImage is <1ms for our workload. GPU rendering solves a problem we don't have. |
| Custom signals library (Signia-style) | Zustand subscribe + refs achieves the same result for our complexity level. Signals are for apps with hundreds of derived computations. |
| Custom React reconciler (R3F-style) | Our canvas is a single drawImage blit + tile patches. A reconciler is for scene graphs with thousands of objects. |
| Third-party canvas libraries (Konva, PixiJS, Fabric) | They add abstraction over the 2 Canvas 2D calls we actually make. More code, more bundle, no benefit. |
| Persistent RAF game loop | Editor is idle most of the time. On-demand RAF is more efficient and simpler. |
| React state batching as a solution | React 18 auto-batches, but even 1 re-render per event handler is too many. The goal is ZERO re-renders during drag. |
| Immutable state diffing library | Existing `prevTilesRef` Uint16Array comparison is O(n) and fast. No library needed. |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies. All APIs (RAF, Canvas 2D, useRef, Zustand subscribe) are stable, well-documented, and already partially used in codebase. |
| Features | **HIGH** | Production editors (Excalidraw, tldraw, Figma, Konva) all converge on identical patterns. Multiple official sources confirm the approach. |
| Architecture | **HIGH** | CanvasEngine class directly mirrors existing imperative bypass functions already proven in codebase. Migration is extraction, not invention. |
| Pitfalls | **HIGH** | All pitfalls grounded in specific line numbers in MapCanvas.tsx with concrete reproduction steps. Not hypothetical. |

**Overall confidence:** HIGH

### Gaps to Address

- **Wall auto-connection during drag:** If wall pencil stays on Zustand during drag (recommended), its performance won't improve. Acceptable for v2.8 since wall painting is lower frequency than pencil. Revisit if users report wall drag lag.
- **Multi-document buffer memory:** Each CanvasEngine instance holds a 4096x4096 buffer (~64MB). With 8 documents, that's 512MB. Currently identical to existing architecture. Flag for monitoring but not blocking.
- **GPU process crash recovery:** Rare Electron issue where canvas contexts go silently dead after laptop sleep/wake. Not v2.8 scope, but the CanvasEngine's `detach()`/`attach()` lifecycle would make recovery easier to implement later.

## Sources

### Primary (HIGH confidence)
- MDN: requestAnimationFrame, Canvas 2D optimization, OffscreenCanvas, getContext()
- Zustand docs: subscribe(), getState(), subscribeWithSelector middleware
- React Three Fiber: performance pitfalls ("never setState in render loop")
- Direct codebase analysis: MapCanvas.tsx (1629 lines), EditorState.ts, documentsSlice.ts

### Secondary (HIGH confidence)
- Excalidraw: DeepWiki analysis of AnimationController, nonce-based invalidation, dual canvas
- tldraw: Signia signals documentation, incremental computed signals
- Figma: Engineering blog posts on render loop architecture, WebGPU rendering
- Konva: batchDraw(), Layer_Management, ref-based drag patterns

### Tertiary (MEDIUM confidence)
- Community patterns: CSS-Tricks RAF hooks, Phil Nash canvas animation, Babylon.js forum
- Josh Comeau: React re-render mechanics
- Mark Erikson: React rendering behavior guide

---

*Research synthesis completed: 2026-02-12*
*Ready for roadmap: yes*
