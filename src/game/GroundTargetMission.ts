import type { FlightState, Vector3State } from '../flight/ArcadeFlightModel';
import { RUNWAY_GROUND_Y } from '../flight/ArcadeFlightModel';

export interface GroundTarget {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly name: string;
}

// Flat, unoccupied training clearings on the fictional island (never the runway,
// airport buildings, or town). Targets are sequential to require another pass.
export const GROUND_TARGETS: readonly GroundTarget[] = [
  { x: 170, z: -105, radius: 26, name: 'EAST MEADOW' },
  { x: 445, z: 55, radius: 26, name: 'COAST CLEARING' },
  { x: 115, z: 125, radius: 26, name: 'NORTH FIELD' }
];

// Raised vertical training panels: a pilot can aim without diving at the ground.
export const TARGET_CENTER_Y = 30;
const TARGET_SURFACE_Y = 0.24;
const MAX_SHOT_DISTANCE = 500;
const MIN_FIRE_ALTITUDE = 18;
const MAX_FIRE_ALTITUDE = 120;
const MIN_FIRE_SPEED = 18;

export interface GroundShot {
  readonly id: number;
  readonly start: Vector3State;
  readonly end: Vector3State;
  readonly hit: boolean;
}

export interface GroundTargetProgress {
  readonly kind: 'ground-targets';
  readonly phase: 'takeoff' | 'targets' | 'complete' | 'failed';
  readonly hitCount: number;
  readonly shotsFired: number;
  readonly message: string;
  readonly lastShot: GroundShot | null;
}

export interface WeaponRay {
  readonly origin: Vector3State;
  readonly direction: Vector3State;
}

// The aircraft points along local +X. Roll rotates around +X and does not
// change the bore axis; heading and nose pitch determine the actual ray.
export function weaponRay(state: FlightState): WeaponRay {
  const horizontal = Math.cos(state.pitch);
  const direction = {
    x: Math.cos(state.heading) * horizontal,
    y: Math.sin(state.pitch),
    z: Math.sin(state.heading) * horizontal
  };
  return {
    origin: {
      x: state.position.x + direction.x * 3,
      y: state.position.y + direction.y * 3,
      z: state.position.z + direction.z * 3
    },
    direction
  };
}

export function shotGroundIntersection(
  ray: WeaponRay
): Vector3State | null {
  if (ray.direction.y >= -0.015) {
    return null;
  }
  const distance = (TARGET_SURFACE_Y - ray.origin.y) / ray.direction.y;
  if (distance <= 0 || distance > MAX_SHOT_DISTANCE) {
    return null;
  }
  return {
    x: ray.origin.x + ray.direction.x * distance,
    y: TARGET_SURFACE_Y,
    z: ray.origin.z + ray.direction.z * distance
  };
}

/**
 * The visible board lies in the world YZ plane at target.x. This is the
 * same plane as the Three.js disc; use the intersection point for scoring.
 * Never use the chase camera's centered reticle for hit detection.
 */
export function shotTargetIntersection(
  ray: WeaponRay,
  target: GroundTarget
): Vector3State | null {
  if (Math.abs(ray.direction.x) < 0.015) return null;
  const distance = (target.x - ray.origin.x) / ray.direction.x;
  if (distance <= 0 || distance > MAX_SHOT_DISTANCE) return null;
  const point = {
    x: target.x,
    y: ray.origin.y + ray.direction.y * distance,
    z: ray.origin.z + ray.direction.z * distance
  };
  // A shot cannot travel through the ground on its way to the target.
  const ground = shotGroundIntersection(ray);
  if (ground) {
    const groundDistance = Math.hypot(
      ground.x - ray.origin.x, ground.y - ray.origin.y, ground.z - ray.origin.z
    );
    if (groundDistance < distance) return null;
  }
  return point;
}

export function createGroundTargetMission(): GroundTargetProgress {
  return {
    kind: 'ground-targets',
    phase: 'takeoff',
    hitCount: 0,
    shotsFired: 0,
    lastShot: null,
    message: 'THRUSTで離陸。高度18〜120mを確保し、立った的へ機首の照準を合わせてFIRE'
  };
}

export function failGroundTargetMission(
  progress: GroundTargetProgress,
  message: string
): GroundTargetProgress {
  return { ...progress, phase: 'failed', message };
}

export function updateGroundTargetMission(
  progress: GroundTargetProgress,
  state: FlightState,
  fire: boolean
): GroundTargetProgress {
  if (progress.phase === 'complete' || progress.phase === 'failed') {
    return progress;
  }
  if (progress.phase === 'takeoff') {
    if (state.onGround || state.position.y - RUNWAY_GROUND_Y < MIN_FIRE_ALTITUDE) {
      return progress;
    }
    return {
      ...progress,
      phase: 'targets',
      message: instructionFor(0)
    };
  }

  if (!fire) {
    return progress;
  }

  const ray = weaponRay(state);
  const target = GROUND_TARGETS[progress.hitCount];
  const intersection = target ? shotTargetIntersection(ray, target) : null;
  const validEnvelope =
    !state.onGround &&
    !state.stalled &&
    state.speed >= MIN_FIRE_SPEED &&
    state.position.y - RUNWAY_GROUND_Y >= MIN_FIRE_ALTITUDE &&
    state.position.y - RUNWAY_GROUND_Y <= MAX_FIRE_ALTITUDE;
  const hit = Boolean(
    validEnvelope &&
    intersection &&
    target &&
    Math.hypot(intersection.y - TARGET_CENTER_Y, intersection.z - target.z) <= target.radius
  );
  const shotsFired = progress.shotsFired + 1;
  const hitCount = progress.hitCount + (hit ? 1 : 0);
  const end = (hit ? intersection : shotGroundIntersection(ray)) ?? {
    x: ray.origin.x + ray.direction.x * MAX_SHOT_DISTANCE,
    y: ray.origin.y + ray.direction.y * MAX_SHOT_DISTANCE,
    z: ray.origin.z + ray.direction.z * MAX_SHOT_DISTANCE
  };
  const lastShot: GroundShot = { id: shotsFired, start: ray.origin, end, hit };

  if (hitCount === GROUND_TARGETS.length) {
    return {
      ...progress, phase: 'complete', hitCount, shotsFired, lastShot,
      message: 'MISSION COMPLETE — 3標的命中！照準・高度・旋回・再攻撃進入クリア'
    };
  }

  const message = hit
    ? `HIT! 次の標的へ旋回して再進入 — ${instructionFor(hitCount)}`
    : !validEnvelope
      ? '射撃条件外：高度18〜120m・速度65km/h以上・非失速で再進入'
      : 'MISS — 旋回して再進入。黄色い立て型ターゲットの中心へ照準を合わせよう';

  return {
    ...progress, hitCount, shotsFired, lastShot, message
  };
}

function instructionFor(index: number): string {
  const target = GROUND_TARGETS[index];
  return target
    ? `TARGET ${index + 1} / ${GROUND_TARGETS.length} — ${target.name}。立て型ターゲット中央を照準しF / FIRE`
    : '訓練完了';
}
