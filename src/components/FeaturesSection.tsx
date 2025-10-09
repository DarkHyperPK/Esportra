
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Calendar, Users, Search, Clock, PanelLeft, Trophy, Globe } from "lucide-react";

const FeaturesSection = () => {
  return (
    <div className="bg-gaming-dark py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            A Complete Gaming <span className="text-gradient">Ecosystem</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Frag&Book brings together all the components needed for a thriving gaming community,
            from venue discovery to professional tournament management.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>

        <div className="bg-esports-dark p-8 rounded-xl border border-gaming-gray/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gaming-purple/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ready to elevate your gaming experience?</h3>
              <p className="text-gray-400">Join Frag&Book today and discover a new way to game.</p>
            </div>
            <div className="flex gap-4">
              <Button className="bg-gaming-purple hover:bg-gaming-purple/80 text-white px-6">
                Sign Up Now
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type Feature = {
  icon: JSX.Element;
  title: string;
  description: string;
  color: string;
  tooltipText?: string;
};

const features: Feature[] = [
  {
    icon: <Search size={24} />,
    title: "Venue Discovery",
    description: "Find the perfect gaming venue with advanced filters for location, pricing, and amenities.",
    color: "gaming-blue",
    tooltipText: "Filter by game type, equipment, and more",
  },
  {
    icon: <Calendar size={24} />,
    title: "Easy Booking",
    description: "Reserve gaming stations at your favorite venues with just a few clicks.",
    color: "gaming-purple",
    tooltipText: "Real-time availability updates",
  },
  {
    icon: <Users size={24} />,
    title: "Group Bookings",
    description: "Book multiple stations for your squad and enjoy gaming together.",
    color: "gaming-green",
    tooltipText: "Discounts available for large groups",
  },
  {
    icon: <Trophy size={24} />,
    title: "Tournament Platform",
    description: "Join verified, premium esports tournaments with automated brackets and matchmaking.",
    color: "gaming-purple",
    tooltipText: "Professional tournament management",
  },
  {
    icon: <PanelLeft size={24} />,
    title: "Venue Management",
    description: "Gaming café owners can easily list venues, manage bookings, and host tournaments.",
    color: "gaming-blue",
    tooltipText: "Complete business dashboard",
  },
  {
    icon: <Globe size={24} />,
    title: "Gaming Community",
    description: "Connect with other gamers, form teams, and participate in local and online events.",
    color: "gaming-green",
    tooltipText: "Build your gaming network",
  },
];

const FeatureCard = ({ feature }: { feature: Feature }) => {
  return (
    <TooltipProvider>
      <div className="bg-esports-dark p-6 rounded-lg border border-gaming-gray/30 transition-all duration-300 hover:border-gaming-purple/50 group">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`bg-${feature.color}/20 p-3 rounded-lg w-fit mb-4 group-hover:animate-pulse-glow`}>
              <div className={`text-${feature.color}`}>{feature.icon}</div>
            </div>
          </TooltipTrigger>
          {feature.tooltipText && (
            <TooltipContent>
              <p>{feature.tooltipText}</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
        <p className="text-gray-400">{feature.description}</p>
      </div>
    </TooltipProvider>
  );
};

export default FeaturesSection;
