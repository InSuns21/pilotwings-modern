import { describe, expect, it } from 'vitest';
import {
  RUNWAY_GROUND_Y,
  createInitialFlightState
} from '../src/flight/ArcadeFlightModel';
import {
  LANDING_GUIDE_FLARE_ALTITUDE,
  getLandingGuide
} from '../src/game/LandingGuide';
import {
  createTrainingMission,
  type TrainingMissionProgress
} from '../src/game/TrainingMission';

const landingProgress: TrainingMissionProgress = {
  phase: 'landing',
  nextRingIndex: 3,
  message: 'landing'
};

describe('landing guide', () => {
  it('stays hidden until the mission enters the landing phase', () => {
    const state = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 170, y: 16, z: 0 },
      speed: 22
    };

    expect(getLandingGuide(createTrainingMission(), state)).toBeNull();
  });

  it('shows approach targets with a stable approach inside the guide band', () => {
    const state = {
      ...createInitialFlightState(),
      onGround: false,
      position: {
        x: 185,
        y: RUNWAY_GROUND_Y + LANDING_GUIDE_FLARE_ALTITUDE + 5,
        z: 0
      },
      speed: 22,
      pitch: -2 * (Math.PI / 180),
      flightPathAngle: -7 * (Math.PI / 180),
      verticalSpeed: -2.7,
      roll: 3 * (Math.PI / 180)
    };

    const guide = getLandingGuide(landingProgress, state);

    expect(guide?.stage).toBe('approach');
    expect(
      Object.values(guide?.metrics ?? {}).every(
        (metric) => metric.status === 'good'
      )
    ).toBe(true);
    expect(guide?.advice).toContain('GOOD');
  });

  it('switches to flare targets below 8 m and guides a gentle nose-up touchdown', () => {
    const state = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 250, y: RUNWAY_GROUND_Y + 4, z: 0 },
      speed: 20,
      pitch: 10 * (Math.PI / 180),
      flightPathAngle: -3 * (Math.PI / 180),
      verticalSpeed: -1.1,
      roll: 2 * (Math.PI / 180)
    };

    const guide = getLandingGuide(landingProgress, state);

    expect(guide?.stage).toBe('flare');
    expect(guide?.metrics.pitch.status).toBe('good');
    expect(guide?.metrics.path.status).toBe('good');
    expect(guide?.advice).toContain('GOOD');
  });

  it('prioritizes slowing down before attitude corrections', () => {
    const state = {
      ...createInitialFlightState(),
      onGround: false,
      position: { x: 250, y: RUNWAY_GROUND_Y + 4, z: 0 },
      speed: 28,
      pitch: 2 * (Math.PI / 180),
      flightPathAngle: -8 * (Math.PI / 180),
      verticalSpeed: -3,
      roll: 0
    };

    expect(getLandingGuide(landingProgress, state)?.advice).toContain('BRAKE');
  });
});
