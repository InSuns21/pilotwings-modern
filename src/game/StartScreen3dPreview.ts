import * as THREE from 'three';
import { AircraftModel } from '../render/AircraftModel';
import {
  createMatsumotoWorldVisual,
  type MatsumotoWorldVisual
} from '../render/MatsumotoWorldVisual';
import { createTrainingIslandVisual } from '../render/TrainingIslandVisual';
import { createWorldRuntime } from '../world/WorldRuntime';
import type { AircraftId, WorldId } from './GameCatalog';

export interface StartScreen3dPreview {
  dispose(): void;
}

export function mountWorldPreview(
  host: HTMLElement,
  worldId: WorldId,
  heightExaggeration = 1.5
): StartScreen3dPreview {
  switch (worldId) {
    case 'training-island':
      return createTrainingIslandPreview(host);
    case 'matsumoto-real':
      return createMatsumotoPreview(host, heightExaggeration);
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

function createMatsumotoPreview(
  host: HTMLElement,
  heightExaggeration: number
): StartScreen3dPreview {
  const preview = createPreviewScene(host, 34);
  preview.scene.background = new THREE.Color(0xaecfe1);
  preview.scene.fog = new THREE.Fog(0xaecfe1, 2600, 7200);
  preview.camera.far = 8000;
  preview.camera.position.set(-1750, 1650, 1950);
  preview.camera.lookAt(new THREE.Vector3(0, 0, 0));
  preview.camera.updateProjectionMatrix();

  const loadingGround = new THREE.Mesh(
    new THREE.PlaneGeometry(3600, 3600),
    new THREE.MeshStandardMaterial({
      color: 0x69765d,
      roughness: 1
    })
  );
  loadingGround.rotation.x = -Math.PI / 2;
  loadingGround.position.y = -1;
  preview.scene.add(loadingGround);

  let disposed = false;
  let world: MatsumotoWorldVisual | null = null;

  const render = (): void => {
    preview.renderer.render(preview.scene, preview.camera);
  };
  preview.setRender(render);
  render();

  void createWorldRuntime(
    'matsumoto-real',
    { heightExaggeration },
    { tileRadius: 1 }
  )
    .then((runtime) => {
      if (disposed || runtime.id !== 'matsumoto-real') {
        return;
      }

      preview.scene.remove(loadingGround);
      loadingGround.geometry.dispose();
      disposeMaterial(loadingGround.material);
      world = createMatsumotoWorldVisual(runtime);
      preview.scene.add(world.root);
      render();
    })
    .catch((error: unknown) => {
      console.error('Failed to load Matsumoto preview terrain', error);
    });

  return {
    dispose(): void {
      disposed = true;
      world?.dispose();
      if (loadingGround.parent) {
        loadingGround.removeFromParent();
        loadingGround.geometry.dispose();
        disposeMaterial(loadingGround.material);
      }
      preview.dispose();
    }
  };
}

function createTrainingIslandPreview(host: HTMLElement): StartScreen3dPreview {
  const preview = createPreviewScene(host, 34);
  preview.scene.background = new THREE.Color(0xb8e1fb);
  preview.scene.fog = new THREE.Fog(0xb8e1fb, 850, 1700);

  const world = createTrainingIslandVisual();
  preview.scene.add(world.root);

  preview.camera.position.set(180, 600, 720);
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
