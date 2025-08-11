const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');
const { getEvolutionConfig } = require('../utils/evolutionConfig');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const sendMessageValidation = [
  body('phoneNumber').notEmpty().withMessage('Número de telefone é obrigatório'),
  body('content').isLength({ min: 1, max: 4096 }).withMessage('Mensagem deve ter entre 1 e 4096 caracteres'),
  body('type').isIn(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT']).withMessage('Tipo de mensagem inválido')
];

// Enviar mensagem
router.post('/send', sendMessageValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { phoneNumber, content, type, instanceId, conversationId, mediaUrl } = req.body;

    // Verificar se a instância existe e está conectada
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        organizationId: req.user.organizationId,
        status: 'CONNECTED'
      }
    });

    if (!instance) {
      return res.status(400).json({ 
        error: 'Instância não encontrada ou não conectada' 
      });
    }

    // Buscar ou criar contato
    let contact = await prisma.contact.findFirst({
      where: {
        phoneNumber,
        organizationId: req.user.organizationId
      }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneNumber,
          name: `Contato ${phoneNumber}`,
          organizationId: req.user.organizationId
        }
      });
    }

    // Buscar ou criar conversa
    let conversation = conversationId ? 
      await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          organizationId: req.user.organizationId
        }
      }) : null;

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          contactId: contact.id,
          instanceId: instance.id,
          status: { not: 'CLOSED' }
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            title: `Conversa com ${contact.name}`,
            contactId: contact.id,
            instanceId: instance.id,
            organizationId: req.user.organizationId,
            createdById: req.user.id
          }
        });
      }
    }

    // Preparar payload para Evolution API
    let evolutionPayload = {
      number: phoneNumber,
      options: {
        delay: 1200,
        presence: 'composing'
      }
    };

    // Configurar payload baseado no tipo de mensagem
    switch (type) {
      case 'TEXT':
        evolutionPayload.textMessage = { text: content };
        break;
      
      case 'IMAGE':
        evolutionPayload.mediaMessage = {
          mediatype: 'image',
          media: mediaUrl,
          caption: content
        };
        break;
      
      case 'AUDIO':
        evolutionPayload.mediaMessage = {
          mediatype: 'audio',
          media: mediaUrl
        };
        break;
      
      case 'VIDEO':
        evolutionPayload.mediaMessage = {
          mediatype: 'video',
          media: mediaUrl,
          caption: content
        };
        break;
      
      case 'DOCUMENT':
        evolutionPayload.mediaMessage = {
          mediatype: 'document',
          media: mediaUrl,
          caption: content
        };
        break;
      
      default:
        evolutionPayload.textMessage = { text: content };
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Enviar mensagem via Evolution API
    let evolutionResponse;
    try {
      evolutionResponse = await axios.post(
        `${evolutionConfig.baseUrl}/message/sendText/${instance.instanceName}`,
        {
          number: phoneNumber + '@s.whatsapp.net',
          text: content
        },
        {
          headers: {
            'apikey': evolutionConfig.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (evolutionResponse.data.error) {
        throw new Error(evolutionResponse.data.error);
      }

    } catch (evolutionError) {
      logger.error('Erro ao enviar mensagem via Evolution API:', evolutionError);
      return res.status(500).json({ 
        error: 'Erro ao enviar mensagem via WhatsApp' 
      });
    }

    // Salvar mensagem no banco
    const message = await prisma.message.create({
      data: {
        content,
        type,
        direction: 'OUTBOUND',
        status: 'SENT',
        mediaUrl,
        metadata: evolutionResponse.data,
        organizationId: req.user.organizationId,
        conversationId: conversation.id,
        contactId: contact.id,
        instanceId: instance.id,
        sentById: req.user.id
      }
    });

    // Atualizar última mensagem da conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

    logger.info(`Mensagem enviada: ${message.id} para ${phoneNumber}`);

    res.json({
      message: 'Mensagem enviada com sucesso',
      messageId: message.id,
      conversationId: conversation.id
    });

  } catch (error) {
    logger.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar mensagens de uma conversa
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Verificar se a conversa pertence à organização
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: req.user.organizationId
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversationId,
          organizationId: req.user.organizationId
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'asc' },
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
          conversationId,
          organizationId: req.user.organizationId
        }
      })
    ]);

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao listar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar mensagem por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      include: {
        conversation: {
          include: {
            contact: true
          }
        },
        sentBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    res.json(message);

  } catch (error) {
    logger.error('Erro ao buscar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem em massa
router.post('/bulk', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { phoneNumbers, content, type, instanceId, mediaUrl } = req.body;

    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ 
        error: 'Lista de números de telefone inválida' 
      });
    }

    if (phoneNumbers.length > 100) {
      return res.status(400).json({ 
        error: 'Máximo de 100 números por envio em massa' 
      });
    }

    // Verificar se a Evolution API está configurada
    const evolutionConfig = await getEvolutionConfig(req.user.organizationId);
    if (!evolutionConfig) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada. Configure primeiro nas configurações do sistema.' 
      });
    }

    // Verificar se a instância existe e está conectada
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        organizationId: req.user.organizationId,
        status: 'CONNECTED'
      }
    });

    if (!instance) {
      return res.status(400).json({ 
        error: 'Instância não encontrada ou não conectada' 
      });
    }

    const results = [];
    const errors = [];

    // Enviar mensagens com delay para evitar spam
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];
      
      try {
        // Aguardar 2 segundos entre mensagens
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Buscar ou criar contato
        let contact = await prisma.contact.findFirst({
          where: {
            phoneNumber,
            organizationId: req.user.organizationId
          }
        });

        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              phoneNumber,
              name: `Contato ${phoneNumber}`,
              organizationId: req.user.organizationId
            }
          });
        }

        // Buscar ou criar conversa
        let conversation = await prisma.conversation.findFirst({
          where: {
            contactId: contact.id,
            instanceId: instance.id,
            status: { not: 'CLOSED' }
          }
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              title: `Conversa com ${contact.name}`,
              contactId: contact.id,
              instanceId: instance.id,
              organizationId: req.user.organizationId,
              createdById: req.user.id
            }
          });
        }

        // Preparar payload para Evolution API
        let evolutionPayload = {
          number: phoneNumber,
          options: {
            delay: 1200,
            presence: 'composing'
          }
        };

        if (type === 'TEXT') {
          evolutionPayload.textMessage = { text: content };
        } else {
          evolutionPayload.mediaMessage = {
            mediatype: type.toLowerCase(),
            media: mediaUrl,
            caption: content
          };
        }

        // Enviar via Evolution API
        const evolutionResponse = await axios.post(
          `${evolutionConfig.baseUrl}/message/sendText/${instance.instanceName}`,
          evolutionPayload,
          {
            headers: {
              'apikey': evolutionConfig.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        if (evolutionResponse.data.error) {
          throw new Error(evolutionResponse.data.error);
        }

        // Salvar mensagem
        const message = await prisma.message.create({
          data: {
            content,
            type,
            direction: 'OUTBOUND',
            status: 'SENT',
            mediaUrl,
            metadata: evolutionResponse.data,
            organizationId: req.user.organizationId,
            conversationId: conversation.id,
            contactId: contact.id,
            instanceId: instance.id,
            sentById: req.user.id
          }
        });

        results.push({
          phoneNumber,
          success: true,
          messageId: message.id
        });

      } catch (error) {
        errors.push({
          phoneNumber,
          error: error.message
        });
      }
    }

    logger.info(`Envio em massa concluído: ${results.length} sucessos, ${errors.length} erros`);

    res.json({
      message: 'Envio em massa concluído',
      results,
      errors,
      summary: {
        total: phoneNumbers.length,
        success: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    logger.error('Erro no envio em massa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Agendar mensagem
router.post('/schedule', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { phoneNumber, content, type, instanceId, scheduledAt, mediaUrl } = req.body;

    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      return res.status(400).json({ 
        error: 'Data de agendamento deve ser futura' 
      });
    }

    // Verificar se a instância existe
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        organizationId: req.user.organizationId
      }
    });

    if (!instance) {
      return res.status(400).json({ 
        error: 'Instância não encontrada' 
      });
    }

    // Buscar ou criar contato
    let contact = await prisma.contact.findFirst({
      where: {
        phoneNumber,
        organizationId: req.user.organizationId
      }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneNumber,
          name: `Contato ${phoneNumber}`,
          organizationId: req.user.organizationId
        }
      });
    }

    // Criar mensagem agendada
    const scheduledMessage = await prisma.message.create({
      data: {
        content,
        type,
        direction: 'OUTBOUND',
        status: 'PENDING',
        mediaUrl,
        metadata: { scheduledAt },
        organizationId: req.user.organizationId,
        contactId: contact.id,
        instanceId: instance.id,
        sentById: req.user.id
      }
    });

    // Aqui você pode implementar um sistema de agendamento (cron job)
    // Para simplificar, vamos apenas salvar a mensagem

    logger.info(`Mensagem agendada: ${scheduledMessage.id} para ${scheduledAt}`);

    res.json({
      message: 'Mensagem agendada com sucesso',
      messageId: scheduledMessage.id,
      scheduledAt
    });

  } catch (error) {
    logger.error('Erro ao agendar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
