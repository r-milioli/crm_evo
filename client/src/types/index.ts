// Tipos de usuário
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  lastLogin?: string;
  organizationId: string;
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

// Tipos de organização
export interface Organization {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  isActive: boolean;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    instances: number;
    contacts: number;
    conversations: number;
    messages: number;
  };
}

// Tipos de instância
export interface Instance {
  id: string;
  name: string;
  instanceName: string;
  description?: string;
  status: InstanceStatus;
  qrCode?: string;
  webhookUrl?: string;
  webhookEvents: string[];
  settings?: any;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    conversations: number;
    messages: number;
  };
}

export type InstanceStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';

// Tipos de contato
export interface Contact {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  company?: string;
  tags: string[];
  notes?: string;
  isActive: boolean;
  lastInteraction?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    conversations: number;
    messages: number;
  };
}

// Tipos de conversa
export interface Conversation {
  id: string;
  title?: string;
  status: ConversationStatus;
  priority: Priority;
  tags: string[];
  notes?: string;
  organizationId: string;
  contactId: string;
  contact: Contact;
  instanceId: string;
  instance: Instance;
  assignedToId?: string;
  assignedTo?: User;
  createdById: string;
  createdBy: User;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

export type ConversationStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'WAITING';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Tipos de mensagem
export interface Message {
  id: string;
  content: string;
  type: MessageType;
  direction: MessageDirection;
  status: MessageStatus;
  mediaUrl?: string;
  mediaType?: string;
  metadata?: any;
  organizationId: string;
  conversationId: string;
  contactId: string;
  instanceId: string;
  sentById?: string;
  sentBy?: User;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'PENDING';

// Tipos de campanha
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  messageTemplate: string;
  targetContacts: string[];
  scheduledAt?: string;
  sentAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  organizationId: string;
  createdById: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';

// Tipos de relatório
export interface Report {
  id: string;
  name: string;
  type: ReportType;
  filters?: any;
  data?: any;
  organizationId: string;
  createdById: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'PERFORMANCE' | 'MESSAGES' | 'CONVERSATIONS' | 'CONTACTS' | 'CUSTOM';

// Tipos de webhook
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  organizationId: string;
  createdById: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

// Tipos de autenticação
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  organizationDescription?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Tipos de paginação
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Tipos de dashboard
export interface DashboardMetrics {
  totalMessages: number;
  totalConversations: number;
  totalContacts: number;
  connectedInstances: number;
  totalInstances: number;
  messagesToday: number;
  conversationsToday: number;
  newContactsToday: number;
  messagesByDirection: {
    inbound: number;
    outbound: number;
  };
  conversationsByStatus: {
    open: number;
    inProgress: number;
    closed: number;
    waiting: number;
  };
  topContacts: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    messageCount: number;
  }>;
  operatorPerformance: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    conversationsHandled: number;
    messagesSent: number;
  }>;
}

export interface ChartData {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
}

export interface ConversationChartData {
  date: string;
  open: number;
  inProgress: number;
  closed: number;
  waiting: number;
  total: number;
}

// Tipos de filtros
export interface ConversationFilters {
  status?: ConversationStatus;
  priority?: Priority;
  assignedTo?: string;
  search?: string;
  instanceId?: string;
}

export interface ContactFilters {
  search?: string;
  tags?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface InstanceFilters {
  status?: InstanceStatus;
}

// Tipos de formulários
export interface CreateInstanceData {
  name: string;
  instanceName: string;
  description?: string;
  webhookUrl?: string;
  webhookEvents?: string[];
}

export interface CreateContactData {
  phoneNumber: string;
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

export interface SendMessageData {
  phoneNumber: string;
  content: string;
  type: MessageType;
  instanceId: string;
  conversationId?: string;
  mediaUrl?: string;
}

export interface BulkMessageData {
  phoneNumbers: string[];
  content: string;
  type: MessageType;
  instanceId: string;
  mediaUrl?: string;
}

// Tipos de eventos Socket.IO
export interface EvolutionEvent {
  instanceName: string;
  eventType: string;
  data: any;
}

// Tipos de notificações
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Tipos de configurações
export interface AppConfig {
  apiUrl: string;
  socketUrl: string;
  version: string;
}

// Tipos de estado global
export interface AppState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  notifications: Notification[];
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
}

// Tipos de resposta da API
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface ApiError {
  error: string;
  details?: any;
  status?: number;
}
