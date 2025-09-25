# Avatars Storage Bucket Setup Guide

## Overview
This guide helps you replicate your development environment's `avatars` storage bucket configuration in your production Supabase project, including all necessary RLS (Row Level Security) policies.

## Phase 1: Extract Configuration from Development Environment

### Step 1.1: Get Bucket Information
1. **Access your development Supabase dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your **development** project

2. **Go to Storage section**
   - Click on **Storage** in the left sidebar
   - You should see the `avatars` bucket

3. **Document bucket settings**
   - Click on the `avatars` bucket
   - Note the following settings:
     - **Public/Private status**: Check if it shows "Public" or "Private"
     - **File size limit**: Look for any size restrictions
     - **Allowed MIME types**: Check for file type restrictions

### Step 1.2: Extract RLS Policies via SQL
1. **Open SQL Editor** in your development project
2. **Run this query** to get all storage policies:

```sql
-- Get all storage policies for the avatars bucket
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;
```

3. **Also run this query** to get bucket configuration:

```sql
-- Get bucket configuration
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE name = 'avatars';
```

4. **Save the results** - copy and paste the output for reference

### Step 1.3: Get Policy Details via Dashboard
1. **In Storage > avatars bucket > Policies tab**
2. **Document each policy**:
   - Policy name
   - Action (SELECT, INSERT, UPDATE, DELETE)
   - Target roles
   - Condition/Expression

## Phase 2: Create Production Bucket

### Step 2.1: Create the Bucket
1. **Access your production Supabase dashboard**
   - Select your **production** project

2. **Create new bucket**:
   - Go to **Storage** section
   - Click **New Bucket**
   - Name: `avatars`
   - Set **Public/Private** to match your dev environment
   - Configure any file size limits to match dev
   - Set allowed MIME types if any were configured in dev

### Step 2.2: Alternative - Create via SQL
If you prefer SQL, use this in your production SQL Editor:

```sql
-- Create the avatars bucket (adjust settings as needed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    false, -- Set to true if your dev bucket is public
    NULL,  -- Set file size limit if your dev bucket has one
    NULL   -- Set allowed MIME types if your dev bucket has restrictions
);
```

## Phase 3: Replicate RLS Policies

### Step 3.1: Common Avatar Storage Policies
Based on your code, you'll likely need these policies. **Adjust the conditions to match your dev environment exactly**:

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can upload their own avatars
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

-- Policy 3: Users can delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy 4: Public read access for avatars (if your bucket allows public access)
-- Only add this if your dev environment allows public avatar access
CREATE POLICY "Public avatar access" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'avatars'
    );
```

### Step 3.2: Create Policies via Dashboard
Alternatively, use the dashboard:

1. **Go to Storage > avatars > Policies**
2. **Click "Add Policy"** for each policy
3. **Fill in the details**:
   - **Policy name**: (e.g., "Users can upload avatars")
   - **Action**: SELECT, INSERT, UPDATE, or DELETE
   - **Target roles**: Usually `authenticated` or `public`
   - **USING expression**: The condition from your dev environment

## Phase 4: Verification

### Step 4.1: Test Basic Functionality
Run these tests in your production environment:

```sql
-- Test 1: Check bucket exists
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Test 2: Check policies are active
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname ILIKE '%avatar%';
```

### Step 4.2: Test from Your App
1. **Update your app to use production environment**:
   ```bash
   ENVFILE=.env.production npm run ios
   ```

2. **Test avatar upload/download**:
   - Try uploading a profile picture
   - Verify it appears correctly
   - Check if deletion works

### Step 4.3: Verify File Structure
Your uploaded files should follow this structure in the `avatars` bucket:
```
avatars/
└── profile-pictures/
    ├── userid1_timestamp1.jpg
    ├── userid2_timestamp2.jpg
    └── ...
```

## Phase 5: Troubleshooting

### Common Issues:

1. **"Access denied" errors**:
   - Check that RLS policies match your dev environment exactly
   - Verify user authentication is working in production
   - Ensure the bucket name is exactly `avatars`

2. **Upload fails**:
   - Check file size limits
   - Verify MIME type restrictions
   - Ensure the file path structure matches: `profile-pictures/${userId}_${timestamp}.jpg`

3. **Public access issues**:
   - If avatars should be publicly viewable, ensure the bucket is set to public
   - Add a public SELECT policy if needed

### Debug Queries:
```sql
-- Check current user context
SELECT auth.uid(), auth.role();

-- Test policy conditions
SELECT 
    name,
    bucket_id,
    auth.uid()::text as current_user,
    (storage.foldername(name))[1] as folder_user
FROM storage.objects 
WHERE bucket_id = 'avatars' 
LIMIT 5;
```

## Summary

Your production `avatars` bucket should now:
✅ Have the same configuration as development
✅ Include all necessary RLS policies
✅ Support the same file upload/download patterns
✅ Maintain proper security controls

The key is ensuring the policies exactly match your development environment, particularly the conditions that determine user access to their own files.