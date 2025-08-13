# Multi-stage build para otimizar o tamanho da imagem
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências do backend
RUN npm ci --only=production

# Copiar código do backend
COPY server ./server/

# Gerar cliente Prisma
RUN npx prisma generate

# Stage para construir o frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copiar package.json do frontend
COPY client/package*.json ./

# Instalar dependências do frontend
RUN npm ci

# Copiar código do frontend
COPY client/ ./

# Construir o frontend
RUN npm run build

# Stage final
FROM node:18-alpine AS production

# Instalar dependências necessárias
RUN apk add --no-cache dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências e código do backend
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma

# Copiar build do frontend
COPY --from=frontend-builder /app/client/build ./client/build

# Criar diretórios necessários
RUN mkdir -p uploads logs && chown -R nodejs:nodejs uploads logs

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
