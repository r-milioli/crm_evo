const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const kanbanActionService = require('./kanbanActionService');

const prisma = new PrismaClient();

class KanbanService {
  // Listar todos os kanbans da organização
  async listKanbans(organizationId, filters = {}) {
    try {
      const where = {
        organizationId,
        isActive: true,
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      };

      const kanbans = await prisma.kanban.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          columns: {
            orderBy: { order: 'asc' },
            include: {
              _count: {
                select: { cards: true }
              }
            }
          },
          _count: {
            select: { cards: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return kanbans;
    } catch (error) {
      logger.error('Erro ao listar kanbans:', error);
      throw error;
    }
  }

  // Obter kanban por ID com todas as informações
  async getKanbanById(id, organizationId) {
    try {
      const kanban = await prisma.kanban.findFirst({
        where: {
          id,
          organizationId,
          isActive: true
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          columns: {
            orderBy: { order: 'asc' },
            include: {
              cards: {
                orderBy: { order: 'asc' },
                include: {
                  contact: {
                    select: { id: true, name: true, phoneNumber: true, email: true }
                  },
                  conversation: {
                    select: { id: true, title: true, status: true }
                  },
                  campaign: {
                    select: { id: true, name: true, status: true }
                  },
                  createdBy: {
                    select: { id: true, name: true, email: true }
                  },
                  activities: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                      user: {
                        select: { id: true, name: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      return kanban;
    } catch (error) {
      logger.error('Erro ao obter kanban:', error);
      throw error;
    }
  }

  // Criar novo kanban
  async createKanban(data, organizationId, createdById) {
    try {
      const { name, description, color, columns } = data;

      const kanban = await prisma.kanban.create({
        data: {
          name,
          description,
          color,
          organizationId,
          createdById,
          columns: {
            create: columns.map((column, index) => ({
              name: column.name,
              color: column.color || '#6B7280',
              order: index
            }))
          }
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          columns: {
            orderBy: { order: 'asc' }
          }
        }
      });

      logger.info(`Kanban criado: ${kanban.name} (ID: ${kanban.id})`);
      return kanban;
    } catch (error) {
      logger.error('Erro ao criar kanban:', error);
      throw error;
    }
  }

  // Atualizar kanban
  async updateKanban(id, data, organizationId) {
    try {
      const { name, description, color, columns } = data;

      // Atualizar informações básicas do kanban
      const kanban = await prisma.kanban.update({
        where: {
          id,
          organizationId
        },
        data: {
          name,
          description,
          color
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          columns: {
            orderBy: { order: 'asc' }
          }
        }
      });

      // Se houver colunas para atualizar
      if (columns && columns.length > 0) {
        // Deletar colunas existentes
        await prisma.kanbanColumn.deleteMany({
          where: { kanbanId: id }
        });

        // Criar novas colunas
        await prisma.kanbanColumn.createMany({
          data: columns.map((column, index) => ({
            name: column.name,
            color: column.color || '#6B7280',
            order: index,
            kanbanId: id
          }))
        });
      }

      logger.info(`Kanban atualizado: ${kanban.name} (ID: ${kanban.id})`);
      return await this.getKanbanById(id, organizationId);
    } catch (error) {
      logger.error('Erro ao atualizar kanban:', error);
      throw error;
    }
  }

  // Deletar kanban
  async deleteKanban(id, organizationId) {
    try {
      const kanban = await prisma.kanban.update({
        where: {
          id,
          organizationId
        },
        data: {
          isActive: false
        }
      });

      logger.info(`Kanban deletado: ${kanban.name} (ID: ${kanban.id})`);
      return { message: 'Kanban deletado com sucesso' };
    } catch (error) {
      logger.error('Erro ao deletar kanban:', error);
      throw error;
    }
  }

  // Criar card no kanban
  async createCard(data, organizationId, createdById) {
    try {
      const { title, description, columnId, kanbanId, contactId, conversationId, campaignId } = data;

      // Verificar se o kanban pertence à organização
      const kanban = await prisma.kanban.findFirst({
        where: {
          id: kanbanId,
          organizationId,
          isActive: true
        }
      });

      if (!kanban) {
        throw new Error('Kanban não encontrado');
      }

      // Obter a ordem máxima dos cards na coluna
      const maxOrder = await prisma.kanbanCard.aggregate({
        where: { columnId },
        _max: { order: true }
      });

      const card = await prisma.kanbanCard.create({
        data: {
          title,
          description,
          order: (maxOrder._max.order || 0) + 1,
          columnId,
          kanbanId,
          contactId,
          conversationId,
          campaignId,
          createdById,
          activities: {
            create: {
              action: 'created',
              details: { title, description },
              userId: createdById
            }
          }
        },
        include: {
          contact: {
            select: { id: true, name: true, phoneNumber: true, email: true }
          },
          conversation: {
            select: { id: true, title: true, status: true }
          },
          campaign: {
            select: { id: true, name: true, status: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Executar ações automáticas para card criado
      try {
        await kanbanActionService.executeActionsForCard(card.id, 'ON_CARD_CREATE', organizationId);
      } catch (actionError) {
        logger.error('Erro ao executar ações automáticas para card criado:', actionError);
        // Não falhar a criação do card por causa de erro nas ações
      }

      logger.info(`Card criado: ${card.title} (ID: ${card.id})`);
      return card;
    } catch (error) {
      logger.error('Erro ao criar card:', error);
      throw error;
    }
  }

  // Mover card entre colunas
  async moveCard(cardId, newColumnId, organizationId, userId) {
    try {
      // Verificar se o card pertence à organização
      const card = await prisma.kanbanCard.findFirst({
        where: {
          id: cardId,
          kanban: {
            organizationId,
            isActive: true
          }
        },
        include: {
          column: true
        }
      });

      if (!card) {
        throw new Error('Card não encontrado');
      }

      // Obter a ordem máxima dos cards na nova coluna
      const maxOrder = await prisma.kanbanCard.aggregate({
        where: { columnId: newColumnId },
        _max: { order: true }
      });

      const updatedCard = await prisma.kanbanCard.update({
        where: { id: cardId },
        data: {
          columnId: newColumnId,
          order: (maxOrder._max.order || 0) + 1,
          activities: {
            create: {
              action: 'moved',
              details: {
                fromColumn: card.column.name,
                toColumn: newColumnId
              },
              userId
            }
          }
        },
        include: {
          contact: {
            select: { id: true, name: true, phoneNumber: true, email: true }
          },
          conversation: {
            select: { id: true, title: true, status: true }
          },
          campaign: {
            select: { id: true, name: true, status: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Executar ações automáticas
      try {
        // Ações quando card sai da coluna antiga
        await kanbanActionService.executeActionsForCard(cardId, 'ON_LEAVE_COLUMN', organizationId);
        
        // Ações quando card entra na nova coluna
        await kanbanActionService.executeActionsForCard(cardId, 'ON_ENTER_COLUMN', organizationId);
      } catch (actionError) {
        logger.error('Erro ao executar ações automáticas:', actionError);
        // Não falhar o movimento do card por causa de erro nas ações
      }

      logger.info(`Card movido: ${updatedCard.title} (ID: ${updatedCard.id})`);
      return updatedCard;
    } catch (error) {
      logger.error('Erro ao mover card:', error);
      throw error;
    }
  }

  // Atualizar card
  async updateCard(cardId, data, organizationId, userId) {
    try {
      const { title, description } = data;

      const card = await prisma.kanbanCard.update({
        where: {
          id: cardId,
          kanban: {
            organizationId,
            isActive: true
          }
        },
        data: {
          title,
          description,
          activities: {
            create: {
              action: 'updated',
              details: { title, description },
              userId
            }
          }
        },
        include: {
          contact: {
            select: { id: true, name: true, phoneNumber: true, email: true }
          },
          conversation: {
            select: { id: true, title: true, status: true }
          },
          campaign: {
            select: { id: true, name: true, status: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      logger.info(`Card atualizado: ${card.title} (ID: ${card.id})`);
      return card;
    } catch (error) {
      logger.error('Erro ao atualizar card:', error);
      throw error;
    }
  }

  // Deletar card
  async deleteCard(cardId, organizationId, userId) {
    try {
      const card = await prisma.kanbanCard.findFirst({
        where: {
          id: cardId,
          kanban: {
            organizationId,
            isActive: true
          }
        }
      });

      if (!card) {
        throw new Error('Card não encontrado');
      }

      await prisma.kanbanCard.delete({
        where: { id: cardId }
      });

      logger.info(`Card deletado: ${card.title} (ID: ${card.id})`);
      return { message: 'Card deletado com sucesso' };
    } catch (error) {
      logger.error('Erro ao deletar card:', error);
      throw error;
    }
  }

  // Obter estatísticas dos kanbans
  async getKanbanStats(organizationId) {
    try {
      const stats = await prisma.kanban.aggregate({
        where: {
          organizationId,
          isActive: true
        },
        _count: {
          id: true
        }
      });

      const totalCards = await prisma.kanbanCard.count({
        where: {
          kanban: {
            organizationId,
            isActive: true
          }
        }
      });

      const recentActivity = await prisma.kanbanCardActivity.findMany({
        where: {
          card: {
            kanban: {
              organizationId,
              isActive: true
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          card: {
            select: { title: true, kanban: { select: { name: true } } }
          },
          user: {
            select: { name: true }
          }
        }
      });

      return {
        totalKanbans: stats._count.id,
        totalCards,
        recentActivity
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas dos kanbans:', error);
      throw error;
    }
  }
}

module.exports = new KanbanService();
