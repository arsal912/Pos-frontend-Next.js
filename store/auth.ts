import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
  hasModule: (slug: string) => boolean;
  isSuperAdmin: () => boolean;
  isStoreOwner: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          set({ isLoading: true });
          const res = await apiClient.get<User>('/auth/me');
          set({ user: res.data, isAuthenticated: true });
        } catch {
          get().clearAuth();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch {
          // ignore — clear locally regardless
        }
        get().clearAuth();
      },

      hasModule: (slug: string) => {
        const user = get().user;
        if (!user) return false;
        if (user.is_super_admin) return true;
        // Module flags will be loaded separately and managed by a useModuleAccess hook.
        // For initial routing, fall back to true so middleware can do the actual gating.
        return true;
      },

      isSuperAdmin: () => Boolean(get().user?.is_super_admin),
      isStoreOwner: () => Boolean(get().user?.roles?.includes('store-owner')),
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
