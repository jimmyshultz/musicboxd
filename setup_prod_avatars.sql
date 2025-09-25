-- ============================================================================
-- PRODUCTION AVATARS BUCKET SETUP SCRIPT
-- Run this in your PRODUCTION Supabase SQL Editor after customizing
-- ============================================================================

-- IMPORTANT: Customize these values based on your development environment
-- Run extract_dev_config.sql in your dev environment first!

-- STEP 1: Create the avatars bucket
-- Customize the public, file_size_limit, and allowed_mime_types based on your dev config
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    false, -- Change to true if your dev bucket is public
    NULL,  -- Set file size limit in bytes if your dev bucket has one (e.g., 5242880 for 5MB)
    NULL   -- Set array of MIME types if restricted (e.g., ARRAY['image/jpeg', 'image/png'])
)
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create RLS policies
-- CUSTOMIZE THESE POLICIES based on your development environment!

-- Policy 1: Users can upload their own avatars to profile-pictures folder
CREATE POLICY "Users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.foldername(name))[2] = 'profile-pictures'
    );

-- Policy 2: Users can view their own avatars
CREATE POLICY "Users can view own avatars" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy 3: Users can update/replace their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy 4: Users can delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy 5: Public read access (ONLY add this if your dev environment allows public access)
-- Uncomment the following if your avatars should be publicly readable:
/*
CREATE POLICY "Public avatar access" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'avatars'
    );
*/

-- STEP 4: Verification queries
-- Check that everything was created correctly

-- Verify bucket exists
SELECT 'Bucket created:' as check_type, * FROM storage.buckets WHERE name = 'avatars';

-- Verify policies exist
SELECT 'Policies created:' as check_type, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname ILIKE '%avatar%'
ORDER BY policyname;

-- Check RLS is enabled
SELECT 'RLS status:' as check_type, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- ============================================================================
-- CUSTOMIZATION NOTES:
-- 
-- 1. Run extract_dev_config.sql in your dev environment first
-- 2. Update the bucket INSERT statement with your dev bucket settings
-- 3. Replace the CREATE POLICY statements with the exact policies from your dev environment
-- 4. Pay special attention to the USING and WITH CHECK expressions
-- 5. Test thoroughly before going live
-- ============================================================================