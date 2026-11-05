import { Flag, Mic, MicOff } from 'lucide-react';
import { LfgListingCard } from '@/components/competitive/LfgListingCard';
import { toListing } from '@/lib/squadUpListing';
import '@/components/competitive/lfg-glass.css';
import type { SlatePlayer } from './slate';

const SYNERGY = { great_synergy: 'Roles fit yours', role_overlap: 'Same roles as you', unknown: null } as const;
const noop = () => undefined;

/**
 * A Squad Up player, shown with the Find Teammates listing card, plus what only Squad Up knows: they already
 * want to play with you, mic, how many they need, and how your roles fit.
 */
export function SquadUpPlayerCard({ player, onReport }: { player: SlatePlayer; onReport?: () => void }) {
  const synergy = player.synergy ? SYNERGY[player.synergy] : null;
  return (
    <div className="su-pcard" aria-label={`${player.name}, ${player.tierName ?? 'unranked'}`}>
      <LfgListingCard listing={toListing(player)} roles={[]} selected={false} onSelect={noop} onSave={noop} savePending={false} isOwn preview priority />
      {player.likedYou && <p className="su-pcard-cue"><span className="su-dot" aria-hidden /> Wants to play with you</p>}
      {onReport && (
        <button type="button" className="su-pcard-report" aria-label={`Report ${player.name}`} title="Report this player"
          onPointerDown={(event) => event.stopPropagation()} onClick={onReport}>
          <Flag size={15} aria-hidden />
        </button>
      )}
      <ul className="su-pcard-tags" aria-label="Squad Up details">
        <li>{player.mode === 'competitive' ? 'Competitive' : 'Unrated'}</li>
        <li>{player.mic ? <><Mic size={12} aria-hidden /> Mic on</> : <><MicOff size={12} aria-hidden /> No mic</>}</li>
        <li>Needs {player.needs}</li>
        {synergy && <li className={player.synergy === 'great_synergy' ? 'is-good' : ''}>{synergy}</li>}
      </ul>
    </div>
  );
}
