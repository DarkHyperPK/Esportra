import { Fragment } from 'react';
import { Check, Minus } from 'lucide-react';
import type { FEATURE_GROUPS } from './pricingContent';

function featureValue(value: string | boolean) {
  if (typeof value === 'string') return <span>{value}</span>;
  return value ? <><Check size={17} aria-hidden="true" /><span className="sr-only">Included</span></> : <><Minus size={15} aria-hidden="true" /><span className="sr-only">Not included</span></>;
}

export default function PricingFeatureTable({ groups }: { groups: typeof FEATURE_GROUPS }) {
  return (
    <div className="pricing-table-wrap" role="region" aria-label="Plan feature comparison" tabIndex={0}>
      <table className="pricing-table">
        <caption className="sr-only">Free and Organizer Pro feature comparison</caption>
        <thead>
          <tr>
            <th scope="col">What’s included</th>
            <th scope="col"><span>Free</span><small>PKR 0 / month</small></th>
            <th scope="col"><span>Organizer Pro</span><small>Paid per event</small></th>
          </tr>
        </thead>
        <tbody>{groups.map(group => <Fragment key={group.heading}>
          <tr className="pricing-table-group"><th scope="colgroup" colSpan={3}>{group.heading}</th></tr>
          {group.rows.map(row => <tr key={row.label}>
            <th scope="row">{row.label}</th><td>{featureValue(row.free)}</td><td>{featureValue(row.pro)}</td>
          </tr>)}
        </Fragment>)}</tbody>
      </table>
    </div>
  );
}
