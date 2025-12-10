# Guia Completo de Deploy em Produção

## Arquitetura do Sistema

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│  Next.js 15 + React 19 + TypeScript                         │
│  https://seu-projeto.vercel.app                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├──── HTTP/HTTPS API Calls
                       │     NEXT_PUBLIC_API_URL
                       │
                       └──── WebSocket Connection
                             NEXT_PUBLIC_WS_URL
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   RAILWAY (Backend)                          │
│  Node.js + Express + Socket.IO                              │
│  https://eeeeeeee-production.up.railway.app                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├──── Supabase Client (Service Role)
                       │     SUPABASE_SERVICE_ROLE_KEY
                       │
                       └──── WhatsApp Web.js + Puppeteer
                             PUPPETEER_EXECUTABLE_PATH
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE (Database)                        │
│  PostgreSQL + Real-time Subscriptions                       │
│  https://ldieqcofmincppqzownw.supabase.co                  │
└─────────────────────────────────────────────────────────────┘
\`\`\`

---

## Passo 1: Configurar Variáveis de Ambiente na VERCEL

Acesse: **Project Settings > Environment Variables**

### Variáveis OBRIGATÓRIAS:

\`\`\`bash
# Backend API URL (Railway)
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app

# WebSocket URL (Railway) - ATENÇÃO: Use wss:// não ws://
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app

# Supabase Frontend (Anon Key)
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTU2ODIsImV4cCI6MjA3OTgzMTY4Mn0.lF1zMajkO46ilUeuKU14eDw-CM4TakEhpZbgBef5_Hg
\`\`\`

### Variável OPCIONAL (para Server-Side Rendering):

\`\`\`bash
API_INTERNAL_URL=https://eeeeeeee-production.up.railway.app
\`\`\`

**IMPORTANTE:** Configure as variáveis para todos os ambientes (Production, Preview, Development).

---

## Passo 2: Configurar Variáveis de Ambiente no RAILWAY

Acesse: **Project > Variables**

### Variáveis OBRIGATÓRIAS:

\`\`\`bash
# Frontend URL para CORS (cole a URL da sua Vercel)
FRONTEND_URL=https://seu-projeto.vercel.app

# Node Environment
NODE_ENV=production

# Supabase Backend (Service Role Key - NÃO é a Anon Key!)
SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1NTY4MiwiZXhwIjoyMDc5ODMxNjgyfQ.uACDWkYujDnvXUeeeipzE5U_GichTZfFOvikR9CReZc

# Puppeteer para WhatsApp
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
\`\`\`

**ATENÇÃO:** O Railway injeta automaticamente a variável `PORT`, NÃO adicione ela manualmente!

---

## Passo 3: Verificar Tabelas no Supabase

Execute os seguintes comandos SQL no **SQL Editor** do Supabase:

### 1. Tabela de Sessões WhatsApp

\`\`\`sql
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'pending',
  qr_code TEXT,
  is_active BOOLEAN DEFAULT false,
  last_connected TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_id ON whatsapp_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_status ON whatsapp_sessions(status);
\`\`\`

### 2. Tabela de Mensagens

\`\`\`sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT DEFAULT 'sent',
  media_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_number);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_number);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
\`\`\`

---

## Passo 4: Deploy

### No Vercel:

1. **Push para GitHub**
2. Vercel faz deploy automático
3. Aguarde 2-3 minutos
4. Acesse a URL gerada

### No Railway:

1. **Push para GitHub** (se conectado via Git)
2. Railway faz deploy automático
3. Aguarde 3-5 minutos (WhatsApp precisa baixar Chromium)
4. Verifique logs em **Deployments > View Logs**

---

## Passo 5: Testar o Sistema

### 1. Verificar Configuração

Abra o Console do navegador e procure:

\`\`\`
[v0] ============= ENVIRONMENT CONFIG =============
[v0] API_URL: https://eeeeeeee-production.up.railway.app
[v0] WS_URL: wss://eeeeeeee-production.up.railway.app
[v0] Is Production: true
[v0] Using Localhost: false
[v0] ===============================================
✅ Production mode: Using Railway backend
\`\`\`

### 2. Criar Sessão WhatsApp

1. Clique em **"Nova"** para criar uma sessão
2. Dê um nome (ex: "Atendimento Principal")
3. Clique em **"Criar Sessão"**
4. Clique em **"Conectar"**

### 3. Escanear QR Code

1. O QR code deve aparecer em até 10 segundos
2. Abra WhatsApp no celular
3. Vá em **Aparelhos Conectados**
4. Clique em **Conectar Dispositivo**
5. Escaneie o QR code

### 4. Verificar Conexão

O status deve mudar de:
- **"Aguardando QR"** → **"Autenticando"** → **"Conectado"**

### 5. Testar Mensagens

1. Envie uma mensagem para o número do WhatsApp conectado
2. A mensagem deve aparecer no painel em até 2 segundos
3. Responda pela interface
4. Verifique que a mensagem foi recebida no WhatsApp do celular

---

## Troubleshooting

### Problema: Frontend mostra erros de localhost

**Sintomas:**
\`\`\`
ERR_CONNECTION_REFUSED http://localhost:3001/api/whatsapp/sessions
WebSocket connection to 'ws://localhost:5000' failed
\`\`\`

**Solução:**
1. Verifique que as variáveis `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WS_URL` estão configuradas na Vercel
2. Force um novo deploy na Vercel após adicionar as variáveis
3. Limpe o cache do navegador (Ctrl+Shift+R)

---

### Problema: Backend retorna 404 nos endpoints

**Sintomas:**
\`\`\`
GET /api/whatsapp/sessions/abc123/status 404 (Not Found)
\`\`\`

**Solução:**
1. Verifique que o backend está rodando no Railway
2. Acesse `https://eeeeeeee-production.up.railway.app/` e veja se retorna JSON
3. Verifique logs do Railway para erros de inicialização

---

### Problema: QR Code não aparece

**Sintomas:**
- Status fica em "Autenticando" indefinidamente
- Nenhum QR code é exibido

**Solução:**
1. Verifique logs do Railway: `Deployments > View Logs`
2. Procure por erros do Chromium:
   \`\`\`
   Error: Failed to launch the browser process
   \`\`\`
3. Se encontrar o erro, verifique:
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
   - `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
4. Adicione o Nixpacks buildpack do Chromium no Railway

---

### Problema: Mensagens não aparecem em tempo real

**Sintomas:**
- WhatsApp está conectado
- Mensagens chegam no celular
- Mas não aparecem no painel do CRM

**Solução:**
1. Verifique logs do navegador:
   \`\`\`javascript
   console.log("[v0] SOCKET: ✅ Connected successfully")
   \`\`\`
2. Se não aparecer, verifique:
   - `NEXT_PUBLIC_WS_URL` está configurado com `wss://` (não `ws://`)
   - Backend permite WebSocket (Railway permite por padrão)
3. Verifique logs do backend procurando por:
   \`\`\`
   [v0] Socket.IO client connected
   [v0] Client joined session: abc123
   \`\`\`

---

### Problema: CORS Error

**Sintomas:**
\`\`\`
Access to fetch at 'https://eeeeeeee-production.up.railway.app/api/...'
from origin 'https://seu-projeto.vercel.app' has been blocked by CORS policy
\`\`\`

**Solução:**
1. Adicione a URL da Vercel na variável `FRONTEND_URL` do Railway
2. Formato correto: `https://seu-projeto.vercel.app` (sem barra no final)
3. Redeploy no Railway após alterar

---

### Problema: Too Many Requests (429)

**Sintomas:**
\`\`\`
POST /api/whatsapp/sessions 429 (Too Many Requests)
\`\`\`

**Solução:**
1. O frontend está fazendo polling muito rápido
2. Verifique se há múltiplos `setInterval` rodando
3. Limpe todos os intervals ao desmontar componentes
4. Aumente o intervalo de polling de 2s para 3s ou 5s

---

## Logs Úteis para Debug

### Logs Esperados no BROWSER (Console):

\`\`\`javascript
// Inicialização
[v0] ============= ENVIRONMENT CONFIG =============
[v0] API_URL: https://eeeeeeee-production.up.railway.app
[v0] WS_URL: wss://eeeeeeee-production.up.railway.app
[v0] Is Production: true
[v0] Using Localhost: false
[v0] ===============================================
✅ Production mode: Using Railway backend

// API Client
[API] Initialized with baseURL: https://eeeeeeee-production.up.railway.app

// Socket.IO
[v0] SOCKET: Connecting to: wss://eeeeeeee-production.up.railway.app
[v0] SOCKET: ✅ Connected successfully to wss://eeeeeeee-production.up.railway.app

// WhatsApp Events
[v0] WhatsApp page: Initializing socket connection...
[v0] Received QR for session: abc123
[v0] Status update: abc123 connected
[v0] New message received: { sessionId: 'abc123', from: '+5511999999999', body: 'Olá!' }
\`\`\`

### Logs Esperados no RAILWAY:

\`\`\`
[v0] ========== SERVER STARTING ==========
[v0] Node environment: production
[v0] PORT: 8080
[v0] FRONTEND_URL: https://seu-projeto.vercel.app
[v0] ======================================

[v0] Socket.IO initialized with CORS: https://seu-projeto.vercel.app
[v0] WhatsApp Manager initialized
[v0] Server running on port 8080

[v0] Socket.IO client connected
[v0] Client joined session: abc123

[v0] Initializing WhatsApp session: abc123
[v0] QR Code generated for session: abc123
[v0] WhatsApp session connected: abc123
[v0] Phone number: +5511999999999

[v0] New message received: +5511999999999
[v0] Message saved to Supabase
[v0] Message emitted to room: abc123
\`\`\`

---

## Checklist Final

Antes de considerar o deploy concluído, verifique:

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Variáveis de ambiente configuradas no Railway
- [ ] Tabelas criadas no Supabase
- [ ] Frontend carrega sem erros de localhost
- [ ] Backend responde em `https://eeeeeeee-production.up.railway.app/`
- [ ] Socket.IO conecta com sucesso
- [ ] QR Code aparece ao criar sessão
- [ ] WhatsApp conecta após escanear QR
- [ ] Status muda para "Conectado"
- [ ] Mensagens recebidas aparecem no painel em tempo real
- [ ] Mensagens enviadas pelo painel chegam no WhatsApp
- [ ] Múltiplas sessões funcionam sem conflito

---

## URLs de Referência

- **Frontend (Vercel):** https://seu-projeto.vercel.app
- **Backend (Railway):** https://eeeeeeee-production.up.railway.app
- **Database (Supabase):** https://ldieqcofmincppqzownw.supabase.co

---

## Suporte

Se após seguir todos os passos o sistema ainda não funcionar:

1. Tire screenshots dos logs do navegador (Console)
2. Copie os logs do Railway (últimas 100 linhas)
3. Liste todas as variáveis de ambiente (sem os valores sensíveis)
4. Descreva exatamente o que está acontecendo vs o esperado
