# Entendendo RLS em Views vs Tables

## Por que o erro aconteceu?

Você tentou executar:
\`\`\`sql
ALTER TABLE message_stats ENABLE ROW LEVEL SECURITY;
\`\`\`

Mas `message_stats` é uma **VIEW**, não uma TABLE. O PostgreSQL não permite RLS diretamente em views.

## Como RLS funciona com Views?

### Tabelas Base (têm RLS)
- `messages` ← RLS habilitado ✅
- `contacts` ← RLS habilitado ✅
- `whatsapp_sessions` ← RLS habilitado ✅

### Views (herdam RLS)
- `message_stats` ← Faz JOIN em `messages` (herda RLS automaticamente)
- `recent_messages` ← Faz JOIN em `messages` + `contacts` (herda RLS)
- `session_stats` ← Faz JOIN em `whatsapp_sessions` (herda RLS)

## Fluxo de Segurança

\`\`\`
1. Usuário executa: SELECT * FROM message_stats;
                              ↓
2. PostgreSQL expande a view para sua query base:
   SELECT ... FROM messages m JOIN contacts c ...
                              ↓
3. PostgreSQL aplica RLS nas tabelas base ANTES de executar:
   - messages: WHERE session_id IN (SELECT id FROM whatsapp_sessions WHERE user_id = auth.uid())
   - contacts: WHERE user_id = auth.uid()
                              ↓
4. View retorna APENAS dados permitidos pelas policies
\`\`\`

## Como Verificar se RLS está Funcionando

### 1. Verificar RLS nas Tabelas Base
\`\`\`sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
\`\`\`

Deve retornar `rowsecurity = true` para todas as tabelas.

### 2. Testar com Dois Usuários Diferentes

**Usuário A (ID: abc-123)**
\`\`\`sql
SELECT * FROM whatsapp_sessions;
-- Retorna apenas sessões do usuário A

SELECT * FROM message_stats;
-- Retorna apenas estatísticas das sessões do usuário A
\`\`\`

**Usuário B (ID: xyz-789)**
\`\`\`sql
SELECT * FROM whatsapp_sessions;
-- Retorna apenas sessões do usuário B (diferentes do usuário A)

SELECT * FROM message_stats;
-- Retorna apenas estatísticas das sessões do usuário B
\`\`\`

## Resumo

✅ **CORRETO**: Habilitar RLS nas tabelas base (messages, contacts, etc.)  
❌ **INCORRETO**: Tentar habilitar RLS nas views (message_stats, etc.)

As views **automaticamente respeitam** o RLS das tabelas base que elas consultam.
