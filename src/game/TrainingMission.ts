import type { FlightState, Vector3State } from '../flight/ArcadeFlightModel';
import type { TaskId } from './GameCatalog';

export interface TrainingRing {
  readonly center: Vector3State;
  readonly radius: number;
  readonly instruction: string;
}

export interface LandingZone {
  readonly minX: number;
  readonly maxX: number;
  readonly halfWidth: number;
}

export interface TrainingCourse {
  readonly rings: readonly TrainingRing[];
  readonly landingZone: LandingZone;
  readonly takeoffMessage: string;
  readonly landingMessage: string;
  readonly completeMessage: string;
}

const ISLAND_FLIGHT_BASICS: TrainingCourse = {
  rings: [
    {
      center: { x: -95, y: 12, z: 0 },
      radius: 10,
      instruction: 'PITCH + THRUSTで離陸上昇。速度を保ちながら高度12mへ'
    },
    {
      center: { x: 15, y: 25, z: 0 },
      radius: 10,
      instruction: '上昇を続け、PITCHを戻して高度25m付近で水平飛行へ移る'
    },
    {
      center: { x: 115, y: 32, z: -65 },
      radius: 11,
      instruction: 'ROLLで外側へ旋回。速度と高度を落としすぎずリングへ向ける'
    },
    {
      center: { x: 80, y: 34, z: -145 },
      radius: 11,
      instruction: '旋回をつなぎ、バンクを戻しながら高度30m前後を維持'
    },
    {
      center: { x: -40, y: 32, z: -155 },
      radius: 11,
      instruction: '水平飛行で復路へ。PITCHを小さく保ち速度を安定させる'
    },
    {
      center: { x: -135, y: 28, z: -80 },
      radius: 11,
      instruction: '浅い降下を開始。PATHを少し負にして高度を速度へ交換する'
    },
    {
      center: { x: -110, y: 22, z: 15 },
      radius: 10,
      instruction: '滑走路方向へ旋回。バンクを戻しつつ降下率を整える'
    },
    {
      center: { x: 70, y: 14, z: 5 },
      radius: 10,
      instruction: '滑走路中心線へ整列。高度14mから浅い降下で最終進入'
    }
  ],
  landingZone: {
    minX: 245,
    maxX: 365,
    halfWidth: 10
  },
  takeoffMessage: 'THRUSTで加速し、18 m/sを超えたら機首を上げて離陸',
  landingMessage: 'BRAKEで速度を整え、PATHを負に保って進入。接地直前だけ機首を上げてフレア',
  completeMessage: 'MISSION COMPLETE — 上昇・水平飛行・旋回・降下・着陸成功'
};

const MATSUMOTO_PATTERN_TRAINING: TrainingCourse = {
  rings: [
    {
      center: { x: 100, y: 25, z: 0 },
      radius: 18,
      instruction: '滑走路方向へ離陸上昇。まず速度を作り、高度25mへ'
    },
    {
      center: { x: 450, y: 65, z: 0 },
      radius: 22,
      instruction: '上昇を継続し、高度60m前後でPITCHを戻して水平化'
    },
    {
      center: { x: 750, y: 90, z: 260 },
      radius: 24,
      instruction: 'ROLLで周回コースへ旋回。速度を保ちつつ高度90mへ'
    },
    {
      center: { x: 500, y: 90, z: 520 },
      radius: 24,
      instruction: 'バンクを戻して横風側へ。高度と速度を安定させる'
    },
    {
      center: { x: -300, y: 90, z: 520 },
      radius: 24,
      instruction: '滑走路と平行な区間を水平飛行。姿勢変化を小さく保つ'
    },
    {
      center: { x: -650, y: 75, z: 360 },
      radius: 24,
      instruction: '進入へ向けて旋回しながら浅く降下。PATHを負へ移す'
    },
    {
      center: { x: -650, y: 50, z: 120 },
      radius: 22,
      instruction: '最終旋回。バンクを戻し、高度50mから滑走路を正面へ'
    },
    {
      center: { x: -450, y: 35, z: 0 },
      radius: 20,
      instruction: '滑走路中心線へ整列。速度を落としすぎず最終進入へ'
    }
  ],
  landingZone: {
    minX: 100,
    maxX: 500,
    halfWidth: 18
  },
  takeoffMessage: 'THRUSTで加速し、速度を作ってから滑走路方向へ離陸',
  landingMessage: '滑走路中心線を維持して降下。BRAKEで速度調整し、接地直前にフレア',
  completeMessage: 'MISSION COMPLETE — 松本パターン周回・再進入・着陸成功'
};

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

export function getTrainingCourse(taskId: Exclude<TaskId, 'island-ground-targets'>): TrainingCourse {
  switch (taskId) {
    case 'island-flight-basics':
      return ISLAND_FLIGHT_BASICS;
    case 'matsumoto-pattern-training':
      return MATSUMOTO_PATTERN_TRAINING;
  }
}

export function createTrainingMission(
  course: TrainingCourse
): TrainingMissionProgress {
  return {
    phase: 'takeoff',
    nextRingIndex: 0,
    message: course.takeoffMessage
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
  course: TrainingCourse,
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
        message: ringInstruction(course, 0)
      };
    }
    return progress;
  }

  if (progress.phase === 'rings') {
    const ring = course.rings[progress.nextRingIndex];
    if (!ring) {
      return {
        phase: 'landing',
        nextRingIndex: course.rings.length,
        message: course.landingMessage
      };
    }

    if (distance(state.position, ring.center) <= ring.radius) {
      const nextIndex = progress.nextRingIndex + 1;
      if (nextIndex >= course.rings.length) {
        return {
          phase: 'landing',
          nextRingIndex: nextIndex,
          message: course.landingMessage
        };
      }

      return {
        phase: 'rings',
        nextRingIndex: nextIndex,
        message: ringInstruction(course, nextIndex)
      };
    }

    return progress;
  }

  const landingZone = course.landingZone;
  if (
    progress.phase === 'landing' &&
    state.onGround &&
    state.position.x >= landingZone.minX &&
    state.position.x <= landingZone.maxX &&
    Math.abs(state.position.z) <= landingZone.halfWidth
  ) {
    return {
      phase: 'complete',
      nextRingIndex: course.rings.length,
      message: course.completeMessage
    };
  }

  return progress;
}

function ringInstruction(course: TrainingCourse, index: number): string {
  const ring = course.rings[index];
  if (!ring) {
    return course.landingMessage;
  }

  return `RING ${index + 1} / ${course.rings.length} — ${ring.instruction}`;
}

function distance(a: Vector3State, b: Vector3State): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
