-- Migration: Enable real-time replication for notifications table
-- This allows Supabase real-time subscriptions to work for the notifications table
--
-- IMPORTANT: This must be run in the Supabase SQL Editor or via Supabase CLI
-- Real-time replication is enabled at the database level, not via standard SQL

-- Note: In Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Find the 'notifications' table
-- 3. Enable replication for it
--
-- OR use the Supabase Management API:
-- POST /rest/v1/replication
-- {
--   "table": "notifications",
--   "enable": true
-- }

-- This SQL command enables replication via the replication slot
-- (Only works if you have superuser access)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
