-- =============================================
-- ATIVAR RLS NAS VIEWS E TABELAS FALTANTES
-- =============================================

-- Habilitar RLS nas 3 tabelas/views não protegidas
ALTER TABLE message_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_stats ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES PARA message_stats
-- =============================================

DROP POLICY IF EXISTS "Users can view own message stats" ON message_stats;
CREATE POLICY "Users can view own message stats"
ON message_stats FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- POLICIES PARA recent_messages
-- =============================================

DROP POLICY IF EXISTS "Users can view own recent messages" ON recent_messages;
CREATE POLICY "Users can view own recent messages"
ON recent_messages FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- POLICIES PARA session_stats
-- =============================================

DROP POLICY IF EXISTS "Users can view own session stats" ON session_stats;
CREATE POLICY "Users can view own session stats"
ON session_stats FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- VERIFICAR SE TODAS AS TABELAS TÊM RLS
-- =============================================

-- Esta query mostra todas as tabelas e seu status de RLS
-- Execute para confirmar que todas as tabelas têm RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
