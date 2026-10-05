# Pilotwings Modern

Browser-first 3D flight game built with TypeScript, Vite, Three.js, and Rapier WASM.

The current playable loop is a short training mission:

1. start on the runway;
2. accelerate and take off;
3. fly through three rings in order;
4. return to the runway and land inside the green landing zone.

Unsafe flight is now part of the game rather than being silently tolerated:

- low-speed/high-angle stalls reduce control authority and force the nose down;
- excessive nose-up attitude produces a warning before the stall region;
- mountain and ground impacts end the flight;
- landing off the runway ends the flight;
- excessive landing speed, pitch/roll attitude, or descent rate ends the flight;
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
- `RESTART MISSION`: reset aircraft and mission progress

Tablet/touch controls:

- left virtual stick: pitch / roll
- `YAW ◀` / `YAW ▶`: yaw
- `THRUST`: thrust while held
- multi-touch is supported

The flight model is intentionally arcade-stable, but it still requires safe energy and landing management.

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
