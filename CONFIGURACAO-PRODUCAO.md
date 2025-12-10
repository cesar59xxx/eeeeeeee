# Configuração de Produção - SaaS CRM Chatbot

## Status Atual

O sistema está configurado para funcionar automaticamente em dev e produção através de variáveis de ambiente.

## Variáveis de Ambiente

### Vercel (Frontend)

Configure estas variáveis no dashboard da Vercel:

\`\`\`env
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### Railway (Backend)

Configure estas variáveis no Railway:

\`\`\`env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://eeeeeeee-git-main-cesarmediotec-9518s-projects.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service role key)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
\`\`\`

## Como Funciona

### Desenvolvimento Local

Quando você roda `npm run dev` localmente:
- `NEXT_PUBLIC_API_URL` não está definido → usa fallback `http://localhost:3001`
- `NEXT_PUBLIC_WS_URL` não está definido → usa fallback `ws://localhost:5000`
- Logs mostram: "🔧 Development mode: Using localhost backend"

### Produção (Vercel)

Quando o app está na Vercel:
- `NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app` (definido na Vercel)
- `NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app` (definido na Vercel)
- Logs mostram: "✅ Production mode: Using Railway backend"

## Verificando se Está Funcionando

1. Abra o DevTools (F12) no navegador
2. Vá para a aba Console
3. Procure por logs com prefixo `[v0]`:

\`\`\`
[v0] ============= CONFIG LOADED =============
[v0] API_BASE_URL = https://eeeeeeee-production.up.railway.app
[v0] WS_BASE_URL = wss://eeeeeeee-production.up.railway.app
[v0] SUPABASE_URL = https://ldieqcofmincppqzownw.supabase.co
[v0] ========================================
✅ Production mode: Using Railway backend
[v0] APIClient initialized with baseURL: https://eeeeeeee-production.up.railway.app
[v0] SOCKET: Connecting to: wss://eeeeeeee-production.up.railway.app
[v0] SOCKET: ✅ Connected successfully
\`\`\`

## Fluxo de Dados

### Autenticação

1. Frontend chama `apiClient.getCurrentUser()`
2. Requisição vai para `${API_BASE_URL}/api/auth/me`
3. Em produção: `https://eeeeeeee-production.up.railway.app/api/auth/me`

### Contatos

1. Frontend chama `apiClient.getContacts(sessionId, 10)`
2. Requisição vai para `${API_BASE_URL}/api/whatsapp/${sessionId}/contacts?limit=10`
3. Em produção: `https://eeeeeeee-production.up.railway.app/api/whatsapp/SESSION_ID/contacts?limit=10`

### Sessões WhatsApp

**Listar:**
- `apiClient.getSessions()` → `GET ${API_BASE_URL}/api/whatsapp/sessions`

**Criar:**
- `apiClient.createSession({ name: "Minha Sessão" })` → `POST ${API_BASE_URL}/api/whatsapp/sessions`

**Iniciar:**
- `apiClient.startSession(sessionId)` → `POST ${API_BASE_URL}/api/whatsapp/sessions/${sessionId}/start`

**Status:**
- `apiClient.getSessionStatus(sessionId)` → `GET ${API_BASE_URL}/api/whatsapp/sessions/${sessionId}/status`

**QR Code:**
- `apiClient.getQRCode(sessionId)` → `GET ${API_BASE_URL}/api/whatsapp/sessions/${sessionId}/qr`

### Mensagens em Tempo Real (WebSocket)

1. Frontend conecta via `socketClient.connect()`
2. Conexão WebSocket para `${WS_BASE_URL}/socket.io`
3. Em produção: `wss://eeeeeeee-production.up.railway.app/socket.io`
4. Eventos recebidos:
   - `whatsapp:qr` - Novo QR Code gerado
   - `whatsapp:status` - Mudança de status da sessão
   - `whatsapp:message` - Nova mensagem recebida

## Troubleshooting

### Erro: "ERR_CONNECTION_REFUSED localhost:3001"

**Causa:** Variáveis de ambiente não configuradas na Vercel

**Solução:**
1. Vá para Vercel Dashboard → Seu Projeto → Settings → Environment Variables
2. Adicione `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WS_URL`
3. Redeploy o projeto

### Erro: "getContacts is not a function"

**Causa:** Cache antigo do navegador ou versão desatualizada

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Faça hard reload (Ctrl+Shift+R)
3. Verifique se está na versão mais recente do deploy

### WebSocket não conecta

**Causa:** URL incorreta ou CORS bloqueado

**Solução:**
1. Verifique se `NEXT_PUBLIC_WS_URL` usa `wss://` (não `ws://`) em produção
2. Verifique se o Railway está rodando na porta 5000
3. Verifique os logs do backend no Railway para ver se há erros de CORS

## Checklist de Deploy

- [ ] Variáveis configuradas na Vercel
- [ ] Variáveis configuradas no Railway
- [ ] Backend rodando sem erros no Railway
- [ ] Logs `[v0]` mostram URLs corretas (sem localhost)
- [ ] WebSocket conectando com sucesso
- [ ] Chamadas API retornando 200 (não 404 ou CORS)
- [ ] Consegue criar sessão do WhatsApp
- [ ] QR Code aparece na tela
- [ ] Consegue receber mensagens em tempo real
