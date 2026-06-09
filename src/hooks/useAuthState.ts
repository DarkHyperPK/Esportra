
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        // Block recovery sessions from being treated as normal auth
        if (sessionStorage.getItem('password_recovery_pending') === 'true') {
          setUser(null);
          setSession(null);
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

        // Only set loading to false if we have a definitive session 
        // OR if the getSession call below has already finished.
        if (newSession?.user) {
          setLoading(false);
        }
      }
    });

    // Initial session check should be the definitive source for ending 'loading'
    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error: sessionError }) => {
        if (sessionError && mounted) {
          setError(sessionError);
        }

        if (mounted) {
          // Block recovery sessions from being treated as normal auth
          if (sessionStorage.getItem('password_recovery_pending') === 'true') {
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
