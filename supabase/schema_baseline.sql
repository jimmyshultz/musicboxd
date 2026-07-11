


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_activity_feed_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO public.user_activities (user_id, activity_type, album_id, reference_id)
    VALUES (NEW.user_id, TG_ARGV[0], NEW.album_id, NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_activity_feed_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_push_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO public.push_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_push_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_diary_comment_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    entry_owner_id UUID;
BEGIN
    -- Get the diary entry owner
    SELECT user_id INTO entry_owner_id
    FROM public.diary_entries
    WHERE id = NEW.entry_id;
    
    -- Only create notification if the commenter is not the entry owner
    IF entry_owner_id IS NOT NULL AND entry_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (entry_owner_id, 'diary_comment', NEW.user_id, NEW.entry_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_diary_comment_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_diary_like_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    entry_owner_id UUID;
BEGIN
    -- Get the diary entry owner
    SELECT user_id INTO entry_owner_id
    FROM public.diary_entries
    WHERE id = NEW.entry_id;
    
    -- Only create notification if the liker is not the entry owner
    IF entry_owner_id IS NOT NULL AND entry_owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (entry_owner_id, 'diary_like', NEW.user_id, NEW.entry_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_diary_like_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_follow_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Create notification for the person being followed (following_id)
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, NEW.id);
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_follow_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_follow_request_accepted_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Only create notification when status changes to 'accepted'
    -- Notification goes to the requester (the person who sent the request)
    -- Actor is the person who accepted the request (requested_id)
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
        VALUES (NEW.requester_id, 'follow_request_accepted', NEW.requested_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_follow_request_accepted_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_follow_request_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Create notification for the person receiving the request (requested_id)
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (NEW.requested_id, 'follow_request', NEW.requester_id, NEW.id);
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_follow_request_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_auth_user_on_profile_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Delete the user from auth.users
  -- This requires elevated privileges which SECURITY DEFINER provides
  DELETE FROM auth.users WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_auth_user_on_profile_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_auth_user_on_profile_delete"() IS 'Automatically deletes the auth.users record when a user profile is deleted.';



CREATE OR REPLACE FUNCTION "public"."delete_user_account"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Verify the user is deleting their own account
  -- Must explicitly check for NULL since NULL != value returns NULL (not TRUE)
  -- and IF NULL THEN does not execute, which would bypass the security check
  IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete in order to respect any foreign key constraints
  -- 1. Delete user activities
  DELETE FROM user_activities WHERE user_id = target_user_id;
  
  -- 2. Delete diary entries
  DELETE FROM diary_entries WHERE user_id = target_user_id;
  
  -- 3. Delete album ratings
  DELETE FROM album_ratings WHERE user_id = target_user_id;
  
  -- 4. Delete album listens
  DELETE FROM album_listens WHERE user_id = target_user_id;
  
  -- 5. Delete follow requests (both sent and received)
  DELETE FROM follow_requests 
  WHERE requester_id = target_user_id OR requested_id = target_user_id;
  
  -- 6. Delete user follows (both as follower and following)
  DELETE FROM user_follows 
  WHERE follower_id = target_user_id OR following_id = target_user_id;
  
  -- 7. Delete favorite albums if the table exists
  BEGIN
    DELETE FROM favorite_albums WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  END;
  
  -- 8. Finally, delete the user profile
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") IS 'Deletes all data associated with a user account. Can only be called by the user themselves.';



CREATE OR REPLACE FUNCTION "public"."get_popular_albums_weekly"("limit_count" integer DEFAULT 15) RETURNS TABLE("id" "text", "name" "text", "artist_name" "text", "artist_id" "text", "release_date" "date", "image_url" "text", "spotify_url" "text", "total_tracks" integer, "album_type" "text", "genres" "text"[], "listen_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_popular_albums_weekly"("limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_popular_albums_weekly"("limit_count" integer) IS 'Returns the most popular albums from the last 7 days based on listen count. Performs aggregation server-side to reduce data transfer.';



CREATE OR REPLACE FUNCTION "public"."get_suggested_users_v2"("current_user_id" "uuid", "result_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "username" "text", "display_name" "text", "bio" "text", "avatar_url" "text", "is_private" boolean, "is_banned" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "mutual_count" bigint, "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  daily_seed text;
BEGIN
  -- Generate a daily seed for consistent randomization within a day
  daily_seed := current_date::text || current_user_id::text;
  
  RETURN QUERY
  WITH 
  -- Get users the current user is already following
  following_ids AS (
    SELECT uf.following_id
    FROM user_follows uf
    WHERE uf.follower_id = current_user_id
  ),
  
  -- Get blocked user IDs (both directions)
  blocked_ids AS (
    SELECT blocked_id AS user_id FROM blocked_users WHERE blocker_id = current_user_id
    UNION
    SELECT blocker_id AS user_id FROM blocked_users WHERE blocked_id = current_user_id
  ),
  
  -- Get current user's followers (for mutual calculation)
  current_user_followers AS (
    SELECT uf.follower_id
    FROM user_follows uf
    WHERE uf.following_id = current_user_id
  ),
  
  -- Get candidate users (public, not banned, not self, not following, not blocked)
  candidates AS (
    SELECT up.*
    FROM user_profiles up
    WHERE up.id != current_user_id
      AND up.is_private = false
      AND (up.is_banned IS NULL OR up.is_banned = false)
      AND up.id NOT IN (SELECT following_id FROM following_ids)
      AND up.id NOT IN (SELECT user_id FROM blocked_ids)
  ),
  
  -- Calculate mutual followers for each candidate
  -- (users who follow both the current user AND the candidate)
  mutual_counts AS (
    SELECT 
      c.id AS candidate_id,
      COUNT(DISTINCT uf.follower_id) AS mutual_count
    FROM candidates c
    LEFT JOIN user_follows uf ON uf.following_id = c.id
      AND uf.follower_id IN (SELECT follower_id FROM current_user_followers)
    GROUP BY c.id
  ),
  
  -- Check activity in last 30 days (diary entries or album listens)
  activity_check AS (
    SELECT 
      c.id AS candidate_id,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM diary_entries de 
          WHERE de.user_id = c.id 
            AND de.created_at > NOW() - INTERVAL '30 days'
        ) OR EXISTS (
          SELECT 1 FROM album_listens al 
          WHERE al.user_id = c.id 
            AND al.created_at > NOW() - INTERVAL '30 days'
        )
        THEN true
        ELSE false
      END AS is_active
    FROM candidates c
  ),
  
  -- Combine all data with tier ranking
  ranked_users AS (
    SELECT 
      c.*,
      COALESCE(mc.mutual_count, 0) AS mutual_count,
      COALESCE(ac.is_active, false) AS is_active,
      -- Tier: 1 = has mutuals, 2 = active no mutuals, 3 = inactive no mutuals
      CASE 
        WHEN COALESCE(mc.mutual_count, 0) > 0 THEN 1
        WHEN COALESCE(ac.is_active, false) = true THEN 2
        ELSE 3
      END AS tier,
      -- Daily randomization seed for 0-mutual users
      md5(c.id::text || daily_seed) AS random_seed
    FROM candidates c
    LEFT JOIN mutual_counts mc ON mc.candidate_id = c.id
    LEFT JOIN activity_check ac ON ac.candidate_id = c.id
  )
  
  -- Final selection with tiered ordering
  SELECT 
    ru.id,
    ru.username,
    ru.display_name,
    ru.bio,
    ru.avatar_url,
    ru.is_private,
    ru.is_banned,
    ru.created_at,
    ru.updated_at,
    ru.mutual_count,
    ru.is_active
  FROM ranked_users ru
  ORDER BY 
    ru.tier ASC,                           -- Tier 1 first, then 2, then 3
    CASE WHEN ru.tier = 1 
      THEN -ru.mutual_count                -- Within tier 1: sort by mutual count desc
      ELSE 0 
    END,
    CASE WHEN ru.tier > 1 
      THEN ru.random_seed                  -- Within tiers 2 & 3: randomize daily
      ELSE NULL 
    END
  LIMIT result_limit;
END;
$$;


ALTER FUNCTION "public"."get_suggested_users_v2"("current_user_id" "uuid", "result_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_suggested_users_v2"("current_user_id" "uuid", "result_limit" integer) IS 'Returns suggested users for Discover Friends section with tiered ranking:
Tier 1: Users with mutual followers (sorted by count descending)
Tier 2: Active users with 0 mutuals (diary/listen activity in last 30 days, randomized daily)
Tier 3: Inactive users with 0 mutuals (randomized daily)';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "is_private" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "terms_accepted_at" timestamp with time zone,
    "is_banned" boolean DEFAULT false,
    "banned_at" timestamp with time zone,
    "ban_reason" "text",
    CONSTRAINT "user_profiles_bio_length_check" CHECK (("char_length"("bio") <= 500)),
    CONSTRAINT "user_profiles_display_name_length_check" CHECK (("char_length"("display_name") <= 100)),
    CONSTRAINT "user_profiles_username_length_check" CHECK ((("char_length"("username") >= 3) AND ("char_length"("username") <= 30)))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_followers"("target_user_id" "uuid", "current_viewer_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."user_profiles"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_user_followers"("target_user_id" "uuid", "current_viewer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_followers"("target_user_id" "uuid", "current_viewer_id" "uuid") IS 'Efficiently retrieves all followers of a user in a single query. Excludes banned users and blocked users (bidirectional). If current_viewer_id is NULL, only excludes banned users.';



CREATE OR REPLACE FUNCTION "public"."get_user_following"("target_user_id" "uuid", "current_viewer_id" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."user_profiles"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_user_following"("target_user_id" "uuid", "current_viewer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_following"("target_user_id" "uuid", "current_viewer_id" "uuid") IS 'Efficiently retrieves all users followed by a user in a single query. Excludes banned users and blocked users (bidirectional). If current_viewer_id is NULL, only excludes banned users.';



CREATE OR REPLACE FUNCTION "public"."get_user_stats"("target_user_id" "uuid") RETURNS TABLE("albums_all_time" bigint, "albums_this_year" bigint, "ratings_all_time" bigint, "ratings_this_year" bigint, "average_rating" numeric, "diary_entries" bigint, "followers" bigint, "following" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_user_stats"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_stats"("target_user_id" "uuid") IS 'Efficiently retrieves all user statistics in a single query. Returns albums listened, ratings, diary entries, and follow counts.';



CREATE OR REPLACE FUNCTION "public"."is_user_blocked"("p_user_id" "uuid", "p_blocked_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = p_user_id AND blocked_id = p_blocked_id
  );
END;
$$;


ALTER FUNCTION "public"."is_user_blocked"("p_user_id" "uuid", "p_blocked_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moderate_content"("p_report_id" "uuid", "p_action" "text", "p_admin_id" "text", "p_action_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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
$$;


ALTER FUNCTION "public"."moderate_content"("p_report_id" "uuid", "p_action" "text", "p_admin_id" "text", "p_action_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_diary_entry_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New comment added
        UPDATE public.diary_entries 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.entry_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Comment hard deleted
        UPDATE public.diary_entries 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.entry_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle soft delete/restore: check if is_deleted changed
        IF (OLD.is_deleted = false AND NEW.is_deleted = true) THEN
            -- Comment was soft deleted
            UPDATE public.diary_entries 
            SET comments_count = GREATEST(comments_count - 1, 0) 
            WHERE id = NEW.entry_id;
        ELSIF (OLD.is_deleted = true AND NEW.is_deleted = false) THEN
            -- Comment was restored
            UPDATE public.diary_entries 
            SET comments_count = comments_count + 1 
            WHERE id = NEW.entry_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_diary_entry_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_diary_entry_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.diary_entries 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.entry_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.diary_entries 
        SET likes_count = GREATEST(likes_count - 1, 0) 
        WHERE id = OLD.entry_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_diary_entry_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_push_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_push_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_push_tokens_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_push_tokens_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."users_have_blocked"("p_user_id_1" "uuid", "p_user_id_2" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE (blocker_id = p_user_id_1 AND blocked_id = p_user_id_2)
       OR (blocker_id = p_user_id_2 AND blocked_id = p_user_id_1)
  );
END;
$$;


ALTER FUNCTION "public"."users_have_blocked"("p_user_id_1" "uuid", "p_user_id_2" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."album_listens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "album_id" "text" NOT NULL,
    "is_listened" boolean DEFAULT true,
    "first_listened_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."album_listens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."album_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "album_id" "text" NOT NULL,
    "rating" numeric NOT NULL,
    "review" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "album_ratings_rating_check" CHECK ((("rating" >= (1)::numeric) AND ("rating" <= (5)::numeric))),
    CONSTRAINT "album_ratings_review_length_check" CHECK (("char_length"("review") <= 2000))
);


ALTER TABLE "public"."album_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."albums" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "artist_name" "text" NOT NULL,
    "release_date" "date",
    "image_url" "text",
    "spotify_url" "text",
    "total_tracks" integer,
    "album_type" "text",
    "genres" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "artist_id" "text",
    CONSTRAINT "albums_type_check" CHECK (("album_type" = ANY (ARRAY['album'::"text", 'single'::"text", 'compilation'::"text"])))
);


ALTER TABLE "public"."albums" OWNER TO "postgres";


COMMENT ON COLUMN "public"."albums"."artist_id" IS 'Foreign key to artists table (Spotify artist ID). Nullable for backward compatibility.';



CREATE TABLE IF NOT EXISTS "public"."artists" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "image_url" "text",
    "spotify_url" "text",
    "genres" "text"[],
    "follower_count" integer,
    "popularity" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."artists" OWNER TO "postgres";


COMMENT ON TABLE "public"."artists" IS 'Stores artist information fetched from Spotify API';



COMMENT ON COLUMN "public"."artists"."id" IS 'Spotify artist ID';



COMMENT ON COLUMN "public"."artists"."name" IS 'Artist name';



COMMENT ON COLUMN "public"."artists"."image_url" IS 'URL to artist image from Spotify';



COMMENT ON COLUMN "public"."artists"."spotify_url" IS 'Link to artist on Spotify';



COMMENT ON COLUMN "public"."artists"."genres" IS 'Array of genre strings associated with the artist';



COMMENT ON COLUMN "public"."artists"."follower_count" IS 'Number of followers on Spotify';



COMMENT ON COLUMN "public"."artists"."popularity" IS 'Spotify popularity score (0-100)';



CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "blocked_users_no_self_block" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid" NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid",
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "text",
    "action_taken" "text",
    CONSTRAINT "content_reports_content_type_check" CHECK (("content_type" = ANY (ARRAY['profile'::"text", 'rating'::"text", 'diary_entry'::"text"]))),
    CONSTRAINT "content_reports_no_self_report" CHECK (("reporter_id" <> "reported_user_id")),
    CONSTRAINT "content_reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'harassment'::"text", 'hate_speech'::"text", 'inappropriate'::"text", 'other'::"text"]))),
    CONSTRAINT "content_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'actioned'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."content_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diary_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "album_id" "text" NOT NULL,
    "diary_date" "date" NOT NULL,
    "rating" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "likes_count" integer DEFAULT 0 NOT NULL,
    "comments_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "diary_entries_notes_length_check" CHECK (("char_length"("notes") <= 1000)),
    CONSTRAINT "diary_entries_rating_check" CHECK ((("rating" >= (1)::numeric) AND ("rating" <= (5)::numeric)))
);


ALTER TABLE "public"."diary_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diary_entry_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    CONSTRAINT "diary_entry_comments_body_length" CHECK ((("char_length"("body") >= 1) AND ("char_length"("body") <= 2000)))
);


ALTER TABLE "public"."diary_entry_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."diary_entry_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."diary_entry_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorite_albums" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "album_id" "text" NOT NULL,
    "ranking" integer NOT NULL,
    "favorited_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "favorite_albums_ranking_check" CHECK ((("ranking" >= 1) AND ("ranking" <= 5)))
);


ALTER TABLE "public"."favorite_albums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follow_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "requested_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "follow_requests_no_self_request_check" CHECK (("requester_id" <> "requested_id")),
    CONSTRAINT "follow_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."follow_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "reference_id" "uuid",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['follow'::"text", 'follow_request'::"text", 'follow_request_accepted'::"text", 'diary_like'::"text", 'diary_comment'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_preferences" (
    "user_id" "uuid" NOT NULL,
    "push_enabled" boolean DEFAULT true,
    "follows_enabled" boolean DEFAULT true,
    "likes_enabled" boolean DEFAULT true,
    "comments_enabled" boolean DEFAULT true,
    "marketing_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "device_id" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "album_id" "text" NOT NULL,
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_activities_type_check" CHECK (("activity_type" = ANY (ARRAY['listen'::"text", 'rating'::"text", 'diary'::"text"])))
);


ALTER TABLE "public"."user_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_follows_no_self_follow_check" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";


ALTER TABLE ONLY "public"."album_listens"
    ADD CONSTRAINT "album_listens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."album_listens"
    ADD CONSTRAINT "album_listens_user_album_unique" UNIQUE ("user_id", "album_id");



ALTER TABLE ONLY "public"."album_ratings"
    ADD CONSTRAINT "album_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."album_ratings"
    ADD CONSTRAINT "album_ratings_user_album_unique" UNIQUE ("user_id", "album_id");



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diary_entries"
    ADD CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diary_entries"
    ADD CONSTRAINT "diary_entries_user_album_date_unique" UNIQUE ("user_id", "album_id", "diary_date");



ALTER TABLE ONLY "public"."diary_entry_comments"
    ADD CONSTRAINT "diary_entry_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diary_entry_likes"
    ADD CONSTRAINT "diary_entry_likes_entry_user_unique" UNIQUE ("entry_id", "user_id");



ALTER TABLE ONLY "public"."diary_entry_likes"
    ADD CONSTRAINT "diary_entry_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_albums"
    ADD CONSTRAINT "favorite_albums_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_albums"
    ADD CONSTRAINT "favorite_albums_user_album_unique" UNIQUE ("user_id", "album_id");



ALTER TABLE ONLY "public"."favorite_albums"
    ADD CONSTRAINT "favorite_albums_user_ranking_unique" UNIQUE ("user_id", "ranking");



ALTER TABLE ONLY "public"."follow_requests"
    ADD CONSTRAINT "follow_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follow_requests"
    ADD CONSTRAINT "follow_requests_unique" UNIQUE ("requester_id", "requested_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_preferences"
    ADD CONSTRAINT "push_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_unique" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_username_unique" UNIQUE ("username");



CREATE INDEX "idx_album_listens_album" ON "public"."album_listens" USING "btree" ("album_id");



CREATE INDEX "idx_album_listens_listened_at" ON "public"."album_listens" USING "btree" ("first_listened_at");



CREATE INDEX "idx_album_listens_user" ON "public"."album_listens" USING "btree" ("user_id");



CREATE INDEX "idx_album_ratings_album" ON "public"."album_ratings" USING "btree" ("album_id");



CREATE INDEX "idx_album_ratings_rating" ON "public"."album_ratings" USING "btree" ("rating");



CREATE INDEX "idx_album_ratings_user" ON "public"."album_ratings" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_albums_artist_id" ON "public"."albums" USING "btree" ("artist_id");



CREATE INDEX "idx_artists_name" ON "public"."artists" USING "btree" ("name");



CREATE INDEX "idx_artists_popularity" ON "public"."artists" USING "btree" ("popularity" DESC NULLS LAST);



CREATE INDEX "idx_blocked_users_blocked_id" ON "public"."blocked_users" USING "btree" ("blocked_id");



CREATE INDEX "idx_blocked_users_blocker_id" ON "public"."blocked_users" USING "btree" ("blocker_id");



CREATE INDEX "idx_content_reports_created_at" ON "public"."content_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_content_reports_reported_user_id" ON "public"."content_reports" USING "btree" ("reported_user_id");



CREATE INDEX "idx_content_reports_reporter_id" ON "public"."content_reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_content_reports_status" ON "public"."content_reports" USING "btree" ("status");



CREATE INDEX "idx_diary_entries_album" ON "public"."diary_entries" USING "btree" ("album_id");



CREATE INDEX "idx_diary_entries_user_album" ON "public"."diary_entries" USING "btree" ("user_id", "album_id");



CREATE INDEX "idx_diary_entries_user_date" ON "public"."diary_entries" USING "btree" ("user_id", "diary_date" DESC);



CREATE INDEX "idx_diary_entry_comments_entry_created" ON "public"."diary_entry_comments" USING "btree" ("entry_id", "created_at");



CREATE INDEX "idx_diary_entry_comments_user_created" ON "public"."diary_entry_comments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_diary_entry_likes_entry_id" ON "public"."diary_entry_likes" USING "btree" ("entry_id");



CREATE INDEX "idx_diary_entry_likes_user_created" ON "public"."diary_entry_likes" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_favorite_albums_album" ON "public"."favorite_albums" USING "btree" ("album_id");



CREATE INDEX "idx_favorite_albums_user" ON "public"."favorite_albums" USING "btree" ("user_id", "favorited_at" DESC);



CREATE INDEX "idx_favorite_albums_user_ranking" ON "public"."favorite_albums" USING "btree" ("user_id", "ranking");



CREATE INDEX "idx_follow_requests_requested_id" ON "public"."follow_requests" USING "btree" ("requested_id");



CREATE INDEX "idx_follow_requests_requester_id" ON "public"."follow_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_follow_requests_status" ON "public"."follow_requests" USING "btree" ("status");



CREATE INDEX "idx_notifications_actor" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_push_tokens_active" ON "public"."push_tokens" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_user_activities_type" ON "public"."user_activities" USING "btree" ("activity_type");



CREATE INDEX "idx_user_activities_user_created" ON "public"."user_activities" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "create_diary_activity" AFTER INSERT ON "public"."diary_entries" FOR EACH ROW EXECUTE FUNCTION "public"."create_activity_feed_entry"('diary');



CREATE OR REPLACE TRIGGER "create_diary_comment_notification_trigger" AFTER INSERT ON "public"."diary_entry_comments" FOR EACH ROW EXECUTE FUNCTION "public"."create_diary_comment_notification"();



CREATE OR REPLACE TRIGGER "create_diary_like_notification_trigger" AFTER INSERT ON "public"."diary_entry_likes" FOR EACH ROW EXECUTE FUNCTION "public"."create_diary_like_notification"();



CREATE OR REPLACE TRIGGER "create_follow_notification_trigger" AFTER INSERT ON "public"."user_follows" FOR EACH ROW EXECUTE FUNCTION "public"."create_follow_notification"();



CREATE OR REPLACE TRIGGER "create_follow_request_accepted_notification_trigger" AFTER UPDATE ON "public"."follow_requests" FOR EACH ROW WHEN ((("new"."status" = 'accepted'::"text") AND (("old"."status" IS NULL) OR ("old"."status" <> 'accepted'::"text")))) EXECUTE FUNCTION "public"."create_follow_request_accepted_notification"();



CREATE OR REPLACE TRIGGER "create_follow_request_notification_trigger" AFTER INSERT ON "public"."follow_requests" FOR EACH ROW EXECUTE FUNCTION "public"."create_follow_request_notification"();



CREATE OR REPLACE TRIGGER "create_listen_activity" AFTER INSERT OR UPDATE ON "public"."album_listens" FOR EACH ROW EXECUTE FUNCTION "public"."create_activity_feed_entry"('listen');



CREATE OR REPLACE TRIGGER "create_push_preferences_on_profile" AFTER INSERT ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_push_preferences"();



CREATE OR REPLACE TRIGGER "create_rating_activity" AFTER INSERT OR UPDATE ON "public"."album_ratings" FOR EACH ROW EXECUTE FUNCTION "public"."create_activity_feed_entry"('rating');



CREATE OR REPLACE TRIGGER "notify-new-reports" AFTER INSERT ON "public"."content_reports" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://hook.us2.make.com/wert1hhntfq0rgxbcnhl9eahf1qh6j5l', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "on_profile_deleted" AFTER DELETE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."delete_auth_user_on_profile_delete"();



CREATE OR REPLACE TRIGGER "send-push-notification" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://tngotzouiyaiezavxdqn.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZ290em91aXlhaWV6YXZ4ZHFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzEyODkyMSwiZXhwIjoyMDcyNzA0OTIxfQ.AZ2XyKuO11NU5KVJ2ojPm45kgEYI_CEiC3jQwqN_XIU"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "update_album_ratings_updated_at" BEFORE UPDATE ON "public"."album_ratings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_albums_updated_at" BEFORE UPDATE ON "public"."albums" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_artists_updated_at" BEFORE UPDATE ON "public"."artists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_diary_entries_updated_at" BEFORE UPDATE ON "public"."diary_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_diary_entry_comments_count_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."diary_entry_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_diary_entry_comments_count"();



CREATE OR REPLACE TRIGGER "update_diary_entry_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."diary_entry_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_diary_entry_likes_count"();



CREATE OR REPLACE TRIGGER "update_favorite_albums_updated_at" BEFORE UPDATE ON "public"."favorite_albums" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_preferences_updated_at_trigger" BEFORE UPDATE ON "public"."push_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_push_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "update_push_tokens_updated_at_trigger" BEFORE UPDATE ON "public"."push_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_push_tokens_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."album_listens"
    ADD CONSTRAINT "album_listens_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_listens"
    ADD CONSTRAINT "album_listens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_ratings"
    ADD CONSTRAINT "album_ratings_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_ratings"
    ADD CONSTRAINT "album_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."albums"
    ADD CONSTRAINT "albums_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_reports"
    ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diary_entries"
    ADD CONSTRAINT "diary_entries_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diary_entries"
    ADD CONSTRAINT "diary_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diary_entry_comments"
    ADD CONSTRAINT "diary_entry_comments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."diary_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diary_entry_comments"
    ADD CONSTRAINT "diary_entry_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diary_entry_likes"
    ADD CONSTRAINT "diary_entry_likes_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."diary_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diary_entry_likes"
    ADD CONSTRAINT "diary_entry_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_albums"
    ADD CONSTRAINT "favorite_albums_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_albums"
    ADD CONSTRAINT "favorite_albums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follow_requests"
    ADD CONSTRAINT "follow_requests_requested_id_fkey" FOREIGN KEY ("requested_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follow_requests"
    ADD CONSTRAINT "follow_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_preferences"
    ADD CONSTRAINT "push_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Albums are viewable by everyone" ON "public"."albums" FOR SELECT USING (true);



CREATE POLICY "Artists are viewable by everyone" ON "public"."artists" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert albums" ON "public"."albums" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert artists" ON "public"."artists" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update artists" ON "public"."artists" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Profiles discoverable for Instagram model" ON "public"."user_profiles" FOR SELECT USING (true);



CREATE POLICY "Service role can insert notifications" ON "public"."notifications" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can read all tokens" ON "public"."push_tokens" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role can read preferences" ON "public"."push_preferences" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Users can cancel sent requests" ON "public"."follow_requests" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "requester_id"));



CREATE POLICY "Users can create blocks" ON "public"."blocked_users" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "blocker_id"));



CREATE POLICY "Users can create own activities" ON "public"."user_activities" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create reports" ON "public"."content_reports" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));



CREATE POLICY "Users can delete comments" ON "public"."diary_entry_comments" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."diary_entries"
  WHERE (("diary_entries"."id" = "diary_entry_comments"."entry_id") AND ("diary_entries"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can delete follows" ON "public"."user_follows" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "follower_id"));



CREATE POLICY "Users can delete own diary entries" ON "public"."diary_entries" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own diary entry likes" ON "public"."diary_entry_likes" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own favorites" ON "public"."favorite_albums" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own listens" ON "public"."album_listens" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own ratings" ON "public"."album_ratings" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own tokens" ON "public"."push_tokens" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own blocks" ON "public"."blocked_users" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "blocker_id"));



CREATE POLICY "Users can insert follows" ON "public"."user_follows" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "follower_id") OR (( SELECT "auth"."uid"() AS "uid") = "following_id")));



CREATE POLICY "Users can insert own diary entries" ON "public"."diary_entries" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own diary entry comments" ON "public"."diary_entry_comments" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own diary entry likes" ON "public"."diary_entry_likes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own favorites" ON "public"."favorite_albums" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own listens" ON "public"."album_listens" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert own ratings" ON "public"."album_ratings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can manage own preferences" ON "public"."push_preferences" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can respond to received requests" ON "public"."follow_requests" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "requested_id"));



CREATE POLICY "Users can send follow requests" ON "public"."follow_requests" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "requester_id"));



CREATE POLICY "Users can update own diary entries" ON "public"."diary_entries" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own diary entry comments" ON "public"."diary_entry_comments" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own favorites" ON "public"."favorite_albums" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own follows" ON "public"."user_follows" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "follower_id"));



CREATE POLICY "Users can update own listens" ON "public"."album_listens" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own ratings" ON "public"."album_ratings" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own tokens" ON "public"."push_tokens" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view accessible diary entries" ON "public"."diary_entries" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "diary_entries"."user_id") AND (NOT "user_profiles"."is_private")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_follows"
  WHERE (("user_follows"."following_id" = "diary_entries"."user_id") AND ("user_follows"."follower_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view accessible listens" ON "public"."album_listens" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "album_listens"."user_id") AND (NOT "user_profiles"."is_private")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_follows"
  WHERE (("user_follows"."following_id" = "album_listens"."user_id") AND ("user_follows"."follower_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view accessible ratings" ON "public"."album_ratings" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "album_ratings"."user_id") AND (NOT "user_profiles"."is_private")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_follows"
  WHERE (("user_follows"."following_id" = "album_ratings"."user_id") AND ("user_follows"."follower_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view activities from public profiles" ON "public"."user_activities" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "user_activities"."user_id") AND (NOT "user_profiles"."is_private")))) OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Users can view all follows" ON "public"."user_follows" FOR SELECT USING (true);



CREATE POLICY "Users can view blocks they created" ON "public"."blocked_users" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "blocker_id"));



CREATE POLICY "Users can view diary entry comments" ON "public"."diary_entry_comments" FOR SELECT USING ((("is_deleted" = false) OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "Users can view diary entry likes" ON "public"."diary_entry_likes" FOR SELECT USING (true);



CREATE POLICY "Users can view own follow requests" ON "public"."follow_requests" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "requester_id") OR (( SELECT "auth"."uid"() AS "uid") = "requested_id")));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own tokens" ON "public"."push_tokens" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view public favorites" ON "public"."favorite_albums" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "favorite_albums"."user_id") AND (NOT "user_profiles"."is_private")))));



CREATE POLICY "Users can view their own reports" ON "public"."content_reports" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "reporter_id"));



ALTER TABLE "public"."album_listens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."album_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diary_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diary_entry_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diary_entry_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorite_albums" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follow_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."create_activity_feed_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_activity_feed_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_activity_feed_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_push_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_push_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_push_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_diary_comment_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_diary_comment_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_diary_comment_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_diary_like_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_diary_like_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_diary_like_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_follow_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_follow_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_follow_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_follow_request_accepted_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_follow_request_accepted_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_follow_request_accepted_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_follow_request_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_follow_request_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_follow_request_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_auth_user_on_profile_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user_on_profile_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user_on_profile_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_popular_albums_weekly"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_albums_weekly"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_albums_weekly"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_suggested_users_v2"("current_user_id" "uuid", "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_suggested_users_v2"("current_user_id" "uuid", "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suggested_users_v2"("current_user_id" "uuid", "result_limit" integer) TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_followers"("target_user_id" "uuid", "current_viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_followers"("target_user_id" "uuid", "current_viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_followers"("target_user_id" "uuid", "current_viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_following"("target_user_id" "uuid", "current_viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_following"("target_user_id" "uuid", "current_viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_following"("target_user_id" "uuid", "current_viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_blocked"("p_user_id" "uuid", "p_blocked_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("p_user_id" "uuid", "p_blocked_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("p_user_id" "uuid", "p_blocked_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."moderate_content"("p_report_id" "uuid", "p_action" "text", "p_admin_id" "text", "p_action_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."moderate_content"("p_report_id" "uuid", "p_action" "text", "p_admin_id" "text", "p_action_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."moderate_content"("p_report_id" "uuid", "p_action" "text", "p_admin_id" "text", "p_action_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_diary_entry_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_diary_entry_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_diary_entry_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_diary_entry_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_diary_entry_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_diary_entry_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_push_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_push_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_push_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_push_tokens_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_push_tokens_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_push_tokens_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."users_have_blocked"("p_user_id_1" "uuid", "p_user_id_2" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."users_have_blocked"("p_user_id_1" "uuid", "p_user_id_2" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."users_have_blocked"("p_user_id_1" "uuid", "p_user_id_2" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."album_listens" TO "anon";
GRANT ALL ON TABLE "public"."album_listens" TO "authenticated";
GRANT ALL ON TABLE "public"."album_listens" TO "service_role";



GRANT ALL ON TABLE "public"."album_ratings" TO "anon";
GRANT ALL ON TABLE "public"."album_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."album_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."albums" TO "anon";
GRANT ALL ON TABLE "public"."albums" TO "authenticated";
GRANT ALL ON TABLE "public"."albums" TO "service_role";



GRANT ALL ON TABLE "public"."artists" TO "anon";
GRANT ALL ON TABLE "public"."artists" TO "authenticated";
GRANT ALL ON TABLE "public"."artists" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_users" TO "anon";
GRANT ALL ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";



GRANT ALL ON TABLE "public"."content_reports" TO "anon";
GRANT ALL ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";



GRANT ALL ON TABLE "public"."diary_entries" TO "anon";
GRANT ALL ON TABLE "public"."diary_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."diary_entries" TO "service_role";



GRANT ALL ON TABLE "public"."diary_entry_comments" TO "anon";
GRANT ALL ON TABLE "public"."diary_entry_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."diary_entry_comments" TO "service_role";



GRANT ALL ON TABLE "public"."diary_entry_likes" TO "anon";
GRANT ALL ON TABLE "public"."diary_entry_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."diary_entry_likes" TO "service_role";



GRANT ALL ON TABLE "public"."favorite_albums" TO "anon";
GRANT ALL ON TABLE "public"."favorite_albums" TO "authenticated";
GRANT ALL ON TABLE "public"."favorite_albums" TO "service_role";



GRANT ALL ON TABLE "public"."follow_requests" TO "anon";
GRANT ALL ON TABLE "public"."follow_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."follow_requests" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."push_preferences" TO "anon";
GRANT ALL ON TABLE "public"."push_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."push_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."user_activities" TO "anon";
GRANT ALL ON TABLE "public"."user_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activities" TO "service_role";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































