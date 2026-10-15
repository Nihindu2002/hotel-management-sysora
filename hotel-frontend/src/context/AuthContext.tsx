import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { getCurrentUser } from '../services/userService';
import { getCurrentToken, login as loginWithPassword, logout as logoutSession } from '../services/authService';
import type { UserProfile } from '../types/user';

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  /** Re-reads the profile from the API, e.g. after the user edits it. */
  refreshProfile: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (getCurrentToken()) {
          const profile = await getCurrentUser();
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUser(null);
        await logoutSession();
      } finally {
        setLoading(false);
      }
    };
    void loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      const profile = await getCurrentUser();
      setUser(profile);
      return profile;
    } catch (error) {
      console.error('Login or profile loading failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutSession();
    setUser(null);
  };

  const refreshProfile = async (): Promise<UserProfile> => {
    const profile = await getCurrentUser();
    setUser(profile);
    return profile;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

