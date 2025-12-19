-- Fix profiles RLS: restrict to own profile only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Fix storage policies: implement user-based folder isolation
DROP POLICY IF EXISTS "Authenticated users can upload transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update transcripts" ON storage.objects;

-- Users can only upload to their own folder
CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only view files in their folder
CREATE POLICY "Users can view their folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete from their folder
CREATE POLICY "Users can delete from their folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update files in their folder
CREATE POLICY "Users can update their folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'call-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);