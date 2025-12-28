-- PE Firm level contacts (investment professionals at the fund)
CREATE TABLE public.pe_firm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pe_firm_id UUID NOT NULL REFERENCES public.pe_firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role_category TEXT,
  priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 4),
  is_primary_contact BOOLEAN DEFAULT false,
  email_confidence TEXT,
  source TEXT DEFAULT 'manual',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform level contacts (operating executives at portfolio companies)
CREATE TABLE public.platform_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role_category TEXT,
  priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 4),
  is_primary_contact BOOLEAN DEFAULT false,
  email_confidence TEXT,
  source TEXT DEFAULT 'manual',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.pe_firm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_contacts ENABLE ROW LEVEL SECURITY;

-- PE Firm Contacts RLS policies (via pe_firms ownership)
CREATE POLICY "Users can view contacts in their PE firms"
ON public.pe_firm_contacts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pe_firms
  WHERE pe_firms.id = pe_firm_contacts.pe_firm_id
  AND pe_firms.user_id = auth.uid()
));

CREATE POLICY "Users can create contacts in their PE firms"
ON public.pe_firm_contacts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pe_firms
  WHERE pe_firms.id = pe_firm_contacts.pe_firm_id
  AND pe_firms.user_id = auth.uid()
));

CREATE POLICY "Users can update contacts in their PE firms"
ON public.pe_firm_contacts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.pe_firms
  WHERE pe_firms.id = pe_firm_contacts.pe_firm_id
  AND pe_firms.user_id = auth.uid()
));

CREATE POLICY "Users can delete contacts in their PE firms"
ON public.pe_firm_contacts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.pe_firms
  WHERE pe_firms.id = pe_firm_contacts.pe_firm_id
  AND pe_firms.user_id = auth.uid()
));

-- Platform Contacts RLS policies (via platforms -> pe_firms ownership)
CREATE POLICY "Users can view contacts in their platforms"
ON public.platform_contacts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.platforms
  JOIN public.pe_firms ON pe_firms.id = platforms.pe_firm_id
  WHERE platforms.id = platform_contacts.platform_id
  AND pe_firms.user_id = auth.uid()
));

CREATE POLICY "Users can create contacts in their platforms"
ON public.platform_contacts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.platforms
  JOIN public.pe_firms ON pe_firms.id = platforms.pe_firm_id
  WHERE platforms.id = platform_contacts.platform_id
  AND pe_firms.user_id = auth.uid()
));

CREATE POLICY "Users can update contacts in their platforms"
ON public.platform_contacts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.platforms
  JOIN public.pe_firms ON pe_firms.id = platforms.pe_firm_id
  WHERE platforms.id = platform_contacts.platform_id
  AND pe_firms.user_id = auth.uid()
));

CREATE POLICY "Users can delete contacts in their platforms"
ON public.platform_contacts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.platforms
  JOIN public.pe_firms ON pe_firms.id = platforms.pe_firm_id
  WHERE platforms.id = platform_contacts.platform_id
  AND pe_firms.user_id = auth.uid()
));