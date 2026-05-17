import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

/**
 * Auth Store - Manages authentication state
 * 
 * Uses Zustand with persist middleware to save state to localStorage
 * This means the user stays logged in even after page refresh
 * 
 * IMPORTANT: Due to Next.js hydration, we need to check _hasHydrated
 * before redirecting unauthenticated users.
 */

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;  // Track if store has loaded from localStorage

  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      // Login - save user and token
      login: (user: User, token: string) => {
        // Also save token to localStorage for API interceptor
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      // Logout - clear everything
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      // Update user info
      setUser: (user: User) => {
        set({ user });
      },

      // Mark store as hydrated
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage', // Key in localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called when store has been rehydrated from localStorage
        state?.setHasHydrated(true);
      },
    }
  )
);
