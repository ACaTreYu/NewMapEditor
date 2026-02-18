# Phase 87: Sidebar Removal & Theme System — SUMMARY

**Milestone:** v1.0.6 — Layout Simplification & Theme System
**Status:** Complete (retroactively tracked)
**Completed:** 2026-02-18

## What Was Done

### Sidebar Removal & Overlay Layout
- Removed right sidebar entirely (animations panel hidden from UI)
- Minimap floated as top-right canvas overlay (always visible)
- Game object tool panel floated as bottom-right canvas overlay
- Removed sidebar collapse toggle button and related state
- Removed `focusedPanel` and `rightSidebarCollapsed` state from App.tsx

### 3-Theme System (Light / Dark / Terminal)
- **View > Theme** submenu with radio-checked items (Light, Dark, Terminal)
- **Light theme**: existing warm cream OKLCH palette (default)
- **Dark theme**: cool blue-grey OKLCH dark mode (hue 260)
- **Terminal theme**: green-on-black CRT aesthetic (hue 160) with monospace font override, cyan accents, gold headings
- localStorage persistence (`ac-editor-theme` key)
- FOUC prevention via inline script in index.html applying `data-theme` before first paint
- Electron IPC sync: `set-theme` (main→renderer), `theme-sync` (renderer→main) for menu radio state
- Extracted `buildMenu()` function — rebuilds Electron menu when theme changes
- New preload API: `electronAPI.onSetTheme()`, `electronAPI.syncTheme()`

### Theme Fix Follow-up
- `color-scheme: dark` on `[data-theme="dark"]` and `[data-theme="terminal"]` for native form controls
- Terminal `--text-on-accent` fixed (was dark-on-dark, now gold `oklch(85% 0.13 85)`)
- Gold `--text-heading` token for section headings and selected tabs in dark themes
- Dialog inherits theme colors, `<select>` uses `--input-bg`/`--input-border`
- Slider track uses `--slider-track` token
- Terminal theme: `font-family: inherit` ensures monospace propagation

## Files Changed (14 files, +360 / -207 lines)

| File | Change |
|------|--------|
| electron/main.ts | Extracted buildMenu(), added Theme submenu, theme-sync IPC |
| electron/preload.ts | Added onSetTheme/syncTheme preload APIs |
| index.html | FOUC prevention inline script |
| package.json | Version bump to 1.0.6 |
| src/App.css | Removed sidebar styles (-73 lines) |
| src/App.tsx | Removed sidebar, added overlay components, theme effect hook |
| src/components/GameObjectToolPanel/GameObjectToolPanel.css | Overlay positioning |
| src/components/MapSettingsDialog/MapSettingsDialog.css | Theme-aware dialog/select/slider |
| src/components/Minimap/Minimap.css | Overlay positioning |
| src/components/Minimap/Minimap.tsx | Added className for overlay |
| src/components/Workspace/TraceImageWindow.css | Theme fix |
| src/components/Workspace/Workspace.css | Layout adjustment |
| src/styles/variables.css | +169 lines: dark + terminal theme definitions, new tokens |
| src/vite-env.d.ts | Added electronAPI type declarations |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Remove sidebar entirely (not just collapse) | Maximizes canvas space, animations panel rarely used |
| Overlay minimap + tool panel on canvas | Preserves visibility without layout cost |
| 3 themes (Light/Dark/Terminal) | Covers common preferences plus fun retro option |
| FOUC prevention via inline script | data-theme must apply before CSS loads |
| Rebuild Electron menu on theme change | Radio items need checked state sync |
| Gold headings in dark themes | Provides visual hierarchy without clashing with blue/green palettes |

## Commits

- `5d7ee35` feat: remove sidebar, overlay minimap, add theme system (v1.0.6)
- `a642d29` fix: theme support for dialog, tabs, and native form controls
