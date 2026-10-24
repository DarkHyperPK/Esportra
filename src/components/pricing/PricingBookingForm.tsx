import type { FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { ProEventDetails } from '@/schemas/proEventRequest';

interface Props {
  draft: ProEventDetails;
  onChange: (next: ProEventDetails) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  error: string | null;
}

export default function PricingBookingForm({ draft, onChange, onSubmit, pending, error }: Props) {
  const set = (key: keyof ProEventDetails, value: string | number) => onChange({ ...draft, [key]: value });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  return <form className="pricing-booking-form" onSubmit={onSubmit} aria-busy={pending}><fieldset disabled={pending} className="pricing-booking-form-fields">
    <label htmlFor="pro-event-name">Event name<input id="pro-event-name" name="eventName" required minLength={3} maxLength={120} value={draft.eventName} onChange={event => set('eventName', event.target.value)} autoComplete="off" placeholder="The Saturday Cup" /></label>
    <div className="pricing-booking-fields"><label htmlFor="pro-game">Game<input id="pro-game" name="gameTitle" required minLength={2} maxLength={80} value={draft.gameTitle} onChange={event => set('gameTitle', event.target.value)} placeholder="e.g. Valorant" /></label><label htmlFor="pro-team-count">Maximum teams<input id="pro-team-count" name="teamCount" type="number" min={2} max={10000} required value={draft.teamCount || ''} onChange={event => set('teamCount', Number(event.target.value))} inputMode="numeric" /></label></div>
    <div className="pricing-booking-fields"><label htmlFor="pro-start">Start date · PKT<input id="pro-start" name="startsOn" type="date" min={today} required value={draft.startsOn} onChange={event => set('startsOn', event.target.value)} /></label><label htmlFor="pro-end">End date · PKT<input id="pro-end" name="endsOn" type="date" min={draft.startsOn || today} required value={draft.endsOn} onChange={event => set('endsOn', event.target.value)} /></label></div>
    <label htmlFor="pro-email">Reply email<input id="pro-email" name="email" type="email" required maxLength={254} autoComplete="email" value={draft.email} onChange={event => set('email', event.target.value)} placeholder="you@yourcommunity.com" /></label>
    <label className="pricing-booking-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={draft.website} onChange={event => set('website', event.target.value)} /></label>
    </fieldset>{error && <p className="pricing-booking-error" role="alert">{error}</p>}
    <button className="pricing-button pricing-button-primary" type="submit" disabled={pending}>{pending ? 'Preparing your request…' : draft.teamCount > 32 && draft.teamCount <= 512 ? 'Create my Pro invoice' : 'Request a custom quote'}<ArrowUpRight size={18} aria-hidden="true" /></button>
    <p className="pricing-booking-privacy">We use these details to follow up on this event. <a href="/privacy" target="_blank" rel="noreferrer">Privacy policy</a></p>
  </form>;
}
