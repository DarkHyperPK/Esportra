import { Check } from 'lucide-react';
import { EVENT_RATES, formatPkr, type PricingSelection, type SelectPricingTeams } from './pricingContent';

export default function PricingRatePicker({ selection, onSelectTeams }: { selection: PricingSelection; onSelectTeams: SelectPricingTeams }) {
  return (
    <div className="pricing-rates">
      <div>
        <h3>Pay for the event. Keep the off-season free.</h3>
        <p>Launch rates include every Pro feature.<br />One event payment by bank transfer. No recurring charge.</p>
      </div>
      <div className="pricing-rate-grid" role="group" aria-label="Select your event bracket">
        {EVENT_RATES.map(rate => <button type="button" key={rate.teams} aria-pressed={selection.teams === String(rate.teams)} onClick={event => onSelectTeams(String(rate.teams), event.detail > 0)}>
          <span>Up to {rate.teams} teams <Check className="pricing-rate-check" size={13} aria-hidden="true" /></span>
          <strong><small>PKR</small> {formatPkr(rate.price)}</strong>
          <s>PKR {formatPkr(rate.regular)}</s>
        </button>)}
      </div>
      <p className="pricing-rate-selection" role="status" aria-live="polite">{selection.teams === 'custom' ? 'More than 512 teams: a custom quote for your event.' : `Up to ${selection.teams} teams selected. Your Pro quote above is updated.`}</p>
    </div>
  );
}
