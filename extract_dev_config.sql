-- ============================================================================
-- DEVELOPMENT ENVIRONMENT EXTRACTION SCRIPT
-- Run this in your DEVELOPMENT Supabase SQL Editor to get exact configuration
-- ============================================================================

-- STEP 1: Get bucket configuration
SELECT 
    '=== BUCKET CONFIGURATION ===' as section,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE name = 'avatars';

-- STEP 2: Get all storage policies for avatars bucket
SELECT 
    '=== STORAGE POLICIES ===' as section,
    policyname,
    cmd as action,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- STEP 3: Get detailed policy information
SELECT 
    '=== DETAILED POLICY INFO ===' as section,
    pg_get_expr(polqual, c.oid) as using_clause,
    pg_get_expr(polwithcheck, c.oid) as with_check_clause,
    polname as policy_name,
    polcmd as command,
    polroles::regrole[] as roles
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'objects' 
AND n.nspname = 'storage'
AND polname ILIKE '%avatar%' OR polname ILIKE '%storage%' OR polname ILIKE '%bucket%'
ORDER BY polname;

-- STEP 4: Check if any files exist to understand the structure
SELECT 
    '=== EXISTING FILE STRUCTURE ===' as section,
    name as file_path,
    bucket_id,
    owner,
    created_at
FROM storage.objects 
WHERE bucket_id = 'avatars' 
ORDER BY created_at DESC
LIMIT 10;

-- STEP 5: Check RLS status
SELECT 
    '=== RLS STATUS ===' as section,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';