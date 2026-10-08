import { describe, expect, it } from 'vitest';
import { instrumentHeading, instrumentPanelMarkup, worldToIndexMap } from '../src/game/FlightInstruments';
import { resolveGameSelection } from '../src/game/GameCatalog';
import { GROUND_TARGETS } from '../src/game/GroundTargetMission';
import { getTrainingCourse } from '../src/game/TrainingMission';

describe('flight-deck instruments', () => {
  it('maps island and Matsumoto world coordinates consistently across an index grid', () => {
    const left = worldToIndexMap('training-island', -220, 0);
    const right = worldToIndexMap('training-island', 420, 0);
    expect(right.x).toBeGreaterThan(left.x);
    expect(right.y).toBeCloseTo(left.y);
    const south = worldToIndexMap('training-island', 0, 200);
    const north = worldToIndexMap('training-island', 0, -200);
    expect(south.y).toBeGreaterThan(north.y);
    const matsumotoOrigin = worldToIndexMap('matsumoto-real', 0, 0);
    expect(matsumotoOrigin.x).toBeCloseTo(160);
    expect(matsumotoOrigin.y).toBeCloseTo(110);
  });

  it('marks an aircraft outside of the map without placing it off the display', () => {
    const pos = worldToIndexMap('training-island', 5000, -5000);
    expect(pos.outside).toBe(true);
    expect(pos.x).toBeLessThan(320);
    expect(pos.y).toBeGreaterThan(0);
  });

  it('uses local runway heading for island and true bearing for Matsumoto', () => {
    expect(instrumentHeading('training-island', 0)).toBeCloseTo(0);
    expect(instrumentHeading('training-island', -Math.PI / 2)).toBeCloseTo(270);
    expect(instrumentHeading('matsumoto-real', 0)).toBeCloseTo(171.24);
  });

  it('renders complete island index and only the current task objectives', () => {
    const selection = resolveGameSelection({
      worldId: 'training-island', aircraftId: 'trainer-01', taskId: 'island-ground-targets'
    });
    const html = instrumentPanelMarkup(selection);
    expect(html).toContain('AIRSPEED');
    expect(html).toContain('ATTITUDE');
    expect(html).toContain('LOCAL HDG');
    expect(html).toContain('FLIGHT INDEX');
    expect((html.match(/data-objective-index=/g) ?? [])).toHaveLength(GROUND_TARGETS.length);
    expect(html).toContain('data-map-aircraft');
  });

  it('keeps frequent-read gauges separate from the secondary navigational map', () => {
    const selection = resolveGameSelection({
      worldId: 'training-island',
      aircraftId: 'trainer-01',
      taskId: 'island-flight-basics'
    });
    const html = instrumentPanelMarkup(selection);
    // The instrument strip must close before the independently positioned map.
    const stripStart = html.indexOf('class="instrument-row"');
    const stripEnd = html.indexOf('</aside>', stripStart);
    const mapStart = html.indexOf('<section class="index-map-panel"', stripEnd);
    expect(stripStart).toBeGreaterThan(-1);
    expect(stripEnd).toBeGreaterThan(stripStart);
    expect(mapStart).toBeGreaterThan(stripEnd);
    expect(html).toContain('data-map-toggle');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="flight-index-content"');
    expect(html).toContain('class="index-map-content" id="flight-index-content"');
    expect((html.match(/class="instrument-gauge"/g) ?? [])).toHaveLength(3);
  });

  it('shows the selected Matsumoto training route with true-heading compass', () => {
    const selection = resolveGameSelection({
      worldId: 'matsumoto-real',
      aircraftId: 'trainer-01',
      taskId: 'matsumoto-pattern-training'
    });
    const html = instrumentPanelMarkup(selection);
    expect(html).toContain('TRUE HDG');
    expect(html).toContain('TRUE NORTH');
    expect((html.match(/data-objective-index=/g) ?? [])).toHaveLength(
      getTrainingCourse('matsumoto-pattern-training').rings.length
    );
    expect(html).not.toContain('GROUND TARGETS');
  });
});
