import RAPIER from '@dimforge/rapier3d-compat';
import type { FlightInput } from '../input/KeyboardInput';

const FIXED_DELTA_SECONDS = 1 / 60;

export interface AircraftPose {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly rotation: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
  };
}

export class PhysicsWorld {
  readonly #world: RAPIER.World;
  readonly #aircraft: RAPIER.RigidBody;

  private constructor(world: RAPIER.World, aircraft: RAPIER.RigidBody) {
    this.#world = world;
    this.#aircraft = aircraft;
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = FIXED_DELTA_SECONDS;

    const groundBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(250, 0.5, 250).setFriction(0.9),
      groundBody
    );

    const aircraft = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 14, 0)
        .setLinearDamping(0.08)
        .setAngularDamping(1.2)
        .setCcdEnabled(true)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.4, 0.22, 0.75).setDensity(0.65).setFriction(0.7),
      aircraft
    );

    return new PhysicsWorld(world, aircraft);
  }

  step(input: FlightInput): void {
    const lift = 11.5 + input.throttle * 8;
    this.#aircraft.addForce({ x: 0, y: lift, z: -input.throttle * 6 }, true);
    this.#aircraft.addTorque(
      {
        x: input.pitch * 2.2,
        y: input.yaw * 1.4,
        z: input.roll * 2.6
      },
      true
    );
    this.#world.step();
  }

  getAircraftPose(): AircraftPose {
    const position = this.#aircraft.translation();
    const rotation = this.#aircraft.rotation();

    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }
    };
  }

  resetAircraft(): void {
    this.#aircraft.setTranslation({ x: 0, y: 14, z: 0 }, true);
    this.#aircraft.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.#aircraft.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.#aircraft.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
}
