import { describe, expect, it } from 'vitest';
import { RUNWAY_GROUND_Y, createInitialFlightState } from '../src/flight/ArcadeFlightModel';
import {
  LANDING_ZONE,
  TRAINING_RINGS,
  createTrainingMission,
  updateTrainingMission
} from '../src/game/TrainingMission';

describe('training mission', () => {
  it('advances from takeoff through rings to landing', () => {
    let progress = createTrainingMission();

    progress = updateTrainingMission(progress, {
      ...createInitialFlightState(),
      onGround: false,
      speed: 24,
      position: { x: -100, y: 8, z: 0 }
    });
    expect(progress.phase).toBe('rings');

    for (const ring of TRAINING_RINGS) {
      progress = updateTrainingMission(progress, {
        ...createInitialFlightState(),
        onGround: false,
        speed: 28,
        position: ring.center
      });
    }

    expect(progress.phase).toBe('landing');

    progress = updateTrainingMission(progress, {
      ...createInitialFlightState(),
      speed: 20,
      position: {
        x: (LANDING_ZONE.minX + LANDING_ZONE.maxX) / 2,
        y: RUNWAY_GROUND_Y,
        z: 0
      }
    });

    expect(progress.phase).toBe('complete');
  });
});
