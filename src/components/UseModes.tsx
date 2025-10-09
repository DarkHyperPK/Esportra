
import { Button } from "@/components/ui/button";
import { GamepadIcon, Trophy, Swords, Users } from "lucide-react";
import { Link } from "react-router-dom";

const UseModes = () => {
  return (
    <div className="bg-esports-dark py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Choose Your Gaming <span className="text-gradient">Mode</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Whether you're looking for casual gaming sessions with friends or serious esports competition,
            Frag&Book has you covered with two specialized experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Casual Mode */}
          <div className="bg-gradient-to-br from-gaming-dark to-gaming-dark/60 border border-gaming-gray/20 rounded-xl p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gaming-blue/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-gaming-blue/20 transition-all duration-700"></div>
            
            <div className="bg-gaming-blue/20 p-3 rounded-lg w-fit mb-6">
              <GamepadIcon size={24} className="text-gaming-blue" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3">Casual Mode</h3>
            <p className="text-gray-300 mb-6">
              Perfect for social gamers looking to enjoy gaming venues with friends without the pressure of competition.
            </p>
            
            <ul className="space-y-3 mb-8">
              {[
                { icon: <MapPin size={18} />, text: "Find and book gaming cafés near you" },
                { icon: <Users size={18} />, text: "Book multiple seats for your gaming squad" },
                { icon: <Clock size={18} />, text: "Flexible booking times - play when you want" },
                { icon: <Filter size={18} />, text: "Filter venues by games, amenities & more" }
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <div className="text-gaming-blue mr-3 mt-0.5">{item.icon}</div>
                  <span className="text-gray-300">{item.text}</span>
                </li>
              ))}
            </ul>
            
            <Button className="bg-gaming-blue hover:bg-gaming-blue/80 text-white" asChild>
              <Link to="/venues/search">
                Explore Casual Gaming
              </Link>
            </Button>
          </div>

          {/* Esports Mode */}
          <div className="bg-gradient-to-br from-gaming-dark to-gaming-dark/60 border border-gaming-gray/20 rounded-xl p-6 md:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gaming-purple/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-gaming-purple/20 transition-all duration-700"></div>
            
            <div className="bg-gaming-purple/20 p-3 rounded-lg w-fit mb-6">
              <Trophy size={24} className="text-gaming-purple" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3">Esports Mode</h3>
            <p className="text-gray-300 mb-6">
              Designed for competitive gamers looking to join tournaments, improve skills, and win prizes.
            </p>
            
            <ul className="space-y-3 mb-8">
              {[
                { icon: <Trophy size={18} />, text: "Join verified, premium tournaments" },
                { icon: <Swords size={18} />, text: "Automated matchmaking & tournament brackets" },
                { icon: <Medal size={18} />, text: "Compete for prize pools & recognition" },
                { icon: <BarChart size={18} />, text: "Track your performance & statistics" }
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <div className="text-gaming-purple mr-3 mt-0.5">{item.icon}</div>
                  <span className="text-gray-300">{item.text}</span>
                </li>
              ))}
            </ul>
            
            <Button className="bg-gaming-purple hover:bg-gaming-purple/80 text-white" asChild>
              <Link to="/tournaments/upcoming">
                Explore Esports
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapPin = ({ size = 24, className = "" }) => (
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
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const Clock = ({ size = 24, className = "" }) => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const Filter = ({ size = 24, className = "" }) => (
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
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const Medal = ({ size = 24, className = "" }) => (
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
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
    <path d="M11 12 5.12 2H2a2 2 0 0 0-2 2v18h20V4a2 2 0 0 0-2-2h-3.12L13 12" />
  </svg>
);

const BarChart = ({ size = 24, className = "" }) => (
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
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

export default UseModes;
