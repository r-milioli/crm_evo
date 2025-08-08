import { apiService } from './api';

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  isConfigured: boolean;
}

export interface EvolutionStatus {
  isConfigured: boolean;
  isConnected?: boolean;
  message: string;
  instances?: number;
  error?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  instances?: number;
  error?: string;
  details?: string;
}

class SettingsService {
  // Buscar configurações da Evolution API
  async getEvolutionConfig(): Promise<EvolutionConfig> {
    const response = await apiService.get('/settings/evolution');
    return response;
  }

  // Salvar configurações da Evolution API
  async saveEvolutionConfig(baseUrl: string, apiKey: string): Promise<{ message: string; isConfigured: boolean }> {
    const response = await apiService.post('/settings/evolution', {
      baseUrl,
      apiKey
    });
    return response;
  }

  // Testar conexão com Evolution API
  async testEvolutionConnection(baseUrl: string, apiKey: string): Promise<TestConnectionResponse> {
    const response = await apiService.post('/settings/evolution/test', {
      baseUrl,
      apiKey
    });
    return response;
  }

  // Verificar status da Evolution API
  async getEvolutionStatus(): Promise<EvolutionStatus> {
    const response = await apiService.get('/settings/evolution/status');
    return response;
  }

  // Remover configurações da Evolution API
  async removeEvolutionConfig(): Promise<{ message: string }> {
    const response = await apiService.delete('/settings/evolution');
    return response;
  }
}

const settingsService = new SettingsService();
export default settingsService;
