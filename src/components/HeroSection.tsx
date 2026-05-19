import { useState, useRef, useEffect } from "react";
import { ChevronRight, Volume2, VolumeX, ChevronDown, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { getWebsiteAssetUrl } from "@/lib/storage";
import {
  deriveHasApprovedLicense,
  fetchMeRoles,
  meRolesQueryKey,
} from "@/lib/meRoles";

// LCP-optimized: Use direct URL
const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const HeroSection = () => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [volume] = useState(0.75); // Fixed at 75% as per request
  const [isHovered, setIsHovered] = useState(false);
  const [isAudioControlHovered, setIsAudioControlHovered] = useState(false);
  const [isLogoMoved, setIsLogoMoved] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Parallax Effect Hooks
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 200]);
  const contentOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Trigger content reveal shortly after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLogoMoved(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Resolve where the "Host Tournament" CTA should send the user
  const { data: meRoles } = useQuery({
    queryKey: meRolesQueryKey,
    queryFn: fetchMeRoles,
    enabled: !!user,
    staleTime: 60_000,
  });
  const hasApprovedLicense = !!user && deriveHasApprovedLicense(meRoles);
  const hostTournamentHref = !user
    ? "/auth/signup"
    : hasApprovedLicense
      ? "/tournaments/create"
      : "/verification";

  // Ensure video is playing and handle initial mute/volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
      videoRef.current.play().catch(error => {
        console.log("Autoplay check:", error);
      });
    }
  }, [isMuted, volume]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div
      className="relative flex items-center pt-0 mt-0 overflow-hidden"
      style={{ minHeight: '100vh', backgroundColor: '#0f1115' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Parallax Background Video Container */}
      <motion.div
        className="absolute inset-0 w-full h-full z-0"
        style={{ y: backgroundY }}
      >
        <motion.video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={() => setIsVideoLoaded(true)}
          onError={(e) => console.error("Hero video failed to load:", e)}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVideoLoaded ? 1 : 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 w-full h-full object-cover scale-[1.25] md:scale-110"
          style={{ objectPosition: 'center' }}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </motion.video>
      </motion.div>

      {/* Heavy darken layer so the headline + CTAs read clearly over the video */}
      <div className="absolute inset-0 z-10 bg-black/70" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-black/55 to-black/85" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0f1115] to-transparent z-10"></div>

      {/* Video Credits - Bottom Left */}
      <div className="absolute bottom-12 left-8 z-30 opacity-40 hover:opacity-100 transition-opacity duration-500 text-[10px] uppercase tracking-[0.3em] text-white/60 font-medium">
        Credits: ViderGG
      </div>

      {/* Audio Controls - Bottom Right */}
      <div
        className="absolute bottom-12 right-8 z-30 flex flex-col items-center gap-4 group/controls"
        onMouseEnter={() => setIsAudioControlHovered(true)}
        onMouseLeave={() => setIsAudioControlHovered(false)}
      >
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {isHovered && !isAudioControlHovered && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40 font-light"
              >
                {isMuted ? 'Audio Off' : 'Audio On'}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={toggleMute}
            className="group/btn relative flex items-center justify-center w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-500 overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white/50 group-hover/btn:text-white transition-colors duration-300" />
            ) : (
              <Volume2 className="w-5 h-5 text-white group-hover/btn:scale-110 transition-all duration-300" />
            )}
          </button>
        </div>
      </div>

      {/* Hero content */}
      <motion.div
        className="relative z-20 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 text-center"
        style={{ opacity: contentOpacity, minHeight: '100vh' }}
      >
        <div className="w-full">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isLogoMoved ? 1 : 0, y: isLogoMoved ? 0 : 30 }}
            transition={{ duration: 1, delay: isLogoMoved ? 0.35 : 0, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading text-5xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] md:text-7xl lg:text-8xl"
          >
            Where competition <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent">
              actually lives.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLogoMoved ? 1 : 0, y: isLogoMoved ? 0 : 20 }}
            transition={{ duration: 1, delay: isLogoMoved ? 0.55 : 0, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-white/75 md:text-lg"
          >
            Run tournaments, build seasons, book venues, manage teams.
            <br className="hidden md:block" />
            One platform engineered for organizers, players, and operators.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLogoMoved ? 1 : 0, y: isLogoMoved ? 0 : 20 }}
            transition={{ duration: 1, delay: isLogoMoved ? 0.55 : 0, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to={user ? "/tournaments" : "/auth/signup"}
              className="group relative inline-flex h-14 items-center gap-2 overflow-hidden bg-white px-10 font-mono text-sm font-bold uppercase tracking-wider text-black"
            >
              <span className="relative z-10 flex items-center gap-2">
                {user ? "Browse Tournaments" : "Jack In"}
                <ChevronRight className="h-4 w-4" />
              </span>
              <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
            </Link>

            <Link
              to={hostTournamentHref}
              className="group relative inline-flex h-14 items-center gap-2 overflow-hidden border border-white/25 bg-white/5 px-10 font-mono text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md transition-colors hover:border-white/50 hover:bg-white/10"
            >
              <Trophy className="h-4 w-4" />
              Host Tournament
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLogoMoved ? 1 : 0 }}
        transition={{ duration: 1, delay: isLogoMoved ? 1.2 : 0 }}
        style={{ opacity: contentOpacity }}
        className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce text-white/40" />
        </div>
      </motion.div>
    </div>
  );
};

export default HeroSection;
