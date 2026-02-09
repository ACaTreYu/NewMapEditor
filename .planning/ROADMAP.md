# Milestone v2.2: Performance Optimization

**Status:** IN PROGRESS
**Phases:** 37+
**Started:** 2026-02-09

## Overview

Eliminate idle CPU usage and startup lag. The app currently re-renders continuously due to a perpetual animation loop, cascading state syncs, and unscoped canvas redraws. This milestone targets zero idle work and responsive startup.

## Key Problems Identified

1. **Perpetual animation loop** — `requestAnimationFrame` runs every frame even when no animated tiles visible
2. **syncTopLevelFields cascade** — backward-compat layer triggers broad re-renders on every store operation
3. **Canvas layer redraws** — both map and overlay layers redraw on every animation tick regardless of changes
4. **Zustand selector over-subscription** — `useShallow` on 9+ fields causes false-positive updates
5. **App.tsx map subscription** — subscribing to `map` at root causes full tree re-renders
6. **Minimap pixel analysis** — synchronous 1024-tile pixel sampling blocks main thread on startup

## Phases

### Phase 37: Render & State Performance

**Goal**: Eliminate idle CPU usage and reduce re-renders to only what changed
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06
**Plans:** 3 plans

**Targets:**
- Animation loop: pause when no animated tiles on screen, pause when window backgrounded
- syncTopLevelFields: eliminate or make granular (only sync changed fields)
- Canvas: split animation redraw from full layer redraw, only redraw what changed
- Selectors: break MapCanvas mega-selector into focused subscriptions
- App.tsx: remove or scope the `map` subscription at root level
- Minimap: defer or offload pixel computation to idle callback / Web Worker

Plans:
- [ ] 37-01-PLAN.md — Conditional animation loop + granular state sync
- [ ] 37-02-PLAN.md — Canvas layer optimization + selector splitting
- [ ] 37-03-PLAN.md — App.tsx cleanup + Minimap defer + verification
