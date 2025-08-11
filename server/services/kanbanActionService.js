const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const axios = require('axios');

const prisma = new PrismaClient();

class KanbanActionService {
  // Listar ações de uma coluna
  async listActions(columnId, organizationId) {
    try {
      const actions = await prisma.kanbanAction.findMany({
        where: {
          columnId,
          kanban: {
            organizationId
          }
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          column: {
            select: {
              id: true,
              name: true
            }
          },
          kanban: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              executions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return actions;
    } catch (error) {
      logger.error('Erro ao listar ações:', error);
      throw error;
    }
  }

  // Obter ação por ID
  async getActionById(id, organizationId) {
    try {
      const action = await prisma.kanbanAction.findFirst({
        where: {
          id,
          kanban: {
            organizationId
          }
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          column: {
            select: {
              id: true,
              name: true
            }
          },
          kanban: {
            select: {
              id: true,
              name: true
            }
          },
          executions: {
            include: {
              card: {
                select: {
                  id: true,
                  title: true
                }
              }
            },
            orderBy: {
              executedAt: 'desc'
            },
            take: 10
          }
        }
      });

      return action;
    } catch (error) {
      logger.error('Erro ao obter ação:', error);
      throw error;
    }
  }

  // Criar nova ação
  async createAction(data, organizationId, createdById) {
    try {
      // Verificar se a coluna pertence à organização
      const column = await prisma.kanbanColumn.findFirst({
        where: {
          id: data.columnId,
          kanban: {
            organizationId
          }
        }
      });

      if (!column) {
        throw new Error('Coluna não encontrada');
      }

      const action = await prisma.kanbanAction.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          trigger: data.trigger,
          conditions: data.conditions,
          config: data.config,
          columnId: data.columnId,
          kanbanId: column.kanbanId,
          createdById
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          column: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Ação criada: ${action.name} (${action.id})`);
      return action;
    } catch (error) {
      logger.error('Erro ao criar ação:', error);
      throw error;
    }
  }

  // Atualizar ação
  async updateAction(id, data, organizationId) {
    try {
      const action = await prisma.kanbanAction.findFirst({
        where: {
          id,
          kanban: {
            organizationId
          }
        }
      });

      if (!action) {
        throw new Error('Ação não encontrada');
      }

      const updatedAction = await prisma.kanbanAction.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          trigger: data.trigger,
          conditions: data.conditions,
          config: data.config,
          isActive: data.isActive
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          column: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Ação atualizada: ${updatedAction.name} (${updatedAction.id})`);
      return updatedAction;
    } catch (error) {
      logger.error('Erro ao atualizar ação:', error);
      throw error;
    }
  }

  // Deletar ação
  async deleteAction(id, organizationId) {
    try {
      const action = await prisma.kanbanAction.findFirst({
        where: {
          id,
          kanban: {
            organizationId
          }
        }
      });

      if (!action) {
        throw new Error('Ação não encontrada');
      }

      await prisma.kanbanAction.delete({
        where: { id }
      });

      logger.info(`Ação deletada: ${action.name} (${action.id})`);
      return { message: 'Ação deletada com sucesso' };
    } catch (error) {
      logger.error('Erro ao deletar ação:', error);
      throw error;
    }
  }

  // Executar ações para um card
  async executeActionsForCard(cardId, trigger, organizationId) {
    try {
      const card = await prisma.kanbanCard.findFirst({
        where: {
          id: cardId,
          kanban: {
            organizationId
          }
        },
        include: {
          column: {
            include: {
              actions: {
                where: {
                  isActive: true,
                  trigger
                }
              }
            }
          },
          contact: true,
          conversation: true,
          campaign: true,
          createdBy: true
        }
      });

      if (!card) {
        throw new Error('Card não encontrado');
      }

      const executions = [];

      for (const action of card.column.actions) {
        try {
          // Verificar condições
          if (action.conditions && !this.checkConditions(card, action.conditions)) {
            continue;
          }

          // Executar ação
          const execution = await this.executeAction(action, card);
          executions.push(execution);

          logger.info(`Ação executada: ${action.name} para card ${card.title}`);
        } catch (error) {
          logger.error(`Erro ao executar ação ${action.name}:`, error);
          
          // Registrar execução com erro
          const failedExecution = await prisma.kanbanActionExecution.create({
            data: {
              actionId: action.id,
              cardId: card.id,
              status: 'FAILED',
              error: error.message
            }
          });
          
          executions.push(failedExecution);
        }
      }

      return executions;
    } catch (error) {
      logger.error('Erro ao executar ações para card:', error);
      throw error;
    }
  }

  // Verificar condições da ação
  checkConditions(card, conditions) {
    try {
      // Exemplo de condições:
      // { "hasContact": true, "priority": "HIGH", "timeInColumn": 24 }
      
      if (conditions.hasContact && !card.contactId) {
        return false;
      }

      if (conditions.hasConversation && !card.conversationId) {
        return false;
      }

      if (conditions.hasCampaign && !card.campaignId) {
        return false;
      }

      // Verificar tempo na coluna
      if (conditions.timeInColumn) {
        const timeInColumn = Date.now() - new Date(card.updatedAt).getTime();
        const hoursInColumn = timeInColumn / (1000 * 60 * 60);
        
        if (hoursInColumn < conditions.timeInColumn) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Erro ao verificar condições:', error);
      return false;
    }
  }

  // Executar uma ação específica
  async executeAction(action, card) {
    try {
      // Criar execução pendente
      const execution = await prisma.kanbanActionExecution.create({
        data: {
          actionId: action.id,
          cardId: card.id,
          status: 'RUNNING'
        }
      });

      let result = null;
      let error = null;

      try {
        switch (action.type) {
          case 'SEND_MESSAGE':
            result = await this.executeSendMessage(action, card);
            break;
          
          case 'NOTIFY_USER':
            result = await this.executeNotifyUser(action, card);
            break;
          
          case 'CREATE_TASK':
            result = await this.executeCreateTask(action, card);
            break;
          
          case 'UPDATE_STATUS':
            result = await this.executeUpdateStatus(action, card);
            break;
          
          case 'SEND_EMAIL':
            result = await this.executeSendEmail(action, card);
            break;
          
          case 'WEBHOOK_CALL':
            result = await this.executeWebhookCall(action, card);
            break;
          
          default:
            throw new Error(`Tipo de ação não suportado: ${action.type}`);
        }

        // Atualizar execução como sucesso
        await prisma.kanbanActionExecution.update({
          where: { id: execution.id },
          data: {
            status: 'SUCCESS',
            result
          }
        });

        return { ...execution, status: 'SUCCESS', result };
      } catch (execError) {
        error = execError.message;
        
        // Atualizar execução como falha
        await prisma.kanbanActionExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            error
          }
        });

        throw execError;
      }
    } catch (error) {
      logger.error('Erro ao executar ação:', error);
      throw error;
    }
  }

  // Executar ação: Enviar mensagem via Evolution API
  async executeSendMessage(action, card) {
    try {
      const config = action.config;
      
      if (!card.contactId) {
        throw new Error('Card não possui contato associado');
      }

      // Buscar instância ativa
      const instance = await prisma.instance.findFirst({
        where: {
          organizationId: card.kanban.organizationId,
          status: 'CONNECTED'
        }
      });

      if (!instance) {
        throw new Error('Nenhuma instância conectada encontrada');
      }

      // Preparar mensagem
      let message = config.message || 'Notificação automática do Kanban';
      
      // Substituir variáveis na mensagem
      message = this.replaceVariables(message, card);

      // Enviar mensagem via Evolution API
      const response = await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${instance.name}`,
        {
          number: card.contact.phoneNumber,
          text: message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY
          }
        }
      );

      return {
        message: 'Mensagem enviada com sucesso',
        response: response.data
      };
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  // Executar ação: Notificar usuário interno
  async executeNotifyUser(action, card) {
    try {
      const config = action.config;
      
      // Buscar usuário para notificar
      const user = await prisma.user.findFirst({
        where: {
          id: config.userId,
          organizationId: card.kanban.organizationId
        }
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Aqui você pode implementar notificação via email, push, etc.
      // Por enquanto, vamos apenas logar
      logger.info(`Notificação para ${user.name}: ${config.message}`);

      return {
        message: 'Usuário notificado',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    } catch (error) {
      logger.error('Erro ao notificar usuário:', error);
      throw error;
    }
  }

  // Executar ação: Criar tarefa
  async executeCreateTask(action, card) {
    try {
      const config = action.config;
      
      // Aqui você pode criar uma tarefa no sistema
      // Por enquanto, vamos apenas logar
      logger.info(`Tarefa criada para card ${card.title}: ${config.taskTitle}`);

      return {
        message: 'Tarefa criada',
        taskTitle: config.taskTitle
      };
    } catch (error) {
      logger.error('Erro ao criar tarefa:', error);
      throw error;
    }
  }

  // Executar ação: Atualizar status
  async executeUpdateStatus(action, card) {
    try {
      const config = action.config;
      
      // Atualizar status do card ou conversa
      if (config.updateCardStatus) {
        await prisma.kanbanCard.update({
          where: { id: card.id },
          data: { description: config.newStatus }
        });
      }

      if (config.updateConversationStatus && card.conversationId) {
        await prisma.conversation.update({
          where: { id: card.conversationId },
          data: { status: config.newStatus }
        });
      }

      return {
        message: 'Status atualizado',
        newStatus: config.newStatus
      };
    } catch (error) {
      logger.error('Erro ao atualizar status:', error);
      throw error;
    }
  }

  // Executar ação: Enviar email
  async executeSendEmail(action, card) {
    try {
      const config = action.config;
      
      // Aqui você pode implementar envio de email
      // Por enquanto, vamos apenas logar
      logger.info(`Email enviado para ${config.email}: ${config.subject}`);

      return {
        message: 'Email enviado',
        email: config.email,
        subject: config.subject
      };
    } catch (error) {
      logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  // Executar ação: Chamar webhook
  async executeWebhookCall(action, card) {
    try {
      const config = action.config;
      
      const payload = {
        action: action.name,
        card: {
          id: card.id,
          title: card.title,
          description: card.description
        },
        contact: card.contact,
        conversation: card.conversation,
        campaign: card.campaign,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(config.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        timeout: 10000
      });

      return {
        message: 'Webhook chamado com sucesso',
        response: response.data
      };
    } catch (error) {
      logger.error('Erro ao chamar webhook:', error);
      throw error;
    }
  }

  // Substituir variáveis na mensagem
  replaceVariables(message, card) {
    return message
      .replace(/\{\{card\.title\}\}/g, card.title || '')
      .replace(/\{\{card\.description\}\}/g, card.description || '')
      .replace(/\{\{contact\.name\}\}/g, card.contact?.name || '')
      .replace(/\{\{contact\.phone\}\}/g, card.contact?.phoneNumber || '')
      .replace(/\{\{conversation\.title\}\}/g, card.conversation?.title || '')
      .replace(/\{\{campaign\.name\}\}/g, card.campaign?.name || '')
      .replace(/\{\{createdBy\.name\}\}/g, card.createdBy?.name || '');
  }

  // Obter estatísticas das ações
  async getActionStats(organizationId) {
    try {
      const stats = await prisma.kanbanAction.groupBy({
        by: ['type', 'status'],
        where: {
          kanban: {
            organizationId
          }
        },
        _count: {
          id: true
        }
      });

      const totalActions = await prisma.kanbanAction.count({
        where: {
          kanban: {
            organizationId
          }
        }
      });

      const recentExecutions = await prisma.kanbanActionExecution.findMany({
        where: {
          action: {
            kanban: {
              organizationId
            }
          }
        },
        include: {
          action: {
            select: {
              name: true,
              type: true
            }
          },
          card: {
            select: {
              title: true
            }
          }
        },
        orderBy: {
          executedAt: 'desc'
        },
        take: 10
      });

      return {
        totalActions,
        stats,
        recentExecutions
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas das ações:', error);
      throw error;
    }
  }
}

module.exports = new KanbanActionService();
