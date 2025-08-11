import { apiService } from './api';
import { 
  Conversation, 
  Message, 
  ConversationFilters, 
  PaginatedResponse,
  SendMessageData,
  Priority,
  ConversationStatus
} from '../types';

export interface CreateConversationData {
  contactId: string;
  instanceId: string;
  title?: string;
  priority?: Priority;
  tags?: string[];
  notes?: string;
}

export interface UpdateConversationData {
  title?: string;
  status?: ConversationStatus;
  priority?: Priority;
  tags?: string[];
  notes?: string;
  assignedToId?: string;
}

export interface ConversationStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  waiting: number;
  urgent: number;
  assignedToMe: number;
  unread: number;
}

class ConversationsService {
  // Buscar todas as conversas com filtros
  async getConversations(filters?: ConversationFilters, page = 1, limit = 20): Promise<PaginatedResponse<Conversation>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.instanceId) params.append('instanceId', filters.instanceId);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await apiService.get<PaginatedResponse<Conversation>>(`/conversations?${params}`);
    return response;
  }

  // Buscar uma conversa específica
  async getConversation(id: string): Promise<Conversation> {
    const response = await apiService.get<Conversation>(`/conversations/${id}`);
    return response;
  }

  // Criar nova conversa
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    const response = await apiService.post<Conversation>('/conversations', data);
    return response;
  }

  // Atualizar conversa
  async updateConversation(id: string, data: UpdateConversationData): Promise<Conversation> {
    const response = await apiService.put<Conversation>(`/conversations/${id}`, data);
    return response;
  }

  // Deletar conversa
  async deleteConversation(id: string): Promise<{ message: string }> {
    const response = await apiService.delete<{ message: string }>(`/conversations/${id}`);
    return response;
  }

  // Assumir conversa
  async assignConversation(id: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${id}/assign`);
    return response;
  }

  // Transferir conversa
  async transferConversation(id: string, assignedToId: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${id}/transfer`, { assignedToId });
    return response;
  }

  // Fechar conversa
  async closeConversation(id: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${id}/close`);
    return response;
  }

  // Reabrir conversa
  async reopenConversation(id: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${id}/reopen`);
    return response;
  }

  // Buscar mensagens de uma conversa
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<PaginatedResponse<Message>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await apiService.get<PaginatedResponse<Message>>(`/conversations/${conversationId}/messages?${params}`);
    return response;
  }

  // Enviar mensagem
  async sendMessage(data: SendMessageData): Promise<Message> {
    const response = await apiService.post<Message>('/messages/send', data);
    return response;
  }

  // Marcar mensagens como lidas
  async markMessagesAsRead(conversationId: string): Promise<{ message: string }> {
    const response = await apiService.post<{ message: string }>(`/conversations/${conversationId}/read`);
    return response;
  }

  // Buscar estatísticas das conversas
  async getConversationStats(): Promise<ConversationStats> {
    const response = await apiService.get<ConversationStats>('/conversations/stats');
    return response;
  }

  // Buscar conversas urgentes
  async getUrgentConversations(): Promise<Conversation[]> {
    const response = await apiService.get<Conversation[]>('/conversations/urgent');
    return response;
  }

  // Buscar conversas não lidas
  async getUnreadConversations(): Promise<Conversation[]> {
    const response = await apiService.get<Conversation[]>('/conversations/unread');
    return response;
  }

  // Buscar conversas atribuídas ao usuário atual
  async getMyConversations(): Promise<Conversation[]> {
    const response = await apiService.get<Conversation[]>('/conversations/my');
    return response;
  }

  // Adicionar tag à conversa
  async addTag(conversationId: string, tag: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${conversationId}/tags`, { tag });
    return response;
  }

  // Remover tag da conversa
  async removeTag(conversationId: string, tag: string): Promise<Conversation> {
    const response = await apiService.delete<Conversation>(`/conversations/${conversationId}/tags/${tag}`);
    return response;
  }

  // Adicionar observação à conversa
  async addNote(conversationId: string, note: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${conversationId}/notes`, { note });
    return response;
  }

  // Arquivar conversa
  async archiveConversation(id: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${id}/archive`);
    return response;
  }

  // Desarquivar conversa
  async unarchiveConversation(id: string): Promise<Conversation> {
    const response = await apiService.post<Conversation>(`/conversations/${id}/unarchive`);
    return response;
  }

  // Buscar conversas arquivadas
  async getArchivedConversations(page = 1, limit = 20): Promise<PaginatedResponse<Conversation>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const response = await apiService.get<PaginatedResponse<Conversation>>(`/conversations/archived?${params}`);
    return response;
  }

  // Sincronizar chats da Evolution API
  async syncEvolutionChats(instanceId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiService.post<{ success: boolean; message: string; data?: any }>(`/conversations/sync-evolution/${instanceId}`);
    return response;
  }

  // Buscar mensagens da Evolution API
  async getEvolutionMessages(instanceId: string, chatId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiService.get<{ success: boolean; message: string; data?: any }>(`/conversations/evolution-messages/${instanceId}/${chatId}`);
    return response;
  }

  // Buscar contatos da Evolution API
  async getEvolutionContacts(instanceId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiService.post<{ success: boolean; message: string; data?: any }>(`/conversations/evolution-contacts/${instanceId}`);
    return response;
  }

  // Buscar status de uma mensagem específica da Evolution API
  async getEvolutionMessageStatus(instanceId: string, remoteJid: string, messageId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiService.post<{ success: boolean; message: string; data?: any }>(`/conversations/evolution-message-status/${instanceId}/${remoteJid}/${messageId}`);
    return response;
  }

  // Sincronizar mensagens de uma conversa da Evolution API
  async syncEvolutionMessages(conversationId: string, remoteJid: string): Promise<{ success: boolean; message: string; data?: any }> {
    const response = await apiService.post<{ success: boolean; message: string; data?: any }>(`/conversations/${conversationId}/sync-messages`, { remoteJid });
    return response;
  }
}

const conversationsService = new ConversationsService();
export default conversationsService;
