-- Migration: Add optimized get_user_followers and get_user_following functions
-- Purpose: Reduce 4-5 database queries per call to a single optimized server-side query
-- Date: January 9, 2026

-- ============================================================================
-- Function: get_user_followers
-- Returns all followers of a target user, excluding banned/blocked users
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_followers(
  target_user_id UUID,
  current_viewer_id UUID DEFAULT NULL
)
RETURNS SETOF user_profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT up.*
  FROM user_profiles up
  INNER JOIN user_follows uf ON up.id = uf.follower_id
  WHERE uf.following_id = target_user_id
    AND up.is_banned = false
    AND (
      current_viewer_id IS NULL 
      OR up.id NOT IN (
        -- Exclude users blocked by viewer
        SELECT blocked_id FROM blocked_users WHERE blocker_id = current_viewer_id
        UNION
        -- Exclude users who blocked viewer
        SELECT blocker_id FROM blocked_users WHERE blocked_id = current_viewer_id
      )
    );
END;
$$;

-- ============================================================================
-- Function: get_user_following
-- Returns all users followed by target user, excluding banned/blocked users
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_following(
  target_user_id UUID,
  current_viewer_id UUID DEFAULT NULL
)
RETURNS SETOF user_profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT up.*
  FROM user_profiles up
  INNER JOIN user_follows uf ON up.id = uf.following_id
  WHERE uf.follower_id = target_user_id
    AND up.is_banned = false
    AND (
      current_viewer_id IS NULL 
      OR up.id NOT IN (
        -- Exclude users blocked by viewer
        SELECT blocked_id FROM blocked_users WHERE blocker_id = current_viewer_id
        UNION
        -- Exclude users who blocked viewer
        SELECT blocker_id FROM blocked_users WHERE blocked_id = current_viewer_id
      )
    );
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_followers(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_following(UUID, UUID) TO authenticated;

-- ============================================================================
-- Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION get_user_followers(UUID, UUID) IS
  'Efficiently retrieves all followers of a user in a single query. '
  'Excludes banned users and blocked users (bidirectional). '
  'If current_viewer_id is NULL, only excludes banned users.';

COMMENT ON FUNCTION get_user_following(UUID, UUID) IS
  'Efficiently retrieves all users followed by a user in a single query. '
  'Excludes banned users and blocked users (bidirectional). '
  'If current_viewer_id is NULL, only excludes banned users.';

