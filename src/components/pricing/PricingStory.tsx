import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { usePricingMotion } from '@/hooks/usePricingMotion';
import PricingHostingPreview from './PricingHostingPreview';

export default function PricingStory() {
  const [selection, setSelection] = useState({ calm: false, pointer: false });
  const animate = usePricingMotion() && selection.pointer;
  const markerId = useId();
  const calmButton = useRef<HTMLButtonElement>(null);
  return (
    <section id="pricing-story" className="pricing-story" aria-labelledby="pricing-story-title">
      <div className="pricing-story-top"><div><p className="pricing-caption">02 / Free should mean something</p><h2 id="pricing-story-title">LESS CHASING.<br /><span>MORE HOSTING.</span></h2></div><div className="pricing-story-aside"><p>Your best memory of match day should be the final.<br /><strong>Not the hours spent asking who’s ready.</strong></p><p>Give your teams a clear plan. Keep the moving parts together. Get back to the community you brought here.</p></div></div>
      <div className="pricing-story-console">
        <div className="pricing-story-toolbar"><span>THE SAME CUP. A DIFFERENT KIND OF DAY.</span><div className="pricing-story-tabs" role="group" aria-label="Compare the hosting experience">{[{ calm: false, label: 'The usual scramble' }, { calm: true, label: 'With Esportra' }].map(option => <button type="button" key={option.label} ref={option.calm ? calmButton : undefined} aria-pressed={selection.calm === option.calm} onClick={event => setSelection({ calm: option.calm, pointer: event.detail > 0 })}>{selection.calm === option.calm && <motion.span className="pricing-story-tab-marker" layoutId={markerId} transition={{ duration: animate ? 0.22 : 0, ease: [0.2, 0, 0, 1] }} aria-hidden="true" />}<span>{option.label}</span></button>)}</div></div>
        <div className="pricing-hosting-stage" role="region" aria-label="Match-day experience preview">
          <AnimatePresence initial={false} mode="wait" custom={animate}><motion.div key={String(selection.calm)} initial={animate ? { opacity: 0, transform: 'translateY(14px)' } : false} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit="leave" variants={{ leave: (enabled: boolean) => ({ opacity: 0, transform: enabled ? 'translateY(-10px)' : 'none', transition: { duration: enabled ? 0.14 : 0 } }) }} transition={{ duration: animate ? 0.22 : 0, ease: [0.2, 0, 0, 1] }}><PricingHostingPreview calm={selection.calm} onResolve={pointer => { setSelection({ calm: true, pointer }); if (!pointer) calmButton.current?.focus(); }} /></motion.div></AnimatePresence>
        </div>
        <ul className="pricing-hosting-outcomes">{[{ title: 'Less “what time?”', detail: 'A clear schedule' }, { title: 'Less “where’s the link?”', detail: 'A room for every match' }, { title: 'Less “who won?”', detail: 'Results in one place' }].map(outcome => <li key={outcome.title}><Check size={16} aria-hidden="true" /><span>{outcome.title}<small>{outcome.detail}</small></span></li>)}</ul>
      </div>
      <p className="pricing-story-note">Scheduling, check-in, match rooms and results. Included in Free.</p>
      <p className="sr-only" role="status" aria-live="polite">{selection.calm ? 'With Esportra: a clear schedule and match-day details in one place.' : 'The usual scramble: chasing times, room links and results across conversations.'}</p>
    </section>
  );
}
