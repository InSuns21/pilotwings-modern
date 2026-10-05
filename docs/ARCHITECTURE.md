# Architecture

## Goal

A browser-first 3D flying game inspired by the approachable mission-flight genre, implemented as an original project rather than a ROM/emulator or asset clone.

## Stack

- TypeScript: application, flight model, safety rules, and mission code.
- Vite: local development and static production builds.
- Three.js: rendering, camera, scene graph, procedural ground texture, airport, terrain, and crash visuals.
- Rapier 3D (WASM): kinematic aircraft body/collider integration.
- Vitest: deterministic tests for timing, controls, flight behavior, safety judgments, and mission progression.
- GitHub Actions + GitHub Pages: CI and static deployment.

## Runtime boundaries

`src/core/`
: Framework-independent timing and reusable engine primitives.

`src/flight/`
: Deterministic arcade flight state and control law. This is the source of truth for speed, heading, pitch, roll, vertical speed, stall state, takeoff, and touchdown behavior.

`src/input/`
: Converts keyboard, touch, and future gamepad devices into normalized pilot commands.

`src/physics/`
: Bridges authoritative flight state into Rapier kinematic bodies/colliders.

`src/world/`
: Shared world geometry used by both rendering and collision/safety judgments. Terrain visuals and terrain collision must use the same source data.

`src/render/`
: Owns Three.js scene graph, level chase camera, airport/ground visuals, aircraft mesh, mission visualization, and crash effects.

`src/game/`
: Owns mission progression, safety judgments, crash causes, and application orchestration.

## Flight and safety rules

- Pitch and roll are bounded target attitudes and return toward level when input is released.
- Yaw commands a bounded heading rate and does not use raw rigid-body torque.
- Low airspeed or excessive pitch can enter a recoverable stall.
- Stall reduces control authority, increases sink, and drives the nose down.
- Excessive nose-up attitude is surfaced as a warning before or during the stall envelope.
- Terrain collision is fatal.
- Airborne ground contact outside the runway is fatal.
- Touchdown is fatal when speed, pitch/roll attitude, or descent rate exceeds configured safe limits.
- A crash freezes simulation, marks the mission failed, reports the reason, and triggers a visual wreck/explosion effect.
- Safety rules are deterministic and unit-tested.

## Camera rules

- The default camera is a level chase camera.
- Camera position follows aircraft heading, but does not inherit aircraft roll/pitch.
- World up remains vertical.
- The HUD exposes speed, altitude, heading, pitch, vertical speed, ring progress, warnings, and mission phase.
- A center reticle provides a stable forward reference.

## World and mission rules

- Ground uses a procedural repeated tile pattern.
- The airport includes a runway, centerline/threshold markings, start pad, and visible landing zone.
- Mountains are driven by shared `src/world` geometry so rendered terrain and collision judgment cannot drift apart.
- The initial training mission is: take off -> pass three rings in order -> make a safe landing in the marked zone.

## Simulation rules

- Simulation runs at a fixed 60 Hz step.
- Render cadence is independent from simulation cadence.
- Long browser stalls are clamped.
- The arcade flight state is authoritative for aircraft transforms.
- Rapier mirrors the flight state through a kinematic body.
- Visual meshes and collision meshes remain separate concepts.

## Future seams

1. richer aerodynamic model while preserving controllability;
2. more detailed collision geometry and crash states;
3. landing/crash scoring;
4. additional missions;
5. gamepad support and touch-control refinement;
6. GLTF aircraft/scenery assets;
7. audio and persistence.
