import { ArrowRight, Check, Monitor, Send, SlidersHorizontal } from 'lucide-react';

export function BroadcastJourney({ published = false }: { published?: boolean }) {
  return <ol className="broadcast-journey" aria-label="Web to desktop broadcast workflow">
    <li aria-current={!published ? 'step' : undefined}><span>{published ? <Check size={15} /> : <SlidersHorizontal size={15} />}</span><div><strong>Prepare on Esportra</strong><small>Match, screens & people</small></div></li>
    <li className="journey-arrow" aria-hidden="true"><ArrowRight size={16} /></li>
    <li aria-current={published ? 'step' : undefined}><span><Send size={15} /></span><div><strong>Send setup to Air</strong><small>Continue on your production PC</small></div></li>
    <li className="journey-arrow" aria-hidden="true"><ArrowRight size={16} /></li>
    <li><span><Monitor size={15} /></span><div><strong>Send screens to OBS</strong><small>Preview, then show on air</small></div></li>
  </ol>;
}
