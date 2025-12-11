-- Fix WhatsApp Sessions table structure
-- This script ensures the table has the correct schema

-- First, let's make sure the name column exists and has data
DO $$ 
BEGIN
  -- Add name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_sessions' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE whatsapp_sessions ADD COLUMN name TEXT;
  END IF;
  
  -- Copy phone_number to name where name is null
  UPDATE whatsapp_sessions 
  SET name = phone_number 
  WHERE name IS NULL AND phone_number IS NOT NULL;
  
  -- Set default name for sessions without any name
  UPDATE whatsapp_sessions 
  SET name = 'Sessão ' || SUBSTRING(id::TEXT, 1, 8)
  WHERE name IS NULL OR name = '';
END $$;

-- Ensure RLS is enabled
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their tenant sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Users can only insert their tenant sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Users can only update their tenant sessions" ON whatsapp_sessions;
DROP POLICY IF EXISTS "Users can only delete their tenant sessions" ON whatsapp_sessions;

-- Create RLS policies to ensure data privacy
CREATE POLICY "Users can only see their tenant sessions"
  ON whatsapp_sessions FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can only insert their tenant sessions"
  ON whatsapp_sessions FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can only update their tenant sessions"
  ON whatsapp_sessions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

CREATE POLICY "Users can only delete their tenant sessions"
  ON whatsapp_sessions FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM tenants 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant_id 
  ON whatsapp_sessions(tenant_id);

-- Show summary
DO $$
DECLARE
  session_count INTEGER;
  tenant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count FROM whatsapp_sessions;
  SELECT COUNT(DISTINCT tenant_id) INTO tenant_count FROM whatsapp_sessions;
  
  RAISE NOTICE '✅ WhatsApp sessions table fixed!';
  RAISE NOTICE '📊 Total sessions: %', session_count;
  RAISE NOTICE '👥 Total tenants with sessions: %', tenant_count;
END $$;
