import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";

/**
 * Global guard component that monitors the user's suspension status.
 * If a user is suspended, it prevents them from accessing any other part of the app.
 */
export const SuspensionGuard = ({ children }: { children: React.ReactNode }) => {
    const { profile, user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // If user is suspended and not already on the /suspended page, redirect them
        if (profile?.is_suspended) {
            console.log("[SuspensionGuard] User is suspended, path:", location.pathname);
            if (location.pathname !== '/suspended') {
                console.log("[SuspensionGuard] Redirecting to /suspended");
                navigate('/suspended', { replace: true });
            }
        }
    }, [profile?.is_suspended, location.pathname, navigate]);

    // Handle session check in background
    useEffect(() => {
        if (!user) return;

        const checkStatus = async () => {
            try {
                const data = await apiClient.get<{ is_suspended?: boolean }>('/api/profiles/me');
                if (data?.is_suspended && location.pathname !== '/suspended') {
                    navigate('/suspended', { replace: true });
                }
            } catch {
                // Silently ignore — profile check is best-effort
            }
        };

        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [user, navigate, location.pathname]);

    return <>{children}</>;
};
