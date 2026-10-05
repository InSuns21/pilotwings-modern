import { advanceFixedStep } from '../core/fixedStep';
import {
  RUNWAY_GROUND_Y,
  headingDegrees,
  type FlightState
} from '../flight/ArcadeFlightModel';
import { combineFlightInputs } from '../input/FlightInput';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRenderer } from '../render/SceneRenderer';
import {
  TRAINING_RINGS,
  createTrainingMission,
  updateTrainingMission,
  type TrainingMissionProgress
} from './TrainingMission';

export async function bootstrapGame(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="game-shell">
      <div class="viewport" data-viewport></div>

      <aside class="hud">
        <div class="hud-title-row">
          <strong>PILOTWINGS MODERN</strong>
          <span class="mission-phase" data-phase>TAKEOFF</span>
        </div>

        <div class="telemetry">
          <span>SPD <b data-speed>0</b> km/h</span>
          <span>ALT <b data-altitude>0</b> m</span>
          <span>HDG <b data-heading>000</b>°</span>
          <span>RING <b data-rings>0 / 3</b></span>
        </div>

        <div class="mission-message" data-mission-message>
          THRUSTで加速し、機首を上げて離陸
        </div>

        <span class="keyboard-help">
          ↑↓ pitch · A/D roll · Q/E yaw · Space thrust
        </span>
        <span class="touch-help">
          左スティック: pitch / roll · 右: yaw / thrust
        </span>

        <button type="button" data-reset>RESTART MISSION</button>
      </aside>

      <div class="flight-reticle" aria-hidden="true">
        <span class="reticle-wing reticle-wing-left"></span>
        <span class="reticle-dot"></span>
        <span class="reticle-wing reticle-wing-right"></span>
      </div>

      <div class="camera-note" aria-hidden="true">CAMERA: LEVEL CHASE · FORWARD ↑</div>

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
  const speedElement = root.querySelector<HTMLElement>('[data-speed]');
  const altitudeElement = root.querySelector<HTMLElement>('[data-altitude]');
  const headingElement = root.querySelector<HTMLElement>('[data-heading]');
  const ringsElement = root.querySelector<HTMLElement>('[data-rings]');
  const phaseElement = root.querySelector<HTMLElement>('[data-phase]');
  const messageElement = root.querySelector<HTMLElement>('[data-mission-message]');

  if (
    !viewport ||
    !resetButton ||
    !touchControls ||
    !speedElement ||
    !altitudeElement ||
    !headingElement ||
    !ringsElement ||
    !phaseElement ||
    !messageElement
  ) {
    throw new Error('Game shell did not initialize');
  }

  const keyboardInput = new KeyboardInput();
  const touchInput = new TouchInput(touchControls);
  const physics = await PhysicsWorld.create();
  const renderer = new SceneRenderer(viewport);

  let mission = createTrainingMission();
  renderer.setMissionProgress(mission);

  const restartMission = (): void => {
    physics.resetAircraft();
    mission = createTrainingMission();
    renderer.setMissionProgress(mission);
    updateHud(physics.getAircraftState(), mission);
  };

  resetButton.addEventListener('click', restartMission);

  const updateHud = (
    state: FlightState,
    progress: TrainingMissionProgress
  ): void => {
    speedElement.textContent = Math.round(state.speed * 3.6).toString();
    altitudeElement.textContent = Math.max(
      0,
      Math.round(state.position.y - RUNWAY_GROUND_Y)
    ).toString();
    headingElement.textContent = Math.round(headingDegrees(state))
      .toString()
      .padStart(3, '0');
    ringsElement.textContent = `${progress.nextRingIndex} / ${TRAINING_RINGS.length}`;
    phaseElement.textContent = progress.phase.toUpperCase();
    phaseElement.dataset.phase = progress.phase;
    messageElement.textContent = progress.message;
  };

  updateHud(physics.getAircraftState(), mission);

  let previousTime = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;

    const result = advanceFixedStep(accumulator, deltaSeconds, () => {
      physics.step(combineFlightInputs(keyboardInput.sample(), touchInput.sample()));
      const nextMission = updateTrainingMission(mission, physics.getAircraftState());

      if (nextMission !== mission) {
        mission = nextMission;
        renderer.setMissionProgress(mission);
      }
    });
    accumulator = result.accumulator;

    const state = physics.getAircraftState();
    renderer.syncAircraft(state);
    renderer.render();
    updateHud(state, mission);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
