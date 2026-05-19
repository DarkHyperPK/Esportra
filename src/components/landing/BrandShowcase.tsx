import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Heart,
  BarChart3,
  Layers,
  ArrowRight,
} from "lucide-react";
import { JackButton } from "@/components/ui/JackButton";

const pillars = [
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Fund the Scene",
    desc: "Your brand powers the prize pools players compete for.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Native Integrations",
    desc: "Hand-placed across tournaments, match pages, and streams.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Real Analytics",
    desc: "Impressions, clicks, CTR, and demographics — all tracked.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const BrandShowcase = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-[#0a0a0a] relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(245,158,11,0.05)_0%,transparent_60%)] pointer-events-none"
        aria-hidden
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-white/30 text-xs md:text-sm tracking-[0.4em] uppercase font-medium block mb-4">
            For Brands &amp; Sponsors
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.15em] text-white uppercase font-heading mb-6">
            Power the{" "}
            <span className="font-medium italic text-rose-500">
              Competition
            </span>
          </h2>
          <p className="text-white/40 text-sm md:text-base font-light font-heading max-w-lg mx-auto">
            Put your brand where it matters — alongside the tournaments, teams,
            and moments players care about.
          </p>
        </motion.div>

        {/* Why Esportra — centered */}
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-rose-500/30 to-transparent" />
            <span className="text-rose-400 text-xs tracking-[0.3em] uppercase font-semibold whitespace-nowrap">
              Why Esportra
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-rose-500/30 to-transparent" />
          </div>

          <h3 className="text-2xl md:text-3xl font-light text-white font-heading text-center">
            Not ads. Sponsorships.
          </h3>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="space-y-3"
          >
            {pillars.map((pillar) => (
              <motion.div
                key={pillar.title}
                variants={cardVariants}
                className="group p-5 bg-white/[0.02] border border-white/5 hover:border-rose-500/20 transition-all duration-500 hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                    {pillar.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-medium text-base mb-1 font-heading">
                      {pillar.title}
                    </h4>
                    <p className="text-white/40 text-sm leading-relaxed font-light">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <div className="pt-2 text-center">
            <JackButton as={Link} to="/partners" size="md">
              Become a Partner
              <ArrowRight className="w-4 h-4" />
            </JackButton>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandShowcase;
