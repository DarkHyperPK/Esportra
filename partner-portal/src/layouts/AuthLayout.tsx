import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LoginVerifyContext } from '@/contexts/LoginVerifyContext';
import { readInvitationToken } from '@/lib/partnerInvitation';

const RECOVERY_KEY = 'partner_password_recovery';

const AuthLayout = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user }, error }) => {
            if (error || !user) {
                if (user || error) supabase.auth.signOut();
                setSession(null);
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>
        );
    }

    // A restored session must claim a pending invitation before dashboard access.
    if (session && readInvitationToken() && !isVerifying) {
        return <Navigate to="/invite/accept" replace />;
    }

    // Don't redirect while Login is verifying sponsor account
    if (
        session
        && location.pathname !== '/set-password'
        && sessionStorage.getItem(RECOVERY_KEY) !== 'true'
        && !isVerifying
    ) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <LoginVerifyContext.Provider value={{ isVerifying, setIsVerifying }}>
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>
        </LoginVerifyContext.Provider>
    );
};

export default AuthLayout;
