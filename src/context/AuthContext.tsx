import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useApolloClient } from '@apollo/client/react';
import { LOGOUT_USER } from '../graphql/queries';
import type { User, Session, SignUpWithPasswordCredentials, SignInWithPasswordCredentials, AuthError, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: number | null; // 1 = patient, 2 = caregiver, 3 = admin, 4 = super_admin
  mustChangePassword: boolean | null;
  loading: boolean;
  error: AuthError | Error | null;
  passwordRecoveryPending: boolean;
  clearPasswordRecovery: () => void;
  login: (credentials: SignInWithPasswordCredentials) => Promise<{ data: any; error: any }>;
  register: (credentials: SignUpWithPasswordCredentials) => Promise<{ data: any; error: any }>;
  logout: () => Promise<{ error: any }>;
  setUserRole: (role: number) => void;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<number | null>(() => {
    const saved = localStorage.getItem('userRole');
    return saved ? parseInt(saved, 10) : null;
  });
  const [mustChangePassword, setMustChangePasswordState] = useState<boolean | null>(() => {
    const saved = localStorage.getItem('mustChangePassword');
    return saved !== null ? saved === 'true' : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | Error | null>(null);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const initialized = useRef(false);
  const apolloClient = useApolloClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('[AuthContext] event:', event);
        console.log('[AuthContext] user:', currentSession?.user ?? null);
        console.log('[AuthContext] loading:', loading);

        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryPending(true);
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // ถ้าไม่มี session ให้ลบ role และ mustChangePassword
        if (!currentSession) {
          setUserRole(null);
          setMustChangePasswordState(null);
          localStorage.removeItem('userRole');
          localStorage.removeItem('mustChangePassword');
        }

        if (!initialized.current) {
          initialized.current = true;
          setLoading(false);
        }

        console.log('[AuthContext] userRole (from state):', userRole);
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
    
    try {
      // ขั้นตอนที่ 1: พยายามเรียก GraphQL logout mutation (backend)
      // เพื่อให้ backend ทำการ invalidate token และบันทึก logout event
      try {
        await apolloClient?.mutate({
          mutation: LOGOUT_USER,
        });
      } catch (err) {
        // ถ้า GraphQL logout ล้มเหลว ไม่ต้อง throw เพราะ Supabase signOut ส่วนใหญ่พอแล้ว
        console.warn('GraphQL logout mutation failed:', err);
      }
      
      // ขั้นตอนที่ 2: เรียก Supabase logout (client-side session invalidation)
      const result = await supabase.auth.signOut();
      
      if (result.error) {
        setError(result.error);
      } else {
        // ขั้นตอนที่ 3: ล้างข้อมูล local state และ localStorage
        setUser(null);
        setSession(null);
        setUserRole(null);
        setMustChangePasswordState(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('mustChangePassword');
        
        // ล้าง Apollo cache หากมี client
        try {
          await apolloClient?.clearStore();
        } catch (err) {
          console.warn('Failed to clear Apollo cache:', err);
        }
      }
      
      return result;
    } catch (err) {
      const logoutError = err instanceof Error ? err : new Error('Logout failed');
      setError(logoutError);
      return { error: logoutError };
    }
  };

  const handleSetUserRole = (role: number) => {
    setUserRole(role);
    localStorage.setItem('userRole', role.toString());
  };

  const handleSetMustChangePassword = (value: boolean) => {
    setMustChangePasswordState(value);
    localStorage.setItem('mustChangePassword', value.toString());
  };

  const clearPasswordRecovery = () => setPasswordRecoveryPending(false);

  return (
    <AuthContext.Provider value={{ user, session, userRole, mustChangePassword, loading, error, passwordRecoveryPending, clearPasswordRecovery, login, register, logout, setUserRole: handleSetUserRole, setMustChangePassword: handleSetMustChangePassword }}>
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
