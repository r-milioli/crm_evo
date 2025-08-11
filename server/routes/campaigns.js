const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireRole } = require('../middleware/auth');
const campaignsService = require('../services/campaignsService');
const logger = require('../utils/logger');

const router = express.Router();

// Validação para criação/atualização de campanhas
const campaignValidation = [
  body('name').notEmpty().withMessage('Nome da campanha é obrigatório'),
  body('messageTemplate').notEmpty().withMessage('Template da mensagem é obrigatório'),
  body('targetContacts').isArray().withMessage('Contatos alvo deve ser um array'),
  body('scheduledAt').optional().isISO8601().withMessage('Data de agendamento deve ser válida')
];

// Listar campanhas
router.get('/', requireRole(['ADMIN', 'MANAGER', 'OPERATOR']), async (req, res) => {
  try {
    const { status, search } = req.query;
    const filters = { status, search };
    
    const result = await campaignsService.listCampaigns(req.user.organizationId, filters);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao listar campanhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter campanha por ID
router.get('/:id', requireRole(['ADMIN', 'MANAGER', 'OPERATOR']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await campaignsService.getCampaign(id, req.user.organizationId);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao obter campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova campanha
router.post('/', requireRole(['ADMIN', 'MANAGER']), campaignValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const result = await campaignsService.createCampaign(
      req.body, 
      req.user.organizationId, 
      req.user.id
    );
    
    if (result.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao criar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar campanha
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), campaignValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    
    const result = await campaignsService.updateCampaign(
      id, 
      req.body, 
      req.user.organizationId
    );
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir campanha
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await campaignsService.deleteCampaign(id, req.user.organizationId);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao excluir campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Executar campanha
router.post('/:id/execute', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { instanceName } = req.body;
    
    if (!instanceName) {
      return res.status(400).json({ error: 'Nome da instância é obrigatório' });
    }
    
    const result = await campaignsService.executeCampaign(
      id, 
      req.user.organizationId, 
      instanceName
    );
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao executar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas das campanhas
router.get('/stats/overview', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const result = await campaignsService.getCampaignStats(req.user.organizationId);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Erro ao obter estatísticas das campanhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
