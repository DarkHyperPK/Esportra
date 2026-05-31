import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { JackButton } from "@/components/ui/JackButton";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

/* ============================================================== */
/*  Brand Page — copy-first, editorial                              */
/* ============================================================== */

const UNSPLASH = (id: string, w = 2000, q = 80) =>
  `https://images.unsplash.com/${id}?w=${w}&q=${q}&fit=crop&auto=format`;

// Single hero image — page is otherwise typographic
const HERO_IMG = UNSPLASH("photo-1612287230202-1ff1d85d1bdf");

/* -------------------------------------------------------------- */
/*  Hero                                                            */
/* -------------------------------------------------------------- */

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.12]);

  return (
    <section
      ref={ref}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <motion.div style={{ y, scale }} className="absolute inset-0 z-0">
        <img
          src={HERO_IMG}
          alt=""
          className="absolute inset-0 h-full w-full object-cover grayscale contrast-125 brightness-50"
        />
      </motion.div>

      <div className="absolute inset-0 z-10 bg-black/55" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/30 to-transparent" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0a0a0c]/85 via-transparent to-transparent" />
      <div
        className="absolute inset-0 z-10 opacity-20 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <motion.div
        style={{ opacity }}
        className="relative z-20 flex h-full flex-col justify-center px-6 md:px-16 lg:px-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl"
        >
          <div className="mb-8 flex items-center gap-4">
            <div className="h-px w-12 bg-rose-500" />
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-rose-400">
              For Brands
            </span>
          </div>

          <h1
            className="font-heading font-black uppercase leading-[1] tracking-tighter text-white break-words"
            style={{ fontSize: "clamp(2.25rem, 6vw, 5.5rem)" }}
          >
            Be where the players{" "}
            <span className="italic font-light text-rose-500">
              already are.
            </span>
          </h1>

          <p className="mt-10 max-w-xl text-base font-light leading-relaxed text-white/60 md:text-lg">
            Esportra connects brands with the tournaments, teams, and venues
            that define competitive gaming.
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <JackButton as={Link} to="/contact" size="lg">
              Start a Conversation
              <ArrowRight className="h-4 w-4" />
            </JackButton>
            <a
              href="#capabilities"
              className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white"
            >
              ↓ Read on
            </a>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

/* -------------------------------------------------------------- */
/*  Manifesto                                                       */
/* -------------------------------------------------------------- */

const Manifesto = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const lines = [
    { text: "Sponsorship is broken.", className: "text-white" },
    { text: "We're fixing it.", className: "italic font-light text-rose-500" },
    { text: "Where it matters.", className: "text-white/40" },
  ];

  return (
    <section ref={ref} className="relative py-32 md:py-44">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 flex items-center gap-3"
        >
          <div className="h-px w-12 bg-rose-500" />
          <span className="font-mono text-xs uppercase tracking-[0.4em] text-rose-400">
            The Pitch
          </span>
        </motion.div>

        <div className="space-y-2 md:space-y-4">
          {lines.map((line, i) => (
            <motion.h2
              key={line.text}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
              className={`font-heading font-black uppercase leading-[1] tracking-tighter break-words ${line.className}`}
              style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}
            >
              {line.text}
            </motion.h2>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16 max-w-xl text-base font-light leading-relaxed text-white/40 md:text-lg"
        >
          Banner ads aren&apos;t sponsorship. We put your brand inside the
          tournaments, on the teams, and across the venues people actually
          show up for.
        </motion.p>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------- */
/*  Capabilities — typographic blocks, no images                    */
/* -------------------------------------------------------------- */

const capabilities = [
  {
    n: "01",
    label: "Tournaments",
    title: "Inside the bracket, not next to it.",
    body: "Title-sponsor a tournament or back individual rounds. Your brand lives in match pages, brackets, registration flows, and broadcast overlays.",
  },
  {
    n: "02",
    label: "Teams",
    title: "Back the rosters that compete.",
    body: "Connect with verified teams across multiple titles. Jersey placements, content collaborations, and roster sponsorships — straight from captains.",
  },
  {
    n: "03",
    label: "Venues",
    title: "Be there when matches happen.",
    body: "Esportra Spaces is where players book gaming venues and arenas. Your brand can sponsor seats, equipment, or entire tournaments at the locations where the competition actually happens.",
  },
  {
    n: "04",
    label: "Seasons",
    title: "Long-term presence, structured.",
    body: "Multi-stage seasons with qualifiers, group stages, and finals — all under one banner. Months of continuous exposure, not one-offs.",
  },
];

const CapabilityBlock = ({
  cap,
  index,
}: {
  cap: (typeof capabilities)[number];
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.05 }}
      className="group border-t border-white/10 py-12 transition-colors hover:border-rose-500/40 md:py-16"
    >
      {/* Header strip: number + label inline */}
      <div className="mb-6 flex items-baseline gap-6">
        <span
          className="font-heading font-black leading-none text-white/15 transition-colors duration-500 group-hover:text-rose-500/80"
          style={{ fontSize: "clamp(2.5rem, 4vw, 4rem)" }}
        >
          {cap.n}
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.4em] text-rose-400">
          {cap.label}
        </span>
      </div>

      {/* Title — full width */}
      <h3
        className="mb-5 max-w-4xl font-black uppercase leading-tight tracking-tight text-white"
        style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.75rem)" }}
      >
        {cap.title}
      </h3>

      {/* Body — full width up to readable measure */}
      <p className="max-w-2xl text-base font-light leading-relaxed text-white/50 md:text-lg">
        {cap.body}
      </p>
    </motion.div>
  );
};

const Capabilities = () => {
  return (
    <section id="capabilities" className="relative py-32 md:py-44">
      <div className="container mx-auto px-4">
        <div className="mb-20 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px w-12 bg-rose-500" />
              <span className="font-mono text-xs uppercase tracking-[0.4em] text-rose-400">
                Capabilities
              </span>
            </div>
            <h2
              className="font-heading font-black uppercase tracking-tighter text-white break-words"
              style={{ fontSize: "clamp(1.875rem, 4.5vw, 3.5rem)" }}
            >
              Four ways <span className="text-white/30">to show up.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm font-light leading-relaxed text-white/40">
            We don&apos;t sell impressions. We sell presence — inside the
            moments and spaces audiences already lean into.
          </p>
        </div>

        <div className="border-b border-white/10">
          {capabilities.map((cap, i) => (
            <CapabilityBlock key={cap.n} cap={cap} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------- */
/*  How It Works                                                    */
/* -------------------------------------------------------------- */

const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      n: "01",
      title: "Brief",
      body: "Tell us your category, audience, and KPIs.",
    },
    {
      n: "02",
      title: "Match",
      body: "We connect you with organizers, teams, or venues that fit.",
    },
    {
      n: "03",
      title: "Activate",
      body: "Placements go live across tournaments, pages, and broadcasts.",
    },
    {
      n: "04",
      title: "Measure",
      body: "Track impressions and conversion in your partner dashboard.",
    },
  ];

  return (
    <section ref={ref} className="relative py-32 md:py-40">
      <div className="container mx-auto px-4">
        <div className="mb-16 max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px w-12 bg-rose-500" />
            <span className="font-mono text-xs uppercase tracking-[0.4em] text-rose-400">
              The Process
            </span>
          </div>
          <h2
            className="font-heading font-black uppercase tracking-tighter text-white break-words"
            style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
          >
            From brief <span className="text-white/30">to broadcast.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px bg-white/5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative bg-[#0a0a0c]/80 p-8 transition-colors hover:bg-[#101013]/90"
            >
              <span className="font-mono text-xs uppercase tracking-[0.4em] text-rose-400">
                {step.n}
              </span>
              <h3 className="mt-5 font-heading text-2xl font-black uppercase tracking-tight text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/40">
                {step.body}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-rose-500 transition-all duration-700 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------- */
/*  CTA — pure typography, no image                                 */
/* -------------------------------------------------------------- */

const CTA = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-44">
      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9 }}
        >
          <div className="mb-8 inline-flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            <span className="font-mono text-xs uppercase tracking-[0.5em] text-rose-400">
              Open for Partnerships
            </span>
          </div>

          <h2
            className="font-heading font-black uppercase leading-[1] tracking-tighter text-white break-words"
            style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
          >
            Let&apos;s{" "}
            <span className="italic font-light text-rose-500">build.</span>
          </h2>

          <p className="mx-auto mt-10 max-w-xl text-base font-light leading-relaxed text-white/50">
            Tell us what your brand is trying to do in gaming. We&apos;ll come
            back with a real plan.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <JackButton
              as={Link}
              to="/contact"
              size="lg"
              className="h-16 px-12 text-sm"
            >
              Talk to Us
              <ChevronRight className="h-4 w-4" />
            </JackButton>
            <JackButton
              as={Link}
              to="/be-a-partner"
              variant="ghost"
              size="lg"
              className="h-16 px-12 text-sm backdrop-blur-0"
            >
              Partner Program
            </JackButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------- */
/*  Page                                                            */
/* -------------------------------------------------------------- */

const BrandPage = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0c] text-white selection:bg-rose-500/30">
      {/* Fixed background — low-contrast ripped streaks */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#0a0a0c]" />
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -left-[10%] top-[-15%] h-[145%] w-[20%] rotate-[-17deg] bg-white/[0.075] [clip-path:polygon(44%_0,69%_0,53%_24%,76%_42%,49%_64%,67%_100%,23%_100%,35%_78%,12%_53%,38%_29%)]" />
          <div className="absolute left-[18%] top-[-9%] h-[132%] w-[13%] rotate-[-4deg] bg-white/[0.065] [clip-path:polygon(30%_0,84%_0,52%_19%,74%_46%,45%_69%,62%_100%,15%_100%,35%_76%,10%_51%,44%_26%)]" />
          <div className="absolute left-[38%] top-[-18%] h-[150%] w-[18%] rotate-[5deg] bg-white/[0.08] [clip-path:polygon(36%_0,75%_0,62%_18%,85%_35%,57%_58%,72%_100%,30%_100%,34%_80%,8%_56%,39%_31%)]" />
          <div className="absolute left-[68%] top-[-12%] h-[138%] w-[17%] rotate-[19deg] bg-white/[0.07] [clip-path:polygon(39%_0,88%_0,64%_21%,80%_46%,54%_67%,72%_100%,27%_100%,37%_78%,10%_54%,41%_28%)]" />
        </div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.08] mix-blend-overlay" />
      </div>

      <div className="relative z-10">
        <SEO
          url="/brand"
          title="Esportra for Brands"
          description="Sponsor tournaments, back teams, and activate venues across competitive gaming. Real placements, measurable presence."
        />
        <Hero />
        <Manifesto />
        <Capabilities />
        <HowItWorks />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default BrandPage;
