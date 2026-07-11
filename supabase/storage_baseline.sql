-- Storage baseline captured from prod (resonare-prod / tngotzouiyaiezavxdqn) on 2026-07-11.
-- `supabase db dump` does NOT include storage buckets/policies, so they are captured here
-- and applied to fresh environments (e.g. resonare-dev) separately.

-- Bucket: avatars (public, no size/mime restrictions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies on storage.objects for the avatars bucket
DROP POLICY IF EXISTS "Read avatars 1oj01fe_0" ON storage.objects;
CREATE POLICY "Read avatars 1oj01fe_0" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Upload to avatars 1oj01fe_0" ON storage.objects;
CREATE POLICY "Upload to avatars 1oj01fe_0" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Update avatars 1oj01fe_0" ON storage.objects;
CREATE POLICY "Update avatars 1oj01fe_0" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Delete avatars 1oj01fe_0" ON storage.objects;
CREATE POLICY "Delete avatars 1oj01fe_0" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
