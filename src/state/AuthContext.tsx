import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  userEmail: string | null;
  signIn: (email: string) => void;
  signOut: () => void;
}

const AUTH_KEY = 'abel_auth_v1';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(AUTH_KEY) !== null;
    } catch {
      return false;
    }
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_KEY);
    } catch {
      return null;
    }
  });

  const signIn = useCallback((email: string) => {
    const normalized = email.trim();
    try {
      localStorage.setItem(AUTH_KEY, normalized);
    } catch {
      // ignore
    }
    setUserEmail(normalized);
    setAuthenticated(true);
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      // ignore
    }
    setUserEmail(null);
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
