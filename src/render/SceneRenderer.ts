import * as THREE from 'three';
import type { AircraftPose } from '../physics/PhysicsWorld';

export class SceneRenderer {
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1200);
  readonly #aircraft = new THREE.Group();
  readonly #resizeObserver: ResizeObserver;

  constructor(private readonly host: HTMLElement) {
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.#renderer.shadowMap.enabled = true;
    host.append(this.#renderer.domElement);

    this.#scene.background = new THREE.Color(0x8bc8ff);
    this.#scene.fog = new THREE.Fog(0x8bc8ff, 80, 420);

    this.#camera.position.set(10, 7, 16);
    this.#camera.lookAt(0, 6, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x37563d, 2.2);
    this.#scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(30, 50, 15);
    sun.castShadow = true;
    this.#scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0x507d4f, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.#scene.add(ground);

    const grid = new THREE.GridHelper(500, 100, 0x335133, 0x628862);
    grid.position.y = 0.01;
    this.#scene.add(grid);

    this.#buildAircraft();
    this.#scene.add(this.#aircraft);

    this.#resizeObserver = new ResizeObserver(() => this.resize());
    this.#resizeObserver.observe(host);
    this.resize();
  }

  syncAircraft(pose: AircraftPose): void {
    this.#aircraft.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.#aircraft.quaternion.set(
      pose.rotation.x,
      pose.rotation.y,
      pose.rotation.z,
      pose.rotation.w
    );

    const desiredCamera = new THREE.Vector3(9, 5.5, 15)
      .applyQuaternion(this.#aircraft.quaternion)
      .add(this.#aircraft.position);
    this.#camera.position.lerp(desiredCamera, 0.08);
    this.#camera.lookAt(this.#aircraft.position);
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

  #buildAircraft(): void {
    const material = new THREE.MeshStandardMaterial({ color: 0xfff1bf, roughness: 0.65 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xd64d3b, roughness: 0.6 });

    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.44, 1.1), material);
    fuselage.castShadow = true;
    this.#aircraft.add(fuselage);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 5.2), accent);
    wing.castShadow = true;
    this.#aircraft.add(wing);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 2.2), material);
    tail.position.x = 1.15;
    tail.castShadow = true;
    this.#aircraft.add(tail);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.05, 0.12), accent);
    fin.position.set(1.1, 0.5, 0);
    fin.castShadow = true;
    this.#aircraft.add(fin);
  }
}
