import { describe, expect, it } from 'vitest';
import { describeOnlineOcr } from '../health';
import type { ScoreboardOcrHealth } from '@/types/scoreboardOcr';

const base: ScoreboardOcrHealth = { configured: true, reachable: true, agents: 28, bankAgents: 26 };

describe('describeOnlineOcr', () => {
  it('reports an image built before the name recognisers', () => {
    const state = describeOnlineOcr({ ...base, scripts: [] });
    expect(state.label).toBe('Online · older OCR build');
    expect(state.detail).toContain('Redeploy');
  });

  it('names the missing script and why', () => {
    const state = describeOnlineOcr({ ...base, scripts: ['default', 'korean'], missingScripts: { arabic: 'download failed: timeout' } });
    expect(state.tone).toBe('warning');
    expect(state.label).toBe('Online · Arabic names off');
    expect(state.detail).toContain('Arabic: download failed: timeout');
  });

  it('is ready when both recognisers are loaded', () => {
    const state = describeOnlineOcr({ ...base, scripts: ['default', 'arabic', 'korean'], missingScripts: {} });
    expect(state).toMatchObject({ tone: 'success', label: 'Online' });
    expect(state.detail).toContain('Latin + CJK, Arabic, Korean');
  });
});
