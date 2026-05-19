import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, MapPin, Trophy, Medal, Info, Handshake, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import UserMenu from "./UserMenu";
import { getWebsiteAssetUrl } from "@/lib/storage";

import {
  FramerDropdownRoot,
  FramerDropdownTrigger,
  FramerDropdownContent,
} from "@/components/ui/FramerDropdown";

/* ── JackIn button style ── */
const JackIn = ({
  children,
  className = "",
  onClick,
  as: Tag = "button",
  to,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "button" | "a";
  to?: string;
}) => {
  const navigate = useNavigate();
  const props =
    Tag === "a"
      ? { href: to, onClick: (e: React.MouseEvent) => { e.preventDefault(); if (to) navigate(to); if (onClick) onClick(); } }
      : { onClick };

  return (
    <Tag
      {...(props as any)}
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden bg-white px-5 py-2.5 text-sm font-semibold text-black outline-none transition-colors focus-visible:ring-2 focus-visible:ring-rose-500/70 ${className}`}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
    </Tag>
  );
};

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
    `group relative inline-flex items-center gap-2 overflow-hidden bg-white px-5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-rose-500/70 ${
      active ? "text-white" : "text-black hover:text-white"
    }`;

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
      <div className="flex items-center gap-3">
        {/* Venues */}
        <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e">
          <FramerDropdownTrigger asChild>
            <button
              type="button"
              className={linkClass(isActive(["/venues"]))}
            >
              <span className="relative z-10 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Venues
                <ChevronDown className="h-4 w-4 opacity-60" />
              </span>
              <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
            </button>
          </FramerDropdownTrigger>
          <FramerDropdownContent className="min-w-[200px] border border-white/10 bg-[#0d0d10]">
            <div className="p-1.5 space-y-0.5">
              <JackIn as="a" to="/venues/search">Find Venues</JackIn>
              <JackIn as="a" to="/venues/featured">Featured Venues</JackIn>
              {canManageVenues && (
                <>
                  <div className="my-1 h-px bg-white/10" />
                  <JackIn as="a" to="/venues/list-venue">List Your Venue</JackIn>
                  <JackIn as="a" to="/venues/dashboard">Venue Dashboard</JackIn>
                </>
              )}
            </div>
          </FramerDropdownContent>
        </FramerDropdownRoot>

        {/* Tournaments */}
        <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e">
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
              <span className="relative z-10 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Tournaments
                <ChevronDown className="h-4 w-4 opacity-60" />
              </span>
              <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
            </button>
          </FramerDropdownTrigger>
          <FramerDropdownContent className="min-w-[220px] border border-white/10 bg-[#0d0d10]">
            <div className="p-1.5 space-y-0.5">
              <JackIn as="a" to="/tournaments">Browse Tournaments</JackIn>
              {canManageTournaments && (
                <>
                  <div className="my-1 h-px bg-white/10" />
                  <JackIn as="a" to="/organizer/tournaments">Manage Tournaments</JackIn>
                  <JackIn as="a" to="/tournaments/create">Create Tournament</JackIn>
                  <div className="my-1 h-px bg-white/10" />
                  <JackIn as="a" to="/organizer/seasons">Manage Seasons</JackIn>
                  <JackIn as="a" to="/tournaments/create?mode=season">Create Season</JackIn>
                </>
              )}
            </div>
          </FramerDropdownContent>
        </FramerDropdownRoot>

        {/* Leaderboards */}
        <Link
          to="/leaderboards"
          className={linkClass(isActive(["/leaderboards"]))}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Medal className="h-4 w-4" />
            Leaderboards
          </span>
          <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
        </Link>

        {/* About */}
        <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e">
          <FramerDropdownTrigger asChild>
            <button
              type="button"
              className={linkClass(isActive(["/about"]))}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Info className="h-4 w-4" />
                About
                <ChevronDown className="h-4 w-4 opacity-60" />
              </span>
              <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
            </button>
          </FramerDropdownTrigger>
          <FramerDropdownContent className="min-w-[180px] border border-white/10 bg-[#0d0d10]">
            <div className="p-1.5 space-y-0.5">
              <JackIn as="a" to="/about/company">About Us</JackIn>
              <JackIn as="a" to="/about/contact">Contact</JackIn>
              <JackIn as="a" to="/about/faq">FAQ</JackIn>
            </div>
          </FramerDropdownContent>
        </FramerDropdownRoot>

        {/* Partners */}
        <Link
          to="/partners"
          className={linkClass(isActive(["/partners"]))}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Partners
          </span>
          <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
        </Link>

        {/* Admin */}
        {admin.isAdmin && (
          <Link
            to="/admin/dashboard"
            className={linkClass(isActive(["/admin"]))}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </span>
            <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
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
              className="text-sm font-medium text-white transition-colors hover:text-rose-400"
            >
              Log in
            </Link>
            <Link
              to="/auth/signup"
              className="group relative inline-flex items-center justify-center overflow-hidden bg-white px-5 py-2.5 text-sm font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70"
            >
              <span className="relative z-10">Sign up</span>
              <div className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default DesktopNav;
