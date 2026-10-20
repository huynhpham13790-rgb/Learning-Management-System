import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = ({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const value = {
    user,
    loading,
    isStaff: user?.role === 'admin' || user?.role === 'teacher',
    login: (email, password) => api.post('/auth/login', { email, password }).then(handleAuth),
    register: (data) => api.post('/auth/register', data).then(handleAuth),
    logout: () => {
      tokenStore.set(null);
      setUser(null);
    },
    setUser,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
