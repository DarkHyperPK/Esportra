import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const VenueCallToAction = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-32 md:py-40 bg-[#0a0a0a]"
    >
      {/* Background image — more visible than SupportedGames */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <img
          src={getWebsiteAssetUrl("landing-page-assets/enter-arena.jpg")}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-60 scale-105"
        />
        {/* Top / bottom fade for seamless blending */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        {/* Side vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 via-transparent to-[#0a0a0a]/60" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 flex items-center justify-center">
        {/* Glassmorphism container */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={
            isInView ? { opacity: 1, y: 0, scale: 1 } : {}
          }
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-3xl text-center px-6 py-14 md:px-12 md:py-20 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl backdrop-saturate-150 shadow-[0_0_80px_rgba(0,0,0,0.6)]"
        >
          {/* Label */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block text-rose-400/80 text-xs md:text-sm tracking-[0.35em] uppercase font-medium mb-6"
          >
            The Future of Competitive Gaming
          </motion.span>

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-3xl md:text-5xl lg:text-6xl font-light text-white leading-[1.15] tracking-wide font-heading mb-6"
          >
            Your City. Your Arena.{" "}
            <span className="font-medium italic text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-cyan-400">
              Your Rules.
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-white/40 text-sm md:text-lg font-light leading-relaxed max-w-xl mx-auto mb-10"
          >
            Whether you're a venue owner looking to host esports events or a
            player searching for the perfect LAN spot — Esportra connects you.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/venues/register"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-sm font-medium tracking-wide hover:from-rose-400 hover:to-rose-500 transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 min-w-[170px]"
            >
              List Your Venue
            </Link>
            <Link
              to="/venues"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl border border-white/15 text-white text-sm font-medium tracking-wide hover:bg-white/5 hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5 min-w-[170px]"
            >
              Find Venues
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default VenueCallToAction;
