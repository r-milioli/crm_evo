const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const organizationValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('description').optional().isLength({ max: 500 }).withMessage('Descrição deve ter no máximo 500 caracteres'),
  body('domain').optional().isLength({ max: 100 }).withMessage('Domínio deve ter no máximo 100 caracteres')
];

// Buscar organização atual
router.get('/current', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            instances: true,
            contacts: true,
            conversations: true,
            messages: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    res.json(organization);

  } catch (error) {
    logger.error('Erro ao buscar organização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar organização
router.put('/current', requireRole(['ADMIN', 'SUPER_ADMIN']), organizationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { name, description, domain, settings } = req.body;
    const organizationId = req.user.organizationId;

    // Verificar se o domínio já existe (se fornecido)
    if (domain) {
      const existingOrg = await prisma.organization.findFirst({
        where: {
          domain,
          id: { not: organizationId }
        }
      });

      if (existingOrg) {
        return res.status(409).json({ 
          error: 'Domínio já está em uso' 
        });
      }
    }

    // Atualizar organização
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name,
        description,
        domain,
        settings
      }
    });

    logger.info(`Organização atualizada: ${organization.id} por ${req.user.email}`);

    res.json({
      message: 'Organização atualizada com sucesso',
      organization
    });

  } catch (error) {
    logger.error('Erro ao atualizar organização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas da organização
router.get('/stats', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const [
      totalUsers,
      totalInstances,
      totalContacts,
      totalConversations,
      totalMessages,
      connectedInstances,
      activeUsers
    ] = await Promise.all([
      prisma.user.count({
        where: {
          organizationId,
          isActive: true
        }
      }),
      prisma.instance.count({
        where: { organizationId }
      }),
      prisma.contact.count({
        where: {
          organizationId,
          isActive: true
        }
      }),
      prisma.conversation.count({
        where: { organizationId }
      }),
      prisma.message.count({
        where: { organizationId }
      }),
      prisma.instance.count({
        where: {
          organizationId,
          status: 'CONNECTED'
        }
      }),
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          lastLogin: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
          }
        }
      })
    ]);

    res.json({
      stats: {
        totalUsers,
        totalInstances,
        totalContacts,
        totalConversations,
        totalMessages,
        connectedInstances,
        activeUsers
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar estatísticas da organização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
