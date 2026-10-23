import { useId } from 'react';
import { motion } from 'framer-motion';
import { usePricingMotion } from '@/hooks/usePricingMotion';

interface Props {
  filter: { differences: boolean; viaPointer: boolean };
  featureCount: number;
  onChange: (differences: boolean, viaPointer: boolean) => void;
}

export default function PricingFeatureFilter({ filter, featureCount, onChange }: Props) {
  const allowMotion = usePricingMotion();
  const indicatorId = useId();
  return (
    <div className="pricing-comparison-controls">
      <fieldset className="pricing-feature-filter">
        <legend className="sr-only">Choose which plan features to compare</legend>
        {[{ differences: false, label: 'All features' }, { differences: true, label: 'What Pro adds' }].map(option => (
          <button type="button" key={option.label} aria-pressed={filter.differences === option.differences} onClick={event => onChange(option.differences, event.detail > 0)}>
            {filter.differences === option.differences && <motion.span className="pricing-filter-indicator" layoutId={indicatorId} initial={false} transition={{ duration: allowMotion && filter.viaPointer ? 0.22 : 0, ease: [0.2, 0, 0, 1] }} aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        ))}
      </fieldset>
      <p role="status" aria-live="polite">{featureCount} {filter.differences ? 'differences' : 'features'}</p>
    </div>
  );
}
