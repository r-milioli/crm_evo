const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Webhook para receber eventos da Evolution API
router.post('/evolution/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const eventData = req.body;

    logger.info(`Webhook recebido para instância ${instanceName}:`, eventData);

    // Buscar instância
    const instance = await prisma.instance.findUnique({
      where: { instanceName }
    });

    if (!instance) {
      logger.error(`Instância ${instanceName} não encontrada`);
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    // Processar diferentes tipos de eventos
    const eventType = eventData.event;
    const data = eventData.data;

    switch (eventType) {
      case 'connection.update':
        await handleConnectionUpdate(instance, data);
        break;
      
      case 'messages.upsert':
        await handleMessageUpsert(instance, data);
        break;
      
      case 'messages.update':
        await handleMessageUpdate(instance, data);
        break;
      
      case 'contacts.update':
        await handleContactUpdate(instance, data);
        break;
      
      case 'groups.update':
        await handleGroupUpdate(instance, data);
        break;
      
      default:
        logger.info(`Evento não processado: ${eventType}`);
    }

    // Emitir evento via Socket.IO para atualização em tempo real
    const io = req.app.get('io');
    if (io) {
      io.to(`org-${instance.organizationId}`).emit('evolution-event', {
        instanceName,
        eventType,
        data
      });
    }

    res.json({ success: true });

  } catch (error) {
    logger.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Processar atualização de conexão
async function handleConnectionUpdate(instance, data) {
  try {
    const status = data.state;
    
    await prisma.instance.update({
      where: { id: instance.id },
      data: { 
        status,
        qrCode: status === 'CONNECTED' ? null : instance.qrCode
      }
    });

    logger.info(`Status da instância ${instance.instanceName} atualizado para ${status}`);

  } catch (error) {
    logger.error('Erro ao atualizar status da conexão:', error);
  }
}

// Processar mensagens recebidas/enviadas
async function handleMessageUpsert(instance, data) {
  try {
    const messageData = data.messages[0];
    const contactData = data.contacts[0];
    
    if (!messageData || !contactData) {
      return;
    }

    const phoneNumber = contactData.id.split('@')[0];
    const messageContent = messageData.message?.conversation || 
                          messageData.message?.extendedTextMessage?.text ||
                          messageData.message?.imageMessage?.caption ||
                          messageData.message?.videoMessage?.caption ||
                          messageData.message?.audioMessage?.caption ||
                          messageData.message?.documentMessage?.caption ||
                          '';

    // Determinar tipo de mensagem
    let messageType = 'TEXT';
    let mediaUrl = null;
    let mediaType = null;

    if (messageData.message?.imageMessage) {
      messageType = 'IMAGE';
      mediaUrl = messageData.message.imageMessage.url;
      mediaType = 'image';
    } else if (messageData.message?.videoMessage) {
      messageType = 'VIDEO';
      mediaUrl = messageData.message.videoMessage.url;
      mediaType = 'video';
    } else if (messageData.message?.audioMessage) {
      messageType = 'AUDIO';
      mediaUrl = messageData.message.audioMessage.url;
      mediaType = 'audio';
    } else if (messageData.message?.documentMessage) {
      messageType = 'DOCUMENT';
      mediaUrl = messageData.message.documentMessage.url;
      mediaType = 'document';
    }

    // Buscar ou criar contato
    let contact = await prisma.contact.findFirst({
      where: {
        phoneNumber,
        organizationId: instance.organizationId
      }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneNumber,
          name: contactData.name || contactData.pushName || `Contato ${phoneNumber}`,
          organizationId: instance.organizationId
        }
      });
    } else {
      // Atualizar último contato
      await prisma.contact.update({
        where: { id: contact.id },
        data: { lastInteraction: new Date() }
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
          organizationId: instance.organizationId,
          createdById: instance.organizationId // Usar ID da organização como criador
        }
      });
    }

    // Criar mensagem
    const message = await prisma.message.create({
      data: {
        content: messageContent,
        type: messageType,
        direction: 'INBOUND',
        status: 'DELIVERED',
        mediaUrl,
        mediaType,
        metadata: messageData,
        organizationId: instance.organizationId,
        conversationId: conversation.id,
        contactId: contact.id,
        instanceId: instance.id
      }
    });

    // Atualizar última mensagem da conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

    logger.info(`Mensagem processada: ${message.id} para conversa ${conversation.id}`);

  } catch (error) {
    logger.error('Erro ao processar mensagem:', error);
  }
}

// Processar atualização de mensagens (status de entrega/leitura)
async function handleMessageUpdate(instance, data) {
  try {
    const messageData = data.messages[0];
    
    if (!messageData) {
      return;
    }

    // Buscar mensagem pelo ID da Evolution API
    const message = await prisma.message.findFirst({
      where: {
        metadata: {
          path: ['key', 'id'],
          equals: messageData.key.id
        },
        instanceId: instance.id
      }
    });

    if (message) {
      let status = 'SENT';
      
      if (messageData.update.status === 'READ') {
        status = 'READ';
      } else if (messageData.update.status === 'DELIVERED_ACK') {
        status = 'DELIVERED';
      }

      await prisma.message.update({
        where: { id: message.id },
        data: { status }
      });

      logger.info(`Status da mensagem ${message.id} atualizado para ${status}`);
    }

  } catch (error) {
    logger.error('Erro ao atualizar status da mensagem:', error);
  }
}

// Processar atualização de contatos
async function handleContactUpdate(instance, data) {
  try {
    const contactData = data.contacts[0];
    
    if (!contactData) {
      return;
    }

    const phoneNumber = contactData.id.split('@')[0];

    // Atualizar contato existente
    await prisma.contact.updateMany({
      where: {
        phoneNumber,
        organizationId: instance.organizationId
      },
      data: {
        name: contactData.name || contactData.pushName,
        lastInteraction: new Date()
      }
    });

    logger.info(`Contato ${phoneNumber} atualizado`);

  } catch (error) {
    logger.error('Erro ao atualizar contato:', error);
  }
}

// Processar atualização de grupos
async function handleGroupUpdate(instance, data) {
  try {
    const groupData = data.groups[0];
    
    if (!groupData) {
      return;
    }

    logger.info(`Grupo ${groupData.id} atualizado: ${groupData.subject}`);

    // Aqui você pode implementar lógica específica para grupos
    // Por exemplo, criar contatos especiais para grupos

  } catch (error) {
    logger.error('Erro ao processar atualização de grupo:', error);
  }
}

// Webhook para testar conectividade
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Webhook funcionando',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
