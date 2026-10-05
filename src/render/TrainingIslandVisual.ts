import * as THREE from 'three';
import {
  MOUNTAINS,
  RUNWAY,
  TRAINING_ISLAND_CENTER,
  TRAINING_ISLAND_OUTLINE,
  type WorldPoint
} from '../world/WorldGeometry';

export interface TrainingIslandVisual {
  readonly root: THREE.Group;
  dispose(): void;
}

const COLORS = {
  ocean: 0x5babc9,
  beach: 0xdac78f,
  grass: 0x6f9855,
  meadow: 0x82a961,
  forest: 0x496f42,
  road: 0x8b8174,
  runway: 0x363b42,
  runwayMarking: 0xf4f0dc,
  roof: 0xc95f4b,
  wall: 0xf2e7cf,
  glass: 0x6ca8c3,
  pier: 0x9c7b58,
  trunk: 0x745337,
  tree: 0x3f7445
} as const;

export function createTrainingIslandVisual(): TrainingIslandVisual {
  const root = new THREE.Group();
  root.name = 'training-island';

  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.ocean,
    roughness: 0.72,
    metalness: 0.05
  });
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(2200, 1600),
    oceanMaterial
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(TRAINING_ISLAND_CENTER.x, -1.4, TRAINING_ISLAND_CENTER.z);
  ocean.receiveShadow = true;
  root.add(ocean);

  const beach = createIslandSurface(
    TRAINING_ISLAND_OUTLINE,
    1,
    -0.18,
    new THREE.MeshStandardMaterial({
      color: COLORS.beach,
      roughness: 1
    })
  );
  beach.name = 'island-beach';
  root.add(beach);

  const grass = createIslandSurface(
    TRAINING_ISLAND_OUTLINE,
    0.958,
    0,
    new THREE.MeshStandardMaterial({
      color: COLORS.grass,
      roughness: 1
    })
  );
  grass.name = 'island-grass';
  root.add(grass);

  addMeadowPatch(root, 40, -155, 116, 62, -0.18);
  addMeadowPatch(root, 185, 165, 112, 58, 0.25);
  addMeadowPatch(root, 350, -195, 86, 52, -0.35);
  addMeadowPatch(root, -145, 155, 72, 45, 0.08);

  addRoad(
    root,
    [
      { x: -155, z: -35 },
      { x: -30, z: -38 },
      { x: 95, z: -55 },
      { x: 180, z: 20 },
      { x: 285, z: 92 },
      { x: 380, z: 118 }
    ],
    6.2
  );
  addRoad(
    root,
    [
      { x: 145, z: -60 },
      { x: 245, z: -108 },
      { x: 345, z: -158 },
      { x: 430, z: -176 }
    ],
    4.6
  );

  addRunway(root);
  addAirportBuildings(root);
  addTown(root);
  addMarina(root);
  addLighthouse(root);

  for (const mountain of MOUNTAINS) {
    const geometry = new THREE.ConeGeometry(
      mountain.radius,
      mountain.height,
      14,
      4
    );
    applyHillVertexColors(geometry, mountain.height);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true
    });
    const hill = new THREE.Mesh(geometry, material);
    hill.position.set(mountain.x, mountain.height / 2, mountain.z);
    hill.castShadow = true;
    hill.receiveShadow = true;
    root.add(hill);

    addTreeCluster(root, mountain.x, mountain.z, mountain.radius, 8);
  }

  return {
    root,
    dispose(): void {
      root.removeFromParent();
      disposeObject(root);
    }
  };
}

function createIslandSurface(
  points: readonly WorldPoint[],
  scale: number,
  y: number,
  material: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  const scaled = points.map((point) => ({
    x: TRAINING_ISLAND_CENTER.x + (point.x - TRAINING_ISLAND_CENTER.x) * scale,
    z: TRAINING_ISLAND_CENTER.z + (point.z - TRAINING_ISLAND_CENTER.z) * scale
  }));

  const first = scaled[0];
  if (!first) {
    throw new Error('Training island outline must contain at least one point');
  }

  shape.moveTo(first.x, -first.z);
  for (let index = 1; index < scaled.length; index += 1) {
    const point = scaled[index]!;
    shape.lineTo(point.x, -point.z);
  }
  shape.closePath();

  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function addMeadowPatch(
  root: THREE.Group,
  x: number,
  z: number,
  radiusX: number,
  radiusZ: number,
  rotation: number
): void {
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.meadow,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 32), material);
  patch.scale.set(radiusX, radiusZ, 1);
  patch.rotation.x = -Math.PI / 2;
  patch.rotation.z = rotation;
  patch.position.set(x, 0.035, z);
  patch.receiveShadow = true;
  root.add(patch);
}

function addRunway(root: THREE.Group): void {
  const runwayLength = RUNWAY.maxX - RUNWAY.minX;
  const runway = new THREE.Mesh(
    new THREE.BoxGeometry(runwayLength, 0.12, RUNWAY.halfWidth * 2),
    new THREE.MeshStandardMaterial({
      color: COLORS.runway,
      roughness: 0.97
    })
  );
  runway.position.set((RUNWAY.minX + RUNWAY.maxX) / 2, 0.08, 0);
  runway.receiveShadow = true;
  root.add(runway);

  const shoulderMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9d7ce,
    roughness: 0.92
  });
  for (const z of [-RUNWAY.halfWidth - 0.85, RUNWAY.halfWidth + 0.85]) {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(runwayLength, 0.06, 1.4),
      shoulderMaterial
    );
    shoulder.position.set((RUNWAY.minX + RUNWAY.maxX) / 2, 0.16, z);
    root.add(shoulder);
  }

  const markingMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.runwayMarking,
    roughness: 0.82
  });
  for (let x = RUNWAY.minX + 30; x <= RUNWAY.maxX - 28; x += 34) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.025, 0.72),
      markingMaterial
    );
    dash.position.set(x, 0.155, 0);
    root.add(dash);
  }

  for (const x of [RUNWAY.minX + 14, RUNWAY.maxX - 14]) {
    for (const z of [-8, -4, 0, 4, 8]) {
      const threshold = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.026, 1),
        markingMaterial
      );
      threshold.position.set(x, 0.158, z);
      root.add(threshold);
    }
  }
}

function addAirportBuildings(root: THREE.Group): void {
  const wall = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    roughness: 0.9
  });
  const roof = new THREE.MeshStandardMaterial({
    color: COLORS.roof,
    roughness: 0.84
  });
  const glass = new THREE.MeshStandardMaterial({
    color: COLORS.glass,
    roughness: 0.35,
    metalness: 0.08
  });

  for (const [x, z, length] of [
    [-122, -43, 38],
    [-75, -43, 30]
  ] as const) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(length, 9, 18),
      wall
    );
    body.position.set(x, 4.5, z);
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(length + 2, 1.2, 20),
      roof
    );
    cap.position.set(x, 9.4, z);
    cap.castShadow = true;
    root.add(cap);
  }

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.8, 18, 10),
    wall
  );
  tower.position.set(-20, 9, 36);
  tower.castShadow = true;
  root.add(tower);

  const towerCab = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 4.4, 5.2, 10),
    glass
  );
  towerCab.position.set(-20, 19.5, 36);
  towerCab.castShadow = true;
  root.add(towerCab);

  const towerRoof = new THREE.Mesh(
    new THREE.ConeGeometry(6.1, 2.2, 10),
    roof
  );
  towerRoof.position.set(-20, 23.2, 36);
  towerRoof.castShadow = true;
  root.add(towerRoof);
}

function addTown(root: THREE.Group): void {
  const wallColors = [0xe9dfca, 0xd9e4dc, 0xe6cfbc, 0xf0e8d8] as const;
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.roof,
    roughness: 0.9
  });

  let index = 0;
  for (const row of [92, 122, 151]) {
    for (const column of [274, 306, 340, 374]) {
      if ((index + 1) % 5 === 0) {
        index += 1;
        continue;
      }

      const width = 15 + (index % 3) * 3;
      const depth = 13 + ((index + 1) % 3) * 3;
      const height = 8 + (index % 4) * 2.4;
      const wallColor = wallColors[index % wallColors.length] ?? wallColors[0];
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.94
      });

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        wallMaterial
      );
      building.position.set(column, height / 2 + 0.08, row);
      building.castShadow = true;
      building.receiveShadow = true;
      root.add(building);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 4.2, 4),
        roofMaterial
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(column, height + 2.1, row);
      roof.castShadow = true;
      root.add(roof);
      index += 1;
    }
  }
}

function addMarina(root: THREE.Group): void {
  const pierMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.pier,
    roughness: 0.95
  });
  for (const z of [-188, -170, -152]) {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(52, 0.45, 4.2),
      pierMaterial
    );
    pier.position.set(444, -0.55, z);
    pier.castShadow = true;
    root.add(pier);
  }

  const promenade = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.4, 62),
    pierMaterial
  );
  promenade.position.set(418, -0.5, -170);
  root.add(promenade);
}

function addLighthouse(root: THREE.Group): void {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.6, 24, 12),
    new THREE.MeshStandardMaterial({
      color: 0xf4ead6,
      roughness: 0.84
    })
  );
  body.position.set(-260, 12, -182);
  body.castShadow = true;
  root.add(body);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(5.1, 4.2, 12),
    new THREE.MeshStandardMaterial({
      color: COLORS.roof,
      roughness: 0.82
    })
  );
  cap.position.set(-260, 26.1, -182);
  cap.castShadow = true;
  root.add(cap);
}

function addRoad(
  root: THREE.Group,
  points: readonly WorldPoint[],
  width: number
): void {
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.road,
    roughness: 1
  });

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.08, width),
      material
    );
    segment.position.set(
      (start.x + end.x) / 2,
      0.075,
      (start.z + end.z) / 2
    );
    segment.rotation.y = -Math.atan2(dz, dx);
    segment.receiveShadow = true;
    root.add(segment);
  }
}

function addTreeCluster(
  root: THREE.Group,
  centerX: number,
  centerZ: number,
  radius: number,
  count: number
): void {
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.trunk,
    roughness: 1
  });
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.tree,
    roughness: 1,
    flatShading: true
  });

  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963 + radius * 0.013;
    const distance = radius * (1.15 + (index % 4) * 0.13);
    const x = centerX + Math.cos(angle) * distance;
    const z = centerZ + Math.sin(angle) * distance;
    const height = 5.2 + (index % 3) * 1.1;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.62, height * 0.42, 6),
      trunkMaterial
    );
    trunk.position.set(x, height * 0.21, z);
    trunk.castShadow = true;
    root.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.5 + (index % 2) * 0.4, height * 0.7, 7),
      canopyMaterial
    );
    canopy.position.set(x, height * 0.66, z);
    canopy.castShadow = true;
    root.add(canopy);
  }
}

function applyHillVertexColors(
  geometry: THREE.BufferGeometry,
  height: number
): void {
  const positions = geometry.getAttribute('position');
  const colors: number[] = [];
  const low = new THREE.Color(COLORS.forest);
  const middle = new THREE.Color(0x607e48);
  const high = new THREE.Color(0x8c8668);

  for (let index = 0; index < positions.count; index += 1) {
    const localY = positions.getY(index);
    const t = THREE.MathUtils.clamp((localY + height / 2) / height, 0, 1);
    const color =
      t < 0.62
        ? low.clone().lerp(middle, t / 0.62)
        : middle.clone().lerp(high, (t - 0.62) / 0.38);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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
