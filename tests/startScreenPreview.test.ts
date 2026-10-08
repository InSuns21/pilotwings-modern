import { describe, expect, it } from 'vitest';
import { TASKS } from '../src/game/GameCatalog';
import { taskPreviewSvg } from '../src/game/StartScreenPreview';

describe('start screen previews', () => {
  it('shows the control progression for every task route diagram', () => {
    for (const task of TASKS) {
      const svg = taskPreviewSvg(task.id);
      expect(svg).toContain('<svg');
      expect(svg).toContain('#ff8a4c');
      if (task.id === 'island-ground-targets') {
        expect(svg).toContain('3 GROUND TARGETS');
        expect(svg).toContain('AIM');
        expect(svg).toContain('REATTACK');
      } else {
        expect(svg).toContain('8 RINGS');
        expect(svg).toContain('CLIMB');
        expect(svg).toContain('FINAL');
      }
    }
  });
});
