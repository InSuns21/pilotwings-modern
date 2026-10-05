# Pilotwings Modern

Browser-first 3D flight game built with TypeScript, Vite, Three.js, and Rapier WASM.

The current playable loop is a short training mission:

1. start on the runway;
2. accelerate and take off;
3. fly through three rings in order;
4. return to the runway and land inside the green landing zone.

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

The flight model is intentionally arcade-stable: releasing pitch/roll returns the aircraft toward level flight, and yaw commands a bounded turn rate rather than applying raw rigid-body torque.

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
