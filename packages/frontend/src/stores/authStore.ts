import { create } from 'zustand';
import { User } from '@dts/shared';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(email, password);
      const { token, user } = response.data ?? response;
      localStorage.setItem('dts_token', token);
      localStorage.setItem('dts_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.error ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.';
      set({ isLoading: false, error: message, isAuthenticated: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('dts_token');
    localStorage.removeItem('dts_user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  setUser: (user: User) => {
    localStorage.setItem('dts_user', JSON.stringify(user));
    set({ user });
  },

  clearError: () => set({ error: null }),

  restoreSession: async () => {
    const token = localStorage.getItem('dts_token');
    const userJson = localStorage.getItem('dts_user');
    if (!token || !userJson) return;
    try {
      const user: User = JSON.parse(userJson);
      set({ token, user, isAuthenticated: true });
      // Validate token by fetching current user
      const response = await api.getMe();
      const freshUser = response.data ?? response;
      localStorage.setItem('dts_user', JSON.stringify(freshUser));
      set({ user: freshUser });
    } catch {
      localStorage.removeItem('dts_token');
      localStorage.removeItem('dts_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
