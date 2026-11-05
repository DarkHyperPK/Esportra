import { Flag, Mic, MicOff } from 'lucide-react';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { getCountryFlagUrl } from '@/utils/countries';
import { countryName } from '@/lib/countryAreas';
import type { SlatePlayer } from './slate';

const pct = (value?: number | null) => (value == null ? '—' : `${Math.round(value)}%`);
const SYNERGY = { great_synergy: 'Roles fit yours', role_overlap: 'Same roles as you', unknown: null } as const;

/**
 * The player card: a square broadcast slate. Name and rank lead, the stat strip reads like a lower third,
 * and the rose cue is reserved for one thing: this player already wants to play with you.
 */
export function PlayerSlate({ player, onReport }: { player: SlatePlayer; onReport?: () => void }) {
  const rankIcon = player.tier != null && player.tier >= 3 ? getRankIconUrl(player.tier - 3) : null;
  const synergy = player.synergy ? SYNERGY[player.synergy] : null;
  return (
    <article className="su-slate" aria-label={`${player.name}, ${player.tierName ?? 'unranked'}`}>
      <header className="su-slate-head">
        <span className="su-slate-avatar">
          {player.avatarUrl ? <img src={player.avatarUrl} alt="" draggable={false} /> : player.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="su-slate-id">
          <h3>{player.name}</h3>
          <p>
            {player.riotId && <span className="su-slate-riot">{player.riotId}</span>}
            {player.countryCode && (
              <span className="su-slate-country">
                <img src={getCountryFlagUrl(player.countryCode)} alt="" draggable={false} /> {countryName(player.countryCode)}
              </span>
            )}
          </p>
        </div>
        {onReport && (
          <button type="button" className="su-slate-report" aria-label={`Report ${player.name}`} title="Report this player"
            onPointerDown={(event) => event.stopPropagation()} onClick={onReport}>
            <Flag size={14} aria-hidden />
          </button>
        )}
      </header>

      {player.likedYou && <p className="su-slate-cue"><span className="su-dot" aria-hidden /> Wants to play with you</p>}

      <div className="su-slate-rank">
        {rankIcon ? <img src={rankIcon} alt="" draggable={false} /> : <span className="su-slate-rank-none" aria-hidden />}
        <strong>{player.tierName ?? 'Unranked'}</strong>
        <span className="su-caption">{player.mode === 'competitive' ? 'Competitive' : 'Unrated'}</span>
      </div>

      <dl className="su-slate-stats">
        <div><dt className="su-caption">Win rate</dt><dd>{pct(player.winRate)}</dd></div>
        <div><dt className="su-caption">K/D</dt><dd>{player.kd == null ? '—' : player.kd.toFixed(2)}</dd></div>
        <div><dt className="su-caption">Headshots</dt><dd>{pct(player.hs)}</dd></div>
      </dl>

      {player.agents.length > 0 && (
        <ul className="su-slate-agents" aria-label="Most played agents">
          {player.agents.slice(0, 3).map((agent) => (
            <li key={agent.id}>{agent.iconUrl && <img src={agent.iconUrl} alt="" draggable={false} />}<span>{agent.name}</span></li>
          ))}
        </ul>
      )}

      {player.note && <p className="su-slate-note">“{player.note}”</p>}

      <ul className="su-slate-tags" aria-label="About this player">
        {player.roles?.map((role) => <li key={role}>{role}</li>)}
        <li>{player.mic ? <><Mic size={12} aria-hidden /> Mic on</> : <><MicOff size={12} aria-hidden /> No mic</>}</li>
        <li>Needs {player.needs}</li>
        {synergy && <li>{synergy}</li>}
      </ul>
    </article>
  );
}
