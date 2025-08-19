-- Musicboxd Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security on auth.users (already enabled by default)
-- Create custom profiles table to extend user data

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
-- USER INTERACTIONS
-- ============================================================================

-- User album interactions (ratings, listening status)
CREATE TABLE public.user_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_listened BOOLEAN DEFAULT false,
    listened_at TIMESTAMPTZ,
    review TEXT CHECK (char_length(review) <= 2000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per user per album
    UNIQUE(user_id, album_id)
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

-- Activity feed for user actions
CREATE TABLE public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('rating', 'review', 'listen')),
    album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_excerpt TEXT, -- First 200 chars of review for feed
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- User albums indexes
CREATE INDEX idx_user_albums_user_id ON public.user_albums(user_id);
CREATE INDEX idx_user_albums_album_id ON public.user_albums(album_id);
CREATE INDEX idx_user_albums_rating ON public.user_albums(rating);
CREATE INDEX idx_user_albums_listened_at ON public.user_albums(listened_at);

-- User follows indexes
CREATE INDEX idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON public.user_follows(following_id);

-- User activities indexes
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at);
CREATE INDEX idx_user_activities_activity_type ON public.user_activities(activity_type);

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

CREATE TRIGGER update_user_albums_updated_at 
    BEFORE UPDATE ON public.user_albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create activity feed entries
CREATE OR REPLACE FUNCTION create_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create activity for public actions (ratings, reviews, listens)
    IF NEW.rating IS NOT NULL OR NEW.review IS NOT NULL OR (NEW.is_listened = true AND OLD.is_listened = false) THEN
        INSERT INTO public.user_activities (user_id, activity_type, album_id, rating, review_excerpt)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN NEW.rating IS NOT NULL AND (OLD.rating IS NULL OR OLD.rating != NEW.rating) THEN 'rating'
                WHEN NEW.review IS NOT NULL AND (OLD.review IS NULL OR OLD.review != NEW.review) THEN 'review'
                WHEN NEW.is_listened = true AND OLD.is_listened = false THEN 'listen'
                ELSE 'rating' -- Default fallback
            END,
            NEW.album_id,
            NEW.rating,
            LEFT(NEW.review, 200)
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for activity creation
CREATE TRIGGER create_user_activity_trigger
    AFTER INSERT OR UPDATE ON public.user_albums
    FOR EACH ROW EXECUTE FUNCTION create_user_activity();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_albums ENABLE ROW LEVEL SECURITY;
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

-- User albums policies
CREATE POLICY "Users can view own album interactions" ON public.user_albums
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public album interactions" ON public.user_albums
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = user_id AND NOT is_private
        )
    );

CREATE POLICY "Users can manage own album interactions" ON public.user_albums
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
-- INITIAL DATA & SETUP
-- ============================================================================

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;