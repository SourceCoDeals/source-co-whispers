-- Add public access policies for all main tables (no auth required)

-- industry_trackers: Allow public access
CREATE POLICY "Public read access for trackers" ON public.industry_trackers FOR SELECT USING (true);
CREATE POLICY "Public insert access for trackers" ON public.industry_trackers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for trackers" ON public.industry_trackers FOR UPDATE USING (true);
CREATE POLICY "Public delete access for trackers" ON public.industry_trackers FOR DELETE USING (true);

-- buyers: Allow public access
CREATE POLICY "Public read access for buyers" ON public.buyers FOR SELECT USING (true);
CREATE POLICY "Public insert access for buyers" ON public.buyers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for buyers" ON public.buyers FOR UPDATE USING (true);
CREATE POLICY "Public delete access for buyers" ON public.buyers FOR DELETE USING (true);

-- deals: Allow public access
CREATE POLICY "Public read access for deals" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Public insert access for deals" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for deals" ON public.deals FOR UPDATE USING (true);
CREATE POLICY "Public delete access for deals" ON public.deals FOR DELETE USING (true);

-- buyer_contacts: Allow public access
CREATE POLICY "Public read access for buyer_contacts" ON public.buyer_contacts FOR SELECT USING (true);
CREATE POLICY "Public insert access for buyer_contacts" ON public.buyer_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for buyer_contacts" ON public.buyer_contacts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for buyer_contacts" ON public.buyer_contacts FOR DELETE USING (true);

-- buyer_deal_scores: Allow public access
CREATE POLICY "Public read access for buyer_deal_scores" ON public.buyer_deal_scores FOR SELECT USING (true);
CREATE POLICY "Public insert access for buyer_deal_scores" ON public.buyer_deal_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for buyer_deal_scores" ON public.buyer_deal_scores FOR UPDATE USING (true);
CREATE POLICY "Public delete access for buyer_deal_scores" ON public.buyer_deal_scores FOR DELETE USING (true);

-- buyer_transcripts: Allow public access
CREATE POLICY "Public read access for buyer_transcripts" ON public.buyer_transcripts FOR SELECT USING (true);
CREATE POLICY "Public insert access for buyer_transcripts" ON public.buyer_transcripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for buyer_transcripts" ON public.buyer_transcripts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for buyer_transcripts" ON public.buyer_transcripts FOR DELETE USING (true);

-- deal_transcripts: Allow public access
CREATE POLICY "Public read access for deal_transcripts" ON public.deal_transcripts FOR SELECT USING (true);
CREATE POLICY "Public insert access for deal_transcripts" ON public.deal_transcripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for deal_transcripts" ON public.deal_transcripts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for deal_transcripts" ON public.deal_transcripts FOR DELETE USING (true);

-- outreach_records: Allow public access
CREATE POLICY "Public read access for outreach_records" ON public.outreach_records FOR SELECT USING (true);
CREATE POLICY "Public insert access for outreach_records" ON public.outreach_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for outreach_records" ON public.outreach_records FOR UPDATE USING (true);
CREATE POLICY "Public delete access for outreach_records" ON public.outreach_records FOR DELETE USING (true);

-- pe_firms: Allow public access
CREATE POLICY "Public read access for pe_firms" ON public.pe_firms FOR SELECT USING (true);
CREATE POLICY "Public insert access for pe_firms" ON public.pe_firms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for pe_firms" ON public.pe_firms FOR UPDATE USING (true);
CREATE POLICY "Public delete access for pe_firms" ON public.pe_firms FOR DELETE USING (true);

-- pe_firm_contacts: Allow public access
CREATE POLICY "Public read access for pe_firm_contacts" ON public.pe_firm_contacts FOR SELECT USING (true);
CREATE POLICY "Public insert access for pe_firm_contacts" ON public.pe_firm_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for pe_firm_contacts" ON public.pe_firm_contacts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for pe_firm_contacts" ON public.pe_firm_contacts FOR DELETE USING (true);

-- platforms: Allow public access
CREATE POLICY "Public read access for platforms" ON public.platforms FOR SELECT USING (true);
CREATE POLICY "Public insert access for platforms" ON public.platforms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for platforms" ON public.platforms FOR UPDATE USING (true);
CREATE POLICY "Public delete access for platforms" ON public.platforms FOR DELETE USING (true);

-- platform_contacts: Allow public access
CREATE POLICY "Public read access for platform_contacts" ON public.platform_contacts FOR SELECT USING (true);
CREATE POLICY "Public insert access for platform_contacts" ON public.platform_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for platform_contacts" ON public.platform_contacts FOR UPDATE USING (true);
CREATE POLICY "Public delete access for platform_contacts" ON public.platform_contacts FOR DELETE USING (true);

-- tracker_buyers: Allow public access
CREATE POLICY "Public read access for tracker_buyers" ON public.tracker_buyers FOR SELECT USING (true);
CREATE POLICY "Public insert access for tracker_buyers" ON public.tracker_buyers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for tracker_buyers" ON public.tracker_buyers FOR UPDATE USING (true);
CREATE POLICY "Public delete access for tracker_buyers" ON public.tracker_buyers FOR DELETE USING (true);

-- companies: Allow public access
CREATE POLICY "Public read access for companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public insert access for companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Public delete access for companies" ON public.companies FOR DELETE USING (true);

-- call_intelligence: Allow public access
CREATE POLICY "Public read access for call_intelligence" ON public.call_intelligence FOR SELECT USING (true);
CREATE POLICY "Public insert access for call_intelligence" ON public.call_intelligence FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for call_intelligence" ON public.call_intelligence FOR UPDATE USING (true);
CREATE POLICY "Public delete access for call_intelligence" ON public.call_intelligence FOR DELETE USING (true);

-- intelligence_values: Allow public access
CREATE POLICY "Public read access for intelligence_values" ON public.intelligence_values FOR SELECT USING (true);
CREATE POLICY "Public insert access for intelligence_values" ON public.intelligence_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for intelligence_values" ON public.intelligence_values FOR UPDATE USING (true);
CREATE POLICY "Public delete access for intelligence_values" ON public.intelligence_values FOR DELETE USING (true);

-- industry_intelligence_templates: Allow public access
CREATE POLICY "Public read access for industry_intelligence_templates" ON public.industry_intelligence_templates FOR SELECT USING (true);
CREATE POLICY "Public insert access for industry_intelligence_templates" ON public.industry_intelligence_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for industry_intelligence_templates" ON public.industry_intelligence_templates FOR UPDATE USING (true);
CREATE POLICY "Public delete access for industry_intelligence_templates" ON public.industry_intelligence_templates FOR DELETE USING (true);

-- deal_scoring_adjustments: Allow public access
CREATE POLICY "Public read access for deal_scoring_adjustments" ON public.deal_scoring_adjustments FOR SELECT USING (true);
CREATE POLICY "Public insert access for deal_scoring_adjustments" ON public.deal_scoring_adjustments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for deal_scoring_adjustments" ON public.deal_scoring_adjustments FOR UPDATE USING (true);
CREATE POLICY "Public delete access for deal_scoring_adjustments" ON public.deal_scoring_adjustments FOR DELETE USING (true);

-- buyer_learning_history: Allow public access
CREATE POLICY "Public read access for buyer_learning_history" ON public.buyer_learning_history FOR SELECT USING (true);
CREATE POLICY "Public insert access for buyer_learning_history" ON public.buyer_learning_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for buyer_learning_history" ON public.buyer_learning_history FOR UPDATE USING (true);
CREATE POLICY "Public delete access for buyer_learning_history" ON public.buyer_learning_history FOR DELETE USING (true);