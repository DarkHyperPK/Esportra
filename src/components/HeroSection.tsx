import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Gamepad2, Calendar, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

// LCP-optimized: Use direct URL without any SDK calls
const HERO_VIDEO_URL = 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/hero%20section%20video/video3.mp4';

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
  const contentY = useTransform(scrollY, [0, 500], [0, 150]);
  const contentOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Trigger logo animation after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLogoMoved(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

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
          poster="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/hero%20section%20video/poster.png"
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

      {/* Darker overlay for stronger text contrast */}
      <div className="absolute inset-0 z-10 bg-black/75" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(67,56,202,0.1),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.05),transparent_50%)]"></div>
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

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 flex justify-center items-center h-full min-h-[100vh]">
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: isLogoMoved ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.85 : 0.7) : 1,
            y: isLogoMoved ? (typeof window !== 'undefined' && window.innerWidth < 768 ? -280 : -350) : 0 // Responsive vertical move
          }}
          transition={{
            duration: 1.5,
            delay: isLogoMoved ? 0 : 0.4,
            ease: [0.22, 1, 0.36, 1]
          }}
          style={{ opacity: contentOpacity }}
          className="flex flex-col items-center justify-center pt-20"
        >
          <img
            src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png"
            alt="Esportra Logo"
            className="h-24 md:h-32 w-auto opacity-90 drop-shadow-[0_0_25px_rgba(255,255,255,0.1)] transition-all duration-1000"
          />
          <motion.h2
            animate={{ opacity: isLogoMoved ? 0.6 : 1 }} // Restored visibility 
            className="text-white text-xl md:text-2xl font-light tracking-[0.2em] mt-6 uppercase font-heading text-center"
          >
            Esports. Elevated.
          </motion.h2>
        </motion.div>
      </div>
    </div>
  );
};

const Trophy = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default HeroSection;
