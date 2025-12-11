# 🚀 Instruções Completas de Deploy - WhatsApp CRM v3.0

## ✅ PASSO 1: Executar Script SQL no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `scripts/00-REBUILD-ALL-TABLES.sql`
4. **COPIE TODO O CONTEÚDO**
5. **COLE no SQL Editor**
6. Clique em **RUN**
7. Aguarde a confirmação de sucesso

**⚠️ ATENÇÃO**: Este script vai **DROPAR** as tabelas existentes e recriar com RLS habilitado!

## ✅ PASSO 2: Configurar Variáveis de Ambiente na Vercel

No dashboard da Vercel, adicione estas variáveis:

\`\`\`bash
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=<seu-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<seu-supabase-anon-key>
\`\`\`

**IMPORTANTE**: Use a **ANON KEY**, não a SERVICE ROLE KEY!

## ✅ PASSO 3: Configurar Variáveis no Railway

No dashboard do Railway, configure:

\`\`\`bash
NODE_ENV=production
PORT=5000
NEXT_PUBLIC_SUPABASE_URL=<seu-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<seu-service-role-key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<seu-anon-key>
FRONTEND_URL=https://eeeeeeee-eight.vercel.app
SESSIONS_PATH=./whatsapp-sessions
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
\`\`\`

## ✅ PASSO 4: Deploy do Backend

1. **Commit** todas as mudanças:
\`\`\`bash
git add .
git commit -m "feat: rebuild WhatsApp system with RLS and user isolation"
git push origin main
\`\`\`

2. Railway vai fazer **auto-deploy**
3. Aguarde 2-3 minutos

## ✅ PASSO 5: Deploy do Frontend

1. Vercel vai detectar o push automaticamente
2. Ou force um novo deploy no dashboard da Vercel
3. Aguarde o build completar

## ✅ PASSO 6: Testar o Sistema

1. Acesse `https://eeeeeeee-eight.vercel.app/whatsapp`
2. Faça login com sua conta
3. Crie uma nova instância WhatsApp
4. O QR Code deve aparecer automaticamente
5. Escaneie com WhatsApp no celular
6. Status deve mudar para "Conectado"
7. Envie/receba mensagens

## 🔒 Isolamento por Usuário

Agora o sistema está **completamente isolado**:

- ✅ Cada usuário vê **apenas suas próprias instâncias**
- ✅ **RLS (Row Level Security)** habilitado no Supabase
- ✅ Backend valida **JWT token** em todas as requisições
- ✅ **user_id** obrigatório em todas as tabelas
- ✅ Políticas de segurança aplicadas automaticamente

## 🐛 Troubleshooting

### Erro: "Authentication required"
- Verifique se está logado
- Confirme que o token JWT está sendo enviado

### Erro: "Session not found"
- Confirme que as variáveis de ambiente estão corretas
- Verifique se o script SQL foi executado

### QR Code não aparece
- Verifique os logs do Railway
- Confirme que o Chromium está instalado
- Teste o endpoint `/health` do backend

### Mensagens não chegam
- Verifique se o WebSocket está conectado (console do navegador)
- Confirme que a session está "connected"
- Verifique os logs do Railway para erros

## 📊 Verificar Logs

**Backend (Railway)**:
\`\`\`bash
railway logs
\`\`\`

**Frontend (Vercel)**:
- Dashboard → Deployment → View Function Logs

## ✅ Sistema Completo

Agora você tem:
- ✅ Autenticação real via Supabase
- ✅ Isolamento completo por usuário
- ✅ RLS habilitado
- ✅ WhatsApp-web.js integrado
- ✅ Mensagens em tempo real via Socket.IO
- ✅ Backend no Railway
- ✅ Frontend na Vercel
