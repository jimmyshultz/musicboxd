-- ============================================================================
-- MIGRATION: Add Artists Table
-- Description: Creates the artists table to store artist information from Spotify
-- Date: 2025-11-12
-- ============================================================================

-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    spotify_url TEXT,
    genres TEXT[],
    follower_count INTEGER,
    popularity INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_name ON public.artists USING btree (name);
CREATE INDEX IF NOT EXISTS idx_artists_popularity ON public.artists USING btree (popularity DESC NULLS LAST);

-- Add comments for documentation
COMMENT ON TABLE public.artists IS 'Stores artist information fetched from Spotify API';
COMMENT ON COLUMN public.artists.id IS 'Spotify artist ID';
COMMENT ON COLUMN public.artists.name IS 'Artist name';
COMMENT ON COLUMN public.artists.image_url IS 'URL to artist image from Spotify';
COMMENT ON COLUMN public.artists.spotify_url IS 'Link to artist on Spotify';
COMMENT ON COLUMN public.artists.genres IS 'Array of genre strings associated with the artist';
COMMENT ON COLUMN public.artists.follower_count IS 'Number of followers on Spotify';
COMMENT ON COLUMN public.artists.popularity IS 'Spotify popularity score (0-100)';

-- Enable Row Level Security
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Artists are viewable by everyone (read-only, like albums)
CREATE POLICY "Artists are viewable by everyone" 
ON public.artists 
FOR SELECT 
USING (true);

-- Authenticated users can insert artists (when fetching from Spotify)
CREATE POLICY "Authenticated users can insert artists" 
ON public.artists 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

-- Authenticated users can update artists (for refreshing data)
CREATE POLICY "Authenticated users can update artists" 
ON public.artists 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

-- Add trigger for updated_at column
CREATE TRIGGER update_artists_updated_at 
BEFORE UPDATE ON public.artists 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.artists TO anon, authenticated;
GRANT INSERT, UPDATE ON public.artists TO authenticated;

-- ============================================================================
-- END MIGRATION
-- ============================================================================

