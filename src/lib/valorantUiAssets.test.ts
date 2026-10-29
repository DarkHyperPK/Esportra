import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import assets from './valorantUiAssets.json';
import { bundledValorantAgents, getValorantAgentIcon, getValorantRankIcon, getValorantRoleIcon } from './valorantUiAssets';

describe('bundled Valorant UI assets', () => {
  it('ships every referenced icon as a small valid WebP, without a remote image dependency', () => {
    const paths = [...Object.values(assets.agents).map(agent => agent.displayIcon), ...Object.values(assets.roles), ...Object.values(assets.ranks)];
    let total = 0;
    for (const path of paths) {
      expect(path).toMatch(/^\/game-assets\/valorant\/.*\.[a-f0-9]{10}\.webp$/);
      const data = readFileSync(join(process.cwd(), 'public', path));
      expect(data.subarray(8, 12).toString()).toBe('WEBP');
      expect(data.length).toBeLessThan(20_000);
      total += data.length;
    }
    expect(total).toBeLessThan(250_000);
  });

  it('resolves known assets immediately and keeps new catalog agents usable', () => {
    const jett = 'add6443a-41bd-e414-f6ad-e58d267f4e95';
    expect(getValorantAgentIcon(jett.toUpperCase())).toBe(bundledValorantAgents[jett].displayIcon);
    expect(getValorantRoleIcon('Duelist')).toMatch(/\/roles\/duelist\./);
    expect(getValorantRankIcon(10)).toMatch(/\/ranks\/10\./);
    expect(getValorantAgentIcon('future-agent', 'https://example.com/new.png')).toBe('https://example.com/new.png');
  });
});
