# 🚀 Deploy em Produção - Guia Completo

## ✅ CHECKLIST FINAL DE DEPLOY

### 1️⃣ Vercel (Frontend)
Acesse: https://vercel.com/seu-usuario/seu-projeto/settings/environment-variables

Adicione estas variáveis:

\`\`\`env
NEXT_PUBLIC_API_URL=https://dwxw-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmineppqzownq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
\`\`\`

### 2️⃣ Railway (Backend)
Acesse: https://railway.app/project/seu-projeto/variables

Adicione estas variáveis:

\`\`\`env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://seu-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmineppqzownq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
SESSIONS_PATH=/app/.wwebjs_auth
\`\`\`

### 3️⃣ Supabase
Execute no SQL Editor:

\`\`\`sql
-- Garantir que o tenant existe
INSERT INTO public.tenants (name, email, plan, status)
VALUES ('Tenant Principal', 'cesar.mediotec@gmail.com', 'free', 'active')
ON CONFLICT (email) DO NOTHING;

-- Verificar tabelas existentes
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'whatsapp_sessions') as sessions_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'messages') as messages_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'contacts') as contacts_table;
\`\`\`

## 🧪 TESTES PÓS-DEPLOY

### Teste 1: Backend Health Check
\`\`\`bash
curl https://dwxw-production.up.railway.app/health
\`\`\`

Esperado:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2025-12-02T...",
  "uptime": 123.45
}
\`\`\`

### Teste 2: Frontend conecta ao Backend
1. Abra: https://seu-app.vercel.app/whatsapp
2. Abra o Console (F12)
3. Procure por:
   - `[API] Configured with baseURL: https://dwxw-production.up.railway.app`
   - `[SOCKET] Connected successfully to https://dwxw-production.up.railway.app`

Se aparecer localhost, REDEPLOYE o frontend.

### Teste 3: Criar Sessão WhatsApp
1. Clique em "Nova Sessão"
2. Digite um nome
3. Clique em "Criar Sessão"
4. O QR Code deve aparecer automaticamente

### Teste 4: WebSocket em Tempo Real
1. Abra o Console
2. Procure por: `[SOCKET] Received QR for session: session-...`
3. Quando conectar, deve aparecer: `[SOCKET] Status update: session-... connected`

## 🐛 TROUBLESHOOTING

### Erro: "NEXT_PUBLIC_API_URL environment variable is not set"
**Solução:** A variável não está configurada na Vercel.
1. Vá em Vercel > Settings > Environment Variables
2. Adicione `NEXT_PUBLIC_API_URL=https://dwxw-production.up.railway.app`
3. Clique em "Redeploy"

### Erro: "Failed to load sessions: Failed to fetch"
**Solução:** O backend não está acessível ou CORS está bloqueado.
1. Verifique se o Railway está rodando: `curl https://dwxw-production.up.railway.app/health`
2. Verifique se `FRONTEND_URL` no Railway está correto
3. Redeploy do backend

### Erro: "[SOCKET ERROR] Failed to connect to ... - connect_econnrefused"
**Solução:** O WebSocket não consegue conectar ao backend.
1. Verifique se `NEXT_PUBLIC_API_URL` tem `https://` (não `http://`)
2. Verifique se o Railway permite conexões WebSocket
3. Teste manualmente: `wscat -c wss://dwxw-production.up.railway.app/socket.io/`

### Erro: "No tenant found. Please create a tenant first."
**Solução:** A tabela `tenants` está vazia.
1. Execute o SQL do item 3️⃣ acima no Supabase SQL Editor
2. Tente criar a sessão novamente

### QR Code não aparece
**Verificações:**
1. Console mostra `[SOCKET] Received QR for session: ...`?
   - **SIM:** O QR está chegando. Problema no frontend.
   - **NÃO:** O backend não está gerando QR. Verifique logs do Railway.
2. Verifique se Chromium está instalado no Railway:
   \`\`\`bash
   railway run which chromium
   \`\`\`
3. Verifique se `PUPPETEER_EXECUTABLE_PATH` está configurado

### Mensagens não aparecem
**Verificações:**
1. Selecione uma instância CONECTADA (badge verde)
2. Verifique no Console:
   \`\`\`
   [SOCKET] New message received: {...}
   \`\`\`
3. Se não aparecer, o backend não está capturando mensagens do WhatsApp

## 📊 LOGS ESPERADOS

### Frontend Console (Sucesso)
\`\`\`
[API] Configured with baseURL: https://dwxw-production.up.railway.app
[SOCKET] Connecting to: https://dwxw-production.up.railway.app
[SOCKET] Connected successfully to https://dwxw-production.up.railway.app
[SOCKET] Received QR for session: session-1733123456789
[SOCKET] Status update: session-1733123456789 connected
[SOCKET] New message received: {sessionId: "...", body: "Olá!"}
\`\`\`

### Backend Railway (Sucesso)
\`\`\`
🚀 WhatsApp CRM Backend iniciando...
╔═══════════════════════════════════╗
║   ✅ SERVIDOR FUNCIONANDO!        ║
╠═══════════════════════════════════╣
║ 🔗 Porta: 5000                    ║
║ 🌐 Health: /health                ║
║ 📱 Frontend: https://seu-app.vercel.app ║
║ 💬 WhatsApp: ATIVO                ║
╚═══════════════════════════════════╝

[v0] 🔌 Client connected: abc123
[v0] Client abc123 joining session: session-1733123456789
[v0] GET /api/whatsapp/sessions - fetching real sessions
[v0] ✅ Session created successfully in Supabase: 123
[v0] Initializing WhatsApp for session session-1733123456789
[v0] ✅ WhatsApp initialized for session session-1733123456789
\`\`\`

## 🎯 RESULTADO FINAL

Após seguir todos os passos:

✅ Frontend na Vercel carrega sem erros
✅ Backend no Railway responde a /health
✅ Criar sessão funciona e salva no Supabase
✅ QR Code aparece automaticamente
✅ Status muda para "Conectado" quando escanear QR
✅ Conversas aparecem na coluna do meio
✅ Mensagens carregam em tempo real
✅ Enviar mensagem funciona
✅ Dashboard mostra números corretos

## 🔗 URLs IMPORTANTES

- Frontend: https://seu-app.vercel.app
- Backend: https://dwxw-production.up.railway.app
- Backend Health: https://dwxw-production.up.railway.app/health
- Supabase: https://supabase.com/dashboard/project/ldieqcofmineppqzownq
- Vercel Dashboard: https://vercel.com/seu-usuario/seu-projeto
- Railway Dashboard: https://railway.app/project/seu-projeto
