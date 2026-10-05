import { describe, expect, it } from 'vitest';
import {
  MATSUMOTO_RUNWAY,
  decodeDemRgb,
  geographicToMatsumotoWorld,
  matsumotoWorldToGeographic
} from '../src/world/MatsumotoWorld';

describe('Matsumoto real-world coordinates', () => {
  it('aligns the published runway thresholds with the local runway axis', () => {
    const runway18 = geographicToMatsumotoWorld(
      MATSUMOTO_RUNWAY.runway18Threshold.latitude,
      MATSUMOTO_RUNWAY.runway18Threshold.longitude
    );
    const runway36 = geographicToMatsumotoWorld(
      MATSUMOTO_RUNWAY.runway36Threshold.latitude,
      MATSUMOTO_RUNWAY.runway36Threshold.longitude
    );

    expect(runway18.x).toBeCloseTo(-1003, 0);
    expect(runway36.x).toBeCloseTo(1003, 0);
    expect(Math.abs(runway18.z)).toBeLessThan(4);
    expect(Math.abs(runway36.z)).toBeLessThan(4);
    expect(runway36.x - runway18.x).toBeCloseTo(2006, 0);
  });

  it('round-trips local runway coordinates back to geographic coordinates', () => {
    const geographic = matsumotoWorldToGeographic(420, -75);
    const local = geographicToMatsumotoWorld(
      geographic.latitude,
      geographic.longitude
    );

    expect(local.x).toBeCloseTo(420, 5);
    expect(local.z).toBeCloseTo(-75, 5);
  });

  it('decodes GSI DEM PNG RGB values', () => {
    expect(decodeDemRgb(0, 3, 232)).toBeCloseTo(10);
    expect(Number.isNaN(decodeDemRgb(128, 0, 0))).toBe(true);
  });
});
