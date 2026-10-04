import { describe, expect, it, vi } from 'vitest';
import { advanceFixedStep } from '../src/core/fixedStep';

describe('advanceFixedStep', () => {
  it('runs a stable 60 Hz simulation independently from render delta', () => {
    const step = vi.fn();
    const result = advanceFixedStep(0, 1 / 30, step);

    expect(step).toHaveBeenCalledTimes(2);
    expect(result.steps).toBe(2);
    expect(result.accumulator).toBeCloseTo(0, 10);
    expect(result.alpha).toBeCloseTo(0, 10);
  });

  it('clamps a long frame to avoid a spiral of death', () => {
    const step = vi.fn();
    const result = advanceFixedStep(0, 3, step, {
      maxFrameDeltaSeconds: 0.1,
      maxSubSteps: 8
    });

    expect(result.steps).toBe(6);
    expect(step).toHaveBeenCalledTimes(6);
  });

  it('rejects invalid fixed delta values', () => {
    expect(() =>
      advanceFixedStep(0, 0.016, () => undefined, { fixedDeltaSeconds: 0 })
    ).toThrow(RangeError);
  });
});
