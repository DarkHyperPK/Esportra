import { Button } from "@/components/ui/button";
import { Gamepad2, Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { user } = useAuth();
  
  return (
    <div className="relative flex items-center pt-0 mt-0 overflow-hidden" style={{ minHeight: '110vh', height: '110vh', backgroundColor: '#18181b' }}>
      {/* Background with overlay gradient */}
      <img
        src="https://ggmoxgiddhhvimbdolsl.supabase.co/storage/v1/object/public/website-pics/main%20screen.jpg"
        alt="Gaming Hero Background"
        className="absolute inset-0 w-full h-full object-contain object-center z-0 bg-esports-dark"
        style={{ minHeight: '110vh', height: '110vh', backgroundColor: '#18181b' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gaming-darker via-gaming-darker/80 to-transparent z-10"></div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Book Gaming Venues & Join 
            <span className="text-gradient"> Esports Tournaments</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            The ultimate platform connecting gamers with premium venues and
            tournaments. Find your perfect gaming spot or compete at the next level.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Button className="bg-gaming-purple hover:bg-gaming-purple/80 text-white" asChild>
                <Link to="/venues/featured">
                  Explore Venues
                </Link>
              </Button>
            ) : (
              <Button className="bg-gaming-purple hover:bg-gaming-purple/80 text-white" asChild>
                <Link to="/auth/signup">
                  Sign Up Now
                </Link>
              </Button>
            )}
            <Button variant="outline" className="border-gaming-blue text-gaming-blue hover:bg-gaming-blue hover:text-white" asChild>
              <Link to="/about/company">
                Learn More
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
            {/* Find Venues */}
            <div className="relative rounded-lg overflow-hidden border border-gray-600/30 transition-all duration-200 hover:border-esports-blue hover:shadow-lg">
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1598550487031-0898b4852123?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}} />
              <div className="absolute inset-0 bg-esports-dark/85" />
              <div className="relative z-10 p-4">
                <div className="text-esports-blue mb-2">
                  <Gamepad2 size={24} />
                </div>
                <h3 className="text-white font-bold mb-1">Find Venues</h3>
                <p className="text-gray-300 text-sm">Discover the perfect gaming venue near you</p>
              </div>
            </div>
            {/* Join Tournaments */}
            <div className="relative rounded-lg overflow-hidden border border-gray-600/30 transition-all duration-200 hover:border-esports-orange hover:shadow-lg">
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80')"}} />
              <div className="absolute inset-0 bg-esports-dark/85" />
              <div className="relative z-10 p-4">
                <div className="text-esports-orange mb-2">
                  <Calendar size={24} />
                </div>
                <h3 className="text-white font-bold mb-1">Join Tournaments</h3>
                <p className="text-gray-300 text-sm">Participate in verified, premium esports competitions</p>
              </div>
            </div>
            {/* Win Prizes */}
            <div className="relative rounded-lg overflow-hidden border border-gray-600/30 transition-all duration-200 hover:border-esports-green hover:shadow-lg">
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1514820720301-4c4790309f46?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}} />
              <div className="absolute inset-0 bg-esports-dark/85" />
              <div className="relative z-10 p-4">
                <div className="text-esports-green mb-2">
                  <Trophy size={24} />
                </div>
                <h3 className="text-white font-bold mb-1">Win Prizes</h3>
                <p className="text-gray-300 text-sm">Compete for glory and valuable prize pools</p>
              </div>
            </div>
          </div>
        </div>
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
