import * as THREE from 'three';
import {
  MATSUMOTO_RUNWAY,
  matsumotoPhotoTileUrl,
  matsumotoTerrainVertexAt
} from '../world/MatsumotoWorld';
import type { MatsumotoWorldRuntime } from '../world/WorldRuntime';

export interface MatsumotoWorldVisual {
  readonly root: THREE.Group;
  dispose(): void;
}

const TERRAIN_SEGMENTS = 24;

export function createMatsumotoWorldVisual(
  runtime: MatsumotoWorldRuntime
): MatsumotoWorldVisual {
  const root = new THREE.Group();
  root.name = 'matsumoto-real-world';

  const textures = new Set<THREE.Texture>();
  const loader = new THREE.TextureLoader();

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
    const texture = loader.load(matsumotoPhotoTileUrl(tile, runtime.terrain.zoom));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.add(texture);

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 1,
      metalness: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const runwayAlignment = new THREE.Mesh(
    new THREE.PlaneGeometry(MATSUMOTO_RUNWAY.length, MATSUMOTO_RUNWAY.width),
    new THREE.MeshStandardMaterial({
      color: 0x222a31,
      transparent: true,
      opacity: 0.09,
      roughness: 0.96,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    })
  );
  runwayAlignment.rotation.x = -Math.PI / 2;
  runwayAlignment.position.y = 0.045;
  root.add(runwayAlignment);

  return {
    root,
    dispose(): void {
      root.removeFromParent();
      disposeObject(root);
      for (const texture of textures) {
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

  const rowLength = TERRAIN_SEGMENTS + 1;
  for (let row = 0; row < TERRAIN_SEGMENTS; row += 1) {
    for (let column = 0; column < TERRAIN_SEGMENTS; column += 1) {
      const a = row * rowLength + column;
      const b = a + 1;
      const c = a + rowLength;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

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
