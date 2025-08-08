const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const conversationValidation = [
  body('title').optional().isLength({ max: 200 }).withMessage('Título deve ter no máximo 200 caracteres'),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'CLOSED', 'WAITING']).withMessage('Status inválido'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Prioridade inválida')
];

// Listar conversas
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      assignedTo, 
      search,
      instanceId 
    } = req.query;
    
    const skip = (page - 1) * limit;
    const organizationId = req.user.organizationId;

    // Construir filtros
    const where = {
      organizationId
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    if (instanceId) {
      where.instanceId = instanceId;
    }

    // Buscar conversas
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          instance: {
            select: {
              id: true,
              name: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        }
      }),
      prisma.conversation.count({ where })
    ]);

    // Filtrar por busca se necessário
    let filteredConversations = conversations;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredConversations = conversations.filter(conv => 
        conv.title?.toLowerCase().includes(searchLower) ||
        conv.contact.name?.toLowerCase().includes(searchLower) ||
        conv.contact.phoneNumber.includes(search)
      );
    }

    res.json({
      conversations: filteredConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao listar conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversa por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
            company: true,
            tags: true,
            notes: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            sentBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    res.json(conversation);

  } catch (error) {
    logger.error('Erro ao buscar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova conversa
router.post('/', conversationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { 
      title, 
      contactId, 
      instanceId, 
      priority = 'MEDIUM',
      tags = [],
      notes 
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar se o contato existe
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    // Verificar se a instância existe
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        organizationId
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Criar conversa
    const conversation = await prisma.conversation.create({
      data: {
        title: title || `Conversa com ${contact.name}`,
        priority,
        tags,
        notes,
        organizationId,
        contactId,
        instanceId,
        createdById: req.user.id
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Conversa criada: ${conversation.id} por ${req.user.email}`);

    res.status(201).json({
      message: 'Conversa criada com sucesso',
      conversation
    });

  } catch (error) {
    logger.error('Erro ao criar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar conversa
router.put('/:id', conversationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { 
      title, 
      status, 
      priority, 
      assignedToId, 
      tags, 
      notes 
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar se a conversa existe
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingConversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Verificar se o usuário atribuído existe (se fornecido)
    if (assignedToId) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: assignedToId,
          organizationId
        }
      });

      if (!assignedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
    }

    // Atualizar conversa
    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        title,
        status,
        priority,
        assignedToId,
        tags,
        notes
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        },
        instance: {
          select: {
            id: true,
            name: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info(`Conversa atualizada: ${conversation.id} por ${req.user.email}`);

    res.json({
      message: 'Conversa atualizada com sucesso',
      conversation
    });

  } catch (error) {
    logger.error('Erro ao atualizar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atribuir conversa a um operador
router.post('/:id/assign', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar se a conversa existe
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Verificar se o usuário existe
    if (assignedToId) {
      const user = await prisma.user.findFirst({
        where: {
          id: assignedToId,
          organizationId,
          role: { in: ['OPERATOR', 'ADMIN'] }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Operador não encontrado' });
      }
    }

    // Atualizar atribuição
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { 
        assignedToId,
        status: assignedToId ? 'IN_PROGRESS' : 'OPEN'
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info(`Conversa ${id} atribuída a ${assignedToId || 'ninguém'} por ${req.user.email}`);

    res.json({
      message: 'Conversa atribuída com sucesso',
      conversation: updatedConversation
    });

  } catch (error) {
    logger.error('Erro ao atribuir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Fechar conversa
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se a conversa existe
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Verificar se o usuário pode fechar a conversa
    if (conversation.assignedToId && conversation.assignedToId !== req.user.id) {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Sem permissão para fechar esta conversa' });
      }
    }

    // Fechar conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED' }
    });

    logger.info(`Conversa ${id} fechada por ${req.user.email}`);

    res.json({
      message: 'Conversa fechada com sucesso',
      conversation: updatedConversation
    });

  } catch (error) {
    logger.error('Erro ao fechar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reabrir conversa
router.post('/:id/reopen', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se a conversa existe
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Reabrir conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'OPEN' }
    });

    logger.info(`Conversa ${id} reaberta por ${req.user.email}`);

    res.json({
      message: 'Conversa reaberta com sucesso',
      conversation: updatedConversation
    });

  } catch (error) {
    logger.error('Erro ao reabrir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir conversa
router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se a conversa existe
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    // Excluir conversa (cascade irá excluir mensagens)
    await prisma.conversation.delete({
      where: { id }
    });

    logger.info(`Conversa ${id} excluída por ${req.user.email}`);

    res.json({
      message: 'Conversa excluída com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas das conversas
router.get('/stats/overview', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const organizationId = req.user.organizationId;

    // Calcular datas
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [
      totalConversations,
      openConversations,
      inProgressConversations,
      closedConversations,
      waitingConversations,
      conversationsByStatus,
      conversationsByPriority,
      avgResponseTime
    ] = await Promise.all([
      // Total de conversas no período
      prisma.conversation.count({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        }
      }),

      // Conversas abertas
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'OPEN'
        }
      }),

      // Conversas em andamento
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'IN_PROGRESS'
        }
      }),

      // Conversas fechadas no período
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'CLOSED',
          updatedAt: { gte: startDate }
        }
      }),

      // Conversas aguardando
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'WAITING'
        }
      }),

      // Conversas por status
      prisma.conversation.groupBy({
        by: ['status'],
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),

      // Conversas por prioridade
      prisma.conversation.groupBy({
        by: ['priority'],
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),

      // Tempo médio de resposta (simplificado)
      prisma.conversation.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate },
          status: 'CLOSED'
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    ]);

    // Calcular tempo médio de resposta
    let totalResponseTime = 0;
    let responseCount = 0;

    avgResponseTime.forEach(conversation => {
      const messages = conversation.messages;
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].direction === 'INBOUND' && messages[i + 1].direction === 'OUTBOUND') {
          const responseTime = messages[i + 1].createdAt.getTime() - messages[i].createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });

    const averageResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;

    res.json({
      period,
      stats: {
        totalConversations,
        openConversations,
        inProgressConversations,
        closedConversations,
        waitingConversations,
        conversationsByStatus: conversationsByStatus.reduce((acc, item) => {
          acc[item.status.toLowerCase()] = item._count.id;
          return acc;
        }, {}),
        conversationsByPriority: conversationsByPriority.reduce((acc, item) => {
          acc[item.priority.toLowerCase()] = item._count.id;
          return acc;
        }, {}),
        averageResponseTime // em segundos
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar estatísticas das conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
