# Theme-Specific Game Tool Icons

**Created:** 2026-02-18
**Priority:** Next up

## Description

Create per-theme icon variants for game object toolbar tools: bunker, conveyor, flag, switch, turret. Currently these use single PNG icons that don't adapt to the 3 themes (Light, Dark, Terminal).

## Current State

- Custom PNG icons exist: `src/assets/toolbar/bunkericon.png`, etc.
- 3 themes: Light (warm cream), Dark (blue-grey), Terminal (green CRT)
- Tileset-rendered icons (spawn, pole, warp) already adapt dynamically

## Approach Options

- Per-theme PNG sets (light/dark/terminal variants of each icon)
- SVGs with `currentColor` so they inherit theme text color automatically
- CSS filter inversion based on active theme

## Files to Investigate

- `src/components/ToolBar/ToolBar.tsx` — toolbar icon rendering
- `src/assets/toolbar/` — existing PNG icons
- `src/components/ToolBar/ToolBar.css` — toolbar styles
- Theme system in `variables.css`
