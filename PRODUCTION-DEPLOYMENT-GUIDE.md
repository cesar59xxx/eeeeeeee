# Guia de Deploy em Produção

## Problema Resolvido

O frontend estava tentando conectar em `localhost:5000` e `localhost:3001` em produção, causando erros:
- `Failed to fetch`
- `ERR_CONNECTION_REFUSED`
- `Endpoint não encontrado`

## Correções Implementadas

### 1. API Client (`lib/api-client.ts`)
- Removido todos os fallbacks para localhost
- Adicionado validação de variáveis de ambiente
- Melhorado tratamento de erros com logs claros
- WebSocket agora usa `NEXT_PUBLIC_SOCKET_URL` ou `NEXT_PUBLIC_API_URL`

### 2. WhatsApp Page (`app/(dashboard)/whatsapp/page.tsx`)
- Removido hardcoded `http://localhost:5000`
- WebSocket conecta usando `NEXT_PUBLIC_SOCKET_URL` ou `NEXT_PUBLIC_API_URL`
- Adicionado logs detalhados para debug
- Mensagens de erro mais claras para o usuário

### 3. Diagnostics Page (`app/diagnostics/page.tsx`)
- Removido fallback para localhost
- Validação rigorosa de variáveis de ambiente
- Diagnóstico para antes se variáveis não estiverem configuradas

## Configuração das Variáveis de Ambiente

### Na Vercel (Frontend)

Acesse: Vercel Dashboard → Seu Projeto → Settings → Environment Variables

Adicione estas variáveis para **Production**, **Preview** e **Development**:

\`\`\`bash
NEXT_PUBLIC_API_URL=https://seu-projeto.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://seu-projeto.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...sua-chave-anon
\`\`\`

### No Railway (Backend)

As seguintes variáveis já devem estar configuradas:

\`\`\`bash
PORT=5000
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...sua-chave-service-role
FRONTEND_URL=https://seu-projeto.vercel.app
\`\`\`

## Testando a Conexão

### 1. Teste Manual

Acesse estas URLs diretamente no navegador:

- `https://seu-projeto.up.railway.app` → Deve retornar JSON com informações do backend
- `https://seu-projeto.up.railway.app/health` → Deve retornar `{"status": "ok"}`
- `https://seu-projeto.up.railway.app/api/health` → Deve retornar status da API

### 2. Teste Automatizado

Acesse no frontend: `https://seu-projeto.vercel.app/diagnostics`

Isso executará testes automáticos de:
- Variáveis de ambiente
- Conectividade com backend
- Health checks
- CORS
- Conexão Supabase

### 3. Console do Navegador

Pressione F12 e vá para a aba Console. Procure por:

✅ **Logs de sucesso:**
\`\`\`
[v0] Connecting WebSocket to: https://...
[v0] WebSocket connected to https://...
\`\`\`

❌ **Logs de erro:**
\`\`\`
[API ERROR] API URL not configured...
[SOCKET ERROR] NEXT_PUBLIC_SOCKET_URL not set...
\`\`\`

## Fluxo de Criação de Instância

1. Usuário clica em "Nova Sessão"
2. Frontend faz POST para `${NEXT_PUBLIC_API_URL}/api/whatsapp/sessions`
3. Backend cria a sessão e retorna sessionId
4. Frontend chama `${NEXT_PUBLIC_API_URL}/api/whatsapp/sessions/${sessionId}/start`
5. Backend inicia WhatsApp e começa a gerar QR code
6. WebSocket emite `whatsapp:qr` com o QR code
7. Frontend exibe o QR code no modal
8. Quando conectado, WebSocket emite `whatsapp:status` com status "ready"
9. Modal fecha automaticamente e status muda para "Conectado"

## Checklist de Deploy

- [ ] Variáveis configuradas na Vercel
- [ ] Backend rodando no Railway (check logs)
- [ ] Teste manual das URLs do backend
- [ ] Acesse /diagnostics no frontend
- [ ] Todos os testes passando (verde)
- [ ] Console sem erros de conexão
- [ ] Criar sessão funciona
- [ ] QR code aparece
- [ ] WebSocket conectado

## Troubleshooting

### "Failed to fetch" ou "ERR_CONNECTION_REFUSED"

Causa: NEXT_PUBLIC_API_URL não configurada ou backend offline

Solução:
1. Verifique variáveis na Vercel
2. Acesse Railway e confirme que o serviço está UP
3. Teste a URL manualmente no navegador

### "Endpoint não encontrado" (404)

Causa: URL incorreta ou endpoint não existe no backend

Solução:
1. Verifique se a URL não tem `/` duplicada
2. Confirme que o backend tem a rota implementada
3. Veja logs do Railway para erros

### WebSocket não conecta

Causa: NEXT_PUBLIC_SOCKET_URL não configurada ou CORS bloqueando

Solução:
1. Configure NEXT_PUBLIC_SOCKET_URL com a mesma URL do backend
2. Verifique logs do Railway para erros de CORS
3. Confirme que o backend está usando Socket.IO

### QR Code não aparece

Causa: WhatsApp não inicializou ou puppeteer falhou

Solução:
1. Veja logs do Railway para erros do puppeteer
2. Confirme que Chromium está instalado no Dockerfile
3. Verifique variáveis do Supabase (SERVICE_ROLE_KEY)

## Logs Importantes

### Frontend (Console F12)
\`\`\`
[v0] Connecting WebSocket to: https://...
[v0] WebSocket connected
[v0] Received QR for session: xxx
[v0] Status update: xxx connected
\`\`\`

### Backend (Railway Logs)
\`\`\`
[Socket.IO] Cliente conectado: socket-id
[WhatsAppManager] Sessão xxx iniciada
[WhatsAppManager] QR code gerado para xxx
[Socket.IO] Emitindo whatsapp:qr para sessão xxx
\`\`\`

## Suporte

Se os problemas persistirem após seguir este guia:

1. Execute /diagnostics e copie todos os resultados
2. Copie logs do Railway (últimas 50 linhas)
3. Copie logs do Console do navegador (F12)
4. Verifique se TODAS as variáveis de ambiente estão configuradas corretamente
