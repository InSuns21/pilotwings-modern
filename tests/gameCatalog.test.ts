import { describe, expect, it } from 'vitest';
import {
  AIRCRAFT,
  DEFAULT_GAME_SELECTION_IDS,
  TASKS,
  WORLDS,
  resolveGameSelection
} from '../src/game/GameCatalog';

describe('game catalog', () => {
  it('provides two selectable worlds plus the initial aircraft and task', () => {
    expect(WORLDS).toHaveLength(2);
    expect(AIRCRAFT).toHaveLength(1);
    expect(TASKS).toHaveLength(1);
  });

  it('resolves the default start-screen selection', () => {
    const selection = resolveGameSelection();

    expect(selection.world.id).toBe(DEFAULT_GAME_SELECTION_IDS.worldId);
    expect(selection.aircraft.id).toBe(DEFAULT_GAME_SELECTION_IDS.aircraftId);
    expect(selection.task.id).toBe(DEFAULT_GAME_SELECTION_IDS.taskId);
    expect(selection.worldSettings.heightExaggeration).toBe(1);
  });

  it('clamps Matsumoto terrain height exaggeration to the supported range', () => {
    const selection = resolveGameSelection(
      {
        ...DEFAULT_GAME_SELECTION_IDS,
        worldId: 'matsumoto-real'
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
