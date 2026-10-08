import type { FlightState } from '../flight/ArcadeFlightModel';
import type { TaskId } from './GameCatalog';
import {
  GROUND_TARGETS,
  createGroundTargetMission,
  failGroundTargetMission,
  updateGroundTargetMission,
  type GroundTargetProgress
} from './GroundTargetMission';
import {
  createTrainingMission,
  failTrainingMission,
  getTrainingCourse,
  updateTrainingMission,
  type TrainingMissionProgress
} from './TrainingMission';

export type TaskProgress = TrainingMissionProgress | GroundTargetProgress;

export interface TaskRuntime {
  readonly objectiveCount: number;
  readonly objectiveLabel: 'RING' | 'HIT';
  createProgress(): TaskProgress;
  updateProgress(
    progress: TaskProgress,
    state: FlightState,
    fire: boolean
  ): TaskProgress;
  failProgress(
    progress: TaskProgress,
    message: string
  ): TaskProgress;
  completedObjectives(progress: TaskProgress): number;
}

export function createTaskRuntime(taskId: TaskId): TaskRuntime {
  if (taskId === 'island-ground-targets') {
    return {
      objectiveCount: GROUND_TARGETS.length,
      objectiveLabel: 'HIT',
      createProgress: createGroundTargetMission,
      updateProgress: (progress, state, fire) => {
        if (!('kind' in progress)) throw new Error('Wrong task progress');
        return updateGroundTargetMission(progress, state, fire);
      },
      failProgress: (progress, message) => {
        if (!('kind' in progress)) throw new Error('Wrong task progress');
        return failGroundTargetMission(progress, message);
      },
      completedObjectives: (progress) => {
        if (!('kind' in progress)) throw new Error('Wrong task progress');
        return progress.hitCount;
      }
    };
  }

  const course = getTrainingCourse(taskId);
  return {
    objectiveCount: course.rings.length,
    objectiveLabel: 'RING',
    createProgress: () => createTrainingMission(course),
    updateProgress: (progress, state) => {
      if ('kind' in progress) throw new Error('Wrong task progress');
      return updateTrainingMission(course, progress, state);
    },
    failProgress: (progress, message) => {
      if ('kind' in progress) throw new Error('Wrong task progress');
      return failTrainingMission(progress, message);
    },
    completedObjectives: (progress) => {
      if ('kind' in progress) throw new Error('Wrong task progress');
      return progress.nextRingIndex;
    }
  };
}
