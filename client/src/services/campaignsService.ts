import { apiService } from './api';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  messageTemplate: string;
  targetContacts: string[];
  scheduledAt?: string;
  sentAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  messageTemplate: string;
  targetContacts: string[];
  scheduledAt?: string;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  messageTemplate?: string;
  targetContacts?: string[];
  scheduledAt?: string;
  status?: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  byStatus: Array<{
    status: string;
    _count: { id: number };
    _sum: {
      sentCount: number;
      deliveredCount: number;
      readCount: number;
    };
  }>;
}

class CampaignsService {
  // Listar campanhas
  async listCampaigns(filters?: { status?: string; search?: string }): Promise<Campaign[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    return await apiService.get(`/campaigns?${params.toString()}`);
  }

  // Obter campanha por ID
  async getCampaign(id: string): Promise<Campaign> {
    return await apiService.get(`/campaigns/${id}`);
  }

  // Criar campanha
  async createCampaign(data: CreateCampaignData): Promise<Campaign> {
    return await apiService.post('/campaigns', data);
  }

  // Atualizar campanha
  async updateCampaign(id: string, data: UpdateCampaignData): Promise<Campaign> {
    return await apiService.put(`/campaigns/${id}`, data);
  }

  // Excluir campanha
  async deleteCampaign(id: string): Promise<{ message: string }> {
    return await apiService.delete(`/campaigns/${id}`);
  }

  // Executar campanha
  async executeCampaign(id: string, instanceName: string): Promise<{
    sentCount: number;
    deliveredCount: number;
    totalContacts: number;
  }> {
    return await apiService.post(`/campaigns/${id}/execute`, { instanceName });
  }

  // Obter estatísticas das campanhas
  async getCampaignStats(): Promise<CampaignStats> {
    return await apiService.get('/campaigns/stats/overview');
  }
}

const campaignsService = new CampaignsService();
export default campaignsService;
