-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view all trackers" ON public.industry_trackers;
DROP POLICY IF EXISTS "Authenticated users can create trackers" ON public.industry_trackers;
DROP POLICY IF EXISTS "Users can update their own trackers" ON public.industry_trackers;
DROP POLICY IF EXISTS "Users can delete their own trackers" ON public.industry_trackers;

DROP POLICY IF EXISTS "Authenticated users can view all buyers" ON public.buyers;
DROP POLICY IF EXISTS "Authenticated users can create buyers" ON public.buyers;
DROP POLICY IF EXISTS "Authenticated users can update buyers" ON public.buyers;
DROP POLICY IF EXISTS "Authenticated users can delete buyers" ON public.buyers;

DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.buyer_contacts;
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.buyer_contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.buyer_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.buyer_contacts;

DROP POLICY IF EXISTS "Authenticated users can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can update deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can delete deals" ON public.deals;

DROP POLICY IF EXISTS "Authenticated users can view all scores" ON public.buyer_deal_scores;
DROP POLICY IF EXISTS "Authenticated users can create scores" ON public.buyer_deal_scores;
DROP POLICY IF EXISTS "Authenticated users can update scores" ON public.buyer_deal_scores;
DROP POLICY IF EXISTS "Authenticated users can delete scores" ON public.buyer_deal_scores;

DROP POLICY IF EXISTS "Authenticated users can view all outreach" ON public.outreach_records;
DROP POLICY IF EXISTS "Authenticated users can create outreach" ON public.outreach_records;
DROP POLICY IF EXISTS "Authenticated users can update outreach" ON public.outreach_records;
DROP POLICY IF EXISTS "Authenticated users can delete outreach" ON public.outreach_records;

-- Create public access policies for industry_trackers
CREATE POLICY "Public read access" ON public.industry_trackers FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.industry_trackers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.industry_trackers FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.industry_trackers FOR DELETE USING (true);

-- Create public access policies for buyers
CREATE POLICY "Public read access" ON public.buyers FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.buyers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.buyers FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.buyers FOR DELETE USING (true);

-- Create public access policies for buyer_contacts
CREATE POLICY "Public read access" ON public.buyer_contacts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.buyer_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.buyer_contacts FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.buyer_contacts FOR DELETE USING (true);

-- Create public access policies for deals
CREATE POLICY "Public read access" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.deals FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.deals FOR DELETE USING (true);

-- Create public access policies for buyer_deal_scores
CREATE POLICY "Public read access" ON public.buyer_deal_scores FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.buyer_deal_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.buyer_deal_scores FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.buyer_deal_scores FOR DELETE USING (true);

-- Create public access policies for outreach_records
CREATE POLICY "Public read access" ON public.outreach_records FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.outreach_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.outreach_records FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.outreach_records FOR DELETE USING (true);