import { getRankIconUrl } from '@/lib/valorantRanks';

type CurrentRank = { competitiveTier?: number | null; competitiveTierName?: string | null };

export function LfgCurrentRank({ game, rank }: { game: string; rank?: CurrentRank | null }) {
  const name = rank?.competitiveTierName || 'Unavailable';
  const icon = game === 'valorant' && rank?.competitiveTier != null && rank.competitiveTier >= 3
    ? getRankIconUrl(rank.competitiveTier - 3) : null;
  return <span className="lfg-compact-rank-inline" title="Rank in the latest synced competitive match." aria-label={`Current rank: ${name}`}>
    <span className="lfg-sub">Current</span>{icon && <img src={icon} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}<strong>{name}</strong>
  </span>;
}
