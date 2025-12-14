-- Test script to verify real-time subscriptions work with RLS
-- Run this in Supabase SQL Editor to test if notifications are visible

-- ============================================================================
-- TEST 1: Verify you can SELECT your own notifications
-- ============================================================================

-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- This should return rows if RLS is working
SELECT 
    id,
    user_id,
    type,
    actor_id,
    read,
    created_at
FROM public.notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- TEST 2: Check if RLS policies exist and are correct
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- ============================================================================
-- TEST 3: Verify real-time replication is enabled
-- ============================================================================

-- Check if table is in the realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'notifications';

-- If the above query returns no rows, real-time replication is NOT enabled
-- Enable it via: ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- TEST 4: Create a test notification (for testing purposes)
-- ============================================================================

-- This will create a notification for the current user
-- Only run this if you want to test notification creation
-- Make sure you have a valid actor_id (another user's ID)

/*
INSERT INTO public.notifications (user_id, type, actor_id)
VALUES (
    auth.uid(),  -- Current user receives the notification
    'follow',    -- Notification type
    'SOME_OTHER_USER_ID'  -- Replace with an actual user ID
)
RETURNING *;
*/

-- ============================================================================
-- TROUBLESHOOTING TIPS
-- ============================================================================

-- If real-time subscriptions aren't working:

-- 1. Verify RLS policy allows SELECT:
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notifications' 
  AND cmd = 'SELECT';

-- Should show: USING (auth.uid() = user_id)

-- 2. Verify real-time replication:
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'notifications';

-- Should return one row

-- 3. Check table permissions:
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND grantee = 'authenticated';

-- Should include SELECT privilege

-- 4. Test if you can manually query notifications:
-- Run the first query above with your actual user ID
-- If it returns rows, RLS is working correctly
