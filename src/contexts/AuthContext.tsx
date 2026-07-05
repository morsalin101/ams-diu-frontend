import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

// Decode a JWT payload without any external dependency. Returns null if the
// token is missing or malformed.
const decodeJwtPayload = (token: string | null): { exp?: number } | null => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

// Milliseconds until the access token expires. Returns 0 for an
// already-expired or unreadable token.
const getMsUntilExpiry = (token: string | null): number => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
};

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  role_details: {
    id: number;
    role_name: string;
  };
  department_details?: {
    id: number;
    department_name: string;
    department_shortname: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  // Schedule an automatic logout for the exact moment the access token expires,
  // so a session left open is torn down without waiting for the next request.
  const scheduleAutoLogout = (token: string | null) => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    const msUntilExpiry = getMsUntilExpiry(token);
    if (msUntilExpiry <= 0) {
      logout();
      return;
    }
    // setTimeout caps out around 24.8 days; our 1d token is well within range.
    expiryTimerRef.current = setTimeout(() => {
      logout();
    }, msUntilExpiry);
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      // A stored-but-expired token means the session already lapsed while the
      // app was closed — drop it instead of showing a logged-in shell.
      if (getMsUntilExpiry(token) <= 0) {
        clearSession();
      } else {
        try {
          setUser(JSON.parse(userData));
          scheduleAutoLogout(token);
        } catch (error) {
          console.error('Error parsing user data:', error);
          clearSession();
        }
      }
    }

    setIsLoading(false);

    // Log out other tabs when one clears the token (multi-tab sync).
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' && !event.newValue) {
        logout();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });

      if (response.success) {
        const { access_token, refresh_token, user: userData } = response.data;

        // Store tokens and user data
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        scheduleAutoLogout(access_token);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role_details?.role_name === 'superadmin';

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    isSuperAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
