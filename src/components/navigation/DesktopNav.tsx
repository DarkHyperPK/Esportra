import { Link } from "react-router-dom";
import { MapPin, Trophy, Info, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "./UserMenu";

const DesktopNav = ({ 
  handleSignOut 
}: { 
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const userRole = profile?.role || 'casual';

  return (
    <div className="hidden md:flex items-center space-x-6 font-roboto">
      <Link to="/" className="text-gray-100 hover:text-white transition-colors">
        Home
      </Link>
      
      <DropdownMenu>
        <DropdownMenuTrigger className="text-gray-100 hover:text-white transition-colors inline-flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Venues
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-esports-dark border border-gray-600/30 shadow-lg backdrop-blur-md">
          <DropdownMenuItem asChild>
            <Link to="/venues/search" className="w-full">Find Venues</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/venues/featured" className="w-full">Featured Venues</Link>
          </DropdownMenuItem>
          {userRole === 'venue_owner' && (
            <DropdownMenuItem asChild>
              <Link to="/venues/list-venue" className="w-full">List Your Venue</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="text-gray-100 hover:text-white transition-colors inline-flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Tournaments
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-esports-dark border border-gray-600/30 shadow-lg backdrop-blur-md">
          <DropdownMenuItem asChild>
            <Link to="/tournaments/upcoming" className="w-full">Upcoming Tournaments</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/tournaments/ongoing" className="w-full">Live Tournaments</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/tournament-history" className="w-full">Tournament History</Link>
          </DropdownMenuItem>
          {userRole === 'organizer' && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/organizer/tournaments" className="w-full">Manage Tournaments</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/tournaments/create" className="w-full">Create Tournament</Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="text-gray-100 hover:text-white transition-colors inline-flex items-center gap-2">
          <Info className="h-4 w-4" />
          About
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-esports-dark border border-gray-600/30 shadow-lg backdrop-blur-md">
          <DropdownMenuItem asChild>
            <Link to="/about/company" className="w-full">About Us</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/about/contact" className="w-full">Contact</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/about/faq" className="w-full">FAQ</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="text-gray-100 hover:text-white transition-colors inline-flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          App
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-esports-dark border border-gray-600/30 shadow-lg backdrop-blur-md">
          <DropdownMenuItem asChild>
            <Link to="/app" className="w-full">Download Mobile App</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {user ? (
        <UserMenu handleSignOut={handleSignOut} />
      ) : (
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            className="border-gaming-purple text-gaming-purple hover:bg-gaming-purple hover:text-white" 
            asChild
          >
            <Link to="/auth/signin">Log In</Link>
          </Button>
          <Button 
            className="bg-gaming-purple hover:bg-gaming-purple/80 text-white" 
            asChild
          >
            <Link to="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      )}

      {userRole === 'venue_owner' && (
        <Button 
          variant="outline"
          className="border-gaming-purple text-gaming-purple hover:bg-gaming-purple hover:text-white"
          asChild
        >
          <Link to="/venue-owner/venues">Manage Venues</Link>
        </Button>
      )}
    </div>
  );
};

export default DesktopNav;
