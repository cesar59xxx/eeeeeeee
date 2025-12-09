# 📚 Documentação Completa dos Endpoints

## Autenticação

### POST /api/auth/login
Faz login no sistema

**Request Body:**
\`\`\`json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "role": "admin"
  },
  "tokens": {
    "accessToken": "token-jwt",
    "refreshToken": "refresh-token"
  }
}
\`\`\`

### POST /api/auth/register
Registra um novo usuário

**Request Body:**
\`\`\`json
{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
\`\`\`

### GET /api/auth/me
Retorna o usuário autenticado

**Headers:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Response:**
\`\`\`json
{
  "user": {
    "id": "user-id",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "role": "admin"
  }
}
\`\`\`

### POST /api/auth/logout
Faz logout do sistema

### POST /api/auth/refresh
Atualiza o token de acesso

**Request Body:**
\`\`\`json
{
  "refreshToken": "refresh-token"
}
\`\`\`

## WhatsApp - Sessões

### GET /api/whatsapp/sessions
Lista todas as sessões WhatsApp

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "_id": "uuid",
      "sessionId": "session-1234567890",
      "name": "Atendimento Principal",
      "phoneNumber": "5511999999999",
      "status": "connected",
      "qrCode": null,
      "lastConnected": "2025-12-02T10:30:00.000Z",
      "isConnected": true
    }
  ],
  "total": 1
}
\`\`\`

### POST /api/whatsapp/sessions
Cria uma nova sessão WhatsApp

**Request Body:**
\`\`\`json
{
  "name": "Atendimento Principal"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Sessão criada - iniciando conexão...",
  "session": {
    "_id": "uuid",
    "sessionId": "session-1234567890",
    "name": "Atendimento Principal",
    "status": "disconnected",
    "isConnected": false
  }
}
\`\`\`

### POST /api/whatsapp/sessions/:sessionId/start
Inicia uma sessão WhatsApp e gera QR code

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Sessão iniciando - aguarde o QR code"
}
\`\`\`

### GET /api/whatsapp/sessions/:sessionId/qr
Obtém o QR code da sessão

**Response:**
\`\`\`json
{
  "qr": "data:image/png;base64,...",
  "qrCode": "data:image/png;base64,...",
  "status": "qr",
  "message": "Escaneie o QR code no WhatsApp"
}
\`\`\`

### GET /api/whatsapp/sessions/:sessionId/status
Obtém o status da sessão

**Response:**
\`\`\`json
{
  "success": true,
  "state": "connected",
  "isConnected": true,
  "phoneNumber": "5511999999999",
  "lastConnected": "2025-12-02T10:30:00.000Z"
}
\`\`\`

### DELETE /api/whatsapp/sessions/:sessionId
Exclui uma sessão

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Sessão excluída com sucesso"
}
\`\`\`

## WhatsApp - Mensagens

### GET /api/whatsapp/:sessionId/messages
Lista todas as mensagens de uma sessão

**Response:**
\`\`\`json
{
  "success": true,
  "messages": [
    {
      "id": "msg-123",
      "session_id": "session-1234567890",
      "from_number": "5511999999999",
      "to_number": "5511888888888",
      "body": "Olá, como vai?",
      "timestamp": "2025-12-02T10:30:00.000Z",
      "direction": "incoming",
      "status": "delivered"
    }
  ],
  "data": [...],
  "total": 1
}
\`\`\`

### POST /api/whatsapp/:sessionId/messages
Envia uma mensagem

**Request Body:**
\`\`\`json
{
  "to": "5511999999999",
  "body": "Olá! Como posso ajudar?"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Message sent successfully",
  "messageId": "whatsapp-msg-id"
}
\`\`\`

## Contatos

### GET /api/contacts
Lista todos os contatos

**Query Parameters:**
- `sessionId` (opcional): Filtra contatos por sessão
- `limit` (opcional, default: 100): Limite de resultados

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "phone_number": "5511999999999",
      "name": "João Silva",
      "last_interaction": "2025-12-02T10:30:00.000Z"
    }
  ],
  "total": 1
}
\`\`\`

## Health Check

### GET /health
Verifica se o servidor está funcionando

**Response:**
\`\`\`json
{
  "status": "ok",
  "timestamp": "2025-12-02T10:30:00.000Z",
  "uptime": 3600
}
\`\`\`

### GET /api/health
Alias para /health

## WebSocket Events

### Socket.IO Namespace: /

**Client → Server:**
- `join-session`: Entra em uma sala de sessão
  \`\`\`javascript
  socket.emit('join-session', 'session-1234567890')
  \`\`\`

- `leave-session`: Sai de uma sala de sessão
  \`\`\`javascript
  socket.emit('leave-session', 'session-1234567890')
  \`\`\`

**Server → Client:**
- `whatsapp:qr`: QR code gerado
  \`\`\`javascript
  {
    sessionId: 'session-1234567890',
    qr: 'data:image/png;base64,...'
  }
  \`\`\`

- `whatsapp:status`: Status da sessão mudou
  \`\`\`javascript
  {
    sessionId: 'session-1234567890',
    status: 'connected'
  }
  \`\`\`

- `whatsapp:message`: Nova mensagem recebida
  \`\`\`javascript
  {
    sessionId: 'session-1234567890',
    from: '5511999999999',
    to: '5511888888888',
    body: 'Olá!',
    timestamp: 1733123456789,
    direction: 'incoming'
  }
  \`\`\`

## Variáveis de Ambiente Necessárias

### Frontend (Vercel)
\`\`\`env
NEXT_PUBLIC_API_URL=https://dwxw-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmineppqzownq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
\`\`\`

### Backend (Railway)
\`\`\`env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://seu-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmineppqzownq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
SESSIONS_PATH=/app/.wwebjs_auth
