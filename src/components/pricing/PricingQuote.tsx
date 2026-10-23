import { AnimatePresence, motion } from 'framer-motion';
import { usePricingMotion } from '@/hooks/usePricingMotion';
import { EVENT_RATES, formatPkr, type PricingSelection } from './pricingContent';

export default function PricingQuote({ selection }: { selection: PricingSelection }) {
  const allowMotion = usePricingMotion();
  const rate = EVENT_RATES.find(item => String(item.teams) === selection.teams);
  const animate = allowMotion && selection.viaPointer;
  return (
    <div className="pricing-price-block">
      <span className="pricing-caption">{rate ? 'Launch event rate' : 'Built around your event'}</span>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{rate ? `Up to ${rate.teams} teams: PKR ${formatPkr(rate.price)} per event.` : 'More than 512 teams: contact us for a custom quote.'}</span>
      <div className="pricing-price" aria-hidden="true">
        {rate && <span className="pricing-currency">PKR</span>}
        <AnimatePresence initial={false} mode="popLayout" custom={animate}>
          <motion.strong key={selection.teams} className={rate ? 'pricing-price-value' : 'pricing-custom-price'} initial={animate ? { opacity: 0, transform: 'translateY(6px)' } : false} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit="leave" variants={{ leave: (enabled: boolean) => ({ opacity: 0, transform: enabled ? 'translateY(-4px)' : 'translateY(0px)', transition: { duration: enabled ? 0.11 : 0, ease: [0.4, 0, 1, 1] } }) }} transition={{ duration: animate ? 0.18 : 0, ease: [0.2, 0, 0, 1] }}>{rate ? formatPkr(rate.price) : 'Let’s talk'}</motion.strong>
        </AnimatePresence>
        {rate && <span>/ event</span>}
      </div>
      <p>{rate ? <><s>PKR {formatPkr(rate.regular)}</s><span className="pricing-rate-note">Launch pricing · one-time payment</span></> : 'A custom quote for your bracket size.'}</p>
    </div>
  );
}
