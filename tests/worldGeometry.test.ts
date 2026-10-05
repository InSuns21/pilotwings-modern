import { describe, expect, it } from 'vitest';
import {
  MOUNTAINS,
  RUNWAY,
  isInsideTrainingIsland,
  isOnRunway,
  terrainHeightAt
} from '../src/world/WorldGeometry';

describe('training island geometry', () => {
  it('keeps the full runway on the island', () => {
    expect(isInsideTrainingIsland(RUNWAY.minX, 0)).toBe(true);
    expect(isInsideTrainingIsland(RUNWAY.maxX, 0)).toBe(true);
    expect(isOnRunway((RUNWAY.minX + RUNWAY.maxX) / 2, 0)).toBe(true);
  });

  it('distinguishes ocean from island terrain', () => {
    expect(isInsideTrainingIsland(0, 120)).toBe(true);
    expect(isInsideTrainingIsland(900, 0)).toBe(false);
  });

  it('uses the same mountain data for terrain height', () => {
    for (const mountain of MOUNTAINS) {
      expect(terrainHeightAt(mountain.x, mountain.z)).toBeCloseTo(
        mountain.height
      );
      expect(
        terrainHeightAt(mountain.x + mountain.radius, mountain.z)
      ).toBe(0);
    }
  });
});
