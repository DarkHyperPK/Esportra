import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Handles the Faceit OAuth redirect in local dev and staging.
 *
 * In production, the edge function receives the redirect at
 * /functions/v1/faceit-oauth and relays the code+state to the frontend.
 *
 * In local dev, Faceit redirects the browser to
 * https://localhost:3000/functions/v1/faceit-oauth — this React route
 * catches that, does the same relay, and the profile page finishes the flow.
 */
const FaceitOAuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            navigate(`/player/profile?faceit_linked=error&reason=${encodeURIComponent(error)}`, { replace: true });
            return;
        }

        if (code && state) {
            navigate(`/player/profile?faceit_callback=true&code=${code}&state=${state}`, { replace: true });
        } else {
            navigate('/player/profile?faceit_linked=error&reason=missing_params', { replace: true });
        }
    }, [navigate]);

    return null;
};

export default FaceitOAuthCallback;
