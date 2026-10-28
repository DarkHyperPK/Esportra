import { LfgRole } from './LfgRole';
import type { CatalogGameRole } from '@/types/competitive';

export function LfgRolePicker({ game, roles, value, onChange }: { game: string; roles: CatalogGameRole[]; value: string[]; onChange: (roles: string[]) => void }) {
  return <div className="lfg-row-actions">{roles.map(role => <button className="lfg-button lfg-role-option" type="button" key={role.id} aria-pressed={value.includes(role.roleKey)} onClick={() => onChange(value.includes(role.roleKey) ? value.filter(item => item !== role.roleKey) : [...value, role.roleKey])}><LfgRole game={game} roleKey={role.roleKey} roles={roles} /></button>)}</div>;
}
