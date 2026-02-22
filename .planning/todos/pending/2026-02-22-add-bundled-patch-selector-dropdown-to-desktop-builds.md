---
created: 2026-02-22T05:07:47.728Z
title: Add bundled patch selector dropdown to desktop builds
area: ui
files:
  - src/components/TilesetPanel/TilesetPanel.tsx
  - src/App.tsx
---

## Problem

The web build has a bundled patch selector dropdown (palette icon button in the tileset title bar) that lists all 33 preloaded GFX patch tilesets. Desktop builds (Windows/Linux) don't have this — they only have the folder browse button which opens a native file dialog. Desktop users should be able to quickly switch between the bundled patches without navigating the filesystem.

## Solution

The dropdown UI and `handleSelectBundledPatch` callback already exist in TilesetPanel.tsx and App.tsx. On desktop, the bundled patches are in the Electron `extraResources` (`patches/` folder). Need to:

1. Wire the `onSelectBundledPatch` prop through to the Electron build (it's already passed in App.tsx)
2. Adjust the image loading paths — on Electron, patches are in the app's resources directory (accessed via `process.resourcesPath` or `__dirname`), not relative `./assets/patches/` URLs
3. May need an IPC call to resolve the patches resource path, or load patch images via the existing `readFile` IPC
4. The dropdown component and CSS are already shared — just the path resolution differs per platform
