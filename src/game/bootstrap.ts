import { advanceFixedStep } from '../core/fixedStep';
import {
  RUNWAY_GROUND_Y,
  flightPathDegrees,
  headingDegrees,
  pitchDegrees,
  type FlightState
} from '../flight/ArcadeFlightModel';
import { combineFlightInputs } from '../input/FlightInput';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRenderer } from '../render/SceneRenderer';
import {
  SAFE_FLIGHT,
  evaluateFlightSafety,
  type FlightSafetyState
} from './FlightSafety';
import {
  TRAINING_RINGS,
  createTrainingMission,
  failTrainingMission,
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
          <span>PITCH <b data-pitch>0</b>°</span>
          <span>PATH <b data-flight-path>0</b>°</span>
          <span>V/S <b data-vertical-speed>0.0</b> m/s</span>
          <span>RING <b data-rings>0 / 3</b></span>
        </div>

        <div class="flight-warning" data-flight-warning hidden></div>

        <div class="mission-message" data-mission-message>
          THRUSTで加速し、機首を上げて離陸
        </div>

        <span class="keyboard-help">
          ↑↓ pitch · A/D roll · Q/E yaw · Space thrust · Shift brake
        </span>
        <span class="touch-help">
          左スティック: pitch / roll · 右: yaw / thrust / brake
        </span>

        <button type="button" data-reset>RESTART MISSION</button>
      </aside>

      <div class="flight-reticle" aria-hidden="true">
        <span class="reticle-wing reticle-wing-left"></span>
        <span class="reticle-dot"></span>
        <span class="reticle-wing reticle-wing-right"></span>
      </div>

      <div class="camera-note" aria-hidden="true">CAMERA: LEVEL CHASE · FORWARD ↑</div>

      <div class="game-over-panel" data-game-over hidden>
        <div class="game-over-card">
          <span class="game-over-kicker">FLIGHT TERMINATED</span>
          <strong>GAME OVER</strong>
          <p data-crash-message>CRASH</p>
          <button type="button" data-game-over-restart>RETRY</button>
        </div>
      </div>

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
          <button
            class="touch-control-button touch-brake"
            type="button"
            data-touch-brake
            aria-label="Airbrake and wheel brake"
          >
            BRAKE
          </button>
        </div>
      </div>
    </div>
  `;

  const viewport = root.querySelector<HTMLElement>('[data-viewport]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
  const gameOverRestart = root.querySelector<HTMLButtonElement>('[data-game-over-restart]');
  const touchControls = root.querySelector<HTMLElement>('[data-touch-controls]');
  const speedElement = root.querySelector<HTMLElement>('[data-speed]');
  const altitudeElement = root.querySelector<HTMLElement>('[data-altitude]');
  const headingElement = root.querySelector<HTMLElement>('[data-heading]');
  const pitchElement = root.querySelector<HTMLElement>('[data-pitch]');
  const flightPathElement = root.querySelector<HTMLElement>('[data-flight-path]');
  const verticalSpeedElement = root.querySelector<HTMLElement>('[data-vertical-speed]');
  const ringsElement = root.querySelector<HTMLElement>('[data-rings]');
  const phaseElement = root.querySelector<HTMLElement>('[data-phase]');
  const warningElement = root.querySelector<HTMLElement>('[data-flight-warning]');
  const messageElement = root.querySelector<HTMLElement>('[data-mission-message]');
  const gameOverPanel = root.querySelector<HTMLElement>('[data-game-over]');
  const crashMessageElement = root.querySelector<HTMLElement>('[data-crash-message]');

  if (
    !viewport ||
    !resetButton ||
    !gameOverRestart ||
    !touchControls ||
    !speedElement ||
    !altitudeElement ||
    !headingElement ||
    !pitchElement ||
    !flightPathElement ||
    !verticalSpeedElement ||
    !ringsElement ||
    !phaseElement ||
    !warningElement ||
    !messageElement ||
    !gameOverPanel ||
    !crashMessageElement
  ) {
    throw new Error('Game shell did not initialize');
  }

  const keyboardInput = new KeyboardInput();
  const touchInput = new TouchInput(touchControls);
  const physics = await PhysicsWorld.create();
  const renderer = new SceneRenderer(viewport);

  let mission = createTrainingMission();
  let safety: FlightSafetyState = SAFE_FLIGHT;
  let gameOver = false;
  renderer.setMissionProgress(mission);

  const updateHud = (
    state: FlightState,
    progress: TrainingMissionProgress,
    currentSafety: FlightSafetyState
  ): void => {
    speedElement.textContent = Math.round(state.speed * 3.6).toString();
    altitudeElement.textContent = Math.max(
      0,
      Math.round(state.position.y - RUNWAY_GROUND_Y)
    ).toString();
    headingElement.textContent = Math.round(headingDegrees(state))
      .toString()
      .padStart(3, '0');
    pitchElement.textContent = Math.round(pitchDegrees(state)).toString();
    flightPathElement.textContent = Math.round(flightPathDegrees(state)).toString();
    verticalSpeedElement.textContent = state.verticalSpeed.toFixed(1);
    ringsElement.textContent = `${progress.nextRingIndex} / ${TRAINING_RINGS.length}`;
    phaseElement.textContent = progress.phase.toUpperCase();
    phaseElement.dataset.phase = progress.phase;
    messageElement.textContent = progress.message;

    warningElement.hidden = currentSafety.warning === null;
    warningElement.textContent = currentSafety.warning ?? '';
    warningElement.dataset.level = state.stalled ? 'stall' : 'warning';
  };

  const restartMission = (): void => {
    physics.resetAircraft();
    renderer.resetCrashEffect();
    mission = createTrainingMission();
    safety = SAFE_FLIGHT;
    gameOver = false;
    gameOverPanel.hidden = true;
    renderer.setMissionProgress(mission);
    updateHud(physics.getAircraftState(), mission, safety);
  };

  resetButton.addEventListener('click', restartMission);
  gameOverRestart.addEventListener('click', restartMission);

  updateHud(physics.getAircraftState(), mission, safety);

  let previousTime = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;

    const result = advanceFixedStep(accumulator, deltaSeconds, () => {
      if (gameOver) {
        return;
      }

      const previousState = physics.getAircraftState();
      physics.step(combineFlightInputs(keyboardInput.sample(), touchInput.sample()));
      const state = physics.getAircraftState();
      safety = evaluateFlightSafety(previousState, state);

      if (safety.crashReason) {
        gameOver = true;
        const crashMessage = safety.crashMessage ?? 'CRASH';
        mission = failTrainingMission(mission, crashMessage);
        renderer.setMissionProgress(mission);
        renderer.triggerCrash();
        crashMessageElement.textContent = crashMessage;
        gameOverPanel.hidden = false;
        return;
      }

      const nextMission = updateTrainingMission(mission, state);
      if (nextMission !== mission) {
        mission = nextMission;
        renderer.setMissionProgress(mission);
      }
    });
    accumulator = result.accumulator;

    const state = physics.getAircraftState();
    renderer.syncAircraft(state);
    renderer.render();
    updateHud(state, mission, safety);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
