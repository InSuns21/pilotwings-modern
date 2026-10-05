# Pilotwings Modern — Workspace System Prompt

You are working in the `pilotwings-modern` repository: an original browser-based 3D flight game inspired by the approachable mission-flight genre.

## Mission

Build a small, fast, understandable browser game centered on controllable mission flight while remaining deployable as static files on GitHub Pages.

## Hard constraints

- Runtime: modern desktop/mobile browsers; no server is required for the core game.
- Language/build: TypeScript + Vite.
- Rendering: Three.js.
- Rapier 3D WASM remains available for aircraft/world collision integration.
- Tests: Vitest for deterministic timing, input, flight, and mission behavior.
- Deployment: GitHub Pages from GitHub Actions.
- Production base path must remain compatible with `/pilotwings-modern/`.
- Tablet/touch play is a supported first-class input mode.
- Do not introduce copied/ripped Nintendo assets, ROM data, source code, maps, music, or proprietary game content.

## Current playable loop

The baseline mission is:

1. start on the runway;
2. accelerate and take off;
3. pass the ordered ring course;
4. descend and land inside the marked runway landing zone.

Do not regress this loop when adding features.

## Architecture

Respect these ownership boundaries:

- `src/core`: timing and reusable engine primitives.
- `src/flight`: deterministic arcade flight state/control law.
- `src/input`: raw keyboard/touch/gamepad input -> normalized control state.
- `src/physics`: Rapier integration driven by authoritative flight state.
- `src/render`: Three.js scene, level chase camera, ground/airport, aircraft, mission visuals.
- `src/game`: mission state and orchestration.

## Flight-control principles

Controllability is more important than rigid-body purity for the baseline game.

- Do not control the aircraft by feeding raw pitch/roll/yaw torques directly into a free rigid body.
- Pitch and roll should behave as bounded target attitudes and return toward level when input is released.
- Yaw should command a bounded heading/turn rate and must not oscillate after release.
- Bank should contribute to coordinated turning.
- Keep takeoff, low-speed sink, landing, and maximum control authority predictable.
- Preserve positive-axis semantics: pitch up, roll right, yaw right.
- Put tunable flight constants in the deterministic flight module and cover meaningful behavior with tests.

## Camera and readability principles

- Keep the default chase camera horizon-stable; do not inherit aircraft roll/pitch.
- Follow heading so the camera always looks in the direction of travel.
- Preserve a stable center reference/reticle.
- Ground motion and altitude must be visually readable through tiles, markings, scenery, shadows, or equivalent cues.
- Preserve visible runway and landing-zone guidance.

## Working rules

Before editing:

1. inspect relevant files and architecture docs;
2. identify effects on controllability, camera readability, mission completion, input ergonomics, asset paths, and GitHub Pages;
3. keep changes local to the narrowest owning module.

While editing:

- prefer explicit data flow over global mutable state;
- keep simulation deterministic and fixed-step;
- keep device-specific input details inside `src/input`;
- preserve multi-touch and safe-area behavior;
- avoid dependencies unless they remove meaningful complexity;
- prefer procedural/original assets for baseline scenery.

Verification:

- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- add focused tests when changing flight dynamics, mission gates, or input normalization.

Documentation:

- update `docs/ARCHITECTURE.md` when module boundaries or simulation responsibilities change;
- update `docs/DEVELOPMENT_RULES.md` when a durable workflow rule changes;
- leave the repository understandable without relying on chat transcripts.

## Near-term roadmap

1. tune training mission from real tablet play;
2. add touchdown/crash scoring and runway feedback;
3. add gamepad support;
4. add additional ring/landing missions;
5. improve scenery and aircraft assets;
6. add progression, scoring, audio, and polish.
