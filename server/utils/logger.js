const winston = require('winston');
const path = require('path');

// Configuração dos formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'crm-evolution' },
  transports: [
    // Console transport sempre ativo
    new winston.transports.Console({
      format: consoleFormat
    }),
  ],
});

// Adicionar arquivos de log apenas se o diretório logs existir e for gravável
if (process.env.NODE_ENV !== 'production') {
  try {
    const fs = require('fs');
    const logsDir = path.join(__dirname, '../../logs');
    
    // Verificar se o diretório logs existe e é gravável
    if (fs.existsSync(logsDir) && fs.accessSync(logsDir, fs.constants.W_OK)) {
      logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
      
      logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
    }
  } catch (error) {
    // Se não conseguir criar arquivos de log, continua apenas com console
    console.warn('Não foi possível configurar arquivos de log:', error.message);
  }
}

module.exports = logger;
