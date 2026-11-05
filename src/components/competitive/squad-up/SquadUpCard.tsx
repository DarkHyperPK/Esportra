import { Flag } from 'lucide-react';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { parsePopularAgents, resolveAgent } from '@/lib/valorantAgents';
import type { SquadUpCard as SquadUpCardData, SynergyLabel } from '@/schemas/squadUp';

const SYNERGY: Record<SynergyLabel, { text: string; tone: 'success' | 'neutral' } | null> = {
  great_synergy: { text: 'Great synergy', tone: 'success' },
  role_overlap: { text: 'Same roles', tone: 'neutral' },
  unknown: null,
};

const pct = (value: number | null | undefined) => (value == null ? '—' : `${Math.round(value)}%`);

export function SquadUpCard({ card, onReport }: { card: SquadUpCardData; onReport?: () => void }) {
  const avatar = resolveLfgAvatar(card.avatarUrl, card.avatarSeed, card.avatarStyle);
  const rankIcon = card.competitiveTier >= 3 ? getRankIconUrl(card.competitiveTier - 3) : null;
  const agents = parsePopularAgents(card.popularAgents).slice(0, 3);
  const synergy = SYNERGY[card.synergyLabel];
  const riotId = card.riotGameName ? `${card.riotGameName}#${card.riotTagLine ?? ''}` : null;
  return (
    <article className="lfg-panel squad-card" aria-label={`${card.username}, ${card.competitiveTierName ?? 'unranked'}`}>
      {onReport && (
        <button type="button" className="lfg-button squad-card-flag" aria-label={`Report ${card.username}`} title="Report this player" onClick={onReport}>
          <Flag size={14} aria-hidden />
        </button>
      )}
      <div className="squad-card-top">
        <span className="squad-avatar">
          {avatar ? <img src={avatar} alt="" /> : card.username.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className="squad-name">{card.username}</div>
          {riotId && <div className="squad-muted">{riotId}</div>}
          <div className="squad-rank">
            {rankIcon && <img src={rankIcon} alt="" />}
            <span>{card.competitiveTierName ?? 'Ranked'}</span>
          </div>
        </div>
      </div>
      <div className="squad-badges">
        {card.likedYou && <span className="squad-badge" data-tone="accent">Liked you</span>}
        {synergy && <span className="squad-badge" data-tone={synergy.tone}>{synergy.text}</span>}
        <span className="squad-badge">{card.micOn ? 'Mic on' : 'No mic'}</span>
        <span className="squad-badge">Needs {card.slotsNeeded}</span>
        {card.regionDisplayName && <span className="squad-badge">{card.regionDisplayName}</span>}
      </div>
      <div className="squad-stats">
        <div className="squad-stat"><strong>{pct(card.winRate)}</strong><span>Win rate</span></div>
        <div className="squad-stat"><strong>{card.kdRatio == null ? '—' : card.kdRatio.toFixed(2)}</strong><span>K/D</span></div>
        <div className="squad-stat"><strong>{pct(card.hsPct)}</strong><span>Headshots</span></div>
      </div>
      {agents.length > 0 && (
        <div className="squad-agents" aria-label="Most played agents">
          {agents.map((agent) => {
            const known = resolveAgent(agent.agentId);
            const icon = known?.iconUrl || agent.iconUrl;
            return icon ? <img key={agent.agentId} src={icon} alt={known?.displayName || agent.displayName} /> : null;
          })}
        </div>
      )}
    </article>
  );
}
