import type { FlightState } from '../flight/ArcadeFlightModel';
import type { TaskId } from './GameCatalog';
import {
  createTrainingMission,
  failTrainingMission,
  getTrainingCourse,
  updateTrainingMission,
  type TrainingMissionProgress
} from './TrainingMission';

export interface TaskRuntime {
  readonly ringCount: number;
  createProgress(): TrainingMissionProgress;
  updateProgress(
    progress: TrainingMissionProgress,
    state: FlightState
  ): TrainingMissionProgress;
  failProgress(
    progress: TrainingMissionProgress,
    message: string
  ): TrainingMissionProgress;
}

export function createTaskRuntime(taskId: TaskId): TaskRuntime {
  const course = getTrainingCourse(taskId);

  return {
    ringCount: course.rings.length,
    createProgress: () => createTrainingMission(course),
    updateProgress: (progress, state) =>
      updateTrainingMission(course, progress, state),
    failProgress: failTrainingMission
  };
}
