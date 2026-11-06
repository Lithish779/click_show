import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const finish = ({ token, user }) => { setToken(token); setUser(user); };
  const login = async (email, password) => finish(await api('/auth/login', { method: 'POST', body: { email, password } }));
  const register = async (name, email, password) => finish(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
  const logout = () => { setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}
