import { describe, expect, it } from 'vitest';
import { TASKS } from '../src/game/GameCatalog';
import { taskPreviewSvg } from '../src/game/StartScreenPreview';

describe('start screen previews', () => {
  it('keeps task instructions as a lightweight route diagram', () => {
    for (const task of TASKS) {
      const svg = taskPreviewSvg(task.id);
      expect(svg).toContain('<svg');
      expect(svg).toContain('#ff8a4c');
      expect(svg).toContain('TAKEOFF → RINGS → LANDING');
    }
  });
});
