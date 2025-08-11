const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');
const { syncEvolutionChats, getEvolutionMessages, getEvolutionContacts, getEvolutionMessageStatus, syncEvolutionMessages } = require('../utils/evolutionConfig');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const conversationValidation = [
  body('title').optional().isLength({ max: 200 }).withMessage('Título deve ter no máximo 200 caracteres'),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'CLOSED', 'WAITING']).withMessage('Status inválido'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Prioridade inválida')
];

// Estatísticas das conversas
router.get('/stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const [
      total,
      open,
      inProgress,
      closed,
      waiting,
      urgent,
      assignedToMe,
      unread
    ] = await Promise.all([
      // Total de conversas
      prisma.conversation.count({
        where: { organizationId }
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

      // Conversas fechadas
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'CLOSED'
        }
      }),

      // Conversas aguardando
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'WAITING'
        }
      }),

      // Conversas urgentes
      prisma.conversation.count({
        where: {
          organizationId,
          priority: 'URGENT',
          status: { not: 'CLOSED' }
        }
      }),

      // Conversas atribuídas ao usuário atual
      prisma.conversation.count({
        where: {
          organizationId,
          assignedToId: req.user.id,
          status: { not: 'CLOSED' }
        }
      }),

      // Conversas com mensagens não lidas
      prisma.conversation.count({
        where: {
          organizationId,
          status: { not: 'CLOSED' },
          messages: {
            some: {
              direction: 'INBOUND',
              status: { not: 'READ' }
            }
          }
        }
      })
    ]);

    res.json({
      total,
      open,
      inProgress,
      closed,
      waiting,
      urgent,
      assignedToMe,
      unread
    });

  } catch (error) {
    logger.error('Erro ao buscar estatísticas das conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

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
      if (assignedTo === 'unassigned') {
        where.assignedToId = null;
      } else {
      where.assignedToId = assignedTo;
      }
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
        orderBy: [
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' }
        ],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          tags: true,
          notes: true,
          externalId: true,
          metadata: true,
          lastMessageAt: true,
          createdAt: true,
          updatedAt: true,
          contact: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              email: true,
              company: true
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
      data: filteredConversations,
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
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        tags: true,
        notes: true,
        externalId: true,
        metadata: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
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

// Buscar mensagens de uma conversa
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const organizationId = req.user.organizationId;
    const skip = (page - 1) * limit;

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

    // Buscar mensagens
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversationId: id
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sentBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.message.count({
        where: {
          conversationId: id
        }
      })
    ]);

    res.json({
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar mensagens:', error);
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

// Assumir conversa (auto-atribuição)
router.post('/:id/assign', async (req, res) => {
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

    // Verificar se a conversa já está atribuída
    if (conversation.assignedToId) {
      return res.status(400).json({ error: 'Conversa já está atribuída a outro operador' });
    }

    // Atribuir conversa ao usuário atual
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { 
        assignedToId: req.user.id,
        status: 'IN_PROGRESS'
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

    logger.info(`Conversa ${id} assumida por ${req.user.email}`);

    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao assumir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Transferir conversa
router.post('/:id/transfer', async (req, res) => {
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

    // Transferir conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { 
        assignedToId,
        status: assignedToId ? 'IN_PROGRESS' : 'OPEN'
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

    logger.info(`Conversa ${id} transferida para ${assignedToId || 'ninguém'} por ${req.user.email}`);

    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao transferir conversa:', error);
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
      data: { status: 'CLOSED' },
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

    logger.info(`Conversa ${id} fechada por ${req.user.email}`);

    res.json(updatedConversation);

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
      data: { status: 'OPEN' },
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

    logger.info(`Conversa ${id} reaberta por ${req.user.email}`);

    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao reabrir conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar mensagens como lidas
router.post('/:id/read', async (req, res) => {
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

    // Marcar mensagens como lidas
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        direction: 'INBOUND',
        status: { not: 'READ' }
      },
      data: {
        status: 'READ'
      }
    });

    logger.info(`Mensagens da conversa ${id} marcadas como lidas por ${req.user.email}`);

    res.json({ message: 'Mensagens marcadas como lidas' });

  } catch (error) {
    logger.error('Erro ao marcar mensagens como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar tag à conversa
router.post('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
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

    // Adicionar tag
    const currentTags = conversation.tags || [];
    if (!currentTags.includes(tag)) {
      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          tags: [...currentTags, tag]
        }
      });

      logger.info(`Tag "${tag}" adicionada à conversa ${id} por ${req.user.email}`);
      res.json(updatedConversation);
    } else {
      res.json(conversation);
    }

  } catch (error) {
    logger.error('Erro ao adicionar tag:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover tag da conversa
router.delete('/:id/tags/:tag', async (req, res) => {
  try {
    const { id, tag } = req.params;
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

    // Remover tag
    const currentTags = conversation.tags || [];
    const updatedTags = currentTags.filter(t => t !== tag);

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        tags: updatedTags
      }
    });

    logger.info(`Tag "${tag}" removida da conversa ${id} por ${req.user.email}`);
    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao remover tag:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar observação à conversa
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
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

    // Atualizar observação
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        notes: note
      }
    });

    logger.info(`Observação adicionada à conversa ${id} por ${req.user.email}`);
    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao adicionar observação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Arquivar conversa
router.post('/:id/archive', async (req, res) => {
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

    // Arquivar conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { 
        status: 'ARCHIVED'
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

    logger.info(`Conversa ${id} arquivada por ${req.user.email}`);
    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao arquivar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Desarquivar conversa
router.post('/:id/unarchive', async (req, res) => {
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

    // Desarquivar conversa
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: { 
        status: 'OPEN'
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

    logger.info(`Conversa ${id} desarquivada por ${req.user.email}`);
    res.json(updatedConversation);

  } catch (error) {
    logger.error('Erro ao desarquivar conversa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversas arquivadas
router.get('/archived', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const organizationId = req.user.organizationId;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          organizationId,
          status: 'ARCHIVED'
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
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
      }),
      prisma.conversation.count({
        where: {
          organizationId,
          status: 'ARCHIVED'
        }
      })
    ]);

    res.json({
      data: conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar conversas arquivadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversas urgentes
router.get('/urgent', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const conversations = await prisma.conversation.findMany({
        where: {
          organizationId,
        priority: 'URGENT',
        status: { not: 'CLOSED' }
      },
      orderBy: { createdAt: 'asc' },
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

    res.json(conversations);

  } catch (error) {
    logger.error('Erro ao buscar conversas urgentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversas não lidas
router.get('/unread', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const conversations = await prisma.conversation.findMany({
        where: {
          organizationId,
        status: { not: 'CLOSED' }
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
        },
        messages: {
          where: {
            direction: 'INBOUND',
            status: { not: 'READ' }
          }
        }
      }
    });

    // Filtrar apenas conversas com mensagens não lidas
    const unreadConversations = conversations.filter(conv => conv.messages.length > 0);

    res.json(unreadConversations);

  } catch (error) {
    logger.error('Erro ao buscar conversas não lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar conversas do usuário atual
router.get('/my', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const conversations = await prisma.conversation.findMany({
        where: {
          organizationId,
        assignedToId: req.user.id,
        status: { not: 'CLOSED' }
        },
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
        }
      }
    });

    res.json(conversations);

  } catch (error) {
    logger.error('Erro ao buscar conversas do usuário:', error);
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

// Rota para sincronizar chats da Evolution API
router.post('/sync-evolution/:instanceId', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se a instância existe
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Sincronizar chats usando o instanceName
    const result = await syncEvolutionChats(organizationId, instance.instanceName);

    if (result.success) {
      res.json({
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        error: result.message
      });
    }

  } catch (error) {
    logger.error('Erro ao sincronizar chats da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar mensagens de um chat específico da Evolution API
router.get('/evolution-messages/:instanceId/:chatId', requireRole(['ADMIN', 'MANAGER', 'OPERATOR']), async (req, res) => {
  try {
    const { instanceId, chatId } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se a instância existe
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Buscar mensagens usando o instanceName
    const result = await getEvolutionMessages(organizationId, instance.instanceName, chatId);

    if (result.success) {
      res.json({
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        error: result.message
      });
    }

  } catch (error) {
    logger.error('Erro ao buscar mensagens da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar contatos da Evolution API
router.post('/evolution-contacts/:instanceId', requireRole(['ADMIN', 'MANAGER', 'OPERATOR']), async (req, res) => {
  try {
    const { instanceId } = req.params;
    const organizationId = req.user.organizationId;

    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, organizationId: organizationId }
    });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    const result = await getEvolutionContacts(organizationId, instance.instanceName);
    
    if (result.success) {
      res.json({ 
        success: true,
        message: result.message, 
        data: result.data 
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: result.message 
      });
    }
  } catch (error) {
    logger.error('Erro ao buscar contatos da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para sincronizar mensagens de uma conversa da Evolution API
router.post('/:conversationId/sync-messages', requireRole(['ADMIN', 'MANAGER', 'OPERATOR']), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { remoteJid } = req.body;
    const organizationId = req.user.organizationId;

    if (!remoteJid) {
      return res.status(400).json({ error: 'Remote JID é obrigatório' });
    }

    // Buscar a conversa para obter a instância
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id: conversationId, 
        organizationId: organizationId 
      },
      include: {
        instance: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    const result = await syncEvolutionMessages(
      organizationId, 
      conversation.instance.instanceName, 
      conversationId, 
      remoteJid
    );

    if (result.success) {
      res.json({ 
        success: true,
        message: result.message, 
        data: result.data 
      });
    } else {
      res.status(400).json({ 
        success: false,
        error: result.message 
      });
    }
  } catch (error) {
    logger.error('Erro ao sincronizar mensagens da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar status de uma mensagem específica da Evolution API
router.post('/evolution-message-status/:instanceId/:remoteJid/:messageId', requireRole(['ADMIN', 'MANAGER', 'OPERATOR']), async (req, res) => {
  try {
    const { instanceId, remoteJid, messageId } = req.params;
    const organizationId = req.user.organizationId;

    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, organizationId: organizationId }
    });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    const result = await getEvolutionMessageStatus(organizationId, instance.instanceName, remoteJid, messageId);
    if (result.success) res.json({ message: result.message, data: result.data });
    else res.status(400).json({ error: result.message });
  } catch (error) {
    logger.error('Erro ao buscar status da mensagem da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
