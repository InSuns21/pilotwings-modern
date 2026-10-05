import { describe, expect, it } from 'vitest';
import {
  RUNWAY_GROUND_Y,
  STALL_RECOVERY_SPEED,
  STALL_SPEED,
  createInitialFlightState,
  stepArcadeFlight
} from '../src/flight/ArcadeFlightModel';

const neutral = { pitch: 0, roll: 0, yaw: 0, throttle: 0, brake: 0 };

describe('arcade flight model', () => {
  it('stays on the runway until takeoff speed and positive pitch are available', () => {
    const state = {
      ...createInitialFlightState(),
      speed: 17,
      pitch: 0
    };

    const next = stepArcadeFlight(
      state,
      { pitch: 1, roll: 0, yaw: 0, throttle: 1, brake: 0 },
      1 / 60
    );

    expect(next.onGround).toBe(true);
    expect(next.position.y).toBe(RUNWAY_GROUND_Y);
  });

  it('lifts off predictably above takeoff speed', () => {
    let state = {
      ...createInitialFlightState(),
      speed: 20
    };

    for (let i = 0; i < 20; i += 1) {
      state = stepArcadeFlight(
        state,
        { pitch: 1, roll: 0, yaw: 0, throttle: 1, brake: 0 },
        1 / 60
      );
    }

    expect(state.onGround).toBe(false);
    expect(state.position.y).toBeGreaterThan(RUNWAY_GROUND_Y);
  });

  it('auto-levels roll after the player releases the stick', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 20, z: 0 },
      roll: 0.5
    };

    const initialRoll = state.roll;
    for (let i = 0; i < 20; i += 1) {
      state = stepArcadeFlight(state, neutral, 1 / 60);
    }

    expect(Math.abs(state.roll)).toBeLessThan(Math.abs(initialRoll));
  });

  it('treats 50 km/h as a clear stall instead of the edge of the envelope', () => {
    const fiftyKph = 50 / 3.6;
    expect(fiftyKph).toBeLessThan(STALL_SPEED);

    const state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: fiftyKph,
      position: { x: 0, y: 30, z: 0 }
    };

    const next = stepArcadeFlight(state, neutral, 1 / 60);

    expect(next.stalled).toBe(true);
    expect(next.verticalSpeed).toBeLessThan(-6);
  });

  it('keeps the stall latched until speed and pitch are recovered', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      stalled: true,
      speed: STALL_SPEED - 1,
      pitch: 0.2,
      position: { x: 0, y: 80, z: 0 }
    };

    state = stepArcadeFlight(
      state,
      { pitch: -1, roll: 0, yaw: 0, throttle: 1, brake: 0 },
      1 / 60
    );
    expect(state.stalled).toBe(true);

    for (let i = 0; i < 180; i += 1) {
      state = stepArcadeFlight(
        state,
        { pitch: -1, roll: 0, yaw: 0, throttle: 1, brake: 0 },
        1 / 60
      );
      if (!state.stalled) {
        break;
      }
    }

    expect(state.speed).toBeGreaterThanOrEqual(STALL_RECOVERY_SPEED);
    expect(state.stalled).toBe(false);
  });

  it('airbrake decelerates much faster than coasting', () => {
    const state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 40, z: 0 }
    };

    const coasting = stepArcadeFlight(state, neutral, 1);
    const braking = stepArcadeFlight(
      state,
      { ...neutral, brake: 1 },
      1
    );

    expect(braking.speed).toBeLessThan(coasting.speed);
  });

  it('ground brake can stop the aircraft quickly after touchdown', () => {
    let state = {
      ...createInitialFlightState(),
      speed: 20
    };

    for (let i = 0; i < 90; i += 1) {
      state = stepArcadeFlight(
        state,
        { ...neutral, brake: 1 },
        1 / 60
      );
    }

    expect(state.speed).toBeLessThan(1);
  });

  it('yaw input changes heading smoothly without angular oscillation state', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 20, z: 0 }
    };

    const headings: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      state = stepArcadeFlight(
        state,
        { pitch: 0, roll: 0, yaw: 1, throttle: 0, brake: 0 },
        1 / 60
      );
      headings.push(state.heading);
    }

    expect(headings.every((value, index) => index === 0 || value > headings[index - 1]!)).toBe(
      true
    );
  });
});
