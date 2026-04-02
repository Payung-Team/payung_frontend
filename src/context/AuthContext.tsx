import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session, SignUpWithPasswordCredentials, SignInWithPasswordCredentials, AuthError, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | Error | null;
  login: (credentials: SignInWithPasswordCredentials) => Promise<{ data: any; error: any }>;
  register: (credentials: SignUpWithPasswordCredentials) => Promise<{ data: any; error: any }>;
  logout: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | Error | null>(null);
  const initialized = useRef(false);

  // useEffect เพื่อเช็คสถานะการล็อกอิน
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (!initialized.current) {
          initialized.current = true;
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: SignInWithPasswordCredentials) => {
    setError(null);
    const result = await supabase.auth.signInWithPassword(credentials);
    if (result.error) setError(result.error);
    return result;
  };

  const register = async (credentials: SignUpWithPasswordCredentials) => {
    setError(null);
    const result = await supabase.auth.signUp(credentials);
    if (result.error) setError(result.error);
    return result;
  };

  const logout = async () => {
    setError(null);
    const result = await supabase.auth.signOut();
    if (result.error) {
      setError(result.error);
    } else {
      setUser(null);
      setSession(null);
    }
    return result;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook สำหรับใช้ AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
