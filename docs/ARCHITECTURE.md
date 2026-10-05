# Architecture

## Goal

A browser-first 3D flying game inspired by the approachable mission-flight genre, implemented as an original project rather than a ROM/emulator or asset clone.

## Stack

- TypeScript: application, flight model, and mission code.
- Vite: local development and static production builds.
- Three.js: rendering, camera, scene graph, procedural ground texture, airport, and mission visuals.
- Rapier 3D (WASM): kinematic aircraft body/collider integration and future world collision expansion.
- Vitest: deterministic tests for timing, controls, flight behavior, and mission progression.
- GitHub Actions + GitHub Pages: CI and static deployment.

## Runtime boundaries

`src/core/`
: Framework-independent timing and reusable engine primitives.

`src/flight/`
: Deterministic arcade flight state and control law. This is the source of truth for speed, heading, pitch, roll, altitude, takeoff, and touchdown behavior.

`src/input/`
: Converts keyboard, touch, and future gamepad devices into normalized pilot commands. Device-specific code must not leak into flight or mission logic.

`src/physics/`
: Bridges deterministic flight state into Rapier kinematic bodies/colliders. It must not reintroduce raw torque-driven control.

`src/render/`
: Owns Three.js scene graph, level chase camera, airport/ground visuals, aircraft mesh, and mission visualization.

`src/game/`
: Owns mission progression and application orchestration.

## Control rules

- All devices produce the same normalized `FlightInput`.
- Positive pitch means nose up, positive roll means right bank, positive yaw means turn right.
- Keyboard and touch inputs may be combined; axes are clamped to `[-1, 1]`.
- Pitch and roll are target-attitude commands with bounded response rates.
- Releasing the stick returns pitch/roll toward level flight.
- Yaw commands a bounded heading rate; it is not converted into raw rigid-body torque.
- Bank contributes to coordinated turn rate so normal turns can be flown mostly with roll.
- Touch uses Pointer Events for multi-touch and pointer capture.

## Camera rules

- The default camera is a level chase camera.
- Camera position follows aircraft heading, but does not inherit aircraft roll/pitch.
- World up remains vertical to keep the horizon readable.
- The HUD exposes speed, altitude, heading, ring progress, and current mission phase.
- A center reticle provides a stable forward reference.

## World and mission rules

- Ground uses a procedural repeated tile pattern so altitude and motion are visually readable without external image assets.
- The airport includes a runway, centerline/threshold markings, start pad, and visible landing zone.
- The initial training mission is: take off -> pass three rings in order -> land in the marked runway zone.
- Mission progression is deterministic and unit-tested.

## Simulation rules

- Simulation runs at a fixed 60 Hz step.
- Render cadence is independent from simulation cadence.
- Long browser stalls are clamped to prevent a spiral of death.
- The arcade flight state is authoritative for aircraft transforms.
- Rapier mirrors the flight state through a kinematic body.
- Visual meshes and collision meshes remain separate concepts.

## Future seams

1. richer aerodynamic model while preserving controllability;
2. runway/terrain collision and crash states;
3. additional missions and scoring;
4. gamepad support and touch-control refinement;
5. GLTF aircraft/scenery assets;
6. audio;
7. save/settings persistence.
