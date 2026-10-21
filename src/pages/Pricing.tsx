/**
 * Public pricing page — /pricing
 * Marketing surface — full viewport width, not CommandPageGrid.
 */
import { Check, Minus, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Footer from '@/components/Footer';

/* ─── data ─────────────────────────────────────────────────────────── */

const BRACKET_ROWS = [
  { bracket: 'Up to 32 teams',  regular: null,        promo: null,        isFree: true  },
  { bracket: 'Up to 64 teams',  regular: 'PKR 20,000', promo: 'PKR 12,000', isFree: false },
  { bracket: 'Up to 128 teams', regular: 'PKR 33,000', promo: 'PKR 25,000', isFree: false },
  { bracket: 'Up to 256 teams', regular: 'PKR 55,000', promo: 'PKR 45,000', isFree: false },
  { bracket: 'Up to 512 teams', regular: 'PKR 90,000', promo: 'PKR 80,000', isFree: false },
];

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

interface FeatureGroup {
  heading: string;
  rows: FeatureRow[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    heading: 'Tournament management',
    rows: [
      { label: 'Bracket management',        free: true,             pro: true             },
      { label: 'Max bracket size',          free: '32 teams',       pro: '512 teams'      },
      { label: 'Events per month',          free: '2 events',       pro: 'Contact us'     },
      { label: 'Multi-stage formats',       free: true,             pro: true             },
      { label: 'Match check-in',            free: true,             pro: true             },
      { label: 'Live standings',            free: true,             pro: true             },
      { label: 'Custom prize distribution', free: true,             pro: true             },
      { label: 'Standard map veto',         free: true,             pro: true             },
      { label: 'Custom veto sequences',     free: false,            pro: true             },
    ],
  },
  {
    heading: 'Broadcast & automation',
    rows: [
      { label: 'Match room veto overlay',    free: false,           pro: true             },
      { label: 'Public OBS stream overlay',  free: false,           pro: true             },
      { label: 'Discord DMs to teams',       free: false,           pro: true             },
      { label: 'Desktop broadcast sessions', free: false,           pro: true             },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'What counts toward the 2 free events per month?',
    a: 'Only published events (registration open or live). Drafts do not count. The quota resets on the 1st of each calendar month.',
  },
  {
    q: 'What happens when I hit the free limit?',
    a: 'Tournament creation is blocked with a "Contact us" prompt. Contact us to arrange payment for additional events or larger brackets.',
  },
  {
    q: 'How do I unlock Organizer Pro?',
    a: 'Contact us. We\'ll enable Organizer Pro for your tournament after confirming payment. No self-serve checkout yet.',
  },
  {
    q: 'Are existing tournaments affected when gates ship?',
    a: 'No. All tournaments created before the pricing system launched are grandfathered and unaffected.',
  },
];

/* ─── helpers ───────────────────────────────────────────────────────── */

function Cell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check className="h-[15px] w-[15px] text-zinc-200" aria-label="Included" />;
  if (value === false) return <Minus className="h-[15px] w-[15px] text-white/20"  aria-label="Not included" />;
  return <span className="text-sm text-zinc-300">{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.07]">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-zinc-200 hover:text-white transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {q}
        <span className={`ml-4 shrink-0 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-zinc-400 leading-relaxed max-w-2xl">{a}</p>
      )}
    </div>
  );
}

/* ─── component ─────────────────────────────────────────────────────── */

export default function Pricing() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

  return (
    <div className="min-h-screen">
      <motion.div className="w-full" {...motionProps}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="px-8 pt-16 pb-14">
          <p className={EYEBROW_CLASS}>PRICING</p>
          <h1 className="mt-3 font-heading text-4xl font-black tracking-tight text-white sm:text-5xl max-w-2xl">
            Run your tournament.<br />Start free.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 max-w-xl">
            Free for events up to 32 teams. Per-event pricing for larger brackets.
            Organizer Pro unlocks advanced broadcast tools.
          </p>
        </div>

        {/* ── Tier cards ───────────────────────────────────────────── */}
        <div className="px-8 pb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">

            {/* Free card */}
            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className={EYEBROW_CLASS}>FREE</p>
              <p className="mt-4 font-heading text-4xl font-black text-white">PKR 0</p>
              <p className="text-xs text-zinc-500 mt-0.5">per month</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Host tournaments for free. Up to 32 teams, 2 events per month.
              </p>
              <ul className="mt-5 space-y-2">
                {['Up to 32 teams', '2 events / month', 'Full bracket management', 'Live standings & check-in'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {user ? (
                  <CommandButton variant="secondary" size="md" asChild>
                    <a href="/dashboard">Go to dashboard</a>
                  </CommandButton>
                ) : (
                  <CommandButton variant="secondary" size="md" asChild>
                    <a href="/signup">Get started</a>
                  </CommandButton>
                )}
              </div>
            </div>

            {/* Organizer Pro card */}
            <div className="border border-rose-500/30 bg-rose-500/[0.04] p-6 relative">
              <div className="absolute top-0 right-0 px-2.5 py-1 bg-rose-500/20 border-l border-b border-rose-500/30">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-rose-400">Pro</span>
              </div>
              <p className={EYEBROW_CLASS}>ORGANIZER PRO</p>
              <p className="mt-4 font-heading text-2xl font-black text-white">Contact us</p>
              <p className="text-xs text-zinc-500 mt-0.5">per event · no subscription</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Advanced broadcast tools for production-grade events. Larger brackets included.
              </p>
              <ul className="mt-5 space-y-2">
                {['Everything in Free', 'Up to 512 teams', 'Custom veto sequences', 'Veto & OBS overlays', 'Discord DMs to teams'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <CommandButton variant="primary" size="md" slide asChild>
                  <a href="/contact">Contact us</a>
                </CommandButton>
              </div>
            </div>

          </div>
        </div>

        {/* ── Feature comparison table ─────────────────────────────── */}
        <div className="border-t border-white/[0.07] px-8 py-14">
          <p className={EYEBROW_CLASS}>WHAT YOU GET</p>
          <p className="mt-2 text-sm text-zinc-400">Full feature breakdown across both plans.</p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="pb-4 pr-8 text-left font-normal text-zinc-600 w-1/2" />
                  <th scope="col" className="pb-4 pr-8 text-left w-[22%]">
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Free</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">PKR 0 / month</p>
                    </div>
                  </th>
                  <th scope="col" className="pb-4 text-left w-[22%]">
                    <div>
                      <p className="text-xs font-semibold text-rose-400 uppercase tracking-wide">Organizer Pro</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">Contact us</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map((group) => (
                  <>
                    <tr key={group.heading} className="border-b border-white/[0.06] bg-white/[0.015]">
                      <td colSpan={3} className="py-3 pr-8 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {group.heading}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 pr-8 text-sm text-zinc-400">{row.label}</td>
                        <td className="py-3.5 pr-8"><Cell value={row.free} /></td>
                        <td className="py-3.5"><Cell value={row.pro} /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Per-event bracket pricing ─────────────────────────────── */}
        <div className="border-t border-white/[0.07] px-8 py-14">
          <p className={EYEBROW_CLASS}>PER-EVENT PRICING</p>
          <p className="mt-2 text-sm text-zinc-400">
            Applies when you exceed the free tier (3rd+ event this month, or any bracket above 32 teams).
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="pb-3 pr-8 text-left text-xs text-zinc-500 font-medium">Bracket size</th>
                  <th scope="col" className="pb-3 pr-8 text-left text-xs text-zinc-500 font-medium">Regular price</th>
                  <th scope="col" className="pb-3 text-left text-xs text-zinc-500 font-medium">Launch promo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {BRACKET_ROWS.map((row) => (
                  <tr key={row.bracket} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pr-8 font-medium text-zinc-200">{row.bracket}</td>
                    {row.isFree ? (
                      <>
                        <td className="py-4 pr-8 text-zinc-600">—</td>
                        <td className="py-4 text-zinc-500 italic">
                          Free
                          {user && <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-emerald-500">Active</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 pr-8 text-zinc-600 line-through decoration-zinc-700">{row.regular}</td>
                        <td className="py-4 font-semibold text-rose-400">{row.promo}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Payment via bank transfer.{' '}
            <a href="/contact" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">
              Contact us to proceed.
            </a>
          </p>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.07] px-8 py-14">
          <p className={EYEBROW_CLASS}>FAQ</p>
          <div className="mt-6 max-w-2xl">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

      </motion.div>

      <Footer />
    </div>
  );
}
