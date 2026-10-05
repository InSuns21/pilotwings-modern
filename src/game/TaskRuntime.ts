import type { FlightState } from '../flight/ArcadeFlightModel';
import type { TaskId } from './GameCatalog';
import {
  TRAINING_RINGS,
  createTrainingMission,
  failTrainingMission,
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
  switch (taskId) {
    case 'ring-training':
      return {
        ringCount: TRAINING_RINGS.length,
        createProgress: createTrainingMission,
        updateProgress: updateTrainingMission,
        failProgress: failTrainingMission
      };
  }
}
