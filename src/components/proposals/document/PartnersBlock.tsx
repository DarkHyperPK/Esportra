import type { ProposalPartner } from '@/schemas/proposal';
import { CAPTION } from './docStyles';

/** Partner marks in a quiet row, never recoloured. No logo yet: the name is set in type. */
export function PartnersBlock({ partners }: { partners: ProposalPartner[] }) {
  const shown = partners.filter((p) => p.name.trim());
  if (shown.length === 0) return null;
  return (
    <div className="pd-avoid text-center">
      <p className={`${CAPTION} mb-5`}>Already on board</p>
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {shown.map((partner, i) => (
          <li key={`${partner.name}-${i}`} className="flex h-10 items-center">
            {partner.logoUrl ? (
              <img src={partner.logoUrl} alt={partner.name} className="pd-logo max-h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              <span className="font-heading text-lg font-extrabold uppercase tracking-[0.14em] text-[color:var(--pd-label)]">{partner.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
