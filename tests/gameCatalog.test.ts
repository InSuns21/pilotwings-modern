import { describe, expect, it } from 'vitest';
import {
  AIRCRAFT,
  DEFAULT_GAME_SELECTION_IDS,
  TASKS,
  WORLDS,
  resolveGameSelection
} from '../src/game/GameCatalog';

describe('game catalog', () => {
  it('provides one selectable world, aircraft, and task in the initial catalog', () => {
    expect(WORLDS).toHaveLength(1);
    expect(AIRCRAFT).toHaveLength(1);
    expect(TASKS).toHaveLength(1);
  });

  it('resolves the default start-screen selection', () => {
    const selection = resolveGameSelection();

    expect(selection.world.id).toBe(DEFAULT_GAME_SELECTION_IDS.worldId);
    expect(selection.aircraft.id).toBe(DEFAULT_GAME_SELECTION_IDS.aircraftId);
    expect(selection.task.id).toBe(DEFAULT_GAME_SELECTION_IDS.taskId);
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
