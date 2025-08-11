const express = require('express');
const router = express.Router();
const kanbanService = require('../services/kanbanService');
const { requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// Middleware para verificar se o usuário tem permissão
router.use(requireRole(['ADMIN', 'MANAGER', 'OPERATOR']));

// Listar todos os kanbans
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const filters = { search };
    
    const kanbans = await kanbanService.listKanbans(req.user.organizationId, filters);
    res.json(kanbans);
  } catch (error) {
    logger.error('Erro ao listar kanbans:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter kanban por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const kanban = await kanbanService.getKanbanById(id, req.user.organizationId);
    
    if (!kanban) {
      return res.status(404).json({ error: 'Kanban não encontrado' });
    }
    
    res.json(kanban);
  } catch (error) {
    logger.error('Erro ao obter kanban:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo kanban
router.post('/', async (req, res) => {
  try {
    const { name, description, color, columns } = req.body;
    
    if (!name || !columns || columns.length === 0) {
      return res.status(400).json({ error: 'Nome e colunas são obrigatórios' });
    }
    
    const data = { name, description, color, columns };
    const kanban = await kanbanService.createKanban(data, req.user.organizationId, req.user.id);
    
    res.status(201).json(kanban);
  } catch (error) {
    logger.error('Erro ao criar kanban:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar kanban
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, columns } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    const data = { name, description, color, columns };
    const kanban = await kanbanService.updateKanban(id, data, req.user.organizationId);
    
    res.json(kanban);
  } catch (error) {
    logger.error('Erro ao atualizar kanban:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar kanban
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await kanbanService.deleteKanban(id, req.user.organizationId);
    
    res.json(result);
  } catch (error) {
    logger.error('Erro ao deletar kanban:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar card no kanban
router.post('/:id/cards', async (req, res) => {
  try {
    const { id: kanbanId } = req.params;
    const { title, description, columnId, contactId, conversationId, campaignId } = req.body;
    
    if (!title || !columnId) {
      return res.status(400).json({ error: 'Título e coluna são obrigatórios' });
    }
    
    const data = {
      title,
      description,
      columnId,
      kanbanId,
      contactId,
      conversationId,
      campaignId
    };
    
    const card = await kanbanService.createCard(data, req.user.organizationId, req.user.id);
    
    res.status(201).json(card);
  } catch (error) {
    logger.error('Erro ao criar card:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Mover card entre colunas
router.put('/cards/:cardId/move', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { newColumnId } = req.body;
    
    if (!newColumnId) {
      return res.status(400).json({ error: 'Nova coluna é obrigatória' });
    }
    
    const card = await kanbanService.moveCard(cardId, newColumnId, req.user.organizationId, req.user.id);
    
    res.json(card);
  } catch (error) {
    logger.error('Erro ao mover card:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar card
router.put('/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }
    
    const data = { title, description };
    const card = await kanbanService.updateCard(cardId, data, req.user.organizationId, req.user.id);
    
    res.json(card);
  } catch (error) {
    logger.error('Erro ao atualizar card:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar card
router.delete('/cards/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const result = await kanbanService.deleteCard(cardId, req.user.organizationId, req.user.id);
    
    res.json(result);
  } catch (error) {
    logger.error('Erro ao deletar card:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas dos kanbans
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await kanbanService.getKanbanStats(req.user.organizationId);
    res.json(stats);
  } catch (error) {
    logger.error('Erro ao obter estatísticas dos kanbans:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
