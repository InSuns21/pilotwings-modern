export interface FlightInput {
  readonly pitch: number;
  readonly roll: number;
  readonly yaw: number;
  readonly throttle: number;
  readonly brake: number;
}

export const NEUTRAL_FLIGHT_INPUT: FlightInput = {
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0,
  brake: 0
};

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function combineFlightInputs(...inputs: readonly FlightInput[]): FlightInput {
  return inputs.reduce<FlightInput>(
    (combined, input) => ({
      pitch: clampAxis(combined.pitch + input.pitch),
      roll: clampAxis(combined.roll + input.roll),
      yaw: clampAxis(combined.yaw + input.yaw),
      throttle: Math.max(combined.throttle, clampUnit(input.throttle)),
      brake: Math.max(combined.brake, clampUnit(input.brake))
    }),
    NEUTRAL_FLIGHT_INPUT
  );
}
