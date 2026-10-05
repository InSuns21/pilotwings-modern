import { describe, expect, it } from 'vitest';
import { propellerAngularSpeed } from '../src/render/AircraftModel';

describe('propellerAngularSpeed', () => {
  it('keeps an idle rotation at zero airspeed', () => {
    expect(propellerAngularSpeed(0)).toBe(18);
  });

  it('increases with airspeed', () => {
    expect(propellerAngularSpeed(30)).toBeGreaterThan(propellerAngularSpeed(10));
  });

  it('clamps extreme airspeed', () => {
    expect(propellerAngularSpeed(1000)).toBe(125);
  });

  it('does not treat negative airspeed as reverse propeller rotation', () => {
    expect(propellerAngularSpeed(-10)).toBe(propellerAngularSpeed(0));
  });
});
