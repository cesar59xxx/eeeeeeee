# 🌐 GUIA COMPLETO DE VARIÁVEIS DE AMBIENTE

## 📋 RESUMO RÁPIDO

| Plataforma | Variável | Valor de Produção |
|------------|----------|-------------------|
| **Vercel** | `NEXT_PUBLIC_API_URL` | `https://eeeeeeee-production.up.railway.app` |
| **Vercel** | `NEXT_PUBLIC_WS_URL` | `wss://eeeeeeee-production.up.railway.app` |
| **Vercel** | `NEXT_PUBLIC_SUPABASE_URL` | `https://ldieqcofinpcpgzownw.supabase.co` |
| **Vercel** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (sua chave) |
| **Railway** | `PORT` | `8080` |
| **Railway** | `NODE_ENV` | `production` |
| **Railway** | `FRONTEND_URL` | `https://seu-app.vercel.app` |
| **Railway** | `NEXT_PUBLIC_SUPABASE_URL` | `https://ldieqcofinpcpgzownw.supabase.co` |
| **Railway** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (sua chave) |
| **Railway** | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (service role) |
| **Railway** | `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | `true` |
| **Railway** | `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` |

---

## 🎯 VERCEL (Frontend)

### Como adicionar:

1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Settings → Environment Variables
4. Para cada variável:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://eeeeeeee-production.up.railway.app`
   - Environments: ✅ Production ✅ Preview ✅ Development
   - Save

### Variáveis obrigatórias:

\`\`\`bash
# Backend API
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app

# WebSocket
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofinpcpgzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### ⚠️ IMPORTANTE:

- Todas as variáveis que começam com `NEXT_PUBLIC_` ficam EXPOSTAS no browser
- Após adicionar/modificar variáveis, você DEVE fazer Redeploy
- Para Redeploy: Deployments → mais recente → três pontos → Redeploy

---

## 🚂 RAILWAY (Backend)

### Como adicionar:

1. Acesse: https://railway.app/dashboard
2. Clique no seu projeto
3. Clique no serviço
4. Aba "Variables"
5. New Variable → adicionar uma por uma

### Variáveis obrigatórias:

\`\`\`bash
# Server
PORT=8080
NODE_ENV=production

# CORS
FRONTEND_URL=https://seu-app.vercel.app

# Supabase - Backend precisa das 3 chaves
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofinpcpgzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WhatsApp (Puppeteer)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
\`\`\`

### 📝 Notas:

- **PORT**: Railway injeta automaticamente, mas definir 8080 garante consistência
- **FRONTEND_URL**: Usado pelo CORS para permitir requests da Vercel
- **SUPABASE_SERVICE_ROLE_KEY**: Chave secreta que permite bypass do RLS

---

## 🗄️ SUPABASE

### Onde encontrar as chaves:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: `ldieqcofinpcpgzownw`
3. Settings → API
4. Copie:
   - **Project URL**: para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: para `SUPABASE_SERVICE_ROLE_KEY` (apenas Railway!)

### ⚠️ SEGURANÇA:

- **anon key**: pode ser exposta (tem RLS)
- **service_role key**: NUNCA exponha no frontend (bypass RLS)
- Use service_role APENAS no backend (Railway)

---

## 🔍 COMO VERIFICAR SE ESTÁ CORRETO

### Teste 1: Vercel build

\`\`\`bash
# Durante o build, procure por:
Collecting environment variables...
✓ NEXT_PUBLIC_API_URL is set
✓ NEXT_PUBLIC_WS_URL is set
\`\`\`

### Teste 2: Runtime no navegador

\`\`\`javascript
// Console do navegador (F12):
console.log(process.env.NEXT_PUBLIC_API_URL)
// Deve mostrar: https://eeeeeeee-production.up.railway.app

console.log(process.env.NEXT_PUBLIC_API_URL?.includes('localhost'))
// Deve mostrar: false
\`\`\`

### Teste 3: Railway logs

\`\`\`bash
# Logs do Railway devem mostrar:
📱 Frontend: seu-app.vercel.app
# E NÃO:
📱 Frontend: não configurado
\`\`\`

### Teste 4: API request

\`\`\`bash
# Teste direto:
curl https://eeeeeeee-production.up.railway.app/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2025-01-09T...",
  "uptime": 123.45
}
\`\`\`

---

## ❌ ERROS COMUNS

### "localhost refused connection"

**Causa**: `NEXT_PUBLIC_API_URL` não está definida na Vercel

**Como corrigir**:
1. Vercel → Settings → Environment Variables
2. Adicionar `NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app`
3. Redeploy

---

### "WebSocket connection failed"

**Causa**: `NEXT_PUBLIC_WS_URL` não está definida ou está incorreta

**Como corrigir**:
1. Verifique se tem `wss://` (não `ws://`)
2. URL deve ser a mesma do API, mas com `wss://`
3. Redeploy após adicionar

---

### "Database connection failed"

**Causa**: Supabase keys incorretas ou não definidas

**Como corrigir**:
1. Copie novamente do Supabase Dashboard
2. Certifique-se de copiar a key completa (são longas)
3. Adicione em AMBOS: Vercel e Railway
4. Redeploy

---

## 📝 TEMPLATE PRONTO PARA COPIAR

### Para Vercel:

\`\`\`env
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofinpcpgzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
\`\`\`

### Para Railway:

\`\`\`env
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://seu-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofinpcpgzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_AQUI
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
