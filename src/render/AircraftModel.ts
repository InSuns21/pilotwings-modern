import * as THREE from 'three';

const BODY_COLOR = 0xfff0bd;
const ACCENT_COLOR = 0xd94f3d;
const DARK_COLOR = 0x252c35;
const METAL_COLOR = 0xb8bec4;
const GLASS_COLOR = 0x315875;
const TIRE_COLOR = 0x17191c;

export function propellerAngularSpeed(airspeed: number): number {
  const safeSpeed = Math.max(0, airspeed);
  return Math.min(125, 18 + safeSpeed * 2.05);
}

export class AircraftModel {
  readonly root = new THREE.Group();

  readonly #propeller = new THREE.Group();
  readonly #propellerDisc: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  #lastUpdateMs: number | null = null;

  constructor() {
    this.root.name = 'trainer-aircraft';

    const body = new THREE.MeshStandardMaterial({
      color: BODY_COLOR,
      roughness: 0.55,
      metalness: 0.04,
      side: THREE.DoubleSide
    });
    const accent = new THREE.MeshStandardMaterial({
      color: ACCENT_COLOR,
      roughness: 0.48,
      metalness: 0.03,
      side: THREE.DoubleSide
    });
    const dark = new THREE.MeshStandardMaterial({
      color: DARK_COLOR,
      roughness: 0.64,
      metalness: 0.12
    });
    const metal = new THREE.MeshStandardMaterial({
      color: METAL_COLOR,
      roughness: 0.38,
      metalness: 0.62
    });
    const glass = new THREE.MeshStandardMaterial({
      color: GLASS_COLOR,
      emissive: 0x07131d,
      transparent: true,
      opacity: 0.78,
      roughness: 0.18,
      metalness: 0.05
    });
    const tire = new THREE.MeshStandardMaterial({
      color: TIRE_COLOR,
      roughness: 0.93
    });

    this.#buildFuselage(body, accent, dark, glass);
    this.#buildWings(body, accent);
    this.#buildTail(body, accent);
    this.#buildLandingGear(metal, tire);
    this.#buildPropeller(dark, metal);
    this.#buildDetails(accent, dark);

    this.#propellerDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 28),
      new THREE.MeshBasicMaterial({
        color: 0xc9d4dc,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.#propellerDisc.rotation.y = Math.PI / 2;
    this.#propellerDisc.position.x = 3.23;
    this.root.add(this.#propellerDisc);

    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  updateVisuals(airspeed: number, nowMs = performance.now()): void {
    const angularSpeed = propellerAngularSpeed(airspeed);

    if (this.#lastUpdateMs !== null) {
      const dt = Math.min(Math.max((nowMs - this.#lastUpdateMs) / 1000, 0), 0.05);
      this.#propeller.rotation.x += angularSpeed * dt;
    }
    this.#lastUpdateMs = nowMs;

    const speedRatio = Math.min(Math.max(airspeed / 45, 0), 1);
    const discMaterial = this.#propellerDisc.material;
    discMaterial.opacity = 0.035 + speedRatio * 0.1;
    this.#propellerDisc.scale.setScalar(0.98 + speedRatio * 0.05);
  }

  resetAnimation(): void {
    this.#lastUpdateMs = null;
    this.#propeller.rotation.x = 0;
  }

  #buildFuselage(
    body: THREE.MeshStandardMaterial,
    accent: THREE.MeshStandardMaterial,
    dark: THREE.MeshStandardMaterial,
    glass: THREE.MeshStandardMaterial
  ): void {
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.28, 4.55, 12, 3, false),
      body
    );
    fuselage.rotation.z = -Math.PI / 2;
    fuselage.position.x = -0.1;
    this.root.add(fuselage);

    const cowling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.59, 0.55, 0.82, 12),
      accent
    );
    cowling.rotation.z = -Math.PI / 2;
    cowling.position.x = 2.36;
    this.root.add(cowling);

    const spinner = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.68, 12),
      body
    );
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.x = 3.08;
    this.root.add(spinner);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      glass
    );
    canopy.scale.set(1.25, 0.75, 0.78);
    canopy.position.set(0.48, 0.48, 0);
    this.root.add(canopy);

    const canopyFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 1.02),
      dark
    );
    canopyFrame.position.set(0.35, 0.42, 0);
    this.root.add(canopyFrame);

    const pilotHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2b38b, roughness: 0.8 })
    );
    pilotHead.position.set(0.34, 0.55, 0);
    this.root.add(pilotHead);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.52), dark);
    seat.position.set(0.05, 0.18, 0);
    this.root.add(seat);

    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.13, 1.5, 10),
      body
    );
    belly.rotation.z = -Math.PI / 2;
    belly.position.set(-1.62, -0.13, 0);
    this.root.add(belly);
  }

  #buildWings(
    body: THREE.MeshStandardMaterial,
    accent: THREE.MeshStandardMaterial
  ): void {
    const leftWing = new THREE.Mesh(createWingGeometry(1), accent);
    const rightWing = new THREE.Mesh(createWingGeometry(-1), accent);
    this.root.add(leftWing, rightWing);

    const wingCenter = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.15, 1.2),
      accent
    );
    wingCenter.position.set(-0.05, -0.02, 0);
    this.root.add(wingCenter);

    for (const side of [-1, 1] as const) {
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshStandardMaterial({
          color: side === 1 ? 0x3acf68 : 0xff4c42,
          emissive: side === 1 ? 0x0a3517 : 0x3d0806,
          roughness: 0.4
        })
      );
      tip.position.set(-0.22, 0.26, side * 3.45);
      this.root.add(tip);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.03, 0.5),
        body
      );
      stripe.position.set(-0.3, 0.13, side * 2.45);
      this.root.add(stripe);
    }
  }

  #buildTail(
    body: THREE.MeshStandardMaterial,
    accent: THREE.MeshStandardMaterial
  ): void {
    const leftTail = new THREE.Mesh(createTailplaneGeometry(1), body);
    const rightTail = new THREE.Mesh(createTailplaneGeometry(-1), body);
    this.root.add(leftTail, rightTail);

    const fin = new THREE.Mesh(createFinGeometry(), accent);
    this.root.add(fin);

    const rudderInset = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.75, 0.05),
      body
    );
    rudderInset.position.set(-2.12, 0.74, 0);
    rudderInset.rotation.z = -0.18;
    this.root.add(rudderInset);
  }

  #buildLandingGear(
    metal: THREE.MeshStandardMaterial,
    tire: THREE.MeshStandardMaterial
  ): void {
    for (const side of [-1, 1] as const) {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.055, 0.82, 8),
        metal
      );
      strut.position.set(-0.18, -0.3, side * 0.82);
      strut.rotation.x = side * 0.12;
      this.root.add(strut);

      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.085, 8, 14), tire);
      wheel.position.set(-0.18, -0.55, side * 1.02);
      this.root.add(wheel);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), metal);
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(wheel.position);
      this.root.add(hub);
    }

    const noseStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 0.64, 8),
      metal
    );
    noseStrut.position.set(1.72, -0.3, 0);
    this.root.add(noseStrut);

    const noseWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.065, 8, 14),
      tire
    );
    noseWheel.position.set(1.72, -0.55, 0);
    this.root.add(noseWheel);
  }

  #buildPropeller(
    dark: THREE.MeshStandardMaterial,
    metal: THREE.MeshStandardMaterial
  ): void {
    this.#propeller.position.x = 3.21;

    for (let i = 0; i < 3; i += 1) {
      const arm = new THREE.Group();
      arm.rotation.x = (Math.PI * 2 * i) / 3;

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 1.08, 0.16),
        dark
      );
      blade.position.y = 0.58;
      blade.rotation.z = -0.08;
      arm.add(blade);
      this.#propeller.add(arm);
    }

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      metal
    );
    this.#propeller.add(hub);
    this.root.add(this.#propeller);
  }

  #buildDetails(
    accent: THREE.MeshStandardMaterial,
    dark: THREE.MeshStandardMaterial
  ): void {
    for (const side of [-1, 1] as const) {
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.5, 8),
        dark
      );
      exhaust.rotation.z = Math.PI / 2;
      exhaust.position.set(1.76, -0.36, side * 0.38);
      this.root.add(exhaust);
    }

    const dorsalStripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.035, 0.5),
      accent
    );
    dorsalStripe.position.set(-0.75, 0.43, 0);
    this.root.add(dorsalStripe);
  }
}

function createWingGeometry(side: 1 | -1): THREE.BufferGeometry {
  const zRoot = 0.38 * side;
  const zTip = 3.5 * side;
  const yRoot = 0.02;
  const yTip = 0.28;
  const top = 0.08;
  const bottom = -0.08;

  return createPrismGeometry([
    [0.72, yRoot + top, zRoot],
    [-0.8, yRoot + top, zRoot],
    [-0.58, yTip + top, zTip],
    [0.08, yTip + top, zTip],
    [0.72, yRoot + bottom, zRoot],
    [-0.8, yRoot + bottom, zRoot],
    [-0.58, yTip + bottom, zTip],
    [0.08, yTip + bottom, zTip]
  ]);
}

function createTailplaneGeometry(side: 1 | -1): THREE.BufferGeometry {
  const zRoot = 0.2 * side;
  const zTip = 1.65 * side;
  const yRoot = 0.15;
  const yTip = 0.22;
  const top = 0.05;
  const bottom = -0.05;

  return createPrismGeometry([
    [-1.65, yRoot + top, zRoot],
    [-2.5, yRoot + top, zRoot],
    [-2.58, yTip + top, zTip],
    [-1.92, yTip + top, zTip],
    [-1.65, yRoot + bottom, zRoot],
    [-2.5, yRoot + bottom, zRoot],
    [-2.58, yTip + bottom, zTip],
    [-1.92, yTip + bottom, zTip]
  ]);
}

function createPrismGeometry(
  vertices: readonly (readonly [number, number, number])[]
): THREE.BufferGeometry {
  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices.flatMap((vertex) => [...vertex]), 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createFinGeometry(): THREE.BufferGeometry {
  const thickness = 0.07;
  const points = [
    [-2.52, 0.18],
    [-1.7, 0.18],
    [-1.92, 1.36],
    [-2.3, 1.5]
  ] as const;

  const vertices = points.flatMap(([x, y]) => [
    [x, y, thickness] as const,
    [x, y, -thickness] as const
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices.flatMap((vertex) => [...vertex]), 3)
  );
  geometry.setIndex([
    0, 2, 4, 0, 4, 6,
    1, 5, 3, 1, 7, 5,
    0, 1, 3, 0, 3, 2,
    2, 3, 5, 2, 5, 4,
    4, 5, 7, 4, 7, 6,
    6, 7, 1, 6, 1, 0
  ]);
  geometry.computeVertexNormals();
  return geometry;
}
