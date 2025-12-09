# Guia Completo de Deploy em Produção - SaaS CRM WhatsApp

## Arquivos Modificados

1. **package.json** - Atualizado Next.js para 15.1.6 (estável e seguro)
2. **lib/api-client.ts** - Removidas todas as referências a localhost, adicionada validação rigorosa de env vars
3. **app/(dashboard)/whatsapp/page.tsx** - WebSocket usando NEXT_PUBLIC_API_URL, sem fallbacks para localhost
4. **.env.example** - Criado template com variáveis necessárias

## Variáveis de Ambiente Necessárias

### Vercel (Frontend)

Configure estas variáveis no painel da Vercel:

\`\`\`
NEXT_PUBLIC_API_URL=https://dwxw-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
\`\`\`

### Railway (Backend)

Configure estas variáveis no painel do Railway:

\`\`\`
NODE_ENV=production
PORT=5000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
FRONTEND_URL=https://seu-app.vercel.app
\`\`\`

## Checklist de Deploy

### 1. Verificar Variáveis de Ambiente

- [ ] NEXT_PUBLIC_API_URL configurada na Vercel
- [ ] NEXT_PUBLIC_API_URL aponta para Railway (https://dwxw-production.up.railway.app)
- [ ] SUPABASE_SERVICE_ROLE_KEY configurada no Railway
- [ ] FRONTEND_URL configurada no Railway

### 2. Fazer Commit e Push

\`\`\`bash
git add .
git commit -m "fix: production deployment configuration"
git push origin main
\`\`\`

### 3. Deploy na Vercel

A Vercel vai automaticamente:
- Detectar as mudanças
- Fazer build com Next.js 15.1.6
- Usar as variáveis de ambiente configuradas
- Deploy em produção

### 4. Testar a Aplicação

- [ ] Acesse https://seu-app.vercel.app
- [ ] Teste criar uma nova sessão WhatsApp
- [ ] Verifique se o QR code aparece
- [ ] Escaneie o QR code com WhatsApp
- [ ] Confirme que o status muda para "Conectado"
- [ ] Envie e receba mensagens em tempo real

## Troubleshooting

### Erro: "NEXT_PUBLIC_API_URL is not set"

**Solução:** Configure a variável no painel da Vercel e faça redeploy.

### Erro: "Failed to fetch" ou "ERR_CONNECTION_REFUSED"

**Causas possíveis:**
1. NEXT_PUBLIC_API_URL não configurada ou incorreta
2. Backend no Railway offline
3. CORS não configurado no backend

**Solução:**
1. Verifique as variáveis de ambiente
2. Confirme que o Railway está rodando
3. Verifique os logs do Railway

### Erro: "WebSocket connection failed"

**Causas possíveis:**
1. NEXT_PUBLIC_API_URL incorreta
2. Socket.IO não está rodando no backend
3. Firewall bloqueando WebSocket

**Solução:**
1. Confirme que NEXT_PUBLIC_API_URL está correta
2. Verifique os logs do Railway para confirmar que Socket.IO iniciou
3. Teste a conexão WebSocket diretamente

### QR Code não aparece

**Causas possíveis:**
1. Backend não está gerando QR code
2. WhatsApp-web.js não está inicializado
3. Chromium não está instalado no Railway

**Solução:**
1. Verifique os logs do Railway
2. Confirme que o Dockerfile instala Chromium
3. Teste o endpoint `/api/whatsapp/sessions/:id/qr` manualmente

## Logs Esperados

### Frontend (Console do Navegador)

\`\`\`
[API] Configured with baseURL: https://dwxw-production.up.railway.app
[SOCKET] Initializing connection to: https://dwxw-production.up.railway.app
[SOCKET] Connected successfully to https://dwxw-production.up.railway.app
[SOCKET] Received QR for session: abc123
[SOCKET] Status update: abc123 connected
[SOCKET] New message received: {...}
\`\`\`

### Backend (Railway Logs)

\`\`\`
Server listening on port 5000
Socket.IO initialized
WhatsApp session abc123 created
QR code generated for session abc123
Session abc123 authenticated
Session abc123 ready
Message received from +5511999999999
\`\`\`

## Comandos Úteis

### Ver logs do Railway

\`\`\`bash
railway logs
\`\`\`

### Testar endpoint da API

\`\`\`bash
curl https://dwxw-production.up.railway.app/api/whatsapp/sessions
\`\`\`

### Verificar variáveis de ambiente na Vercel

\`\`\`bash
vercel env ls
\`\`\`

## Suporte

Se após seguir este guia você ainda tiver problemas:

1. Verifique os logs do Railway e da Vercel
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Teste a conexão manualmente com curl
4. Verifique se o backend está respondendo em https://dwxw-production.up.railway.app

## Próximos Passos

Depois de confirmar que tudo funciona:

1. Configure um domínio personalizado na Vercel
2. Configure SSL no Railway (automático)
3. Configure monitoring e alertas
4. Implemente backup do banco de dados
5. Configure CI/CD para deploys automáticos
