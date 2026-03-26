import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileImage, Settings, LogOut, BarChart, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { getWebsiteAssetUrl } from '@/lib/storage';

const DashboardLayout = () => {
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<{ id: string } | null>(null);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        // Use getUser() for initial verification as it hits the server to verify the session
        // getSession() only reads from localStorage and might be stale/invalid
        // Retry once on failure (token may not be restored from storage yet on cold refresh)
        const verifyUser = async (attempt = 1): Promise<void> => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) {
                if (attempt < 2) {
                    // Wait briefly for Supabase to restore session from storage
                    await new Promise(r => setTimeout(r, 500));
                    return verifyUser(attempt + 1);
                }
                if (user || error) supabase.auth.signOut();
                setSession(null);
                setIsLoading(false);
                return;
            }

            setSession(user);

            // Check onboarding status via .NET API
            try {
                const onboardingData = await apiClient.get<{ sponsorId: string; meta: { completed: boolean } }>('/api/sponsors/me/onboarding');
                if (!onboardingData?.meta?.completed) {
                    setNeedsOnboarding(true);
                }
            } catch {
                // No sponsor account linked
                await supabase.auth.signOut();
                window.location.href = '/login?error=no_sponsor_linked';
                return;
            }

            setIsLoading(false);
        };

        verifyUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session?.user ? { id: session.user.id } : null);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Redirect first-time sponsors to onboarding wizard
    if (needsOnboarding) {
        return <Navigate to="/onboarding" replace />;
    }

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { label: 'Analytics', icon: BarChart, path: '/analytics' },
        { label: 'Campaigns', icon: Trophy, path: '/campaigns' },
        { label: 'Campaign Kit', icon: FileImage, path: '/assets' },
        { label: 'Account', icon: Settings, path: '/account' },
    ];

    const isActive = (path: string) => location.pathname === path;

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-sans flex">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
                <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-rose-600/5 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            {/* Sidebar */}
            <aside className="w-72 border-r border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl p-8 hidden lg:flex flex-col relative z-20">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <img src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} alt="Esportra" className="w-8 h-8 object-contain" />
                        <h1 className="text-xl font-black font-heading tracking-tighter">
                            ESPORTRA<span className="text-rose-500">_PARTNER</span>
                        </h1>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase px-1">Ecosystem_Initialize</p>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${isActive(item.path)
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm font-bold tracking-tight">{item.label}</span>
                            {isActive(item.path) && (
                                <motion.div
                                    layoutId="nav-glow"
                                    className="ml-auto w-1 h-4 bg-rose-500 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                                />
                            )}
                        </Link>
                    ))}
                </nav>

                <button
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="flex items-center gap-4 px-4 py-3 rounded-xl text-zinc-600 hover:text-rose-500 hover:bg-rose-500/5 transition-all mt-auto group"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold tracking-tight">System_Logout</span>
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                <header className="h-20 border-b border-white/5 flex items-center justify-end px-12 bg-[#050505]/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-[10px] font-mono text-zinc-500 tracking-wider">SYSTEM_CLOCK</div>
                            <div className="text-sm font-bold text-white tabular-nums">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-12 overflow-auto custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
