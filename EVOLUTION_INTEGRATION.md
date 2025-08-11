# Integração com Evolution API

Este documento explica como configurar e usar a integração com a Evolution API no sistema CRM Evolution.

## Configuração

### 1. Configurar a Evolution API

1. Acesse a página **Configurações** no sistema
2. Na seção **Evolution API**, preencha:
   - **Base URL**: URL da sua Evolution API (ex: `https://evo2.automacaodebaixocusto.com.br`)
   - **API Key**: Sua chave de API da Evolution
3. Clique em **Salvar Configuração**
4. Teste a conexão clicando em **Testar Conexão**

### 2. Sincronizar Chats

Após configurar a Evolution API:

1. Na página **Configurações**, clique em **Sincronizar Chats**
2. O sistema irá:
   - Buscar todos os chats da Evolution API
   - Criar/atualizar contatos no sistema
   - Criar/atualizar conversas no sistema
   - Manter os dados sincronizados

## Funcionalidades

### Sincronização Automática

- **Contatos**: Cria automaticamente contatos baseados nos chats da Evolution API
- **Conversas**: Cria conversas para cada chat encontrado
- **Metadados**: Preserva informações como foto de perfil, nome, etc.

### Dados Sincronizados

Para cada chat da Evolution API, o sistema sincroniza:

```json
{
  "id": "cme5xnia80gms514l8b1x36en",
  "remoteJid": "5522998089722@s.whatsapp.net",
  "pushName": "Nome do Contato",
  "profilePicUrl": "https://...",
  "updatedAt": "2025-08-10T17:52:04.000Z",
  "windowStart": "2025-08-10T17:03:37.739Z",
  "windowExpires": "2025-08-11T17:03:37.739Z",
  "windowActive": true
}
```

### Estrutura de Dados

#### Contato Criado
```json
{
  "name": "Nome do Contato",
  "phone": "5522998089722",
  "email": null,
  "organizationId": "...",
  "instanceId": "teste",
  "externalId": "cme5xnia80gms514l8b1x36en",
  "metadata": {
    "profilePicUrl": "https://...",
    "pushName": "Nome do Contato",
    "remoteJid": "5522998089722@s.whatsapp.net"
  }
}
```

#### Conversa Criada
```json
{
  "title": "Nome do Contato",
  "status": "OPEN",
  "priority": "NORMAL",
  "contactId": "...",
  "instanceId": "teste",
  "organizationId": "...",
  "externalId": "cme5xnia80gms514l8b1x36en",
  "metadata": {
    "windowStart": "2025-08-10T17:03:37.739Z",
    "windowExpires": "2025-08-11T17:03:37.739Z",
    "windowActive": true,
    "lastMessageAt": "2025-08-10T17:52:04.000Z"
  }
}
```

## Endpoints da API

### Sincronizar Chats
```http
POST /api/conversations/sync-evolution/:instanceId
Authorization: Bearer <token>
```

### Buscar Mensagens da Evolution
```http
GET /api/conversations/evolution-messages/:instanceId/:chatId
Authorization: Bearer <token>
```

## Uso no Frontend

### Página de Configurações
- Configure a Evolution API
- Teste a conexão
- Sincronize chats manualmente

### Página de Conversas
- Visualize conversas sincronizadas
- Gerencie status e prioridades
- Atribua operadores
- Adicione tags e notas

## Exemplo de Uso

1. **Configurar API**:
   ```bash
   curl -X POST 'https://evo2.automacaodebaixocusto.com.br/chat/findChats/teste' \
   --header 'apikey: 57ab56d42eaffdcce6c11d0cd42c82e2'
   ```

2. **Sincronizar no Sistema**:
   - Acesse Configurações
   - Configure a Evolution API
   - Clique em "Sincronizar Chats"

3. **Gerenciar Conversas**:
   - Acesse a página Conversas
   - Visualize todas as conversas sincronizadas
   - Gerencie status, prioridades e atribuições

## Próximos Passos

- [ ] Sincronização automática em intervalos
- [ ] Webhooks para atualizações em tempo real
- [ ] Sincronização de mensagens
- [ ] Envio de mensagens via Evolution API
- [ ] Suporte a múltiplas instâncias
- [ ] Histórico de sincronização

## Troubleshooting

### Erro de Conexão
- Verifique se a URL da Evolution API está correta
- Confirme se a API Key é válida
- Teste a conexão diretamente na Evolution API

### Erro de Sincronização
- Verifique se a instância existe na Evolution API
- Confirme se há chats disponíveis
- Verifique os logs do servidor para detalhes

### Dados Não Sincronizados
- Verifique se a Evolution API retorna dados
- Confirme se a instância está ativa
- Teste a API diretamente com curl
