-- Migration: Add delete_user_account function
-- This function deletes all user data when a user requests account deletion
-- Uses SECURITY DEFINER to bypass RLS policies

-- Create the function to delete all user data
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != target_user_id THEN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Add a comment describing the function
COMMENT ON FUNCTION delete_user_account(UUID) IS 
  'Deletes all data associated with a user account. Can only be called by the user themselves.';


-- ============================================================================
-- TRIGGER: Delete auth.users record when user_profiles is deleted
-- ============================================================================

-- Create trigger function to delete the auth user when profile is deleted
CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the user from auth.users
  -- This requires elevated privileges which SECURITY DEFINER provides
  DELETE FROM auth.users WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create the trigger on user_profiles table
DROP TRIGGER IF EXISTS on_profile_deleted ON user_profiles;

CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION delete_auth_user_on_profile_delete();

-- Add a comment describing the trigger function
COMMENT ON FUNCTION delete_auth_user_on_profile_delete() IS 
  'Automatically deletes the auth.users record when a user profile is deleted.';
