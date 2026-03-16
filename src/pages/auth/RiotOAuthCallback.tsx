import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy Riot OAuth redirect handler.
 * With BFF pattern, Riot redirects to the backend directly.
 * This page exists only as a safety net — redirects to settings.
 */
const RiotOAuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/settings', { replace: true });
    }, [navigate]);

    return null;
};

export default RiotOAuthCallback;
