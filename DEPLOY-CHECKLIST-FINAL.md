# ✅ CHECKLIST FINAL DE DEPLOY

## 1️⃣ RAILWAY (Backend)

### Variáveis de Ambiente Obrigatórias:

\`\`\`bash
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://seu-app.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofinpcpgzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Puppeteer (para WhatsApp)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
\`\`\`

### Configuração:

- ✅ Projeto criado no Railway
- ✅ Repositório GitHub conectado
- ✅ Branch `main` selecionada
- ✅ Domínio gerado: `https://eeeeeeee-production.up.railway.app`
- ✅ Health check: `https://eeeeeeee-production.up.railway.app/health`

### Verificar Build:

\`\`\`bash
# Os logs devem mostrar:
✅ SERVIDOR ONLINE!
🔗 Porta: 8080
🌐 Health: /health
📱 Frontend: seu-app.vercel.app
💬 WhatsApp: ATIVO
\`\`\`

---

## 2️⃣ VERCEL (Frontend)

### Variáveis de Ambiente Obrigatórias:

\`\`\`bash
# Backend URLs - CRÍTICO!
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app

# Supabase (mesmas do backend)
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofinpcpgzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
\`\`\`

### Configuração:

- ✅ Projeto importado do GitHub
- ✅ Framework preset: Next.js
- ✅ Build command: `npm run build` (automático)
- ✅ Output directory: `.next` (automático)
- ✅ Node.js version: 18.x ou superior

### Verificar Build:

Deve compilar sem erros:
- ✅ Sem erros de "localhost"
- ✅ Sem erros de vulnerabilidade do Next.js
- ✅ Build concluído com sucesso

---

## 3️⃣ SUPABASE (Database)

### Tabelas Necessárias:

\`\`\`sql
-- Verificar se existem:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Deve retornar:
- tenants
- whatsapp_sessions
- messages
- contacts
\`\`\`

### Políticas RLS:

\`\`\`sql
-- Verificar RLS está ativo
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
\`\`\`

### Testar Conexão:

\`\`\`bash
# No Railway, testar endpoint:
curl https://eeeeeeee-production.up.railway.app/api/test/supabase

# Deve retornar:
{
  "success": true,
  "data": [...],
  "count": 0
}
\`\`\`

---

## 4️⃣ TESTE FINAL DO SISTEMA

### Backend Health Check:

\`\`\`bash
curl https://eeeeeeee-production.up.railway.app/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45
}
\`\`\`

### Frontend → Backend:

1. Abra o app na Vercel
2. Abra DevTools (F12)
3. Vá na aba Console
4. Procure por:
   - ✅ `[API] Configured with baseURL: https://eeeeeeee-production...`
   - ✅ `[SOCKET] Connected successfully to wss://eeeeeeee-production...`
   - ❌ **NÃO** deve aparecer "localhost"

### WhatsApp Flow:

1. Clique em "Nova Instância"
2. Digite um nome → "Criar Sessão"
3. Deve aparecer: "Sessão criada - iniciando conexão..."
4. Clique em "Conectar"
5. Modal abre mostrando "Gerando QR Code..."
6. QR Code aparece em ~5 segundos
7. Escaneie com WhatsApp
8. Modal fecha automaticamente
9. Status muda para "Conectado" (badge verde)

---

## 5️⃣ TROUBLESHOOTING

### ❌ Erro: "ERR_CONNECTION_REFUSED localhost:3001"

**Causa:** NEXT_PUBLIC_API_URL não está configurada na Vercel

**Solução:**
1. Vercel Dashboard → Seu projeto → Settings → Environment Variables
2. Adicionar: `NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app`
3. Clicar em "Redeploy"

---

### ❌ Erro: "WebSocket connection failed"

**Causa:** NEXT_PUBLIC_WS_URL não está configurada

**Solução:**
1. Adicionar: `NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app`
2. Redeploy

---

### ❌ Erro: "getContacts is not a function"

**Causa:** Código antigo em cache do navegador

**Solução:**
1. Limpar cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Ou abrir em aba anônima

---

### ❌ Erro: "QR Code não aparece"

**Causas possíveis:**
1. Backend não está rodando
2. Chromium não instalado no Railway
3. Session não foi criada no banco

**Solução:**
1. Verificar logs do Railway: `railway logs`
2. Verificar endpoint: `curl .../api/whatsapp/sessions`
3. Verificar tabela no Supabase

---

### ❌ Erro: "Session não conecta após escanear QR"

**Causa:** WebSocket não está emitindo eventos

**Solução:**
1. Verificar logs do Railway para "whatsapp:status"
2. Verificar se Socket.IO está inicializado
3. Testar endpoint: `curl .../api/debug/whatsapp`

---

## 6️⃣ LOGS ESPERADOS

### Railway (Backend):

\`\`\`
🚀 WhatsApp CRM Backend iniciando...
📦 Node.js: v18.x.x
🌍 Ambiente: production

╔═══════════════════════════════════╗
║   ✅ SERVIDOR ONLINE!             ║
╠═══════════════════════════════════╣
║ 🔗 Porta: 8080                    ║
║ 🌐 Health: /health                ║
║ 📱 Frontend: seu-app.vercel.app   ║
║ 💬 WhatsApp: ATIVO                ║
╚═══════════════════════════════════╝

[v0] 🔌 Client connected: abc123...
[v0] Client abc123 joining session: session-xxx
\`\`\`

### Vercel (Frontend Console):

\`\`\`
[API] Configured with baseURL: https://eeeeeeee-production.up.railway.app
[SOCKET] Initializing connection to: wss://eeeeeeee-production.up.railway.app
[SOCKET] ✅ Connected successfully to wss://eeeeeeee-production...
[SOCKET] Received QR for session: session-123...
[SOCKET] Status update: session-123 connected
\`\`\`

---

## ✅ SISTEMA FUNCIONANDO

Quando tudo estiver correto, você verá:

1. **Lista de Instâncias** carrega corretamente
2. **Criar nova sessão** funciona sem erros
3. **QR Code** aparece imediatamente
4. Após escanear, **status muda para "Conectado"**
5. **Conversas** aparecem na segunda coluna
6. **Mensagens** carregam ao selecionar conversa
7. **Enviar mensagem** funciona
8. **Mensagens recebidas** aparecem em tempo real

---

## 📞 SUPORTE

Se ainda houver problemas após seguir este checklist:

1. Copie os logs do Railway
2. Copie os logs do Console do navegador (F12)
3. Tire screenshots dos erros
4. Verifique se TODAS as variáveis de ambiente estão configuradas
5. Confirme que não há referências a "localhost" nos logs
