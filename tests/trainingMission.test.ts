import { describe, expect, it } from 'vitest';
import { RUNWAY_GROUND_Y, createInitialFlightState } from '../src/flight/ArcadeFlightModel';
import type { TaskId } from '../src/game/GameCatalog';
import {
  createTrainingMission,
  getTrainingCourse,
  updateTrainingMission
} from '../src/game/TrainingMission';

describe('training mission', () => {
  it.each([
    'island-flight-basics',
    'matsumoto-pattern-training'
  ] satisfies readonly TaskId[])(
    'advances %s from takeoff through its training rings to landing',
    (taskId) => {
      const course = getTrainingCourse(taskId);
      let progress = createTrainingMission(course);

      expect(course.rings).toHaveLength(8);

      progress = updateTrainingMission(course, progress, {
        ...createInitialFlightState(),
        onGround: false,
        speed: 24,
        position: { x: -100, y: 8, z: 0 }
      });
      expect(progress.phase).toBe('rings');
      expect(progress.message).toContain('RING 1 / 8');

      for (const ring of course.rings) {
        progress = updateTrainingMission(course, progress, {
          ...createInitialFlightState(),
          onGround: false,
          speed: 28,
          position: ring.center
        });
      }

      expect(progress.phase).toBe('landing');

      progress = updateTrainingMission(course, progress, {
        ...createInitialFlightState(),
        speed: 20,
        position: {
          x: (course.landingZone.minX + course.landingZone.maxX) / 2,
          y: RUNWAY_GROUND_Y,
          z: 0
        }
      });

      expect(progress.phase).toBe('complete');
    }
  );

  it('describes the control skill required for each island ring', () => {
    const course = getTrainingCourse('island-flight-basics');
    const instructions = course.rings.map((ring) => ring.instruction).join(' ');

    expect(instructions).toContain('PITCH');
    expect(instructions).toContain('ROLL');
    expect(instructions).toContain('PATH');
    expect(instructions).toContain('水平飛行');
    expect(instructions).toContain('最終進入');
  });
});
