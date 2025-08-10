const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Validação de departamento
const departmentValidation = {
  name: {
    notEmpty: true,
    isLength: {
      options: { min: 2, max: 100 }
    }
  },
  description: {
    optional: true,
    isLength: {
      options: { max: 200 }
    }
  },
  color: {
    optional: true,
    isHexColor: true
  }
};

// Buscar todos os departamentos da organização
router.get('/', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        organizationId: req.user.organizationId
      },
      include: {
        _count: {
          select: {
            userDepartments: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    logger.info(`Departamentos buscados para organização ${req.user.organizationId}: ${departments.length} encontrados`);
    res.json({ departments });
  } catch (error) {
    logger.error('Erro ao buscar departamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar estatísticas de departamentos
router.get('/stats', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        organizationId: req.user.organizationId
      },
      include: {
        _count: {
          select: {
            userDepartments: true
          }
        }
      }
    });

    const stats = {
      total: departments.length,
      withUsers: departments.filter(d => d._count.userDepartments > 0).length,
      empty: departments.filter(d => d._count.userDepartments === 0).length
    };

    logger.info(`Estatísticas de departamentos calculadas para organização ${req.user.organizationId}`);
    res.json(stats);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas de departamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar um departamento específico
router.get('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      include: {
        _count: {
          select: {
            userDepartments: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ error: 'Departamento não encontrado' });
    }

    logger.info(`Departamento ${id} buscado com sucesso`);
    res.json(department);
  } catch (error) {
    logger.error('Erro ao buscar departamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo departamento
router.post('/', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { name, description, color } = req.body;

    // Validação básica
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome do departamento é obrigatório e deve ter pelo menos 2 caracteres' });
    }

    // Verificar se já existe um departamento com o mesmo nome na organização
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        },
        organizationId: req.user.organizationId
      }
    });

    if (existingDepartment) {
      return res.status(400).json({ error: 'Já existe um departamento com este nome' });
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6',
        organizationId: req.user.organizationId
      },
      include: {
        _count: {
          select: {
            userDepartments: true
          }
        }
      }
    });

    logger.info(`Departamento criado: ${department.name} (ID: ${department.id})`);
    res.status(201).json(department);
  } catch (error) {
    logger.error('Erro ao criar departamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar departamento
router.put('/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    // Verificar se o departamento existe e pertence à organização
    const existingDepartment = await prisma.department.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!existingDepartment) {
      return res.status(404).json({ error: 'Departamento não encontrado' });
    }

    // Validação básica
    if (name && name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome do departamento deve ter pelo menos 2 caracteres' });
    }

    // Se o nome foi alterado, verificar se já existe outro departamento com o mesmo nome
    if (name && name.trim() !== existingDepartment.name) {
      const duplicateDepartment = await prisma.department.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive'
          },
          organizationId: req.user.organizationId,
          id: {
            not: id
          }
        }
      });

      if (duplicateDepartment) {
        return res.status(400).json({ error: 'Já existe um departamento com este nome' });
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color && { color })
      },
      include: {
        _count: {
          select: {
            userDepartments: true
          }
        }
      }
    });

    logger.info(`Departamento atualizado: ${department.name} (ID: ${department.id})`);
    res.json(department);
  } catch (error) {
    logger.error('Erro ao atualizar departamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar departamento
router.delete('/:id', requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o departamento existe e pertence à organização
    const department = await prisma.department.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      include: {
        _count: {
          select: {
            userDepartments: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ error: 'Departamento não encontrado' });
    }

    // Verificar se há usuários no departamento
    if (department._count.userDepartments > 0) {
      return res.status(400).json({ 
        error: 'Não é possível remover um departamento que possui usuários. Transfira os usuários para outro departamento primeiro.' 
      });
    }

    await prisma.department.delete({
      where: { id }
    });

    logger.info(`Departamento removido: ${department.name} (ID: ${department.id})`);
    res.json({ message: 'Departamento removido com sucesso' });
  } catch (error) {
    logger.error('Erro ao remover departamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
