import { BriefcaseBusiness, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import type { CatalogGameRole } from '@/types/competitive';
import { useValorantAgents } from '@/hooks/useValorantCatalog';

export function LfgRole({ game, roleKey, roles }: { game: string; roleKey: string; roles: CatalogGameRole[] }) {
  const key = roleKey.toLowerCase();
  const role = roles.find(item => item.roleKey.toLowerCase() === key);
  const name = role?.displayName || (key === 'coach' ? 'Coach' : key === 'manager' ? 'Manager' : roleKey);
  const agents = useValorantAgents(game === 'valorant');
  const icon = role?.iconUrl || Object.values(agents.data ?? {}).find(agent => agent.role?.toLowerCase() === name.toLowerCase())?.roleIcon;
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="lfg-role" title={name}>
    {key === 'coach' ? <GraduationCap aria-hidden="true" /> : key === 'manager' ? <BriefcaseBusiness aria-hidden="true" />
      : icon && icon !== failed ? <img src={icon} alt="" onError={() => setFailed(icon)} /> : null}
    <span>{name}</span>
  </span>;
}
