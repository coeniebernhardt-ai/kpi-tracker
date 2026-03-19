'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase, Profile, getCurrentProfile } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const prof = await getCurrentProfile(userId);
      setProfile(prof);
      return prof;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'AuthContext.tsx:initialize',
          message: 'initialize start',
          data: {},
          timestamp: Date.now(),
          hypothesisId: 'H4',
        }),
      }).catch(() => {});
      // #endregion
      try {
        // Get the current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'AuthContext.tsx:afterGetSession',
            message: 'getSession resolved',
            data: { hasSession: !!currentSession, hasUser: !!currentSession?.user },
            timestamp: Date.now(),
            hypothesisId: 'H4',
          }),
        }).catch(() => {});
        // #endregion

        if (!isMounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Do not block auth forever if profiles query hangs (RLS/network)
          const profileTimeoutMs = 8000;
          await Promise.race([
            fetchProfile(currentSession.user.id),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), profileTimeoutMs)),
          ]);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'AuthContext.tsx:afterFetchProfileRace',
              message: 'profile fetch race finished',
              data: {},
              timestamp: Date.now(),
              hypothesisId: 'H4',
            }),
          }).catch(() => {});
          // #endregion
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'AuthContext.tsx:initializeCatch',
            message: 'initialize error',
            data: { err: error instanceof Error ? error.message : String(error) },
            timestamp: Date.now(),
            hypothesisId: 'H4',
          }),
        }).catch(() => {});
        // #endregion
      } finally {
        if (isMounted) {
          setLoading(false);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'AuthContext.tsx:initializeFinally',
              message: 'initialize finally setLoading false',
              data: {},
              timestamp: Date.now(),
              hypothesisId: 'H1',
            }),
          }).catch(() => {});
          // #endregion
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        console.log('Auth state change:', event);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'AuthContext.tsx:onAuthStateChange',
            message: String(event),
            data: { hasUser: !!newSession?.user },
            timestamp: Date.now(),
            hypothesisId: 'H5',
          }),
        }).catch(() => {});
        // #endregion

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid race conditions with Supabase
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(newSession.user.id);
            }
          }, 100);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Then initialize
    initialize();

    // Safety timeout: use functional update so we don’t depend on stale `loading` closure
    const timeout = setTimeout(() => {
      if (!isMounted) return;
      console.log('Auth timeout - forcing load complete');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'AuthContext.tsx:authTimeout',
          message: 'forcing setLoading false',
          data: {},
          timestamp: Date.now(),
          hypothesisId: 'H1',
        }),
      }).catch(() => {});
      // #endregion
      setLoading(false);
    }, 10000);

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9f9d758f-7a49-4eb9-9ee6-1128596866c4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'AuthContext.tsx:effectCleanup',
          message: 'auth effect cleanup',
          data: {},
          timestamp: Date.now(),
          hypothesisId: 'H5',
        }),
      }).catch(() => {});
      // #endregion
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only; `loading` must NOT be a dep (re-subscribe loop + cleared timeout)
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      // Immediately update user state if we have session data
      setUser(data.user);
      setSession(data.session);
      // Fetch profile will happen via the auth state listener
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const avatar = fullName
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          avatar: avatar
        }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin: profile?.is_admin ?? false,
    signIn,
    signUp,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

