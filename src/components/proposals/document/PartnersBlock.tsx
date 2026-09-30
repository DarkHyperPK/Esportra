import type { ProposalPartner } from '@/schemas/proposal';
import { CAPTION, CELL_RAISED, FLEX_GRID, TITLE } from './docStyles';

/** Partner marks sit in a neutral well, never recoloured. No logo yet: the name is set in type. */
export function PartnersBlock({ partners }: { partners: ProposalPartner[] }) {
  const shown = partners.filter((p) => p.name.trim());
  if (shown.length === 0) return null;
  return (
    <div className="pd-avoid">
      <p className={`${CAPTION} mb-4`}>Current partners</p>
      <div className={`${FLEX_GRID} w-fit max-w-full`}>
        {shown.map((partner, i) => (
          <div key={`${partner.name}-${i}`} className={`${CELL_RAISED} flex h-24 w-44 items-center justify-center p-5 sm:w-56`}>
            {partner.logoUrl ? (
              <img src={partner.logoUrl} alt={partner.name} className="pd-logo max-h-10 w-auto max-w-full object-contain" />
            ) : (
              <span className={`${TITLE} text-lg uppercase tracking-[0.16em]`}>{partner.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
