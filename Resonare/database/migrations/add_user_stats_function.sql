-- Migration: Add get_user_stats function for efficient statistics retrieval
-- This function aggregates all user statistics in a single query
-- Reduces 8 queries to 1 for significant performance improvement

CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
  albums_all_time BIGINT,
  albums_this_year BIGINT,
  ratings_all_time BIGINT,
  ratings_this_year BIGINT,
  average_rating NUMERIC,
  diary_entries BIGINT,
  followers BIGINT,
  following BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Albums listened (all time)
    (SELECT COUNT(*) 
     FROM album_listens 
     WHERE user_id = target_user_id AND is_listened = true)::BIGINT,
    
    -- Albums listened (this year)
    (SELECT COUNT(*) 
     FROM album_listens 
     WHERE user_id = target_user_id 
       AND is_listened = true
       AND first_listened_at >= DATE_TRUNC('year', CURRENT_DATE))::BIGINT,
    
    -- Total ratings (all time)
    (SELECT COUNT(*) 
     FROM album_ratings 
     WHERE user_id = target_user_id)::BIGINT,
    
    -- Total ratings (this year)
    (SELECT COUNT(*) 
     FROM album_ratings 
     WHERE user_id = target_user_id
       AND created_at >= DATE_TRUNC('year', CURRENT_DATE))::BIGINT,
    
    -- Average rating
    (SELECT COALESCE(AVG(rating), 0)
     FROM album_ratings 
     WHERE user_id = target_user_id)::NUMERIC,
    
    -- Diary entries count
    (SELECT COUNT(*) 
     FROM diary_entries 
     WHERE user_id = target_user_id)::BIGINT,
    
    -- Followers count
    (SELECT COUNT(*) 
     FROM user_follows 
     WHERE following_id = target_user_id)::BIGINT,
    
    -- Following count
    (SELECT COUNT(*) 
     FROM user_follows 
     WHERE follower_id = target_user_id)::BIGINT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_stats(UUID) IS 
  'Efficiently retrieves all user statistics in a single query. '
  'Returns albums listened, ratings, diary entries, and follow counts.';

