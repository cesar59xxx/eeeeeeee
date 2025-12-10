# Database Column Names Fixed

All references to `session_id` in the messages table have been updated to use the correct column name `whatsapp_session_id`.

## Changes Made

### 1. WhatsApp Manager Service (`server/services/whatsapp-manager.service.js`)
- Updated `message` event handler to use correct column names
- Fixed `getOrCreateContact` to match contacts table structure
- Updated `saveMessage` to use `whatsapp_session_id`

### 2. Server Routes (`server/index.js`)
- Fixed GET `/api/whatsapp/:sessionId/messages` to query by `whatsapp_session_id`
- Fixed POST `/api/whatsapp/:sessionId/messages` to insert with correct columns
- Fixed GET `/api/messages/:sessionId` to use `whatsapp_session_id`
- Added rate limiting to sessions endpoint (1 second cooldown)
- Added duplicate prevention in session creation

### 3. Frontend (`app/(dashboard)/whatsapp/page.tsx`)
- Increased QR polling interval from 2s to 3s to avoid 429 errors

## Message Table Structure

\`\`\`sql
id (uuid)
tenant_id (uuid)
contact_id (uuid)
whatsapp_session_id (uuid)  -- NOT session_id!
from_me (bool)
body (text)
media_url (text)
media_type (text)
timestamp (timestamptz)
status (text)
created_at (timestamptz)
\`\`\`

## Testing Checklist

- [ ] Messages are saved correctly when received
- [ ] Messages appear in the UI after sending
- [ ] No more "column session_id does not exist" errors
- [ ] No more 429 (Too Many Requests) errors
- [ ] Sessions don't duplicate on page reload
- [ ] WebSocket events work correctly
