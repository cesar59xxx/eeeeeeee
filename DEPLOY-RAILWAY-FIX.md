# Fix: Railway "Application failed to respond"

## O que foi corrigido

### 1. **Supabase Config** (`server/config/supabase.js`)
- ❌ **Antes**: `process.exit(1)` quando variáveis não estavam configuradas
- ✅ **Agora**: Servidor inicia mesmo sem Supabase, retorna warning

### 2. **Server Index** (`server/index.js`)
- ✅ **Health check na raiz** (`/` e `/health`) antes de qualquer middleware
- ✅ **Importação dinâmica** dos serviços (não bloqueia inicialização)
- ✅ **Middleware de verificação** para routes que precisam de serviços
- ✅ **Error handling** global para capturar erros
- ✅ **Graceful shutdown** para SIGTERM/SIGINT
- ✅ **Bind correto** em `0.0.0.0` para aceitar conexões externas
- ✅ **CORS configurado** corretamente com as origens permitidas

### 3. **Por que estava falhando?**

O Railway faz um **health check** acessando o servidor. Se o servidor:
- Não responde em poucos segundos → "Application failed to respond"
- Crash durante inicialização → "Application failed to respond"
- Não escuta em `0.0.0.0` → "Application failed to respond"

**Causa raiz**: O `process.exit(1)` no `supabase.js` estava fechando o servidor antes dele conseguir responder ao health check.

## Como testar localmente

\`\`\`bash
# No diretório /server
npm install
PORT=3001 npm start
\`\`\`

Acesse: `http://localhost:3001/` - deve retornar JSON com status "ok"

## Deploy na Railway

1. **Commit e push** estas mudanças para o GitHub
2. Railway fará **deploy automático**
3. Aguarde ~2 minutos para build completar
4. Acesse `https://eeeeeeee-production.up.railway.app/` 
5. Deve mostrar:
\`\`\`json
{
  "status": "ok",
  "message": "WhatsApp CRM Backend v3.0",
  "version": "3.0.0",
  "timestamp": "2025-12-11T...",
  "endpoints": {
    "health": "/health",
    "api": "/api/whatsapp"
  }
}
\`\`\`

## Variáveis necessárias na Railway

Certifique-se que estas estão configuradas:

- ✅ `FRONTEND_URL=https://eeeeeeee-eight.vercel.app`
- ✅ `NEXT_PUBLIC_SUPABASE_URL=...`
- ✅ `SUPABASE_SERVICE_ROLE_KEY=...`
- ✅ `NODE_ENV=production`
- ✅ `PORT=3001` (Railway pode sobrescrever)
- ✅ `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- ✅ `SESSIONS_PATH=./whatsapp-sessions`

## Após o deploy funcionar

O frontend Vercel deve conseguir conectar sem CORS errors.
