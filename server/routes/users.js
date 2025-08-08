const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const userValidation = [
  body('name').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('role').isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).withMessage('Role inválido')
];

// Listar usuários da organização
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const skip = (page - 1) * limit;
    const organizationId = req.user.organizationId;

    // Construir filtros
    const where = {
      organizationId
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              assignedConversations: true,
              messages: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar estatísticas de usuários
router.get('/stats', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const [total, active, inactive, pending] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.user.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.user.count({ where: { organizationId, status: 'INACTIVE' } }),
      prisma.user.count({ where: { organizationId, status: 'PENDING' } })
    ]);

    // Contar por role
    const byRole = await prisma.user.groupBy({
      by: ['role'],
      where: { organizationId },
      _count: { role: true }
    });

    const roleStats = byRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {});

    res.json({
      total,
      active,
      inactive,
      pending,
      byRole: roleStats
    });

  } catch (error) {
    logger.error('Erro ao buscar estatísticas de usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuário por ID
router.get('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedConversations: true,
            messages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);

  } catch (error) {
    logger.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar usuário
router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { name, email, password, role, status } = req.body;
    const organizationId = req.user.organizationId;

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email já cadastrado' 
      });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: status || 'ACTIVE',
        organizationId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    logger.info(`Usuário criado: ${user.id} por ${req.user.email}`);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user
    });

  } catch (error) {
    logger.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário
router.put('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, email, password, role, status } = req.body;
    const organizationId = req.user.organizationId;

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o novo email já existe (se foi alterado)
    if (email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email }
      });

      if (duplicateUser) {
        return res.status(409).json({ 
          error: 'Email já cadastrado' 
        });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      name,
      email,
      role,
      status
    };

    // Adicionar senha se fornecida
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Atualizar usuário
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    logger.info(`Usuário atualizado: ${user.id} por ${req.user.email}`);

    res.json({
      message: 'Usuário atualizado com sucesso',
      user
    });

  } catch (error) {
    logger.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir usuário
router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se o usuário existe
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir excluir o próprio usuário
    if (id === req.user.id) {
      return res.status(400).json({ 
        error: 'Não é possível excluir seu próprio usuário' 
      });
    }

    // Excluir usuário
    await prisma.user.delete({
      where: { id }
    });

    logger.info(`Usuário ${id} excluído por ${req.user.email}`);

    res.json({
      message: 'Usuário excluído com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar/Desativar usuário
router.patch('/:id/status', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organizationId = req.user.organizationId;

    // Validar status
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir desativar o próprio usuário
    if (id === req.user.id && status === 'INACTIVE') {
      return res.status(400).json({ 
        error: 'Não é possível desativar seu próprio usuário' 
      });
    }

    // Atualizar status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        status: status
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    logger.info(`Status do usuário ${id} alterado para ${status} por ${req.user.email}`);

    res.json({
      message: 'Status do usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    logger.error('Erro ao alterar status do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Redefinir senha do usuário
router.post('/:id/reset-password', requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se o usuário existe
    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gerar senha temporária
    const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Atualizar senha
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    logger.info(`Senha do usuário ${id} redefinida por ${req.user.email}`);

    res.json({
      message: 'Senha redefinida com sucesso',
      temporaryPassword
    });

  } catch (error) {
    logger.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar permissões do usuário atual
router.get('/me/permissions', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Definir permissões baseadas no role
    const permissions = {
      canManageUsers: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
      canManageInstances: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role),
      canManageContacts: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OPERATOR'].includes(user.role),
      canManageConversations: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OPERATOR'].includes(user.role),
      canManageCampaigns: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role),
      canViewReports: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'VIEWER'].includes(user.role),
      canManageSettings: ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    };

    res.json(permissions);

  } catch (error) {
    logger.error('Erro ao buscar permissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha do próprio usuário
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Senha atual e nova senha são obrigatórias' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Nova senha deve ter pelo menos 6 caracteres' 
      });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        error: 'Senha atual incorreta' 
      });
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    logger.info(`Senha alterada para usuário ${userId}`);

    res.json({
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Perfil do usuário atual
router.get('/profile/me', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            assignedConversations: true,
            messages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);

  } catch (error) {
    logger.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do usuário atual
router.put('/profile/me', async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Verificar se o novo email já existe (se foi alterado)
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({ 
          error: 'Email já cadastrado' 
        });
      }
    }

    // Atualizar perfil
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    logger.info(`Perfil atualizado: ${user.id}`);

    res.json({
      message: 'Perfil atualizado com sucesso',
      user
    });

  } catch (error) {
    logger.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
