import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER_LOGO,
  getGameLogoCandidates,
  resolveGameLogoUrl,
  resolveNextGameLogoFallback,
} from '@/utils/gameLogoResolver';

describe('gameLogoResolver', () => {
  it('prefers catalog logo when provided', () => {
    const candidates = getGameLogoCandidates('Valorant', '/games/custom-valorant.png');
    expect(candidates[0]).toBe('/games/custom-valorant.png');
  });

  it('falls back to seed and IGDB assets for Valorant when catalog logo is empty', () => {
    const candidates = getGameLogoCandidates('Valorant', '');
    expect(candidates).toContain('/games/valorant-logo.png');
    expect(candidates).toContain('/games/igdb/valorant/cover.jpg');
    expect(candidates).toContain('https://images.igdb.com/igdb/image/upload/t_cover_big/cobtjo.jpg');
    expect(candidates[candidates.length - 1]).toBe(PLACEHOLDER_LOGO);
  });

  it('uses R6 seed path and IGDB alias slug for Rainbow Six Siege', () => {
    const candidates = getGameLogoCandidates('Rainbow Six Siege', '');
    expect(candidates).toContain('/games/r6s-logo.png');
    expect(candidates).toContain('/games/igdb/r6/cover.jpg');
    expect(candidates).toContain('https://images.igdb.com/igdb/image/upload/t_cover_big/co9yqs.jpg');
  });

  it('resolves primary logo URL and advances through fallback chain on error', () => {
    const primary = resolveGameLogoUrl('Fortnite', '');
    expect(primary).toBe('/games/fortnite-logo.png');

    const next = resolveNextGameLogoFallback(primary, 'Fortnite', '');
    expect(next).not.toBe(primary);
    expect(getGameLogoCandidates('Fortnite', '')).toContain(next);
  });
});
