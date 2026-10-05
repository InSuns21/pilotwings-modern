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

export const MOUNTAINS: readonly Mountain[] = [
  { x: 50, z: -180, radius: 42, height: 58 },
  { x: 190, z: 190, radius: 53, height: 72 },
  { x: 340, z: -210, radius: 39, height: 53 },
  { x: -120, z: 170, radius: 32, height: 43 }
];

export function isOnRunway(x: number, z: number): boolean {
  return x >= RUNWAY.minX && x <= RUNWAY.maxX && Math.abs(z) <= RUNWAY.halfWidth;
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
