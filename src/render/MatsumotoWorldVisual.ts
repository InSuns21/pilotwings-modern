import * as THREE from 'three';
import {
  MATSUMOTO_RUNWAY,
  matsumotoPhotoTileUrl,
  matsumotoTerrainVertexAt,
  matsumotoTileFractionToWorld,
  matsumotoWorldToTileFraction,
  type MapTileCoordinate
} from '../world/MatsumotoWorld';
import type { MatsumotoWorldRuntime } from '../world/WorldRuntime';

export interface MatsumotoWorldVisual {
  readonly root: THREE.Group;
  update(x: number, z: number): void;
  dispose(): void;
}

export interface MatsumotoWorldVisualOptions {
  readonly enableDetailStreaming?: boolean;
  readonly maxAnisotropy?: number;
  readonly onVisualChange?: () => void;
}

interface ImageryLodConfig {
  readonly zoom: number;
  readonly radius: number;
  readonly segments: number;
  readonly lift: number;
}

interface ActiveImageryTile {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  readonly texture: THREE.Texture;
}

interface ImageryLodState {
  readonly config: ImageryLodConfig;
  readonly group: THREE.Group;
  readonly active: Map<string, ActiveImageryTile>;
  centerKey: string | null;
}

const TERRAIN_SEGMENTS = 64;
const IMAGERY_LODS: readonly ImageryLodConfig[] = [
  {
    zoom: 16,
    radius: 2,
    segments: 6,
    lift: 0.07
  },
  {
    zoom: 18,
    radius: 2,
    segments: 4,
    lift: 0.12
  }
];

export function createMatsumotoWorldVisual(
  runtime: MatsumotoWorldRuntime,
  options: MatsumotoWorldVisualOptions = {}
): MatsumotoWorldVisual {
  const root = new THREE.Group();
  root.name = 'matsumoto-real-world';

  const baseTextures = new Set<THREE.Texture>();
  const loader = new THREE.TextureLoader();
  const maxAnisotropy = Math.max(1, options.maxAnisotropy ?? 4);

  const underlay = new THREE.Mesh(
    new THREE.PlaneGeometry(16_000, 16_000),
    new THREE.MeshStandardMaterial({
      color: 0x566650,
      roughness: 1
    })
  );
  underlay.rotation.x = -Math.PI / 2;
  underlay.position.y = -320;
  underlay.receiveShadow = true;
  root.add(underlay);

  for (const tile of runtime.terrain.tiles) {
    const geometry = createTerrainGeometry(runtime, tile);
    const material = new THREE.MeshStandardMaterial({
      color: 0x71806e,
      roughness: 1,
      metalness: 0
    });
    const texture = loader.load(
      matsumotoPhotoTileUrl(tile, runtime.terrain.zoom),
      (loadedTexture) => {
        configurePhotoTexture(loadedTexture, maxAnisotropy);
        material.color.setHex(0xffffff);
        material.map = loadedTexture;
        material.needsUpdate = true;
        options.onVisualChange?.();
      },
      undefined,
      () => {
        options.onVisualChange?.();
      }
    );
    configurePhotoTexture(texture, maxAnisotropy);
    baseTextures.add(texture);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const runwayDetail = createRunwayDetail();
  root.add(runwayDetail);

  const lodStates: ImageryLodState[] =
    options.enableDetailStreaming === false
      ? []
      : IMAGERY_LODS.map((config) => {
          const group = new THREE.Group();
          group.name = `matsumoto-imagery-z${config.zoom}`;
          group.renderOrder = config.zoom;
          root.add(group);
          return {
            config,
            group,
            active: new Map<string, ActiveImageryTile>(),
            centerKey: null
          };
        });

  return {
    root,
    update(x: number, z: number): void {
      for (const state of lodStates) {
        updateImageryLod(
          runtime,
          loader,
          state,
          x,
          z,
          maxAnisotropy,
          options.onVisualChange
        );
      }
    },
    dispose(): void {
      root.removeFromParent();

      for (const state of lodStates) {
        disposeImageryLod(state);
      }
      disposeObject(root);

      for (const texture of baseTextures) {
        texture.dispose();
      }
    }
  };
}

function createTerrainGeometry(
  runtime: MatsumotoWorldRuntime,
  tile: MatsumotoWorldRuntime['terrain']['tiles'][number]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= TERRAIN_SEGMENTS; row += 1) {
    const v = row / TERRAIN_SEGMENTS;
    for (let column = 0; column <= TERRAIN_SEGMENTS; column += 1) {
      const u = column / TERRAIN_SEGMENTS;
      const point = matsumotoTerrainVertexAt(runtime.terrain, tile, u, v);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, 1 - v);
    }
  }

  buildGridIndices(indices, TERRAIN_SEGMENTS);
  return createGeometry(positions, uvs, indices);
}

function updateImageryLod(
  runtime: MatsumotoWorldRuntime,
  loader: THREE.TextureLoader,
  state: ImageryLodState,
  worldX: number,
  worldZ: number,
  maxAnisotropy: number
): void {
  const center = matsumotoWorldToTileFraction(
    worldX,
    worldZ,
    state.config.zoom
  );
  const centerX = Math.floor(center.x);
  const centerY = Math.floor(center.y);
  const centerKey = `${centerX}/${centerY}`;

  if (state.centerKey === centerKey) {
    return;
  }
  state.centerKey = centerKey;

  const required = new Map<string, MapTileCoordinate>();
  for (
    let offsetY = -state.config.radius;
    offsetY <= state.config.radius;
    offsetY += 1
  ) {
    for (
      let offsetX = -state.config.radius;
      offsetX <= state.config.radius;
      offsetX += 1
    ) {
      const tile = {
        x: centerX + offsetX,
        y: centerY + offsetY
      };
      required.set(imageryTileKey(tile.x, tile.y), tile);
    }
  }

  for (const [key, active] of state.active) {
    if (required.has(key)) {
      continue;
    }

    state.group.remove(active.mesh);
    active.mesh.geometry.dispose();
    active.mesh.material.dispose();
    active.texture.dispose();
    state.active.delete(key);
  }

  for (const [key, tile] of required) {
    if (state.active.has(key)) {
      continue;
    }

    const active = createImageryTile(
      runtime,
      loader,
      tile,
      state.config,
      maxAnisotropy
    );
    state.active.set(key, active);
    state.group.add(active.mesh);
  }
}

function createImageryTile(
  runtime: MatsumotoWorldRuntime,
  loader: THREE.TextureLoader,
  tile: MapTileCoordinate,
  config: ImageryLodConfig,
  maxAnisotropy: number,
  onVisualChange?: () => void
): ActiveImageryTile {
  const geometry = createImageryGeometry(
    runtime,
    tile,
    config.zoom,
    config.segments,
    config.lift
  );
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4 - config.zoom,
    polygonOffsetUnits: -1
  });
  const texture = loader.load(
    matsumotoPhotoTileUrl(tile, config.zoom),
    (loadedTexture) => {
      configurePhotoTexture(loadedTexture, maxAnisotropy);
      material.map = loadedTexture;
      material.opacity = 1;
      material.needsUpdate = true;
      onVisualChange?.();
    },
    undefined,
    () => {
      material.opacity = 0;
      material.needsUpdate = true;
      onVisualChange?.();
    }
  );
  configurePhotoTexture(texture, maxAnisotropy);
  material.map = texture;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.renderOrder = config.zoom;

  return {
    mesh,
    texture
  };
}

function createImageryGeometry(
  runtime: MatsumotoWorldRuntime,
  tile: MapTileCoordinate,
  zoom: number,
  segments: number,
  lift: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= segments; row += 1) {
    const v = row / segments;
    for (let column = 0; column <= segments; column += 1) {
      const u = column / segments;
      const local = matsumotoTileFractionToWorld(
        tile.x + u,
        tile.y + v,
        zoom
      );
      positions.push(
        local.x,
        runtime.terrainHeightAt(local.x, local.z) + lift,
        local.z
      );
      uvs.push(u, 1 - v);
    }
  }

  buildGridIndices(indices, segments);
  return createGeometry(positions, uvs, indices);
}

function createRunwayDetail(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'matsumoto-runway-detail';

  const pavementMaterial = new THREE.MeshStandardMaterial({
    color: 0x262b2d,
    transparent: true,
    opacity: 0.16,
    roughness: 0.98,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -12
  });
  addRunwayRectangle(
    group,
    MATSUMOTO_RUNWAY.length,
    MATSUMOTO_RUNWAY.width,
    0,
    0,
    0.15,
    pavementMaterial
  );

  const markingMaterial = new THREE.MeshBasicMaterial({
    color: 0xf2f2ed,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -16
  });

  addRunwayRectangle(
    group,
    MATSUMOTO_RUNWAY.length - 34,
    0.48,
    0,
    MATSUMOTO_RUNWAY.halfWidth - 0.72,
    0.19,
    markingMaterial
  );
  addRunwayRectangle(
    group,
    MATSUMOTO_RUNWAY.length - 34,
    0.48,
    0,
    -MATSUMOTO_RUNWAY.halfWidth + 0.72,
    0.19,
    markingMaterial
  );

  for (let x = -840; x <= 840; x += 60) {
    addRunwayRectangle(group, 30, 0.9, x, 0, 0.2, markingMaterial);
  }

  const thresholdOffsets = [-15.75, -11.25, -6.75, -2.25, 2.25, 6.75, 11.25, 15.75];
  for (const z of thresholdOffsets) {
    addRunwayRectangle(group, 30, 1.75, -955, z, 0.205, markingMaterial);
    addRunwayRectangle(group, 30, 1.75, 955, z, 0.205, markingMaterial);
  }

  addRunwayRectangle(group, 1.2, 42, -982, 0, 0.21, markingMaterial);
  addRunwayRectangle(group, 1.2, 42, 982, 0, 0.21, markingMaterial);

  return group;
}

function addRunwayRectangle(
  group: THREE.Group,
  alongRunway: number,
  acrossRunway: number,
  x: number,
  z: number,
  y: number,
  material: THREE.Material
): void {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(alongRunway, acrossRunway),
    material
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 40;
  group.add(mesh);
}

function buildGridIndices(indices: number[], segments: number): void {
  const rowLength = segments + 1;
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = row * rowLength + column;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
}

function createGeometry(
  positions: number[],
  uvs: number[],
  indices: number[]
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function configurePhotoTexture(
  texture: THREE.Texture,
  maxAnisotropy: number
): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = maxAnisotropy;
}

function disposeImageryLod(state: ImageryLodState): void {
  for (const active of state.active.values()) {
    state.group.remove(active.mesh);
    active.mesh.geometry.dispose();
    active.mesh.material.dispose();
    active.texture.dispose();
  }
  state.active.clear();
}

function imageryTileKey(x: number, y: number): string {
  return `${x}/${y}`;
}

function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of meshMaterials) {
      materials.add(material);
    }
  });

  for (const geometry of geometries) {
    geometry.dispose();
  }
  for (const material of materials) {
    material.dispose();
  }
}
