# Documentação Completa dos Endpoints

## Base URLs

- **Frontend:** `https://seu-projeto.vercel.app`
- **Backend:** `https://eeeeeeee-production.up.railway.app`

---

## Autenticação

Todos os endpoints de WhatsApp são protegidos e requerem autenticação via JWT.

### Header de Autenticação

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

---

## Endpoints de WhatsApp

### 1. Listar Sessões

**GET** `/api/whatsapp/sessions`

Lista todas as sessões WhatsApp do usuário.

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "_id": "uuid",
      "sessionId": "abc123",
      "name": "Atendimento Principal",
      "phoneNumber": "5511999999999",
      "status": "connected",
      "qrCode": null,
      "lastConnected": "2025-01-15T10:30:00Z",
      "isConnected": true
    }
  ],
  "total": 1
}
\`\`\`

---

### 2. Criar Sessão

**POST** `/api/whatsapp/sessions`

Cria uma nova sessão WhatsApp.

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
  "session": {
    "_id": "uuid",
    "sessionId": "abc123",
    "name": "Atendimento Principal",
    "status": "pending"
  }
}
\`\`\`

---

### 3. Iniciar Sessão

**POST** `/api/whatsapp/sessions/:sessionId/start`

Inicia o processo de autenticação do WhatsApp.

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Session initialization started"
}
\`\`\`

**Socket.IO Events Emitidos:**
- `whatsapp:qr` - QR code gerado
- `whatsapp:status` - Status atualizado

---

### 4. Obter QR Code

**GET** `/api/whatsapp/sessions/:sessionId/qr`

Retorna o QR code atual da sessão (se disponível).

**Response:**
\`\`\`json
{
  "qr": "data:image/png;base64,iVBORw0KG...",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "status": "qr",
  "message": "Escaneie o QR code no WhatsApp"
}
\`\`\`

---

### 5. Obter Status da Sessão

**GET** `/api/whatsapp/sessions/:sessionId/status`

Retorna o status atual da sessão em tempo real.

**Response:**
\`\`\`json
{
  "ok": true,
  "sessionId": "abc123",
  "status": "connected",
  "phoneNumber": "5511999999999"
}
\`\`\`

**Possíveis status:**
- `pending` - Sessão criada mas não iniciada
- `qr` - Aguardando scan do QR code
- `authenticated` - QR escaneado, autenticando
- `connected` / `ready` - WhatsApp conectado
- `disconnected` - Desconectado

---

### 6. Desconectar Sessão

**POST** `/api/whatsapp/sessions/:sessionId/disconnect`

Desconecta o WhatsApp sem excluir a sessão.

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Sessão desconectada com sucesso"
}
\`\`\`

---

### 7. Excluir Sessão

**DELETE** `/api/whatsapp/sessions/:sessionId`

Exclui permanentemente a sessão.

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Sessão excluída com sucesso"
}
\`\`\`

---

### 8. Listar Contatos

**GET** `/api/whatsapp/sessions/:sessionId/contacts`

Lista os contatos com quem houve conversas.

**Query Parameters:**
- `limit` (opcional) - Número máximo de contatos (padrão: 50)

**Response:**
\`\`\`json
{
  "success": true,
  "contacts": [
    {
      "whatsapp_id": "5511999999999@c.us",
      "name": "Cliente Exemplo",
      "phone_number": "5511999999999",
      "lastMessage": "Olá, preciso de ajuda",
      "lastMessageTime": "2025-01-15T10:30:00Z",
      "unreadCount": 0
    }
  ],
  "total": 1
}
\`\`\`

---

### 9. Listar Mensagens

**GET** `/api/whatsapp/:sessionId/messages`

Lista todas as mensagens de uma sessão.

**Response:**
\`\`\`json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "session_id": "abc123",
      "from_number": "5511999999999@c.us",
      "to_number": "5511888888888@c.us",
      "body": "Olá, tudo bem?",
      "timestamp": "2025-01-15T10:30:00Z",
      "direction": "incoming",
      "status": "delivered"
    }
  ],
  "total": 1
}
\`\`\`

---

### 10. Mensagens de um Contato

**GET** `/api/whatsapp/:sessionId/messages/:contactId`

Lista mensagens de uma conversa específica.

**Response:**
\`\`\`json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "session_id": "abc123",
      "from_number": "5511999999999@c.us",
      "to_number": "5511888888888@c.us",
      "body": "Olá, tudo bem?",
      "timestamp": "2025-01-15T10:30:00Z",
      "direction": "incoming",
      "status": "delivered"
    }
  ],
  "total": 1
}
\`\`\`

---

### 11. Enviar Mensagem

**POST** `/api/whatsapp/:sessionId/messages`

Envia uma mensagem via WhatsApp.

**Request Body:**
\`\`\`json
{
  "to": "5511999999999@c.us",
  "body": "Olá! Como posso ajudar?"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Message sent successfully",
  "messageId": "true_5511999999999@c.us_ABC123DEF456"
}
\`\`\`

**Socket.IO Event Emitido:**
- `whatsapp:message` - Mensagem enviada confirmada

---

## Socket.IO Events

### Client → Server

#### join-session
Cliente se inscreve para receber eventos de uma sessão específica.

**Emit:**
\`\`\`javascript
socket.emit('join-session', 'abc123')
\`\`\`

---

### Server → Client

#### whatsapp:qr
Emitido quando um QR code é gerado.

**Payload:**
\`\`\`javascript
{
  sessionId: 'abc123',
  qr: 'base64-string-do-qr'
}
\`\`\`

---

#### whatsapp:status
Emitido quando o status de uma sessão muda.

**Payload:**
\`\`\`javascript
{
  sessionId: 'abc123',
  status: 'connected',
  phoneNumber: '5511999999999'
}
\`\`\`

---

#### whatsapp:message
Emitido quando uma mensagem é recebida ou enviada.

**Payload:**
\`\`\`javascript
{
  id: 'uuid',
  sessionId: 'abc123',
  session_id: 'abc123',
  from: '5511999999999@c.us',
  from_number: '5511999999999@c.us',
  to: '5511888888888@c.us',
  to_number: '5511888888888@c.us',
  body: 'Olá, tudo bem?',
  timestamp: '2025-01-15T10:30:00Z',
  direction: 'incoming',
  status: 'delivered'
}
\`\`\`

---

## Códigos de Erro

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Parâmetros inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

---

## Rate Limiting

O backend implementa rate limiting para prevenir abuso:

- **Sessões:** Max 10 requisições/minuto por IP
- **Mensagens:** Max 30 requisições/minuto por sessão
- **QR Code:** Max 20 requisições/minuto (polling)

Quando o limite é excedido, retorna `429 Too Many Requests`.
