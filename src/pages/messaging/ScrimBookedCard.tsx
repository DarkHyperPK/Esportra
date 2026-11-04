import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScrimBookedMessage } from './scrimBookedMessage';

export function ScrimBookedCard({ scrim }: { scrim: ScrimBookedMessage }) {
  return <Link className="inbox-lfg-reference inbox-scrim-booked" to={scrim.path}>
    <span className="inbox-lfg-copy">
      <small>Scrim booked</small>
      <strong>{scrim.game.replace(/-/g, ' ')}</strong>
      <span>{scrim.when === 'TBD' ? 'Time to be agreed' : scrim.when} · Open match room</span>
    </span>
    <ArrowUpRight size={16} aria-hidden />
  </Link>;
}
