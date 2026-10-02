import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { api } from '@/shared/lib/api';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  status: 'UNVERIFIED_PHONE' | 'PHONE_VERIFIED' | 'PENDING_STUDENT_VERIFICATION' | 'STUDENT_VERIFIED' | 'STUDENT_REJECTED' | 'SUSPENDED';
}

interface AuthContextType {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const profile = await api.get('/auth/me');
      setUserProfile(profile);
    } catch (e) {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        refreshProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        refreshProfile();
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await api.post('/auth/logout');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
