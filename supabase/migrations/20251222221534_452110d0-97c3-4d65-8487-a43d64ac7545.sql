-- Create pe_firms table (parent level - unique PE firms per user)
CREATE TABLE public.pe_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  linkedin TEXT,
  hq_city TEXT,
  hq_state TEXT,
  hq_country TEXT DEFAULT 'USA',
  hq_region TEXT,
  num_platforms INTEGER,
  portfolio_companies TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

-- Create platforms table (child level - unique platforms per PE firm)
CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pe_firm_id UUID NOT NULL REFERENCES public.pe_firms(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  linkedin TEXT,
  industry_vertical TEXT,
  business_summary TEXT,
  services_offered TEXT,
  business_model TEXT,
  specialized_focus TEXT,
  geographic_footprint TEXT[],
  service_regions TEXT[],
  other_office_locations TEXT[],
  hq_city TEXT,
  hq_state TEXT,
  hq_country TEXT DEFAULT 'USA',
  min_revenue NUMERIC,
  max_revenue NUMERIC,
  revenue_sweet_spot NUMERIC,
  min_ebitda NUMERIC,
  max_ebitda NUMERIC,
  ebitda_sweet_spot NUMERIC,
  preferred_ebitda NUMERIC,
  acquisition_appetite TEXT,
  acquisition_frequency TEXT,
  acquisition_timeline TEXT,
  acquisition_geography TEXT[],
  target_geographies TEXT[],
  geographic_exclusions TEXT[],
  total_acquisitions INTEGER,
  last_acquisition_date DATE,
  recent_acquisitions JSONB DEFAULT '[]',
  thesis_summary TEXT,
  thesis_confidence TEXT,
  service_mix_prefs TEXT,
  business_model_prefs TEXT,
  target_services TEXT[],
  target_industries TEXT[],
  industry_exclusions TEXT[],
  business_model_exclusions TEXT[],
  required_capabilities TEXT[],
  deal_breakers TEXT[],
  key_quotes TEXT[],
  primary_customer_size TEXT,
  customer_industries TEXT[],
  customer_geographic_reach TEXT,
  target_customer_profile TEXT,
  target_customer_size TEXT,
  target_customer_industries TEXT[],
  target_customer_geography TEXT,
  target_business_model TEXT,
  go_to_market_strategy TEXT,
  revenue_model TEXT,
  employee_owner TEXT,
  owner_transition_goals TEXT,
  owner_roll_requirement TEXT,
  strategic_priorities TEXT,
  addon_only BOOLEAN DEFAULT false,
  platform_only BOOLEAN DEFAULT false,
  extraction_evidence JSONB DEFAULT '{}',
  extraction_sources JSONB DEFAULT '[]',
  geo_preferences JSONB DEFAULT '{}',
  operating_locations JSONB DEFAULT '[]',
  last_call_date DATE,
  call_history JSONB DEFAULT '[]',
  data_last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pe_firm_id, domain)
);

-- Create tracker_buyers junction table
CREATE TABLE public.tracker_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.industry_trackers(id) ON DELETE CASCADE,
  pe_firm_id UUID NOT NULL REFERENCES public.pe_firms(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES public.platforms(id) ON DELETE CASCADE,
  fee_agreement_status TEXT DEFAULT 'None',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create partial unique indexes for tracker_buyers
CREATE UNIQUE INDEX tracker_buyers_with_platform_idx 
  ON public.tracker_buyers(tracker_id, pe_firm_id, platform_id) 
  WHERE platform_id IS NOT NULL;

CREATE UNIQUE INDEX tracker_buyers_without_platform_idx 
  ON public.tracker_buyers(tracker_id, pe_firm_id) 
  WHERE platform_id IS NULL;

-- Enable RLS
ALTER TABLE public.pe_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracker_buyers ENABLE ROW LEVEL SECURITY;

-- PE Firms RLS policies
CREATE POLICY "Users can view own PE firms"
  ON public.pe_firms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own PE firms"
  ON public.pe_firms FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own PE firms"
  ON public.pe_firms FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own PE firms"
  ON public.pe_firms FOR DELETE
  USING (user_id = auth.uid());

-- Platforms RLS policies
CREATE POLICY "Users can view platforms in their PE firms"
  ON public.platforms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pe_firms
    WHERE pe_firms.id = platforms.pe_firm_id
    AND pe_firms.user_id = auth.uid()
  ));

CREATE POLICY "Users can create platforms in their PE firms"
  ON public.platforms FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pe_firms
    WHERE pe_firms.id = platforms.pe_firm_id
    AND pe_firms.user_id = auth.uid()
  ));

CREATE POLICY "Users can update platforms in their PE firms"
  ON public.platforms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.pe_firms
    WHERE pe_firms.id = platforms.pe_firm_id
    AND pe_firms.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete platforms in their PE firms"
  ON public.platforms FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.pe_firms
    WHERE pe_firms.id = platforms.pe_firm_id
    AND pe_firms.user_id = auth.uid()
  ));

-- Tracker Buyers RLS policies
CREATE POLICY "Users can view tracker buyers in their trackers"
  ON public.tracker_buyers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.industry_trackers
    WHERE industry_trackers.id = tracker_buyers.tracker_id
    AND industry_trackers.user_id = auth.uid()
  ));

CREATE POLICY "Users can create tracker buyers in their trackers"
  ON public.tracker_buyers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.industry_trackers
    WHERE industry_trackers.id = tracker_buyers.tracker_id
    AND industry_trackers.user_id = auth.uid()
  ));

CREATE POLICY "Users can update tracker buyers in their trackers"
  ON public.tracker_buyers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.industry_trackers
    WHERE industry_trackers.id = tracker_buyers.tracker_id
    AND industry_trackers.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tracker buyers in their trackers"
  ON public.tracker_buyers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.industry_trackers
    WHERE industry_trackers.id = tracker_buyers.tracker_id
    AND industry_trackers.user_id = auth.uid()
  ));

-- Create updated_at triggers
CREATE TRIGGER update_pe_firms_updated_at
  BEFORE UPDATE ON public.pe_firms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at
  BEFORE UPDATE ON public.platforms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();