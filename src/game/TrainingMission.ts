import type { FlightState, Vector3State } from '../flight/ArcadeFlightModel';

export interface TrainingRing {
  readonly center: Vector3State;
  readonly radius: number;
}

export const TRAINING_RINGS: readonly TrainingRing[] = [
  { center: { x: -55, y: 17, z: 0 }, radius: 9 },
  { center: { x: 45, y: 27, z: 18 }, radius: 9 },
  { center: { x: 145, y: 22, z: 0 }, radius: 9 }
];

export const LANDING_ZONE = {
  minX: 245,
  maxX: 365,
  halfWidth: 10
} as const;

export type TrainingPhase =
  | 'takeoff'
  | 'rings'
  | 'landing'
  | 'complete'
  | 'failed';

export interface TrainingMissionProgress {
  readonly phase: TrainingPhase;
  readonly nextRingIndex: number;
  readonly message: string;
}

export function createTrainingMission(): TrainingMissionProgress {
  return {
    phase: 'takeoff',
    nextRingIndex: 0,
    message: 'THRUSTで加速し、18 m/sを超えたら機首を上げて離陸'
  };
}

export function failTrainingMission(
  progress: TrainingMissionProgress,
  message: string
): TrainingMissionProgress {
  return {
    phase: 'failed',
    nextRingIndex: progress.nextRingIndex,
    message
  };
}

export function updateTrainingMission(
  progress: TrainingMissionProgress,
  state: FlightState
): TrainingMissionProgress {
  if (progress.phase === 'complete' || progress.phase === 'failed') {
    return progress;
  }

  if (progress.phase === 'takeoff') {
    if (!state.onGround && state.position.y > 4) {
      return {
        phase: 'rings',
        nextRingIndex: 0,
        message: 'リング 1 / 3 を通過'
      };
    }
    return progress;
  }

  if (progress.phase === 'rings') {
    const ring = TRAINING_RINGS[progress.nextRingIndex];
    if (!ring) {
      return {
        phase: 'landing',
        nextRingIndex: TRAINING_RINGS.length,
        message: '全リング通過。滑走路の緑の着陸ゾーンへ'
      };
    }

    if (distance(state.position, ring.center) <= ring.radius) {
      const nextIndex = progress.nextRingIndex + 1;
      if (nextIndex >= TRAINING_RINGS.length) {
        return {
          phase: 'landing',
          nextRingIndex: nextIndex,
          message: '全リング通過。速度・姿勢・降下率を抑えて緑のゾーンへ着陸'
        };
      }

      return {
        phase: 'rings',
        nextRingIndex: nextIndex,
        message: `リング ${nextIndex + 1} / ${TRAINING_RINGS.length} を通過`
      };
    }

    return progress;
  }

  if (
    progress.phase === 'landing' &&
    state.onGround &&
    state.position.x >= LANDING_ZONE.minX &&
    state.position.x <= LANDING_ZONE.maxX &&
    Math.abs(state.position.z) <= LANDING_ZONE.halfWidth
  ) {
    return {
      phase: 'complete',
      nextRingIndex: TRAINING_RINGS.length,
      message: 'MISSION COMPLETE — 離陸・リング・着陸成功'
    };
  }

  return progress;
}

function distance(a: Vector3State, b: Vector3State): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
