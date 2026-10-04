export interface FixedStepResult {
  readonly steps: number;
  readonly alpha: number;
  readonly accumulator: number;
}

export interface FixedStepOptions {
  readonly fixedDeltaSeconds?: number;
  readonly maxFrameDeltaSeconds?: number;
  readonly maxSubSteps?: number;
}

export function advanceFixedStep(
  accumulator: number,
  frameDeltaSeconds: number,
  step: (fixedDeltaSeconds: number) => void,
  options: FixedStepOptions = {}
): FixedStepResult {
  const fixedDeltaSeconds = options.fixedDeltaSeconds ?? 1 / 60;
  const maxFrameDeltaSeconds = options.maxFrameDeltaSeconds ?? 0.1;
  const maxSubSteps = options.maxSubSteps ?? 8;

  if (fixedDeltaSeconds <= 0) {
    throw new RangeError('fixedDeltaSeconds must be positive');
  }
  if (maxFrameDeltaSeconds <= 0) {
    throw new RangeError('maxFrameDeltaSeconds must be positive');
  }
  if (!Number.isInteger(maxSubSteps) || maxSubSteps <= 0) {
    throw new RangeError('maxSubSteps must be a positive integer');
  }

  let nextAccumulator =
    accumulator + Math.min(Math.max(frameDeltaSeconds, 0), maxFrameDeltaSeconds);
  let steps = 0;

  while (nextAccumulator >= fixedDeltaSeconds && steps < maxSubSteps) {
    step(fixedDeltaSeconds);
    nextAccumulator -= fixedDeltaSeconds;
    steps += 1;
  }

  if (steps === maxSubSteps && nextAccumulator >= fixedDeltaSeconds) {
    nextAccumulator %= fixedDeltaSeconds;
  }

  return {
    steps,
    alpha: nextAccumulator / fixedDeltaSeconds,
    accumulator: nextAccumulator
  };
}
