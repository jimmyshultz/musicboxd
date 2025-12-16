-- ============================================================================
-- Migration: Fix Foreign Key Constraints for Diary Entry Likes and Comments
-- ============================================================================
-- This migration fixes the foreign key constraints to reference user_profiles
-- instead of auth.users, which is required for Supabase automatic joins.
-- ============================================================================

-- Fix diary_entry_likes foreign key
ALTER TABLE public.diary_entry_likes 
    DROP CONSTRAINT IF EXISTS diary_entry_likes_user_id_fkey;

ALTER TABLE public.diary_entry_likes 
    ADD CONSTRAINT diary_entry_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Fix diary_entry_comments foreign key
ALTER TABLE public.diary_entry_comments 
    DROP CONSTRAINT IF EXISTS diary_entry_comments_user_id_fkey;

ALTER TABLE public.diary_entry_comments 
    ADD CONSTRAINT diary_entry_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

