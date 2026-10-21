/**
 * Public pricing page — /pricing
 * Marketing surface: max-w-5xl mx-auto (intentional, not CommandPageGrid).
 */
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { CommandButton } from '@/components/management/CommandSurface';
import { StatusPill, EYEBROW_CLASS } from '@/components/ui/kit';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Footer from '@/components/Footer';

interface PricingRow {
  bracket: string;
  regular: string | null;
  promo: string | null;
  isFree: boolean;
}

const PRICING_ROWS: PricingRow[] = [
  { bracket: 'Up to 32 teams', regular: null, promo: null, isFree: true },
  { bracket: 'Up to 64 teams', regular: 'PKR 20,000', promo: 'PKR 12,000', isFree: false },
  { bracket: 'Up to 128 teams', regular: 'PKR 33,000', promo: 'PKR 25,000', isFree: false },
  { bracket: 'Up to 256 teams', regular: 'PKR 55,000', promo: 'PKR 45,000', isFree: false },
  { bracket: 'Up to 512 teams', regular: 'PKR 90,000', promo: 'PKR 80,000', isFree: false },
];

const PRO_FEATURES = [
  'Custom veto sequences',
  'Match room veto overlay',
  'Public OBS stream overlay',
  'Discord DMs to teams',
  'Desktop broadcast sessions',
];

export default function Pricing() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 },
      };

  return (
    <div className="min-h-screen">
      <motion.div
        className="max-w-5xl mx-auto px-6 py-16"
        {...motionProps}
      >
        {/* Hero */}
        <header>
          <p className={EYEBROW_CLASS}>PRICING</p>
          <h1 className="mt-3 font-heading text-4xl font-black tracking-tight text-white sm:text-5xl">
            Run your tournament on Esportra
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 max-w-2xl">
            Free for small events. Per-event pricing for brackets above 32 teams.
            Organizer Pro unlocks broadcast tools.
          </p>
        </header>

        {/* Free tier band */}
        <div className="mt-10 flex items-center justify-between border border-white/10 bg-white/[0.03] px-5 py-4 sm:flex-row flex-col sm:gap-0 gap-3 sm:items-center items-start">
          <div>
            <p className={EYEBROW_CLASS}>FREE TIER</p>
            <p className="mt-1 text-sm text-zinc-300">
              Up to 32 teams · 2 events per month · No credit card required
            </p>
          </div>
          {user && (
            <div className="hidden sm:block">
              <StatusPill label="ACTIVE" tone="success" />
            </div>
          )}
        </div>

        {/* Per-event pricing table */}
        <section className="mt-12" aria-labelledby="pricing-table-heading">
          <div className="flex items-baseline justify-between mb-4">
            <p className={EYEBROW_CLASS} id="pricing-table-heading">PER-EVENT PRICING</p>
            <p className="text-xs text-zinc-500">Promo pricing active</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="py-3 pr-6 text-left text-xs text-zinc-500 font-medium">
                    Bracket size
                  </th>
                  <th scope="col" className="py-3 pr-6 text-right text-xs text-zinc-500 font-medium">
                    Regular
                  </th>
                  <th scope="col" className="py-3 text-right text-xs text-zinc-500 font-medium">
                    Promo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {PRICING_ROWS.map((row) => (
                  <tr
                    key={row.bracket}
                    className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 pr-6 text-sm text-zinc-200 font-medium">{row.bracket}</td>
                    {row.isFree ? (
                      <>
                        <td className="py-4 pr-6 text-right" />
                        <td className="py-4 text-right text-sm text-zinc-500 italic">
                          Included in free tier
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 pr-6 text-right text-sm text-zinc-600 line-through">
                          {row.regular}
                        </td>
                        <td className="py-4 text-right text-sm font-semibold text-rose-400">
                          {row.promo}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Organizer Pro section */}
        <section className="mt-16 border-t border-white/10 pt-12" aria-labelledby="pro-heading">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <p className={EYEBROW_CLASS}>ORGANIZER PRO</p>
              <h2 id="pro-heading" className="mt-3 font-heading text-2xl font-black text-white">
                Advanced tools for broadcast-quality events
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-zinc-400">
                Organizer Pro is included with paid events above 32 teams, or available as a standalone
                upgrade. Contact us to discuss what works for your events.
              </p>
            </div>
            <ul className="space-y-3 pt-1" aria-label="Organizer Pro features">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check className="mt-0.5 h-4 w-4 text-zinc-500 shrink-0" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10">
            <CommandButton variant="primary" size="md" slide asChild>
              <a href="/contact">Contact us to unlock</a>
            </CommandButton>
            <p className="mt-3 text-xs text-zinc-600">
              No subscription. We'll discuss what works for your events.
            </p>
          </div>
        </section>
      </motion.div>

      <Footer />
    </div>
  );
}
