const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const campaignValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('messageTemplate').isLength({ min: 1, max: 4096 }).withMessage('Mensagem deve ter entre 1 e 4096 caracteres'),
  body('status').isIn(['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED']).withMessage('Status inválido')
];

// Listar campanhas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    const organizationId = req.user.organizationId;

    const where = {
      organizationId
    };

    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.campaign.count({ where })
    ]);

    res.json({
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao listar campanhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar campanha por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    res.json(campaign);

  } catch (error) {
    logger.error('Erro ao buscar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar campanha
router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), campaignValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { 
      name, 
      description, 
      messageTemplate, 
      targetContacts, 
      scheduledAt 
    } = req.body;

    const organizationId = req.user.organizationId;

    // Criar campanha
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        messageTemplate,
        targetContacts,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        organizationId,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Campanha criada: ${campaign.id} por ${req.user.email}`);

    res.status(201).json({
      message: 'Campanha criada com sucesso',
      campaign
    });

  } catch (error) {
    logger.error('Erro ao criar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar campanha
router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), campaignValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { 
      name, 
      description, 
      messageTemplate, 
      targetContacts, 
      scheduledAt,
      status 
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar se a campanha existe
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Atualizar campanha
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        description,
        messageTemplate,
        targetContacts,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Campanha atualizada: ${campaign.id} por ${req.user.email}`);

    res.json({
      message: 'Campanha atualizada com sucesso',
      campaign
    });

  } catch (error) {
    logger.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir campanha
router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se a campanha existe
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Excluir campanha
    await prisma.campaign.delete({
      where: { id }
    });

    logger.info(`Campanha ${id} excluída por ${req.user.email}`);

    res.json({
      message: 'Campanha excluída com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
