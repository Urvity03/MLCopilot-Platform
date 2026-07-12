import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (user: User | null, token: string | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  setHydrated: (isHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,
      setSession: (user, token) =>
        set({
          user,
          accessToken: token,
          isAuthenticated: !!token,
        }),
      setAccessToken: (token) =>
        set({
          accessToken: token,
          isAuthenticated: !!token,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: 'mlcopilot-auth-session',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
