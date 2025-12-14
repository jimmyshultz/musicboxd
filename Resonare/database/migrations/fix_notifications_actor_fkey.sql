-- Migration: Fix notifications actor_id foreign key to reference user_profiles
-- This allows Supabase to properly join notifications with user_profiles for actor data

-- Drop the existing foreign key constraint
ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

-- Add new foreign key constraint that references user_profiles.id
-- This creates the relationship Supabase needs for the join query
ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_actor_id_fkey 
    FOREIGN KEY (actor_id) REFERENCES public.user_profiles (id) ON DELETE CASCADE;
