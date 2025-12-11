# Guia de Ativação do RLS (Row Level Security)

## O que é RLS?

Row Level Security (RLS) é uma funcionalidade do PostgreSQL/Supabase que garante que cada usuário só possa ver e modificar seus próprios dados. É essencial para proteger a privacidade dos usuários.

## Problema Identificado

No seu Supabase, 3 tabelas/views estavam **UNRESTRICTED** (sem RLS):
- `message_stats`
- `recent_messages`
- `session_stats`

Isso significava que qualquer usuário autenticado poderia ver os dados de TODOS os outros usuários!

## Solução Implementada

### 1. Execute o Script SQL

Vá no Supabase Dashboard → SQL Editor e execute o arquivo:
\`\`\`
scripts/02-ENABLE-RLS-ON-VIEWS.sql
\`\`\`

Este script:
- ✅ Habilita RLS nas 3 tabelas não protegidas
- ✅ Cria policies para que cada usuário só veja seus próprios dados
- ✅ Usa `auth.uid()` para filtrar automaticamente por `user_id`

### 2. Verificar que RLS está Ativo

Após executar o script, volte no **Table Editor** do Supabase e verifique:

Todas as tabelas devem estar **SEM** o badge vermelho "UNRESTRICTED"

### 3. Como o RLS Funciona

Quando habilitado, o Supabase automaticamente:
\`\`\`sql
-- Antes (SEM RLS) - INSEGURO!
SELECT * FROM messages;  -- Retorna TODAS as mensagens de TODOS os usuários ❌

-- Depois (COM RLS) - SEGURO!
SELECT * FROM messages;  -- Retorna APENAS mensagens do usuário logado ✅
-- O Supabase adiciona automaticamente: WHERE user_id = auth.uid()
\`\`\`

### 4. Políticas Criadas

Para cada tabela, foi criada uma policy de SELECT:

**message_stats:**
\`\`\`sql
CREATE POLICY "Users can view own message stats"
ON message_stats FOR SELECT
USING (user_id = auth.uid());
\`\`\`

**recent_messages:**
\`\`\`sql
CREATE POLICY "Users can view own recent messages"
ON recent_messages FOR SELECT
USING (user_id = auth.uid());
\`\`\`

**session_stats:**
\`\`\`sql
CREATE POLICY "Users can view own session stats"
ON session_stats FOR SELECT
USING (user_id = auth.uid());
\`\`\`

### 5. Teste de Segurança

Crie 2 contas de usuário diferentes e teste:

1. Usuário A cria uma instância WhatsApp
2. Faça login como Usuário B
3. Tente ver as instâncias
4. ✅ Usuário B **NÃO** deve ver as instâncias do Usuário A

Se você conseguir ver as instâncias de outro usuário = RLS NÃO está funcionando!

### 6. Correções no Backend

O backend foi atualizado para usar os campos corretos da tabela:

**Antes:**
- `name` → **ERRADO** (campo não existe)
- `phone_number` → **ERRADO** (campo não existe)

**Depois:**
- `session_name` → ✅ Nome da sessão
- `whatsapp_phone` → ✅ Número do WhatsApp
- `whatsapp_name` → ✅ Nome do perfil
- `profile_pic_url` → ✅ Foto de perfil

### 7. Checklist Final

- [ ] Executei o script `02-ENABLE-RLS-ON-VIEWS.sql` no Supabase
- [ ] Todas as tabelas estão SEM o badge "UNRESTRICTED" vermelho
- [ ] Testei com 2 usuários diferentes
- [ ] Cada usuário vê apenas suas próprias instâncias
- [ ] Backend está usando os campos corretos (`session_name`, `whatsapp_phone`, etc.)
- [ ] Frontend está recebendo dados corretamente

## Próximos Passos

Agora que o RLS está ativo:

1. ✅ Dados privados por usuário
2. ✅ Segurança garantida no nível do banco
3. ✅ Campos corretos no backend
4. ✅ Sistema pronto para produção

Se tiver qualquer dúvida, verifique os logs do backend para identificar erros de campos.
