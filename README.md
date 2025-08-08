# CRM Evolution - Sistema de Gestão de WhatsApp Business

Sistema completo de gestão de WhatsApp Business multi-tenant, integrado com Evolution API, funcionando como uma plataforma CRM com dashboard analytics e relatórios visuais.

## 🚀 Funcionalidades

### ✅ Sistema Multi-tenant
- Login/registro de usuários
- Sistema de organizações/empresas (tenant)
- Roles: Super Admin, Admin da Org, Operador, Visualizador
- Cada organização isolada com seus próprios dados

### ✅ Gerenciamento de Instâncias WhatsApp
- Interface para criar/editar/excluir instâncias Evolution API
- Configuração de webhook URLs por instância
- Sistema de conexão via QR Code integrado
- Status de conexão em tempo real
- Logs de atividade por instância

### ✅ Dashboard Principal (CRM)
- Visão geral com métricas principais
- Gráficos de conversas por período
- Status das instâncias conectadas
- Estatísticas de mensagens enviadas/recebidas
- Top contatos mais ativos

### ✅ Gestão de Conversas
- Lista de todas as conversas ativas
- Status: Aberta, Em Andamento, Finalizada, Aguardando
- Atribuição de conversas para operadores
- Histórico completo de mensagens
- Busca e filtros avançados
- Tags e categorização

### ✅ Central de Mensagens
- Interface de chat em tempo real
- Envio de mensagens (texto, imagem, áudio, documento)
- Templates de mensagens rápidas
- Mensagens em massa
- Agendamento de mensagens

### ✅ Relatórios e Analytics
- Relatório de performance por operador
- Tempo médio de resposta
- Volume de mensagens por período
- Taxa de conversão de leads
- Relatórios exportáveis (PDF/Excel)
- Gráficos interativos com filtros de data

### ✅ Gerenciamento de Contatos
- Lista de contatos com informações completas
- Segmentação de contatos
- Histórico de interações
- Importação/exportação de contatos
- Tags e categorias personalizadas

## 🛠️ Stack Tecnológica

- **Frontend**: React com TypeScript
- **Backend**: Node.js com Express
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: JWT + sistema de roles/permissões
- **UI**: Tailwind CSS
- **Charts**: Recharts para dashboards
- **Tempo Real**: Socket.IO
- **WhatsApp API**: Evolution API

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- Evolution API rodando
- npm ou yarn

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd crmEvolution
```

### 2. Instale as dependências do backend
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/crm_evolution"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# Evolution API
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="your-evolution-api-key"

# File Upload
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=10485760

# Redis (opcional para cache)
REDIS_URL="redis://localhost:6379"

# Email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Webhook
WEBHOOK_SECRET="your-webhook-secret"
```

### 4. Configure o banco de dados
```bash
# Gere o cliente Prisma
npm run db:generate

# Execute as migrações
npm run db:migrate
```

### 5. Instale as dependências do frontend
```bash
cd client
npm install
```

### 6. Configure o frontend
Crie um arquivo `.env` na pasta `client`:

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
```

### 7. Inicie o servidor de desenvolvimento
```bash
# No diretório raiz
npm run dev
```

Isso iniciará:
- Backend na porta 3001
- Frontend na porta 3000

## 📁 Estrutura do Projeto

```
crmEvolution/
├── server/                 # Backend Node.js/Express
│   ├── routes/            # Rotas da API
│   ├── middleware/        # Middlewares
│   ├── utils/             # Utilitários
│   └── index.js           # Servidor principal
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # Serviços API
│   │   └── utils/         # Utilitários
│   └── public/
├── prisma/                # Schema e migrações do banco
├── uploads/               # Arquivos enviados
└── logs/                  # Logs da aplicação
```

## 🔧 Configuração da Evolution API

1. **Instale a Evolution API** seguindo a [documentação oficial](https://doc.evolution-api.com/)

2. **Configure uma instância**:
```bash
curl -X POST "http://localhost:8080/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_API_KEY" \
  -d '{
    "instanceName": "minha-instancia",
    "webhook": "http://localhost:3001/api/webhooks/evolution/minha-instancia",
    "webhookByEvents": true,
    "events": ["messages.upsert", "connection.update"]
  }'
```

3. **Conecte a instância**:
```bash
curl -X GET "http://localhost:8080/instance/connect/minha-instancia" \
  -H "apikey: YOUR_API_KEY"
```

## 🎨 Interface

O sistema utiliza um tema escuro com cores inspiradas no WhatsApp:

- **Primária**: Verde WhatsApp (#25D366)
- **Secundária**: Preto (#000000) e tons de cinza escuro
- **Background**: Preto/cinza muito escuro (#0F0F0F, #1A1A1A)
- **Cards/Containers**: Cinza escuro (#2A2A2A)

## 📊 Dashboard

O dashboard principal inclui:

- **Métricas Gerais**: Total de mensagens, conversas, contatos
- **Gráficos**: Mensagens por período, conversas por status
- **Status das Instâncias**: Conexões ativas/inativas
- **Performance dos Operadores**: Tempo de resposta, conversas atendidas
- **Top Contatos**: Contatos mais ativos

## 🔐 Autenticação e Permissões

### Roles Disponíveis:
- **SUPER_ADMIN**: Acesso total ao sistema
- **ADMIN**: Administrador da organização
- **OPERATOR**: Operador de atendimento
- **VIEWER**: Apenas visualização

### Funcionalidades por Role:
- **SUPER_ADMIN**: Todas as funcionalidades
- **ADMIN**: Gerenciar usuários, instâncias, campanhas
- **OPERATOR**: Atender conversas, enviar mensagens
- **VIEWER**: Visualizar relatórios e dados

## 📱 Funcionalidades de Mensagens

### Tipos de Mensagem Suportados:
- Texto
- Imagem
- Áudio
- Vídeo
- Documento
- Localização
- Contato

### Funcionalidades:
- Envio individual
- Envio em massa (até 100 contatos)
- Agendamento de mensagens
- Templates de mensagens rápidas
- Status de entrega e leitura

## 📈 Relatórios

### Relatórios Disponíveis:
- **Performance**: Métricas por operador
- **Mensagens**: Volume e tipos de mensagem
- **Conversas**: Status e duração
- **Contatos**: Atividade e engajamento
- **Custom**: Relatórios personalizados

### Exportação:
- PDF
- Excel/CSV
- Gráficos interativos

## 🔧 Configurações Avançadas

### Webhooks
O sistema suporta webhooks personalizados para:
- Novas mensagens
- Atualizações de status
- Conexão/desconexão de instâncias

### Integrações
- Evolution API
- APIs externas (configurável)
- Sistemas de email
- Notificações push

## 🚀 Deploy

### Produção
1. Configure as variáveis de ambiente para produção
2. Execute `npm run build` para build do frontend
3. Use PM2 ou similar para gerenciar o processo Node.js
4. Configure um proxy reverso (nginx/Apache)
5. Configure SSL/HTTPS

### Docker (Opcional)
```bash
# Build da imagem
docker build -t crm-evolution .

# Executar container
docker run -p 3001:3001 -p 3000:3000 crm-evolution
```

## 📝 Logs

Os logs são salvos em:
- `logs/combined.log` - Logs gerais
- `logs/error.log` - Logs de erro

### Níveis de Log:
- **error**: Erros da aplicação
- **warn**: Avisos
- **info**: Informações gerais
- **debug**: Debug (apenas desenvolvimento)

## 🔍 Monitoramento

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Métricas
- Status das instâncias
- Performance dos operadores
- Volume de mensagens
- Tempo de resposta

## 🐛 Troubleshooting

### Problemas Comuns:

1. **Erro de conexão com banco**:
   - Verifique a URL do banco no `.env`
   - Certifique-se que o PostgreSQL está rodando

2. **Erro de conexão com Evolution API**:
   - Verifique se a Evolution API está rodando
   - Confirme a URL e API key no `.env`

3. **Erro de autenticação**:
   - Verifique o JWT_SECRET no `.env`
   - Limpe o cache do navegador

4. **Webhooks não funcionando**:
   - Verifique se a URL do webhook está acessível
   - Confirme as configurações da Evolution API

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte, entre em contato:
- Email: suporte@crm-evolution.com
- Documentação: [docs.crm-evolution.com](https://docs.crm-evolution.com)
- Issues: [GitHub Issues](https://github.com/seu-usuario/crm-evolution/issues)

## 🎯 Roadmap

### Próximas Funcionalidades:
- [ ] Chat em tempo real com indicador de digitação
- [ ] Integração com outros canais (Telegram, Instagram)
- [ ] IA para respostas automáticas
- [ ] Sistema de tickets avançado
- [ ] API pública para integrações
- [ ] App mobile (React Native)
- [ ] Sistema de backup automático
- [ ] Multi-idioma

---

**Desenvolvido com ❤️ para revolucionar o atendimento via WhatsApp**
#   c r m _ e v o  
 