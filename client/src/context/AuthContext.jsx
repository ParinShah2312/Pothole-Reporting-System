import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshStore, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Restore the session on page load
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => {
        tokenStore.set(null);
        refreshStore.set(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, portal) => {
    const { user, token, refreshToken } = await api('/auth/login', {
      method: 'POST',
      body: { email, password, portal },
    });
    tokenStore.set(token);
    if (refreshToken) refreshStore.set(refreshToken);
    setDevVerifyUrl(null);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (fields) => {
    const { user, token, refreshToken, devVerifyUrl: url } = await api('/auth/register', {
      method: 'POST',
      body: fields,
    });
    tokenStore.set(token);
    if (refreshToken) refreshStore.set(refreshToken);
    setDevVerifyUrl(url || null);
    setUser(user);
    return user;
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser?.email_verified) setDevVerifyUrl(null);
  }, []);

  const logout = useCallback(() => {
    const rt = refreshStore.get();
    if (rt) {
      api('/auth/logout', { method: 'POST', body: { refreshToken: rt } }).catch(() => {});
    }
    tokenStore.set(null);
    refreshStore.set(null);
    setDevVerifyUrl(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, devVerifyUrl, setDevVerifyUrl, login, register, updateUser, logout }),
    [user, loading, devVerifyUrl, login, register, updateUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const isStaff = (user) => user?.role === 'government' || user?.role === 'admin';
export const homePathFor = (user) => (
  user?.role === 'admin' ? '/admin/review' : isStaff(user) ? '/gov' : user ? '/citizen' : '/'
);
