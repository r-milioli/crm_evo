const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Validações
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
];

const registerValidation = [
  body('name').isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('organizationName').isLength({ min: 2 }).withMessage('Nome da organização deve ter pelo menos 2 caracteres')
];

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciais inválidas' 
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ 
        error: 'Usuário inativo' 
      });
    }

    if (!user.organization.isActive) {
      return res.status(401).json({ 
        error: 'Organização inativa' 
      });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciais inválidas' 
      });
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`Usuário ${user.email} fez login`);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });

  } catch (error) {
    logger.error('Erro no login:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
});

// Registro
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array() 
      });
    }

    const { name, email, password, organizationName, organizationDescription } = req.body;

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email já cadastrado' 
      });
    }

    // Criar organização
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        description: organizationDescription
      }
    });

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN', // Primeiro usuário é admin
        organizationId: organization.id
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`Novo usuário registrado: ${user.email} na organização ${organization.name}`);

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });

  } catch (error) {
    logger.error('Erro no registro:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token não fornecido' 
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE' || !user.organization.isActive) {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });

  } catch (error) {
    logger.error('Erro na verificação do token:', error);
    res.status(401).json({ 
      error: 'Token inválido' 
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token não fornecido' 
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE' || !user.organization.isActive) {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }

    // Gerar novo token
    const newToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Token renovado com sucesso',
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization
      }
    });

  } catch (error) {
    logger.error('Erro no refresh do token:', error);
    res.status(401).json({ 
      error: 'Token inválido' 
    });
  }
});

module.exports = router;
