import {
  MAX_DIVE_SPEED,
  OVERSPEED_WARNING_SPEED,
  RUNWAY_GROUND_Y,
  type FlightState
} from '../flight/ArcadeFlightModel';
import {
  isInsideTrainingIsland,
  isOnRunway,
  terrainHeightAt
} from '../world/WorldGeometry';

const DEG = Math.PI / 180;

export const SAFE_LANDING_MAX_SPEED = 28;
export const SAFE_LANDING_MAX_DESCENT = 6;
export const SAFE_LANDING_MAX_NOSE_UP_PITCH = 16 * DEG;
export const SAFE_LANDING_MAX_NOSE_DOWN_PITCH = -6 * DEG;
export const SAFE_LANDING_MAX_ROLL = 14 * DEG;
export const NOSE_HIGH_WARNING_PITCH = 24 * DEG;
export const AIRCRAFT_TERRAIN_CLEARANCE = 0.65;

export type CrashReason =
  | 'terrain'
  | 'ground'
  | 'water'
  | 'overspeed'
  | 'landing-speed'
  | 'landing-attitude'
  | 'hard-landing';

export interface FlightSafetyState {
  readonly warning: string | null;
  readonly crashReason: CrashReason | null;
  readonly crashMessage: string | null;
}

export interface FlightSafetyWorld {
  terrainHeightAt(x: number, z: number): number;
  isOnRunway(x: number, z: number): boolean;
  surfaceAt(x: number, z: number): 'ground' | 'water';
}

export const SAFE_FLIGHT: FlightSafetyState = {
  warning: null,
  crashReason: null,
  crashMessage: null
};

const TRAINING_ISLAND_SAFETY_WORLD: FlightSafetyWorld = {
  terrainHeightAt,
  isOnRunway,
  surfaceAt(x: number, z: number): 'ground' | 'water' {
    return isInsideTrainingIsland(x, z) ? 'ground' : 'water';
  }
};

export function evaluateFlightSafety(
  previous: FlightState,
  current: FlightState,
  world: FlightSafetyWorld = TRAINING_ISLAND_SAFETY_WORLD
): FlightSafetyState {
  const terrainHeight = world.terrainHeightAt(
    current.position.x,
    current.position.z
  );

  if (!current.onGround && current.speed >= MAX_DIVE_SPEED) {
    return crash(
      'overspeed',
      `OVERSPEED — 機体限界 ${Math.round(MAX_DIVE_SPEED * 3.6)} km/h を超過`
    );
  }

  if (
    terrainHeight > 0 &&
    current.position.y <= terrainHeight + AIRCRAFT_TERRAIN_CLEARANCE
  ) {
    return crash('terrain', 'TERRAIN IMPACT — 山腹に衝突');
  }

  const touchedDown = !previous.onGround && current.onGround;
  if (touchedDown) {
    if (!world.isOnRunway(current.position.x, current.position.z)) {
      return world.surfaceAt(current.position.x, current.position.z) === 'ground'
        ? crash('ground', 'GROUND IMPACT — 滑走路外に接地')
        : crash('water', 'WATER IMPACT — 海面に墜落');
    }

    if (current.speed > SAFE_LANDING_MAX_SPEED) {
      return crash(
        'landing-speed',
        `LANDING TOO FAST — ${Math.round(current.speed * 3.6)} km/h`
      );
    }

    if (
      previous.pitch > SAFE_LANDING_MAX_NOSE_UP_PITCH ||
      previous.pitch < SAFE_LANDING_MAX_NOSE_DOWN_PITCH ||
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
    !world.isOnRunway(current.position.x, current.position.z)
  ) {
    return world.surfaceAt(current.position.x, current.position.z) === 'ground'
      ? crash('ground', 'GROUND IMPACT — 地面に衝突')
      : crash('water', 'WATER IMPACT — 海面に墜落');
  }

  if (!current.onGround && current.speed >= OVERSPEED_WARNING_SPEED) {
    return {
      warning: `OVERSPEED — ${Math.round(current.speed * 3.6)} km/h / 機首を上げて減速`,
      crashReason: null,
      crashMessage: null
    };
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
