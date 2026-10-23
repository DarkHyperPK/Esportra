import { CalendarDays, Check } from 'lucide-react';
import PricingCoordinationMess from './PricingCoordinationMess';

const MATCH_DAY = [
  { time: '18:00', title: 'Opening matches', detail: 'A time to arrive. A room to check in.' },
  { time: '18:45', title: 'The next round', detail: 'Players can see what comes next.' },
  { time: '19:30', title: 'The final', detail: 'The moment everyone came for.' },
];

export default function PricingHostingPreview({ calm, onResolve }: { calm: boolean; onResolve: (viaPointer: boolean) => void }) {
  if (!calm) return <PricingCoordinationMess onResolve={onResolve} />;
  return (
    <div className="pricing-hosting-preview pricing-hosting-calm" data-calm="true">
      <div className="pricing-schedule"><div className="pricing-schedule-heading"><CalendarDays size={19} aria-hidden="true" /><span>THE SATURDAY CUP<small>MATCH-DAY PLAN · PKT</small></span></div>
        <ol>{MATCH_DAY.map(match => <li key={match.time}><time dateTime={match.time}>{match.time}</time><div><h3>{match.title}</h3><p>{match.detail}</p></div><Check size={15} aria-hidden="true" /></li>)}</ol>
      </div>
      <aside className="pricing-hosting-breathing-room"><p className="pricing-caption">The host’s view</p><h3>Everyone knows<br />what’s next.</h3><div><Check size={16} aria-hidden="true" /><span>Times in view.</span></div><div><Check size={16} aria-hidden="true" /><span>Match rooms together.</span></div><div><Check size={16} aria-hidden="true" /><span>Results to follow.</span></div><p>A little breathing room.<br />A lot more match day.</p></aside>
    </div>
  );
}
