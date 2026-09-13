import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';

/**
 * AUTH CONTEXT
 *
 * Provides authentication state to the entire component tree.
 *
 * Why Context over prop drilling?
 * Without context, `user` and `logout` would need to be passed as props
 * from the root component down through every intermediate component —
 * even ones that don't use them. This is called "prop drilling."
 * Context solves this: any component can call useAuth() and get the
 * auth state directly, regardless of how deep in the tree it is.
 *
 * State shape:
 * {
 *   user: { _id, name, email, cashBalance } | null,
 *   token: string | null,
 *   loading: boolean,  ← true while checking localStorage on mount
 * }
 *
 * Interview Q: "Why useCallback on login/logout/refreshUser?"
 * A: Functions defined inside a component are recreated on every render.
 *    If we pass login as a prop or dependency, components using it will
 *    re-render every time the parent re-renders, even if login didn't change.
 *    useCallback memoizes the function — it's only recreated when its
 *    dependencies change. This prevents unnecessary child re-renders.
 *
 * Interview Q: "Why check localStorage in useEffect on mount?"
 * A: On page refresh, React state is reset (it's in-memory). To persist
 *    the login session across refreshes, we store the token in localStorage
 *    and re-hydrate state from it on mount. The useEffect runs once
 *    (empty dependency array []) when the component first mounts.
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Start true — checking storage

  // ── Hydrate from localStorage on mount ──────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupt localStorage data — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false); // Done checking — allow render
  }, []);

  // ── Login: called after successful POST /api/auth/login ──────────────────
  const login = useCallback((userData, tokenValue) => {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Tell the server (informational — JWT is stateless, server can't invalidate)
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — we're logging out regardless
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // ── Refresh user data from server (e.g., after a trade updates cashBalance) ─
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const updatedUser = data.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch {
      // If this fails, user is still logged in — just stale data
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Custom hook ──────────────────────────────────────────────────────────────
/**
 * useAuth() — consume auth context in any component
 * Throws if used outside AuthProvider (helpful dev error).
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
