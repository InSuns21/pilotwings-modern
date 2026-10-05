import { describe, expect, it } from 'vitest';
import {
  GLIDE_TRIM_SPEED,
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
    expect(next.flightPathAngle).toBe(0);
  });

  it('lifts off with a positive flight path after takeoff speed', () => {
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
    expect(state.flightPathAngle).toBeGreaterThan(0);
  });

  it('auto-levels roll after the player releases the stick', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 200, z: 0 },
      flightPathAngle: -0.04,
      roll: 0.5
    };

    const initialRoll = state.roll;
    for (let i = 0; i < 20; i += 1) {
      state = stepArcadeFlight(state, neutral, 1 / 60);
    }

    expect(Math.abs(state.roll)).toBeLessThan(Math.abs(initialRoll));
  });

  it('glides toward a stable speed instead of decaying endlessly with thrust off', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 300, z: 0 },
      flightPathAngle: 0
    };

    const initialAltitude = state.position.y;

    for (let i = 0; i < 30 * 60; i += 1) {
      state = stepArcadeFlight(state, neutral, 1 / 60);
    }

    expect(state.stalled).toBe(false);
    expect(state.speed).toBeGreaterThan(GLIDE_TRIM_SPEED - 2);
    expect(state.speed).toBeLessThan(GLIDE_TRIM_SPEED + 2);
    expect(state.flightPathAngle).toBeLessThan(0);
    expect(state.position.y).toBeLessThan(initialAltitude);
  });

  it('trades altitude for airspeed when the flight path is pushed down', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: GLIDE_TRIM_SPEED,
      position: { x: 0, y: 200, z: 0 },
      flightPathAngle: -0.07
    };

    const initialAltitude = state.position.y;

    for (let i = 0; i < 3 * 60; i += 1) {
      state = stepArcadeFlight(
        state,
        { ...neutral, pitch: -0.5 },
        1 / 60
      );
    }

    expect(state.speed).toBeGreaterThan(GLIDE_TRIM_SPEED + 2);
    expect(state.position.y).toBeLessThan(initialAltitude);
    expect(state.flightPathAngle).toBeLessThan(0);
  });

  it('makes a moderate cruise-speed dive produce a visible airspeed gain', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 200, z: 0 },
      flightPathAngle: -0.07
    };

    const initialSpeed = state.speed;
    const initialAltitude = state.position.y;

    for (let i = 0; i < 3 * 60; i += 1) {
      state = stepArcadeFlight(
        state,
        { ...neutral, pitch: -0.2 },
        1 / 60
      );
    }

    expect(state.speed).toBeGreaterThan(initialSpeed + 1);
    expect(state.position.y).toBeLessThan(initialAltitude);
    expect(state.flightPathAngle).toBeLessThan(-0.1);
  });

  it('trades airspeed for altitude when a climb is established', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 25,
      position: { x: 0, y: 200, z: 0 },
      flightPathAngle: -0.04
    };

    const initialSpeed = state.speed;
    const initialAltitude = state.position.y;

    for (let i = 0; i < 2 * 60; i += 1) {
      state = stepArcadeFlight(
        state,
        { ...neutral, pitch: 0.5 },
        1 / 60
      );
    }

    expect(state.speed).toBeLessThan(initialSpeed);
    expect(state.position.y).toBeGreaterThan(initialAltitude);
    expect(state.flightPathAngle).toBeGreaterThan(0);
  });

  it('allows a landing flare: nose up while the aircraft is still descending', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 20,
      position: { x: 300, y: 8, z: 0 },
      pitch: 0,
      flightPathAngle: -5 * (Math.PI / 180),
      verticalSpeed: -1.7
    };

    const initialAltitude = state.position.y;

    for (let i = 0; i < 30; i += 1) {
      state = stepArcadeFlight(
        state,
        { ...neutral, pitch: 0.4 },
        1 / 60
      );
    }

    expect(state.pitch).toBeGreaterThan(0);
    expect(state.flightPathAngle).toBeLessThan(0);
    expect(state.verticalSpeed).toBeLessThan(0);
    expect(state.position.y).toBeLessThan(initialAltitude);
  });

  it('treats 50 km/h as a clear stall and develops a steep descending path', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 50 / 3.6,
      position: { x: 0, y: 100, z: 0 }
    };

    expect(state.speed).toBeLessThan(STALL_SPEED);

    for (let i = 0; i < 60; i += 1) {
      state = stepArcadeFlight(state, neutral, 1 / 60);
    }

    expect(state.stalled).toBe(true);
    expect(state.flightPathAngle).toBeLessThan(-0.25);
    expect(state.verticalSpeed).toBeLessThan(-4);
  });

  it('keeps the stall latched until speed and angle of attack are recovered', () => {
    let state = {
      ...createInitialFlightState(),
      onGround: false,
      stalled: true,
      speed: STALL_SPEED - 1,
      pitch: 0.2,
      flightPathAngle: 0,
      position: { x: 0, y: 160, z: 0 }
    };

    state = stepArcadeFlight(
      state,
      { pitch: -1, roll: 0, yaw: 0, throttle: 1, brake: 0 },
      1 / 60
    );
    expect(state.stalled).toBe(true);

    for (let i = 0; i < 10 * 60; i += 1) {
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

  it('airbrake decelerates much faster than normal glide', () => {
    const state = {
      ...createInitialFlightState(),
      onGround: false,
      speed: 30,
      position: { x: 0, y: 100, z: 0 },
      flightPathAngle: -0.04
    };

    let gliding = state;
    let braking = state;

    for (let i = 0; i < 60; i += 1) {
      gliding = stepArcadeFlight(gliding, neutral, 1 / 60);
      braking = stepArcadeFlight(braking, { ...neutral, brake: 1 }, 1 / 60);
    }

    expect(braking.speed).toBeLessThan(gliding.speed - 4);
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
      position: { x: 0, y: 100, z: 0 },
      flightPathAngle: -0.04
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
