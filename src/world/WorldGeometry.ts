export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

export interface Mountain {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly height: number;
}

export const RUNWAY = {
  minX: -220,
  maxX: 420,
  halfWidth: 12
} as const;

export const TRAINING_ISLAND_CENTER: WorldPoint = {
  x: 110,
  z: 0
};

export const TRAINING_ISLAND_OUTLINE: readonly WorldPoint[] = [
  { x: -360, z: -105 },
  { x: -325, z: -215 },
  { x: -220, z: -292 },
  { x: -70, z: -330 },
  { x: 82, z: -304 },
  { x: 205, z: -252 },
  { x: 330, z: -318 },
  { x: 458, z: -276 },
  { x: 555, z: -190 },
  { x: 505, z: -104 },
  { x: 592, z: -30 },
  { x: 558, z: 74 },
  { x: 610, z: 164 },
  { x: 505, z: 258 },
  { x: 365, z: 318 },
  { x: 236, z: 298 },
  { x: 122, z: 250 },
  { x: 14, z: 309 },
  { x: -142, z: 281 },
  { x: -278, z: 212 },
  { x: -352, z: 112 },
  { x: -326, z: 18 }
];

export const MOUNTAINS: readonly Mountain[] = [
  { x: 50, z: -180, radius: 42, height: 58 },
  { x: 190, z: 190, radius: 53, height: 72 },
  { x: 340, z: -210, radius: 39, height: 53 },
  { x: -120, z: 170, radius: 32, height: 43 }
];

export function isOnRunway(x: number, z: number): boolean {
  return x >= RUNWAY.minX && x <= RUNWAY.maxX && Math.abs(z) <= RUNWAY.halfWidth;
}

export function isInsideTrainingIsland(x: number, z: number): boolean {
  let inside = false;

  for (
    let currentIndex = 0, previousIndex = TRAINING_ISLAND_OUTLINE.length - 1;
    currentIndex < TRAINING_ISLAND_OUTLINE.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = TRAINING_ISLAND_OUTLINE[currentIndex]!;
    const previous = TRAINING_ISLAND_OUTLINE[previousIndex]!;

    const crossesHorizontalRay =
      current.z > z !== previous.z > z &&
      x <
        ((previous.x - current.x) * (z - current.z)) /
          (previous.z - current.z) +
          current.x;

    if (crossesHorizontalRay) {
      inside = !inside;
    }
  }

  return inside;
}

export function terrainHeightAt(x: number, z: number): number {
  let height = 0;

  for (const mountain of MOUNTAINS) {
    const distance = Math.hypot(x - mountain.x, z - mountain.z);
    if (distance >= mountain.radius) {
      continue;
    }

    const localHeight = mountain.height * (1 - distance / mountain.radius);
    height = Math.max(height, localHeight);
  }

  return height;
}
