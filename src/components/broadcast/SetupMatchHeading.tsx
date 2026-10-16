import { CalendarClock, ChevronRight, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { matchTime } from '@/services/broadcast/broadcastSetup';
import type { BroadcastShowDetail, ShowMatchSlot } from '@/types/broadcast';

export function SetupMatchHeading({ show, match, online, connection }: { show: BroadcastShowDetail; match?: ShowMatchSlot; online: number; connection?: "checking" | "unavailable" }) {
  return <div className="setup-match-context" aria-label="Selected broadcast match">
    <div className="setup-fixture-copy">
      <div className="setup-fixture-caption"><span>{show.tournamentName || show.title}</span><span>{match?.roundLabel || 'Match preparation'}</span></div>
      {match ? <h1>{match.teamA && match.teamB ? <>{match.teamA}{' '}<span className="setup-versus">vs</span>{' '}{match.teamB}</> : match.matchTitle || 'Selected match'}</h1> : <><h1>{show.tournamentName || show.title}</h1><p>No match selected. Teams and details load when you choose a match.</p></>}
      {match && <p><CalendarClock size={14} /> {matchTime(match.scheduledAt)} {match.bestOf ? ` · Best of ${match.bestOf}` : ''}</p>}
    </div>
    <div className="setup-fixture-status"><Monitor size={18} /><strong>{connection === 'checking' ? 'Checking connection…' : connection === 'unavailable' ? 'Connection unavailable' : online ? `${online} desktop${online === 1 ? '' : 's'} online` : 'No desktop online'}</strong><Link to={`/broadcast/shows/${show.id}/nodes`}>Desktop connections <ChevronRight size={12} /></Link></div>
  </div>;
}
