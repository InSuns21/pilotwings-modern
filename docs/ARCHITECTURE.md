# Architecture

## Goal

A browser-first 3D flying game inspired by the feel of Pilotwings, implemented as an original project rather than a ROM/emulator or asset clone.

## Stack

- TypeScript: application and simulation code.
- Vite: local development and static production builds.
- Three.js: rendering, camera, scene graph, lighting, and future GLTF assets.
- Rapier 3D (WASM): rigid-body collision and contact simulation.
- Vitest: deterministic unit tests for simulation-side logic.
- GitHub Actions + GitHub Pages: CI and static deployment.

## Runtime boundaries

`src/core/`
: Framework-independent timing and math. Must stay unit-testable without DOM/WebGL.

`src/input/`
: Converts devices into normalized pilot commands. Game logic must not read raw key codes directly.

`src/physics/`
: Owns Rapier and collision bodies. Rendering code must not mutate physics bodies directly.

`src/render/`
: Owns Three.js objects and visual synchronization. No mission rules live here.

`src/game/`
: Application composition, mission/game-state orchestration, and the render/simulation loop.

## Simulation rules

- Physics runs at a fixed 60 Hz step.
- Render cadence is independent from physics cadence.
- Long browser stalls are clamped to prevent a spiral of death.
- Physics bodies are authoritative for world transforms; rendering follows them.
- Visual meshes and collision meshes are separate concepts.
- New flight/aerodynamic equations belong in pure functions or dedicated simulation modules before being wired into Rapier.

## Future seams

The initial scaffold intentionally leaves these as replaceable modules:

1. aerodynamic force model;
2. mission/checkpoint system;
3. terrain and scenery streaming;
4. gamepad/touch controls;
5. GLTF aircraft assets and animation;
6. audio;
7. save/settings persistence.
