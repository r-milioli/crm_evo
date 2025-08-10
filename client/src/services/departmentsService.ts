import { apiService } from './api';

export interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userDepartments: number;
  };
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  color?: string;
}

class DepartmentsService {
  // Buscar todos os departamentos
  async getDepartments(): Promise<Department[]> {
    const response = await apiService.get('/departments');
    return response.departments || [];
  }

  // Buscar um departamento específico
  async getDepartment(id: string): Promise<Department> {
    const response = await apiService.get(`/departments/${id}`);
    return response;
  }

  // Criar novo departamento
  async createDepartment(data: CreateDepartmentData): Promise<Department> {
    const response = await apiService.post('/departments', data);
    return response;
  }

  // Atualizar departamento
  async updateDepartment(id: string, data: UpdateDepartmentData): Promise<Department> {
    const response = await apiService.put(`/departments/${id}`, data);
    return response;
  }

  // Deletar departamento
  async deleteDepartment(id: string): Promise<{ message: string }> {
    const response = await apiService.delete(`/departments/${id}`);
    return response;
  }

  // Buscar estatísticas de departamentos
  async getDepartmentStats(): Promise<{
    total: number;
    withUsers: number;
    empty: number;
  }> {
    const response = await apiService.get('/departments/stats');
    return response;
  }
}

const departmentsService = new DepartmentsService();
export default departmentsService;
