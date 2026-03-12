# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MegaRace — a browser-based 3D racing game built with Three.js (v0.163.0). Features a showroom car selector that transitions into a full 3D race on a procedurally generated track. No build tools or bundlers — pure HTML with ES module imports via import maps served from CDN.

## Running

Serve files with any static HTTP server (required for ES module imports):

```
npx serve .
# or
python3 -m http.server 8000
```

Then open `index.html` in a browser.

## Architecture

The app has two phases that share a single `WebGLRenderer` instance:

1. **Showroom phase** (`index.html` inline `<script type="module">`) — A carousel of car models on a rotating podium with spotlight lighting. Player browses cars with arrow keys and presses Enter to start.

2. **Race phase** (`game.js`, exported `startRace()`) — A 3D racing game on a CatmullRom spline track with AI opponent, lap counting, HUD, and Web Audio engine sounds. The showroom calls `startRace(renderer, selectedCarFile, allCarFiles)` which builds an entirely new scene, camera, and game loop.

### Key files

- **`index.html`** — Showroom UI + scene setup. Loads GLB car models into a carousel, handles selection, then hands off to `game.js`.
- **`game.js`** — Racing game module. Procedural track generation (spline-based), road/terrain/barrier mesh creation, scenery placement (trees, houses, mountains), car physics, AI opponent, HUD, countdown, and win/lose detection.
- **`convert.html`** — Utility to convert USDZ → GLB in-browser using Three.js `GLTFExporter`.
- **`convert_usdz_to_glb.py`** — Blender CLI script for USDZ → GLB conversion with Draco compression.

### Assets

- `sample*.glb` — Car models in different colors (yellow, red, orange, blue, green)
- `houses/*.glb` — Building models placed along the track
- `trees/tree.glb` — Tree model cloned along the track
- `grass.png` — Tiled grass texture for terrain
- `lambo_low.usdz` / `lambo_high.usdz` — Original source car models (not used at runtime; converted to GLB)

## Key Technical Details

- All Three.js dependencies load from `cdn.jsdelivr.net` via import maps — no `node_modules` or package.json
- Renderer uses `PCFSoftShadowMap`, pixel ratio capped at 2, `ACESFilmicToneMapping`, and `logarithmicDepthBuffer`
- The track is a looping `CatmullRomCurve3` with 300 segments; cars move along it by advancing a 0–1 `trackT` parameter
- Car steering works as lateral offset from the track spline center, clamped to road width
- Environment maps for car reflections are generated procedurally via `PMREMGenerator.fromScene()`
- Sound effects use Web Audio API oscillators (no audio files)
- The showroom and race each manage their own `requestAnimationFrame` loop; showroom's is cancelled before race starts
