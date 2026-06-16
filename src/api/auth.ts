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

export const login = (body: LoginInput) =>
  request<AuthOut>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchMe = () => request<User>('/api/auth/me');
