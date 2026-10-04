# Pilotwings Modern

Browser-first 3D flight game scaffold built with TypeScript, Vite, Three.js, and Rapier WASM.

## Development

```bash
npm install
npm run dev
```

Open the local Vite URL. Controls in the initial sandbox:

- `↑ / ↓`: pitch
- `A / D`: roll
- `Q / E`: yaw
- `Space`: thrust
- `RESET`: restore the aircraft pose

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
