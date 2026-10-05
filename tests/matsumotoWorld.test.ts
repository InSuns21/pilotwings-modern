import { describe, expect, it } from 'vitest';
import {
  MATSUMOTO_RUNWAY,
  decodeDemRgb,
  geographicToMatsumotoWorld,
  matsumotoPhotoTileUrl,
  matsumotoTileFractionToWorld,
  matsumotoWorldToGeographic,
  matsumotoWorldToTileFraction
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

  it('keeps streamed imagery tiles georeferenced at different zoom levels', () => {
    const z16 = matsumotoWorldToTileFraction(0, 0, 16);
    const z18 = matsumotoWorldToTileFraction(0, 0, 18);
    const z16TileX = Math.floor(z16.x);
    const z16TileY = Math.floor(z16.y);
    const z18TileX = Math.floor(z18.x);
    const z18TileY = Math.floor(z18.y);

    const z16Left = matsumotoTileFractionToWorld(
      z16TileX,
      z16TileY,
      16
    );
    const z16Right = matsumotoTileFractionToWorld(
      z16TileX + 1,
      z16TileY,
      16
    );
    const z18Left = matsumotoTileFractionToWorld(
      z18TileX,
      z18TileY,
      18
    );
    const z18Right = matsumotoTileFractionToWorld(
      z18TileX + 1,
      z18TileY,
      18
    );

    const z16Width = Math.hypot(
      z16Right.x - z16Left.x,
      z16Right.z - z16Left.z
    );
    const z18Width = Math.hypot(
      z18Right.x - z18Left.x,
      z18Right.z - z18Left.z
    );

    expect(z18Width).toBeLessThan(z16Width / 3.9);
    expect(z18Width).toBeGreaterThan(100);
    expect(z18Width).toBeLessThan(150);
  });

  it('builds GSI seamless-photo URLs for the requested LOD', () => {
    expect(matsumotoPhotoTileUrl({ x: 123, y: 456 }, 18)).toBe(
      'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/18/123/456.jpg'
    );
  });

  it('decodes GSI DEM PNG RGB values', () => {
    expect(decodeDemRgb(0, 3, 232)).toBeCloseTo(10);
    expect(Number.isNaN(decodeDemRgb(128, 0, 0))).toBe(true);
  });
});
