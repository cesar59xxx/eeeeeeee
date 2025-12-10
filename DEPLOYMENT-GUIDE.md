# Guia Completo de Deploy - WhatsApp CRM

## Arquitetura

- **Frontend**: Vercel (Next.js 15)
- **Backend**: Railway (Node.js + Express + whatsapp-web.js)
- **Database**: Supabase (PostgreSQL + Auth)

## Variáveis de Ambiente

### Frontend (Vercel)

\`\`\`env
# Supabase - OBRIGATÓRIO
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend Railway - OBRIGATÓRIO
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app

# Interna (opcional - usa NEXT_PUBLIC_API_URL se não definida)
API_INTERNAL_URL=https://eeeeeeee-production.up.railway.app
\`\`\`

### Backend (Railway)

\`\`\`env
# Supabase - OBRIGATÓRIO (use SERVICE_ROLE_KEY, não ANON_KEY)
SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # NUNCA expor no frontend!

# Frontend URL - OBRIGATÓRIO (para CORS)
FRONTEND_URL=https://eeeeeeee-git-main-cesarmediotec-9518s-projects.vercel.app

# Node
NODE_ENV=production
PORT=5000 # Railway injeta automaticamente
\`\`\`

## Checklist de Deploy

### 1. Backend (Railway)

- [ ] Adicionar variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL)
- [ ] Verificar que PORT não está hardcoded (Railway injeta automaticamente)
- [ ] Deploy deve completar sem erros
- [ ] Testar endpoint: `https://eeeeeeee-production.up.railway.app/health`
- [ ] Verificar logs de inicialização

### 2. Frontend (Vercel)

- [ ] Adicionar variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] Adicionar NEXT_PUBLIC_API_URL e NEXT_PUBLIC_WS_URL
- [ ] Deploy deve completar sem erros de vulnerabilidade
- [ ] Verificar no console do browser:
  - ✅ Não deve aparecer erros de localhost:3001 ou localhost:5000
  - ✅ Deve mostrar "Production mode: Using Railway backend"
  - ✅ API_URL e WS_URL devem apontar para Railway

### 3. Supabase

- [ ] Executar scripts SQL para criar tabelas (whatsapp_sessions, messages, tenants)
- [ ] Verificar Row Level Security (RLS) configurado
- [ ] Confirmar que tenant padrão existe

## Testando em Produção

1. Acesse https://eeeeeeee-git-main-cesarmediotec-9518s-projects.vercel.app/whatsapp
2. Abra DevTools (F12) e verifique Console:
   - Não deve ter erros de conexão
   - Deve mostrar logs "[v0] SOCKET: ✅ Connected"
3. Crie uma instância WhatsApp
4. QR Code deve aparecer
5. Escaneie com WhatsApp no celular
6. Status deve mudar para "Conectado"
7. Envie uma mensagem para o número conectado
8. Mensagem deve aparecer na UI em tempo real

## Troubleshooting

### Erro: ERR_CONNECTION_REFUSED localhost:3001

**Causa**: Frontend tentando conectar em localhost em vez da Railway

**Solução**: Verificar se NEXT_PUBLIC_API_URL está configurada na Vercel

### Erro: WebSocket connection failed localhost:5000

**Causa**: Frontend tentando conectar WebSocket em localhost

**Solução**: Verificar se NEXT_PUBLIC_WS_URL está configurada na Vercel (deve ser `wss://`)

### Erro: apiClient.getContacts is not a function

**Causa**: Método getContacts não existe no API client

**Solução**: Já foi adicionado no lib/api-client.ts desta atualização

### Mensagens não aparecem na UI

**Causas possíveis**:
1. Backend não está salvando mensagens no Supabase
2. Socket.IO não está emitindo eventos
3. Frontend não está conectado à sala correta

**Solução**: Verificar logs do backend no Railway e frontend no browser console
