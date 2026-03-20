import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";
import { MapPin, Trophy, Medal, Info, Menu, X, Bell, ChevronDown } from "lucide-react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import UserMenu from "@/components/navigation/UserMenu";
import { useNotifications } from "@/components/NotificationContext";
import RoleSwitcher from "@/components/RoleSwitcher";
import { UserRole } from "@/types/auth";

const NavbarV2 = () => {
    const { user, profile, signOut } = useAuth();
    const { currentRole } = useRole();
    const admin = useAdmin();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
    const userRole = currentRole;

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/auth/signin');
        } catch {
            toast({ title: "Error signing out", description: "Please try again", variant: "destructive" });
        }
    };

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-[999]"
        >
            <div className={`transition-all duration-500 ${isScrolled
                    ? "bg-[#050505]/90 backdrop-blur-xl border-b border-white/5"
                    : "bg-transparent"
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0">
                            <img
                                src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                                alt="Esportra"
                                className="h-8 md:h-9 w-auto"
                            />
                        </Link>

                        {/* Desktop Nav Links */}
                        <div className="hidden lg:flex items-center gap-1">
                            <NavLink to="/venues/search">Venues</NavLink>
                            <NavLink to="/tournaments/upcoming">Tournaments</NavLink>
                            <NavLink to="/leaderboards">Leaderboards</NavLink>
                            <NavLink to="/about/company">About</NavLink>
                            <NavLink to="/partners">Partners</NavLink>
                        </div>

                        {/* Desktop Auth / User */}
                        <div className="hidden lg:flex items-center gap-3">
                            {user ? (
                                <>
                                    <NotificationDropdown />
                                    <UserMenu handleSignOut={handleSignOut} />
                                </>
                            ) : (
                                <>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        className="text-white/70 hover:text-white hover:bg-white/5 font-medium text-sm"
                                    >
                                        <Link to="/auth/signin">Log In</Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm px-6 rounded-lg transition-all duration-300 shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                                    >
                                        <Link to="/auth/signup">Sign Up</Link>
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? (
                                <X className="w-5 h-5 text-white" />
                            ) : (
                                <Menu className="w-5 h-5 text-white" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                        animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                        exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        style={{ display: 'grid', overflow: 'hidden' }}
                        className="lg:hidden bg-[#050505]/95 backdrop-blur-xl border-b border-white/5"
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }}>
                        <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
                            <MobileLink to="/venues/search" onClick={() => setMobileOpen(false)}>Venues</MobileLink>
                            <MobileLink to="/tournaments/upcoming" onClick={() => setMobileOpen(false)}>Tournaments</MobileLink>
                            <MobileLink to="/leaderboards" onClick={() => setMobileOpen(false)}>Leaderboards</MobileLink>
                            <MobileLink to="/about/company" onClick={() => setMobileOpen(false)}>About</MobileLink>
                            <MobileLink to="/partners" onClick={() => setMobileOpen(false)}>Partners</MobileLink>

                            {user ? (
                                <>
                                    <div className="h-px bg-white/10 my-3" />

                                    {userRole !== 'admin' && (
                                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 mb-3">
                                            <RoleSwitcher />
                                        </div>
                                    )}

                                    <MobileLink to="/user/profile" onClick={() => setMobileOpen(false)}>My Profile</MobileLink>
                                    <MobileLink to="/notifications" onClick={() => setMobileOpen(false)}>Notifications</MobileLink>
                                    <MobileLink to="/player/teams" onClick={() => setMobileOpen(false)}>My Teams</MobileLink>

                                    {profile?.role === 'admin' && (
                                        <MobileLink to="/admin/dashboard" onClick={() => setMobileOpen(false)} accent>Admin Panel</MobileLink>
                                    )}
                                    {(userRole === 'venue_owner' || isSuperAdmin) && (
                                        <>
                                            <MobileLink to="/venues/manage" onClick={() => setMobileOpen(false)}>Manage Venues</MobileLink>
                                            <MobileLink to="/venues/list-venue" onClick={() => setMobileOpen(false)}>List Venue</MobileLink>
                                        </>
                                    )}
                                    {(userRole === 'organizer' || isSuperAdmin) && (
                                        <>
                                            <MobileLink to="/organizer/tournaments" onClick={() => setMobileOpen(false)}>Manage Tournaments</MobileLink>
                                            <MobileLink to="/tournaments/create" onClick={() => setMobileOpen(false)}>Create Tournament</MobileLink>
                                        </>
                                    )}

                                    <div className="h-px bg-white/10 my-3" />
                                    <button
                                        onClick={() => { setMobileOpen(false); handleSignOut(); }}
                                        className="w-full text-left px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="h-px bg-white/10 my-3" />
                                    <div className="flex gap-3">
                                        <Button asChild variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/5">
                                            <Link to="/auth/signin" onClick={() => setMobileOpen(false)}>Log In</Link>
                                        </Button>
                                        <Button asChild className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold">
                                            <Link to="/auth/signup" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
        to={to}
        className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors duration-200 tracking-wide"
    >
        {children}
    </Link>
);

const MobileLink = ({ to, onClick, children, accent }: { to: string; onClick: () => void; children: React.ReactNode; accent?: boolean }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`block px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${accent
                ? "text-rose-400 hover:bg-rose-500/10"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
    >
        {children}
    </Link>
);

export default NavbarV2;
