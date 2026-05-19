import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, MapPin, Trophy, Medal, Info, Handshake, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import UserMenu from "./UserMenu";
import { cn } from "@/lib/utils";
import { getWebsiteAssetUrl } from "@/lib/storage";
import { JackButton } from "@/components/ui/JackButton";

import {
  FramerDropdownRoot,
  FramerDropdownTrigger,
  FramerDropdownContent,
  useFramerDropdown,
} from "@/components/ui/FramerDropdown";

// JACK IN-style menu item: white tile with rose-pink slide-up hover
const JackItem = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const { close } = useFramerDropdown();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        navigate(to);
        close();
      }}
      className="group relative block w-full overflow-hidden bg-white px-4 py-3 text-left font-mono text-[12px] font-bold uppercase tracking-wider text-black"
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
    </button>
  );
};

const JackDivider = () => <div className="h-px bg-black/10" />;

const DesktopNav = ({
  handleSignOut,
}: {
  handleSignOut: () => Promise<void>;
}) => {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const location = useLocation();
  const userRole = currentRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes("super_admin");
  const canManageVenues =
    userRole === "venue_owner" || isSuperAdmin || admin.hasPermission("venues:view");
  const canManageTournaments =
    userRole === "organizer" || isSuperAdmin || admin.hasPermission("tournaments:create");

  const isActive = (paths: string[]) =>
    paths.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  const linkClass = (active: boolean) =>
    cn(
      "relative inline-flex items-center gap-1.5 px-1 py-2 text-sm font-medium text-white/85 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-rose-500/70",
      active && "text-white"
    );

  const activeBar = (active: boolean) =>
    active ? (
      <span className="absolute bottom-0 left-0 h-[2px] w-full bg-rose-500" />
    ) : null;

  return (
    <div className="hidden w-full items-center justify-between lg:flex">
      {/* Left: Logo */}
      <Link to="/" className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70">
        <img
          src={getWebsiteAssetUrl("eSportra-Logo/eSPORTRA-white-transparent.png")}
          alt="Esportra"
          className="h-8 w-auto"
        />
      </Link>

      {/* Center: Navigation */}
      <div className="flex items-center gap-6">
        {/* Venues */}
        <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e" backgroundColor="#000000" borderColor="rgba(244,63,94,0.4)">
          <FramerDropdownTrigger asChild>
            <button type="button" className={linkClass(isActive(["/venues"]))}>
              <MapPin className="h-4 w-4" />
              Venues
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </button>
          </FramerDropdownTrigger>
          <FramerDropdownContent className="min-w-[220px] !rounded-none !border-rose-500/40 !bg-black !p-0 !backdrop-blur-0">
            <div className="space-y-px bg-black">
              <JackItem to="/venues/search">Find Venues</JackItem>
              <JackItem to="/venues/featured">Featured Venues</JackItem>
              {canManageVenues && (
                <>
                  <JackDivider />
                  <JackItem to="/venues/list-venue">List Your Venue</JackItem>
                  <JackItem to="/venues/dashboard">Venue Dashboard</JackItem>
                </>
              )}
            </div>
          </FramerDropdownContent>
        </FramerDropdownRoot>

        {/* Tournaments */}
        <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e" backgroundColor="#000000" borderColor="rgba(244,63,94,0.4)">
          <FramerDropdownTrigger asChild>
            <button
              type="button"
              className={linkClass(
                isActive([
                  "/tournaments",
                  "/organizer/tournaments",
                  "/organizer/seasons",
                  "/season",
                ])
              )}
            >
              <Trophy className="h-4 w-4" />
              Tournaments
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </button>
          </FramerDropdownTrigger>
          <FramerDropdownContent className="min-w-[240px] !rounded-none !border-rose-500/40 !bg-black !p-0 !backdrop-blur-0">
            <div className="space-y-px bg-black">
              <JackItem to="/tournaments">Browse Tournaments</JackItem>
              {canManageTournaments && (
                <>
                  <JackDivider />
                  <JackItem to="/organizer/tournaments">Manage Tournaments</JackItem>
                  <JackItem to="/tournaments/create">Create Tournament</JackItem>
                  <JackDivider />
                  <JackItem to="/organizer/seasons">Manage Seasons</JackItem>
                  <JackItem to="/tournaments/create?mode=season">Create Season</JackItem>
                </>
              )}
            </div>
          </FramerDropdownContent>
        </FramerDropdownRoot>

        {/* Leaderboards */}
        <Link to="/leaderboards" className={linkClass(isActive(["/leaderboards"]))}>
          <Medal className="h-4 w-4" />
          Leaderboards
          {activeBar(isActive(["/leaderboards"]))}
        </Link>

        {/* About */}
        <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e" backgroundColor="#000000" borderColor="rgba(244,63,94,0.4)">
          <FramerDropdownTrigger asChild>
            <button type="button" className={linkClass(isActive(["/about"]))}>
              <Info className="h-4 w-4" />
              About
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </button>
          </FramerDropdownTrigger>
          <FramerDropdownContent className="min-w-[200px] !rounded-none !border-rose-500/40 !bg-black !p-0 !backdrop-blur-0">
            <div className="space-y-px bg-black">
              <JackItem to="/about/company">About Us</JackItem>
              <JackItem to="/about/contact">Contact</JackItem>
              <JackItem to="/about/faq">FAQ</JackItem>
            </div>
          </FramerDropdownContent>
        </FramerDropdownRoot>

        {/* Partners */}
        <Link to="/partners" className={linkClass(isActive(["/partners"]))}>
          <Handshake className="h-4 w-4" />
          Partners
          {activeBar(isActive(["/partners"]))}
        </Link>

        {/* Admin */}
        {admin.isAdmin && (
          <Link to="/admin/dashboard" className={linkClass(isActive(["/admin"]))}>
            <Shield className="h-4 w-4" />
            Admin
            {activeBar(isActive(["/admin"]))}
          </Link>
        )}
      </div>

      {/* Right: Auth */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <NotificationDropdown />
            <UserMenu handleSignOut={handleSignOut} />
          </>
        ) : (
          <>
            <Link
              to="/auth/signin"
              className="px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <JackButton as={Link} to="/auth/signup" size="sm" className="px-5">
              Sign up
            </JackButton>
          </>
        )}
      </div>
    </div>
  );
};

export default DesktopNav;
