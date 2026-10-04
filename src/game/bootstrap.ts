import { advanceFixedStep } from '../core/fixedStep';
import { KeyboardInput } from '../input/KeyboardInput';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRenderer } from '../render/SceneRenderer';

export async function bootstrapGame(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="game-shell">
      <div class="viewport" data-viewport></div>
      <aside class="hud">
        <strong>PILOTWINGS MODERN</strong>
        <span>↑↓ pitch · A/D roll · Q/E yaw · Space thrust</span>
        <button type="button" data-reset>RESET</button>
      </aside>
    </div>
  `;

  const viewport = root.querySelector<HTMLElement>('[data-viewport]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
  if (!viewport || !resetButton) {
    throw new Error('Game shell did not initialize');
  }

  const input = new KeyboardInput();
  const physics = await PhysicsWorld.create();
  const renderer = new SceneRenderer(viewport);

  resetButton.addEventListener('click', () => physics.resetAircraft());

  let previousTime = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;

    const result = advanceFixedStep(accumulator, deltaSeconds, () => {
      physics.step(input.sample());
    });
    accumulator = result.accumulator;

    renderer.syncAircraft(physics.getAircraftPose());
    renderer.render();
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
