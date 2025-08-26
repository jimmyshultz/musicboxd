-- Add favorite albums table for persistent storage
-- This allows users to mark albums as favorites with rankings (1-5) and query them efficiently

CREATE TABLE public.favorite_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    ranking INTEGER NOT NULL CHECK (ranking >= 1 AND ranking <= 5), -- User's ranking 1-5
    favorited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One favorite status per user per album, and one album per ranking per user
    UNIQUE(user_id, album_id),
    UNIQUE(user_id, ranking)
);

-- Indexes for efficient queries
CREATE INDEX idx_favorite_albums_user_ranking ON public.favorite_albums(user_id, ranking ASC);
CREATE INDEX idx_favorite_albums_user ON public.favorite_albums(user_id, favorited_at DESC);
CREATE INDEX idx_favorite_albums_album ON public.favorite_albums(album_id);

-- Updated_at trigger
CREATE TRIGGER update_favorite_albums_updated_at 
    BEFORE UPDATE ON public.favorite_albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE public.favorite_albums ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON public.favorite_albums
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view public favorites (for discovering popular albums)
CREATE POLICY "Users can view public favorites" ON public.favorite_albums
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
    );

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON public.favorite_albums
    FOR ALL USING (auth.uid() = user_id);