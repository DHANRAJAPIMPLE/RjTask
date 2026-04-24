import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

interface User {
  name: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  groups: any[];
  loading: boolean;
  login: (userData: any) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * SESSION RECOVERY LOGIC: Runs once when the app mounts.
   * Logic:
   * 1. Call /auth/me to check for an active session via HTTP-only cookies.
   * 2. If successful, populate user profile and groups.
   * 3. This eliminates reliance on insecure localStorage.
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.post('/auth/me');
        if (response.data) {
          setUser(response.data.user);
          setGroups(response.data.groups || []);
        }
      } catch (error) {
        console.log('No active session found');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  /**
   * LOGIN ACTION LOGIC:
   * Updates state with user data after successful authentication.
   */
  const login = (userData: any) => {
    const payload = userData?.user ?? userData;
    setUser({
      name: payload?.name || 'User',
      email: payload?.email || '',
      phone: payload?.phone || '',
    });
    
    // Refresh user data to get groups after login
    api.get('/auth/me').then(res => setGroups(res.data.groups || [])).catch(() => {});
  };

  /**
   * LOGOUT ACTION LOGIC:
   * Terminates the session on both client and server.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setGroups([]);
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error', error);
      if (error.response?.status !== 401) {
        toast.error(error.message || 'Failed to logout');
      }
      setUser(null);
      setGroups([]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, groups, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook Logic:
 * Ensures child components never try to access auth before it's ready.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

