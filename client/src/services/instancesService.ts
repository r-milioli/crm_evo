import { apiService } from './api';

export interface Instance {
  id: string;
  name: string;
  instanceName: string;
  description?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE' | 'UNKNOWN';
  qrCode?: string;
  webhookEvents?: string[];
  settings?: any;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  isFromEvolution?: boolean;
  connectionStatus?: 'open' | 'close' | 'connecting';
}

export interface CreateInstanceData {
  name: string;
  instanceName: string;
  description?: string;
  webhookEvents?: string[];
}

export interface ConnectInstanceResponse {
  qrCode?: string;
  message: string;
  status: string;
}

export interface InstanceStatus {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE' | 'UNKNOWN';
  qrCode?: string;
  message?: string;
}

class InstancesService {
  // Buscar todas as instâncias
  async getInstances(): Promise<Instance[]> {
    const response = await apiService.get('/instances');
    // O backend retorna { instances: Instance[], pagination: {...} }
    return response.instances || [];
  }

  // Buscar uma instância específica
  async getInstance(id: string): Promise<Instance> {
    const response = await apiService.get(`/instances/${id}`);
    return response;
  }

  // Criar nova instância
  async createInstance(data: CreateInstanceData): Promise<Instance> {
    const response = await apiService.post('/instances', data);
    return response;
  }

  // Conectar instância (gerar QR Code)
  async connectInstance(id: string): Promise<ConnectInstanceResponse> {
    const response = await apiService.post(`/instances/${id}/connect`);
    return response;
  }

  // Verificar status da instância
  async getInstanceStatus(id: string): Promise<InstanceStatus> {
    const response = await apiService.get(`/instances/${id}/status`);
    return response;
  }

  // Desconectar instância
  async disconnectInstance(id: string): Promise<{ message: string }> {
    const response = await apiService.post(`/instances/${id}/disconnect`);
    return response;
  }

  // Deletar instância
  async deleteInstance(id: string): Promise<{ message: string }> {
    const response = await apiService.delete(`/instances/${id}`);
    return response;
  }

  // Atualizar instância
  async updateInstance(id: string, data: Partial<CreateInstanceData>): Promise<Instance> {
    const response = await apiService.put(`/instances/${id}`, data);
    return response;
  }

  // Sincronizar instâncias da Evolution API
  async syncEvolutionInstances(): Promise<{ message: string; instances: Instance[] }> {
    const response = await apiService.get('/instances/sync');
    return response;
  }

  // Buscar configurações de uma instância
  async getInstanceSettings(id: string): Promise<{
    message: string;
    settings: {
      rejectCall?: boolean;
      msgCall?: string;
      groupsIgnore?: boolean;
      alwaysOnline?: boolean;
      readMessages?: boolean;
      syncFullHistory?: boolean;
      readStatus?: boolean;
    };
    instanceName: string;
  }> {
    const response = await apiService.get(`/instances/${id}/settings`);
    return response;
  }

  // Atualizar configurações de uma instância
  async updateInstanceSettings(id: string, settings: {
    rejectCall?: boolean;
    msgCall?: string;
    groupsIgnore?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    syncFullHistory?: boolean;
    readStatus?: boolean;
  }): Promise<{
    message: string;
    settings: any;
    instanceName: string;
  }> {
    const response = await apiService.put(`/instances/${id}/settings`, settings);
    return response;
  }
}

const instancesService = new InstancesService();
export default instancesService;
