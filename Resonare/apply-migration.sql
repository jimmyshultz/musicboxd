-- Apply migration to fix RLS policy for user_activities
-- Run this in your Supabase SQL editor

CREATE POLICY "Users can create their own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);