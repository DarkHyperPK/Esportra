import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Handles the Riot OAuth redirect.
 *
 * Riot Games redirects the browser here after the user authorizes.
 * We relay the code + state to Settings where the token exchange
 * with the .NET backend happens.
 *
 * Register https://esportra.com/auth/riot/callback in the Riot developer dashboard.
 */
const RiotOAuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code  = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            navigate(`/settings?riot_linked=error&reason=${encodeURIComponent(error)}`, { replace: true });
            return;
        }

        if (code && state) {
            navigate(`/settings?riot_callback=true&code=${code}&state=${state}`, { replace: true });
        } else {
            navigate('/settings?riot_linked=error&reason=missing_params', { replace: true });
        }
    }, [navigate]);

    return null;
};

export default RiotOAuthCallback;
