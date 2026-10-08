export type WorldId = 'training-island' | 'matsumoto-real';
export type AircraftId = 'trainer-01';
export type TaskId = 'island-flight-basics' | 'matsumoto-pattern-training' | 'island-ground-targets';

export interface CatalogOption<Id extends string> {
  readonly id: Id;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
}

export interface TaskCatalogOption extends CatalogOption<TaskId> {
  readonly worldIds: readonly WorldId[];
  readonly aircraftIds: readonly AircraftId[];
}

export interface GameSelectionIds {
  readonly worldId: WorldId;
  readonly aircraftId: AircraftId;
  readonly taskId: TaskId;
}

export interface WorldSettings {
  readonly heightExaggeration: number;
}

export interface GameSelection {
  readonly world: CatalogOption<WorldId>;
  readonly aircraft: CatalogOption<AircraftId>;
  readonly task: TaskCatalogOption;
  readonly worldSettings: WorldSettings;
}

export const WORLDS: readonly CatalogOption<WorldId>[] = [
  {
    id: 'training-island',
    name: 'トレーニング・アイランド',
    subtitle: 'TRAINING ISLAND',
    description: '海岸線、丘陵、空港、集落、マリーナを備えた沿岸型の基本訓練ワールド。'
  },
  {
    id: 'matsumoto-real',
    name: '松本リアル・テレイン',
    subtitle: 'MATSUMOTO / GSI',
    description: '地理院の航空写真タイルとDEMで、実在の松本空港と周辺地形を再構成するリアル地形ワールド。'
  }
];

export const AIRCRAFT: readonly CatalogOption<AircraftId>[] = [
  {
    id: 'trainer-01',
    name: 'TR-01 練習機',
    subtitle: 'LIGHT TRAINER',
    description: '安定性を重視した単発プロペラ練習機。失速・滑空・フレアを練習できます。'
  }
];

export const TASKS: readonly TaskCatalogOption[] = [
  {
    id: 'island-flight-basics',
    name: '基礎操縦サーキット',
    subtitle: 'CLIMB / LEVEL / BANK / APPROACH',
    description: '8リングで離陸上昇、水平化、旋回、高度維持、降下、最終進入を順番に練習します。',
    worldIds: ['training-island'],
    aircraftIds: ['trainer-01']
  },
  {
    id: 'island-ground-targets',
    name: '地上ターゲット射撃訓練',
    subtitle: 'AIM / FIRE / TURN / REATTACK',
    description: '離陸後、地上の3標的を順番に狙う。機首の照準、高度管理、旋回、再進入を練習します。',
    worldIds: ['training-island'],
    aircraftIds: ['trainer-01']
  },
  {
    id: 'matsumoto-pattern-training',
    name: '松本パターン訓練',
    subtitle: 'CLIMB / PATTERN / DESCENT / FINAL',
    description: '松本空港のスケールに合わせ、8リングの周回経路で上昇・旋回・降下・滑走路への再進入を練習します。',
    worldIds: ['matsumoto-real'],
    aircraftIds: ['trainer-01']
  }
];

export const DEFAULT_GAME_SELECTION_IDS: GameSelectionIds = {
  worldId: 'training-island',
  aircraftId: 'trainer-01',
  taskId: 'island-flight-basics'
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  heightExaggeration: 1.5
};

export function getAvailableTasks(
  worldId: WorldId,
  aircraftId: AircraftId
): readonly TaskCatalogOption[] {
  return TASKS.filter(
    (task) =>
      task.worldIds.includes(worldId) &&
      task.aircraftIds.includes(aircraftId)
  );
}

export function resolveGameSelection(
  ids: GameSelectionIds = DEFAULT_GAME_SELECTION_IDS,
  worldSettings: WorldSettings = DEFAULT_WORLD_SETTINGS
): GameSelection {
  const world = requireOption(WORLDS, ids.worldId, 'world');
  const aircraft = requireOption(AIRCRAFT, ids.aircraftId, 'aircraft');
  const task = requireOption(TASKS, ids.taskId, 'task');

  if (
    !task.worldIds.includes(world.id) ||
    !task.aircraftIds.includes(aircraft.id)
  ) {
    throw new Error(
      `Task ${task.id} is not available for world ${world.id} and aircraft ${aircraft.id}`
    );
  }

  return {
    world,
    aircraft,
    task,
    worldSettings: {
      heightExaggeration:
        world.id === 'matsumoto-real'
          ? Math.max(1, Math.min(3, worldSettings.heightExaggeration))
          : 1
    }
  };
}

function requireOption<Id extends string, Option extends CatalogOption<Id>>(
  options: readonly Option[],
  id: Id,
  kind: string
): Option {
  const option = options.find((candidate) => candidate.id === id);
  if (!option) {
    throw new Error(`Unknown ${kind}: ${id}`);
  }
  return option;
}
