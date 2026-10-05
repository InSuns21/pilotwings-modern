export type WorldId = 'training-island' | 'matsumoto-real';
export type AircraftId = 'trainer-01';
export type TaskId = 'ring-training';

export interface CatalogOption<Id extends string> {
  readonly id: Id;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
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
  readonly task: CatalogOption<TaskId>;
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

export const TASKS: readonly CatalogOption<TaskId>[] = [
  {
    id: 'ring-training',
    name: 'リング・トレーニング',
    subtitle: 'TAKEOFF / RINGS / LANDING',
    description: '滑走路から離陸し、3つのリングを通過して指定ゾーンへ安全に着陸します。'
  }
];

export const DEFAULT_GAME_SELECTION_IDS: GameSelectionIds = {
  worldId: 'training-island',
  aircraftId: 'trainer-01',
  taskId: 'ring-training'
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  heightExaggeration: 1.5
};

export function resolveGameSelection(
  ids: GameSelectionIds = DEFAULT_GAME_SELECTION_IDS,
  worldSettings: WorldSettings = DEFAULT_WORLD_SETTINGS
): GameSelection {
  const world = requireOption(WORLDS, ids.worldId, 'world');
  return {
    world,
    aircraft: requireOption(AIRCRAFT, ids.aircraftId, 'aircraft'),
    task: requireOption(TASKS, ids.taskId, 'task'),
    worldSettings: {
      heightExaggeration:
        world.id === 'matsumoto-real'
          ? Math.max(1, Math.min(3, worldSettings.heightExaggeration))
          : 1
    }
  };
}

function requireOption<Id extends string>(
  options: readonly CatalogOption<Id>[],
  id: Id,
  kind: string
): CatalogOption<Id> {
  const option = options.find((candidate) => candidate.id === id);
  if (!option) {
    throw new Error(`Unknown ${kind}: ${id}`);
  }
  return option;
}
