import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { setAuthErrorHandler } from '../api/client';
import { getStoredToken, setStoredToken, removeStoredToken, TOKEN_STORAGE_KEY } from '../utils/token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    removeStoredToken();
    setUser(null);
    try {
      queryClient.clear();
    } catch {
      // Query client may not be ready in some test wrappers
    }
  }, [queryClient]);

  const logout = useCallback((options = {}) => {
    const { silent = false, message = 'You have been signed out' } = options;
    clearSession();
    if (!silent && message) {
      toast.success(message);
    }
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  // Handle 401 unauthenticated response from API interceptor
  useEffect(() => {
    setAuthErrorHandler(() => {
      clearSession();
      toast.error('Session expired, please sign in again');
      navigate('/login', { replace: true });
    });
    return () => {
      setAuthErrorHandler(null);
    };
  }, [clearSession, navigate]);

  // Sync across browser tabs via storage event
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === TOKEN_STORAGE_KEY && !e.newValue) {
        clearSession();
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearSession, navigate]);

  const fetchUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data.data;
    setStoredToken(token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    const { token, user: userData } = response.data.data;
    setStoredToken(token);
    setUser(userData);
    return userData;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}