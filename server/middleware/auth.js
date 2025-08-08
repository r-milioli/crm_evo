const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' do início
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso inválido' 
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
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

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Usuário inativo' 
      });
    }

    if (!user.organization.isActive) {
      return res.status(401).json({ 
        error: 'Organização inativa' 
      });
    }

    // Adicionar informações do usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization
    };

    next();
  } catch (error) {
    logger.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }

    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

// Middleware para verificar permissões específicas
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Permissão insuficiente.' 
      });
    }

    next();
  };
};

// Middleware para verificar se o usuário pertence à organização
const requireOrganizationAccess = (organizationIdField = 'organizationId') => {
  return (req, res, next) => {
    const userOrgId = req.user.organizationId;
    const resourceOrgId = req.params[organizationIdField] || req.body[organizationIdField];

    if (resourceOrgId && resourceOrgId !== userOrgId) {
      return res.status(403).json({ 
        error: 'Acesso negado. Recurso não pertence à sua organização.' 
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  requireOrganizationAccess
};
