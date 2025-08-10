import { apiService } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  lastLogin?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  phone?: string;
  userDepartments?: {
    id: string;
    department: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  phone?: string;
  department?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  phone?: string;
  department?: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageInstances: boolean;
  canManageContacts: boolean;
  canManageConversations: boolean;
  canManageCampaigns: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

class UsersService {
  // Buscar todos os usuários da organização
  async getUsers(): Promise<User[]> {
    const response = await apiService.get('/users');
    return response.users || [];
  }

  // Buscar um usuário específico
  async getUser(id: string): Promise<User> {
    const response = await apiService.get(`/users/${id}`);
    return response;
  }

  // Criar novo usuário
  async createUser(data: CreateUserData): Promise<User> {
    const response = await apiService.post('/users', data);
    return response;
  }

  // Atualizar usuário
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await apiService.put(`/users/${id}`, data);
    return response;
  }

  // Deletar usuário
  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await apiService.delete(`/users/${id}`);
    return response;
  }

  // Ativar/Desativar usuário
  async toggleUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<User> {
    const response = await apiService.patch(`/users/${id}/status`, { status });
    return response;
  }

  // Redefinir senha do usuário
  async resetUserPassword(id: string): Promise<{ message: string; temporaryPassword: string }> {
    const response = await apiService.post(`/users/${id}/reset-password`);
    return response;
  }

  // Buscar permissões do usuário atual
  async getCurrentUserPermissions(): Promise<UserPermissions> {
    const response = await apiService.get('/users/me/permissions');
    return response;
  }

  // Buscar estatísticas de usuários
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byRole: Record<string, number>;
  }> {
    const response = await apiService.get('/users/stats');
    return response;
  }
}

const usersService = new UsersService();
export default usersService;
