-- Add missing buyer intelligence fields

-- A. Company & Firm Identification
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS buyer_linkedin text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS pe_firm_linkedin text;

-- B. Location & Geography
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS hq_country text DEFAULT 'USA';
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS hq_region text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS other_office_locations text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS acquisition_geography text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_geographies text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS geographic_exclusions text[];

-- C. Business Description
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS industry_vertical text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS business_summary text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS specialized_focus text;

-- D. Customer Profile (Current)
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS primary_customer_size text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS customer_industries text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS customer_geographic_reach text;

-- D. Customer Profile (Target for Acquisitions)
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_customer_profile text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_customer_size text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_customer_industries text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_customer_geography text;

-- E. Business Model
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS revenue_model text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS go_to_market_strategy text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_business_model text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS business_model_exclusions text[];

-- F. Size Criteria (more granular)
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS min_ebitda numeric;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS max_ebitda numeric;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS revenue_sweet_spot numeric;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS ebitda_sweet_spot numeric;

-- G. Acquisition History
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS total_acquisitions integer;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS acquisition_frequency text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS last_acquisition_date date;

-- H. Investment Criteria
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_services text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS required_capabilities text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS target_industries text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS industry_exclusions text[];
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS strategic_priorities text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS acquisition_appetite text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS acquisition_timeline text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS owner_roll_requirement text;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS owner_transition_goals text;