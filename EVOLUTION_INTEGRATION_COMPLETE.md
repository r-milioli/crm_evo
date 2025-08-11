# 🚀 Integração Completa com Evolution API

Este documento descreve todas as funcionalidades implementadas para integração com a Evolution API no sistema CRM.

## 📋 Funcionalidades Implementadas

### 1. 🔄 Sincronização de Chats
- **Endpoint**: `POST /api/conversations/sync-evolution/:instanceId`
- **Descrição**: Sincroniza todos os chats da Evolution API com o sistema local
- **Funcionalidades**:
  - Cria/atualiza contatos automaticamente
  - Cria/atualiza conversas no sistema
  - Extrai informações como nome, telefone, foto de perfil
  - Mantém metadados da Evolution API

### 2. 📞 Busca de Contatos
- **Endpoint**: `POST /api/conversations/evolution-contacts/:instanceId`
- **Descrição**: Busca todos os contatos da Evolution API
- **Funcionalidades**:
  - Lista todos os contatos disponíveis
  - Exibe informações detalhadas (nome, telefone, foto)
  - Permite visualizar metadados completos

### 3. 💬 Busca de Mensagens
- **Endpoint**: `GET /api/conversations/evolution-messages/:instanceId/:chatId`
- **Descrição**: Busca mensagens de um chat específico
- **Funcionalidades**:
  - Lista todas as mensagens de um contato
  - Exibe status das mensagens (enviada, entregue, lida)
  - Mostra timestamp e conteúdo das mensagens

### 4. ✅ Status de Mensagens
- **Endpoint**: `POST /api/conversations/evolution-message-status/:instanceId/:remoteJid/:messageId`
- **Descrição**: Busca o status específico de uma mensagem
- **Funcionalidades**:
  - Verifica status detalhado de uma mensagem
  - Útil para rastreamento de entrega

## 🎨 Interface do Usuário

### Painel de Informações da Evolution API
Localizado na página de **Conversas**, o painel oferece:

#### 📱 Aba de Contatos
- Lista todos os contatos da Evolution API
- Exibe foto de perfil, nome e telefone
- Permite expandir para ver detalhes completos
- Botão de atualização em tempo real

#### 💬 Aba de Mensagens
- Seletor de contato para visualizar mensagens
- Lista cronológica de mensagens
- Indicadores visuais de status (enviada, entregue, lida)
- Exibe conteúdo e timestamp das mensagens

#### ✅ Aba de Status
- Campos para inserir Remote JID e Message ID
- Busca status específico de mensagens
- Exibe resultado em formato JSON detalhado

## 🔧 Como Usar

### 1. Acessar o Painel
1. Vá para a página **Conversas**
2. Clique no botão **"Mostrar Info"** (Evolution API Info)
3. O painel aparecerá na parte inferior da página

### 2. Sincronizar Chats
1. Selecione uma instância no dropdown
2. Clique em **"Sincronizar"**
3. Aguarde a conclusão da sincronização
4. As conversas aparecerão na lista principal

### 3. Visualizar Contatos
1. No painel, clique na aba **"Contatos"**
2. Os contatos serão carregados automaticamente
3. Clique em um contato para expandir detalhes
4. Use o botão **"Atualizar"** para recarregar

### 4. Visualizar Mensagens
1. No painel, clique na aba **"Mensagens"**
2. Selecione um contato no dropdown
3. As mensagens serão carregadas automaticamente
4. Use o botão **"Atualizar"** para recarregar

### 5. Verificar Status de Mensagem
1. No painel, clique na aba **"Status"**
2. Digite o Remote JID (ex: `5522998089722@s.whatsapp.net`)
3. Digite o Message ID (ex: `BAE5959535174C7E`)
4. Clique em **"Buscar Status"**

## 📊 Estrutura de Dados

### Contato da Evolution API
```json
{
  "id": "cme5xnia70gkn514lpedgnopm",
  "remoteJid": "558187066869@s.whatsapp.net",
  "pushName": "Williams Batista",
  "profilePicUrl": "https://pps.whatsapp.net/...",
  "createdAt": "2025-08-10T17:03:37.806Z",
  "updatedAt": "2025-08-10T17:04:38.439Z",
  "instanceId": "82812901-f26d-443c-b9a2-0fe3501fa72c"
}
```

### Mensagem da Evolution API
```json
{
  "key": {
    "remoteJid": "5522998089722@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5959535174C7E"
  },
  "message": {
    "conversation": "Olá, como você está?"
  },
  "messageTimestamp": 1733856000,
  "status": "DELIVERED"
}
```

## 🔄 Endpoints da Evolution API Utilizados

### 1. Find Chats
```bash
curl --location --request POST 'https://evo2.automacaodebaixocusto.com.br/chat/findChats/teste' \
--header 'apikey: YOUR_API_KEY'
```

### 2. Find Contacts
```bash
curl --location 'https://evo2.automacaodebaixocusto.com.br/chat/findContacts/teste' \
--header 'Content-Type: application/json' \
--header 'apikey: YOUR_API_KEY' \
--data '{"where": {}}'
```

### 3. Find Messages
```bash
curl --location 'https://evo2.automacaodebaixocusto.com.br/chat/findMessages/teste' \
--header 'Content-Type: application/json' \
--header 'apikey: YOUR_API_KEY' \
--data '{
  "where": {
    "key": {
      "remoteJid": "5522998089722"
    }
  },
  "page": 1,
  "offset": 10
}'
```

### 4. Find Status Message
```bash
curl --location 'https://evo2.automacaodebaixocusto.com.br/chat/findStatusMessage/teste' \
--header 'Content-Type: application/json' \
--header 'apikey: YOUR_API_KEY' \
--data '{
  "where": {
    "remoteJid": "5522998089722@s.whatsapp.net",
    "id": "BAE5959535174C7E"
  }
}'
```

## 🛠️ Configuração

### 1. Configurar Evolution API
1. Vá para **Configurações** > **Evolution API**
2. Preencha:
   - **URL Base**: `https://evo2.automacaodebaixocusto.com.br`
   - **API Key**: Sua chave da Evolution API
3. Clique em **"Salvar"**

### 2. Configurar Instâncias
1. Vá para **Configurações** > **Instâncias**
2. Adicione suas instâncias da Evolution API
3. Certifique-se de que o `instanceName` está correto

## 🚨 Troubleshooting

### Erro 404 ao Sincronizar
- **Problema**: Instância não encontrada
- **Solução**: Verifique se o `instanceName` está correto na configuração da instância

### Erro de Autenticação
- **Problema**: API Key inválida
- **Solução**: Verifique a API Key nas configurações da Evolution API

### Contatos não Carregam
- **Problema**: Erro na requisição para Evolution API
- **Solução**: Verifique se a instância está conectada e ativa

### Mensagens não Aparecem
- **Problema**: Chat ID incorreto
- **Solução**: Use o Remote JID completo (ex: `5522998089722@s.whatsapp.net`)

## 📈 Próximas Funcionalidades

- [ ] Envio de mensagens via Evolution API
- [ ] Notificações em tempo real
- [ ] Histórico de sincronizações
- [ ] Relatórios de status de mensagens
- [ ] Integração com webhooks

## 🔗 Links Úteis

- [Documentação da Evolution API](https://doc.evolution-api.com/)
- [Exemplos de Uso](https://github.com/EvolutionAPI/evolution-api)
- [Suporte](https://t.me/EvolutionAPI)

---

**Desenvolvido com ❤️ para integração completa com Evolution API**
