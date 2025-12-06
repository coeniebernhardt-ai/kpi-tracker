'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const [initialized, setInitialized] = useState(false);

  const refreshProfile = async (userId?: string) => {
    const prof = await getCurrentProfile(userId);
    setProfile(prof);
    return prof;
  };

  useEffect(() => {
    // Safety timeout - ensure loading never gets stuck
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log('AuthContext: Safety timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    // Get initial session once
    const initAuth = async () => {
      try {
        console.log('AuthContext: Initializing...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        console.log('AuthContext: Got session:', !!currentSession);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          console.log('AuthContext: Fetching profile for:', currentSession.user.id);
          const prof = await getCurrentProfile(currentSession.user.id);
          console.log('AuthContext: Got profile:', !!prof, prof?.is_admin);
          setProfile(prof);
        }
        
        setLoading(false);
        setInitialized(true);
        console.log('AuthContext: Initialization complete');
      } catch (err) {
        console.error('AuthContext: Init error:', err);
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('AuthContext: Auth event:', event);
      
      // Only process if already initialized (avoid race condition)
      if (!initialized && event === 'INITIAL_SESSION') {
        return; // Skip - initAuth handles this
      }
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        const prof = await getCurrentProfile(newSession.user.id);
        setProfile(prof);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [initialized, loading]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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

