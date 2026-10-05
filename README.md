# Pilotwings Modern

Browser-first 3D flight game built with TypeScript, Vite, Three.js, and Rapier WASM.

The current playable loop is a short training mission:

1. start on the runway;
2. accelerate and take off;
3. fly through three rings in order;
4. return to the runway and land inside the green landing zone.

Unsafe flight is part of the game rather than being silently tolerated:

- low-speed/high-angle stalls reduce control authority, force the nose down, and add strong sink;
- roughly 50 km/h is now clearly inside the stall envelope rather than sitting on its edge;
- stall recovery requires both regained speed and a lowered nose attitude;
- excessive nose-up attitude produces a warning before or during the stall region;
- mountain and ground impacts end the flight;
- landing off the runway ends the flight;
- excessive landing speed, bank, descent rate, or genuinely unsafe touchdown attitude ends the flight; moderate nose-up flare is explicitly allowed;
- crashes freeze the flight and show a GAME OVER state with the failure reason.

## Development

```bash
npm install
npm run dev
```

Desktop controls:

- `↑ / ↓`: pitch up / down
- `A / D`: roll left / right
- `Q / E`: yaw left / right
- `Space`: thrust while held
- `Shift`: airbrake in flight / wheel brake on the runway
- `RESTART MISSION`: reset aircraft and mission progress

Tablet/touch controls:

- left virtual stick: pitch / roll
- `YAW ◀` / `YAW ▶`: yaw
- `THRUST`: thrust while held
- `BRAKE`: airbrake in flight / wheel brake after touchdown
- multi-touch is supported

The flight model is intentionally arcade-stable, but it now separates aircraft attitude from actual flight path. `PITCH` is where the nose points; `PATH` is where the aircraft is actually moving vertically. This allows a real landing flare: the nose can be +8 to +14 degrees while PATH and vertical speed are still negative. With THRUST off and neutral controls, the trainer settles into a shallow glide near roughly 80 km/h instead of losing speed forever. BRAKE remains separate extra drag in flight and stronger wheel braking on the runway.

THRUST remains intentionally binary (pressed / released). There is no staged throttle control in the current baseline.

The aircraft uses an original low-poly trainer model rather than placeholder boxes: tapered fuselage and wings, canopy/pilot, tail surfaces, fixed landing gear, navigation lights, exhaust detail, a three-blade propeller, speed-linked propeller blur, and cast shadows.

## Verification

```bash
npm run check
```

This runs type checking, Vitest, and a production build.

## Architecture

See:

- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_RULES.md`
- `prompts/PROJECT_SYSTEM_PROMPT.md`

## Deployment

Pushes to `main` run CI and the GitHub Pages deployment workflow. The production build uses `/pilotwings-modern/` as the Vite base path.

Expected Pages URL: `https://insuns21.github.io/pilotwings-modern/`
