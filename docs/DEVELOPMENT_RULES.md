# Development Rules

## Source-of-truth rules

1. `main` must build and pass tests.
2. Do not put generated `dist/` files in Git.
3. Physics uses a fixed timestep; do not call `world.step()` from an unconstrained render delta.
4. Input is normalized before it reaches simulation code.
5. Physics state is authoritative; Three.js mirrors it.
6. Keep mission rules independent from rendering where practical.
7. Prefer small deterministic functions for flight-model math and test them directly.
8. Avoid hidden singletons. Ownership and lifecycle should be explicit.
9. Dispose WebGL/event resources when adding scene transitions or hot-reloadable subsystems.
10. Do not copy Nintendo code, ROM data, textures, music, level geometry, trademarks-as-branding, or ripped game assets into this repository.

## Change workflow

- Make one coherent change per branch/PR.
- Add or update tests when simulation behavior changes.
- Run `npm run check` before merge.
- Update `docs/ARCHITECTURE.md` when a boundary or core dependency changes.
- Record non-obvious implementation decisions in code comments or architecture docs; do not rely on chat history.

## Definition of done

A change is done when:

- typecheck passes;
- tests pass;
- production build succeeds;
- relevant docs are updated;
- GitHub Pages still resolves assets under `/pilotwings-modern/`.
