# 🚀 Guia Completo de Deploy - WhatsApp CRM

## 📋 Checklist Pré-Deploy

### ✅ Passos Completados
- [x] Next.js atualizado para versão estável (15.1.6)
- [x] URLs centralizadas em `lib/config.ts`
- [x] API Client atualizado com todos os métodos necessários
- [x] Supabase configurado corretamente (separação frontend/backend)
- [x] WebSocket usando URLs de produção
- [x] Método `getContacts()` adicionado ao API Client
- [x] Backend com todos os endpoints necessários

---

## 🎯 Arquitetura Final

\`\`\`
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  VERCEL (Next)  │────────▶│  RAILWAY (Node)  │────────▶│   SUPABASE DB   │
│                 │         │                  │         │                 │
│  Frontend       │         │  Backend API     │         │  PostgreSQL     │
│  + SSR          │         │  + WhatsApp      │         │  + Auth         │
│                 │         │  + Socket.IO     │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
\`\`\`

---

## 🔧 Configuração VERCEL (Frontend)

### 1. Variáveis de Ambiente Obrigatórias

Acesse: **Vercel Dashboard > Seu Projeto > Settings > Environment Variables**

Adicione as seguintes variáveis para **Production**, **Preview** e **Development**:

\`\`\`env
NEXT_PUBLIC_API_URL=https://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://eeeeeeee-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTU2ODIsImV4cCI6MjA3OTgzMTY4Mn0.lF1zMajkO46ilUeuKU14eDw-CM4TakEhpZbgBef5_Hg
\`\`\`

### 2. Build Settings

- **Framework Preset:** Next.js
- **Build Command:** `pnpm run build` (ou `npm run build`)
- **Output Directory:** `.next`
- **Install Command:** `pnpm install` (ou `npm install`)
- **Node Version:** 18.x ou superior

### 3. Deploy

\`\`\`bash
git add .
git commit -m "feat: configuração completa de produção"
git push origin main
\`\`\`

A Vercel vai fazer deploy automaticamente.

---

## 🚂 Configuração RAILWAY (Backend)

### 1. Variáveis de Ambiente Obrigatórias

Acesse: **Railway Dashboard > Seu Projeto > Variables**

\`\`\`env
NODE_ENV=production
FRONTEND_URL=https://seu-projeto.vercel.app
SUPABASE_URL=https://ldieqcofmincppqzownw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaWVxY29mbWluY3BwcXpvd253Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1NTY4MiwiZXhwIjoyMDc5ODMxNjgyfQ.uACDWkYujDnvXUeeeipzE5U_GichTZfFOvikR9CReZc
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
\`\`\`

**⚠️ IMPORTANTE:** NÃO configure a variável `PORT` manualmente. O Railway injeta automaticamente.

### 2. Configuração do Dockerfile

O Railway usa o `Dockerfile` da raiz do projeto. Certifique-se de que está correto:

\`\`\`dockerfile
FROM node:18-alpine
RUN apk add --no-cache chromium
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server/index.js"]
\`\`\`

### 3. Networking

- Railway vai gerar automaticamente um domínio público: `https://eeeeeeee-production.up.railway.app`
- Use esse domínio nas variáveis `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WS_URL` da Vercel

---

## 🗃️ Configuração SUPABASE

### 1. Tabelas Necessárias

Execute os seguintes scripts SQL no Supabase SQL Editor:

#### Tabela de Sessões WhatsApp

\`\`\`sql
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  is_connected BOOLEAN DEFAULT false,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_sessions_tenant ON whatsapp_sessions(tenant_id);
CREATE INDEX idx_sessions_status ON whatsapp_sessions(status);
\`\`\`

#### Tabela de Mensagens

\`\`\`sql
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status TEXT DEFAULT 'sent',
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_messages_session ON whatsapp_messages(session_id);
CREATE INDEX idx_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX idx_messages_from ON whatsapp_messages(from_number);
CREATE INDEX idx_messages_to ON whatsapp_messages(to_number);
\`\`\`

#### Tenant Padrão (se necessário)

\`\`\`sql
-- Criar tenant padrão se não existir
INSERT INTO tenants (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Tenant',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
\`\`\`

### 2. Row Level Security (RLS)

\`\`\`sql
-- Habilitar RLS nas tabelas
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso com service_role
CREATE POLICY "Service role can do everything"
  ON whatsapp_sessions
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything"
  ON whatsapp_messages
  USING (true)
  WITH CHECK (true);
\`\`\`

---

## 🧪 Testes de Validação

### 1. Teste Backend Railway

\`\`\`bash
# Health check
curl https://eeeeeeee-production.up.railway.app/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}
\`\`\`

### 2. Teste Frontend Vercel

Abra o DevTools Console e verifique:

\`\`\`
[CONFIG] API Base URL: https://eeeeeeee-production.up.railway.app
[CONFIG] WebSocket URL: wss://eeeeeeee-production.up.railway.app
[CONFIG] Supabase URL: https://ldieqcofmincppqzownw.supabase.co
\`\`\`

**❌ NÃO deve aparecer nenhuma referência a `localhost`!**

### 3. Teste Funcional Completo

1. **Criar Sessão WhatsApp:**
   - Clique em "Nova" na tela de Instâncias
   - Digite um nome e clique em "Criar Sessão"
   - ✅ Deve abrir modal com QR Code

2. **Conectar WhatsApp:**
   - Escaneie o QR Code com WhatsApp no celular
   - ✅ Status deve mudar para "Conectado"
   - ✅ Modal deve fechar automaticamente

3. **Visualizar Mensagens:**
   - Clique em uma sessão conectada
   - ✅ Deve listar conversas
   - Clique em uma conversa
   - ✅ Deve exibir mensagens

4. **Enviar Mensagem:**
   - Digite uma mensagem e clique em enviar
   - ✅ Mensagem deve aparecer na conversa

---

## 🐛 Troubleshooting

### Problema: "Failed to fetch" ao criar sessão

**Causa:** Frontend não consegue conectar ao backend

**Solução:**
1. Verifique se `NEXT_PUBLIC_API_URL` está configurada na Vercel
2. Verifique se o Railway está online: `https://eeeeeeee-production.up.railway.app/health`
3. Verifique CORS no backend: `FRONTEND_URL` deve apontar para Vercel

### Problema: "getContacts is not a function"

**Causa:** API Client desatualizado ou importação incorreta

**Solução:**
1. Verifique se o arquivo `lib/api-client.ts` tem o método `getContacts`
2. Verifique a importação: `import { apiClient } from '@/lib/api-client'`
3. Faça novo deploy da Vercel

### Problema: WebSocket não conecta

**Causa:** URL incorreta ou CORS bloqueando

**Solução:**
1. Verifique se `NEXT_PUBLIC_WS_URL` usa `wss://` (não `ws://`)
2. Confirme que Railway está configurado para aceitar WebSocket
3. Verifique CORS no backend Socket.IO

### Problema: QR Code não aparece

**Causa:** Chromium não instalado no Railway ou erro no WhatsApp Manager

**Solução:**
1. Verifique variáveis no Railway: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
2. Verifique logs do Railway para erros do Puppeteer
3. Confirme que o Dockerfile instala chromium: `RUN apk add --no-cache chromium`

---

## 📊 Monitoramento

### Logs Railway

\`\`\`bash
# Acessar logs
railway logs

# Verificar erros
railway logs --filter error
\`\`\`

### Logs Vercel

Acesse: **Vercel Dashboard > Seu Projeto > Deployments > Logs**

Procure por:
- ✅ `[CONFIG] API Base URL: https://eeeeeeee-production.up.railway.app`
- ✅ `[SOCKET] ✅ Connected successfully`
- ❌ Nenhuma referência a `localhost`

---

## ✅ Checklist Final

Antes de considerar o deploy completo:

- [ ] Vercel buildou sem erros
- [ ] Railway está online e respondendo em `/health`
- [ ] Supabase tem todas as tabelas criadas
- [ ] Console do browser NÃO mostra erros de `localhost`
- [ ] Consegue criar nova sessão WhatsApp
- [ ] QR Code aparece corretamente
- [ ] Após escanear, status muda para "Conectado"
- [ ] Consegue ver conversas
- [ ] Consegue enviar mensagens
- [ ] WebSocket conectado (sem erros no console)

---

## 🎉 Sucesso!

Se todos os itens acima estão marcados, seu WhatsApp CRM está 100% funcional em produção!

**URLs Finais:**
- Frontend: `https://seu-projeto.vercel.app`
- Backend API: `https://eeeeeeee-production.up.railway.app`
- Database: `https://ldieqcofmincppqzownw.supabase.co`
