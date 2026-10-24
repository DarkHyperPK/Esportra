import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculateEventEarnings, MAX_EVENT_TEAMS } from '@/services/pricing/eventBudget';
import { formatPkr } from './pricingContent';
import PricingBookingButton from './PricingBookingButton';

const TEAM_PRESETS = [8, 16, 32, 64, 128, 256, 512, 1024];

export default function PricingBudget({ startHref }: { startHref: string }) {
  const [teams, setTeams] = useState(32);
  const [teamInput, setTeamInput] = useState('32');
  const [entry, setEntry] = useState('1000');
  const [prize, setPrize] = useState(60);
  const result = calculateEventEarnings({ teams, entryFee: Number(entry || 0), prizePercent: prize });
  const { pass, earnings } = result;
  const deficit = earnings !== null && earnings < 0;
  const amount = (value: number) => `PKR ${formatPkr(value)}`;
  const selectTeams = (value: number) => { setTeams(value); setTeamInput(String(value)); };
  const updateTeams = (value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setTeamInput(value);
    const next = Number(value);
    if (next >= 2 && next <= MAX_EVENT_TEAMS) setTeams(next);
  };
  const passLabel = pass.kind === 'free' ? 'Free event' : pass.kind === 'pro' ? `Pro · up to ${pass.capacity} teams` : 'Custom event';
  return <section id="event-budget" className="pricing-budget" aria-labelledby="budget-title">
    <div className="pricing-section-heading"><div><p className="pricing-caption">02 / See your upside</p><h2 id="budget-title">Run the event.<br />Keep your share.</h2></div><p>Give your community a reason to compete.<br />See what a full event could earn you.</p></div>
    <div className="pricing-budget-board">
      <div className="pricing-budget-inputs">
        <div className="pricing-budget-field">
          <label htmlFor="budget-teams">Teams in your event <span>2–10,000 teams</span></label>
          <div className="pricing-budget-team-count"><input id="budget-teams" type="number" min={2} max={MAX_EVENT_TEAMS} step={1} inputMode="numeric" value={teamInput} onChange={event => updateTeams(event.target.value)} onBlur={() => setTeamInput(String(teams))} /><span>{passLabel}</span></div>
          <input aria-label="Adjust team count" type="range" min={2} max={1024} step={1} value={Math.min(teams, 1024)} onChange={event => selectTeams(Number(event.target.value))} />
          <div className="pricing-budget-range-labels"><span>2 teams</span><span>1,024 · type above for more</span></div>
          <div className="pricing-budget-presets" role="group" aria-label="Quick team counts">{TEAM_PRESETS.map(count => <button key={count} type="button" aria-pressed={teams === count} onClick={() => selectTeams(count)}>{formatPkr(count)}</button>)}</div>
        </div>
        <div className="pricing-budget-field"><label htmlFor="budget-entry">Entry fee per team <span>PKR</span></label><input id="budget-entry" type="number" min={0} max={1000000} step="0.01" inputMode="decimal" value={entry} onChange={event => { const next = event.target.value; if (next === '' || (Number.isFinite(Number(next)) && Number(next) >= 0 && Number(next) <= 1000000)) setEntry(next); }} /></div>
        <div className="pricing-budget-field"><label htmlFor="budget-prize">Share for the prize pool <output htmlFor="budget-prize">{prize}%</output></label><input id="budget-prize" type="range" min={0} max={100} value={prize} onChange={event => setPrize(Number(event.target.value))} /><p>You choose the prize share. The rest goes toward your earnings and event pass.</p></div>
        <p className="pricing-budget-assumption">Full registration: {formatPkr(teams)} teams × {amount(Number(entry || 0))}. Your pass is matched automatically.</p>
      </div>
      <div className="pricing-budget-result" data-deficit={deficit}>
        <div className="pricing-budget-result-heading"><p className="pricing-caption">{deficit ? 'Your event balance' : 'Your potential earnings'}</p><span>FULL REGISTRATION</span></div>
        <div className="pricing-budget-total" role="status" aria-live="polite" aria-atomic="true" aria-label={earnings === null ? 'Potential earnings need a custom quote' : `Potential earnings: ${amount(earnings)}`}><span>{earnings !== null && 'PKR'}</span><strong>{earnings === null ? 'Let’s go bigger.' : formatPkr(earnings)}</strong></div>
        <p>{earnings === null ? 'Your scale. Your plan. Get a custom pass quote to complete your earnings estimate.' : deficit ? 'The prize pool and pass exceed entry income at these settings. Try a different entry fee or prize share.' : 'For you, after the prize pool and Esportra pass.'}</p>
        <dl className="pricing-budget-ledger"><div><dt>{formatPkr(teams)} team entries</dt><dd>{amount(result.receipts)}</dd></div><div><dt>Players’ prize pool · {prize}%</dt><dd>{amount(result.prizes)}</dd></div><div><dt>{pass.kind === 'free' ? 'Esportra Free' : 'Esportra event pass'}</dt><dd>{pass.price === null ? 'Custom quote' : pass.price === 0 ? 'PKR 0' : amount(pass.price)}</dd></div></dl>
        {pass.kind === 'free' && <div className="pricing-budget-free-message"><strong>Your event. Your earnings.</strong><p>Up to 32 teams. Two free events a month.<br />No subscription eating into the next one.</p></div>}
        {pass.kind === 'pro' && <div className="pricing-budget-free-message"><strong>One event pass. No monthly bill.</strong><p>All Pro features at your selected bracket size.</p></div>}
        <p className="pricing-budget-note">Estimate at full paid registration, before tax and other expenses. You collect entry fees; paid passes are purchased separately.</p>
        {pass.kind === 'free' ? <Link className="pricing-button pricing-button-primary" to={startHref}>Host this event free<ArrowUpRight size={17} aria-hidden="true" /></Link> : <PricingBookingButton className="pricing-button pricing-button-primary" teamCount={teams}>{pass.kind === 'custom' ? 'Get my event quote' : 'Make this event happen'}</PricingBookingButton>}
      </div>
    </div>
  </section>;
}
