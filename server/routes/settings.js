const express = require('express');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// Validação para configuração da Evolution API
const evolutionConfigValidation = [
  body('baseUrl')
    .isURL()
    .withMessage('URL base deve ser uma URL válida'),
  body('apiKey')
    .isLength({ min: 1 })
    .withMessage('API Key é obrigatória')
];

// Buscar configurações da Evolution API
router.get('/evolution', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Buscar configurações da organização
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const settings = organization?.settings || {};
    const evolutionConfig = settings.evolution || {};

    res.json({
      baseUrl: evolutionConfig.baseUrl || '',
      apiKey: evolutionConfig.apiKey ? '***' : '', // Não retornar a API key real
      isConfigured: !!(evolutionConfig.baseUrl && evolutionConfig.apiKey)
    });

  } catch (error) {
    logger.error('Erro ao buscar configurações da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Salvar configurações da Evolution API
router.post('/evolution', requireRole(['ADMIN', 'SUPER_ADMIN']), evolutionConfigValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { baseUrl, apiKey } = req.body;
    const organizationId = req.user.organizationId;

    // Buscar organização atual
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Atualizar configurações
    const currentSettings = organization.settings || {};
    const updatedSettings = {
      ...currentSettings,
      evolution: {
        baseUrl,
        apiKey,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.id
      }
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings }
    });

    logger.info(`Configurações da Evolution API atualizadas por ${req.user.email}`, {
      organizationId: req.user.organizationId,
      baseUrl: baseUrl,
      hasApiKey: !!apiKey
    });

    res.json({
      message: 'Configurações salvas com sucesso',
      isConfigured: true
    });

  } catch (error) {
    logger.error('Erro ao salvar configurações da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Testar configuração da Evolution API
router.get('/test-config', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Buscar configurações da organização
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const settings = organization?.settings || {};
    const evolutionConfig = settings.evolution || {};

    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      return res.status(400).json({ 
        error: 'Evolution API não configurada',
        details: 'Configure primeiro nas configurações do sistema'
      });
    }

    // Testar conexão com Evolution API
    try {
      const response = await axios.get(`${evolutionConfig.baseUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': evolutionConfig.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      logger.info('Teste de conexão com Evolution API bem-sucedido');

      res.json({
        success: true,
        message: 'Conexão com Evolution API estabelecida com sucesso',
        baseUrl: evolutionConfig.baseUrl,
        hasApiKey: !!evolutionConfig.apiKey,
        instances: response.data.length || 0
      });

    } catch (evolutionError) {
      logger.error('Erro ao testar conexão com Evolution API:', evolutionError);
      
      let errorMessage = 'Erro ao conectar com Evolution API';
      
      if (evolutionError.response) {
        // Erro de resposta da API
        if (evolutionError.response.status === 401) {
          errorMessage = 'API Key inválida';
        } else if (evolutionError.response.status === 404) {
          errorMessage = 'URL da Evolution API não encontrada';
        } else {
          errorMessage = `Erro ${evolutionError.response.status}: ${evolutionError.response.statusText}`;
        }
      } else if (evolutionError.code === 'ECONNREFUSED') {
        errorMessage = 'Não foi possível conectar com a Evolution API. Verifique se está rodando.';
      } else if (evolutionError.code === 'ENOTFOUND') {
        errorMessage = 'URL da Evolution API não encontrada. Verifique a URL.';
      } else if (evolutionError.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout ao conectar com Evolution API. Verifique a URL e conexão.';
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        details: evolutionError.message
      });
    }

  } catch (error) {
    logger.error('Erro ao testar configurações da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar status da Evolution API
router.get('/evolution/status', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Buscar configurações da organização
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const settings = organization?.settings || {};
    const evolutionConfig = settings.evolution || {};

    if (!evolutionConfig.baseUrl || !evolutionConfig.apiKey) {
      return res.json({
        isConfigured: false,
        message: 'Evolution API não configurada'
      });
    }

    // Testar conexão
    try {
      const response = await axios.get(`${evolutionConfig.baseUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': evolutionConfig.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      res.json({
        isConfigured: true,
        isConnected: true,
        message: 'Evolution API conectada',
        instances: response.data.length || 0
      });

    } catch (error) {
      res.json({
        isConfigured: true,
        isConnected: false,
        message: 'Evolution API configurada mas não conectada',
        error: error.message
      });
    }

  } catch (error) {
    logger.error('Erro ao verificar status da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Limpar configurações da Evolution API
router.delete('/evolution', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Buscar organização atual
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Remover configurações da Evolution API
    const currentSettings = organization.settings || {};
    const { evolution, ...otherSettings } = currentSettings;

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: otherSettings }
    });

    logger.info(`Configurações da Evolution API removidas por ${req.user.email}`);

    res.json({
      message: 'Configurações removidas com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao remover configurações da Evolution API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
