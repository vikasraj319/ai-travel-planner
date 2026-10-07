import {
  useEffect,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';
import { AuthContext } from './useAuth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // =========================
  // Get Current Session
  // =========================
  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Get session error:', error.message);
        }

        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Session fetch failed:', err.message);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // =========================
    // Listen for Auth Changes
    // =========================
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // Sign Up
  // =========================
  const signUp = async (email, password, fullName = '') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setAuthError(error.message);
        throw error;
      }
      setAuthError(null);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // =========================
  // Login
  // =========================
  const login = async (email, password) => {
    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setAuthError(error.message);
        throw error;
      }
      setAuthError(null);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // =========================
  // Logout
  // =========================
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      setAuthError(null);
      setUser(null);
      setSession(null);

      return {
        success: true,
      };
    } catch (error) {
      setAuthError(error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // =========================
  // Reset Password
  // =========================
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      setAuthError(null);
      return {
        success: true,
      };
    } catch (error) {
      setAuthError(error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // =========================
  // Update User Metadata
  // =========================
  const updateUserMetadata = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    authError,
    signUp,
    login,
    logout,
    resetPassword,
    updateUserMetadata,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

