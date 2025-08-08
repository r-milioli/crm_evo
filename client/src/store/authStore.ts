import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization, LoginCredentials, RegisterData, AuthResponse } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  verifyToken: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Ações
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response: AuthResponse = await authService.login(credentials);
          
          set({
            user: response.user,
            organization: response.user.organization || null,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Erro ao fazer login',
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response: AuthResponse = await authService.register(data);
          
          set({
            user: response.user,
            organization: response.user.organization || null,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Erro ao fazer registro',
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          organization: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      verifyToken: async () => {
        try {
          const { token } = get();
          
          if (!token) {
            set({ isAuthenticated: false });
            return;
          }

          const response = await authService.verifyToken();
          
          if (response.valid) {
            set({
              user: response.user,
              organization: response.user.organization || null,
              isAuthenticated: true,
            });
          } else {
            set({
              user: null,
              organization: null,
              token: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            organization: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
