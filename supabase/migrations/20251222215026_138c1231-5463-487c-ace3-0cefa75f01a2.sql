-- Create companies table - the single source of truth for each company
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_website TEXT,
  
  -- Core company data
  industry_type TEXT,
  geography TEXT[],
  revenue NUMERIC,
  revenue_confidence TEXT,
  revenue_is_inferred BOOLEAN DEFAULT false,
  revenue_source_quote TEXT,
  ebitda_percentage NUMERIC,
  ebitda_amount NUMERIC,
  ebitda_confidence TEXT,
  ebitda_is_inferred BOOLEAN DEFAULT false,
  ebitda_source_quote TEXT,
  service_mix TEXT,
  business_model TEXT,
  company_overview TEXT,
  employee_count INTEGER,
  location_count INTEGER DEFAULT 1,
  founded_year INTEGER,
  headquarters TEXT,
  
  -- Owner/Contact info
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  owner_goals TEXT,
  ownership_structure TEXT,
  
  -- Transcript/extraction data
  transcript_link TEXT,
  financial_notes TEXT,
  financial_followup_questions TEXT[],
  additional_info TEXT,
  special_requirements TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one company per domain per user
  CONSTRAINT companies_user_domain_unique UNIQUE(user_id, domain)
);

-- Add company_id to deals table (nullable initially for migration)
ALTER TABLE public.deals ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS policies for companies
CREATE POLICY "Users can view own companies" 
ON public.companies 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create own companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own companies" 
ON public.companies 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own companies" 
ON public.companies 
FOR DELETE 
USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster domain lookups
CREATE INDEX idx_companies_user_domain ON public.companies(user_id, domain);
CREATE INDEX idx_deals_company_id ON public.deals(company_id);