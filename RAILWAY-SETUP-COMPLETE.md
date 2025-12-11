# 🚀 Guia Completo de Configuração - Railway + Vercel

## ❌ PROBLEMA IDENTIFICADO

O erro de CORS acontece porque **a variável `FRONTEND_URL` não está configurada na Railway**.

Veja nas suas screenshots:
- ✅ Railway tem: `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.
- ❌ **FALTANDO**: `FRONTEND_URL` (necessária para o CORS no backend)

## 🔧 SOLUÇÃO EM 3 PASSOS

### PASSO 1: Adicionar `FRONTEND_URL` na Railway

1. Vá para: https://railway.app/project/seu-projeto/service/eeeeeeee
2. Clique em **Variables** (ou Settings > Variables)
3. Clique em **New Variable**
4. Adicione:
   \`\`\`
   Nome: FRONTEND_URL
   Valor: https://eeeeeeee-eight.vercel.app
   \`\`\`
5. Clique em **Add** e aguarde o **redeploy automático**

### PASSO 2: Verificar Variáveis da Vercel

Confirme que estas variáveis estão configuradas na Vercel:

\`\`\`env
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
\`\`\`

✅ Você JÁ TEM TODAS essas configuradas (vi na screenshot)

### PASSO 3: Testar Conexão

Após o redeploy da Railway (leva ~2 minutos):

1. Abra o frontend: https://eeeeeeee-eight.vercel.app
2. Abra o DevTools (F12) e vá para **Console**
3. Clique em **Nova** instância
4. Digite um nome (ex: "teste")
5. Clique em **Criar Sessão**

**O que você deve ver:**
- ✅ "[v0] Creating session: teste"
- ✅ "[v0] Session created: xxxxxxxx"
- ✅ QR Code aparecendo na tela

**Se ainda der erro CORS**, verifique:
- Railway fez redeploy completo? (Build Logs mostram "Starting Container"?)
- A variável `FRONTEND_URL` aparece na aba "Variables" da Railway?

## 📋 CHECKLIST COMPLETO

### Railway (Backend)
- [ ] `PORT` → **NÃO PRECISA** (Railway injeta automaticamente)
- [ ] `NODE_ENV` → `production` ✅
- [ ] `FRONTEND_URL` → `https://eeeeeeee-eight.vercel.app` ❌ **ADICIONAR AGORA**
- [ ] `SUPABASE_URL` → `https://ldieqcofmincppqzownw.supabase.co` ✅
- [ ] `SUPABASE_SERVICE_ROLE_KEY` → `eyJhbGci...` ✅
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` → `true` ✅
- [ ] `PUPPETEER_EXECUTABLE_PATH` → `/usr/bin/chromium-browser` ✅

### Vercel (Frontend)
- [ ] `NEXT_PUBLIC_API_URL` → `https://eeeeeeee-production.up.railway.app` ✅
- [ ] `NEXT_PUBLIC_WS_URL` → `wss://eeeeeeee-production.up.railway.app` ✅
- [ ] `NEXT_PUBLIC_SUPABASE_URL` → `https://ldieqcofmincppqzownw.supabase.co` ✅
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `eyJhbGci...` ✅

## 🐛 TROUBLESHOOTING

### Erro: "Failed to fetch"
- **Causa**: Railway ainda não terminou o redeploy
- **Solução**: Aguarde 2-3 minutos e tente novamente

### Erro: "502 Bad Gateway" no WebSocket
- **Causa**: Backend não está rodando ou porta incorreta
- **Solução**: Verifique os logs da Railway (Deploy Logs)

### Erro: "Not authenticated"
- **Causa**: Usuário não está logado no Supabase
- **Solução**: Faça login na aplicação primeiro

### QR Code não aparece
- **Causa**: Puppeteer não conseguiu iniciar o Chrome
- **Solução**: Verifique se `PUPPETEER_EXECUTABLE_PATH` está configurado

## 🎯 RESUMO VISUAL

\`\`\`
┌─────────────────────────────────────────────┐
│ VERCEL (Frontend)                           │
│ eeeeeeee-eight.vercel.app                   │
│                                             │
│ Variáveis:                                  │
│ • NEXT_PUBLIC_API_URL ✅                    │
│ • NEXT_PUBLIC_WS_URL ✅                     │
│ • NEXT_PUBLIC_SUPABASE_* ✅                 │
└──────────────┬──────────────────────────────┘
               │
               │ HTTP/WS Requests
               ▼
┌─────────────────────────────────────────────┐
│ RAILWAY (Backend)                           │
│ eeeeeeee-production.up.railway.app          │
│                                             │
│ Variáveis:                                  │
│ • FRONTEND_URL ❌ → ADICIONAR AGORA!        │
│ • SUPABASE_* ✅                             │
│ • PUPPETEER_* ✅                            │
└──────────────┬──────────────────────────────┘
               │
               │ Database Queries
               ▼
┌─────────────────────────────────────────────┐
│ SUPABASE (Database)                         │
│ ldieqcofmincppqzownw.supabase.co            │
│                                             │
│ Tabelas: ✅                                 │
│ • users, whatsapp_sessions, messages, etc.  │
└─────────────────────────────────────────────┘
\`\`\`

## ✅ PRÓXIMOS PASSOS

Depois que adicionar `FRONTEND_URL` e o backend fazer redeploy:

1. Teste criar uma instância WhatsApp
2. Escaneie o QR Code com seu celular
3. Verifique se mensagens aparecem no inbox
4. Teste enviar uma mensagem

**Tudo deve funcionar perfeitamente!** 🎉
