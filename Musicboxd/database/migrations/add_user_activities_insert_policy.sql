-- Migration: Add INSERT policy for user_activities table
-- This fixes the RLS policy violation when users rate albums without marking as listened

-- Add INSERT policy for user_activities
CREATE POLICY "Users can create their own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);