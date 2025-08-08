const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Dashboard principal - métricas gerais
router.get('/metrics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const organizationId = req.user.organizationId;

    // Calcular datas baseado no período
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
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Buscar métricas em paralelo
    const [
      totalMessages,
      totalConversations,
      totalContacts,
      connectedInstances,
      totalInstances,
      messagesToday,
      conversationsToday,
      newContactsToday,
      messagesByDirection,
      conversationsByStatus,
      topContacts,
      operatorPerformance
    ] = await Promise.all([
      // Total de mensagens no período
      prisma.message.count({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        }
      }),

      // Total de conversas no período
      prisma.conversation.count({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        }
      }),

      // Total de contatos
      prisma.contact.count({
        where: {
          organizationId,
          isActive: true
        }
      }),

      // Instâncias conectadas
      prisma.instance.count({
        where: {
          organizationId,
          status: 'CONNECTED'
        }
      }),

      // Total de instâncias
      prisma.instance.count({
        where: { organizationId }
      }),

      // Mensagens hoje
      prisma.message.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      }),

      // Conversas hoje
      prisma.conversation.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      }),

      // Novos contatos hoje
      prisma.contact.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      }),

      // Mensagens por direção
      prisma.message.groupBy({
        by: ['direction'],
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
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

      // Top contatos mais ativos
      prisma.contact.findMany({
        where: {
          organizationId,
          isActive: true
        },
        include: {
          _count: {
            select: {
              messages: {
                where: {
                  createdAt: { gte: startDate }
                }
              }
            }
          }
        },
        orderBy: {
          messages: {
            _count: 'desc'
          }
        },
        take: 10
      }),

      // Performance dos operadores
      prisma.user.findMany({
        where: {
          organizationId,
          isActive: true,
          role: { in: ['OPERATOR', 'ADMIN'] }
        },
        include: {
          _count: {
            select: {
              assignedConversations: {
                where: {
                  createdAt: { gte: startDate }
                }
              },
              messages: {
                where: {
                  createdAt: { gte: startDate },
                  direction: 'OUTBOUND'
                }
              }
            }
          }
        }
      })
    ]);

    // Processar dados de mensagens por direção
    const messagesByDirectionData = {
      inbound: messagesByDirection.find(m => m.direction === 'INBOUND')?._count.id || 0,
      outbound: messagesByDirection.find(m => m.direction === 'OUTBOUND')?._count.id || 0
    };

    // Processar dados de conversas por status
    const conversationsByStatusData = {
      open: conversationsByStatus.find(c => c.status === 'OPEN')?._count.id || 0,
      inProgress: conversationsByStatus.find(c => c.status === 'IN_PROGRESS')?._count.id || 0,
      closed: conversationsByStatus.find(c => c.status === 'CLOSED')?._count.id || 0,
      waiting: conversationsByStatus.find(c => c.status === 'WAITING')?._count.id || 0
    };

    // Processar performance dos operadores
    const operatorPerformanceData = operatorPerformance.map(op => ({
      id: op.id,
      name: op.name,
      email: op.email,
      role: op.role,
      conversationsHandled: op._count.assignedConversations,
      messagesSent: op._count.messages
    }));

    res.json({
      period,
      metrics: {
        totalMessages,
        totalConversations,
        totalContacts,
        connectedInstances,
        totalInstances,
        messagesToday,
        conversationsToday,
        newContactsToday,
        messagesByDirection: messagesByDirectionData,
        conversationsByStatus: conversationsByStatusData,
        topContacts: topContacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          messageCount: contact._count.messages
        })),
        operatorPerformance: operatorPerformanceData
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar métricas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gráfico de mensagens por período
router.get('/messages-chart', async (req, res) => {
  try {
    const { period = '7d', groupBy = 'day' } = req.query;
    const organizationId = req.user.organizationId;

    // Calcular datas
    const now = new Date();
    let startDate;
    let interval;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        interval = 'hour';
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        interval = 'week';
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
    }

    // Buscar mensagens agrupadas por período
    const messages = await prisma.message.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        direction: true,
        type: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Processar dados para o gráfico
    const chartData = processMessagesForChart(messages, interval, startDate, now);

    res.json({
      period,
      interval,
      data: chartData
    });

  } catch (error) {
    logger.error('Erro ao buscar dados do gráfico de mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gráfico de conversas por período
router.get('/conversations-chart', async (req, res) => {
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
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Buscar conversas agrupadas por período
    const conversations = await prisma.conversation.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        status: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Processar dados para o gráfico
    const chartData = processConversationsForChart(conversations, startDate, now);

    res.json({
      period,
      data: chartData
    });

  } catch (error) {
    logger.error('Erro ao buscar dados do gráfico de conversas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Status das instâncias
router.get('/instances-status', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const instances = await prisma.instance.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        instanceName: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
            messages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      instances: instances.map(instance => ({
        id: instance.id,
        name: instance.name,
        instanceName: instance.instanceName,
        status: instance.status,
        createdAt: instance.createdAt,
        conversationsCount: instance._count.conversations,
        messagesCount: instance._count.messages
      }))
    });

  } catch (error) {
    logger.error('Erro ao buscar status das instâncias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Performance dos operadores
router.get('/operator-performance', async (req, res) => {
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

    const operators = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { in: ['OPERATOR', 'ADMIN'] }
      },
      include: {
        _count: {
          select: {
            assignedConversations: {
              where: {
                createdAt: { gte: startDate }
              }
            },
            messages: {
              where: {
                createdAt: { gte: startDate },
                direction: 'OUTBOUND'
              }
            }
          }
        },
        assignedConversations: {
          where: {
            createdAt: { gte: startDate }
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });

    const performanceData = operators.map(operator => {
      const conversations = operator.assignedConversations;
      let totalResponseTime = 0;
      let responseCount = 0;

      // Calcular tempo médio de resposta
      conversations.forEach(conversation => {
        const messages = conversation.messages;
        for (let i = 0; i < messages.length - 1; i++) {
          if (messages[i].direction === 'INBOUND' && messages[i + 1].direction === 'OUTBOUND') {
            const responseTime = messages[i + 1].createdAt.getTime() - messages[i].createdAt.getTime();
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      });

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

      return {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: operator.role,
        conversationsHandled: operator._count.assignedConversations,
        messagesSent: operator._count.messages,
        avgResponseTime: Math.round(avgResponseTime / 1000), // em segundos
        responseCount
      };
    });

    res.json({
      period,
      operators: performanceData
    });

  } catch (error) {
    logger.error('Erro ao buscar performance dos operadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para processar mensagens para gráfico
function processMessagesForChart(messages, interval, startDate, endDate) {
  const data = {};
  
  // Inicializar períodos
  let current = new Date(startDate);
  while (current <= endDate) {
    const key = formatDateKey(current, interval);
    data[key] = {
      date: key,
      inbound: 0,
      outbound: 0,
      total: 0
    };
    
    if (interval === 'hour') {
      current.setHours(current.getHours() + 1);
    } else if (interval === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (interval === 'week') {
      current.setDate(current.getDate() + 7);
    }
  }

  // Contar mensagens por período
  messages.forEach(message => {
    const key = formatDateKey(message.createdAt, interval);
    if (data[key]) {
      if (message.direction === 'INBOUND') {
        data[key].inbound++;
      } else {
        data[key].outbound++;
      }
      data[key].total++;
    }
  });

  return Object.values(data);
}

// Função auxiliar para processar conversas para gráfico
function processConversationsForChart(conversations, startDate, endDate) {
  const data = {};
  
  // Inicializar períodos diários
  let current = new Date(startDate);
  while (current <= endDate) {
    const key = formatDateKey(current, 'day');
    data[key] = {
      date: key,
      open: 0,
      inProgress: 0,
      closed: 0,
      waiting: 0,
      total: 0
    };
    current.setDate(current.getDate() + 1);
  }

  // Contar conversas por período
  conversations.forEach(conversation => {
    const key = formatDateKey(conversation.createdAt, 'day');
    if (data[key]) {
      data[key][conversation.status.toLowerCase()]++;
      data[key].total++;
    }
  });

  return Object.values(data);
}

// Função auxiliar para formatar chave de data
function formatDateKey(date, interval) {
  if (interval === 'hour') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
  } else if (interval === 'day') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } else if (interval === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  }
  return date.toISOString().split('T')[0];
}

module.exports = router;
