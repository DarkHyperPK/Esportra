
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { hasRecoverySession } from '@/lib/authRecovery';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let authEventVersion = 0;
    setLoading(true);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        authEventVersion += 1;
        // Block recovery sessions from being treated as normal auth
        if (hasRecoverySession()) {
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }

        const nextUser = newSession?.user || null;
        // Token refresh emits a new session/user object with the same id.
        // Keep the previous user reference to avoid refetch cascades across the app.
        setUser((prev) => {
          if (prev?.id && nextUser?.id && prev.id === nextUser.id) return prev;
          return nextUser;
        });
        setSession(newSession);

        setLoading(false);
      }
    });

    // Initial session check should be the definitive source for ending 'loading'
    const initialAuthEventVersion = authEventVersion;
    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error: sessionError }) => {
        if (sessionError && mounted) {
          setError(sessionError);
        }

        if (mounted) {
          if (authEventVersion !== initialAuthEventVersion) return;
          // Block recovery sessions from being treated as normal auth
          if (hasRecoverySession()) {
            setSession(null);
            setUser(null);
          } else {
            setSession(currentSession);
            setUser(currentSession?.user || null);
          }
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, error, setLoading };
};
