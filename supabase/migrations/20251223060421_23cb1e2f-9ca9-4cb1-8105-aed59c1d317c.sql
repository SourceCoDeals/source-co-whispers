-- Add PERMISSIVE RLS policies requiring authentication for all tables
-- These work alongside existing RESTRICTIVE policies to require auth

-- profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- buyer_contacts table
CREATE POLICY "Require authentication for buyer_contacts"
ON public.buyer_contacts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- companies table
CREATE POLICY "Require authentication for companies"
ON public.companies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- deals table
CREATE POLICY "Require authentication for deals"
ON public.deals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- buyers table
CREATE POLICY "Require authentication for buyers"
ON public.buyers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- pe_firms table
CREATE POLICY "Require authentication for pe_firms"
ON public.pe_firms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- platforms table
CREATE POLICY "Require authentication for platforms"
ON public.platforms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- outreach_records table
CREATE POLICY "Require authentication for outreach_records"
ON public.outreach_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- buyer_deal_scores table
CREATE POLICY "Require authentication for buyer_deal_scores"
ON public.buyer_deal_scores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- call_intelligence table
CREATE POLICY "Require authentication for call_intelligence"
ON public.call_intelligence
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- buyer_transcripts table
CREATE POLICY "Require authentication for buyer_transcripts"
ON public.buyer_transcripts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- deal_transcripts table
CREATE POLICY "Require authentication for deal_transcripts"
ON public.deal_transcripts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- industry_trackers table
CREATE POLICY "Require authentication for industry_trackers"
ON public.industry_trackers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- tracker_buyers table
CREATE POLICY "Require authentication for tracker_buyers"
ON public.tracker_buyers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- industry_intelligence_templates table
CREATE POLICY "Require authentication for industry_intelligence_templates"
ON public.industry_intelligence_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- intelligence_values table
CREATE POLICY "Require authentication for intelligence_values"
ON public.intelligence_values
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- user_roles table
CREATE POLICY "Require authentication for user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_buyer_transcripts_buyer_id ON public.buyer_transcripts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyers_tracker_id ON public.buyers(tracker_id);
CREATE INDEX IF NOT EXISTS idx_deal_transcripts_deal_id ON public.deal_transcripts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_tracker_id ON public.deals(tracker_id);
CREATE INDEX IF NOT EXISTS idx_industry_trackers_user_id ON public.industry_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_records_buyer_id ON public.outreach_records(buyer_id);
CREATE INDEX IF NOT EXISTS idx_outreach_records_deal_id ON public.outreach_records(deal_id);