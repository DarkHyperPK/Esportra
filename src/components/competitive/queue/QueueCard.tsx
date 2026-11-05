import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { parsePopularAgents, resolveAgent } from '@/lib/valorantAgents';
import type { QueueCard as QueueCardData, SynergyLabel } from '@/schemas/lfgQueue';

const SYNERGY: Record<SynergyLabel, { text: string; tone: 'success' | 'neutral' } | null> = {
  great_synergy: { text: 'Great synergy', tone: 'success' },
  role_overlap: { text: 'Same roles', tone: 'neutral' },
  unknown: null,
};

const pct = (value: number | null | undefined) => (value == null ? '—' : `${Math.round(value)}%`);

export function QueueCard({ card }: { card: QueueCardData }) {
  const avatar = resolveLfgAvatar(card.avatarUrl, card.avatarSeed, card.avatarStyle);
  const rankIcon = card.competitiveTier >= 3 ? getRankIconUrl(card.competitiveTier - 3) : null;
  const agents = parsePopularAgents(card.popularAgents).slice(0, 3);
  const synergy = SYNERGY[card.synergyLabel];
  const riotId = card.riotGameName ? `${card.riotGameName}#${card.riotTagLine ?? ''}` : null;
  return (
    <article className="lfg-panel queue-card" aria-label={`${card.username}, ${card.competitiveTierName ?? 'unranked'}`}>
      <div className="queue-card-top">
        <span className="queue-avatar">
          {avatar ? <img src={avatar} alt="" /> : card.username.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className="queue-name">{card.username}</div>
          {riotId && <div className="queue-muted">{riotId}</div>}
          <div className="queue-rank">
            {rankIcon && <img src={rankIcon} alt="" />}
            <span>{card.competitiveTierName ?? 'Ranked'}</span>
          </div>
        </div>
      </div>
      <div className="queue-badges">
        {card.likedYou && <span className="queue-badge" data-tone="accent">Liked you</span>}
        {synergy && <span className="queue-badge" data-tone={synergy.tone}>{synergy.text}</span>}
        <span className="queue-badge">{card.micOn ? 'Mic on' : 'No mic'}</span>
        <span className="queue-badge">Needs {card.slotsNeeded}</span>
        {card.regionDisplayName && <span className="queue-badge">{card.regionDisplayName}</span>}
      </div>
      <div className="queue-stats">
        <div className="queue-stat"><strong>{pct(card.winRate)}</strong><span>Win rate</span></div>
        <div className="queue-stat"><strong>{card.kdRatio == null ? '—' : card.kdRatio.toFixed(2)}</strong><span>K/D</span></div>
        <div className="queue-stat"><strong>{pct(card.hsPct)}</strong><span>Headshots</span></div>
      </div>
      {agents.length > 0 && (
        <div className="queue-agents" aria-label="Most played agents">
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
