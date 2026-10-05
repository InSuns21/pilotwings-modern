import type { WorldId, WorldSettings } from '../game/GameCatalog';
import {
  isInsideTrainingIsland,
  isOnRunway as isOnTrainingRunway,
  terrainHeightAt as trainingTerrainHeightAt
} from './WorldGeometry';
import {
  MATSUMOTO_ATTRIBUTION,
  MATSUMOTO_RUNWAY,
  loadMatsumotoTerrain,
  matsumotoTerrainHeightAt,
  type MatsumotoTerrainDataset
} from './MatsumotoWorld';

export type WorldSurface = 'ground' | 'water';

export interface WorldRuntimeBase {
  readonly id: WorldId;
  readonly attribution: string | null;
  terrainHeightAt(x: number, z: number): number;
  isOnRunway(x: number, z: number): boolean;
  surfaceAt(x: number, z: number): WorldSurface;
}

export interface TrainingIslandWorldRuntime extends WorldRuntimeBase {
  readonly id: 'training-island';
}

export interface MatsumotoWorldRuntime extends WorldRuntimeBase {
  readonly id: 'matsumoto-real';
  readonly terrain: MatsumotoTerrainDataset;
}

export type WorldRuntime =
  | TrainingIslandWorldRuntime
  | MatsumotoWorldRuntime;

export interface WorldRuntimeLoadOptions {
  readonly tileRadius?: number;
}

export async function createWorldRuntime(
  worldId: WorldId,
  settings: WorldSettings,
  options: WorldRuntimeLoadOptions = {}
): Promise<WorldRuntime> {
  switch (worldId) {
    case 'training-island':
      return {
        id: worldId,
        attribution: null,
        terrainHeightAt: trainingTerrainHeightAt,
        isOnRunway: isOnTrainingRunway,
        surfaceAt(x: number, z: number): WorldSurface {
          return isInsideTrainingIsland(x, z) ? 'ground' : 'water';
        }
      };

    case 'matsumoto-real': {
      const terrain = await loadMatsumotoTerrain(
        settings.heightExaggeration,
        options.tileRadius ?? 2
      );

      return {
        id: worldId,
        terrain,
        attribution: MATSUMOTO_ATTRIBUTION,
        terrainHeightAt(x: number, z: number): number {
          return matsumotoTerrainHeightAt(terrain, x, z);
        },
        isOnRunway(x: number, z: number): boolean {
          return (
            Math.abs(x) <= MATSUMOTO_RUNWAY.halfLength &&
            Math.abs(z) <= MATSUMOTO_RUNWAY.halfWidth
          );
        },
        surfaceAt(): WorldSurface {
          return 'ground';
        }
      };
    }
  }
}
