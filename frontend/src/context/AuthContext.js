import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi, usersApi, getAuthToken, clearAuthToken } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('AuthContext: Checking auth...');
    try {
      const token = await getAuthToken();
      console.log('AuthContext: Token exists:', !!token);
      if (token) {
        try {
          const userData = await usersApi.getMe();
          console.log('AuthContext: Got user data:', userData?.username);
          setUser(userData);
        } catch (userErr) {
          console.log('AuthContext: Failed to get user, clearing token');
          await clearAuthToken();
        }
      }
    } catch (err) {
      console.log('AuthContext: No valid session', err);
      try {
        await clearAuthToken();
      } catch (clearErr) {
        console.log('AuthContext: Error clearing token', clearErr);
      }
    } finally {
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authApi.login(email, password);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
      throw err;
    }
  };

  const register = async (email, username, password, skillLevel) => {
    try {
      setError(null);
      const response = await authApi.register(email, username, password, skillLevel);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await usersApi.getMe();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
