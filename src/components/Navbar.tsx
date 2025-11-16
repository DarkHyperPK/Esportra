import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <nav 
      data-mounted
      className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 shadow-lg"
    >
      <div className="container mx-auto flex justify-between items-center py-3 px-4 relative">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 select-none">
            <img src="/logo.svg" alt="Esportra Logo" className="h-8 w-8" />
            <span className="text-lg font-semibold text-white">
              Esportra
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <DesktopNav handleSignOut={handleSignOut} />

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-100 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        handleSignOut={handleSignOut}
      />
    </nav>
  );
};

export default Navbar;