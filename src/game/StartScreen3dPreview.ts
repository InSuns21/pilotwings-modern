import * as THREE from 'three';
import { AircraftModel } from '../render/AircraftModel';
import { createTrainingIslandVisual } from '../render/TrainingIslandVisual';
import type { AircraftId, WorldId } from './GameCatalog';

export interface StartScreen3dPreview {
  dispose(): void;
}

export function mountWorldPreview(
  host: HTMLElement,
  worldId: WorldId
): StartScreen3dPreview {
  switch (worldId) {
    case 'training-island':
      return createTrainingIslandPreview(host);
  }

  return assertNever(worldId);
}

export function mountAircraftPreview(
  host: HTMLElement,
  aircraftId: AircraftId
): StartScreen3dPreview {
  switch (aircraftId) {
    case 'trainer-01':
      return createTrainerPreview(host);
  }

  return assertNever(aircraftId);
}

function createTrainerPreview(host: HTMLElement): StartScreen3dPreview {
  const preview = createPreviewScene(host, 34);
  preview.scene.background = new THREE.Color(0xb8e1fb);

  const aircraft = new AircraftModel();
  aircraft.root.rotation.y = -0.18;
  aircraft.root.rotation.z = -0.035;
  aircraft.root.position.y = 0.7;
  preview.scene.add(aircraft.root);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, 48),
    new THREE.MeshStandardMaterial({
      color: 0xdce7d2,
      roughness: 1
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  preview.scene.add(ground);

  preview.camera.position.set(9.6, 5.2, 8.3);
  preview.camera.lookAt(new THREE.Vector3(0.25, 0.65, 0));

  const render = (): void => {
    preview.renderer.render(preview.scene, preview.camera);
  };
  preview.setRender(render);
  render();

  return {
    dispose(): void {
      disposeObject(aircraft.root);
      ground.geometry.dispose();
      disposeMaterial(ground.material);
      preview.dispose();
    }
  };
}

function createTrainingIslandPreview(host: HTMLElement): StartScreen3dPreview {
  const preview = createPreviewScene(host, 34);
  preview.scene.background = new THREE.Color(0xb8e1fb);
  preview.scene.fog = new THREE.Fog(0xb8e1fb, 620, 1450);

  const world = createTrainingIslandVisual();
  preview.scene.add(world.root);

  preview.camera.position.set(210, 410, 490);
  preview.camera.lookAt(new THREE.Vector3(110, 0, 0));

  const render = (): void => {
    preview.renderer.render(preview.scene, preview.camera);
  };
  preview.setRender(render);
  render();

  return {
    dispose(): void {
      world.dispose();
      preview.dispose();
    }
  };
}

function createPreviewScene(host: HTMLElement, fov: number): {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  setRender(render: () => void): void;
  dispose(): void;
} {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 1600);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x587449, 2.3));

  const sun = new THREE.DirectionalLight(0xffffff, 3.1);
  sun.position.set(80, 140, 110);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  scene.add(sun);

  let renderCurrent = (): void => undefined;

  const resize = (): void => {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderCurrent();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  return {
    renderer,
    scene,
    camera,
    setRender(render: () => void): void {
      renderCurrent = render;
      resize();
    },
    dispose(): void {
      resizeObserver.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.geometry.dispose();
    disposeMaterial(object.material);
  });
}

function disposeMaterial(
  material: THREE.Material | THREE.Material[]
): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}

function assertNever(value: never): never {
  throw new Error(`Unsupported preview id: ${String(value)}`);
}
