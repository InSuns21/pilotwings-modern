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
import type { GameSelection } from './GameCatalog';
import type { TrainingMissionProgress } from './TrainingMission';
import { createTaskRuntime } from './TaskRuntime';
import { createWorldRuntime } from '../world/WorldRuntime';

export interface FlightSession {
  dispose(): void;
}

export async function createFlightSession(
  root: HTMLElement,
  selection: GameSelection,
  onExitToTitle: () => void
): Promise<FlightSession> {
  const taskRuntime = createTaskRuntime(selection.task.id);

  root.innerHTML = `
    <div class="game-shell">
      <div class="viewport" data-viewport></div>

      <aside class="hud">
        <div class="hud-title-row">
          <strong>PILOTWINGS MODERN</strong>
          <span class="mission-phase" data-phase>TAKEOFF</span>
        </div>

        <div class="session-loadout">
          <span>WORLD <b>${selection.world.name}</b></span>
          ${selection.world.id === 'matsumoto-real'
            ? `<span>RELIEF <b>${selection.worldSettings.heightExaggeration.toFixed(2)}×</b></span>`
            : ''}
          <span>AIRCRAFT <b>${selection.aircraft.name}</b></span>
          <span>TASK <b>${selection.task.name}</b></span>
        </div>

        <div class="telemetry">
          <span>SPD <b data-speed>0</b> km/h</span>
          <span>ALT <b data-altitude>0</b> m</span>
          <span>HDG <b data-heading>000</b>°</span>
          <span>PITCH <b data-pitch>0</b>°</span>
          <span>PATH <b data-flight-path>0</b>°</span>
          <span>V/S <b data-vertical-speed>0.0</b> m/s</span>
          <span>RING <b data-rings>0 / ${taskRuntime.ringCount}</b></span>
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

        <div class="hud-actions">
          <button type="button" data-reset>RESTART MISSION</button>
          <button type="button" data-exit-title>TITLE</button>
        </div>
      </aside>

      <div class="flight-reticle" aria-hidden="true">
        <span class="reticle-wing reticle-wing-left"></span>
        <span class="reticle-dot"></span>
        <span class="reticle-wing reticle-wing-right"></span>
      </div>

      <div class="camera-note" aria-hidden="true">CAMERA: LEVEL CHASE · FORWARD ↑</div>
      <div class="world-attribution" data-world-attribution hidden></div>

      <div class="game-over-panel" data-game-over hidden>
        <div class="game-over-card">
          <span class="game-over-kicker">FLIGHT TERMINATED</span>
          <strong>GAME OVER</strong>
          <p data-crash-message>CRASH</p>
          <div class="game-over-actions">
            <button type="button" data-game-over-restart>RETRY</button>
            <button type="button" data-game-over-title>TITLE</button>
          </div>
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
  const exitButton = root.querySelector<HTMLButtonElement>('[data-exit-title]');
  const gameOverRestart = root.querySelector<HTMLButtonElement>('[data-game-over-restart]');
  const gameOverTitle = root.querySelector<HTMLButtonElement>('[data-game-over-title]');
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
  const attributionElement = root.querySelector<HTMLElement>('[data-world-attribution]');

  if (
    !viewport ||
    !resetButton ||
    !exitButton ||
    !gameOverRestart ||
    !gameOverTitle ||
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
    !crashMessageElement ||
    !attributionElement
  ) {
    throw new Error('Game shell did not initialize');
  }

  const keyboardInput = new KeyboardInput();
  const touchInput = new TouchInput(touchControls);
  const [physics, worldRuntime] = await Promise.all([
    PhysicsWorld.create(),
    createWorldRuntime(selection.world.id, selection.worldSettings)
  ]);
  const renderer = new SceneRenderer(viewport, selection, worldRuntime);

  if (worldRuntime.attribution) {
    attributionElement.textContent = worldRuntime.attribution;
    attributionElement.hidden = false;
  }

  let mission = taskRuntime.createProgress();
  let safety: FlightSafetyState = SAFE_FLIGHT;
  let gameOver = false;
  let disposed = false;
  let animationFrameId = 0;
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
    ringsElement.textContent = `${progress.nextRingIndex} / ${taskRuntime.ringCount}`;
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
    mission = taskRuntime.createProgress();
    safety = SAFE_FLIGHT;
    gameOver = false;
    gameOverPanel.hidden = true;
    renderer.setMissionProgress(mission);
    updateHud(physics.getAircraftState(), mission, safety);
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    cancelAnimationFrame(animationFrameId);
    resetButton.removeEventListener('click', restartMission);
    gameOverRestart.removeEventListener('click', restartMission);
    exitButton.removeEventListener('click', exitToTitle);
    gameOverTitle.removeEventListener('click', exitToTitle);
    keyboardInput.dispose();
    touchInput.dispose();
    renderer.dispose();
  };

  const exitToTitle = (): void => {
    dispose();
    onExitToTitle();
  };

  resetButton.addEventListener('click', restartMission);
  gameOverRestart.addEventListener('click', restartMission);
  exitButton.addEventListener('click', exitToTitle);
  gameOverTitle.addEventListener('click', exitToTitle);

  updateHud(physics.getAircraftState(), mission, safety);

  let previousTime = performance.now();
  let accumulator = 0;

  const frame = (now: number): void => {
    if (disposed) {
      return;
    }

    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;

    const result = advanceFixedStep(accumulator, deltaSeconds, () => {
      if (gameOver) {
        return;
      }

      const previousState = physics.getAircraftState();
      physics.step(combineFlightInputs(keyboardInput.sample(), touchInput.sample()));
      const state = physics.getAircraftState();
      safety = evaluateFlightSafety(previousState, state, worldRuntime);

      if (safety.crashReason) {
        gameOver = true;
        const crashMessage = safety.crashMessage ?? 'CRASH';
        mission = taskRuntime.failProgress(mission, crashMessage);
        renderer.setMissionProgress(mission);
        renderer.triggerCrash();
        crashMessageElement.textContent = crashMessage;
        gameOverPanel.hidden = false;
        return;
      }

      const nextMission = taskRuntime.updateProgress(mission, state);
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
    animationFrameId = requestAnimationFrame(frame);
  };

  animationFrameId = requestAnimationFrame(frame);

  return { dispose };
}
