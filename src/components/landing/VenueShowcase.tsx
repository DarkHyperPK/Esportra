import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { JackButton } from "@/components/ui/JackButton";
import {
  Building2,
  CalendarCheck,
  TrendingUp,
  Gamepad2,
  MapPin,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BenefitCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ownerBenefits: BenefitCard[] = [
  {
    icon: <Building2 className="w-5 h-5" />,
    title: "Reach Esports Communities",
    description:
      "Connect with tournament organizers and competitive players in your area.",
  },
  {
    icon: <CalendarCheck className="w-5 h-5" />,
    title: "Smart Booking System",
    description:
      "Manage availability, pricing, and bookings from one dashboard.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Grow Your Revenue",
    description: "Fill empty slots with esports events and LAN parties.",
  },
];

const playerBenefits: BenefitCard[] = [
  {
    icon: <Gamepad2 className="w-5 h-5" />,
    title: "Premium Gaming Setups",
    description:
      "High-end PCs, consoles, and peripherals ready to compete.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Venues Near You",
    description:
      "Discover gaming spaces in your city with real-time availability.",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: "LAN Experience",
    description:
      "Nothing beats competing side by side. Find your next LAN spot.",
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

const BenefitCardItem = ({
  card,
  accent,
}: {
  card: BenefitCard;
  accent: "rose" | "cyan";
}) => {
  const colorMap = {
    rose: {
      iconBg: "bg-rose-500/10",
      iconBorder: "border-rose-500/20",
      iconText: "text-rose-400",
      hoverBorder: "hover:border-rose-500/20",
    },
    cyan: {
      iconBg: "bg-white/[0.05]",
      iconBorder: "border-white/10",
      iconText: "text-white",
      hoverBorder: "hover:border-white/20",
    },
  };

  const colors = colorMap[accent];

  return (
    <motion.div
      variants={cardVariants}
      className={`group p-5 bg-white/[0.02] border border-white/5 ${colors.hoverBorder} transition-all duration-500 hover:bg-white/[0.04]`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 ${colors.iconBg} border ${colors.iconBorder} flex items-center justify-center ${colors.iconText} flex-shrink-0`}
        >
          {card.icon}
        </div>
        <div className="min-w-0">
          <h4 className="text-white font-medium text-base mb-1 font-heading">
            {card.title}
          </h4>
          <p className="text-white/40 text-sm leading-relaxed font-light">
            {card.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const VenueShowcase = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-[#0a0a0c] relative overflow-hidden"
    >
      {/* Background ambience */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(244,63,94,0.04)_0%,transparent_60%)] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(244,63,94,0.03)_0%,transparent_60%)] pointer-events-none"
        aria-hidden
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-white/30 text-xs md:text-sm tracking-[0.4em] uppercase font-medium block mb-4">
            Venues &amp; Spaces
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.15em] text-white uppercase font-heading mb-6">
            Where Competitors{" "}
            <span className="font-medium italic text-rose-500">
              Gather
            </span>
          </h2>
          <p className="text-white/40 text-sm md:text-base font-light font-heading max-w-xl mx-auto">
            One platform for venue owners to list their spaces and players to
            discover the perfect arena.
          </p>
        </motion.div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Left — Venue Owners */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Column header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1 bg-gradient-to-r from-rose-500/30 to-transparent" />
              <span className="text-rose-400 text-xs tracking-[0.3em] uppercase font-semibold whitespace-nowrap">
                For Venue Owners
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-rose-500/30 to-transparent" />
            </div>

            <h3 className="text-2xl md:text-3xl font-light text-white font-heading text-center lg:text-left">
              List Your Space
            </h3>

            {/* Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="space-y-3"
            >
              {ownerBenefits.map((card) => (
                <BenefitCardItem key={card.title} card={card} accent="rose" />
              ))}
            </motion.div>

            {/* CTA */}
            <div className="pt-2 text-center lg:text-left">
              <JackButton
                onClick={() => setShowLicenseDialog(true)}
                variant="primary"
                size="md"
              >
                List Your Venue
              </JackButton>
            </div>
          </motion.div>

          {/* Right — Players */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="space-y-6"
          >
            {/* Column header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              <span className="text-white text-xs tracking-[0.3em] uppercase font-semibold whitespace-nowrap">
                For Players
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-white/20 to-transparent" />
            </div>

            <h3 className="text-2xl md:text-3xl font-light text-white font-heading text-center lg:text-left">
              Find Your Arena
            </h3>

            {/* Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="space-y-3"
            >
              {playerBenefits.map((card) => (
                <BenefitCardItem key={card.title} card={card} accent="cyan" />
              ))}
            </motion.div>

            {/* CTA */}
            <div className="pt-2 text-center lg:text-left">
              <JackButton as={Link} to="/venues" variant="invert" size="md">
                Explore Venues
              </JackButton>
            </div>
          </motion.div>
        </div>
      </div>

      {/* License requirement dialog */}
      <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
        <DialogContent className="max-w-md bg-[#121214] border-white/10">
          <DialogHeader>
            <div className="mx-auto mb-3 w-12 h-12 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-rose-400" />
            </div>
            <DialogTitle className="text-center text-white text-xl font-heading">
              License Required
            </DialogTitle>
            <DialogDescription className="text-center text-white/50 text-sm leading-relaxed pt-2">
              To list a venue on Esportra, you need a verified venue license. This ensures quality and trust for all players booking your space. Apply for your license to get started.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => setShowLicenseDialog(false)}
              className="px-5 py-2.5 border border-white/10 text-white/60 text-sm font-mono uppercase tracking-wider hover:bg-white/5 transition-colors"
            >
              Maybe Later
            </button>
            <Link
              to="/verification"
              onClick={() => setShowLicenseDialog(false)}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden border border-white bg-white px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black transition-colors"
            >
              Apply for License
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VenueShowcase;
