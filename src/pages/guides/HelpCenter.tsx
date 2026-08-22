import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, ChevronDown, Gamepad2, HelpCircle,
  Mail, MapPin, Sparkles, Trophy,
} from 'lucide-react';
import type { GuideSection, GuideStep } from './organizerGuideData';
import { organizerGuideSections } from './organizerGuideData';
import { playerGuideSections } from './playerGuideData';

/* ─── Motion ─────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ─── Entries ────────────────────────────────────────────────── */
interface HelpEntry {
  id: string;
  index: string;
  group: 'role' | 'resources';
  icon: ReactNode;
  roleLabel: string;
  title: string;
  description: string;
  status: 'available' | 'soon';
  href?: string;
  ctaLabel?: string;
}

const ENTRIES: HelpEntry[] = [
  {
    id: 'player-guide',
    index: '01',
    group: 'role',
    icon: <Gamepad2 className="h-4 w-4" />,
    roleLabel: 'For competitors',
    title: 'Player & Team Handbook',
    description:
      'From account setup to the final scoreboard — register your team, clear both check-in windows, survive the map veto, and report scores that stick.',
    status: 'available',
  },
  {
    id: 'organizer-guide',
    index: '02',
    group: 'role',
    icon: <Trophy className="h-4 w-4" />,
    roleLabel: 'For organizers',
    title: 'Organizer Playbook',
    description:
      'License application to post-event analytics — the seven-step creation wizard, bracket generation and publishing, live match ops, dispute rulings.',
    status: 'available',
  },
  {
    id: 'venue-owner',
    index: '03',
    group: 'role',
    icon: <MapPin className="h-4 w-4" />,
    roleLabel: 'For venue owners',
    title: 'Venue Owner Guide',
    description:
      'List your gaming venue, manage stations and live seat availability, and host LAN events through Esportra.',
    status: 'soon',
  },
  {
    id: 'faq',
    index: '04',
    group: 'resources',
    icon: <HelpCircle className="h-4 w-4" />,
    roleLabel: 'Resources',
    title: 'FAQ & Answers',
    description:
      'Quick answers about licenses, formats, entry fees and platform rules — before you dig into a full handbook.',
    href: '/about/faq',
    ctaLabel: 'Browse the FAQ',
    status: 'available',
  },
  {
    id: 'contact',
    index: '05',
    group: 'resources',
    icon: <Mail className="h-4 w-4" />,
    roleLabel: 'Resources',
    title: 'Contact Support',
    description:
      'Reach the Esportra team directly for account issues, bug reports, or anything the guides do not cover.',
    href: '/contact',
    ctaLabel: 'Message support',
    status: 'available',
  },
  {
    id: 'partner',
    index: '06',
    group: 'resources',
    icon: <Sparkles className="h-4 w-4" />,
    roleLabel: 'Resources',
    title: 'Be a Partner',
    description:
      'Partnership tiers, placement zones and analytics — put your brand in front of thousands of competitive gamers.',
    href: '/be-a-partner',
    ctaLabel: 'Explore partnerships',
    status: 'available',
  },
];

/* ─── Handbook wiring ────────────────────────────────────────── */
const GUIDE_SECTIONS: Record<string, GuideSection[]> = {
  'player-guide': playerGuideSections,
  'organizer-guide': organizerGuideSections,
};

const CHAPTER_OWNER = new Map<string, string>();
playerGuideSections.forEach((s) => CHAPTER_OWNER.set(s.id, 'player-guide'));
organizerGuideSections.forEach((s) => CHAPTER_OWNER.set(s.id, 'organizer-guide'));

const stepsOf = (sections: GuideSection[]) => sections.reduce((n, s) => n + s.steps.length, 0);

const TOTAL_CHAPTERS = playerGuideSections.length + organizerGuideSections.length;
const TOTAL_STEPS = stepsOf(playerGuideSections) + stepsOf(organizerGuideSections);

/* ─── Primitives ─────────────────────────────────────────────── */
const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">
    <span className="h-[2px] w-6 bg-rose-500" />
    {children}
  </p>
);

const SlideCta = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden bg-white px-6 font-mono text-xs font-bold uppercase tracking-wider text-matte-black outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/30"
  >
    <span className="relative z-10 inline-flex items-center gap-2 transition-colors duration-300 group-hover:text-white">
      {children}
      <ArrowRight className="h-4 w-4" />
    </span>
    <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
  </Link>
);

/* ─── Flush rail ─────────────────────────────────────────────── */
interface RailItemProps {
  entry: HelpEntry;
  active: boolean;
  onSelect: () => void;
}

const RailItem = ({ entry, active, onSelect }: RailItemProps) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={entry.status === 'soon'}
    className={`group relative flex w-full items-center gap-3 py-3 pr-4 pl-6 text-left outline-none transition-colors disabled:cursor-not-allowed ${
      active ? 'text-white' : 'text-[#a1a1aa] hover:text-white'
    } ${entry.status === 'soon' ? 'opacity-40' : ''}`}
  >
    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-rose-500" />}
    <span className={`w-5 font-mono text-[10px] ${active ? 'text-rose-400' : 'text-[#6b7280]'}`}>
      {entry.index}
    </span>
    <span className={active ? 'text-white' : 'text-[#6b7280]'}>{entry.icon}</span>
    <span className="min-w-0 flex-1 truncate text-sm">{entry.title}</span>
    {entry.status === 'soon' && (
      <span className="font-mono text-[9px] uppercase tracking-widest text-[#6b7280]">Soon</span>
    )}
  </button>
);

interface RailGroupProps {
  label: string;
  entries: HelpEntry[];
  activeId: string;
  onSelect: (id: string) => void;
}

const RailGroup = ({ label, entries, activeId, onSelect }: RailGroupProps) => (
  <div className="border-t border-[#1f2937]/60 py-2 first:border-t-0">
    <p className="px-6 pb-2 pt-4 font-mono text-[9px] font-bold uppercase tracking-[0.45em] text-[#6b7280]">
      {label}
    </p>
    {entries.map((entry) => (
      <RailItem key={entry.id} entry={entry} active={activeId === entry.id} onSelect={() => onSelect(entry.id)} />
    ))}
  </div>
);

/* ─── Handbook renderer ──────────────────────────────────────── */
const StepRow = ({ step, mark }: { step: GuideStep; mark: string }) => (
  <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 md:gap-x-5">
    <span className="pt-0.5 font-mono text-[11px] text-rose-400">{mark}</span>
    <div className="min-w-0">
      <h4 className="text-sm font-semibold text-white md:text-base">{step.title}</h4>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#d1d5db]">{step.content}</p>
      {step.navigation && (
        <p className="mt-2 flex items-start gap-2 font-mono text-[11px] leading-relaxed text-[#a1a1aa]">
          <ArrowRight className="mt-[3px] h-3 w-3 flex-shrink-0 text-rose-500" />
          {step.navigation}
        </p>
      )}
      {step.tip && (
        <p className="mt-3 text-xs leading-relaxed text-[#a1a1aa]">
          <span className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#6b7280]">Note</span>
          {step.tip}
        </p>
      )}
      {step.warning && (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-[#d1d5db]">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-rose-400" />
          <span>
            <span className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-400">Caution</span>
            {step.warning}
          </span>
        </p>
      )}
    </div>
  </div>
);

interface SectionBlockProps {
  section: GuideSection;
  order: number;
}

const SectionBlock = ({ section, order }: SectionBlockProps) => {
  const [open, setOpen] = useState(order === 1);

  return (
    <section id={section.id} className="scroll-mt-28 border-t border-[#1f2937] pt-6 md:pt-8">
      <button type="button" onClick={() => setOpen(!open)} className="group flex w-full items-start gap-4 text-left md:gap-6">
        <span
          aria-hidden
          className="-mt-1 select-none font-heading text-[4.5rem] font-black leading-[0.85] text-white/[0.07] transition-colors duration-300 group-hover:text-rose-500/[0.12] md:-mt-3 md:text-[7rem]"
        >
          {pad2(order)}
        </span>
        <span className="min-w-0 flex-1 pt-1 md:pt-4">
          <span className="block font-heading text-lg font-bold uppercase tracking-tight text-white transition-colors group-hover:text-rose-400 md:text-2xl">
            {section.title}
          </span>
          <span className="mt-1 block text-sm text-[#6b7280]">{section.description}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`mt-2 flex-shrink-0 md:mt-6 ${open ? 'text-rose-400' : 'text-[#6b7280]'}`}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-8 pb-10 pl-[3.5rem] pt-8 md:pl-[8.5rem]">
              {section.steps.map((step, i) => (
                <StepRow key={`${section.id}-${i}`} step={step} mark={`${pad2(order)}.${i + 1}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const HandbookView = ({ entry, sections }: { entry: HelpEntry; sections: GuideSection[] }) => (
  <article>
    <header>
      <Eyebrow>{entry.roleLabel}</Eyebrow>
      <h2 className="mt-4 font-heading text-3xl font-black uppercase tracking-tight text-[#f9fafb] md:text-5xl">
        {entry.title}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d1d5db] md:text-base">{entry.description}</p>
      <nav className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[11px] uppercase tracking-wider">
        {sections.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 && <span className="text-[#6b7280]">/</span>}
            <a href={`#${s.id}`} className="text-[#a1a1aa] transition-colors hover:text-rose-400">
              {s.title}
            </a>
          </Fragment>
        ))}
      </nav>
    </header>

    <div className="mt-10">
      {sections.map((section, i) => (
        <SectionBlock key={section.id} section={section} order={i + 1} />
      ))}
    </div>
  </article>
);

/* ─── Other views ────────────────────────────────────────────── */
const ResourceView = ({ entry }: { entry: HelpEntry }) => (
  <section className="border-t border-[#1f2937] pt-10">
    <Eyebrow>{entry.roleLabel}</Eyebrow>
    <h2 className="mt-4 font-heading text-2xl font-black uppercase tracking-tight text-[#f9fafb] md:text-4xl">
      {entry.title}
    </h2>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#d1d5db] md:text-base">{entry.description}</p>
    <div className="mt-7 flex flex-wrap items-center gap-5">
      <SlideCta to={entry.href ?? '/help'}>{entry.ctaLabel}</SlideCta>
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">{entry.href}</span>
    </div>
  </section>
);

const SoonView = ({ entry }: { entry: HelpEntry }) => (
  <section className="border-t border-[#1f2937] pt-10">
    <Eyebrow>{entry.roleLabel}</Eyebrow>
    <h2 className="mt-4 font-heading text-2xl font-black uppercase tracking-tight text-[#d1d5db] md:text-4xl">
      {entry.title}
    </h2>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#a1a1aa]">{entry.description}</p>
    <p className="mt-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
      <span className="h-1.5 w-1.5 animate-pulse bg-rose-500" />
      In production
    </p>
  </section>
);

/* ─── Page ───────────────────────────────────────────────────── */
const HelpCenter = () => {
  const [searchParams] = useSearchParams();
  const [activeId, setActiveId] = useState(() => {
    const param = searchParams.get('entry');
    if (param && param in GUIDE_SECTIONS) return param;
    const owner = CHAPTER_OWNER.get(window.location.hash.replace('#', ''));
    if (owner) return owner;
    return 'player-guide';
  });

  const active = ENTRIES.find((e) => e.id === activeId) ?? ENTRIES[0];
  const roleEntries = ENTRIES.filter((e) => e.group === 'role');
  const resourceEntries = ENTRIES.filter((e) => e.group === 'resources');
  const sections = GUIDE_SECTIONS[active.id];

  // Chapter deep links (/help#getting-started): select the owning handbook and scroll.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash || !CHAPTER_OWNER.has(hash)) return;
    const owner = CHAPTER_OWNER.get(hash);
    if (owner) setActiveId(owner);
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="esportra-ambient-page !overflow-x-visible relative min-h-screen font-sans text-white selection:bg-rose-500/30">
      <div className="lg:flex">
        {/* Flush full-height rail */}
        <aside className="sticky top-0 hidden h-screen w-[260px] flex-col border-r border-[#1f2937] lg:flex">
          <div className="px-6 pb-6 pt-10">
          <p className="font-heading text-xl font-black uppercase tracking-tight text-white">Esportra</p>
          <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.45em] text-[#6b7280]">
            Support Index
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto pb-4">
          <RailGroup label="By Role" entries={roleEntries} activeId={activeId} onSelect={setActiveId} />
          <RailGroup label="Resources" entries={resourceEntries} activeId={activeId} onSelect={setActiveId} />
        </nav>
        <div className="border-t border-[#1f2937] px-6 py-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.45em] text-[#6b7280]">Still stuck?</p>
          <a
            href="mailto:support@esportra.com"
            className="mt-2 inline-block text-sm text-[#d1d5db] underline-offset-4 transition-colors hover:text-rose-400 hover:underline"
          >
            support@esportra.com
          </a>
        </div>
      </aside>

      {/* Content column */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-32 sm:px-6 lg:px-14">
          {/* Mobile entry strip */}
          <div className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden">
            {ENTRIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setActiveId(entry.id)}
                disabled={entry.status === 'soon'}
                className={`whitespace-nowrap border px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeId === entry.id
                    ? 'border-white bg-white text-matte-black'
                    : 'border-[#1f2937] bg-transparent text-[#a1a1aa]'
                }`}
              >
                <span className="mr-2">{entry.index}</span>
                {entry.title}
              </button>
            ))}
          </div>

          <div className="mx-auto max-w-[1100px]">
          {/* Header */}
          <header className="mb-14">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <Eyebrow>Esportra // Support &amp; Guides</Eyebrow>
              <h1 className="mt-4 font-heading text-4xl font-black uppercase tracking-tight text-[#f9fafb] md:text-6xl">
                Help Center
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#d1d5db] md:text-base">
                Pick your lane on the left. Both handbooks are written against the product as it ships
                today — real routes, real workflow, no filler.
              </p>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[#6b7280]">
                <span className="text-[#f9fafb]">{TOTAL_CHAPTERS}</span> chapters
                <span className="mx-3 text-rose-500">·</span>
                <span className="text-[#f9fafb]">{TOTAL_STEPS}</span> steps
                <span className="mx-3 text-rose-500">·</span>
                <span className="text-[#f9fafb]">{pad2(2)}</span> handbooks live
              </p>
            </motion.div>
          </header>

          {/* Viewport */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {active.status === 'soon' ? (
                <SoonView entry={active} />
              ) : sections ? (
                <HandbookView entry={active} sections={sections} />
              ) : (
                <ResourceView entry={active} />
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default HelpCenter;
