import RAPIER from '@dimforge/rapier3d-compat';
import {
  createInitialFlightState,
  flightOrientation,
  stepArcadeFlight,
  type FlightState
} from '../flight/ArcadeFlightModel';
import type { FlightInput } from '../input/FlightInput';

const FIXED_DELTA_SECONDS = 1 / 60;

export class PhysicsWorld {
  readonly #world: RAPIER.World;
  readonly #aircraft: RAPIER.RigidBody;
  #state: FlightState;

  private constructor(world: RAPIER.World, aircraft: RAPIER.RigidBody) {
    this.#world = world;
    this.#aircraft = aircraft;
    this.#state = createInitialFlightState();
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    world.timestep = FIXED_DELTA_SECONDS;

    const initial = createInitialFlightState();
    const aircraft = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        initial.position.x,
        initial.position.y,
        initial.position.z
      )
    );

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.4, 0.28, 0.78).setFriction(0.8),
      aircraft
    );

    return new PhysicsWorld(world, aircraft);
  }

  step(input: FlightInput): void {
    this.#state = stepArcadeFlight(this.#state, input, FIXED_DELTA_SECONDS);
    const rotation = flightOrientation(this.#state);

    this.#aircraft.setNextKinematicTranslation(this.#state.position);
    this.#aircraft.setNextKinematicRotation(rotation);
    this.#world.step();
  }

  getAircraftState(): FlightState {
    return this.#state;
  }

  resetAircraft(): void {
    this.#state = createInitialFlightState();
    const rotation = flightOrientation(this.#state);

    this.#aircraft.setTranslation(this.#state.position, true);
    this.#aircraft.setRotation(rotation, true);
    this.#aircraft.setNextKinematicTranslation(this.#state.position);
    this.#aircraft.setNextKinematicRotation(rotation);
  }
}
