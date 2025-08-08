const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const reportValidation = [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('type').isIn(['PERFORMANCE', 'MESSAGES', 'CONVERSATIONS', 'CONTACTS', 'CUSTOM']).withMessage('Tipo inválido')
];

// Listar relatórios
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;
    const organizationId = req.user.organizationId;

    const where = {
      organizationId
    };

    if (type) {
      where.type = type;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
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
      prisma.report.count({ where })
    ]);

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao listar relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar relatório por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const report = await prisma.report.findFirst({
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

    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    res.json(report);

  } catch (error) {
    logger.error('Erro ao buscar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar relatório
router.post('/', reportValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { name, type, filters, data } = req.body;
    const organizationId = req.user.organizationId;

    // Criar relatório
    const report = await prisma.report.create({
      data: {
        name,
        type,
        filters,
        data,
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

    logger.info(`Relatório criado: ${report.id} por ${req.user.email}`);

    res.status(201).json({
      message: 'Relatório criado com sucesso',
      report
    });

  } catch (error) {
    logger.error('Erro ao criar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar relatório
router.put('/:id', reportValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, type, filters, data } = req.body;
    const organizationId = req.user.organizationId;

    // Verificar se o relatório existe
    const existingReport = await prisma.report.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Atualizar relatório
    const report = await prisma.report.update({
      where: { id },
      data: {
        name,
        type,
        filters,
        data
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

    logger.info(`Relatório atualizado: ${report.id} por ${req.user.email}`);

    res.json({
      message: 'Relatório atualizado com sucesso',
      report
    });

  } catch (error) {
    logger.error('Erro ao atualizar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir relatório
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se o relatório existe
    const report = await prisma.report.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Excluir relatório
    await prisma.report.delete({
      where: { id }
    });

    logger.info(`Relatório ${id} excluído por ${req.user.email}`);

    res.json({
      message: 'Relatório excluído com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
