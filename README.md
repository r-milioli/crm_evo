# CRM Evolution

Sistema de gerenciamento de relacionamento com clientes (CRM) integrado com WhatsApp através da Evolution API.

## 🚀 Funcionalidades

- **Gestão de Instâncias WhatsApp**: Conecte e gerencie múltiplas instâncias do WhatsApp
- **Gestão de Usuários**: Sistema completo de usuários com roles e permissões
- **Gestão de Departamentos**: Organize usuários em departamentos
- **Gestão de Contatos**: Cadastre e organize contatos dos clientes
- **Conversas**: Interface para gerenciar conversas do WhatsApp
- **Campanhas**: Crie e gerencie campanhas de marketing
- **Relatórios**: Visualize métricas e relatórios de performance
- **Configurações**: Configure integrações e preferências do sistema

## 🛠️ Tecnologias

### Backend
- **Node.js** com Express
- **Prisma ORM** com PostgreSQL
- **JWT** para autenticação
- **Evolution API** para integração WhatsApp

### Frontend
- **React** com TypeScript
- **Tailwind CSS** para estilização
- **React Query** para gerenciamento de estado
- **React Router** para navegação
- **Lucide React** para ícones

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- NPM ou Yarn
- Evolution API configurada

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd crmEvolution
```

2. **Instale as dependências**
```bash
# Backend
npm install

# Frontend
cd client
npm install
cd ..
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crm_evolution"

# JWT
JWT_SECRET="sua-chave-secreta-jwt"

# Evolution API
EVOLUTION_API_URL="https://sua-evolution-api.com"
EVOLUTION_API_KEY="sua-chave-api"

# Server
PORT=3001
NODE_ENV=development
```

4. **Configure o banco de dados**
```bash
# Gere o cliente Prisma
npx prisma generate

# Execute as migrações
npx prisma migrate deploy
```

5. **Inicie o servidor**
```bash
# Desenvolvimento (backend + frontend)
npm run dev

# Ou separadamente:
# Backend
npm run server

# Frontend
cd client && npm start
```

## 🏗️ Estrutura do Projeto

```
crmEvolution/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── services/      # Serviços de API
│   │   ├── store/         # Gerenciamento de estado
│   │   ├── types/         # Tipos TypeScript
│   │   └── utils/         # Utilitários
│   └── public/            # Arquivos estáticos
├── server/                # Backend Node.js
│   ├── routes/            # Rotas da API
│   ├── middleware/        # Middlewares
│   └── utils/             # Utilitários
├── prisma/                # Schema e migrações do banco
├── logs/                  # Logs da aplicação
└── docs/                  # Documentação
```

## 🔐 Autenticação e Autorização

O sistema utiliza JWT para autenticação e possui 4 níveis de usuário:

- **SUPER_ADMIN**: Acesso total ao sistema
- **ADMIN**: Gerencia usuários, instâncias e configurações
- **MANAGER**: Gerencia campanhas, contatos e conversas
- **OPERATOR**: Atende conversas e gerencia contatos
- **VIEWER**: Apenas visualização de relatórios

## 📱 Integração WhatsApp

O sistema se integra com a Evolution API para:

- Conectar instâncias do WhatsApp
- Receber mensagens em tempo real
- Enviar mensagens programaticamente
- Gerenciar configurações das instâncias

## 🚀 Deploy

### Produção

1. **Configure as variáveis de ambiente para produção**
2. **Build do frontend**
```bash
cd client
npm run build
```

3. **Inicie o servidor de produção**
```bash
npm start
```

### Docker (Opcional)

```bash
# Build da imagem
docker build -t crm-evolution .

# Executar container
docker run -p 3001:3001 crm-evolution
```

## 📊 Monitoramento

O sistema inclui:

- Logs estruturados com Winston
- Métricas de performance
- Monitoramento de erros
- Health checks da API

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte, entre em contato através de:
- Email: suporte@crmevolution.com
- Issues do GitHub: [Criar Issue](https://github.com/seu-usuario/crm-evolution/issues)

## 🔄 Changelog

### v1.0.0
- Sistema inicial de CRM
- Integração com Evolution API
- Gestão de usuários e departamentos
- Interface de conversas
- Sistema de campanhas
- Relatórios básicos