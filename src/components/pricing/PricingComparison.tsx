import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FEATURE_GROUPS, type PricingSelection, type SelectPricingTeams } from './pricingContent';
import PricingFeatureFilter from './PricingFeatureFilter';
import PricingFeatureTable from './PricingFeatureTable';
import PricingRatePicker from './PricingRatePicker';

export default function PricingComparison({ selection, onSelectTeams }: { selection: PricingSelection; onSelectTeams: SelectPricingTeams }) {
  const [filter, setFilter] = useState({ differences: false, viaPointer: false });
  const groups = FEATURE_GROUPS.map(group => ({ ...group, rows: group.rows.filter(row => !filter.differences || row.free !== row.pro) })).filter(group => group.rows.length > 0);
  const featureCount = groups.reduce((total, group) => total + group.rows.length, 0);
  return (
    <section id="compare" className="pricing-comparison pricing-paper" aria-labelledby="comparison-title">
      <div className="pricing-section-heading">
        <div><p className="pricing-caption">05 / Every detail, out in the open</p><h2 id="comparison-title">No fine-print<br />gymnastics.</h2></div>
        <p>What’s free. What’s Pro.<br />Exactly what your event gets.</p>
      </div>
      <details className="pricing-compare-details"><summary>Compare every feature<ChevronDown size={18} aria-hidden="true" /></summary><div className="pricing-compare-body">
        <PricingFeatureFilter filter={filter} featureCount={featureCount} onChange={(differences, viaPointer) => setFilter({ differences, viaPointer })} />
        <PricingFeatureTable groups={groups} />
      </div></details>
      <PricingRatePicker selection={selection} onSelectTeams={onSelectTeams} />
    </section>
  );
}
