const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const organizationRoutes = require('./routes/organizations');
const instanceRoutes = require('./routes/instances');
const contactRoutes = require('./routes/contacts');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const campaignRoutes = require('./routes/campaigns');
const reportRoutes = require('./routes/reports');
const webhookRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const departmentRoutes = require('./routes/departments');
const kanbanRoutes = require('./routes/kanbans');
const kanbanActionRoutes = require('./routes/kanbanActions');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// Prisma Client
const prisma = new PrismaClient();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limite mais alto em desenvolvimento
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: process.env.NODE_ENV === 'production' ? 50 : 500, // permitir mais requisições em desenvolvimento
  delayMs: () => 500 // adicionar 500ms de delay por requisição após o limite
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(speedLimiter);

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

// Rotas públicas
app.use('/api/auth', authRoutes);
app.use('/api/webhooks/evolution', webhookRoutes); // Apenas o endpoint de recebimento de eventos é público

// Rota de health check (pública)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Middleware de autenticação para rotas protegidas
app.use('/api', authMiddleware.authMiddleware);

// Rotas protegidas
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/webhooks', webhookRoutes); // Rotas de configuração de webhook (protegidas)

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/kanbans', kanbanRoutes);
app.use('/api/kanban-actions', kanbanActionRoutes);

// Middleware de tratamento de erros
app.use(errorHandler);

// Socket.IO para tempo real
io.on('connection', (socket) => {
  logger.info(`✅ Cliente conectado: ${socket.id}`);
  logger.info(`📡 Endereço do cliente: ${socket.handshake.address}`);
  logger.info(`🌐 Headers: ${JSON.stringify(socket.handshake.headers)}`);

  // Juntar-se à sala da organização
  socket.on('join-organization', (organizationId) => {
    socket.join(`org-${organizationId}`);
    logger.info(`🏢 Cliente ${socket.id} entrou na organização ${organizationId}`);
    
    // Enviar confirmação para o cliente
    socket.emit('organization-joined', { organizationId, success: true });
  });

  // Teste de ping
  socket.on('ping', (data) => {
    logger.info(`🏓 Ping recebido de ${socket.id}:`, data);
    socket.emit('pong', { message: 'Pong recebido!', timestamp: new Date().toISOString() });
  });

  // Sair da sala da organização
  socket.on('leave-organization', (organizationId) => {
    socket.leave(`org-${organizationId}`);
    logger.info(`🚪 Cliente ${socket.id} saiu da organização ${organizationId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.info(`❌ Cliente desconectado: ${socket.id}. Motivo: ${reason}`);
  });
});



// Disponibilizar io para uso em outros módulos
app.set('io', io);

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV}`);
});

module.exports = { app, server, io, prisma };
