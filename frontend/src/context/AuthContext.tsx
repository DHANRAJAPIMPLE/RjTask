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
  loading: boolean;
  login: (userData: any) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * SESSION RECOVERY LOGIC: Runs once when the app mounts.
   * Logic:
   * 1. Check browser's 'localStorage' for a 'user' key.
   * 2. If found, Parse the JSON and extract user fields.
   * 3. Validate the data; if valid, restore it to the React state.
   * 4. This ensures the user stays logged in across page refreshes.
   */
  useEffect(() => {
    // Logic: Retrieve the serialized user string from persistent browser storage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const restored = parsed?.user ?? parsed;
        const name = (restored?.name ?? '').toString().trim();
        const email = (restored?.email ?? '').toString().trim();
        const phone = (restored?.phone ?? '').toString();

        if (!name && !email) {
          // Logic: Invalid data found, clear the corrupted storage
          setUser(null);
          localStorage.removeItem('user');
        } else {
          // Logic: Reconstruct the local user object and update state
          const miniUser: User = {
            name: name || email,
            email: email || 'unknown@example.com',
            phone,
          };
          setUser(miniUser);
          
          // Logic: Resave the sanitized object to ensure storage is clean
          localStorage.setItem('user', JSON.stringify(miniUser));
        }
      } catch {
        // Logic: Syntax error in JSON, wipe it clean
        localStorage.removeItem('user');
      }
    }
    // Logic: Mark recovery process as finished so the UI can stop showing loaders
    setLoading(false);
  }, []);

  /**
   * LOGIN ACTION LOGIC: Persists valid session data.
   * Logic:
   * 1. Extract non-sensitive user profile from API response.
   * 2. Update React 'user' state to trigger re-renders in the UI.
   * 3. Mirror the data to 'localStorage' so it survives a refresh.
   */
  const login = (userData: any) => {
    const payload = userData?.user ?? userData;
    const name = (payload?.name ?? '').toString().trim();
    const email = (payload?.email ?? '').toString().trim();
    const phone = (payload?.phone ?? '').toString();
    
    const miniUser: User = {
      name: name || email || 'User',
      email: email || 'unknown@example.com',
      phone,
    };

    // Logic: Update application state and browser storage simultaneously
    setUser(miniUser);
    localStorage.setItem('user', JSON.stringify(miniUser));
  };

  /**
   * LOGOUT ACTION LOGIC: Terminates the session.
   * Logic:
   * 1. CALL API: Notify the backend to clear cookies and invalidate refresh tokens.
   * 2. CLEAR STATE: Update React state to null, immediately hiding protected UI.
   * 3. CLEAR STORAGE: Remove the user from localStorage.
   */
  const logout = async () => {
    try {
      // Logic: Instruct the server to destroy the session on the backend
      await api.post('/auth/logout');
      
      // Logic: Cleanup local data ONLY on successful API response
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error', error);
      // Logic: Only show error toast if it's not a 401 (already handled by interceptor)
      if (error.response?.status !== 401) {
        toast.error(error.message || 'Failed to logout. Please try again.');
      }

//  setUser(null);
//       localStorage.removeItem('user'); 
       }
  };

  return (
    // Logic: Provide the auth state and actions to the entire React tree via Context API
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
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

