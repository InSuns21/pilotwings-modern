import { describe, expect, it } from 'vitest';
import { AIRCRAFT, TASKS, WORLDS } from '../src/game/GameCatalog';
import {
  aircraftPreviewSvg,
  taskPreviewSvg,
  worldPreviewSvg
} from '../src/game/StartScreenPreview';

describe('start screen previews', () => {
  it('provides a world preview for every registered world', () => {
    for (const world of WORLDS) {
      expect(worldPreviewSvg(world.id)).toContain('<svg');
      expect(worldPreviewSvg(world.id)).toContain('#8fcdf8');
    }
  });

  it('provides an aircraft preview for every registered aircraft', () => {
    for (const aircraft of AIRCRAFT) {
      expect(aircraftPreviewSvg(aircraft.id)).toContain('<svg');
      expect(aircraftPreviewSvg(aircraft.id)).toContain('#d94f3d');
    }
  });

  it('provides a task preview for every registered task', () => {
    for (const task of TASKS) {
      expect(taskPreviewSvg(task.id)).toContain('<svg');
      expect(taskPreviewSvg(task.id)).toContain('#ff8a4c');
    }
  });
});
