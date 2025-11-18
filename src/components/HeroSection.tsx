import { Button } from "@/components/ui/button";
import { Gamepad2, Calendar, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const HeroSection = () => {
  const { user } = useAuth();
  
  return (
    <div className="relative flex items-center pt-0 mt-0 overflow-hidden" style={{ minHeight: '100vh', backgroundColor: '#0f1115' }}>
      {/* Background with overlay gradient */}
      {/* Background with gradient overlay instead of broken image */}
      <div 
        className="absolute inset-0 w-full h-full z-0"
        style={{ 
          backgroundImage: "url('https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/website-assets/website-main.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Darker overlay for stronger text contrast - increased opacity for better text visibility */}
      <div className="absolute inset-0 z-10 bg-black/65" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(67,56,202,0.22),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.15),transparent_50%)]"></div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0f1115] to-transparent z-10"></div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 py-20">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              Esportra: 
              <br />
              <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-esports-accent via-gaming-purple to-esports-blue">
                Tournaments, Teams, Victory.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed">
              Create and manage tournaments across games, register your team, and climb the bracket. Built for speed and clarity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              {!user && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-gaming-purple to-purple-600 hover:from-gaming-purple/90 hover:to-purple-600/90 text-white px-8 py-5 text-base font-semibold shadow-xl shadow-gaming-purple/30 border-2 border-white/20 rounded-lg backdrop-blur-sm transition-all duration-300" 
                    asChild
                  >
                    <Link to="/auth/signup" className="flex items-center gap-2">
                      <span>Sign Up Now</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-gaming-blue/80 text-gaming-blue hover:bg-gaming-blue hover:text-white px-8 py-5 text-base font-semibold bg-black/30 backdrop-blur-md rounded-lg shadow-xl shadow-gaming-blue/20 transition-all duration-300 hover:border-gaming-blue" 
                  asChild
                >
                  <Link to="/about/company" className="flex items-center gap-2">
                      <span>Learn More</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {/* Find Venues */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative rounded-xl overflow-hidden border-2 border-gray-600/30 transition-all duration-300 hover:border-esports-blue hover:shadow-xl hover:shadow-esports-blue/20"
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1598550487031-0898b4852123?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}} />
              <div className="absolute inset-0 bg-gradient-to-br from-esports-dark/90 via-esports-dark/80 to-esports-dark/90" />
              <div className="relative z-10 p-5">
                <div className="bg-esports-blue/20 p-2.5 rounded-lg w-fit mb-3">
                  <Gamepad2 className="h-5 w-5 text-esports-blue" />
                </div>
                <h3 className="text-white font-bold mb-1.5">Find Venues</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Discover the perfect gaming venue near you</p>
              </div>
            </motion.div>
            {/* Join Tournaments */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative rounded-xl overflow-hidden border-2 border-gray-600/30 transition-all duration-300 hover:border-esports-orange hover:shadow-xl hover:shadow-esports-orange/20"
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80')"}} />
              <div className="absolute inset-0 bg-gradient-to-br from-esports-dark/90 via-esports-dark/80 to-esports-dark/90" />
              <div className="relative z-10 p-5">
                <div className="bg-esports-orange/20 p-2.5 rounded-lg w-fit mb-3">
                  <Calendar className="h-5 w-5 text-esports-orange" />
                </div>
                <h3 className="text-white font-bold mb-1.5">Join Tournaments</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Participate in verified, premium esports competitions</p>
              </div>
            </motion.div>
            {/* Win Prizes */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative rounded-xl overflow-hidden border-2 border-gray-600/30 transition-all duration-300 hover:border-esports-green hover:shadow-xl hover:shadow-esports-green/20"
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1514820720301-4c4790309f46?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}} />
              <div className="absolute inset-0 bg-gradient-to-br from-esports-dark/90 via-esports-dark/80 to-esports-dark/90" />
              <div className="relative z-10 p-5">
                <div className="bg-esports-green/20 p-2.5 rounded-lg w-fit mb-3">
                  <Trophy className="h-5 w-5 text-esports-green" />
                </div>
                <h3 className="text-white font-bold mb-1.5">Win Prizes</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Compete for glory and valuable prize pools</p>
              </div>
            </motion.div>
          </motion.div>
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
