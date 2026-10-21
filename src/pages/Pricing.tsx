/**
 * Public pricing page — /pricing
 * Marketing surface — full viewport width, not CommandPageGrid.
 */
import { Check, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Footer from '@/components/Footer';

/* ─── data ─────────────────────────────────────────────────────────── */

interface BracketRow {
  bracket: string;
  regular: string | null;
  promo: string | null;
  isFree: boolean;
}

const BRACKET_ROWS: BracketRow[] = [
  { bracket: 'Up to 32 teams', regular: null, promo: null, isFree: true },
  { bracket: 'Up to 64 teams',  regular: 'PKR 20,000', promo: 'PKR 12,000', isFree: false },
  { bracket: 'Up to 128 teams', regular: 'PKR 33,000', promo: 'PKR 25,000', isFree: false },
  { bracket: 'Up to 256 teams', regular: 'PKR 55,000', promo: 'PKR 45,000', isFree: false },
  { bracket: 'Up to 512 teams', regular: 'PKR 90,000', promo: 'PKR 80,000', isFree: false },
];

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  note?: string;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Bracket management',          free: true,              pro: true },
  { label: 'Bracket size',                free: 'Up to 32 teams',  pro: 'Up to 512 teams' },
  { label: 'Events per month',            free: '2 events',        pro: 'Contact us' },
  { label: 'Match check-in',              free: true,              pro: true },
  { label: 'Live standings',              free: true,              pro: true },
  { label: 'Multi-stage formats',         free: true,              pro: true },
  { label: 'Custom prize distribution',   free: true,              pro: true },
  { label: 'Standard map veto',           free: true,              pro: true },
  { label: 'Custom veto sequences',       free: false,             pro: true },
  { label: 'Match room veto overlay',     free: false,             pro: true },
  { label: 'OBS stream overlay',          free: false,             pro: true },
  { label: 'Discord DMs to teams',        free: false,             pro: true },
  { label: 'Desktop broadcast sessions',  free: false,             pro: true },
];

/* ─── helpers ───────────────────────────────────────────────────────── */

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check className="h-4 w-4 text-zinc-300" aria-label="Included" />;
  if (value === false) return <Minus className="h-4 w-4 text-zinc-700" aria-label="Not included" />;
  return <span className="text-sm text-zinc-300">{value}</span>;
}

/* ─── component ─────────────────────────────────────────────────────── */

export default function Pricing() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };

  return (
    <div className="min-h-screen">
      <motion.div className="w-full px-8 py-16" {...motionProps}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className="max-w-2xl">
          <p className={EYEBROW_CLASS}>PRICING</p>
          <h1 className="mt-3 font-heading text-4xl font-black tracking-tight text-white sm:text-5xl">
            Run your tournament on Esportra
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
            Free for events up to 32 teams. Per-event pricing for larger brackets.
            Organizer Pro unlocks advanced broadcast tools.
          </p>
        </header>

        {/* ── Feature comparison table ─────────────────────────────── */}
        <section className="mt-14" aria-labelledby="compare-heading">
          <p className={EYEBROW_CLASS} id="compare-heading">PLAN COMPARISON</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="py-3 pr-8 text-left text-xs text-zinc-500 font-medium w-1/2">
                    Feature
                  </th>
                  <th scope="col" className="py-3 pr-8 text-left text-xs text-zinc-500 font-medium w-[22%]">
                    Free
                  </th>
                  <th scope="col" className="py-3 text-left text-xs text-zinc-500 font-medium w-[22%]">
                    Organizer Pro
                  </th>
                </tr>
                {/* Tier labels row */}
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <td className="py-3 pr-8 text-xs text-zinc-600 italic">
                    No payment required
                  </td>
                  <td className="py-3 pr-8">
                    <span className="font-heading text-base font-black text-white">Free</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-base font-black text-white">Pro</span>
                      <a
                        href="/contact"
                        className="text-xs text-rose-400 hover:text-rose-300 transition-colors underline underline-offset-2"
                      >
                        Contact us
                      </a>
                    </div>
                  </td>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors ${
                      i >= 8 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <td className={`py-3.5 pr-8 font-medium ${i >= 8 ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {row.label}
                      {i === 8 && (
                        <span className="ml-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-rose-500/70">
                          PRO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-8">
                      <FeatureCell value={row.free} />
                    </td>
                    <td className="py-3.5">
                      <FeatureCell value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Per-event bracket pricing ─────────────────────────────── */}
        <section className="mt-16 border-t border-white/10 pt-12" aria-labelledby="bracket-heading">
          <div className="flex items-baseline gap-4 mb-5">
            <p className={EYEBROW_CLASS} id="bracket-heading">PER-EVENT PRICING</p>
            <span className="text-xs text-zinc-600">Promo active — regular price crossed out</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="py-3 pr-8 text-left text-xs text-zinc-500 font-medium">
                    Bracket size
                  </th>
                  <th scope="col" className="py-3 pr-8 text-left text-xs text-zinc-500 font-medium">
                    Regular price
                  </th>
                  <th scope="col" className="py-3 text-left text-xs text-zinc-500 font-medium">
                    Promo price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {BRACKET_ROWS.map((row) => (
                  <tr
                    key={row.bracket}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 pr-8 text-sm font-medium text-zinc-200">
                      {row.bracket}
                    </td>
                    {row.isFree ? (
                      <>
                        <td className="py-4 pr-8 text-sm text-zinc-600">—</td>
                        <td className="py-4 text-sm text-zinc-500 italic">
                          Free tier
                          {user && (
                            <span className="ml-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-emerald-500">
                              ACTIVE
                            </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 pr-8 text-sm text-zinc-600 line-through decoration-zinc-700">
                          {row.regular}
                        </td>
                        <td className="py-4 text-sm font-semibold text-rose-400">
                          {row.promo}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Payment via bank transfer. Contact us to proceed.
          </p>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="mt-16 border-t border-white/10 pt-12">
          <p className={EYEBROW_CLASS}>GET STARTED</p>
          <h2 className="mt-3 font-heading text-2xl font-black text-white max-w-lg">
            Ready to run a bigger event or unlock Pro features?
          </h2>
          <p className="mt-3 text-sm text-zinc-400 max-w-md">
            Contact us to unlock Organizer Pro or arrange payment for a large bracket.
          </p>
          <div className="mt-6">
            <CommandButton variant="primary" size="md" slide asChild>
              <a href="/contact">Contact us</a>
            </CommandButton>
          </div>
        </section>

      </motion.div>

      <Footer />
    </div>
  );
}
