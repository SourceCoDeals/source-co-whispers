-- =====================================================
-- FIX 1: Drop all PERMISSIVE authentication-only policies
-- These are redundant and create confusing policy structure
-- =====================================================

DROP POLICY IF EXISTS "Require authentication for industry_trackers" ON public.industry_trackers;
DROP POLICY IF EXISTS "Require authentication for buyers" ON public.buyers;
DROP POLICY IF EXISTS "Require authentication for buyer_contacts" ON public.buyer_contacts;
DROP POLICY IF EXISTS "Require authentication for deals" ON public.deals;
DROP POLICY IF EXISTS "Require authentication for buyer_deal_scores" ON public.buyer_deal_scores;
DROP POLICY IF EXISTS "Require authentication for outreach_records" ON public.outreach_records;
DROP POLICY IF EXISTS "Require authentication for buyer_transcripts" ON public.buyer_transcripts;
DROP POLICY IF EXISTS "Require authentication for deal_transcripts" ON public.deal_transcripts;
DROP POLICY IF EXISTS "Require authentication for companies" ON public.companies;
DROP POLICY IF EXISTS "Require authentication for pe_firms" ON public.pe_firms;
DROP POLICY IF EXISTS "Require authentication for platforms" ON public.platforms;
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for call_intelligence" ON public.call_intelligence;
DROP POLICY IF EXISTS "Require authentication for industry_intelligence_templates" ON public.industry_intelligence_templates;
DROP POLICY IF EXISTS "Require authentication for intelligence_values" ON public.intelligence_values;
DROP POLICY IF EXISTS "Require authentication for tracker_buyers" ON public.tracker_buyers;
DROP POLICY IF EXISTS "Require authentication for user_roles" ON public.user_roles;

-- =====================================================
-- FIX 2: Fix storage policies for deal-transcripts bucket
-- Change from auth-only to user-folder isolation
-- =====================================================

DROP POLICY IF EXISTS "Users can upload deal transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view deal transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete deal transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update deal transcripts" ON storage.objects;

CREATE POLICY "Users can upload to their deal transcripts folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their deal transcripts folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete from their deal transcripts folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their deal transcripts folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deal-transcripts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- FIX 3: Fix storage policies for tracker-documents bucket
-- Change from auth-only to user-folder isolation
-- =====================================================

DROP POLICY IF EXISTS "Users can upload tracker documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view tracker documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete tracker documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update tracker documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tracker documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view tracker documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete tracker documents" ON storage.objects;

CREATE POLICY "Users can upload to their tracker documents folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tracker-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their tracker documents folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tracker-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete from their tracker documents folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tracker-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their tracker documents folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tracker-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);