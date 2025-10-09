
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
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log("Auth state changed:", _event, newSession ? "session exists" : "no session");
      if (mounted) {
        setUser(newSession?.user || null);
        setSession(newSession);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error: sessionError }) => {
        console.log("Initial session check:", currentSession ? "session exists" : "no session");
        if (sessionError) {
          console.error("Error getting session:", sessionError.message);
          setError(sessionError);
        }
        
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Unexpected error in getSession:", err);
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
