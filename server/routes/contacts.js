const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const contactValidation = [
  body('phoneNumber').isMobilePhone('pt-BR').withMessage('Número de telefone inválido'),
  body('name').optional().isLength({ max: 100 }).withMessage('Nome deve ter no máximo 100 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('company').optional().isLength({ max: 100 }).withMessage('Empresa deve ter no máximo 100 caracteres')
];

// Listar contatos
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      tags,
      isActive 
    } = req.query;
    
    const skip = (page - 1) * limit;
    const organizationId = req.user.organizationId;

    // Construir filtros
    const where = {
      organizationId
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (tags) {
      where.tags = {
        hasSome: tags.split(',')
      };
    }

    // Buscar contatos
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { lastInteraction: 'desc' },
        include: {
          _count: {
            select: {
              conversations: true,
              messages: true
            }
          }
        }
      }),
      prisma.contact.count({ where })
    ]);

    // Filtrar por busca se necessário
    let filteredContacts = contacts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredContacts = contacts.filter(contact => 
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.phoneNumber.includes(search) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.company?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      contacts: filteredContacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao listar contatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar contato por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        conversations: {
          take: 10,
          orderBy: { lastMessageAt: 'desc' },
          include: {
            instance: {
              select: {
                id: true,
                name: true
              }
            },
            assignedTo: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                messages: true
              }
            }
          }
        },
        messages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            conversation: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        _count: {
          select: {
            conversations: true,
            messages: true
          }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    res.json(contact);

  } catch (error) {
    logger.error('Erro ao buscar contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar contato
router.post('/', contactValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { 
      phoneNumber, 
      name, 
      email, 
      company, 
      tags = [], 
      notes 
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar se o contato já existe
    const existingContact = await prisma.contact.findFirst({
      where: {
        phoneNumber,
        organizationId
      }
    });

    if (existingContact) {
      return res.status(409).json({ 
        error: 'Contato já existe com este número de telefone' 
      });
    }

    // Criar contato
    const contact = await prisma.contact.create({
      data: {
        phoneNumber,
        name,
        email,
        company,
        tags,
        notes,
        organizationId
      }
    });

    logger.info(`Contato criado: ${contact.id} por ${req.user.email}`);

    res.status(201).json({
      message: 'Contato criado com sucesso',
      contact
    });

  } catch (error) {
    logger.error('Erro ao criar contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar contato
router.put('/:id', contactValidation, async (req, res) => {
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
      phoneNumber, 
      name, 
      email, 
      company, 
      tags, 
      notes,
      isActive 
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar se o contato existe
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    // Verificar se o novo número já existe (se foi alterado)
    if (phoneNumber !== existingContact.phoneNumber) {
      const duplicateContact = await prisma.contact.findFirst({
        where: {
          phoneNumber,
          organizationId,
          id: { not: id }
        }
      });

      if (duplicateContact) {
        return res.status(409).json({ 
          error: 'Já existe um contato com este número de telefone' 
        });
      }
    }

    // Atualizar contato
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        phoneNumber,
        name,
        email,
        company,
        tags,
        notes,
        isActive
      }
    });

    logger.info(`Contato atualizado: ${contact.id} por ${req.user.email}`);

    res.json({
      message: 'Contato atualizado com sucesso',
      contact
    });

  } catch (error) {
    logger.error('Erro ao atualizar contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir contato
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Verificar se o contato existe
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    // Excluir contato (cascade irá excluir conversas e mensagens)
    await prisma.contact.delete({
      where: { id }
    });

    logger.info(`Contato ${id} excluído por ${req.user.email}`);

    res.json({
      message: 'Contato excluído com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao excluir contato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Importar contatos em massa
router.post('/import', async (req, res) => {
  try {
    const { contacts } = req.body;
    const organizationId = req.user.organizationId;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ 
        error: 'Lista de contatos inválida' 
      });
    }

    if (contacts.length > 1000) {
      return res.status(400).json({ 
        error: 'Máximo de 1000 contatos por importação' 
      });
    }

    const results = [];
    const errors = [];

    for (const contactData of contacts) {
      try {
        const { phoneNumber, name, email, company, tags = [] } = contactData;

        // Validar dados básicos
        if (!phoneNumber) {
          errors.push({ phoneNumber, error: 'Número de telefone obrigatório' });
          continue;
        }

        // Verificar se já existe
        const existingContact = await prisma.contact.findFirst({
          where: {
            phoneNumber,
            organizationId
          }
        });

        if (existingContact) {
          errors.push({ phoneNumber, error: 'Contato já existe' });
          continue;
        }

        // Criar contato
        const contact = await prisma.contact.create({
          data: {
            phoneNumber,
            name,
            email,
            company,
            tags,
            organizationId
          }
        });

        results.push({
          phoneNumber,
          success: true,
          contactId: contact.id
        });

      } catch (error) {
        errors.push({
          phoneNumber: contactData.phoneNumber,
          error: error.message
        });
      }
    }

    logger.info(`Importação de contatos: ${results.length} sucessos, ${errors.length} erros`);

    res.json({
      message: 'Importação concluída',
      results,
      errors,
      summary: {
        total: contacts.length,
        success: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    logger.error('Erro na importação de contatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar contatos
router.get('/export/csv', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const contacts = await prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    // Gerar CSV
    const csvHeader = 'Nome,Telefone,Email,Empresa,Tags,Notas,Data de Criação\n';
    const csvRows = contacts.map(contact => {
      return `"${contact.name || ''}","${contact.phoneNumber}","${contact.email || ''}","${contact.company || ''}","${contact.tags.join(', ')}","${contact.notes || ''}","${contact.createdAt.toISOString()}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contatos.csv');
    res.send(csv);

  } catch (error) {
    logger.error('Erro ao exportar contatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar tags únicas
router.get('/tags/list', async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const contacts = await prisma.contact.findMany({
      where: { organizationId },
      select: { tags: true }
    });

    // Extrair todas as tags únicas
    const allTags = contacts.flatMap(contact => contact.tags);
    const uniqueTags = [...new Set(allTags)].sort();

    res.json({
      tags: uniqueTags
    });

  } catch (error) {
    logger.error('Erro ao buscar tags:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
