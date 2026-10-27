import { describe, expect, it } from 'vitest';
import { resolveLfgAvatar } from './lfgAvatar';
import { parsePopularAgents } from './valorantAgents';

describe('LFG identity and agent data', () => {
  it('prefers the profile photo, then the selected DiceBear style, then initials', () => {
    expect(resolveLfgAvatar('https://example.com/photo.png', 'seed', 'bottts')).toBe('https://example.com/photo.png');
    expect(resolveLfgAvatar(null, 'a b', 'bottts')).toBe('https://api.dicebear.com/10.x/bottts/svg?seed=a%20b');
    expect(resolveLfgAvatar(null, 'seed', null)).toContain('/10.x/critters/');
    expect(resolveLfgAvatar(null, null, null)).toBeNull();
  });

  it('normalizes agent data stored as snake_case JSON', () => {
    expect(parsePopularAgents('[{"agent_id":"jett","display_name":"Jett","games_played":12}]')).toEqual([
      expect.objectContaining({ agentId: 'jett', displayName: 'Jett', gamesPlayed: 12 }),
    ]);
  });
});
