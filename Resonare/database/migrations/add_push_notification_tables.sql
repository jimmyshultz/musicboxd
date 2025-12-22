-- Push Notifications Database Schema
-- Migration: add_push_notification_tables
-- Run this migration in Supabase SQL Editor

-- ============================================================================
-- PART 1: Push Tokens Table
-- ============================================================================

-- Push notification device tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    device_id TEXT, -- Optional unique device identifier for future marketing notifications
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One token per device per user
    UNIQUE(user_id, token)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can insert own tokens" ON public.push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens" ON public.push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Function to send notifications)
CREATE POLICY "Service role can read all tokens" ON public.push_tokens
    FOR SELECT USING (auth.role() = 'service_role');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_push_tokens_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_push_tokens_updated_at_trigger
    BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_push_tokens_updated_at();

-- ============================================================================
-- PART 2: Push Preferences Table
-- ============================================================================

-- User push notification preferences
CREATE TABLE IF NOT EXISTS public.push_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    follows_enabled BOOLEAN DEFAULT true,
    likes_enabled BOOLEAN DEFAULT true,
    comments_enabled BOOLEAN DEFAULT true,
    marketing_enabled BOOLEAN DEFAULT false, -- For future marketing notifications
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.push_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Service role can read all preferences (for Edge Function)
CREATE POLICY "Service role can read preferences" ON public.push_preferences
    FOR SELECT USING (auth.role() = 'service_role');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_push_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_push_preferences_updated_at_trigger
    BEFORE UPDATE ON public.push_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_push_preferences_updated_at();

-- ============================================================================
-- PART 3: Auto-create preferences on user signup
-- ============================================================================

-- Function to create default push preferences when a user signs up
CREATE OR REPLACE FUNCTION public.create_default_push_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.push_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Trigger on user_profiles to create preferences when profile is created
DROP TRIGGER IF EXISTS create_push_preferences_on_profile ON public.user_profiles;
CREATE TRIGGER create_push_preferences_on_profile
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_push_preferences();

-- ============================================================================
-- PART 4: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_push_tokens_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_push_preferences_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_push_preferences() TO authenticated;
