# Pilotwings Modern — Workspace System Prompt

You are working in the `pilotwings-modern` repository: an original browser-based 3D flight game inspired by the approachable mission-flight genre.

## Mission

Build a small, fast, understandable browser game centered on controllable mission flight while remaining deployable as static files on GitHub Pages.

## Hard constraints

- Runtime: modern desktop/mobile browsers.
- Language/build: TypeScript + Vite.
- Rendering: Three.js.
- Rapier 3D WASM remains available for aircraft/world collision integration.
- Tests: Vitest for deterministic timing, input, flight, safety, and mission behavior.
- Deployment: GitHub Pages from GitHub Actions.
- Production base path must remain compatible with `/pilotwings-modern/`.
- Tablet/touch play is a supported first-class input mode.
- Do not introduce copied/ripped Nintendo assets, ROM data, source code, maps, music, or proprietary game content.

## Baseline game loop

The training mission must preserve all of these:

1. runway takeoff;
2. ordered ring traversal;
3. safe approach and landing;
4. recoverable stall / nose-high warnings;
5. fatal mountain/ground collision;
6. fatal unsafe touchdown based on speed, attitude, or descent rate;
7. GAME OVER with a specific failure reason and restart.

## Architecture

- `src/core`: timing and engine primitives.
- `src/flight`: deterministic arcade flight state/control law.
- `src/input`: keyboard/touch/gamepad -> normalized control state.
- `src/physics`: Rapier integration driven by authoritative flight state.
- `src/world`: shared terrain/runway geometry for both visuals and collision judgments.
- `src/render`: scene, level chase camera, terrain/airport, dedicated aircraft model, mission and crash visuals.
- `src/game`: mission state, safety judgments, crash handling, and orchestration.

## Flight and failure principles

Controllability remains more important than rigid-body purity, but flight must have meaningful failure modes.

- Do not reintroduce free rigid-body torque control.
- Pitch/roll should be bounded and self-stabilizing.
- Yaw must remain non-oscillatory.
- Stalls must affect actual flight behavior, not only HUD text.
- Stall entry and recovery should use hysteresis: once stalled, the aircraft must regain both adequate airspeed and a safe nose attitude before recovery.
- Around 50 km/h should remain visibly within the current trainer's stall regime unless the aircraft model is deliberately re-tuned.
- Excessive nose-high attitude must be observable before loss of control.
- Safe landing limits for forward speed, descent rate, pitch, and roll must be explicit constants.
- Terrain rendering and terrain collision must share source geometry.
- Ground/terrain impacts and unsafe touchdowns must stop flight immediately.
- Crash causes must remain distinguishable in code and UI.
- Put tunable thresholds in deterministic modules and cover them with tests.

## Aircraft presentation principles

- Keep aircraft geometry isolated in `src/render/AircraftModel.ts`.
- The baseline aircraft must read immediately as a small propeller trainer: shaped fuselage, tapered wings, tail surfaces, canopy, landing gear, propeller, and useful color accents.
- Do not regress to primitive box-and-board placeholder silhouettes.
- Keep the style low-poly and performant on tablets.
- Propeller rotation/blur and shadows are visual feedback only and must not feed back into deterministic simulation.
- Preserve the +X visual nose/forward convention used by the current flight state and camera.

## Camera and readability principles

- Keep the chase camera horizon-stable.
- Follow aircraft heading and preserve a stable center reticle.
- Ground motion, altitude, terrain hazards, and runway alignment must remain visually readable.
- HUD should expose the quantities needed for safe landing, including speed, pitch, and vertical speed.

## Working rules

Before editing, inspect relevant files and consider controllability, safety judgments, terrain consistency, mission completion, touch ergonomics, and GitHub Pages.

While editing:

- keep simulation deterministic and fixed-step;
- keep device-specific input inside `src/input`;
- preserve a normalized brake input across keyboard, touch, and future gamepad devices;
- use that brake as airbrake drag in flight and stronger wheel braking on the ground;
- keep terrain source data in `src/world`;
- preserve multi-touch and safe-area behavior;
- avoid dependencies unless they remove meaningful complexity;
- prefer procedural/original assets.

Verification:

- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- add focused tests when changing flight dynamics, safety thresholds, terrain collisions, mission gates, or input normalization.

## Near-term roadmap

1. tune stall and landing thresholds from tablet play;
2. add landing/crash scoring and stronger runway feedback;
3. add gamepad support;
4. add additional missions and terrain;
5. improve scenery and aircraft assets;
6. add audio, progression, and persistence.
