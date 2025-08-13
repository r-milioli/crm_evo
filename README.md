# CRM Evolution

Sistema de gerenciamento WhatsApp Business com interface web moderna.

## 🚀 Deploy com Docker Swarm

### Pré-requisitos
- Docker Swarm ativo
- Traefik configurado na rede `network_public`
- PostgreSQL rodando
- Domínio configurado

### Configuração

1. **Copie o arquivo de exemplo:**
```bash
cp env.swarm.example .env
```

2. **Configure as variáveis no `.env`:**
```bash
DOMAIN=crm.seudominio.com
DATABASE_URL=postgresql://usuario:senha@postgres/crm_evolution
JWT_SECRET=sua-chave-secreta-aqui
# ... outras variáveis
```

### Deploy

**Linux:**
```bash
chmod +x deploy-swarm.sh
./deploy-swarm.sh
```

**Windows:**
```powershell
./deploy-swarm.ps1
```

### Atualização

**Linux:**
```bash
chmod +x update-service.sh
./update-service.sh
```

**Windows:**
```powershell
./update-service.ps1
```

### Build e Push da Imagem

**Linux:**
```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

**Windows:**
```powershell
./build-and-push.ps1
```

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React
├── server/                 # Backend Node.js/Express
├── prisma/                 # Schema do banco de dados
├── docker-stack.yml        # Configuração Docker Swarm
├── Dockerfile              # Build da imagem Docker
├── deploy-swarm.sh         # Script de deploy (Linux)
├── deploy-swarm.ps1        # Script de deploy (Windows)
├── update-service.sh       # Script de atualização (Linux)
├── update-service.ps1      # Script de atualização (Windows)
└── build-and-push.sh       # Script de build (Linux)
```

## 🔧 Comandos Úteis

```bash
# Ver status do serviço
docker service ls | grep crm-evolution

# Ver logs em tempo real
docker service logs -f crm-evolution_crm-evolution

# Verificar saúde do serviço
docker service ps crm-evolution_crm-evolution

# Remover stack
docker stack rm crm-evolution
```

## 🌐 Acesso

Após o deploy, acesse: `https://seu-dominio.com`

## 📝 Logs

Os logs são exibidos no console do container. Para ver logs em tempo real:

```bash
docker service logs -f crm-evolution_crm-evolution
```

## 🔒 Segurança

- JWT para autenticação
- HTTPS obrigatório via Traefik
- Content Security Policy configurado
- Rate limiting ativo
- CORS configurado para produção
