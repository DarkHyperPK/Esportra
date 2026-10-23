import { useRef } from 'react';
import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CommandButton } from '@/components/management/CommandSurface';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { EVENT_RATES, type PricingSelection, type SelectPricingTeams } from './pricingContent';
import PricingQuote from './PricingQuote';

interface PricingPlansProps { startHref: string; startLabel: string; selection: PricingSelection; onSelectTeams: SelectPricingTeams; }

export default function PricingPlans({ startHref, startLabel, selection, onSelectTeams }: PricingPlansProps) {
  const pointerSelection = useRef(false);
  return (
    <section id="plans" className="pricing-pass-section" aria-labelledby="plans-title">
      <div className="pricing-section-heading"><div><p className="pricing-caption">01 / Choose your pass</p><h2 id="plans-title">Make room for<br />the good part.</h2></div><p>Start free. Get your day in order.<br />Go Pro when the event grows.</p></div>
      <div className="pricing-plans">
        <article className="pricing-plan pricing-plan-free">
          <div className="pricing-plan-heading"><img className="pricing-pass-logo pricing-pass-logo-dark" src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} alt="Esportra" width={36} height={36} loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /><span className="pricing-caption">COMMUNITY PASS / 01</span></div>
          <div className="pricing-plan-name"><h3>Free</h3><span>THE REAL DEAL.</span></div>
          <p className="pricing-plan-description">Get everyone on the same page.<br />Spend less of the day chasing details.</p>
          <div className="pricing-price-block"><span className="pricing-caption">Always free</span><div className="pricing-price"><span className="pricing-currency">PKR</span><strong>0</strong><span>/ month</span></div><p>No card. No countdown. Your cup, from start to finish.</p></div>
          <CommandButton variant="secondary" size="lg" asChild className="pricing-plan-action"><Link to={startHref}>{startLabel}<ArrowUpRight size={18} aria-hidden="true" /></Link></CommandButton>
          <p className="pricing-list-heading">Keep the day moving.</p>
          <ul className="pricing-feature-list">{['Up to 32 teams per event', '2 published events every calendar month', 'All formats, including multi-stage', 'Registration, scheduling & match rooms', 'Results, standings & standard map veto', 'Unlimited draft events'].map(text => <li key={text}><Check size={15} aria-hidden="true" />{text}</li>)}</ul>
          <div className="pricing-pass-bottom"><span>NO SUBSCRIPTION REQUIRED</span><i className="pricing-barcode" aria-hidden="true" /></div>
        </article>
        <article className="pricing-plan pricing-plan-pro">
          <div className="pricing-plan-heading"><img className="pricing-pass-logo" src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} alt="Esportra" width={36} height={36} loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /><span className="pricing-caption">EVENT PASS / 02</span></div>
          <div className="pricing-plan-name"><h3>Organizer Pro</h3><span>GO BIGGER.</span></div>
          <p className="pricing-plan-description">More teams, fewer loose ends.<br />Keep players and viewers in the loop.</p>
          <PricingQuote selection={selection} />
          <CommandButton variant="primary" size="lg" asChild className="pricing-plan-action"><Link to="/contact">Plan my Pro event<ArrowUpRight size={18} aria-hidden="true" /></Link></CommandButton>
          <div className="pricing-team-selector"><label htmlFor="pricing-teams">Your bracket size</label><div><select id="pricing-teams" value={selection.teams} onPointerDown={() => { pointerSelection.current = true; }} onKeyDown={() => { pointerSelection.current = false; }} onChange={event => onSelectTeams(event.target.value, pointerSelection.current)}>{EVENT_RATES.map(item => <option key={item.teams} value={item.teams}>Up to {item.teams} teams</option>)}<option value="custom">More than 512 teams</option></select><ChevronDown size={15} aria-hidden="true" /></div></div>
          <p className="pricing-list-heading">Everything in Free, plus</p>
          <ul className="pricing-feature-list">{['Larger brackets for your event', 'Custom map pick & ban sequences', 'Live veto overlay in match rooms', 'OBS overlay for your stream', 'Discord DMs to teams'].map(text => <li key={text}><Check size={15} aria-hidden="true" />{text}</li>)}</ul>
          <div className="pricing-pass-bottom"><span>ONE EVENT. ONE PAYMENT.</span><i className="pricing-barcode" aria-hidden="true" /></div>
        </article>
      </div>
      <div className="pricing-custom"><p>More than 512 teams, or another event this month?<br /><strong>Let’s make room for your ambition.</strong></p><Link to="/contact">Talk to us<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    </section>
  );
}
