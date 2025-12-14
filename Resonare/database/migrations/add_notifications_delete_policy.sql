-- Migration: Add DELETE policy for notifications table
-- This allows users to delete their own notifications

-- Add DELETE policy
CREATE POLICY "Users can delete own notifications" 
    ON public.notifications 
    FOR DELETE 
    USING (auth.uid() = user_id);
