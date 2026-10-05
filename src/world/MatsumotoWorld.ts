export interface GeographicPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface WorldPoint3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MatsumotoTerrainTile {
  readonly x: number;
  readonly y: number;
  readonly elevations: Float32Array;
}

export interface MatsumotoTerrainDataset {
  readonly zoom: number;
  readonly tileRadius: number;
  readonly heightExaggeration: number;
  readonly tiles: readonly MatsumotoTerrainTile[];
  readonly tileMap: ReadonlyMap<string, MatsumotoTerrainTile>;
}

export const MATSUMOTO_REFERENCE_ELEVATION_M = 657.5;
export const MATSUMOTO_TERRAIN_ZOOM = 14;
export const MATSUMOTO_ATTRIBUTION =
  '地形・航空写真: 国土地理院（地理院タイル）';

export const MATSUMOTO_HEIGHT_EXAGGERATION = {
  min: 1,
  max: 3,
  step: 0.25,
  default: 1.5
} as const;

export const MATSUMOTO_RUNWAY = {
  designation: '18/36',
  length: 2000,
  width: 45,
  halfLength: 1000,
  halfWidth: 22.5,
  trueBearingDegrees: 171.24,
  runway18Threshold: {
    latitude: 36.17565833333333,
    longitude: 137.9209361111111
  },
  runway36Threshold: {
    latitude: 36.15785833333333,
    longitude: 137.92440277777777
  }
} as const;

export const MATSUMOTO_ORIGIN: GeographicPoint = {
  latitude:
    (MATSUMOTO_RUNWAY.runway18Threshold.latitude +
      MATSUMOTO_RUNWAY.runway36Threshold.latitude) /
    2,
  longitude:
    (MATSUMOTO_RUNWAY.runway18Threshold.longitude +
      MATSUMOTO_RUNWAY.runway36Threshold.longitude) /
    2
};

const EARTH_RADIUS_M = 6_378_137;
const TILE_SIZE = 256;
const DEM_NO_DATA = 2 ** 23;

export function clampMatsumotoHeightExaggeration(value: number): number {
  const safeValue = Number.isFinite(value)
    ? value
    : MATSUMOTO_HEIGHT_EXAGGERATION.default;
  return Math.max(
    MATSUMOTO_HEIGHT_EXAGGERATION.min,
    Math.min(MATSUMOTO_HEIGHT_EXAGGERATION.max, safeValue)
  );
}

export function geographicToMatsumotoWorld(
  latitude: number,
  longitude: number
): { readonly x: number; readonly z: number } {
  const originLatitudeRadians = degreesToRadians(MATSUMOTO_ORIGIN.latitude);
  const east =
    degreesToRadians(longitude - MATSUMOTO_ORIGIN.longitude) *
    EARTH_RADIUS_M *
    Math.cos(originLatitudeRadians);
  const north =
    degreesToRadians(latitude - MATSUMOTO_ORIGIN.latitude) * EARTH_RADIUS_M;
  const bearing = degreesToRadians(MATSUMOTO_RUNWAY.trueBearingDegrees);

  return {
    x: east * Math.sin(bearing) + north * Math.cos(bearing),
    z: east * Math.cos(bearing) - north * Math.sin(bearing)
  };
}

export function matsumotoWorldToGeographic(
  x: number,
  z: number
): GeographicPoint {
  const bearing = degreesToRadians(MATSUMOTO_RUNWAY.trueBearingDegrees);
  const east = x * Math.sin(bearing) + z * Math.cos(bearing);
  const north = x * Math.cos(bearing) - z * Math.sin(bearing);
  const originLatitudeRadians = degreesToRadians(MATSUMOTO_ORIGIN.latitude);

  return {
    latitude:
      MATSUMOTO_ORIGIN.latitude +
      radiansToDegrees(north / EARTH_RADIUS_M),
    longitude:
      MATSUMOTO_ORIGIN.longitude +
      radiansToDegrees(
        east / (EARTH_RADIUS_M * Math.cos(originLatitudeRadians))
      )
  };
}

export function decodeDemRgb(
  red: number,
  green: number,
  blue: number
): number {
  const encoded = red * 65536 + green * 256 + blue;
  if (encoded === DEM_NO_DATA) {
    return Number.NaN;
  }

  return encoded < DEM_NO_DATA
    ? encoded * 0.01
    : (encoded - 2 ** 24) * 0.01;
}

export async function loadMatsumotoTerrain(
  heightExaggeration: number,
  tileRadius = 2
): Promise<MatsumotoTerrainDataset> {
  const zoom = MATSUMOTO_TERRAIN_ZOOM;
  const center = geographicToTileFraction(
    MATSUMOTO_ORIGIN.latitude,
    MATSUMOTO_ORIGIN.longitude,
    zoom
  );
  const centerX = Math.floor(center.x);
  const centerY = Math.floor(center.y);
  const coordinates: Array<{ readonly x: number; readonly y: number }> = [];

  for (let offsetY = -tileRadius; offsetY <= tileRadius; offsetY += 1) {
    for (let offsetX = -tileRadius; offsetX <= tileRadius; offsetX += 1) {
      coordinates.push({
        x: centerX + offsetX,
        y: centerY + offsetY
      });
    }
  }

  const tiles = await Promise.all(
    coordinates.map(async ({ x, y }) => ({
      x,
      y,
      elevations: await loadDemElevations(zoom, x, y)
    }))
  );
  const tileMap = new Map(
    tiles.map((tile) => [terrainTileKey(tile.x, tile.y), tile] as const)
  );

  return {
    zoom,
    tileRadius,
    heightExaggeration:
      clampMatsumotoHeightExaggeration(heightExaggeration),
    tiles,
    tileMap
  };
}

export function matsumotoTerrainHeightAt(
  dataset: MatsumotoTerrainDataset,
  x: number,
  z: number
): number {
  const geographic = matsumotoWorldToGeographic(x, z);
  const tile = geographicToTileFraction(
    geographic.latitude,
    geographic.longitude,
    dataset.zoom
  );
  const tileX = Math.floor(tile.x);
  const tileY = Math.floor(tile.y);
  const data = dataset.tileMap.get(terrainTileKey(tileX, tileY));

  if (!data) {
    return 0;
  }

  const elevation = sampleElevation(
    data.elevations,
    tile.x - tileX,
    tile.y - tileY
  );

  return worldHeightFromElevation(
    elevation,
    x,
    z,
    dataset.heightExaggeration
  );
}

export function matsumotoTerrainVertexAt(
  dataset: MatsumotoTerrainDataset,
  tile: MatsumotoTerrainTile,
  u: number,
  v: number
): WorldPoint3 {
  const geographic = tileFractionToGeographic(
    tile.x + u,
    tile.y + v,
    dataset.zoom
  );
  const local = geographicToMatsumotoWorld(
    geographic.latitude,
    geographic.longitude
  );
  const elevation = sampleElevation(tile.elevations, u, v);

  return {
    x: local.x,
    y: worldHeightFromElevation(
      elevation,
      local.x,
      local.z,
      dataset.heightExaggeration
    ),
    z: local.z
  };
}

export function matsumotoPhotoTileUrl(
  tile: Pick<MatsumotoTerrainTile, 'x' | 'y'>,
  zoom = MATSUMOTO_TERRAIN_ZOOM
): string {
  return `https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/${zoom}/${tile.x}/${tile.y}.jpg`;
}

function worldHeightFromElevation(
  elevation: number,
  x: number,
  z: number,
  heightExaggeration: number
): number {
  const rawRelative = Number.isFinite(elevation)
    ? elevation - MATSUMOTO_REFERENCE_ELEVATION_M
    : 0;
  const distanceFromRunway = distanceOutsideRunway(x, z);
  const terrainBlend = smoothStep(20, 180, distanceFromRunway);

  return rawRelative * terrainBlend * heightExaggeration;
}

function distanceOutsideRunway(x: number, z: number): number {
  const dx = Math.max(0, Math.abs(x) - MATSUMOTO_RUNWAY.halfLength);
  const dz = Math.max(0, Math.abs(z) - MATSUMOTO_RUNWAY.halfWidth);
  return Math.hypot(dx, dz);
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

async function loadDemElevations(
  zoom: number,
  x: number,
  y: number
): Promise<Float32Array> {
  const primary = await tryLoadDemLayer('dem5a_png', zoom, x, y);
  if (primary && !containsNoData(primary)) {
    return primary;
  }

  const fallback = await tryLoadDemLayer('dem_png', zoom, x, y);
  if (!primary && fallback) {
    return fallback;
  }
  if (primary && fallback) {
    const merged = primary.slice();
    for (let index = 0; index < merged.length; index += 1) {
      if (Number.isNaN(merged[index])) {
        merged[index] =
          fallback[index] ?? MATSUMOTO_REFERENCE_ELEVATION_M;
      }
    }
    return merged;
  }
  if (primary) {
    replaceNoData(primary);
    return primary;
  }

  return new Float32Array(TILE_SIZE * TILE_SIZE).fill(
    MATSUMOTO_REFERENCE_ELEVATION_M
  );
}

async function tryLoadDemLayer(
  layer: string,
  zoom: number,
  x: number,
  y: number
): Promise<Float32Array | null> {
  try {
    const response = await fetch(
      `https://cyberjapandata.gsi.go.jp/xyz/${layer}/${zoom}/${x}/${y}.png`
    );
    if (!response.ok) {
      return null;
    }

    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      return null;
    }

    context.drawImage(bitmap, 0, 0, TILE_SIZE, TILE_SIZE);
    bitmap.close();
    const pixels = context.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    const elevations = new Float32Array(TILE_SIZE * TILE_SIZE);

    for (let index = 0; index < elevations.length; index += 1) {
      const offset = index * 4;
      elevations[index] = decodeDemRgb(
        pixels[offset]!,
        pixels[offset + 1]!,
        pixels[offset + 2]!
      );
    }

    return elevations;
  } catch {
    return null;
  }
}

function sampleElevation(
  elevations: Float32Array,
  u: number,
  v: number
): number {
  const pixelX = Math.max(0, Math.min(TILE_SIZE - 1, u * (TILE_SIZE - 1)));
  const pixelY = Math.max(0, Math.min(TILE_SIZE - 1, v * (TILE_SIZE - 1)));
  const x0 = Math.floor(pixelX);
  const y0 = Math.floor(pixelY);
  const x1 = Math.min(TILE_SIZE - 1, x0 + 1);
  const y1 = Math.min(TILE_SIZE - 1, y0 + 1);
  const tx = pixelX - x0;
  const ty = pixelY - y0;

  const a = validElevation(elevations[y0 * TILE_SIZE + x0]);
  const b = validElevation(elevations[y0 * TILE_SIZE + x1]);
  const c = validElevation(elevations[y1 * TILE_SIZE + x0]);
  const d = validElevation(elevations[y1 * TILE_SIZE + x1]);

  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function validElevation(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value)
    ? value
    : MATSUMOTO_REFERENCE_ELEVATION_M;
}

function containsNoData(elevations: Float32Array): boolean {
  for (const elevation of elevations) {
    if (!Number.isFinite(elevation)) {
      return true;
    }
  }
  return false;
}

function replaceNoData(elevations: Float32Array): void {
  for (let index = 0; index < elevations.length; index += 1) {
    if (!Number.isFinite(elevations[index])) {
      elevations[index] = MATSUMOTO_REFERENCE_ELEVATION_M;
    }
  }
}

function geographicToTileFraction(
  latitude: number,
  longitude: number,
  zoom: number
): { readonly x: number; readonly y: number } {
  const scale = 2 ** zoom;
  const latitudeRadians = degreesToRadians(
    Math.max(-85.05112878, Math.min(85.05112878, latitude))
  );

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      ((1 -
        Math.asinh(Math.tan(latitudeRadians)) / Math.PI) /
        2) *
      scale
  };
}

function tileFractionToGeographic(
  x: number,
  y: number,
  zoom: number
): GeographicPoint {
  const scale = 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const mercator = Math.PI * (1 - (2 * y) / scale);

  return {
    latitude: radiansToDegrees(Math.atan(Math.sinh(mercator))),
    longitude
  };
}

function terrainTileKey(x: number, y: number): string {
  return `${x}/${y}`;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
