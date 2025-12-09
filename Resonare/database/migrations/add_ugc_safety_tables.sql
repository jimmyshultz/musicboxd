-- Migration: Add UGC Safety Tables
-- Purpose: Add tables and columns for App Store Guideline 1.2 compliance
-- This includes: content reports, blocked users, EULA acceptance, and user bans

-- ============================================================================
-- 1. Add new columns to user_profiles table
-- ============================================================================

-- Add terms_accepted_at column to track when user accepted EULA
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add is_banned column to track banned users
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Add banned_at timestamp
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Add ban_reason for documentation
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- ============================================================================
-- 2. Create blocked_users table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Add constraint to prevent users from blocking themselves
ALTER TABLE blocked_users 
ADD CONSTRAINT blocked_users_no_self_block 
CHECK (blocker_id != blocked_id);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- ============================================================================
-- 3. Create content_reports table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('profile', 'rating', 'diary_entry')),
  content_id UUID, -- ID of the specific content (nullable for profile reports)
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'inappropriate', 'other')),
  description TEXT, -- Optional additional details from reporter
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT, -- Admin identifier who reviewed the report
  action_taken TEXT, -- Description of action taken (if any)
  CONSTRAINT content_reports_no_self_report CHECK (reporter_id != reported_user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user_id ON content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON content_reports(created_at DESC);

-- ============================================================================
-- 4. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on blocked_users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks (both as blocker and blocked)
CREATE POLICY "Users can view blocks they created"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can create blocks"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- Enable RLS on content_reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports (as reporter)
CREATE POLICY "Users can view their own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- 5. Helper functions
-- ============================================================================

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
  p_user_id UUID,
  p_blocked_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = p_user_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if either user has blocked the other (mutual block check)
CREATE OR REPLACE FUNCTION users_have_blocked(
  p_user_id_1 UUID,
  p_user_id_2 UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE (blocker_id = p_user_id_1 AND blocked_id = p_user_id_2)
       OR (blocker_id = p_user_id_2 AND blocked_id = p_user_id_1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Moderation function for admin use
-- ============================================================================

CREATE OR REPLACE FUNCTION moderate_content(
  p_report_id UUID,
  p_action TEXT, -- 'dismiss', 'remove_content', 'ban_user'
  p_admin_id TEXT,
  p_action_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_report RECORD;
BEGIN
  -- Get the report
  SELECT * INTO v_report FROM content_reports WHERE id = p_report_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
  
  -- Update the report status
  UPDATE content_reports 
  SET 
    status = CASE 
      WHEN p_action = 'dismiss' THEN 'dismissed'
      ELSE 'actioned'
    END,
    reviewed_at = NOW(),
    reviewed_by = p_admin_id,
    action_taken = COALESCE(p_action_notes, p_action)
  WHERE id = p_report_id;
  
  -- If action is to remove content, delete the content
  IF p_action = 'remove_content' THEN
    IF v_report.content_type = 'rating' AND v_report.content_id IS NOT NULL THEN
      DELETE FROM album_ratings WHERE id = v_report.content_id;
    ELSIF v_report.content_type = 'diary_entry' AND v_report.content_id IS NOT NULL THEN
      DELETE FROM diary_entries WHERE id = v_report.content_id;
    END IF;
  END IF;
  
  -- If action is to ban user, update user profile
  IF p_action = 'ban_user' THEN
    UPDATE user_profiles 
    SET 
      is_banned = TRUE,
      banned_at = NOW(),
      ban_reason = COALESCE(p_action_notes, 'Banned due to content violation')
    WHERE id = v_report.reported_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Update delete_user_account function to include new tables
-- ============================================================================

-- Note: The existing delete_user_account function should be updated to also delete:
-- - blocked_users (both as blocker and blocked)
-- - content_reports (as reporter)
-- This can be done by adding these lines to the existing function:
-- DELETE FROM blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
-- DELETE FROM content_reports WHERE reporter_id = target_user_id;

-- ============================================================================
-- Migration complete
-- ============================================================================
