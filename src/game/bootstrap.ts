import { advanceFixedStep } from '../core/fixedStep';
import { combineFlightInputs } from '../input/FlightInput';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRenderer } from '../render/SceneRenderer';

export async function bootstrapGame(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="game-shell">
      <div class="viewport" data-viewport></div>

      <aside class="hud">
        <strong>PILOTWINGS MODERN</strong>
        <span class="keyboard-help">↑↓ pitch · A/D roll · Q/E yaw · Space thrust</span>
        <span class="touch-help">左スティック: pitch / roll · 右ボタン: yaw / thrust</span>
        <button type="button" data-reset>RESET</button>
      </aside>

      <div class="touch-controls" data-touch-controls aria-label="Touch flight controls">
        <div
          class="touch-stick"
          data-touch-stick
          role="application"
          aria-label="Pitch and roll stick"
        >
          <div class="touch-stick-ring"></div>
          <div class="touch-stick-knob" data-touch-knob></div>
          <span class="touch-stick-label">PITCH / ROLL</span>
        </div>

        <div class="touch-actions">
          <button
            class="touch-control-button touch-yaw"
            type="button"
            data-touch-yaw-left
            aria-label="Yaw left"
          >
            YAW ◀
          </button>
          <button
            class="touch-control-button touch-yaw"
            type="button"
            data-touch-yaw-right
            aria-label="Yaw right"
          >
            YAW ▶
          </button>
          <button
            class="touch-control-button touch-thrust"
            type="button"
            data-touch-thrust
            aria-label="Thrust"
          >
            THRUST
          </button>
        </div>
      </div>
    </div>
  `;

  const viewport = root.querySelector<HTMLElement>('[data-viewport]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
  const touchControls = root.querySelector<HTMLElement>('[data-touch-controls]');

  if (!viewport || !resetButton || !touchControls) {
    throw new Error('Game shell did not initialize');
  }

  const keyboardInput = new KeyboardInput();
  const touchInput = new TouchInput(touchControls);
  const physics = await PhysicsWorld.create();
  const renderer = new SceneRenderer(viewport);

  resetButton.addEventListener('click', () => physics.resetAircraft());

  let previousTime = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;

    const result = advanceFixedStep(accumulator, deltaSeconds, () => {
      physics.step(combineFlightInputs(keyboardInput.sample(), touchInput.sample()));
    });
    accumulator = result.accumulator;

    renderer.syncAircraft(physics.getAircraftPose());
    renderer.render();
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
