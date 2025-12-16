-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create industry_trackers table (Buyer Universes)
CREATE TABLE public.industry_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  industry_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create buyers table
CREATE TABLE public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID REFERENCES public.industry_trackers(id) ON DELETE CASCADE NOT NULL,
  pe_firm_name TEXT NOT NULL,
  platform_company_name TEXT,
  platform_website TEXT,
  
  -- Public data
  num_platforms INTEGER,
  geographic_footprint TEXT[],
  recent_acquisitions JSONB DEFAULT '[]'::jsonb,
  portfolio_companies TEXT[],
  services_offered TEXT,
  business_model TEXT,
  
  -- Thesis/Intelligence data
  thesis_summary TEXT,
  geo_preferences JSONB DEFAULT '{}'::jsonb,
  min_revenue NUMERIC,
  max_revenue NUMERIC,
  preferred_ebitda NUMERIC,
  service_mix_prefs TEXT,
  business_model_prefs TEXT,
  deal_breakers TEXT[],
  addon_only BOOLEAN DEFAULT false,
  platform_only BOOLEAN DEFAULT false,
  thesis_confidence TEXT CHECK (thesis_confidence IN ('High', 'Medium', 'Low')),
  last_call_date DATE,
  call_history JSONB DEFAULT '[]'::jsonb,
  key_quotes TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create buyer_contacts table
CREATE TABLE public.buyer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  company_type TEXT CHECK (company_type IN ('platform', 'pe_firm')),
  priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 4),
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  email_confidence TEXT CHECK (email_confidence IN ('Verified', 'Likely', 'Guessed')),
  salesforce_id TEXT,
  last_contacted_date DATE,
  fee_agreement_status TEXT CHECK (fee_agreement_status IN ('Active', 'Expired', 'None')) DEFAULT 'None',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID REFERENCES public.industry_trackers(id) ON DELETE CASCADE NOT NULL,
  deal_name TEXT NOT NULL,
  industry_type TEXT,
  geography TEXT[],
  revenue NUMERIC,
  ebitda_percentage NUMERIC,
  service_mix TEXT,
  business_model TEXT,
  special_requirements TEXT,
  status TEXT CHECK (status IN ('Active', 'Closed', 'Dead')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create buyer_deal_scores table (junction table)
CREATE TABLE public.buyer_deal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  scored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Individual scores (0-100)
  geography_score INTEGER CHECK (geography_score BETWEEN 0 AND 100),
  service_score INTEGER CHECK (service_score BETWEEN 0 AND 100),
  acquisition_score INTEGER CHECK (acquisition_score BETWEEN 0 AND 100),
  portfolio_score INTEGER CHECK (portfolio_score BETWEEN 0 AND 100),
  business_model_score INTEGER CHECK (business_model_score BETWEEN 0 AND 100),
  thesis_bonus INTEGER CHECK (thesis_bonus BETWEEN 0 AND 50) DEFAULT 0,
  
  composite_score NUMERIC,
  fit_reasoning TEXT,
  data_completeness TEXT CHECK (data_completeness IN ('High', 'Medium', 'Low')),
  selected_for_outreach BOOLEAN DEFAULT false,
  human_override_score NUMERIC,
  
  UNIQUE(buyer_id, deal_id)
);

-- Create outreach_records table
CREATE TABLE public.outreach_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.buyer_contacts(id) ON DELETE SET NULL,
  
  outreach_date DATE,
  outreach_channel TEXT CHECK (outreach_channel IN ('LinkedIn', 'Email', 'Both')),
  custom_message TEXT,
  
  response_received BOOLEAN DEFAULT false,
  response_date DATE,
  response_sentiment TEXT CHECK (response_sentiment IN ('Positive', 'Neutral', 'Negative', 'Auto-reply')),
  
  meeting_scheduled BOOLEAN DEFAULT false,
  meeting_date DATE,
  
  deal_stage TEXT CHECK (deal_stage IN ('Not Started', 'Initial Contact', 'Connected', 'NDA Sent', 'NDA Signed', 'IOI', 'LOI', 'Due Diligence', 'Closed', 'Dead')) DEFAULT 'Not Started',
  pass_reason TEXT,
  outcome TEXT CHECK (outcome IN ('Won', 'Lost', 'Passed', 'Pending')) DEFAULT 'Pending',
  notes TEXT,
  last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_deal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_records ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for industry_trackers (team access - all authenticated users can see)
CREATE POLICY "Authenticated users can view all trackers" ON public.industry_trackers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create trackers" ON public.industry_trackers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trackers" ON public.industry_trackers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trackers" ON public.industry_trackers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for buyers (access through tracker)
CREATE POLICY "Authenticated users can view all buyers" ON public.buyers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create buyers" ON public.buyers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.industry_trackers WHERE id = tracker_id)
  );

CREATE POLICY "Authenticated users can update buyers" ON public.buyers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete buyers" ON public.buyers
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for buyer_contacts
CREATE POLICY "Authenticated users can view all contacts" ON public.buyer_contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create contacts" ON public.buyer_contacts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.buyers WHERE id = buyer_id)
  );

CREATE POLICY "Authenticated users can update contacts" ON public.buyer_contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete contacts" ON public.buyer_contacts
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for deals
CREATE POLICY "Authenticated users can view all deals" ON public.deals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create deals" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.industry_trackers WHERE id = tracker_id)
  );

CREATE POLICY "Authenticated users can update deals" ON public.deals
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete deals" ON public.deals
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for buyer_deal_scores
CREATE POLICY "Authenticated users can view all scores" ON public.buyer_deal_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create scores" ON public.buyer_deal_scores
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id)
  );

CREATE POLICY "Authenticated users can update scores" ON public.buyer_deal_scores
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete scores" ON public.buyer_deal_scores
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for outreach_records
CREATE POLICY "Authenticated users can view all outreach" ON public.outreach_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create outreach" ON public.outreach_records
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id)
  );

CREATE POLICY "Authenticated users can update outreach" ON public.outreach_records
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete outreach" ON public.outreach_records
  FOR DELETE TO authenticated USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_industry_trackers_updated_at
  BEFORE UPDATE ON public.industry_trackers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();