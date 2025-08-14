const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const websocketService = require('../services/websocketService');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const evolutionSocketManager = require('../services/evolutionSocketManager');

// Configurar WebSocket da Evolution para uma instância (rota protegida)
router.post('/configure/:instanceName', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { organizationId } = req.user;

    logger.info(`Solicitação para configurar WebSocket para ${instanceName}`);

    // Verificar se a instância existe e pertence à organização
    const instance = await prisma.instance.findFirst({
      where: { instanceName, organizationId }
    });

    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    // Habilitar WS na Evolution API (server Evolution)
    const result = await websocketService.configureWebsocket(instanceName, organizationId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Conectar nosso backend diretamente ao WS da Evolution e reemitir eventos
    const status = await evolutionSocketManager.connectInstance(instanceName, organizationId, req.app);

    res.json({ success: true, data: { evolution: result.data, socket: status } });
  } catch (error) {
    logger.error('Erro ao configurar WebSocket:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Verificar status do WebSocket da Evolution para uma instância (rota protegida)
router.get('/status/:instanceName', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { instanceName } = req.params;
    const { organizationId } = req.user;

    logger.info(`Solicitação para status do WebSocket de ${instanceName}`);

    const evo = await websocketService.checkWebsocketStatus(instanceName, organizationId);
    const local = evolutionSocketManager.getStatus(instanceName);
    res.json({ success: true, data: { evolution: evo, local } });
  } catch (error) {
    logger.error('Erro ao consultar status do WebSocket:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Desconectar nosso backend do WS Evolution para uma instância
router.post('/disconnect/:instanceName', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { instanceName } = req.params;
    await evolutionSocketManager.disconnectInstance(instanceName);
    res.json({ success: true, data: { connected: false } });
  } catch (error) {
    logger.error('Erro ao desconectar WebSocket:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

module.exports = router;


