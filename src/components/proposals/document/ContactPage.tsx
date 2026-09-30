import { Globe, Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
import type { Proposal } from '@/schemas/proposal';
import { fillTokens } from '@/services/proposals/format';
import { Page } from './Page';
import { Title } from './Title';

/** The close: the line, one sentence, who to talk to and how, and who is already on board. */
export function ContactPage({ doc, number }: { doc: Proposal; number: string }) {
  const { sender } = doc;
  const rows: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: Globe, label: 'Website', value: sender.website },
    { icon: Mail, label: 'Email', value: sender.email },
    { icon: MessageCircle, label: 'Discord', value: sender.discord },
    { icon: Phone, label: 'Phone', value: sender.phone },
  ].filter((r) => r.value.trim());
  const partners = doc.partners.filter((p) => p.name.trim());
  return (
    <Page anchor="close" number={number}>
      <Title doc={doc} text={doc.closingLine || 'Let’s [build].'} />
      {doc.closingNote && <p className="mt-6 max-w-lg text-xl font-semibold leading-snug text-[color:var(--pd-label)]">{fillTokens(doc.closingNote, doc)}</p>}
      <div className="mt-12 grid gap-10 md:grid-cols-2 print:mt-10 print:grid-cols-2">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[color:var(--pd-hint)]">{[sender.title, sender.company].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 text-3xl font-bold uppercase tracking-[0.03em] text-[color:var(--pd-ink)]">{sender.name}</p>
        </div>
        <ul className="space-y-4">
          {rows.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--pd-cue)]">
                <Icon className="h-5 w-5 text-[color:var(--pd-cue)]" aria-hidden />
              </span>
              <span>
                <span className="block text-[12px] font-bold uppercase tracking-[0.14em] text-[color:var(--pd-ink)]">{label}</span>
                <span className="block text-[15px] font-medium text-[color:var(--pd-muted)]">{value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {partners.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-[color:var(--pd-line)] pt-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[color:var(--pd-hint)]">Already on board</p>
          {partners.map((partner, i) => (
            <span key={`${partner.name}-${i}`} className="flex h-10 items-center">
              {partner.logoUrl ? (
                <img src={partner.logoUrl} alt={partner.name} className="pd-logo max-h-8 w-auto max-w-[160px] object-contain" />
              ) : (
                <span className="text-xl font-bold uppercase tracking-[0.16em] text-[color:var(--pd-label)]">{partner.name}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </Page>
  );
}
