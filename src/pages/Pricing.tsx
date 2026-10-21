/**
 * Public pricing page — /pricing
 * Direction: Broadcast (lead) · Archetype: Stage → Scoreboard grid
 * Hero: "Run your cup like a final." — PKR 0 to start.
 * Copy: CMO final pass (2026-10-22). Comprehensive per CEO direction.
 *
 * Rose cue discipline:
 *   Global   — 2 px horizontal cue line, top of page (once)
 *   Tier     — 2 px left border on Pro card
 *   Table    — border-t-2 on Pro column header
 *   FAQ      — Plus icon turns rose when open (action feedback only)
 *   Checks   — zinc throughout; rose is a cue, not a decoration
 */
import { Check, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import Footer from '@/components/Footer';

/* ─── content ────────────────────────────────────────────────────────── */

const BRACKET_ROWS = [
  { size: 'Up to 32 teams',  regular: null,         promo: null,         isFree: true,   isCustom: false },
  { size: 'Up to 64 teams',  regular: 'PKR 20,000', promo: 'PKR 12,000', isFree: false,  isCustom: false },
  { size: 'Up to 128 teams', regular: 'PKR 33,000', promo: 'PKR 25,000', isFree: false,  isCustom: false },
  { size: 'Up to 256 teams', regular: 'PKR 55,000', promo: 'PKR 45,000', isFree: false,  isCustom: false },
  { size: 'Up to 512 teams', regular: 'PKR 90,000', promo: 'PKR 80,000', isFree: false,  isCustom: false },
  { size: '512+ teams',      regular: null,         promo: null,         isFree: false,  isCustom: true  },
];

interface FeatureRow { label: string; free: string | boolean; pro: string | boolean; }
interface FeatureGroup { heading: string; rows: FeatureRow[]; }

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    heading: 'Formats & brackets',
    rows: [
      { label: 'Single & double elimination',  free: true,         pro: true        },
      { label: 'Swiss format',                 free: true,         pro: true        },
      { label: 'Battle royale (leaderboard)',  free: true,         pro: true        },
      { label: 'Multi-stage formats',          free: true,         pro: true        },
      { label: 'Max bracket size',             free: '32 teams',   pro: '512+ custom' },
    ],
  },
  {
    heading: 'Tournament operations',
    rows: [
      { label: 'Match scheduling & time slots', free: true,        pro: true        },
      { label: 'Team & player registration',    free: true,        pro: true        },
      { label: 'Match rooms with check-in',     free: true,        pro: true        },
      { label: 'Score reporting & results',     free: true,        pro: true        },
      { label: 'Live standings & leaderboards', free: true,        pro: true        },
      { label: 'Custom prize distribution',     free: true,        pro: true        },
      { label: 'Dispute centre',                free: true,        pro: true        },
      { label: 'Events per month',              free: '2 events',  pro: 'Talk to us'},
    ],
  },
  {
    heading: 'Veto & overlays',
    rows: [
      { label: 'Standard map veto',          free: true,         pro: true        },
      { label: 'Custom veto sequences',      free: false,        pro: true        },
      { label: 'Match room veto overlay',    free: false,        pro: true        },
      { label: 'OBS stream overlay',         free: false,        pro: true        },
    ],
  },
  {
    heading: 'Team communications',
    rows: [
      { label: 'Discord DMs to teams',       free: false,        pro: true        },
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
    a: "Tournament creation is blocked with a \"Talk to us\" prompt. Reach out and we'll sort out payment for additional events or larger brackets.",
  },
  {
    q: 'How do I get Organizer Pro?',
    a: "Talk to us. We'll enable Organizer Pro for your tournament after confirming payment. No self-serve checkout yet.",
  },
  {
    q: 'Can I draft unlimited events?',
    a: 'Yes. Drafts are completely free and do not count toward your monthly quota. Only published events (registration open or live) count.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Bank transfer for now. Talk to us first — we send you the details. More payment options are coming.',
  },
];

/* ─── design atoms ───────────────────────────────────────────────────── */

/**
 * Broadcast dot-grid texture — 5 % opacity.
 * Unique id required per instance to prevent SVG pattern collision.
 */
function DotGrid({ id }: { id: string }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.65" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Signature move #2: caption over hero number. */
function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-[#09090b] px-6 py-5 flex flex-col gap-1.5">
      <p className={EYEBROW_CLASS}>{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-heading font-black text-white leading-none"
          style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)' }}
        >
          {value}
        </span>
        {unit && <span className="text-[11px] text-zinc-700">{unit}</span>}
      </div>
    </div>
  );
}

/** Feature comparison table cell: check / minus / text. */
function FeatureCell({ value, isPro }: { value: string | boolean; isPro?: boolean }) {
  if (value === true) {
    return (
      <Check
        className={`h-[15px] w-[15px] ${isPro ? 'text-zinc-300' : 'text-zinc-600'}`}
        aria-label="Included"
      />
    );
  }
  if (value === false) {
    return <Minus className="h-[15px] w-[15px] text-white/[0.08]" aria-label="Not included" />;
  }
  return (
    <span className={`text-[13px] leading-snug ${isPro ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
      {value as string}
    </span>
  );
}

/** FAQ accordion — Plus rotates 45 ° (→ ×) and turns rose on open. */
function FaqItem({ q, a, reduced }: { q: string; a: string; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.07]">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-8 py-5 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-[14px] font-medium text-zinc-300 leading-relaxed">{q}</span>
        <span
          className="mt-0.5 shrink-0 transition-transform duration-200"
          style={{
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            color: open ? '#f43f5e' : '#52525b',
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={reduced ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[13px] text-zinc-500 leading-relaxed max-w-prose">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Arrive animation props — returns empty object when reduced motion is on. */
function arriveProps(reduced: boolean, delay = 0) {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, ease: 'easeOut', delay },
  };
}

/* ─── page ───────────────────────────────────────────────────────────── */

export default function Pricing() {
  const { user } = useAuth();
  const reduced = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#09090b] text-white">

      {/* ── Global cue line ─────────────────────────────────────────────
          The referee's booth: one light on.
          This 2 px rose line is the only rose that fires at page level. */}
      <div aria-hidden="true" className="h-0.5 w-full bg-rose-500" />

      {/* ══════════════════════════════════════════════════════════════════
          HERO
          Copy: CMO final. Stat tiles right — scoreboard grid (move #6).
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <DotGrid id="dot-hero" />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -left-10 h-96 w-96 opacity-[0.09]"
          style={{ background: 'radial-gradient(circle, #f43f5e 0%, transparent 65%)' }}
        />

        <div className="relative lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-20">

          <motion.div {...arriveProps(reduced)}>
            <p className={EYEBROW_CLASS}>ESPORTRA · PRICING</p>
            <h1
              className="mt-4 font-heading font-black text-white leading-none tracking-tight"
              style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
            >
              Run your cup<br />like a final.
            </h1>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-zinc-500">
              Free for up to 32 teams, two events a month. Organizer Pro adds
              custom veto sequences, veto overlays, and Discord notifications to every team.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <CommandButton variant="primary" size="lg" asChild>
                  <a href="/dashboard">Go to dashboard</a>
                </CommandButton>
              ) : (
                <CommandButton variant="primary" size="lg" asChild>
                  <a href="/signup">Host a cup</a>
                </CommandButton>
              )}
              <CommandButton variant="ghost" size="lg" asChild>
                <a href="/contact">Talk to us</a>
              </CommandButton>
            </div>
          </motion.div>

          {/* Stat tiles — caption over hero number */}
          <motion.div
            {...arriveProps(reduced, 0.10)}
            className="mt-14 lg:mt-0 shrink-0 grid grid-cols-2 gap-px bg-white/[0.07] border border-white/[0.07]"
          >
            <StatTile label="START FREE"    value="PKR 0"  unit="/ month" />
            <StatTile label="FREE MAX SIZE" value="32"     unit="teams"   />
            <StatTile label="FREE EVENTS"   value="2"      unit="/ month" />
            <StatTile label="PRO MAX SIZE"  value="512+"   unit="teams"   />
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TIER CARDS
          Asymmetric 2 fr / 3 fr — Free is quiet, Pro has weight.
          Rose cue: 2 px left border on Pro card. One cue, this section.
      ══════════════════════════════════════════════════════════════════ */}
      <section className="px-8 pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-px bg-white/[0.07] border border-white/[0.07]">

          {/* Free — plain stage black, no texture */}
          <motion.div
            {...arriveProps(reduced, 0.05)}
            className="bg-[#09090b] p-8 lg:p-10 flex flex-col"
          >
            <div>
              <p className={EYEBROW_CLASS}>Free</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span
                  className="font-heading font-black text-white leading-none"
                  style={{ fontSize: '3rem' }}
                >
                  PKR 0
                </span>
                <span className="text-xs text-zinc-700">/ month</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-700">No card required</p>
              <p className="mt-5 text-[14px] text-zinc-500 leading-relaxed">
                Up to 32 teams, two events a month. Full tournament management
                from registration to results.
              </p>
            </div>

            <ul className="mt-8 space-y-2.5 flex-1" role="list">
              {[
                { label: 'Single-elim, double-elim, Swiss, BR', group: 'Formats' },
                { label: 'Multi-stage tournament formats',       group: 'Formats' },
                { label: 'Match scheduling & time slots',        group: 'Scheduling' },
                { label: 'Team & player registration',           group: 'Registration' },
                { label: 'Match rooms with check-in',            group: 'Matches' },
                { label: 'Score reporting & results',            group: 'Matches' },
                { label: 'Live standings & leaderboards',        group: 'Matches' },
                { label: 'Standard map veto',                    group: 'Veto' },
                { label: 'Custom prize distribution',            group: 'Prizes' },
                { label: 'Dispute centre',                       group: 'Support' },
                { label: '2 events/month · Up to 32 teams',     group: 'Limit' },
              ].map(({ label }) => (
                <li key={label} className="flex items-start gap-3 text-[13px] text-zinc-500">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              {user ? (
                <CommandButton variant="secondary" size="md" asChild>
                  <a href="/dashboard">Go to dashboard</a>
                </CommandButton>
              ) : (
                <CommandButton variant="secondary" size="md" asChild>
                  <a href="/signup">Host a cup</a>
                </CommandButton>
              )}
            </div>
          </motion.div>

          {/* Organizer Pro — dot-grid texture, warmer dark, rose left cue */}
          <motion.div
            {...arriveProps(reduced, 0.12)}
            className="relative flex flex-col overflow-hidden"
            style={{ background: 'linear-gradient(155deg, #160509 0%, #100507 40%, #09090b 100%)' }}
          >
            {/* Rose cue — 2 px left border */}
            <div aria-hidden="true" className="absolute left-0 inset-y-0 w-0.5 bg-rose-500" />

            <DotGrid id="dot-pro" />

            {/* Primary glow — top-left */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -left-10 h-80 w-80 opacity-[0.18]"
              style={{ background: 'radial-gradient(circle, #f43f5e 0%, transparent 60%)' }}
            />
            {/* Secondary glow — bottom-right */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -right-10 h-64 w-64 opacity-[0.10]"
              style={{ background: 'radial-gradient(circle, #f43f5e 0%, transparent 60%)' }}
            />

            <div className="relative p-8 lg:p-10 flex flex-col flex-1">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-400">
                  Organizer Pro
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span
                    className="font-heading font-black text-white leading-none"
                    style={{ fontSize: '2.5rem' }}
                  >
                    Talk to us
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-700">Per event · no subscription</p>
                <p className="mt-5 text-[14px] text-zinc-400 leading-relaxed">
                  Custom veto sequences with match room and OBS overlays, plus
                  Discord DMs direct to every team.
                </p>
              </div>

              <ul className="mt-8 space-y-2.5 flex-1" role="list">
                {[
                  { label: 'Everything in Free',                       highlight: false },
                  { label: '512+ teams · custom above 512',             highlight: false },
                  { label: 'Custom veto sequences',                    highlight: true  },
                  { label: 'Match room veto overlay',                  highlight: true  },
                  { label: 'OBS stream overlay',                       highlight: true  },
                  { label: 'Discord DMs to teams',                     highlight: true  },
                ].map(({ label, highlight }) => (
                  <li key={label} className="flex items-start gap-3 text-[13px]">
                    <Check
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${highlight ? 'text-rose-400/70' : 'text-zinc-400'}`}
                      aria-hidden="true"
                    />
                    <span className={highlight ? 'text-zinc-200 font-medium' : 'text-zinc-400'}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <CommandButton variant="primary" size="md" slide asChild>
                  <a href="/contact">Talk to us</a>
                </CommandButton>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
          Two-panel explainer — Free tier · Organizer Pro.
          CEO direction: comprehensive, answer every question up front.
      ══════════════════════════════════════════════════════════════════ */}
      <section className="px-8 pb-24 pt-px">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/[0.06] border-x border-b border-white/[0.06] border-t-0">

          {/* Free tier explainer */}
          <motion.div {...arriveProps(reduced, 0.08)} className="bg-[#09090b] p-8 lg:p-10">
            <p className={EYEBROW_CLASS}>HOW THE FREE TIER WORKS</p>
            <ul className="mt-6 space-y-5">
              {[
                {
                  title: '2 published events per calendar month',
                  body: 'The quota resets on the 1st of each month. Only published events count — registration open or live.',
                },
                {
                  title: 'Up to 32 teams per event',
                  body: 'Single-elimination, double-elimination, Swiss or battle royale. Full bracket and standings support.',
                },
                {
                  title: 'Drafts are unlimited and free',
                  body: 'You can draft as many events as you like. The quota only fires when you publish.',
                },
                {
                  title: 'Instant access — no approval',
                  body: 'Sign up and create your first event immediately. No credit card, no waiting.',
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 bg-zinc-600" />
                  <div>
                    <p className="text-[13px] font-medium text-zinc-300">{title}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-600 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Organizer Pro explainer */}
          <motion.div
            {...arriveProps(reduced, 0.14)}
            className="relative bg-[#09090b] p-8 lg:p-10"
            style={{ background: 'linear-gradient(155deg, #0f0608 0%, #09090b 60%)' }}
          >
            <p className={EYEBROW_CLASS}>HOW ORGANIZER PRO WORKS</p>
            <ul className="mt-6 space-y-5">
              {[
                {
                  title: 'Per-event, not a subscription',
                  body: 'You pay for each event you want Pro features on. No recurring charge.',
                },
                {
                  title: 'Talk to us → we confirm → features activate',
                  body: 'No self-serve checkout yet. Reach out, we confirm your event, and Pro features turn on for that tournament.',
                },
                {
                  title: 'Custom veto sequences',
                  body: 'Define your own pick/ban order — the system runs it in the match room.',
                },
                {
                  title: 'Veto overlays',
                  body: 'Match room overlay shows the live veto to players. OBS overlay puts it on your public stream.',
                },
                {
                  title: 'Discord DMs to teams',
                  body: 'Automated notifications sent directly to team Discord servers — match ready, check-in open, result confirmed.',
                },
              ].map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 bg-zinc-600" />
                  <div>
                    <p className="text-[13px] font-medium text-zinc-300">{title}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-600 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHAT'S INCLUDED — Feature comparison
          Rose cue: border-t-2 on Pro column header. One cue, this section.
          Group rows use a 2 px white/12 left border band.
      ══════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] px-8 py-20">
        <motion.div {...arriveProps(reduced)}>
          <p className={EYEBROW_CLASS}>WHAT'S INCLUDED</p>
          <p className="mt-2 text-[13px] text-zinc-600">Every feature, side by side.</p>
        </motion.div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse" role="table">
            <thead>
              <tr>
                <th className="pb-6 pr-8 text-left font-normal w-[52%]" />
                <th className="pb-6 pr-8 text-left w-[22%]">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-400">
                    Free
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-700 font-normal">PKR 0 / month</p>
                </th>
                <th className="pb-6 text-left w-[22%]">
                  {/* Rose cue for this section: 2 px top border on Pro column only */}
                  <div className="border-t-2 border-rose-500 pt-3">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.25em] text-rose-400">
                      Organizer Pro
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-700 font-normal">Talk to us</p>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((group, gi) => (
                <>
                  <tr key={`group-${gi}`}>
                    <td colSpan={3} className="pt-8 pb-3">
                      <div className="flex items-center pl-3 border-l-2 border-white/[0.12]">
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
                          {group.heading}
                        </span>
                      </div>
                      <div className="mt-3 h-px bg-white/[0.05]" />
                    </td>
                  </tr>
                  {group.rows.map((row, ri) => (
                    <tr
                      key={`${gi}-${ri}`}
                      className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-3.5 pr-8 text-[13px] text-zinc-500">{row.label}</td>
                      <td className="py-3.5 pr-8"><FeatureCell value={row.free} /></td>
                      <td className="py-3.5"><FeatureCell value={row.pro} isPro /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          LARGER EVENTS — Bracket pricing
          CEO direction: explain how it works before showing the numbers.
          Rose: none here. Amber badge = "pay attention". Emerald = free.
      ══════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] px-8 py-20">
        <motion.div {...arriveProps(reduced)} className="flex flex-wrap items-center gap-4">
          <p className={EYEBROW_CLASS}>LARGER EVENTS</p>
          <span
            className="font-mono text-[8px] font-semibold uppercase tracking-[0.2em] px-2.5 py-1 border"
            style={{
              borderColor: 'rgba(251,191,36,0.30)',
              color: '#FBBF24',
              background: 'rgba(251,191,36,0.06)',
            }}
          >
            Launch promo active
          </span>
        </motion.div>
        <p className="mt-2 text-[13px] text-zinc-600 max-w-lg">
          Events above 32 teams or two per month can be arranged. Talk to us.
        </p>

        {/* How bracket pricing works */}
        <motion.div
          {...arriveProps(reduced, 0.06)}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.05] border border-white/[0.05]"
        >
          {[
            {
              label: 'WHEN IT APPLIES',
              body: '3rd+ event in the same calendar month, or any event with a bracket over 32 teams.',
            },
            {
              label: 'HOW PAYMENT WORKS',
              body: 'Talk to us first. We send you bank transfer details. Once confirmed, features activate for that tournament.',
            },
            {
              label: 'WHAT YOU GET',
              body: 'All Organizer Pro features are included at every paid bracket size. No separate Pro fee.',
            },
          ].map(({ label, body }) => (
            <div key={label} className="bg-[#09090b] px-6 py-5">
              <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-zinc-600">{label}</p>
              <p className="mt-2 text-[13px] text-zinc-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </motion.div>

        {/* Scoreboard tile grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-6 gap-px bg-white/[0.06] border border-white/[0.06]">
          {BRACKET_ROWS.map((row, i) => (
            <motion.div
              key={row.size}
              {...arriveProps(reduced, i * 0.06)}
              className="bg-[#09090b] p-5 flex flex-col gap-2"
            >
              <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                {row.size}
              </p>

              {row.isFree ? (
                <>
                  <p
                    className="font-heading font-black text-emerald-400 leading-none"
                    style={{ fontSize: '1.75rem' }}
                  >
                    Free
                  </p>
                  <p className="text-[11px] text-zinc-700">included in all plans</p>
                </>
              ) : row.isCustom ? (
                <>
                  <p
                    className="font-heading font-black text-zinc-400 leading-none"
                    style={{ fontSize: '1.75rem' }}
                  >
                    Custom
                  </p>
                  <p className="text-[11px] text-zinc-700">Talk to us</p>
                </>
              ) : (
                <>
                  <p
                    className="font-heading font-black text-white leading-none"
                    style={{ fontSize: '1.9rem' }}
                  >
                    {row.promo}
                  </p>
                  <p className="text-[11px] text-zinc-700 line-through">{row.regular}</p>
                </>
              )}
            </motion.div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-zinc-700">
          Bank transfer.{' '}
          <a
            href="/contact"
            className="text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            Talk to us to get started.
          </a>
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FAQ
          6 items — original 4 + "Can I draft?" + "Payment methods?"
          Plus rotates 45 ° → × and turns rose on open.
      ══════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] px-8 py-20">
        <motion.div {...arriveProps(reduced)}>
          <p className={EYEBROW_CLASS}>FAQ</p>
        </motion.div>
        <div className="mt-8 max-w-2xl">
          {FAQ_ITEMS.map(item => (
            <FaqItem key={item.q} q={item.q} a={item.a} reduced={reduced} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM CTA
          Stage lights rise: rose radial from below, dot grid texture.
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden border-t border-white/[0.06] px-8 py-28"
        style={{ background: 'linear-gradient(180deg, #09090b 0%, #0c0508 100%)' }}
      >
        <DotGrid id="dot-cta" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, #f43f5e 0%, transparent 55%)' }}
        />

        <motion.div {...arriveProps(reduced)} className="relative">
          <p className={EYEBROW_CLASS}>GET STARTED</p>
          <h2
            className="mt-4 font-heading font-black text-white leading-tight tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
          >
            Talk to us about Organizer Pro.
          </h2>
          <p className="mt-4 text-[15px] text-zinc-500 leading-relaxed max-w-md">
            Describe your event. We'll confirm your access to Organizer Pro or a larger bracket.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CommandButton variant="primary" size="lg" slide asChild>
              <a href="/contact">Talk to us</a>
            </CommandButton>
            {!user && (
              <CommandButton variant="ghost" size="lg" asChild>
                <a href="/signup">Or host a cup free</a>
              </CommandButton>
            )}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
