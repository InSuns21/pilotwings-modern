import { describe, expect, it } from 'vitest';
import {
  RUNWAY_GROUND_Y,
  createInitialFlightState
} from '../src/flight/ArcadeFlightModel';
import {
  SAFE_LANDING_MAX_SPEED,
  evaluateFlightSafety
} from '../src/game/FlightSafety';

describe('flight safety', () => {
  it('warns on a stall without immediately ending the flight', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 0, y: 20, z: 0 },
      speed: 11,
      stalled: true
    };

    const safety = evaluateFlightSafety(previous, previous);

    expect(safety.warning).toContain('STALL');
    expect(safety.crashReason).toBeNull();
  });

  it('rejects a high-speed landing', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: SAFE_LANDING_MAX_SPEED + 2,
      flightPathAngle: -0.05,
      verticalSpeed: -2
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 },
      flightPathAngle: 0,
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('landing-speed');
  });

  it('accepts a moderate nose-up flare while still descending', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      pitch: 14 * (Math.PI / 180),
      flightPathAngle: -3 * (Math.PI / 180),
      verticalSpeed: -1.1
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 },
      flightPathAngle: 0,
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBeNull();
  });

  it('rejects excessive nose-up attitude on touchdown', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      pitch: 17 * (Math.PI / 180),
      flightPathAngle: -2 * (Math.PI / 180),
      verticalSpeed: -1
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 },
      flightPathAngle: 0,
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('landing-attitude');
  });

  it('rejects a much smaller nose-down touchdown angle', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      pitch: -7 * (Math.PI / 180),
      flightPathAngle: -4 * (Math.PI / 180),
      verticalSpeed: -1.4
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 },
      flightPathAngle: 0,
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('landing-attitude');
  });

  it('rejects excessive bank on touchdown', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      pitch: 8 * (Math.PI / 180),
      flightPathAngle: -3 * (Math.PI / 180),
      roll: 15 * (Math.PI / 180),
      verticalSpeed: -1.2
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 },
      flightPathAngle: 0,
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('landing-attitude');
  });

  it('rejects a hard landing even when flare attitude is acceptable', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      pitch: 10 * (Math.PI / 180),
      flightPathAngle: -12 * (Math.PI / 180),
      verticalSpeed: -8
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 },
      flightPathAngle: 0,
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('hard-landing');
  });

  it('reports water impact outside the island coastline', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 900, y: 1.1, z: 0 },
      speed: 18,
      verticalSpeed: -2
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 900, y: RUNWAY_GROUND_Y, z: 0 },
      verticalSpeed: 0
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('water');
    expect(evaluateFlightSafety(previous, current).crashMessage).toContain('WATER');
  });


  it('crashes into mountain terrain', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 50, y: 30, z: -180 },
      speed: 25
    };

    expect(evaluateFlightSafety(previous, previous).crashReason).toBe('terrain');
  });
});
