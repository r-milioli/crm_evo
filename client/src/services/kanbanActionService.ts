import { apiService } from './api';

export interface KanbanAction {
  id: string;
  name: string;
  description?: string;
  type: ActionType;
  trigger: ActionTrigger;
  conditions?: any;
  config: any;
  isActive: boolean;
  columnId: string;
  kanbanId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  column: {
    id: string;
    name: string;
  };
  kanban: {
    id: string;
    name: string;
  };
  _count?: {
    executions: number;
  };
  executions?: KanbanActionExecution[];
}

export interface KanbanActionExecution {
  id: string;
  actionId: string;
  cardId: string;
  status: ExecutionStatus;
  result?: any;
  error?: string;
  executedAt: string;
  action: {
    name: string;
    type: ActionType;
  };
  card: {
    title: string;
  };
}

export interface CreateActionData {
  name: string;
  description?: string;
  type: ActionType;
  trigger: ActionTrigger;
  conditions?: any;
  config: any;
  columnId: string;
}

export interface UpdateActionData {
  name?: string;
  description?: string;
  type?: ActionType;
  trigger?: ActionTrigger;
  conditions?: any;
  config?: any;
  isActive?: boolean;
}

export interface ActionTemplate {
  name: string;
  description: string;
  type: ActionType;
  trigger: ActionTrigger;
  config: any;
  conditions?: any;
}

export interface ActionStats {
  totalActions: number;
  stats: Array<{
    type: ActionType;
    status: string;
    _count: {
      id: number;
    };
  }>;
  recentExecutions: KanbanActionExecution[];
}

export enum ActionType {
  SEND_MESSAGE = 'SEND_MESSAGE',
  NOTIFY_USER = 'NOTIFY_USER',
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_STATUS = 'UPDATE_STATUS',
  SEND_EMAIL = 'SEND_EMAIL',
  WEBHOOK_CALL = 'WEBHOOK_CALL'
}

export enum ActionTrigger {
  ON_ENTER_COLUMN = 'ON_ENTER_COLUMN',
  ON_LEAVE_COLUMN = 'ON_LEAVE_COLUMN',
  ON_CARD_CREATE = 'ON_CARD_CREATE',
  ON_TIME_DELAY = 'ON_TIME_DELAY',
  ON_CONDITION = 'ON_CONDITION'
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

class KanbanActionService {
  // Listar ações de uma coluna
  async listActions(columnId: string): Promise<KanbanAction[]> {
    return await apiService.get(`/kanban-actions/column/${columnId}`);
  }

  // Obter ação por ID
  async getAction(id: string): Promise<KanbanAction> {
    return await apiService.get(`/kanban-actions/${id}`);
  }

  // Criar ação
  async createAction(data: CreateActionData): Promise<KanbanAction> {
    return await apiService.post('/kanban-actions', data);
  }

  // Atualizar ação
  async updateAction(id: string, data: UpdateActionData): Promise<KanbanAction> {
    return await apiService.put(`/kanban-actions/${id}`, data);
  }

  // Deletar ação
  async deleteAction(id: string): Promise<{ message: string }> {
    return await apiService.delete(`/kanban-actions/${id}`);
  }

  // Executar ações para um card (manual)
  async executeActions(cardId: string, trigger: ActionTrigger): Promise<KanbanActionExecution[]> {
    return await apiService.post(`/kanban-actions/execute/${cardId}`, { trigger });
  }

  // Obter estatísticas das ações
  async getActionStats(): Promise<ActionStats> {
    return await apiService.get('/kanban-actions/stats/overview');
  }

  // Obter templates disponíveis
  async getTemplates(): Promise<ActionTemplate[]> {
    return await apiService.get('/kanban-actions/templates/available');
  }

  // Obter nome amigável do tipo de ação
  getActionTypeName(type: ActionType): string {
    const names = {
      [ActionType.SEND_MESSAGE]: 'Enviar Mensagem',
      [ActionType.NOTIFY_USER]: 'Notificar Usuário',
      [ActionType.CREATE_TASK]: 'Criar Tarefa',
      [ActionType.UPDATE_STATUS]: 'Atualizar Status',
      [ActionType.SEND_EMAIL]: 'Enviar Email',
      [ActionType.WEBHOOK_CALL]: 'Chamar Webhook'
    };
    return names[type] || type;
  }

  // Obter nome amigável do trigger
  getTriggerName(trigger: ActionTrigger): string {
    const names = {
      [ActionTrigger.ON_ENTER_COLUMN]: 'Quando entra na coluna',
      [ActionTrigger.ON_LEAVE_COLUMN]: 'Quando sai da coluna',
      [ActionTrigger.ON_CARD_CREATE]: 'Quando card é criado',
      [ActionTrigger.ON_TIME_DELAY]: 'Após tempo na coluna',
      [ActionTrigger.ON_CONDITION]: 'Quando condição é atendida'
    };
    return names[trigger] || trigger;
  }

  // Obter nome amigável do status de execução
  getExecutionStatusName(status: ExecutionStatus): string {
    const names = {
      [ExecutionStatus.PENDING]: 'Pendente',
      [ExecutionStatus.RUNNING]: 'Executando',
      [ExecutionStatus.SUCCESS]: 'Sucesso',
      [ExecutionStatus.FAILED]: 'Falhou',
      [ExecutionStatus.CANCELLED]: 'Cancelado'
    };
    return names[status] || status;
  }

  // Obter cor do status de execução
  getExecutionStatusColor(status: ExecutionStatus): string {
    const colors = {
      [ExecutionStatus.PENDING]: 'text-yellow-500',
      [ExecutionStatus.RUNNING]: 'text-blue-500',
      [ExecutionStatus.SUCCESS]: 'text-green-500',
      [ExecutionStatus.FAILED]: 'text-red-500',
      [ExecutionStatus.CANCELLED]: 'text-gray-500'
    };
    return colors[status] || 'text-gray-500';
  }

  // Obter ícone do tipo de ação
  getActionTypeIcon(type: ActionType): string {
    const icons = {
      [ActionType.SEND_MESSAGE]: '📱',
      [ActionType.NOTIFY_USER]: '🔔',
      [ActionType.CREATE_TASK]: '📋',
      [ActionType.UPDATE_STATUS]: '🔄',
      [ActionType.SEND_EMAIL]: '📧',
      [ActionType.WEBHOOK_CALL]: '🔗'
    };
    return icons[type] || '⚙️';
  }

  // Validar configuração da ação
  validateActionConfig(type: ActionType, config: any): string[] {
    const errors: string[] = [];

    switch (type) {
      case ActionType.SEND_MESSAGE:
        if (!config.message) {
          errors.push('Mensagem é obrigatória');
        }
        break;

      case ActionType.NOTIFY_USER:
        if (!config.userId) {
          errors.push('Usuário é obrigatório');
        }
        if (!config.message) {
          errors.push('Mensagem é obrigatória');
        }
        break;

      case ActionType.UPDATE_STATUS:
        if (!config.newStatus) {
          errors.push('Novo status é obrigatório');
        }
        break;

      case ActionType.SEND_EMAIL:
        if (!config.email) {
          errors.push('Email é obrigatório');
        }
        if (!config.subject) {
          errors.push('Assunto é obrigatório');
        }
        break;

      case ActionType.WEBHOOK_CALL:
        if (!config.webhookUrl) {
          errors.push('URL do webhook é obrigatória');
        }
        break;
    }

    return errors;
  }

  // Gerar configuração padrão baseada no tipo
  getDefaultConfig(type: ActionType): any {
    switch (type) {
      case ActionType.SEND_MESSAGE:
        return {
          message: 'Olá {{contact.name}}! Seu pedido {{card.title}} está sendo processado.'
        };

      case ActionType.NOTIFY_USER:
        return {
          message: 'Novo card criado: {{card.title}}',
          userId: null
        };

      case ActionType.UPDATE_STATUS:
        return {
          updateConversationStatus: true,
          newStatus: 'IN_PROGRESS'
        };

      case ActionType.SEND_EMAIL:
        return {
          email: '',
          subject: 'Acompanhamento: {{card.title}}',
          message: 'Olá! Gostaríamos de informar que seu pedido está sendo processado.'
        };

      case ActionType.WEBHOOK_CALL:
        return {
          webhookUrl: '',
          headers: {}
        };

      case ActionType.CREATE_TASK:
        return {
          taskTitle: 'Tarefa para {{card.title}}',
          taskDescription: 'Tarefa criada automaticamente para o card {{card.title}}'
        };

      default:
        return {};
    }
  }
}

const kanbanActionService = new KanbanActionService();
export default kanbanActionService;
