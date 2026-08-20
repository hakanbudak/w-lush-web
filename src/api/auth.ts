// Auth API — signup, login, me + token storage (Faz 2).
import { request } from './client';

const TOKEN_KEY = 'wl_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string): void => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

export interface ClinicInfo {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  /** E-posta ile iki adımlı doğrulama — kullanıcı başına. */
  two_factor_enabled: boolean;
  clinic: ClinicInfo;
}

interface TokenOut {
  access_token: string;
  token_type: string;
}

interface AuthOut {
  user: User;
  token: TokenOut;
}

export interface SignupInput {
  clinic_name: string;
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const signup = (body: SignupInput) =>
  request<AuthOut>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/**
 * Girişin iki olası sonucu. `two_factor` true ise jeton yok: kod ekranına
 * geçiliyor ve `challenge` oraya taşınıyor.
 */
export interface LoginOut {
  two_factor: boolean;
  challenge: string;
  user: User | null;
  token: TokenOut | null;
}

export const login = (body: LoginInput) =>
  request<LoginOut>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const verifyLoginCode = (challenge: string, code: string) =>
  request<AuthOut>('/api/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify({ challenge, code }),
  });

/** Sıfırlama bağlantısı ister. Adres kayıtlı olmasa da aynı cevabı verir. */
export const forgotPassword = (email: string) =>
  request<void>('/api/auth/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, password: string) =>
  request<void>('/api/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

/** Kapatmak şifre ister, açmak istemez. */
export const setTwoFactor = (enabled: boolean, password = '') =>
  request<User>('/api/auth/two-factor', {
    method: 'PUT',
    body: JSON.stringify({ enabled, password }),
  });

export const fetchMe = () => request<User>('/api/auth/me');
