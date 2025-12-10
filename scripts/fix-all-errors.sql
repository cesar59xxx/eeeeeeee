-- Fix ERROR 4: Add session_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);

-- Fix ERROR 5: Add UNIQUE constraint to prevent duplicate sessions
ALTER TABLE whatsapp_sessions
ADD CONSTRAINT IF NOT EXISTS whatsapp_sessions_session_id_unique UNIQUE (session_id);

-- Add unique constraint on name per tenant to prevent duplicate names
ALTER TABLE whatsapp_sessions
ADD CONSTRAINT IF NOT EXISTS whatsapp_sessions_name_tenant_unique UNIQUE (name, tenant_id);

-- Add foreign key constraint for session_id in messages
ALTER TABLE messages
ADD CONSTRAINT IF NOT EXISTS messages_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(session_id) ON DELETE CASCADE;
