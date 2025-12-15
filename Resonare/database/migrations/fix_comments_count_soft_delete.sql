-- ============================================================================
-- Migration: Fix Comments Count for Soft Deletes
-- ============================================================================
-- This migration updates the comments count trigger to handle soft deletes
-- (UPDATE operations that set is_deleted = true) so the count is accurate.
-- ============================================================================

-- Update the trigger function to handle UPDATE operations
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

-- Drop and recreate the trigger to include UPDATE events
DROP TRIGGER IF EXISTS update_diary_entry_comments_count_trigger ON public.diary_entry_comments;

CREATE TRIGGER update_diary_entry_comments_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.diary_entry_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_diary_entry_comments_count();

-- ============================================================================
-- Optional: Recalculate comments_count for all diary entries to fix any
-- existing inaccuracies from soft-deleted comments
-- ============================================================================
UPDATE public.diary_entries de
SET comments_count = (
    SELECT COUNT(*)
    FROM public.diary_entry_comments dec
    WHERE dec.entry_id = de.id
    AND dec.is_deleted = false
);

