-- Musicboxd Database Schema V2 - Improved Design
-- Separate tables for different activity types
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- USERS & PROFILES (unchanged)
-- ============================================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    display_name TEXT CHECK (char_length(display_name) <= 100),
    bio TEXT CHECK (char_length(bio) <= 500),
    avatar_url TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MUSIC DATA (unchanged)
-- ============================================================================

-- Albums table (stores Spotify album data)
CREATE TABLE public.albums (
    id TEXT PRIMARY KEY, -- Spotify album ID
    name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    release_date DATE,
    image_url TEXT,
    spotify_url TEXT,
    total_tracks INTEGER,
    album_type TEXT CHECK (album_type IN ('album', 'single', 'compilation')),
    genres TEXT[], -- Array of genre strings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY TABLES - SEPARATE FOR EACH TYPE
-- ============================================================================

-- Album listens - simple boolean status (listened or not)
CREATE TABLE public.album_listens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    is_listened BOOLEAN DEFAULT true, -- Simple listened status
    first_listened_at TIMESTAMPTZ DEFAULT NOW(), -- When they first marked it as listened
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One listen status per user per album
    UNIQUE(user_id, album_id)
);

-- Album ratings - separate from listens
CREATE TABLE public.album_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT CHECK (char_length(review) <= 2000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One rating per user per album (can be updated)
    UNIQUE(user_id, album_id)
);

-- Diary entries - chronological listening history with multiple entries per album
CREATE TABLE public.diary_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    diary_date DATE NOT NULL, -- The date the user assigns to this listen
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Rating at the time of this listen
    notes TEXT CHECK (char_length(notes) <= 1000), -- Optional diary notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One diary entry per user per album per date (can re-listen on different dates)
    UNIQUE(user_id, album_id, diary_date)
);

-- ============================================================================
-- SOCIAL FEATURES (unchanged)
-- ============================================================================

-- User following relationships
CREATE TABLE public.user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent self-follows and duplicate follows
    CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);

-- Activity feed for social features (optional - can be computed from other tables)
CREATE TABLE public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('listen', 'rating', 'diary')),
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    reference_id UUID, -- Points to the specific listen/rating/diary record
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Album listens indexes
CREATE INDEX idx_album_listens_user ON public.album_listens(user_id);
CREATE INDEX idx_album_listens_album ON public.album_listens(album_id);
CREATE INDEX idx_album_listens_listened_at ON public.album_listens(first_listened_at);

-- Album ratings indexes
CREATE INDEX idx_album_ratings_user ON public.album_ratings(user_id, updated_at DESC);
CREATE INDEX idx_album_ratings_album ON public.album_ratings(album_id);
CREATE INDEX idx_album_ratings_rating ON public.album_ratings(rating);

-- Diary entries indexes
CREATE INDEX idx_diary_entries_user_date ON public.diary_entries(user_id, diary_date DESC);
CREATE INDEX idx_diary_entries_album ON public.diary_entries(album_id);
CREATE INDEX idx_diary_entries_user_album ON public.diary_entries(user_id, album_id);

-- User activities indexes
CREATE INDEX idx_user_activities_user_created ON public.user_activities(user_id, created_at DESC);
CREATE INDEX idx_user_activities_type ON public.user_activities(activity_type);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at 
    BEFORE UPDATE ON public.albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_album_ratings_updated_at 
    BEFORE UPDATE ON public.album_ratings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_entries_updated_at 
    BEFORE UPDATE ON public.diary_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create activity feed entries
CREATE OR REPLACE FUNCTION create_activity_feed_entry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_activities (user_id, activity_type, album_id, reference_id)
    VALUES (NEW.user_id, TG_ARGV[0], NEW.album_id, NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for activity feed
CREATE TRIGGER create_listen_activity
    AFTER INSERT OR UPDATE ON public.album_listens
    FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry('listen');

CREATE TRIGGER create_rating_activity
    AFTER INSERT OR UPDATE ON public.album_ratings
    FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry('rating');

CREATE TRIGGER create_diary_activity
    AFTER INSERT ON public.diary_entries
    FOR EACH ROW EXECUTE FUNCTION create_activity_feed_entry('diary');

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_listens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (NOT is_private OR auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Albums policies (public read, authenticated write for caching)
CREATE POLICY "Albums are viewable by everyone" ON public.albums
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert albums" ON public.albums
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Album listens policies
CREATE POLICY "Users can view own listens" ON public.album_listens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public listens" ON public.album_listens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
    );

CREATE POLICY "Users can manage own listens" ON public.album_listens
    FOR ALL USING (auth.uid() = user_id);

-- Album ratings policies
CREATE POLICY "Users can view own ratings" ON public.album_ratings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public ratings" ON public.album_ratings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
    );

CREATE POLICY "Users can manage own ratings" ON public.album_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Diary entries policies
CREATE POLICY "Users can view own diary entries" ON public.diary_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public diary entries" ON public.diary_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
    );

CREATE POLICY "Users can manage own diary entries" ON public.diary_entries
    FOR ALL USING (auth.uid() = user_id);

-- User follows policies
CREATE POLICY "Users can view follows involving them" ON public.user_follows
    FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can manage own follows" ON public.user_follows
    FOR ALL USING (auth.uid() = follower_id);

-- User activities policies
CREATE POLICY "Users can view activities from public profiles" ON public.user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        ) OR auth.uid() = user_id
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

/*
To migrate from the old schema:

1. Backup existing data from user_albums table
2. Create the new tables above
3. Migrate data:
   - user_albums.is_listened=true -> album_listens (simple boolean status)
   - user_albums.rating -> album_ratings  
   - user_albums.review -> album_ratings.review
   - Create diary_entries for any existing listens (using listened_at as diary_date)
4. Drop old user_albums table
5. Update application services to use new tables

Schema Design Philosophy:
- album_listens: Simple "have I listened to this?" status
- album_ratings: "What did I think of this?" with reviews
- diary_entries: "When did I listen and how did I feel?" chronological log

Benefits of new schema:
- Clear separation of concerns between listen status, ratings, and diary
- album_listens = simple boolean for "listened/not listened"
- diary_entries = chronological history of when you listened (multiple entries per album)
- Ratings independent of listen status or diary entries
- Better performance with targeted indexes
- Cleaner data integrity and constraints
- Much easier to query and calculate stats
*/