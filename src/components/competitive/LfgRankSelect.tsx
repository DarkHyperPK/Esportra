import type { CatalogRankTier } from '@/types/competitive';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LfgRankSelect({ label, game, ranks, value, onChange }: { label: string; game: string; ranks: CatalogRankTier[]; value: string; onChange: (value: string) => void }) {
  return <div className="lfg-field lfg-rank-select"><span>{label}</span><Select value={value || 'any'} onValueChange={next => onChange(next === 'any' ? '' : next)}><SelectTrigger aria-label={label} className="lfg-input"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="any">Any rank</SelectItem>{ranks.map(rank => { const icon = rank.iconUrl || (game === 'valorant' ? getRankIconUrl(rank.sortOrder) : null); return <SelectItem key={rank.id} value={String(rank.sortOrder)}><span className="lfg-rank-option">{icon && <img src={icon} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}{rank.displayName}</span></SelectItem>; })}</SelectContent></Select></div>;
}
