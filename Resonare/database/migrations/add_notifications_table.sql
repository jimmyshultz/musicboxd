-- Migration: Add notifications table
-- This table stores in-app notifications for users (follows, follow requests, etc.)

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

-- Add check constraint for notification type
ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('follow', 'follow_request'));

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

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

-- System can INSERT notifications (via trigger with SECURITY DEFINER)
-- Note: Triggers will use SECURITY DEFINER functions to bypass RLS for INSERT
CREATE POLICY "System can insert notifications" 
    ON public.notifications 
    FOR INSERT 
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
