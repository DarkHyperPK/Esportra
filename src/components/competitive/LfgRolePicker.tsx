import { useValorantAgents } from '@/hooks/useValorantCatalog';
import type { CatalogGameRole } from '@/types/competitive';

export function LfgRolePicker({ game, roles, value, onChange }: { game: string; roles: CatalogGameRole[]; value: string[]; onChange: (roles: string[]) => void }) {
  const catalog = useValorantAgents(game === 'valorant');
  return <div className="lfg-row-actions">{roles.map(role => {
    const fallback = Object.values(catalog.data ?? {}).find(agent => agent.role?.toLowerCase() === role.displayName?.toLowerCase())?.roleIcon;
    const icon = role.iconUrl || fallback;
    return <button className="lfg-button lfg-role-option" type="button" key={role.id} aria-pressed={value.includes(role.roleKey)} onClick={() => onChange(value.includes(role.roleKey) ? value.filter(item => item !== role.roleKey) : [...value, role.roleKey])}>{icon && <img src={icon} alt="" />}{role.displayName}</button>;
  })}</div>;
}
