import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, createContext, useContext } from 'react';

// Flag to prevent AuthLayout from redirecting during login verification
export const LoginVerifyContext = createContext<{
    isVerifying: boolean;
    setIsVerifying: (v: boolean) => void;
}>({ isVerifying: false, setIsVerifying: () => {} });

export const useLoginVerify = () => useContext(LoginVerifyContext);

const AuthLayout = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const location = useLocation();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user }, error }) => {
            if (error || !user) {
                if (user || error) supabase.auth.signOut();
                setSession(null);
            } else {
                setSession(user);
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

    // Don't redirect while Login is verifying sponsor account
    if (session && location.pathname !== '/set-password' && !isVerifying) {
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
