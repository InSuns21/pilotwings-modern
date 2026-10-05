import type { FlightInput } from '../input/FlightInput';

export interface Vector3State {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface QuaternionState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface FlightState {
  readonly position: Vector3State;
  readonly heading: number;
  readonly pitch: number;
  readonly roll: number;
  readonly speed: number;
  readonly verticalSpeed: number;
  readonly onGround: boolean;
  readonly stalled: boolean;
}

export const RUNWAY_GROUND_Y = 0.85;
export const TAKEOFF_SPEED = 18;
export const MAX_SPEED = 52;
export const STALL_SPEED = 16;
export const STALL_RECOVERY_SPEED = 18;
export const STALL_PITCH = 22 * (Math.PI / 180);
export const GLIDE_TRIM_SPEED = 22;

const DEG = Math.PI / 180;
const GRAVITY = 9.81;
const MAX_PITCH = 30 * DEG;
const MAX_ROLL = 38 * DEG;
const AIR_PITCH_RATE = 48 * DEG;
const STALL_PITCH_DOWN_RATE = 68 * DEG;
const AIR_ROLL_RATE = 78 * DEG;
const GROUND_YAW_RATE = 24 * DEG;
const DIRECT_YAW_RATE = 28 * DEG;
const BANK_TURN_RATE = 52 * DEG;
const STALL_RECOVERY_PITCH = 12 * DEG;
const HIGH_PITCH_STALL_MAX_SPEED = 30;
const GLIDE_TRIM_PITCH = -4 * DEG;
const PITCH_INPUT_DEAD_ZONE = 0.05;
const THRUST_ACCELERATION = 11;
const AIRBRAKE_DECELERATION = 8.5;
const GROUND_BRAKE_DECELERATION = 18;
const GROUND_COAST_DECELERATION = 5.5;
const STALL_EXTRA_DRAG = 1.2;
const STALL_EXTRA_SINK = 6;
const PARASITE_DRAG_COEFFICIENT =
  (GRAVITY * Math.sin(Math.abs(GLIDE_TRIM_PITCH))) /
  (GLIDE_TRIM_SPEED * GLIDE_TRIM_SPEED);

export function createInitialFlightState(): FlightState {
  return {
    position: { x: -175, y: RUNWAY_GROUND_Y, z: 0 },
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    verticalSpeed: 0,
    onGround: true,
    stalled: false
  };
}

export function stepArcadeFlight(
  state: FlightState,
  input: FlightInput,
  deltaSeconds: number
): FlightState {
  const dt = Math.max(0, Math.min(deltaSeconds, 0.05));
  const throttle = clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);
  const pitchInput = clamp(input.pitch, -1, 1);
  const rollInput = clamp(input.roll, -1, 1);
  const yawInput = clamp(input.yaw, -1, 1);

  const pitchTarget = state.onGround
    ? pitchInput * MAX_PITCH
    : Math.abs(pitchInput) > PITCH_INPUT_DEAD_ZONE
      ? pitchInput * MAX_PITCH
      : throttle > 0.001
        ? 0
        : GLIDE_TRIM_PITCH;
  const rollTarget = state.onGround ? 0 : rollInput * MAX_ROLL;

  let pitch = moveTowards(state.pitch, pitchTarget, AIR_PITCH_RATE * dt);
  let roll = moveTowards(state.roll, rollTarget, AIR_ROLL_RATE * dt);

  const enteringStall =
    !state.onGround &&
    (state.speed < STALL_SPEED ||
      (pitch > STALL_PITCH && state.speed < HIGH_PITCH_STALL_MAX_SPEED));
  const wasStalled = state.stalled;
  let stalled = !state.onGround && (wasStalled || enteringStall);

  if (stalled) {
    pitch = moveTowards(pitch, -11 * DEG, STALL_PITCH_DOWN_RATE * dt);
    roll = moveTowards(roll, 0, AIR_ROLL_RATE * 0.7 * dt);
  }

  let acceleration: number;
  if (state.onGround) {
    const driveAcceleration =
      throttle > 0.001 ? throttle * THRUST_ACCELERATION : -GROUND_COAST_DECELERATION;
    acceleration = driveAcceleration - brake * GROUND_BRAKE_DECELERATION;
  } else {
    const gravityAlongFlightPath = -GRAVITY * Math.sin(pitch);
    const parasiteDrag = PARASITE_DRAG_COEFFICIENT * state.speed * state.speed;
    const stallDrag = stalled ? STALL_EXTRA_DRAG : 0;

    acceleration =
      throttle * THRUST_ACCELERATION +
      gravityAlongFlightPath -
      parasiteDrag -
      brake * AIRBRAKE_DECELERATION -
      stallDrag;
  }

  const speed = clamp(state.speed + acceleration * dt, 0, MAX_SPEED);

  if (
    wasStalled &&
    speed >= STALL_RECOVERY_SPEED &&
    pitch <= STALL_RECOVERY_PITCH
  ) {
    stalled = false;
  }

  const speedFactor = clamp(speed / 32, 0.25, 1.15);
  const controlFactor = stalled ? 0.28 : 1;
  const headingRate = state.onGround
    ? yawInput * GROUND_YAW_RATE
    : (yawInput * DIRECT_YAW_RATE +
        Math.sin(roll) * BANK_TURN_RATE * speedFactor) *
      controlFactor;
  const heading = wrapAngle(state.heading + headingRate * dt);

  const horizontalSpeed = speed * Math.cos(pitch);
  const dx = Math.cos(heading) * horizontalSpeed * dt;
  const dz = Math.sin(heading) * horizontalSpeed * dt;

  if (state.onGround) {
    const canLiftOff =
      brake < 0.2 &&
      speed >= TAKEOFF_SPEED &&
      pitch > 4 * DEG;

    if (!canLiftOff) {
      pitch = Math.min(pitch, 8 * DEG);
      return {
        position: {
          x: state.position.x + dx,
          y: RUNWAY_GROUND_Y,
          z: state.position.z + dz
        },
        heading,
        pitch,
        roll: 0,
        speed,
        verticalSpeed: 0,
        onGround: true,
        stalled: false
      };
    }

    return {
      position: {
        x: state.position.x + dx,
        y: RUNWAY_GROUND_Y + 0.08,
        z: state.position.z + dz
      },
      heading,
      pitch,
      roll,
      speed,
      verticalSpeed: Math.max(1.5, speed * Math.sin(pitch)),
      onGround: false,
      stalled: false
    };
  }

  const lowSpeedSink = Math.max(0, STALL_SPEED - speed) * 0.9;
  const stallSink = stalled ? STALL_EXTRA_SINK : 0;
  const verticalSpeed = speed * Math.sin(pitch) - lowSpeedSink - stallSink;
  const nextY = state.position.y + verticalSpeed * dt;

  if (nextY <= RUNWAY_GROUND_Y) {
    return {
      position: {
        x: state.position.x + dx,
        y: RUNWAY_GROUND_Y,
        z: state.position.z + dz
      },
      heading,
      pitch,
      roll,
      speed,
      verticalSpeed: 0,
      onGround: true,
      stalled: false
    };
  }

  return {
    position: {
      x: state.position.x + dx,
      y: nextY,
      z: state.position.z + dz
    },
    heading,
    pitch,
    roll,
    speed,
    verticalSpeed,
    onGround: false,
    stalled
  };
}

export function flightOrientation(state: FlightState): QuaternionState {
  const yaw = axisAngle(0, 1, 0, -state.heading);
  const pitch = axisAngle(0, 0, 1, state.pitch);
  const roll = axisAngle(1, 0, 0, state.roll);
  return multiplyQuaternion(multiplyQuaternion(yaw, pitch), roll);
}

export function headingDegrees(state: FlightState): number {
  return ((state.heading / DEG) % 360 + 360) % 360;
}

export function pitchDegrees(state: FlightState): number {
  return state.pitch / DEG;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}

function wrapAngle(value: number): number {
  const twoPi = Math.PI * 2;
  return ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

function axisAngle(x: number, y: number, z: number, angle: number): QuaternionState {
  const half = angle / 2;
  const sin = Math.sin(half);
  return { x: x * sin, y: y * sin, z: z * sin, w: Math.cos(half) };
}

function multiplyQuaternion(a: QuaternionState, b: QuaternionState): QuaternionState {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  };
}
