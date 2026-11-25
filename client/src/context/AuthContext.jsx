import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Restore the session on page load
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, portal) => {
    const { user, token } = await api('/auth/login', { method: 'POST', body: { email, password, portal } });
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (fields) => {
    const { user, token } = await api('/auth/register', { method: 'POST', body: fields });
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const isStaff = (user) => user?.role === 'government' || user?.role === 'admin';
export const homePathFor = (user) => (isStaff(user) ? '/gov' : user ? '/citizen' : '/');
