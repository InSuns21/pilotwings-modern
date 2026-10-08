import { describe, expect, it } from 'vitest';
import {
  AIRCRAFT,
  DEFAULT_GAME_SELECTION_IDS,
  TASKS,
  WORLDS,
  getAvailableTasks,
  resolveGameSelection
} from '../src/game/GameCatalog';

describe('game catalog', () => {
  it('provides two worlds, one aircraft, and world-specific training tasks', () => {
    expect(WORLDS).toHaveLength(2);
    expect(AIRCRAFT).toHaveLength(1);
    expect(TASKS).toHaveLength(2);

    expect(
      getAvailableTasks('training-island', 'trainer-01').map((task) => task.id)
    ).toEqual(['island-flight-basics']);
    expect(
      getAvailableTasks('matsumoto-real', 'trainer-01').map((task) => task.id)
    ).toEqual(['matsumoto-pattern-training']);
  });

  it('resolves the default start-screen selection', () => {
    const selection = resolveGameSelection();

    expect(selection.world.id).toBe(DEFAULT_GAME_SELECTION_IDS.worldId);
    expect(selection.aircraft.id).toBe(DEFAULT_GAME_SELECTION_IDS.aircraftId);
    expect(selection.task.id).toBe(DEFAULT_GAME_SELECTION_IDS.taskId);
    expect(selection.worldSettings.heightExaggeration).toBe(1);
  });

  it('rejects a task that does not belong to the selected world and aircraft', () => {
    expect(() =>
      resolveGameSelection({
        worldId: 'matsumoto-real',
        aircraftId: 'trainer-01',
        taskId: 'island-flight-basics'
      })
    ).toThrow('is not available');
  });

  it('clamps Matsumoto terrain height exaggeration to the supported range', () => {
    const selection = resolveGameSelection(
      {
        worldId: 'matsumoto-real',
        aircraftId: 'trainer-01',
        taskId: 'matsumoto-pattern-training'
      },
      {
        heightExaggeration: 9
      }
    );

    expect(selection.world.id).toBe('matsumoto-real');
    expect(selection.worldSettings.heightExaggeration).toBe(3);
  });

  it('rejects an unknown runtime option', () => {
    expect(() =>
      resolveGameSelection({
        ...DEFAULT_GAME_SELECTION_IDS,
        worldId: 'missing-world' as typeof DEFAULT_GAME_SELECTION_IDS.worldId
      })
    ).toThrow('Unknown world');
  });
});
