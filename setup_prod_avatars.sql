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
    true,  -- Based on dev config: public = true
    NULL,  -- Based on dev config: file_size_limit = null
    NULL   -- Based on dev config: allowed_mime_types = null
)
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Enable RLS on storage.objects (should already be enabled)
-- Note: This may fail with "must be owner of table objects" error
-- RLS is typically already enabled by default in Supabase
-- You can skip this step if you get a permission error
DO $$
BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'RLS already enabled or insufficient privileges - this is normal in Supabase';
END
$$;

-- STEP 3: Create RLS policies
-- Based on exact development environment configuration

-- Policy 1: Delete avatars (authenticated users only)
CREATE POLICY "Delete avatars 1oj01fe_0" ON storage.objects
    FOR DELETE 
    TO authenticated
    USING (bucket_id = 'avatars'::text);

-- Policy 2: Read avatars (public access)
CREATE POLICY "Read avatars 1oj01fe_0" ON storage.objects
    FOR SELECT 
    TO public
    USING (bucket_id = 'avatars'::text);

-- Policy 3: Update avatars (authenticated users only)
CREATE POLICY "Update avatars 1oj01fe_0" ON storage.objects
    FOR UPDATE 
    TO authenticated
    USING (bucket_id = 'avatars'::text);

-- Policy 4: Upload to avatars (authenticated users only)
CREATE POLICY "Upload to avatars 1oj01fe_0" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'avatars'::text);

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
-- CUSTOMIZATION COMPLETE:
-- 
-- This script has been customized based on the development environment configuration:
-- 
-- BUCKET CONFIGURATION:
-- - Name: avatars
-- - Public: true (allows public read access)
-- - File size limit: null (no limit)
-- - Allowed MIME types: null (no restrictions)
-- 
-- POLICIES CREATED:
-- - Delete avatars 1oj01fe_0: DELETE for authenticated users
-- - Read avatars 1oj01fe_0: SELECT for public (anyone can read)
-- - Update avatars 1oj01fe_0: UPDATE for authenticated users  
-- - Upload to avatars 1oj01fe_0: INSERT for authenticated users
-- 
-- FILE STRUCTURE EXPECTED:
-- - Files stored in profile-pictures/ folder
-- - Naming pattern: profile-pictures/{uuid}_{timestamp}.{ext}
-- 
-- READY TO RUN IN PRODUCTION SUPABASE SQL EDITOR
-- ============================================================================