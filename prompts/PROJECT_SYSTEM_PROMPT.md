# Pilotwings Modern — Workspace System Prompt

You are working in the `pilotwings-modern` repository: an original browser-based 3D flight game inspired by the approachable mission-flight genre.

## Mission

Build a small, fast, understandable browser game that can evolve from a physics sandbox into mission-based flight challenges while remaining deployable as static files on GitHub Pages.

## Hard constraints

- Runtime: modern desktop/mobile browsers; no server is required for the core game.
- Language/build: TypeScript + Vite.
- Rendering: Three.js.
- Rigid-body physics/contact: Rapier 3D WASM.
- Tests: Vitest for deterministic simulation-side behavior.
- Deployment: GitHub Pages from GitHub Actions.
- Production base path must remain compatible with `/pilotwings-modern/`.
- Tablet/touch play is a supported first-class input mode.
- Do not introduce copied/ripped Nintendo assets, ROM data, source code, maps, music, or proprietary game content.

## Architecture

Respect these ownership boundaries:

- `src/core`: pure timing/math and reusable engine primitives.
- `src/input`: raw keyboard/touch/gamepad input -> normalized control state.
- `src/physics`: Rapier ownership, bodies, colliders, collision integration.
- `src/render`: Three.js scene graph, camera, lighting, visual sync.
- `src/game`: orchestration, missions, state transitions, loop composition.

Physics is authoritative for world transforms. Rendering mirrors physics. Simulation runs at a fixed timestep independent from rendering.

## Working rules

Before editing:

1. inspect the relevant files and architecture docs;
2. identify whether the change affects simulation determinism, input ergonomics, asset paths, or GitHub Pages;
3. keep changes local to the narrowest owning module.

While editing:

- prefer explicit data flow over global mutable state;
- prefer pure functions for flight/aerodynamic math;
- keep units explicit (SI units unless a documented reason says otherwise);
- normalize and clamp player inputs at module boundaries;
- keep device-specific input details inside `src/input`;
- preserve multi-touch and safe-area behavior when changing tablet controls;
- do not make frame-rate-dependent physics;
- use simple collision proxies instead of visual meshes for dynamic bodies;
- avoid dependencies unless they remove meaningful complexity.

Verification:

- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- for physics changes, add a focused deterministic unit test whenever feasible;
- for input changes, test normalization/combination logic independently from the DOM when feasible.

Documentation:

- update `docs/ARCHITECTURE.md` when dependencies or module boundaries change;
- update `docs/DEVELOPMENT_RULES.md` when a durable workflow rule changes;
- leave the repository understandable without relying on chat transcripts.

## Near-term roadmap

Prefer this order unless the user explicitly changes priorities:

1. stable game loop and input abstraction;
2. flight-force model separated from collision physics;
3. chase camera and reset/recovery behavior;
4. ring/checkpoint mission primitives;
5. terrain/scene content pipeline;
6. gamepad support and touch-control refinement;
7. progression, scoring, audio, and polish.
