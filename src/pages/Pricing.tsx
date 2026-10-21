/**
 * Public pricing page — /pricing
 * Marketing surface — full viewport width.
 */
import { Check, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Footer from '@/components/Footer';

/* ─── data ─────────────────────────────────────────────────────────── */

const BRACKET_ROWS = [
  { bracket: 'Up to 32 teams',  regular: null,         promo: null,         isFree: true  },
  { bracket: 'Up to 64 teams',  regular: 'PKR 20,000', promo: 'PKR 12,000', isFree: false },
  { bracket: 'Up to 128 teams', regular: 'PKR 33,000', promo: 'PKR 25,000', isFree: false },
  { bracket: 'Up to 256 teams', regular: 'PKR 55,000', promo: 'PKR 45,000', isFree: false },
  { bracket: 'Up to 512 teams', regular: 'PKR 90,000', promo: 'PKR 80,000', isFree: false },
];

interface FeatureRow { label: string; free: string | boolean; pro: string | boolean; }
interface FeatureGroup { heading: string; rows: FeatureRow[]; }

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    heading: 'Tournament operations',
    rows: [
      { label: 'Bracket management',        free: true,           pro: true           },
      { label: 'Max bracket size',           free: '32 teams',     pro: '512 teams'    },
      { label: 'Events per month',           free: '2 events',     pro: 'Contact us'   },
      { label: 'Multi-stage formats',        free: true,           pro: true           },
      { label: 'Match check-in',             free: true,           pro: true           },
      { label: 'Live standings',             free: true,           pro: true           },
      { label: 'Custom prize distribution',  free: true,           pro: true           },
    ],
  },
  {
    heading: 'Veto & overlays',
    rows: [
      { label: 'Standard map veto',          free: true,           pro: true           },
      { label: 'Custom veto sequences',      free: false,          pro: true           },
      { label: 'Match room veto overlay',    free: false,          pro: true           },
      { label: 'OBS stream overlay',         free: false,          pro: true           },
    ],
  },
  {
    heading: 'Team communications',
    rows: [
      { label: 'Discord DMs to teams',       free: false,          pro: true           },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'What counts toward the 2 free events per month?',
    a: 'Only published events (registration open or live). Drafts are free and unlimited. The quota resets on the 1st of each calendar month.',
  },
  {
    q: 'What happens when I hit the free limit?',
    a: 'Tournament creation is blocked with a "Contact us" prompt. Reach out and we\'ll sort out payment for additional events or larger brackets.',
  },
  {
    q: 'How do I unlock Organizer Pro?',
    a: 'Contact us. We\'ll enable Organizer Pro for your tournament after confirming payment. No self-serve checkout yet.',
  },
  {
    q: 'Are existing tournaments affected?',
    a: 'No. All tournaments created before this system launched are fully grandfathered and unaffected.',
  },
];

/* ─── helpers ───────────────────────────────────────────────────────── */

function Cell({ value, isPro }: { value: string | boolean; isPro?: boolean }) {
  if (value === true)  return <Check className={`h-[15px] w-[15px] ${isPro ? 'text-rose-400' : 'text-zinc-400'}`} aria-label="Included" />;
  if (value === false) return <Minus className="h-[15px] w-[15px] text-white/15" aria-label="Not included" />;
  return <span className={`text-sm ${isPro ? 'text-zinc-200 font-medium' : 'text-zinc-400'}`}>{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-zinc-300 hover:text-white transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {q}
        <span className={`ml-6 shrink-0 text-zinc-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && <p className="pb-5 text-sm text-zinc-500 leading-relaxed max-w-xl">{a}</p>}
    </div>
  );
}

/* ─── component ─────────────────────────────────────────────────────── */

export default function Pricing() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

  const fadeUp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Glow blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #f43f5e 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
        />

        <motion.div className="relative px-8 pt-20 pb-20" {...fadeUp}>
          <p className={EYEBROW_CLASS}>PRICING</p>

          <h1 className="mt-4 font-heading font-black tracking-tight text-white leading-none"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            Run your tournament.<br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(90deg, #f43f5e 0%, #fb923c 100%)' }}
            >
              Start free.
            </span>
          </h1>

          <p className="mt-5 text-[15px] leading-relaxed text-zinc-400 max-w-lg">
            Free for events up to 32 teams, 2 per month.
            Need more? Larger brackets and advanced veto tools available on Organizer Pro.
          </p>
        </motion.div>
      </div>

      {/* ── Tier cards ──────────────────────────────────────────────── */}
      <div className="px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-white/[0.07] max-w-3xl bg-white/[0.07]">

          {/* Free */}
          <div className="bg-[#09090b] p-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Free</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-black text-white">PKR 0</span>
              <span className="text-sm text-zinc-600">/ month</span>
            </div>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Get started immediately. No credit card, no approval.
              Up to 32 teams, 2 events per month.
            </p>
            <div className="mt-6 space-y-2.5">
              {['Full bracket management', 'Multi-stage formats', 'Match check-in & standings', '2 events / month · Up to 32 teams'].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <Check className="h-3.5 w-3.5 text-zinc-500 shrink-0" aria-hidden />
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-8">
              {user
                ? <CommandButton variant="secondary" size="md" asChild><a href="/dashboard">Go to dashboard</a></CommandButton>
                : <CommandButton variant="secondary" size="md" asChild><a href="/signup">Get started free</a></CommandButton>
              }
            </div>
          </div>

          {/* Organizer Pro */}
          <div
            className="relative p-8"
            style={{
              background: 'linear-gradient(135deg, #140a0c 0%, #0f0a0b 60%, #09090b 100%)',
            }}
          >
            {/* Top border accent */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #f43f5e 50%, transparent 100%)' }}
            />
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-400">Organizer Pro</p>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-heading text-3xl font-black text-white">Contact us</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">per event · no subscription</p>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              For competitive events that need custom veto formats,
              live stream overlays, and automated Discord notifications.
            </p>
            <div className="mt-6 space-y-2.5">
              {[
                'Everything in Free',
                'Up to 512 teams',
                'Custom veto sequences',
                'Match room & OBS veto overlays',
                'Discord DMs to teams',
              ].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Check className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden />
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-8">
              <CommandButton variant="primary" size="md" slide asChild>
                <a href="/contact">Contact us to unlock</a>
              </CommandButton>
            </div>
          </div>

        </div>
      </div>

      {/* ── Feature comparison table ─────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-8 py-20">
        <p className={EYEBROW_CLASS}>FULL COMPARISON</p>
        <p className="mt-2 text-sm text-zinc-500 max-w-md">Every feature, side by side.</p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-sm max-w-3xl" role="table">
            <thead>
              <tr>
                <th className="pb-5 pr-8 text-left font-normal text-zinc-700 w-[52%]" />
                <th className="pb-5 pr-8 text-left w-[22%]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Free</p>
                  <p className="mt-0.5 text-[11px] text-zinc-700">PKR 0 / month</p>
                </th>
                <th className="pb-5 text-left w-[22%]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">Organizer Pro</p>
                  <p className="mt-0.5 text-[11px] text-zinc-700">Contact us</p>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((group) => (
                <>
                  <tr key={group.heading}>
                    <td
                      colSpan={3}
                      className="pt-8 pb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-600 border-b border-white/[0.05]"
                    >
                      {group.heading}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-white/[0.04] hover:bg-white/[0.018] transition-colors"
                    >
                      <td className="py-3.5 pr-8 text-sm text-zinc-400">{row.label}</td>
                      <td className="py-3.5 pr-8"><Cell value={row.free} /></td>
                      <td className="py-3.5"><Cell value={row.pro} isPro /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Per-event bracket pricing ─────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-8 py-20">
        <div className="flex items-baseline gap-6">
          <p className={EYEBROW_CLASS}>BRACKET PRICING</p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: 'rgba(251,146,60,0.12)',
              color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.25)',
            }}
          >
            Launch promo active
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Applies when you exceed the free tier — 3rd+ event this month, or any bracket above 32 teams.
        </p>

        <div className="mt-8 overflow-x-auto max-w-2xl">
          <table className="w-full border-collapse text-sm" role="table">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-3 pr-8 text-left text-xs text-zinc-600 font-normal">Bracket</th>
                <th className="pb-3 pr-8 text-left text-xs text-zinc-600 font-normal">Regular</th>
                <th className="pb-3 text-left text-xs text-zinc-600 font-normal">Promo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {BRACKET_ROWS.map((row) => (
                <tr key={row.bracket} className="hover:bg-white/[0.018] transition-colors">
                  <td className="py-4 pr-8 font-medium text-zinc-200">{row.bracket}</td>
                  {row.isFree ? (
                    <>
                      <td className="py-4 pr-8 text-zinc-700">—</td>
                      <td className="py-4">
                        <span className="text-zinc-500 italic text-xs">Free</span>
                        {user && (
                          <span className="ml-2 font-mono text-[8px] uppercase tracking-widest text-emerald-500">
                            Active
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-4 pr-8 text-zinc-700 line-through decoration-zinc-800 text-sm">
                        {row.regular}
                      </td>
                      <td className="py-4 font-semibold text-sm" style={{ color: '#fb923c' }}>
                        {row.promo}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-700">
          Bank transfer.{' '}
          <a href="/contact" className="text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors">
            Contact us to arrange payment.
          </a>
        </p>
      </div>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] px-8 py-20">
        <p className={EYEBROW_CLASS}>FAQ</p>
        <div className="mt-8 max-w-xl">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ──────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-t border-white/[0.06] px-8 py-24"
        style={{ background: 'linear-gradient(180deg, #09090b 0%, #0d0508 100%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse at center bottom, #f43f5e 0%, transparent 60%)' }}
        />
        <div className="relative max-w-lg">
          <p className={EYEBROW_CLASS}>GET STARTED</p>
          <h2 className="mt-3 font-heading text-3xl font-black text-white leading-tight">
            Ready to run a bigger event?
          </h2>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Contact us to unlock Organizer Pro or arrange payment for a larger bracket event.
          </p>
          <div className="mt-7">
            <CommandButton variant="primary" size="md" slide asChild>
              <a href="/contact">Contact us</a>
            </CommandButton>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
