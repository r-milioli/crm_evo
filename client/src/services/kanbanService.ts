import { apiService } from './api';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  order: number;
  _count?: {
    cards: number;
  };
  cards?: KanbanCard[];
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  order: number;
  columnId: string;
  kanbanId: string;
  contactId?: string;
  conversationId?: string;
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string;
  };
  conversation?: {
    id: string;
    title: string;
    status: string;
  };
  campaign?: {
    id: string;
    name: string;
    status: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  activities?: Array<{
    id: string;
    action: string;
    details: any;
    createdAt: string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

export interface Kanban {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  columns: KanbanColumn[];
  cards: KanbanCard[];
  _count?: {
    cards: number;
  };
}

export interface CreateKanbanData {
  name: string;
  description?: string;
  color?: string;
  columns: Array<{
    name: string;
    color?: string;
  }>;
}

export interface UpdateKanbanData {
  name?: string;
  description?: string;
  color?: string;
  columns?: Array<{
    name: string;
    color?: string;
  }>;
}

export interface CreateCardData {
  title: string;
  description?: string;
  columnId: string;
  kanbanId: string;
  contactId?: string;
  conversationId?: string;
  campaignId?: string;
}

export interface UpdateCardData {
  title?: string;
  description?: string;
}

export interface KanbanStats {
  totalKanbans: number;
  totalCards: number;
  recentActivity: Array<{
    id: string;
    action: string;
    details: any;
    createdAt: string;
    card: {
      title: string;
      kanban: {
        name: string;
      };
    };
    user: {
      name: string;
    };
  }>;
}

class KanbanService {
  // Listar todos os kanbans
  async listKanbans(filters?: { search?: string }): Promise<Kanban[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);

    return await apiService.get(`/kanbans?${params.toString()}`);
  }

  // Obter kanban por ID
  async getKanban(id: string): Promise<Kanban> {
    return await apiService.get(`/kanbans/${id}`);
  }

  // Criar kanban
  async createKanban(data: CreateKanbanData): Promise<Kanban> {
    return await apiService.post('/kanbans', data);
  }

  // Atualizar kanban
  async updateKanban(id: string, data: UpdateKanbanData): Promise<Kanban> {
    return await apiService.put(`/kanbans/${id}`, data);
  }

  // Deletar kanban
  async deleteKanban(id: string): Promise<{ message: string }> {
    return await apiService.delete(`/kanbans/${id}`);
  }

  // Criar card
  async createCard(data: CreateCardData): Promise<KanbanCard> {
    return await apiService.post(`/kanbans/${data.kanbanId}/cards`, data);
  }

  // Mover card
  async moveCard(cardId: string, newColumnId: string): Promise<KanbanCard> {
    return await apiService.put(`/kanbans/cards/${cardId}/move`, { newColumnId });
  }

  // Atualizar card
  async updateCard(cardId: string, data: UpdateCardData): Promise<KanbanCard> {
    return await apiService.put(`/kanbans/cards/${cardId}`, data);
  }

  // Deletar card
  async deleteCard(cardId: string): Promise<{ message: string }> {
    return await apiService.delete(`/kanbans/cards/${cardId}`);
  }

  // Obter estatísticas
  async getKanbanStats(): Promise<KanbanStats> {
    return await apiService.get('/kanbans/stats/overview');
  }
}

const kanbanService = new KanbanService();
export default kanbanService;
