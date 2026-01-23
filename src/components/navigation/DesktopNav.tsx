import { Link } from "react-router-dom";
import { MapPin, Trophy, Info, Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNotifications } from "@/components/NotificationContext";
import UserMenu from "./UserMenu";

const DesktopNav = ({
  handleSignOut
}: {
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const { unreadCount } = useNotifications();
  const userRole = currentRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');

  const menuItemClass =
    "w-full rounded-2xl px-4 py-2 text-[0.75rem] font-semibold text-white/70 transition-all focus:text-white hover:text-white hover:bg-white/10 focus:bg-white/10";

  return (
    <div className="hidden lg:flex items-center gap-6 font-heading font-medium">
      <Link to="/" className="text-base font-semibold text-white transition-colors">
        Home
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 text-base font-semibold text-white transition-colors">
          <MapPin className="h-4 w-4" />
          Venues
        </DropdownMenuTrigger>
        <DropdownMenuContent className="z-[1000] border border-white/10 bg-[#0f111a]/95 p-2 text-white shadow-[0_15px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/venues/search" className="w-full">Find Venues</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/venues/featured" className="w-full">Featured Venues</Link>
          </DropdownMenuItem>
          {(userRole === 'venue_owner' || isSuperAdmin) && (
            <DropdownMenuItem asChild className={menuItemClass}>
              <Link to="/venues/list-venue" className="w-full">List Your Venue</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 text-base font-semibold text-white transition-colors">
          <Trophy className="h-4 w-4" />
          Tournaments
        </DropdownMenuTrigger>
        <DropdownMenuContent className="z-[1000] border border-white/10 bg-[#0f111a]/95 p-2 text-white shadow-[0_15px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/tournaments/upcoming" className="w-full">Upcoming Tournaments</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/tournaments/ongoing" className="w-full">Live Tournaments</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/tournament-history" className="w-full">Tournament History</Link>
          </DropdownMenuItem>
          {(userRole === 'organizer' || isSuperAdmin) && (
            <>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/organizer/tournaments" className="w-full">Manage Tournaments</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClass}>
                <Link to="/tournaments/create" className="w-full">Create Tournament</Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 text-base font-semibold text-white transition-colors">
          <Info className="h-4 w-4" />
          About
        </DropdownMenuTrigger>
        <DropdownMenuContent className="z-[1000] border border-white/10 bg-[#0f111a]/95 p-2 text-white shadow-[0_15px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/about/company" className="w-full">About Us</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/about/contact" className="w-full">Contact</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/about/faq" className="w-full">FAQ</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 text-base font-semibold text-white transition-colors">
          <Smartphone className="h-4 w-4" />
          App
        </DropdownMenuTrigger>
        <DropdownMenuContent className="z-[1000] border border-white/10 bg-[#0f111a]/95 p-2 text-white shadow-[0_15px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <DropdownMenuItem asChild className={menuItemClass}>
            <Link to="/app" className="w-full">Download Mobile App</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {user ? (
        <>
          {/* Notification Bell */}
          <Link
            to="/notifications"
            className="relative rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <UserMenu handleSignOut={handleSignOut} />
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/30 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/auth/signin">Log In</Link>
          </Button>
          <Button
            className="bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white shadow-[0_15px_40px_rgba(244,63,94,0.35)] hover:from-[#fb7185] hover:to-[#f43f5e]"
            asChild
          >
            <Link to="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      )}

    </div>
  );
};

export default DesktopNav;
