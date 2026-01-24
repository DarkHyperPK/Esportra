import React, { useRef } from 'react';
import Footer from '@/components/Footer';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, Shield, ChevronRight, Crosshair, Cpu, Globe, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  // Theme Constants (Rose / New Style Hardcoded)
  const theme = {
    color: 'text-rose-500',
    bg: 'bg-rose-500',
    selection: 'selection:bg-rose-500/30',
    blob: 'bg-rose-600/10',
    border: 'border-rose-500',
    shadow: 'shadow-rose-500/20',
    hoverBorder: 'group-hover:border-rose-500/50',
    hoverText: 'group-hover:text-rose-500',
    hoverBg: 'group-hover:bg-rose-500/10',
    gradient: 'from-rose-900/20',
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef} className={`min-h-screen bg-[#050505] text-white ${theme.selection} overflow-x-hidden font-sans transition-colors duration-500`}>
      {/* Dynamic Background Noise & Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
        <div className={`absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] ${theme.blob} blur-[150px] rounded-full mix-blend-screen transition-colors duration-700`} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <main className="relative z-10">

        {/* HERO: Option D "The Ascendant" */}
        <section className="h-screen flex flex-col justify-center items-center relative px-4 overflow-hidden">
          <motion.div
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="text-center z-10"
          >
            <div className="mb-6 flex justify-center">
              <span className={`px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-rose-400 font-mono tracking-widest uppercase transition-colors duration-500`}>
                RANK_SUBSCRIPTION: ACTIVE
              </span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-4 leading-none mix-blend-difference">
              RISE <span className={`${theme.color} transition-colors duration-500`}>ABOVE</span>
            </h1>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              LEGENDS ONLY
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 left-0 right-0 text-center"
          >
            <p className="text-xs font-mono text-gray-500 tracking-[0.3em] uppercase animate-pulse">
              Scroll to Initialize
            </p>
          </motion.div>
        </section>

        {/* SECTION 1: Problem/Solution */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-16 items-stretch">
              {/* Image Section - Full Height & Styled */}
              <div className="w-full md:w-1/2 relative group min-h-[600px]">
                <div className={`absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 ${theme.border} transition-all duration-500 group-hover:w-full group-hover:h-full group-hover:-top-2 group-hover:-left-2`} />
                <div className={`absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 ${theme.border} transition-all duration-500 group-hover:w-full group-hover:h-full group-hover:-bottom-2 group-hover:-right-2`} />

                <div className={`relative overflow-hidden bg-gray-900 w-full h-full shadow-2xl shadow-rose-500/20`}>
                  <img
                    src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/About%20us%20section%20assets/origin.jpg"
                    alt="The Fragmentation"
                    className="w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 transition-all duration-[1500ms] ease-in-out group-hover:rotate-2 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 bg-rose-500/20 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity duration-[1500ms] ease-in-out pointer-events-none`} />
                </div>
              </div>

              <div className="w-full md:w-1/2 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-12 h-[1px] ${theme.bg}`} />
                  <span className={`${theme.color} font-mono text-sm tracking-widest`}>SYSTEM_STATUS: OPTIMAL</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bold font-heading mb-8 leading-tight">
                  Organizing Chaos.<br />
                  <span className="text-gray-600">Empowering Legends.</span>
                </h2>
                <div className="space-y-6 text-lg text-gray-400 font-light leading-relaxed">
                  <p>
                    <strong className="text-white">Running a tournament used to be a nightmare.</strong> Spreadsheets, Discord DMs, manual bracket updates, and payment disputes. Organizers were drowning in admin work instead of building communities.
                  </p>
                  <p>
                    We built the operating system for esports. From automated Swiss brackets to instant prize payouts and team management. Esportra gives every organizer the power of a major league production suite, right at their fingertips.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Core Protocols (Card System Layout) */}
        <section className="py-32 bg-[#080808] border-y border-white/5 relative">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-20">
              <div>
                <h2 className="text-5xl md:text-7xl font-black font-heading tracking-tighter mb-4 text-white">CORE PROTOCOLS</h2>
                <p className="text-gray-500 font-mono text-sm">/root/system/values</p>
              </div>
              <Cpu className="hidden md:block w-12 h-12 text-white/10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
              {[
                { title: "COMPETITIVE INTEGRITY", desc: "Advanced anti-cheat and verification protocols ensuring every victory is earned.", icon: Crosshair },
                { title: "SEAMLESS AUTOMATION", desc: "Zero-latency bracket management and real-time result processing.", icon: Zap },
                { title: "GLOBAL CONNECTIVITY", desc: "A unified network bridging the gap between local venues and global arenas.", icon: Globe },
                { title: "DATA PRECISION", desc: "Comprehensive analytics that track performance with professional-grade accuracy.", icon: BarChart3 }
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-[#121214] border border-zinc-800/50 hover:border-rose-500/50 transition-all duration-500">
                  <div className="mb-6 p-3 rounded-lg bg-zinc-900/50 w-fit group-hover:bg-rose-500/10 transition-colors">
                    <feature.icon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-sm font-bold tracking-widest text-white mb-3 group-hover:text-rose-500 transition-colors">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: The Uplink (CTA) */}
        <section className="min-h-[80vh] flex items-center justify-center relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-t ${theme.gradient} to-transparent opacity-50 transition-colors duration-500`} />
          <div className="relative z-10 text-center px-4">
            <div className={`mb-8 inline-flex items-center gap-2 ${theme.color} font-mono text-xs tracking-[0.5em] uppercase`}>
              <span className={`w-2 h-2 ${theme.bg} animate-ping rounded-full`} />
              System Ready
            </div>

            <h2 className="text-5xl md:text-8xl font-black font-heading mb-8 tracking-tighter">
              INITIATE<br />SEQUENCE
            </h2>

            <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
              <Button className="h-16 px-12 bg-white text-black hover:bg-gray-200 text-lg font-bold font-mono tracking-wider rounded-none relative group overflow-hidden" asChild>
                <Link to="/auth/signup">
                  <span className="relative z-10 flex items-center gap-2">
                    JACK IN <ChevronRight className="w-4 h-4" />
                  </span>
                  <div className={`absolute inset-0 ${theme.bg} translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0`} />
                </Link>
              </Button>

              <Button variant="outline" className="h-16 px-12 border-white/20 text-white hover:bg-white/5 text-lg font-mono tracking-wider rounded-none" asChild>
                <Link to="/tournaments">OBSERVE DATA</Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
