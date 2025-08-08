import { apiService } from './api';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types';

class AuthService {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', credentials);
  }

  // Registro
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', data);
  }

  // Verificar token
  async verifyToken(): Promise<{ valid: boolean; user: User }> {
    return apiService.get<{ valid: boolean; user: User }>('/auth/verify');
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/refresh');
  }

  // Alterar senha
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/users/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Buscar perfil do usuário
  async getProfile(): Promise<User> {
    return apiService.get<User>('/users/profile/me');
  }

  // Atualizar perfil
  async updateProfile(data: { name?: string; email?: string }): Promise<{ message: string; user: User }> {
    return apiService.put<{ message: string; user: User }>('/users/profile/me', data);
  }
}

export const authService = new AuthService();
