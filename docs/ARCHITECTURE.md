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
: Deterministic arcade flight state and control law. This is the source of truth for speed, heading, aircraft pitch, flight-path angle, roll, vertical speed, angle-of-attack behavior, stall state, takeoff, flare, and touchdown behavior.

`src/input/`
: Converts keyboard, touch, and future gamepad devices into normalized pilot commands.

`src/physics/`
: Bridges authoritative flight state into Rapier kinematic bodies/colliders.

`src/world/`
: Shared world geometry used by both rendering and collision/safety judgments. Terrain visuals and terrain collision must use the same source data.

`src/render/`
: Owns Three.js scene graph, level chase camera, airport/ground visuals, the dedicated procedural aircraft model, mission visualization, and crash effects.

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
- Touchdown is fatal when speed, bank, descent rate, excessive nose-up attitude, or relatively small nose-down attitude exceeds configured safe limits. Nose-up and nose-down landing limits are intentionally asymmetric so normal flare is accepted.
- Stall entry and stall recovery use separate thresholds so a stall cannot flicker on/off around one speed.
- Full stall produces strong sink and reduced control authority; it remains recoverable with nose-down attitude and restored speed.
- Airborne speed is not reduced by a fixed coasting penalty. Longitudinal acceleration comes from binary thrust, gravity projected along the flight path, speed-squared parasite drag, stall drag, and optional airbrake drag.
- Aircraft pitch and flight-path angle are distinct state variables. Pitch controls where the nose points; flight-path angle controls the actual vertical trajectory.
- Neutral power-off flight keeps the nose near level while the flight path settles into a shallow negative glide angle. The drag model makes airspeed settle near the configured glide-trim speed rather than decaying into a stall.
- The flight-path angle responds to pitch with a finite rate instead of snapping to it. This lag is intentional and is what permits a landing flare: positive pitch with a still-negative flight path.
- Angle of attack is derived from `pitch - flightPathAngle` and participates in stall and induced-drag behavior.
- Nose-up eventually bends the flight path upward and trades airspeed for altitude; nose-down bends it downward and trades altitude for airspeed.
- `FlightInput.brake` is normalized to `[0, 1]`; in flight it increases drag, while on the runway it applies substantially stronger wheel braking.
- A crash freezes simulation, marks the mission failed, reports the reason, and triggers a visual wreck/explosion effect.
- Safety rules are deterministic and unit-tested.

## Aircraft visual rules

- The playable aircraft is built in `src/render/AircraftModel.ts`; do not rebuild aircraft geometry inside `SceneRenderer`.
- The baseline style is a readable low-poly trainer aircraft, not placeholder box geometry.
- Preserve a recognizable fuselage, tapered main wing, tailplane/fin, canopy, landing gear, propeller, and front/rear silhouette.
- Propeller animation is visual-only and must not affect deterministic flight simulation.
- Flight-state transforms remain authoritative; visual detail must not change control or safety thresholds.
- Cast/receive shadows should remain enabled for the aircraft and runway environment.
- Visual refinements should remain original/procedural unless properly licensed assets are introduced.

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
