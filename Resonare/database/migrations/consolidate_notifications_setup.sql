-- ============================================================================
-- Consolidated Migration: Complete Notifications System Setup
-- ============================================================================
-- This migration consolidates all notification-related database changes:
-- 1. Creates the notifications table with proper structure and constraints
-- 2. Sets up Row Level Security (RLS) policies
-- 3. Creates triggers for automatic notification creation
-- 4. Enables real-time replication for real-time notifications
-- 5. Adds support for follow request accepted notifications
--
-- Run this migration on production to match the current dev database state
-- ============================================================================

-- ============================================================================
-- PART 1: Create Notifications Table
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    actor_id UUID NOT NULL,
    reference_id UUID,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add primary key
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

-- Add foreign keys
ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Ensure actor_id references user_profiles (required for Supabase joins)
ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_actor_id_fkey 
    FOREIGN KEY (actor_id) REFERENCES public.user_profiles (id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
    ON public.notifications USING btree (user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_actor 
    ON public.notifications USING btree (actor_id);

-- Add check constraint for notification types
-- Includes: 'follow', 'follow_request', 'follow_request_accepted'
ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('follow', 'follow_request', 'follow_request_accepted'));

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Row Level Security Policies
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- Users can only SELECT their own notifications
CREATE POLICY "Users can view own notifications" 
    ON public.notifications 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can UPDATE their own notifications (to mark as read)
CREATE POLICY "Users can update own notifications" 
    ON public.notifications 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Users can DELETE their own notifications
CREATE POLICY "Users can delete own notifications" 
    ON public.notifications 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- System can INSERT notifications (via trigger with SECURITY DEFINER)
-- Note: Triggers will use SECURITY DEFINER functions to bypass RLS for INSERT
CREATE POLICY "System can insert notifications" 
    ON public.notifications 
    FOR INSERT 
    WITH CHECK (true);

-- ============================================================================
-- PART 3: Notification Trigger Functions
-- ============================================================================

-- Function to create follow notification
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create notification for the person being followed (following_id)
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, NEW.id);
    
    RETURN NEW;
END;
$$;

-- Function to create follow request notification
CREATE OR REPLACE FUNCTION public.create_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create notification for the person receiving the request (requested_id)
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.requested_id, 'follow_request', NEW.requester_id, NEW.id);
    
    RETURN NEW;
END;
$$;

-- Function to create follow request accepted notification
CREATE OR REPLACE FUNCTION public.create_follow_request_accepted_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only create notification when status changes to 'accepted'
    -- Notification goes to the requester (the person who sent the request)
    -- Actor is the person who accepted the request (requested_id)
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (NEW.requester_id, 'follow_request_accepted', NEW.requested_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Grant execute permissions on all notification functions
GRANT EXECUTE ON FUNCTION public.create_follow_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_follow_request_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_follow_request_accepted_notification() TO authenticated;

-- ============================================================================
-- PART 4: Create Triggers
-- ============================================================================

-- Create trigger for follow notifications
DROP TRIGGER IF EXISTS create_follow_notification_trigger ON public.user_follows;
CREATE TRIGGER create_follow_notification_trigger
    AFTER INSERT ON public.user_follows
    FOR EACH ROW
    EXECUTE FUNCTION public.create_follow_notification();

-- Create trigger for follow request notifications
DROP TRIGGER IF EXISTS create_follow_request_notification_trigger ON public.follow_requests;
CREATE TRIGGER create_follow_request_notification_trigger
    AFTER INSERT ON public.follow_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.create_follow_request_notification();

-- Create trigger for follow request accepted notifications
DROP TRIGGER IF EXISTS create_follow_request_accepted_notification_trigger ON public.follow_requests;
CREATE TRIGGER create_follow_request_accepted_notification_trigger
    AFTER UPDATE ON public.follow_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
    EXECUTE FUNCTION public.create_follow_request_accepted_notification();

-- ============================================================================
-- PART 5: Enable Real-time Replication
-- ============================================================================
-- IMPORTANT: This command enables real-time replication for the notifications table
-- This allows Supabase real-time subscriptions to work for notifications
--
-- Note: This requires superuser access. If you don't have superuser access,
-- enable replication via the Supabase Dashboard:
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================================
-- PART 6: Grant Permissions
-- ============================================================================

GRANT ALL ON public.notifications TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The notifications system is now fully set up with:
-- ✓ Notifications table with proper structure
-- ✓ Foreign keys to auth.users and user_profiles
-- ✓ Indexes for performance
-- ✓ Type constraint for 'follow', 'follow_request', 'follow_request_accepted'
-- ✓ Row Level Security policies (SELECT, UPDATE, DELETE, INSERT)
-- ✓ Trigger functions for automatic notification creation
-- ✓ Triggers on user_follows and follow_requests tables
-- ✓ Real-time replication enabled
-- ============================================================================
