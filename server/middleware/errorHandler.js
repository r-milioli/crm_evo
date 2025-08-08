const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Erro na aplicação:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Erros do Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflito: registro já existe',
      details: 'Um registro com esses dados já existe no sistema'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro não encontrado',
      details: 'O registro solicitado não foi encontrado'
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'Erro de referência',
      details: 'Existe uma referência inválida no registro'
    });
  }

  // Erros de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.message
    });
  }

  // Erros de sintaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      details: 'O corpo da requisição contém JSON inválido'
    });
  }

  // Erros de arquivo muito grande
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Arquivo muito grande',
      details: 'O arquivo enviado excede o tamanho máximo permitido'
    });
  }

  // Erros de tipo de arquivo não permitido
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Tipo de arquivo não permitido',
      details: 'O tipo de arquivo enviado não é suportado'
    });
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
