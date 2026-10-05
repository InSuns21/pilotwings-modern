export type WorldId = 'training-island';
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

export interface GameSelection {
  readonly world: CatalogOption<WorldId>;
  readonly aircraft: CatalogOption<AircraftId>;
  readonly task: CatalogOption<TaskId>;
}

export const WORLDS: readonly CatalogOption<WorldId>[] = [
  {
    id: 'training-island',
    name: 'トレーニング・アイランド',
    subtitle: 'TRAINING ISLAND',
    description: '滑走路、草地、低い山で構成された基本訓練用ワールド。'
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

export function resolveGameSelection(
  ids: GameSelectionIds = DEFAULT_GAME_SELECTION_IDS
): GameSelection {
  return {
    world: requireOption(WORLDS, ids.worldId, 'world'),
    aircraft: requireOption(AIRCRAFT, ids.aircraftId, 'aircraft'),
    task: requireOption(TASKS, ids.taskId, 'task')
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
