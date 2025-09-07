-- ============================================================================
-- RESONARE PRODUCTION DATABASE SCHEMA - COMPLETE
-- Based on your current dev database structure
-- Run this entire script on your new production database
-- ============================================================================

-- ============================================================================
-- USERS & PROFILES
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
-- MUSIC DATA
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
-- SOCIAL FEATURES
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

-- User favorite albums (top 5 ranking system)
CREATE TABLE public.favorite_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    ranking INTEGER NOT NULL CHECK (ranking >= 1 AND ranking <= 5),
    favorited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One ranking per user (can be updated)
    UNIQUE(user_id, ranking),
    -- One album can only be favorited once per user
    UNIQUE(user_id, album_id)
);

-- Activity feed for social features
CREATE TABLE public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('listen', 'rating', 'diary')),
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    reference_id UUID, -- Points to the specific listen/rating/diary record
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow requests table for private profile approval system
CREATE TABLE public.follow_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    requested_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate requests
    UNIQUE(requester_id, requested_id),
    
    -- Prevent self-requests
    CHECK (requester_id != requested_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Albums indexes
CREATE INDEX idx_albums_artist_name ON public.albums(artist_name);
CREATE INDEX idx_albums_name ON public.albums(name);
CREATE INDEX idx_albums_release_date ON public.albums(release_date);

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

-- User follows indexes
CREATE INDEX idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON public.user_follows(following_id);

-- Favorite albums indexes
CREATE INDEX idx_favorite_albums_user_ranking ON public.favorite_albums(user_id, ranking ASC);
CREATE INDEX idx_favorite_albums_user ON public.favorite_albums(user_id, favorited_at DESC);
CREATE INDEX idx_favorite_albums_album ON public.favorite_albums(album_id);

-- User activities indexes
CREATE INDEX idx_user_activities_user_created ON public.user_activities(user_id, created_at DESC);
CREATE INDEX idx_user_activities_type ON public.user_activities(activity_type);

-- Follow requests indexes
CREATE INDEX idx_follow_requests_requested_id ON public.follow_requests(requested_id);
CREATE INDEX idx_follow_requests_requester_id ON public.follow_requests(requester_id);
CREATE INDEX idx_follow_requests_status ON public.follow_requests(status);

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

CREATE TRIGGER update_album_listens_updated_at 
    BEFORE UPDATE ON public.album_listens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_album_ratings_updated_at 
    BEFORE UPDATE ON public.album_ratings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_entries_updated_at 
    BEFORE UPDATE ON public.diary_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_favorite_albums_updated_at 
    BEFORE UPDATE ON public.favorite_albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_requests_updated_at 
    BEFORE UPDATE ON public.follow_requests 
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

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
ALTER TABLE public.favorite_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Profiles discoverable for Instagram model" ON public.user_profiles
    FOR SELECT USING (true); -- All profiles visible for discovery, content protected by activity table policies

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

CREATE POLICY "Users can view accessible listens" ON public.album_listens
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own listens
        OR EXISTS (                              -- Public profile listens
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile listens (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own listens" ON public.album_listens
    FOR ALL USING (auth.uid() = user_id);

-- Album ratings policies
CREATE POLICY "Users can view own ratings" ON public.album_ratings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view accessible ratings" ON public.album_ratings
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own ratings
        OR EXISTS (                              -- Public profile ratings
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile ratings (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own ratings" ON public.album_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Diary entries policies
CREATE POLICY "Users can view own diary entries" ON public.diary_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view accessible diary entries" ON public.diary_entries
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own diary entries
        OR EXISTS (                              -- Public profile diary entries
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile diary entries (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own diary entries" ON public.diary_entries
    FOR ALL USING (auth.uid() = user_id);

-- Favorite albums policies
CREATE POLICY "Users can view own favorites" ON public.favorite_albums
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view accessible favorites" ON public.favorite_albums
    FOR SELECT USING (
        auth.uid() = user_id                     -- Own favorites
        OR EXISTS (                              -- Public profile favorites
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
        OR EXISTS (                              -- Private profile favorites (if following)
            SELECT 1 FROM public.user_follows 
            WHERE following_id = user_id 
            AND follower_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own favorites" ON public.favorite_albums
    FOR ALL USING (auth.uid() = user_id);

-- User follows policies  
CREATE POLICY "Users can view all follows" ON public.user_follows
    FOR SELECT USING (true);

CREATE POLICY "Users can create follows (direct or accepted requests)" ON public.user_follows
    FOR INSERT WITH CHECK (
        auth.uid() = follower_id                     -- User following someone directly
        OR auth.uid() = following_id                 -- User accepting a follow request
    );

CREATE POLICY "Users can delete own follows" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- User activities policies
CREATE POLICY "Users can view activities from public profiles" ON public.user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        ) OR auth.uid() = user_id
    );

CREATE POLICY "Users can create their own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follow requests policies
CREATE POLICY "Users can view own follow requests" ON public.follow_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can send follow requests" ON public.follow_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can respond to received requests" ON public.follow_requests
    FOR UPDATE USING (auth.uid() = requested_id);

CREATE POLICY "Users can cancel sent requests" ON public.follow_requests
    FOR DELETE USING (auth.uid() = requester_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- This schema includes all the latest features from your dev environment:
-- ✅ Separate tables for listens, ratings, and diary entries
-- ✅ Favorite albums with ranking system
-- ✅ Follow requests system for private profiles
-- ✅ Comprehensive RLS policies for privacy
-- ✅ Activity feed system
-- ✅ All necessary indexes for performance
-- ✅ Proper triggers and functions
-- ✅ User profile auto-creation on signup