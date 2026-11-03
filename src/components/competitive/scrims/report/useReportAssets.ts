import { useMemo } from 'react';
import { useValorantAgents, useValorantWeapons } from '@/hooks/useValorantCatalog';
import type { KillCatalog } from '@/services/scrimInsights/assets';

/** Weapon names and icons and each agent's ability icons from valorant-api, in the shape the report's icon helpers read. Empty until loaded; the report works without it. */
export function useReportAssets(enabled: boolean): KillCatalog {
  const { data: weapons } = useValorantWeapons(enabled);
  const { data: agents } = useValorantAgents(enabled);
  return useMemo<KillCatalog>(() => {
    const weaponName = new Map<string, string>();
    const weaponIcon = new Map<string, string>();
    for (const w of weapons ?? []) {
      if (!w.uuid) continue;
      const id = w.uuid.toLowerCase();
      if (w.displayName) weaponName.set(id, w.displayName);
      const icon = w.killStreamIcon ?? w.displayIcon;
      if (icon) weaponIcon.set(id, icon);
    }
    const abilities = new Map<string, Map<string, { icon?: string; name?: string }>>();
    for (const [id, agent] of Object.entries(agents ?? {})) {
      const slots = new Map<string, { icon?: string; name?: string }>();
      for (const a of agent.abilities ?? []) if (a.slot) slots.set(a.slot, { icon: a.displayIcon, name: a.displayName });
      abilities.set(id.toLowerCase(), slots);
    }
    return { weaponName, weaponIcon, abilities };
  }, [weapons, agents]);
}
