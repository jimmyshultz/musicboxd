-- Migration: Add PostgreSQL function for server-side popular albums aggregation
-- Performance Issue #12 - Popular Albums Client-Side Aggregation
-- 
-- This replaces client-side aggregation in getPopularAlbums() with server-side
-- GROUP BY, ORDER BY, and LIMIT for improved performance.

CREATE OR REPLACE FUNCTION get_popular_albums_weekly(limit_count INTEGER DEFAULT 15)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  artist_name TEXT,
  artist_id TEXT,
  release_date DATE,
  image_url TEXT,
  spotify_url TEXT,
  total_tracks INTEGER,
  album_type TEXT,
  genres TEXT[],
  listen_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.artist_name,
    a.artist_id,
    a.release_date,
    a.image_url,
    a.spotify_url,
    a.total_tracks,
    a.album_type,
    a.genres,
    COUNT(*)::BIGINT as listen_count
  FROM album_listens al
  INNER JOIN albums a ON al.album_id = a.id
  WHERE al.is_listened = true
    AND al.first_listened_at >= NOW() - INTERVAL '7 days'
  GROUP BY a.id, a.name, a.artist_name, a.artist_id, a.release_date, 
           a.image_url, a.spotify_url, a.total_tracks, a.album_type, a.genres
  ORDER BY listen_count DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_popular_albums_weekly(INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_popular_albums_weekly(INTEGER) IS 
  'Returns the most popular albums from the last 7 days based on listen count. '
  'Performs aggregation server-side to reduce data transfer.';
