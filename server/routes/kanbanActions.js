const express = require('express');
const router = express.Router();
const kanbanActionService = require('../services/kanbanActionService');
const { requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(requireRole(['ADMIN', 'MANAGER', 'OPERATOR']));

// Listar ações de uma coluna
router.get('/column/:columnId', async (req, res) => {
  try {
    const { columnId } = req.params;
    const { organizationId } = req.user;

    const actions = await kanbanActionService.listActions(columnId, organizationId);
    res.json(actions);
  } catch (error) {
    logger.error('Erro ao listar ações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter ação por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const action = await kanbanActionService.getActionById(id, organizationId);
    
    if (!action) {
      return res.status(404).json({ error: 'Ação não encontrada' });
    }

    res.json(action);
  } catch (error) {
    logger.error('Erro ao obter ação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar nova ação
router.post('/', async (req, res) => {
  try {
    const { organizationId, id: createdById } = req.user;
    const actionData = req.body;

    const action = await kanbanActionService.createAction(actionData, organizationId, createdById);
    res.status(201).json(action);
  } catch (error) {
    logger.error('Erro ao criar ação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar ação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const actionData = req.body;

    const action = await kanbanActionService.updateAction(id, actionData, organizationId);
    res.json(action);
  } catch (error) {
    logger.error('Erro ao atualizar ação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar ação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const result = await kanbanActionService.deleteAction(id, organizationId);
    res.json(result);
  } catch (error) {
    logger.error('Erro ao deletar ação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Executar ações para um card (manual)
router.post('/execute/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { trigger } = req.body;
    const { organizationId } = req.user;

    const executions = await kanbanActionService.executeActionsForCard(cardId, trigger, organizationId);
    res.json(executions);
  } catch (error) {
    logger.error('Erro ao executar ações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter estatísticas das ações
router.get('/stats/overview', async (req, res) => {
  try {
    const { organizationId } = req.user;

    const stats = await kanbanActionService.getActionStats(organizationId);
    res.json(stats);
  } catch (error) {
    logger.error('Erro ao obter estatísticas das ações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Templates de ações pré-definidas
router.get('/templates/available', async (req, res) => {
  try {
    const templates = [
      {
        name: 'Notificar Cliente',
        description: 'Enviar mensagem automática quando card entra na coluna',
        type: 'SEND_MESSAGE',
        trigger: 'ON_ENTER_COLUMN',
        config: {
          message: 'Olá {{contact.name}}! Seu pedido {{card.title}} está sendo processado. Em breve entraremos em contato.'
        },
        conditions: {
          hasContact: true
        }
      },
      {
        name: 'Notificar Responsável',
        description: 'Notificar usuário interno quando card é criado',
        type: 'NOTIFY_USER',
        trigger: 'ON_CARD_CREATE',
        config: {
          message: 'Novo card criado: {{card.title}}',
          userId: null // Será definido pelo usuário
        }
      },
      {
        name: 'Alerta de Tempo',
        description: 'Notificar quando card fica muito tempo na coluna',
        type: 'NOTIFY_USER',
        trigger: 'ON_TIME_DELAY',
        config: {
          message: 'Card {{card.title}} está há muito tempo na coluna {{column.name}}',
          userId: null
        },
        conditions: {
          timeInColumn: 24 // 24 horas
        }
      },
      {
        name: 'Atualizar Status da Conversa',
        description: 'Atualizar status da conversa quando card muda de coluna',
        type: 'UPDATE_STATUS',
        trigger: 'ON_ENTER_COLUMN',
        config: {
          updateConversationStatus: true,
          newStatus: 'IN_PROGRESS'
        },
        conditions: {
          hasConversation: true
        }
      },
      {
        name: 'Webhook de Integração',
        description: 'Chamar webhook externo quando card é movido',
        type: 'WEBHOOK_CALL',
        trigger: 'ON_ENTER_COLUMN',
        config: {
          webhookUrl: '',
          headers: {}
        }
      },
      {
        name: 'Email de Follow-up',
        description: 'Enviar email de acompanhamento',
        type: 'SEND_EMAIL',
        trigger: 'ON_ENTER_COLUMN',
        config: {
          email: '',
          subject: 'Acompanhamento: {{card.title}}',
          message: 'Olá! Gostaríamos de informar que seu pedido está sendo processado.'
        }
      }
    ];

    res.json(templates);
  } catch (error) {
    logger.error('Erro ao obter templates:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
