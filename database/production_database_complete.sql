-- ============================================================================
-- RESONARE PRODUCTION DATABASE SCHEMA
-- Extracted from DEV database - Complete setup script
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES
-- ============================================================================

CREATE TABLE public.album_listens (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    album_id TEXT NOT NULL,
    is_listened BOOLEAN DEFAULT true,
    first_listened_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.album_ratings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    album_id TEXT NOT NULL,
    rating NUMERIC NOT NULL,
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.albums (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    release_date DATE,
    image_url TEXT,
    spotify_url TEXT,
    total_tracks INTEGER,
    album_type TEXT,
    genres TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.diary_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    album_id TEXT NOT NULL,
    diary_date DATE NOT NULL,
    rating NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.favorite_albums (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    album_id TEXT NOT NULL,
    ranking INTEGER NOT NULL,
    favorited_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.follow_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL,
    requested_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    album_id TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_follows (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_profiles (
    id UUID NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 2: ADD PRIMARY KEYS
-- ============================================================================

ALTER TABLE public.album_listens ADD CONSTRAINT album_listens_pkey PRIMARY KEY (id);
ALTER TABLE public.album_ratings ADD CONSTRAINT album_ratings_pkey PRIMARY KEY (id);
ALTER TABLE public.albums ADD CONSTRAINT albums_pkey PRIMARY KEY (id);
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.favorite_albums ADD CONSTRAINT favorite_albums_pkey PRIMARY KEY (id);
ALTER TABLE public.follow_requests ADD CONSTRAINT follow_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_pkey PRIMARY KEY (id);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);

-- ============================================================================
-- STEP 3: ADD FOREIGN KEYS
-- ============================================================================

ALTER TABLE public.album_listens ADD CONSTRAINT album_listens_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums (id) ON DELETE CASCADE;
ALTER TABLE public.album_listens ADD CONSTRAINT album_listens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.album_ratings ADD CONSTRAINT album_ratings_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums (id) ON DELETE CASCADE;
ALTER TABLE public.album_ratings ADD CONSTRAINT album_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums (id) ON DELETE CASCADE;
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.favorite_albums ADD CONSTRAINT favorite_albums_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums (id) ON DELETE CASCADE;
ALTER TABLE public.favorite_albums ADD CONSTRAINT favorite_albums_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.follow_requests ADD CONSTRAINT follow_requests_requested_id_fkey FOREIGN KEY (requested_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.follow_requests ADD CONSTRAINT follow_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums (id) ON DELETE CASCADE;
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_album_listens_album ON public.album_listens USING btree (album_id);
CREATE INDEX idx_album_listens_listened_at ON public.album_listens USING btree (first_listened_at);
CREATE INDEX idx_album_listens_user ON public.album_listens USING btree (user_id);
CREATE INDEX idx_album_ratings_album ON public.album_ratings USING btree (album_id);
CREATE INDEX idx_album_ratings_rating ON public.album_ratings USING btree (rating);
CREATE INDEX idx_album_ratings_user ON public.album_ratings USING btree (user_id, updated_at DESC);
CREATE INDEX idx_diary_entries_album ON public.diary_entries USING btree (album_id);
CREATE INDEX idx_diary_entries_user_album ON public.diary_entries USING btree (user_id, album_id);
CREATE INDEX idx_diary_entries_user_date ON public.diary_entries USING btree (user_id, diary_date DESC);
CREATE INDEX idx_favorite_albums_album ON public.favorite_albums USING btree (album_id);
CREATE INDEX idx_favorite_albums_user ON public.favorite_albums USING btree (user_id, favorited_at DESC);
CREATE INDEX idx_favorite_albums_user_ranking ON public.favorite_albums USING btree (user_id, ranking);
CREATE INDEX idx_follow_requests_requested_id ON public.follow_requests USING btree (requested_id);
CREATE INDEX idx_follow_requests_requester_id ON public.follow_requests USING btree (requester_id);
CREATE INDEX idx_follow_requests_status ON public.follow_requests USING btree (status);
CREATE INDEX idx_user_activities_type ON public.user_activities USING btree (activity_type);
CREATE INDEX idx_user_activities_user_created ON public.user_activities USING btree (user_id, created_at DESC);

-- ============================================================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_activity_feed_entry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO public.user_activities (user_id, activity_type, album_id, reference_id)
    VALUES (NEW.user_id, TG_ARGV[0], NEW.album_id, NEW.id);
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 6: CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER create_listen_activity AFTER INSERT OR UPDATE ON public.album_listens FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry('listen');
CREATE TRIGGER create_rating_activity AFTER INSERT OR UPDATE ON public.album_ratings FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry('rating');
CREATE TRIGGER update_album_ratings_updated_at BEFORE UPDATE ON public.album_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER create_diary_activity AFTER INSERT ON public.diary_entries FOR EACH ROW EXECUTE FUNCTION public.create_activity_feed_entry('diary');
CREATE TRIGGER update_diary_entries_updated_at BEFORE UPDATE ON public.diary_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_favorite_albums_updated_at BEFORE UPDATE ON public.favorite_albums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.album_listens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: CREATE RLS POLICIES
-- ============================================================================

-- Album Listens Policies
CREATE POLICY "Users can manage own listens" ON public.album_listens FOR ALL USING ((auth.uid() = user_id));
CREATE POLICY "Users can view accessible listens" ON public.album_listens FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM user_profiles WHERE ((user_profiles.id = album_listens.user_id) AND (NOT user_profiles.is_private)))) OR (EXISTS ( SELECT 1 FROM user_follows WHERE ((user_follows.following_id = album_listens.user_id) AND (user_follows.follower_id = auth.uid()))))));
CREATE POLICY "Users can view own listens" ON public.album_listens FOR SELECT USING ((auth.uid() = user_id));

-- Album Ratings Policies
CREATE POLICY "Users can manage own ratings" ON public.album_ratings FOR ALL USING ((auth.uid() = user_id));
CREATE POLICY "Users can view accessible ratings" ON public.album_ratings FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM user_profiles WHERE ((user_profiles.id = album_ratings.user_id) AND (NOT user_profiles.is_private)))) OR (EXISTS ( SELECT 1 FROM user_follows WHERE ((user_follows.following_id = album_ratings.user_id) AND (user_follows.follower_id = auth.uid()))))));
CREATE POLICY "Users can view own ratings" ON public.album_ratings FOR SELECT USING ((auth.uid() = user_id));

-- Albums Policies
CREATE POLICY "Albums are viewable by everyone" ON public.albums FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert albums" ON public.albums FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));

-- Diary Entries Policies
CREATE POLICY "Users can manage own diary entries" ON public.diary_entries FOR ALL USING ((auth.uid() = user_id));
CREATE POLICY "Users can view accessible diary entries" ON public.diary_entries FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM user_profiles WHERE ((user_profiles.id = diary_entries.user_id) AND (NOT user_profiles.is_private)))) OR (EXISTS ( SELECT 1 FROM user_follows WHERE ((user_follows.following_id = diary_entries.user_id) AND (user_follows.follower_id = auth.uid()))))));
CREATE POLICY "Users can view own diary entries" ON public.diary_entries FOR SELECT USING ((auth.uid() = user_id));

-- Favorite Albums Policies
CREATE POLICY "Users can manage own favorites" ON public.favorite_albums FOR ALL USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own favorites" ON public.favorite_albums FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can view public favorites" ON public.favorite_albums FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_profiles WHERE ((user_profiles.id = favorite_albums.user_id) AND (NOT user_profiles.is_private)))));

-- Follow Requests Policies
CREATE POLICY "Users can cancel sent requests" ON public.follow_requests FOR DELETE USING ((auth.uid() = requester_id));
CREATE POLICY "Users can respond to received requests" ON public.follow_requests FOR UPDATE USING ((auth.uid() = requested_id));
CREATE POLICY "Users can send follow requests" ON public.follow_requests FOR INSERT WITH CHECK ((auth.uid() = requester_id));
CREATE POLICY "Users can view own follow requests" ON public.follow_requests FOR SELECT USING (((auth.uid() = requester_id) OR (auth.uid() = requested_id)));

-- User Activities Policies
CREATE POLICY "Users can create own activities" ON public.user_activities FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view activities from public profiles" ON public.user_activities FOR SELECT USING (((EXISTS ( SELECT 1 FROM user_profiles WHERE ((user_profiles.id = user_activities.user_id) AND (NOT user_profiles.is_private)))) OR (auth.uid() = user_id)));

-- User Follows Policies
CREATE POLICY "Users can create follows (direct or accepted requests)" ON public.user_follows FOR INSERT WITH CHECK (((auth.uid() = follower_id) OR (auth.uid() = following_id)));
CREATE POLICY "Users can delete own follows" ON public.user_follows FOR DELETE USING ((auth.uid() = follower_id));
CREATE POLICY "Users can manage own follows" ON public.user_follows FOR ALL USING ((auth.uid() = follower_id));
CREATE POLICY "Users can view all follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can view follows involving them" ON public.user_follows FOR SELECT USING (((auth.uid() = follower_id) OR (auth.uid() = following_id)));

-- User Profiles Policies
CREATE POLICY "Profiles discoverable for Instagram model" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = id));

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 10: ADD MISSING CONSTRAINTS AND UNIQUE INDEXES
-- ============================================================================

-- Add unique constraints that are likely missing
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);
ALTER TABLE public.album_listens ADD CONSTRAINT album_listens_user_album_unique UNIQUE (user_id, album_id);
ALTER TABLE public.album_ratings ADD CONSTRAINT album_ratings_user_album_unique UNIQUE (user_id, album_id);
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_user_album_date_unique UNIQUE (user_id, album_id, diary_date);
ALTER TABLE public.favorite_albums ADD CONSTRAINT favorite_albums_user_album_unique UNIQUE (user_id, album_id);
ALTER TABLE public.favorite_albums ADD CONSTRAINT favorite_albums_user_ranking_unique UNIQUE (user_id, ranking);
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id);
ALTER TABLE public.follow_requests ADD CONSTRAINT follow_requests_unique UNIQUE (requester_id, requested_id);

-- Add check constraints
ALTER TABLE public.album_ratings ADD CONSTRAINT album_ratings_rating_check CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_rating_check CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.favorite_albums ADD CONSTRAINT favorite_albums_ranking_check CHECK (ranking >= 1 AND ranking <= 5);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 30);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_display_name_length_check CHECK (char_length(display_name) <= 100);
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_bio_length_check CHECK (char_length(bio) <= 500);
ALTER TABLE public.album_ratings ADD CONSTRAINT album_ratings_review_length_check CHECK (char_length(review) <= 2000);
ALTER TABLE public.diary_entries ADD CONSTRAINT diary_entries_notes_length_check CHECK (char_length(notes) <= 1000);
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_no_self_follow_check CHECK (follower_id != following_id);
ALTER TABLE public.follow_requests ADD CONSTRAINT follow_requests_no_self_request_check CHECK (requester_id != requested_id);
ALTER TABLE public.follow_requests ADD CONSTRAINT follow_requests_status_check CHECK (status IN ('pending', 'accepted', 'rejected'));
ALTER TABLE public.user_activities ADD CONSTRAINT user_activities_type_check CHECK (activity_type IN ('listen', 'rating', 'diary'));
ALTER TABLE public.albums ADD CONSTRAINT albums_type_check CHECK (album_type IN ('album', 'single', 'compilation'));

-- ============================================================================
-- PRODUCTION DATABASE SETUP COMPLETE
-- ============================================================================

-- Your production database is now ready with:
-- ✅ All tables with proper structure
-- ✅ All primary and foreign key relationships
-- ✅ All performance indexes
-- ✅ All functions and triggers
-- ✅ Complete RLS security policies
-- ✅ All constraints and validations
-- ✅ Proper permissions