import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const AuthLayout = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
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

    // Don't redirect away from /set-password — the user needs a session to update their password
    if (session && location.pathname !== '/set-password') {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Outlet />
            </div>
        </div>
    );
};

export default AuthLayout;
