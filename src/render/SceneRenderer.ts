import * as THREE from 'three';
import { flightOrientation, type FlightState } from '../flight/ArcadeFlightModel';
import {
  LANDING_ZONE,
  TRAINING_RINGS,
  type TrainingMissionProgress
} from '../game/TrainingMission';

export class SceneRenderer {
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
  readonly #aircraft = new THREE.Group();
  readonly #resizeObserver: ResizeObserver;
  readonly #ringMaterials: THREE.MeshStandardMaterial[] = [];
  readonly #landingMaterial = new THREE.MeshStandardMaterial({
    color: 0x61d174,
    emissive: 0x163d1d,
    transparent: true,
    opacity: 0.38,
    roughness: 0.75
  });

  constructor(private readonly host: HTMLElement) {
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.#renderer.shadowMap.enabled = true;
    host.append(this.#renderer.domElement);

    this.#scene.background = new THREE.Color(0x8fcdf8);
    this.#scene.fog = new THREE.Fog(0x8fcdf8, 260, 1050);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x4b633d, 2.4);
    this.#scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(-80, 130, 70);
    sun.castShadow = true;
    this.#scene.add(sun);

    this.#buildAirport();
    this.#buildRings();
    this.#buildAircraft();
    this.#scene.add(this.#aircraft);

    const initialForward = new THREE.Vector3(1, 0, 0);
    this.#camera.position.set(-190, 8, 0);
    this.#camera.lookAt(initialForward.multiplyScalar(20).add(new THREE.Vector3(-175, 2, 0)));

    this.#resizeObserver = new ResizeObserver(() => this.resize());
    this.#resizeObserver.observe(host);
    this.resize();
  }

  syncAircraft(state: FlightState): void {
    const rotation = flightOrientation(state);

    this.#aircraft.position.set(state.position.x, state.position.y, state.position.z);
    this.#aircraft.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    const forward = new THREE.Vector3(
      Math.cos(state.heading),
      0,
      Math.sin(state.heading)
    );

    const aircraftPosition = new THREE.Vector3(
      state.position.x,
      state.position.y,
      state.position.z
    );

    const desiredCamera = aircraftPosition
      .clone()
      .addScaledVector(forward, -14)
      .add(new THREE.Vector3(0, 6.5, 0));

    this.#camera.position.lerp(desiredCamera, 0.11);
    this.#camera.up.set(0, 1, 0);

    const lookTarget = aircraftPosition
      .clone()
      .addScaledVector(forward, 24)
      .add(new THREE.Vector3(0, 2.2, 0));

    this.#camera.lookAt(lookTarget);
  }

  setMissionProgress(progress: TrainingMissionProgress): void {
    this.#ringMaterials.forEach((material, index) => {
      if (index < progress.nextRingIndex) {
        material.color.setHex(0x64db74);
        material.emissive.setHex(0x123d18);
        material.opacity = 0.32;
      } else if (progress.phase === 'rings' && index === progress.nextRingIndex) {
        material.color.setHex(0xffd34f);
        material.emissive.setHex(0x5a3d00);
        material.opacity = 1;
      } else {
        material.color.setHex(0xff8a4c);
        material.emissive.setHex(0x4a1905);
        material.opacity = 0.7;
      }
    });

    this.#landingMaterial.opacity =
      progress.phase === 'landing' || progress.phase === 'complete' ? 0.72 : 0.28;
  }

  render(): void {
    this.#renderer.render(this.#scene, this.#camera);
  }

  resize(): void {
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
  }

  #buildAirport(): void {
    const groundTexture = this.#createGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1000),
      new THREE.MeshStandardMaterial({
        map: groundTexture,
        roughness: 1,
        metalness: 0
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(130, -0.01, 0);
    ground.receiveShadow = true;
    this.#scene.add(ground);

    const runwayMaterial = new THREE.MeshStandardMaterial({
      color: 0x363b42,
      roughness: 0.96
    });
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(640, 24), runwayMaterial);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(100, 0.025, 0);
    runway.receiveShadow = true;
    this.#scene.add(runway);

    const shoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7d7d0,
      roughness: 0.9
    });

    for (const z of [-12.8, 12.8]) {
      const shoulder = new THREE.Mesh(
        new THREE.PlaneGeometry(640, 1.2),
        shoulderMaterial
      );
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.set(100, 0.035, z);
      this.#scene.add(shoulder);
    }

    const markingMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f1dc,
      roughness: 0.8
    });

    for (let x = -190; x <= 390; x += 32) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 0.75),
        markingMaterial
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.045, 0);
      this.#scene.add(dash);
    }

    for (const x of [-205, 405]) {
      for (const z of [-8, -4, 0, 4, 8]) {
        const threshold = new THREE.Mesh(
          new THREE.PlaneGeometry(8, 1.1),
          markingMaterial
        );
        threshold.rotation.x = -Math.PI / 2;
        threshold.position.set(x, 0.047, z);
        this.#scene.add(threshold);
      }
    }

    const landingZone = new THREE.Mesh(
      new THREE.PlaneGeometry(
        LANDING_ZONE.maxX - LANDING_ZONE.minX,
        LANDING_ZONE.halfWidth * 2
      ),
      this.#landingMaterial
    );
    landingZone.rotation.x = -Math.PI / 2;
    landingZone.position.set(
      (LANDING_ZONE.minX + LANDING_ZONE.maxX) / 2,
      0.052,
      0
    );
    this.#scene.add(landingZone);

    const startPadMaterial = new THREE.MeshStandardMaterial({
      color: 0x5ba4df,
      transparent: true,
      opacity: 0.32
    });
    const startPad = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 18),
      startPadMaterial
    );
    startPad.rotation.x = -Math.PI / 2;
    startPad.position.set(-175, 0.051, 0);
    this.#scene.add(startPad);

    this.#buildReferenceMarkers();
  }

  #buildReferenceMarkers(): void {
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75
    });

    for (let x = -160; x <= 360; x += 80) {
      for (const z of [-42, 42]) {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 5, 2.5),
          markerMaterial
        );
        marker.position.set(x, 2.5, z);
        marker.castShadow = true;
        this.#scene.add(marker);
      }
    }

    const hillMaterial = new THREE.MeshStandardMaterial({
      color: 0x587449,
      roughness: 1
    });

    for (const [x, z, scale] of [
      [50, -180, 1.2],
      [190, 190, 1.5],
      [340, -210, 1.1],
      [-120, 170, 0.9]
    ] as const) {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(35 * scale, 48 * scale, 12),
        hillMaterial
      );
      hill.position.set(x, 24 * scale, z);
      this.#scene.add(hill);
    }
  }

  #buildRings(): void {
    for (const ring of TRAINING_RINGS) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xff8a4c,
        emissive: 0x4a1905,
        transparent: true,
        opacity: 0.7,
        roughness: 0.45
      });
      this.#ringMaterials.push(material);

      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(ring.radius, 0.75, 16, 48),
        material
      );
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(ring.center.x, ring.center.y, ring.center.z);
      mesh.castShadow = true;
      this.#scene.add(mesh);
    }
  }

  #buildAircraft(): void {
    const body = new THREE.MeshStandardMaterial({
      color: 0xfff1bf,
      roughness: 0.62
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xd64d3b,
      roughness: 0.58
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x29313b,
      roughness: 0.65
    });

    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 1.05), body);
    fuselage.castShadow = true;
    this.#aircraft.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.2, 12), accent);
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 2.2;
    nose.castShadow = true;
    this.#aircraft.add(nose);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 5.4), accent);
    wing.castShadow = true;
    this.#aircraft.add(wing);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 2.3), body);
    tail.position.x = -1.25;
    tail.castShadow = true;
    this.#aircraft.add(tail);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.05, 0.12), accent);
    fin.position.set(-1.2, 0.5, 0);
    fin.castShadow = true;
    this.#aircraft.add(fin);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.38, 0.7), dark);
    cockpit.position.set(0.65, 0.35, 0);
    cockpit.castShadow = true;
    this.#aircraft.add(cockpit);
  }

  #createGroundTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable');
    }

    const size = 32;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        context.fillStyle = (x + y) % 2 === 0 ? '#527b45' : '#658a52';
        context.fillRect(x * size, y * size, size, size);
      }
    }

    context.strokeStyle = 'rgba(255,255,255,0.08)';
    context.lineWidth = 2;
    for (let i = 0; i <= 8; i += 1) {
      context.beginPath();
      context.moveTo(i * size, 0);
      context.lineTo(i * size, 256);
      context.stroke();
      context.beginPath();
      context.moveTo(0, i * size);
      context.lineTo(256, i * size);
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 18);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.#renderer.capabilities.getMaxAnisotropy();
    return texture;
  }
}
