const { io: createSocket } = require('socket.io-client');
const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const { getEvolutionConfig } = require('../utils/evolutionConfig');

// Reaproveita os handlers já usados pelo webhook para processar eventos
const webhookRoutes = require('../routes/webhooks');

class EvolutionSocketManager {
  constructor() {
    this.instanceSockets = new Map(); // instanceName -> socket
  }

  isConnected(instanceName) {
    const s = this.instanceSockets.get(instanceName);
    return !!(s && s.connected);
  }

  getStatus(instanceName) {
    const s = this.instanceSockets.get(instanceName);
    if (!s) return { connected: false };
    return { connected: s.connected, id: s.id, url: s.io?.uri };
  }

  async connectInstance(instanceName, organizationId, app) {
    const config = await getEvolutionConfig(organizationId);
    if (!config) throw new Error('Configuração da Evolution API não encontrada');

    const wsUrl = `${config.baseUrl.replace(/^http/, 'ws')}/${instanceName}`;
    if (this.isConnected(instanceName)) {
      logger.info(`WS já conectado para ${instanceName}`);
      return this.getStatus(instanceName);
    }

    logger.info(`Conectando ao WebSocket Evolution: ${wsUrl}`);

    const socket = createSocket(wsUrl, {
      transports: ['websocket'],
      extraHeaders: { apikey: config.apiKey }
    });

    this.instanceSockets.set(instanceName, socket);

    socket.on('connect', () => {
      logger.info(`WS Evolution conectado (${instanceName}) id=${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      logger.warn(`WS Evolution desconectado (${instanceName}) motivo=${reason}`);
    });

    // Encaminhar todos eventos recebidos ao nosso Socket.IO e processadores
    socket.onAny(async (event, data) => {
      try {
        const normalizedEvent = String(event).toUpperCase().replace(/\./g, '_');
        logger.info('WS Evolution evento recebido', {
          instanceName,
          event,
          normalizedEvent,
          hasData: !!data,
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
        });
        // Reemite para clientes do CRM
        const io = app.get('io');
        if (io) {
          io.to(`org-${organizationId}`).emit('evolution-event', {
            instanceName,
            eventType: normalizedEvent,
            data
          });
        }

        // Processa como se fosse webhook
        // Adaptar estrutura esperada pelo webhook
        const reqLike = { app };
        const resLike = { json: () => {} };
        const eventPayload = { event: normalizedEvent, data };

        // Chamadas internas aos handlers do webhook
        if (normalizedEvent === 'CONNECTION_UPDATE') {
          await webhookRoutes.handleConnectionUpdateInternal(instanceName, organizationId, eventPayload, app);
        } else if (normalizedEvent === 'MESSAGES_UPSERT') {
          await webhookRoutes.handleMessageUpsertInternal(instanceName, organizationId, eventPayload, app);
        } else if (normalizedEvent === 'MESSAGES_UPDATE') {
          await webhookRoutes.handleMessageUpdateInternal(instanceName, organizationId, eventPayload, app);
        } else if (normalizedEvent === 'CONTACTS_UPDATE') {
          await webhookRoutes.handleContactUpdateInternal(instanceName, organizationId, eventPayload, app);
        } else if (normalizedEvent === 'GROUP_UPDATE') {
          await webhookRoutes.handleGroupUpdateInternal(instanceName, organizationId, eventPayload, app);
        }
      } catch (err) {
        logger.error('Erro ao processar evento WS Evolution:', err);
      }
    });

    return new Promise((resolve) => {
      socket.once('connect', () => resolve(this.getStatus(instanceName)));
      setTimeout(() => resolve(this.getStatus(instanceName)), 3000);
    });
  }

  async disconnectInstance(instanceName) {
    const s = this.instanceSockets.get(instanceName);
    if (s) {
      s.disconnect();
      this.instanceSockets.delete(instanceName);
      logger.info(`WS Evolution desconectado e removido (${instanceName})`);
    }
    return { connected: false };
  }
}

module.exports = new EvolutionSocketManager();


