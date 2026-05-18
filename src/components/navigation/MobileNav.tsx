import { Link, useLocation } from "react-router-dom";
import { Bell, ChevronDown, Handshake, Info, LogOut, MapPin, Medal, Plus, Shield, Trophy, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNotifications } from "@/components/NotificationContext";
import { UserRole } from "@/types/auth";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";
import { MotionTiles } from "@/components/effects/MotionTiles";

const MobileNav = ({
  isOpen,
  onClose,
  handleSignOut
}: {
  isOpen: boolean;
  onClose: () => void;
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const userRole = currentRole as UserRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
  const canManageVenues = userRole === 'venue_owner' || isSuperAdmin || admin.hasPermission('venues:view');
  const canManageTournaments = userRole === 'organizer' || isSuperAdmin || admin.hasPermission('tournaments:create');

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const isActive = (paths: string[]) => paths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const linkClass = (active = false, tone: 'default' | 'danger' | 'info' = 'default') => cn(
    "flex min-h-12 w-full items-center justify-between border px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-rose-500/70",
    active
      ? "border-rose-500 bg-rose-500 text-white shadow-[0_12px_30px_rgba(244,63,94,0.18)]"
      : "border-white/10 bg-black/50 text-zinc-400 hover:border-white/30 hover:bg-white/[0.04] hover:text-white",
    tone === 'danger' && "border-red-500/30 text-red-300 hover:border-red-500/45 hover:bg-red-500/10",
    tone === 'info' && "border-cyan-500/25 text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-500/10"
  );
  const subLinkClass = (active = false) => cn(
    "block border-l px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-rose-500/70",
    active ? "border-rose-500 bg-rose-500/10 text-white" : "border-white/10 text-zinc-500 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
  );

  const accordionMotion = {
    initial: { opacity: 0, gridTemplateRows: '0fr' },
    animate: { opacity: 1, gridTemplateRows: '1fr' },
    exit: { opacity: 0, gridTemplateRows: '0fr' },
    transition: { duration: 0.2 },
    style: { display: 'grid', overflow: 'hidden' } as React.CSSProperties,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, gridTemplateRows: '0fr' }}
          animate={{ opacity: 1, gridTemplateRows: '1fr' }}
          exit={{ opacity: 0, gridTemplateRows: '0fr' }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: 'grid', overflow: 'hidden' }}
          className="fixed left-0 right-0 top-[92px] z-[998] mx-3 border border-white/10 bg-black/95 shadow-[0_28px_80px_rgba(0,0,0,0.72)] backdrop-blur-xl lg:hidden"
        >
        <div style={{ minHeight: 0, overflow: 'hidden' }} className="max-h-[80vh] overflow-y-auto">
          {/* Background Effects */}
          <MotionTiles />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent" />

          <div className="relative z-10 space-y-1 px-3 pb-4 pt-4">
            {/* General Navigation */}
            <div className="mb-3 space-y-2">
              {/* Venues with sub-menu */}
              <div>
                <button
                  type="button"
                  aria-expanded={expandedMenu === 'venues'}
                  onClick={() => toggleMenu('venues')}
                  className={linkClass(isActive(['/venues']))}
                >
                  <span className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-rose-300" />
                    Venues
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === 'venues' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedMenu === 'venues' && (
                    <motion.div {...accordionMotion} className="ml-5 mt-1 border-l border-white/10 pl-3">
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-1 py-1">
                      <Link to="/venues/search" className={subLinkClass(isActive(['/venues/search']))} onClick={onClose}>Find Venues</Link>
                      <Link to="/venues/featured" className={subLinkClass(isActive(['/venues/featured']))} onClick={onClose}>Featured Venues</Link>
                      {canManageVenues && (
                        <>
                          <Link to="/venues/list-venue" className={subLinkClass(isActive(['/venues/list-venue']))} onClick={onClose}>List Your Venue</Link>
                          <Link to="/venues/manage" className={subLinkClass(isActive(['/venues/manage']))} onClick={onClose}>Manage Venues</Link>
                        </>
                      )}
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tournaments with sub-menu */}
              <div>
                <button
                  type="button"
                  aria-expanded={expandedMenu === 'tournaments'}
                  onClick={() => toggleMenu('tournaments')}
                  className={linkClass(isActive(['/tournaments', '/organizer/tournaments', '/organizer/seasons', '/season']))}
                >
                  <span className="flex items-center gap-3">
                    <Trophy className="h-4 w-4 text-rose-300" />
                    Tournaments
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === 'tournaments' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedMenu === 'tournaments' && (
                    <motion.div {...accordionMotion} className="ml-5 mt-1 border-l border-white/10 pl-3">
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-1 py-1">
                      <Link to="/tournaments/upcoming" className={subLinkClass(isActive(['/tournaments/upcoming']))} onClick={onClose}>Upcoming Tournaments</Link>
                      <Link to="/tournaments/ongoing" className={subLinkClass(isActive(['/tournaments/ongoing']))} onClick={onClose}>Live Tournaments</Link>
                      <Link to="/tournament-history" className={subLinkClass(isActive(['/tournament-history']))} onClick={onClose}>Tournament History</Link>
                      {canManageTournaments && (
                        <>
                          <div className="h-px bg-white/10 my-1 mx-2" />
                          <Link to="/organizer/tournaments" className={subLinkClass(isActive(['/organizer/tournaments']))} onClick={onClose}>Manage Tournaments</Link>
                          <Link to="/tournaments/create" className={subLinkClass(isActive(['/tournaments/create']))} onClick={onClose}>Create Tournament</Link>
                          <div className="h-px bg-white/10 my-1 mx-2" />
                          <Link to="/organizer/seasons" className={subLinkClass(isActive(['/organizer/seasons']))} onClick={onClose}>Manage Seasons</Link>
                          <Link to="/tournaments/create?mode=season" className={subLinkClass(location.pathname === '/tournaments/create' && location.search.includes('mode=season'))} onClick={onClose}>Create Season</Link>
                        </>
                      )}
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Leaderboards - flat link */}
              <div>
                <Link to="/leaderboards" className={linkClass(isActive(['/leaderboards']))} onClick={onClose}>
                  <span className="flex items-center gap-3">
                    <Medal className="h-4 w-4 text-rose-300" />
                    Leaderboards
                  </span>
                </Link>
              </div>

              {/* About with sub-menu */}
              <div>
                <button
                  type="button"
                  aria-expanded={expandedMenu === 'about'}
                  onClick={() => toggleMenu('about')}
                  className={linkClass(isActive(['/about']))}
                >
                  <span className="flex items-center gap-3">
                    <Info className="h-4 w-4 text-rose-300" />
                    About
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === 'about' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedMenu === 'about' && (
                    <motion.div {...accordionMotion} className="ml-5 mt-1 border-l border-white/10 pl-3">
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-1 py-1">
                      <Link to="/about/company" className={subLinkClass(isActive(['/about/company']))} onClick={onClose}>About Us</Link>
                      <Link to="/about/contact" className={subLinkClass(isActive(['/about/contact']))} onClick={onClose}>Contact</Link>
                      <Link to="/about/faq" className={subLinkClass(isActive(['/about/faq']))} onClick={onClose}>FAQ</Link>
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Partners - flat link */}
              <div>
                <Link to="/partners" className={linkClass(isActive(['/partners']))} onClick={onClose}>
                  <span className="flex items-center gap-3">
                    <Handshake className="h-4 w-4 text-rose-300" />
                    Partners
                  </span>
                </Link>
              </div>
            </div>

            {user && (
              <>
                <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {/* Role & Identity Switchers */}
                {userRole !== 'admin' && (
                  <div className="border border-white/10 bg-white/[0.03] px-3 py-2">
                    <RoleSwitcher />
                  </div>

                )}

                <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {/* User Navigation */}
                <div className="mb-3 space-y-2">
                  <Link to="/user/profile" className={linkClass(isActive(['/user/profile']))} onClick={onClose}>
                    <span className="flex items-center gap-3">
                      <User className="h-4 w-4 text-rose-300" />
                      My Profile
                    </span>
                  </Link>
                  <Link to="/notifications" className={linkClass(isActive(['/notifications']))} onClick={onClose}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-rose-300" />
                        Notifications
                      </div>
                      {unreadCount > 0 && (
                        <span className="min-w-[20px] rounded-full bg-rose-500 px-2 py-0.5 text-center text-xs font-bold text-white shadow-[0_0_18px_rgba(244,63,94,0.55)]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link to="/player/teams" className={linkClass(isActive(['/player/teams']))} onClick={onClose}>
                    <span className="flex items-center gap-3">
                      <Plus className="h-4 w-4 text-rose-300" />
                      Create Your Team
                    </span>
                  </Link>

                </div>

                {/* Role-Specific Navigation */}
                {profile?.role === 'admin' && (
                  <div className="mb-3 space-y-2">
                    <Link to="/admin/dashboard" className={linkClass(isActive(['/admin']), 'danger')} onClick={onClose}>
                      <span className="flex items-center gap-3">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </span>
                    </Link>
                  </div>
                )}
                {(userRole === 'venue_owner' && !isSuperAdmin) && (
                  <div className="mb-3 space-y-2">
                    <Link to="/venues/manage" className={linkClass(isActive(['/venues/manage']), 'info')} onClick={onClose}>
                      <span className="flex items-center gap-3">
                        <MapPin className="h-4 w-4" />
                        My Venues
                      </span>
                    </Link>
                    <Link to="/venues/list-venue" className={linkClass(isActive(['/venues/list-venue']), 'danger')} onClick={onClose}>
                      <span className="flex items-center gap-3">
                        <Plus className="h-4 w-4" />
                        List New Venue
                      </span>
                    </Link>
                  </div>
                )}
                {(userRole === 'organizer' && !isSuperAdmin) && (
                  <div className="mb-3 space-y-2">
                    <Link to="/organizer/tournaments" className={linkClass(isActive(['/organizer/tournaments']), 'danger')} onClick={onClose}>
                      <span className="flex items-center gap-3">
                        <Trophy className="h-4 w-4" />
                        Manage Tournaments
                      </span>
                    </Link>
                    <Link to="/tournaments/create" className={linkClass(isActive(['/tournaments/create']), 'danger')} onClick={onClose}>
                      <span className="flex items-center gap-3">
                        <Plus className="h-4 w-4" />
                        Create Tournament
                      </span>
                    </Link>
                  </div>
                )}

                <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {/* Sign Out */}
                <button
                  className={linkClass(false, 'danger')}
                  onClick={() => { onClose(); handleSignOut(); }}
                >
                  <span className="flex items-center gap-3">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </span>
                </button>
              </>
            )}

            {!user && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                <Link to="/auth/signin" className="block border border-white/10 bg-black px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white" onClick={onClose}>
                  Sign In
                </Link>
                <Link to="/auth/signup" className="block bg-white px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-black shadow-[0_20px_45px_rgba(255,255,255,0.12)] transition-colors duration-200 hover:bg-rose-500 hover:text-white hover:shadow-[0_20px_45px_rgba(244,63,94,0.35)]" onClick={onClose}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
        </motion.div>
      )
      }
    </AnimatePresence >
  );
};

export default MobileNav;
