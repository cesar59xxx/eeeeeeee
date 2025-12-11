-- =====================================================
-- CORREÇÃO: RLS em VIEWS vs TABLES
-- =====================================================
-- Views NÃO podem ter RLS diretamente!
-- O RLS é aplicado nas tabelas base (messages, contacts, whatsapp_sessions)
-- As views herdam automaticamente essas restrições.

-- 1. VERIFICAR se as tabelas base já têm RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('messages', 'contacts', 'whatsapp_sessions', 'chatbot_flows', 'chatbot_logs', 'users', 'tenants');

-- =====================================================
-- 2. GARANTIR que TODAS as tabelas base tenham RLS
-- =====================================================

-- Habilitar RLS em TODAS as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RECRIAR POLICIES para garantir isolamento correto
-- =====================================================

-- USERS (um usuário só vê seu próprio perfil)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- TENANTS (usuário vê apenas seu tenant)
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- WHATSAPP_SESSIONS (usuário vê apenas suas sessões)
DROP POLICY IF EXISTS "Users can view own sessions" ON whatsapp_sessions;
CREATE POLICY "Users can view own sessions" ON whatsapp_sessions
  FOR ALL USING (user_id = auth.uid());

-- CONTACTS (usuário vê apenas seus contatos)
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
CREATE POLICY "Users can view own contacts" ON contacts
  FOR ALL USING (user_id = auth.uid());

-- MESSAGES (usuário vê apenas mensagens de suas sessões)
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR ALL USING (
    session_id IN (SELECT id FROM whatsapp_sessions WHERE user_id = auth.uid())
  );

-- CHATBOT_FLOWS (usuário vê apenas seus flows)
DROP POLICY IF EXISTS "Users can manage own chatbot flows" ON chatbot_flows;
CREATE POLICY "Users can manage own chatbot flows" ON chatbot_flows
  FOR ALL USING (user_id = auth.uid());

-- CHATBOT_LOGS (usuário vê apenas logs de seus flows)
DROP POLICY IF EXISTS "Users can view own chatbot logs" ON chatbot_logs;
CREATE POLICY "Users can view own chatbot logs" ON chatbot_logs
  FOR SELECT USING (
    flow_id IN (SELECT id FROM chatbot_flows WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. TESTAR as VIEWS (elas herdam RLS automaticamente)
-- =====================================================

-- Teste 1: message_stats (deve filtrar por user_id automaticamente)
SELECT * FROM message_stats LIMIT 5;

-- Teste 2: recent_messages (deve filtrar por user_id automaticamente)  
SELECT * FROM recent_messages LIMIT 10;

-- Teste 3: session_stats (deve filtrar por user_id automaticamente)
SELECT * FROM session_stats LIMIT 5;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ Todas as 7 tabelas base têm RLS habilitado
-- ✅ Policies garantem isolamento por auth.uid()
-- ✅ Views herdam RLS automaticamente das tabelas base
-- ✅ Cada usuário vê APENAS seus próprios dados

-- NOTA IMPORTANTE:
-- Views como message_stats, recent_messages, e session_stats 
-- NÃO precisam de RLS explícito porque:
-- 1. Elas fazem JOIN nas tabelas base (messages, contacts, whatsapp_sessions)
-- 2. As tabelas base JÁ têm RLS habilitado
-- 3. O PostgreSQL aplica RLS ANTES de executar a view
-- 4. Resultado: Views retornam apenas dados permitidos pelas policies das tabelas base
