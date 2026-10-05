import {
  RUNWAY_GROUND_Y,
  type FlightState
} from '../flight/ArcadeFlightModel';
import { isOnRunway, terrainHeightAt } from '../world/WorldGeometry';

const DEG = Math.PI / 180;

export const SAFE_LANDING_MAX_SPEED = 28;
export const SAFE_LANDING_MAX_DESCENT = 6;
export const SAFE_LANDING_MAX_PITCH = 11 * DEG;
export const SAFE_LANDING_MAX_ROLL = 14 * DEG;
export const NOSE_HIGH_WARNING_PITCH = 22 * DEG;
export const AIRCRAFT_TERRAIN_CLEARANCE = 0.65;

export type CrashReason =
  | 'terrain'
  | 'ground'
  | 'landing-speed'
  | 'landing-attitude'
  | 'hard-landing';

export interface FlightSafetyState {
  readonly warning: string | null;
  readonly crashReason: CrashReason | null;
  readonly crashMessage: string | null;
}

export const SAFE_FLIGHT: FlightSafetyState = {
  warning: null,
  crashReason: null,
  crashMessage: null
};

export function evaluateFlightSafety(
  previous: FlightState,
  current: FlightState
): FlightSafetyState {
  const terrainHeight = terrainHeightAt(current.position.x, current.position.z);

  if (
    terrainHeight > 0 &&
    current.position.y <= terrainHeight + AIRCRAFT_TERRAIN_CLEARANCE
  ) {
    return crash(
      'terrain',
      'TERRAIN IMPACT — 山腹に衝突'
    );
  }

  const touchedDown = !previous.onGround && current.onGround;
  if (touchedDown) {
    if (!isOnRunway(current.position.x, current.position.z)) {
      return crash(
        'ground',
        'GROUND IMPACT — 滑走路外に接地'
      );
    }

    if (current.speed > SAFE_LANDING_MAX_SPEED) {
      return crash(
        'landing-speed',
        `LANDING TOO FAST — ${Math.round(current.speed * 3.6)} km/h`
      );
    }

    if (
      Math.abs(previous.pitch) > SAFE_LANDING_MAX_PITCH ||
      Math.abs(previous.roll) > SAFE_LANDING_MAX_ROLL
    ) {
      return crash(
        'landing-attitude',
        'BAD LANDING ATTITUDE — 機首/バンク角が大きすぎます'
      );
    }

    if (previous.verticalSpeed < -SAFE_LANDING_MAX_DESCENT) {
      return crash(
        'hard-landing',
        `HARD LANDING — 降下率 ${Math.abs(previous.verticalSpeed).toFixed(1)} m/s`
      );
    }
  }

  if (
    !current.onGround &&
    current.position.y <= RUNWAY_GROUND_Y &&
    !isOnRunway(current.position.x, current.position.z)
  ) {
    return crash('ground', 'GROUND IMPACT — 地面に衝突');
  }

  if (current.stalled) {
    return {
      warning: 'STALL — 機首を下げて速度を回復',
      crashReason: null,
      crashMessage: null
    };
  }

  if (!current.onGround && current.pitch >= NOSE_HIGH_WARNING_PITCH) {
    return {
      warning: 'NOSE HIGH — 機首上げすぎ',
      crashReason: null,
      crashMessage: null
    };
  }

  return SAFE_FLIGHT;
}

function crash(reason: CrashReason, message: string): FlightSafetyState {
  return {
    warning: null,
    crashReason: reason,
    crashMessage: message
  };
}
