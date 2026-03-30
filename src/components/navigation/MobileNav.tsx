import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNotifications } from "@/components/NotificationContext";
import { UserRole } from "@/types/auth";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useState } from "react";

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
  const userRole = currentRole as UserRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const linkClass = "block rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white";
  const subLinkClass = "block rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/50 transition-all duration-200 hover:bg-white/5 hover:text-white/80";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, gridTemplateRows: '0fr' }}
          animate={{ opacity: 1, gridTemplateRows: '1fr' }}
          exit={{ opacity: 0, gridTemplateRows: '0fr' }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: 'grid', overflow: 'hidden' }}
          className="lg:hidden fixed top-[88px] left-0 right-0 mx-4 z-[998] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_25px_45px_rgba(0,0,0,0.65)]"
        >
        <div style={{ minHeight: 0, overflow: 'hidden' }} className="max-h-[80vh] overflow-y-auto">
          {/* Background Effects */}
          <MotionTiles />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 opacity-20 pointer-events-none mix-blend-overlay" />

          <div className="space-y-1 px-3 pt-4 pb-4 relative z-10">
            {/* General Navigation */}
            <motion.div
              className="mb-3 space-y-1"
              initial="closed"
              animate="open"
              variants={{
                open: {
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              {/* Venues with sub-menu */}
              <motion.div
                variants={{
                  closed: { x: -20, opacity: 0 },
                  open: { x: 0, opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => toggleMenu('venues')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Venues
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === 'venues' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedMenu === 'venues' && (
                    <motion.div
                      initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                      animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                      exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'grid', overflow: 'hidden' }}
                      className="ml-3 mt-1 border-l border-white/10 pl-2"
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-0.5">
                      <Link to="/venues/search" className={subLinkClass} onClick={onClose}>Find Venues</Link>
                      <Link to="/venues/featured" className={subLinkClass} onClick={onClose}>Featured Venues</Link>
                      {(userRole === 'venue_owner' || isSuperAdmin) && (
                        <>
                          <Link to="/venues/list-venue" className={subLinkClass} onClick={onClose}>List Your Venue</Link>
                          <Link to="/venues/manage" className={subLinkClass} onClick={onClose}>Manage Venues</Link>
                        </>
                      )}
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Tournaments with sub-menu */}
              <motion.div
                variants={{
                  closed: { x: -20, opacity: 0 },
                  open: { x: 0, opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => toggleMenu('tournaments')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Tournaments
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === 'tournaments' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedMenu === 'tournaments' && (
                    <motion.div
                      initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                      animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                      exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'grid', overflow: 'hidden' }}
                      className="ml-3 mt-1 border-l border-white/10 pl-2"
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-0.5">
                      <Link to="/tournaments" className={subLinkClass} onClick={onClose}>Browse Tournaments</Link>
                      {(userRole === 'organizer' || isSuperAdmin) && (
                        <>
                          <div className="h-px bg-white/10 my-1 mx-2" />
                          <Link to="/organizer/tournaments" className={subLinkClass} onClick={onClose}>Manage Tournaments</Link>
                          <Link to="/tournaments/create" className={subLinkClass} onClick={onClose}>Create Tournament</Link>
                        </>
                      )}
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Leaderboards - flat link */}
              <motion.div
                variants={{
                  closed: { x: -20, opacity: 0 },
                  open: { x: 0, opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                <Link to="/leaderboards" className={linkClass} onClick={onClose}>
                  Leaderboards
                </Link>
              </motion.div>

              {/* About with sub-menu */}
              <motion.div
                variants={{
                  closed: { x: -20, opacity: 0 },
                  open: { x: 0, opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => toggleMenu('about')}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  About
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === 'about' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedMenu === 'about' && (
                    <motion.div
                      initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                      animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                      exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'grid', overflow: 'hidden' }}
                      className="ml-3 mt-1 border-l border-white/10 pl-2"
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-0.5">
                      <Link to="/about/company" className={subLinkClass} onClick={onClose}>About Us</Link>
                      <Link to="/about/contact" className={subLinkClass} onClick={onClose}>Contact</Link>
                      <Link to="/about/faq" className={subLinkClass} onClick={onClose}>FAQ</Link>
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Partners - flat link */}
              <motion.div
                variants={{
                  closed: { x: -20, opacity: 0 },
                  open: { x: 0, opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                <Link to="/partners" className={linkClass} onClick={onClose}>
                  Partners
                </Link>
              </motion.div>
            </motion.div>

            {user && (
              <>
                <div className="my-3 border-t border-white/10"></div>

                {/* Role & Identity Switchers */}
                {userRole !== 'admin' && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <RoleSwitcher />
                  </div>

                )}

                <div className="my-3 border-t border-white/10"></div>

                {/* User Navigation */}
                <div className="mb-3 space-y-1">
                  <Link to="/user/profile" className={linkClass} onClick={onClose}>
                    My Profile
                  </Link>
                  <Link to="/notifications" className={linkClass} onClick={onClose}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link to="/player/teams" className={linkClass} onClick={onClose}>
                    Create Your Team
                  </Link>

                </div>

                {/* Role-Specific Navigation */}
                {profile?.role === 'admin' && (
                  <div className="mb-3 space-y-1">
                    <Link to="/admin/dashboard" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      Admin Panel
                    </Link>
                  </div>
                )}
                {(userRole === 'venue_owner' && !isSuperAdmin) && (
                  <div className="mb-3 space-y-1">
                    <Link to="/venues/manage" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-300 transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/10" onClick={onClose}>
                      My Venues
                    </Link>
                    <Link to="/venues/list-venue" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      List New Venue
                    </Link>
                  </div>
                )}
                {(userRole === 'organizer' && !isSuperAdmin) && (
                  <div className="mb-3 space-y-1">
                    <Link to="/organizer/tournaments" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      Manage Tournaments
                    </Link>
                    <Link to="/tournaments/create" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      Create Tournament
                    </Link>
                  </div>
                )}

                <div className="my-3 border-t border-white/10"></div>

                {/* Sign Out */}
                <button
                  className="block w-full rounded-2xl border border-red-500/40 px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:bg-red-500/10"
                  onClick={() => { onClose(); handleSignOut(); }}
                >
                  Sign Out
                </button>
              </>
            )}

            {!user && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                <Link to="/auth/signin" className="block rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white" onClick={onClose}>
                  Sign In
                </Link>
                <Link to="/auth/signup" className="block rounded-2xl bg-gradient-to-r from-[#f43f5e] to-[#fb7185] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_20px_45px_rgba(244,63,94,0.35)] transition-all duration-200 hover:from-[#fb7185] hover:to-[#f43f5e]" onClick={onClose}>
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
