-- ============================================================================
-- Migration: Add Diary Entry Likes and Comments Tables
-- ============================================================================
-- This migration adds social interaction features to diary entries:
-- 1. Creates diary_entry_likes table for likes
-- 2. Creates diary_entry_comments table for comments
-- 3. Adds optional denormalized counts to diary_entries table
-- 4. Sets up Row Level Security (RLS) policies
-- 5. Creates triggers for maintaining counts and notifications
-- 6. Updates notifications.type constraint to include diary_like and diary_comment
-- ============================================================================

-- ============================================================================
-- PART 1: Create Diary Entry Likes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.diary_entry_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT diary_entry_likes_pkey PRIMARY KEY (id),
    CONSTRAINT diary_entry_likes_entry_id_fkey FOREIGN KEY (entry_id) 
        REFERENCES public.diary_entries(id) ON DELETE CASCADE,
    CONSTRAINT diary_entry_likes_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    CONSTRAINT diary_entry_likes_entry_user_unique UNIQUE (entry_id, user_id)
);

-- Indexes for diary_entry_likes
CREATE INDEX IF NOT EXISTS idx_diary_entry_likes_entry_id 
    ON public.diary_entry_likes USING btree (entry_id);

CREATE INDEX IF NOT EXISTS idx_diary_entry_likes_user_created 
    ON public.diary_entry_likes USING btree (user_id, created_at DESC);

-- ============================================================================
-- PART 2: Create Diary Entry Comments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.diary_entry_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL,
    user_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false,
    CONSTRAINT diary_entry_comments_pkey PRIMARY KEY (id),
    CONSTRAINT diary_entry_comments_entry_id_fkey FOREIGN KEY (entry_id) 
        REFERENCES public.diary_entries(id) ON DELETE CASCADE,
    CONSTRAINT diary_entry_comments_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    CONSTRAINT diary_entry_comments_body_length CHECK (char_length(body) BETWEEN 1 AND 2000)
);

-- Indexes for diary_entry_comments
CREATE INDEX IF NOT EXISTS idx_diary_entry_comments_entry_created 
    ON public.diary_entry_comments USING btree (entry_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_diary_entry_comments_user_created 
    ON public.diary_entry_comments USING btree (user_id, created_at DESC);

-- ============================================================================
-- PART 3: Add Denormalized Counts to Diary Entries Table
-- ============================================================================

ALTER TABLE public.diary_entries 
    ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.diary_entries 
    ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- PART 4: Row Level Security Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.diary_entry_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entry_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view diary entry likes" ON public.diary_entry_likes;
DROP POLICY IF EXISTS "Users can insert own diary entry likes" ON public.diary_entry_likes;
DROP POLICY IF EXISTS "Users can delete own diary entry likes" ON public.diary_entry_likes;

DROP POLICY IF EXISTS "Users can view diary entry comments" ON public.diary_entry_comments;
DROP POLICY IF EXISTS "Users can insert own diary entry comments" ON public.diary_entry_comments;
DROP POLICY IF EXISTS "Users can update own diary entry comments" ON public.diary_entry_comments;
DROP POLICY IF EXISTS "Users can delete own diary entry comments" ON public.diary_entry_comments;
DROP POLICY IF EXISTS "Diary owners can delete comments on their entries" ON public.diary_entry_comments;

-- RLS Policies for diary_entry_likes
-- Users can view likes on diary entries they can see (for now, public - can be refined with privacy)
CREATE POLICY "Users can view diary entry likes" 
    ON public.diary_entry_likes 
    FOR SELECT 
    USING (true); -- For MVP, allow viewing all likes (privacy can be enforced later)

-- Users can only insert their own likes
CREATE POLICY "Users can insert own diary entry likes" 
    ON public.diary_entry_likes 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete own diary entry likes" 
    ON public.diary_entry_likes 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for diary_entry_comments
-- Users can view comments on diary entries they can see
CREATE POLICY "Users can view diary entry comments" 
    ON public.diary_entry_comments 
    FOR SELECT 
    USING (is_deleted = false OR auth.uid() = user_id); -- Show deleted comments only to author

-- Users can insert their own comments
CREATE POLICY "Users can insert own diary entry comments" 
    ON public.diary_entry_comments 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own diary entry comments" 
    ON public.diary_entry_comments 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Users can delete their own comments (soft delete via is_deleted flag)
CREATE POLICY "Users can delete own diary entry comments" 
    ON public.diary_entry_comments 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Diary entry owners can delete comments on their entries
CREATE POLICY "Diary owners can delete comments on their entries" 
    ON public.diary_entry_comments 
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.diary_entries 
            WHERE id = diary_entry_comments.entry_id 
            AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- PART 5: Trigger Functions for Maintaining Counts
-- ============================================================================

-- Function to update likes_count on diary_entries
CREATE OR REPLACE FUNCTION public.update_diary_entry_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.diary_entries 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.entry_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.diary_entries 
        SET likes_count = GREATEST(likes_count - 1, 0) 
        WHERE id = OLD.entry_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Function to update comments_count on diary_entries
CREATE OR REPLACE FUNCTION public.update_diary_entry_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New comment added
        UPDATE public.diary_entries 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.entry_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Comment hard deleted
        UPDATE public.diary_entries 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.entry_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle soft delete/restore: check if is_deleted changed
        IF (OLD.is_deleted = false AND NEW.is_deleted = true) THEN
            -- Comment was soft deleted
            UPDATE public.diary_entries 
            SET comments_count = GREATEST(comments_count - 1, 0) 
            WHERE id = NEW.entry_id;
        ELSIF (OLD.is_deleted = true AND NEW.is_deleted = false) THEN
            -- Comment was restored
            UPDATE public.diary_entries 
            SET comments_count = comments_count + 1 
            WHERE id = NEW.entry_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_diary_entry_likes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_diary_entry_comments_count() TO authenticated;

-- ============================================================================
-- PART 6: Create Triggers for Count Maintenance
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_diary_entry_likes_count_trigger ON public.diary_entry_likes;
DROP TRIGGER IF EXISTS update_diary_entry_comments_count_trigger ON public.diary_entry_comments;

-- Create triggers
CREATE TRIGGER update_diary_entry_likes_count_trigger
    AFTER INSERT OR DELETE ON public.diary_entry_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_diary_entry_likes_count();

CREATE TRIGGER update_diary_entry_comments_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.diary_entry_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_diary_entry_comments_count();

-- ============================================================================
-- PART 7: Trigger Functions for Notifications
-- ============================================================================

-- Function to create diary like notification
CREATE OR REPLACE FUNCTION public.create_diary_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    entry_owner_id UUID;
BEGIN
    -- Get the diary entry owner
    SELECT user_id INTO entry_owner_id
    FROM public.diary_entries
    WHERE id = NEW.entry_id;
    
    -- Only create notification if the liker is not the entry owner
    IF entry_owner_id IS NOT NULL AND entry_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (entry_owner_id, 'diary_like', NEW.user_id, NEW.entry_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to create diary comment notification
CREATE OR REPLACE FUNCTION public.create_diary_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    entry_owner_id UUID;
BEGIN
    -- Get the diary entry owner
    SELECT user_id INTO entry_owner_id
    FROM public.diary_entries
    WHERE id = NEW.entry_id;
    
    -- Only create notification if the commenter is not the entry owner
    IF entry_owner_id IS NOT NULL AND entry_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (entry_owner_id, 'diary_comment', NEW.user_id, NEW.entry_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_diary_like_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_diary_comment_notification() TO authenticated;

-- ============================================================================
-- PART 8: Create Triggers for Notifications
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS create_diary_like_notification_trigger ON public.diary_entry_likes;
DROP TRIGGER IF EXISTS create_diary_comment_notification_trigger ON public.diary_entry_comments;

-- Create triggers
CREATE TRIGGER create_diary_like_notification_trigger
    AFTER INSERT ON public.diary_entry_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.create_diary_like_notification();

CREATE TRIGGER create_diary_comment_notification_trigger
    AFTER INSERT ON public.diary_entry_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_diary_comment_notification();

-- ============================================================================
-- PART 9: Update Notifications Type Constraint
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with new types
ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'follow', 
        'follow_request', 
        'follow_request_accepted',
        'diary_like',
        'diary_comment'
    ));

-- ============================================================================
-- PART 10: Backfill Counts for Existing Diary Entries
-- ============================================================================

-- Backfill likes_count
UPDATE public.diary_entries de
SET likes_count = (
    SELECT COUNT(*) 
    FROM public.diary_entry_likes del 
    WHERE del.entry_id = de.id
);

-- Backfill comments_count
UPDATE public.diary_entries de
SET comments_count = (
    SELECT COUNT(*) 
    FROM public.diary_entry_comments dec 
    WHERE dec.entry_id = de.id AND dec.is_deleted = false
);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The diary entry social features are now set up with:
-- ✓ diary_entry_likes table with unique constraint
-- ✓ diary_entry_comments table with length validation
-- ✓ Denormalized counts on diary_entries table
-- ✓ Row Level Security policies
-- ✓ Triggers for maintaining counts
-- ✓ Triggers for creating notifications
-- ✓ Updated notifications.type constraint
-- ✓ Backfilled counts for existing entries
-- ============================================================================

