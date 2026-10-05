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
      verticalSpeed: -2
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 }
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('landing-speed');
  });

  it('rejects an excessive landing attitude', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      pitch: 0.3,
      verticalSpeed: -2
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 }
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('landing-attitude');
  });

  it('rejects a hard landing', () => {
    const previous = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 300, y: 1.1, z: 0 },
      speed: 20,
      verticalSpeed: -8
    };
    const current = {
      ...previous,
      onGround: true,
      position: { x: 301, y: RUNWAY_GROUND_Y, z: 0 }
    };

    expect(evaluateFlightSafety(previous, current).crashReason).toBe('hard-landing');
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
