import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/");
}

/**
 * Global guard component that monitors the user's suspension status.
 * If a user is suspended, it prevents them from accessing any other part of the app.
 * Auth routes are exempt so suspended users can sign out and use another account.
 */
export const SuspensionGuard = ({ children }: { children: React.ReactNode }) => {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (profile?.is_suspended && !isAuthRoute(location.pathname)) {
            if (location.pathname !== "/suspended") {
                navigate("/suspended", { replace: true });
            }
        }
    }, [profile?.is_suspended, location.pathname, navigate]);

    useEffect(() => {
        if (!user || isAuthRoute(location.pathname)) return;

        const checkStatus = async () => {
            try {
                const data = await apiClient.get<{
                    is_suspended?: boolean;
                    suspension_reason?: string | null;
                    suspension_until?: string | null;
                    suspension_type?: string | null;
                }>("/api/profiles/me");
                if (data?.is_suspended && location.pathname !== "/suspended") {
                    navigate("/suspended", {
                        replace: true,
                        state: {
                            reason: data.suspension_reason,
                            type: data.suspension_type,
                            until: data.suspension_until,
                        },
                    });
                }
            } catch {
                // Silently ignore — profile check is best-effort
            }
        };

        void checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [user, navigate, location.pathname]);

    return <>{children}</>;
};
