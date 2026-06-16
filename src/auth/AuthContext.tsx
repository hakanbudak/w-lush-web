// Auth state — login/signup/logout + sayfa açılışında /me ile session restore.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  clearToken,
  fetchMe,
  getToken,
  login as apiLogin,
  setToken,
  signup as apiSignup,
  type LoginInput,
  type SignupInput,
  type User,
} from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

interface AuthCtx {
  user: User | null;
  loading: boolean;          // ilk /me çağrısı sırasında
  login: (b: LoginInput) => Promise<void>;
  signup: (b: SignupInput) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      window.location.href = '/login';
    }
  }, []);

  // 401'de logout — client.ts'in default davranışını override et
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // İlk yükleme: token varsa /me ile user'ı çek
  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(body: LoginInput) {
    const out = await apiLogin(body);
    setToken(out.token.access_token);
    setUser(out.user);
  }

  async function signup(body: SignupInput) {
    const out = await apiSignup(body);
    setToken(out.token.access_token);
    setUser(out.user);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth AuthProvider içinde olmalı');
  return v;
}
