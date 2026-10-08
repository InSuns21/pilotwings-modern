import { describe, expect, it } from 'vitest';
import { RUNWAY_GROUND_Y, createInitialFlightState, type FlightState } from '../src/flight/ArcadeFlightModel';
import {
  GROUND_TARGETS,
  createGroundTargetMission,
  failGroundTargetMission,
  shotGroundIntersection,
  updateGroundTargetMission,
  weaponRay,
  type GroundTarget
} from '../src/game/GroundTargetMission';
import { createTaskRuntime } from '../src/game/TaskRuntime';
import { isInsideTrainingIsland, isOnRunway, terrainHeightAt } from '../src/world/WorldGeometry';

function aimingAt(target: GroundTarget, altitude = 55): FlightState {
  const distance = 140;
  const pitch = -Math.atan2(altitude + RUNWAY_GROUND_Y - 0.24, distance);
  return {
    ...createInitialFlightState(),
    onGround: false,
    speed: 32,
    position: { x: target.x - distance, y: altitude + RUNWAY_GROUND_Y, z: target.z },
    pitch,
    heading: 0
  };
}

describe('ground target shooting mission', () => {
  it('places three targets on unoccupied, flat island terrain away from runway', () => {
    expect(GROUND_TARGETS).toHaveLength(3);
    for (const target of GROUND_TARGETS) {
      expect(isInsideTrainingIsland(target.x, target.z)).toBe(true);
      expect(isOnRunway(target.x, target.z)).toBe(false);
      expect(terrainHeightAt(target.x, target.z)).toBe(0);
    }
  });

  it('requires takeoff and minimum altitude before starting the range', () => {
    const initial = createGroundTargetMission();
    expect(updateGroundTargetMission(initial, createInitialFlightState(), true)).toBe(initial);
    expect(updateGroundTargetMission(initial, aimingAt(GROUND_TARGETS[0]!, 10), true)).toBe(initial);
    const airborne = updateGroundTargetMission(initial, aimingAt(GROUND_TARGETS[0]!), false);
    expect(airborne.phase).toBe('targets');
    expect(airborne.message).toContain('TARGET 1 / 3');
  });

  it('projects weapon fire from the aircraft nose onto the target surface', () => {
    const state = aimingAt(GROUND_TARGETS[0]!);
    const hit = shotGroundIntersection(weaponRay(state));
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(GROUND_TARGETS[0]!.x, 0);
    expect(hit!.z).toBeCloseTo(GROUND_TARGETS[0]!.z, 0);
    expect(shotGroundIntersection(weaponRay({ ...state, pitch: 0 }))).toBeNull();
  });

  it('counts ordered hits and completes after a turning reattack at each target', () => {
    let progress = updateGroundTargetMission(createGroundTargetMission(), aimingAt(GROUND_TARGETS[0]!), false);
    for (let i = 0; i < GROUND_TARGETS.length; i += 1) {
      const before = progress.hitCount;
      progress = updateGroundTargetMission(progress, aimingAt(GROUND_TARGETS[i]!), true);
      expect(progress.hitCount).toBe(before + 1);
      expect(progress.shotsFired).toBe(i + 1);
      expect(progress.lastShot?.hit).toBe(true);
    }
    expect(progress.phase).toBe('complete');
    expect(updateGroundTargetMission(progress, aimingAt(GROUND_TARGETS[0]!), true)).toBe(progress);
  });

  it('does not accept a previous or distant target in place of the current target', () => {
    let progress = updateGroundTargetMission(createGroundTargetMission(), aimingAt(GROUND_TARGETS[0]!), false);
    progress = updateGroundTargetMission(progress, aimingAt(GROUND_TARGETS[0]!), true);
    progress = updateGroundTargetMission(progress, aimingAt(GROUND_TARGETS[0]!), true);
    expect(progress.hitCount).toBe(1);
    expect(progress.shotsFired).toBe(2);
    expect(progress.lastShot?.hit).toBe(false);
    expect(progress.message).toContain('MISS');
  });

  it('rejects high, low and stalled fire even if the ray crosses the target', () => {
    const progress = updateGroundTargetMission(createGroundTargetMission(), aimingAt(GROUND_TARGETS[0]!), false);
    for (const state of [
      aimingAt(GROUND_TARGETS[0]!, 150),
      aimingAt(GROUND_TARGETS[0]!, 10),
      { ...aimingAt(GROUND_TARGETS[0]!), stalled: true },
      { ...aimingAt(GROUND_TARGETS[0]!), speed: 12 }
    ]) {
      const result = updateGroundTargetMission(progress, state, true);
      expect(result.hitCount).toBe(0);
      expect(result.shotsFired).toBe(1);
    }
  });

  it('routes shooting via the TaskRuntime contract and preserves fatal failure', () => {
    const runtime = createTaskRuntime('island-ground-targets');
    expect(runtime.objectiveLabel).toBe('HIT');
    expect(runtime.objectiveCount).toBe(3);
    let progress = runtime.createProgress();
    progress = runtime.updateProgress(progress, aimingAt(GROUND_TARGETS[0]!), false);
    progress = runtime.updateProgress(progress, aimingAt(GROUND_TARGETS[0]!), true);
    expect(runtime.completedObjectives(progress)).toBe(1);
    const failed = runtime.failProgress(progress, 'CRASH');
    expect(failed.phase).toBe('failed');
    expect(failGroundTargetMission(updateGroundTargetMission(createGroundTargetMission(), aimingAt(GROUND_TARGETS[0]!), false), 'CRASH').phase).toBe('failed');
    expect(runtime.updateProgress(failed, aimingAt(GROUND_TARGETS[1]!), true)).toBe(failed);
  });
});
