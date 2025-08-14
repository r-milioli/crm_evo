const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const webhookService = require('../services/webhookService');
const { requireRole } = require('../middleware/auth');


const router = express.Router();
const prisma = new PrismaClient();

// Webhook para receber eventos da Evolution API (rota pública)
router.post('/:instanceName', async (req, res) => {
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



// Configurar webhook para uma instância (rota protegida)
router.post('/configure/:instanceName', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { organizationId } = req.user;


    logger.info(`Configurando webhook para instância ${instanceName}`);

    // Verificar se a instância existe
    const instance = await prisma.instance.findFirst({
      where: {
        instanceName: instanceName,
        organizationId: organizationId
      }
    });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instância não encontrada'
      });
    }

    // Configurar webhook
    const result = await webhookService.configureWebhook(instanceName, organizationId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro ao configurar webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Verificar status do webhook de uma instância (rota protegida)
router.get('/status/:instanceName', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { organizationId } = req.user;

    logger.info(`Verificando status do webhook para instância ${instanceName}`);

    // Verificar status do webhook
    const status = await webhookService.checkWebhookStatus(instanceName, organizationId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Erro ao verificar status do webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
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
          createdById: null // Deixar null para webhooks automáticos
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

// Expor funções internas para reuso pelo WS Manager
module.exports = router;
module.exports.handleConnectionUpdateInternal = async function(instanceName, organizationId, payload, app){
  const prisma = new (require('@prisma/client').PrismaClient)();
  try {
    const instance = await prisma.instance.findFirst({ where: { instanceName, organizationId } });
    if (!instance) return;
    const status = payload?.data?.state || payload?.data?.connection?.state || payload?.data?.status;
    if (!status) return;
    await prisma.instance.update({ where: { id: instance.id }, data: { status, qrCode: status === 'CONNECTED' ? null : instance.qrCode } });
  } catch(err){ logger.error('handleConnectionUpdateInternal error:', err);} finally { await prisma.$disconnect(); }
};
module.exports.handleMessageUpsertInternal = async function(instanceName, organizationId, payload, app){
  const prisma = new (require('@prisma/client').PrismaClient)();
  try {
    const instance = await prisma.instance.findFirst({ where: { instanceName, organizationId } });
    if (!instance) return;
    const data = payload?.data || {};
    const messageData = data.messages?.[0] || data.message || data;
    if (!messageData) return;
    const remoteJid = messageData?.key?.remoteJid || data.remoteJid || data.chatId || data.jid;
    const phoneNumber = String(remoteJid || '').split('@')[0];
    if (!phoneNumber) return;
    const messageContent = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || messageData.message?.imageMessage?.caption || messageData.message?.videoMessage?.caption || messageData.message?.audioMessage?.caption || messageData.message?.documentMessage?.caption || messageData.conversation || '';
    let messageType = 'TEXT'; let mediaUrl = null; let mediaType = null;
    if (messageData.message?.imageMessage) { messageType = 'IMAGE'; mediaUrl = messageData.message.imageMessage.url; mediaType = 'image'; }
    else if (messageData.message?.videoMessage) { messageType = 'VIDEO'; mediaUrl = messageData.message.videoMessage.url; mediaType = 'video'; }
    else if (messageData.message?.audioMessage) { messageType = 'AUDIO'; mediaUrl = messageData.message.audioMessage.url; mediaType = 'audio'; }
    else if (messageData.message?.documentMessage) { messageType = 'DOCUMENT'; mediaUrl = messageData.message.documentMessage.url; mediaType = 'document'; }
    let contact = await prisma.contact.findFirst({ where: { phoneNumber, organizationId } });
    if (!contact) {
      const contactName = data.contacts?.[0]?.name || data.contacts?.[0]?.pushName || messageData.pushName || `Contato ${phoneNumber}`;
      contact = await prisma.contact.create({ data: { phoneNumber, name: contactName, organizationId } });
    } else {
      await prisma.contact.update({ where: { id: contact.id }, data: { lastInteraction: new Date() } });
    }
    let conversation = await prisma.conversation.findFirst({ where: { contactId: contact.id, instanceId: instance.id, status: { not: 'CLOSED' } } });
    if (!conversation) {
      conversation = await prisma.conversation.create({ data: { title: `Conversa com ${contact.name}`, contactId: contact.id, instanceId: instance.id, organizationId, createdById: null } });
    }
    await prisma.message.create({ data: { content: messageContent, type: messageType, direction: 'INBOUND', status: 'DELIVERED', mediaUrl, mediaType, metadata: messageData, organizationId, conversationId: conversation.id, contactId: contact.id, instanceId: instance.id } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  } catch(err){ logger.error('handleMessageUpsertInternal error:', err);} finally { await prisma.$disconnect(); }
};
module.exports.handleMessageUpdateInternal = async function(instanceName, organizationId, payload, app){
  const prisma = new (require('@prisma/client').PrismaClient)();
  try {
    const instance = await prisma.instance.findFirst({ where: { instanceName, organizationId } });
    if (!instance) return;
    const messageData = payload?.data?.messages?.[0] || payload?.data?.message || payload?.data;
    if (!messageData) return;
    const messageId = messageData?.key?.id || messageData?.id;
    if (!messageId) {
      // Sem ID não conseguimos correlacionar; ignorar silenciosamente
      return;
    }
    const message = await prisma.message.findFirst({
      where: {
        instanceId: instance.id,
        OR: [
          { metadata: { path: ['key','id'], equals: messageId } },
          { metadata: { path: ['id'], equals: messageId } }
        ]
      }
    });
    if (message) {
      let status = 'SENT';
      const updateStatus = messageData.update?.status || messageData.status;
      if (updateStatus === 'READ') status = 'READ';
      else if (updateStatus === 'DELIVERED_ACK' || updateStatus === 'DELIVERED') status = 'DELIVERED';
      await prisma.message.update({ where: { id: message.id }, data: { status } });
    }
  } catch(err){ logger.error('handleMessageUpdateInternal error:', err);} finally { await prisma.$disconnect(); }
};
module.exports.handleContactUpdateInternal = async function(instanceName, organizationId, payload, app){
  const prisma = new (require('@prisma/client').PrismaClient)();
  try {
    const instance = await prisma.instance.findFirst({ where: { instanceName, organizationId } });
    if (!instance) return;
    const contactData = payload?.data?.contacts?.[0];
    if (!contactData) return;
    const phoneNumber = String(contactData.id || '').split('@')[0];
    await prisma.contact.updateMany({ where: { phoneNumber, organizationId }, data: { name: contactData.name || contactData.pushName, lastInteraction: new Date() } });
  } catch(err){ logger.error('handleContactUpdateInternal error:', err);} finally { await prisma.$disconnect(); }
};
module.exports.handleGroupUpdateInternal = async function(instanceName, organizationId, payload, app){
  // Placeholder para futuros usos
};
