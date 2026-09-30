import type { Proposal } from '@/schemas/proposal';
import { CAPTION, TITLE } from './docStyles';

function ContactLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="flex items-baseline gap-4">
      <dt className={`${CAPTION} w-16 shrink-0`}>{label}</dt>
      <dd className="text-[15px] text-[color:var(--pd-label)]">{value}</dd>
    </div>
  );
}

/** Lower-third: role caption over the name, then plain contact lines. No call to action. */
export function ContactBlock({ sender }: { sender: Proposal['sender'] }) {
  return (
    <div className="pd-avoid border-l-2 border-[color:var(--pd-strong-line)] pl-5">
      <p className={CAPTION}>{[sender.title, sender.company].filter(Boolean).join(' · ')}</p>
      <p className={`${TITLE} mt-2 text-2xl`}>{sender.name}</p>
      <dl className="mt-5 space-y-2">
        <ContactLine label="Email" value={sender.email} />
        <ContactLine label="Web" value={sender.website} />
        <ContactLine label="Discord" value={sender.discord} />
      </dl>
    </div>
  );
}
