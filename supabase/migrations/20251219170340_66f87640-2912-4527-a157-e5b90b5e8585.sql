-- Fix 1: Storage bucket - require authentication for call-transcripts
DROP POLICY IF EXISTS "Anyone can upload transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view transcripts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete transcripts" ON storage.objects;

CREATE POLICY "Authenticated users can upload transcripts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'call-transcripts');

CREATE POLICY "Authenticated users can view transcripts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'call-transcripts');

CREATE POLICY "Authenticated users can delete transcripts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'call-transcripts');

CREATE POLICY "Authenticated users can update transcripts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'call-transcripts');

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'call-transcripts';

-- Fix 2: RLS on industry_trackers (user-scoped)
DROP POLICY IF EXISTS "Public read access" ON industry_trackers;
DROP POLICY IF EXISTS "Public insert access" ON industry_trackers;
DROP POLICY IF EXISTS "Public update access" ON industry_trackers;
DROP POLICY IF EXISTS "Public delete access" ON industry_trackers;

CREATE POLICY "Users can view own trackers"
ON industry_trackers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own trackers"
ON industry_trackers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trackers"
ON industry_trackers FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own trackers"
ON industry_trackers FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Fix 3: RLS on buyers (via tracker ownership)
DROP POLICY IF EXISTS "Public read access" ON buyers;
DROP POLICY IF EXISTS "Public insert access" ON buyers;
DROP POLICY IF EXISTS "Public update access" ON buyers;
DROP POLICY IF EXISTS "Public delete access" ON buyers;

CREATE POLICY "Users can view buyers in their trackers"
ON buyers FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = buyers.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create buyers in their trackers"
ON buyers FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = buyers.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update buyers in their trackers"
ON buyers FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = buyers.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete buyers in their trackers"
ON buyers FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = buyers.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

-- Fix 4: RLS on deals (via tracker ownership)
DROP POLICY IF EXISTS "Public read access" ON deals;
DROP POLICY IF EXISTS "Public insert access" ON deals;
DROP POLICY IF EXISTS "Public update access" ON deals;
DROP POLICY IF EXISTS "Public delete access" ON deals;

CREATE POLICY "Users can view deals in their trackers"
ON deals FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = deals.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create deals in their trackers"
ON deals FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = deals.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update deals in their trackers"
ON deals FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = deals.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete deals in their trackers"
ON deals FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = deals.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

-- Fix 5: RLS on buyer_contacts (via buyer->tracker ownership)
DROP POLICY IF EXISTS "Public read access" ON buyer_contacts;
DROP POLICY IF EXISTS "Public insert access" ON buyer_contacts;
DROP POLICY IF EXISTS "Public update access" ON buyer_contacts;
DROP POLICY IF EXISTS "Public delete access" ON buyer_contacts;

CREATE POLICY "Users can view contacts in their trackers"
ON buyer_contacts FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_contacts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create contacts in their trackers"
ON buyer_contacts FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_contacts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update contacts in their trackers"
ON buyer_contacts FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_contacts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete contacts in their trackers"
ON buyer_contacts FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_contacts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

-- Fix 6: RLS on buyer_transcripts (via buyer->tracker ownership)
DROP POLICY IF EXISTS "Public read access" ON buyer_transcripts;
DROP POLICY IF EXISTS "Public insert access" ON buyer_transcripts;
DROP POLICY IF EXISTS "Public update access" ON buyer_transcripts;
DROP POLICY IF EXISTS "Public delete access" ON buyer_transcripts;

CREATE POLICY "Users can view transcripts in their trackers"
ON buyer_transcripts FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_transcripts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create transcripts in their trackers"
ON buyer_transcripts FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_transcripts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update transcripts in their trackers"
ON buyer_transcripts FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_transcripts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete transcripts in their trackers"
ON buyer_transcripts FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_transcripts.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

-- Fix 7: RLS on buyer_deal_scores (via buyer->tracker ownership)
DROP POLICY IF EXISTS "Public read access" ON buyer_deal_scores;
DROP POLICY IF EXISTS "Public insert access" ON buyer_deal_scores;
DROP POLICY IF EXISTS "Public update access" ON buyer_deal_scores;
DROP POLICY IF EXISTS "Public delete access" ON buyer_deal_scores;

CREATE POLICY "Users can view scores in their trackers"
ON buyer_deal_scores FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_deal_scores.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create scores in their trackers"
ON buyer_deal_scores FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_deal_scores.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update scores in their trackers"
ON buyer_deal_scores FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_deal_scores.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete scores in their trackers"
ON buyer_deal_scores FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_deal_scores.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

-- Fix 8: RLS on outreach_records (via buyer->tracker ownership)
DROP POLICY IF EXISTS "Public read access" ON outreach_records;
DROP POLICY IF EXISTS "Public insert access" ON outreach_records;
DROP POLICY IF EXISTS "Public update access" ON outreach_records;
DROP POLICY IF EXISTS "Public delete access" ON outreach_records;

CREATE POLICY "Users can view outreach in their trackers"
ON outreach_records FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = outreach_records.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create outreach in their trackers"
ON outreach_records FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = outreach_records.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update outreach in their trackers"
ON outreach_records FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = outreach_records.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete outreach in their trackers"
ON outreach_records FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = outreach_records.buyer_id
  AND industry_trackers.user_id = auth.uid()
));