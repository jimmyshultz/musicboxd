-- Migration: Verify and fix RLS policies for notifications table
-- This ensures real-time subscriptions work correctly with RLS

-- ============================================================================
-- STEP 1: Check current RLS policies
-- ============================================================================

-- View all current policies on notifications table
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY policyname;

-- ============================================================================
-- STEP 2: Verify RLS is enabled
-- ============================================================================

SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- ============================================================================
-- STEP 3: Test if current user can SELECT their own notifications
-- ============================================================================

-- This query should return rows if RLS is working correctly
-- Replace 'YOUR_USER_ID' with an actual user ID from your database
SELECT 
    id,
    user_id,
    type,
    read,
    created_at
FROM public.notifications
WHERE user_id = auth.uid()
LIMIT 5;

-- ============================================================================
-- STEP 4: Ensure policies are correct for real-time
-- ============================================================================

-- The SELECT policy should allow users to see their own notifications
-- This is critical for real-time subscriptions to work
-- Real-time subscriptions respect RLS policies when filtering events

-- Current policy should be:
-- CREATE POLICY "Users can view own notifications" 
--     ON public.notifications 
--     FOR SELECT 
--     USING (auth.uid() = user_id);

-- If this policy doesn't exist or is incorrect, recreate it:

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- Recreate the SELECT policy (this should already exist, but ensuring it's correct)
CREATE POLICY "Users can view own notifications" 
    ON public.notifications 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: Verify grants
-- ============================================================================

-- Ensure authenticated users have SELECT permission
GRANT SELECT ON public.notifications TO authenticated;

-- ============================================================================
-- NOTES FOR REAL-TIME SUBSCRIPTIONS
-- ============================================================================

-- For real-time subscriptions to work with RLS:
-- 1. RLS must be enabled on the table (✓ we have this)
-- 2. There must be a SELECT policy that allows the user to see the row (✓ we have this)
-- 3. Real-time replication must be enabled (you confirmed this)
-- 4. The subscription filter must match the RLS policy condition
--    - Our filter: user_id=eq.${userId}
--    - Our policy: auth.uid() = user_id
--    - These should match when the user is authenticated

-- If real-time still doesn't work after verifying the above:
-- 1. Check Supabase Dashboard → Database → Replication → notifications table is enabled
-- 2. Check that the subscription is using the correct user context (auth.uid())
-- 3. Try subscribing without a filter first to see if events come through at all
-- 4. Check Supabase logs for any real-time errors
