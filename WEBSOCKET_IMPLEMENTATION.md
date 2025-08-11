# 🌐 Implementação WebSocket para Evolution API

Este documento descreve a implementação completa do sistema WebSocket para integração em tempo real com a Evolution API.

## 🚀 Visão Geral

O sistema implementa dois modos de operação WebSocket:

### 1. **Modo Global** (`WEBSOCKET_GLOBAL_EVENTS=true`)
- Recebe eventos de todas as instâncias simultaneamente
- Conexão única para monitoramento centralizado
- Ideal para sistemas com múltiplas instâncias

### 2. **Modo Tradicional** (`WEBSOCKET_GLOBAL_EVENTS=false`)
- Conecta individualmente por instância
- Controle granular de conexões
- Ideal para controle segmentado

## ⚙️ Configuração

### Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Habilitar WebSocket
WEBSOCKET_ENABLED=true

# Modo de operação (true = global, false = tradicional)
WEBSOCKET_GLOBAL_EVENTS=false

# URL da API (para Socket.IO)
REACT_APP_API_URL=http://localhost:3001
```

### Dependências

O sistema utiliza as seguintes dependências:

```json
{
  "ws": "^8.14.2",
  "socket.io": "^4.7.4"
}
```

## 🏗️ Arquitetura

### Backend

#### 1. **Serviço WebSocket** (`server/services/evolutionWebSocket.js`)
- Gerencia conexões WebSocket com a Evolution API
- Processa eventos em tempo real
- Integra com Socket.IO para frontend

#### 2. **Rotas WebSocket** (`server/routes/websocket.js`)
- Endpoints para gerenciar conexões
- Status e monitoramento
- Testes de conectividade

#### 3. **Integração com Instâncias** (`server/routes/instances.js`)
- Conecta WebSocket automaticamente ao conectar instância
- Atualiza status em tempo real

### Frontend

#### 1. **Componente WebSocketManager** (`client/src/components/WebSocketManager.tsx`)
- Interface para gerenciar conexões
- Monitoramento em tempo real
- Visualização de eventos

#### 2. **Integração Socket.IO**
- Recebe eventos do backend
- Atualiza interface em tempo real
- Gerencia salas por organização

## 📡 Endpoints da API

### Status e Monitoramento

```http
GET /api/websocket/status
```
Retorna status das conexões WebSocket

```http
GET /api/websocket/instances
```
Lista instâncias com status de conexão WebSocket

### Gerenciamento de Conexões

```http
POST /api/websocket/connect/global
```
Conecta ao WebSocket global

```http
POST /api/websocket/disconnect/global
```
Desconecta WebSocket global

```http
POST /api/websocket/connect/instance/:instanceName
```
Conecta WebSocket de instância específica

```http
POST /api/websocket/disconnect/instance/:instanceName
```
Desconecta WebSocket de instância específica

```http
POST /api/websocket/connect/all
```
Conecta WebSocket para todas as instâncias

```http
POST /api/websocket/disconnect/all
```
Desconecta WebSocket de todas as instâncias

### Testes

```http
POST /api/websocket/test/:instanceName
```
Testa conexão WebSocket de instância específica

## 🔄 Fluxo de Eventos

### 1. **Conexão WebSocket**
```
Evolution API → WebSocket → Backend → Socket.IO → Frontend
```

### 2. **Processamento de Eventos**
```
Evento Recebido → Parser → Processador → Database → Socket.IO → Frontend
```

### 3. **Tipos de Eventos Suportados**
- `connection.update` - Status de conexão
- `messages.upsert` - Novas mensagens
- `messages.update` - Atualizações de mensagens
- `contacts.update` - Atualizações de contatos
- `groups.update` - Atualizações de grupos

## 🎯 Como Usar

### 1. **Configurar Variáveis de Ambiente**
```bash
# .env
WEBSOCKET_ENABLED=true
WEBSOCKET_GLOBAL_EVENTS=false
```

### 2. **Instalar Dependências**
```bash
npm install ws socket.io
```

### 3. **Acessar Interface**
1. Vá para **Configurações**
2. Role até a seção **WebSocket Evolution API**
3. Use os controles para gerenciar conexões

### 4. **Modo Global**
```javascript
// Conectar globalmente
await api.post('/websocket/connect/global');

// Receber eventos de todas as instâncias
socket.on('evolution-event', (event) => {
  console.log('Evento global:', event);
});
```

### 5. **Modo Tradicional**
```javascript
// Conectar instância específica
await api.post('/websocket/connect/instance/minha-instancia');

// Receber eventos da instância
socket.on('evolution-event', (event) => {
  if (event.instance === 'minha-instancia') {
    console.log('Evento da instância:', event);
  }
});
```

## 🔧 Funcionalidades

### ✅ Implementadas
- [x] Conexão WebSocket com Evolution API
- [x] Dois modos de operação (Global/Tradicional)
- [x] Reconexão automática
- [x] Processamento de eventos em tempo real
- [x] Interface de gerenciamento
- [x] Status de conexão
- [x] Testes de conectividade
- [x] Integração com Socket.IO
- [x] Atualização automática de status de instâncias

### 🚧 Próximas Funcionalidades
- [ ] Histórico de eventos
- [ ] Filtros por tipo de evento
- [ ] Notificações push
- [ ] Métricas de performance
- [ ] Logs detalhados
- [ ] Configuração de eventos específicos

## 🐛 Troubleshooting

### Problema: WebSocket não conecta
**Solução:**
1. Verifique se `WEBSOCKET_ENABLED=true`
2. Confirme se a Evolution API suporta WebSocket
3. Teste a URL do WebSocket
4. Verifique permissões da API Key

### Problema: Eventos não chegam
**Solução:**
1. Verifique se o Socket.IO está conectado
2. Confirme se entrou na sala da organização
3. Verifique logs do servidor
4. Teste com modo global vs tradicional

### Problema: Reconexão não funciona
**Solução:**
1. Verifique timeout de reconexão (30s)
2. Confirme se a Evolution API está online
3. Verifique logs de erro
4. Teste conexão manual

## 📊 Monitoramento

### Logs Importantes
```javascript
// Conexão estabelecida
logger.info(`WebSocket conectado para instância ${instanceName}`);

// Evento recebido
logger.info(`Evento da instância ${instanceName} recebido:`, event);

// Erro de conexão
logger.error(`Erro no WebSocket da instância ${instanceName}:`, error);
```

### Métricas
- Número de conexões ativas
- Taxa de reconexão
- Latência de eventos
- Tipos de eventos mais comuns

## 🔒 Segurança

### Considerações
- WebSocket usa autenticação via API Key
- Conexões são isoladas por organização
- Eventos são filtrados por permissões
- Logs não expõem dados sensíveis

### Boas Práticas
- Use HTTPS/WSS em produção
- Monitore conexões ativas
- Implemente rate limiting
- Valide eventos recebidos

## 📈 Performance

### Otimizações
- Reconexão automática com backoff
- Processamento assíncrono de eventos
- Limpeza de conexões inativas
- Cache de configurações

### Limites
- Máximo 100 conexões simultâneas por organização
- Timeout de 30 segundos para reconexão
- Buffer de 10 eventos no frontend
- Rate limit de 100 eventos/minuto

## 🎉 Benefícios

### Para o Sistema
- **Tempo Real**: Notificações instantâneas
- **Eficiência**: Elimina polling constante
- **Escalabilidade**: Suporte a múltiplas instâncias
- **Flexibilidade**: Dois modos de operação

### Para o Usuário
- **UX Melhorada**: Interface responsiva
- **Monitoramento**: Status em tempo real
- **Controle**: Gerenciamento granular
- **Visibilidade**: Eventos detalhados

---

**Implementado com ❤️ para integração completa com Evolution API**
