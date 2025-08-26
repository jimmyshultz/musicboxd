-- Add missing INSERT policy for user_activities table
-- This allows users to create activity entries for their own actions

CREATE POLICY "Users can create own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);