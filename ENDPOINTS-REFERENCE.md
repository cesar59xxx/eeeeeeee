# 📡 API Endpoints Reference

Documentação completa de todos os endpoints disponíveis no backend.

**Base URL:** `https://eeeeeeee-production.up.railway.app`

---

## 🔐 Authentication

### POST `/api/auth/register`
Registrar novo usuário

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
\`\`\`

**Response:**
\`\`\`json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
\`\`\`

### POST `/api/auth/login`
Fazer login

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "senha123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
\`\`\`

### GET `/api/auth/me`
Obter usuário atual (requer autenticação)

**Headers:**
\`\`\`
Authorization: Bearer {accessToken}
\`\`\`

**Response:**
\`\`\`json
{
  "user": { "id": "...", "email": "...", "name": "..." }
}
\`\`\`

### POST `/api/auth/logout`
Fazer logout

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

---

## 📱 WhatsApp Sessions

### GET `/api/whatsapp/sessions`
Listar todas as sessões WhatsApp

**Response:**
\`\`\`json
{
  "sessions": [
    {
      "_id": "...",
      "sessionId": "session-123",
      "name": "Atendimento Principal",
      "phoneNumber": "5511999999999",
      "status": "connected",
      "isConnected": true,
      "lastConnected": "2025-01-01T12:00:00Z"
    }
  ]
}
\`\`\`

### POST `/api/whatsapp/sessions`
Criar nova sessão WhatsApp

**Request Body:**
\`\`\`json
{
  "name": "Atendimento Principal"
}
\`\`\`

**Response:**
\`\`\`json
{
  "session": {
    "sessionId": "session-123",
    "name": "Atendimento Principal",
    "status": "disconnected",
    "isConnected": false
  }
}
\`\`\`

### POST `/api/whatsapp/sessions/:sessionId/start`
Iniciar sessão WhatsApp (gera QR Code)

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Session starting, QR code will be available soon"
}
\`\`\`

### GET `/api/whatsapp/sessions/:sessionId/qr`
Obter QR Code da sessão

**Response:**
\`\`\`json
{
  "qr": "data:image/png;base64,..."
}
\`\`\`

### GET `/api/whatsapp/sessions/:sessionId/status`
Verificar status da sessão

**Response:**
\`\`\`json
{
  "state": "connected",
  "isConnected": true
}
\`\`\`

### DELETE `/api/whatsapp/sessions/:sessionId`
Deletar sessão WhatsApp

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

---

## 💬 Messages

### GET `/api/whatsapp/:sessionId/messages`
Listar mensagens de uma sessão

**Query Params:**
- `contactId` (opcional): Filtrar por contato específico

**Response:**
\`\`\`json
{
  "messages": [
    {
      "id": "...",
      "session_id": "session-123",
      "from_number": "5511999999999",
      "to_number": "5511888888888",
      "body": "Olá!",
      "timestamp": "2025-01-01T12:00:00Z",
      "direction": "incoming",
      "status": "delivered"
    }
  ]
}
\`\`\`

### POST `/api/whatsapp/:sessionId/messages`
Enviar mensagem

**Request Body:**
\`\`\`json
{
  "to": "5511999999999",
  "body": "Olá, como posso ajudar?"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "messageId": "..."
}
\`\`\`

### GET `/api/whatsapp/:sessionId/contacts`
Listar contatos de uma sessão

**Query Params:**
- `limit` (opcional): Limitar número de resultados

**Response:**
\`\`\`json
{
  "contacts": [
    {
      "whatsapp_id": "5511999999999",
      "name": "João Silva",
      "lastMessage": "Olá!"
    }
  ]
}
\`\`\`

---

## 🔌 WebSocket Events

**Connection:**
\`\`\`javascript
import { io } from 'socket.io-client'

const socket = io('wss://eeeeeeee-production.up.railway.app', {
  transports: ['websocket', 'polling']
})
\`\`\`

### Events Received

#### `whatsapp:qr`
QR Code gerado para autenticação

\`\`\`javascript
socket.on('whatsapp:qr', ({ sessionId, qr }) => {
  console.log('QR Code:', qr) // base64 data URL
})
\`\`\`

#### `whatsapp:status`
Atualização de status da sessão

\`\`\`javascript
socket.on('whatsapp:status', ({ sessionId, status }) => {
  // status: 'qr', 'authenticated', 'ready', 'connected', 'disconnected'
})
\`\`\`

#### `whatsapp:message`
Nova mensagem recebida

\`\`\`javascript
socket.on('whatsapp:message', (messageData) => {
  // messageData: { id, sessionId, from, to, body, direction, timestamp }
})
\`\`\`

### Events to Emit

#### `join-session`
Entrar em uma sala de sessão específica

\`\`\`javascript
socket.emit('join-session', sessionId)
\`\`\`

---

## 🏥 Health Check

### GET `/health`
Verificar se o servidor está online

**Response:**
\`\`\`json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00Z"
}
\`\`\`

---

## 📝 Notes

- Todos os endpoints (exceto `/health` e autenticação) podem requerer autenticação
- Use `credentials: 'include'` em requisições fetch para enviar cookies
- WebSocket se reconecta automaticamente em caso de desconexão
- QR Codes são temporários e expiram após 5 minutos
