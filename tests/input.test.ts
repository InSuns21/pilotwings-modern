import { describe, expect, it } from 'vitest';
import { combineFlightInputs } from '../src/input/FlightInput';
import { normalizeTouchStick } from '../src/input/TouchInput';

describe('combineFlightInputs', () => {
  it('combines keyboard and touch axes while clamping the result', () => {
    expect(
      combineFlightInputs(
        { pitch: 0.8, roll: -0.4, yaw: 0, throttle: 0 },
        { pitch: 0.6, roll: 0.2, yaw: -1, throttle: 1 }
      )
    ).toEqual({
      pitch: 1,
      roll: -0.2,
      yaw: -1,
      throttle: 1
    });
  });

  it('keeps the strongest throttle request', () => {
    expect(
      combineFlightInputs(
        { pitch: 0, roll: 0, yaw: 0, throttle: 0.25 },
        { pitch: 0, roll: 0, yaw: 0, throttle: 0.8 }
      ).throttle
    ).toBe(0.8);
  });
});

describe('normalizeTouchStick', () => {
  it('returns a normalized vector inside the stick radius', () => {
    expect(normalizeTouchStick(100, 100, 125, 75, 50)).toEqual({
      x: 0.5,
      y: -0.5
    });
  });

  it('clamps pointer motion outside the stick radius', () => {
    const value = normalizeTouchStick(0, 0, 100, 0, 50);

    expect(value.x).toBe(1);
    expect(value.y).toBe(0);
  });

  it('applies a small center dead zone', () => {
    expect(normalizeTouchStick(0, 0, 2, 2, 50)).toEqual({ x: 0, y: 0 });
  });
});
