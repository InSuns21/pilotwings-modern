import * as THREE from 'three';
import { AircraftModel } from './AircraftModel';
import { createMatsumotoWorldVisual } from './MatsumotoWorldVisual';
import type { GameSelection } from '../game/GameCatalog';
import { flightOrientation, type FlightState } from '../flight/ArcadeFlightModel';
import {
  getTrainingCourse,
  type LandingZone,
  type TrainingMissionProgress,
  type TrainingRing
} from '../game/TrainingMission';
import { createTrainingIslandVisual } from './TrainingIslandVisual';
import type { WorldRuntime } from '../world/WorldRuntime';

interface CrashPiece {
  readonly mesh: THREE.Mesh;
  readonly velocity: THREE.Vector3;
  readonly spin: THREE.Vector3;
}

interface WorldVisual {
  readonly root: THREE.Group;
  update?(x: number, z: number): void;
  dispose(): void;
}

export class SceneRenderer {
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
  readonly #aircraft: AircraftModel;
  readonly #resizeObserver: ResizeObserver;
  #worldVisual: WorldVisual | null = null;
  readonly #ringMaterials: THREE.MeshStandardMaterial[] = [];
  readonly #landingMaterial = new THREE.MeshStandardMaterial({
    color: 0x61d174,
    emissive: 0x163d1d,
    transparent: true,
    opacity: 0.38,
    roughness: 0.75
  });

  #crashEffect: THREE.Group | null = null;
  #crashPieces: CrashPiece[] = [];
  #crashSmoke: THREE.Mesh[] = [];
  #crashStartedAt = 0;

  constructor(
    private readonly host: HTMLElement,
    selection: GameSelection,
    worldRuntime: WorldRuntime
  ) {
    this.#aircraft = this.#createAircraft(selection);
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.append(this.#renderer.domElement);

    if (worldRuntime.id === 'matsumoto-real') {
      this.#camera.far = 12_000;
      this.#camera.updateProjectionMatrix();
      this.#scene.background = new THREE.Color(0xa9cadd);
      this.#scene.fog = new THREE.Fog(0xa9cadd, 4200, 10_500);
    } else {
      this.#scene.background = new THREE.Color(0x8fcdf8);
      this.#scene.fog = new THREE.Fog(0x8fcdf8, 260, 1050);
    }

    const hemi = new THREE.HemisphereLight(0xffffff, 0x4b633d, 2.4);
    this.#scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(-80, 130, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -320;
    sun.shadow.camera.right = 320;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 420;
    sun.target.position.set(100, 0, 0);
    this.#scene.add(sun, sun.target);

    this.#buildWorld(selection, worldRuntime);
    this.#buildTaskVisuals(selection);
    this.#scene.add(this.#aircraft.root);

    const initialForward = new THREE.Vector3(1, 0, 0);
    this.#camera.position.set(-190, 8, 0);
    this.#camera.lookAt(
      initialForward.multiplyScalar(20).add(new THREE.Vector3(-175, 2, 0))
    );

    this.#resizeObserver = new ResizeObserver(() => this.resize());
    this.#resizeObserver.observe(host);
    this.resize();
  }

  syncAircraft(state: FlightState): void {
    const rotation = flightOrientation(state);

    this.#aircraft.root.position.set(
      state.position.x,
      state.position.y,
      state.position.z
    );
    this.#aircraft.root.quaternion.set(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );
    this.#aircraft.updateVisuals(state.speed);
    this.#worldVisual?.update?.(state.position.x, state.position.z);

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
      if (progress.phase === 'failed') {
        material.color.setHex(0x7d2424);
        material.emissive.setHex(0x260606);
        material.opacity = 0.24;
      } else if (index < progress.nextRingIndex) {
        material.color.setHex(0x64db74);
        material.emissive.setHex(0x123d18);
        material.opacity = 0.32;
      } else if (
        progress.phase === 'rings' &&
        index === progress.nextRingIndex
      ) {
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
      progress.phase === 'landing' || progress.phase === 'complete'
        ? 0.72
        : 0.28;
  }

  triggerCrash(): void {
    if (this.#crashEffect) {
      return;
    }

    this.#aircraft.root.visible = false;
    this.#crashStartedAt = performance.now();
    this.#crashEffect = new THREE.Group();
    this.#crashEffect.position.copy(this.#aircraft.root.position);
    this.#scene.add(this.#crashEffect);

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb13b,
      transparent: true,
      opacity: 0.95
    });
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 16, 12),
      flashMaterial
    );
    flash.name = 'crash-flash';
    this.#crashEffect.add(flash);

    const smokeMaterial = new THREE.MeshStandardMaterial({
      color: 0x25282c,
      transparent: true,
      opacity: 0.72,
      roughness: 1
    });

    for (let i = 0; i < 7; i += 1) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.8 + i * 0.11, 10, 8),
        smokeMaterial.clone()
      );
      smoke.position.set(
        (i % 2 === 0 ? 1 : -1) * i * 0.18,
        i * 0.25,
        (i - 3) * 0.13
      );
      this.#crashEffect.add(smoke);
      this.#crashSmoke.push(smoke);
    }

    const debrisMaterial = new THREE.MeshStandardMaterial({
      color: 0xd64d3b,
      roughness: 0.8
    });

    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const piece = new THREE.Mesh(
        new THREE.BoxGeometry(0.45 + (i % 3) * 0.12, 0.16, 0.28),
        debrisMaterial
      );
      piece.castShadow = true;
      this.#crashEffect.add(piece);
      this.#crashPieces.push({
        mesh: piece,
        velocity: new THREE.Vector3(
          Math.cos(angle) * (5 + (i % 3) * 1.4),
          5.5 + (i % 4) * 1.2,
          Math.sin(angle) * (5 + (i % 2) * 1.8)
        ),
        spin: new THREE.Vector3(
          2 + i * 0.21,
          3 + i * 0.17,
          2.4 + i * 0.13
        )
      });
    }
  }

  resetCrashEffect(): void {
    if (this.#crashEffect) {
      this.#scene.remove(this.#crashEffect);
    }
    this.#crashEffect = null;
    this.#crashPieces = [];
    this.#crashSmoke = [];
    this.#crashStartedAt = 0;
    this.#aircraft.resetAnimation();
    this.#aircraft.root.visible = true;
  }

  render(): void {
    this.#updateCrashEffect();
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
    this.#worldVisual?.dispose();
    this.#worldVisual = null;
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
  }

  #createAircraft(selection: GameSelection): AircraftModel {
    switch (selection.aircraft.id) {
      case 'trainer-01':
        return new AircraftModel();
    }
  }

  #buildWorld(
    selection: GameSelection,
    worldRuntime: WorldRuntime
  ): void {
    switch (selection.world.id) {
      case 'training-island':
        this.#worldVisual = createTrainingIslandVisual();
        this.#scene.add(this.#worldVisual.root);
        this.#buildStartPad();
        return;

      case 'matsumoto-real':
        if (worldRuntime.id !== 'matsumoto-real') {
          throw new Error('Matsumoto world runtime did not initialize');
        }
        this.#worldVisual = createMatsumotoWorldVisual(worldRuntime, {
          maxAnisotropy: this.#renderer.capabilities.getMaxAnisotropy()
        });
        this.#scene.add(this.#worldVisual.root);
        this.#buildStartPad();
        return;
    }
  }

  #buildTaskVisuals(selection: GameSelection): void {
    const course = getTrainingCourse(selection.task.id);
    this.#buildLandingZone(course.landingZone);
    this.#buildRings(course.rings);
  }

  #updateCrashEffect(): void {
    if (!this.#crashEffect) {
      return;
    }

    const elapsed = Math.min(
      (performance.now() - this.#crashStartedAt) / 1000,
      4
    );
    const dt = 1 / 60;

    const flash = this.#crashEffect.getObjectByName('crash-flash') as
      | THREE.Mesh
      | undefined;
    if (flash) {
      const material = flash.material as THREE.MeshBasicMaterial;
      flash.scale.setScalar(1 + elapsed * 4.5);
      material.opacity = Math.max(0, 0.95 - elapsed * 1.8);
    }

    for (const piece of this.#crashPieces) {
      piece.velocity.y -= 9.81 * dt;
      piece.mesh.position.addScaledVector(piece.velocity, dt);
      piece.mesh.rotation.x += piece.spin.x * dt;
      piece.mesh.rotation.y += piece.spin.y * dt;
      piece.mesh.rotation.z += piece.spin.z * dt;
    }

    this.#crashSmoke.forEach((smoke, index) => {
      smoke.position.y += (0.35 + index * 0.025) * dt;
      smoke.scale.setScalar(1 + elapsed * (0.35 + index * 0.04));
      const material = smoke.material as THREE.MeshStandardMaterial;
      material.opacity = Math.max(0.18, 0.72 - elapsed * 0.12);
    });
  }

  #buildStartPad(): void {
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
    startPad.position.set(-175, 0.182, 0);
    this.#scene.add(startPad);
  }

  #buildLandingZone(zone: LandingZone): void {
    const landingZone = new THREE.Mesh(
      new THREE.PlaneGeometry(
        zone.maxX - zone.minX,
        zone.halfWidth * 2
      ),
      this.#landingMaterial
    );
    landingZone.rotation.x = -Math.PI / 2;
    landingZone.position.set(
      (zone.minX + zone.maxX) / 2,
      0.185,
      0
    );
    this.#scene.add(landingZone);
  }

  #buildRings(rings: readonly TrainingRing[]): void {
    let previous = { x: -175, z: 0 };

    for (const ring of rings) {
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
      const approachHeading = Math.atan2(
        ring.center.z - previous.z,
        ring.center.x - previous.x
      );
      mesh.rotation.y = Math.PI / 2 - approachHeading;
      mesh.position.set(ring.center.x, ring.center.y, ring.center.z);
      mesh.castShadow = true;
      this.#scene.add(mesh);

      previous = ring.center;
    }
  }
}
