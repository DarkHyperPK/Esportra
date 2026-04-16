import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Steam OpenID callback relay.
 * Steam redirects here (frontend domain) with openid.* query params.
 * We forward all params to the backend verification endpoint,
 * which verifies, links the account, and returns the result.
 */
export default function SteamCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = window.location.search;
    const apiBase = import.meta.env.VITE_API_URL;

    if (!apiBase) {
      navigate('/account/settings?steam=error&reason=missing_config', { replace: true });
      return;
    }

    // Redirect to backend callback with all OpenID params intact
    window.location.href = `${apiBase}/api/accounts/steam/callback${params}`;
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Linking your Steam account...</p>
      </div>
    </div>
  );
}
